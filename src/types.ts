export interface Inquiry {
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

export interface ChatMessage {
  id: string;
  role: "user" | "model";
  content: string;
  timestamp: string;
}

export interface GoogleFormConfig {
  formId: string;
  responderUri: string;
  editUri: string;
}

export interface AuditLogEntry {
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

export interface SecurityPostureStatus {
  sourceCodeSecure: boolean;
  mfaEnabled: boolean;
  accountLockoutActive: boolean;
  activeLockoutsCount: number;
  failedAttemptsCount: number;
  apiPoLPEnforced: boolean;
  activeSessionsCount: number;
  encryptionMode: string;
  auditTrailCount: number;
}

export interface AdminSession {
  token: string;
  email: string;
  expiresAt: number;
}

