import React, { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { 
  LayoutDashboard, 
  Car, 
  History, 
  User, 
  Award, 
  DollarSign, 
  FileText, 
  ShieldAlert, 
  CheckCircle2, 
  XCircle, 
  Loader2, 
  MapPin, 
  Phone, 
  Clock, 
  AlertCircle, 
  Check, 
  UploadCloud, 
  TrendingUp, 
  ChevronRight, 
  Smartphone, 
  Truck, 
  LogOut,
  Info,
  X,
  Search,
  Coins,
  Gift,
  Star,
  MessageSquare
} from "lucide-react";
import { useAuth } from "../context/AuthContext";
import { EmergencyRide, RideCancellationLog } from "../types";
import { RideSummaryModal } from "./RideSummaryModal";
import CurrentLocationTracker from "./CurrentLocationTracker";
import MapComponent from "./MapComponent";
import WalletDashboard from "./WalletDashboard";
import ReferralDashboard from "./ReferralDashboard";
import RatingSystem from "./RatingSystem";
import ChatModule from "./ChatModule";

interface RequestCardProps {
  key?: any;
  req: any;
  isSubmittingAction: string | null;
  onAccept: (id: string) => any;
  onReject: (id: string) => any;
}

function RequestCard({ req, isSubmittingAction, onAccept, onReject }: RequestCardProps) {
  const [secondsLeft, setSecondsLeft] = useState(0);

  useEffect(() => {
    const calcSeconds = () => {
      const diff = Math.max(0, Math.floor((new Date(req.expiresAt).getTime() - Date.now()) / 1000));
      setSecondsLeft(diff);
    };

    calcSeconds();
    const timer = setInterval(calcSeconds, 1000);
    return () => clearInterval(timer);
  }, [req.expiresAt]);

  const isExpired = secondsLeft <= 0 || req.status === "expired";

  return (
    <div className={`p-5 rounded-2xl border transition flex flex-col md:flex-row items-start md:items-center justify-between gap-4 ${
      isExpired 
        ? "bg-slate-50 border-slate-200 opacity-60" 
        : req.priority === "critical"
          ? "bg-red-50/30 border-red-100 hover:border-red-200"
          : "bg-rose-50/20 border-rose-100 hover:border-rose-200"
    }`}>
      <div className="space-y-2 flex-grow">
        <div className="flex items-center gap-2">
          <span className={`px-2 py-0.5 text-[9px] font-black uppercase rounded-md ${
            isExpired ? "bg-slate-200 text-slate-600" : "bg-red-100 text-red-800"
          }`}>
            {req.emergencyType}
          </span>
          <span className={`px-2 py-0.5 text-[9px] font-black uppercase rounded-md ${
            isExpired ? "bg-slate-200 text-slate-500" : "bg-slate-100 text-slate-700"
          }`}>
            Priority: {req.priority}
          </span>
          {!isExpired && (
            <span className="px-2 py-0.5 bg-amber-100 text-amber-800 text-[9px] font-black uppercase rounded-md animate-pulse">
              ⏱️ {secondsLeft}s left
            </span>
          )}
          {isExpired && (
            <span className="px-2 py-0.5 bg-slate-200 text-slate-600 text-[9px] font-black uppercase rounded-md">
              Expired
            </span>
          )}
        </div>
        
        <div>
          <span className="text-xs text-slate-400 font-bold block uppercase tracking-wider">Pickup Village Point</span>
          <span className="font-extrabold text-sm text-slate-900 block">{req.village}</span>
          <span className="text-xs text-slate-500 block">Landmark: {req.landmark || "Main Village Square"}</span>
          <span className="text-xs text-slate-600 font-bold block mt-1">Destination CHC: {req.destinationChc}</span>
        </div>
      </div>

      <div className="flex items-center gap-2 w-full md:w-auto pt-3 md:pt-0 border-t md:border-t-0 border-slate-100">
        {!isExpired && (
          <>
            <button
              onClick={() => onReject(req.id)}
              disabled={isSubmittingAction !== null}
              className="flex-grow md:flex-none px-4 py-2.5 bg-white hover:bg-slate-50 border border-slate-200 text-slate-500 hover:text-slate-700 text-xs font-bold rounded-xl transition cursor-pointer font-sans"
            >
              Ignore
            </button>
            <button
              onClick={() => onAccept(req.id)}
              disabled={isSubmittingAction !== null}
              className="flex-grow md:flex-none px-5 py-2.5 bg-red-600 hover:bg-red-700 text-white text-xs font-black rounded-xl shadow-md shadow-red-50 hover:shadow-red-100 transition flex items-center justify-center space-x-1 cursor-pointer font-sans"
            >
              {isSubmittingAction === req.id && (
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
              )}
              <span>ACCEPT DISPATCH 🚨</span>
            </button>
          </>
        )}
        {isExpired && (
          <span className="text-xs text-slate-400 font-bold uppercase italic py-2 px-4 bg-slate-100 rounded-xl">
            Dispatch Expired
          </span>
        )}
      </div>
    </div>
  );
}

interface DriverStats {
  profile: {
    id: string;
    name: string;
    phone: string;
    vehicleType: string;
    vehicleNumber: string;
    village: string;
    district: string;
    status: "available" | "busy" | "offline";
    rating: number;
    completedTrips: number;
  };
  documents: {
    docType: string;
    fileName: string;
    uploadedAt: number;
    status: string;
  }[];
  activeRide: EmergencyRide | null;
  rideHistory: EmergencyRide[];
  earnings: {
    totalTrips: number;
    basePayout: number;
    incentives: number;
    total: number;
  };
}

export default function DriverHub() {
  const { user, token, logout, refreshUser } = useAuth();
  
  // Tab State
  const [activeTab, setActiveTab] = useState<"dashboard" | "documents" | "history" | "earnings" | "profile" | "cancellations" | "wallet" | "referral" | "ratings" | "chat">("dashboard");
  const [chatRecipientId, setChatRecipientId] = useState<string | undefined>(undefined);
  const [chatRideId, setChatRideId] = useState<string | undefined>(undefined);
  
  // Core Driver Data States
  const [stats, setStats] = useState<DriverStats | null>(null);
  const [incomingRequests, setIncomingRequests] = useState<any[]>([]);
  
  // Cancellation States
  const [cancellationLogs, setCancellationLogs] = useState<RideCancellationLog[]>([]);
  const [showCancelModal, setShowCancelModal] = useState(false);
  const [cancelReasonOption, setCancelReasonOption] = useState("");
  const [customCancelReason, setCustomCancelReason] = useState("");
  const [cancellationReasons, setCancellationReasons] = useState<string[]>([]);
  const [isCancelling, setIsCancelling] = useState(false);
  const [selectedSummaryRide, setSelectedSummaryRide] = useState<EmergencyRide | null>(null);
  const [isSummaryOpen, setIsSummaryOpen] = useState(false);
  const [historySearch, setHistorySearch] = useState("");
  const [historyTypeFilter, setHistoryTypeFilter] = useState("all");
  const [dispatchFilter, setDispatchFilter] = useState<"active" | "history">("active");
  const [isLoading, setIsLoading] = useState(true);
  const [isUpdatingStatus, setIsUpdatingStatus] = useState(false);
  const [isSubmittingAction, setIsSubmittingAction] = useState<string | null>(null);
  
  // Document Upload State
  const [uploadingDoc, setUploadingDoc] = useState<string | null>(null);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [dragActive, setDragActive] = useState<string | null>(null);
  
  // Profile Form States
  const [profileName, setProfileName] = useState(user?.name || "");
  const [profilePhone, setProfilePhone] = useState(user?.phone || "");
  const [profileVillage, setProfileVillage] = useState(user?.village || "");
  const [profileDistrict, setProfileDistrict] = useState(user?.district || "Ghazipur");
  const [profileVehicleType, setProfileVehicleType] = useState(user?.vehicleType || "Auto Rickshaw");
  const [profileVehicleNumber, setProfileVehicleNumber] = useState(user?.vehicleNumber || "");
  const [isSavingProfile, setIsSavingProfile] = useState(false);
  const [profileMsg, setProfileMsg] = useState<{ type: "success" | "error"; text: string } | null>(null);

  // Poll intervals
  useEffect(() => {
    if (!token) return;
    
    // Fetch initial driver stats
    fetchDriverStats();
    fetchCancellationHistory();
    fetchCancellationReasons();
    
    // Set up polling for new unassigned emergency requests and driver updates
    const interval = setInterval(() => {
      fetchDriverStats(true); // silent fetch
      fetchIncomingRequests();
      fetchCancellationHistory();
    }, 4000);
    
    return () => clearInterval(interval);
  }, [token]);

  // Listen for real-time Socket.IO ride status events to update driver view instantly
  useEffect(() => {
    if (!token) return;
    const handleStatusUpdate = () => {
      console.log("Real-time Socket.IO ride status update caught in DriverHub! Refreshing stats...");
      fetchDriverStats(true);
      fetchIncomingRequests();
    };

    window.addEventListener("gramgo_ride_status_updated", handleStatusUpdate);
    return () => {
      window.removeEventListener("gramgo_ride_status_updated", handleStatusUpdate);
    };
  }, [token]);

  // Sync profile form states on initial user load
  useEffect(() => {
    if (user) {
      setProfileName(user.name);
      setProfilePhone(user.phone);
      setProfileVillage(user.village);
      setProfileDistrict(user.district || "Ghazipur");
      if (user.vehicleType) setProfileVehicleType(user.vehicleType);
      if (user.vehicleNumber) setProfileVehicleNumber(user.vehicleNumber);
    }
  }, [user]);

  const fetchDriverStats = async (silent = false) => {
    if (!silent) setIsLoading(true);
    try {
      const res = await fetch("/api/driver/stats", {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        const contentType = res.headers.get("content-type");
        if (contentType && contentType.includes("application/json")) {
          try {
            const data = await res.json();
            setStats(data);
          } catch (parseErr) {
            console.debug("Failed to parse driver stats JSON:", parseErr);
          }
        }
      } else {
        console.debug("Failed to load driver stats, status:", res.status);
      }
    } catch (err) {
      console.debug("Error fetching driver stats:", err);
    } finally {
      setIsLoading(false);
    }
  };

  const fetchIncomingRequests = async () => {
    try {
      const res = await fetch("/api/driver/requests", {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        const contentType = res.headers.get("content-type");
        if (contentType && contentType.includes("application/json")) {
          try {
            const data = await res.json();
            setIncomingRequests(data);
          } catch (parseErr) {
            console.debug("Failed to parse incoming requests JSON:", parseErr);
          }
        }
      }
    } catch (err) {
      console.debug("Error fetching incoming requests:", err);
    }
  };

  const fetchCancellationHistory = async () => {
    try {
      const res = await fetch("/api/rides/cancellations/history", {
        headers: { "Authorization": `Bearer ${token}` }
      });
      if (res.ok) {
        const contentType = res.headers.get("content-type");
        if (contentType && contentType.includes("application/json")) {
          try {
            const data = await res.json();
            setCancellationLogs(data);
          } catch (parseErr) {
            console.debug("Failed to parse cancellation logs JSON:", parseErr);
          }
        }
      }
    } catch (e) {
      console.debug("Error fetching cancellations history:", e);
    }
  };

  const fetchCancellationReasons = async () => {
    try {
      const res = await fetch("/api/rides/cancellation-reasons", {
        headers: { "Authorization": `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setCancellationReasons(data.driver || []);
      }
    } catch (e) {
      console.error("Error fetching cancellation reasons:", e);
    }
  };

  const handleCancelRide = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!stats || !stats.activeRide) return;
    
    const finalReason = cancelReasonOption === "Other" ? customCancelReason : cancelReasonOption;
    if (!finalReason) {
      alert("Please select or enter a cancellation reason.");
      return;
    }

    setIsCancelling(true);
    try {
      const res = await fetch(`/api/rides/${stats.activeRide.id}/cancel`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token}`
        },
        body: JSON.stringify({
          reason: finalReason,
          cancelledBy: "driver"
        })
      });

      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.error || "Failed to cancel ride.");
      }

      setShowCancelModal(false);
      setCancelReasonOption("");
      setCustomCancelReason("");
      
      // Refresh driver stats and cancellation logs
      await fetchDriverStats(true);
      fetchCancellationHistory();
    } catch (err: any) {
      alert(err.message || "Failed to cancel request.");
    } finally {
      setIsCancelling(false);
    }
  };

  // Toggle availability (Online vs Offline)
  const toggleStatus = async () => {
    if (!stats) return;
    const currentStatus = stats.profile.status;
    const nextStatus = currentStatus === "offline" ? "available" : "offline";
    
    setIsUpdatingStatus(true);
    try {
      const res = await fetch("/api/driver/status", {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ status: nextStatus })
      });
      
      if (res.ok) {
        await fetchDriverStats(true);
        if (nextStatus === "available") {
          fetchIncomingRequests();
        }
      }
    } catch (err) {
      console.error(err);
    } finally {
      setIsUpdatingStatus(false);
    }
  };

  // Upload Document Simulation
  const handleUploadDocument = (docType: string, fileName: string) => {
    setUploadingDoc(docType);
    setUploadProgress(10);
    
    // Simulate upload progress steps
    const timer = setInterval(() => {
      setUploadProgress((prev) => {
        if (prev >= 100) {
          clearInterval(timer);
          // Complete upload in backend
          completeDocumentUpload(docType, fileName);
          return 100;
        }
        return prev + 30;
      });
    }, 300);
  };

  const completeDocumentUpload = async (docType: string, fileName: string) => {
    try {
      const res = await fetch("/api/driver/documents", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ docType, fileName })
      });
      if (res.ok) {
        await fetchDriverStats(true);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setUploadingDoc(null);
      setUploadProgress(0);
    }
  };

  // Accept incoming request
  const acceptRequest = async (requestId: string) => {
    setIsSubmittingAction(requestId);
    try {
      const res = await fetch(`/api/driver/requests/${requestId}/accept`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` }
      });
      
      if (res.ok) {
        await fetchDriverStats(true);
        await fetchIncomingRequests();
      } else {
        const errData = await res.json();
        alert(errData.error || "Failed to accept dispatch request.");
      }
    } catch (err) {
      console.error(err);
    } finally {
      setIsSubmittingAction(null);
    }
  };

  // Reject incoming request
  const rejectRequest = async (requestId: string) => {
    setIsSubmittingAction(requestId);
    try {
      const res = await fetch(`/api/driver/requests/${requestId}/reject`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        await fetchIncomingRequests();
      }
    } catch (err) {
      console.error(err);
    } finally {
      setIsSubmittingAction(null);
    }
  };

  // Update ongoing ride transit phase
  const updateRideStatus = async (rideId: string, nextStatus: string) => {
    setIsSubmittingAction(rideId);
    try {
      const res = await fetch(`/api/driver/rides/${rideId}/status`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ status: nextStatus })
      });
      
      if (res.ok) {
        const updatedRide = await res.json();
        await fetchDriverStats(true);
        if (nextStatus === "completed" || nextStatus === "Completed") {
          setSelectedSummaryRide(updatedRide);
          setIsSummaryOpen(true);
        }
      }
    } catch (err) {
      console.error(err);
    } finally {
      setIsSubmittingAction(null);
    }
  };

  // Save profile settings
  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!profileName || !profilePhone || !profileVillage || !profileVehicleNumber) {
      setProfileMsg({ type: "error", text: "Please enter all required fields." });
      return;
    }
    
    setIsSavingProfile(true);
    setProfileMsg(null);
    try {
      const res = await fetch("/api/profile", {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({
          name: profileName,
          phone: profilePhone,
          village: profileVillage,
          district: profileDistrict,
          vehicleType: profileVehicleType,
          vehicleNumber: profileVehicleNumber
        })
      });
      
      if (res.ok) {
        setProfileMsg({ type: "success", text: "Panchayat Volunteer Driver profile updated successfully!" });
        await refreshUser();
        await fetchDriverStats(true);
      } else {
        const data = await res.json();
        setProfileMsg({ type: "error", text: data.error || "Failed to save profile." });
      }
    } catch (err) {
      setProfileMsg({ type: "error", text: "Server connection failed." });
    } finally {
      setIsSavingProfile(false);
    }
  };

  // Handle drag over for document uploading
  const handleDrag = (e: React.DragEvent, docType: string) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(docType);
    } else if (e.type === "dragleave") {
      setDragActive(null);
    }
  };

  // Handle drop for document uploading
  const handleDrop = (e: React.DragEvent, docType: string) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(null);
    
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      const file = e.dataTransfer.files[0];
      handleUploadDocument(docType, file.name);
    }
  };

  if (isLoading && !stats) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] space-y-4">
        <Loader2 className="w-10 h-10 text-emerald-600 animate-spin" />
        <p className="text-sm font-semibold text-slate-500">Retrieving Volunteer Driver Credentials...</p>
      </div>
    );
  }

  // Fallback profile if stats fail
  const profile = stats?.profile || {
    name: user?.name || "Volunteer Driver",
    phone: user?.phone || "",
    vehicleType: user?.vehicleType || "Auto Rickshaw",
    vehicleNumber: user?.vehicleNumber || "UP-61-NEW-99",
    village: user?.village || "",
    district: "Ghazipur",
    status: "offline",
    rating: 5.0,
    completedTrips: 0
  };

  const isOnline = profile.status !== "offline";

  const filteredDriverHistory = (stats?.rideHistory || []).filter((ride) => {
    const query = historySearch.toLowerCase();
    const matchesSearch = 
      ride.patientName.toLowerCase().includes(query) ||
      ride.destinationChc.toLowerCase().includes(query) ||
      ride.village.toLowerCase().includes(query);

    const matchesType = historyTypeFilter === "all" || ride.emergencyType === historyTypeFilter;

    return matchesSearch && matchesType;
  });

  return (
    <div id="driver-hub-root" className="max-w-7xl mx-auto px-4 py-8 sm:px-6 lg:px-8 space-y-8">
      
      {/* Top Banner & Status Selector */}
      <div className="bg-white border border-emerald-100 rounded-3xl p-6 shadow-sm flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
        <div className="flex items-center space-x-4">
          <div className="p-3 bg-emerald-50 text-emerald-600 rounded-2xl">
            <Award className="w-8 h-8" />
          </div>
          <div>
            <div className="flex items-center space-x-2">
              <h1 className="text-xl font-extrabold text-slate-900">{profile.name}</h1>
              <span className="flex items-center bg-amber-50 text-amber-700 text-xs px-2 py-0.5 rounded-full font-bold border border-amber-200">
                ★ {profile.rating.toFixed(1)} Rating
              </span>
            </div>
            <p className="text-xs text-slate-500 mt-0.5">
              Volunteer Driver • {profile.vehicleType} ({profile.vehicleNumber}) • {profile.village}
            </p>
          </div>
        </div>

        {/* Go Online / Go Offline control toggle */}
        <div className="flex items-center space-x-4 w-full md:w-auto border-t md:border-t-0 pt-4 md:pt-0">
          <div className="flex flex-col text-left md:text-right">
            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider block">Panchayat Status</span>
            <span className={`text-sm font-black uppercase ${isOnline ? "text-emerald-600" : "text-rose-500"}`}>
              {isOnline ? "● Live & Online" : "○ Offline / Rest Mode"}
            </span>
          </div>
          <button
            onClick={toggleStatus}
            disabled={isUpdatingStatus}
            className={`flex-grow md:flex-none px-6 py-3 rounded-2xl text-xs font-black tracking-wide shadow-md transition-all uppercase cursor-pointer ${
              isOnline 
                ? "bg-rose-500 hover:bg-rose-600 text-white hover:shadow-rose-100" 
                : "bg-emerald-600 hover:bg-emerald-700 text-white hover:shadow-emerald-100"
            }`}
          >
            {isUpdatingStatus ? (
              <span className="flex items-center space-x-1 justify-center">
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                <span>Switching...</span>
              </span>
            ) : isOnline ? (
              "GO OFFLINE 🛑"
            ) : (
              "GO ONLINE ⚡"
            )}
          </button>
        </div>
      </div>

      {/* Main Grid Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        
        {/* Navigation Tabs (Left Sidebar on desktop) */}
        <div className="lg:col-span-3 space-y-2">
          {[
            { id: "dashboard", label: "Driver Control Hub", icon: LayoutDashboard, badge: incomingRequests.filter(r => r.status === "pending" || r.status === "searching").length },
            { id: "documents", label: "Verification Documents", icon: FileText, badge: stats?.documents && stats.documents.length < 4 ? "Action Req" : "" },
            { id: "history", label: "Completed Lifelines", icon: History, badge: stats?.rideHistory?.length },
            { id: "ratings", label: "Ratings & Feedback", icon: Star },
            { id: "cancellations", label: "Cancellations Log", icon: XCircle, badge: cancellationLogs.length },
            { id: "earnings", label: "Subsidy & Earnings", icon: DollarSign },
            { id: "wallet", label: "My Subsidy Wallet", icon: Coins },
            { id: "referral", label: "Refer & Earn", icon: Gift },
            { id: "profile", label: "Vehicle & Profile", icon: User },
            { id: "chat", label: "Community Chat Hub", icon: MessageSquare }
          ].map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => {
                  if (tab.id === "chat") {
                    setChatRecipientId(undefined);
                    setChatRideId(undefined);
                  }
                  setActiveTab(tab.id as any);
                }}
                className={`w-full flex items-center justify-between p-4 rounded-2xl text-xs font-extrabold transition-all border text-left cursor-pointer ${
                  isActive
                    ? "bg-emerald-600 text-white border-emerald-600 shadow-md shadow-emerald-100"
                    : "bg-white text-slate-600 hover:text-emerald-600 hover:bg-slate-50 border-slate-100"
                }`}
              >
                <div className="flex items-center space-x-3">
                  <Icon className={`w-4 h-4 ${isActive ? "text-white" : "text-slate-400"}`} />
                  <span>{tab.label}</span>
                </div>
                {tab.badge !== undefined && tab.badge !== "" && tab.badge !== 0 && (
                  <span className={`px-2 py-0.5 rounded-full text-[10px] font-black ${
                    isActive 
                      ? "bg-white text-emerald-700" 
                      : tab.badge === "Action Req"
                      ? "bg-rose-50 text-rose-600 border border-rose-100"
                      : "bg-emerald-50 text-emerald-700"
                  }`}>
                    {tab.badge}
                  </span>
                )}
              </button>
            );
          })}

          <div className="p-4 bg-slate-900 rounded-3xl text-slate-300 space-y-2 mt-6">
            <h4 className="text-xs font-extrabold text-white flex items-center space-x-1">
              <ShieldAlert className="w-3.5 h-3.5 text-amber-500" />
              <span>Incentive Policy</span>
            </h4>
            <p className="text-[10px] leading-relaxed text-slate-400 font-medium">
              Every completed emergency transport is directly subsidized by the Ghazipur District Health Board with <span className="text-emerald-400 font-bold">₹500</span> fuel voucher and <span className="text-emerald-400 font-bold">₹150</span> volunteer bonus.
            </p>
          </div>
        </div>

        {/* Dynamic Content Panel */}
        <div className="lg:col-span-9 space-y-6">

          {/* Tab: Dashboard */}
          {activeTab === "dashboard" && (
            <div className="space-y-6">

              {/* Ongoing Active Assigned Ride */}
              {stats?.activeRide ? (
                <div className="bg-white border-2 border-emerald-500 rounded-3xl p-6 shadow-lg shadow-emerald-50/50 space-y-6 animate-pulse-once">
                  <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-slate-100 pb-4">
                    <div>
                      <span className="px-2.5 py-1 bg-rose-50 text-rose-700 border border-rose-200 text-[10px] font-black uppercase rounded-lg">
                        Active Emergency Dispatch
                      </span>
                      <h3 className="text-lg font-extrabold text-slate-900 mt-2">
                        Patient: {stats.activeRide.patientName}
                      </h3>
                      <p className="text-xs text-slate-400 mt-0.5">
                        Emergency: <span className="font-bold text-red-600">{stats.activeRide.emergencyType}</span> • Priority: <span className="font-bold uppercase text-red-500">{stats.activeRide.priority}</span>
                      </p>
                    </div>

                    <div className="flex items-center space-x-2 flex-wrap gap-2">
                      <a 
                        href={`tel:${stats.activeRide.patientPhone}`}
                        className="px-4 py-2.5 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 text-emerald-700 font-bold text-xs rounded-xl flex items-center space-x-1.5 transition-colors"
                      >
                        <Phone className="w-3.5 h-3.5" />
                        <span>Call Family ({stats.activeRide.patientPhone})</span>
                      </a>

                      {stats.activeRide.passengerId && (
                        <button 
                          onClick={() => {
                            if (stats.activeRide) {
                              setChatRecipientId(stats.activeRide.passengerId);
                              setChatRideId(stats.activeRide.id);
                              setActiveTab("chat");
                            }
                          }}
                          className="px-4 py-2.5 bg-orange-50 hover:bg-orange-100 border border-orange-200 text-orange-700 font-bold text-xs rounded-xl flex items-center space-x-1.5 transition-colors cursor-pointer"
                        >
                          <MessageSquare className="w-3.5 h-3.5 text-orange-600" />
                          <span>Chat with Passenger</span>
                        </button>
                      )}
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 text-xs font-semibold">
                    <div className="space-y-2.5 p-4 bg-slate-50 rounded-2xl border border-slate-100">
                      <span className="text-[10px] text-slate-400 uppercase tracking-wider block">Pickup Details</span>
                      <div className="flex items-start space-x-2">
                        <MapPin className="w-4 h-4 text-emerald-600 mt-0.5" />
                        <div>
                          <span className="text-slate-900 font-extrabold block">{stats.activeRide.village}</span>
                          <span className="text-slate-500 text-[11px] block">Landmark: {stats.activeRide.landmark || "Main Village Square"}</span>
                        </div>
                      </div>
                    </div>

                    <div className="space-y-2.5 p-4 bg-slate-50 rounded-2xl border border-slate-100">
                      <span className="text-[10px] text-slate-400 uppercase tracking-wider block">Destination Care Centre</span>
                      <div className="flex items-start space-x-2">
                        <Car className="w-4 h-4 text-slate-600 mt-0.5" />
                        <div>
                          <span className="text-slate-900 font-extrabold block">{stats.activeRide.destinationChc}</span>
                          <span className="text-slate-500 text-[11px] block">Estimated Distance: ~5-10 Km</span>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* High-Fidelity Active Navigation Map */}
                  <div className="mt-4">
                    <MapComponent 
                      pickupLocation={stats.activeRide.village}
                      destinationLocation={stats.activeRide.destinationChc}
                      driverId={user?.id || stats.activeRide.driverId}
                      role="driver"
                      rideId={stats.activeRide.id}
                    />
                  </div>

                  {/* Progressive Actions based on transit stages */}
                  <div className="bg-emerald-50/50 p-4 rounded-2xl border border-emerald-100/50 flex flex-col md:flex-row items-center justify-between gap-4">
                    <div className="space-y-1">
                      <span className="text-[10px] uppercase font-black text-emerald-800">Operational Phase</span>
                      <div className="text-xs text-slate-600 font-medium">
                        Current Transit Phase: <span className="font-extrabold uppercase text-emerald-700 bg-emerald-100/50 px-2 py-0.5 rounded">{stats.activeRide.status.replace("_", " ")}</span>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 w-full md:w-auto">
                      {(stats.activeRide.status === "driver_assigned" || stats.activeRide.status === "Driver Assigned") && (
                        <button
                          onClick={() => updateRideStatus(stats.activeRide!.id, "Driver Arriving")}
                          disabled={isSubmittingAction === stats.activeRide.id}
                          className="w-full md:w-auto px-5 py-3 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-black rounded-xl shadow-md cursor-pointer transition-all uppercase"
                        >
                          Start Journey (Driver Arriving) 🚙
                        </button>
                      )}

                      {(stats.activeRide.status === "driver_arriving" || stats.activeRide.status === "en_route" || stats.activeRide.status === "Driver Arriving") && (
                        <button
                          onClick={() => updateRideStatus(stats.activeRide!.id, "Passenger Picked")}
                          disabled={isSubmittingAction === stats.activeRide.id}
                          className="w-full md:w-auto px-5 py-3 bg-amber-500 hover:bg-amber-600 text-white text-xs font-black rounded-xl shadow-md cursor-pointer transition-all uppercase"
                        >
                          Reached Patient Pickup 📍
                        </button>
                      )}

                      {(stats.activeRide.status === "reached_pickup" || stats.activeRide.status === "arrived" || stats.activeRide.status === "Passenger Picked") && (
                        <button
                          onClick={() => updateRideStatus(stats.activeRide!.id, "Hospital Reached")}
                          disabled={isSubmittingAction === stats.activeRide.id}
                          className="w-full md:w-auto px-5 py-3 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-black rounded-xl shadow-md cursor-pointer transition-all uppercase"
                        >
                          Start Ride (Hospital Reached) 🚀
                        </button>
                      )}

                      {(stats.activeRide.status === "ride_started" || stats.activeRide.status === "Hospital Reached") && (
                        <button
                          onClick={() => updateRideStatus(stats.activeRide!.id, "Completed")}
                          disabled={isSubmittingAction === stats.activeRide.id}
                          className="w-full md:w-auto px-5 py-3 bg-red-600 hover:bg-red-700 text-white text-xs font-black rounded-xl shadow-md cursor-pointer transition-all uppercase"
                        >
                          Safely Handed Over at CHC (Complete Ride) ✅
                        </button>
                      )}

                      {stats.activeRide.status !== "completed" && stats.activeRide.status !== "Completed" && stats.activeRide.status !== "cancelled" && stats.activeRide.status !== "Cancelled" && (
                        <button
                          onClick={() => setShowCancelModal(true)}
                          className="w-full md:w-auto px-4 py-3 bg-red-100 hover:bg-red-200 text-red-700 text-xs font-black rounded-xl cursor-pointer transition-all uppercase"
                        >
                          Cancel Accepted Dispatch 🛑
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              ) : (
                /* Static Dashboard Overview cards if no active ride */
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div className="bg-white border border-slate-100 p-5 rounded-2xl flex items-center space-x-4">
                    <div className="p-3 bg-emerald-50 text-emerald-600 rounded-xl">
                      <CheckCircle2 className="w-5 h-5" />
                    </div>
                    <div>
                      <span className="text-[10px] font-bold text-slate-400 block uppercase">Completed Transits</span>
                      <span className="text-xl font-black text-slate-900 block">{stats?.earnings.totalTrips || 0}</span>
                    </div>
                  </div>

                  <div className="bg-white border border-slate-100 p-5 rounded-2xl flex items-center space-x-4">
                    <div className="p-3 bg-orange-50 text-orange-600 rounded-xl">
                      <DollarSign className="w-5 h-5" />
                    </div>
                    <div>
                      <span className="text-[10px] font-bold text-slate-400 block uppercase">Earned Fuel Subsidy</span>
                      <span className="text-xl font-black text-slate-900 block">₹{stats?.earnings.total || 0}</span>
                    </div>
                  </div>

                  <div className="bg-white border border-slate-100 p-5 rounded-2xl flex items-center space-x-4">
                    <div className="p-3 bg-blue-50 text-blue-600 rounded-xl">
                      <Car className="w-5 h-5" />
                    </div>
                    <div>
                      <span className="text-[10px] font-bold text-slate-400 block uppercase">Active Vehicle</span>
                      <span className="text-xs font-black text-slate-900 block truncate">{profile.vehicleNumber || "NOT REGISTERED"}</span>
                    </div>
                  </div>
                </div>
              )}

              {/* Driver GPS Location Syncer */}
              <CurrentLocationTracker 
                role="driver" 
                title="Verify Driver Live Location" 
              />

              {/* Incoming Emergency Requests / Dispatches */}
              <div className="bg-white border border-slate-100 rounded-3xl p-6 space-y-4 shadow-sm">
                <div className="flex items-center justify-between border-b border-slate-50 pb-4">
                  <div>
                    <h3 className="text-sm font-extrabold text-slate-900">Live Village Emergency Dispatches</h3>
                    <p className="text-xs text-slate-400 font-medium">Accept nearby emergency calls to provide medical transport.</p>
                  </div>
                  {isOnline && (
                    <span className="flex items-center text-[10px] bg-emerald-50 border border-emerald-100 text-emerald-700 px-2.5 py-0.5 rounded-full font-bold animate-pulse">
                      ● Active Listening...
                    </span>
                  )}
                </div>

                {!isOnline ? (
                  <div className="py-12 text-center text-slate-500 space-y-3">
                    <AlertCircle className="w-8 h-8 text-amber-500 mx-auto" />
                    <div className="max-w-md mx-auto space-y-1">
                      <p className="text-sm font-black">You are currently Offline</p>
                      <p className="text-xs text-slate-400 leading-normal">
                        To receive live emergency alerts and assist medical cases in your village region, please toggle your Panchayat Status to <strong>Live & Online</strong>.
                      </p>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {/* Sub-tabs for dispatch lists */}
                    <div className="flex border-b border-slate-100 gap-4 text-xs font-bold">
                      <button 
                        onClick={() => setDispatchFilter("active")}
                        className={`pb-2 border-b-2 px-1 transition-all cursor-pointer ${
                          dispatchFilter === "active" 
                            ? "border-red-600 text-red-600 font-black" 
                            : "border-transparent text-slate-400 hover:text-slate-600"
                        }`}
                      >
                        Active Alerts ({incomingRequests.filter(r => r.status === "pending" || r.status === "searching").length})
                      </button>
                      <button 
                        onClick={() => setDispatchFilter("history")}
                        className={`pb-2 border-b-2 px-1 transition-all cursor-pointer ${
                          dispatchFilter === "history" 
                            ? "border-emerald-600 text-emerald-600 font-black" 
                            : "border-transparent text-slate-400 hover:text-slate-600"
                        }`}
                      >
                        Dispatch Logs ({incomingRequests.filter(r => ["accepted", "rejected", "expired"].includes(r.status)).length})
                      </button>
                    </div>

                    {dispatchFilter === "active" ? (
                      incomingRequests.filter(r => r.status === "pending" || r.status === "searching").length === 0 ? (
                        <div className="py-12 text-center text-slate-400 space-y-3">
                          <Clock className="w-8 h-8 text-slate-300 mx-auto animate-spin" style={{ animationDuration: "3s" }} />
                          <div className="space-y-1">
                            <p className="text-xs font-black">Scanning for active local dispatches...</p>
                            <p className="text-[10px] text-slate-400">All quiet in the region right now. Standby for critical alerts.</p>
                          </div>
                        </div>
                      ) : (
                        <div className="space-y-4">
                          {incomingRequests
                            .filter(r => r.status === "pending" || r.status === "searching")
                            .map((req) => (
                              <RequestCard
                                key={req.id}
                                req={req}
                                isSubmittingAction={isSubmittingAction}
                                onAccept={acceptRequest}
                                onReject={rejectRequest}
                              />
                            ))}
                        </div>
                      )
                    ) : (
                      incomingRequests.filter(r => ["accepted", "rejected", "expired"].includes(r.status)).length === 0 ? (
                        <div className="py-12 text-center text-slate-400 text-xs font-bold">
                          No previous dispatch logs recorded for this session.
                        </div>
                      ) : (
                        <div className="space-y-3">
                          {incomingRequests
                            .filter(r => ["accepted", "rejected", "expired"].includes(r.status))
                            .map((req) => (
                              <div key={req.id} className="p-4 bg-slate-50 border border-slate-100 rounded-2xl flex items-center justify-between text-xs">
                                <div className="space-y-1">
                                  <div className="flex items-center gap-1.5">
                                    <span className="font-extrabold text-slate-900">{req.patientName}</span>
                                    <span className="text-[10px] bg-slate-200 text-slate-700 font-extrabold px-1.5 py-0.5 rounded uppercase">
                                      {req.emergencyType}
                                    </span>
                                  </div>
                                  <div className="text-slate-500 font-medium">
                                    Pickup: {req.village} | Destination: {req.destinationChc}
                                  </div>
                                </div>
                                <div>
                                  {req.status === "accepted" && (
                                    <span className="px-2.5 py-1 bg-emerald-100 text-emerald-800 rounded-lg font-extrabold uppercase text-[10px]">
                                      Accepted
                                    </span>
                                  )}
                                  {req.status === "rejected" && (
                                    <span className="px-2.5 py-1 bg-slate-200 text-slate-600 rounded-lg font-extrabold uppercase text-[10px]">
                                      Ignored
                                    </span>
                                  )}
                                  {req.status === "expired" && (
                                    <span className="px-2.5 py-1 bg-rose-100 text-rose-800 rounded-lg font-extrabold uppercase text-[10px]">
                                      Expired
                                    </span>
                                  )}
                                </div>
                              </div>
                            ))}
                        </div>
                      )
                    )}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Tab: Documents */}
          {activeTab === "documents" && (
            <div className="bg-white border border-slate-100 rounded-3xl p-6 space-y-6 shadow-sm">
              <div>
                <h3 className="text-sm font-extrabold text-slate-900">Volunteer Verification Documents</h3>
                <p className="text-xs text-slate-400 font-medium">Upload necessary files to satisfy Panchayat safety audits and unlock local fuel allowances.</p>
              </div>

              {/* Grid of documents */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                {[
                  { id: "license", label: "Commercial/Private Driving License", required: true },
                  { id: "rc", label: "Vehicle Registration Card (RC)", required: true },
                  { id: "aadhaar", label: "Driver Aadhaar Card Identification", required: true },
                  { id: "insurance", label: "Active Vehicle Insurance Certificate", required: false }
                ].map((doc) => {
                  const uploaded = stats?.documents?.find(d => d.docType === doc.id);
                  const isUploading = uploadingDoc === doc.id;

                  return (
                    <div 
                      key={doc.id}
                      onDragEnter={(e) => handleDrag(e, doc.id)}
                      onDragOver={(e) => handleDrag(e, doc.id)}
                      onDragLeave={(e) => handleDrag(e, doc.id)}
                      onDrop={(e) => handleDrop(e, doc.id)}
                      className={`p-5 rounded-2xl border-2 border-dashed transition-all relative flex flex-col justify-between min-h-[160px] ${
                        uploaded
                          ? "bg-emerald-50/10 border-emerald-200"
                          : isUploading
                          ? "bg-slate-50 border-slate-300"
                          : dragActive === doc.id
                          ? "bg-emerald-50 border-emerald-400"
                          : "bg-slate-50/50 border-slate-200 hover:bg-slate-50"
                      }`}
                    >
                      <div className="space-y-1">
                        <div className="flex items-start justify-between">
                          <span className="text-xs font-extrabold text-slate-900 leading-tight block pr-4">
                            {doc.label}
                          </span>
                          {uploaded ? (
                            <span className="p-1 bg-emerald-100 text-emerald-800 rounded-full">
                              <Check className="w-3 h-3" />
                            </span>
                          ) : (
                            <span className="text-[9px] bg-amber-50 text-amber-700 font-bold px-1.5 py-0.5 rounded border border-amber-200 whitespace-nowrap">
                              {doc.required ? "Required" : "Optional"}
                            </span>
                          )}
                        </div>

                        {uploaded ? (
                          <div className="pt-2 text-[11px] font-mono text-slate-500 break-all space-y-1">
                            <p className="font-extrabold text-slate-700">Uploaded File:</p>
                            <p className="truncate">{uploaded.fileName}</p>
                            <p className="text-[10px] text-slate-400">Date: {new Date(uploaded.uploadedAt).toLocaleDateString()}</p>
                          </div>
                        ) : isUploading ? (
                          <div className="pt-4 space-y-2">
                            <div className="h-1.5 w-full bg-slate-200 rounded-full overflow-hidden">
                              <div 
                                className="h-full bg-emerald-600 rounded-full transition-all duration-300"
                                style={{ width: `${uploadProgress}%` }}
                              />
                            </div>
                            <span className="text-[10px] font-extrabold text-slate-500">Uploading File... {uploadProgress}%</span>
                          </div>
                        ) : (
                          <p className="text-[10px] text-slate-400 pt-2 leading-relaxed">
                            Drag & drop or click browse to upload clear image or PDF (Max 5MB).
                          </p>
                        )}
                      </div>

                      {/* Upload Trigger Input */}
                      <div className="pt-4 flex items-center justify-end">
                        {!uploaded && !isUploading && (
                          <label className="px-3.5 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold text-[10px] rounded-lg cursor-pointer flex items-center space-x-1 shadow-sm transition">
                            <UploadCloud className="w-3.5 h-3.5" />
                            <span>Browse File</span>
                            <input
                              type="file"
                              className="hidden"
                              onChange={(e) => {
                                if (e.target.files && e.target.files[0]) {
                                  handleUploadDocument(doc.id, e.target.files[0].name);
                                }
                              }}
                            />
                          </label>
                        )}

                        {uploaded && (
                          <label className="text-[10px] font-extrabold text-rose-500 hover:text-rose-700 cursor-pointer">
                            <span>Replace Document</span>
                            <input
                              type="file"
                              className="hidden"
                              onChange={(e) => {
                                if (e.target.files && e.target.files[0]) {
                                  handleUploadDocument(doc.id, e.target.files[0].name);
                                }
                              }}
                            />
                          </label>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Panchayat Checklist */}
              <div className="p-4 bg-emerald-50 border border-emerald-100 rounded-2xl flex items-start space-x-3 text-xs text-emerald-800 font-semibold">
                <Info className="w-4 h-4 text-emerald-600 mt-0.5 shrink-0" />
                <div className="space-y-1 leading-normal">
                  <p className="font-extrabold">Instant Panchayat Approval Active</p>
                  <p className="text-slate-600 text-[11px] font-medium">
                    Uploads are automatically pre-verified to ensure seamless emergency coverage. The local health sub-committee may audit these records monthly.
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Tab: History */}
          {activeTab === "history" && (
            <div className="bg-white border border-slate-100 rounded-3xl p-6 space-y-4 shadow-sm">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b border-slate-50 pb-4 gap-3">
                <div>
                  <h3 className="text-sm font-extrabold text-slate-900">Completed Emergency Transits</h3>
                  <p className="text-xs text-slate-400 font-medium">Historical audit of medical transports completed under GramGo.</p>
                </div>
              </div>

              {/* Search & Filters */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 bg-slate-50/50 p-4 border border-slate-100 rounded-2xl">
                <div className="relative">
                  <input
                    type="text"
                    placeholder="Search by Patient, CHC, Village..."
                    value={historySearch}
                    onChange={(e) => setHistorySearch(e.target.value)}
                    className="w-full pl-9 pr-4 py-2 bg-white border border-slate-200 rounded-xl text-xs font-semibold outline-none focus:ring-2 focus:ring-emerald-500/50"
                  />
                  <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                </div>

                <div>
                  <select
                    value={historyTypeFilter}
                    onChange={(e) => setHistoryTypeFilter(e.target.value)}
                    className="w-full p-2 bg-white border border-slate-200 rounded-xl text-xs font-semibold outline-none cursor-pointer"
                  >
                    <option value="all">All Emergency Types</option>
                    <option value="Maternity">Maternity</option>
                    <option value="Accident/Trauma">Accident / Trauma</option>
                    <option value="Severe Illness">Severe Illness</option>
                    <option value="Cardiac">Cardiac</option>
                    <option value="Other">Other</option>
                  </select>
                </div>
              </div>

              {(!stats?.rideHistory || stats.rideHistory.length === 0) ? (
                <div className="py-12 text-center text-slate-400 space-y-2">
                  <History className="w-8 h-8 text-slate-300 mx-auto" />
                  <p className="text-xs font-bold">No completed lifelines yet.</p>
                  <p className="text-[10px] text-slate-400">Your completed emergency transits will populate here once you accept and complete a ride.</p>
                </div>
              ) : filteredDriverHistory.length === 0 ? (
                <div className="py-12 text-center text-slate-400 space-y-2 border border-dashed border-slate-200 rounded-2xl">
                  <p className="text-xs font-bold">No completed rides match your search or filter.</p>
                </div>
              ) : (
                <div className="space-y-4 pt-2">
                  {filteredDriverHistory.map((ride) => (
                    <div 
                      key={ride.id}
                      className="p-4 bg-slate-50/50 hover:bg-slate-50 border border-slate-100 rounded-2xl flex flex-col sm:flex-row sm:items-center justify-between gap-4 transition"
                    >
                      <div className="space-y-1.5">
                        <div className="flex items-center space-x-2">
                          <span className="font-extrabold text-sm text-slate-900">{ride.patientName}</span>
                          <span className="px-2 py-0.5 bg-emerald-50 text-emerald-700 border border-emerald-100 text-[9px] font-black uppercase rounded-md">
                            {ride.emergencyType}
                          </span>
                        </div>
                        
                        <div className="grid grid-cols-2 gap-x-4 text-xs font-semibold text-slate-500">
                          <span className="flex items-center space-x-1">
                            <MapPin className="w-3.5 h-3.5 text-gray-400" />
                            <span>From: {ride.village}</span>
                          </span>
                          <span className="flex items-center space-x-1">
                            <Car className="w-3.5 h-3.5 text-gray-400" />
                            <span>To: {ride.destinationChc}</span>
                          </span>
                        </div>
                      </div>

                      <div className="text-left sm:text-right border-t sm:border-t-0 pt-2 sm:pt-0 border-slate-100 flex sm:flex-col justify-between items-center sm:items-end gap-2">
                        <div className="flex flex-col sm:items-end">
                          <span className="text-[10px] text-slate-400 font-extrabold">
                            {new Date(ride.createdAt).toLocaleString()}
                          </span>
                          <span className="text-[10px] font-black text-emerald-600 uppercase tracking-wide mt-1">
                            ✓ Completed • Payout ₹650
                          </span>
                        </div>
                        <button
                          onClick={() => {
                            setSelectedSummaryRide(ride);
                            setIsSummaryOpen(true);
                          }}
                          className="px-3 py-1.5 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 text-emerald-700 hover:text-emerald-800 text-[10px] font-black rounded-lg cursor-pointer transition uppercase"
                        >
                          View Summary 🧾
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Tab: Cancellations */}
          {activeTab === "cancellations" && (
            <div className="bg-white border border-slate-100 rounded-3xl p-6 space-y-4 shadow-sm">
              <div>
                <h3 className="text-sm font-extrabold text-slate-900">Cancelled Emergency Transits</h3>
                <p className="text-xs text-slate-400 font-medium">Historical audit of medical transports cancelled with specific reasons.</p>
              </div>

              {cancellationLogs.length === 0 ? (
                <div className="py-12 text-center text-slate-400 space-y-2">
                  <XCircle className="w-8 h-8 text-slate-300 mx-auto" />
                  <p className="text-xs font-bold">No cancelled lifelines on record.</p>
                  <p className="text-[10px] text-slate-400">Great! There are no cancelled emergency dispatches on record for your account.</p>
                </div>
              ) : (
                <div className="space-y-4 pt-2">
                  {cancellationLogs.map((log) => (
                    <div 
                      key={log.id}
                      className="p-4 bg-red-50/30 border border-red-100 rounded-2xl flex flex-col sm:flex-row sm:items-center justify-between gap-4 transition"
                    >
                      <div className="space-y-1.5">
                        <div className="flex items-center space-x-2">
                          <span className="font-extrabold text-sm text-slate-900">Patient: {log.patientName}</span>
                          <span className={`px-2 py-0.5 border text-[9px] font-black uppercase rounded-md ${
                            log.cancelledBy === "driver" ? "bg-amber-100 text-amber-800 border-amber-200" : "bg-red-100 text-red-800 border-red-200"
                          }`}>
                            Cancelled By {log.cancelledBy}
                          </span>
                        </div>
                        
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-1 text-xs font-semibold text-slate-500">
                          <span className="flex items-center space-x-1">
                            <Info className="w-3.5 h-3.5 text-gray-400" />
                            <span>Type: {log.emergencyType}</span>
                          </span>
                          <span className="flex items-center space-x-1">
                            <XCircle className="w-3.5 h-3.5 text-red-400 font-bold" />
                            <span className="text-red-700 font-bold">Reason: "{log.reason}"</span>
                          </span>
                        </div>
                      </div>

                      <div className="text-left sm:text-right border-t sm:border-t-0 pt-2 sm:pt-0 border-slate-100 flex sm:flex-col justify-between items-center sm:items-end">
                        <span className="text-[10px] text-slate-400 font-extrabold">
                          {new Date(log.createdAt).toLocaleString()}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Tab: Earnings */}
          {activeTab === "earnings" && (
            <div className="space-y-6">
              
              {/* Earnings Hero card */}
              <div className="bg-slate-900 text-slate-300 rounded-3xl p-6 md:p-8 shadow-xl flex flex-col sm:flex-row sm:items-center justify-between gap-6 relative overflow-hidden">
                <div className="space-y-3 z-10">
                  <span className="px-2.5 py-1 bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 text-[10px] font-black uppercase rounded-lg">
                    Consolidated Panchayat Subsidy
                  </span>
                  <div className="space-y-1">
                    <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider block">Available Balance for Settlement</span>
                    <span className="text-4xl font-black text-white block">₹{stats?.earnings.total || 0}</span>
                  </div>
                  <p className="text-xs text-slate-400 max-w-md">
                    Earnings accumulate dynamically from fuel grants and Panchayat volunteer incentives. Settlement triggers bank deposits directly.
                  </p>
                </div>

                <div className="z-10 w-full sm:w-auto">
                  <button
                    onClick={() => {
                      if (!stats || stats.earnings.total === 0) {
                        alert("No balance available to settle right now.");
                        return;
                      }
                      alert("🎉 Bank settlement request generated successfully! Funds of ₹" + stats.earnings.total + " will credit within 24 hours under Panchayat DBT schema.");
                    }}
                    className="w-full sm:w-auto px-6 py-3 bg-emerald-500 hover:bg-emerald-600 text-slate-950 font-black text-xs rounded-2xl shadow-lg hover:-translate-y-0.5 transition cursor-pointer uppercase whitespace-nowrap"
                  >
                    Request Payout (Direct DBT) 💸
                  </button>
                </div>

                {/* Ambient visual background glow */}
                <div className="absolute right-0 top-0 w-48 h-48 bg-emerald-500/10 rounded-full blur-3xl -z-0 pointer-events-none" />
              </div>

              {/* Earnings Breakdown */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                
                {/* Financial breakdown */}
                <div className="bg-white border border-slate-100 rounded-3xl p-6 space-y-4 shadow-sm">
                  <h3 className="text-sm font-extrabold text-slate-900">Subsidy & Bonus Breakdown</h3>
                  
                  <div className="space-y-3.5 font-semibold text-xs pt-2">
                    <div className="flex items-center justify-between pb-3 border-b border-slate-50">
                      <span className="text-slate-500">Completed Lifelines</span>
                      <span className="text-slate-900 font-extrabold">{stats?.earnings.totalTrips || 0} Trips</span>
                    </div>

                    <div className="flex items-center justify-between pb-3 border-b border-slate-50">
                      <span className="text-slate-500">Base Fuel Subsidy (₹500 / Trip)</span>
                      <span className="text-slate-900 font-extrabold">₹{stats?.earnings.basePayout || 0}</span>
                    </div>

                    <div className="flex items-center justify-between pb-3 border-b border-slate-50">
                      <span className="text-slate-500">Panchayat Bonus (₹150 / Trip)</span>
                      <span className="text-slate-900 font-extrabold">₹{stats?.earnings.incentives || 0}</span>
                    </div>

                    <div className="flex items-center justify-between pt-1">
                      <span className="text-slate-900 font-black">Gross Total</span>
                      <span className="text-base font-black text-emerald-600">₹{stats?.earnings.total || 0}</span>
                    </div>
                  </div>
                </div>

                {/* Information Callout */}
                <div className="bg-white border border-slate-100 rounded-3xl p-6 space-y-4 shadow-sm flex flex-col justify-between">
                  <div className="space-y-2">
                    <h3 className="text-sm font-extrabold text-slate-900 flex items-center space-x-1.5">
                      <TrendingUp className="w-5 h-5 text-emerald-600" />
                      <span>District DBT Integration</span>
                    </h3>
                    <p className="text-xs text-slate-500 leading-relaxed font-semibold">
                      Your Bank Account registered during driver enrollment receives funds directly via Direct Benefit Transfer (DBT) monitored under Mahatma Gandhi National Rural Welfare and Panchayat Health directives.
                    </p>
                  </div>

                  <div className="pt-4 border-t border-slate-50 flex items-center space-x-2 text-[10px] text-slate-400 font-bold">
                    <span>Monitored by Gram Panchayat Block Officers</span>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Tab: Wallet */}
          {activeTab === "wallet" && (
            <div className="bg-white border border-slate-100 rounded-3xl p-6 space-y-6 shadow-sm">
              <div className="border-b border-emerald-50 pb-4">
                <h2 className="text-lg font-black text-slate-800">My Subsidy Wallet</h2>
                <p className="text-xs text-slate-500 font-semibold mt-0.5">Manage your pilot transport grants and digital wallet incentives.</p>
              </div>
              <WalletDashboard userId={user?.id || ""} token={token} role="driver" />
            </div>
          )}

          {/* Tab: Referral */}
          {activeTab === "referral" && (
            <div className="bg-white border border-slate-100 rounded-3xl p-6 space-y-6 shadow-sm">
              <div className="border-b border-emerald-50 pb-4">
                <h2 className="text-lg font-black text-slate-800">Referral Program</h2>
                <p className="text-xs text-slate-500 font-semibold mt-0.5">Share your driver code to onboard village friends and earn joint benefits.</p>
              </div>
              <ReferralDashboard token={token} onRewardClaimed={refreshUser} />
            </div>
          )}

          {/* Tab: Ratings & Feedback */}
          {activeTab === "ratings" && (
            <RatingSystem role="driver" token={token} user={user} />
          )}

          {/* Tab: Chat */}
          {activeTab === "chat" && (
            <ChatModule
              initialRecipientId={chatRecipientId}
              initialRideId={chatRideId}
            />
          )}

          {/* Tab: Profile */}
          {activeTab === "profile" && (
            <div className="bg-white border border-slate-100 rounded-3xl p-6 space-y-6 shadow-sm">
              <div>
                <h3 className="text-sm font-extrabold text-slate-900">Vehicle & Profile Settings</h3>
                <p className="text-xs text-slate-400 font-medium">Maintain your personal details and vehicle configuration to remain active in emergency dispatches.</p>
              </div>

              <form onSubmit={handleSaveProfile} className="space-y-6 max-w-xl">
                
                {profileMsg && (
                  <div className={`p-4 rounded-xl text-xs font-bold border ${
                    profileMsg.type === "success" 
                      ? "bg-emerald-50 border-emerald-200 text-emerald-800" 
                      : "bg-red-50 border-red-200 text-red-800"
                  }`}>
                    {profileMsg.text}
                  </div>
                )}

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 font-semibold text-xs">
                  {/* Name */}
                  <div className="space-y-1">
                    <label className="text-slate-700 block uppercase tracking-wide">Volunteer Name</label>
                    <input
                      type="text"
                      value={profileName}
                      onChange={(e) => setProfileName(e.target.value)}
                      className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl font-medium outline-none focus:bg-white focus:ring-2 focus:ring-emerald-500"
                      required
                    />
                  </div>

                  {/* Phone */}
                  <div className="space-y-1">
                    <label className="text-slate-700 block uppercase tracking-wide">Phone Number</label>
                    <input
                      type="tel"
                      value={profilePhone}
                      onChange={(e) => setProfilePhone(e.target.value)}
                      className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl font-medium outline-none focus:bg-white focus:ring-2 focus:ring-emerald-500"
                      required
                    />
                  </div>

                  {/* Village */}
                  <div className="space-y-1">
                    <label className="text-slate-700 block uppercase tracking-wide">Primary Village</label>
                    <input
                      type="text"
                      value={profileVillage}
                      onChange={(e) => setProfileVillage(e.target.value)}
                      className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl font-medium outline-none focus:bg-white focus:ring-2 focus:ring-emerald-500"
                      required
                    />
                  </div>

                  {/* District */}
                  <div className="space-y-1">
                    <label className="text-slate-700 block uppercase tracking-wide">District</label>
                    <input
                      type="text"
                      value={profileDistrict}
                      onChange={(e) => setProfileDistrict(e.target.value)}
                      className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl font-medium outline-none focus:bg-white focus:ring-2 focus:ring-emerald-500"
                      required
                    />
                  </div>

                  {/* Vehicle Type */}
                  <div className="space-y-1">
                    <label className="text-slate-700 block uppercase tracking-wide font-extrabold block">Vehicle Type</label>
                    <select
                      value={profileVehicleType}
                      onChange={(e) => setProfileVehicleType(e.target.value)}
                      className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl font-bold outline-none focus:bg-white focus:ring-2 focus:ring-emerald-500"
                    >
                      <option value="Auto Rickshaw">🛺 Auto Rickshaw</option>
                      <option value="Bolero SUV">🚙 Bolero SUV / Utility Vehicle</option>
                      <option value="Tractor Ambulance">🚜 Tractor Ambulance (Heavy Duty)</option>
                      <option value="E-Rickshaw">⚡ Electric Rickshaw</option>
                    </select>
                  </div>

                  {/* Vehicle Registration Plate */}
                  <div className="space-y-1">
                    <label className="text-slate-700 block uppercase tracking-wide">Vehicle Registration Number</label>
                    <input
                      type="text"
                      value={profileVehicleNumber}
                      onChange={(e) => setProfileVehicleNumber(e.target.value)}
                      placeholder="e.g. UP-61-AB-1234"
                      className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl font-medium uppercase outline-none focus:bg-white focus:ring-2 focus:ring-emerald-500"
                      required
                    />
                  </div>
                </div>

                <div className="pt-4 border-t border-slate-100 flex items-center justify-between">
                  <button
                    type="submit"
                    disabled={isSavingProfile}
                    className="px-6 py-3 bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold text-xs rounded-xl shadow-md hover:shadow-lg transition cursor-pointer uppercase flex items-center space-x-1"
                  >
                    {isSavingProfile ? (
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    ) : null}
                    <span>Save Changes & Vehicle Details</span>
                  </button>
                </div>
              </form>
            </div>
          )}
        </div>
      </div>

      {/* Cancellation Modal */}
      {showCancelModal && stats?.activeRide && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4">
          <div className="bg-white border border-slate-100 rounded-3xl max-w-md w-full p-6 shadow-2xl relative space-y-4 animate-in fade-in zoom-in duration-200">
            <button
              onClick={() => setShowCancelModal(false)}
              className="absolute right-4 top-4 p-1.5 text-slate-400 hover:text-slate-600 rounded-full hover:bg-slate-100"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="space-y-1">
              <h3 className="text-base font-black text-slate-900">Cancel Accepted Emergency Dispatch</h3>
              <p className="text-xs text-slate-500 font-medium">Please provide a reason. Cancellations are audited by the Gram Panchayat health committee.</p>
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
                    <Loader2 className="w-4 h-4 animate-spin" />
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
