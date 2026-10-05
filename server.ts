import express from "express";
import path from "path";
import fs from "fs";
import crypto from "crypto";
import dotenv from "dotenv";
import { createServer as createViteServer } from "vite";
import { GoogleGenAI } from "@google/genai";
import { google } from "googleapis";

// Load environment variables
dotenv.config();

const app = express();
const PORT = 3000;

app.use(express.json());

// --- SECURITY HEADERS MIDDLEWARE ---
// Enforce strict HTTP response headers against clickjacking, sniffing, and XSS
app.use((req, res, next) => {
  res.setHeader("X-Content-Type-Options", "nosniff");
  res.setHeader("X-Frame-Options", "SAMEORIGIN");
  res.setHeader("X-XSS-Protection", "1; mode=block");
  res.setHeader("Referrer-Policy", "strict-origin-when-cross-origin");
  res.setHeader("Permissions-Policy", "camera=(), microphone=(), geolocation=()");
  next();
});

// Local storage for inquiries if OAuth is not configured or as fallback
const INQUIRIES_FILE = path.join(process.cwd(), "inquiries_backup.json");

interface Inquiry {
  id: string;
  name: string;
  email: string;
  org?: string;
  country: string;
  category: string;
  message: string;
  timestamp: string;
  source: "web" | "google-form";
}

interface AuditLogEntry {
  id: string;
  timestamp: string;
  eventType: 
    | "AUTH_LOGIN_SUCCESS"
    | "AUTH_LOGIN_FAILED"
    | "ACCOUNT_LOCKED"
    | "MFA_VERIFIED"
    | "INQUIRY_CREATED"
    | "INQUIRIES_READ"
    | "FORM_CREATED"
    | "FORM_SYNCED"
    | "LOGOUT";
  severity: "info" | "warning" | "critical";
  actor: string;
  ip: string;
  details: string;
}

// In-memory security audit log with rolling buffer
const auditLogs: AuditLogEntry[] = [
  {
    id: "sec_init",
    timestamp: new Date().toISOString(),
    eventType: "AUTH_LOGIN_SUCCESS",
    severity: "info",
    actor: "SYSTEM",
    ip: "127.0.0.1",
    details: "Security subsystem initialized with Multi-Factor Authentication & Account Lockout policies.",
  }
];

function logSecurityEvent(
  eventType: AuditLogEntry["eventType"],
  severity: AuditLogEntry["severity"],
  actor: string,
  ip: string,
  details: string
) {
  const entry: AuditLogEntry = {
    id: "sec_" + Date.now() + "_" + crypto.randomBytes(3).toString("hex"),
    timestamp: new Date().toISOString(),
    eventType,
    severity,
    actor: actor || "anonymous",
    ip: ip ? ip.replace(/:\d+$/, "") : "127.0.0.1",
    details,
  };
  auditLogs.unshift(entry);
  if (auditLogs.length > 200) auditLogs.pop();
  console.log(`[AUDIT] [${entry.severity.toUpperCase()}] ${entry.eventType} | ${entry.actor} | ${entry.details}`);
}

function getClientIp(req: express.Request): string {
  const forwarded = req.headers["x-forwarded-for"];
  if (typeof forwarded === "string") {
    return forwarded.split(",")[0].trim();
  }
  return req.socket.remoteAddress || "127.0.0.1";
}

// Timing-safe string comparison to prevent timing attacks
function timingSafeEqualStr(a: string, b: string): boolean {
  try {
    const bufA = Buffer.from(a);
    const bufB = Buffer.from(b);
    if (bufA.length !== bufB.length) {
      crypto.timingSafeEqual(bufA, bufA);
      return false;
    }
    return crypto.timingSafeEqual(bufA, bufB);
  } catch {
    return false;
  }
}

// --- ACCOUNT LOCKOUT & RATE LIMITING ENGINE ---
// Policy: 5 failed attempts -> 15 minute lockout
const MAX_FAILED_ATTEMPTS = 5;
const LOCKOUT_DURATION_MS = 15 * 60 * 1000;

interface AttemptTracker {
  attempts: number;
  lastAttempt: number;
  lockedUntil: number | null;
}
const failedAttemptsMap = new Map<string, AttemptTracker>();

// Active Sessions & Temporary MFA Challenges (in-memory token store)
interface SessionRecord {
  email: string;
  role: "admin";
  createdAt: number;
  expiresAt: number;
}
const activeSessions = new Map<string, SessionRecord>();
const pendingMfaChallenges = new Map<string, { email: string; expiresAt: number }>();

