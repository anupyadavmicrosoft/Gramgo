import React, { useState, useEffect } from "react";
import { 
  MessageSquare, 
  Settings, 
  Send, 
  Plus, 
  Trash2, 
  RefreshCw, 
  Check, 
  X, 
  AlertCircle, 
  Info, 
  Play, 
  CheckCircle2, 
  BookOpen, 
  ShieldCheck, 
  Terminal,
  Activity
} from "lucide-react";

interface WhatsAppSettingsProps {
  token: string | null;
  onShowToast: (text: string, type: "success" | "error") => void;
}

interface Template {
  id?: string;
  _id?: string;
  name: string;
  category: "EMERGENCY" | "UTILITY" | "MARKETING";
  language: string;
  components: Array<{
    type: string;
    text: string;
    example?: { header_handle?: string[]; body_text?: string[][] };
  }>;
  status: "APPROVED" | "PENDING" | "REJECTED";
}

interface WhatsAppMessage {
  id: string;
  _id?: string;
  recipientPhone: string;
  templateName: string;
  status: "queued" | "sent" | "delivered" | "read" | "failed";
  variables: string[];
  errorMessage?: string;
  createdAt: string;
  updatedAt: string;
}

interface DeliveryLog {
  id: string;
  _id?: string;
  messageId: string;
  status: string;
  timestamp: string;
  metaResponse?: any;
}

