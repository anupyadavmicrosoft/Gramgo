import React, { useState, useEffect } from "react";
import { 
  LayoutDashboard, 
  Car, 
  History, 
  User, 
  Bell, 
  Settings, 
  Activity, 
  Phone, 
  Shield, 
  Heart, 
  MapPin, 
  Loader, 
  CheckCircle, 
  Languages, 
  PhoneCall, 
  ArrowRight, 
  Clock, 
  Sparkles, 
  AlertTriangle,
  UserCheck,
  PlusCircle,
  HelpCircle,
  Volume2,
  Trash2,
  Compass,
  XCircle,
  X,
  Search,
  Share2,
  Copy,
  MessageSquare,
  Mail,
  Coins,
  Gift,
  Star
} from "lucide-react";
import { useAuth } from "../context/AuthContext";
import { EmergencyRide, CommunityHealthCentre, RideCancellationLog } from "../types";
import { RideSummaryModal } from "./RideSummaryModal";
import RideBooking from "./RideBooking";
import NearbyDrivers from "./NearbyDrivers";
import WalletDashboard from "./WalletDashboard";
import ReferralDashboard from "./ReferralDashboard";
import RatingSystem from "./RatingSystem";

interface Notification {
  id: string;
  userId: string;
  title: string;
  message: string;
  type: "info" | "success" | "warning" | "error";
  createdAt: number;
  read: boolean;
}

interface UserSettings {
  language: "english" | "hindi";
  smsNotifications: boolean;
  whatsappNotifications: boolean;
  autoAdviceEnabled: boolean;
  emergencyContacts: { name: string; relation: string; phone: string }[];
}

