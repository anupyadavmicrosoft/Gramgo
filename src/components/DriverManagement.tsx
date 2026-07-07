import React, { useState, useEffect } from "react";
import { 
  Search, ChevronLeft, ChevronRight, UserCheck, UserX, 
  Trash2, Edit, Eye, Loader2, ShieldAlert, FileText, 
  X, MapPin, Calendar, Coins, Clock, Check, AlertTriangle,
  UserPlus, Award, CheckCircle, XCircle, Phone, Star, ShieldCheck,
  TrendingUp, ArrowUpRight, ArrowUpDown, ArrowUp, ArrowDown
} from "lucide-react";
import Pagination from "./Pagination";

interface DriverManagementProps {
  token: string | null;
  onShowToast: (message: string, type: "success" | "error") => void;
  filters?: {
    dateStart: string;
    dateEnd: string;
    rideStatus: string;
    driverStatus: string;
    emergency: string;
    onlineOffline: string;
    paymentStatus: string;
    district: string;
    village: string;
    vehicleType: string;
  };
}

interface Driver {
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
  userStatus: "active" | "suspended";
  verificationStatus: "verified" | "pending" | "unverified";
  documentsCount: number;
  hasLicense: boolean;
  hasRc: boolean;
  hasInsurance: boolean;
  hasAadhaar?: boolean;
  hasPan?: boolean;
  hasVehicleImage?: boolean;
  hasProfileImage?: boolean;
  licenseDetails?: { number: string; verified: boolean };
  rcDetails?: { number: string; verified: boolean };
  insuranceDetails?: { number: string; verified: boolean };
  aadhaarDetails?: { number: string; verified: boolean };
  panDetails?: { number: string; verified: boolean };
  vehicleImageDetails?: { number: string; verified: boolean };
  profileImageDetails?: { number: string; verified: boolean };
  documents: Array<{
    id: string;
    docType: string;
    fileName: string;
    number?: string;
    verified: boolean;
    uploadedAt: number;
  }>;
  activeRide?: { id: string; patientName: string; status: string; destinationChc: string } | null;
  earnings: {
    totalTrips: number;
    basePayout: number;
    incentives: number;
    total: number;
  };
  approvalStatus?: "pending" | "approved" | "rejected";
  approvalNotes?: string;
  rejectionReason?: string;
}

interface EmergencyRide {
  id: string;
  patientName: string;
  patientPhone: string;
  emergencyType: string;
  priority: string;
  village: string;
  landmark: string;
  status: string;
  createdAt: number;
  destinationChc: string;
}