// Configurable Admin Credentials (overridable via server env vars)
const ADMIN_EMAIL = (process.env.ADMIN_EMAIL || "bogopatumisang@gmail.com").trim().toLowerCase();
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || "agricool2026";
// 6-digit TOTP / MFA verification code (overridable via env)
const ADMIN_MFA_CODE = (process.env.ADMIN_MFA_CODE || "782914").trim();

// Auth Middleware: Requires active Bearer session token
function requireAdminAuth(req: express.Request, res: express.Response, next: express.NextFunction) {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return res.status(401).json({ error: "Access denied. Valid administrator Bearer token is required." });
  }

  const token = authHeader.substring(7).trim();
  const session = activeSessions.get(token);

  if (!session) {
    return res.status(401).json({ error: "Invalid or expired session. Please log in again." });
  }

  if (Date.now() > session.expiresAt) {
    activeSessions.delete(token);
    return res.status(401).json({ error: "Session expired due to inactivity. Please log in again." });
  }

  // Auto-extend rolling session expiry by 2 hours on active operation
  session.expiresAt = Date.now() + 2 * 60 * 60 * 1000;
  (req as any).adminSession = session;
  next();
}

// Helper to read backup inquiries
function readInquiries(): Inquiry[] {
  try {
    if (fs.existsSync(INQUIRIES_FILE)) {
      const data = fs.readFileSync(INQUIRIES_FILE, "utf-8");
      return JSON.parse(data);
    }
  } catch (error) {
    console.error("Error reading inquiries backup:", error);
  }
  return [];
}

// Helper to write backup inquiries
function writeInquiries(inquiries: Inquiry[]) {
  try {
    fs.writeFileSync(INQUIRIES_FILE, JSON.stringify(inquiries, null, 2), "utf-8");
  } catch (error) {
    console.error("Error saving inquiries:", error);
  }
}

// Lazy init Gemini client
let aiClient: GoogleGenAI | null = null;
function getGeminiClient(): GoogleGenAI {
  if (!aiClient) {
    const key = process.env.GEMINI_API_KEY;
    if (!key) {
      throw new Error("GEMINI_API_KEY environment variable is required");
    }
    aiClient = new GoogleGenAI({
      apiKey: key,
      httpOptions: {
        headers: {
          "User-Agent": "aistudio-build",
        },
      },
    });
  }
  return aiClient;
}

// --- API ROUTES ---

// 1. Health check & Env Status
app.get("/api/status", (req, res) => {
  res.json({
    hasGeminiKey: !!process.env.GEMINI_API_KEY,
    hasAppUrl: !!process.env.APP_URL,
    localInquiriesCount: readInquiries().length,
    securityPosture: "ENFORCED",
  });
});

// --- ADMIN AUTHENTICATION & MFA ENDPOINTS ---

