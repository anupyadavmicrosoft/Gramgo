import React, { useState, useEffect } from "react";
import { 
  Bell, 
  Settings, 
  Check, 
  Trash2, 
  Volume2, 
  VolumeX, 
  Info, 
  Sparkles, 
  Smartphone, 
  CheckCircle2, 
  RefreshCw, 
  Search, 
  Filter, 
  Flame, 
  PhoneCall, 
  MessageSquare, 
  Loader, 
  X,
  Plus
} from "lucide-react";
import { useAuth } from "../context/AuthContext";

export interface IUserNotification {
  id: string;
  userId: string;
  title: string;
  body: string;
  type: "ride_alert" | "chat_alert" | "voice_call" | "general" | "system";
  data?: Record<string, any>;
  read: boolean;
  createdAt: string | Date;
}

export interface IUserNotificationSettings {
  userId: string;
  pushToken?: string;
  enabled: boolean;
  rideAlerts: boolean;
  chatAlerts: boolean;
  voiceAlerts: boolean;
  soundEnabled: boolean;
  alertSound: "default" | "siren" | "chime" | "ping";
}

interface NotificationModuleProps {
  onNotificationReceived?: (notification: IUserNotification) => void;
}

export const NotificationModule: React.FC<NotificationModuleProps> = ({ onNotificationReceived }) => {
  const { token, user } = useAuth();
  
  // States
  const [notifications, setNotifications] = useState<IUserNotification[]>([]);
  const [unreadCount, setUnreadCount] = useState<number>(0);
  const [settings, setSettings] = useState<IUserNotificationSettings | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [isSettingsLoading, setIsSettingsLoading] = useState<boolean>(false);
  const [activeTab, setActiveTab] = useState<"history" | "settings" | "simulate">("history");
  
  // Permission & FCM Simulation
  const [permissionStatus, setPermissionStatus] = useState<"default" | "granted" | "denied">("default");
  const [isRegisteringFCM, setIsRegisteringFCM] = useState<boolean>(false);

  // Filters & Search
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [typeFilter, setTypeFilter] = useState<string>("all");
  const [statusFilter, setStatusFilter] = useState<"all" | "unread" | "read">("all");

  // Simulation Form State
  const [simTitle, setSimTitle] = useState<string>("");
  const [simBody, setSimBody] = useState<string>("");
  const [simType, setSimType] = useState<"ride_alert" | "chat_alert" | "voice_call" | "general" | "system">("ride_alert");
  const [isSimulating, setIsSimulating] = useState<boolean>(false);
  const [simResult, setSimResult] = useState<{ success: boolean; message: string; fcmTokenUsed?: string } | null>(null);

  // Load notifications
  const loadNotifications = async () => {
    if (!token) return;
    try {
      setIsLoading(true);
      const res = await fetch("/api/notifications", {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setNotifications(data);
      }
    } catch (err) {
      console.error("Error loading notifications:", err);
    } finally {
      setIsLoading(false);
    }
  };

  // Load unread count
  const loadUnreadCount = async () => {
    if (!token) return;
    try {
      const res = await fetch("/api/notifications/unread-count", {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setUnreadCount(data.unreadCount);
      }
    } catch (err) {
      console.error("Error loading unread count:", err);
    }
  };

  // Load notification settings
  const loadSettings = async () => {
    if (!token) return;
    try {
      setIsSettingsLoading(true);
      const res = await fetch("/api/notifications/settings", {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setSettings(data);
        if (data.pushToken) {
          setPermissionStatus("granted");
        }
      }
    } catch (err) {
      console.error("Error loading notification settings:", err);
    } finally {
      setIsSettingsLoading(false);
    }
  };

  useEffect(() => {
    if (token) {
      loadNotifications();
      loadUnreadCount();
      loadSettings();
    }
  }, [token]);

  // Request notification permissions (Simulated Firebase Cloud Messaging flow)
  const requestFCMPermission = async () => {
    try {
      setIsRegisteringFCM(true);
      // Simulate browser native notification prompt delay
      await new Promise(resolve => setTimeout(resolve, 800));
      
      const simulatedToken = "fcm:token:grg_" + Math.random().toString(36).substring(2, 12).toUpperCase();
      
      if (settings && token) {
        const res = await fetch("/api/notifications/settings", {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`
          },
          body: JSON.stringify({
            ...settings,
            pushToken: simulatedToken,
            enabled: true
          })
        });

        if (res.ok) {
          const updated = await res.json();
          setSettings(updated);
          setPermissionStatus("granted");
          
          // Trigger a welcome notification
          await fetch("/api/notifications/simulate", {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${token}`
            },
            body: JSON.stringify({
              title: "🔔 FCM Push Registered Successfully!",
              body: "Your device token has been successfully stored in our Firestore database. Secure low-latency push notifications are active.",
              type: "system"
            })
          });
          
          loadNotifications();
          loadUnreadCount();
        }
      }
    } catch (err) {
      console.error("Error registering simulated FCM:", err);
    } finally {
      setIsRegisteringFCM(false);
    }
  };

  // Revoke token
  const revokeFCMPermission = async () => {
    if (!settings || !token) return;
    try {
      setIsRegisteringFCM(true);
      const res = await fetch("/api/notifications/settings", {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({
          ...settings,
          pushToken: ""
        })
      });
      if (res.ok) {
        const updated = await res.json();
        setSettings(updated);
        setPermissionStatus("default");
      }
    } catch (err) {
      console.error("Error revoking FCM token:", err);
    } finally {
      setIsRegisteringFCM(false);
    }
  };

  // Mark single as read
  const markAsRead = async (id: string) => {
    if (!token) return;
    try {
      const res = await fetch("/api/notifications/mark-read", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ id })
      });
      if (res.ok) {
        // Optimistic update
        setNotifications(prev => prev.map(n => n.id === id ? { ...n, read: true } : n));
        setUnreadCount(prev => Math.max(0, prev - 1));
      }
    } catch (err) {
      console.error("Error marking read:", err);
    }
  };

  // Mark all as read
  const markAllAsRead = async () => {
    if (!token) return;
    try {
      const res = await fetch("/api/notifications/mark-all-read", {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        setNotifications(prev => prev.map(n => ({ ...n, read: true })));
        setUnreadCount(0);
      }
    } catch (err) {
      console.error("Error marking all read:", err);
    }
  };

  // Delete notification
  const deleteNotification = async (id: string) => {
    if (!token) return;
    try {
      const res = await fetch(`/api/notifications/${id}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        setNotifications(prev => prev.filter(n => n.id !== id));
        loadUnreadCount();
      }
    } catch (err) {
      console.error("Error deleting notification:", err);
    }
  };

  // Clear all notifications
  const clearAllNotifications = async () => {
    if (!token) return;
    if (!window.confirm("Are you sure you want to clear your entire notification logs?")) return;
    try {
      const res = await fetch("/api/notifications", {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        setNotifications([]);
        setUnreadCount(0);
      }
    } catch (err) {
      console.error("Error clearing logs:", err);
    }
  };

  // Save Settings toggles
  const updateSettingToggle = async (field: keyof IUserNotificationSettings, value: any) => {
    if (!settings || !token) return;
    try {
      const newSettings = { ...settings, [field]: value };
      setSettings(newSettings); // Optimistic UI
      
      const res = await fetch("/api/notifications/settings", {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify(newSettings)
      });
      if (!res.ok) {
        // Revert on error
        loadSettings();
      }
    } catch (err) {
      console.error("Error updating settings toggle:", err);
      loadSettings();
    }
  };

  // Submit mock FCM dispatch
  const handleSimulatePush = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!token) return;
    try {
      setIsSimulating(true);
      setSimResult(null);

      const res = await fetch("/api/notifications/simulate", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({
          title: simTitle || "GramGo Emergency Alert",
          body: simBody || "This is a simulated Firebase Cloud Messaging instant notification.",
          type: simType,
          data: { simulated: true, timestamp: Date.now() }
        })
      });

      const data = await res.json();
      if (res.ok) {
        setSimResult({
          success: true,
          message: data.message,
          fcmTokenUsed: data.fcmTokenUsed
        });
        setSimTitle("");
        setSimBody("");
        loadNotifications();
        loadUnreadCount();
        
        // Notify parent callback to sound alert
        if (onNotificationReceived && data.notification) {
          onNotificationReceived(data.notification);
        }
      } else {
        setSimResult({
          success: false,
          message: data.error || "Failed to dispatch push notification."
        });
      }
    } catch (err) {
      console.error("Error dispatching simulation:", err);
      setSimResult({
        success: false,
        message: "An error occurred while communicating with the simulated FCM relay."
      });
    } finally {
      setIsSimulating(false);
    }
  };

  // Filtered Notifications
  const filteredNotifications = notifications.filter(n => {
    const matchesSearch = n.title.toLowerCase().includes(searchQuery.toLowerCase()) || 
                          n.body.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesType = typeFilter === "all" || n.type === typeFilter;
    const matchesStatus = statusFilter === "all" || 
                         (statusFilter === "unread" && !n.read) || 
                         (statusFilter === "read" && n.read);
    return matchesSearch && matchesType && matchesStatus;
  });

  const getTypeBadgeStyles = (type: string) => {
    switch (type) {
      case "ride_alert":
        return "bg-rose-100 text-rose-800 border-rose-200";
      case "chat_alert":
        return "bg-emerald-100 text-emerald-800 border-emerald-200";
      case "voice_call":
        return "bg-indigo-100 text-indigo-800 border-indigo-200";
      case "system":
        return "bg-blue-100 text-blue-800 border-blue-200";
      default:
        return "bg-slate-100 text-slate-700 border-slate-200";
    }
  };

  const getIconForType = (type: string) => {
    switch (type) {
      case "ride_alert":
        return <Flame className="w-4 h-4 text-rose-600 animate-pulse" />;
      case "chat_alert":
        return <MessageSquare className="w-4 h-4 text-emerald-600" />;
      case "voice_call":
        return <PhoneCall className="w-4 h-4 text-indigo-600" />;
      default:
        return <Bell className="w-4 h-4 text-slate-500" />;
    }
  };

  return (
    <div id="notification-manager-root" className="bg-white rounded-3xl border border-slate-100 overflow-hidden shadow-xl max-w-4xl mx-auto">
      {/* Upper Brand / Registration simulation Banner */}
      <div className="p-6 bg-gradient-to-r from-orange-500 to-amber-500 text-white flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <Smartphone className="w-5 h-5" />
            <h3 className="font-black text-sm uppercase tracking-widest">Firebase Cloud Messaging (FCM)</h3>
          </div>
          <p className="text-xs text-orange-50/90 font-medium">
            GramGo integrates modern server-side push notification routing to alert drivers and patients instantly during emergencies.
          </p>
        </div>

        {/* Permission Registration Button */}
        <div className="shrink-0">
          {permissionStatus === "granted" ? (
            <div className="flex items-center gap-2.5 bg-white/10 px-3.5 py-2 rounded-2xl border border-white/20">
              <CheckCircle2 className="w-4 h-4 text-emerald-200" />
              <div className="text-left min-w-0">
                <p className="text-[10px] font-black uppercase tracking-wider text-emerald-200">FCM Registered</p>
                <p className="text-[9px] font-mono opacity-80 truncate max-w-[120px]">{settings?.pushToken}</p>
              </div>
              <button 
                onClick={revokeFCMPermission}
                className="text-[10px] bg-red-600 hover:bg-red-700 px-2 py-1 rounded-lg font-black uppercase tracking-wider transition ml-1"
                title="Deregister FCM Token"
              >
                Revoke
              </button>
            </div>
          ) : (
            <button
              onClick={requestFCMPermission}
              disabled={isRegisteringFCM}
              className="px-4 py-2 bg-slate-900 hover:bg-slate-800 disabled:opacity-50 text-white rounded-2xl text-xs font-black uppercase tracking-wider shadow-sm transition flex items-center gap-2 cursor-pointer"
            >
              {isRegisteringFCM ? (
                <>
                  <Loader className="w-3.5 h-3.5 animate-spin" />
                  <span>Requesting...</span>
                </>
              ) : (
                <>
                  <Bell className="w-3.5 h-3.5" />
                  <span>Request Push Permission</span>
                </>
              )}
            </button>
          )}
        </div>
      </div>

      {/* Internal Navigation tabs */}
      <div className="flex border-b border-slate-100 bg-slate-50">
        <button
          onClick={() => setActiveTab("history")}
          className={`flex-1 py-4 text-center text-xs font-black uppercase tracking-wider border-b-2 transition-all flex items-center justify-center gap-2 cursor-pointer ${
            activeTab === "history" 
              ? "border-orange-600 text-orange-600 bg-white" 
              : "border-transparent text-slate-500 hover:text-slate-800"
          }`}
        >
          <Bell className="w-4 h-4" />
          <span>Notification Logs ({unreadCount > 0 ? `${unreadCount} unread` : "0"})</span>
        </button>

        <button
          onClick={() => setActiveTab("settings")}
          className={`flex-1 py-4 text-center text-xs font-black uppercase tracking-wider border-b-2 transition-all flex items-center justify-center gap-2 cursor-pointer ${
            activeTab === "settings" 
              ? "border-orange-600 text-orange-600 bg-white" 
              : "border-transparent text-slate-500 hover:text-slate-800"
          }`}
        >
          <Settings className="w-4 h-4" />
          <span>Push Settings</span>
        </button>

        <button
          onClick={() => setActiveTab("simulate")}
          className={`flex-1 py-4 text-center text-xs font-black uppercase tracking-wider border-b-2 transition-all flex items-center justify-center gap-2 cursor-pointer ${
            activeTab === "simulate" 
              ? "border-orange-600 text-orange-600 bg-white" 
              : "border-transparent text-slate-500 hover:text-slate-800"
          }`}
        >
          <Sparkles className="w-4 h-4 text-orange-500" />
          <span>FCM Simulator</span>
        </button>
      </div>

      {/* TABS CONTAINER */}
      <div className="p-6">
        {/* TAB 1: HISTORY */}
        {activeTab === "history" && (
          <div className="space-y-4">
            {/* SEARCH AND FILTERS */}
            <div className="flex flex-col md:flex-row gap-3 items-center justify-between">
              {/* Search box */}
              <div className="relative w-full md:w-72">
                <Search className="absolute left-3.5 top-3 w-4 h-4 text-slate-400" />
                <input
                  type="text"
                  placeholder="Search notifications..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 text-xs font-bold border border-slate-200 rounded-xl bg-slate-50/50 focus:bg-white focus:outline-none focus:ring-1 focus:ring-orange-500 transition-all"
                />
              </div>

              {/* Filters row */}
              <div className="flex flex-wrap items-center gap-2 w-full md:w-auto">
                {/* Type Filter */}
                <div className="relative">
                  <select
                    value={typeFilter}
                    onChange={(e) => setTypeFilter(e.target.value)}
                    className="appearance-none bg-white border border-slate-200 rounded-xl pl-3 pr-8 py-2 text-xs font-bold text-slate-600 focus:outline-none focus:ring-1 focus:ring-orange-500 cursor-pointer"
                  >
                    <option value="all">All Categories</option>
                    <option value="ride_alert">🚨 Ride Alerts</option>
                    <option value="chat_alert">💬 Chat Messages</option>
                    <option value="voice_call">📞 Voice Calls</option>
                    <option value="system">⚙️ System Alerts</option>
                  </select>
                </div>

                {/* Read status filter */}
                <div className="flex border border-slate-200 rounded-xl overflow-hidden bg-slate-50 text-[10px] font-black uppercase tracking-wider">
                  <button
                    onClick={() => setStatusFilter("all")}
                    className={`px-3 py-2 cursor-pointer ${statusFilter === "all" ? "bg-slate-900 text-white" : "hover:bg-slate-100 text-slate-600"}`}
                  >
                    All
                  </button>
                  <button
                    onClick={() => setStatusFilter("unread")}
                    className={`px-3 py-2 cursor-pointer ${statusFilter === "unread" ? "bg-slate-900 text-white" : "hover:bg-slate-100 text-slate-600"}`}
                  >
                    Unread
                  </button>
                  <button
                    onClick={() => setStatusFilter("read")}
                    className={`px-3 py-2 cursor-pointer ${statusFilter === "read" ? "bg-slate-900 text-white" : "hover:bg-slate-100 text-slate-600"}`}
                  >
                    Read
                  </button>
                </div>

                {/* Clear actions */}
                <div className="flex items-center gap-1 ml-auto md:ml-0">
                  <button
                    onClick={markAllAsRead}
                    className="p-2 bg-orange-50 hover:bg-orange-100 text-orange-700 rounded-xl text-xs font-bold transition flex items-center gap-1.5 cursor-pointer"
                    title="Mark all as read"
                  >
                    <Check className="w-3.5 h-3.5" />
                    <span className="hidden sm:inline">Mark All Read</span>
                  </button>
                  <button
                    onClick={clearAllNotifications}
                    className="p-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold transition flex items-center gap-1.5 cursor-pointer"
                    title="Clear notification log"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    <span className="hidden sm:inline">Clear Log</span>
                  </button>
                </div>
              </div>
            </div>

            {/* NOTIFICATION LOG LIST */}
            <div className="border border-slate-100 rounded-2xl overflow-hidden bg-slate-50/20 max-h-[420px] overflow-y-auto">
              {isLoading ? (
                <div className="py-24 text-center space-y-3">
                  <Loader className="w-8 h-8 border-4 border-orange-500 border-t-transparent rounded-full animate-spin mx-auto text-orange-500" />
                  <p className="text-xs text-slate-400 font-bold uppercase tracking-wider">Loading notification logs...</p>
                </div>
              ) : filteredNotifications.length === 0 ? (
                <div className="py-24 text-center px-4 space-y-3">
                  <Bell className="w-12 h-12 text-slate-300 mx-auto" />
                  <div className="space-y-1">
                    <p className="text-xs font-black text-slate-700 uppercase tracking-wider">No Notifications Found</p>
                    <p className="text-[11px] text-slate-400 font-medium max-w-sm mx-auto">
                      There are no notification logs matching your search and filter settings. Connect to FCM above to register device signals.
                    </p>
                  </div>
                </div>
              ) : (
                <div className="divide-y divide-slate-100 bg-white">
                  {filteredNotifications.map((n) => (
                    <div 
                      key={n.id}
                      className={`flex items-start justify-between p-4 gap-4 transition hover:bg-slate-50/50 ${
                        !n.read ? "bg-orange-50/15 border-l-4 border-l-orange-500" : "border-l-4 border-l-transparent"
                      }`}
                    >
                      <div className="flex gap-3.5 min-w-0">
                        {/* Status marker / type icon */}
                        <div className="mt-1 flex-shrink-0 relative">
                          <div className={`w-9 h-9 border rounded-xl flex items-center justify-center ${
                            !n.read ? "bg-white border-orange-200 shadow-sm" : "bg-slate-50 border-slate-100"
                          }`}>
                            {getIconForType(n.type)}
                          </div>
                          {!n.read && (
                            <span className="absolute -top-0.5 -right-0.5 w-2.5 h-2.5 bg-orange-600 rounded-full border border-white" />
                          )}
                        </div>

                        {/* Title, Body, Timestamp */}
                        <div className="min-w-0 space-y-1 text-left">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="font-extrabold text-xs text-slate-900">
                              {n.title}
                            </span>
                            <span className={`px-1.5 py-0.2 text-[8px] uppercase font-black tracking-wider border rounded ${getTypeBadgeStyles(n.type)}`}>
                              {n.type.replace("_", " ")}
                            </span>
                          </div>
                          
                          <p className="text-[11px] text-slate-500 font-medium leading-relaxed">
                            {n.body}
                          </p>

                          <p className="text-[9px] text-slate-400 font-bold">
                            {new Date(n.createdAt).toLocaleDateString([], { month: "short", day: "numeric" })}{" "}
                            {new Date(n.createdAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                          </p>
                        </div>
                      </div>

                      {/* Action buttons */}
                      <div className="flex items-center gap-1 shrink-0">
                        {!n.read && (
                          <button
                            onClick={() => markAsRead(n.id)}
                            className="p-1.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-600 rounded-lg transition cursor-pointer"
                            title="Mark as read"
                          >
                            <Check className="w-3.5 h-3.5" />
                          </button>
                        )}
                        <button
                          onClick={() => deleteNotification(n.id)}
                          className="p-1.5 bg-slate-50 hover:bg-slate-100 text-slate-500 hover:text-red-500 rounded-lg transition cursor-pointer"
                          title="Delete notification"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {/* TAB 2: SETTINGS */}
        {activeTab === "settings" && (
          <div className="space-y-6">
            {isSettingsLoading ? (
              <div className="py-16 text-center space-y-3">
                <Loader className="w-8 h-8 border-4 border-orange-500 border-t-transparent rounded-full animate-spin mx-auto text-orange-500" />
                <p className="text-xs text-slate-400 font-bold uppercase tracking-wider">Retrieving notification database...</p>
              </div>
            ) : settings ? (
              <div className="space-y-6 text-left max-w-2xl mx-auto bg-slate-50/50 p-6 rounded-2xl border border-slate-100">
                {/* Master Alert Enable */}
                <div className="flex items-center justify-between pb-4 border-b border-slate-200">
                  <div className="space-y-0.5">
                    <p className="text-xs font-black text-slate-900 uppercase tracking-wider">Master Notifications Switch</p>
                    <p className="text-[11px] text-slate-500 font-medium">Turn on or off all in-app and push notifications instantly.</p>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer select-none">
                    <input 
                      type="checkbox" 
                      checked={settings.enabled} 
                      onChange={(e) => updateSettingToggle("enabled", e.target.checked)}
                      className="sr-only peer"
                    />
                    <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-orange-600"></div>
                  </label>
                </div>

                {/* Sub category settings - locked if disabled */}
                <div className={`space-y-4 ${!settings.enabled ? "opacity-40 pointer-events-none" : ""}`}>
                  <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Notification Channels</h4>
                  
                  {/* Ride Alerts */}
                  <div className="flex items-center justify-between">
                    <div className="space-y-0.5">
                      <p className="text-xs font-extrabold text-slate-800 flex items-center gap-1.5">
                        <Flame className="w-3.5 h-3.5 text-rose-500" />
                        Emergency Ride & Dispatch Alerts
                      </p>
                      <p className="text-[10px] text-slate-500 font-medium">Receive real-time driver match, ETA, status updates, and emergency progress logs.</p>
                    </div>
                    <label className="relative inline-flex items-center cursor-pointer select-none">
                      <input 
                        type="checkbox" 
                        checked={settings.rideAlerts} 
                        onChange={(e) => updateSettingToggle("rideAlerts", e.target.checked)}
                        className="sr-only peer"
                      />
                      <div className="w-9 h-5 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-orange-600"></div>
                    </label>
                  </div>

                  {/* Chat Message Alerts */}
                  <div className="flex items-center justify-between">
                    <div className="space-y-0.5">
                      <p className="text-xs font-extrabold text-slate-800 flex items-center gap-1.5">
                        <MessageSquare className="w-3.5 h-3.5 text-emerald-500" />
                        Driver & Support Chat Alerts
                      </p>
                      <p className="text-[10px] text-slate-500 font-medium">Receive immediate notifications on real-time messaging from matched transit dispatchers or drivers.</p>
                    </div>
                    <label className="relative inline-flex items-center cursor-pointer select-none">
                      <input 
                        type="checkbox" 
                        checked={settings.chatAlerts} 
                        onChange={(e) => updateSettingToggle("chatAlerts", e.target.checked)}
                        className="sr-only peer"
                      />
                      <div className="w-9 h-5 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-orange-600"></div>
                    </label>
                  </div>

                  {/* Voice Call Alerts */}
                  <div className="flex items-center justify-between">
                    <div className="space-y-0.5">
                      <p className="text-xs font-extrabold text-slate-800 flex items-center gap-1.5">
                        <PhoneCall className="w-3.5 h-3.5 text-indigo-500" />
                        Incoming Emergency VoIP Call Alerts
                      </p>
                      <p className="text-[10px] text-slate-500 font-medium">Ring and display custom calling UI when dispatchers or drivers initiate direct calling.</p>
                    </div>
                    <label className="relative inline-flex items-center cursor-pointer select-none">
                      <input 
                        type="checkbox" 
                        checked={settings.voiceAlerts} 
                        onChange={(e) => updateSettingToggle("voiceAlerts", e.target.checked)}
                        className="sr-only peer"
                      />
                      <div className="w-9 h-5 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-orange-600"></div>
                    </label>
                  </div>

                  {/* Audio alert preference */}
                  <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest pt-2">Sound Configuration</h4>
                  <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
                    <div className="space-y-0.5">
                      <p className="text-xs font-extrabold text-slate-800 flex items-center gap-1.5">
                        {settings.soundEnabled ? <Volume2 className="w-3.5 h-3.5 text-orange-600" /> : <VolumeX className="w-3.5 h-3.5 text-slate-400" />}
                        App Notification Ringtone
                      </p>
                      <p className="text-[10px] text-slate-500 font-medium">Enable app sounds and configure custom rings for critical events.</p>
                    </div>

                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => updateSettingToggle("soundEnabled", !settings.soundEnabled)}
                        className={`p-2 border rounded-xl text-xs font-extrabold flex items-center gap-1.5 cursor-pointer ${
                          settings.soundEnabled 
                            ? "bg-orange-50 border-orange-200 text-orange-700" 
                            : "bg-slate-100 border-slate-200 text-slate-500"
                        }`}
                      >
                        {settings.soundEnabled ? "Sound On" : "Muted"}
                      </button>

                      {settings.soundEnabled && (
                        <select
                          value={settings.alertSound}
                          onChange={(e) => updateSettingToggle("alertSound", e.target.value)}
                          className="bg-white border border-slate-200 rounded-xl px-3 py-1.5 text-xs font-bold text-slate-700 focus:outline-none cursor-pointer"
                        >
                          <option value="default">Default Ping</option>
                          <option value="siren">🚨 Ambulance Siren</option>
                          <option value="chime">🔔 Soft Chime</option>
                          <option value="ping">⚡ High-frequency Ping</option>
                        </select>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            ) : (
              <div className="py-12 text-center text-xs text-slate-400 font-extrabold uppercase">
                Settings records not found.
              </div>
            )}
          </div>
        )}

        {/* TAB 3: SIMULATOR */}
        {activeTab === "simulate" && (
          <div className="space-y-6 text-left max-w-xl mx-auto">
            <div className="bg-orange-50 border border-orange-100 p-4 rounded-2xl flex items-start gap-3">
              <Info className="w-4 h-4 text-orange-600 shrink-0 mt-0.5" />
              <div className="space-y-0.5">
                <p className="text-xs font-extrabold text-orange-950 uppercase tracking-wide">FCM Payload Dispatch Console</p>
                <p className="text-[10px] text-orange-800 leading-relaxed font-medium">
                  Because this is running in a preview container environment, we simulate the exact Firebase Cloud Messaging JSON post payload. 
                  Below you can dispatch a custom simulated push notification. It will respect your custom settings and register directly into your database log!
                </p>
              </div>
            </div>

            <form onSubmit={handleSimulatePush} className="space-y-4">
              <div className="space-y-1">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
                  Notification Type
                </label>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                  {[
                    { id: "ride_alert", label: "🚨 Ride Alert" },
                    { id: "chat_alert", label: "💬 Chat Message" },
                    { id: "voice_call", label: "📞 Voice Ring" },
                    { id: "system", label: "⚙️ System log" },
                    { id: "general", label: "🔔 General" }
                  ].map((cat) => (
                    <button
                      key={cat.id}
                      type="button"
                      onClick={() => setSimType(cat.id as any)}
                      className={`py-2 px-3 text-xs font-black rounded-xl border text-center transition cursor-pointer ${
                        simType === cat.id
                          ? "bg-slate-900 border-slate-950 text-white"
                          : "bg-white hover:bg-slate-50 border-slate-200 text-slate-600"
                      }`}
                    >
                      {cat.label}
                    </button>
                  ))}
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
                  Notification Title
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. 🚨 EMERGENCY RIDE CONFIRMED"
                  value={simTitle}
                  onChange={(e) => setSimTitle(e.target.value)}
                  className="w-full px-4 py-2 text-xs font-bold border border-slate-200 rounded-xl bg-slate-50 focus:bg-white focus:outline-none focus:ring-1 focus:ring-orange-500 transition-all"
                />
              </div>

              <div className="space-y-1">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
                  Notification Body / Message
                </label>
                <textarea
                  required
                  rows={3}
                  placeholder="e.g. Volunteer Hero Amit Singh is arriving at Sherpur Village landmark with Tractor Ambulance UP-61-AB-1234."
                  value={simBody}
                  onChange={(e) => setSimBody(e.target.value)}
                  className="w-full px-4 py-2 text-xs font-bold border border-slate-200 rounded-xl bg-slate-50 focus:bg-white focus:outline-none focus:ring-1 focus:ring-orange-500 transition-all leading-relaxed"
                />
              </div>

              <button
                type="submit"
                disabled={isSimulating}
                className="w-full py-3 bg-gradient-to-r from-orange-600 to-amber-600 hover:from-orange-700 hover:to-amber-700 disabled:opacity-50 text-white rounded-2xl text-xs font-black uppercase tracking-widest transition flex items-center justify-center gap-2 cursor-pointer shadow-md"
              >
                {isSimulating ? (
                  <>
                    <Loader className="w-4 h-4 animate-spin" />
                    <span>Dispatched Sim Payload...</span>
                  </>
                ) : (
                  <>
                    <Plus className="w-4 h-4 text-white" />
                    <span>Dispatch Simulated FCM Push</span>
                  </>
                )}
              </button>
            </form>

            {simResult && (
              <div className={`p-4 border rounded-2xl ${simResult.success ? "bg-emerald-50 border-emerald-100 text-emerald-900" : "bg-red-50 border-red-100 text-red-900"}`}>
                <p className="text-xs font-black uppercase tracking-wide flex items-center gap-1.5">
                  {simResult.success ? "Success" : "Error"}
                </p>
                <p className="text-[11px] font-medium mt-1 leading-relaxed">{simResult.message}</p>
                {simResult.fcmTokenUsed && (
                  <p className="text-[9px] font-mono mt-1.5 bg-white/60 p-1 rounded border border-emerald-200">
                    Target FCM Token: {simResult.fcmTokenUsed}
                  </p>
                )}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
export default NotificationModule;
