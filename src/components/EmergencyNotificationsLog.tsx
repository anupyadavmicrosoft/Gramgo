import React, { useState, useEffect } from "react";
import { 
  Bell, 
  Smartphone, 
  Mail, 
  MessageSquare, 
  Search, 
  Filter, 
  Trash2, 
  RefreshCw, 
  CheckCircle2, 
  Send, 
  Users, 
  Activity,
  AlertTriangle,
  Info,
  Car,
  UserCheck
} from "lucide-react";

export interface INotificationChannelStatus {
  channel: "WhatsApp" | "SMS" | "Push Notification" | "Email";
  status: "sent" | "delivered" | "failed" | "simulated";
  sentAt: number;
}

export interface IEmergencyNotification {
  id: string;
  rideId: string;
  eventType: string;
  recipientRole: "Driver" | "Emergency Contact" | "Admin" | "Dispatcher";
  recipientName: string;
  recipientContact: string;
  message: string;
  channels: INotificationChannelStatus[];
  createdAt: number;
}

export function EmergencyNotificationsLog() {
  const [logs, setLogs] = useState<IEmergencyNotification[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [roleFilter, setRoleFilter] = useState<string>("all");
  const [channelFilter, setChannelFilter] = useState<string>("all");
  const [eventFilter, setEventFilter] = useState<string>("all");
  
  // Custom alert campaign simulation state
  const [simRole, setSimRole] = useState<"Driver" | "Emergency Contact" | "Admin" | "Dispatcher">("Emergency Contact");
  const [simName, setSimName] = useState("");
  const [simContact, setSimContact] = useState("");
  const [simMessage, setSimMessage] = useState("");
  const [simEventType, setSimEventType] = useState("Manual Broadcast");
  const [simChannels, setSimChannels] = useState({
    SMS: true,
    WhatsApp: true,
    Push: true,
    Email: true
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [successMsg, setSuccessMsg] = useState("");

  const fetchLogs = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/emergency-notifications");
      if (res.ok) {
        const data = await res.json();
        setLogs(data);
      }
    } catch (err) {
      console.error("Error fetching notification logs:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLogs();
  }, []);

  const handleClearLogs = async () => {
    if (!window.confirm("Are you sure you want to reset and seed the notification log?")) return;
    try {
      const res = await fetch("/api/emergency-notifications/clear", { method: "POST" });
      if (res.ok) {
        fetchLogs();
      }
    } catch (err) {
      console.error("Error resetting logs:", err);
    }
  };

  const handleSendSimulation = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!simName || !simContact || !simMessage) {
      alert("Please enter recipient name, contact, and message.");
      return;
    }
    setIsSubmitting(true);
    setSuccessMsg("");

    try {
      const res = await fetch("/api/emergency-notifications/test", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          recipientRole: simRole,
          recipientName: simName,
          recipientContact: simContact,
          message: simMessage,
          eventType: simEventType,
          channels: Object.entries(simChannels)
            .filter(([_, active]) => active)
            .map(([channel]) => channel)
        })
      });

      if (res.ok) {
        setSuccessMsg("🚨 Simulation alert successfully dispatched across all active channels!");
        setSimName("");
        setSimContact("");
        setSimMessage("");
        fetchLogs();
        setTimeout(() => setSuccessMsg(""), 4000);
      } else {
        alert("Failed to send simulation alert.");
      }
    } catch (err) {
      console.error("Error sending simulation alert:", err);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleAutoFill = (role: string) => {
    if (role === "Driver") {
      setSimRole("Driver");
      setSimName("Amit Singh (Volunteer)");
      setSimContact("+91 99887 76655");
      setSimMessage("GramGo Alert: Urgent emergency transport match detected. Head to Village Sherpur for patient Sunita Devi.");
      setSimEventType("Emergency Requested");
    } else if (role === "Emergency Contact") {
      setSimRole("Emergency Contact");
      setSimName("Ramesh Kumar (Husband)");
      setSimContact("+91 98765 43210");
      setSimMessage("GramGo Alert: Emergency request created for Sunita Devi. Volunteer Driver Amit Singh (UP-61-AB-1234) is matched.");
      setSimEventType("Driver Assigned");
    } else if (role === "Admin") {
      setSimRole("Admin");
      setSimName("Panchayat Chief Officer");
      setSimContact("admin@gramgo.org");
      setSimMessage("🚨 Panchayat SOS: Active emergency alert triggered in Village Sherpur. Patient: Sunita Devi. Action required.");
      setSimEventType("Emergency Requested");
    } else if (role === "Dispatcher") {
      setSimRole("Dispatcher");
      setSimName("Ghazipur Main Control Center");
      setSimContact("dispatcher@gramgo.org");
      setSimMessage("🚨 DISPATCH PROTOCOL: Ride match complete. Patient: Sunita Devi. Destination: Sherpur CHC.");
      setSimEventType("Driver Assigned");
    }
  };

  // Filter logs
  const filteredLogs = logs.filter(log => {
    const matchesSearch = 
      log.recipientName?.toLowerCase().includes(search.toLowerCase()) ||
      log.recipientContact?.toLowerCase().includes(search.toLowerCase()) ||
      log.message?.toLowerCase().includes(search.toLowerCase()) ||
      log.rideId?.toLowerCase().includes(search.toLowerCase()) ||
      log.eventType?.toLowerCase().includes(search.toLowerCase());

    const matchesRole = roleFilter === "all" || log.recipientRole === roleFilter;
    
    const matchesChannel = channelFilter === "all" || log.channels.some(c => c.channel === channelFilter);

    const matchesEvent = eventFilter === "all" || log.eventType === eventFilter;

    return matchesSearch && matchesRole && matchesChannel && matchesEvent;
  });

  // Calculate statistics
  const totalCount = logs.length;
  const deliveryCount = logs.reduce((acc, log) => acc + log.channels.length, 0);
  const whatsappCount = logs.reduce((acc, log) => acc + log.channels.filter(c => c.channel === "WhatsApp").length, 0);
  const smsCount = logs.reduce((acc, log) => acc + log.channels.filter(c => c.channel === "SMS").length, 0);
  const emailCount = logs.reduce((acc, log) => acc + log.channels.filter(c => c.channel === "Email").length, 0);
  const pushCount = logs.reduce((acc, log) => acc + log.channels.filter(c => c.channel === "Push Notification").length, 0);

  const getRoleColor = (role: string) => {
    switch (role) {
      case "Driver": return "bg-blue-50 text-blue-700 border-blue-200";
      case "Emergency Contact": return "bg-pink-50 text-pink-700 border-pink-200";
      case "Admin": return "bg-purple-50 text-purple-700 border-purple-200";
      case "Dispatcher": return "bg-amber-50 text-amber-700 border-amber-200";
      default: return "bg-slate-50 text-slate-700 border-slate-200";
    }
  };

  const getEventBadgeColor = (event: string) => {
    if (event.includes("Request") || event.includes("SOS")) return "bg-red-50 text-red-700 border-red-100";
    if (event.includes("Assign")) return "bg-indigo-50 text-indigo-700 border-indigo-100";
    if (event.includes("Arriv")) return "bg-amber-50 text-amber-700 border-amber-100";
    if (event.includes("Pick") || event.includes("Transit")) return "bg-teal-50 text-teal-700 border-teal-100";
    if (event.includes("Complete")) return "bg-emerald-50 text-emerald-700 border-emerald-100";
    if (event.includes("Cancel")) return "bg-slate-100 text-slate-800 border-slate-200";
    return "bg-slate-50 text-slate-600 border-slate-200";
  };

  const getChannelIcon = (channel: string) => {
    switch (channel) {
      case "WhatsApp": return <MessageSquare className="w-3.5 h-3.5 text-emerald-500" />;
      case "SMS": return <Smartphone className="w-3.5 h-3.5 text-blue-500" />;
      case "Push Notification": return <Bell className="w-3.5 h-3.5 text-orange-500" />;
      case "Email": return <Mail className="w-3.5 h-3.5 text-purple-500" />;
      default: return <Smartphone className="w-3.5 h-3.5 text-slate-500" />;
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-100 pb-5">
        <div>
          <h2 className="text-xl font-extrabold text-slate-900 tracking-tight flex items-center gap-2">
            <Bell className="w-5 h-5 text-emerald-600" />
            GramGo Emergency Notification System
          </h2>
          <p className="text-slate-500 text-xs mt-0.5">
            Future-ready routing dashboard matching SMS, WhatsApp, Push Notifications, and Email across all emergency lifecycles.
          </p>
        </div>
        <div className="flex items-center gap-2.5">
          <button 
            onClick={fetchLogs}
            className="flex items-center gap-1 px-3 py-2 bg-slate-50 hover:bg-slate-100 text-slate-700 text-xs font-bold rounded-xl border border-slate-200 transition cursor-pointer"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            Sync Logs
          </button>
          <button 
            onClick={handleClearLogs}
            className="flex items-center gap-1 px-3 py-2 bg-rose-50 hover:bg-rose-100 text-rose-700 text-xs font-bold rounded-xl border border-rose-200 transition cursor-pointer"
          >
            <Trash2 className="w-3.5 h-3.5" />
            Reset Log
          </button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
        <div className="bg-white border border-slate-100 p-4 rounded-2xl shadow-sm space-y-1">
          <span className="text-[10px] text-slate-400 font-extrabold tracking-wider uppercase block">Total Dispatches</span>
          <p className="text-2xl font-black text-slate-900">{totalCount}</p>
          <div className="text-[10px] text-slate-500 flex items-center gap-1">
            <CheckCircle2 className="w-3 h-3 text-emerald-500" /> Complete dispatch logs
          </div>
        </div>

        <div className="bg-white border border-slate-100 p-4 rounded-2xl shadow-sm space-y-1">
          <span className="text-[10px] text-slate-400 font-extrabold tracking-wider uppercase block">WhatsApp Deliveries</span>
          <p className="text-2xl font-black text-emerald-600">{whatsappCount}</p>
          <div className="text-[10px] text-slate-500">Simulated WhatsApp Engine API</div>
        </div>

        <div className="bg-white border border-slate-100 p-4 rounded-2xl shadow-sm space-y-1">
          <span className="text-[10px] text-slate-400 font-extrabold tracking-wider uppercase block">SMS Deliveries</span>
          <p className="text-2xl font-black text-blue-600">{smsCount}</p>
          <div className="text-[10px] text-slate-500">Cellular Short Code Gateway</div>
        </div>

        <div className="bg-white border border-slate-100 p-4 rounded-2xl shadow-sm space-y-1">
          <span className="text-[10px] text-slate-400 font-extrabold tracking-wider uppercase block">Push Alerts</span>
          <p className="text-2xl font-black text-orange-500">{pushCount}</p>
          <div className="text-[10px] text-slate-500">FCM / Browser Service Workers</div>
        </div>

        <div className="bg-white border border-slate-100 p-4 rounded-2xl shadow-sm space-y-1">
          <span className="text-[10px] text-slate-400 font-extrabold tracking-wider uppercase block">Email Dispatches</span>
          <p className="text-2xl font-black text-purple-600">{emailCount}</p>
          <div className="text-[10px] text-slate-500">SMTP Transactional Relay</div>
        </div>
      </div>

      {/* Main Grid: Split into Logs and Simulator */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        {/* Left 2 Columns: Search, Filter, and Log Table */}
        <div className="xl:col-span-2 space-y-4">
          {/* Controls Bar */}
          <div className="bg-slate-50 border border-slate-200/60 p-4 rounded-2xl flex flex-col md:flex-row gap-3 items-center">
            <div className="relative w-full md:flex-1">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 w-4 h-4" />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search by recipient, message, ride ID..."
                className="w-full pl-10 pr-4 py-2 bg-white border border-slate-200 rounded-xl text-xs focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition outline-none text-slate-800"
              />
            </div>
            
            <div className="flex flex-wrap items-center gap-2 w-full md:w-auto">
              {/* Role filter */}
              <div className="flex items-center gap-1.5 bg-white border border-slate-200 rounded-xl px-2.5 py-1.5">
                <Filter className="w-3 h-3 text-slate-400" />
                <select
                  value={roleFilter}
                  onChange={(e) => setRoleFilter(e.target.value)}
                  className="bg-transparent border-none text-xs text-slate-700 outline-none cursor-pointer font-semibold"
                >
                  <option value="all">All Roles</option>
                  <option value="Driver">Driver</option>
                  <option value="Emergency Contact">Emergency Contacts</option>
                  <option value="Admin">Panchayat Admin</option>
                  <option value="Dispatcher">Dispatcher</option>
                </select>
              </div>

              {/* Channel filter */}
              <div className="flex items-center gap-1.5 bg-white border border-slate-200 rounded-xl px-2.5 py-1.5">
                <Smartphone className="w-3 h-3 text-slate-400" />
                <select
                  value={channelFilter}
                  onChange={(e) => setChannelFilter(e.target.value)}
                  className="bg-transparent border-none text-xs text-slate-700 outline-none cursor-pointer font-semibold"
                >
                  <option value="all">All Channels</option>
                  <option value="SMS">SMS Only</option>
                  <option value="WhatsApp">WhatsApp Only</option>
                  <option value="Push Notification">Push Only</option>
                  <option value="Email">Email Only</option>
                </select>
              </div>
            </div>
          </div>

          {/* Logs View Container */}
          <div className="bg-white border border-slate-100 rounded-2xl shadow-sm overflow-hidden">
            {loading ? (
              <div className="py-20 text-center space-y-3">
                <RefreshCw className="w-8 h-8 text-slate-300 animate-spin mx-auto" />
                <p className="text-slate-400 text-xs">Syncing multi-channel alert records...</p>
              </div>
            ) : filteredLogs.length === 0 ? (
              <div className="py-20 text-center space-y-2">
                <Bell className="w-10 h-10 text-slate-200 mx-auto" />
                <p className="text-slate-800 font-extrabold text-sm">No notification logs found</p>
                <p className="text-slate-400 text-xs">Try adjusting your filters or dispatch a mock test alert.</p>
              </div>
            ) : (
              <div className="divide-y divide-slate-100">
                {filteredLogs.map((log) => (
                  <div key={log.id} className="p-5 hover:bg-slate-50/50 transition-all space-y-3">
                    <div className="flex flex-wrap items-center justify-between gap-2.5">
                      <div className="flex items-center gap-2">
                        {/* Target Badge */}
                        <span className={`px-2.5 py-0.5 border text-[10px] font-black rounded-full uppercase tracking-wider ${getRoleColor(log.recipientRole)}`}>
                          {log.recipientRole}
                        </span>
                        
                        {/* Event Stage Badge */}
                        <span className={`px-2 py-0.5 border text-[9px] font-bold rounded-md ${getEventBadgeColor(log.eventType)}`}>
                          {log.eventType}
                        </span>

                        <span className="text-[10px] text-slate-400 font-mono">
                          ID: {log.rideId ? log.rideId.replace("ride_", "#") : "Manual"}
                        </span>
                      </div>

                      <span className="text-[10px] text-slate-400 font-medium">
                        {new Date(log.createdAt).toLocaleString()}
                      </span>
                    </div>

                    <div className="space-y-1">
                      <div className="flex items-center gap-1.5">
                        <span className="font-extrabold text-slate-800 text-xs">{log.recipientName}</span>
                        <span className="text-slate-400 text-[10px] font-mono">({log.recipientContact})</span>
                      </div>
                      <p className="text-slate-600 text-xs leading-relaxed font-medium bg-slate-50/40 border border-slate-100/70 p-2.5 rounded-xl">
                        {log.message}
                      </p>
                    </div>

                    {/* Channel Indicators */}
                    <div className="flex items-center gap-4 pt-1">
                      <span className="text-[10px] text-slate-400 font-extrabold uppercase tracking-wider">dispatched:</span>
                      <div className="flex items-center gap-3">
                        {log.channels.map((chan) => (
                          <div key={chan.channel} className="flex items-center gap-1 text-[10px] text-slate-500 font-bold bg-white px-2 py-0.5 rounded-md border border-slate-100">
                            {getChannelIcon(chan.channel)}
                            <span>{chan.channel}</span>
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 ml-0.5" title="Delivered successfully" />
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Right 1 Column: Future-Ready Simulation Console */}
        <div className="space-y-4">
          <div className="bg-white border border-slate-100 rounded-2xl p-5 shadow-sm space-y-4">
            <div className="border-b border-slate-100 pb-3">
              <h3 className="font-extrabold text-slate-900 text-sm flex items-center gap-1.5">
                <Send className="w-4 h-4 text-emerald-600" />
                Notification Simulator
              </h3>
              <p className="text-[11px] text-slate-400 mt-0.5">
                Trigger manual test campaigns to verify future-ready WhatsApp, SMS, push, and email templates instantly.
              </p>
            </div>

            {successMsg && (
              <div className="bg-emerald-50 border border-emerald-200 text-emerald-700 text-xs p-3 rounded-xl font-bold leading-relaxed">
                {successMsg}
              </div>
            )}

            {/* Quick Presets */}
            <div className="space-y-2">
              <label className="text-[10px] text-slate-400 font-extrabold uppercase tracking-wider block">Quick Presets</label>
              <div className="grid grid-cols-2 gap-2">
                <button 
                  type="button"
                  onClick={() => handleAutoFill("Driver")}
                  className="px-2.5 py-1.5 bg-slate-50 hover:bg-slate-100 text-slate-700 border border-slate-200 text-[10px] font-bold rounded-lg transition text-left flex items-center gap-1"
                >
                  <Car className="w-3 h-3 text-blue-500" /> Driver Preset
                </button>
                <button 
                  type="button"
                  onClick={() => handleAutoFill("Emergency Contact")}
                  className="px-2.5 py-1.5 bg-slate-50 hover:bg-slate-100 text-slate-700 border border-slate-200 text-[10px] font-bold rounded-lg transition text-left flex items-center gap-1"
                >
                  <Users className="w-3 h-3 text-pink-500" /> Family Preset
                </button>
                <button 
                  type="button"
                  onClick={() => handleAutoFill("Admin")}
                  className="px-2.5 py-1.5 bg-slate-50 hover:bg-slate-100 text-slate-700 border border-slate-200 text-[10px] font-bold rounded-lg transition text-left flex items-center gap-1"
                >
                  <UserCheck className="w-3 h-3 text-purple-500" /> Admin Preset
                </button>
                <button 
                  type="button"
                  onClick={() => handleAutoFill("Dispatcher")}
                  className="px-2.5 py-1.5 bg-slate-50 hover:bg-slate-100 text-slate-700 border border-slate-200 text-[10px] font-bold rounded-lg transition text-left flex items-center gap-1"
                >
                  <Activity className="w-3 h-3 text-amber-500" /> Dispatcher Preset
                </button>
              </div>
            </div>

            <form onSubmit={handleSendSimulation} className="space-y-4 pt-2">
              <div className="space-y-1.5">
                <label className="text-[10px] text-slate-400 font-extrabold uppercase tracking-wider block">Recipient Role</label>
                <select
                  value={simRole}
                  onChange={(e) => setSimRole(e.target.value as any)}
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs outline-none focus:ring-2 focus:ring-emerald-500/20 text-slate-800"
                >
                  <option value="Emergency Contact">Emergency Contact (Family)</option>
                  <option value="Driver">Volunteer Hero Driver</option>
                  <option value="Admin">Panchayat Admin</option>
                  <option value="Dispatcher">Emergency Dispatcher</option>
                </select>
              </div>

              <div className="space-y-1.5">
                <label className="text-[10px] text-slate-400 font-extrabold uppercase tracking-wider block">Recipient Name</label>
                <input
                  type="text"
                  value={simName}
                  onChange={(e) => setSimName(e.target.value)}
                  placeholder="e.g. Ramesh Kumar"
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs outline-none focus:ring-2 focus:ring-emerald-500/20 text-slate-800"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-[10px] text-slate-400 font-extrabold uppercase tracking-wider block">Contact (Phone/Email)</label>
                <input
                  type="text"
                  value={simContact}
                  onChange={(e) => setSimContact(e.target.value)}
                  placeholder="e.g. +91 98765 43210 or admin@gramgo.org"
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs outline-none focus:ring-2 focus:ring-emerald-500/20 text-slate-800"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-[10px] text-slate-400 font-extrabold uppercase tracking-wider block">Simulation Stage / Event</label>
                <select
                  value={simEventType}
                  onChange={(e) => setSimEventType(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs outline-none focus:ring-2 focus:ring-emerald-500/20 text-slate-800"
                >
                  <option value="Emergency Requested">Emergency Requested</option>
                  <option value="Searching Driver">Searching Driver</option>
                  <option value="Driver Assigned">Driver Assigned</option>
                  <option value="Driver Arriving">Driver Arriving</option>
                  <option value="Passenger Picked">Passenger Picked</option>
                  <option value="Hospital Reached">Hospital Reached</option>
                  <option value="Completed">Completed</option>
                  <option value="Cancelled">Cancelled</option>
                  <option value="Manual Broadcast">Manual Custom Broadcast</option>
                </select>
              </div>

              <div className="space-y-1.5">
                <label className="text-[10px] text-slate-400 font-extrabold uppercase tracking-wider block">Delivery Channels</label>
                <div className="grid grid-cols-2 gap-2 bg-slate-50 p-3 rounded-xl border border-slate-100">
                  <label className="flex items-center gap-2 text-xs text-slate-700 font-semibold cursor-pointer">
                    <input 
                      type="checkbox" 
                      checked={simChannels.SMS} 
                      onChange={(e) => setSimChannels({ ...simChannels, SMS: e.target.checked })} 
                      className="rounded border-slate-300 text-emerald-600 focus:ring-emerald-500"
                    />
                    SMS
                  </label>
                  <label className="flex items-center gap-2 text-xs text-slate-700 font-semibold cursor-pointer">
                    <input 
                      type="checkbox" 
                      checked={simChannels.WhatsApp} 
                      onChange={(e) => setSimChannels({ ...simChannels, WhatsApp: e.target.checked })} 
                      className="rounded border-slate-300 text-emerald-600 focus:ring-emerald-500"
                    />
                    WhatsApp
                  </label>
                  <label className="flex items-center gap-2 text-xs text-slate-700 font-semibold cursor-pointer">
                    <input 
                      type="checkbox" 
                      checked={simChannels.Push} 
                      onChange={(e) => setSimChannels({ ...simChannels, Push: e.target.checked })} 
                      className="rounded border-slate-300 text-emerald-600 focus:ring-emerald-500"
                    />
                    Push
                  </label>
                  <label className="flex items-center gap-2 text-xs text-slate-700 font-semibold cursor-pointer">
                    <input 
                      type="checkbox" 
                      checked={simChannels.Email} 
                      onChange={(e) => setSimChannels({ ...simChannels, Email: e.target.checked })} 
                      className="rounded border-slate-300 text-emerald-600 focus:ring-emerald-500"
                    />
                    Email
                  </label>
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-[10px] text-slate-400 font-extrabold uppercase tracking-wider block">Tailored Message Content</label>
                <textarea
                  value={simMessage}
                  onChange={(e) => setSimMessage(e.target.value)}
                  placeholder="Enter the tailored alert copy..."
                  rows={4}
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs outline-none focus:ring-2 focus:ring-emerald-500/20 text-slate-800 resize-none font-medium leading-relaxed"
                />
              </div>

              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full py-3 bg-emerald-600 hover:bg-emerald-700 text-white font-black text-xs rounded-xl shadow-md uppercase transition-all flex items-center justify-center gap-2 cursor-pointer"
              >
                {isSubmitting ? (
                  <>
                    <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                    Dispatching...
                  </>
                ) : (
                  <>
                    <Send className="w-3.5 h-3.5" />
                    Dispatch Broadcast Alert
                  </>
                )}
              </button>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}
export default EmergencyNotificationsLog;