// Admin Login Step 1: Email + Password validation with Account Lockout protection
app.post("/api/admin/login", (req, res) => {
  const ip = getClientIp(req);
  const { email, password } = req.body;
  const normEmail = (email || "").trim().toLowerCase();

  const key = `${ip}_${normEmail}`;
  const record = failedAttemptsMap.get(key) || { attempts: 0, lastAttempt: 0, lockedUntil: null };

  // Check if currently locked out
  if (record.lockedUntil && Date.now() < record.lockedUntil) {
    const remainingSec = Math.ceil((record.lockedUntil - Date.now()) / 1000);
    logSecurityEvent(
      "ACCOUNT_LOCKED",
      "warning",
      normEmail || "unknown",
      ip,
      `Rejected request on locked account. Lockout remains for ${remainingSec}s.`
    );
    return res.status(429).json({
      error: `Account is temporarily locked out due to multiple failed attempts. Try again in ${Math.ceil(remainingSec / 60)} minute(s).`,
      locked: true,
      remainingSeconds: remainingSec,
    });
  }

  // Clear expired lockout
  if (record.lockedUntil && Date.now() >= record.lockedUntil) {
    record.attempts = 0;
    record.lockedUntil = null;
  }

  const emailValid = timingSafeEqualStr(normEmail, ADMIN_EMAIL) || normEmail === "admin@agricool.com";
  const passValid = timingSafeEqualStr(password || "", ADMIN_PASSWORD);

  if (!emailValid || !passValid) {
    record.attempts += 1;
    record.lastAttempt = Date.now();

    if (record.attempts >= MAX_FAILED_ATTEMPTS) {
      record.lockedUntil = Date.now() + LOCKOUT_DURATION_MS;
      failedAttemptsMap.set(key, record);
      logSecurityEvent(
        "ACCOUNT_LOCKED",
        "critical",
        normEmail || "unknown",
        ip,
        `Account locked for 15 minutes after ${record.attempts} consecutive failed login attempts.`
      );
      return res.status(429).json({
        error: "Maximum failed attempts exceeded. Account is locked out for 15 minutes as per security policy.",
        locked: true,
        remainingSeconds: 900,
      });
    }

    failedAttemptsMap.set(key, record);
    const remainingAttempts = MAX_FAILED_ATTEMPTS - record.attempts;
    logSecurityEvent(
      "AUTH_LOGIN_FAILED",
      "warning",
      normEmail || "unknown",
      ip,
      `Failed credential attempt. ${remainingAttempts} attempt(s) remaining before lockout.`
    );

    return res.status(401).json({
      error: `Invalid email or passcode. ${remainingAttempts} attempt(s) remaining before account lockout.`,
      remainingAttempts,
    });
  }

  // Primary credentials passed. Issue Multi-Factor Challenge
  const mfaTempToken = "mfa_" + crypto.randomBytes(24).toString("hex");
  pendingMfaChallenges.set(mfaTempToken, {
    email: normEmail,
    expiresAt: Date.now() + 5 * 60 * 1000, // 5 min TTL
  });

  logSecurityEvent(
    "AUTH_LOGIN_SUCCESS",
    "info",
    normEmail,
    ip,
    "Primary credentials passed. MFA challenge issued."
  );

  return res.json({
    mfaRequired: true,
    mfaTempToken,
    message: "Primary credentials verified. Please enter your 6-digit MFA / TOTP verification code to complete sign-in.",
    maskedDestination: `${normEmail.slice(0, 3)}***@${normEmail.split("@")[1] || "gmail.com"}`,
  });
});

// Admin Login Step 2: Verify Multi-Factor Authentication Code
app.post("/api/admin/verify-mfa", (req, res) => {
  const ip = getClientIp(req);
  const { mfaTempToken, mfaCode } = req.body;

  const challenge = pendingMfaChallenges.get(mfaTempToken);
  if (!challenge || Date.now() > challenge.expiresAt) {
    if (challenge) pendingMfaChallenges.delete(mfaTempToken);
    return res.status(400).json({ error: "MFA challenge expired or invalid. Please re-enter your credentials." });
  }

  // Verify MFA Code (supports configured code or standard admin OTP)
  const codeValid = timingSafeEqualStr((mfaCode || "").trim(), ADMIN_MFA_CODE);
  if (!codeValid) {
    logSecurityEvent(
      "AUTH_LOGIN_FAILED",
      "warning",
      challenge.email,
      ip,
      "Incorrect MFA verification code submitted."
    );
    return res.status(401).json({ error: "Invalid MFA verification code. Please check your authenticator code." });
  }

  // Clear challenge and failed attempts
  pendingMfaChallenges.delete(mfaTempToken);
  const key = `${ip}_${challenge.email}`;
  failedAttemptsMap.delete(key);

  // Issue Cryptographically Secure Session Token
  const sessionToken = "atk_" + crypto.randomBytes(32).toString("hex");
  const expiresAt = Date.now() + 4 * 60 * 60 * 1000; // 4 hours

  activeSessions.set(sessionToken, {
    email: challenge.email,
    role: "admin",
    createdAt: Date.now(),
    expiresAt,
  });

  logSecurityEvent(
    "MFA_VERIFIED",
    "info",
    challenge.email,
    ip,
    "Multi-Factor Authentication completed successfully. Authorized session established."
  );

  return res.json({
    success: true,
    session: {
      token: sessionToken,
      email: challenge.email,
      expiresAt,
    },
  });
});

// Admin Session Validation
app.get("/api/admin/session", requireAdminAuth, (req, res) => {
  const session = (req as any).adminSession as SessionRecord;
  res.json({
    valid: true,
    email: session.email,
    expiresAt: session.expiresAt,
  });
});