export default function DriverManagement({ token, onShowToast, filters }: DriverManagementProps) {
  // Database States
  const [drivers, setDrivers] = useState<Driver[]>([]);
  const [totalDrivers, setTotalDrivers] = useState(0);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [limit, setLimit] = useState(6);
  const [isLoading, setIsLoading] = useState(true);

  // Sorting States
  const [sortBy, setSortBy] = useState<string>("createdAt");
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("desc");

  // Search & Filter States
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [vehicleFilter, setVehicleFilter] = useState("all");
  const [verificationFilter, setVerificationFilter] = useState("all");
  const [approvalTab, setApprovalTab] = useState<"pending" | "approved" | "rejected">("pending");
  const [counts, setCounts] = useState({ pending: 0, approved: 0, rejected: 0 });

  // Create Driver Dialog
  const [isCreating, setIsCreating] = useState(false);
  const [isSavingDriver, setIsSavingDriver] = useState(false);
  const [createForm, setCreateForm] = useState({
    name: "",
    phone: "+91 ",
    email: "",
    password: "",
    vehicleType: "Auto Rickshaw",
    vehicleNumber: "",
    village: "",
    district: "Ghazipur",
    drivingLicenseNumber: "",
    rcNumber: "",
    insuranceNumber: ""
  });

  // Selected Driver Profile Slider/Modal
  const [selectedDriver, setSelectedDriver] = useState<Driver | null>(null);
  const [activeDriverTab, setActiveDriverTab] = useState<"details" | "verification" | "rides" | "earnings">("details");
  const [driverRides, setDriverRides] = useState<EmergencyRide[]>([]);
  const [isRidesLoading, setIsRidesLoading] = useState(false);
  const [decisionComment, setDecisionComment] = useState("");
  const [viewingDoc, setViewingDoc] = useState<{ title: string; file: string; id: string } | null>(null);

  useEffect(() => {
    if (selectedDriver) {
      setDecisionComment(selectedDriver.approvalNotes || selectedDriver.rejectionReason || "");
    } else {
      setDecisionComment("");
    }
  }, [selectedDriver]);

  // Edit Profile Mode
  const [isEditing, setIsEditing] = useState(false);
  const [editForm, setEditForm] = useState<Partial<Driver>>({});
  const [isUpdatingDriver, setIsUpdatingDriver] = useState(false);

  // Loading indicator for specific verify actions
  const [actionInProgress, setActionInProgress] = useState<string | null>(null);

  // Custom Confirmation Dialogs
  const [confirmDialog, setConfirmDialog] = useState<{
    type: "suspend" | "activate" | "delete";
    driver: Driver;
  } | null>(null);

  // Fetch Counts of pending/approved/rejected drivers
  const fetchCounts = async () => {
    if (!token) return;
    try {
      const res = await fetch(`/api/admin/drivers?all=true`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        const allDrvs: Driver[] = await res.json();
        const pending = allDrvs.filter(d => d.approvalStatus === "pending").length;
        const approved = allDrvs.filter(d => d.approvalStatus === "approved").length;
        const rejected = allDrvs.filter(d => d.approvalStatus === "rejected").length;
        setCounts({ pending, approved, rejected });
      }
    } catch (err) {
      console.error("Error fetching driver counts:", err);
    }
  };

  // Fetch Drivers initially and on changes
  useEffect(() => {
    if (token) {
      fetchDrivers();
      fetchCounts();
    }
  }, [token, page, statusFilter, vehicleFilter, verificationFilter, approvalTab, filters, limit, sortBy, sortOrder]);

  const fetchDrivers = async () => {
    setIsLoading(true);
    try {
      const params: any = {
        page: String(page),
        limit: String(limit),
        search: search,
        status: statusFilter,
        vehicleType: vehicleFilter,
        verification: verificationFilter,
        approvalStatus: approvalTab,
        sortBy: sortBy,
        sortOrder: sortOrder
      };

      if (filters) {
        if (filters.driverStatus !== "all") params.status = filters.driverStatus;
        if (filters.vehicleType !== "all") params.vehicleType = filters.vehicleType;
        if (filters.district !== "all") params.district = filters.district;
        if (filters.village !== "all") params.village = filters.village;
      }

      const query = new URLSearchParams(params).toString();

      const res = await fetch(`/api/admin/drivers?${query}`, {
        headers: { Authorization: `Bearer ${token}` }
      });

      if (res.ok) {
        const data = await res.json();
        setDrivers(data.drivers || []);
        setTotalDrivers(data.total || 0);
        setTotalPages(data.totalPages || 1);
      } else {
        const errorData = await res.json();
        onShowToast(errorData.error || "Failed to retrieve drivers database.", "error");
      }
    } catch (err) {
      console.error(err);
      onShowToast("Network connection error.", "error");
    } finally {
      setIsLoading(false);
    }
  };

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setPage(1);
    fetchDrivers();
  };

  const handleCreateDriverSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!createForm.name || !createForm.phone || !createForm.vehicleNumber || !createForm.village) {
      onShowToast("Please enter all required driver details.", "error");
      return;
    }

    setIsSavingDriver(true);
    try {
      const res = await fetch("/api/admin/drivers", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify(createForm)
      });

      if (res.ok) {
        onShowToast("Local Hero Driver successfully registered and added to active pool!", "success");
        setIsCreating(false);
        // Reset form
        setCreateForm({
          name: "",
          phone: "+91 ",
          email: "",
          password: "",
          vehicleType: "Auto Rickshaw",
          vehicleNumber: "",
          village: "",
          district: "Ghazipur",
          drivingLicenseNumber: "",
          rcNumber: "",
          insuranceNumber: ""
        });
        setPage(1);
        fetchDrivers();
      } else {
        const data = await res.json();
        onShowToast(data.error || "Failed to register driver.", "error");
      }
    } catch (err) {
      onShowToast("Server connection error.", "error");
    } finally {
      setIsSavingDriver(false);
    }
  };

  const handleUpdateDriverDetails = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedDriver) return;

    setIsUpdatingDriver(true);
    try {
      const res = await fetch(`/api/admin/drivers/${selectedDriver.id}/details`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify(editForm)
      });

      if (res.ok) {
        const data = await res.json();
        onShowToast("Driver details updated successfully.", "success");
        setIsEditing(false);
        
        // Update local detail state
        setSelectedDriver({
          ...selectedDriver,
          ...data.driver
        });

        // Refresh list
        fetchDrivers();
      } else {
        const data = await res.json();
        onShowToast(data.error || "Failed to update driver details.", "error");
      }
    } catch (err) {
      onShowToast("Network error updating driver.", "error");
    } finally {
      setIsUpdatingDriver(false);
    }
  };

  const handleToggleDriverStatusInList = async (driverId: string, newStatus: string) => {
    try {
      const res = await fetch(`/api/admin/drivers/${driverId}/status`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ status: newStatus })
      });

      if (res.ok) {
        onShowToast(`Driver state updated to ${newStatus.toUpperCase()}`, "success");
        fetchDrivers();
      } else {
        const data = await res.json();
        onShowToast(data.error || "Failed to update driver status.", "error");
      }
    } catch (err) {
      onShowToast("Network error updating driver status.", "error");
    }
  };

  const handleDownloadDoc = async (driverId: string, docType: string) => {
    try {
      const response = await fetch(`/api/admin/drivers/${driverId}/documents/${docType}/download`, {
        headers: {
          Authorization: `Bearer ${token}`
        }
      });
      if (!response.ok) {
        throw new Error("Failed to download document.");
      }
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      
      const ext = (docType === "vehicle_image" || docType === "profile_image") ? "jpg" : "pdf";
      a.download = `${docType}_document.${ext}`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);
      onShowToast("Document downloaded successfully.", "success");
    } catch (err) {
      onShowToast("Failed to download document.", "error");
    }
  };

  const handleDownloadAllDocs = async (driverId: string) => {
    try {
      const response = await fetch(`/api/admin/drivers/${driverId}/documents/download-all`, {
        headers: {
          Authorization: `Bearer ${token}`
        }
      });
      if (!response.ok) {
        throw new Error("Failed to download documents bundle.");
      }
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `driver_${driverId}_documents_bundle.txt`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);
      onShowToast("Document bundle downloaded successfully.", "success");
    } catch (err) {
      onShowToast("Failed to download documents bundle.", "error");
    }
  };

  const handleVerifyDocument = async (driverId: string, docType: string, verified: boolean) => {
    setActionInProgress(`${docType}-${verified ? "verify" : "reject"}`);
    try {
      const res = await fetch(`/api/admin/drivers/${driverId}/documents/${docType}/verify`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ verified })
      });

      if (res.ok) {
        onShowToast(`Document verification ${verified ? "approved" : "rejected"} successfully.`, "success");
        
        // Update selectedDriver locally
        if (selectedDriver) {
          const updatedDocs = selectedDriver.documents.map(d => {
            if (d.docType === docType) {
              return { ...d, verified };
            }
            return d;
          });

          const hasLicense = updatedDocs.some(d => d.docType === "license" && d.verified);
          const hasRc = updatedDocs.some(d => d.docType === "rc" && d.verified);
          const hasInsurance = updatedDocs.some(d => d.docType === "insurance" && d.verified);
          const hasAadhaar = updatedDocs.some(d => d.docType === "aadhaar" && d.verified);
          const hasPan = updatedDocs.some(d => d.docType === "pan" && d.verified);
          const hasVehicleImage = updatedDocs.some(d => d.docType === "vehicle_image" && d.verified);
          const hasProfileImage = updatedDocs.some(d => d.docType === "profile_image" && d.verified);
          const allSevenVerified = hasLicense && hasRc && hasInsurance && hasAadhaar && hasPan && hasVehicleImage && hasProfileImage;

          setSelectedDriver({
            ...selectedDriver,
            documents: updatedDocs,
            hasLicense,
            hasRc,
            hasInsurance,
            hasAadhaar,
            hasPan,
            hasVehicleImage,
            hasProfileImage,
            licenseDetails: { ...selectedDriver.licenseDetails, number: selectedDriver.licenseDetails?.number || "", verified: hasLicense },
            rcDetails: { ...selectedDriver.rcDetails, number: selectedDriver.rcDetails?.number || "", verified: hasRc },
            insuranceDetails: { ...selectedDriver.insuranceDetails, number: selectedDriver.insuranceDetails?.number || "", verified: hasInsurance },
            aadhaarDetails: { ...selectedDriver.aadhaarDetails, number: selectedDriver.aadhaarDetails?.number || "", verified: hasAadhaar },
            panDetails: { ...selectedDriver.panDetails, number: selectedDriver.panDetails?.number || "", verified: hasPan },
            vehicleImageDetails: { ...selectedDriver.vehicleImageDetails, number: selectedDriver.vehicleImageDetails?.number || "", verified: hasVehicleImage },
            profileImageDetails: { ...selectedDriver.profileImageDetails, number: selectedDriver.profileImageDetails?.number || "", verified: hasProfileImage },
            verificationStatus: allSevenVerified ? "verified" : updatedDocs.some(d => d.verified) ? "pending" : "unverified"
          });
        }
        fetchDrivers();
      } else {
        const data = await res.json();
        onShowToast(data.error || "Failed to change verification status.", "error");
      }
    } catch (err) {
      onShowToast("Network connection error.", "error");
    } finally {
      setActionInProgress(null);
    }
  };

  const handleApproveDriver = async () => {
    if (!selectedDriver) return;
    setActionInProgress("approve");
    try {
      const res = await fetch(`/api/admin/drivers/${selectedDriver.id}/approve`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ approvalNotes: decisionComment })
      });

      if (res.ok) {
        onShowToast(`Volunteer driver ${selectedDriver.name} approved successfully!`, "success");
        // Update local detail state and refetch lists/counts
        setSelectedDriver({
          ...selectedDriver,
          approvalStatus: "approved",
          approvalNotes: decisionComment || "Approved by Admin",
          rejectionReason: ""
        });
        fetchDrivers();
        fetchCounts();
      } else {
        const d = await res.json();
        onShowToast(d.error || "Failed to approve driver.", "error");
      }
    } catch (err) {
      onShowToast("Network error approving driver.", "error");
    } finally {
      setActionInProgress(null);
    }
  };

  const handleRejectDriver = async () => {
    if (!selectedDriver) return;
    if (!decisionComment.trim()) {
      onShowToast("Please enter a rejection reason explaining the decision.", "error");
      return;
    }
    setActionInProgress("reject");
    try {
      const res = await fetch(`/api/admin/drivers/${selectedDriver.id}/reject`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ rejectionReason: decisionComment })
      });

      if (res.ok) {
        onShowToast(`Volunteer driver ${selectedDriver.name} has been rejected and flagged.`, "success");
        setSelectedDriver({
          ...selectedDriver,
          approvalStatus: "rejected",
          rejectionReason: decisionComment || "Rejected by Admin",
          approvalNotes: ""
        });
        fetchDrivers();
        fetchCounts();
      } else {
        const d = await res.json();
        onShowToast(d.error || "Failed to reject driver.", "error");
      }
    } catch (err) {
      onShowToast("Network error rejecting driver.", "error");
    } finally {
      setActionInProgress(null);
    }
  };

  const handleUpdateRating = async (driverId: string, starCount: number) => {
    setActionInProgress(`rating-${starCount}`);
    try {
      const res = await fetch(`/api/admin/drivers/${driverId}/rating`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ rating: starCount })
      });

      if (res.ok) {
        onShowToast("Driver rating adjusted successfully.", "success");
        if (selectedDriver) {
          setSelectedDriver({
            ...selectedDriver,
            rating: starCount
          });
        }
        fetchDrivers();
      } else {
        const data = await res.json();
        onShowToast(data.error || "Failed to update driver rating.", "error");
      }
    } catch (err) {
      onShowToast("Connection error updating rating.", "error");
    } finally {
      setActionInProgress(null);
    }
  };

  const executeSuspendDriver = async (driverId: string) => {
    try {
      const res = await fetch(`/api/admin/drivers/${driverId}/suspend`, {
        method: "PUT",
        headers: { Authorization: `Bearer ${token}` }
      });

      if (res.ok) {
        onShowToast("Driver account suspended from active dispatcher system.", "success");
        setConfirmDialog(null);
        if (selectedDriver && selectedDriver.id === driverId) {
          setSelectedDriver({
            ...selectedDriver,
            userStatus: "suspended",
            status: "offline"
          });
        }
        fetchDrivers();
      } else {
        const data = await res.json();
        onShowToast(data.error || "Failed to suspend account.", "error");
      }
    } catch (err) {
      onShowToast("Network error suspending driver.", "error");
    }
  };

  const executeActivateDriver = async (driverId: string) => {
    try {
      const res = await fetch(`/api/admin/drivers/${driverId}/activate`, {
        method: "PUT",
        headers: { Authorization: `Bearer ${token}` }
      });

      if (res.ok) {
        onShowToast("Driver account fully activated and verified.", "success");
        setConfirmDialog(null);
        if (selectedDriver && selectedDriver.id === driverId) {
          setSelectedDriver({
            ...selectedDriver,
            userStatus: "active",
            status: "available"
          });
        }
        fetchDrivers();
      } else {
        const data = await res.json();
        onShowToast(data.error || "Failed to activate account.", "error");
      }
    } catch (err) {
      onShowToast("Network error activating driver.", "error");
    }
  };

  const executeDeleteDriver = async (driverId: string) => {
    try {
      const res = await fetch(`/api/admin/drivers/${driverId}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` }
      });

      if (res.ok) {
        onShowToast("Driver permanently deleted from system registry.", "success");
        setConfirmDialog(null);
        setSelectedDriver(null);
        fetchDrivers();
      } else {
        const data = await res.json();
        onShowToast(data.error || "Failed to delete account.", "error");
      }
    } catch (err) {
      onShowToast("Network error deleting driver.", "error");
    }
  };

  const fetchDriverRides = async (driverId: string) => {
    setIsRidesLoading(true);
    try {
      // Fetch rides where this driver is assigned
      const res = await fetch("/api/admin/bookings", {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        const allRides = await res.json();
        const filtered = allRides.filter((r: any) => r.driverId === driverId);
        setDriverRides(filtered);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setIsRidesLoading(false);
    }
  };

  const openDriverDetails = (driver: Driver) => {
    setSelectedDriver(driver);
    setActiveDriverTab("details");
    fetchDriverRides(driver.id);
  };

  const startEditProfile = (driver: Driver) => {
    setIsEditing(true);
    setEditForm({
      name: driver.name,
      phone: driver.phone,
      vehicleType: driver.vehicleType,
      vehicleNumber: driver.vehicleNumber,
      village: driver.village,
      district: driver.district
    });
  };

  const displayedDrivers = drivers;

  const handleSort = (field: string) => {
    if (sortBy === field) {
      setSortOrder(sortOrder === "asc" ? "desc" : "asc");
    } else {
      setSortBy(field);
      setSortOrder("asc");
    }
    setPage(1);
  };

  const renderSortIcon = (field: string) => {
    if (sortBy !== field) {
      return <ArrowUpDown className="w-3 h-3 ml-1 text-slate-400 inline-block transition-colors group-hover:text-slate-600" />;
    }
    return sortOrder === "asc" ? (
      <ArrowUp className="w-3 h-3 ml-1 text-emerald-600 inline-block font-black" />
    ) : (
      <ArrowDown className="w-3 h-3 ml-1 text-emerald-600 inline-block font-black" />
    );
  };

  return (
    <div className="space-y-6" id="driver-management-module">
      
      {/* Metrics Banner */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-gradient-to-br from-emerald-500 to-teal-600 rounded-3xl p-5 text-white shadow-md relative overflow-hidden">
          <div className="absolute right-0 bottom-0 translate-y-2 translate-x-2 opacity-10">
            <Award className="w-32 h-32" />
          </div>
          <p className="text-emerald-100 text-[11px] font-black uppercase tracking-widest">Active Pool size</p>
          <p className="text-3xl font-black mt-1">{totalDrivers}</p>
          <div className="flex items-center space-x-1.5 mt-3 text-[10px] font-bold text-emerald-50">
            <CheckCircle className="w-3 h-3 text-emerald-200" />
            <span>Panchayat Volunteer Network</span>
          </div>
        </div>

        <div className="bg-white border border-slate-100 rounded-3xl p-5 shadow-sm">
          <p className="text-slate-400 text-[11px] font-black uppercase tracking-widest">Verified Heroes</p>
          <p className="text-3xl font-black text-slate-800 mt-1">
            {drivers.filter(d => d.verificationStatus === "verified").length}
          </p>
          <div className="flex items-center space-x-1 mt-3 text-[10px] font-bold text-emerald-600">
            <ShieldCheck className="w-3.5 h-3.5" />
            <span>100% Security Compliant</span>
          </div>
        </div>

        <div className="bg-white border border-slate-100 rounded-3xl p-5 shadow-sm">
          <p className="text-slate-400 text-[11px] font-black uppercase tracking-widest">Duty Status Today</p>
          <p className="text-3xl font-black text-slate-800 mt-1">
            {drivers.filter(d => d.status === "available").length} <span className="text-xs font-semibold text-slate-400">Online</span>
          </p>
          <div className="flex items-center space-x-1.5 mt-3 text-[10px] font-bold text-slate-500">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
            <span>Ready for dispatching</span>
          </div>
        </div>

        <div className="bg-white border border-slate-100 rounded-3xl p-5 shadow-sm">
          <p className="text-slate-400 text-[11px] font-black uppercase tracking-widest">Pending Checkups</p>
          <p className="text-3xl font-black text-amber-600 mt-1">
            {drivers.filter(d => d.verificationStatus === "pending" || d.verificationStatus === "unverified").length}
          </p>
          <div className="flex items-center space-x-1 mt-3 text-[10px] font-bold text-amber-600">
            <AlertTriangle className="w-3.5 h-3.5" />
            <span>Awaiting manual audit</span>
          </div>
        </div>
      </div>

      {/* Driver Controls Area */}
      <div className="bg-white border border-slate-100 rounded-3xl p-6 space-y-6 shadow-sm">
        
        {/* Top bar with filters and create button */}
        <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4">
          <div className="space-y-1">
            <h3 className="text-base font-black text-slate-900">Volunteer Driver Audits</h3>
            <p className="text-xs text-slate-400">Review vehicle registries, verification document logs, and assign payouts.</p>
          </div>

          <div className="flex flex-wrap items-center gap-2 w-full lg:w-auto">
            <form onSubmit={handleSearchSubmit} className="relative flex-grow sm:flex-none">
              <Search className="absolute left-3 top-2.5 w-4 h-4 text-slate-400" />
              <input
                type="text"
                placeholder="Search driver/vehicle..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full sm:w-56 pl-9 pr-4 py-2 bg-slate-50 border border-slate-100 rounded-xl text-xs font-bold focus:bg-white focus:outline-none transition"
              />
            </form>

            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="px-3 py-2 bg-slate-50 border border-slate-100 rounded-xl text-xs font-bold focus:outline-none cursor-pointer"
            >
              <option value="all">All States</option>
              <option value="available">Available ⚡</option>
              <option value="busy">Busy 🚙</option>
              <option value="offline">Offline 🛑</option>
            </select>

            <select
              value={vehicleFilter}
              onChange={(e) => setVehicleFilter(e.target.value)}
              className="px-3 py-2 bg-slate-50 border border-slate-100 rounded-xl text-xs font-bold focus:outline-none cursor-pointer"
            >
              <option value="all">All Vehicles</option>
              <option value="Auto Rickshaw">Auto Rickshaw</option>
              <option value="Bolero SUV">Bolero SUV</option>
              <option value="Tractor Ambulance">Tractor Ambulance</option>
              <option value="E-Rickshaw">E-Rickshaw</option>
            </select>

            <select
              value={verificationFilter}
              onChange={(e) => setVerificationFilter(e.target.value)}
              className="px-3 py-2 bg-slate-50 border border-slate-100 rounded-xl text-xs font-bold focus:outline-none cursor-pointer"
            >
              <option value="all">All Audits</option>
              <option value="verified">Verified 🟢</option>
              <option value="pending">Pending 🟡</option>
              <option value="unverified">Unverified 🔴</option>
            </select>

            <button
              onClick={() => setIsCreating(true)}
              className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-extrabold flex items-center space-x-1.5 transition uppercase tracking-wider"
            >
              <UserPlus className="w-4 h-4" />
              <span>Add Driver</span>
            </button>
          </div>
        </div>

        {/* Segmented Approval Status Tabs */}
        <div className="flex border-b border-slate-100 pb-1" id="approval-tabs-container">
          <button
            onClick={() => { setApprovalTab("pending"); setPage(1); }}
            className={`flex items-center space-x-2 pb-3 px-4 text-xs font-black uppercase tracking-wider transition border-b-2 cursor-pointer ${
              approvalTab === "pending"
                ? "border-amber-500 text-amber-600 font-extrabold"
                : "border-transparent text-slate-400 hover:text-slate-600"
            }`}
          >
            <span className="w-2 h-2 rounded-full bg-amber-500"></span>
            <span>Pending Approval</span>
            <span className={`px-1.5 py-0.5 rounded text-[10px] ${
              approvalTab === "pending" ? "bg-amber-100 text-amber-800" : "bg-slate-100 text-slate-600"
            }`}>
              {counts.pending}
            </span>
          </button>

          <button
            onClick={() => { setApprovalTab("approved"); setPage(1); }}
            className={`flex items-center space-x-2 pb-3 px-4 text-xs font-black uppercase tracking-wider transition border-b-2 cursor-pointer ${
              approvalTab === "approved"
                ? "border-emerald-600 text-emerald-700 font-extrabold"
                : "border-transparent text-slate-400 hover:text-slate-600"
            }`}
          >
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
            <span>Approved Drivers</span>
            <span className={`px-1.5 py-0.5 rounded text-[10px] ${
              approvalTab === "approved" ? "bg-emerald-100 text-emerald-800" : "bg-slate-100 text-slate-600"
            }`}>
              {counts.approved}
            </span>
          </button>

          <button
            onClick={() => { setApprovalTab("rejected"); setPage(1); }}
            className={`flex items-center space-x-2 pb-3 px-4 text-xs font-black uppercase tracking-wider transition border-b-2 cursor-pointer ${
              approvalTab === "rejected"
                ? "border-rose-600 text-rose-700 font-extrabold"
                : "border-transparent text-slate-400 hover:text-slate-600"
            }`}
          >
            <span className="w-2 h-2 rounded-full bg-rose-500"></span>
            <span>Rejected Drivers</span>
            <span className={`px-1.5 py-0.5 rounded text-[10px] ${
              approvalTab === "rejected" ? "bg-rose-100 text-rose-800" : "bg-slate-100 text-slate-600"
            }`}>
              {counts.rejected}
            </span>
          </button>
        </div>

        {/* Sorting Controls Bar */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 bg-slate-50 border border-slate-100 rounded-2xl text-xs">
          <span className="font-extrabold text-slate-500 uppercase tracking-wide text-[10px]">Sort Volunteer Records:</span>
          <div className="flex flex-wrap items-center gap-2">
            {[
              { field: "name", label: "Name" },
              { field: "rating", label: "Rating" },
              { field: "completedTrips", label: "Trips" },
              { field: "earnings", label: "Earnings" },
              { field: "createdAt", label: "Joined Date" }
            ].map(col => {
              const active = sortBy === col.field;
              return (
                <button
                  key={col.field}
                  onClick={() => handleSort(col.field)}
                  className={`px-3 py-1.5 rounded-lg border text-[11px] font-bold flex items-center gap-1.5 cursor-pointer transition ${
                    active 
                      ? "bg-slate-900 text-white border-slate-900 shadow-sm" 
                      : "bg-white hover:bg-slate-50 text-slate-600 border-slate-200"
                  }`}
                >
                  <span>{col.label}</span>
                  {active ? (
                    sortOrder === "asc" ? <ArrowUp className="w-3.5 h-3.5 text-emerald-400" /> : <ArrowDown className="w-3.5 h-3.5 text-emerald-400" />
                  ) : (
                    <ArrowUpDown className="w-3 h-3 text-slate-400" />
                  )}
                </button>
              );
            })}
          </div>
        </div>

        {/* Driver Cards Grid */}
        {isLoading ? (
          <div className="py-24 text-center">
            <Loader2 className="w-8 h-8 text-emerald-600 animate-spin mx-auto mb-2" />
            <span className="text-xs text-slate-400 font-bold">Accessing secure driver datastore...</span>
          </div>
        ) : displayedDrivers.length === 0 ? (
          <div className="py-16 text-center border border-dashed border-slate-100 rounded-2xl">
            <AlertTriangle className="w-10 h-10 text-amber-500 mx-auto mb-3" />
            <h4 className="text-sm font-black text-slate-800">No Volunteer Drivers Found</h4>
            <p className="text-xs text-slate-400 mt-1 max-w-md mx-auto">Try broadening your search keywords or choosing different status and vehicle filters.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
            {displayedDrivers.map(d => (
              <div 
                key={d.id} 
                className={`bg-white border rounded-3xl p-5 space-y-4 shadow-sm hover:shadow transition relative flex flex-col justify-between ${
                  d.userStatus === "suspended" ? "border-rose-100 bg-rose-50/5" : "border-slate-100 hover:border-emerald-100"
                }`}
              >
                {/* Header Profile Line */}
                <div className="flex items-start justify-between">
                  <div className="space-y-1">
                    <div className="flex items-center space-x-1.5">
                      <span className="font-extrabold text-slate-900 block leading-tight">{d.name}</span>
                      {d.userStatus === "suspended" && (
                        <span className="px-1.5 py-0.5 bg-red-100 text-red-700 rounded text-[9px] font-black uppercase tracking-wider">
                          Suspended
                        </span>
                      )}
                    </div>
                    <div className="flex items-center space-x-1 text-[10px] text-slate-400 font-semibold">
                      <MapPin className="w-3 h-3 text-slate-400" />
                      <span>{d.village}, {d.district}</span>
                    </div>
                  </div>

                  <div className="flex flex-col items-end space-y-1">
                    <select
                      value={d.status}
                      disabled={d.userStatus === "suspended"}
                      onChange={(e) => handleToggleDriverStatusInList(d.id, e.target.value)}
                      className={`px-2.5 py-0.5 border rounded-lg text-[9px] font-black cursor-pointer uppercase ${
                        d.status === "available" 
                          ? "bg-emerald-50 text-emerald-800 border-emerald-200" 
                          : d.status === "busy"
                          ? "bg-amber-50 text-amber-800 border-amber-200"
                          : "bg-slate-100 text-slate-600 border-slate-200"
                      }`}
                    >
                      <option value="available">Available</option>
                      <option value="busy">Busy</option>
                      <option value="offline">Offline</option>
                    </select>
                    
                    <div className="flex items-center text-[10px] font-bold text-amber-500">
                      <Star className="w-3 h-3 fill-amber-400 text-amber-500 mr-0.5" />
                      <span>{d.rating.toFixed(1)}</span>
                    </div>
                  </div>
                </div>

                {/* Vehicle Details */}
                <div className="bg-slate-50/60 p-3 rounded-2xl border border-slate-100 text-[10px] space-y-1 font-bold">
                  <div className="flex justify-between">
                    <span className="text-slate-400 uppercase tracking-wider">Vehicle Type</span>
                    <span className="text-slate-800">{d.vehicleType}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400 uppercase tracking-wider font-semibold">Plate Registration</span>
                    <span className="text-slate-900 font-mono text-[11px] font-black">{d.vehicleNumber}</span>
                  </div>
                </div>

                {/* Audit Checklist (Driving License, RC, Insurance) */}
                <div className="space-y-1.5 pt-1">
                  <div className="flex items-center justify-between text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                    <span>Audit Checklist</span>
                    <span className={`px-1.5 py-0.2 rounded font-black text-[9px] uppercase ${
                      d.verificationStatus === "verified" 
                        ? "bg-emerald-50 text-emerald-700" 
                        : d.verificationStatus === "pending"
                        ? "bg-amber-50 text-amber-700"
                        : "bg-rose-50 text-rose-700"
                    }`}>
                      {d.verificationStatus}
                    </span>
                  </div>
                  
                  <div className="grid grid-cols-3 gap-1.5">
                    <div className={`p-2 rounded-xl border text-center font-bold text-[9px] ${
                      d.hasLicense 
                        ? "bg-emerald-50/50 border-emerald-100 text-emerald-800" 
                        : "bg-slate-50 border-slate-100 text-slate-400"
                    }`}>
                      <p className="uppercase text-[8px] tracking-tight">License</p>
                      <span className="mt-1 block font-black">{d.hasLicense ? "VERIFIED" : "PENDING"}</span>
                    </div>

                    <div className={`p-2 rounded-xl border text-center font-bold text-[9px] ${
                      d.hasRc 
                        ? "bg-emerald-50/50 border-emerald-100 text-emerald-800" 
                        : "bg-slate-50 border-slate-100 text-slate-400"
                    }`}>
                      <p className="uppercase text-[8px] tracking-tight">RC Card</p>
                      <span className="mt-1 block font-black">{d.hasRc ? "VERIFIED" : "PENDING"}</span>
                    </div>

                    <div className={`p-2 rounded-xl border text-center font-bold text-[9px] ${
                      d.hasInsurance 
                        ? "bg-emerald-50/50 border-emerald-100 text-emerald-800" 
                        : "bg-slate-50 border-slate-100 text-slate-400"
                    }`}>
                      <p className="uppercase text-[8px] tracking-tight">Insurance</p>
                      <span className="mt-1 block font-black">{d.hasInsurance ? "VERIFIED" : "PENDING"}</span>
                    </div>
                  </div>
                </div>

                {/* Approval Notes / Rejection Reason on Card */}
                {d.approvalStatus === "approved" && d.approvalNotes && (
                  <div className="bg-emerald-50/30 border border-emerald-100 rounded-2xl p-3 text-[10px] space-y-0.5">
                    <span className="text-emerald-800 font-extrabold uppercase tracking-wide block">Approval Note:</span>
                    <span className="text-slate-600 block italic">"{d.approvalNotes}"</span>
                  </div>
                )}
                {d.approvalStatus === "rejected" && d.rejectionReason && (
                  <div className="bg-rose-50/30 border border-rose-100 rounded-2xl p-3 text-[10px] space-y-0.5">
                    <span className="text-rose-800 font-extrabold uppercase tracking-wide block">Rejection Reason:</span>
                    <span className="text-slate-600 block italic">"{d.rejectionReason}"</span>
                  </div>
                )}
                {d.approvalStatus === "pending" && (
                  <div className="bg-amber-50/30 border border-amber-100 rounded-2xl p-3 text-[10px] space-y-0.5">
                    <span className="text-amber-800 font-extrabold uppercase tracking-wide block">Status: Pending Verification</span>
                    <span className="text-slate-500 block">Requires document audits and admin approval signature.</span>
                  </div>
                )}

                {/* Earnings & Trips */}
                <div className="flex items-center justify-between text-[11px] pt-2 border-t border-slate-50 font-bold text-slate-500">
                  <span>Completed Trips: <strong className="text-slate-900 text-xs">{d.completedTrips}</strong></span>
                  <div className="flex items-center space-x-1">
                    <Coins className="w-3.5 h-3.5 text-emerald-600" />
                    <span>Subsidy Earned: <strong className="text-emerald-600 text-xs">₹{d.earnings.total}</strong></span>
                  </div>
                </div>

                {/* Card CTA Buttons */}
                <div className="flex gap-2 pt-2 mt-auto">
                  <button
                    onClick={() => openDriverDetails(d)}
                    className="flex-1 py-2.5 bg-slate-50 hover:bg-slate-100 border border-slate-200 text-slate-600 hover:text-slate-900 rounded-xl text-[10px] font-black uppercase transition flex items-center justify-center space-x-1 cursor-pointer"
                  >
                    <Eye className="w-3.5 h-3.5" />
                    <span>Verify & View Profile</span>
                  </button>

                  <a
                    href={`tel:${d.phone}`}
                    className="p-2.5 bg-emerald-50 hover:bg-emerald-100 border border-emerald-100 text-emerald-700 rounded-xl transition flex items-center justify-center cursor-pointer"
                    title="Direct Call Driver"
                  >
                    <Phone className="w-3.5 h-3.5" />
                  </a>
                </div>

              </div>
            ))}
          </div>
        )}

        {/* Pagination Controls */}
        <Pagination
          id="driver-management-pagination"
          page={page}
          totalPages={totalPages}
          totalItems={totalDrivers}
          limit={limit}
          onPageChange={setPage}
          onLimitChange={setLimit}
        />

      </div>

      {/* CREATE DRIVER MODAL DIALOG */}
      {isCreating && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4 overflow-y-auto">
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 space-y-6 shadow-2xl relative my-8 animate-scale-up">
            <button 
              onClick={() => setIsCreating(false)}
              className="absolute right-4 top-4 p-1.5 text-slate-400 hover:text-slate-600 hover:bg-slate-50 rounded-full transition cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>

            <div>
              <h3 className="text-base font-black text-slate-900">Add New Volunteer Driver</h3>
              <p className="text-xs text-slate-400 mt-0.5">Register a trusted local hero into the GramGo emergency responder network.</p>
            </div>

            <form onSubmit={handleCreateDriverSubmit} className="space-y-4 text-xs font-bold">
              
              {/* Step 1: Personal Details */}
              <div className="space-y-3">
                <span className="text-[10px] text-slate-400 uppercase tracking-wider block font-black border-b border-slate-50 pb-1">
                  1. Personal Information
                </span>
                
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <label className="text-slate-500">Full Name *</label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. Ramesh Yadav"
                      value={createForm.name}
                      onChange={(e) => setCreateForm({ ...createForm, name: e.target.value })}
                      className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:bg-white"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-slate-500">Mobile Phone *</label>
                    <input
                      type="text"
                      required
                      placeholder="+91 9876543210"
                      value={createForm.phone}
                      onChange={(e) => setCreateForm({ ...createForm, phone: e.target.value })}
                      className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:bg-white font-mono"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <label className="text-slate-500">Email (Optional)</label>
                    <input
                      type="email"
                      placeholder="e.g. ramesh@gramgo.org"
                      value={createForm.email}
                      onChange={(e) => setCreateForm({ ...createForm, email: e.target.value })}
                      className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:bg-white"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-slate-500">Login Password (Optional)</label>
                    <input
                      type="password"
                      placeholder="Default is driver123"
                      value={createForm.password}
                      onChange={(e) => setCreateForm({ ...createForm, password: e.target.value })}
                      className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:bg-white"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <label className="text-slate-500">Assigned Village *</label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. Sherpur"
                      value={createForm.village}
                      onChange={(e) => setCreateForm({ ...createForm, village: e.target.value })}
                      className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:bg-white"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-slate-500">District</label>
                    <input
                      type="text"
                      value={createForm.district}
                      disabled
                      className="w-full p-2.5 bg-slate-100 border border-slate-200 text-slate-500 rounded-xl outline-none cursor-not-allowed"
                    />
                  </div>
                </div>
              </div>

              {/* Step 2: Vehicle details */}
              <div className="space-y-3 pt-2">
                <span className="text-[10px] text-slate-400 uppercase tracking-wider block font-black border-b border-slate-50 pb-1">
                  2. Vehicle Credentials
                </span>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <label className="text-slate-500">Vehicle Category *</label>
                    <select
                      value={createForm.vehicleType}
                      onChange={(e) => setCreateForm({ ...createForm, vehicleType: e.target.value })}
                      className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:bg-white font-bold cursor-pointer"
                    >
                      <option value="Auto Rickshaw">Auto Rickshaw</option>
                      <option value="Bolero SUV">Bolero SUV</option>
                      <option value="Tractor Ambulance">Tractor Ambulance</option>
                      <option value="E-Rickshaw">E-Rickshaw</option>
                    </select>
                  </div>

                  <div className="space-y-1">
                    <label className="text-slate-500">Registration Plate Number *</label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. UP-61-AB-1234"
                      value={createForm.vehicleNumber}
                      onChange={(e) => setCreateForm({ ...createForm, vehicleNumber: e.target.value })}
                      className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:bg-white font-mono uppercase"
                    />
                  </div>
                </div>
              </div>

              {/* Step 3: Security documents */}
              <div className="space-y-3 pt-2">
                <span className="text-[10px] text-slate-400 uppercase tracking-wider block font-black border-b border-slate-50 pb-1">
                  3. Security Documents for Audits
                </span>

                <div className="grid grid-cols-3 gap-3">
                  <div className="space-y-1">
                    <label className="text-[10px] text-slate-500">Driving License #</label>
                    <input
                      type="text"
                      placeholder="DL-XXXXXXXX"
                      value={createForm.drivingLicenseNumber}
                      onChange={(e) => setCreateForm({ ...createForm, drivingLicenseNumber: e.target.value })}
                      className="w-full p-2 bg-slate-50 border border-slate-200 rounded-lg outline-none focus:bg-white font-mono"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-[10px] text-slate-500">Vehicle RC Card #</label>
                    <input
                      type="text"
                      placeholder="RC-XXXXXXXX"
                      value={createForm.rcNumber}
                      onChange={(e) => setCreateForm({ ...createForm, rcNumber: e.target.value })}
                      className="w-full p-2 bg-slate-50 border border-slate-200 rounded-lg outline-none focus:bg-white font-mono"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-[10px] text-slate-500">Insurance ID #</label>
                    <input
                      type="text"
                      placeholder="INS-XXXXXXX"
                      value={createForm.insuranceNumber}
                      onChange={(e) => setCreateForm({ ...createForm, insuranceNumber: e.target.value })}
                      className="w-full p-2 bg-slate-50 border border-slate-200 rounded-lg outline-none focus:bg-white font-mono"
                    />
                  </div>
                </div>
              </div>

              <div className="flex gap-3 pt-4">
                <button
                  type="button"
                  onClick={() => setIsCreating(false)}
                  className="flex-1 py-2.5 bg-slate-50 hover:bg-slate-100 border border-slate-200 text-slate-600 hover:text-slate-800 rounded-xl font-extrabold uppercase transition cursor-pointer"
                >
                  Cancel
                </button>
                
                <button
                  type="submit"
                  disabled={isSavingDriver}
                  className="flex-1 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-extrabold uppercase transition disabled:opacity-40 flex items-center justify-center space-x-1.5 cursor-pointer"
                >
                  {isSavingDriver && <Loader2 className="w-4 h-4 animate-spin" />}
                  <span>Register Volunteer</span>
                </button>
              </div>

            </form>
          </div>
        </div>
      )}

      {/* DETAILED DRIVER PROFILE SLIDEOVER/MODAL */}
      {selectedDriver && (
        <div className="fixed inset-0 z-50 flex items-center justify-end bg-slate-900/60 backdrop-blur-sm p-4">
          <div className="bg-white h-full max-w-xl w-full rounded-l-3xl p-6 shadow-2xl relative flex flex-col justify-between overflow-y-auto animate-slide-in">
            <button 
              onClick={() => setSelectedDriver(null)}
              className="absolute right-4 top-4 p-1.5 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-full transition cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>

            <div className="space-y-5 flex-grow">
              
              {/* Header profile info */}
              <div className="flex items-start space-x-4">
                <div className="w-14 h-14 rounded-2xl bg-emerald-100 text-emerald-800 font-black text-xl flex items-center justify-center">
                  {selectedDriver.name.charAt(0)}
                </div>
                
                <div className="space-y-1">
                  <div className="flex items-center space-x-1.5">
                    <h3 className="text-base font-black text-slate-900">{selectedDriver.name}</h3>
                    <span className={`px-2 py-0.5 rounded text-[8px] font-black uppercase tracking-widest ${
                      selectedDriver.userStatus === "active" ? "bg-emerald-50 text-emerald-700" : "bg-rose-50 text-rose-700"
                    }`}>
                      {selectedDriver.userStatus}
                    </span>
                  </div>
                  
                  <p className="text-xs text-slate-400 font-bold">{selectedDriver.phone} • {selectedDriver.village}</p>
                  
                  <div className="flex items-center space-x-1 pt-0.5">
                    {[1, 2, 3, 4, 5].map(star => (
                      <button
                        key={star}
                        onClick={() => handleUpdateRating(selectedDriver.id, star)}
                        disabled={actionInProgress !== null}
                        className="focus:outline-none cursor-pointer"
                      >
                        <Star className={`w-4 h-4 ${
                          star <= Math.round(selectedDriver.rating) 
                            ? "fill-amber-400 text-amber-500" 
                            : "text-slate-200 hover:text-amber-300"
                        }`} />
                      </button>
                    ))}
                    <span className="text-xs text-slate-500 font-bold ml-1">★ {selectedDriver.rating.toFixed(1)}</span>
                  </div>
                </div>
              </div>

              {/* Section selector tabs */}
              <div className="flex border-b border-slate-100">
                <button
                  onClick={() => setActiveDriverTab("details")}
                  className={`flex-1 py-2 text-xs font-extrabold uppercase transition border-b-2 ${
                    activeDriverTab === "details" ? "border-emerald-600 text-emerald-700" : "border-transparent text-slate-400 hover:text-slate-600"
                  }`}
                >
                  Overview
                </button>
                <button
                  onClick={() => setActiveDriverTab("verification")}
                  className={`flex-1 py-2 text-xs font-extrabold uppercase transition border-b-2 ${
                    activeDriverTab === "verification" ? "border-emerald-600 text-emerald-700" : "border-transparent text-slate-400 hover:text-slate-600"
                  }`}
                >
                  Documents Verification
                </button>
                <button
                  onClick={() => setActiveDriverTab("rides")}
                  className={`flex-1 py-2 text-xs font-extrabold uppercase transition border-b-2 ${
                    activeDriverTab === "rides" ? "border-emerald-600 text-emerald-700" : "border-transparent text-slate-400 hover:text-slate-600"
                  }`}
                >
                  Ride History
                </button>
                <button
                  onClick={() => setActiveDriverTab("earnings")}
                  className={`flex-1 py-2 text-xs font-extrabold uppercase transition border-b-2 ${
                    activeDriverTab === "earnings" ? "border-emerald-600 text-emerald-700" : "border-transparent text-slate-400 hover:text-slate-600"
                  }`}
                >
                  Earnings
                </button>
              </div>

              {/* Tab Content: OVERVIEW & CREDENTIALS */}
              {activeDriverTab === "details" && (
                <div className="space-y-4 pt-1 text-xs">
                  
                  {isEditing ? (
                    <form onSubmit={handleUpdateDriverDetails} className="space-y-4 font-bold bg-slate-50/50 p-4 rounded-2xl border border-slate-100">
                      <div className="space-y-1">
                        <label className="text-slate-500">Volunteer Name</label>
                        <input
                          type="text"
                          required
                          value={editForm.name || ""}
                          onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
                          className="w-full p-2.5 bg-white border border-slate-200 rounded-xl outline-none"
                        />
                      </div>

                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-1">
                          <label className="text-slate-500">Phone Mobile</label>
                          <input
                            type="text"
                            required
                            value={editForm.phone || ""}
                            onChange={(e) => setEditForm({ ...editForm, phone: e.target.value })}
                            className="w-full p-2.5 bg-white border border-slate-200 rounded-xl outline-none font-mono"
                          />
                        </div>
                        <div className="space-y-1">
                          <label className="text-slate-500">Village</label>
                          <input
                            type="text"
                            required
                            value={editForm.village || ""}
                            onChange={(e) => setEditForm({ ...editForm, village: e.target.value })}
                            className="w-full p-2.5 bg-white border border-slate-200 rounded-xl outline-none"
                          />
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-1">
                          <label className="text-slate-500">Vehicle Category</label>
                          <select
                            value={editForm.vehicleType || "Auto Rickshaw"}
                            onChange={(e) => setEditForm({ ...editForm, vehicleType: e.target.value })}
                            className="w-full p-2.5 bg-white border border-slate-200 rounded-xl outline-none font-bold"
                          >
                            <option value="Auto Rickshaw">Auto Rickshaw</option>
                            <option value="Bolero SUV">Bolero SUV</option>
                            <option value="Tractor Ambulance">Tractor Ambulance</option>
                            <option value="E-Rickshaw">E-Rickshaw</option>
                          </select>
                        </div>
                        <div className="space-y-1">
                          <label className="text-slate-500">Plate Number</label>
                          <input
                            type="text"
                            required
                            value={editForm.vehicleNumber || ""}
                            onChange={(e) => setEditForm({ ...editForm, vehicleNumber: e.target.value })}
                            className="w-full p-2.5 bg-white border border-slate-200 rounded-xl outline-none font-mono uppercase"
                          />
                        </div>
                      </div>

                      <div className="flex gap-2.5 pt-2">
                        <button
                          type="button"
                          onClick={() => setIsEditing(false)}
                          className="flex-1 py-2 bg-slate-200 text-slate-700 hover:bg-slate-300 rounded-xl transition font-extrabold uppercase"
                        >
                          Cancel
                        </button>
                        <button
                          type="submit"
                          disabled={isUpdatingDriver}
                          className="flex-1 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl transition font-extrabold uppercase flex items-center justify-center space-x-1"
                        >
                          {isUpdatingDriver && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                          <span>Save Changes</span>
                        </button>
                      </div>
                    </form>
                  ) : (
                    <div className="space-y-4">
                      
                      {/* Driver & Vehicle Static Info Card */}
                      <div className="bg-slate-50/60 p-4 rounded-3xl border border-slate-100 space-y-4 font-bold">
                        <div className="flex justify-between items-center pb-2 border-b border-slate-100">
                          <span className="text-xs font-black text-slate-800">Vehicle Registry Registry</span>
                          <button
                            onClick={() => startEditProfile(selectedDriver)}
                            className="px-3 py-1 bg-slate-200/80 hover:bg-slate-200 text-slate-600 rounded-lg text-[10px] font-black uppercase flex items-center space-x-1.5 transition"
                          >
                            <Edit className="w-3 h-3" />
                            <span>Modify Fields</span>
                          </button>
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                          <div>
                            <span className="text-slate-400 text-[10px] uppercase block">Vehicle Category</span>
                            <span className="text-slate-800 text-sm block mt-0.5">{selectedDriver.vehicleType}</span>
                          </div>
                          <div>
                            <span className="text-slate-400 text-[10px] uppercase block">Plate Number</span>
                            <span className="text-slate-800 font-mono text-sm block mt-0.5">{selectedDriver.vehicleNumber}</span>
                          </div>
                          <div>
                            <span className="text-slate-400 text-[10px] uppercase block">District Base</span>
                            <span className="text-slate-800 text-sm block mt-0.5">{selectedDriver.district}</span>
                          </div>
                          <div>
                            <span className="text-slate-400 text-[10px] uppercase block">Current Duty State</span>
                            <span className={`px-2 py-0.5 text-[9px] rounded-full inline-block mt-1 font-black uppercase ${
                              selectedDriver.status === "available" ? "bg-emerald-50 text-emerald-700" : "bg-slate-100 text-slate-500"
                            }`}>
                              {selectedDriver.status}
                            </span>
                          </div>
                        </div>
                      </div>

                      {/* Active dispatcher live status */}
                      {selectedDriver.activeRide ? (
                        <div className="bg-amber-50 border border-amber-100 rounded-3xl p-4 space-y-2 font-bold">
                          <div className="flex items-center space-x-1.5 text-amber-800">
                            <Clock className="w-4 h-4 animate-spin" />
                            <span className="text-xs font-black uppercase">Live Emergency Dispatch in Progress</span>
                          </div>
                          <p className="text-[11px] text-slate-600">
                            Currently en-route with patient <strong className="text-slate-800">{selectedDriver.activeRide.patientName}</strong> to <strong className="text-slate-800">{selectedDriver.activeRide.destinationChc}</strong>.
                          </p>
                        </div>
                      ) : (
                        <div className="bg-emerald-50/50 border border-emerald-100 rounded-3xl p-4 flex items-center space-x-2.5 text-emerald-800 font-bold">
                          <CheckCircle className="w-5 h-5 text-emerald-600" />
                          <div>
                            <p className="text-xs font-black uppercase">No Active Dispatch</p>
                            <p className="text-[10px] text-slate-400 font-normal">Volunteer is available to receive emergency calls from the Panchayat Control Room.</p>
                          </div>
                        </div>
                      )}

                    </div>
                  )}

                </div>
              )}

              {/* Tab Content: DOCUMENTS SECURITY VERIFICATION */}
              {activeDriverTab === "verification" && (
                <div className="space-y-4 pt-1 text-xs font-bold">
                  
                  <div className="flex items-center space-x-1.5 bg-slate-50 p-3 rounded-2xl border border-slate-100 text-slate-600 text-[11px]">
                    <ShieldAlert className="w-4 h-4 text-emerald-600 flex-shrink-0" />
                    <span>Control room officers are legally required to audit Driving Licenses, vehicle Registration Certificates, and active Insurance policies before dispatches.</span>
                  </div>

                  <div className="flex justify-between items-center bg-emerald-50/50 p-4 rounded-3xl border border-emerald-100">
                    <div>
                      <h4 className="text-emerald-900 text-xs font-black uppercase">Compliance Documents Archive</h4>
                      <p className="text-[10px] text-emerald-700 font-medium">Verify, audit, and batch download compliance documents.</p>
                    </div>
                    <button
                      type="button"
                      onClick={() => handleDownloadAllDocs(selectedDriver.id)}
                      className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-[10px] font-black uppercase flex items-center space-x-1.5 transition cursor-pointer shadow-sm"
                    >
                      <FileText className="w-3.5 h-3.5" />
                      <span>Download Bundle</span>
                    </button>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    
                    {/* DRIVING LICENSE CARD */}
                    <div className="p-4 border border-slate-100 rounded-2xl space-y-3 bg-white hover:border-slate-200 transition flex flex-col justify-between">
                      <div className="space-y-3">
                        <div className="flex justify-between items-start">
                          <div>
                            <p className="text-[10px] text-slate-400 uppercase tracking-wider font-extrabold">Requirement 1</p>
                            <h4 className="text-slate-800 text-xs font-extrabold mt-0.5">Commercial Driving License (DL)</h4>
                            <span className="text-[10px] text-slate-400 font-mono mt-0.5 block">File: license_audit_doc_2026.pdf</span>
                          </div>
                          <span className={`px-2 py-0.5 text-[9px] rounded font-black uppercase ${
                            selectedDriver.hasLicense ? "bg-emerald-50 text-emerald-700" : "bg-amber-50 text-amber-700"
                          }`}>
                            {selectedDriver.hasLicense ? "Verified" : "Pending Audit"}
                          </span>
                        </div>

                        <div className="bg-slate-50/50 p-2.5 rounded-xl text-[10px] flex justify-between font-mono text-slate-500">
                          <span>DL Document ID:</span>
                          <span className="text-slate-800 font-black">{selectedDriver.licenseDetails?.number || "DL-UP61-20260012"}</span>
                        </div>
                      </div>

                      <div className="space-y-2 pt-2">
                        <div className="flex gap-2">
                          <button
                            type="button"
                            onClick={() => setViewingDoc({ title: "Driving License (DL) File Preview", file: selectedDriver.licenseDetails?.number || "DL-UP61-20260012", id: "license" })}
                            className="flex-grow py-1.5 bg-slate-50 hover:bg-slate-100 border border-slate-200 text-slate-700 rounded-lg text-[9px] font-black uppercase flex items-center justify-center space-x-1 transition cursor-pointer"
                          >
                            <Eye className="w-3.5 h-3.5 text-slate-500" />
                            <span>View DL</span>
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDownloadDoc(selectedDriver.id, "license")}
                            className="flex-grow py-1.5 bg-slate-50 hover:bg-slate-100 border border-slate-200 text-slate-700 rounded-lg text-[9px] font-black uppercase flex items-center justify-center space-x-1 transition cursor-pointer"
                          >
                            <FileText className="w-3.5 h-3.5 text-slate-500" />
                            <span>Download</span>
                          </button>
                        </div>

                        <div className="flex gap-2">
                          <button
                            onClick={() => handleVerifyDocument(selectedDriver.id, "license", true)}
                            disabled={selectedDriver.hasLicense || actionInProgress !== null}
                            className="flex-1 py-1 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-100 rounded-lg text-[9px] uppercase font-black tracking-wider disabled:opacity-40 cursor-pointer"
                          >
                            Approve
                          </button>
                          <button
                            onClick={() => handleVerifyDocument(selectedDriver.id, "license", false)}
                            disabled={!selectedDriver.hasLicense || actionInProgress !== null}
                            className="flex-1 py-1 bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-100 rounded-lg text-[9px] uppercase font-black tracking-wider disabled:opacity-40 cursor-pointer"
                          >
                            Reject
                          </button>
                        </div>
                      </div>
                    </div>

                    {/* VEHICLE RC CARD */}
                    <div className="p-4 border border-slate-100 rounded-2xl space-y-3 bg-white hover:border-slate-200 transition flex flex-col justify-between">
                      <div className="space-y-3">
                        <div className="flex justify-between items-start">
                          <div>
                            <p className="text-[10px] text-slate-400 uppercase tracking-wider font-extrabold">Requirement 2</p>
                            <h4 className="text-slate-800 text-xs font-extrabold mt-0.5">Registration Certificate (RC)</h4>
                            <span className="text-[10px] text-slate-400 font-mono mt-0.5 block">File: vehicle_rc_statement_2026.pdf</span>
                          </div>
                          <span className={`px-2 py-0.5 text-[9px] rounded font-black uppercase ${
                            selectedDriver.hasRc ? "bg-emerald-50 text-emerald-700" : "bg-amber-50 text-amber-700"
                          }`}>
                            {selectedDriver.hasRc ? "Verified" : "Pending Audit"}
                          </span>
                        </div>

                        <div className="bg-slate-50/50 p-2.5 rounded-xl text-[10px] flex justify-between font-mono text-slate-500">
                          <span>RC Registry ID:</span>
                          <span className="text-slate-800 font-black">{selectedDriver.rcDetails?.number || "RC-UP61-AB-1234"}</span>
                        </div>
                      </div>

                      <div className="space-y-2 pt-2">
                        <div className="flex gap-2">
                          <button
                            type="button"
                            onClick={() => setViewingDoc({ title: "Registration Certificate (RC) File Preview", file: selectedDriver.rcDetails?.number || "RC-UP61-AB-1234", id: "rc" })}
                            className="flex-grow py-1.5 bg-slate-50 hover:bg-slate-100 border border-slate-200 text-slate-700 rounded-lg text-[9px] font-black uppercase flex items-center justify-center space-x-1 transition cursor-pointer"
                          >
                            <Eye className="w-3.5 h-3.5 text-slate-500" />
                            <span>View RC</span>
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDownloadDoc(selectedDriver.id, "rc")}
                            className="flex-grow py-1.5 bg-slate-50 hover:bg-slate-100 border border-slate-200 text-slate-700 rounded-lg text-[9px] font-black uppercase flex items-center justify-center space-x-1 transition cursor-pointer"
                          >
                            <FileText className="w-3.5 h-3.5 text-slate-500" />
                            <span>Download</span>
                          </button>
                        </div>

                        <div className="flex gap-2">
                          <button
                            onClick={() => handleVerifyDocument(selectedDriver.id, "rc", true)}
                            disabled={selectedDriver.hasRc || actionInProgress !== null}
                            className="flex-1 py-1 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-100 rounded-lg text-[9px] uppercase font-black tracking-wider disabled:opacity-40 cursor-pointer"
                          >
                            Approve
                          </button>
                          <button
                            onClick={() => handleVerifyDocument(selectedDriver.id, "rc", false)}
                            disabled={!selectedDriver.hasRc || actionInProgress !== null}
                            className="flex-1 py-1 bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-100 rounded-lg text-[9px] uppercase font-black tracking-wider disabled:opacity-40 cursor-pointer"
                          >
                            Reject
                          </button>
                        </div>
                      </div>
                    </div>

                    {/* INSURANCE POLICY */}
                    <div className="p-4 border border-slate-100 rounded-2xl space-y-3 bg-white hover:border-slate-200 transition flex flex-col justify-between">
                      <div className="space-y-3">
                        <div className="flex justify-between items-start">
                          <div>
                            <p className="text-[10px] text-slate-400 uppercase tracking-wider font-extrabold">Requirement 3</p>
                            <h4 className="text-slate-800 text-xs font-extrabold mt-0.5">Third-Party Insurance Cover</h4>
                            <span className="text-[10px] text-slate-400 font-mono mt-0.5 block">File: insurance_premium_copy.pdf</span>
                          </div>
                          <span className={`px-2 py-0.5 text-[9px] rounded font-black uppercase ${
                            selectedDriver.hasInsurance ? "bg-emerald-50 text-emerald-700" : "bg-amber-50 text-amber-700"
                          }`}>
                            {selectedDriver.hasInsurance ? "Verified" : "Pending Audit"}
                          </span>
                        </div>

                        <div className="bg-slate-50/50 p-2.5 rounded-xl text-[10px] flex justify-between font-mono text-slate-500">
                          <span>Insurance Policy ID:</span>
                          <span className="text-slate-800 font-black">{selectedDriver.insuranceDetails?.number || "INS-GPZ-998822"}</span>
                        </div>
                      </div>

                      <div className="space-y-2 pt-2">
                        <div className="flex gap-2">
                          <button
                            type="button"
                            onClick={() => setViewingDoc({ title: "Third-Party Insurance File Preview", file: selectedDriver.insuranceDetails?.number || "INS-GPZ-998822", id: "insurance" })}
                            className="flex-grow py-1.5 bg-slate-50 hover:bg-slate-100 border border-slate-200 text-slate-700 rounded-lg text-[9px] font-black uppercase flex items-center justify-center space-x-1 transition cursor-pointer"
                          >
                            <Eye className="w-3.5 h-3.5 text-slate-500" />
                            <span>View Ins</span>
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDownloadDoc(selectedDriver.id, "insurance")}
                            className="flex-grow py-1.5 bg-slate-50 hover:bg-slate-100 border border-slate-200 text-slate-700 rounded-lg text-[9px] font-black uppercase flex items-center justify-center space-x-1 transition cursor-pointer"
                          >
                            <FileText className="w-3.5 h-3.5 text-slate-500" />
                            <span>Download</span>
                          </button>
                        </div>

                        <div className="flex gap-2">
                          <button
                            onClick={() => handleVerifyDocument(selectedDriver.id, "insurance", true)}
                            disabled={selectedDriver.hasInsurance || actionInProgress !== null}
                            className="flex-1 py-1 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-100 rounded-lg text-[9px] uppercase font-black tracking-wider disabled:opacity-40 cursor-pointer"
                          >
                            Approve
                          </button>
                          <button
                            onClick={() => handleVerifyDocument(selectedDriver.id, "insurance", false)}
                            disabled={!selectedDriver.hasInsurance || actionInProgress !== null}
                            className="flex-1 py-1 bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-100 rounded-lg text-[9px] uppercase font-black tracking-wider disabled:opacity-40 cursor-pointer"
                          >
                            Reject
                          </button>
                        </div>
                      </div>
                    </div>

                    {/* AADHAAR CARD */}
                    <div className="p-4 border border-slate-100 rounded-2xl space-y-3 bg-white hover:border-slate-200 transition flex flex-col justify-between">
                      <div className="space-y-3">
                        <div className="flex justify-between items-start">
                          <div>
                            <p className="text-[10px] text-slate-400 uppercase tracking-wider font-extrabold">Requirement 4</p>
                            <h4 className="text-slate-800 text-xs font-extrabold mt-0.5">Aadhaar Card (UIDAI)</h4>
                            <span className="text-[10px] text-slate-400 font-mono mt-0.5 block">File: aadhaar_card.pdf</span>
                          </div>
                          <span className={`px-2 py-0.5 text-[9px] rounded font-black uppercase ${
                            selectedDriver.hasAadhaar ? "bg-emerald-50 text-emerald-700" : "bg-amber-50 text-amber-700"
                          }`}>
                            {selectedDriver.hasAadhaar ? "Verified" : "Pending Audit"}
                          </span>
                        </div>

                        <div className="bg-slate-50/50 p-2.5 rounded-xl text-[10px] flex justify-between font-mono text-slate-500">
                          <span>Aadhaar Number:</span>
                          <span className="text-slate-800 font-black">{selectedDriver.aadhaarDetails?.number || "3842-9988-4821"}</span>
                        </div>
                      </div>

                      <div className="space-y-2 pt-2">
                        <div className="flex gap-2">
                          <button
                            type="button"
                            onClick={() => setViewingDoc({ title: "Aadhaar Card (UIDAI) Preview", file: selectedDriver.aadhaarDetails?.number || "3842-9988-4821", id: "aadhaar" })}
                            className="flex-grow py-1.5 bg-slate-50 hover:bg-slate-100 border border-slate-200 text-slate-700 rounded-lg text-[9px] font-black uppercase flex items-center justify-center space-x-1 transition cursor-pointer"
                          >
                            <Eye className="w-3.5 h-3.5 text-slate-500" />
                            <span>View UID</span>
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDownloadDoc(selectedDriver.id, "aadhaar")}
                            className="flex-grow py-1.5 bg-slate-50 hover:bg-slate-100 border border-slate-200 text-slate-700 rounded-lg text-[9px] font-black uppercase flex items-center justify-center space-x-1 transition cursor-pointer"
                          >
                            <FileText className="w-3.5 h-3.5 text-slate-500" />
                            <span>Download</span>
                          </button>
                        </div>

                        <div className="flex gap-2">
                          <button
                            onClick={() => handleVerifyDocument(selectedDriver.id, "aadhaar", true)}
                            disabled={selectedDriver.hasAadhaar || actionInProgress !== null}
                            className="flex-1 py-1 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-100 rounded-lg text-[9px] uppercase font-black tracking-wider disabled:opacity-40 cursor-pointer"
                          >
                            Approve
                          </button>
                          <button
                            onClick={() => handleVerifyDocument(selectedDriver.id, "aadhaar", false)}
                            disabled={!selectedDriver.hasAadhaar || actionInProgress !== null}
                            className="flex-1 py-1 bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-100 rounded-lg text-[9px] uppercase font-black tracking-wider disabled:opacity-40 cursor-pointer"
                          >
                            Reject
                          </button>
                        </div>
                      </div>
                    </div>

                    {/* PAN CARD */}
                    <div className="p-4 border border-slate-100 rounded-2xl space-y-3 bg-white hover:border-slate-200 transition flex flex-col justify-between">
                      <div className="space-y-3">
                        <div className="flex justify-between items-start">
                          <div>
                            <p className="text-[10px] text-slate-400 uppercase tracking-wider font-extrabold">Requirement 5</p>
                            <h4 className="text-slate-800 text-xs font-extrabold mt-0.5">PAN Card (Tax Department)</h4>
                            <span className="text-[10px] text-slate-400 font-mono mt-0.5 block">File: pan_card.pdf</span>
                          </div>
                          <span className={`px-2 py-0.5 text-[9px] rounded font-black uppercase ${
                            selectedDriver.hasPan ? "bg-emerald-50 text-emerald-700" : "bg-amber-50 text-amber-700"
                          }`}>
                            {selectedDriver.hasPan ? "Verified" : "Pending Audit"}
                          </span>
                        </div>

                        <div className="bg-slate-50/50 p-2.5 rounded-xl text-[10px] flex justify-between font-mono text-slate-500">
                          <span>PAN Number:</span>
                          <span className="text-slate-800 font-black">{selectedDriver.panDetails?.number || "ABCDE1234F"}</span>
                        </div>
                      </div>

                      <div className="space-y-2 pt-2">
                        <div className="flex gap-2">
                          <button
                            type="button"
                            onClick={() => setViewingDoc({ title: "PAN Card (Tax Department) Preview", file: selectedDriver.panDetails?.number || "ABCDE1234F", id: "pan" })}
                            className="flex-grow py-1.5 bg-slate-50 hover:bg-slate-100 border border-slate-200 text-slate-700 rounded-lg text-[9px] font-black uppercase flex items-center justify-center space-x-1 transition cursor-pointer"
                          >
                            <Eye className="w-3.5 h-3.5 text-slate-500" />
                            <span>View PAN</span>
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDownloadDoc(selectedDriver.id, "pan")}
                            className="flex-grow py-1.5 bg-slate-50 hover:bg-slate-100 border border-slate-200 text-slate-700 rounded-lg text-[9px] font-black uppercase flex items-center justify-center space-x-1 transition cursor-pointer"
                          >
                            <FileText className="w-3.5 h-3.5 text-slate-500" />
                            <span>Download</span>
                          </button>
                        </div>

                        <div className="flex gap-2">
                          <button
                            onClick={() => handleVerifyDocument(selectedDriver.id, "pan", true)}
                            disabled={selectedDriver.hasPan || actionInProgress !== null}
                            className="flex-1 py-1 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-100 rounded-lg text-[9px] uppercase font-black tracking-wider disabled:opacity-40 cursor-pointer"
                          >
                            Approve
                          </button>
                          <button
                            onClick={() => handleVerifyDocument(selectedDriver.id, "pan", false)}
                            disabled={!selectedDriver.hasPan || actionInProgress !== null}
                            className="flex-1 py-1 bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-100 rounded-lg text-[9px] uppercase font-black tracking-wider disabled:opacity-40 cursor-pointer"
                          >
                            Reject
                          </button>
                        </div>
                      </div>
                    </div>

                    {/* VEHICLE IMAGES */}
                    <div className="p-4 border border-slate-100 rounded-2xl space-y-3 bg-white hover:border-slate-200 transition flex flex-col justify-between">
                      <div className="space-y-3">
                        <div className="flex justify-between items-start">
                          <div>
                            <p className="text-[10px] text-slate-400 uppercase tracking-wider font-extrabold">Requirement 6</p>
                            <h4 className="text-slate-800 text-xs font-extrabold mt-0.5">Vehicle Photos</h4>
                            <span className="text-[10px] text-slate-400 font-mono mt-0.5 block">File: vehicle_photo.jpg</span>
                          </div>
                          <span className={`px-2 py-0.5 text-[9px] rounded font-black uppercase ${
                            selectedDriver.hasVehicleImage ? "bg-emerald-50 text-emerald-700" : "bg-amber-50 text-amber-700"
                          }`}>
                            {selectedDriver.hasVehicleImage ? "Verified" : "Pending Audit"}
                          </span>
                        </div>

                        <div className="bg-slate-50/50 p-2.5 rounded-xl text-[10px] flex justify-between font-mono text-slate-500">
                          <span>Plate No Link:</span>
                          <span className="text-slate-800 font-black">{selectedDriver.vehicleImageDetails?.number || selectedDriver.vehicleNumber}</span>
                        </div>
                      </div>

                      <div className="space-y-2 pt-2">
                        <div className="flex gap-2">
                          <button
                            type="button"
                            onClick={() => setViewingDoc({ title: "Vehicle Photo Compliance", file: selectedDriver.vehicleImageDetails?.number || selectedDriver.vehicleNumber, id: "vehicle_image" })}
                            className="flex-grow py-1.5 bg-slate-50 hover:bg-slate-100 border border-slate-200 text-slate-700 rounded-lg text-[9px] font-black uppercase flex items-center justify-center space-x-1 transition cursor-pointer"
                          >
                            <Eye className="w-3.5 h-3.5 text-slate-500" />
                            <span>View Photos</span>
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDownloadDoc(selectedDriver.id, "vehicle_image")}
                            className="flex-grow py-1.5 bg-slate-50 hover:bg-slate-100 border border-slate-200 text-slate-700 rounded-lg text-[9px] font-black uppercase flex items-center justify-center space-x-1 transition cursor-pointer"
                          >
                            <FileText className="w-3.5 h-3.5 text-slate-500" />
                            <span>Download</span>
                          </button>
                        </div>

                        <div className="flex gap-2">
                          <button
                            onClick={() => handleVerifyDocument(selectedDriver.id, "vehicle_image", true)}
                            disabled={selectedDriver.hasVehicleImage || actionInProgress !== null}
                            className="flex-1 py-1 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-100 rounded-lg text-[9px] uppercase font-black tracking-wider disabled:opacity-40 cursor-pointer"
                          >
                            Approve
                          </button>
                          <button
                            onClick={() => handleVerifyDocument(selectedDriver.id, "vehicle_image", false)}
                            disabled={!selectedDriver.hasVehicleImage || actionInProgress !== null}
                            className="flex-1 py-1 bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-100 rounded-lg text-[9px] uppercase font-black tracking-wider disabled:opacity-40 cursor-pointer"
                          >
                            Reject
                          </button>
                        </div>
                      </div>
                    </div>

                    {/* PROFILE IMAGE */}
                    <div className="p-4 border border-slate-100 rounded-2xl space-y-3 bg-white hover:border-slate-200 transition flex flex-col justify-between">
                      <div className="space-y-3">
                        <div className="flex justify-between items-start">
                          <div>
                            <p className="text-[10px] text-slate-400 uppercase tracking-wider font-extrabold">Requirement 7</p>
                            <h4 className="text-slate-800 text-xs font-extrabold mt-0.5">Profile Portrait Photograph</h4>
                            <span className="text-[10px] text-slate-400 font-mono mt-0.5 block">File: profile_photo.jpg</span>
                          </div>
                          <span className={`px-2 py-0.5 text-[9px] rounded font-black uppercase ${
                            selectedDriver.hasProfileImage ? "bg-emerald-50 text-emerald-700" : "bg-amber-50 text-amber-700"
                          }`}>
                            {selectedDriver.hasProfileImage ? "Verified" : "Pending Audit"}
                          </span>
                        </div>

                        <div className="bg-slate-50/50 p-2.5 rounded-xl text-[10px] flex justify-between font-mono text-slate-500">
                          <span>Phone ID Link:</span>
                          <span className="text-slate-800 font-black">{selectedDriver.profileImageDetails?.number || selectedDriver.phone}</span>
                        </div>
                      </div>

                      <div className="space-y-2 pt-2">
                        <div className="flex gap-2">
                          <button
                            type="button"
                            onClick={() => setViewingDoc({ title: "Driver Profile Photograph", file: selectedDriver.profileImageDetails?.number || selectedDriver.phone, id: "profile_image" })}
                            className="flex-grow py-1.5 bg-slate-50 hover:bg-slate-100 border border-slate-200 text-slate-700 rounded-lg text-[9px] font-black uppercase flex items-center justify-center space-x-1 transition cursor-pointer"
                          >
                            <Eye className="w-3.5 h-3.5 text-slate-500" />
                            <span>View Portrait</span>
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDownloadDoc(selectedDriver.id, "profile_image")}
                            className="flex-grow py-1.5 bg-slate-50 hover:bg-slate-100 border border-slate-200 text-slate-700 rounded-lg text-[9px] font-black uppercase flex items-center justify-center space-x-1 transition cursor-pointer"
                          >
                            <FileText className="w-3.5 h-3.5 text-slate-500" />
                            <span>Download</span>
                          </button>
                        </div>

                        <div className="flex gap-2">
                          <button
                            onClick={() => handleVerifyDocument(selectedDriver.id, "profile_image", true)}
                            disabled={selectedDriver.hasProfileImage || actionInProgress !== null}
                            className="flex-1 py-1 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-100 rounded-lg text-[9px] uppercase font-black tracking-wider disabled:opacity-40 cursor-pointer"
                          >
                            Approve
                          </button>
                          <button
                            onClick={() => handleVerifyDocument(selectedDriver.id, "profile_image", false)}
                            disabled={!selectedDriver.hasProfileImage || actionInProgress !== null}
                            className="flex-1 py-1 bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-100 rounded-lg text-[9px] uppercase font-black tracking-wider disabled:opacity-40 cursor-pointer"
                          >
                            Reject
                          </button>
                        </div>
                      </div>
                    </div>

                    {/* PANCHAYAT SYSTEM APPROVAL PANEL */}
                    <div className="p-5 border-2 border-dashed border-slate-200 rounded-2xl bg-slate-50/50 space-y-4 mt-6">
                      <div className="flex items-center space-x-2">
                        <ShieldCheck className="w-5 h-5 text-emerald-600" />
                        <div>
                          <h4 className="text-slate-800 text-xs font-extrabold uppercase">Panchayat Verification Decision</h4>
                          <p className="text-[10px] text-slate-400 font-medium">Approve this local hero into the active GramGo emergency dispatch pool, or log a rejection audit reason.</p>
                        </div>
                      </div>

                      {/* Notes / Reason Inputs */}
                      <div className="space-y-3 pt-2">
                        <div className="space-y-1">
                          <label className="text-[10px] text-slate-500 font-black uppercase">Decision Note / Rejection Reason</label>
                          <textarea
                            rows={3}
                            placeholder={selectedDriver.approvalStatus === "rejected" ? "Log the exact reason for rejecting this driver..." : "Log any specific notes about this driver's local credentials, village base, or training..."}
                            value={decisionComment}
                            onChange={(e) => setDecisionComment(e.target.value)}
                            className="w-full p-2.5 bg-white border border-slate-200 rounded-xl outline-none font-medium text-slate-700"
                          />
                        </div>

                        <div className="flex gap-2">
                          <button
                            type="button"
                            onClick={handleApproveDriver}
                            disabled={actionInProgress !== null}
                            className="flex-grow py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-[10px] uppercase font-black flex items-center justify-center space-x-1 cursor-pointer"
                          >
                            <UserCheck className="w-4 h-4" />
                            <span>{selectedDriver.approvalStatus === "approved" ? "Update Approval Notes" : "Approve Volunteer"}</span>
                          </button>

                          <button
                            type="button"
                            onClick={handleRejectDriver}
                            disabled={actionInProgress !== null}
                            className="flex-grow py-2.5 bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-100 rounded-xl text-[10px] uppercase font-black flex items-center justify-center space-x-1 cursor-pointer"
                          >
                            <UserX className="w-4 h-4" />
                            <span>{selectedDriver.approvalStatus === "rejected" ? "Update Rejection Reason" : "Reject & Flag"}</span>
                          </button>
                        </div>
                      </div>
                    </div>

                  </div>

                </div>
              )}

              {/* Tab Content: TRANSIT DISPATCH HISTORY */}
              {activeDriverTab === "rides" && (
                <div className="space-y-4 pt-1 text-xs">
                  
                  {isRidesLoading ? (
                    <div className="py-8 text-center">
                      <Loader2 className="w-5 h-5 text-emerald-600 animate-spin mx-auto mb-1" />
                      <span className="text-[10px] text-slate-400 font-bold">Retrieving historical dispatch registries...</span>
                    </div>
                  ) : driverRides.length === 0 ? (
                    <div className="py-12 text-center border border-dashed border-slate-100 rounded-2xl text-slate-400 font-bold">
                      <Clock className="w-8 h-8 text-slate-300 mx-auto mb-2" />
                      <span>This volunteer hasn't responded to any dispatch calls yet.</span>
                    </div>
                  ) : (
                    <div className="space-y-3 font-bold">
                      {driverRides.map(ride => (
                        <div key={ride.id} className="p-3 bg-slate-50/50 border border-slate-100 rounded-2xl flex flex-col justify-between space-y-2">
                          <div className="flex justify-between items-start">
                            <div>
                              <p className="text-slate-800 text-[11px] font-black">{ride.patientName}</p>
                              <p className="text-[10px] text-slate-400 font-normal mt-0.5">Village: {ride.village} • CHC: {ride.destinationChc}</p>
                            </div>
                            
                            <span className={`px-2 py-0.5 text-[8px] rounded uppercase font-black ${
                              ride.status === "completed" 
                                ? "bg-emerald-50 text-emerald-800" 
                                : ride.status === "cancelled"
                                ? "bg-slate-100 text-slate-500"
                                : "bg-amber-50 text-amber-800"
                            }`}>
                              {ride.status.replace("_", " ")}
                            </span>
                          </div>

                          <div className="flex justify-between items-center text-[9px] text-slate-400 pt-1 border-t border-slate-50 font-semibold font-mono">
                            <span>ID: {ride.id}</span>
                            <span>{new Date(ride.createdAt).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" })}</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}

                </div>
              )}

              {/* Tab Content: EARNINGS & GOVERNMENT SUBSIDY STATEMENTS */}
              {activeDriverTab === "earnings" && (
                <div className="space-y-4 pt-1 text-xs font-bold text-slate-600">
                  
                  {/* Summary grid */}
                  <div className="grid grid-cols-3 gap-3 bg-emerald-50/30 p-4 rounded-3xl border border-emerald-100 text-slate-800">
                    <div className="text-center">
                      <span className="text-[9px] text-slate-400 uppercase tracking-wider block font-black">Total Rides</span>
                      <p className="text-xl font-black mt-1 text-slate-900">{selectedDriver.earnings.totalTrips}</p>
                    </div>
                    <div className="text-center border-x border-slate-100">
                      <span className="text-[9px] text-slate-400 uppercase tracking-wider block font-black">Base payout</span>
                      <p className="text-xl font-black mt-1 text-slate-900">₹{selectedDriver.earnings.basePayout}</p>
                    </div>
                    <div className="text-center">
                      <span className="text-[9px] text-slate-400 uppercase tracking-wider block font-black">Incentives</span>
                      <p className="text-xl font-black mt-1 text-emerald-700">+₹{selectedDriver.earnings.incentives}</p>
                    </div>
                  </div>

                  <div className="bg-white border border-slate-100 rounded-2xl p-4 space-y-3">
                    <span className="text-[10px] text-slate-400 uppercase tracking-wider font-extrabold block">Subsidy Calculation Protocol</span>
                    
                    <div className="space-y-2 text-[11px] border-b border-slate-50 pb-2">
                      <div className="flex justify-between">
                        <span className="text-slate-400 font-semibold">Government Base Subsidy (₹500 / ride)</span>
                        <span className="text-slate-900 font-black">₹{selectedDriver.earnings.basePayout}.00</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-400 font-semibold">Panchayat Local Incentive (₹150 / ride)</span>
                        <span className="text-emerald-700 font-black">+₹{selectedDriver.earnings.incentives}.00</span>
                      </div>
                    </div>

                    <div className="flex justify-between items-center text-sm font-black pt-1">
                      <span className="text-slate-800 uppercase tracking-wide">Net Subsidy Paid</span>
                      <span className="text-emerald-600 text-base">₹{selectedDriver.earnings.total}.00</span>
                    </div>
                  </div>

                  <div className="bg-slate-50/50 p-3 rounded-xl border border-slate-100 flex items-start space-x-2 text-[10px] text-slate-400">
                    <TrendingUp className="w-4 h-4 text-emerald-600 flex-shrink-0 mt-0.5" />
                    <span>Incentives are awarded to drivers who successfully respond to maternal or cardiac trauma dispatches under 10 minutes of initial notification.</span>
                  </div>

                </div>
              )}

            </div>

            {/* Sticky bottom quick actions */}
            <div className="border-t border-slate-100 pt-4 flex gap-2 mt-6">
              {selectedDriver.userStatus === "active" ? (
                <button
                  onClick={() => setConfirmDialog({ type: "suspend", driver: selectedDriver })}
                  className="flex-1 py-2.5 bg-rose-50 hover:bg-rose-100 text-rose-700 rounded-xl font-extrabold uppercase text-[10px] transition flex items-center justify-center space-x-1 border border-rose-100 cursor-pointer"
                >
                  <UserX className="w-3.5 h-3.5" />
                  <span>Suspend Driver</span>
                </button>
              ) : (
                <button
                  onClick={() => setConfirmDialog({ type: "activate", driver: selectedDriver })}
                  className="flex-1 py-2.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 rounded-xl font-extrabold uppercase text-[10px] transition flex items-center justify-center space-x-1 border border-emerald-100 cursor-pointer"
                >
                  <UserCheck className="w-3.5 h-3.5" />
                  <span>Activate Driver</span>
                </button>
              )}

              <button
                onClick={() => setConfirmDialog({ type: "delete", driver: selectedDriver })}
                className="py-2.5 px-3 bg-slate-50 hover:bg-rose-100 hover:text-rose-700 border border-slate-200 hover:border-rose-200 rounded-xl transition flex items-center justify-center cursor-pointer"
                title="Permanently Delete Registry"
              >
                <Trash2 className="w-4 h-4 text-slate-500 hover:text-rose-700" />
              </button>
            </div>

          </div>
        </div>
      )}

      {/* CUSTOM CONFIRMATION MODALS */}
      {confirmDialog && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4">
          <div className="bg-white rounded-3xl max-w-sm w-full p-6 space-y-4 shadow-2xl relative animate-scale-up text-center">
            
            <div className="w-12 h-12 rounded-full bg-rose-50 text-rose-600 flex items-center justify-center mx-auto">
              <AlertTriangle className="w-6 h-6" />
            </div>

            <div className="space-y-1">
              <h3 className="text-sm font-black text-slate-900 uppercase">
                {confirmDialog.type === "suspend" && "Suspend Account"}
                {confirmDialog.type === "activate" && "Activate Account"}
                {confirmDialog.type === "delete" && "Delete Permanently"}
              </h3>
              <p className="text-xs text-slate-400 font-medium">
                Are you absolutely sure you want to perform this action on driver <strong className="text-slate-800">{confirmDialog.driver.name}</strong>?
              </p>
            </div>

            <div className="flex gap-2.5 pt-2">
              <button
                onClick={() => setConfirmDialog(null)}
                className="flex-1 py-2 bg-slate-50 hover:bg-slate-100 border border-slate-200 text-slate-600 rounded-xl text-xs font-bold uppercase transition cursor-pointer"
              >
                Go Back
              </button>
              
              <button
                onClick={() => {
                  if (confirmDialog.type === "suspend") executeSuspendDriver(confirmDialog.driver.id);
                  if (confirmDialog.type === "activate") executeActivateDriver(confirmDialog.driver.id);
                  if (confirmDialog.type === "delete") executeDeleteDriver(confirmDialog.driver.id);
                }}
                className={`flex-1 py-2 text-white rounded-xl text-xs font-bold uppercase transition cursor-pointer ${
                  confirmDialog.type === "activate" ? "bg-emerald-600 hover:bg-emerald-700" : "bg-rose-600 hover:bg-rose-700"
                }`}
              >
                Yes, Execute
              </button>
            </div>

          </div>
        </div>
      )}

      {/* DOCUMENT VIEW PREVIEW MODAL */}
      {viewingDoc && selectedDriver && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-slate-900/85 backdrop-blur-md p-4">
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 space-y-6 shadow-2xl relative my-8 text-slate-700">
            <button 
              onClick={() => setViewingDoc(null)}
              className="absolute right-4 top-4 p-1.5 text-slate-400 hover:text-slate-600 hover:bg-slate-50 rounded-full transition cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>

            <div>
              <span className="text-[9px] bg-emerald-50 text-emerald-800 px-2 py-0.5 rounded font-black uppercase tracking-widest">GramGo Secure Document Vault</span>
              <h3 className="text-base font-black text-slate-900 mt-1">{viewingDoc.title}</h3>
              <p className="text-xs text-slate-400 mt-0.5 font-bold">Auditing document log ID: <strong className="font-mono text-slate-600">{viewingDoc.file}</strong></p>
            </div>

            {/* Document Scanned Preview Canvas */}
            <div className="border border-slate-100 rounded-2xl bg-gradient-to-b from-slate-50 to-slate-100/50 p-6 flex flex-col justify-between aspect-[1.58] shadow-inner text-xs font-bold text-slate-700 font-mono relative overflow-hidden">
              {/* watermark */}
              <div className="absolute inset-0 flex items-center justify-center opacity-[0.04] pointer-events-none select-none rotate-12">
                <ShieldCheck className="w-80 h-80 text-emerald-900" />
              </div>

              {viewingDoc.id === "license" && (
                <div className="space-y-4 flex-grow flex flex-col justify-between">
                  <div className="flex justify-between items-start">
                    <div className="space-y-1">
                      <p className="text-[10px] text-slate-400 font-sans font-black uppercase tracking-wider">State of Uttar Pradesh</p>
                      <h4 className="text-xs font-sans font-extrabold text-slate-800">DRIVING LICENSE (DL-COMMERCIAL)</h4>
                    </div>
                    <div className="w-12 h-12 rounded bg-slate-200 border border-slate-300 flex items-center justify-center text-slate-500 font-sans text-[10px] font-bold">
                      PHOTO
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4 text-[10px] border-t border-slate-200/60 pt-3">
                    <div>
                      <span className="text-slate-400 font-sans font-black block text-[8px] uppercase">License Number</span>
                      <span className="text-slate-800 font-black">{viewingDoc.file}</span>
                    </div>
                    <div>
                      <span className="text-slate-400 font-sans font-black block text-[8px] uppercase">Holder Name</span>
                      <span className="text-slate-800 font-black">{selectedDriver.name}</span>
                    </div>
                    <div>
                      <span className="text-slate-400 font-sans font-black block text-[8px] uppercase">Vehicle Class</span>
                      <span className="text-slate-800 font-black">MCWG, LMV-GV, HGV</span>
                    </div>
                    <div>
                      <span className="text-slate-400 font-sans font-black block text-[8px] uppercase">Validity Period</span>
                      <span className="text-slate-800 font-black">2021 to 2031</span>
                    </div>
                  </div>

                  <div className="flex items-center space-x-1 text-[9px] text-emerald-700 bg-emerald-50/50 p-2 rounded-lg border border-emerald-100/50 mt-2 font-sans font-bold">
                    <ShieldCheck className="w-3.5 h-3.5" />
                    <span>DigiLocker Verified Status: ACTIVE & VALID</span>
                  </div>
                </div>
              )}

              {viewingDoc.id === "rc" && (
                <div className="space-y-4 flex-grow flex flex-col justify-between">
                  <div className="flex justify-between items-start">
                    <div className="space-y-1">
                      <p className="text-[10px] text-slate-400 font-sans font-black uppercase tracking-wider">Ministry of Road Transport & Highways</p>
                      <h4 className="text-xs font-sans font-extrabold text-slate-800">REGISTRATION CERTIFICATE (RC)</h4>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4 text-[10px] border-t border-slate-200/60 pt-3">
                    <div>
                      <span className="text-slate-400 font-sans font-black block text-[8px] uppercase">Registration Number</span>
                      <span className="text-slate-800 font-black">{viewingDoc.file}</span>
                    </div>
                    <div>
                      <span className="text-slate-400 font-sans font-black block text-[8px] uppercase">Registered Owner</span>
                      <span className="text-slate-800 font-black">{selectedDriver.name}</span>
                    </div>
                    <div>
                      <span className="text-slate-400 font-sans font-black block text-[8px] uppercase">Vehicle Model</span>
                      <span className="text-slate-800 font-black">{selectedDriver.vehicleType}</span>
                    </div>
                    <div>
                      <span className="text-slate-400 font-sans font-black block text-[8px] uppercase">Chassis No.</span>
                      <span className="text-slate-800 font-black">MBN-D445-XX9102-M</span>
                    </div>
                  </div>

                  <div className="flex items-center space-x-1 text-[9px] text-emerald-700 bg-emerald-50/50 p-2 rounded-lg border border-emerald-100/50 mt-2 font-sans font-bold">
                    <ShieldCheck className="w-3.5 h-3.5" />
                    <span>e-Vahan Database Link: REGISTRATION VERIFIED</span>
                  </div>
                </div>
              )}

              {viewingDoc.id === "insurance" && (
                <div className="space-y-4 flex-grow flex flex-col justify-between">
                  <div className="flex justify-between items-start">
                    <div className="space-y-1">
                      <p className="text-[10px] text-slate-400 font-sans font-black uppercase tracking-wider">National Insurance Company Ltd.</p>
                      <h4 className="text-xs font-sans font-extrabold text-slate-800">MOTOR LIABILITY INSURANCE POLICY</h4>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4 text-[10px] border-t border-slate-200/60 pt-3">
                    <div>
                      <span className="text-slate-400 font-sans font-black block text-[8px] uppercase">Policy Cover ID</span>
                      <span className="text-slate-800 font-black">{viewingDoc.file}</span>
                    </div>
                    <div>
                      <span className="text-slate-400 font-sans font-black block text-[8px] uppercase">Insured Vehicle plate</span>
                      <span className="text-slate-800 font-black">{selectedDriver.vehicleNumber}</span>
                    </div>
                    <div>
                      <span className="text-slate-400 font-sans font-black block text-[8px] uppercase">Coverage Category</span>
                      <span className="text-slate-800 font-black">Third-Party Commercial Ambulance Liability</span>
                    </div>
                    <div>
                      <span className="text-slate-400 font-sans font-black block text-[8px] uppercase">Policy Validity</span>
                      <span className="text-slate-800 font-black">Valid till Dec 2027</span>
                    </div>
                  </div>

                  <div className="flex items-center space-x-1 text-[9px] text-emerald-700 bg-emerald-50/50 p-2 rounded-lg border border-emerald-100/50 mt-2 font-sans font-bold">
                    <ShieldCheck className="w-3.5 h-3.5" />
                    <span>IRDAI Insurance Database Link: COVERAGE PREMIUM ACTIVE</span>
                  </div>
                </div>
              )}

              {viewingDoc.id === "aadhaar" && (
                <div className="space-y-4 flex-grow flex flex-col justify-between">
                  <div className="flex justify-between items-start">
                    <div className="space-y-1">
                      <p className="text-[10px] text-slate-400 font-sans font-black uppercase tracking-wider">Unique Identification Authority of India (UIDAI)</p>
                      <h4 className="text-xs font-sans font-extrabold text-slate-800">AADHAAR CARD (LOCAL ID)</h4>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4 text-[10px] border-t border-slate-200/60 pt-3">
                    <div>
                      <span className="text-slate-400 font-sans font-black block text-[8px] uppercase">Aadhaar Number</span>
                      <span className="text-slate-800 font-black">{viewingDoc.file}</span>
                    </div>
                    <div>
                      <span className="text-slate-400 font-sans font-black block text-[8px] uppercase">Full Name</span>
                      <span className="text-slate-800 font-black">{selectedDriver.name}</span>
                    </div>
                    <div>
                      <span className="text-slate-400 font-sans font-black block text-[8px] uppercase">Resident Of</span>
                      <span className="text-slate-800 font-black">{selectedDriver.village}, {selectedDriver.district}</span>
                    </div>
                    <div>
                      <span className="text-slate-400 font-sans font-black block text-[8px] uppercase">Verification Status</span>
                      <span className="text-slate-800 font-black">Biometric Sync Active</span>
                    </div>
                  </div>

                  <div className="flex items-center space-x-1 text-[9px] text-emerald-700 bg-emerald-50/50 p-2 rounded-lg border border-emerald-100/50 mt-2 font-sans font-bold">
                    <ShieldCheck className="w-3.5 h-3.5" />
                    <span>UIDAI CIDR: DEMOGRAPHIC & BIOMETRIC VERIFIED</span>
                  </div>
                </div>
              )}

              {viewingDoc.id === "pan" && (
                <div className="space-y-4 flex-grow flex flex-col justify-between">
                  <div className="flex justify-between items-start">
                    <div className="space-y-1">
                      <p className="text-[10px] text-slate-400 font-sans font-black uppercase tracking-wider">Income Tax Department, Govt of India</p>
                      <h4 className="text-xs font-sans font-extrabold text-slate-800">PERMANENT ACCOUNT NUMBER (PAN)</h4>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4 text-[10px] border-t border-slate-200/60 pt-3">
                    <div>
                      <span className="text-slate-400 font-sans font-black block text-[8px] uppercase">PAN ID</span>
                      <span className="text-slate-800 font-black">{viewingDoc.file}</span>
                    </div>
                    <div>
                      <span className="text-slate-400 font-sans font-black block text-[8px] uppercase">Cardholder Name</span>
                      <span className="text-slate-800 font-black">{selectedDriver.name.toUpperCase()}</span>
                    </div>
                    <div>
                      <span className="text-slate-400 font-sans font-black block text-[8px] uppercase">Tax Category</span>
                      <span className="text-slate-800 font-black">INDIVIDUAL (RESIDENT)</span>
                    </div>
                    <div>
                      <span className="text-slate-400 font-sans font-black block text-[8px] uppercase">Status</span>
                      <span className="text-slate-800 font-black font-mono text-[9px]">PAN-Aadhaar Linked</span>
                    </div>
                  </div>

                  <div className="flex items-center space-x-1 text-[9px] text-emerald-700 bg-emerald-50/50 p-2 rounded-lg border border-emerald-100/50 mt-2 font-sans font-bold">
                    <ShieldCheck className="w-3.5 h-3.5" />
                    <span>NSDL/UTIITSL: INDIVIDUAL STATUS VERIFIED ACTIVE</span>
                  </div>
                </div>
              )}

              {viewingDoc.id === "vehicle_image" && (
                <div className="space-y-4 flex-grow flex flex-col justify-between">
                  <div className="flex justify-between items-start">
                    <div className="space-y-1">
                      <p className="text-[10px] text-slate-400 font-sans font-black uppercase tracking-wider">GramGo Vehicle Fitness Audit</p>
                      <h4 className="text-xs font-sans font-extrabold text-slate-800">REGISTERED VEHICLE PROFILE PHOTO</h4>
                    </div>
                  </div>

                  <div className="flex-1 flex flex-col justify-center bg-slate-800/95 text-slate-100 border border-slate-700 rounded-xl p-4 font-sans text-center relative overflow-hidden min-h-[140px]">
                    <div className="space-y-1 z-10">
                      <p className="font-black text-[11px] uppercase tracking-wider">Simulated {selectedDriver.vehicleType} Image</p>
                      <p className="text-[9px] text-slate-400">Reg Plate: {selectedDriver.vehicleNumber}</p>
                      <span className="inline-block mt-1 px-2 py-0.5 bg-emerald-500/10 text-emerald-400 border border-emerald-500/25 rounded text-[8px] font-mono">Fitness Approved</span>
                    </div>
                  </div>
                </div>
              )}

              {viewingDoc.id === "profile_image" && (
                <div className="space-y-4 flex-grow flex flex-col justify-between">
                  <div className="flex justify-between items-start">
                    <div className="space-y-1">
                      <p className="text-[10px] text-slate-400 font-sans font-black uppercase tracking-wider">GramGo Certified Driver Portfolio</p>
                      <h4 className="text-xs font-sans font-extrabold text-slate-800">VOLUNTEER PROFILE PHOTOGRAPH</h4>
                    </div>
                  </div>

                  <div className="flex-1 flex flex-col items-center justify-center bg-slate-800/95 text-slate-100 border border-slate-700 rounded-xl p-4 font-sans text-center relative overflow-hidden min-h-[140px]">
                    <div className="space-y-2 z-10 flex flex-col items-center">
                      <div className="w-10 h-10 bg-emerald-600 rounded-full border border-emerald-500 flex items-center justify-center text-white text-xs font-bold uppercase">
                        {selectedDriver.name.substring(0, 2)}
                      </div>
                      <div className="space-y-0.5">
                        <p className="font-black text-[10px] uppercase tracking-wider">{selectedDriver.name}</p>
                        <p className="text-[8px] text-slate-400">ID Ref: {selectedDriver.phone}</p>
                      </div>
                    </div>
                  </div>
                </div>
              )}

            </div>

            <div className="flex justify-end pt-2">
              <button
                type="button"
                onClick={() => setViewingDoc(null)}
                className="px-5 py-2.5 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-extrabold uppercase transition cursor-pointer"
              >
                Close Secure Vault
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
