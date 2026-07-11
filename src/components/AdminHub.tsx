import React, { useState, useEffect } from "react";
import WalletDashboard from "./WalletDashboard";
import { 
  LayoutDashboard, 
  Bell,
  Users, 
  Car, 
  MapPin, 
  FileText, 
  Sliders, 
  ShieldAlert, 
  TrendingUp, 
  CheckCircle2, 
  AlertTriangle, 
  Clock, 
  Search, 
  Trash2, 
  UserCheck, 
  Phone, 
  Settings, 
  Building, 
  Plus, 
  ArrowRight, 
  Download, 
  RefreshCw, 
  Check, 
  X, 
  HelpCircle,
  Activity,
  IndianRupee,
  XCircle,
  HeartPulse,
  Ticket,
  Star,
  MessageSquare
} from "lucide-react";
import { useAuth } from "../context/AuthContext";
import UserManagement from "./UserManagement";
import DriverManagement from "./DriverManagement";
import { EmergencyNotificationsLog } from "./EmergencyNotificationsLog";
import EmergencyDashboard from "./EmergencyDashboard";
import ChatModule from "./ChatModule";
import CouponManagement from "./CouponManagement";
import RatingSystem from "./RatingSystem";
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  BarChart,
  Bar,
  LineChart,
  Line,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend
} from "recharts";

interface User {
  id: string;
  name: string;
  phone: string;
  email?: string;
  role: "passenger" | "driver" | "admin";
  village: string;
  district: string;
  createdAt: string;
  vehicleType?: string;
  vehicleNumber?: string;
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
  documentsCount: number;
  hasLicense: boolean;
  hasRc: boolean;
  hasAadhaar: boolean;
  activeRide: { id: string; patientName: string; status: string } | null;
  earnings: number;
}

interface Booking {
  id: string;
  patientName: string;
  patientPhone: string;
  emergencyType: string;
  priority: "critical" | "urgent" | "non-urgent";
  village: string;
  landmark: string;
  driverId?: string;
  driverName?: string;
  driverPhone?: string;
  vehicleType?: string;
  status: "searching" | "driver_assigned" | "en_route" | "arrived" | "completed";
  createdAt: number;
  destinationChc: string;
  isManual?: boolean;
}

interface SystemSettings {
  autoSimulateRides: boolean;
  smsNotifications: boolean;
  maxDriverRadiusKm: number;
  emergencyHotline: string;
  allowedVillages: string[];
}

interface Role {
  id: string;
  name: string;
  description: string;
  permissions: string[];
  isSystem?: boolean;
}

interface Permission {
  id: string;
  name: string;
  description: string;
  module: string;
}