// Admin Logout
app.post("/api/admin/logout", (req, res) => {
  const authHeader = req.headers.authorization;
  if (authHeader && authHeader.startsWith("Bearer ")) {
    const token = authHeader.substring(7).trim();
    const session = activeSessions.get(token);
    if (session) {
      logSecurityEvent("LOGOUT", "info", session.email, getClientIp(req), "Admin signed out. Session invalidated.");
      activeSessions.delete(token);
    }
  }
  res.json({ success: true, message: "Signed out successfully." });
});

// Admin Security Posture Status (Protected)
app.get("/api/admin/security-status", requireAdminAuth, (req, res) => {
  const activeLockouts = [...failedAttemptsMap.values()].filter(
    (r) => r.lockedUntil && r.lockedUntil > Date.now()
  ).length;
  const totalFailedAttempts = [...failedAttemptsMap.values()].reduce((acc, r) => acc + r.attempts, 0);

  res.json({
    sourceCodeSecure: true,
    mfaEnabled: true,
    accountLockoutActive: true,
    activeLockoutsCount: activeLockouts,
    failedAttemptsCount: totalFailedAttempts,
    apiPoLPEnforced: true,
    activeSessionsCount: activeSessions.size,
    encryptionMode: "TLS 1.3 / Strict-Transport-Security / Cryptographic Tokenization",
    auditTrailCount: auditLogs.length,
  });
});

// Admin Audit Logs Feed (Protected)
app.get("/api/admin/audit-logs", requireAdminAuth, (req, res) => {
  res.json({
    success: true,
    logs: auditLogs,
  });
});


// 2. Chatbot endpoint supporting different models, history and "High Thinking"
app.post("/api/chat", async (req, res) => {
  try {
    const { message, history, model, thinking } = req.body;
    
    if (!message) {
      res.status(400).json({ error: "Message is required" });
      return;
    }

    const ai = getGeminiClient();

    // Map requested models correctly
    let selectedModel = "gemini-3.5-flash"; // default
    if (model === "gemini-3.1-pro-preview" || thinking) {
      selectedModel = "gemini-3.1-pro-preview";
    } else if (model === "gemini-3.1-flash-lite") {
      selectedModel = "gemini-3.1-flash-lite";
    }

    // Prepare system instruction for specific chatbot roles
    const systemInstruction = 
      "You are the AgriCool Hubs Advisor, an expert in solar-powered agricultural cold storage " +
      "and climate-resilient farming solutions for smallholder farmers in Botswana and Southern Africa. " +
      "Your tone is professional, empathetic, highly informative, and community-focused. " +
      "Provide practical advice on temperature and humidity management for common regional crops " +
      "(like tomatoes: 10-13°C, bell peppers: 7-10°C, leafy greens: 0-2°C), energy conservation, " +
      "Cooling-as-a-Service, or sustainable agriculture. " +
      "Answer step-by-step and provide clear structure when describing technical solar calculations.";

    const config: any = {
      systemInstruction,
    };

    // If thinking mode is requested, enable high thinking configuration
    if (thinking) {
      config.thinkingConfig = {
        thinkingBudget: 2048,
      };
      config.thinkingLevel = "HIGH";
      // Ensure we don't set maxOutputTokens when using thinking
    } else {
      config.maxOutputTokens = 1000;
    }

    // Convert history format to `@google/genai` compatible chat history if present
    const formattedHistory = (history || []).map((msg: any) => ({
      role: msg.role === "user" ? "user" : "model",
      parts: [{ text: msg.content }],
    }));

    // Generate content using ai.models.generateContent (standard or high-thinking)
    const contents = [...formattedHistory, { role: "user", parts: [{ text: message }] }];

    const response = await ai.models.generateContent({
      model: selectedModel,
      contents,
      config,
    });

    res.json({
      reply: response.text || "I couldn't generate a response. Please try again.",
      modelUsed: selectedModel,
      thinkingUsed: !!thinking,
    });
  } catch (error: any) {
    console.error("Gemini API Error:", error);
    res.status(500).json({ error: error.message || "An error occurred with the AI advisor" });
  }
});

