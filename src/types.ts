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
