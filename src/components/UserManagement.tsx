import React, { useState, useEffect } from "react";
import { User, UserRole, EmergencyRide } from "../types";
import { 
  Search, ChevronLeft, ChevronRight, UserCheck, UserX, 
  Trash2, Edit, Eye, Loader2, ShieldAlert, FileText, 
  Wallet, X, MapPin, Calendar, Coins, Clock, Check, AlertTriangle,
  ArrowUpDown, ArrowUp, ArrowDown
} from "lucide-react";
import Pagination from "./Pagination";

interface UserManagementProps {
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

interface WalletDetails {
  userId: string;
  role: string;
  balance: number;
  currency: string;
  transactions: {
    id: string;
    userId: string;
    type: "credit" | "debit";
    amount: number;
    description: string;
    referenceId?: string;
    createdAt: number;
    status: string;
  }[];
}

export default function UserManagement({ token, onShowToast, filters }: UserManagementProps) {
  // Database States
  const [users, setUsers] = useState<User[]>([]);
  const [totalUsers, setTotalUsers] = useState(0);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [limit, setLimit] = useState(10);
  const [isLoading, setIsLoading] = useState(true);

  // Sorting States
  const [sortBy, setSortBy] = useState<string>("createdAt");
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("desc");

  // Search and Filter States
  const [search, setSearch] = useState("");
  const [roleFilter, setRoleFilter] = useState<string>("all");
  const [statusFilter, setStatusFilter] = useState<string>("all");

  // Selected User Sub-Views
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [activeProfileTab, setActiveProfileTab] = useState<"details" | "rides" | "wallet">("details");
  const [userRides, setUserRides] = useState<EmergencyRide[]>([]);
  const [isRidesLoading, setIsRidesLoading] = useState(false);
  const [userWallet, setUserWallet] = useState<WalletDetails | null>(null);
  const [isWalletLoading, setIsWalletLoading] = useState(false);

  // Edit State
  const [isEditing, setIsEditing] = useState(false);
  const [editForm, setEditForm] = useState<Partial<User>>({});
  const [isSaving, setIsSaving] = useState(false);

  // Action State (Action in progress)
  const [actionUserId, setActionUserId] = useState<string | null>(null);

  // Custom Confirmation Modals
  const [confirmAction, setConfirmAction] = useState<{
    type: "suspend" | "activate" | "delete";
    user: User;
  } | null>(null);

  // Trigger loading list when page/search/filters change
  useEffect(() => {
    if (token) {
      fetchUsers();
    }
  }, [token, page, roleFilter, statusFilter, filters, limit, sortBy, sortOrder]);

  // Debounced/Triggered search execution
  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setPage(1);
    fetchUsers();
  };

  const fetchUsers = async () => {
    setIsLoading(true);
    try {
      const params: any = {
        page: String(page),
        limit: String(limit),
        search: search,
        role: roleFilter,
        status: statusFilter,
        sortBy: sortBy,
        sortOrder: sortOrder
      };

      if (filters) {
        if (filters.district !== "all") params.district = filters.district;
        if (filters.village !== "all") params.village = filters.village;
      }

      const query = new URLSearchParams(params).toString();

      const res = await fetch(`/api/admin/users?${query}`, {
        headers: { Authorization: `Bearer ${token}` }
      });

      if (res.ok) {
        const data = await res.json();
        setUsers(data.users);
        setTotalUsers(data.total);
        setTotalPages(data.totalPages);
      } else {
        onShowToast("Failed to fetch user list", "error");
      }
    } catch (err) {
      console.error("Error fetching users:", err);
      onShowToast("Network error while connecting to user database", "error");
    } finally {
      setIsLoading(false);
    }
  };

  // Fetch Ride History for specific user
  const fetchUserRides = async (userId: string) => {
    setIsRidesLoading(true);
    try {
      const res = await fetch(`/api/admin/users/${userId}/rides`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setUserRides(data.rides || []);
      }
    } catch (err) {
      console.error("Error fetching user rides:", err);
    } finally {
      setIsRidesLoading(false);
    }
  };

  // Fetch Wallet ledger / subsidy history
  const fetchUserWallet = async (userId: string) => {
    setIsWalletLoading(true);
    try {
      const res = await fetch(`/api/admin/users/${userId}/wallet`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setUserWallet(data.wallet || null);
      }
    } catch (err) {
      console.error("Error fetching wallet details:", err);
    } finally {
      setIsWalletLoading(false);
    }
  };