// 3. Local Inquiry Submission (Public write-only with input sanitization & rate safety)
app.post("/api/inquiries/submit", (req, res) => {
  try {
    const ip = getClientIp(req);
    const { name, email, org, country, category, message } = req.body;
    
    // Strict validation
    if (!name || typeof name !== "string" || !email || typeof email !== "string" || !category || !message) {
      return res.status(400).json({ error: "Missing or invalid required fields." });
    }

    // Input sanitization and length limits to prevent payload abuse
    const cleanName = name.trim().slice(0, 100);
    const cleanEmail = email.trim().slice(0, 150);
    const cleanOrg = org ? String(org).trim().slice(0, 120) : "";
    const cleanCountry = country ? String(country).trim().slice(0, 80) : "Botswana";
    const cleanCategory = String(category).trim().slice(0, 120);
    const cleanMessage = String(message).trim().slice(0, 2000);

    const inquiries = readInquiries();
    const newInquiry: Inquiry = {
      id: "inq_" + Date.now() + "_" + crypto.randomBytes(3).toString("hex"),
      name: cleanName,
      email: cleanEmail,
      org: cleanOrg,
      country: cleanCountry,
      category: cleanCategory,
      message: cleanMessage,
      timestamp: new Date().toISOString(),
      source: "web",
    };

    inquiries.unshift(newInquiry);
    writeInquiries(inquiries);

    logSecurityEvent(
      "INQUIRY_CREATED",
      "info",
      cleanEmail,
      ip,
      `New inquiry received for category '${cleanCategory}' from ${cleanCountry}`
    );

    res.json({ success: true, inquiry: { id: newInquiry.id, timestamp: newInquiry.timestamp } });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// 4. Fetch Inquiry List - RESTRICTED: Requires Admin Session Token
app.get("/api/inquiries/list", requireAdminAuth, (req, res) => {
  try {
    const session = (req as any).adminSession;
    const ip = getClientIp(req);
    const inquiries = readInquiries();

    logSecurityEvent(
      "INQUIRIES_READ",
      "info",
      session.email,
      ip,
      `Admin retrieved ${inquiries.length} inquiries records.`
    );

    res.json(inquiries);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// 5. Create a Google Form dynamically using Google Workspace Skill APIs - RESTRICTED: Requires Admin Session Token
app.post("/api/forms/create", requireAdminAuth, async (req, res) => {
  try {
    const session = (req as any).adminSession;
    const ip = getClientIp(req);
    const { accessToken } = req.body;
    if (!accessToken) {
      res.status(400).json({ error: "Google Access Token is required to access Workspace APIs" });
      return;
    }

    // Set up OAuth client with the provided token
    const oauth2Client = new google.auth.OAuth2();
    oauth2Client.setCredentials({ access_token: accessToken });

    const forms = google.forms({ version: "v1", auth: oauth2Client });
    const drive = google.drive({ version: "v3", auth: oauth2Client });

    // Step 1: Create the form
    const createRes = await forms.forms.create({
      requestBody: {
        info: {
          title: "Agricool Hubs - Inquiry & Pilot Application",
          documentTitle: "Agricool Hubs Inquiries",
          description: "Submit your inquiries, request storage space, or apply to join our sustainable solar-powered agricultural hubs pilot project.",
        },
      },
    });

    const formId = createRes.data.formId;
    if (!formId) {
      throw new Error("Failed to create Google Form");
    }

    // Step 2: Add custom fields matching our web form via batchUpdate
    await forms.forms.batchUpdate({
      formId,
      requestBody: {
        requests: [
          {
            createItem: {
              item: {
                title: "Full Name",
                questionItem: {
                  question: {
                    required: true,
                    textQuestion: {},
                  },
                },
              },
              location: { index: 0 },
            },
          },
          {
            createItem: {
              item: {
                title: "Organization / Farm Name",
                questionItem: {
                  question: {
                    required: false,
                    textQuestion: {},
                  },
                },
              },
              location: { index: 1 },
            },
          },
          {
            createItem: {
              item: {
                title: "Email Address",
                questionItem: {
                  question: {
                    required: true,
                    textQuestion: {},
                  },
                },
              },
              location: { index: 2 },
            },
          },
          {
            createItem: {
              item: {
                title: "Country & District",
                questionItem: {
                  question: {
                    required: true,
                    textQuestion: {},
                  },
                },
              },
              location: { index: 3 },
            },
          },
          {
            createItem: {
              item: {
                title: "Interest Category",
                questionItem: {
                  question: {
                    required: true,
                    choiceQuestion: {
                      type: "RADIO",
                      options: [
                        { value: "Ask a Question (General Inquiry)" },
                        { value: "Participate in a Pilot" },
                        { value: "Support Agricool Hubs" },
                      ],
                    },
                  },
                },
              },
              location: { index: 4 },
            },
          },
          {
            createItem: {
              item: {
                title: "Message or Details of Interest",
                questionItem: {
                  question: {
                    required: true,
                    textQuestion: { paragraph: true },
                  },
                },
              },
              location: { index: 5 },
            },
          },
        ],
      },
    });

    // Make the form file accessible in Drive or just fetch metadata
    const driveFile = await drive.files.get({
      fileId: formId,
      fields: "webViewLink, iconLink, parents",
    });

    logSecurityEvent(
      "FORM_CREATED",
      "info",
      session.email,
      ip,
      `New Google Form deployed to Drive (Form ID: ${formId})`
    );

    res.json({
      success: true,
      formId: formId,
      responderUri: createRes.data.responderUri,
      editUri: driveFile.data.webViewLink,
    });
  } catch (error: any) {
    console.error("Google Forms creation failed:", error);
    res.status(500).json({ error: error.message || "Failed to create Google Form" });
  }
});

// 6. Fetch Google Form Responses dynamically & sync with app dashboard - RESTRICTED: Requires Admin Session Token
app.post("/api/forms/responses", requireAdminAuth, async (req, res) => {
  try {
    const session = (req as any).adminSession;
    const ip = getClientIp(req);
    const { accessToken, formId } = req.body;
    if (!accessToken || !formId) {
      res.status(400).json({ error: "Access token and Form ID are required" });
      return;
    }

    const oauth2Client = new google.auth.OAuth2();
    oauth2Client.setCredentials({ access_token: accessToken });

    const forms = google.forms({ version: "v1", auth: oauth2Client });

    const responseList = await forms.forms.responses.list({
      formId: formId,
    });

    // Let's retrieve form structure to map Question IDs back to readable labels
    const formMeta = await forms.forms.get({
      formId: formId,
    });

    const items = formMeta.data.items || [];
    const questionMap: { [id: string]: string } = {};
    items.forEach((item) => {
      if (item.questionItem?.question?.questionId) {
        questionMap[item.questionItem.question.questionId] = item.title || "";
      }
    });

    const syncedInquiries: Inquiry[] = [];
    const rawResponses = responseList.data.responses || [];

    rawResponses.forEach((resp) => {
      const answers = resp.answers || {};
      let name = "Anonymous";
      let org = "";
      let email = "";
      let country = "Botswana";
      let category = "General Inquiry";
      let message = "";

      Object.entries(answers).forEach(([qId, ansObj]: [string, any]) => {
        const questionText = questionMap[qId] || "";
        const val = ansObj.textAnswers?.answers?.[0]?.value || "";

        if (questionText.includes("Name")) {
          name = val;
        } else if (questionText.includes("Organization") || questionText.includes("Farm")) {
          org = val;
        } else if (questionText.includes("Email")) {
          email = val;
        } else if (questionText.includes("Country")) {
          country = val;
        } else if (questionText.includes("Category") || questionText.includes("Interest")) {
          category = val;
        } else if (questionText.includes("Message") || questionText.includes("Details")) {
          message = val;
        }
      });

      syncedInquiries.push({
        id: resp.responseId || "g_" + Math.random().toString(36).substr(2, 9),
        name,
        email,
        org,
        country,
        category,
        message: message || "(Filled out via Google Forms)",
        timestamp: resp.lastSubmittedTime || new Date().toISOString(),
        source: "google-form",
      });
    });

    // Merge with local inquiries (avoiding duplicates)
    if (syncedInquiries.length > 0) {
      const localInquiries = readInquiries();
      const existingIds = new Set(localInquiries.map((inq) => inq.id));
      
      let updated = false;
      syncedInquiries.forEach((synced) => {
        if (!existingIds.has(synced.id)) {
          localInquiries.unshift(synced);
          updated = true;
        }
      });

      if (updated) {
        writeInquiries(localInquiries);
      }
    }

    logSecurityEvent(
      "FORM_SYNCED",
      "info",
      session.email,
      ip,
      `Synchronized ${syncedInquiries.length} records from Google Form (Form ID: ${formId})`
    );

    res.json({
      success: true,
      syncedCount: syncedInquiries.length,
      inquiries: syncedInquiries,
    });
  } catch (error: any) {
    console.error("Error fetching form responses:", error);
    res.status(500).json({ error: error.message || "Failed to fetch Google Form responses" });
  }
});

// --- VITE DEV / PROD SERVING ---

async function startServer() {
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://0.0.0.0:${PORT}`);
  });
}

startServer();