export default function WhatsAppSettings({ token, onShowToast }: WhatsAppSettingsProps) {
  // Tab control inside WhatsApp Settings
  const [activeSubTab, setActiveSubTab] = useState<"config" | "templates" | "logs" | "sandbox">("config");

  // Settings State
  const [enabled, setEnabled] = useState(false);
  const [defaultCountryCode, setDefaultCountryCode] = useState("+91");
  const [phoneNumberId, setPhoneNumberId] = useState("");
  const [businessAccountId, setBusinessAccountId] = useState("");
  const [accessToken, setAccessToken] = useState("");
  const [webhookVerifyToken, setWebhookVerifyToken] = useState("");
  const [isLiveMode, setIsLiveMode] = useState(false);
  const [isLoadingSettings, setIsLoadingSettings] = useState(false);
  const [isSavingSettings, setIsSavingSettings] = useState(false);

  // Connection Test State
  const [testPhone, setTestPhone] = useState("");
  const [testTemplate, setTestTemplate] = useState("SOS_EMERGENCY");
  const [testParams, setTestParams] = useState<string[]>(["Sherpur", "Maternity Case"]);
  const [isTesting, setIsTesting] = useState(false);

  // Template Manager State
  const [templates, setTemplates] = useState<Template[]>([]);
  const [isLoadingTemplates, setIsLoadingTemplates] = useState(false);
  const [isCreatingTemplate, setIsCreatingTemplate] = useState(false);
  const [newTemplateName, setNewTemplateName] = useState("");
  const [newTemplateCategory, setNewTemplateCategory] = useState<"EMERGENCY" | "UTILITY" | "MARKETING">("EMERGENCY");
  const [newTemplateBody, setNewTemplateBody] = useState("");
  const [newTemplateLang, setNewTemplateLang] = useState("en_US");

  // Logs & Audits State
  const [messages, setMessages] = useState<WhatsAppMessage[]>([]);
  const [logs, setLogs] = useState<DeliveryLog[]>([]);
  const [isLoadingLogs, setIsLoadingLogs] = useState(false);

  // Inbound Simulation State
  const [incomingSender, setIncomingSender] = useState("");
  const [incomingText, setIncomingText] = useState("");
  const [isSimulatingInbound, setIsSimulatingInbound] = useState(false);

  // Fetch Settings on mount
  useEffect(() => {
    if (token) {
      fetchSettings();
      fetchTemplates();
      fetchLogsAndMessages();
    }
  }, [token]);

  const fetchSettings = async () => {
    setIsLoadingSettings(true);
    try {
      const res = await fetch("/api/whatsapp/settings", {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setEnabled(data.enabled || false);
        setDefaultCountryCode(data.defaultCountryCode || "+91");
        setPhoneNumberId(data.phoneNumberId || "");
        setBusinessAccountId(data.businessAccountId || "");
        setAccessToken(data.accessToken || "");
        setWebhookVerifyToken(data.webhookVerifyToken || "");
        setIsLiveMode(data.isLiveMode || false);
      }
    } catch (err) {
      console.error("Error fetching WhatsApp settings:", err);
    } finally {
      setIsLoadingSettings(false);
    }
  };

  const handleSaveSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSavingSettings(true);
    try {
      const res = await fetch("/api/whatsapp/settings", {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({
          enabled,
          defaultCountryCode,
          phoneNumberId,
          businessAccountId,
          accessToken,
          webhookVerifyToken
        })
      });
      if (res.ok) {
        const data = await res.json();
        onShowToast("WhatsApp settings updated successfully!", "success");
        setIsLiveMode(data.settings?.isLiveMode || false);
      } else {
        const errData = await res.json();
        onShowToast(errData.error || "Failed to update settings", "error");
      }
    } catch (err) {
      console.error(err);
      onShowToast("Network error saving settings", "error");
    } finally {
      setIsSavingSettings(false);
    }
  };

  const fetchTemplates = async () => {
    setIsLoadingTemplates(true);
    try {
      const res = await fetch("/api/whatsapp/templates", {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setTemplates(data || []);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setIsLoadingTemplates(false);
    }
  };

  const handleCreateTemplate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTemplateName) return;

    try {
      const res = await fetch("/api/whatsapp/templates", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({
          name: newTemplateName.toUpperCase().replace(/\s+/g, "_"),
          category: newTemplateCategory,
          language: newTemplateLang,
          bodyText: newTemplateBody
        })
      });

      if (res.ok) {
        onShowToast("Template submitted successfully! (Sandbox auto-approved)", "success");
        setNewTemplateName("");
        setNewTemplateBody("");
        setIsCreatingTemplate(false);
        fetchTemplates();
      } else {
        const err = await res.json();
        onShowToast(err.error || "Failed to create template", "error");
      }
    } catch (err) {
      console.error(err);
      onShowToast("Network error creating template", "error");
    }
  };

  const handleDeleteTemplate = async (id: string) => {
    if (!window.confirm("Are you sure you want to delete this message template?")) return;
    try {
      const res = await fetch(`/api/whatsapp/templates/${id}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        onShowToast("Template deleted successfully.", "success");
        fetchTemplates();
      } else {
        onShowToast("Failed to delete template.", "error");
      }
    } catch (err) {
      console.error(err);
    }
  };

  const fetchLogsAndMessages = async () => {
    setIsLoadingLogs(true);
    try {
      const [msgRes, logRes] = await Promise.all([
        fetch("/api/whatsapp/messages", { headers: { Authorization: `Bearer ${token}` } }),
        fetch("/api/whatsapp/logs", { headers: { Authorization: `Bearer ${token}` } })
      ]);
      if (msgRes.ok) {
        const msgData = await msgRes.json();
        setMessages(msgData || []);
      }
      if (logRes.ok) {
        const logData = await logRes.json();
        setLogs(logData || []);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setIsLoadingLogs(false);
    }
  };

  const handleTestConnection = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!testPhone) {
      onShowToast("Please enter a recipient phone number.", "error");
      return;
    }
    setIsTesting(true);
    try {
      const res = await fetch("/api/whatsapp/test-connection", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({
          recipientPhone: testPhone,
          templateName: testTemplate,
          variables: testParams
        })
      });

      if (res.ok) {
        const data = await res.json();
        if (data.isLive) {
          onShowToast(`Live Meta API message queued successfully! Message ID: ${data.messageId}`, "success");
        } else {
          onShowToast(`Sandbox Simulation Mode: Dispatch simulated successfully!`, "success");
        }
        fetchLogsAndMessages();
      } else {
        const err = await res.json();
        onShowToast(err.error || "Test connection failed.", "error");
      }
    } catch (err) {
      console.error(err);
      onShowToast("Network error executing connection test", "error");
    } finally {
      setIsTesting(false);
    }
  };

  const handleSimulateInbound = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!incomingSender || !incomingText) {
      onShowToast("Please enter sender number and message text", "error");
      return;
    }
    setIsSimulatingInbound(true);
    try {
      const res = await fetch("/api/whatsapp/simulate-incoming", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({
          senderPhone: incomingSender,
          messageText: incomingText
        })
      });
      if (res.ok) {
        onShowToast("Simulated inbound customer message received!", "success");
        setIncomingText("");
        fetchLogsAndMessages();
      } else {
        onShowToast("Inbound simulation failed.", "error");
      }
    } catch (err) {
      console.error(err);
    } finally {
      setIsSimulatingInbound(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Hero Card */}
      <div className="bg-gradient-to-br from-slate-900 via-slate-850 to-slate-900 text-white rounded-3xl p-6 shadow-xl relative overflow-hidden">
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-6 z-10 relative">
          <div className="space-y-1">
            <div className="flex items-center space-x-2">
              <span className="px-2.5 py-0.5 bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 text-[10px] font-black uppercase rounded-lg tracking-wider">
                Communications Hub
              </span>
              <span className={`px-2 py-0.5 text-[10px] rounded-lg font-black uppercase flex items-center gap-1 border ${
                enabled 
                  ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20" 
                  : "bg-slate-800 text-slate-400 border-slate-700"
              }`}>
                <span className={`w-1.5 h-1.5 rounded-full ${enabled ? "bg-emerald-400 animate-pulse" : "bg-slate-500"}`} />
                {enabled ? "Active" : "Disabled"}
              </span>
              <span className="bg-blue-500/10 text-blue-400 border border-blue-500/20 px-2 py-0.5 rounded-lg font-black text-[10px]">
                {isLiveMode ? "Meta API Live Mode" : "Sandbox Simulator Active"}
              </span>
            </div>
            <h2 className="text-xl font-black tracking-tight text-white flex items-center gap-2">
              <MessageSquare className="w-5 h-5 text-emerald-400" />
              <span>WhatsApp Business API Gateway</span>
            </h2>
            <p className="text-xs text-slate-400 max-w-xl font-semibold">
              Official WhatsApp Cloud API architecture. Broadcasts dynamic SOS alerts to nearby drivers, shares live-tracking links with patient family members, and logs dispatcher actions.
            </p>
          </div>

          <button 
            onClick={() => {
              fetchSettings();
              fetchTemplates();
              fetchLogsAndMessages();
              onShowToast("Refreshing communications state...", "success");
            }}
            className="p-3 bg-slate-800 hover:bg-slate-750 text-slate-300 hover:text-white rounded-2xl border border-slate-750 transition cursor-pointer self-end md:self-auto"
            title="Refresh logs and settings"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
        </div>
        <div className="absolute right-0 top-0 w-64 h-64 bg-emerald-500/5 rounded-full blur-3xl -z-0 pointer-events-none" />
      </div>

      {/* Sub-Navigation Tabs inside WhatsApp */}
      <div className="flex flex-wrap gap-2 border-b border-slate-100 pb-3">
        {[
          { id: "config", label: "Gateway Credentials", icon: Settings },
          { id: "templates", label: "Template Manager", icon: BookOpen },
          { id: "logs", label: "Communications Ledger", icon: Activity },
          { id: "sandbox", label: "Interactive Inbound Simulator", icon: Terminal }
        ].map((tab) => {
          const Icon = tab.icon;
          const isActive = activeSubTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveSubTab(tab.id as any)}
              className={`px-4 py-2 rounded-2xl text-xs font-extrabold transition-all border cursor-pointer flex items-center space-x-1.5 ${
                isActive
                  ? "bg-slate-900 text-white border-slate-900 shadow"
                  : "bg-white text-slate-600 hover:text-slate-900 hover:bg-slate-50 border-slate-100"
              }`}
            >
              <Icon className="w-4 h-4" />
              <span>{tab.label}</span>
            </button>
          );
        })}
      </div>

      {/* Content Panels */}
      {activeSubTab === "config" && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Settings form */}
          <div className="lg:col-span-7 bg-white border border-slate-100 rounded-3xl p-6 shadow-sm space-y-6">
            <div>
              <h3 className="text-sm font-black text-slate-900">Meta Cloud API Configuration</h3>
              <p className="text-xs text-slate-400">Configure parameters for direct secure integration with Meta Developers Console.</p>
            </div>

            <form onSubmit={handleSaveSettings} className="space-y-4 font-semibold text-slate-700">
              {/* Enable / Disable Gateway Toggle */}
              <div className="flex items-center justify-between p-4 bg-slate-50 rounded-2xl border border-slate-100">
                <div className="space-y-0.5 pr-4">
                  <span className="text-xs font-extrabold text-slate-900 block">Enable WhatsApp Gateway</span>
                  <span className="text-[10px] text-slate-400 font-bold block">If turned off, no SOS alerts or transit links will dispatch via WhatsApp.</span>
                </div>
                <label className="relative inline-flex items-center cursor-pointer select-none">
                  <input 
                    type="checkbox" 
                    checked={enabled}
                    onChange={(e) => setEnabled(e.target.checked)}
                    className="sr-only peer"
                  />
                  <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-emerald-600"></div>
                </label>
              </div>

              {/* Grid Inputs */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label htmlFor="country-code-input" className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Default Country Code</label>
                  <input
                    id="country-code-input"
                    type="text"
                    required
                    placeholder="+91"
                    value={defaultCountryCode}
                    onChange={(e) => setDefaultCountryCode(e.target.value)}
                    className="w-full px-3.5 py-2 bg-slate-50 border border-slate-100 rounded-xl focus:bg-white focus:outline-none focus:border-emerald-500 text-xs font-bold transition"
                  />
                </div>

                <div className="space-y-1.5">
                  <label htmlFor="verify-token-input" className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Webhook Verify Token</label>
                  <input
                    id="verify-token-input"
                    type="text"
                    placeholder="gramgo_secret_verify_token"
                    value={webhookVerifyToken}
                    onChange={(e) => setWebhookVerifyToken(e.target.value)}
                    className="w-full px-3.5 py-2 bg-slate-50 border border-slate-100 rounded-xl focus:bg-white focus:outline-none focus:border-emerald-500 text-xs font-bold transition"
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <label htmlFor="phone-id-input" className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">WhatsApp Phone Number ID</label>
                <input
                  id="phone-id-input"
                  type="text"
                  placeholder="e.g. 104729384729103"
                  value={phoneNumberId}
                  onChange={(e) => setPhoneNumberId(e.target.value)}
                  className="w-full px-3.5 py-2 bg-slate-50 border border-slate-100 rounded-xl focus:bg-white focus:outline-none focus:border-emerald-500 text-xs font-bold transition"
                />
                <span className="text-[10px] text-slate-400 leading-normal block">Found under the "API Setup" tab in Meta Developers portal.</span>
              </div>

              <div className="space-y-1.5">
                <label htmlFor="account-id-input" className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">WhatsApp Business Account ID</label>
                <input
                  id="account-id-input"
                  type="text"
                  placeholder="e.g. 102834729102947"
                  value={businessAccountId}
                  onChange={(e) => setBusinessAccountId(e.target.value)}
                  className="w-full px-3.5 py-2 bg-slate-50 border border-slate-100 rounded-xl focus:bg-white focus:outline-none focus:border-emerald-500 text-xs font-bold transition"
                />
              </div>

              <div className="space-y-1.5">
                <label htmlFor="access-token-input" className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">System User Permanent Access Token</label>
                <input
                  id="access-token-input"
                  type="password"
                  placeholder="EAAGBv..."
                  value={accessToken}
                  onChange={(e) => setAccessToken(e.target.value)}
                  className="w-full px-3.5 py-2 bg-slate-50 border border-slate-100 rounded-xl focus:bg-white focus:outline-none focus:border-emerald-500 text-xs font-bold transition"
                />
              </div>

              {/* Mode indicator banner */}
              {!phoneNumberId || !accessToken ? (
                <div className="p-3 bg-amber-50 border border-amber-100 rounded-2xl flex items-start space-x-2 text-[11px] text-amber-800 leading-relaxed">
                  <Info className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                  <span>
                    <strong>Sandbox Simulator Mode Active:</strong> Fill in Phone ID and Permanent Access Token to dispatch live messages. While empty, GramGo runs safe offline simulated handshakes, complete with automatic delivered & read webhooks.
                  </span>
                </div>
              ) : (
                <div className="p-3 bg-emerald-50 border border-emerald-100 rounded-2xl flex items-start space-x-2 text-[11px] text-emerald-800 leading-relaxed">
                  <ShieldCheck className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                  <span>
                    <strong>Meta Cloud API Live Mode:</strong> All dispatches will trigger real HTTPS outbound calls to Meta Developers endpoints. Confirm your templates are approved in Meta Console.
                  </span>
                </div>
              )}

              <button
                type="submit"
                disabled={isSavingSettings}
                className="w-full py-2.5 bg-slate-900 hover:bg-slate-800 disabled:opacity-50 text-white rounded-xl text-xs font-black uppercase cursor-pointer transition shadow"
              >
                {isSavingSettings ? "Saving Settings..." : "Save Configuration Credentials"}
              </button>
            </form>
          </div>

          {/* Test connection panel */}
          <div className="lg:col-span-5 space-y-6">
            <div className="bg-white border border-slate-100 rounded-3xl p-6 shadow-sm space-y-4">
              <div>
                <h3 className="text-sm font-black text-slate-900">Verify Gateway Connection</h3>
                <p className="text-xs text-slate-400 font-semibold">Send a test notification template to verify dispatch pipeline routing.</p>
              </div>

              <form onSubmit={handleTestConnection} className="space-y-4 font-semibold text-slate-700">
                <div className="space-y-1.5">
                  <label htmlFor="test-phone-input" className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Recipient Mobile Number</label>
                  <input
                    id="test-phone-input"
                    type="text"
                    required
                    placeholder="e.g. 9876543210 (exclude country code)"
                    value={testPhone}
                    onChange={(e) => setTestPhone(e.target.value)}
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-100 rounded-xl focus:bg-white focus:outline-none focus:border-emerald-500 text-xs font-bold transition"
                  />
                  <span className="text-[10px] text-slate-400 block leading-normal">
                    Matches with Default Country Code: <strong className="text-slate-800">{defaultCountryCode} {testPhone || "98765-XXXXX"}</strong>
                  </span>
                </div>

                <div className="space-y-1.5">
                  <label htmlFor="test-template-select" className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block font-black">Select Message Template</label>
                  <select
                    id="test-template-select"
                    value={testTemplate}
                    onChange={(e) => {
                      setTestTemplate(e.target.value);
                      if (e.target.value === "SOS_EMERGENCY") {
                        setTestParams(["Sherpur", "Maternity Case"]);
                      } else if (e.target.value === "DISPATCH_ASSIGNED") {
                        setTestParams(["Rajesh Kumar", "🛺 Bolero SUV (UP65-Z-9988)", "9876543210"]);
                      } else {
                        setTestParams(["Ghazipur CHC", "₹250"]);
                      }
                    }}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-100 text-xs font-bold rounded-xl cursor-pointer"
                  >
                    <option value="SOS_EMERGENCY">SOS Emergency Dispatch Alert (2 variables)</option>
                    <option value="DISPATCH_ASSIGNED">Pilot Assignment Notification (3 variables)</option>
                    <option value="RIDE_COMPLETED">Transit Summary & Receipt (2 variables)</option>
                  </select>
                </div>

                {/* Parameters Editor */}
                <div className="space-y-2 bg-slate-50 p-3.5 rounded-2xl border border-slate-100">
                  <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">Template Parameters Values</span>
                  <div className="space-y-2 text-xs">
                    {testParams.map((val, idx) => (
                      <div key={idx} className="space-y-1">
                        <label htmlFor={`param-input-${idx}`} className="text-[9px] text-slate-400 font-bold block">Variable `{"{{"}{idx + 1}{"}}"}` value</label>
                        <input
                          id={`param-input-${idx}`}
                          type="text"
                          required
                          value={val}
                          onChange={(e) => {
                            const updated = [...testParams];
                            updated[idx] = e.target.value;
                            setTestParams(updated);
                          }}
                          className="w-full px-2.5 py-1.5 bg-white border border-slate-100 rounded-lg text-xs font-bold focus:outline-none"
                        />
                      </div>
                    ))}
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={isTesting || !enabled}
                  className="w-full py-2.5 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white rounded-xl text-xs font-black uppercase flex items-center justify-center space-x-1.5 cursor-pointer shadow-md"
                >
                  {isTesting ? (
                    <>
                      <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                      <span>Dispatching Test...</span>
                    </>
                  ) : (
                    <>
                      <Send className="w-3.5 h-3.5" />
                      <span>Send Test Template Message</span>
                    </>
                  )}
                </button>
                {!enabled && (
                  <p className="text-[10px] text-rose-600 font-bold text-center leading-normal">
                    * Enable the WhatsApp Gateway first before sending tests.
                  </p>
                )}
              </form>
            </div>

            {/* Quick Helper Webhook Info */}
            <div className="bg-slate-50 border border-slate-150 rounded-3xl p-5 space-y-3">
              <h4 className="text-xs font-black text-slate-900 flex items-center space-x-1">
                <ShieldCheck className="w-4 h-4 text-emerald-600" />
                <span>Panchayat Webhook Listener</span>
              </h4>
              <p className="text-[10px] leading-relaxed text-slate-500 font-semibold">
                Receive real-time delivery handshakes, read markers, and incoming customer inquiries directly by mapping your Meta Webhook URL to:
              </p>
              <div className="bg-slate-900 text-emerald-400 p-2.5 rounded-xl font-mono text-[9px] select-all break-all overflow-x-auto shadow-inner">
                {window.location.origin}/api/whatsapp/webhook
              </div>
              <p className="text-[10px] text-slate-400">
                Ensure your Webhook verification token matches the credentials config key.
              </p>
            </div>
          </div>
        </div>
      )}

      {activeSubTab === "templates" && (
        <div className="space-y-6">
          {/* Header & New Template Button */}
          <div className="flex justify-between items-center bg-white border border-slate-50 px-6 py-4 rounded-2xl">
            <div>
              <h3 className="text-sm font-black text-slate-900">Message Templates</h3>
              <p className="text-xs text-slate-400 font-semibold">Map Meta Cloud approved templates with GramGo emergency variables.</p>
            </div>
            {!isCreatingTemplate ? (
              <button
                onClick={() => setIsCreatingTemplate(true)}
                className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-black uppercase flex items-center space-x-1 cursor-pointer transition shadow"
              >
                <Plus className="w-4 h-4" />
                <span>Register Template</span>
              </button>
            ) : (
              <button
                onClick={() => setIsCreatingTemplate(false)}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-xl text-xs font-black uppercase cursor-pointer"
              >
                Back to List
              </button>
            )}
          </div>

          {isCreatingTemplate ? (
            <div className="bg-white border border-slate-100 rounded-3xl p-6 shadow-sm space-y-4 max-w-2xl mx-auto">
              <div>
                <h4 className="text-xs font-black uppercase text-slate-900 tracking-wider">Submit New Template</h4>
                <p className="text-[10px] text-slate-400 font-semibold">Submits template directly to system registry. In Sandbox mode, templates are instantly approved.</p>
              </div>

              <form onSubmit={handleCreateTemplate} className="space-y-4 font-semibold text-slate-700 text-xs">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <label htmlFor="template-name-input" className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Template Name (Upper_Case)</label>
                    <input
                      id="template-name-input"
                      type="text"
                      required
                      placeholder="e.g. RIDE_RECEIPT"
                      value={newTemplateName}
                      onChange={(e) => setNewTemplateName(e.target.value)}
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-100 rounded-xl focus:bg-white focus:outline-none text-xs font-extrabold transition text-slate-800"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label htmlFor="template-cat-select" className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Category</label>
                    <select
                      id="template-cat-select"
                      value={newTemplateCategory}
                      onChange={(e: any) => setNewTemplateCategory(e.target.value)}
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-100 text-xs font-bold rounded-xl cursor-pointer"
                    >
                      <option value="EMERGENCY">EMERGENCY (Utility SOS)</option>
                      <option value="UTILITY">UTILITY (Receipts, updates)</option>
                      <option value="MARKETING">MARKETING</option>
                    </select>
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label htmlFor="template-body-textarea" className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Template Body Text</label>
                  <textarea
                    id="template-body-textarea"
                    required
                    rows={4}
                    placeholder="e.g. Hello, a new emergency dispatch is raised in {{1}} Village. Category: {{2}}."
                    value={newTemplateBody}
                    onChange={(e) => setNewTemplateBody(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-100 rounded-xl focus:bg-white focus:outline-none text-xs font-semibold leading-relaxed transition"
                  />
                  <span className="text-[10px] text-slate-400 leading-normal block">
                    Use double curly brackets with numbers starting at 1 for dynamic parameters, like `{"{{1}}"}` or `{"{{2}}"}`.
                  </span>
                </div>

                <button
                  type="submit"
                  className="w-full py-2.5 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-black uppercase cursor-pointer shadow-md"
                >
                  Add & Approve Template
                </button>
              </form>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {isLoadingTemplates ? (
                <div className="col-span-full py-12 text-center text-slate-400 text-xs">
                  <RefreshCw className="w-8 h-8 text-emerald-600 animate-spin mx-auto mb-2" />
                  <span>Loading templates database...</span>
                </div>
              ) : templates.length === 0 ? (
                <div className="col-span-full py-12 text-center text-slate-400 text-xs">
                  No templates recorded in communications database. Click "Register Template" to seed.
                </div>
              ) : (
                templates.map((tmpl) => {
                  const bodyComp = tmpl.components.find(c => c.type === "BODY");
                  const bodyText = bodyComp ? bodyComp.text : "";

                  return (
                    <div key={tmpl._id || tmpl.name} className="bg-white border border-slate-100 rounded-3xl p-5 shadow-sm hover:shadow-md transition duration-200 flex flex-col justify-between space-y-4">
                      <div className="space-y-2">
                        <div className="flex justify-between items-start">
                          <span className={`px-2 py-0.5 rounded-lg text-[9px] font-black tracking-wider ${
                            tmpl.category === "EMERGENCY" 
                              ? "bg-rose-50 text-rose-700 border border-rose-100" 
                              : "bg-blue-50 text-blue-700 border border-blue-100"
                          }`}>
                            {tmpl.category}
                          </span>

                          <span className="px-2 py-0.5 bg-emerald-50 text-emerald-700 border border-emerald-100 rounded-lg text-[9px] font-black">
                            {tmpl.status}
                          </span>
                        </div>

                        <h4 className="text-xs font-black text-slate-900 font-mono break-all leading-normal">
                          {tmpl.name}
                        </h4>

                        <div className="bg-slate-50 border border-slate-100 p-3 rounded-xl text-xs font-medium text-slate-700 leading-relaxed font-mono whitespace-pre-wrap shadow-inner min-h-[80px]">
                          {bodyText}
                        </div>
                      </div>

                      <div className="flex items-center justify-between pt-2 border-t border-slate-50">
                        <span className="text-[10px] text-slate-400 font-semibold">Language: {tmpl.language}</span>
                        {tmpl.name !== "SOS_EMERGENCY" && tmpl.name !== "DISPATCH_ASSIGNED" && tmpl.name !== "RIDE_COMPLETED" && (
                          <button
                            onClick={() => tmpl._id && handleDeleteTemplate(tmpl._id)}
                            className="p-1.5 hover:bg-rose-50 text-slate-400 hover:text-rose-600 rounded-lg transition"
                            title="Delete template"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          )}
        </div>
      )}

      {activeSubTab === "logs" && (
        <div className="space-y-6">
          {/* Dispatch Logs table */}
          <div className="bg-white border border-slate-100 rounded-3xl p-6 shadow-sm space-y-4">
            <div className="flex justify-between items-center">
              <div>
                <h3 className="text-sm font-black text-slate-900">Communication Logs</h3>
                <p className="text-xs text-slate-400 font-semibold">Audit logs tracking dispatched WhatsApp templates, delivery stages, and network failures.</p>
              </div>

              <button
                onClick={fetchLogsAndMessages}
                disabled={isLoadingLogs}
                className="px-3.5 py-1.5 bg-slate-50 hover:bg-slate-100 text-slate-700 rounded-xl text-xs font-black border border-slate-150 flex items-center space-x-1 cursor-pointer"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${isLoadingLogs ? "animate-spin" : ""}`} />
                <span>Refresh Logs</span>
              </button>
            </div>

            <div className="overflow-x-auto border border-slate-100 rounded-2xl">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="bg-slate-50 text-slate-400 uppercase font-bold text-[9px] tracking-wider border-b border-slate-100">
                    <th className="p-4">Recipient</th>
                    <th className="p-4">Template Name</th>
                    <th className="p-4">Delivery Status</th>
                    <th className="p-4">Variables Sent</th>
                    <th className="p-4">Timestamp</th>
                    <th className="p-4">Failure Reason</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50 font-semibold text-slate-700">
                  {isLoadingLogs && messages.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="p-8 text-center text-slate-400">Loading ledger data...</td>
                    </tr>
                  ) : messages.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="p-8 text-center text-slate-400">No WhatsApp communications logged yet.</td>
                    </tr>
                  ) : (
                    messages.map((msg) => (
                      <tr key={msg.id || msg._id} className="hover:bg-slate-50/50 transition">
                        <td className="p-4 text-slate-900 font-extrabold">{msg.recipientPhone}</td>
                        <td className="p-4 font-mono text-[10px] text-slate-500">{msg.templateName}</td>
                        <td className="p-4">
                          <span className={`px-2 py-0.5 rounded-lg text-[9px] font-black uppercase border ${
                            msg.status === "read" 
                              ? "bg-blue-50 text-blue-700 border-blue-200" 
                              : msg.status === "delivered" 
                              ? "bg-teal-50 text-teal-700 border-teal-200"
                              : msg.status === "sent"
                              ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                              : msg.status === "queued"
                              ? "bg-amber-50 text-amber-700 border-amber-200 animate-pulse"
                              : "bg-red-50 text-red-700 border-red-200"
                          }`}>
                            {msg.status}
                          </span>
                        </td>
                        <td className="p-4 font-mono text-[10px] text-slate-500 truncate max-w-[150px]" title={msg.variables.join(", ")}>
                          {msg.variables.join(" | ")}
                        </td>
                        <td className="p-4 text-slate-400 font-bold text-[10px]">
                          {new Date(msg.createdAt).toLocaleString()}
                        </td>
                        <td className="p-4 text-rose-600 font-bold max-w-[150px] truncate" title={msg.errorMessage || ""}>
                          {msg.errorMessage || "-"}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* Delivery handshake tracking details */}
          {logs.length > 0 && (
            <div className="bg-white border border-slate-100 rounded-3xl p-6 shadow-sm space-y-4">
              <div>
                <h3 className="text-sm font-black text-slate-900">Webhook Handshake Logs</h3>
                <p className="text-xs text-slate-400 font-semibold">Incoming Meta postback status updates (sent → delivered → read) auditing pipeline efficiency.</p>
              </div>

              <div className="max-h-60 overflow-y-auto border border-slate-100 rounded-2xl p-4 bg-slate-900 text-slate-100 font-mono text-[10px] leading-relaxed space-y-1">
                {logs.map((log) => (
                  <div key={log.id || log._id} className="hover:bg-slate-800 px-2 py-0.5 rounded transition flex items-center justify-between">
                    <span className="truncate pr-4">
                      <span className="text-emerald-400">✓</span> [Message ID: {log.messageId}] status changed to <strong className="text-blue-400 uppercase">{log.status}</strong>
                    </span>
                    <span className="text-slate-500 shrink-0">{new Date(log.timestamp).toLocaleTimeString()}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {activeSubTab === "sandbox" && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Interactive incoming query simulator */}
          <div className="lg:col-span-6 bg-white border border-slate-100 rounded-3xl p-6 shadow-sm space-y-4">
            <div>
              <h3 className="text-sm font-black text-slate-900">Simulate Inbound Customer Message</h3>
              <p className="text-xs text-slate-400 font-semibold">Mock an incoming WhatsApp user message to test GramGo's automated help response desk.</p>
            </div>

            <form onSubmit={handleSimulateInbound} className="space-y-4 font-semibold text-slate-700 text-xs">
              <div className="space-y-1.5">
                <label htmlFor="incoming-sender-input" className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block font-black">Customer Sender Mobile Phone</label>
                <input
                  id="incoming-sender-input"
                  type="text"
                  required
                  placeholder="e.g. 919876543210 (include country code)"
                  value={incomingSender}
                  onChange={(e) => setIncomingSender(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-100 rounded-xl focus:bg-white focus:outline-none focus:border-emerald-500 font-bold text-slate-800"
                />
              </div>

              <div className="space-y-1.5">
                <label htmlFor="incoming-text-input" className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block font-black">Incoming Text Query Message</label>
                <textarea
                  id="incoming-text-input"
                  required
                  rows={3}
                  placeholder="e.g. SOS help! Maternity ambulance needed in Sherpur immediately!"
                  value={incomingText}
                  onChange={(e) => setIncomingText(e.target.value)}
                  className="w-full px-3.5 py-2 bg-slate-50 border border-slate-100 rounded-xl focus:bg-white focus:outline-none transition leading-relaxed text-slate-800"
                />
              </div>

              <button
                type="submit"
                disabled={isSimulatingInbound}
                className="w-full py-2.5 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-black uppercase flex items-center justify-center space-x-1.5 cursor-pointer shadow-md"
              >
                {isSimulatingInbound ? (
                  <>
                    <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                    <span>Processing Hook...</span>
                  </>
                ) : (
                  <>
                    <Play className="w-3.5 h-3.5 text-emerald-400 fill-emerald-400" />
                    <span>Trigger Webhook Inbound Post</span>
                  </>
                )}
              </button>
            </form>
          </div>

          {/* Guidelines on sandbox features */}
          <div className="lg:col-span-6 bg-slate-50 border border-slate-150 rounded-3xl p-6 shadow-inner space-y-4 text-xs font-semibold text-slate-600 leading-relaxed">
            <h4 className="text-sm font-black text-slate-950 flex items-center space-x-1.5">
              <span>🛠️</span>
              <span>Sandbox Interactive Terminal Details</span>
            </h4>
            <p>
              In sandbox environment simulation mode, we mimic direct network handshakes using a background polling engine:
            </p>
            <ul className="space-y-2 pl-4 list-disc text-slate-500">
              <li>
                <strong className="text-slate-800">State Transitions:</strong> When you send a simulated test message, its status starts as <span className="text-amber-600">queued</span>.
              </li>
              <li>
                <strong className="text-slate-800">Delivery Status Sweep:</strong> Every 5 seconds, the background queue dispatcher handles the queue, changing status to <span className="text-emerald-600">sent</span>, followed automatically by <span className="text-teal-600">delivered</span> and <span className="text-blue-600">read</span> transitions inside 3-6 seconds.
              </li>
              <li>
                <strong className="text-slate-800">Inbound Automation:</strong> Inbound queries containing keywords like <span className="text-rose-600 font-black">"SOS"</span> or <span className="text-rose-600 font-black">"emergency"</span> trigger immediate notification events alerting dispatchers instantly!
              </li>
            </ul>
            <div className="pt-2">
              <span className="text-[10px] text-slate-400 block uppercase">Gateway Status Monitor:</span>
              <div className="flex items-center space-x-2 bg-slate-900 p-3 rounded-xl text-emerald-400 font-mono text-[10px] mt-1 shadow-inner">
                <span className="w-2 h-2 bg-emerald-400 rounded-full animate-ping" />
                <span>BACKGROUND WORKER STATUS: ACTIVE (TICKING)</span>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