  // Open user drawer / detail view
  const handleViewUser = (user: User) => {
    setSelectedUser(user);
    setActiveProfileTab("details");
    fetchUserRides(user.id);
    fetchUserWallet(user.id);
  };

  // Handle Edit User Form
  const handleOpenEdit = (user: User) => {
    setEditForm({ ...user });
    setIsEditing(true);
  };

  const handleSaveEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editForm.id) return;
    setIsSaving(true);
    try {
      const res = await fetch(`/api/admin/users/${editForm.id}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify(editForm)
      });

      const data = await res.json();
      if (res.ok) {
        onShowToast(data.message || "User profile saved successfully", "success");
        setIsEditing(false);
        fetchUsers();
        if (selectedUser && selectedUser.id === editForm.id) {
          setSelectedUser({ ...selectedUser, ...editForm } as User);
        }
      } else {
        onShowToast(data.error || "Failed to update profile", "error");
      }
    } catch (err) {
      console.error("Error saving profile:", err);
      onShowToast("Network error. Could not update profile.", "error");
    } finally {
      setIsSaving(false);
    }
  };

  // Suspend user process
  const executeSuspend = async (userId: string) => {
    setActionUserId(userId);
    try {
      const res = await fetch(`/api/admin/users/${userId}/suspend`, {
        method: "PUT",
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await res.json();
      if (res.ok) {
        onShowToast(data.message || "Account suspended successfully", "success");
        fetchUsers();
        if (selectedUser && selectedUser.id === userId) {
          setSelectedUser({ ...selectedUser, status: "suspended" });
        }
      } else {
        onShowToast(data.error || "Failed to suspend account", "error");
      }
    } catch (err) {
      console.error(err);
      onShowToast("Error suspending account", "error");
    } finally {
      setActionUserId(null);
      setConfirmAction(null);
    }
  };

  // Activate user process
  const executeActivate = async (userId: string) => {
    setActionUserId(userId);
    try {
      const res = await fetch(`/api/admin/users/${userId}/activate`, {
        method: "PUT",
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await res.json();
      if (res.ok) {
        onShowToast(data.message || "Account activated successfully", "success");
        fetchUsers();
        if (selectedUser && selectedUser.id === userId) {
          setSelectedUser({ ...selectedUser, status: "active" });
        }
      } else {
        onShowToast(data.error || "Failed to activate account", "error");
      }
    } catch (err) {
      console.error(err);
      onShowToast("Error activating account", "error");
    } finally {
      setActionUserId(null);
      setConfirmAction(null);
    }
  };

  // Delete user process
  const executeDelete = async (userId: string) => {
    setActionUserId(userId);
    try {
      const res = await fetch(`/api/admin/users/${userId}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await res.json();
      if (res.ok) {
        onShowToast(data.message || "Account deleted successfully", "success");
        setSelectedUser(null);
        fetchUsers();
      } else {
        onShowToast(data.error || "Failed to delete account", "error");
      }
    } catch (err) {
      console.error(err);
      onShowToast("Error deleting account", "error");
    } finally {
      setActionUserId(null);
      setConfirmAction(null);
    }
  };

  // Helper styles for priority
  const getPriorityColor = (p: string) => {
    switch (p.toLowerCase()) {
      case "critical": return "bg-red-50 text-red-700 border-red-100";
      case "urgent": return "bg-amber-50 text-amber-700 border-amber-100";
      default: return "bg-blue-50 text-blue-700 border-blue-100";
    }
  };

  // Helper styles for ride status
  const getRideStatusColor = (s: string) => {
    switch (s.toLowerCase()) {
      case "completed": return "bg-emerald-50 text-emerald-700 border-emerald-100";
      case "cancelled": return "bg-rose-50 text-rose-700 border-rose-100";
      case "searching": return "bg-rose-50/50 text-rose-800 border-rose-200 animate-pulse";
      default: return "bg-slate-50 text-slate-700 border-slate-200";
    }
  };

  const displayedUsers = users;

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
    <div className="bg-white border border-slate-100 rounded-3xl p-6 space-y-6 shadow-sm">
      
      {/* 1. Header & Quick Controls */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6 pb-4 border-b border-slate-50">
        <div>
          <h2 className="text-lg font-black tracking-tight text-slate-900 flex items-center gap-2">
            <span className="w-2.5 h-2.5 bg-emerald-500 rounded-full" />
            <span>Panchayat Health Network Directory</span>
          </h2>
          <p className="text-xs text-slate-400">Complete control panel for managing village patients, volunteer drivers, and system admins.</p>
        </div>

        {/* Search Form and Filter Selectors */}
        <form onSubmit={handleSearchSubmit} className="flex flex-wrap items-center gap-3 w-full lg:w-auto">
          {/* Search Box */}
          <div className="relative flex-grow sm:flex-grow-0 sm:w-64">
            <Search className="absolute left-3 top-2.5 w-4 h-4 text-slate-400" />
            <input
              type="text"
              placeholder="Search by name, phone, village..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-9 pr-4 py-2 bg-slate-50 border border-slate-100 rounded-xl text-xs font-semibold focus:bg-white focus:outline-none focus:ring-1 focus:ring-emerald-500 transition"
            />
          </div>

          {/* Role Filter */}
          <select
            value={roleFilter}
            onChange={(e) => { setRoleFilter(e.target.value); setPage(1); }}
            className="px-3 py-2 bg-slate-50 border border-slate-100 rounded-xl text-xs font-semibold focus:outline-none cursor-pointer hover:bg-slate-100 transition"
          >
            <option value="all">All Roles</option>
            <option value="passenger">Passengers</option>
            <option value="driver">Drivers</option>
            <option value="admin">Admins</option>
          </select>

          {/* Status Filter */}
          <select
            value={statusFilter}
            onChange={(e) => { setStatusFilter(e.target.value); setPage(1); }}
            className="px-3 py-2 bg-slate-50 border border-slate-100 rounded-xl text-xs font-semibold focus:outline-none cursor-pointer hover:bg-slate-100 transition"
          >
            <option value="all">All Statuses</option>
            <option value="active">Active Members</option>
            <option value="suspended">Suspended</option>
          </select>

          {/* Search Button */}
          <button
            type="submit"
            className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-extrabold uppercase transition tracking-wider"
          >
            Query
          </button>
        </form>
      </div>

      {/* 2. Responsive Table View */}
      {isLoading ? (
        <div className="py-24 flex flex-col items-center justify-center space-y-3">
          <Loader2 className="w-8 h-8 text-emerald-500 animate-spin" />
          <span className="text-xs font-bold text-slate-400">Querying Panchayat directory database...</span>
        </div>
      ) : displayedUsers.length === 0 ? (
        <div className="py-16 text-center border border-dashed border-slate-100 rounded-2xl space-y-2">
          <AlertTriangle className="w-10 h-10 text-slate-300 mx-auto" />
          <p className="text-xs text-slate-500 font-bold">No registered network records match your query.</p>
          <button
            onClick={() => { setSearch(""); setRoleFilter("all"); setStatusFilter("all"); setPage(1); }}
            className="px-3 py-1.5 bg-slate-50 hover:bg-slate-100 border border-slate-200 text-slate-600 rounded-lg text-[10px] font-black uppercase transition"
          >
            Clear Filters
          </button>
        </div>
      ) : (
        <div className="space-y-4">
          <div className="overflow-x-auto border border-slate-50 rounded-2xl shadow-sm">
            <table className="w-full text-left border-collapse text-xs font-semibold">
              <thead>
                <tr className="bg-slate-50 text-slate-400 uppercase tracking-wider text-[10px] border-b border-slate-100 select-none">
                  <th className="p-4 cursor-pointer hover:bg-slate-100 hover:text-slate-800 transition group" onClick={() => handleSort("name")}>
                    <div className="flex items-center">
                      Account / ID {renderSortIcon("name")}
                    </div>
                  </th>
                  <th className="p-4 cursor-pointer hover:bg-slate-100 hover:text-slate-800 transition group" onClick={() => handleSort("phone")}>
                    <div className="flex items-center">
                      Contact {renderSortIcon("phone")}
                    </div>
                  </th>
                  <th className="p-4 cursor-pointer hover:bg-slate-100 hover:text-slate-800 transition group" onClick={() => handleSort("village")}>
                    <div className="flex items-center">
                      Village Location {renderSortIcon("village")}
                    </div>
                  </th>
                  <th className="p-4 cursor-pointer hover:bg-slate-100 hover:text-slate-800 transition group" onClick={() => handleSort("role")}>
                    <div className="flex items-center">
                      Role Badge {renderSortIcon("role")}
                    </div>
                  </th>
                  <th className="p-4 cursor-pointer hover:bg-slate-100 hover:text-slate-800 transition group" onClick={() => handleSort("status")}>
                    <div className="flex items-center">
                      Status {renderSortIcon("status")}
                    </div>
                  </th>
                  <th className="p-4 text-right">Directory Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {displayedUsers.map((u) => (
                  <tr key={u.id} className="hover:bg-slate-50/50 transition-colors">
                    {/* ID & Name */}
                    <td className="p-4">
                      <span className="font-black text-slate-900 block text-sm">{u.name}</span>
                      <span className="text-[10px] text-slate-400 font-mono block">ID: {u.id}</span>
                    </td>

                    {/* Contact details */}
                    <td className="p-4">
                      <span className="text-slate-800 block font-bold">{u.phone}</span>
                      {u.email && <span className="text-[10px] text-slate-400 block">{u.email}</span>}
                    </td>

                    {/* Location */}
                    <td className="p-4">
                      <span className="text-slate-800 block">{u.village}</span>
                      <span className="text-[10px] text-slate-400 block">{u.district || "Ghazipur"}</span>
                    </td>

                    {/* Role Badge */}
                    <td className="p-4">
                      <span className={`px-2 py-0.5 border text-[9px] font-black uppercase rounded ${
                        u.role === "admin"
                          ? "bg-slate-900 text-slate-50 border-slate-900" 
                          : u.role === "driver"
                          ? "bg-emerald-50 text-emerald-800 border-emerald-200"
                          : "bg-blue-50 text-blue-800 border-blue-200"
                      }`}>
                        {u.role}
                      </span>
                    </td>

                    {/* Status Toggle Badge */}
                    <td className="p-4">
                      <span className={`inline-flex items-center gap-1 px-2 py-0.5 border rounded-full text-[9px] font-black uppercase ${
                        u.status === "suspended"
                          ? "bg-rose-50 text-rose-700 border-rose-200"
                          : "bg-emerald-50 text-emerald-700 border-emerald-200"
                      }`}>
                        <span className={`w-1 h-1 rounded-full ${u.status === "suspended" ? "bg-rose-500" : "bg-emerald-500"}`} />
                        <span>{u.status || "active"}</span>
                      </span>
                    </td>

                    {/* Directory Action Buttons */}
                    <td className="p-4 text-right space-x-1.5">
                      <button
                        onClick={() => handleViewUser(u)}
                        className="p-1.5 bg-slate-50 text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-lg border border-slate-100 transition cursor-pointer"
                        title="View Profile Details"
                      >
                        <Eye className="w-3.5 h-3.5" />
                      </button>

                      <button
                        onClick={() => handleOpenEdit(u)}
                        className="p-1.5 bg-slate-50 text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-lg border border-slate-100 transition cursor-pointer"
                        title="Edit Account Details"
                      >
                        <Edit className="w-3.5 h-3.5" />
                      </button>

                      {u.status === "suspended" ? (
                        <button
                          onClick={() => setConfirmAction({ type: "activate", user: u })}
                          className="p-1.5 bg-emerald-50 text-emerald-600 hover:text-emerald-800 hover:bg-emerald-100 rounded-lg border border-emerald-100 transition cursor-pointer"
                          title="Activate Account"
                        >
                          <UserCheck className="w-3.5 h-3.5" />
                        </button>
                      ) : (
                        <button
                          onClick={() => setConfirmAction({ type: "suspend", user: u })}
                          className="p-1.5 bg-amber-50 text-amber-600 hover:text-amber-800 hover:bg-amber-100 rounded-lg border border-amber-100 transition cursor-pointer"
                          title="Suspend Account"
                        >
                          <UserX className="w-3.5 h-3.5" />
                        </button>
                      )}

                      <button
                        onClick={() => setConfirmAction({ type: "delete", user: u })}
                        className="p-1.5 bg-rose-50 text-rose-500 hover:text-rose-700 hover:bg-rose-100 rounded-lg border border-rose-100 transition cursor-pointer"
                        title="Delete User Record"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Pagination Controls */}
          <Pagination
            id="user-management-pagination"
            page={page}
            totalPages={totalPages}
            totalItems={totalUsers}
            limit={limit}
            onPageChange={setPage}
            onLimitChange={setLimit}
          />
        </div>
      )}

      {/* 3. Sliding Profile Drawer (Details, Rides, Wallet) */}
      {selectedUser && (
        <div className="fixed inset-0 z-50 flex justify-end bg-slate-900/40 backdrop-blur-sm animate-fade-in">
          <div className="w-full max-w-xl bg-white h-full shadow-2xl flex flex-col animate-slide-in relative border-l border-slate-100">
            
            {/* Drawer Close */}
            <button
              onClick={() => setSelectedUser(null)}
              className="absolute left-4 top-4 p-2 text-slate-400 hover:text-slate-700 hover:bg-slate-50 rounded-full transition"
            >
              <X className="w-4 h-4" />
            </button>

            {/* Drawer Title */}
            <div className="p-6 pt-14 border-b border-slate-100 flex items-center justify-between">
              <div>
                <h3 className="text-base font-black text-slate-900">{selectedUser.name}</h3>
                <span className="text-[10px] text-slate-400 font-mono">Panchayat ID: {selectedUser.id}</span>
              </div>
              <span className={`px-2 py-0.5 border text-[9px] font-black uppercase rounded ${
                selectedUser.role === "admin"
                  ? "bg-slate-900 text-slate-50 border-slate-900" 
                  : selectedUser.role === "driver"
                  ? "bg-emerald-50 text-emerald-800 border-emerald-200"
                  : "bg-blue-50 text-blue-800 border-blue-200"
              }`}>
                {selectedUser.role}
              </span>
            </div>

            {/* Sub-view Navigation Tabs inside Drawer */}
            <div className="flex border-b border-slate-100 text-xs font-black uppercase">
              <button
                onClick={() => setActiveProfileTab("details")}
                className={`flex-1 py-3 text-center transition cursor-pointer border-b-2 ${
                  activeProfileTab === "details" ? "border-slate-900 text-slate-900" : "border-transparent text-slate-400 hover:text-slate-600"
                }`}
              >
                Profile Card
              </button>
              
              {selectedUser.role !== "admin" && (
                <>
                  <button
                    onClick={() => setActiveProfileTab("rides")}
                    className={`flex-1 py-3 text-center transition cursor-pointer border-b-2 ${
                      activeProfileTab === "rides" ? "border-slate-900 text-slate-900" : "border-transparent text-slate-400 hover:text-slate-600"
                    }`}
                  >
                    Ride Logbook
                  </button>
                  <button
                    onClick={() => setActiveProfileTab("wallet")}
                    className={`flex-1 py-3 text-center transition cursor-pointer border-b-2 ${
                      activeProfileTab === "wallet" ? "border-slate-900 text-slate-900" : "border-transparent text-slate-400 hover:text-slate-600"
                    }`}
                  >
                    Subsidy Wallet
                  </button>
                </>
              )}
            </div>

            {/* Scrollable Content Pane */}
            <div className="flex-1 overflow-y-auto p-6 space-y-6">
              
              {/* Tab: Details */}
              {activeProfileTab === "details" && (
                <div className="space-y-6 text-xs font-bold text-slate-800">
                  <div className="grid grid-cols-2 gap-4 bg-slate-50 p-4 rounded-2xl border border-slate-100">
                    <div className="space-y-1">
                      <span className="text-[10px] text-slate-400 block uppercase tracking-wide">Phone Number</span>
                      <span>{selectedUser.phone}</span>
                    </div>
                    <div className="space-y-1">
                      <span className="text-[10px] text-slate-400 block uppercase tracking-wide">Email ID</span>
                      <span className="text-slate-700">{selectedUser.email || "No email registered"}</span>
                    </div>
                    <div className="space-y-1 pt-2">
                      <span className="text-[10px] text-slate-400 block uppercase tracking-wide">Panchayat Village</span>
                      <span>{selectedUser.village}</span>
                    </div>
                    <div className="space-y-1 pt-2">
                      <span className="text-[10px] text-slate-400 block uppercase tracking-wide">Sub-District / Block</span>
                      <span>{selectedUser.district || "Ghazipur"}</span>
                    </div>
                    <div className="space-y-1 pt-2 col-span-2 border-t border-slate-100 mt-2">
                      <span className="text-[10px] text-slate-400 block uppercase tracking-wide">Enrolled On</span>
                      <span className="flex items-center gap-1 text-slate-500 font-semibold">
                        <Calendar className="w-3.5 h-3.5" />
                        {new Date(selectedUser.createdAt).toLocaleDateString()} at {new Date(selectedUser.createdAt).toLocaleTimeString()}
                      </span>
                    </div>
                  </div>

                  {/* Driver Vehicle Registries */}
                  {selectedUser.role === "driver" && (
                    <div className="space-y-3">
                      <h4 className="text-xs font-black text-slate-900 block uppercase tracking-wide">Vehicle & Fleet Details</h4>
                      <div className="grid grid-cols-2 gap-4 bg-emerald-50/20 p-4 rounded-2xl border border-emerald-100/50">
                        <div className="space-y-1">
                          <span className="text-[10px] text-slate-400 block">Vehicle Registry Type</span>
                          <span className="text-emerald-900">{selectedUser.vehicleType || "Tractor Ambulance"}</span>
                        </div>
                        <div className="space-y-1">
                          <span className="text-[10px] text-slate-400 block">Plate License Number</span>
                          <span className="text-emerald-900 font-mono uppercase">{selectedUser.vehicleNumber || "N/A"}</span>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Quick Action Block */}
                  <div className="pt-6 border-t border-slate-100 flex gap-2">
                    <button
                      onClick={() => handleOpenEdit(selectedUser)}
                      className="flex-1 py-2.5 bg-slate-950 hover:bg-slate-800 text-white rounded-xl text-center text-xs font-black uppercase transition cursor-pointer"
                    >
                      Modify Demographics
                    </button>
                    <a
                      href={`tel:${selectedUser.phone}`}
                      className="px-4 py-2 bg-emerald-50 text-emerald-700 hover:bg-emerald-100 border border-emerald-100 rounded-xl flex items-center justify-center transition"
                    >
                      Call Member
                    </a>
                  </div>
                </div>
              )}

              {/* Tab: Rides */}
              {activeProfileTab === "rides" && (
                <div className="space-y-4">
                  {isRidesLoading ? (
                    <div className="py-12 flex flex-col items-center justify-center space-y-2">
                      <Loader2 className="w-6 h-6 text-emerald-500 animate-spin" />
                      <span className="text-[11px] font-bold text-slate-400">Loading ride history...</span>
                    </div>
                  ) : userRides.length === 0 ? (
                    <div className="py-12 text-center text-slate-400 text-xs border border-dashed border-slate-100 rounded-2xl">
                      <Clock className="w-8 h-8 mx-auto text-slate-300 mb-2" />
                      <span>This user has not completed any emergency transit rides yet.</span>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      <span className="text-[10px] font-black text-slate-400 uppercase tracking-wide block">Completed Dispatches ({userRides.length})</span>
                      {userRides.map(ride => (
                        <div key={ride.id} className="p-4 bg-slate-50 border border-slate-100 rounded-2xl space-y-3 text-xs font-semibold">
                          <div className="flex justify-between items-start">
                            <div>
                              <span className="font-extrabold text-slate-900 block">
                                {selectedUser.role === "passenger" ? `Driver: ${ride.driverName || "Pending"}` : `Patient: ${ride.patientName}`}
                              </span>
                              <span className="text-[10px] text-slate-400 font-mono">Ride ID: #{ride.id.substr(0,8).toUpperCase()}</span>
                            </div>
                            <span className={`px-2 py-0.5 border text-[9px] font-black uppercase rounded ${getRideStatusColor(ride.status)}`}>
                              {ride.status}
                            </span>
                          </div>

                          <div className="grid grid-cols-2 gap-2 pt-2 border-t border-slate-100 text-[11px]">
                            <div>
                              <span className="text-[10px] text-slate-400 block uppercase">Trigger Date</span>
                              <span>{new Date(ride.createdAt).toLocaleDateString()}</span>
                            </div>
                            <div>
                              <span className="text-[10px] text-slate-400 block uppercase">Hospital / Destination CHC</span>
                              <span className="text-emerald-700 font-extrabold">{ride.destinationChc}</span>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* Tab: Subsidy Wallet */}
              {activeProfileTab === "wallet" && (
                <div className="space-y-4">
                  {isWalletLoading ? (
                    <div className="py-12 flex flex-col items-center justify-center space-y-2">
                      <Loader2 className="w-6 h-6 text-emerald-500 animate-spin" />
                      <span className="text-[11px] font-bold text-slate-400">Loading ledger balances...</span>
                    </div>
                  ) : !userWallet ? (
                    <div className="py-12 text-center text-slate-400 text-xs border border-dashed border-slate-100 rounded-2xl">
                      <Wallet className="w-8 h-8 mx-auto text-slate-300 mb-2" />
                      <span>Subsidy wallet is not configured for this user profile.</span>
                    </div>
                  ) : (
                    <div className="space-y-4 text-xs font-semibold">
                      {/* Balance Card */}
                      <div className="bg-slate-950 text-white p-5 rounded-3xl space-y-1 relative overflow-hidden shadow-md">
                        <Coins className="absolute right-4 top-4 w-12 h-12 text-white/5" />
                        <span className="text-[10px] text-slate-400 uppercase tracking-wide font-black">Panchayat Subsidy Balance</span>
                        <p className="text-3xl font-black">₹{userWallet.balance.toLocaleString()}</p>
                        <span className="text-[9px] text-slate-400 block font-bold mt-1">
                          {selectedUser.role === "passenger" 
                            ? "Active medical transport credits allotted from gram budget." 
                            : "Earned emergency transportation volunteer DBT credit incentive."}
                        </span>
                      </div>

                      {/* Transaction Log */}
                      <div className="space-y-2.5">
                        <span className="text-[10px] font-black text-slate-400 uppercase tracking-wide block">Subsidy Grant Ledgers ({userWallet.transactions.length})</span>
                        {userWallet.transactions.length === 0 ? (
                          <p className="text-slate-400 text-center py-6">No ledger entries registered.</p>
                        ) : (
                          userWallet.transactions.map((tx, idx) => (
                            <div key={tx.id || idx} className="p-3.5 bg-slate-50 border border-slate-100 rounded-xl flex items-center justify-between gap-4">
                              <div className="space-y-0.5">
                                <span className="font-extrabold text-slate-900 block leading-tight">{tx.description}</span>
                                <span className="text-[10px] text-slate-400 font-mono block">
                                  {new Date(tx.createdAt).toLocaleDateString()} • Code: {tx.id.replace("tx_", "")}
                                </span>
                              </div>
                              <span className={`text-sm font-black whitespace-nowrap ${tx.type === "credit" ? "text-emerald-600" : "text-rose-600"}`}>
                                {tx.type === "credit" ? "+" : "-"} ₹{tx.amount}
                              </span>
                            </div>
                          ))
                        )}
                      </div>
                    </div>
                  )}
                </div>
              )}

            </div>
          </div>
        </div>
      )}

      {/* 4. Edit User Demographics Modal */}
      {isEditing && editForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-sm p-4 animate-fade-in">
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 space-y-6 shadow-2xl relative border border-slate-100">
            <button 
              onClick={() => setIsEditing(false)}
              className="absolute right-4 top-4 p-1.5 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-full transition"
            >
              <X className="w-4 h-4" />
            </button>

            <div>
              <h3 className="text-sm font-extrabold text-slate-900 uppercase tracking-wide">Modify Member Account</h3>
              <p className="text-xs text-slate-400">Update general demographic markers or fleet records below.</p>
            </div>

            <form onSubmit={handleSaveEdit} className="space-y-4 text-xs font-semibold text-slate-800">
              {/* Name */}
              <div className="space-y-1">
                <label className="text-slate-500 block">Full Demographics Name</label>
                <input
                  type="text"
                  required
                  value={editForm.name || ""}
                  onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
                  className="w-full p-2.5 bg-slate-50 border border-slate-100 rounded-xl focus:bg-white outline-none focus:ring-1 focus:ring-emerald-500 transition"
                />
              </div>

              {/* Grid 1: Phone & Email */}
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-slate-500 block">Mobile Number</label>
                  <input
                    type="tel"
                    required
                    value={editForm.phone || ""}
                    onChange={(e) => setEditForm({ ...editForm, phone: e.target.value })}
                    className="w-full p-2.5 bg-slate-50 border border-slate-100 rounded-xl focus:bg-white outline-none focus:ring-1 focus:ring-emerald-500 transition"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-slate-500 block">Email (Optional)</label>
                  <input
                    type="email"
                    value={editForm.email || ""}
                    onChange={(e) => setEditForm({ ...editForm, email: e.target.value })}
                    className="w-full p-2.5 bg-slate-50 border border-slate-100 rounded-xl focus:bg-white outline-none focus:ring-1 focus:ring-emerald-500 transition"
                  />
                </div>
              </div>

              {/* Grid 2: Village & Role */}
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-slate-500 block">Gram Panchayat Village</label>
                  <input
                    type="text"
                    required
                    value={editForm.village || ""}
                    onChange={(e) => setEditForm({ ...editForm, village: e.target.value })}
                    className="w-full p-2.5 bg-slate-50 border border-slate-100 rounded-xl focus:bg-white outline-none"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-slate-500 block">Network Role</label>
                  <select
                    value={editForm.role || ""}
                    onChange={(e) => setEditForm({ ...editForm, role: e.target.value as UserRole })}
                    className="w-full p-2.5 bg-slate-50 border border-slate-100 rounded-xl outline-none focus:bg-white cursor-pointer"
                  >
                    <option value="passenger">Passenger</option>
                    <option value="driver">Driver</option>
                    <option value="admin">Admin</option>
                  </select>
                </div>
              </div>

              {/* Driver-specific entries */}
              {editForm.role === "driver" && (
                <div className="p-4 bg-emerald-50/20 border border-emerald-100/50 rounded-2xl grid grid-cols-2 gap-4">
                  <div className="space-y-1 col-span-2">
                    <span className="text-[10px] text-emerald-800 uppercase block tracking-wider font-black">Transport Registry Settings</span>
                  </div>
                  <div className="space-y-1">
                    <label className="text-slate-500 block">Vehicle Classification</label>
                    <select
                      value={editForm.vehicleType || ""}
                      onChange={(e) => setEditForm({ ...editForm, vehicleType: e.target.value as any })}
                      className="w-full p-2 bg-white border border-slate-200 rounded-lg outline-none cursor-pointer"
                    >
                      <option value="Auto Rickshaw">Auto Rickshaw</option>
                      <option value="Bolero SUV">Bolero SUV</option>
                      <option value="Tractor Ambulance">Tractor Ambulance</option>
                      <option value="E-Rickshaw">E-Rickshaw</option>
                    </select>
                  </div>
                  <div className="space-y-1">
                    <label className="text-slate-500 block">Plate License Plate</label>
                    <input
                      type="text"
                      required
                      value={editForm.vehicleNumber || ""}
                      onChange={(e) => setEditForm({ ...editForm, vehicleNumber: e.target.value })}
                      className="w-full p-2 bg-white border border-slate-200 rounded-lg outline-none uppercase font-mono"
                    />
                  </div>
                </div>
              )}

              {/* Action Buttons */}
              <div className="pt-3 border-t border-slate-100 flex items-center justify-end space-x-2">
                <button
                  type="button"
                  onClick={() => setIsEditing(false)}
                  className="px-4 py-2 bg-slate-50 hover:bg-slate-100 border border-slate-100 rounded-xl transition cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSaving}
                  className="px-5 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-xl shadow-md transition cursor-pointer flex items-center space-x-1"
                >
                  {isSaving && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                  <span>Save Profile</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 5. Custom Confirmation Dialog (Suspend/Activate/Delete) */}
      {confirmAction && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4 animate-fade-in">
          <div className="bg-white rounded-3xl max-w-sm w-full p-6 space-y-6 shadow-2xl border border-slate-100 text-center relative">
            <div className={`mx-auto w-12 h-12 rounded-full flex items-center justify-center border ${
              confirmAction.type === "delete"
                ? "bg-rose-50 text-rose-600 border-rose-100"
                : "bg-amber-50 text-amber-600 border-amber-100"
            }`}>
              <ShieldAlert className="w-6 h-6" />
            </div>

            <div className="space-y-1.5">
              <h4 className="text-sm font-extrabold text-slate-900 uppercase tracking-wide">
                {confirmAction.type === "delete" && "Revoke Membership?"}
                {confirmAction.type === "suspend" && "Suspend Account?"}
                {confirmAction.type === "activate" && "Re-activate Account?"}
              </h4>
              <p className="text-xs text-slate-400 leading-relaxed font-semibold">
                {confirmAction.type === "delete" && (
                  <span>This will permanently delete <strong className="text-slate-800">{confirmAction.user.name}</strong> from the Panchayat Health Network. This operation cannot be undone.</span>
                )}
                {confirmAction.type === "suspend" && (
                  <span>This will suspend <strong className="text-slate-800">{confirmAction.user.name}</strong>. They will temporarily be unable to request or fulfill emergency rides.</span>
                )}
                {confirmAction.type === "activate" && (
                  <span>This will restore active status to <strong className="text-slate-800">{confirmAction.user.name}</strong>, allowing full access to dispatch tools.</span>
                )}
              </p>
            </div>

            <div className="grid grid-cols-2 gap-2 text-xs font-black uppercase">
              <button
                onClick={() => setConfirmAction(null)}
                className="py-2.5 bg-slate-50 border border-slate-100 rounded-xl hover:bg-slate-100 text-slate-600 cursor-pointer transition"
              >
                Cancel
              </button>
              
              <button
                onClick={() => {
                  if (confirmAction.type === "delete") executeDelete(confirmAction.user.id);
                  else if (confirmAction.type === "suspend") executeSuspend(confirmAction.user.id);
                  else if (confirmAction.type === "activate") executeActivate(confirmAction.user.id);
                }}
                disabled={actionUserId !== null}
                className={`py-2.5 text-white rounded-xl shadow-md cursor-pointer transition flex items-center justify-center space-x-1 ${
                  confirmAction.type === "delete" ? "bg-rose-600 hover:bg-rose-700" : "bg-slate-900 hover:bg-slate-850"
                }`}
              >
                {actionUserId !== null && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                <span>Confirm</span>
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
