import React, { useState, useEffect } from "react";
import { 
  FileSpreadsheet, 
  RefreshCw, 
  ExternalLink, 
  PlusCircle, 
  CheckCircle2, 
  HelpCircle, 
  TrendingUp, 
  Database,
  Search,
  Globe,
  Mail,
  User,
  ShieldCheck,
  AlertTriangle,
  FileText
} from "lucide-react";
import { Inquiry, GoogleFormConfig } from "../types";

export default function AdminPanel({ onAddInquiryNotification }: { onAddInquiryNotification?: () => void }) {
  const [inquiries, setInquiries] = useState<Inquiry[]>([]);
  const [search, setSearch] = useState("");
  const [filterSource, setFilterSource] = useState<"all" | "web" | "google-form">("all");
  const [filterCategory, setFilterCategory] = useState("all");
  const [isLoading, setIsLoading] = useState(false);
  
  // Google API Settings state
  const [accessToken, setAccessToken] = useState<string>(() => {
    return sessionStorage.getItem("google_access_token") || "";
  });
  const [formConfig, setFormConfig] = useState<GoogleFormConfig | null>(() => {
    const saved = localStorage.getItem("google_form_config");
    return saved ? JSON.parse(saved) : null;
  });
  const [showConfig, setShowConfig] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [successMessage, setSuccessMessage] = useState("");

  // Load inquiries
  const fetchInquiries = async () => {
    setIsLoading(true);
    try {
      const res = await fetch("/api/inquiries/list");
      const data = await res.json();
      if (res.ok) {
        setInquiries(data);
      }
    } catch (err) {
      console.error("Error fetching inquiries:", err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchInquiries();
  }, []);

  // Save config to localstorage
  const saveFormConfig = (config: GoogleFormConfig | null) => {
    setFormConfig(config);
    if (config) {
      localStorage.setItem("google_form_config", JSON.stringify(config));
    } else {
      localStorage.removeItem("google_form_config");
    }
  };

  // Google OAuth Access Token management helper
  const handleSaveToken = (token: string) => {
    setAccessToken(token);
    sessionStorage.setItem("google_access_token", token);
    setSuccessMessage("OAuth Access Token saved in memory.");
    setTimeout(() => setSuccessMessage(""), 3000);
  };

  // Create Google Form in real Drive using Google Forms API
  const handleCreateGoogleForm = async () => {
    if (!accessToken) {
      setErrorMessage("Please authenticate or provide a Google OAuth Access Token in the developer config panel first.");
      return;
    }
    setErrorMessage("");
    setIsLoading(true);
    setSuccessMessage("Creating form inside your Google Drive...");

    try {
      const res = await fetch("/api/forms/create", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ accessToken }),
      });

      const data = await res.json();
      if (res.ok && data.success) {
        const config: GoogleFormConfig = {
          formId: data.formId,
          responderUri: data.responderUri,
          editUri: data.editUri,
        };
        saveFormConfig(config);
        setSuccessMessage("🎉 Success! Real Google Form created successfully in your Google Drive.");
      } else {
        setErrorMessage(data.error || "Failed to create Google Form. Please check if your access token is valid or expired.");
        setSuccessMessage("");
      }
    } catch (err: any) {
      setErrorMessage("Network error: Failed to connect with server.");
      setSuccessMessage("");
    } finally {
      setIsLoading(false);
    }
  };

  // Sync real responses from Google Form responses endpoint
  const handleSyncGoogleResponses = async () => {
    if (!accessToken || !formConfig) {
      setErrorMessage("Requires active Google access token and an existing Google Form setup.");
      return;
    }
    setErrorMessage("");
    setIsLoading(true);
    setSuccessMessage("Syncing responses with Google Forms API...");

    try {
      const res = await fetch("/api/forms/responses", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          accessToken,
          formId: formConfig.formId,
        }),
      });

      const data = await res.json();
      if (res.ok && data.success) {
        setSuccessMessage(`Successfully synced ${data.syncedCount} new inquiry entries from Google Forms!`);
        fetchInquiries();
        if (onAddInquiryNotification) {
          onAddInquiryNotification();
        }
      } else {
        setErrorMessage(data.error || "Failed to fetch responses. Ensure the form has responses or check token.");
      }
    } catch (err) {
      setErrorMessage("Network error: Sync failed.");
    } finally {
      setIsLoading(false);
    }
  };

  // Filter inquiries
  const filteredInquiries = inquiries.filter((inq) => {
    const matchesSearch = 
      inq.name.toLowerCase().includes(search.toLowerCase()) ||
      inq.email.toLowerCase().includes(search.toLowerCase()) ||
      (inq.org || "").toLowerCase().includes(search.toLowerCase()) ||
      inq.message.toLowerCase().includes(search.toLowerCase());
      
    const matchesSource = filterSource === "all" || inq.source === filterSource;
    const matchesCategory = filterCategory === "all" || inq.category.includes(filterCategory);

    return matchesSearch && matchesSource && matchesCategory;
  });

  return (
    <div id="admin-panel" className="bg-surface p-6 rounded-3xl border border-outline-variant shadow-lg space-y-8">
      {/* Header section with Stats */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h2 className="text-headline-lg font-bold text-primary flex items-center gap-2">
            <Database className="w-7 h-7 text-primary" /> Admin Portal & Workspace Panel
          </h2>
          <p className="text-sm text-on-surface-variant mt-1">
            Manage farmer inquiries and synchronize data using Google Forms & Google Drive.
          </p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => setShowConfig(!showConfig)}
            className="px-4 py-2 border border-outline text-on-surface-variant font-bold rounded-xl text-xs hover:bg-surface-variant/40 flex items-center gap-1.5 transition-all"
          >
            <ShieldCheck className="w-4 h-4 text-primary" />
            {showConfig ? "Hide API Credentials" : "Show Google OAuth API settings"}
          </button>
          <button
            onClick={fetchInquiries}
            className="p-2 bg-surface-container hover:bg-surface-container-high rounded-xl text-primary flex items-center justify-center transition-all"
            title="Refresh Inquiries"
          >
            <RefreshCw className={`w-5 h-5 ${isLoading ? "animate-spin" : ""}`} />
          </button>
        </div>
      </div>

      {/* Google Workspace Setup Config Panel */}
      {showConfig && (
        <div className="p-6 bg-surface-container rounded-2xl border border-outline/30 space-y-4 animate-fadeIn">
          <div className="flex items-center gap-2 text-primary font-bold text-sm">
            <FileSpreadsheet className="w-5 h-5" />
            <span>Google Forms & Drive API Developer Configuration</span>
          </div>
          <p className="text-xs text-on-surface-variant max-w-2xl leading-relaxed">
            Because this is running in a secure, isolated preview environment, you can integrate your actual Google Form creation! 
            Simply paste your Google Access Token below. This token lets the server make real Google API calls on your behalf 
            to create inquiry forms in your Google Drive and fetch farmer replies.
          </p>

          <div className="space-y-3">
            <div>
              <label className="block text-xs font-bold text-primary mb-1">Your Google Access Token</label>
              <div className="flex gap-2">
                <input
                  type="password"
                  value={accessToken}
                  onChange={(e) => handleSaveToken(e.target.value)}
                  placeholder="Paste your OAuth Access Token (ya29.a0AfH6...)"
                  className="flex-1 max-w-xl h-11 px-3 text-xs bg-surface-container-lowest border border-outline-variant rounded-xl focus:outline-none focus:border-primary text-on-surface"
                />
                {accessToken ? (
                  <button
                    onClick={() => handleSaveToken("")}
                    className="px-3 bg-error/10 text-error hover:bg-error/20 font-bold rounded-xl text-xs transition-all"
                  >
                    Clear Token
                  </button>
                ) : (
                  <a
                    href="https://developers.google.com/oauthplayground/"
                    target="_blank"
                    rel="noreferrer"
                    className="px-4 bg-surface-container-low border border-outline hover:bg-surface-container-high text-xs font-bold rounded-xl flex items-center justify-center gap-1 text-on-surface-variant transition-all"
                  >
                    OAuth Playground <ExternalLink className="w-3.5 h-3.5" />
                  </a>
                )}
              </div>
              <p className="text-[10px] text-outline mt-1">
                Tip: Standard OAuth scopes requested are: <code className="bg-surface-container-low px-1 py-0.5 rounded text-primary">forms.body</code>, <code className="bg-surface-container-low px-1 py-0.5 rounded text-primary">forms.responses.readonly</code>, and <code className="bg-surface-container-low px-1 py-0.5 rounded text-primary">drive.file</code>.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Alert Messages */}
      {errorMessage && (
        <div className="p-4 bg-error/10 border border-error/20 text-error rounded-xl flex items-start gap-2.5 text-xs">
          <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
          <div>{errorMessage}</div>
        </div>
      )}
      {successMessage && (
        <div className="p-4 bg-primary/10 border border-primary-fixed text-primary rounded-xl flex items-start gap-2.5 text-xs">
          <CheckCircle2 className="w-4 h-4 shrink-0 mt-0.5 text-primary" />
          <div>{successMessage}</div>
        </div>
      )}

      {/* Workspace Management Actions */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Google Forms Builder Integration Card */}
        <div className="p-6 bg-surface-container-low rounded-2xl border border-outline-variant/40 flex flex-col justify-between space-y-4">
          <div className="space-y-2">
            <span className="text-[10px] font-bold text-outline uppercase tracking-wider block">Google Workspace Integration</span>
            <h3 className="text-lg font-bold text-primary flex items-center gap-2">
              <FileSpreadsheet className="w-5 h-5 text-primary" /> Google Forms Synchronization
            </h3>
            <p className="text-xs text-on-surface-variant leading-relaxed">
              Create a fully functional form inside your Google Drive. This form lets farmers apply directly from outside, 
              which you can then sync back to this dashboard.
            </p>
          </div>

          <div className="pt-2">
            {formConfig ? (
              <div className="space-y-3 bg-surface-container-lowest p-4 rounded-xl border border-outline-variant/30 text-xs">
                <div className="flex items-center justify-between text-primary font-bold">
                  <span className="flex items-center gap-1 text-[11px]"><CheckCircle2 className="w-3.5 h-3.5 text-primary" /> Connected Form</span>
                  <button onClick={() => saveFormConfig(null)} className="text-error hover:underline text-[10px]">Disconnect</button>
                </div>
                <div className="space-y-1.5 text-on-surface-variant text-[11px]">
                  <p className="truncate"><strong>Form ID</strong>: {formConfig.formId}</p>
                </div>
                <div className="flex gap-2 pt-1">
                  <a
                    href={formConfig.responderUri}
                    target="_blank"
                    rel="noreferrer"
                    className="flex-1 bg-primary text-on-primary font-bold text-center py-2 rounded-lg hover:brightness-110 flex items-center justify-center gap-1 transition-all"
                  >
                    Open Form <ExternalLink className="w-3 h-3" />
                  </a>
                  <a
                    href={formConfig.editUri}
                    target="_blank"
                    rel="noreferrer"
                    className="flex-1 border border-outline text-on-surface-variant text-center font-bold py-2 rounded-lg hover:bg-surface-container flex items-center justify-center gap-1 transition-all"
                  >
                    Edit in Drive <ExternalLink className="w-3 h-3" />
                  </a>
                </div>
              </div>
            ) : (
              <button
                onClick={handleCreateGoogleForm}
                className="w-full h-11 bg-primary text-on-primary hover:bg-primary-container hover:text-on-primary-container font-bold rounded-xl flex items-center justify-center gap-1.5 transition-all text-xs"
              >
                <PlusCircle className="w-4 h-4" /> Create Agricool Form in Google Drive
              </button>
            )}
          </div>
        </div>

        {/* Sync Controls Panel */}
        <div className="p-6 bg-surface-container-low rounded-2xl border border-outline-variant/40 flex flex-col justify-between space-y-4">
          <div className="space-y-2">
            <span className="text-[10px] font-bold text-outline uppercase tracking-wider block">Operational Controls</span>
            <h3 className="text-lg font-bold text-primary flex items-center gap-2">
              <Database className="w-5 h-5 text-primary" /> Form Response Pull Engine
            </h3>
            <p className="text-xs text-on-surface-variant leading-relaxed">
              Use this utility to fetch real submissions submitted by farmers from Google Forms API. It maps question IDs 
              to our inquiries schema dynamically.
            </p>
          </div>

          <div className="pt-2">
            <button
              onClick={handleSyncGoogleResponses}
              disabled={!formConfig}
              className="w-full h-11 bg-secondary-container hover:brightness-105 text-on-secondary-container font-bold rounded-xl flex items-center justify-center gap-1.5 transition-all text-xs disabled:opacity-45"
            >
              <RefreshCw className="w-4 h-4" /> Sync submissions with Google Forms API
            </button>
            {!formConfig && (
              <p className="text-[10px] text-center text-outline mt-2 italic">
                *Create or link a Google Form first to enable real-time API syncing.
              </p>
            )}
          </div>
        </div>
      </div>

      {/* Inquiry Filtering and List Display */}
      <div className="space-y-4 pt-4 border-t border-outline-variant/30">
        <h3 className="text-md font-bold text-primary flex items-center gap-1.5">
          <FileText className="w-5 h-5 text-primary" /> Submitted Farmers Inquiries ({filteredInquiries.length})
        </h3>

        {/* Filters bar */}
        <div className="flex flex-col md:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-outline" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by farmer name, email, message..."
              className="w-full h-11 pl-9 pr-3 text-xs bg-surface-container-lowest border border-outline-variant rounded-xl focus:outline-none focus:border-primary text-on-surface"
            />
          </div>
          <div className="flex gap-2">
            <select
              value={filterSource}
              onChange={(e: any) => setFilterSource(e.target.value)}
              className="h-11 px-3 text-xs bg-surface-container-lowest border border-outline-variant rounded-xl focus:outline-none focus:border-primary text-on-surface font-medium"
            >
              <option value="all">All Sources</option>
              <option value="web">Web form submissions</option>
              <option value="google-form">Google Forms (Synced)</option>
            </select>

            <select
              value={filterCategory}
              onChange={(e) => setFilterCategory(e.target.value)}
              className="h-11 px-3 text-xs bg-surface-container-lowest border border-outline-variant rounded-xl focus:outline-none focus:border-primary text-on-surface font-medium"
            >
              <option value="all">All Categories</option>
              <option value="Inquiry">General Inquiry</option>
              <option value="Pilot">Pilot Participation</option>
              <option value="Support">Support Agricool</option>
            </select>
          </div>
        </div>

        {/* Inquiry List Cards */}
        {filteredInquiries.length === 0 ? (
          <div className="p-12 text-center border border-dashed border-outline-variant rounded-2xl bg-surface-container-low text-on-surface-variant">
            <HelpCircle className="w-10 h-10 mx-auto text-outline opacity-40 mb-2" />
            <p className="text-sm font-bold">No inquiry submissions found</p>
            <p className="text-xs text-outline mt-1">Try relaxing filters or submit an inquiry using the form below.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredInquiries.map((inq) => (
              <div
                key={inq.id}
                className="p-5 bg-surface-container-lowest border border-outline-variant/60 rounded-2xl flex flex-col justify-between hover:border-primary transition-all relative group"
              >
                {/* Source Badge */}
                <div className="absolute top-4 right-4 flex gap-1">
                  <span
                    className={`px-2 py-0.5 rounded-full text-[9px] font-bold ${
                      inq.source === "google-form"
                        ? "bg-secondary-container text-on-secondary-container"
                        : "bg-primary-container text-on-primary-container"
                    }`}
                  >
                    {inq.source === "google-form" ? "Google Form" : "Web Site"}
                  </span>
                </div>

                <div className="space-y-3.5">
                  <div className="space-y-1">
                    <span className="text-[9px] font-bold text-outline tracking-wider uppercase">{inq.category}</span>
                    <h4 className="text-sm font-bold text-primary flex items-center gap-1.5 pt-0.5">
                      <User className="w-4 h-4 text-primary" /> {inq.name}
                    </h4>
                    {inq.org && (
                      <p className="text-[11px] font-medium text-on-surface-variant italic">
                        {inq.org}
                      </p>
                    )}
                  </div>

                  <p className="text-xs text-on-surface leading-relaxed line-clamp-4 bg-surface-container-low p-2.5 rounded-lg border border-outline-variant/20 italic">
                    "{inq.message}"
                  </p>
                </div>

                <div className="mt-4 pt-3 border-t border-outline-variant/30 flex justify-between items-center text-[10px] text-outline">
                  <span className="flex items-center gap-1">
                    <Mail className="w-3.5 h-3.5" /> {inq.email}
                  </span>
                  <span className="flex items-center gap-1 font-bold">
                    <Globe className="w-3.5 h-3.5 text-primary" /> {inq.country}
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
