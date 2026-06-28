import express from "express";
import path from "path";
import fs from "fs";
import dotenv from "dotenv";
import { createServer as createViteServer } from "vite";
import { GoogleGenAI } from "@google/genai";
import { google } from "googleapis";

// Load environment variables
dotenv.config();

const app = express();
const PORT = 3000;

app.use(express.json());

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

// 3. Local Inquiry Submission
app.post("/api/inquiries/submit", (req, res) => {
  try {
    const { name, email, org, country, category, message } = req.body;
    if (!name || !email || !category || !message) {
      res.status(400).json({ error: "Missing required fields" });
      return;
    }

    const inquiries = readInquiries();
    const newInquiry: Inquiry = {
      id: "inq_" + Date.now() + "_" + Math.random().toString(36).substr(2, 5),
      name,
      email,
      org,
      country: country || "Botswana",
      category,
      message,
      timestamp: new Date().toISOString(),
      source: "web",
    };

    inquiries.unshift(newInquiry);
    writeInquiries(inquiries);

    res.json({ success: true, inquiry: newInquiry });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// 4. Fetch Inquiry List (Local + Google Form synced ones)
app.get("/api/inquiries/list", (req, res) => {
  try {
    const inquiries = readInquiries();
    res.json(inquiries);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// 5. Create a Google Form dynamically using Google Workspace Skill APIs
app.post("/api/forms/create", async (req, res) => {
  try {
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

    res.json({
      success: true,
      formId: formId,
      responderUri: createRes.data.responderUri, // Public link to fill out the form!
      editUri: driveFile.data.webViewLink, // Admin Link to edit in Drive!
    });
  } catch (error: any) {
    console.error("Google Forms creation failed:", error);
    res.status(500).json({ error: error.message || "Failed to create Google Form" });
  }
});

// 6. Fetch Google Form Responses dynamically & sync with app dashboard
app.post("/api/forms/responses", async (req, res) => {
  try {
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