export default function AdminHub() {
  const { user, token } = useAuth();
  const [activeTab, setActiveTab] = useState<"dashboard" | "users" | "drivers" | "bookings" | "reports" | "settings" | "roles" | "admins" | "priority-engine" | "notifications" | "emergency-dashboard" | "refund-approvals" | "commission" | "coupons" | "ratings" | "chat">("emergency-dashboard");

  // State Management
  const [metrics, setMetrics] = useState<any>(null);
  const [charts, setCharts] = useState<any>(null);
  const [users, setUsers] = useState<User[]>([]);
  const [driversList, setDriversList] = useState<Driver[]>([]);
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [sysSettings, setSysSettings] = useState<SystemSettings | null>(null);

  // Priority Engine States
  const [priorityStatus, setPriorityStatus] = useState<any>(null);
  const [selectedRideForOverride, setSelectedRideForOverride] = useState<string | null>(null);
  const [overrideDriverId, setOverrideDriverId] = useState<string>("");
  const [isUpdatingSettings, setIsUpdatingSettings] = useState<boolean>(false);

  // Roles & Permissions State
  const [roles, setRoles] = useState<Role[]>([]);
  const [permissions, setPermissions] = useState<Permission[]>([]);
  const [isEditingRole, setIsEditingRole] = useState<boolean>(false);
  const [roleForm, setRoleForm] = useState<{
    id?: string;
    name: string;
    description: string;
    permissions: string[];
  }>({ name: "", description: "", permissions: [] });
  const [isEditingPermission, setIsEditingPermission] = useState<boolean>(false);
  const [permissionForm, setPermissionForm] = useState<{
    id?: string;
    name: string;
    description: string;
    module: string;
  }>({ name: "", description: "", module: "" });

  // Search & Filters
  const [userSearch, setUserSearch] = useState("");
  const [userRoleFilter, setUserRoleFilter] = useState("all");
  
  const [driverSearch, setDriverSearch] = useState("");
  const [driverStatusFilter, setDriverStatusFilter] = useState("all");

  const [bookingSearch, setBookingSearch] = useState("");
  const [bookingStatusFilter, setBookingStatusFilter] = useState("all");

  // Advanced Filters State
  const [showAdvancedFilters, setShowAdvancedFilters] = useState(false);
  const [advFilters, setAdvFilters] = useState({
    dateStart: "",
    dateEnd: "",
    rideStatus: "all",
    driverStatus: "all",
    emergency: "all",
    onlineOffline: "all",
    paymentStatus: "all",
    district: "all",
    village: "all",
    vehicleType: "all",
  });

  const resetAdvFilters = () => {
    setAdvFilters({
      dateStart: "",
      dateEnd: "",
      rideStatus: "all",
      driverStatus: "all",
      emergency: "all",
      onlineOffline: "all",
      paymentStatus: "all",
      district: "all",
      village: "all",
      vehicleType: "all",
    });
    setBookingStatusFilter("all");
    setDriverStatusFilter("all");
  };

  const getActiveFiltersCount = () => {
    let count = 0;
    if (advFilters.dateStart) count++;
    if (advFilters.dateEnd) count++;
    if (advFilters.rideStatus !== "all") count++;
    if (advFilters.driverStatus !== "all") count++;
    if (advFilters.emergency !== "all") count++;
    if (advFilters.onlineOffline !== "all") count++;
    if (advFilters.paymentStatus !== "all") count++;
    if (advFilters.district !== "all") count++;
    if (advFilters.village !== "all") count++;
    if (advFilters.vehicleType !== "all") count++;
    return count;
  };

  // Admin Account Management States
  const [adminsList, setAdminsList] = useState<User[]>([]);
  const [adminTotalCount, setAdminTotalCount] = useState<number>(0);
  const [adminPage, setAdminPage] = useState<number>(1);
  const [adminTotalPages, setAdminTotalPages] = useState<number>(1);
  const [adminSearch, setAdminSearch] = useState<string>("");
  const [adminStatusFilter, setAdminStatusFilter] = useState<string>("all");
  const [adminRoleFilter, setAdminRoleFilter] = useState<string>("all");
  
  const [isEditingAdmin, setIsEditingAdmin] = useState<boolean>(false);
  const [adminForm, setAdminForm] = useState<{
    id?: string;
    name: string;
    phone: string;
    email: string;
    password?: string;
    role: string;
    village: string;
  }>({ name: "", phone: "", email: "", password: "", role: "Admin", village: "Sherpur" });

  const [isAdminResetPasswordModal, setIsAdminResetPasswordModal] = useState<string | null>(null);
  const [adminNewPassword, setAdminNewPassword] = useState<string>("");

  // Interactive Modals/States
  const [selectedDriverForEdit, setSelectedDriverForEdit] = useState<Driver | null>(null);
  const [isAssigningDriverToRide, setIsAssigningDriverToRide] = useState<string | null>(null);
  const [hoveredEmergencyType, setHoveredEmergencyType] = useState<string | null>(null);
  
  // Settings Form States
  const [newVillageInput, setNewVillageInput] = useState("");
  
  // Loading & Action states
  const [isLoading, setIsLoading] = useState(true);
  const [actionInProgress, setActionInProgress] = useState<string | null>(null);
  const [toastMessage, setToastMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  // Global Search states
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [globalSearchQuery, setGlobalSearchQuery] = useState("");
  const [globalSearchResults, setGlobalSearchResults] = useState<any>({
    users: [],
    drivers: [],
    bookings: [],
    emergencyRequests: [],
    payments: [],
    reports: [],
    support: []
  });
  const [isSearching, setIsSearching] = useState(false);
  const [searchFilter, setSearchFilter] = useState<"all" | "users" | "drivers" | "bookings" | "emergencyRequests" | "payments" | "reports" | "support">("all");
  const [selectedSearchDetail, setSelectedSearchDetail] = useState<any>(null);
  const [selectedSearchDetailType, setSelectedSearchDetailType] = useState<string | null>(null);

  const triggerGlobalSearch = async (query: string) => {
    setIsSearching(true);
    try {
      const res = await fetch(`/api/admin/global-search?q=${encodeURIComponent(query)}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setGlobalSearchResults(data.results);
      }
    } catch (err) {
      console.error("Global search fetch error:", err);
    } finally {
      setIsSearching(false);
    }
  };

  useEffect(() => {
    if (isSearchOpen) {
      const delayDebounce = setTimeout(() => {
        triggerGlobalSearch(globalSearchQuery);
      }, 250);
      return () => clearTimeout(delayDebounce);
    }
  }, [isSearchOpen, globalSearchQuery]);

  useEffect(() => {
    if (!token) return;
    
    // Initial fetch
    fetchData();

    // Setup polling for live dashboard metrics & booking states
    const interval = setInterval(() => {
      pollLiveUpdates();
    }, 4000);

    return () => clearInterval(interval);
  }, [token]);

  const showToast = (text: string, type: "success" | "error" = "success") => {
    setToastMessage({ text, type });
    setTimeout(() => setToastMessage(null), 3500);
  };

  // Platform Commission States and Logic
  const [commissionData, setCommissionData] = useState<any>(null);
  const [isLoadingCommission, setIsLoadingCommission] = useState(false);
  const [commissionError, setCommissionError] = useState("");
  const [inputPct, setInputPct] = useState(10);
  const [inputCharges, setInputCharges] = useState(50);
  const [isSavingSettings, setIsSavingSettings] = useState(false);
  const [commSearchTerm, setCommSearchTerm] = useState("");
  const [commTypeFilter, setCommTypeFilter] = useState("all");
  const [commDriverSearch, setCommDriverSearch] = useState("");

  const fetchCommissionStats = async () => {
    setIsLoadingCommission(true);
    setCommissionError("");
    try {
      const response = await fetch("/api/admin/commission-stats", {
        headers: {
          Authorization: `Bearer ${token}`
        }
      });
      if (!response.ok) {
        throw new Error("Failed to fetch commission statistics");
      }
      const data = await response.json();
      setCommissionData(data);
      if (data.settings) {
        setInputPct(data.settings.commissionPercentage);
        setInputCharges(data.settings.emergencyCharges);
      }
    } catch (err: any) {
      console.error(err);
      setCommissionError(err.message || "An error occurred");
    } finally {
      setIsLoadingCommission(false);
    }
  };

  const handleSaveCommissionSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSavingSettings(true);
    try {
      const response = await fetch("/api/admin/settings", {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({
          commissionPercentage: inputPct,
          emergencyCharges: inputCharges
        })
      });
      if (!response.ok) {
        throw new Error("Failed to update settings");
      }
      showToast("Platform commission settings updated successfully!", "success");
      fetchCommissionStats();
    } catch (err: any) {
      showToast(err.message || "Failed to update commission settings", "error");
    } finally {
      setIsSavingSettings(false);
    }
  };

  useEffect(() => {
    if (activeTab === "commission" && token) {
      fetchCommissionStats();
    }
  }, [activeTab, token]);

  const fetchData = async () => {
    setIsLoading(true);
    try {
      await Promise.all([
        fetchStats(),
        fetchUsers(),
        fetchDrivers(),
        fetchBookings(),
        fetchSettings(),
        fetchRoles(),
        fetchPermissions(),
        fetchAdmins(),
        fetchPriorityStatus()
      ]);
    } catch (err) {
      console.error("Error fetching admin data", err);
      showToast("Failed to fetch server data", "error");
    } finally {
      setIsLoading(false);
    }
  };

  const fetchPriorityStatus = async () => {
    try {
      const res = await fetch("/api/admin/priority-engine/status", {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        const contentType = res.headers.get("content-type");
        if (contentType && contentType.includes("application/json")) {
          try {
            const data = await res.json();
            setPriorityStatus(data);
          } catch (parseErr) {
            console.debug("Failed to parse priority status JSON:", parseErr);
          }
        }
      }
    } catch (err) {
      console.debug("Error fetching priority status:", err);
    }
  };

  const handleSavePrioritySettings = async (settings: any) => {
    setIsUpdatingSettings(true);
    try {
      const res = await fetch("/api/admin/priority-engine/settings", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify(settings)
      });
      if (res.ok) {
        showToast("Priority engine configuration updated successfully!");
        fetchPriorityStatus();
      } else {
        showToast("Failed to update priority configurations", "error");
      }
    } catch (err) {
      console.error(err);
      showToast("Network error updating priority settings", "error");
    } finally {
      setIsUpdatingSettings(false);
    }
  };

  const handleManualOverride = async (rideId: string, driverId: string) => {
    try {
      const res = await fetch("/api/admin/priority-engine/override", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ rideId, driverId })
      });
      if (res.ok) {
        showToast("👮 Dispatcher manual override assignment successful!", "success");
        setSelectedRideForOverride(null);
        setOverrideDriverId("");
        fetchPriorityStatus();
        fetchBookings();
      } else {
        const data = await res.json();
        showToast(data.error || "Override assignment failed", "error");
      }
    } catch (err) {
      console.error(err);
      showToast("Network error executing override assignment", "error");
    }
  };

  const handleTriggerPriorityRetry = async (rideId: string) => {
    try {
      const res = await fetch(`/api/admin/priority-engine/retry/${rideId}`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        showToast("Priority dispatch re-evaluation triggered!", "success");
        fetchPriorityStatus();
      } else {
        showToast("Failed to trigger re-evaluation", "error");
      }
    } catch (err) {
      console.error(err);
      showToast("Network error triggering retry", "error");
    }
  };

  const handleResetPriorityState = async (rideId: string) => {
    try {
      const res = await fetch(`/api/admin/priority-engine/reset/${rideId}`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        showToast("Priority session state reset successfully.", "success");
        fetchPriorityStatus();
      } else {
        showToast("Failed to reset session state", "error");
      }
    } catch (err) {
      console.error(err);
      showToast("Network error resetting state", "error");
    }
  };

  const pollLiveUpdates = async () => {
    try {
      // Fetch stats & bookings silently
      const statsRes = await fetch("/api/admin/stats", {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (statsRes.ok) {
        const contentType = statsRes.headers.get("content-type");
        if (contentType && contentType.includes("application/json")) {
          try {
            const data = await statsRes.json();
            setMetrics(data.metrics);
            setCharts(data.charts);
          } catch (parseErr) {
            console.debug("Failed to parse admin stats JSON:", parseErr);
          }
        }
      }

      const bookingsRes = await fetch("/api/admin/bookings", {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (bookingsRes.ok) {
        const contentType = bookingsRes.headers.get("content-type");
        if (contentType && contentType.includes("application/json")) {
          try {
            const data = await bookingsRes.json();
            setBookings(data);
          } catch (parseErr) {
            console.debug("Failed to parse admin bookings JSON:", parseErr);
          }
        }
      }

      // Poll Priority Engine status
      await fetchPriorityStatus();
    } catch (err) {
      console.debug("Polling debug info (silent):", err);
    }
  };

  const fetchStats = async () => {
    const res = await fetch("/api/admin/stats", {
      headers: { Authorization: `Bearer ${token}` }
    });
    if (res.ok) {
      const data = await res.json();
      setMetrics(data.metrics);
      setCharts(data.charts);
    }
  };

  const fetchUsers = async () => {
    const res = await fetch("/api/admin/users", {
      headers: { Authorization: `Bearer ${token}` }
    });
    if (res.ok) {
      const data = await res.json();
      setUsers(Array.isArray(data) ? data : (data.users || []));
    }
  };

  const fetchDrivers = async () => {
    const res = await fetch("/api/admin/drivers", {
      headers: { Authorization: `Bearer ${token}` }
    });
    if (res.ok) {
      const data = await res.json();
      setDriversList(Array.isArray(data) ? data : (data.drivers || []));
    }
  };

  const fetchBookings = async () => {
    const res = await fetch("/api/admin/bookings", {
      headers: { Authorization: `Bearer ${token}` }
    });
    if (res.ok) {
      const data = await res.json();
      setBookings(data);
    }
  };

  const fetchSettings = async () => {
    const res = await fetch("/api/admin/settings", {
      headers: { Authorization: `Bearer ${token}` }
    });
    if (res.ok) {
      const data = await res.json();
      setSysSettings(data);
    }
  };

  const fetchRoles = async () => {
    const res = await fetch("/api/admin/roles", {
      headers: { Authorization: `Bearer ${token}` }
    });
    if (res.ok) {
      const data = await res.json();
      setRoles(data);
    }
  };

  const fetchPermissions = async () => {
    const res = await fetch("/api/admin/permissions", {
      headers: { Authorization: `Bearer ${token}` }
    });
    if (res.ok) {
      const data = await res.json();
      setPermissions(data);
    }
  };

  const fetchAdmins = async () => {
    try {
      const queryParams = new URLSearchParams({
        search: adminSearch,
        status: adminStatusFilter,
        role: adminRoleFilter,
        page: String(adminPage),
        limit: "5"
      });
      const res = await fetch(`/api/admin/admins?${queryParams}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setAdminsList(data.admins);
        setAdminTotalCount(data.totalCount);
        setAdminTotalPages(data.totalPages);
        setAdminPage(data.page);
      }
    } catch (err) {
      console.error("Error fetching admins list:", err);
    }
  };

  useEffect(() => {
    if (token) {
      fetchAdmins();
    }
  }, [adminSearch, adminStatusFilter, adminRoleFilter, adminPage, token]);

  // Admin CRUD Actions
  const handleSaveAdmin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!adminForm.name || !adminForm.phone || !adminForm.role || !adminForm.village) {
      showToast("Name, phone, role, and village are required", "error");
      return;
    }

    const isEdit = !!adminForm.id;
    const url = isEdit ? `/api/admin/admins/${adminForm.id}` : "/api/admin/admins";
    const method = isEdit ? "PUT" : "POST";

    setActionInProgress(adminForm.id || "new-admin");
    try {
      const res = await fetch(url, {
        method,
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify(adminForm)
      });
      if (res.ok) {
        showToast(isEdit ? "Admin account updated successfully" : "Admin account created successfully");
        setAdminForm({ name: "", phone: "", email: "", password: "", role: "Admin", village: "Sherpur" });
        setIsEditingAdmin(false);
        await fetchAdmins();
      } else {
        const err = await res.json();
        showToast(err.error || "Failed to save admin account", "error");
      }
    } catch (err) {
      showToast("Server connection failure", "error");
    } finally {
      setActionInProgress(null);
    }
  };

  const handleDeleteAdmin = async (adminId: string) => {
    if (!confirm("Are you sure you want to permanently delete this administrator?")) return;
    setActionInProgress(adminId);
    try {
      const res = await fetch(`/api/admin/admins/${adminId}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        showToast("Admin deleted successfully");
        await fetchAdmins();
      } else {
        const err = await res.json();
        showToast(err.error || "Failed to delete admin", "error");
      }
    } catch (err) {
      showToast("Server connection failure", "error");
    } finally {
      setActionInProgress(null);
    }
  };

  const handleSuspendAdmin = async (adminId: string) => {
    setActionInProgress(adminId);
    try {
      const res = await fetch(`/api/admin/admins/${adminId}/suspend`, {
        method: "PUT",
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        showToast("Admin account suspended successfully");
        await fetchAdmins();
      } else {
        const err = await res.json();
        showToast(err.error || "Failed to suspend admin", "error");
      }
    } catch (err) {
      showToast("Server connection failure", "error");
    } finally {
      setActionInProgress(null);
    }
  };

  const handleActivateAdmin = async (adminId: string) => {
    setActionInProgress(adminId);
    try {
      const res = await fetch(`/api/admin/admins/${adminId}/activate`, {
        method: "PUT",
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        showToast("Admin account activated successfully");
        await fetchAdmins();
      } else {
        const err = await res.json();
        showToast(err.error || "Failed to activate admin", "error");
      }
    } catch (err) {
      showToast("Server connection failure", "error");
    } finally {
      setActionInProgress(null);
    }
  };

  const handleResetAdminPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isAdminResetPasswordModal) return;
    if (!adminNewPassword || adminNewPassword.length < 6) {
      showToast("Password must be at least 6 characters", "error");
      return;
    }

    setActionInProgress(isAdminResetPasswordModal);
    try {
      const res = await fetch(`/api/admin/admins/${isAdminResetPasswordModal}/reset-password`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ password: adminNewPassword })
      });
      if (res.ok) {
        showToast("Password reset completed successfully");
        setIsAdminResetPasswordModal(null);
        setAdminNewPassword("");
      } else {
        const err = await res.json();
        showToast(err.error || "Failed to reset password", "error");
      }
    } catch (err) {
      showToast("Server connection failure", "error");
    } finally {
      setActionInProgress(null);
    }
  };

  // Role Actions
  const handleSaveRole = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!roleForm.name || !roleForm.description) {
      showToast("Name and description are required", "error");
      return;
    }
    const isEdit = !!roleForm.id;
    const url = isEdit ? `/api/admin/roles/${roleForm.id}` : "/api/admin/roles";
    const method = isEdit ? "PUT" : "POST";

    try {
      const res = await fetch(url, {
        method,
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify(roleForm)
      });
      if (res.ok) {
        showToast(isEdit ? "Role updated successfully" : "Role created successfully");
        setRoleForm({ name: "", description: "", permissions: [] });
        setIsEditingRole(false);
        await fetchRoles();
      } else {
        const err = await res.json();
        showToast(err.error || "Failed to save role", "error");
      }
    } catch (err) {
      showToast("Server connection failure", "error");
    }
  };

  const handleDeleteRole = async (roleId: string) => {
    if (!confirm("Are you sure you want to delete this role?")) return;
    try {
      const res = await fetch(`/api/admin/roles/${roleId}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        showToast("Role deleted successfully");
        await fetchRoles();
      } else {
        const err = await res.json();
        showToast(err.error || "Failed to delete role", "error");
      }
    } catch (err) {
      showToast("Server connection failure", "error");
    }
  };

  // Permission Actions
  const handleSavePermission = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!permissionForm.name || !permissionForm.description || !permissionForm.module) {
      showToast("All permission fields are required", "error");
      return;
    }
    const isEdit = !!permissionForm.id;
    const url = isEdit ? `/api/admin/permissions/${permissionForm.id}` : "/api/admin/permissions";
    const method = isEdit ? "PUT" : "POST";

    try {
      const res = await fetch(url, {
        method,
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify(permissionForm)
      });
      if (res.ok) {
        showToast(isEdit ? "Permission updated successfully" : "Permission created successfully");
        setPermissionForm({ name: "", description: "", module: "" });
        setIsEditingPermission(false);
        await fetchPermissions();
      } else {
        const err = await res.json();
        showToast(err.error || "Failed to save permission", "error");
      }
    } catch (err) {
      showToast("Server connection failure", "error");
    }
  };

  const handleDeletePermission = async (permId: string) => {
    if (!confirm("Are you sure you want to delete this permission?")) return;
    try {
      const res = await fetch(`/api/admin/permissions/${permId}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        showToast("Permission deleted successfully");
        await fetchPermissions();
      } else {
        const err = await res.json();
        showToast(err.error || "Failed to delete permission", "error");
      }
    } catch (err) {
      showToast("Server connection failure", "error");
    }
  };

  // User Actions
  const handleUpdateRole = async (userId: string, newRole: string) => {
    setActionInProgress(userId);
    try {
      const res = await fetch(`/api/admin/users/${userId}/role`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ role: newRole })
      });
      if (res.ok) {
        showToast("User role updated successfully");
        await fetchUsers();
        await fetchDrivers(); // Drivers list depends on user roles
      } else {
        const data = await res.json();
        showToast(data.error || "Failed to update role", "error");
      }
    } catch (err) {
      showToast("Server communication error", "error");
    } finally {
      setActionInProgress(null);
    }
  };

  const handleDeleteUser = async (userId: string) => {
    if (!confirm("Are you absolutely sure you want to delete this user? This action is irreversible.")) return;
    setActionInProgress(userId);
    try {
      const res = await fetch(`/api/admin/users/${userId}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        showToast("User deleted from GramGo network");
        await fetchUsers();
        await fetchDrivers();
      } else {
        const data = await res.json();
        showToast(data.error || "Failed to delete user", "error");
      }
    } catch (err) {
      showToast("Network failure", "error");
    } finally {
      setActionInProgress(null);
    }
  };

  // Driver Actions
  const handleToggleDriverStatus = async (driverId: string, nextStatus: string) => {
    setActionInProgress(driverId);
    try {
      const res = await fetch(`/api/admin/drivers/${driverId}/status`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ status: nextStatus })
      });
      if (res.ok) {
        showToast(`Driver status switched to ${nextStatus}`);
        await fetchDrivers();
      }
    } catch (err) {
      showToast("Failed to switch driver status", "error");
    } finally {
      setActionInProgress(null);
    }
  };

  const handleSaveDriverDetails = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedDriverForEdit) return;
    const d = selectedDriverForEdit;
    setActionInProgress(d.id);
    try {
      const res = await fetch(`/api/admin/drivers/${d.id}/details`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({
          name: d.name,
          phone: d.phone,
          vehicleType: d.vehicleType,
          vehicleNumber: d.vehicleNumber,
          village: d.village,
          rating: d.rating
        })
      });
      if (res.ok) {
        showToast("Driver details saved successfully");
        setSelectedDriverForEdit(null);
        await fetchDrivers();
      } else {
        showToast("Failed to save driver updates", "error");
      }
    } catch (err) {
      showToast("Server error", "error");
    } finally {
      setActionInProgress(null);
    }
  };

  // Booking Actions
  const handleAssignDriver = async (rideId: string, driverId: string) => {
    if (!driverId) return;
    setActionInProgress(rideId);
    try {
      const res = await fetch(`/api/admin/bookings/${rideId}/assign`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ driverId })
      });
      if (res.ok) {
        showToast("Manual driver assignment successful");
        setIsAssigningDriverToRide(null);
        await fetchBookings();
        await fetchDrivers();
      } else {
        const data = await res.json();
        showToast(data.error || "Assignment failed", "error");
      }
    } catch (err) {
      showToast("Network dispatch error", "error");
    } finally {
      setActionInProgress(null);
    }
  };

  const handleUpdateBookingStatus = async (rideId: string, nextStatus: string) => {
    setActionInProgress(rideId);
    try {
      const res = await fetch(`/api/admin/bookings/${rideId}/status`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ status: nextStatus })
      });
      if (res.ok) {
        showToast(`Transit state updated to ${nextStatus.replace("_", " ")}`);
        await fetchBookings();
        await fetchDrivers();
      }
    } catch (err) {
      showToast("Failed to update booking transit", "error");
    } finally {
      setActionInProgress(null);
    }
  };

  const handleDeleteBooking = async (rideId: string) => {
    if (!confirm("Are you sure you want to cancel and delete this emergency booking record?")) return;
    setActionInProgress(rideId);
    try {
      const res = await fetch(`/api/admin/bookings/${rideId}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        showToast("Booking record removed");
        await fetchBookings();
        await fetchDrivers();
      }
    } catch (err) {
      showToast("Failed to delete booking", "error");
    } finally {
      setActionInProgress(null);
    }
  };

  // Settings Actions
  const handleSaveSettings = async (updatedSettings: Partial<SystemSettings>) => {
    if (!sysSettings) return;
    const nextSettings = { ...sysSettings, ...updatedSettings };
    try {
      const res = await fetch("/api/admin/settings", {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify(nextSettings)
      });
      if (res.ok) {
        setSysSettings(nextSettings);
        showToast("Control Room settings updated");
      }
    } catch (err) {
      showToast("Failed to save settings", "error");
    }
  };

  const handleAddVillage = () => {
    if (!newVillageInput.trim() || !sysSettings) return;
    if (sysSettings.allowedVillages.includes(newVillageInput.trim())) {
      showToast("Village already added", "error");
      return;
    }
    const updatedVillages = [...sysSettings.allowedVillages, newVillageInput.trim()];
    handleSaveSettings({ allowedVillages: updatedVillages });
    setNewVillageInput("");
  };

  const handleRemoveVillage = (villageToRemove: string) => {
    if (!sysSettings) return;
    const updatedVillages = sysSettings.allowedVillages.filter(v => v !== villageToRemove);
    handleSaveSettings({ allowedVillages: updatedVillages });
  };

  // Export report simulation
  const handleExportReport = (reportType: string) => {
    showToast(`Generating certified ${reportType} report...`);
    setTimeout(() => {
      const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify({
        generatedAt: new Date().toISOString(),
        officer: user?.name,
        systemMetrics: metrics,
        systemCharts: charts,
        activeSettings: sysSettings,
        recordedBookings: bookings
      }, null, 2));
      const downloadAnchor = document.createElement('a');
      downloadAnchor.setAttribute("href", dataStr);
      downloadAnchor.setAttribute("download", `GramGo_DistrictReport_${reportType}_${Date.now()}.json`);
      document.body.appendChild(downloadAnchor);
      downloadAnchor.click();
      downloadAnchor.remove();
      showToast(`Certified report downloaded successfully!`, "success");
    }, 1500);
  };

  // Filter lists
  const filteredUsers = (Array.isArray(users) ? users : []).filter(u => {
    const matchesSearch = u.name.toLowerCase().includes(userSearch.toLowerCase()) || 
                          u.phone.includes(userSearch) || 
                          (u.email && u.email.toLowerCase().includes(userSearch.toLowerCase())) ||
                          u.village.toLowerCase().includes(userSearch.toLowerCase());
    const matchesRole = userRoleFilter === "all" ? true : u.role === userRoleFilter;
    return matchesSearch && matchesRole;
  });

  const filteredDrivers = driversList.filter(d => {
    const matchesSearch = d.name.toLowerCase().includes(driverSearch.toLowerCase()) || 
                          d.phone.includes(driverSearch) || 
                          (d.vehicleNumber && d.vehicleNumber.toLowerCase().includes(driverSearch.toLowerCase())) ||
                          d.village.toLowerCase().includes(driverSearch.toLowerCase());
    
    const matchesStatus = driverStatusFilter === "all" ? true : d.status === driverStatusFilter;
    
    // Advanced Filters for drivers
    const matchesAdvDriverStatus = advFilters.driverStatus === "all" ? true : d.status === advFilters.driverStatus;
    
    let matchesOnlineOffline = true;
    if (advFilters.onlineOffline === "online") {
      matchesOnlineOffline = d.status !== "offline";
    } else if (advFilters.onlineOffline === "offline") {
      matchesOnlineOffline = d.status === "offline";
    }

    const matchesDistrict = advFilters.district === "all" ? true : (d.district && d.district.toLowerCase() === advFilters.district.toLowerCase());
    const matchesVillage = advFilters.village === "all" ? true : (d.village && d.village.toLowerCase() === advFilters.village.toLowerCase());
    const matchesVehicleType = advFilters.vehicleType === "all" ? true : (d.vehicleType && d.vehicleType.toLowerCase() === advFilters.vehicleType.toLowerCase());

    return matchesSearch && matchesStatus && matchesAdvDriverStatus && matchesOnlineOffline && matchesDistrict && matchesVillage && matchesVehicleType;
  });

  const filteredBookings = bookings.filter(b => {
    const matchesSearch = b.patientName.toLowerCase().includes(bookingSearch.toLowerCase()) || 
                          b.patientPhone.includes(bookingSearch) || 
                          b.village.toLowerCase().includes(bookingSearch.toLowerCase()) ||
                          b.emergencyType.toLowerCase().includes(bookingSearch.toLowerCase()) ||
                          (b.driverName && b.driverName.toLowerCase().includes(bookingSearch.toLowerCase()));
    
    const matchesStatus = bookingStatusFilter === "all" ? true : b.status === bookingStatusFilter;
    
    // Advanced Filters for bookings
    const matchesAdvRideStatus = advFilters.rideStatus === "all" ? true : b.status === advFilters.rideStatus;
    
    const matchesEmergency = advFilters.emergency === "all" ? true : (
      b.emergencyType.toLowerCase() === advFilters.emergency.toLowerCase() ||
      b.priority.toLowerCase() === advFilters.emergency.toLowerCase()
    );

    const matchesVillage = advFilters.village === "all" ? true : (b.village && b.village.toLowerCase() === advFilters.village.toLowerCase());
    const matchesVehicleType = advFilters.vehicleType === "all" ? true : (b.vehicleType && b.vehicleType.toLowerCase() === advFilters.vehicleType.toLowerCase());

    let matchesDate = true;
    if (advFilters.dateStart) {
      const startMs = new Date(advFilters.dateStart).getTime();
      matchesDate = matchesDate && b.createdAt >= startMs;
    }
    if (advFilters.dateEnd) {
      const endMs = new Date(advFilters.dateEnd + "T23:59:59.999Z").getTime();
      matchesDate = matchesDate && b.createdAt <= endMs;
    }

    let matchesDistrict = true;
    if (advFilters.district !== "all") {
      // Find driver's district, default is Ghazipur
      const drv = driversList.find(d => d.id === b.driverId);
      const dist = drv?.district || "Ghazipur";
      matchesDistrict = dist.toLowerCase() === advFilters.district.toLowerCase();
    }

    let matchesPayment = true;
    if (advFilters.paymentStatus !== "all") {
      // Map ride status to paymentStatus
      const virtualPaymentStatus = b.status === "completed" ? "completed" : b.status === "cancelled" ? "failed" : "pending";
      matchesPayment = virtualPaymentStatus === advFilters.paymentStatus;
    }

    return matchesSearch && matchesStatus && matchesAdvRideStatus && matchesEmergency && matchesVillage && matchesVehicleType && matchesDate && matchesDistrict && matchesPayment;
  });

  const dailyRidesData = charts?.dailyRides || [];
  const weeklyRidesData = charts?.weeklyRides || [];
  const monthlyRevenueData = charts?.monthlyRevenue || [];
  const driverGrowthData = charts?.driverGrowth || [];
  const passengerGrowthData = charts?.passengerGrowth || [];
  const emergenciesData = charts?.emergencies || [];

  if (isLoading && !metrics) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] space-y-4">
        <RefreshCw className="w-10 h-10 text-emerald-600 animate-spin" />
        <p className="text-sm font-semibold text-slate-500">Connecting to GramGo Admin Service...</p>
      </div>
    );
  }

  // Visual helper for priority tags
  const getPriorityStyle = (priority: string) => {
    switch (priority) {
      case "critical": return "bg-red-50 text-red-700 border-red-200";
      case "urgent": return "bg-orange-50 text-orange-700 border-orange-200";
      default: return "bg-slate-50 text-slate-700 border-slate-200";
    }
  };

  const getStatusStyle = (status: string) => {
    switch (status) {
      case "requested": return "bg-slate-50 text-slate-700 border-slate-200";
      case "searching": return "bg-rose-50 text-rose-700 border-rose-200 animate-pulse";
      case "driver_assigned": return "bg-blue-50 text-blue-700 border-blue-200";
      case "driver_arriving": return "bg-teal-50 text-teal-700 border-teal-200";
      case "reached_pickup": return "bg-pink-50 text-pink-700 border-pink-200";
      case "ride_started": return "bg-indigo-50 text-indigo-700 border-indigo-200";
      case "completed": return "bg-emerald-50 text-emerald-700 border-emerald-200";
      case "cancelled": return "bg-red-50 text-red-700 border-red-200";
      default: return "bg-amber-50 text-amber-700 border-amber-200";
    }
  };

  // Interactive SVG Donut chart calculation helper
  const renderInteractiveEmergencyDonut = () => {
    if (!charts || !charts.emergencies || charts.emergencies.length === 0) return null;
    
    const data = charts.emergencies;
    const total = data.reduce((sum: number, item: any) => sum + item.value, 0);
    
    if (total === 0) {
      return (
        <div className="h-48 flex items-center justify-center text-xs text-slate-400">
          No dispatches recorded to chart
        </div>
      );
    }

    let cumulativePercent = 0;
    const radius = 50;
    const strokeWidth = 14;
    const circ = 2 * Math.PI * radius;

    // Beautiful palette for categories
    const colors = ["#e11d48", "#ea580c", "#0284c7", "#0d9488", "#4f46e5"];

    return (
      <div className="flex flex-col sm:flex-row items-center justify-around gap-6">
        <div className="relative w-44 h-44">
          <svg className="w-full h-full transform -rotate-90" viewBox="0 0 120 120">
            {/* Background ring */}
            <circle
              cx="60"
              cy="60"
              r={radius}
              fill="transparent"
              stroke="#f1f5f9"
              strokeWidth={strokeWidth}
            />
            
            {data.map((item: any, i: number) => {
              const percent = item.value / total;
              const strokeLength = percent * circ;
              const strokeOffset = circ - strokeLength + (cumulativePercent * circ);
              cumulativePercent -= percent;
              
              const isHovered = hoveredEmergencyType === item.name;

              return (
                <circle
                  key={item.name}
                  cx="60"
                  cy="60"
                  r={radius}
                  fill="transparent"
                  stroke={colors[i % colors.length]}
                  strokeWidth={isHovered ? strokeWidth + 2 : strokeWidth}
                  strokeDasharray={circ}
                  strokeDashoffset={strokeOffset}
                  strokeLinecap="round"
                  className="transition-all duration-300 cursor-pointer"
                  onMouseEnter={() => setHoveredEmergencyType(item.name)}
                  onMouseLeave={() => setHoveredEmergencyType(null)}
                />
              );
            })}
          </svg>
          
          {/* Centered overall number */}
          <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
            <span className="text-2xl font-black text-slate-900">{total}</span>
            <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Total</span>
          </div>
        </div>

        {/* Custom Interactive Legend */}
        <div className="space-y-2 w-full max-w-[200px]">
          {data.map((item: any, i: number) => (
            <div 
              key={item.name}
              onMouseEnter={() => setHoveredEmergencyType(item.name)}
              onMouseLeave={() => setHoveredEmergencyType(null)}
              className={`flex items-center justify-between p-1.5 rounded-lg transition-colors cursor-pointer ${
                hoveredEmergencyType === item.name ? "bg-slate-50" : ""
              }`}
            >
              <div className="flex items-center space-x-2">
                <span 
                  className="w-2.5 h-2.5 rounded-full" 
                  style={{ backgroundColor: colors[i % colors.length] }} 
                />
                <span className="text-xs font-semibold text-slate-700">{item.name}</span>
              </div>
              <span className="text-xs font-bold text-slate-900">
                {item.value} ({Math.round((item.value / total) * 100)}%)
              </span>
            </div>
          ))}
        </div>
      </div>
    );
  };

  return (
    <div id="admin-hub-root" className="max-w-7xl mx-auto px-4 py-8 sm:px-6 lg:px-8 space-y-8">
      
      {/* Toast Alert */}
      {toastMessage && (
        <div className={`fixed bottom-6 right-6 z-50 p-4 rounded-xl shadow-lg border text-xs font-bold flex items-center space-x-2 animate-bounce-once ${
          toastMessage.type === "success" 
            ? "bg-emerald-50 text-emerald-800 border-emerald-200" 
            : "bg-red-50 text-red-800 border-red-200"
        }`}>
          {toastMessage.type === "success" ? <CheckCircle2 className="w-4 h-4" /> : <AlertTriangle className="w-4 h-4" />}
          <span>{toastMessage.text}</span>
        </div>
      )}

      {/* Header Banner */}
      <div className="bg-slate-900 text-slate-300 rounded-3xl p-6 shadow-xl flex flex-col md:flex-row items-start md:items-center justify-between gap-6 relative overflow-hidden">
        <div className="space-y-1 z-10">
          <div className="flex items-center space-x-2">
            <span className="px-2.5 py-0.5 bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 text-[10px] font-black uppercase rounded-lg">
              District Health Office Control
            </span>
            <span className="flex items-center text-[10px] bg-red-500/10 border border-red-500/20 text-red-400 px-2 py-0.5 rounded-lg font-bold">
              ● Central Server Live
            </span>
          </div>
          <h1 className="text-2xl font-black text-white">District Dispatch Control Room</h1>
          <p className="text-xs text-slate-400 max-w-lg">
            Real-time emergency monitoring, village volunteer credentials verification, manual dispatcher dispatch, and subsidy audit systems.
          </p>
        </div>

        <div className="flex items-center gap-2 z-10 w-full md:w-auto">
          <button 
            onClick={() => setIsSearchOpen(true)} 
            className="flex items-center space-x-2 px-4 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white rounded-2xl border border-slate-700 transition font-extrabold text-xs cursor-pointer"
            title="Open Global Search"
          >
            <Search className="w-4 h-4 text-emerald-400" />
            <span>Global Search</span>
          </button>

          <button 
            onClick={fetchData} 
            className="p-3 bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white rounded-2xl border border-slate-700 transition cursor-pointer"
            title="Refresh Server Records"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
          
          <div className="text-left md:text-right px-4 py-2 bg-slate-800 border border-slate-700 rounded-2xl text-xs font-bold">
            <span className="text-[10px] text-slate-400 block uppercase">Panchayat Hub</span>
            <span className="text-white">Ghazipur, UP</span>
          </div>
        </div>

        {/* Background glow */}
        <div className="absolute right-0 top-0 w-64 h-64 bg-emerald-500/5 rounded-full blur-3xl -z-0 pointer-events-none" />
      </div>

      {/* GLOBAL ADVANCED FILTERS PANEL */}
      <div id="advanced-filters-panel" className="bg-white border border-slate-100 rounded-3xl p-6 shadow-sm space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center space-x-3">
            <div className="p-2.5 bg-emerald-50 text-emerald-600 rounded-2xl">
              <Sliders className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-sm font-black text-slate-900 flex items-center gap-2">
                <span>Advanced Analytics & Lifeline Filters</span>
                {getActiveFiltersCount() > 0 && (
                  <span className="px-2 py-0.5 bg-emerald-100 text-emerald-800 rounded-full text-[10px] font-black">
                    {getActiveFiltersCount()} Active
                  </span>
                )}
              </h2>
              <p className="text-xs text-slate-400">Apply granular filters across emergency dispatches, volunteer pool, and village records.</p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {getActiveFiltersCount() > 0 && (
              <button
                id="clear-all-filters-btn"
                onClick={resetAdvFilters}
                className="px-3 py-2 bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-100 rounded-xl text-xs font-black uppercase tracking-wider transition cursor-pointer"
              >
                Clear All Filters
              </button>
            )}
            <button
              id="toggle-advanced-filters-btn"
              onClick={() => setShowAdvancedFilters(!showAdvancedFilters)}
              className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-black uppercase tracking-wider transition flex items-center space-x-1.5 cursor-pointer"
            >
              <span>{showAdvancedFilters ? "Collapse Filters" : "Configure Advanced Filters"}</span>
              <span className="text-[10px] font-bold">({getActiveFiltersCount()})</span>
            </button>
          </div>
        </div>

        {/* Filters grid */}
        {showAdvancedFilters && (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4 pt-4 border-t border-slate-50">
            {/* 1. Date Range Start */}
            <div className="space-y-1">
              <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Start Date</label>
              <input
                id="filter-start-date"
                type="date"
                value={advFilters.dateStart}
                onChange={(e) => setAdvFilters({ ...advFilters, dateStart: e.target.value })}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-100 rounded-xl text-xs font-bold text-slate-700 focus:bg-white focus:outline-none focus:border-emerald-500 transition"
              />
            </div>

            {/* 2. Date Range End */}
            <div className="space-y-1">
              <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">End Date</label>
              <input
                id="filter-end-date"
                type="date"
                value={advFilters.dateEnd}
                onChange={(e) => setAdvFilters({ ...advFilters, dateEnd: e.target.value })}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-100 rounded-xl text-xs font-bold text-slate-700 focus:bg-white focus:outline-none focus:border-emerald-500 transition"
              />
            </div>

            {/* 3. Ride Status */}
            <div className="space-y-1">
              <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Ride Status</label>
              <select
                id="filter-ride-status"
                value={advFilters.rideStatus}
                onChange={(e) => {
                  setAdvFilters({ ...advFilters, rideStatus: e.target.value });
                  setBookingStatusFilter(e.target.value);
                }}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-100 rounded-xl text-xs font-bold text-slate-700 focus:bg-white focus:outline-none focus:border-emerald-500 transition cursor-pointer"
              >
                <option value="all">All Ride Statuses</option>
                <option value="requested">Requested 📝</option>
                <option value="searching">Searching Driver 🚨</option>
                <option value="driver_assigned">Driver Assigned 🚙</option>
                <option value="driver_arriving">Driver Arriving 📍</option>
                <option value="reached_pickup">Driver Reached Pickup 🏡</option>
                <option value="ride_started">Ride Started 🚀</option>
                <option value="completed">Ride Completed ✓</option>
                <option value="cancelled">Ride Cancelled ✕</option>
              </select>
            </div>

            {/* 4. Driver Status */}
            <div className="space-y-1">
              <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Driver Status</label>
              <select
                id="filter-driver-status"
                value={advFilters.driverStatus}
                onChange={(e) => {
                  setAdvFilters({ ...advFilters, driverStatus: e.target.value });
                  setDriverStatusFilter(e.target.value);
                }}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-100 rounded-xl text-xs font-bold text-slate-700 focus:bg-white focus:outline-none focus:border-emerald-500 transition cursor-pointer"
              >
                <option value="all">All Driver Statuses</option>
                <option value="available">Available ⚡</option>
                <option value="busy">Busy 🚙</option>
                <option value="offline">Offline 🛑</option>
              </select>
            </div>

            {/* 5. Emergency Types / priority */}
            <div className="space-y-1">
              <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Emergency / Priority</label>
              <select
                id="filter-emergency-type"
                value={advFilters.emergency}
                onChange={(e) => setAdvFilters({ ...advFilters, emergency: e.target.value })}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-100 rounded-xl text-xs font-bold text-slate-700 focus:bg-white focus:outline-none focus:border-emerald-500 transition cursor-pointer"
              >
                <option value="all">All Emergencies</option>
                <option value="Maternity">Maternity Case 🤰</option>
                <option value="Accident/Trauma">Accident / Trauma 🤕</option>
                <option value="Severe Illness">Severe Illness 🤒</option>
                <option value="Cardiac">Cardiac Emergency 🫀</option>
                <option value="Other">Other Medical Case 🩺</option>
                <option value="critical">Critical Priority 🟥</option>
                <option value="urgent">Urgent Priority 🟧</option>
                <option value="non-urgent">Non-Urgent Priority 🟨</option>
              </select>
            </div>

            {/* 6. Online Status */}
            <div className="space-y-1">
              <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Driver Connectivity</label>
              <select
                id="filter-online-status"
                value={advFilters.onlineOffline}
                onChange={(e) => setAdvFilters({ ...advFilters, onlineOffline: e.target.value })}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-100 rounded-xl text-xs font-bold text-slate-700 focus:bg-white focus:outline-none focus:border-emerald-500 transition cursor-pointer"
              >
                <option value="all">Any Connectivity</option>
                <option value="online">Online Only 🟢</option>
                <option value="offline">Offline Only 🔴</option>
              </select>
            </div>

            {/* 7. Payment Status */}
            <div className="space-y-1">
              <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Subsidy Payment Status</label>
              <select
                id="filter-payment-status"
                value={advFilters.paymentStatus}
                onChange={(e) => setAdvFilters({ ...advFilters, paymentStatus: e.target.value })}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-100 rounded-xl text-xs font-bold text-slate-700 focus:bg-white focus:outline-none focus:border-emerald-500 transition cursor-pointer"
              >
                <option value="all">All Payments</option>
                <option value="completed">Completed ✓</option>
                <option value="pending">Pending 🟡</option>
                <option value="failed">Failed ✕</option>
              </select>
            </div>

            {/* 8. District Filter */}
            <div className="space-y-1">
              <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">District</label>
              <select
                id="filter-district"
                value={advFilters.district}
                onChange={(e) => setAdvFilters({ ...advFilters, district: e.target.value })}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-100 rounded-xl text-xs font-bold text-slate-700 focus:bg-white focus:outline-none focus:border-emerald-500 transition cursor-pointer"
              >
                <option value="all">All Districts</option>
                <option value="Ghazipur">Ghazipur</option>
                <option value="Varanasi">Varanasi</option>
                <option value="Ballia">Ballia</option>
                <option value="Mau">Mau</option>
                <option value="Patna">Patna</option>
              </select>
            </div>

            {/* 9. Village Filter */}
            <div className="space-y-1">
              <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Panchayat Village</label>
              <select
                id="filter-village"
                value={advFilters.village}
                onChange={(e) => setAdvFilters({ ...advFilters, village: e.target.value })}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-100 rounded-xl text-xs font-bold text-slate-700 focus:bg-white focus:outline-none focus:border-emerald-500 transition cursor-pointer"
              >
                <option value="all">All Villages</option>
                {(sysSettings?.allowedVillages || ["Sherpur", "Karimpur", "Gauspur", "Malikpur", "Sauram", "Malsa", "Ghazipur"]).map((v) => (
                  <option key={v} value={v}>{v}</option>
                ))}
              </select>
            </div>

            {/* 10. Vehicle Type */}
            <div className="space-y-1">
              <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Vehicle Type</label>
              <select
                id="filter-vehicle-type"
                value={advFilters.vehicleType}
                onChange={(e) => setAdvFilters({ ...advFilters, vehicleType: e.target.value })}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-100 rounded-xl text-xs font-bold text-slate-700 focus:bg-white focus:outline-none focus:border-emerald-500 transition cursor-pointer"
              >
                <option value="all">All Vehicles</option>
                <option value="Auto Rickshaw">Auto Rickshaw 🛺</option>
                <option value="Bolero SUV">Bolero SUV 🚙</option>
                <option value="Tractor Ambulance">Tractor Ambulance 🚜</option>
                <option value="E-Rickshaw">E-Rickshaw 🛺</option>
              </select>
            </div>
          </div>
        )}
      </div>

      {/* Navigation Layout Tabs */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        
        {/* Navigation panel */}
        <div className="lg:col-span-3 space-y-2">
          {[
            { id: "emergency-dashboard", label: "Emergency Dashboard", icon: HeartPulse, badge: "Panchayat Live" },
            { id: "dashboard", label: "Control Room Stats", icon: LayoutDashboard },
            { id: "users", label: "Registered Network Users", icon: Users, badge: users.length },
            { id: "drivers", label: "Volunteer Driver Pool", icon: Car, badge: driversList.filter(d => d.documentsCount < 3).length ? "Audits Pending" : "" },
            { id: "bookings", label: "Live Emergency Rides", icon: Activity, badge: bookings.filter(b => b.status === "searching").length },
            { id: "reports", label: "Certified Analytics", icon: FileText },
            { id: "settings", label: "Panchayat Settings", icon: Sliders },
            { id: "roles", label: "Roles & Permissions", icon: ShieldAlert },
            { id: "admins", label: "Admin Management", icon: Users, badge: adminTotalCount },
            { id: "priority-engine", label: "Priority Dispatch Engine", icon: ShieldAlert, badge: priorityStatus?.activeStates?.filter((s: any) => s.status === "searching").length || "" },
            { id: "refund-approvals", label: "Wallet & Refund Claims", icon: IndianRupee },
            { id: "commission", label: "Platform Commission", icon: TrendingUp },
            { id: "coupons", label: "Subsidy Vouchers", icon: Ticket },
            { id: "ratings", label: "Ratings & Governance", icon: Star },
            { id: "chat", label: "Admin Support Chat", icon: MessageSquare },
            { id: "notifications", label: "Emergency Alerts Log", icon: Bell }
          ].map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={`w-full flex items-center justify-between p-4 rounded-2xl text-xs font-extrabold transition-all border text-left cursor-pointer ${
                  isActive
                    ? "bg-slate-900 text-white border-slate-900 shadow-lg shadow-slate-100"
                    : "bg-white text-slate-600 hover:text-slate-900 hover:bg-slate-50 border-slate-100"
                }`}
              >
                <div className="flex items-center space-x-3">
                  <Icon className={`w-4 h-4 ${isActive ? "text-emerald-400" : "text-slate-400"}`} />
                  <span>{tab.label}</span>
                </div>
                {tab.badge !== undefined && tab.badge !== "" && tab.badge !== 0 && (
                  <span className={`px-2 py-0.5 rounded-full text-[9px] font-black ${
                    isActive 
                      ? "bg-emerald-600 text-white" 
                      : tab.badge === "Audits Pending"
                      ? "bg-amber-50 text-amber-700 border border-amber-200"
                      : "bg-rose-50 text-rose-700"
                  }`}>
                    {tab.badge}
                  </span>
                )}
              </button>
            );
          })}

          <div className="p-4 bg-emerald-50 border border-emerald-100 rounded-3xl mt-6 space-y-2.5">
            <h4 className="text-xs font-black text-emerald-900 flex items-center space-x-1">
              <ShieldAlert className="w-3.5 h-3.5 text-emerald-700" />
              <span>Panchayat Hotline</span>
            </h4>
            <p className="text-[10px] leading-relaxed text-emerald-800 font-semibold">
              Automatic simulation engine is active. GramGo automatically shifts searching lifelines to driver matches in real time if no manual dispatches are selected.
            </p>
          </div>
        </div>

        {/* Dynamic Panel */}
        <div className="lg:col-span-9 space-y-6">

          {/* Tab: Dashboard Overview */}
          {activeTab === "dashboard" && metrics && (
            <div className="space-y-6">
              
              {/* Numerical stats grid - 9 requested dashboard cards */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                
                {/* 1. Total Users */}
                <div className="bg-white border border-slate-100 p-5 rounded-2xl flex items-center space-x-4 hover:shadow-md transition duration-200">
                  <div className="p-3 bg-blue-50 text-blue-600 rounded-xl">
                    <Users className="w-5 h-5" />
                  </div>
                  <div>
                    <span className="text-[10px] font-bold text-slate-400 block uppercase tracking-wider">Total Users</span>
                    <span className="text-xl font-black text-slate-900 block">{metrics.totalUsers}</span>
                    <span className="text-[10px] text-slate-500">Registered accounts</span>
                  </div>
                </div>

                {/* 2. Total Drivers */}
                <div className="bg-white border border-slate-100 p-5 rounded-2xl flex items-center space-x-4 hover:shadow-md transition duration-200">
                  <div className="p-3 bg-teal-50 text-teal-600 rounded-xl">
                    <Car className="w-5 h-5" />
                  </div>
                  <div>
                    <span className="text-[10px] font-bold text-slate-400 block uppercase tracking-wider">Total Drivers</span>
                    <span className="text-xl font-black text-slate-900 block">{metrics.driversCount}</span>
                    <span className="text-[10px] text-slate-500">Volunteer network</span>
                  </div>
                </div>

                {/* 3. Online Drivers */}
                <div className="bg-white border border-slate-100 p-5 rounded-2xl flex items-center space-x-4 hover:shadow-md transition duration-200">
                  <div className="p-3 bg-emerald-50 text-emerald-600 rounded-xl flex items-center justify-center">
                    <Activity className="w-5 h-5 animate-pulse" />
                  </div>
                  <div>
                    <span className="text-[10px] font-bold text-slate-400 block uppercase tracking-wider">Online Drivers</span>
                    <span className="text-xl font-black text-slate-900 block">
                      {metrics.onlineDriversCount ?? driversList.filter(d => d.status !== "offline").length}
                    </span>
                    <span className="text-[10px] text-emerald-600 font-semibold">Ready for dispatches</span>
                  </div>
                </div>

                {/* 4. Today's Rides */}
                <div className="bg-white border border-slate-100 p-5 rounded-2xl flex items-center space-x-4 hover:shadow-md transition duration-200">
                  <div className="p-3 bg-amber-50 text-amber-600 rounded-xl">
                    <Clock className="w-5 h-5" />
                  </div>
                  <div>
                    <span className="text-[10px] font-bold text-slate-400 block uppercase tracking-wider">Today's Rides</span>
                    <span className="text-xl font-black text-slate-900 block">{metrics.todaysRidesCount ?? 0}</span>
                    <span className="text-[10px] text-slate-500">Created last 24h</span>
                  </div>
                </div>

                {/* 5. Emergency Rides */}
                <div className="bg-white border border-slate-100 p-5 rounded-2xl flex items-center space-x-4 hover:shadow-md transition duration-200">
                  <div className="p-3 bg-rose-50 text-rose-600 rounded-xl">
                    <ShieldAlert className="w-5 h-5" />
                  </div>
                  <div>
                    <span className="text-[10px] font-bold text-slate-400 block uppercase tracking-wider">Emergency Rides</span>
                    <span className="text-xl font-black text-slate-900 block">{metrics.emergencyRidesCount ?? 0}</span>
                    <span className="text-[10px] text-slate-500">Total network dispatches</span>
                  </div>
                </div>

                {/* 6. Revenue */}
                <div className="bg-white border border-slate-100 p-5 rounded-2xl flex items-center space-x-4 hover:shadow-md transition duration-200">
                  <div className="p-3 bg-emerald-50 text-emerald-600 rounded-xl">
                    <IndianRupee className="w-5 h-5" />
                  </div>
                  <div>
                    <span className="text-[10px] font-bold text-slate-400 block uppercase tracking-wider">Revenue</span>
                    <span className="text-xl font-black text-slate-900 block">₹{metrics.revenue ?? metrics.totalSubsidy}</span>
                    <span className="text-[10px] text-emerald-600 font-semibold">Panchayat subsidies</span>
                  </div>
                </div>

                {/* 7. Pending Approvals */}
                <div className="bg-white border border-slate-100 p-5 rounded-2xl flex items-center space-x-4 hover:shadow-md transition duration-200">
                  <div className="p-3 bg-orange-50 text-orange-600 rounded-xl">
                    <AlertTriangle className="w-5 h-5" />
                  </div>
                  <div>
                    <span className="text-[10px] font-bold text-slate-400 block uppercase tracking-wider">Pending Approvals</span>
                    <span className="text-xl font-black text-slate-900 block">
                      {metrics.pendingApprovalsCount ?? driversList.filter(d => d.documentsCount < 3).length}
                    </span>
                    <span className="text-[10px] text-orange-600 font-semibold">Credentials audit pending</span>
                  </div>
                </div>

                {/* 8. Completed Rides */}
                <div className="bg-white border border-slate-100 p-5 rounded-2xl flex items-center space-x-4 hover:shadow-md transition duration-200">
                  <div className="p-3 bg-green-50 text-green-600 rounded-xl">
                    <CheckCircle2 className="w-5 h-5" />
                  </div>
                  <div>
                    <span className="text-[10px] font-bold text-slate-400 block uppercase tracking-wider">Completed Rides</span>
                    <span className="text-xl font-black text-slate-900 block">{metrics.completedBookings}</span>
                    <span className="text-[10px] text-slate-500">Patients safely transited</span>
                  </div>
                </div>

                {/* 9. Cancelled Rides */}
                <div className="bg-white border border-slate-100 p-5 rounded-2xl flex items-center space-x-4 hover:shadow-md transition duration-200">
                  <div className="p-3 bg-slate-100 text-slate-600 rounded-xl">
                    <XCircle className="w-5 h-5" />
                  </div>
                  <div>
                    <span className="text-[10px] font-bold text-slate-400 block uppercase tracking-wider">Cancelled Rides</span>
                    <span className="text-xl font-black text-slate-900 block">{metrics.cancelledBookings ?? 0}</span>
                    <span className="text-[10px] text-slate-500">Aborted dispatches</span>
                  </div>
                </div>

              </div>

              {/* Charts grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                
                {/* 1. Daily Rides */}
                <div className="bg-white border border-slate-100 rounded-3xl p-6 space-y-4 shadow-sm hover:shadow-md transition duration-200">
                  <div>
                    <h3 className="text-sm font-extrabold text-slate-900 flex items-center space-x-2">
                      <span className="w-2 h-2 bg-teal-500 rounded-full animate-pulse" />
                      <span>Daily Dispatch Load</span>
                    </h3>
                    <p className="text-xs text-slate-400">Total emergency rides dispatched per day over the last week.</p>
                  </div>
                  <div className="h-64">
                    {dailyRidesData.length > 0 ? (
                      <ResponsiveContainer width="100%" height="100%">
                        <AreaChart data={dailyRidesData} margin={{ top: 10, right: 5, left: -25, bottom: 0 }}>
                          <defs>
                            <linearGradient id="colorDailyRides" x1="0" y1="0" x2="0" y2="1">
                              <stop offset="5%" stopColor="#0d9488" stopOpacity={0.2}/>
                              <stop offset="95%" stopColor="#0d9488" stopOpacity={0}/>
                            </linearGradient>
                          </defs>
                          <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
                          <XAxis dataKey="name" stroke="#94a3b8" fontSize={10} tickLine={false} axisLine={false} />
                          <YAxis stroke="#94a3b8" fontSize={10} tickLine={false} axisLine={false} allowDecimals={false} />
                          <Tooltip 
                            contentStyle={{ backgroundColor: '#fff', border: '1px solid #f1f5f9', borderRadius: '12px', fontSize: '11px', fontWeight: 'bold', boxShadow: '0 4px 12px rgba(0,0,0,0.05)' }}
                          />
                          <Area type="monotone" dataKey="rides" stroke="#0d9488" strokeWidth={3} fillOpacity={1} fill="url(#colorDailyRides)" />
                        </AreaChart>
                      </ResponsiveContainer>
                    ) : (
                      <div className="h-full flex items-center justify-center text-xs text-slate-400">Loading daily data...</div>
                    )}
                  </div>
                </div>

                {/* 2. Weekly Rides */}
                <div className="bg-white border border-slate-100 rounded-3xl p-6 space-y-4 shadow-sm hover:shadow-md transition duration-200">
                  <div>
                    <h3 className="text-sm font-extrabold text-slate-900 flex items-center space-x-2">
                      <span className="w-2 h-2 bg-indigo-500 rounded-full" />
                      <span>Weekly Dispatch Trends</span>
                    </h3>
                    <p className="text-xs text-slate-400">Aggregated weekly transit requests across panchayats.</p>
                  </div>
                  <div className="h-64">
                    {weeklyRidesData.length > 0 ? (
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={weeklyRidesData} margin={{ top: 10, right: 5, left: -25, bottom: 0 }}>
                          <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
                          <XAxis dataKey="name" stroke="#94a3b8" fontSize={10} tickLine={false} axisLine={false} />
                          <YAxis stroke="#94a3b8" fontSize={10} tickLine={false} axisLine={false} allowDecimals={false} />
                          <Tooltip 
                            contentStyle={{ backgroundColor: '#fff', border: '1px solid #f1f5f9', borderRadius: '12px', fontSize: '11px', fontWeight: 'bold', boxShadow: '0 4px 12px rgba(0,0,0,0.05)' }}
                            cursor={{ fill: '#f8fafc' }}
                          />
                          <Bar dataKey="rides" fill="#4f46e5" radius={[6, 6, 0, 0]} barSize={28} />
                        </BarChart>
                      </ResponsiveContainer>
                    ) : (
                      <div className="h-full flex items-center justify-center text-xs text-slate-400">Loading weekly data...</div>
                    )}
                  </div>
                </div>

                {/* 3. Monthly Revenue */}
                <div className="bg-white border border-slate-100 rounded-3xl p-6 space-y-4 shadow-sm hover:shadow-md transition duration-200">
                  <div>
                    <h3 className="text-sm font-extrabold text-slate-900 flex items-center space-x-2">
                      <span className="w-2 h-2 bg-emerald-500 rounded-full" />
                      <span>Monthly Subsidy Revenue</span>
                    </h3>
                    <p className="text-xs text-slate-400">Panchayat-disbursed transport subsidies earned by drivers.</p>
                  </div>
                  <div className="h-64">
                    {monthlyRevenueData.length > 0 ? (
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={monthlyRevenueData} margin={{ top: 10, right: 5, left: -15, bottom: 0 }}>
                          <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
                          <XAxis dataKey="name" stroke="#94a3b8" fontSize={10} tickLine={false} axisLine={false} />
                          <YAxis stroke="#94a3b8" fontSize={10} tickLine={false} axisLine={false} tickFormatter={(v) => `₹${v}`} />
                          <Tooltip 
                            contentStyle={{ backgroundColor: '#fff', border: '1px solid #f1f5f9', borderRadius: '12px', fontSize: '11px', fontWeight: 'bold', boxShadow: '0 4px 12px rgba(0,0,0,0.05)' }}
                            cursor={{ fill: '#f8fafc' }}
                            formatter={(value) => [`₹${value}`, "Revenue"]}
                          />
                          <Bar dataKey="revenue" fill="#10b981" radius={[6, 6, 0, 0]} barSize={24} />
                        </BarChart>
                      </ResponsiveContainer>
                    ) : (
                      <div className="h-full flex items-center justify-center text-xs text-slate-400">Loading revenue data...</div>
                    )}
                  </div>
                </div>

                {/* 4. Driver Growth */}
                <div className="bg-white border border-slate-100 rounded-3xl p-6 space-y-4 shadow-sm hover:shadow-md transition duration-200">
                  <div>
                    <h3 className="text-sm font-extrabold text-slate-900 flex items-center space-x-2">
                      <span className="w-2 h-2 bg-cyan-500 rounded-full" />
                      <span>Volunteer Driver Growth</span>
                    </h3>
                    <p className="text-xs text-slate-400">Cumulative count of active registered drivers on the network.</p>
                  </div>
                  <div className="h-64">
                    {driverGrowthData.length > 0 ? (
                      <ResponsiveContainer width="100%" height="100%">
                        <AreaChart data={driverGrowthData} margin={{ top: 10, right: 5, left: -25, bottom: 0 }}>
                          <defs>
                            <linearGradient id="colorDrivers" x1="0" y1="0" x2="0" y2="1">
                              <stop offset="5%" stopColor="#06b6d4" stopOpacity={0.2}/>
                              <stop offset="95%" stopColor="#06b6d4" stopOpacity={0}/>
                            </linearGradient>
                          </defs>
                          <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
                          <XAxis dataKey="name" stroke="#94a3b8" fontSize={10} tickLine={false} axisLine={false} />
                          <YAxis stroke="#94a3b8" fontSize={10} tickLine={false} axisLine={false} allowDecimals={false} />
                          <Tooltip 
                            contentStyle={{ backgroundColor: '#fff', border: '1px solid #f1f5f9', borderRadius: '12px', fontSize: '11px', fontWeight: 'bold', boxShadow: '0 4px 12px rgba(0,0,0,0.05)' }}
                          />
                          <Area type="monotone" dataKey="count" stroke="#06b6d4" strokeWidth={3} fillOpacity={1} fill="url(#colorDrivers)" />
                        </AreaChart>
                      </ResponsiveContainer>
                    ) : (
                      <div className="h-full flex items-center justify-center text-xs text-slate-400">Loading growth data...</div>
                    )}
                  </div>
                </div>

                {/* 5. Passenger Growth */}
                <div className="bg-white border border-slate-100 rounded-3xl p-6 space-y-4 shadow-sm hover:shadow-md transition duration-200">
                  <div>
                    <h3 className="text-sm font-extrabold text-slate-900 flex items-center space-x-2">
                      <span className="w-2 h-2 bg-blue-500 rounded-full" />
                      <span>Passenger Enrollment Growth</span>
                    </h3>
                    <p className="text-xs text-slate-400">Cumulative count of registered villagers/passengers over time.</p>
                  </div>
                  <div className="h-64">
                    {passengerGrowthData.length > 0 ? (
                      <ResponsiveContainer width="100%" height="100%">
                        <AreaChart data={passengerGrowthData} margin={{ top: 10, right: 5, left: -25, bottom: 0 }}>
                          <defs>
                            <linearGradient id="colorPassengers" x1="0" y1="0" x2="0" y2="1">
                              <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.2}/>
                              <stop offset="95%" stopColor="#3b82f6" stopOpacity={0}/>
                            </linearGradient>
                          </defs>
                          <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
                          <XAxis dataKey="name" stroke="#94a3b8" fontSize={10} tickLine={false} axisLine={false} />
                          <YAxis stroke="#94a3b8" fontSize={10} tickLine={false} axisLine={false} allowDecimals={false} />
                          <Tooltip 
                            contentStyle={{ backgroundColor: '#fff', border: '1px solid #f1f5f9', borderRadius: '12px', fontSize: '11px', fontWeight: 'bold', boxShadow: '0 4px 12px rgba(0,0,0,0.05)' }}
                          />
                          <Area type="monotone" dataKey="count" stroke="#3b82f6" strokeWidth={3} fillOpacity={1} fill="url(#colorPassengers)" />
                        </AreaChart>
                      </ResponsiveContainer>
                    ) : (
                      <div className="h-full flex items-center justify-center text-xs text-slate-400">Loading enrollment data...</div>
                    )}
                  </div>
                </div>

                {/* 6. Ride Categories */}
                <div className="bg-white border border-slate-100 rounded-3xl p-6 space-y-4 shadow-sm hover:shadow-md transition duration-200">
                  <div>
                    <h3 className="text-sm font-extrabold text-slate-900 flex items-center space-x-2">
                      <span className="w-2 h-2 bg-pink-500 rounded-full" />
                      <span>Ride Categories Mix</span>
                    </h3>
                    <p className="text-xs text-slate-400">Proportional classification of medical emergency triggers.</p>
                  </div>
                  <div className="h-64">
                    {emergenciesData.length > 0 ? (
                      <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                          <Pie
                            data={emergenciesData}
                            cx="50%"
                            cy="50%"
                            innerRadius={50}
                            outerRadius={75}
                            paddingAngle={3}
                            dataKey="value"
                          >
                            {emergenciesData.map((entry: any, index: number) => {
                              const COLORS = ["#e11d48", "#ea580c", "#0284c7", "#0d9488", "#4f46e5"];
                              return <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />;
                            })}
                          </Pie>
                          <Tooltip 
                            contentStyle={{ backgroundColor: '#fff', border: '1px solid #f1f5f9', borderRadius: '12px', fontSize: '11px', fontWeight: 'bold', boxShadow: '0 4px 12px rgba(0,0,0,0.05)' }}
                          />
                          <Legend 
                            verticalAlign="bottom" 
                            height={32} 
                            iconType="circle" 
                            iconSize={6}
                            wrapperStyle={{ fontSize: '9px', fontWeight: '600' }}
                          />
                        </PieChart>
                      </ResponsiveContainer>
                    ) : (
                      <div className="h-full flex items-center justify-center text-xs text-slate-400">Loading category data...</div>
                    )}
                  </div>
                </div>

              </div>

              {/* Secondary analytics details */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                
                {/* Custom Interactive Donut */}
                <div className="bg-white border border-slate-100 rounded-3xl p-6 space-y-4 shadow-sm">
                  <div>
                    <h3 className="text-sm font-extrabold text-slate-900">Interactive Case Hover Breakdown</h3>
                    <p className="text-xs text-slate-400">Hover sectors below or donut ring to audit exact proportional weights.</p>
                  </div>
                  
                  {renderInteractiveEmergencyDonut()}
                </div>

                {/* Village Load Bar Card */}
                <div className="bg-white border border-slate-100 rounded-3xl p-6 space-y-4 shadow-sm">
                  <div>
                    <h3 className="text-sm font-extrabold text-slate-900">Panchayat Village Hotspots</h3>
                    <p className="text-xs text-slate-400">Top villages triggering emergency lifeline requests.</p>
                  </div>

                  <div className="space-y-4 pt-2">
                    {charts.villages && charts.villages.length > 0 ? (
                      charts.villages.map((v: any, i: number) => (
                        <div key={v.name} className="space-y-1">
                          <div className="flex justify-between text-xs font-bold text-slate-700">
                            <span>{v.name} Village</span>
                            <span>{v.value} calls</span>
                          </div>
                          <div className="h-2 w-full bg-slate-100 rounded-full overflow-hidden">
                            <div 
                              className="h-full bg-emerald-600 rounded-full transition-all duration-500"
                              style={{ width: `${(v.value / Math.max(...charts.villages.map((x: any) => x.value))) * 100}%` }}
                            />
                          </div>
                        </div>
                      ))
                    ) : (
                      <div className="py-12 text-center text-xs text-slate-400">No village statistics available</div>
                    )}
                  </div>
                </div>

              </div>

              {/* Quick Alerts Room */}
              <div className="bg-white border border-slate-100 rounded-3xl p-6 space-y-4 shadow-sm">
                <div className="flex items-center justify-between border-b border-slate-50 pb-4">
                  <div>
                    <h3 className="text-sm font-extrabold text-slate-900">Critical Control Room Feed</h3>
                    <p className="text-xs text-slate-400">Active live dispatches needing driver assignments.</p>
                  </div>
                  <span className="text-[10px] bg-red-50 text-red-700 border border-red-100 px-2 py-0.5 rounded-full font-bold">
                    Real-time
                  </span>
                </div>

                {bookings.filter(b => b.status === "searching").length === 0 ? (
                  <div className="py-8 text-center text-slate-400 text-xs">
                    <Check className="w-8 h-8 text-emerald-500 mx-auto mb-2" />
                    <span>All emergency requests are successfully assigned to volunteer drivers. Excellent dispatch timing!</span>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {bookings.filter(b => b.status === "searching").slice(0, 3).map(b => (
                      <div key={b.id} className="p-4 bg-rose-50/20 border border-rose-100 rounded-xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                        <div className="space-y-1 text-xs">
                          <div className="flex items-center space-x-2">
                            <span className="font-extrabold text-rose-800">{b.patientName}</span>
                            <span className="px-1.5 py-0.5 bg-red-100 text-red-800 rounded font-black text-[9px] uppercase">{b.emergencyType}</span>
                          </div>
                          <p className="text-slate-500">Village: <strong className="text-slate-800">{b.village}</strong> • Landmark: {b.landmark}</p>
                        </div>

                        <button
                          onClick={() => {
                            setActiveTab("bookings");
                            setIsAssigningDriverToRide(b.id);
                          }}
                          className="px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white rounded-xl font-black text-[10px] uppercase shadow-md flex items-center space-x-1 cursor-pointer"
                        >
                          <span>DISPATCH VEHICLE NOW 🚨</span>
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

            </div>
          )}

          {/* Tab: User Management */}
          {activeTab === "users" && (
            <UserManagement token={token} onShowToast={showToast} filters={advFilters} />
          )}

          {/* Tab: Driver Pool */}
          {activeTab === "drivers" && (
            <DriverManagement token={token} onShowToast={showToast} filters={advFilters} />
          )}

          {/* Tab: Bookings & Manual Dispatch */}
          {activeTab === "bookings" && (
            <div className="bg-white border border-slate-100 rounded-3xl p-6 space-y-6 shadow-sm">
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                <div>
                  <h3 className="text-sm font-extrabold text-slate-900">Control Room Dispatch Board</h3>
                  <p className="text-xs text-slate-400">Review patient transit pipelines and manually override driver pairings.</p>
                </div>

                <div className="flex flex-wrap gap-2 w-full sm:w-auto">
                  <div className="relative flex-grow sm:flex-none">
                    <Search className="absolute left-3 top-2.5 w-4 h-4 text-slate-400" />
                    <input
                      type="text"
                      placeholder="Search patient, village..."
                      value={bookingSearch}
                      onChange={(e) => setBookingSearch(e.target.value)}
                      className="w-full sm:w-44 pl-9 pr-4 py-2 bg-slate-50 border border-slate-100 rounded-xl text-xs font-semibold focus:bg-white focus:outline-none"
                    />
                  </div>

                  <select
                    value={bookingStatusFilter}
                    onChange={(e) => setBookingStatusFilter(e.target.value)}
                    className="px-3 py-2 bg-slate-50 border border-slate-100 rounded-xl text-xs font-semibold focus:outline-none cursor-pointer"
                  >
                    <option value="all">All States</option>
                    <option value="requested">Requested 📝</option>
                    <option value="searching">Searching 🚨</option>
                    <option value="driver_assigned">Assigned 🚙</option>
                    <option value="driver_arriving">Arriving 📍</option>
                    <option value="reached_pickup">Reached Pickup 🏡</option>
                    <option value="ride_started">Ride Started 🚀</option>
                    <option value="completed">Completed ✓</option>
                    <option value="cancelled">Cancelled ✕</option>
                  </select>
                </div>
              </div>

              {/* Bookings rows */}
              <div className="space-y-4">
                {filteredBookings.length === 0 ? (
                  <div className="py-12 text-center text-slate-400 text-xs">
                    No active emergency transport logs found matching filters.
                  </div>
                ) : (
                  filteredBookings.map(b => (
                    <div 
                      key={b.id} 
                      className={`p-5 rounded-2xl border transition-all ${
                        b.status === "searching" 
                          ? "bg-rose-50/10 border-rose-200 hover:bg-rose-50/20" 
                          : "bg-white border-slate-100 hover:border-slate-200"
                      }`}
                    >
                      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 pb-4 border-b border-slate-50 text-xs">
                        <div className="space-y-1">
                          <div className="flex items-center flex-wrap gap-2">
                            <span className="font-extrabold text-sm text-slate-950">{b.patientName}</span>
                            <span className={`px-2 py-0.5 border text-[9px] font-black uppercase rounded ${getPriorityStyle(b.priority)}`}>
                              {b.priority}
                            </span>
                            <span className={`px-2 py-0.5 border text-[9px] font-black uppercase rounded ${getStatusStyle(b.status)}`}>
                              {b.status.replace("_", " ")}
                            </span>
                          </div>
                          <p className="text-slate-400 text-[10px]">Triggered on {new Date(b.createdAt).toLocaleString()} • Patient Contact: {b.patientPhone}</p>
                        </div>

                        {/* Interactive dispatch state controls */}
                        <div className="flex items-center gap-2 w-full md:w-auto">
                          <select
                            value={b.status}
                            onChange={(e) => handleUpdateBookingStatus(b.id, e.target.value)}
                            className="px-2 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-[10px] font-extrabold cursor-pointer uppercase focus:outline-none"
                          >
                            <option value="requested">Requested</option>
                            <option value="searching">Searching</option>
                            <option value="driver_assigned">Assigned</option>
                            <option value="driver_arriving">Arriving</option>
                            <option value="reached_pickup">Reached Pickup</option>
                            <option value="ride_started">Ride Started</option>
                            <option value="completed">Completed</option>
                            <option value="cancelled">Cancelled</option>
                          </select>

                          <button
                            onClick={() => handleDeleteBooking(b.id)}
                            className="p-1.5 text-slate-400 hover:text-rose-500 hover:bg-rose-50 rounded-lg transition"
                            title="Remove Ride Record"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>

                      {/* Map info / Driver Pairing */}
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-4 text-xs font-semibold">
                        
                        {/* Pickup/Destination details */}
                        <div className="space-y-1.5 p-3.5 bg-slate-50 rounded-xl border border-slate-100 text-[11px]">
                          <span className="text-[10px] uppercase font-bold text-slate-400 block tracking-wider">Transit Details</span>
                          <p className="text-slate-800">From Village: <strong className="text-slate-950 font-extrabold">{b.village}</strong></p>
                          <p className="text-slate-500">Landmark Point: {b.landmark || "Village center"}</p>
                          <p className="text-slate-800">Hospital: <strong className="text-emerald-700 font-extrabold">{b.destinationChc}</strong></p>
                        </div>

                        {/* Assigned Driver Panel */}
                        <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-100 flex flex-col justify-between">
                          <div className="text-[11px] space-y-1">
                            <span className="text-[10px] uppercase font-bold text-slate-400 block tracking-wider">Driver Assignment</span>
                            {b.driverId ? (
                              <div>
                                <p className="text-slate-950 font-extrabold">{b.driverName}</p>
                                <p className="text-slate-500 text-[10px]">{b.vehicleType} • {b.driverPhone}</p>
                              </div>
                            ) : (
                              <p className="text-rose-600 font-bold">No Driver Assigned</p>
                            )}
                          </div>

                          {/* Quick manual dispatch assignment button */}
                          <div className="pt-2">
                            {isAssigningDriverToRide === b.id ? (
                              <div className="flex items-center gap-1">
                                <select
                                  onChange={(e) => handleAssignDriver(b.id, e.target.value)}
                                  className="flex-grow p-1.5 bg-white border border-slate-200 rounded-lg text-[10px] cursor-pointer"
                                  defaultValue=""
                                >
                                  <option value="" disabled>Select Driver...</option>
                                  {driversList
                                    .filter(d => d.status === "available")
                                    .map(d => (
                                      <option key={d.id} value={d.id}>
                                        {d.name} ({d.vehicleType} - {d.village})
                                      </option>
                                    ))}
                                </select>
                                <button
                                  onClick={() => setIsAssigningDriverToRide(null)}
                                  className="p-1.5 bg-slate-100 rounded-lg hover:bg-slate-200"
                                >
                                  <X className="w-3.5 h-3.5" />
                                </button>
                              </div>
                            ) : (
                              <button
                                onClick={() => setIsAssigningDriverToRide(b.id)}
                                className="px-3 py-1 bg-slate-900 hover:bg-slate-800 text-white rounded-lg text-[10px] font-black uppercase tracking-wider transition cursor-pointer"
                              >
                                {b.driverId ? "Re-assign Driver" : "Pair Driver"}
                              </button>
                            )}
                          </div>
                        </div>

                      </div>

                    </div>
                  ))
                )}
              </div>
            </div>
          )}

          {/* Tab: Certified Analytics Reports */}
          {activeTab === "reports" && metrics && (
            <div className="space-y-6">
              
              <div className="bg-white border border-slate-100 rounded-3xl p-6 space-y-6 shadow-sm">
                <div>
                  <h3 className="text-sm font-extrabold text-slate-900">District Audit Export Center</h3>
                  <p className="text-xs text-slate-400 font-medium">Download certified database exports, system configurations, and fuel voucher records.</p>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  
                  <div className="p-5 border border-slate-100 bg-slate-50/50 hover:bg-slate-50 rounded-2xl flex flex-col justify-between items-start space-y-4">
                    <div className="space-y-1.5 text-xs">
                      <span className="p-2 bg-emerald-50 text-emerald-700 rounded-xl inline-block">
                        <FileText className="w-5 h-5" />
                      </span>
                      <h4 className="font-extrabold text-slate-900">Monthly Subsidy Disbursement</h4>
                      <p className="text-[11px] text-slate-500 leading-normal">
                        Certified report tracking all volunteer driver transits and corresponding Direct Benefit Transfer DBT fuel grants.
                      </p>
                    </div>
                    <button
                      onClick={() => handleExportReport("Disbursement")}
                      className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-[10px] font-black uppercase flex items-center space-x-1 cursor-pointer"
                    >
                      <Download className="w-3.5 h-3.5" />
                      <span>Export DBT Ledger</span>
                    </button>
                  </div>

                  <div className="p-5 border border-slate-100 bg-slate-50/50 hover:bg-slate-50 rounded-2xl flex flex-col justify-between items-start space-y-4">
                    <div className="space-y-1.5 text-xs">
                      <span className="p-2 bg-blue-50 text-blue-700 rounded-xl inline-block">
                        <Building className="w-5 h-5" />
                      </span>
                      <h4 className="font-extrabold text-slate-900">Community Health Centre Dispatch</h4>
                      <p className="text-[11px] text-slate-500 leading-normal">
                        Case density mix charting busiest hospitals, ambulance transit times, and patient distribution maps.
                      </p>
                    </div>
                    <button
                      onClick={() => handleExportReport("CHC_Dispatch")}
                      className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-[10px] font-black uppercase flex items-center space-x-1 cursor-pointer"
                    >
                      <Download className="w-3.5 h-3.5" />
                      <span>Export Dispatch Map</span>
                    </button>
                  </div>

                </div>
              </div>

              {/* Interactive analytics list breakdown */}
              <div className="bg-white border border-slate-100 rounded-3xl p-6 space-y-4 shadow-sm text-xs font-semibold">
                <div>
                  <h3 className="text-sm font-extrabold text-slate-900">Primary Health Sub-committee Audit Ledger</h3>
                  <p className="text-xs text-slate-400">GramGo automated dispatch simulation and manual monitoring metrics log.</p>
                </div>

                <div className="space-y-2 pt-2 text-[11px]">
                  <div className="p-3 bg-slate-50 border border-slate-100 rounded-xl flex items-center justify-between">
                    <span className="text-slate-500">Database Engine State</span>
                    <span className="text-emerald-700 font-bold bg-emerald-50 border border-emerald-100 px-2 py-0.5 rounded">ONLINE</span>
                  </div>
                  <div className="p-3 bg-slate-50 border border-slate-100 rounded-xl flex items-center justify-between">
                    <span className="text-slate-500">Total Recorded Emergency Cases</span>
                    <span className="text-slate-900 font-extrabold">{bookings.length}</span>
                  </div>
                  <div className="p-3 bg-slate-50 border border-slate-100 rounded-xl flex items-center justify-between">
                    <span className="text-slate-500">Manual Dispatch Override Share</span>
                    <span className="text-slate-900 font-extrabold">
                      {Math.round((bookings.filter(b => b.isManual).length / (bookings.length || 1)) * 100)}%
                    </span>
                  </div>
                  <div className="p-3 bg-slate-50 border border-slate-100 rounded-xl flex items-center justify-between">
                    <span className="text-slate-500">Volunteer Fuel Grant Payouts</span>
                    <span className="text-emerald-600 font-extrabold">₹{bookings.filter(b => b.status === "completed").length * 500}</span>
                  </div>
                </div>
              </div>

            </div>
          )}

          {/* Tab: System Settings */}
          {activeTab === "settings" && sysSettings && (
            <div className="bg-white border border-slate-100 rounded-3xl p-6 space-y-6 shadow-sm">
              <div>
                <h3 className="text-sm font-extrabold text-slate-900">Control Room Configurations</h3>
                <p className="text-xs text-slate-400">Tweak core routing algorithms, simulation parameters, and active villages.</p>
              </div>

              <div className="space-y-6 max-w-xl text-xs font-semibold">
                
                {/* Auto simulation checkbox */}
                <div className="flex items-center justify-between p-4 bg-slate-50 rounded-2xl border border-slate-100">
                  <div className="space-y-0.5 pr-4">
                    <span className="text-slate-900 font-extrabold block">Live Dispatch Auto-Simulation</span>
                    <span className="text-slate-500 text-[11px] block leading-normal">
                      Automatically advance dispatch lifelines to assigned drivers, en route transits, and successful completion to simulate live local traffic.
                    </span>
                  </div>
                  <button
                    onClick={() => handleSaveSettings({ autoSimulateRides: !sysSettings.autoSimulateRides })}
                    className={`px-4 py-2 text-[10px] font-black uppercase rounded-xl border transition cursor-pointer ${
                      sysSettings.autoSimulateRides 
                        ? "bg-emerald-50 text-emerald-800 border-emerald-200" 
                        : "bg-rose-50 text-rose-800 border-rose-200"
                    }`}
                  >
                    {sysSettings.autoSimulateRides ? "Active ⚡" : "Suspended 🛑"}
                  </button>
                </div>

                {/* SMS notifications config */}
                <div className="flex items-center justify-between p-4 bg-slate-50 rounded-2xl border border-slate-100">
                  <div className="space-y-0.5 pr-4">
                    <span className="text-slate-900 font-extrabold block">ASHA Worker SMS Alerts</span>
                    <span className="text-slate-500 text-[11px] block leading-normal">
                      Trigger direct SMS notifications to local ASHA healthcare providers when a maternity emergency dispatch initiates in their village.
                    </span>
                  </div>
                  <button
                    onClick={() => handleSaveSettings({ smsNotifications: !sysSettings.smsNotifications })}
                    className={`px-4 py-2 text-[10px] font-black uppercase rounded-xl border transition cursor-pointer ${
                      sysSettings.smsNotifications 
                        ? "bg-emerald-50 text-emerald-800 border-emerald-200" 
                        : "bg-slate-100 text-slate-500 border-slate-200"
                    }`}
                  >
                    {sysSettings.smsNotifications ? "Enabled ✓" : "Muted ○"}
                  </button>
                </div>

                {/* Numeric inputs */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <label className="text-slate-700 block uppercase tracking-wide">Maximum Driver Search Radius (Km)</label>
                    <input
                      type="number"
                      value={sysSettings.maxDriverRadiusKm}
                      onChange={(e) => handleSaveSettings({ maxDriverRadiusKm: Number(e.target.value) })}
                      className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:bg-white focus:ring-2 focus:ring-emerald-500"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-slate-700 block uppercase tracking-wide">Emergency Call Hotline</label>
                    <input
                      type="text"
                      value={sysSettings.emergencyHotline}
                      onChange={(e) => handleSaveSettings({ emergencyHotline: e.target.value })}
                      className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:bg-white focus:ring-2 focus:ring-emerald-500"
                    />
                  </div>
                </div>

                {/* Permitted Village List tags */}
                <div className="space-y-3">
                  <label className="text-slate-700 block uppercase tracking-wide">Active Registered Villages</label>
                  
                  <div className="flex flex-wrap gap-2 p-3.5 bg-slate-50 border border-slate-200 rounded-2xl min-h-[80px]">
                    {sysSettings.allowedVillages.map(v => (
                      <span 
                        key={v}
                        className="px-2.5 py-1 bg-white border border-slate-200 text-slate-800 rounded-lg text-[10px] font-extrabold flex items-center space-x-1.5 hover:border-red-200 hover:text-red-600 transition cursor-pointer"
                        onClick={() => handleRemoveVillage(v)}
                        title="Click to remove village"
                      >
                        <span>{v}</span>
                        <X className="w-3 h-3" />
                      </span>
                    ))}
                  </div>

                  {/* Add new Village tag */}
                  <div className="flex gap-2">
                    <input
                      type="text"
                      placeholder="Enter village name (e.g. Yusufpur)..."
                      value={newVillageInput}
                      onChange={(e) => setNewVillageInput(e.target.value)}
                      className="flex-grow px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:bg-white"
                      onKeyDown={(e) => { if(e.key === 'Enter') handleAddVillage(); }}
                    />
                    <button
                      type="button"
                      onClick={handleAddVillage}
                      className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-xl font-extrabold flex items-center space-x-1 cursor-pointer"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      <span>Add</span>
                    </button>
                  </div>
                </div>

              </div>
            </div>
          )}

          {/* Tab: Roles & Permissions */}
          {activeTab === "roles" && (
            <div className="space-y-8">
              
              {/* Role Model Section */}
              <div className="bg-white border border-slate-100 rounded-3xl p-6 space-y-6 shadow-sm">
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                  <div>
                    <h3 className="text-sm font-black text-slate-900 uppercase tracking-wider">Dynamic Role Management</h3>
                    <p className="text-xs text-slate-500">Configure core platform roles, grant capability maps, and customize access scopes.</p>
                  </div>
                  <button
                    onClick={() => {
                      setRoleForm({ name: "", description: "", permissions: [] });
                      setIsEditingRole(true);
                    }}
                    className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-black uppercase flex items-center space-x-1 cursor-pointer"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Create Custom Role</span>
                  </button>
                </div>

                {/* Role Edit/Create Form (Inline Card) */}
                {isEditingRole && (
                  <form onSubmit={handleSaveRole} className="p-5 bg-slate-50 border border-slate-200 rounded-2xl space-y-4">
                    <div className="flex items-center justify-between border-b border-slate-200 pb-2">
                      <h4 className="text-xs font-black uppercase text-slate-800">
                        {roleForm.id ? "Edit System Role Map" : "Create New Custom Role"}
                      </h4>
                      <button
                        type="button"
                        onClick={() => setIsEditingRole(false)}
                        className="text-slate-400 hover:text-slate-600 cursor-pointer"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs font-semibold">
                      <div className="space-y-1">
                        <label className="text-[10px] uppercase font-black text-slate-600 block">Role Name</label>
                        <input
                          type="text"
                          required
                          placeholder="e.g. Health Sub-Inspector"
                          value={roleForm.name}
                          onChange={(e) => setRoleForm({ ...roleForm, name: e.target.value })}
                          className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-emerald-500"
                        />
                      </div>
                      <div className="space-y-1">
                        <label className="text-[10px] uppercase font-black text-slate-600 block">Description</label>
                        <input
                          type="text"
                          required
                          placeholder="e.g. Reviews dispatch ledgers and updates village lists"
                          value={roleForm.description}
                          onChange={(e) => setRoleForm({ ...roleForm, description: e.target.value })}
                          className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-emerald-500"
                        />
                      </div>
                    </div>

                    <div className="space-y-2">
                      <label className="text-[10px] uppercase font-black text-slate-600 block">Assign Capability Permissions</label>
                      {permissions.length === 0 ? (
                        <p className="text-[11px] text-slate-400">No system permissions discovered. Custom roles can be saved empty.</p>
                      ) : (
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5 max-h-48 overflow-y-auto p-2 bg-white border border-slate-100 rounded-xl font-semibold">
                          {permissions.map((perm) => {
                            const isChecked = roleForm.permissions.includes(perm.name);
                            return (
                              <label
                                key={perm.id}
                                className="p-2 border border-slate-50 hover:bg-slate-50 rounded-lg flex items-start space-x-2.5 cursor-pointer text-[11px]"
                              >
                                <input
                                  type="checkbox"
                                  checked={isChecked}
                                  className="mt-0.5 rounded text-emerald-600 focus:ring-emerald-500 cursor-pointer"
                                  onChange={() => {
                                    const nextPerms = isChecked
                                      ? roleForm.permissions.filter((p) => p !== perm.name)
                                      : [...roleForm.permissions, perm.name];
                                    setRoleForm({ ...roleForm, permissions: nextPerms });
                                  }}
                                />
                                <div className="space-y-0.5">
                                  <span className="font-bold text-slate-800">{perm.name}</span>
                                  <span className="text-[10px] text-slate-400 block leading-tight">{perm.description}</span>
                                </div>
                              </label>
                            );
                          })}
                        </div>
                      )}
                    </div>

                    <div className="flex justify-end space-x-2 pt-2 border-t border-slate-200">
                      <button
                        type="button"
                        onClick={() => setIsEditingRole(false)}
                        className="px-3.5 py-1.5 bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 rounded-xl text-xs font-bold cursor-pointer"
                      >
                        Cancel
                      </button>
                      <button
                        type="submit"
                        className="px-4 py-1.5 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-black uppercase cursor-pointer"
                      >
                        Save Role
                      </button>
                    </div>
                  </form>
                )}

                {/* Roles Grid List */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {roles.map((role) => (
                    <div
                      key={role.id}
                      className="p-5 border border-slate-100 hover:border-slate-200 rounded-2xl bg-slate-50/50 flex flex-col justify-between space-y-4 font-semibold"
                    >
                      <div className="space-y-2">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center space-x-2">
                            <h4 className="font-black text-slate-900 text-sm">{role.name}</h4>
                            {role.isSystem && (
                              <span className="px-1.5 py-0.5 bg-blue-50 text-blue-700 border border-blue-100 text-[8px] font-bold uppercase rounded">
                                System
                              </span>
                            )}
                          </div>
                          <div className="flex items-center space-x-1">
                            <button
                              onClick={() => {
                                setRoleForm({
                                  id: role.id,
                                  name: role.name,
                                  description: role.description,
                                  permissions: role.permissions
                                });
                                setIsEditingRole(true);
                              }}
                              className="p-1.5 text-slate-500 hover:text-slate-900 bg-white rounded-lg border border-slate-100 cursor-pointer"
                              title="Edit Role Scope"
                            >
                              <Sliders className="w-3.5 h-3.5" />
                            </button>
                            {!role.isSystem && (
                              <button
                                onClick={() => handleDeleteRole(role.id)}
                                className="p-1.5 text-red-500 hover:text-red-700 bg-white rounded-lg border border-slate-100 cursor-pointer"
                                title="Delete Custom Role"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            )}
                          </div>
                        </div>
                        <p className="text-xs text-slate-500 leading-normal">{role.description}</p>
                      </div>

                      <div className="space-y-1.5">
                        <span className="text-[9px] uppercase font-black text-slate-400 block tracking-wider">Granted Access Scope</span>
                        <div className="flex flex-wrap gap-1">
                          {role.permissions.length === 0 ? (
                            <span className="text-[10px] text-slate-400 italic">No access permissions configured</span>
                          ) : (
                            role.permissions.map((p) => (
                              <span
                                key={p}
                                className="px-1.5 py-0.5 bg-emerald-50 text-emerald-700 border border-emerald-100 text-[10px] font-bold rounded"
                              >
                                {p}
                              </span>
                            ))
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Permission Model Section */}
              <div className="bg-white border border-slate-100 rounded-3xl p-6 space-y-6 shadow-sm">
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                  <div>
                    <h3 className="text-sm font-black text-slate-900 uppercase tracking-wider">System Capability Ledger</h3>
                    <p className="text-xs text-slate-500">View functional platform capabilities or introduce custom functional permissions.</p>
                  </div>
                  <button
                    onClick={() => {
                      setPermissionForm({ name: "", description: "", module: "" });
                      setIsEditingPermission(true);
                    }}
                    className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-black uppercase flex items-center space-x-1 cursor-pointer"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Create Permission</span>
                  </button>
                </div>

                {/* Permission Create/Edit Form (Inline Card) */}
                {isEditingPermission && (
                  <form onSubmit={handleSavePermission} className="p-5 bg-slate-50 border border-slate-200 rounded-2xl space-y-4">
                    <div className="flex items-center justify-between border-b border-slate-200 pb-2">
                      <h4 className="text-xs font-black uppercase text-slate-800">
                        {permissionForm.id ? "Edit System Capability" : "Create Custom Permission Flag"}
                      </h4>
                      <button
                        type="button"
                        onClick={() => setIsEditingPermission(false)}
                        className="text-slate-400 hover:text-slate-600 cursor-pointer"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs font-semibold">
                      <div className="space-y-1">
                        <label className="text-[10px] uppercase font-black text-slate-600 block">Capability Key</label>
                        <input
                          type="text"
                          required
                          placeholder="e.g. approve_transits"
                          value={permissionForm.name}
                          onChange={(e) => setPermissionForm({ ...permissionForm, name: e.target.value })}
                          className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-emerald-500"
                        />
                      </div>
                      <div className="space-y-1">
                        <label className="text-[10px] uppercase font-black text-slate-600 block">Functional Group (Module)</label>
                        <input
                          type="text"
                          required
                          placeholder="e.g. Transit Control"
                          value={permissionForm.module}
                          onChange={(e) => setPermissionForm({ ...permissionForm, module: e.target.value })}
                          className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-emerald-500"
                        />
                      </div>
                      <div className="space-y-1">
                        <label className="text-[10px] uppercase font-black text-slate-600 block">Capability Purpose</label>
                        <input
                          type="text"
                          required
                          placeholder="Allows approving pending ambulance subsidies"
                          value={permissionForm.description}
                          onChange={(e) => setPermissionForm({ ...permissionForm, description: e.target.value })}
                          className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-emerald-500"
                        />
                      </div>
                    </div>

                    <div className="flex justify-end space-x-2 pt-2 border-t border-slate-200">
                      <button
                        type="button"
                        onClick={() => setIsEditingPermission(false)}
                        className="px-3.5 py-1.5 bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 rounded-xl text-xs font-bold cursor-pointer"
                      >
                        Cancel
                      </button>
                      <button
                        type="submit"
                        className="px-4 py-1.5 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-black uppercase cursor-pointer"
                      >
                        Save Permission
                      </button>
                    </div>
                  </form>
                )}

                {/* Permissions Table view */}
                <div className="overflow-x-auto border border-slate-100 rounded-2xl font-semibold">
                  <table className="w-full text-left text-xs text-slate-600">
                    <thead className="bg-slate-50 border-b border-slate-100 text-[10px] font-black uppercase text-slate-500">
                      <tr>
                        <th className="px-5 py-3">Module</th>
                        <th className="px-5 py-3">Permission Key</th>
                        <th className="px-5 py-3">Scope Description</th>
                        <th className="px-5 py-3 text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {permissions.map((perm) => (
                        <tr key={perm.id} className="hover:bg-slate-50/50">
                          <td className="px-5 py-3.5 font-bold text-slate-900">{perm.module}</td>
                          <td className="px-5 py-3.5">
                            <code className="px-1.5 py-0.5 bg-slate-100 text-slate-800 rounded font-mono text-[10px]">
                              {perm.name}
                            </code>
                          </td>
                          <td className="px-5 py-3.5 text-[11px] leading-relaxed text-slate-500">{perm.description}</td>
                          <td className="px-5 py-3.5 text-right">
                            <div className="flex items-center justify-end space-x-1">
                              <button
                                onClick={() => {
                                  setPermissionForm({
                                    id: perm.id,
                                    name: perm.name,
                                    module: perm.module,
                                    description: perm.description
                                  });
                                  setIsEditingPermission(true);
                                }}
                                className="p-1 text-slate-400 hover:text-slate-900 cursor-pointer"
                                title="Edit Description"
                              >
                                <Sliders className="w-3.5 h-3.5" />
                              </button>
                              <button
                                onClick={() => handleDeletePermission(perm.id)}
                                className="p-1 text-red-400 hover:text-red-600 cursor-pointer"
                                title="Delete Permission"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

            </div>
          )}

          {/* Admin Management Section */}
          {activeTab === "admins" && (
            <div className="lg:col-span-9 space-y-6">
              
              {/* Reset Password Modal */}
              {isAdminResetPasswordModal && (
                <div className="fixed inset-0 bg-slate-950/45 backdrop-blur-xs flex items-center justify-center z-50 p-4">
                  <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-xl w-full max-w-md space-y-4">
                    <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                      <h3 className="font-black text-sm uppercase text-slate-900 tracking-wider">Reset Admin Password</h3>
                      <button 
                        onClick={() => {
                          setIsAdminResetPasswordModal(null);
                          setAdminNewPassword("");
                        }}
                        className="text-slate-400 hover:text-slate-600 cursor-pointer"
                      >
                        <X className="w-5 h-5" />
                      </button>
                    </div>
                    
                    <form onSubmit={handleResetAdminPassword} className="space-y-4">
                      <p className="text-xs text-slate-500 leading-normal">
                        Provide a secure new password of at least 6 characters for this administrator.
                      </p>
                      
                      <div className="space-y-1.5 font-semibold text-xs">
                        <label className="text-[10px] uppercase font-black text-slate-600 block">New Password</label>
                        <input
                          type="password"
                          required
                          minLength={6}
                          placeholder="••••••••"
                          value={adminNewPassword}
                          onChange={(e) => setAdminNewPassword(e.target.value)}
                          className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-emerald-500"
                        />
                      </div>
                      
                      <div className="flex justify-end space-x-2 pt-2">
                        <button
                          type="button"
                          onClick={() => {
                            setIsAdminResetPasswordModal(null);
                            setAdminNewPassword("");
                          }}
                          className="px-4 py-2 bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 rounded-xl text-xs font-bold cursor-pointer"
                        >
                          Cancel
                        </button>
                        <button
                          type="submit"
                          disabled={actionInProgress === isAdminResetPasswordModal}
                          className="px-5 py-2 bg-slate-900 hover:bg-slate-800 disabled:bg-slate-400 text-white rounded-xl text-xs font-black uppercase cursor-pointer"
                        >
                          {actionInProgress === isAdminResetPasswordModal ? "Updating..." : "Reset Password"}
                        </button>
                      </div>
                    </form>
                  </div>
                </div>
              )}

              {/* Header card with action */}
              <div className="bg-white border border-slate-100 rounded-3xl p-6 space-y-4 shadow-sm">
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                  <div>
                    <h2 className="text-lg font-black text-slate-900 tracking-tight">Administrative Accounts Ledger</h2>
                    <p className="text-xs text-slate-500">Create, edit, suspend, activate or delete Panchayat System Administrators.</p>
                  </div>
                  <button
                    onClick={() => {
                      setAdminForm({ name: "", phone: "", email: "", password: "", role: "Admin", village: "Sherpur" });
                      setIsEditingAdmin(true);
                    }}
                    className="px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-2xl text-xs font-black uppercase flex items-center space-x-1.5 cursor-pointer shadow-md shadow-emerald-600/10 transition"
                  >
                    <Plus className="w-4 h-4" />
                    <span>Create Administrator</span>
                  </button>
                </div>

                {/* Inline form to create or edit admin */}
                {isEditingAdmin && (
                  <form onSubmit={handleSaveAdmin} className="p-6 bg-slate-50 border border-slate-200/80 rounded-2xl space-y-4">
                    <div className="flex items-center justify-between border-b border-slate-200 pb-2">
                      <h3 className="text-xs font-black uppercase text-slate-800 tracking-wider">
                        {adminForm.id ? "Modify Admin Account Details" : "Register New Administrator"}
                      </h3>
                      <button
                        type="button"
                        onClick={() => setIsEditingAdmin(false)}
                        className="text-slate-400 hover:text-slate-600 cursor-pointer"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4 text-xs font-semibold">
                      <div className="space-y-1">
                        <label className="text-[10px] uppercase font-black text-slate-600 block">Full Name</label>
                        <input
                          type="text"
                          required
                          placeholder="e.g. Anand Sharma"
                          value={adminForm.name}
                          onChange={(e) => setAdminForm({ ...adminForm, name: e.target.value })}
                          className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-emerald-500"
                        />
                      </div>
                      
                      <div className="space-y-1">
                        <label className="text-[10px] uppercase font-black text-slate-600 block">Phone Number</label>
                        <input
                          type="text"
                          required
                          placeholder="e.g. +91 98765 43210"
                          value={adminForm.phone}
                          onChange={(e) => setAdminForm({ ...adminForm, phone: e.target.value })}
                          className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-emerald-500"
                        />
                      </div>

                      <div className="space-y-1">
                        <label className="text-[10px] uppercase font-black text-slate-600 block">Email Address (Optional)</label>
                        <input
                          type="email"
                          placeholder="e.g. anand@gramgo.org"
                          value={adminForm.email}
                          onChange={(e) => setAdminForm({ ...adminForm, email: e.target.value })}
                          className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-emerald-500"
                        />
                      </div>

                      {!adminForm.id && (
                        <div className="space-y-1">
                          <label className="text-[10px] uppercase font-black text-slate-600 block">Temporary Password</label>
                          <input
                            type="password"
                            required
                            minLength={6}
                            placeholder="Min 6 characters"
                            value={adminForm.password}
                            onChange={(e) => setAdminForm({ ...adminForm, password: e.target.value })}
                            className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-emerald-500"
                          />
                        </div>
                      )}

                      <div className="space-y-1">
                        <label className="text-[10px] uppercase font-black text-slate-600 block">Assigned Role</label>
                        <select
                          value={adminForm.role}
                          onChange={(e) => setAdminForm({ ...adminForm, role: e.target.value })}
                          className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-emerald-500 font-bold"
                        >
                          <option value="Admin">Admin</option>
                          <option value="Super Admin">Super Admin</option>
                          {roles.filter(r => r.name !== "passenger" && r.name !== "driver" && r.name !== "Admin" && r.name !== "Super Admin").map(role => (
                            <option key={role.id} value={role.name}>{role.name}</option>
                          ))}
                        </select>
                      </div>

                      <div className="space-y-1">
                        <label className="text-[10px] uppercase font-black text-slate-600 block">Assigned Village Hub</label>
                        <select
                          value={adminForm.village}
                          onChange={(e) => setAdminForm({ ...adminForm, village: e.target.value })}
                          className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-emerald-500 font-bold"
                        >
                          {sysSettings?.allowedVillages.map(v => (
                            <option key={v} value={v}>{v}</option>
                          )) || (
                            <>
                              <option value="Sherpur">Sherpur</option>
                              <option value="Gauspur">Gauspur</option>
                              <option value="Karimpur">Karimpur</option>
                              <option value="Malikpur">Malikpur</option>
                              <option value="Sohwal">Sohwal</option>
                              <option value="Dildarnagar">Dildarnagar</option>
                            </>
                          )}
                        </select>
                      </div>
                    </div>

                    <div className="flex justify-end space-x-2 pt-2 border-t border-slate-200">
                      <button
                        type="button"
                        onClick={() => setIsEditingAdmin(false)}
                        className="px-4 py-2 bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 rounded-xl text-xs font-bold cursor-pointer"
                      >
                        Cancel
                      </button>
                      <button
                        type="submit"
                        disabled={actionInProgress === (adminForm.id || "new-admin")}
                        className="px-5 py-2 bg-emerald-600 hover:bg-emerald-700 disabled:bg-emerald-400 text-white rounded-xl text-xs font-black uppercase cursor-pointer"
                      >
                        {actionInProgress === (adminForm.id || "new-admin") ? "Saving..." : "Save Admin"}
                      </button>
                    </div>
                  </form>
                )}
              </div>

              {/* Filters & Search section */}
              <div className="bg-white border border-slate-100 rounded-3xl p-5 shadow-sm grid grid-cols-1 md:grid-cols-12 gap-4 items-center">
                
                {/* Search Bar */}
                <div className="md:col-span-5 relative">
                  <Search className="w-4 h-4 text-slate-400 absolute left-4 top-3.5" />
                  <input
                    type="text"
                    placeholder="Search by name, email or phone..."
                    value={adminSearch}
                    onChange={(e) => {
                      setAdminSearch(e.target.value);
                      setAdminPage(1);
                    }}
                    className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-100 rounded-2xl text-xs font-bold placeholder-slate-400 outline-none focus:bg-white focus:ring-2 focus:ring-emerald-500 transition"
                  />
                </div>

                {/* Status Filter */}
                <div className="md:col-span-3 flex items-center space-x-2 text-xs font-bold">
                  <span className="text-slate-400 block whitespace-nowrap">Status:</span>
                  <select
                    value={adminStatusFilter}
                    onChange={(e) => {
                      setAdminStatusFilter(e.target.value);
                      setAdminPage(1);
                    }}
                    className="w-full px-3 py-2.5 bg-slate-50 border border-slate-100 rounded-2xl outline-none focus:bg-white focus:ring-2 focus:ring-emerald-500 font-bold"
                  >
                    <option value="all">All Statuses</option>
                    <option value="active">Active</option>
                    <option value="suspended">Suspended</option>
                  </select>
                </div>

                {/* Role Filter */}
                <div className="md:col-span-4 flex items-center space-x-2 text-xs font-bold">
                  <span className="text-slate-400 block whitespace-nowrap">Role:</span>
                  <select
                    value={adminRoleFilter}
                    onChange={(e) => {
                      setAdminRoleFilter(e.target.value);
                      setAdminPage(1);
                    }}
                    className="w-full px-3 py-2.5 bg-slate-50 border border-slate-100 rounded-2xl outline-none focus:bg-white focus:ring-2 focus:ring-emerald-500 font-bold"
                  >
                    <option value="all">All Admin Roles</option>
                    <option value="admin">Admin</option>
                    <option value="super admin">Super Admin</option>
                    {roles.filter(r => r.name !== "passenger" && r.name !== "driver" && r.name !== "Admin" && r.name !== "Super Admin").map(role => (
                      <option key={role.id} value={role.name}>{role.name}</option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Admin Accounts List */}
              <div className="bg-white border border-slate-100 rounded-3xl p-6 shadow-sm space-y-4">
                <div className="overflow-x-auto border border-slate-100 rounded-2xl font-semibold">
                  <table className="w-full text-left text-xs text-slate-600">
                    <thead className="bg-slate-50 border-b border-slate-100 text-[10px] font-black uppercase text-slate-500">
                      <tr>
                        <th className="px-5 py-3.5">Administrator</th>
                        <th className="px-5 py-3.5">Contact Details</th>
                        <th className="px-5 py-3.5">Role</th>
                        <th className="px-5 py-3.5">Assigned Village</th>
                        <th className="px-5 py-3.5">Status</th>
                        <th className="px-5 py-3.5 text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {adminsList.length === 0 ? (
                        <tr>
                          <td colSpan={6} className="px-5 py-10 text-center text-slate-400 italic">
                            No administrator accounts found matching filters.
                          </td>
                        </tr>
                      ) : (
                        adminsList.map((adminItem) => (
                          <tr key={adminItem.id} className="hover:bg-slate-50/50">
                            
                            {/* Administrator details */}
                            <td className="px-5 py-3.5">
                              <div className="font-bold text-slate-900">{adminItem.name}</div>
                              <div className="text-[10px] text-slate-400 font-normal">Registered {new Date(adminItem.createdAt).toLocaleDateString()}</div>
                            </td>

                            {/* Contact Details */}
                            <td className="px-5 py-3.5 font-normal">
                              <div>{adminItem.phone}</div>
                              {adminItem.email && <div className="text-slate-400 text-[11px]">{adminItem.email}</div>}
                            </td>

                            {/* Role */}
                            <td className="px-5 py-3.5 font-bold">
                              <span className={`px-2 py-0.5 rounded-lg text-[10px] font-black uppercase ${
                                adminItem.role.toLowerCase() === "super admin"
                                  ? "bg-purple-50 text-purple-700 border border-purple-200"
                                  : "bg-blue-50 text-blue-700 border border-blue-200"
                              }`}>
                                {adminItem.role}
                              </span>
                            </td>

                            {/* Assigned Village */}
                            <td className="px-5 py-3.5 font-bold text-slate-700">
                              {adminItem.village}
                            </td>

                            {/* Status */}
                            <td className="px-5 py-3.5">
                              <span className={`px-2 py-0.5 rounded-lg text-[10px] font-black uppercase inline-block ${
                                (adminItem.status || "active") === "active"
                                  ? "bg-emerald-50 text-emerald-700 border border-emerald-100"
                                  : "bg-red-50 text-red-700 border border-red-100"
                              }`}>
                                {adminItem.status || "active"}
                              </span>
                            </td>

                            {/* Actions */}
                            <td className="px-5 py-3.5 text-right">
                              <div className="flex items-center justify-end space-x-1.5">
                                
                                {/* Edit action */}
                                <button
                                  onClick={() => {
                                    setAdminForm({
                                      id: adminItem.id,
                                      name: adminItem.name,
                                      phone: adminItem.phone,
                                      email: adminItem.email || "",
                                      role: adminItem.role,
                                      village: adminItem.village
                                    });
                                    setIsEditingAdmin(true);
                                  }}
                                  className="p-1.5 text-slate-500 hover:text-slate-900 bg-white hover:bg-slate-100 border border-slate-200 rounded-lg cursor-pointer"
                                  title="Edit Admin Details"
                                >
                                  <Sliders className="w-3.5 h-3.5" />
                                </button>

                                {/* Reset Password action */}
                                <button
                                  onClick={() => {
                                    setIsAdminResetPasswordModal(adminItem.id);
                                    setAdminNewPassword("");
                                  }}
                                  className="p-1.5 text-amber-600 hover:text-white hover:bg-amber-600 bg-white border border-amber-200 rounded-lg cursor-pointer transition"
                                  title="Reset Password"
                                >
                                  <RefreshCw className="w-3.5 h-3.5" />
                                </button>

                                {/* Suspend or Activate action */}
                                {adminItem.id !== user?.id && (
                                  <>
                                    {(adminItem.status || "active") === "active" ? (
                                      <button
                                        onClick={() => handleSuspendAdmin(adminItem.id)}
                                        className="p-1.5 text-orange-600 hover:text-white hover:bg-orange-600 bg-white border border-orange-200 rounded-lg cursor-pointer transition"
                                        title="Suspend Administrator"
                                      >
                                        <AlertTriangle className="w-3.5 h-3.5" />
                                      </button>
                                    ) : (
                                      <button
                                        onClick={() => handleActivateAdmin(adminItem.id)}
                                        className="p-1.5 text-emerald-600 hover:text-white hover:bg-emerald-600 bg-white border border-emerald-200 rounded-lg cursor-pointer transition"
                                        title="Activate Administrator"
                                      >
                                        <Check className="w-3.5 h-3.5" />
                                      </button>
                                    )}

                                    {/* Delete action */}
                                    <button
                                      onClick={() => handleDeleteAdmin(adminItem.id)}
                                      className="p-1.5 text-red-600 hover:text-white hover:bg-red-600 bg-white border border-red-200 rounded-lg cursor-pointer transition"
                                      title="Delete Account"
                                    >
                                      <Trash2 className="w-3.5 h-3.5" />
                                    </button>
                                  </>
                                )}
                              </div>
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>

                {/* Pagination Controls */}
                {adminTotalPages > 1 && (
                  <div className="flex items-center justify-between pt-4 border-t border-slate-100 text-xs font-bold">
                    <span className="text-slate-500">
                      Showing Page {adminPage} of {adminTotalPages} (Total {adminTotalCount} Admins)
                    </span>
                    <div className="flex space-x-1.5">
                      <button
                        onClick={() => setAdminPage(prev => Math.max(1, prev - 1))}
                        disabled={adminPage === 1}
                        className="px-3.5 py-1.5 bg-white border border-slate-200 hover:bg-slate-50 rounded-xl text-xs text-slate-700 disabled:opacity-50 cursor-pointer font-extrabold transition"
                      >
                        Previous
                      </button>
                      <button
                        onClick={() => setAdminPage(prev => Math.min(adminTotalPages, prev + 1))}
                        disabled={adminPage === adminTotalPages}
                        className="px-3.5 py-1.5 bg-white border border-slate-200 hover:bg-slate-50 rounded-xl text-xs text-slate-700 disabled:opacity-50 cursor-pointer font-extrabold transition"
                      >
                        Next
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Priority Dispatch Engine Section */}
          {activeTab === "priority-engine" && (
            <div className="lg:col-span-9 space-y-6">
              
              {/* Header Card */}
              <div className="bg-slate-950 border border-slate-900 text-white p-6 sm:p-8 rounded-3xl relative overflow-hidden shadow-xl">
                <div className="absolute right-0 top-0 w-80 h-80 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none" />
                <div className="absolute left-0 bottom-0 w-80 h-80 bg-rose-500/10 rounded-full blur-3xl pointer-events-none" />
                
                <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-4">
                  <div className="space-y-1.5">
                    <div className="flex items-center space-x-2.5">
                      <span className="px-3 py-1 bg-rose-500/20 text-rose-400 border border-rose-500/30 rounded-full text-[10px] font-black uppercase tracking-widest animate-pulse">
                        Control Room Active
                      </span>
                      {priorityStatus?.settings?.enabled ? (
                        <span className="flex items-center text-xs text-emerald-400 font-bold">
                          <span className="w-2 h-2 bg-emerald-500 rounded-full mr-1.5 animate-ping" />
                          Priority Engine Online
                        </span>
                      ) : (
                        <span className="flex items-center text-xs text-slate-400 font-bold">
                          <span className="w-2 h-2 bg-slate-500 rounded-full mr-1.5" />
                          Engine Suspended
                        </span>
                      )}
                    </div>
                    <h2 className="text-xl sm:text-2xl font-black uppercase tracking-tight">Emergency Priority Engine</h2>
                    <p className="text-xs text-slate-400 max-w-xl leading-normal font-semibold">
                      Monitors all critical/SOS emergency rides, bypasses the standard queues, sorts nearby drivers by Haversine distance, and automatically expands search radius upon driver rejection or timeouts.
                    </p>
                  </div>
                  
                  <div className="flex items-center space-x-3 shrink-0">
                    <button
                      onClick={fetchPriorityStatus}
                      className="p-3 bg-slate-900 hover:bg-slate-850 text-slate-300 hover:text-white rounded-2xl border border-slate-800 transition shadow-md cursor-pointer flex items-center space-x-1.5 text-xs font-black uppercase"
                    >
                      <RefreshCw className="w-4 h-4 animate-spin-slow" />
                      <span>Sync</span>
                    </button>
                    
                    <button
                      onClick={() => handleSavePrioritySettings({ enabled: !priorityStatus?.settings?.enabled })}
                      className={`px-4 py-3 rounded-2xl text-xs font-black uppercase tracking-wider transition shadow-lg cursor-pointer ${
                        priorityStatus?.settings?.enabled
                          ? "bg-rose-600 hover:bg-rose-700 text-white shadow-rose-600/10"
                          : "bg-emerald-600 hover:bg-emerald-700 text-white shadow-emerald-600/10"
                      }`}
                    >
                      {priorityStatus?.settings?.enabled ? "Suspend Engine" : "Resume Engine"}
                    </button>
                  </div>
                </div>
              </div>

              {/* Grid of Key Status Metrics */}
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
                <div className="bg-white border border-slate-100 p-5 rounded-3xl shadow-xs space-y-1">
                  <span className="text-[10px] font-black uppercase text-slate-400 block tracking-wider">Active Priority Sessions</span>
                  <div className="flex items-baseline space-x-1.5">
                    <span className="text-2xl font-black text-slate-900">{priorityStatus?.activeStates?.length || 0}</span>
                    <span className="text-xs font-bold text-slate-400">Rides in Queue</span>
                  </div>
                </div>

                <div className="bg-white border border-slate-100 p-5 rounded-3xl shadow-xs space-y-1">
                  <span className="text-[10px] font-black uppercase text-slate-400 block tracking-wider">Base Radius (Min)</span>
                  <div className="flex items-baseline space-x-1.5">
                    <span className="text-2xl font-black text-slate-900">{priorityStatus?.settings?.baseRadiusKm || 10}</span>
                    <span className="text-xs font-bold text-slate-400">Kilometers</span>
                  </div>
                </div>

                <div className="bg-white border border-slate-100 p-5 rounded-3xl shadow-xs space-y-1">
                  <span className="text-[10px] font-black uppercase text-slate-400 block tracking-wider">Ceiling Radius (Max)</span>
                  <div className="flex items-baseline space-x-1.5">
                    <span className="text-2xl font-black text-slate-900">{priorityStatus?.settings?.maxRadiusKm || 50}</span>
                    <span className="text-xs font-bold text-slate-400">Kilometers</span>
                  </div>
                </div>

                <div className="bg-white border border-slate-100 p-5 rounded-3xl shadow-xs space-y-1">
                  <span className="text-[10px] font-black uppercase text-slate-400 block tracking-wider">Dispatch Timeout</span>
                  <div className="flex items-baseline space-x-1.5">
                    <span className="text-2xl font-black text-slate-900">{(priorityStatus?.settings?.requestTimeoutMs || 25000) / 1000}</span>
                    <span className="text-xs font-bold text-slate-400">Seconds</span>
                  </div>
                </div>
              </div>

              {/* Main Workspace: Settings Config + Active Queue */}
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
                
                {/* Left Panel: Settings Configuration */}
                <div className="bg-white border border-slate-100 p-6 rounded-3xl shadow-xs space-y-4 lg:col-span-1">
                  <div className="border-b border-slate-100 pb-3">
                    <h3 className="text-xs font-black uppercase text-slate-900 tracking-wider">Engine Tuner & Controls</h3>
                    <p className="text-[10px] text-slate-400 font-semibold leading-normal">Fine-tune spatial-matching algorithms and timers.</p>
                  </div>

                  <div className="space-y-4 text-xs font-semibold">
                    {/* Base Radius */}
                    <div className="space-y-1.5">
                      <div className="flex justify-between items-center text-[10px] font-black uppercase text-slate-600">
                        <label htmlFor="base-radius-range">Base Search Radius</label>
                        <span className="text-emerald-600">{priorityStatus?.settings?.baseRadiusKm || 10} km</span>
                      </div>
                      <input
                        id="base-radius-range"
                        type="range"
                        min={5}
                        max={30}
                        step={1}
                        value={priorityStatus?.settings?.baseRadiusKm || 10}
                        onChange={(e) => handleSavePrioritySettings({ baseRadiusKm: Number(e.target.value) })}
                        className="w-full h-1.5 bg-slate-100 rounded-lg appearance-none cursor-pointer accent-emerald-600"
                      />
                    </div>

                    {/* Radius Step */}
                    <div className="space-y-1.5">
                      <div className="flex justify-between items-center text-[10px] font-black uppercase text-slate-600">
                        <label htmlFor="radius-step-range">Expansion Step Increment</label>
                        <span className="text-emerald-600">+{priorityStatus?.settings?.radiusStepKm || 10} km</span>
                      </div>
                      <input
                        id="radius-step-range"
                        type="range"
                        min={5}
                        max={20}
                        step={1}
                        value={priorityStatus?.settings?.radiusStepKm || 10}
                        onChange={(e) => handleSavePrioritySettings({ radiusStepKm: Number(e.target.value) })}
                        className="w-full h-1.5 bg-slate-100 rounded-lg appearance-none cursor-pointer accent-emerald-600"
                      />
                    </div>

                    {/* Max Radius */}
                    <div className="space-y-1.5">
                      <div className="flex justify-between items-center text-[10px] font-black uppercase text-slate-600">
                        <label htmlFor="max-radius-range">Max Spatial Limit</label>
                        <span className="text-emerald-600">{priorityStatus?.settings?.maxRadiusKm || 50} km</span>
                      </div>
                      <input
                        id="max-radius-range"
                        type="range"
                        min={20}
                        max={100}
                        step={5}
                        value={priorityStatus?.settings?.maxRadiusKm || 50}
                        onChange={(e) => handleSavePrioritySettings({ maxRadiusKm: Number(e.target.value) })}
                        className="w-full h-1.5 bg-slate-100 rounded-lg appearance-none cursor-pointer accent-emerald-600"
                      />
                    </div>

                    {/* Timeout */}
                    <div className="space-y-1.5">
                      <div className="flex justify-between items-center text-[10px] font-black uppercase text-slate-600">
                        <label htmlFor="timeout-range">Driver Request Expiry</label>
                        <span className="text-emerald-600">{(priorityStatus?.settings?.requestTimeoutMs || 25000) / 1000} sec</span>
                      </div>
                      <input
                        id="timeout-range"
                        type="range"
                        min={10000}
                        max={60000}
                        step={5000}
                        value={priorityStatus?.settings?.requestTimeoutMs || 25000}
                        onChange={(e) => handleSavePrioritySettings({ requestTimeoutMs: Number(e.target.value) })}
                        className="w-full h-1.5 bg-slate-100 rounded-lg appearance-none cursor-pointer accent-emerald-600"
                      />
                    </div>

                    <div className="p-3 bg-slate-50 border border-slate-150 rounded-2xl text-[10px] text-slate-500 font-semibold leading-normal">
                      🛡️ <span className="font-bold text-slate-700">Algorithm Fact:</span> When an SOS ride request occurs, the priority engine ignores other queues and isolates active drivers. If they reject, the engine automatically expands the search radius by the <span className="font-bold">Step Increment</span> up to the <span className="font-bold">Max Spatial Limit</span>, triggering the next batch of dispatches synchronously.
                    </div>
                  </div>
                </div>

                {/* Right Panel: Active Matching sessions list */}
                <div className="lg:col-span-2 space-y-6">
                  
                  {/* Active SOS Matching sessions */}
                  <div className="bg-white border border-slate-100 p-6 rounded-3xl shadow-xs space-y-4">
                    <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                      <div className="space-y-0.5">
                        <h3 className="text-xs font-black uppercase text-slate-900 tracking-wider">Active Priority Sessions</h3>
                        <p className="text-[10px] text-slate-400 font-semibold">Live status of matching and dispatch radius logs.</p>
                      </div>
                      <span className="px-2.5 py-1 bg-emerald-50 text-emerald-700 border border-emerald-100 rounded-full text-[10px] font-black uppercase">
                        {priorityStatus?.activeStates?.length || 0} Matches Active
                      </span>
                    </div>

                    {priorityStatus?.activeStates && priorityStatus.activeStates.length > 0 ? (
                      <div className="space-y-6">
                        {priorityStatus.activeStates.map((state: any) => (
                          <div key={state.rideId} className="border border-slate-150 rounded-2xl p-5 space-y-4 hover:border-slate-300 transition">
                            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-3">
                              <div className="space-y-1">
                                <div className="flex items-center space-x-2">
                                  <span className="px-2 py-0.5 bg-rose-50 text-rose-700 border border-rose-100 text-[9px] font-black uppercase rounded-md">
                                    {state.emergencyType}
                                  </span>
                                  <span className="text-xs font-bold text-slate-900">Patient: {state.patientName}</span>
                                </div>
                                <div className="text-[10px] text-slate-500 font-bold flex items-center space-x-1">
                                  <MapPin className="w-3.5 h-3.5 text-slate-400" />
                                  <span>Village: {state.village}</span>
                                </div>
                              </div>

                              <div className="flex items-center space-x-1 text-xs">
                                <div className="text-right mr-2 text-[10px] text-slate-400 font-bold leading-normal">
                                  <div>Current Radius: <span className="text-slate-800 font-black">{state.searchRadius} km</span></div>
                                  <div>Attempts: <span className="text-slate-800 font-black">#{state.retries + 1}</span></div>
                                </div>
                              </div>
                            </div>

                            {/* Active Dispatches Status */}
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs font-bold">
                              <div className="space-y-1">
                                <span className="text-[9px] uppercase font-black text-slate-400 block">Notified/Pending Drivers</span>
                                {state.dispatchedDriverIds && state.dispatchedDriverIds.length > 0 ? (
                                  <div className="flex flex-wrap gap-1.5">
                                    {state.dispatchedDriverIds.map((drvId: string) => {
                                      const fullDriver = driversList.find(d => d.id === drvId);
                                      return (
                                        <span key={drvId} className="px-2.5 py-1 bg-amber-50 text-amber-800 border border-amber-200 text-[10px] font-black rounded-lg flex items-center space-x-1 animate-pulse">
                                          <span>🛺</span>
                                          <span>{fullDriver?.name || drvId}</span>
                                        </span>
                                      );
                                    })}
                                  </div>
                                ) : (
                                  <span className="text-[10px] text-slate-400 italic">No drivers currently in pending notifications.</span>
                                )}
                              </div>

                              <div className="space-y-1">
                                <span className="text-[9px] uppercase font-black text-slate-400 block">Previously Rejected / Expired</span>
                                {state.rejectedDriverIds && state.rejectedDriverIds.length > 0 ? (
                                  <div className="flex flex-wrap gap-1.5">
                                    {state.rejectedDriverIds.map((drvId: string) => {
                                      const fullDriver = driversList.find(d => d.id === drvId);
                                      return (
                                        <span key={drvId} className="px-2 py-0.5 bg-slate-50 text-slate-500 border border-slate-200 text-[9px] font-bold rounded-md">
                                          {fullDriver?.name || drvId}
                                        </span>
                                      );
                                    })}
                                  </div>
                                ) : (
                                  <span className="text-[10px] text-slate-400 italic">No rejections registered yet.</span>
                                )}
                              </div>
                            </div>

                            {/* Terminal Logs Block */}
                            <div className="space-y-1.5">
                              <span className="text-[9px] uppercase font-black text-slate-400 block">Decision Logs Terminal</span>
                              <div className="bg-slate-900 border border-slate-800 text-slate-100 rounded-2xl p-4 font-mono text-[10px] leading-relaxed max-h-40 overflow-y-auto space-y-1 shadow-inner scrollbar-thin scrollbar-thumb-slate-800">
                                {state.logs && state.logs.map((log: string, lIdx: number) => (
                                  <div key={lIdx} className="hover:bg-slate-800 px-2 py-0.5 rounded transition">
                                    <span className="text-emerald-400 select-none">▶</span> {log}
                                  </div>
                                ))}
                              </div>
                            </div>

                            {/* Actions panel */}
                            <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-slate-100">
                              <button
                                onClick={() => setSelectedRideForOverride(state.rideId)}
                                className="px-3.5 py-2 bg-slate-900 hover:bg-slate-850 text-white text-[10px] font-black uppercase rounded-xl transition cursor-pointer flex items-center space-x-1 shadow-md"
                              >
                                <span>👮</span>
                                <span>Dispatcher Override</span>
                              </button>

                              <button
                                onClick={() => handleTriggerPriorityRetry(state.rideId)}
                                className="px-3.5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-[10px] font-black uppercase rounded-xl transition cursor-pointer flex items-center space-x-1 shadow-md"
                              >
                                <RefreshCw className="w-3.5 h-3.5" />
                                <span>Force Re-match (Expand)</span>
                              </button>

                              <button
                                onClick={() => handleResetPriorityState(state.rideId)}
                                className="px-3.5 py-2 bg-slate-100 hover:bg-slate-200 text-slate-600 text-[10px] font-black uppercase rounded-xl transition cursor-pointer"
                              >
                                <span>Reset Queue State</span>
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="p-8 text-center bg-slate-50 border border-dashed border-slate-200 rounded-3xl space-y-2">
                        <div className="text-2xl">💤</div>
                        <h4 className="text-xs font-black uppercase text-slate-800">No active emergency matching sessions</h4>
                        <p className="text-[10px] text-slate-400 font-semibold max-w-sm mx-auto leading-normal">
                          All emergency SOS bookings have been matched with available drivers, or no critical bookings exist currently. Use the Passenger panel to trigger an SOS.
                        </p>
                      </div>
                    )}
                  </div>
                </div>

              </div>

              {/* Manual Override Modal */}
              {selectedRideForOverride && (
                <div className="fixed inset-0 bg-slate-950/45 backdrop-blur-xs flex items-center justify-center z-50 p-4">
                  <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-xl w-full max-w-md space-y-4 font-sans text-xs">
                    <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                      <div className="flex items-center space-x-2">
                        <span>👮</span>
                        <h3 className="font-black uppercase text-slate-900 tracking-wider">Dispatcher Override Assignment</h3>
                      </div>
                      <button 
                        onClick={() => setSelectedRideForOverride(null)}
                        className="text-slate-400 hover:text-slate-600 cursor-pointer"
                      >
                        <X className="w-5 h-5" />
                      </button>
                    </div>

                    <div className="space-y-3 leading-normal font-semibold text-slate-600">
                      <p>
                        This admin action <span className="text-rose-600 font-black">bypasses all automated loops</span>, safety radius boundaries, and availability validations. You can assign <span className="font-black text-slate-800">any volunteer driver</span> immediately to this SOS emergency.
                      </p>
                      
                      <div className="space-y-1.5 font-bold">
                        <label htmlFor="driver-override-select" className="text-[10px] uppercase font-black text-slate-500">Select Volunteer Driver</label>
                        <select
                          id="driver-override-select"
                          value={overrideDriverId}
                          onChange={(e) => setOverrideDriverId(e.target.value)}
                          className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-slate-900 font-extrabold cursor-pointer text-slate-800"
                        >
                          <option value="">-- Choose Driver --</option>
                          {driversList.map((drv) => (
                            <option key={drv.id} value={drv.id}>
                              {drv.name} ({drv.vehicleType}) - Village: {drv.village} ({drv.status})
                            </option>
                          ))}
                        </select>
                      </div>
                    </div>

                    <div className="flex items-center justify-end space-x-2 pt-2 border-t border-slate-100">
                      <button
                        onClick={() => setSelectedRideForOverride(null)}
                        className="px-4 py-2.5 bg-slate-100 hover:bg-slate-200 rounded-xl text-slate-600 font-black uppercase cursor-pointer"
                      >
                        Cancel
                      </button>
                      
                      <button
                        onClick={() => {
                          if (overrideDriverId) {
                            handleManualOverride(selectedRideForOverride, overrideDriverId);
                          } else {
                            showToast("Please select a driver first.", "error");
                          }
                        }}
                        className="px-4 py-2.5 bg-slate-900 hover:bg-slate-850 text-white rounded-xl font-black uppercase cursor-pointer shadow-md"
                      >
                        Force Assign Driver
                      </button>
                    </div>
                  </div>
                </div>
              )}

            </div>
          )}

          {/* Emergency Dashboard Section */}
          {activeTab === "emergency-dashboard" && (
            <div className="lg:col-span-9 space-y-6">
              <EmergencyDashboard />
            </div>
          )}

          {/* Emergency Alerts Log Section */}
          {activeTab === "notifications" && (
            <div className="lg:col-span-9 space-y-6">
              <EmergencyNotificationsLog />
            </div>
          )}

          {/* Wallet & Refund Claims Administration Section */}
          {activeTab === "refund-approvals" && (
            <div className="lg:col-span-9 space-y-6" id="refund-claims-tab-panel">
              <div className="bg-white border border-slate-100 rounded-3xl p-6 shadow-sm space-y-3">
                <h3 className="text-base font-black text-slate-900 uppercase tracking-wide">Panchayat Wallet & Refund Claims Panel</h3>
                <p className="text-xs text-slate-500 font-semibold leading-relaxed">
                  Review filed user claims, verify transaction reference details, and authorize balance adjustments. Approved refund requests instantly credit the user's digital wallet.
                </p>
              </div>
              <WalletDashboard userId={user?.id || ""} token={token} role="admin" />
            </div>
          )}

          {/* Platform Commission Administrative Dashboard */}
          {activeTab === "commission" && (
            <div className="lg:col-span-9 space-y-6">
              
              {/* Header Title */}
              <div className="bg-white border border-slate-100 rounded-3xl p-6 shadow-sm space-y-3">
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                  <div>
                    <h3 className="text-base font-black text-slate-900 uppercase tracking-wide flex items-center gap-2">
                      <TrendingUp className="w-5 h-5 text-emerald-600" />
                      Platform Commission & Settlement Hub
                    </h3>
                    <p className="text-xs text-slate-500 font-semibold leading-relaxed">
                      Configure commission rules, inspect platform earnings logs, audit driver payouts, and process settlements dynamically.
                    </p>
                  </div>
                  <button
                    onClick={fetchCommissionStats}
                    disabled={isLoadingCommission}
                    className="px-4 py-2 bg-slate-50 hover:bg-slate-100 disabled:opacity-50 text-slate-700 text-xs font-black uppercase rounded-xl border border-slate-100 flex items-center space-x-1 cursor-pointer transition-all"
                  >
                    <RefreshCw className={`w-3.5 h-3.5 ${isLoadingCommission ? "animate-spin" : ""}`} />
                    <span>Refresh Stats</span>
                  </button>
                </div>
              </div>

              {isLoadingCommission && !commissionData ? (
                <div className="bg-white border border-slate-100 rounded-3xl p-12 text-center shadow-sm">
                  <RefreshCw className="w-8 h-8 text-emerald-600 animate-spin mx-auto mb-4" />
                  <p className="text-sm font-extrabold text-slate-900">Loading platform commission database...</p>
                  <p className="text-xs text-slate-400 font-medium mt-1">Calculating gross earnings, commission breakdowns, and driver settlements.</p>
                </div>
              ) : commissionError ? (
                <div className="bg-red-50 border border-red-100 rounded-3xl p-6 text-red-700 shadow-sm space-y-2">
                  <h4 className="text-sm font-black uppercase tracking-wider">Database Connection Error</h4>
                  <p className="text-xs font-semibold">{commissionError}</p>
                  <button 
                    onClick={fetchCommissionStats}
                    className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-xl text-[10px] font-black uppercase"
                  >
                    Retry Loading
                  </button>
                </div>
              ) : (
                <>
                  {/* Summary Metrics Cards */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                    
                    <div className="bg-gradient-to-br from-slate-900 to-slate-800 text-white rounded-3xl p-5 shadow-sm space-y-4">
                      <div className="flex justify-between items-start">
                        <div className="p-2.5 bg-white/10 rounded-xl">
                          <TrendingUp className="w-5 h-5 text-emerald-400" />
                        </div>
                        <span className="text-[10px] font-bold uppercase tracking-wider text-slate-300">Total Earnings</span>
                      </div>
                      <div>
                        <span className="text-2xl font-black block">₹{commissionData?.metrics?.totalPlatformEarnings?.toLocaleString() || "0"}</span>
                        <span className="text-[10px] font-medium text-slate-400">Net Platform Commission</span>
                      </div>
                    </div>

                    <div className="bg-white border border-slate-100 rounded-3xl p-5 shadow-sm space-y-4">
                      <div className="flex justify-between items-start">
                        <div className="p-2.5 bg-emerald-50 rounded-xl">
                          <IndianRupee className="w-5 h-5 text-emerald-600" />
                        </div>
                        <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Gross Fares</span>
                      </div>
                      <div>
                        <span className="text-2xl font-black block text-slate-900">₹{commissionData?.metrics?.totalRideFares?.toLocaleString() || "0"}</span>
                        <span className="text-[10px] font-bold text-slate-500">Across {commissionData?.metrics?.totalCompletedRides || "0"} trips</span>
                      </div>
                    </div>

                    <div className="bg-white border border-slate-100 rounded-3xl p-5 shadow-sm space-y-4">
                      <div className="flex justify-between items-start">
                        <div className="p-2.5 bg-blue-50 rounded-xl">
                          <CheckCircle2 className="w-5 h-5 text-blue-600" />
                        </div>
                        <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Total Settled</span>
                      </div>
                      <div>
                        <span className="text-2xl font-black block text-slate-900">₹{commissionData?.metrics?.totalSettledAmount?.toLocaleString() || "0"}</span>
                        <span className="text-[10px] font-bold text-emerald-600">Disbursed to Pilots</span>
                      </div>
                    </div>

                    <div className="bg-white border border-slate-100 rounded-3xl p-5 shadow-sm space-y-4">
                      <div className="flex justify-between items-start">
                        <div className="p-2.5 bg-amber-50 rounded-xl">
                          <Clock className="w-5 h-5 text-amber-600" />
                        </div>
                        <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Pending Settlement</span>
                      </div>
                      <div>
                        <span className="text-2xl font-black block text-slate-900">₹{commissionData?.metrics?.totalPendingSettlement?.toLocaleString() || "0"}</span>
                        <span className="text-[10px] font-bold text-amber-600">In Withdrawal Queue</span>
                      </div>
                    </div>

                  </div>

                  {/* Config settings & visual chart bento row */}
                  <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                    
                    {/* Config form */}
                    <div className="lg:col-span-4 bg-white border border-slate-100 rounded-3xl p-6 shadow-sm flex flex-col justify-between">
                      <div className="space-y-4">
                        <div>
                          <h4 className="text-sm font-extrabold text-slate-900">Commission Rules Configuration</h4>
                          <p className="text-[11px] text-slate-400 font-medium">Update real-time platform deduction rules and surcharges.</p>
                        </div>

                        <form onSubmit={handleSaveCommissionSettings} className="space-y-4">
                          <div className="space-y-1">
                            <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Standard Commission Percentage (%)</label>
                            <div className="relative">
                              <input
                                type="number"
                                min="0"
                                max="100"
                                required
                                value={inputPct}
                                onChange={(e) => setInputPct(Number(e.target.value))}
                                className="w-full pl-3 pr-10 py-2 bg-slate-50 border border-slate-100 focus:bg-white focus:outline-none focus:border-emerald-500 text-xs font-bold text-slate-700 rounded-xl"
                              />
                              <span className="absolute right-3 top-2 text-xs font-bold text-slate-400">%</span>
                            </div>
                            <span className="text-[10px] text-slate-400 leading-normal block">Applied exclusively to standard on-demand rides (Auto, Car, Bike).</span>
                          </div>

                          <div className="space-y-1">
                            <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Flat Emergency Platform Charge (₹)</label>
                            <div className="relative">
                              <span className="absolute left-3 top-2 text-xs font-bold text-slate-400">₹</span>
                              <input
                                type="number"
                                min="0"
                                required
                                value={inputCharges}
                                onChange={(e) => setInputCharges(Number(e.target.value))}
                                className="w-full pl-7 pr-3 py-2 bg-slate-50 border border-slate-100 focus:bg-white focus:outline-none focus:border-emerald-500 text-xs font-bold text-slate-700 rounded-xl"
                              />
                            </div>
                            <span className="text-[10px] text-slate-400 leading-normal block">Platform handling surcharge deducted per completed emergency transit.</span>
                          </div>

                          <button
                            type="submit"
                            disabled={isSavingSettings}
                            className="w-full py-2.5 bg-slate-900 hover:bg-slate-800 disabled:opacity-50 text-white rounded-xl text-xs font-black uppercase cursor-pointer"
                          >
                            {isSavingSettings ? "Saving Settings..." : "Save Commission Rules"}
                          </button>
                        </form>
                      </div>

                      <div className="mt-6 pt-4 border-t border-slate-50 text-[11px] text-slate-400 font-semibold space-y-1.5 leading-normal">
                        <p className="text-slate-500">Commission Formula Indicators:</p>
                        <p>• Standard: <span className="text-slate-800">Driver Share = Fare × (100 - {commissionData?.settings?.commissionPercentage || 10}%)</span></p>
                        <p>• Emergency: <span className="text-slate-800">Driver Share = Fare - ₹{commissionData?.settings?.emergencyCharges || 50} Surcharge</span></p>
                      </div>
                    </div>

                    {/* Recharts chart block */}
                    <div className="lg:col-span-8 bg-white border border-slate-100 rounded-3xl p-6 shadow-sm space-y-4">
                      <div>
                        <h4 className="text-sm font-extrabold text-slate-900">Platform Financial Analytics</h4>
                        <p className="text-[11px] text-slate-400 font-medium">Weekly breakdown comparing total fares, commission collected, and net driver payouts.</p>
                      </div>

                      <div className="h-60">
                        {commissionData?.chartData && commissionData.chartData.length > 0 ? (
                          <ResponsiveContainer width="100%" height="100%">
                            <AreaChart data={commissionData.chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                              <defs>
                                <linearGradient id="colorFares" x1="0" y1="0" x2="0" y2="1">
                                  <stop offset="5%" stopColor="#10b981" stopOpacity={0.1}/>
                                  <stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
                                </linearGradient>
                                <linearGradient id="colorCommission" x1="0" y1="0" x2="0" y2="1">
                                  <stop offset="5%" stopColor="#0f172a" stopOpacity={0.1}/>
                                  <stop offset="95%" stopColor="#0f172a" stopOpacity={0}/>
                                </linearGradient>
                              </defs>
                              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                              <XAxis dataKey="name" stroke="#94a3b8" fontSize={10} tickLine={false} axisLine={false} />
                              <YAxis stroke="#94a3b8" fontSize={10} tickLine={false} axisLine={false} />
                              <Tooltip contentStyle={{ borderRadius: "16px", border: "1px solid #f1f5f9" }} />
                              <Legend iconType="circle" wrapperStyle={{ fontSize: "10px", fontWeight: "bold" }} />
                              <Area name="Gross Fares" type="monotone" dataKey="fares" stroke="#10b981" strokeWidth={2} fillOpacity={1} fill="url(#colorFares)" />
                              <Area name="Platform Commission" type="monotone" dataKey="commission" stroke="#0f172a" strokeWidth={2} fillOpacity={1} fill="url(#colorCommission)" />
                              <Area name="Driver Share" type="monotone" dataKey="driverShare" stroke="#3b82f6" strokeWidth={2} fillOpacity={0} />
                            </AreaChart>
                          </ResponsiveContainer>
                        ) : (
                          <div className="h-full flex items-center justify-center text-xs text-slate-400 font-semibold">
                            No visual data points available
                          </div>
                        )}
                      </div>
                    </div>

                  </div>

                  {/* Completed Rides Table Ledger */}
                  <div className="bg-white border border-slate-100 rounded-3xl p-6 shadow-sm space-y-4">
                    <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                      <div>
                        <h4 className="text-sm font-extrabold text-slate-900">All Completed Rides Ledger</h4>
                        <p className="text-[11px] text-slate-400 font-medium">Audit logs of completed standard and emergency transits with financial breakdown.</p>
                      </div>

                      <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto">
                        <div className="relative flex-1 sm:flex-none">
                          <span className="absolute left-3 top-2.5 text-slate-400">
                            <Search className="w-3.5 h-3.5" />
                          </span>
                          <input
                            type="text"
                            placeholder="Search by ID or Rider..."
                            value={commSearchTerm}
                            onChange={(e) => setCommSearchTerm(e.target.value)}
                            className="w-full sm:w-48 pl-8 pr-3 py-1.5 bg-slate-50 border border-slate-100 focus:bg-white focus:outline-none focus:border-emerald-500 text-xs font-bold text-slate-700 rounded-xl"
                          />
                        </div>

                        <select
                          value={commTypeFilter}
                          onChange={(e) => setCommTypeFilter(e.target.value)}
                          className="px-3 py-1.5 bg-slate-50 border border-slate-100 text-xs font-bold text-slate-700 rounded-xl cursor-pointer outline-none focus:bg-white"
                        >
                          <option value="all">All Transits</option>
                          <option value="Bike">Bike Only</option>
                          <option value="Auto">Auto Only</option>
                          <option value="Car">Car Only</option>
                          <option value="Emergency">Emergency Only</option>
                        </select>
                      </div>
                    </div>

                    <div className="overflow-x-auto border border-slate-100 rounded-2xl">
                      <table className="w-full text-left border-collapse text-xs">
                        <thead>
                          <tr className="bg-slate-50 text-slate-400 uppercase font-bold text-[9px] tracking-wider border-b border-slate-100">
                            <th className="p-4">Ride ID</th>
                            <th className="p-4">Passenger/Patient</th>
                            <th className="p-4">Driver</th>
                            <th className="p-4">Type</th>
                            <th className="p-4 text-right">Fare (₹)</th>
                            <th className="p-4 text-right">Comm (%)</th>
                            <th className="p-4 text-right">Commission (₹)</th>
                            <th className="p-4 text-right">Emerg. Fee (₹)</th>
                            <th className="p-4 text-right font-black text-slate-900">Driver Net (₹)</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-50 font-semibold text-slate-700">
                          {commissionData?.rides && commissionData.rides.length > 0 ? (
                            commissionData.rides
                              .filter((r: any) => {
                                const s = commSearchTerm.toLowerCase();
                                const matchesSearch = 
                                  r.id.toLowerCase().includes(s) ||
                                  r.passengerName.toLowerCase().includes(s) ||
                                  r.driverName.toLowerCase().includes(s);
                                
                                const matchesType = commTypeFilter === "all" || r.rideType === commTypeFilter;
                                return matchesSearch && matchesType;
                              })
                              .map((r: any) => (
                                <tr key={r.id} className="hover:bg-slate-50/50 transition">
                                  <td className="p-4 font-mono text-[10px] text-slate-500">{r.id}</td>
                                  <td className="p-4 font-extrabold text-slate-900">{r.passengerName}</td>
                                  <td className="p-4">{r.driverName}</td>
                                  <td className="p-4">
                                    <span className={`px-2 py-0.5 rounded-md text-[10px] font-black ${
                                      r.rideType === "Emergency" 
                                        ? "bg-rose-50 text-rose-700 border border-rose-100" 
                                        : "bg-emerald-50 text-emerald-700 border border-emerald-100"
                                    }`}>
                                      {r.rideType}
                                    </span>
                                  </td>
                                  <td className="p-4 text-right">₹{r.fare}</td>
                                  <td className="p-4 text-right text-slate-400">{r.commissionPercentage}%</td>
                                  <td className="p-4 text-right text-slate-500">₹{r.commissionAmount}</td>
                                  <td className="p-4 text-right text-slate-500">₹{r.emergencyCharge}</td>
                                  <td className="p-4 text-right font-extrabold text-emerald-600 bg-emerald-50/20">₹{r.driverShare}</td>
                                </tr>
                              ))
                          ) : (
                            <tr>
                              <td colSpan={9} className="p-8 text-center text-slate-400">No completed transits found in database.</td>
                            </tr>
                          )}
                        </tbody>
                      </table>
                    </div>
                  </div>

                  {/* Driver Settlements & Earnings Ledger */}
                  <div className="bg-white border border-slate-100 rounded-3xl p-6 shadow-sm space-y-4">
                    <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                      <div>
                        <h4 className="text-sm font-extrabold text-slate-900">Volunteer Driver Settlement Ledgers</h4>
                        <p className="text-[11px] text-slate-400 font-medium">Real-time driver balances tracking gross earnings, commission deductions, settled amounts, and available balances.</p>
                      </div>

                      <div className="relative w-full sm:w-auto">
                        <span className="absolute left-3 top-2.5 text-slate-400">
                          <Search className="w-3.5 h-3.5" />
                        </span>
                        <input
                          type="text"
                          placeholder="Search Driver Name..."
                          value={commDriverSearch}
                          onChange={(e) => setCommDriverSearch(e.target.value)}
                          className="w-full sm:w-48 pl-8 pr-3 py-1.5 bg-slate-50 border border-slate-100 focus:bg-white focus:outline-none focus:border-emerald-500 text-xs font-bold text-slate-700 rounded-xl"
                        />
                      </div>
                    </div>

                    <div className="overflow-x-auto border border-slate-100 rounded-2xl">
                      <table className="w-full text-left border-collapse text-xs">
                        <thead>
                          <tr className="bg-slate-50 text-slate-400 uppercase font-bold text-[9px] tracking-wider border-b border-slate-100">
                            <th className="p-4">Driver Name</th>
                            <th className="p-4">Vehicle</th>
                            <th className="p-4 text-center">Completed Trips</th>
                            <th className="p-4 text-right">Gross Earnings (₹)</th>
                            <th className="p-4 text-right">Commission Deducted (₹)</th>
                            <th className="p-4 text-right font-black text-blue-700">Net Earned (₹)</th>
                            <th className="p-4 text-right text-emerald-700">Settled / Paid (₹)</th>
                            <th className="p-4 text-right font-black text-rose-700 bg-rose-50/20">Available Balance (₹)</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-50 font-semibold text-slate-700">
                          {commissionData?.drivers && commissionData.drivers.length > 0 ? (
                            commissionData.drivers
                              .filter((d: any) => d.name.toLowerCase().includes(commDriverSearch.toLowerCase()))
                              .map((d: any) => (
                                <tr key={d.id} className="hover:bg-slate-50/50 transition">
                                  <td className="p-4 font-extrabold text-slate-900">
                                    <div>{d.name}</div>
                                    <div className="text-[10px] text-slate-400 font-medium">{d.phone}</div>
                                  </td>
                                  <td className="p-4 text-slate-500">{d.vehicleType}</td>
                                  <td className="p-4 text-center font-bold text-slate-900">{d.completedTrips}</td>
                                  <td className="p-4 text-right">₹{d.totalEarned?.toLocaleString()}</td>
                                  <td className="p-4 text-right text-slate-400">₹{d.commissionDeducted?.toLocaleString()}</td>
                                  <td className="p-4 text-right font-extrabold text-blue-600">₹{d.netEarned?.toLocaleString()}</td>
                                  <td className="p-4 text-right text-emerald-600">₹{d.withdrawn?.toLocaleString()}</td>
                                  <td className="p-4 text-right font-extrabold text-rose-600 bg-rose-50/20">₹{d.availableBalance?.toLocaleString()}</td>
                                </tr>
                              ))
                          ) : (
                            <tr>
                              <td colSpan={8} className="p-8 text-center text-slate-400">No active drivers in registry.</td>
                            </tr>
                          )}
                        </tbody>
                      </table>
                    </div>
                  </div>

                </>
              )}

            </div>
          )}

          {/* Coupon and Subsidy Voucher Management Tab */}
          {activeTab === "coupons" && (
            <div className="lg:col-span-9">
              <CouponManagement token={token} />
            </div>
          )}

          {/* Ratings and Feedback Governance Tab */}
          {activeTab === "ratings" && (
            <div className="lg:col-span-9">
              <RatingSystem role="admin" token={token} user={user} />
            </div>
          )}

          {/* Admin Support Chat Tab */}
          {activeTab === "chat" && (
            <div className="lg:col-span-9">
              <ChatModule />
            </div>
          )}

        </div>

      </div>

      {/* GLOBAL SEARCH SYSTEM MODAL */}
      {isSearchOpen && (
        <div 
          className="fixed inset-0 bg-slate-950/60 backdrop-blur-md flex items-center justify-center z-50 p-4 sm:p-6 md:p-10 animate-fade-in"
          onClick={(e) => {
            if (e.target === e.currentTarget) {
              setIsSearchOpen(false);
              setSelectedSearchDetail(null);
            }
          }}
        >
          <div className="bg-white border border-slate-200/80 shadow-2xl rounded-3xl w-full max-w-4xl max-h-[85vh] overflow-hidden flex flex-col font-sans relative">
            
            {/* Search Input Bar */}
            <div className="flex items-center space-x-3 p-5 border-b border-slate-100 bg-slate-50/50">
              <Search className="w-5 h-5 text-emerald-500 shrink-0" />
              <input 
                type="text" 
                className="flex-1 bg-transparent border-0 outline-none text-sm font-extrabold text-slate-800 placeholder-slate-400" 
                placeholder="Search users, drivers, live bookings, subsidy payments, reports, support tickets..." 
                value={globalSearchQuery} 
                onChange={(e) => {
                  setGlobalSearchQuery(e.target.value);
                  setSelectedSearchDetail(null);
                }}
                autoFocus 
              />
              {isSearching && (
                <div className="w-4 h-4 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin shrink-0" />
              )}
              <button 
                onClick={() => {
                  setIsSearchOpen(false);
                  setSelectedSearchDetail(null);
                }}
                className="p-1.5 hover:bg-slate-100 rounded-xl transition cursor-pointer text-slate-400 hover:text-slate-700"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Filter Tabs / Pills */}
            <div className="flex items-center space-x-1 px-4 py-2 bg-slate-100/40 border-b border-slate-100 overflow-x-auto scrollbar-none shrink-0">
              {[
                { id: "all", label: "All Results", icon: LayoutDashboard, count: Object.values(globalSearchResults).reduce((acc: number, val: any) => acc + (val?.length || 0), 0) },
                { id: "users", label: "Users", icon: Users, count: globalSearchResults.users?.length || 0 },
                { id: "drivers", label: "Drivers", icon: Car, count: globalSearchResults.drivers?.length || 0 },
                { id: "bookings", label: "Bookings", icon: Activity, count: globalSearchResults.bookings?.length || 0 },
                { id: "emergencyRequests", label: "Emergencies", icon: ShieldAlert, count: globalSearchResults.emergencyRequests?.length || 0 },
                { id: "payments", label: "Payments", icon: IndianRupee, count: globalSearchResults.payments?.length || 0 },
                { id: "reports", label: "Reports", icon: FileText, count: globalSearchResults.reports?.length || 0 },
                { id: "support", label: "Support", icon: HelpCircle, count: globalSearchResults.support?.length || 0 },
              ].map((pill) => {
                const Icon = pill.icon;
                const isActive = searchFilter === pill.id;
                return (
                  <button
                    key={pill.id}
                    onClick={() => {
                      setSearchFilter(pill.id as any);
                      setSelectedSearchDetail(null);
                    }}
                    className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-full text-[11px] font-black tracking-wide shrink-0 transition cursor-pointer border ${
                      isActive 
                        ? "bg-slate-900 text-white border-slate-900" 
                        : "bg-white text-slate-500 hover:text-slate-800 hover:bg-slate-50 border-slate-200"
                    }`}
                  >
                    <Icon className="w-3.5 h-3.5" />
                    <span>{pill.label}</span>
                    <span className={`text-[9px] px-1.5 py-0.2 rounded-full font-bold ${
                      isActive ? "bg-emerald-500 text-slate-950 font-black" : "bg-slate-100 text-slate-600 font-bold"
                    }`}>
                      {pill.count}
                    </span>
                  </button>
                );
              })}
            </div>

            {/* Split Screen Layout if item is selected */}
            <div className="flex-1 flex overflow-hidden min-h-0">
              
              {/* Search Results List */}
              <div className={`flex-1 overflow-y-auto p-5 space-y-6 ${selectedSearchDetail ? "hidden md:block border-r border-slate-100 max-w-sm" : ""}`}>
                
                {/* No results state */}
                {Object.values(globalSearchResults).every((arr: any) => !arr || arr.length === 0) && !isSearching && (
                  <div className="text-center py-12 space-y-3">
                    <div className="w-12 h-12 bg-slate-50 rounded-full flex items-center justify-center mx-auto text-slate-400">
                      <HelpCircle className="w-6 h-6" />
                    </div>
                    <div>
                      <p className="text-xs font-black text-slate-800 uppercase tracking-wide">No system records found</p>
                      <p className="text-[11px] text-slate-400">Try modifying your keywords or clear filters to view recent logs.</p>
                    </div>
                  </div>
                )}

                {/* 1. USERS SECTION */}
                {(searchFilter === "all" || searchFilter === "users") && globalSearchResults.users?.length > 0 && (
                  <div className="space-y-2.5">
                    <div className="flex items-center justify-between border-b border-slate-100 pb-1">
                      <h4 className="text-[10px] font-black uppercase text-slate-400 tracking-wider flex items-center space-x-1.5">
                        <Users className="w-3.5 h-3.5 text-slate-400" />
                        <span>Registered System Users</span>
                      </h4>
                      <span className="text-[9px] font-bold text-slate-500">{globalSearchResults.users.length} found</span>
                    </div>
                    <div className="grid grid-cols-1 gap-2">
                      {globalSearchResults.users.map((item: any) => (
                        <div 
                          key={item.id}
                          onClick={() => {
                            if (item.role === "admin") {
                              setActiveTab("admins");
                              setAdminSearch(item.name);
                            } else if (item.role === "driver") {
                              setActiveTab("drivers");
                              setDriverSearch(item.name);
                            } else {
                              setActiveTab("users");
                              setUserSearch(item.name);
                            }
                            setIsSearchOpen(false);
                          }}
                          className="p-3 border border-slate-150 hover:border-emerald-300 hover:bg-emerald-50/20 rounded-2xl transition cursor-pointer flex items-center justify-between gap-3 text-left group"
                        >
                          <div className="space-y-0.5 min-w-0">
                            <h5 className="text-xs font-black text-slate-800 group-hover:text-emerald-950 truncate">{item.name}</h5>
                            <p className="text-[10px] text-slate-500 font-semibold">{item.phone} • {item.village}</p>
                          </div>
                          <div className="flex items-center space-x-1.5 shrink-0">
                            <span className={`px-2 py-0.5 rounded-md text-[8px] font-black uppercase ${
                              item.role === "admin" ? "bg-purple-100 text-purple-800" :
                              item.role === "driver" ? "bg-amber-100 text-amber-800" :
                              "bg-sky-100 text-sky-800"
                            }`}>
                              {item.role}
                            </span>
                            <span className={`w-2 h-2 rounded-full ${
                              item.status === "suspended" ? "bg-rose-500" : "bg-emerald-500"
                            }`} />
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* 2. DRIVERS SECTION */}
                {(searchFilter === "all" || searchFilter === "drivers") && globalSearchResults.drivers?.length > 0 && (
                  <div className="space-y-2.5">
                    <div className="flex items-center justify-between border-b border-slate-100 pb-1">
                      <h4 className="text-[10px] font-black uppercase text-slate-400 tracking-wider flex items-center space-x-1.5">
                        <Car className="w-3.5 h-3.5 text-slate-400" />
                        <span>Active Volunteer Drivers</span>
                      </h4>
                      <span className="text-[9px] font-bold text-slate-500">{globalSearchResults.drivers.length} found</span>
                    </div>
                    <div className="grid grid-cols-1 gap-2">
                      {globalSearchResults.drivers.map((item: any) => (
                        <div 
                          key={item.id}
                          onClick={() => {
                            setActiveTab("drivers");
                            setDriverSearch(item.name);
                            setIsSearchOpen(false);
                          }}
                          className="p-3 border border-slate-150 hover:border-emerald-300 hover:bg-emerald-50/20 rounded-2xl transition cursor-pointer flex items-center justify-between gap-3 text-left group"
                        >
                          <div className="space-y-0.5 min-w-0">
                            <h5 className="text-xs font-black text-slate-800 group-hover:text-emerald-950 truncate">{item.name}</h5>
                            <p className="text-[10px] text-slate-500 font-semibold">{item.vehicleType} • {item.vehicleNumber}</p>
                            <p className="text-[9px] text-emerald-700 font-bold">Village Base: {item.village}</p>
                          </div>
                          <div className="flex flex-col items-end shrink-0 gap-1">
                            <span className={`px-2 py-0.5 rounded-md text-[8px] font-black uppercase ${
                              item.status === "busy" ? "bg-amber-100 text-amber-800" :
                              item.status === "offline" ? "bg-slate-100 text-slate-600" :
                              "bg-emerald-100 text-emerald-800"
                            }`}>
                              {item.status}
                            </span>
                            <span className="text-[9px] font-extrabold text-slate-700">★ {item.rating || "5.0"}</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* 3. BOOKINGS SECTION */}
                {(searchFilter === "all" || searchFilter === "bookings") && globalSearchResults.bookings?.length > 0 && (
                  <div className="space-y-2.5">
                    <div className="flex items-center justify-between border-b border-slate-100 pb-1">
                      <h4 className="text-[10px] font-black uppercase text-slate-400 tracking-wider flex items-center space-x-1.5">
                        <Activity className="w-3.5 h-3.5 text-slate-400" />
                        <span>All Booking Entries</span>
                      </h4>
                      <span className="text-[9px] font-bold text-slate-500">{globalSearchResults.bookings.length} found</span>
                    </div>
                    <div className="grid grid-cols-1 gap-2">
                      {globalSearchResults.bookings.map((item: any) => (
                        <div 
                          key={item.id}
                          onClick={() => {
                            setActiveTab("bookings");
                            setBookingSearch(item.patientName);
                            setIsSearchOpen(false);
                          }}
                          className="p-3 border border-slate-150 hover:border-emerald-300 hover:bg-emerald-50/20 rounded-2xl transition cursor-pointer flex items-center justify-between gap-3 text-left group"
                        >
                          <div className="space-y-0.5 min-w-0">
                            <div className="flex items-center space-x-1.5">
                              <h5 className="text-xs font-black text-slate-800 group-hover:text-emerald-950 truncate">{item.patientName}</h5>
                              <span className="text-[8px] text-slate-400 font-mono font-black">{item.id.substring(0, 8)}</span>
                            </div>
                            <p className="text-[10px] text-slate-500 font-semibold">{item.emergencyType} • CHC: {item.destinationChc.split(",").pop()}</p>
                            <p className="text-[9px] text-slate-400 font-bold">Village: {item.village} ({item.landmark || "No Landmark"})</p>
                          </div>
                          <div className="flex flex-col items-end shrink-0 gap-1">
                            <span className={`px-2 py-0.5 rounded-md text-[8px] font-black uppercase ${
                              item.status === "completed" ? "bg-emerald-100 text-emerald-800" :
                              item.status === "cancelled" ? "bg-rose-100 text-rose-800" :
                              "bg-amber-100 text-amber-800"
                            }`}>
                              {item.status.replace("_", " ")}
                            </span>
                            <span className="text-[8px] text-slate-400 font-medium">
                              {new Date(item.createdAt).toLocaleDateString()}
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* 4. EMERGENCY REQUESTS SECTION */}
                {(searchFilter === "all" || searchFilter === "emergencyRequests") && globalSearchResults.emergencyRequests?.length > 0 && (
                  <div className="space-y-2.5">
                    <div className="flex items-center justify-between border-b border-slate-100 pb-1">
                      <h4 className="text-[10px] font-black uppercase text-slate-400 tracking-wider flex items-center space-x-1.5">
                        <ShieldAlert className="w-3.5 h-3.5 text-red-500" />
                        <span className="text-red-700">High Urgency Emergencies</span>
                      </h4>
                      <span className="text-[9px] font-bold text-red-700">{globalSearchResults.emergencyRequests.length} critical</span>
                    </div>
                    <div className="grid grid-cols-1 gap-2">
                      {globalSearchResults.emergencyRequests.map((item: any) => (
                        <div 
                          key={item.id}
                          onClick={() => {
                            setActiveTab("bookings");
                            setBookingSearch(item.patientName);
                            setIsSearchOpen(false);
                          }}
                          className="p-3 border border-red-100 bg-red-50/10 hover:border-red-300 hover:bg-red-50/35 rounded-2xl transition cursor-pointer flex items-center justify-between gap-3 text-left group"
                        >
                          <div className="space-y-0.5 min-w-0">
                            <div className="flex items-center space-x-1.5">
                              <h5 className="text-xs font-black text-red-950 truncate">{item.patientName}</h5>
                              <span className="px-1.5 py-0.2 bg-red-100 text-red-800 text-[8px] font-black uppercase rounded">CRITICAL</span>
                            </div>
                            <p className="text-[10px] text-slate-600 font-semibold">{item.emergencyType} • Phone: {item.patientPhone}</p>
                            <p className="text-[9px] text-red-700 font-black">Dispatch From: {item.village}</p>
                          </div>
                          <div className="flex flex-col items-end shrink-0 gap-1">
                            <span className="text-[8px] text-slate-400 font-mono">
                              {new Date(item.createdAt).toLocaleTimeString()}
                            </span>
                            <span className="text-[9px] font-black text-red-600 uppercase">{item.status}</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* 5. SUBSIDY PAYMENTS SECTION */}
                {(searchFilter === "all" || searchFilter === "payments") && globalSearchResults.payments?.length > 0 && (
                  <div className="space-y-2.5">
                    <div className="flex items-center justify-between border-b border-slate-100 pb-1">
                      <h4 className="text-[10px] font-black uppercase text-slate-400 tracking-wider flex items-center space-x-1.5">
                        <IndianRupee className="w-3.5 h-3.5 text-slate-400" />
                        <span>Subsidy Payout Ledger</span>
                      </h4>
                      <span className="text-[9px] font-bold text-slate-500">{globalSearchResults.payments.length} found</span>
                    </div>
                    <div className="grid grid-cols-1 gap-2">
                      {globalSearchResults.payments.map((item: any) => (
                        <div 
                          key={item.id}
                          onClick={() => {
                            setSelectedSearchDetail(item);
                            setSelectedSearchDetailType("payment");
                          }}
                          className={`p-3 border rounded-2xl transition cursor-pointer flex items-center justify-between gap-3 text-left group ${
                            selectedSearchDetail?.id === item.id 
                              ? "border-emerald-500 bg-emerald-50/30" 
                              : "border-slate-150 hover:border-slate-300 hover:bg-slate-50"
                          }`}
                        >
                          <div className="space-y-0.5 min-w-0">
                            <h5 className="text-xs font-black text-slate-800 group-hover:text-emerald-950 truncate">₹{item.amount} DBT Payout</h5>
                            <p className="text-[10px] text-slate-500 font-semibold truncate">Ref: {item.transactionId}</p>
                            <p className="text-[9px] text-slate-400 font-bold truncate">Driver: {item.driverName} • Patient: {item.patientName}</p>
                          </div>
                          <div className="flex flex-col items-end shrink-0 gap-1">
                            <span className={`px-2 py-0.5 rounded-md text-[8px] font-black uppercase ${
                              item.status === "completed" ? "bg-emerald-100 text-emerald-800" :
                              item.status === "pending" ? "bg-amber-100 text-amber-850" :
                              "bg-rose-100 text-rose-800"
                            }`}>
                              {item.status}
                            </span>
                            <span className="text-[8px] text-slate-400 font-mono">
                              {new Date(item.createdAt).toLocaleDateString()}
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* 6. CERTIFIED REPORTS SECTION */}
                {(searchFilter === "all" || searchFilter === "reports") && globalSearchResults.reports?.length > 0 && (
                  <div className="space-y-2.5">
                    <div className="flex items-center justify-between border-b border-slate-100 pb-1">
                      <h4 className="text-[10px] font-black uppercase text-slate-400 tracking-wider flex items-center space-x-1.5">
                        <FileText className="w-3.5 h-3.5 text-slate-400" />
                        <span>Certified Reports</span>
                      </h4>
                      <span className="text-[9px] font-bold text-slate-500">{globalSearchResults.reports.length} found</span>
                    </div>
                    <div className="grid grid-cols-1 gap-2">
                      {globalSearchResults.reports.map((item: any) => (
                        <div 
                          key={item.id}
                          onClick={() => {
                            setSelectedSearchDetail(item);
                            setSelectedSearchDetailType("report");
                          }}
                          className={`p-3 border rounded-2xl transition cursor-pointer flex items-center justify-between gap-3 text-left group ${
                            selectedSearchDetail?.id === item.id 
                              ? "border-emerald-500 bg-emerald-50/30" 
                              : "border-slate-150 hover:border-slate-300 hover:bg-slate-50"
                          }`}
                        >
                          <div className="space-y-0.5 min-w-0">
                            <h5 className="text-xs font-black text-slate-800 group-hover:text-emerald-950 truncate">{item.title}</h5>
                            <p className="text-[10px] text-slate-500 font-semibold truncate">{item.category}</p>
                            <p className="text-[9px] text-slate-400 font-bold">Author: {item.author}</p>
                          </div>
                          <div className="flex flex-col items-end shrink-0 gap-1">
                            <span className={`px-2 py-0.5 rounded-md text-[8px] font-black uppercase ${
                              item.status === "certified" ? "bg-emerald-100 text-emerald-800" :
                              item.status === "under_review" ? "bg-amber-100 text-amber-800" :
                              "bg-slate-100 text-slate-600"
                            }`}>
                              {item.status.replace("_", " ")}
                            </span>
                            <span className="text-[8px] text-slate-400 font-medium">
                              {new Date(item.createdAt).toLocaleDateString()}
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* 7. SUPPORT TICKETS SECTION */}
                {(searchFilter === "all" || searchFilter === "support") && globalSearchResults.support?.length > 0 && (
                  <div className="space-y-2.5">
                    <div className="flex items-center justify-between border-b border-slate-100 pb-1">
                      <h4 className="text-[10px] font-black uppercase text-slate-400 tracking-wider flex items-center space-x-1.5">
                        <HelpCircle className="w-3.5 h-3.5 text-slate-400" />
                        <span>Support and Feedback Logs</span>
                      </h4>
                      <span className="text-[9px] font-bold text-slate-500">{globalSearchResults.support.length} found</span>
                    </div>
                    <div className="grid grid-cols-1 gap-2">
                      {globalSearchResults.support.map((item: any) => (
                        <div 
                          key={item.id}
                          onClick={() => {
                            setSelectedSearchDetail(item);
                            setSelectedSearchDetailType("support");
                          }}
                          className={`p-3 border rounded-2xl transition cursor-pointer flex items-center justify-between gap-3 text-left group ${
                            selectedSearchDetail?.id === item.id 
                              ? "border-emerald-500 bg-emerald-50/30" 
                              : "border-slate-150 hover:border-slate-300 hover:bg-slate-50"
                          }`}
                        >
                          <div className="space-y-0.5 min-w-0">
                            <h5 className="text-xs font-black text-slate-800 group-hover:text-emerald-950 truncate">{item.subject}</h5>
                            <p className="text-[10px] text-slate-500 font-semibold truncate">{item.userName} ({item.userRole})</p>
                            <p className="text-[9px] text-slate-400 italic truncate">"{item.message}"</p>
                          </div>
                          <div className="flex flex-col items-end shrink-0 gap-1">
                            <span className={`px-2 py-0.5 rounded-md text-[8px] font-black uppercase ${
                              item.status === "resolved" ? "bg-emerald-100 text-emerald-800" :
                              item.status === "in_progress" ? "bg-amber-100 text-amber-800" :
                              "bg-red-100 text-red-800"
                            }`}>
                              {item.status.replace("_", " ")}
                            </span>
                            <span className="text-[8px] text-slate-400 font-medium">
                              {new Date(item.createdAt).toLocaleDateString()}
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

              </div>

              {/* Detail Screen Overlay / Right Pane */}
              {selectedSearchDetail ? (
                <div className="flex-1 overflow-y-auto p-6 bg-slate-50/50 flex flex-col justify-between">
                  
                  {/* Detailed Card Layout */}
                  <div className="space-y-6">
                    
                    {/* Header back button on mobile, title always */}
                    <div className="flex items-center justify-between border-b border-slate-200 pb-4">
                      <div className="space-y-1">
                        <span className="text-[9px] text-emerald-600 font-black uppercase tracking-widest block">
                          GramGo Secure Ledger
                        </span>
                        <h4 className="text-sm font-black text-slate-900 uppercase">
                          {selectedSearchDetailType} Verification Document
                        </h4>
                      </div>
                      <button 
                        onClick={() => setSelectedSearchDetail(null)}
                        className="md:hidden p-1.5 bg-white border border-slate-200 hover:bg-slate-100 rounded-xl text-xs font-bold transition cursor-pointer"
                      >
                        Back to List
                      </button>
                    </div>

                    {/* PAYMENT DETAIL VIEW */}
                    {selectedSearchDetailType === "payment" && (
                      <div className="space-y-5 bg-white p-5 border border-slate-200/60 shadow-md rounded-2xl">
                        <div className="flex justify-between items-start">
                          <div className="space-y-0.5">
                            <span className="text-[9px] text-slate-400 font-black uppercase block">Payment Voucher ID</span>
                            <span className="text-xs font-mono font-bold text-slate-700">{selectedSearchDetail.id}</span>
                          </div>
                          <span className={`px-2.5 py-0.5 rounded-lg text-[10px] font-black uppercase ${
                            selectedSearchDetail.status === "completed" ? "bg-emerald-50 text-emerald-700 border border-emerald-100" :
                            selectedSearchDetail.status === "pending" ? "bg-amber-50 text-amber-700 border border-amber-100" :
                            "bg-rose-50 text-rose-700 border border-rose-100"
                          }`}>
                            {selectedSearchDetail.status}
                          </span>
                        </div>

                        <div className="grid grid-cols-2 gap-4 border-t border-slate-100 pt-4 text-xs font-semibold text-slate-700">
                          <div>
                            <span className="text-[9px] text-slate-400 font-black uppercase block">DBT Amount</span>
                            <span className="text-sm font-black text-slate-900">₹{selectedSearchDetail.amount}.00</span>
                          </div>
                          <div>
                            <span className="text-[9px] text-slate-400 font-black uppercase block">Subsidy Category</span>
                            <span className="text-xs font-bold text-slate-800">{selectedSearchDetail.type}</span>
                          </div>
                          <div>
                            <span className="text-[9px] text-slate-400 font-black uppercase block">Volunteer Driver</span>
                            <span className="text-xs font-bold text-slate-800">{selectedSearchDetail.driverName}</span>
                          </div>
                          <div>
                            <span className="text-[9px] text-slate-400 font-black uppercase block">Patient Beneficiary</span>
                            <span className="text-xs font-bold text-slate-800">{selectedSearchDetail.patientName}</span>
                          </div>
                          <div>
                            <span className="text-[9px] text-slate-400 font-black uppercase block">Direct Payout Method</span>
                            <span className="text-xs font-bold text-slate-800">{selectedSearchDetail.payoutMethod}</span>
                          </div>
                          <div>
                            <span className="text-[9px] text-slate-400 font-black uppercase block">Transaction Reference</span>
                            <span className="text-xs font-mono font-bold text-emerald-700">{selectedSearchDetail.transactionId}</span>
                          </div>
                        </div>

                        <div className="border-t border-slate-100 pt-4 space-y-2">
                          <span className="text-[9px] text-slate-400 font-black uppercase block">Action Controls</span>
                          <div className="flex gap-2">
                            {selectedSearchDetail.status === "pending" && (
                              <button
                                onClick={async () => {
                                  try {
                                    const res = await fetch(`/api/admin/payments/${selectedSearchDetail.id}/status`, {
                                      method: "PUT",
                                      headers: { 
                                        "Content-Type": "application/json",
                                        Authorization: `Bearer ${token}` 
                                      },
                                      body: JSON.stringify({ status: "completed" })
                                    });
                                    if (res.ok) {
                                      showToast("Payment status updated to Completed", "success");
                                      setSelectedSearchDetail({ ...selectedSearchDetail, status: "completed" });
                                      triggerGlobalSearch(globalSearchQuery);
                                    }
                                  } catch (err) {
                                    console.error(err);
                                  }
                                }}
                                className="px-3 py-1.5 bg-emerald-600 text-white rounded-xl text-xs font-black hover:bg-emerald-700 cursor-pointer transition shadow"
                              >
                                Approve DBT Transfer
                              </button>
                            )}
                            <button
                              onClick={() => {
                                showToast(`Direct Benefit Transfer Receipt generated for ${selectedSearchDetail.driverName}`, "success");
                              }}
                              className="px-3 py-1.5 bg-slate-900 text-white rounded-xl text-xs font-black hover:bg-slate-800 cursor-pointer transition shadow"
                            >
                              Download DBT Receipt
                            </button>
                          </div>
                        </div>
                      </div>
                    )}

                    {/* REPORT DETAIL VIEW */}
                    {selectedSearchDetailType === "report" && (
                      <div className="space-y-5 bg-white p-5 border border-slate-200/60 shadow-md rounded-2xl">
                        <div className="flex justify-between items-start">
                          <div className="space-y-0.5">
                            <span className="text-[9px] text-slate-400 font-black uppercase block">Report Code ID</span>
                            <span className="text-xs font-mono font-bold text-slate-700">{selectedSearchDetail.id}</span>
                          </div>
                          <span className={`px-2.5 py-0.5 rounded-lg text-[10px] font-black uppercase ${
                            selectedSearchDetail.status === "certified" ? "bg-emerald-50 text-emerald-700 border border-emerald-100" :
                            "bg-amber-50 text-amber-750 border border-amber-100"
                          }`}>
                            {selectedSearchDetail.status.replace("_", " ")}
                          </span>
                        </div>

                        <div className="space-y-3 border-t border-slate-100 pt-4">
                          <h5 className="text-sm font-black text-slate-900">{selectedSearchDetail.title}</h5>
                          <div className="grid grid-cols-2 gap-4 text-xs font-semibold text-slate-600">
                            <div>
                              <span className="text-[9px] text-slate-400 font-black uppercase block">Category</span>
                              <span className="text-slate-800">{selectedSearchDetail.category}</span>
                            </div>
                            <div>
                              <span className="text-[9px] text-slate-400 font-black uppercase block">Author Officer</span>
                              <span className="text-slate-800">{selectedSearchDetail.author}</span>
                            </div>
                          </div>
                          <div className="space-y-1">
                            <span className="text-[9px] text-slate-400 font-black uppercase block">Summary Log</span>
                            <p className="text-xs text-slate-700 leading-relaxed font-medium bg-slate-50 p-3 rounded-xl border border-slate-100">
                              {selectedSearchDetail.summary}
                            </p>
                          </div>
                        </div>

                        <div className="border-t border-slate-100 pt-4 space-y-2">
                          <span className="text-[9px] text-slate-400 font-black uppercase block">Administrative Actions</span>
                          <div className="flex gap-2">
                            {selectedSearchDetail.status !== "certified" && (
                              <button
                                onClick={async () => {
                                  try {
                                    const res = await fetch(`/api/admin/reports/${selectedSearchDetail.id}/status`, {
                                      method: "PUT",
                                      headers: { 
                                        "Content-Type": "application/json",
                                        Authorization: `Bearer ${token}` 
                                      },
                                      body: JSON.stringify({ status: "certified" })
                                    });
                                    if (res.ok) {
                                      showToast("Report successfully certified & signed", "success");
                                      setSelectedSearchDetail({ ...selectedSearchDetail, status: "certified" });
                                      triggerGlobalSearch(globalSearchQuery);
                                    }
                                  } catch (err) {
                                    console.error(err);
                                  }
                                }}
                                className="px-3 py-1.5 bg-emerald-600 text-white rounded-xl text-xs font-black hover:bg-emerald-700 cursor-pointer transition shadow"
                              >
                                Certify & Digital Sign
                              </button>
                            )}
                            <button
                              onClick={() => {
                                showToast("CSV/PDF Exporting initialized.", "success");
                              }}
                              className="px-3 py-1.5 bg-slate-900 text-white rounded-xl text-xs font-black hover:bg-slate-800 cursor-pointer transition shadow"
                            >
                              Download CSV Audit Log
                            </button>
                          </div>
                        </div>
                      </div>
                    )}

                    {/* SUPPORT DETAIL VIEW */}
                    {selectedSearchDetailType === "support" && (
                      <div className="space-y-5 bg-white p-5 border border-slate-200/60 shadow-md rounded-2xl">
                        <div className="flex justify-between items-start">
                          <div className="space-y-0.5">
                            <span className="text-[9px] text-slate-400 font-black uppercase block">Ticket ID</span>
                            <span className="text-xs font-mono font-bold text-slate-700">{selectedSearchDetail.id}</span>
                          </div>
                          <span className={`px-2.5 py-0.5 rounded-lg text-[10px] font-black uppercase ${
                            selectedSearchDetail.status === "resolved" ? "bg-emerald-50 text-emerald-700 border border-emerald-100" :
                            selectedSearchDetail.status === "in_progress" ? "bg-amber-50 text-amber-700 border border-amber-100" :
                            "bg-red-50 text-red-750 border border-red-100"
                          }`}>
                            {selectedSearchDetail.status.replace("_", " ")}
                          </span>
                        </div>

                        <div className="space-y-3 border-t border-slate-100 pt-4">
                          <h5 className="text-sm font-black text-slate-900">{selectedSearchDetail.subject}</h5>
                          <div className="grid grid-cols-2 gap-4 text-xs font-semibold text-slate-600">
                            <div>
                              <span className="text-[9px] text-slate-400 font-black uppercase block">User Submitter</span>
                              <span className="text-slate-800">{selectedSearchDetail.userName} ({selectedSearchDetail.userRole.toUpperCase()})</span>
                            </div>
                            <div>
                              <span className="text-[9px] text-slate-400 font-black uppercase block">Phone Contact</span>
                              <span className="text-slate-800">{selectedSearchDetail.userPhone}</span>
                            </div>
                            <div>
                              <span className="text-[9px] text-slate-400 font-black uppercase block">Inquiry Category</span>
                              <span className="text-slate-800">{selectedSearchDetail.category}</span>
                            </div>
                            <div>
                              <span className="text-[9px] text-slate-400 font-black uppercase block">Logs Timestamp</span>
                              <span className="text-slate-800">{new Date(selectedSearchDetail.createdAt).toLocaleString()}</span>
                            </div>
                          </div>
                          <div className="space-y-1">
                            <span className="text-[9px] text-slate-400 font-black uppercase block">User Message Description</span>
                            <p className="text-xs text-slate-700 leading-relaxed font-medium bg-slate-50 p-3 rounded-xl border border-slate-100">
                              "{selectedSearchDetail.message}"
                            </p>
                          </div>
                        </div>

                        <div className="border-t border-slate-100 pt-4 space-y-2">
                          <span className="text-[9px] text-slate-400 font-black uppercase block">Update Ticket Status</span>
                          <div className="flex gap-2">
                            {selectedSearchDetail.status !== "resolved" && (
                              <button
                                onClick={async () => {
                                  try {
                                    const res = await fetch(`/api/admin/support-tickets/${selectedSearchDetail.id}/status`, {
                                      method: "PUT",
                                      headers: { 
                                        "Content-Type": "application/json",
                                        Authorization: `Bearer ${token}` 
                                      },
                                      body: JSON.stringify({ status: "resolved" })
                                    });
                                    if (res.ok) {
                                      showToast("Support ticket successfully marked Resolved", "success");
                                      setSelectedSearchDetail({ ...selectedSearchDetail, status: "resolved" });
                                      triggerGlobalSearch(globalSearchQuery);
                                    }
                                  } catch (err) {
                                    console.error(err);
                                  }
                                }}
                                className="px-3 py-1.5 bg-emerald-600 text-white rounded-xl text-xs font-black hover:bg-emerald-700 cursor-pointer transition shadow animate-bounce-once"
                              >
                                Mark as Resolved
                              </button>
                            )}
                            {selectedSearchDetail.status === "open" && (
                              <button
                                onClick={async () => {
                                  try {
                                    const res = await fetch(`/api/admin/support-tickets/${selectedSearchDetail.id}/status`, {
                                      method: "PUT",
                                      headers: { 
                                        "Content-Type": "application/json",
                                        Authorization: `Bearer ${token}` 
                                      },
                                      body: JSON.stringify({ status: "in_progress" })
                                    });
                                    if (res.ok) {
                                      showToast("Support ticket status set to In Progress", "success");
                                      setSelectedSearchDetail({ ...selectedSearchDetail, status: "in_progress" });
                                      triggerGlobalSearch(globalSearchQuery);
                                    }
                                  } catch (err) {
                                    console.error(err);
                                  }
                                }}
                                className="px-3 py-1.5 bg-amber-600 text-white rounded-xl text-xs font-black hover:bg-amber-700 cursor-pointer transition shadow"
                              >
                                Set In Progress
                              </button>
                            )}
                            <button
                              onClick={() => {
                                showToast(`Initiating telephone advisory callback to ${selectedSearchDetail.userName}`, "success");
                              }}
                              className="px-3 py-1.5 bg-slate-900 text-white rounded-xl text-xs font-black hover:bg-slate-800 cursor-pointer transition shadow"
                            >
                              Call Advisory Line
                            </button>
                          </div>
                        </div>
                      </div>
                    )}

                  </div>

                  {/* Close panel */}
                  <div className="pt-4 border-t border-slate-100 flex justify-end">
                    <button
                      onClick={() => setSelectedSearchDetail(null)}
                      className="px-4 py-2 bg-slate-100 text-slate-700 hover:bg-slate-200 rounded-xl text-xs font-black cursor-pointer transition"
                    >
                      Close Detail View
                    </button>
                  </div>

                </div>
              ) : (
                <div className="hidden md:flex flex-1 flex-col items-center justify-center p-6 bg-slate-50/50 text-slate-400 text-center space-y-2">
                  <HelpCircle className="w-8 h-8 text-slate-300" />
                  <div>
                    <h5 className="text-xs font-black uppercase text-slate-700 tracking-wide">Quick Ledger Preview</h5>
                    <p className="text-[11px] text-slate-400 max-w-[250px] mx-auto mt-0.5">Click any Subsidiary Payment, Report or Support Ticket to view its full audit voucher immediately.</p>
                  </div>
                </div>
              )}

            </div>

            {/* Modal Footer hint */}
            <div className="bg-slate-900 text-slate-400 px-5 py-3 text-[10px] font-bold flex justify-between items-center select-none shrink-0 border-t border-slate-850">
              <span>Press ESC or click outside to dismiss the search engine</span>
              <span className="flex items-center space-x-1">
                <span>Central database connected</span>
                <span className="w-1.5 h-1.5 bg-emerald-400 rounded-full animate-ping" />
              </span>
            </div>

          </div>
        </div>
      )}

    </div>
  );
}