export default function PassengerHub() {
  const { user, token, refreshUser } = useAuth();
  
  // Tab State
  const [activeTab, setActiveTab] = useState<"dashboard" | "book" | "book_ride" | "nearby_drivers" | "history" | "profile" | "notifications" | "settings" | "cancellations" | "wallet" | "referral" | "ratings">("dashboard");
  
  // Data States
  const [activeRide, setActiveRide] = useState<EmergencyRide | null>(null);
  const [shareCopied, setShareCopied] = useState<boolean>(false);
  const [selectedSummaryRide, setSelectedSummaryRide] = useState<EmergencyRide | null>(null);
  const [isSummaryOpen, setIsSummaryOpen] = useState(false);
  const [rideHistory, setRideHistory] = useState<EmergencyRide[]>([]);
  const [historySearch, setHistorySearch] = useState("");
  const [historyTypeFilter, setHistoryTypeFilter] = useState("all");
  const [historyPriorityFilter, setHistoryPriorityFilter] = useState("all");
  const [historyStatusFilter, setHistoryStatusFilter] = useState("all");
  const [notificationsList, setNotificationsList] = useState<Notification[]>([]);
  
  // Cancellation States
  const [cancellationLogs, setCancellationLogs] = useState<RideCancellationLog[]>([]);
  const [showCancelModal, setShowCancelModal] = useState(false);
  const [cancelReasonOption, setCancelReasonOption] = useState("");
  const [customCancelReason, setCustomCancelReason] = useState("");
  const [cancellationReasons, setCancellationReasons] = useState<string[]>([]);
  const [isCancelling, setIsCancelling] = useState(false);
  const [userSettings, setUserSettings] = useState<UserSettings>({
    language: "english",
    smsNotifications: true,
    whatsappNotifications: false,
    autoAdviceEnabled: true,
    emergencyContacts: []
  });
  const [chcList, setChcList] = useState<CommunityHealthCentre[]>([]);
  
  // Loading & Action States
  const [loadingActive, setLoadingActive] = useState(true);
  const [loadingHistory, setLoadingHistory] = useState(false);
  const [loadingNotifs, setLoadingNotifs] = useState(false);
  const [loadingSettings, setLoadingSettings] = useState(false);
  
  // Book Form State
  const [patientName, setPatientName] = useState(user?.name || "");
  const [patientPhone, setPatientPhone] = useState(user?.phone || "");
  const [emergencyType, setEmergencyType] = useState<EmergencyRide["emergencyType"]>("Maternity");
  const [priority, setPriority] = useState<EmergencyRide["priority"]>("urgent");
  const [village, setVillage] = useState(user?.village || "");
  const [landmark, setLandmark] = useState("");
  const [destinationChc, setDestinationChc] = useState("");
  const [isSubmittingRide, setIsSubmittingRide] = useState(false);
  
  // AI First Aid State
  const [aiAdvice, setAiAdvice] = useState("");
  const [aiLanguage, setAiLanguage] = useState<"english" | "hindi">("hindi");
  const [isLoadingAi, setIsLoadingAi] = useState(false);
  
  // Profile Form State
  const [profileName, setProfileName] = useState(user?.name || "");
  const [profileEmail, setProfileEmail] = useState(user?.email || "");
  const [profilePhone, setProfilePhone] = useState(user?.phone || "");
  const [profileVillage, setProfileVillage] = useState(user?.village || "");
  const [profileDistrict, setProfileDistrict] = useState(user?.district || "Ghazipur");
  const [isSavingProfile, setIsSavingProfile] = useState(false);
  const [profileSuccessMsg, setProfileSuccessMsg] = useState("");
  
  // Settings Form State
  const [isSavingSettings, setIsSavingSettings] = useState(false);
  const [settingsSuccessMsg, setSettingsSuccessMsg] = useState("");
  const [newContactName, setNewContactName] = useState("");
  const [newContactRelation, setNewContactRelation] = useState("");
  const [newContactPhone, setNewContactPhone] = useState("");

  // Emergency Contacts States & API helpers
  const [contactsList, setContactsList] = useState<any[]>([]);
  const [loadingContacts, setLoadingContacts] = useState(false);
  const [contactsError, setContactsError] = useState<string | null>(null);
  const [contactsSuccess, setContactsSuccess] = useState<string | null>(null);
  const [editingContactId, setEditingContactId] = useState<string | null>(null);
  const [contactForm, setContactForm] = useState({
    name: "",
    relationship: "Spouse",
    phone: "",
    isPrimary: false
  });

  const fetchContacts = async () => {
    setLoadingContacts(true);
    setContactsError(null);
    try {
      const res = await fetch("/api/contacts", {
        headers: { "Authorization": `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setContactsList(data);
      } else {
        const data = await res.json();
        setContactsError(data.error || "Failed to load contacts.");
      }
    } catch (e: any) {
      setContactsError("Network error. Failed to retrieve emergency contacts.");
    } finally {
      setLoadingContacts(false);
    }
  };

  const handleContactSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setContactsError(null);
    setContactsSuccess(null);

    const { name, relationship, phone, isPrimary } = contactForm;

    if (!name.trim()) {
      setContactsError("Contact name is required.");
      return;
    }
    if (!phone.trim()) {
      setContactsError("Phone number is required.");
      return;
    }
    const phoneRegex = /^\+?[0-9]{10,14}$/;
    if (!phoneRegex.test(phone.replace(/[\s-]/g, ""))) {
      setContactsError("Please enter a valid phone number (at least 10 digits).");
      return;
    }

    setLoadingContacts(true);
    try {
      let url = "/api/contacts";
      let method = "POST";
      if (editingContactId) {
        url = `/api/contacts/${editingContactId}`;
        method = "PUT";
      } else {
        if (contactsList.length >= 5) {
          setContactsError("Maximum limit of 5 emergency contacts reached.");
          setLoadingContacts(false);
          return;
        }
      }

      const res = await fetch(url, {
        method,
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token}`
        },
        body: JSON.stringify({
          name: name.trim(),
          relationship: relationship.trim(),
          phone: phone.trim(),
          isPrimary
        })
      });

      if (res.ok) {
        setContactsSuccess(editingContactId ? "Emergency contact updated successfully!" : "Emergency contact added successfully!");
        setContactForm({ name: "", relationship: "Spouse", phone: "", isPrimary: false });
        setEditingContactId(null);
        await fetchContacts();
      } else {
        const data = await res.json();
        setContactsError(data.error || "Failed to save contact details.");
      }
    } catch (err) {
      setContactsError("Network error. Failed to save contact details.");
    } finally {
      setLoadingContacts(false);
    }
  };

  const startEditContact = (contact: any) => {
    setEditingContactId(contact.id);
    setContactForm({
      name: contact.name,
      relationship: contact.relationship,
      phone: contact.phone,
      isPrimary: contact.isPrimary
    });
    setContactsError(null);
    setContactsSuccess(null);
  };

  const cancelEditContact = () => {
    setEditingContactId(null);
    setContactForm({ name: "", relationship: "Spouse", phone: "", isPrimary: false });
    setContactsError(null);
    setContactsSuccess(null);
  };

  const handleContactDelete = async (contactId: string) => {
    if (contactsList.length <= 1) {
      setContactsError("Safety Alert: You must retain at least 1 active emergency contact.");
      return;
    }

    if (!confirm("Are you sure you want to delete this emergency contact?")) {
      return;
    }

    setLoadingContacts(true);
    setContactsError(null);
    setContactsSuccess(null);

    try {
      const res = await fetch(`/api/contacts/${contactId}`, {
        method: "DELETE",
        headers: { "Authorization": `Bearer ${token}` }
      });

      if (res.ok) {
        setContactsSuccess("Emergency contact removed successfully.");
        await fetchContacts();
      } else {
        const data = await res.json();
        setContactsError(data.error || "Failed to delete contact.");
      }
    } catch (err) {
      setContactsError("Network error. Failed to delete contact.");
    } finally {
      setLoadingContacts(false);
    }
  };

  // Initial Fetching
  useEffect(() => {
    if (!token) return;
    
    // Fetch CHCs list
    fetch("/api/chcs")
      .then((res) => res.json())
      .then((data) => {
        setChcList(data);
        if (data.length > 0) {
          setDestinationChc(data[0].name);
        }
      })
      .catch((err) => console.error("Error fetching CHCs:", err));
      
    // Fetch Active Ride
    fetchActiveRide();
    // Fetch Notifications
    fetchNotifications();
    // Fetch History
    fetchHistory();
    // Fetch Settings
    fetchSettings();
    // Fetch Emergency Contacts
    fetchContacts();
    // Fetch Cancellation Info
    fetchCancellationHistory();
    fetchCancellationReasons();
  }, [token]);

  // Sync profile form when user context updates
  useEffect(() => {
    if (user) {
      setProfileName(user.name);
      setProfileEmail(user.email || "");
      setProfilePhone(user.phone);
      setProfileVillage(user.village);
      setProfileDistrict(user.district || "Ghazipur");
      
      // Update form pre-fills if they are untouched or empty
      if (!patientName) setPatientName(user.name);
      if (!patientPhone) setPatientPhone(user.phone);
      if (!village) setVillage(user.village);
    }
  }, [user]);

  // Poll Active Ride Status if searching/en_route etc
  useEffect(() => {
    if (!activeRide || activeRide.status === "completed" || activeRide.status === "Completed" || activeRide.status === "cancelled" || activeRide.status === "Cancelled") return;

    const interval = setInterval(() => {
      fetch(`/api/ride-status/${activeRide.id}`)
        .then((res) => {
          if (!res.ok) throw new Error();
          return res.json();
        })
        .then((data) => {
          setActiveRide(data);
          if (data.status === "completed" || data.status === "Completed") {
            // Refresh list & fetch history
            fetchHistory();
            fetchNotifications();
          }
        })
        .catch((err) => console.error("Error polling ride status:", err));
    }, 4000);

    return () => clearInterval(interval);
  }, [activeRide]);

  // Get AI First Aid Companion Advice on selection or status change
  const fetchFirstAidAdvice = (type: string, lang: "english" | "hindi") => {
    setIsLoadingAi(true);
    fetch("/api/gemini/first-aid", {
      method: "POST",
      headers: { 
        "Content-Type": "application/json",
        "Authorization": `Bearer ${token}`
      },
      body: JSON.stringify({ emergencyType: type, language: lang }),
    })
      .then((res) => res.json())
      .then((data) => {
        setAiAdvice(data.advice);
        setIsLoadingAi(false);
      })
      .catch((err) => {
        console.error("AI Advice Error:", err);
        setIsLoadingAi(false);
      });
  };

  // Triggers when ride selection type changes or language switches
  useEffect(() => {
    if (activeRide) {
      fetchFirstAidAdvice(activeRide.emergencyType, aiLanguage);
    }
  }, [aiLanguage, activeRide?.id]);

  const fetchActiveRide = async () => {
    setLoadingActive(true);
    try {
      const res = await fetch("/api/rides/active", {
        headers: { "Authorization": `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setActiveRide(data);
        if (data) {
          fetchFirstAidAdvice(data.emergencyType, aiLanguage);
        }
      }
    } catch (e) {
      console.error("Error fetching active ride:", e);
    } finally {
      setLoadingActive(false);
    }
  };

  const fetchHistory = async () => {
    setLoadingHistory(true);
    try {
      const res = await fetch("/api/rides/history", {
        headers: { "Authorization": `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setRideHistory(data);
      }
    } catch (e) {
      console.error("Error fetching ride history:", e);
    } finally {
      setLoadingHistory(false);
    }
  };

  const fetchCancellationHistory = async () => {
    try {
      const res = await fetch("/api/rides/cancellations/history", {
        headers: { "Authorization": `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setCancellationLogs(data);
      }
    } catch (e) {
      console.error("Error fetching cancellations history:", e);
    }
  };

  const fetchCancellationReasons = async () => {
    try {
      const res = await fetch("/api/rides/cancellation-reasons", {
        headers: { "Authorization": `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setCancellationReasons(data.passenger || []);
      }
    } catch (e) {
      console.error("Error fetching cancellation reasons:", e);
    }
  };

  const fetchNotifications = async () => {
    setLoadingNotifs(true);
    try {
      const res = await fetch("/api/notifications", {
        headers: { "Authorization": `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setNotificationsList(data);
      }
    } catch (e) {
      console.error("Error fetching notifications:", e);
    } finally {
      setLoadingNotifs(false);
    }
  };

  const fetchSettings = async () => {
    setLoadingSettings(true);
    try {
      const res = await fetch("/api/user/settings", {
        headers: { "Authorization": `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setUserSettings(data);
      }
    } catch (e) {
      console.error("Error fetching settings:", e);
    } finally {
      setLoadingSettings(false);
    }
  };

  const handleBookRide = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!patientName || !patientPhone || !village) {
      alert("Patient Name, Contact Phone, and Village are mandatory fields.");
      return;
    }

    setIsSubmittingRide(true);
    try {
      const res = await fetch("/api/rides/book", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token}`
        },
        body: JSON.stringify({
          patientName,
          patientPhone,
          emergencyType,
          priority,
          village,
          landmark,
          destinationChc
        })
      });

      if (!res.ok) throw new Error("Dispatch request failed.");
      const data = await res.json();
      setActiveRide(data);
      fetchFirstAidAdvice(data.emergencyType, aiLanguage);
      fetchNotifications();
      fetchHistory();
      
      // Auto toggle to Dashboard to track active ride
      setActiveTab("dashboard");
    } catch (err: any) {
      alert(err.message || "Failed to dispatch request.");
    } finally {
      setIsSubmittingRide(false);
    }
  };

  const handleCancelRide = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!activeRide) return;
    
    const finalReason = cancelReasonOption === "Other" ? customCancelReason : cancelReasonOption;
    if (!finalReason) {
      alert("Please select or enter a cancellation reason.");
      return;
    }

    setIsCancelling(true);
    try {
      const res = await fetch(`/api/rides/${activeRide.id}/cancel`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token}`
        },
        body: JSON.stringify({
          reason: finalReason,
          cancelledBy: "passenger"
        })
      });

      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.error || "Failed to cancel ride.");
      }

      setActiveRide(null);
      setShowCancelModal(false);
      setCancelReasonOption("");
      setCustomCancelReason("");
      
      // Refresh notifications, history, and cancellations log
      fetchNotifications();
      fetchHistory();
      fetchCancellationHistory();
    } catch (err: any) {
      alert(err.message || "Failed to cancel request.");
    } finally {
      setIsCancelling(false);
    }
  };

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSavingProfile(true);
    setProfileSuccessMsg("");
    
    try {
      const res = await fetch("/api/profile", {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token}`
        },
        body: JSON.stringify({
          name: profileName,
          email: profileEmail,
          phone: profilePhone,
          village: profileVillage,
          district: profileDistrict
        })
      });
      
      if (!res.ok) {
        const errData = await res.json();
        throw new Error(errData.error || "Profile update failed.");
      }
      
      await refreshUser();
      setProfileSuccessMsg("Your GramGo profile has been updated successfully.");
      fetchNotifications();
    } catch (err: any) {
      alert(err.message || "Failed to update profile.");
    } finally {
      setIsSavingProfile(false);
    }
  };

  const handleSaveSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSavingSettings(true);
    setSettingsSuccessMsg("");
    
    try {
      const res = await fetch("/api/user/settings", {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token}`
        },
        body: JSON.stringify(userSettings)
      });
      
      if (!res.ok) throw new Error();
      const updated = await res.json();
      setUserSettings(updated);
      setSettingsSuccessMsg("Your notification and system settings have been saved.");
    } catch (err) {
      alert("Failed to save settings.");
    } finally {
      setIsSavingSettings(false);
    }
  };

  const handleAddContact = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newContactName || !newContactPhone) return;
    
    const updatedContacts = [
      ...userSettings.emergencyContacts,
      { name: newContactName, relation: newContactRelation || "Family", phone: newContactPhone }
    ];
    
    setUserSettings({
      ...userSettings,
      emergencyContacts: updatedContacts
    });
    
    setNewContactName("");
    setNewContactRelation("");
    setNewContactPhone("");
  };

  const handleRemoveContact = (index: number) => {
    const updatedContacts = userSettings.emergencyContacts.filter((_, i) => i !== index);
    setUserSettings({
      ...userSettings,
      emergencyContacts: updatedContacts
    });
  };

  const handleMarkNotifsRead = async () => {
    try {
      const res = await fetch("/api/notifications/read", {
        method: "POST",
        headers: { "Authorization": `Bearer ${token}` }
      });
      if (res.ok) {
        setNotificationsList(prev => prev.map(n => ({ ...n, read: true })));
      }
    } catch (e) {
      console.error(e);
    }
  };

  // Statistics Helper
  const completedTripsCount = rideHistory.filter(r => r.status === "completed" || r.status === "Completed").length;
  const criticalTripsCount = rideHistory.filter(r => r.priority === "critical").length;
  const unreadNotifsCount = notificationsList.filter(n => !n.read).length;

  const filteredHistory = rideHistory.filter((ride) => {
    const query = historySearch.toLowerCase();
    const matchesSearch = 
      ride.patientName.toLowerCase().includes(query) ||
      ride.destinationChc.toLowerCase().includes(query) ||
      ride.village.toLowerCase().includes(query) ||
      (ride.driverName && ride.driverName.toLowerCase().includes(query)) ||
      (ride.vehicleType && ride.vehicleType.toLowerCase().includes(query));

    const matchesType = historyTypeFilter === "all" || ride.emergencyType === historyTypeFilter;
    const matchesPriority = historyPriorityFilter === "all" || ride.priority === historyPriorityFilter;
    const matchesStatus = historyStatusFilter === "all" || ride.status === historyStatusFilter;

    return matchesSearch && matchesType && matchesPriority && matchesStatus;
  });

  return (
    <div id="passenger-hub" className="min-h-screen bg-slate-50/50 py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        
        {/* Hub Title Block */}
        <div className="mb-8 flex flex-col md:flex-row md:items-center md:justify-between border-b border-orange-100 pb-6 gap-4">
          <div>
            <div className="flex items-center gap-2">
              <span className="p-1.5 bg-orange-100 text-orange-600 rounded-lg">
                <Heart className="w-5 h-5 fill-current" />
              </span>
              <h1 className="text-2xl font-black text-slate-800 tracking-tight">GramGo Passenger Hub</h1>
            </div>
            <p className="text-sm font-medium text-slate-500 mt-1">
              Welcome, <span className="text-slate-800 font-bold">{user?.name}</span> • Primary Village: <span className="text-orange-600 font-bold">{user?.village}</span> ({user?.district || "Ghazipur"})
            </p>
          </div>
          
          {/* Quick Help & SOS Trigger */}
          <div className="flex items-center gap-2">
            <a 
              href="tel:108" 
              className="flex items-center space-x-1.5 px-4 py-2.5 bg-red-600 hover:bg-red-700 text-white rounded-xl text-sm font-extrabold shadow-md shadow-red-200 transition-all cursor-pointer animate-pulse"
            >
              <PhoneCall className="w-4 h-4" />
              <span>DIAL NATIONAL AMBULANCE (108)</span>
            </a>
          </div>
        </div>

        {/* Layout Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          
          {/* Sidebar Tabs */}
          <div className="lg:col-span-3 flex flex-col space-y-1.5">
            <button
              onClick={() => setActiveTab("dashboard")}
              className={`flex items-center space-x-3 px-4 py-3.5 rounded-xl text-sm font-bold transition-all text-left cursor-pointer ${
                activeTab === "dashboard"
                  ? "bg-orange-600 text-white shadow-md shadow-orange-100"
                  : "bg-white text-slate-600 hover:bg-orange-50/50 hover:text-orange-600 border border-slate-100"
              }`}
            >
              <LayoutDashboard className="w-4 h-4" />
              <span className="flex-grow">Passenger Dashboard</span>
              {activeRide && (
                <span className="w-2.5 h-2.5 bg-red-500 rounded-full animate-ping" />
              )}
            </button>

            <button
              onClick={() => setActiveTab("book")}
              className={`flex items-center space-x-3 px-4 py-3.5 rounded-xl text-sm font-bold transition-all text-left cursor-pointer ${
                activeTab === "book"
                  ? "bg-orange-600 text-white shadow-md shadow-orange-100"
                  : "bg-white text-slate-600 hover:bg-orange-50/50 hover:text-orange-600 border border-slate-100"
              }`}
            >
              <Car className="w-4 h-4" />
              <span>Book Emergency Transport</span>
            </button>

            <button
              onClick={() => setActiveTab("book_ride")}
              className={`flex items-center space-x-3 px-4 py-3.5 rounded-xl text-sm font-bold transition-all text-left cursor-pointer ${
                activeTab === "book_ride"
                  ? "bg-orange-600 text-white shadow-md shadow-orange-100"
                  : "bg-white text-slate-600 hover:bg-orange-50/50 hover:text-orange-600 border border-slate-100"
              }`}
            >
              <MapPin className="w-4 h-4" />
              <span>Book Local Ride</span>
            </button>

            <button
              onClick={() => setActiveTab("nearby_drivers")}
              className={`flex items-center space-x-3 px-4 py-3.5 rounded-xl text-sm font-bold transition-all text-left cursor-pointer ${
                activeTab === "nearby_drivers"
                  ? "bg-orange-600 text-white shadow-md shadow-orange-100"
                  : "bg-white text-slate-600 hover:bg-orange-50/50 hover:text-orange-600 border border-slate-100"
              }`}
            >
              <Compass className="w-4 h-4" />
              <span>Nearby Drivers</span>
            </button>

            <button
              onClick={() => setActiveTab("history")}
              className={`flex items-center space-x-3 px-4 py-3.5 rounded-xl text-sm font-bold transition-all text-left cursor-pointer ${
                activeTab === "history"
                  ? "bg-orange-600 text-white shadow-md shadow-orange-100"
                  : "bg-white text-slate-600 hover:bg-orange-50/50 hover:text-orange-600 border border-slate-100"
              }`}
            >
              <History className="w-4 h-4" />
              <span>Transport Ride History</span>
              {rideHistory.length > 0 && (
                <span className="px-1.5 py-0.5 bg-slate-100 text-slate-700 rounded text-[11px] font-black">
                  {rideHistory.length}
                </span>
              )}
            </button>

            <button
              onClick={() => setActiveTab("ratings")}
              className={`flex items-center space-x-3 px-4 py-3.5 rounded-xl text-sm font-bold transition-all text-left cursor-pointer ${
                activeTab === "ratings"
                  ? "bg-orange-600 text-white shadow-md shadow-orange-100"
                  : "bg-white text-slate-600 hover:bg-orange-50/50 hover:text-orange-600 border border-slate-100"
              }`}
            >
              <Star className="w-4 h-4 text-amber-500 fill-amber-500" />
              <span>Ratings & Reviews</span>
            </button>

            <button
              onClick={() => setActiveTab("cancellations")}
              className={`flex items-center space-x-3 px-4 py-3.5 rounded-xl text-sm font-bold transition-all text-left cursor-pointer ${
                activeTab === "cancellations"
                  ? "bg-orange-600 text-white shadow-md shadow-orange-100"
                  : "bg-white text-slate-600 hover:bg-orange-50/50 hover:text-orange-600 border border-slate-100"
              }`}
            >
              <XCircle className="w-4 h-4" />
              <span>Cancellations Log</span>
              {cancellationLogs.length > 0 && (
                <span className="px-1.5 py-0.5 bg-red-100 text-red-700 rounded text-[11px] font-black">
                  {cancellationLogs.length}
                </span>
              )}
            </button>

            <button
              onClick={() => setActiveTab("notifications")}
              className={`flex items-center space-x-3 px-4 py-3.5 rounded-xl text-sm font-bold transition-all text-left cursor-pointer ${
                activeTab === "notifications"
                  ? "bg-orange-600 text-white shadow-md shadow-orange-100"
                  : "bg-white text-slate-600 hover:bg-orange-50/50 hover:text-orange-600 border border-slate-100"
              }`}
            >
              <Bell className="w-4 h-4" />
              <span>Emergency Alerts</span>
              {unreadNotifsCount > 0 && (
                <span className="px-2 py-0.5 bg-red-500 text-white rounded-full text-[10px] font-black animate-pulse">
                  {unreadNotifsCount}
                </span>
              )}
            </button>

            <button
              onClick={() => setActiveTab("profile")}
              className={`flex items-center space-x-3 px-4 py-3.5 rounded-xl text-sm font-bold transition-all text-left cursor-pointer ${
                activeTab === "profile"
                  ? "bg-orange-600 text-white shadow-md shadow-orange-100"
                  : "bg-white text-slate-600 hover:bg-orange-50/50 hover:text-orange-600 border border-slate-100"
              }`}
            >
              <User className="w-4 h-4" />
              <span>My Lifeline Profile</span>
            </button>

            <button
              onClick={() => setActiveTab("wallet")}
              className={`flex items-center space-x-3 px-4 py-3.5 rounded-xl text-sm font-bold transition-all text-left cursor-pointer ${
                activeTab === "wallet"
                  ? "bg-orange-600 text-white shadow-md shadow-orange-100"
                  : "bg-white text-slate-600 hover:bg-orange-50/50 hover:text-orange-600 border border-slate-100"
              }`}
            >
              <Coins className="w-4 h-4" />
              <span>My Subsidy Wallet</span>
            </button>

            <button
              onClick={() => setActiveTab("referral")}
              className={`flex items-center space-x-3 px-4 py-3.5 rounded-xl text-sm font-bold transition-all text-left cursor-pointer ${
                activeTab === "referral"
                  ? "bg-orange-600 text-white shadow-md shadow-orange-100"
                  : "bg-white text-slate-600 hover:bg-orange-50/50 hover:text-orange-600 border border-slate-100"
              }`}
            >
              <Gift className="w-4 h-4" />
              <span>Refer & Earn Credits</span>
            </button>

            <button
              onClick={() => setActiveTab("settings")}
              className={`flex items-center space-x-3 px-4 py-3.5 rounded-xl text-sm font-bold transition-all text-left cursor-pointer ${
                activeTab === "settings"
                  ? "bg-orange-600 text-white shadow-md shadow-orange-100"
                  : "bg-white text-slate-600 hover:bg-orange-50/50 hover:text-orange-600 border border-slate-100"
              }`}
            >
              <Settings className="w-4 h-4" />
              <span>App Settings</span>
            </button>

            {/* Helpline Static Card */}
            <div className="bg-slate-900 text-white p-4 rounded-xl border border-slate-800 shadow-sm space-y-3.5 mt-4">
              <div className="flex items-center space-x-2">
                <Shield className="w-4 h-4 text-emerald-400" />
                <span className="text-xs font-bold uppercase tracking-wider text-emerald-400">GramGo Security Guard</span>
              </div>
              <p className="text-[11px] text-slate-400 leading-normal font-medium">
                Our drivers are local verified volunteers vetted by Gram Panchayat heads to ensure fully safe & secure transport.
              </p>
              <div className="pt-2 border-t border-slate-800">
                <span className="block text-[10px] text-slate-500 uppercase font-bold">24x7 Help Desk</span>
                <span className="text-xs font-bold text-orange-400">1800-309-GRAM (4726)</span>
              </div>
            </div>
          </div>

          {/* Main Area Content Panel */}
          <div className="lg:col-span-9 bg-white rounded-2xl border border-orange-50 p-6 md:p-8 shadow-sm min-h-[500px]">
            
            {/* 1. DASHBOARD TAB */}
            {activeTab === "dashboard" && (
              <div className="space-y-8">
                
                {/* Active Ride Banner */}
                {loadingActive ? (
                  <div className="flex items-center justify-center p-8 border border-dashed border-slate-200 rounded-xl">
                    <Loader className="w-6 h-6 text-orange-600 animate-spin mr-2" />
                    <span className="text-sm font-bold text-slate-500">Checking for active emergency bookings...</span>
                  </div>
                ) : activeRide ? (
                  <div className="bg-red-50 border-2 border-red-200 rounded-2xl p-6 relative overflow-hidden shadow-sm">
                    <div className="absolute right-0 top-0 translate-x-4 -translate-y-4 w-32 h-32 bg-red-100/40 rounded-full pointer-events-none" />
                    
                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-red-100 pb-4 mb-4">
                      <div>
                        <span className="inline-flex items-center px-2.5 py-1 bg-red-100 text-red-800 rounded-full text-xs font-black uppercase mb-2 animate-pulse">
                          <Activity className="w-3.5 h-3.5 mr-1" />
                          Emergency Transport Active
                        </span>
                        <h2 className="text-xl font-extrabold text-slate-900 tracking-tight">
                          Transport to {activeRide.destinationChc}
                        </h2>
                        <p className="text-xs font-semibold text-slate-500 mt-0.5">
                          Patient Name: <span className="text-slate-800 font-bold">{activeRide.patientName}</span> • Priority: <span className="text-red-700 capitalize font-extrabold">{activeRide.priority}</span>
                        </p>
                      </div>

                      <div className="text-right">
                        <span className="text-[10px] text-slate-400 block font-bold uppercase tracking-wider">Status Updates</span>
                        <span className="inline-flex items-center px-3 py-1 bg-red-600 text-white font-extrabold text-xs rounded-xl shadow-sm uppercase tracking-wide mt-1 animate-pulse capitalize">
                          {activeRide.status.replace("_", " ")}
                        </span>
                      </div>
                    </div>

                    {/* Progress Visual Tracker & Detailed Status Timeline */}
                    <div className="my-6 space-y-6">
                      <div className="w-full bg-slate-100 h-2.5 rounded-full overflow-hidden flex">
                        <div className={`h-full transition-all duration-1000 ${
                          activeRide.status === "requested" || activeRide.status === "Emergency Requested" ? "w-[14%] bg-rose-500" :
                          activeRide.status === "searching" || activeRide.status === "Searching Driver" ? "w-[28%] bg-amber-500" :
                          activeRide.status === "driver_assigned" || activeRide.status === "Driver Assigned" ? "w-[42%] bg-blue-500" :
                          (activeRide.status === "driver_arriving" || activeRide.status === "en_route" || activeRide.status === "Driver Arriving") ? "w-[56%] bg-teal-500 animate-pulse" :
                          (activeRide.status === "reached_pickup" || activeRide.status === "arrived" || activeRide.status === "Passenger Picked") ? "w-[70%] bg-pink-500" :
                          (activeRide.status === "ride_started" || activeRide.status === "Hospital Reached") ? "w-[85%] bg-indigo-600 animate-pulse" :
                          (activeRide.status === "completed" || activeRide.status === "Completed") ? "w-full bg-emerald-500" : "w-0"
                        }`} />
                      </div>

                      {/* Timeline Steps Card */}
                      <div className="bg-slate-50 border border-slate-100/80 rounded-2xl p-5 space-y-4">
                        <h3 className="text-xs font-black text-slate-800 uppercase tracking-wider flex items-center gap-1.5 border-b border-slate-200/50 pb-2">
                          <Activity className="w-3.5 h-3.5 text-red-600" />
                          Emergency Lifeline Status Timeline
                        </h3>

                        <div className="relative pl-6 space-y-5 border-l-2 border-slate-200/60 ml-3">
                          {[
                            {
                              id: "requested",
                              label: "Emergency Requested",
                              desc: "Emergency registered in GramGo. Initializing dispatch protocols.",
                              time: "0s"
                            },
                            {
                              id: "searching",
                              label: "Searching Driver",
                              desc: "Alerting nearest available volunteer hero drivers.",
                              time: "+3s"
                            },
                            {
                              id: "driver_assigned",
                              label: "Driver Assigned",
                              desc: activeRide.driverId ? `Driver matched: ${activeRide.driverName} (${activeRide.vehicleType})` : "Matching driver...",
                              time: "+8s"
                            },
                            {
                              id: "driver_arriving",
                              label: "Driver Arriving",
                              desc: "Volunteer driver is en route and heading to your village.",
                              time: "Transit"
                            },
                            {
                              id: "reached_pickup",
                              label: "Passenger Picked",
                              desc: `GramGo vehicle reached pickup point and passenger has boarded.`,
                              time: "Boarded"
                            },
                            {
                              id: "ride_started",
                              label: "Hospital Reached",
                              desc: `Safe high-priority transit completed to CHC: ${activeRide.destinationChc}.`,
                              time: "Arrived"
                            },
                            {
                              id: "completed",
                              label: "Completed",
                              desc: `Safely arrived at ${activeRide.destinationChc}. Medical handoff complete.`,
                              time: "Success"
                            }
                          ].map((step, idx) => {
                            const currentIdx = (() => {
                              const s = activeRide.status;
                              if (s === "requested" || s === "Emergency Requested") return 0;
                              if (s === "searching" || s === "Searching Driver") return 1;
                              if (s === "driver_assigned" || s === "Driver Assigned") return 2;
                              if (s === "driver_arriving" || s === "en_route" || s === "Driver Arriving") return 3;
                              if (s === "reached_pickup" || s === "arrived" || s === "Passenger Picked") return 4;
                              if (s === "ride_started" || s === "Hospital Reached") return 5;
                              if (s === "completed" || s === "Completed") return 6;
                              return -1;
                            })();

                            const isCurrent = idx === currentIdx;
                            const isCompleted = idx < currentIdx;
                            const isFuture = idx > currentIdx;

                            return (
                              <div key={step.id} className={`relative flex items-start gap-3 transition-opacity ${isFuture ? "opacity-40" : "opacity-100"}`}>
                                {/* Timeline Bullet node */}
                                <div className={`absolute -left-[31px] w-[11px] h-[11px] rounded-full border-2 transition-all ${
                                  isCurrent 
                                    ? "bg-red-600 border-red-200 scale-125 ring-4 ring-red-50" 
                                    : isCompleted 
                                      ? "bg-emerald-500 border-emerald-100 scale-105" 
                                      : "bg-white border-slate-300"
                                }`} />

                                <div className="flex-grow min-w-0">
                                  <div className="flex items-center justify-between gap-2">
                                    <span className={`text-xs font-extrabold transition-colors ${
                                      isCurrent 
                                        ? "text-red-700" 
                                        : isCompleted 
                                          ? "text-emerald-700" 
                                          : "text-slate-500"
                                    }`}>
                                      {step.label}
                                      {isCurrent && <span className="ml-1.5 px-1.5 py-0.5 bg-red-100 text-red-700 rounded text-[9px] font-black uppercase animate-pulse">Active</span>}
                                    </span>
                                    <span className="text-[10px] text-slate-400 font-mono">{step.time}</span>
                                  </div>
                                  <p className="text-[11px] font-medium text-slate-600 leading-snug mt-0.5">
                                    {step.desc}
                                  </p>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    </div>

                    {/* Driver & Vehicle Details block */}
                    {activeRide.driverId ? (
                      <div className="bg-white border border-red-100 rounded-xl p-4 grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="space-y-1">
                          <span className="text-[10px] text-slate-400 block font-bold uppercase tracking-wider">Your matched volunteer driver</span>
                          <div className="flex items-center space-x-2">
                            <span className="p-1 bg-emerald-50 text-emerald-600 rounded-full">
                              <UserCheck className="w-4 h-4" />
                            </span>
                            <span className="text-sm font-bold text-slate-800">{activeRide.driverName}</span>
                          </div>
                          <span className="text-xs text-slate-500 font-semibold block">Contact: {activeRide.driverPhone}</span>
                        </div>
                        
                        <div className="space-y-1 md:border-l border-slate-100 md:pl-4">
                          <span className="text-[10px] text-slate-400 block font-bold uppercase tracking-wider">Vehicle Details</span>
                          <span className="text-sm font-black text-slate-800 block capitalize">{activeRide.vehicleType}</span>
                          <span className="inline-flex px-2 py-0.5 bg-slate-100 text-slate-700 font-bold rounded text-xs">
                            {activeRide.vehicleNumber || "UP-61-VOL-99"}
                          </span>
                        </div>
                      </div>
                    ) : (
                      <div className="flex items-center space-x-3 p-4 bg-white/60 border border-red-100 rounded-xl">
                        <Loader className="w-5 h-5 text-red-600 animate-spin" />
                        <span className="text-xs font-bold text-slate-600">Matching nearby available drivers. This normally takes 5 seconds...</span>
                      </div>
                    )}

                    {/* Live AI Advice Companion Box */}
                    <div className="mt-4 pt-4 border-t border-red-100">
                      <div className="flex items-center justify-between mb-3">
                        <div className="flex items-center space-x-1.5 text-orange-800">
                          <Sparkles className="w-4 h-4 text-orange-500" />
                          <h4 className="text-xs font-black uppercase tracking-wider">Gemini First-Responder Companion (Live First Aid)</h4>
                        </div>
                        <div className="flex space-x-1">
                          <button
                            onClick={() => setAiLanguage("hindi")}
                            className={`px-2 py-1 text-[10px] font-extrabold rounded-lg transition-all ${
                              aiLanguage === "hindi" ? "bg-orange-600 text-white" : "bg-white text-slate-600 border border-slate-200 hover:bg-slate-50"
                            }`}
                          >
                            हिन्दी
                          </button>
                          <button
                            onClick={() => setAiLanguage("english")}
                            className={`px-2 py-1 text-[10px] font-extrabold rounded-lg transition-all ${
                              aiLanguage === "english" ? "bg-orange-600 text-white" : "bg-white text-slate-600 border border-slate-200 hover:bg-slate-50"
                            }`}
                          >
                            EN
                          </button>
                        </div>
                      </div>

                      {isLoadingAi ? (
                        <div className="flex items-center space-x-2 py-2">
                          <Loader className="w-3.5 h-3.5 text-orange-600 animate-spin" />
                          <span className="text-xs font-bold text-orange-700 animate-pulse">Generating localized first-aid advice...</span>
                        </div>
                      ) : aiAdvice ? (
                        <div className="bg-orange-50/50 border border-orange-100 rounded-xl p-4 text-slate-800 leading-relaxed text-xs">
                          <p className="whitespace-pre-line font-medium">{aiAdvice}</p>
                          <div className="mt-3 pt-2 border-t border-orange-100/50 text-[10px] font-bold text-orange-600/70 flex items-center">
                            <Volume2 className="w-3.5 h-3.5 mr-1" />
                            Use these clear, safe guidelines while you wait for the vehicle to arrive.
                          </div>
                        </div>
                      ) : (
                        <p className="text-xs text-slate-500 font-medium">Select a medical emergency type to load AI response assistance.</p>
                      )}
                    </div>

                    {/* Family Live Tracking & Trip Sharing Section */}
                    <div className="mt-5 pt-5 border-t border-red-100 space-y-4 text-left">
                      <div className="flex items-center space-x-2 text-slate-800">
                        <Share2 className="w-4 h-4 text-orange-500 animate-pulse" />
                        <h4 className="text-xs font-black uppercase tracking-wider">Share Active Emergency Trip Link with Family</h4>
                      </div>
                      <p className="text-xs text-slate-500 leading-relaxed font-semibold">
                        Share this live-tracking link with your family members so they can watch the volunteer driver's GPS location on a public map in real-time without needing a login.
                      </p>

                      <div className="bg-slate-50 border border-slate-100 rounded-xl p-4 space-y-3">
                        <div className="flex items-center gap-2">
                          <input
                            type="text"
                            readOnly
                            value={window.location.origin + "/track/" + activeRide.id}
                            className="flex-1 bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs font-mono text-slate-600 select-all focus:outline-none"
                          />
                          <button
                            onClick={() => {
                              navigator.clipboard.writeText(window.location.origin + "/track/" + activeRide.id);
                              setShareCopied(true);
                              setTimeout(() => setShareCopied(false), 3000);
                            }}
                            className="flex items-center justify-center p-2.5 bg-orange-600 hover:bg-orange-700 text-white rounded-xl transition cursor-pointer"
                            title="Copy Tracking Link"
                          >
                            <Copy className="w-4 h-4" />
                          </button>
                        </div>
                        {shareCopied && (
                          <p className="text-xs text-emerald-600 font-bold flex items-center gap-1">
                            <span>✓</span> Tracking link copied successfully! Share on any platform.
                          </p>
                        )}

                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 pt-1">
                          <button
                            onClick={() => {
                              const trackingUrl = window.location.origin + "/track/" + activeRide.id;
                              const shareText = `🏥 GramGo Live Ambulance Tracking!\nPassenger: ${activeRide.patientName}\nVillage: ${activeRide.village}\nDestination: ${activeRide.destinationChc}\nTrack live here:\n${trackingUrl}`;
                              window.open(`https://api.whatsapp.com/send?text=${encodeURIComponent(shareText)}`, "_blank");
                            }}
                            className="flex items-center justify-center gap-2 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-extrabold rounded-xl uppercase tracking-wider transition cursor-pointer shadow-sm"
                          >
                            <MessageSquare className="w-3.5 h-3.5" />
                            <span>WhatsApp</span>
                          </button>

                          <button
                            onClick={() => {
                              const trackingUrl = window.location.origin + "/track/" + activeRide.id;
                              const shareText = `🏥 GramGo Live Ambulance Tracking!\nPassenger: ${activeRide.patientName}\nVillage: ${activeRide.village}\nDestination: ${activeRide.destinationChc}\nTrack live here:\n${trackingUrl}`;
                              window.open(`sms:?&body=${encodeURIComponent(shareText)}`, "_blank");
                            }}
                            className="flex items-center justify-center gap-2 py-2.5 bg-slate-800 hover:bg-slate-700 text-white text-xs font-extrabold rounded-xl uppercase tracking-wider transition cursor-pointer"
                          >
                            <MessageSquare className="w-3.5 h-3.5 text-orange-400" />
                            <span>SMS</span>
                          </button>

                          <button
                            onClick={() => {
                              const trackingUrl = window.location.origin + "/track/" + activeRide.id;
                              const shareText = `🏥 GramGo Live Ambulance Tracking!\nPassenger: ${activeRide.patientName}\nVillage: ${activeRide.village}\nDestination: ${activeRide.destinationChc}\nTrack live here:\n${trackingUrl}`;
                              window.open(`mailto:?subject=${encodeURIComponent(`GramGo Live Tracking (Patient: ${activeRide.patientName})`)}&body=${encodeURIComponent(shareText)}`, "_blank");
                            }}
                            className="flex items-center justify-center gap-2 py-2.5 bg-slate-800 hover:bg-slate-700 text-white text-xs font-extrabold rounded-xl uppercase tracking-wider transition cursor-pointer"
                          >
                            <Mail className="w-3.5 h-3.5 text-orange-400" />
                            <span>Email</span>
                          </button>
                        </div>
                      </div>
                    </div>

                    {/* Cancellation Action Button */}
                    <div className="mt-5 pt-4 border-t border-red-100 flex justify-end">
                      <button
                        onClick={() => setShowCancelModal(true)}
                        className="flex items-center space-x-2 px-4 py-2.5 bg-red-100 hover:bg-red-200 text-red-700 rounded-xl text-xs font-black transition-all cursor-pointer uppercase tracking-wider shadow-sm"
                      >
                        <XCircle className="w-4 h-4" />
                        <span>Cancel Emergency Dispatch</span>
                      </button>
                    </div>

                  </div>
                ) : (
                  <div className="bg-slate-50 border border-slate-100 rounded-2xl p-6 flex flex-col md:flex-row items-center justify-between gap-6">
                    <div className="space-y-1 text-center md:text-left">
                      <h3 className="text-base font-black text-slate-800">No active transport requests at this moment</h3>
                      <p className="text-xs text-slate-500 font-semibold">Need safe, emergency volunteer transport to the nearest CHC right now?</p>
                    </div>
                    <button
                      onClick={() => setActiveTab("book")}
                      className="flex items-center space-x-1.5 px-5 py-3 bg-orange-600 hover:bg-orange-700 text-white text-xs font-extrabold rounded-xl transition-all shadow-md shadow-orange-100 cursor-pointer"
                    >
                      <PlusCircle className="w-4 h-4" />
                      <span>BOOK TRANSPORT RIDE NOW</span>
                    </button>
                  </div>
                )}

                {/* Dashboard Stats Panel */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
                  <div className="bg-white border border-slate-100 rounded-xl p-5 shadow-sm space-y-1">
                    <span className="text-[10px] text-slate-400 block font-bold uppercase tracking-wider">Completed Travels</span>
                    <span className="text-2xl font-black text-slate-800 block">{completedTripsCount}</span>
                    <span className="text-[10px] text-emerald-600 font-bold block">Safe village transits</span>
                  </div>
                  
                  <div className="bg-white border border-slate-100 rounded-xl p-5 shadow-sm space-y-1">
                    <span className="text-[10px] text-slate-400 block font-bold uppercase tracking-wider">Critical Dispatches</span>
                    <span className="text-2xl font-black text-red-600 block">{criticalTripsCount}</span>
                    <span className="text-[10px] text-slate-500 font-semibold block">Priority medical alerts</span>
                  </div>

                  <div className="bg-white border border-slate-100 rounded-xl p-5 shadow-sm space-y-1">
                    <span className="text-[10px] text-slate-400 block font-bold uppercase tracking-wider">Active Alerts</span>
                    <span className="text-2xl font-black text-orange-600 block">{unreadNotifsCount}</span>
                    <span className="text-[10px] text-orange-600 font-bold block">Unread notifications</span>
                  </div>
                </div>

                {/* Grid for Quick Actions & Contacts */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8 pt-4">
                  
                  {/* Emergency Family Contacts Panel */}
                  <div className="bg-white border border-slate-100 rounded-2xl p-5 shadow-sm space-y-4">
                    <div className="flex items-center justify-between border-b border-slate-50 pb-3">
                      <div className="flex items-center space-x-1.5">
                        <Shield className="w-4 h-4 text-orange-600" />
                        <h3 className="text-sm font-black text-slate-800">My Emergency Family Contacts</h3>
                      </div>
                      <button 
                        onClick={() => setActiveTab("settings")}
                        className="text-xs font-bold text-orange-600 hover:underline"
                      >
                        Manage
                      </button>
                    </div>

                    {userSettings.emergencyContacts.length > 0 ? (
                      <div className="space-y-2.5">
                        {userSettings.emergencyContacts.map((contact, idx) => (
                          <div key={idx} className="flex items-center justify-between p-3 bg-slate-50 rounded-xl border border-slate-100">
                            <div>
                              <span className="text-xs font-bold text-slate-800 block">{contact.name}</span>
                              <span className="text-[10px] text-slate-500 font-bold uppercase">{contact.relation}</span>
                            </div>
                            <a 
                              href={`tel:${contact.phone}`}
                              className="flex items-center space-x-1 px-2.5 py-1.5 bg-orange-50 text-orange-600 hover:bg-orange-100 rounded-lg text-xs font-black transition-all"
                            >
                              <Phone className="w-3.5 h-3.5" />
                              <span>CALL</span>
                            </a>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="p-4 border border-dashed border-slate-200 rounded-xl text-center">
                        <p className="text-xs text-slate-500 font-semibold mb-2">No emergency contacts saved yet</p>
                        <button
                          onClick={() => setActiveTab("settings")}
                          className="text-xs font-bold bg-slate-100 hover:bg-slate-200 text-slate-700 px-3 py-1.5 rounded-lg transition-all"
                        >
                          Add Contact
                        </button>
                      </div>
                    )}
                  </div>

                  {/* Quick Medical Helplines */}
                  <div className="bg-white border border-slate-100 rounded-2xl p-5 shadow-sm space-y-4">
                    <div className="flex items-center space-x-1.5 border-b border-slate-50 pb-3">
                      <Activity className="w-4 h-4 text-red-600" />
                      <h3 className="text-sm font-black text-slate-800">Regional Helplines & Care</h3>
                    </div>
                    
                    <div className="space-y-2.5">
                      <div className="flex items-center justify-between p-2.5 bg-slate-50/50 rounded-xl">
                        <div>
                          <span className="text-xs font-bold text-slate-800 block">Block Medical Officer</span>
                          <span className="text-[10px] text-slate-500 font-semibold">Mohammadabad, Ghazipur</span>
                        </div>
                        <a href="tel:+919454412345" className="text-xs font-black text-orange-600 hover:underline">
                          +91 94544 12345
                        </a>
                      </div>

                      <div className="flex items-center justify-between p-2.5 bg-slate-50/50 rounded-xl">
                        <div>
                          <span className="text-xs font-bold text-slate-800 block">District Hospital Helpdesk</span>
                          <span className="text-[10px] text-slate-500 font-semibold">Ghazipur Main Desk</span>
                        </div>
                        <a href="tel:05482220456" className="text-xs font-black text-orange-600 hover:underline">
                          0548-2220456
                        </a>
                      </div>

                      <div className="flex items-center justify-between p-2.5 bg-slate-50/50 rounded-xl">
                        <div>
                          <span className="text-xs font-bold text-slate-800 block">Emergency Control Room</span>
                          <span className="text-[10px] text-slate-500 font-semibold">District Control Desk</span>
                        </div>
                        <a href="tel:1077" className="text-xs font-black text-orange-600 hover:underline">
                          1077
                        </a>
                      </div>
                    </div>
                  </div>

                </div>

              </div>
            )}

            {/* 2. BOOK RIDE TAB */}
            {activeTab === "book" && (
              <div className="space-y-6">
                <div className="border-b border-orange-50 pb-4">
                  <h2 className="text-lg font-black text-slate-800">Request Emergency Transport</h2>
                  <p className="text-xs text-slate-500 font-semibold mt-0.5">We will notify nearby volunteer drivers immediately. Pre-filled based on your account credentials.</p>
                </div>

                <form onSubmit={handleBookRide} className="space-y-6">
                  
                  {/* General Patient Info Section */}
                  <div className="bg-slate-50 p-5 rounded-2xl border border-slate-100 grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                      <label className="text-xs font-bold text-slate-700 block">Patient Name *</label>
                      <input
                        type="text"
                        required
                        value={patientName}
                        onChange={(e) => setPatientName(e.target.value)}
                        className="w-full bg-white border border-slate-200 text-slate-800 text-sm font-bold p-3 rounded-xl focus:border-orange-500 outline-none"
                        placeholder="Enter full name of patient"
                      />
                    </div>

                    <div className="space-y-1.5">
                      <label className="text-xs font-bold text-slate-700 block">Patient Contact Phone *</label>
                      <input
                        type="tel"
                        required
                        value={patientPhone}
                        onChange={(e) => setPatientPhone(e.target.value)}
                        className="w-full bg-white border border-slate-200 text-slate-800 text-sm font-bold p-3 rounded-xl focus:border-orange-500 outline-none"
                        placeholder="Mobile number for match updates"
                      />
                    </div>
                  </div>

                  {/* Dispatch Details Section */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    
                    <div className="space-y-1.5">
                      <label className="text-xs font-bold text-slate-700 block">Type of Medical Emergency *</label>
                      <select
                        value={emergencyType}
                        onChange={(e) => setEmergencyType(e.target.value as any)}
                        className="w-full bg-white border border-slate-200 text-slate-800 text-sm font-bold p-3 rounded-xl focus:border-orange-500 outline-none cursor-pointer"
                      >
                        <option value="Maternity">🤰 Maternity/Pregnancy Labor</option>
                        <option value="Accident/Trauma">🚨 Road Accident / Severe Trauma</option>
                        <option value="Severe Illness">🤒 High Fever / Severe Illness</option>
                        <option value="Cardiac">🫀 Chest Pain / Cardiac Issue</option>
                        <option value="Other">🩹 Other Urgent Medical Reason</option>
                      </select>
                    </div>

                    <div className="space-y-1.5">
                      <label className="text-xs font-bold text-slate-700 block">Dispatch Priority Level *</label>
                      <select
                        value={priority}
                        onChange={(e) => setPriority(e.target.value as any)}
                        className="w-full bg-white border border-slate-200 text-slate-800 text-sm font-bold p-3 rounded-xl focus:border-orange-500 outline-none cursor-pointer"
                      >
                        <option value="critical">🔴 Critical (Immediate Danger / Unconscious)</option>
                        <option value="urgent">🟡 Urgent (Severe pain, high risk but stable)</option>
                        <option value="non-urgent">🟢 Non-urgent (Needs clinic checkup/routine)</option>
                      </select>
                    </div>

                    <div className="space-y-1.5">
                      <label className="text-xs font-bold text-slate-700 block">Pickup Village *</label>
                      <input
                        type="text"
                        required
                        value={village}
                        onChange={(e) => setVillage(e.target.value)}
                        className="w-full bg-white border border-slate-200 text-slate-800 text-sm font-bold p-3 rounded-xl focus:border-orange-500 outline-none"
                        placeholder="Your pickup village name"
                      />
                    </div>

                    <div className="space-y-1.5">
                      <label className="text-xs font-bold text-slate-700 block">Village Landmark / House Number</label>
                      <input
                        type="text"
                        value={landmark}
                        onChange={(e) => setLandmark(e.target.value)}
                        className="w-full bg-white border border-slate-200 text-slate-800 text-sm font-bold p-3 rounded-xl focus:border-orange-500 outline-none"
                        placeholder="e.g. Near Panchayat Bhawan, School Square"
                      />
                    </div>

                    <div className="space-y-1.5 md:col-span-2">
                      <label className="text-xs font-bold text-slate-700 block">Destination Community Health Centre *</label>
                      <select
                        value={destinationChc}
                        onChange={(e) => setDestinationChc(e.target.value)}
                        className="w-full bg-white border border-slate-200 text-slate-800 text-sm font-bold p-3 rounded-xl focus:border-orange-500 outline-none cursor-pointer"
                      >
                        {chcList.map(chc => (
                          <option key={chc.id} value={chc.name}>
                            {chc.name} ({chc.distanceKm} km away • {chc.bedsAvailable} Beds Available)
                          </option>
                        ))}
                      </select>
                    </div>

                  </div>

                  {/* Submission and Action Block */}
                  <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pt-4 border-t border-slate-100">
                    <p className="text-[11px] text-slate-500 leading-normal font-semibold max-w-md">
                      By submitting, our systems will query available volunteer tractors, bolero SUVs, auto-rickshaws, and e-rickshaws. You can track matching progress live.
                    </p>
                    <button
                      type="submit"
                      disabled={isSubmittingRide}
                      className="w-full sm:w-auto flex items-center justify-center space-x-1.5 px-6 py-3.5 bg-orange-600 hover:bg-orange-700 text-white rounded-xl text-sm font-extrabold transition-all shadow-md shadow-orange-100 disabled:opacity-50 cursor-pointer"
                    >
                      {isSubmittingRide ? (
                        <>
                          <Loader className="w-4 h-4 animate-spin" />
                          <span>DISPATCHING REQUEST...</span>
                        </>
                      ) : (
                        <>
                          <Car className="w-4 h-4" />
                          <span>CONFIRM & BOOK EMERGENCY DISPATCH</span>
                        </>
                      )}
                    </button>
                  </div>

                </form>
              </div>
            )}

            {/* Ride Booking Module */}
            {activeTab === "book_ride" && (
              <RideBooking />
            )}

            {/* Nearby Drivers Search Module */}
            {activeTab === "nearby_drivers" && (
              <NearbyDrivers />
            )}

            {/* 3. RIDE HISTORY TAB */}
            {activeTab === "history" && (
              <div className="space-y-6">
                <div className="border-b border-orange-50 pb-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                  <div>
                    <h2 className="text-lg font-black text-slate-800">Your Ride History</h2>
                    <p className="text-xs text-slate-500 font-semibold mt-0.5">Complete record of emergency dispatches requested from this account.</p>
                  </div>
                </div>

                {/* Search & Filters Panel */}
                <div className="bg-slate-50 border border-slate-100 p-4 rounded-2xl space-y-3">
                  <div className="flex flex-col sm:flex-row gap-3">
                    <div className="flex-1 relative">
                      <input
                        type="text"
                        placeholder="Search by Patient, CHC, Village, Driver..."
                        value={historySearch}
                        onChange={(e) => setHistorySearch(e.target.value)}
                        className="w-full pl-9 pr-4 py-2 bg-white border border-slate-200 rounded-xl text-xs font-semibold outline-none focus:ring-2 focus:ring-orange-500/50"
                      />
                      <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <div>
                      <label className="text-[10px] font-bold text-slate-500 uppercase block mb-1">Emergency Type</label>
                      <select
                        value={historyTypeFilter}
                        onChange={(e) => setHistoryTypeFilter(e.target.value)}
                        className="w-full p-2 bg-white border border-slate-200 rounded-xl text-xs font-semibold outline-none cursor-pointer"
                      >
                        <option value="all">All Types</option>
                        <option value="Maternity">Maternity</option>
                        <option value="Accident/Trauma">Accident / Trauma</option>
                        <option value="Severe Illness">Severe Illness</option>
                        <option value="Cardiac">Cardiac</option>
                        <option value="Other">Other</option>
                      </select>
                    </div>

                    <div>
                      <label className="text-[10px] font-bold text-slate-500 uppercase block mb-1">Priority Level</label>
                      <select
                        value={historyPriorityFilter}
                        onChange={(e) => setHistoryPriorityFilter(e.target.value)}
                        className="w-full p-2 bg-white border border-slate-200 rounded-xl text-xs font-semibold outline-none cursor-pointer"
                      >
                        <option value="all">All Priorities</option>
                        <option value="critical">Critical</option>
                        <option value="urgent">Urgent</option>
                        <option value="normal">Normal</option>
                      </select>
                    </div>

                    <div>
                      <label className="text-[10px] font-bold text-slate-500 uppercase block mb-1">Status</label>
                      <select
                        value={historyStatusFilter}
                        onChange={(e) => setHistoryStatusFilter(e.target.value)}
                        className="w-full p-2 bg-white border border-slate-200 rounded-xl text-xs font-semibold outline-none cursor-pointer"
                      >
                        <option value="all">All Statuses</option>
                        <option value="searching">Searching</option>
                        <option value="accepted">Accepted</option>
                        <option value="arrived">Arrived</option>
                        <option value="en_route">En Route</option>
                        <option value="completed">Completed</option>
                        <option value="cancelled">Cancelled</option>
                      </select>
                    </div>
                  </div>
                </div>

                {loadingHistory ? (
                  <div className="flex flex-col items-center justify-center py-12">
                    <Loader className="w-8 h-8 text-orange-600 animate-spin mb-2" />
                    <span className="text-xs font-bold text-slate-500">Fetching past transit records...</span>
                  </div>
                ) : filteredHistory.length > 0 ? (
                  <div className="space-y-4">
                    {filteredHistory.map((ride) => {
                      const rideDate = new Date(ride.createdAt).toLocaleString();
                      const isCompleted = ride.status === "completed" || ride.status === "Completed";
                      return (
                        <div key={ride.id} className="bg-white border border-slate-100 rounded-2xl p-5 shadow-sm space-y-4">
                          <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b border-slate-50 pb-3 gap-2">
                            <div>
                              <span className="text-xs font-black text-slate-900 block">{ride.destinationChc}</span>
                              <span className="text-[10px] text-slate-500 font-bold">{rideDate}</span>
                            </div>
                            
                            <div className="flex items-center space-x-2">
                              <span className={`px-2.5 py-0.5 rounded-lg text-[10px] font-black uppercase tracking-wider ${
                                ride.priority === "critical" ? "bg-red-100 text-red-800" :
                                ride.priority === "urgent" ? "bg-amber-100 text-amber-800" : "bg-emerald-100 text-emerald-800"
                              }`}>
                                {ride.priority} priority
                              </span>

                              <span className={`px-2.5 py-0.5 rounded-lg text-[10px] font-black uppercase tracking-wider ${
                                isCompleted ? "bg-emerald-100 text-emerald-800" : "bg-amber-100 text-amber-800 animate-pulse"
                              }`}>
                                {ride.status.replace("_", " ")}
                              </span>
                            </div>
                          </div>

                          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs font-semibold text-slate-600">
                            <div>
                              <span className="text-[10px] text-slate-400 block font-bold uppercase">Patient details</span>
                              <span className="text-slate-800 font-bold block">{ride.patientName}</span>
                              <span className="text-[11px] font-medium block">Phone: {ride.patientPhone}</span>
                            </div>

                            <div>
                              <span className="text-[10px] text-slate-400 block font-bold uppercase">Pickup location</span>
                              <span className="text-slate-800 font-bold block">{ride.village}</span>
                              <span className="text-[11px] font-medium block">Landmark: {ride.landmark || "Main Square"}</span>
                            </div>

                            <div>
                              <span className="text-[10px] text-slate-400 block font-bold uppercase">Assigned driver</span>
                              {ride.driverId ? (
                                <>
                                  <span className="text-slate-800 font-bold block">{ride.driverName}</span>
                                  <span className="text-[11px] font-medium block capitalize">{ride.vehicleType} ({ride.driverPhone})</span>
                                </>
                              ) : (
                                <span className="text-slate-400 font-medium block">Unassigned / Searching</span>
                              )}
                            </div>
                          </div>

                          {isCompleted && (
                            <div className="pt-3 border-t border-slate-50 flex justify-end">
                              <button
                                onClick={() => {
                                  setSelectedSummaryRide(ride);
                                  setIsSummaryOpen(true);
                                }}
                                className="px-4 py-2 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 text-emerald-700 hover:text-emerald-800 text-[11px] font-black rounded-xl cursor-pointer transition uppercase tracking-wider flex items-center space-x-1"
                              >
                                <span>View Transit Receipt & Summary 🧾</span>
                              </button>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <div className="p-8 border border-dashed border-slate-200 rounded-2xl text-center">
                    <p className="text-sm font-bold text-slate-500 mb-1">No ride transits found</p>
                    <p className="text-xs text-slate-400 font-semibold mb-4">You have not booked any emergency transits from this account yet.</p>
                    <button
                      onClick={() => setActiveTab("book")}
                      className="px-4 py-2 bg-orange-600 text-white rounded-lg text-xs font-bold hover:bg-orange-700"
                    >
                      Book Your First Ride
                    </button>
                  </div>
                )}
              </div>
            )}

            {/* CANCELLATIONS HISTORY TAB */}
            {activeTab === "cancellations" && (
              <div className="space-y-6">
                <div className="border-b border-orange-50 pb-4">
                  <h2 className="text-lg font-black text-slate-800">Cancellations History</h2>
                  <p className="text-xs text-slate-500 font-semibold mt-0.5">Audit log of all emergency transits cancelled with specific driver/passenger reasons.</p>
                </div>

                {cancellationLogs.length > 0 ? (
                  <div className="space-y-4">
                    {cancellationLogs.map((log) => {
                      const logDate = new Date(log.createdAt).toLocaleString();
                      return (
                        <div key={log.id} className="bg-white border border-red-100 rounded-2xl p-5 shadow-sm space-y-4">
                          <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b border-slate-50 pb-3 gap-2">
                            <div>
                              <span className="text-xs font-black text-slate-900 block">Patient: {log.patientName}</span>
                              <span className="text-[10px] text-slate-500 font-bold">{logDate}</span>
                            </div>
                            
                            <div className="flex items-center space-x-2">
                              <span className={`px-2.5 py-0.5 rounded-lg text-[10px] font-black uppercase tracking-wider ${
                                log.cancelledBy === "passenger" ? "bg-red-100 text-red-800" :
                                log.cancelledBy === "driver" ? "bg-amber-100 text-amber-800" : "bg-blue-100 text-blue-800"
                              }`}>
                                Cancelled By {log.cancelledBy}
                              </span>
                            </div>
                          </div>

                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs font-semibold text-slate-600">
                            <div>
                              <span className="text-[10px] text-slate-400 block font-bold uppercase">Emergency Type</span>
                              <span className="text-slate-800 font-bold block">{log.emergencyType}</span>
                            </div>

                            <div>
                              <span className="text-[10px] text-slate-400 block font-bold uppercase">Cancellation Reason</span>
                              <span className="text-red-700 font-extrabold block">"{log.reason}"</span>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <div className="p-8 border border-dashed border-slate-200 rounded-2xl text-center">
                    <p className="text-sm font-bold text-slate-500 mb-1">No cancelled dispatches</p>
                    <p className="text-xs text-slate-400 font-semibold">Great! There are no cancelled emergency dispatches on record for your account.</p>
                  </div>
                )}
              </div>
            )}

            {/* 4. NOTIFICATIONS TAB */}
            {activeTab === "notifications" && (
              <div className="space-y-6">
                <div className="flex items-center justify-between border-b border-orange-50 pb-4">
                  <div>
                    <h2 className="text-lg font-black text-slate-800">Emergency Alerts & Inbox</h2>
                    <p className="text-xs text-slate-500 font-semibold mt-0.5">Notifications about your transit requests, matched drivers, and local safety announcements.</p>
                  </div>
                  {notificationsList.some(n => !n.read) && (
                    <button
                      onClick={handleMarkNotifsRead}
                      className="text-xs font-bold text-orange-600 hover:underline"
                    >
                      Mark all as read
                    </button>
                  )}
                </div>

                {loadingNotifs ? (
                  <div className="flex flex-col items-center justify-center py-12">
                    <Loader className="w-8 h-8 text-orange-600 animate-spin mb-2" />
                    <span className="text-xs font-bold text-slate-500">Retrieving alert logs...</span>
                  </div>
                ) : notificationsList.length > 0 ? (
                  <div className="space-y-3">
                    {notificationsList.map((notif) => {
                      const formattedTime = new Date(notif.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
                      const formattedDate = new Date(notif.createdAt).toLocaleDateString([], { month: 'short', day: 'numeric' });
                      
                      return (
                        <div 
                          key={notif.id} 
                          className={`p-4 rounded-xl border transition-all ${
                            notif.read ? "bg-white border-slate-100" : "bg-orange-50/20 border-orange-100 shadow-sm"
                          } flex gap-3`}
                        >
                          <div className="mt-0.5">
                            {notif.type === "success" && <span className="flex w-2 h-2 bg-emerald-500 rounded-full" />}
                            {notif.type === "warning" && <span className="flex w-2 h-2 bg-amber-500 rounded-full" />}
                            {notif.type === "info" && <span className="flex w-2 h-2 bg-blue-500 rounded-full" />}
                            {notif.type === "error" && <span className="flex w-2 h-2 bg-red-500 rounded-full animate-ping" />}
                          </div>
                          
                          <div className="flex-grow">
                            <div className="flex items-center justify-between gap-2">
                              <h4 className={`text-xs font-black ${notif.read ? "text-slate-800" : "text-orange-950"}`}>{notif.title}</h4>
                              <span className="text-[10px] text-slate-400 font-bold whitespace-nowrap">{formattedDate}, {formattedTime}</span>
                            </div>
                            <p className="text-xs text-slate-600 font-semibold mt-1 leading-relaxed">{notif.message}</p>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <div className="p-8 border border-dashed border-slate-200 rounded-2xl text-center">
                    <p className="text-sm font-bold text-slate-500">Inbox empty</p>
                    <p className="text-xs text-slate-400 font-semibold mt-1">You do not have any alerts at this time.</p>
                  </div>
                )}
              </div>
            )}

            {/* 5. PROFILE TAB */}
            {activeTab === "profile" && (
              <div className="space-y-6">
                <div className="border-b border-orange-50 pb-4">
                  <h2 className="text-lg font-black text-slate-800">My Lifeline Profile</h2>
                  <p className="text-xs text-slate-500 font-semibold mt-0.5">Manage your personal village details and credentials to make booking faster.</p>
                </div>

                {profileSuccessMsg && (
                  <div className="bg-emerald-50 border border-emerald-200 text-emerald-800 p-4 rounded-xl text-xs font-bold flex items-center space-x-2">
                    <CheckCircle className="w-4 h-4 text-emerald-600" />
                    <span>{profileSuccessMsg}</span>
                  </div>
                )}

                <form onSubmit={handleSaveProfile} className="space-y-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-1.5">
                      <label className="text-xs font-bold text-slate-700 block">Full Name</label>
                      <input
                        type="text"
                        required
                        value={profileName}
                        onChange={(e) => setProfileName(e.target.value)}
                        className="w-full bg-white border border-slate-200 text-slate-800 text-sm font-bold p-3 rounded-xl focus:border-orange-500 outline-none"
                      />
                    </div>

                    <div className="space-y-1.5">
                      <label className="text-xs font-bold text-slate-700 block">Mobile Phone Number</label>
                      <input
                        type="tel"
                        required
                        value={profilePhone}
                        onChange={(e) => setProfilePhone(e.target.value)}
                        className="w-full bg-white border border-slate-200 text-slate-800 text-sm font-bold p-3 rounded-xl focus:border-orange-500 outline-none"
                      />
                    </div>

                    <div className="space-y-1.5">
                      <label className="text-xs font-bold text-slate-700 block">Email Address (Optional)</label>
                      <input
                        type="email"
                        value={profileEmail}
                        onChange={(e) => setProfileEmail(e.target.value)}
                        className="w-full bg-white border border-slate-200 text-slate-800 text-sm font-bold p-3 rounded-xl focus:border-orange-500 outline-none"
                      />
                    </div>

                    <div className="space-y-1.5">
                      <label className="text-xs font-bold text-slate-700 block">Home Village</label>
                      <input
                        type="text"
                        required
                        value={profileVillage}
                        onChange={(e) => setProfileVillage(e.target.value)}
                        className="w-full bg-white border border-slate-200 text-slate-800 text-sm font-bold p-3 rounded-xl focus:border-orange-500 outline-none"
                      />
                    </div>

                    <div className="space-y-1.5">
                      <label className="text-xs font-bold text-slate-700 block">District</label>
                      <input
                        type="text"
                        required
                        value={profileDistrict}
                        onChange={(e) => setProfileDistrict(e.target.value)}
                        className="w-full bg-white border border-slate-200 text-slate-800 text-sm font-bold p-3 rounded-xl focus:border-orange-500 outline-none"
                      />
                    </div>

                    <div className="space-y-1.5">
                      <label className="text-xs font-bold text-slate-700 block">Account Role</label>
                      <input
                        type="text"
                        disabled
                        value={user?.role || "Passenger"}
                        className="w-full bg-slate-100 border border-slate-200 text-slate-500 text-sm font-bold p-3 rounded-xl outline-none capitalize cursor-not-allowed"
                      />
                    </div>
                  </div>

                  <div className="flex justify-end pt-4 border-t border-slate-100">
                    <button
                      type="submit"
                      disabled={isSavingProfile}
                      className="flex items-center space-x-1.5 px-5 py-3 bg-orange-600 hover:bg-orange-700 text-white text-xs font-extrabold rounded-xl transition-all shadow-md shadow-orange-100 cursor-pointer disabled:opacity-50"
                    >
                      {isSavingProfile ? (
                        <>
                          <Loader className="w-3.5 h-3.5 animate-spin" />
                          <span>SAVING...</span>
                        </>
                      ) : (
                        <>
                          <CheckCircle className="w-3.5 h-3.5" />
                          <span>SAVE CHANGES</span>
                        </>
                      )}
                    </button>
                  </div>
                </form>
              </div>
            )}

            {/* WALLET TAB */}
            {activeTab === "wallet" && (
              <div className="space-y-6">
                <div className="border-b border-orange-50 pb-4">
                  <h2 className="text-lg font-black text-slate-800">My Subsidy Wallet</h2>
                  <p className="text-xs text-slate-500 font-semibold mt-0.5">Manage your personal village transport grants and medical subsidy balance.</p>
                </div>
                <WalletDashboard userId={user?.id || ""} token={token} role="passenger" />
              </div>
            )}

            {/* REFERRAL TAB */}
            {activeTab === "referral" && (
              <div className="space-y-6">
                <div className="border-b border-orange-50 pb-4">
                  <h2 className="text-lg font-black text-slate-800">Referral Program</h2>
                  <p className="text-xs text-slate-500 font-semibold mt-0.5">Share the gift of safe transit and earn community subsidy rewards.</p>
                </div>
                <ReferralDashboard token={token} onRewardClaimed={refreshUser} />
              </div>
            )}

            {/* RATINGS & REVIEWS TAB */}
            {activeTab === "ratings" && (
              <RatingSystem role="passenger" token={token} user={user} />
            )}

            {/* 6. SETTINGS TAB */}
            {activeTab === "settings" && (
              <div className="space-y-8">
                <div className="border-b border-orange-50 pb-4">
                  <h2 className="text-lg font-black text-slate-800">App Preferences & Emergency Settings</h2>
                  <p className="text-xs text-slate-500 font-semibold mt-0.5">Toggle alert preferences and maintain custom family contacts.</p>
                </div>

                {settingsSuccessMsg && (
                  <div className="bg-emerald-50 border border-emerald-200 text-emerald-800 p-4 rounded-xl text-xs font-bold flex items-center space-x-2">
                    <CheckCircle className="w-4 h-4 text-emerald-600" />
                    <span>{settingsSuccessMsg}</span>
                  </div>
                )}

                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                  
                  {/* Preferences Toggles Form */}
                  <form onSubmit={handleSaveSettings} className="space-y-6">
                    <h3 className="text-sm font-black text-slate-800 border-b border-slate-50 pb-2">Alert Preferences</h3>
                    
                    <div className="space-y-4">
                      
                      <div className="flex items-center justify-between">
                        <div>
                          <span className="text-xs font-bold text-slate-800 block">Auto-trigger Gemini First Aid</span>
                          <span className="text-[11px] text-slate-500 font-semibold">Load safe guidelines on active bookings</span>
                        </div>
                        <input
                          type="checkbox"
                          checked={userSettings.autoAdviceEnabled}
                          onChange={(e) => setUserSettings({ ...userSettings, autoAdviceEnabled: e.target.checked })}
                          className="w-4 h-4 text-orange-600 rounded focus:ring-orange-500 border-slate-300 cursor-pointer"
                        />
                      </div>

                      <div className="flex items-center justify-between">
                        <div>
                          <span className="text-xs font-bold text-slate-800 block">SMS Alerts</span>
                          <span className="text-[11px] text-slate-500 font-semibold">Get driver dispatch details via normal SMS</span>
                        </div>
                        <input
                          type="checkbox"
                          checked={userSettings.smsNotifications}
                          onChange={(e) => setUserSettings({ ...userSettings, smsNotifications: e.target.checked })}
                          className="w-4 h-4 text-orange-600 rounded focus:ring-orange-500 border-slate-300 cursor-pointer"
                        />
                      </div>

                      <div className="flex items-center justify-between">
                        <div>
                          <span className="text-xs font-bold text-slate-800 block">WhatsApp Alerts (Beta)</span>
                          <span className="text-[11px] text-slate-500 font-semibold">Get matches directly on your WhatsApp</span>
                        </div>
                        <input
                          type="checkbox"
                          checked={userSettings.whatsappNotifications}
                          onChange={(e) => setUserSettings({ ...userSettings, whatsappNotifications: e.target.checked })}
                          className="w-4 h-4 text-orange-600 rounded focus:ring-orange-500 border-slate-300 cursor-pointer"
                        />
                      </div>

                      <div className="space-y-1.5 pt-2">
                        <label className="text-xs font-bold text-slate-700 block">Default Guide Language</label>
                        <select
                          value={userSettings.language}
                          onChange={(e) => setUserSettings({ ...userSettings, language: e.target.value as any })}
                          className="w-full bg-white border border-slate-200 text-slate-800 text-xs font-bold p-2.5 rounded-xl outline-none"
                        >
                          <option value="hindi">हिन्दी (Hindi)</option>
                          <option value="english">English</option>
                        </select>
                      </div>

                    </div>

                    <div className="flex justify-end pt-4 border-t border-slate-100">
                      <button
                        type="submit"
                        disabled={isSavingSettings}
                        className="flex items-center space-x-1 px-4 py-2 bg-orange-600 hover:bg-orange-700 text-white text-xs font-extrabold rounded-xl transition-all shadow-md shadow-orange-100 cursor-pointer disabled:opacity-50"
                      >
                        {isSavingSettings ? (
                          <Loader className="w-3.5 h-3.5 animate-spin" />
                        ) : (
                          <span>SAVE SETTINGS</span>
                        )}
                      </button>
                    </div>
                  </form>

                  {/* Custom Contacts Manager */}
                  <div className="space-y-6">
                    <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                      <div className="space-y-0.5">
                        <h3 className="text-sm font-black text-slate-800 flex items-center gap-1.5">
                          <Shield className="w-4 h-4 text-orange-600" />
                          <span>Emergency Contacts Manager</span>
                        </h3>
                        <p className="text-[10px] text-slate-500 font-semibold">At least 1 active contact required. Maximum 5 allowed.</p>
                      </div>
                      <span className={`px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-wider ${
                        contactsList.length >= 5 
                          ? "bg-rose-50 text-rose-600 border border-rose-200"
                          : "bg-orange-50 text-orange-600 border border-orange-200"
                      }`}>
                        Contacts: {contactsList.length}/5
                      </span>
                    </div>

                    {/* Alerts and errors */}
                    {contactsError && (
                      <div className="bg-rose-50 border border-rose-200 text-rose-700 p-3 rounded-xl text-xs font-bold flex items-center space-x-2 animate-pulse">
                        <AlertTriangle className="w-4 h-4 text-rose-500 flex-shrink-0" />
                        <span>{contactsError}</span>
                      </div>
                    )}
                    {contactsSuccess && (
                      <div className="bg-emerald-50 border border-emerald-200 text-emerald-800 p-3 rounded-xl text-xs font-bold flex items-center space-x-2">
                        <CheckCircle className="w-4 h-4 text-emerald-600 flex-shrink-0" />
                        <span>{contactsSuccess}</span>
                      </div>
                    )}

                    {/* Contact Editor Form */}
                    <form onSubmit={handleContactSubmit} className="bg-slate-50 p-4 rounded-xl border border-slate-100 space-y-4">
                      <div className="flex items-center justify-between">
                        <span className="text-[10px] text-slate-500 font-black uppercase tracking-widest block">
                          {editingContactId ? "✏️ Edit Emergency Contact" : "➕ Add Emergency Contact"}
                        </span>
                        {editingContactId && (
                          <button
                            type="button"
                            onClick={cancelEditContact}
                            className="text-[10px] text-slate-400 hover:text-slate-600 font-black uppercase tracking-wider cursor-pointer"
                          >
                            Cancel Edit
                          </button>
                        )}
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <div className="space-y-1">
                          <label className="text-[10px] font-bold text-slate-600 block">Full Name</label>
                          <input
                            type="text"
                            required
                            placeholder="e.g. Ramesh Prasad"
                            value={contactForm.name}
                            onChange={(e) => setContactForm({ ...contactForm, name: e.target.value })}
                            className="w-full bg-white border border-slate-200 text-slate-800 text-xs font-semibold p-2.5 rounded-xl outline-none focus:ring-1 focus:ring-orange-500 focus:border-orange-500 transition-all"
                          />
                        </div>

                        <div className="space-y-1">
                          <label className="text-[10px] font-bold text-slate-600 block">Relationship</label>
                          <select
                            value={contactForm.relationship}
                            onChange={(e) => setContactForm({ ...contactForm, relationship: e.target.value })}
                            className="w-full bg-white border border-slate-200 text-slate-800 text-xs font-semibold p-2.5 rounded-xl outline-none focus:ring-1 focus:ring-orange-500 focus:border-orange-500 transition-all"
                          >
                            <option value="Spouse">Spouse</option>
                            <option value="Parent">Parent</option>
                            <option value="Child">Child</option>
                            <option value="Sibling">Sibling</option>
                            <option value="Friend">Friend</option>
                            <option value="Neighbor">Neighbor</option>
                            <option value="Other">Other / Relative</option>
                          </select>
                        </div>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 items-end">
                        <div className="space-y-1">
                          <label className="text-[10px] font-bold text-slate-600 block">Phone Number</label>
                          <input
                            type="tel"
                            required
                            placeholder="e.g. +91 99999 88888"
                            value={contactForm.phone}
                            onChange={(e) => setContactForm({ ...contactForm, phone: e.target.value })}
                            className="w-full bg-white border border-slate-200 text-slate-800 text-xs font-semibold p-2.5 rounded-xl outline-none focus:ring-1 focus:ring-orange-500 focus:border-orange-500 transition-all"
                          />
                        </div>

                        <div className="flex items-center space-x-2 py-3">
                          <input
                            type="checkbox"
                            id="isPrimaryContact"
                            checked={contactForm.isPrimary}
                            onChange={(e) => setContactForm({ ...contactForm, isPrimary: e.target.checked })}
                            className="w-4 h-4 text-orange-600 rounded focus:ring-orange-500 border-slate-300 cursor-pointer"
                          />
                          <label htmlFor="isPrimaryContact" className="text-xs font-bold text-slate-700 cursor-pointer select-none">
                            Primary Emergency Contact
                          </label>
                        </div>
                      </div>

                      <div className="flex justify-end pt-2 border-t border-slate-100">
                        <button
                          type="submit"
                          disabled={loadingContacts || (!editingContactId && contactsList.length >= 5)}
                          className="px-5 py-2 bg-slate-900 hover:bg-slate-800 disabled:bg-slate-200 disabled:text-slate-400 text-white rounded-xl text-xs font-black uppercase tracking-wider transition duration-150 cursor-pointer shadow-md"
                        >
                          {loadingContacts ? "Saving..." : editingContactId ? "Save Changes" : "Add Contact"}
                        </button>
                      </div>
                    </form>

                    {/* Contacts list */}
                    <div className="space-y-3">
                      <span className="text-[10px] text-slate-400 font-bold uppercase tracking-widest block">Active Responders List</span>
                      
                      {loadingContacts && contactsList.length === 0 ? (
                        <div className="text-center py-6">
                          <Loader className="w-6 h-6 animate-spin text-orange-500 mx-auto" />
                          <span className="text-xs text-slate-400 mt-2 block font-semibold">Synchronizing with cloud tower...</span>
                        </div>
                      ) : contactsList.length === 0 ? (
                        <div className="text-center py-8 border-2 border-dashed border-slate-100 rounded-2xl bg-white">
                          <Shield className="w-8 h-8 text-slate-300 mx-auto animate-bounce" />
                          <span className="text-xs text-slate-500 font-black mt-2 block uppercase tracking-wider">No contacts set up!</span>
                          <span className="text-[10px] text-slate-400 max-w-xs mx-auto block mt-1 px-4">
                            Please register at least one contact so the auto-dialer or alert dispatch logs can reach them.
                          </span>
                        </div>
                      ) : (
                        <div className="grid grid-cols-1 gap-2.5">
                          {contactsList.map((contact) => (
                            <div 
                              key={contact.id} 
                              className={`flex items-center justify-between p-3.5 border rounded-2xl bg-white shadow-sm transition-all duration-150 ${
                                contact.isPrimary 
                                  ? "border-amber-300 ring-1 ring-amber-200" 
                                  : "border-slate-100 hover:border-slate-200"
                              }`}
                            >
                              <div className="space-y-1">
                                <div className="flex items-center gap-2">
                                  <span className="text-xs font-black text-slate-800 block">{contact.name}</span>
                                  <span className="px-2 py-0.5 bg-slate-100 text-slate-600 text-[9px] font-black uppercase tracking-wider rounded-md">
                                    {contact.relationship}
                                  </span>
                                  {contact.isPrimary && (
                                    <span className="px-2 py-0.5 bg-amber-500 text-white text-[9px] font-black uppercase tracking-wider rounded-md flex items-center gap-0.5">
                                      ★ Primary
                                    </span>
                                  )}
                                </div>
                                <span className="text-[10px] text-slate-500 font-semibold block">
                                  📞 {contact.phone}
                                </span>
                              </div>
                              
                              <div className="flex items-center space-x-1">
                                <button
                                  onClick={() => startEditContact(contact)}
                                  className="p-2 text-slate-400 hover:text-orange-600 hover:bg-orange-50 rounded-xl transition cursor-pointer"
                                  title="Edit Contact"
                                >
                                  ✏️
                                </button>
                                <button
                                  onClick={() => handleContactDelete(contact.id)}
                                  disabled={contactsList.length <= 1}
                                  className="p-2 text-slate-400 hover:text-red-600 hover:bg-rose-50 disabled:opacity-30 disabled:hover:bg-transparent rounded-xl transition cursor-pointer"
                                  title={contactsList.length <= 1 ? "Minimum 1 contact required" : "Delete Contact"}
                                >
                                  🗑️
                                </button>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>

                  </div>

                </div>
              </div>
            )}

           </div>

        </div>

      </div>

      {/* Cancellation Modal */}
      {showCancelModal && activeRide && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4">
          <div className="bg-white border border-slate-100 rounded-3xl max-w-md w-full p-6 shadow-2xl relative space-y-4 animate-in fade-in zoom-in duration-200">
            <button
              onClick={() => setShowCancelModal(false)}
              className="absolute right-4 top-4 p-1.5 text-slate-400 hover:text-slate-600 rounded-full hover:bg-slate-100"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="space-y-1">
              <h3 className="text-base font-black text-slate-900">Cancel Emergency Request</h3>
              <p className="text-xs text-slate-500 font-medium">Please provide a cancellation reason to help optimize our rural volunteer matching algorithm.</p>
            </div>

            <form onSubmit={handleCancelRide} className="space-y-4 pt-2">
              <div className="space-y-2">
                <label className="text-xs font-bold text-slate-700 block">Select a Reason</label>
                {cancellationReasons.map((reason, index) => (
                  <label
                    key={index}
                    className={`flex items-start space-x-2.5 p-3 rounded-xl border text-xs font-bold transition-all cursor-pointer ${
                      cancelReasonOption === reason
                        ? "bg-red-50 border-red-200 text-red-700"
                        : "bg-slate-50 border-slate-100 text-slate-700 hover:bg-slate-100/50"
                    }`}
                  >
                    <input
                      type="radio"
                      name="cancel_reason"
                      value={reason}
                      checked={cancelReasonOption === reason}
                      onChange={() => setCancelReasonOption(reason)}
                      className="mt-0.5 text-red-600 focus:ring-red-500 w-3.5 h-3.5 border-slate-300"
                    />
                    <span>{reason}</span>
                  </label>
                ))}
                
                <label
                  className={`flex items-start space-x-2.5 p-3 rounded-xl border text-xs font-bold transition-all cursor-pointer ${
                    cancelReasonOption === "Other"
                      ? "bg-red-50 border-red-200 text-red-700"
                      : "bg-slate-50 border-slate-100 text-slate-700 hover:bg-slate-100/50"
                  }`}
                >
                  <input
                    type="radio"
                    name="cancel_reason"
                    value="Other"
                    checked={cancelReasonOption === "Other"}
                    onChange={() => setCancelReasonOption("Other")}
                    className="mt-0.5 text-red-600 focus:ring-red-500 w-3.5 h-3.5 border-slate-300"
                  />
                  <span>Other / Custom Reason</span>
                </label>
              </div>

              {cancelReasonOption === "Other" && (
                <div className="space-y-1 animate-in slide-in-from-top-2 duration-150">
                  <label className="text-xs font-bold text-slate-700 block">Enter Custom Reason</label>
                  <textarea
                    required
                    rows={3}
                    placeholder="Describe why you are cancelling this emergency dispatch..."
                    value={customCancelReason}
                    onChange={(e) => setCustomCancelReason(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 text-slate-800 text-xs font-medium p-3 rounded-xl outline-none focus:bg-white focus:border-red-300"
                  />
                </div>
              )}

              <div className="flex space-x-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowCancelModal(false)}
                  className="flex-1 px-4 py-3 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-extrabold transition-all uppercase tracking-wider cursor-pointer"
                >
                  Keep Dispatch
                </button>
                <button
                  type="submit"
                  disabled={isCancelling || !cancelReasonOption || (cancelReasonOption === "Other" && !customCancelReason)}
                  className="flex-1 px-4 py-3 bg-red-600 hover:bg-red-700 text-white rounded-xl text-xs font-extrabold transition-all uppercase tracking-wider cursor-pointer disabled:opacity-50 flex items-center justify-center space-x-1"
                >
                  {isCancelling ? (
                    <Loader className="w-4 h-4 animate-spin" />
                  ) : (
                    <span>Confirm Cancel</span>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Ride Summary Modal */}
      <RideSummaryModal
        ride={selectedSummaryRide}
        isOpen={isSummaryOpen}
        onClose={() => {
          setSelectedSummaryRide(null);
          setIsSummaryOpen(false);
        }}
      />

    </div>
  );
}
