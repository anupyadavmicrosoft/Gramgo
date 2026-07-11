import React, { useState, useEffect } from "react";
import {
  Ticket,
  Percent,
  Plus,
  Trash2,
  Calendar,
  AlertCircle,
  TrendingUp,
  Award,
  Users,
  Search,
  Filter,
  RefreshCw,
  Check,
  Briefcase,
  Sliders,
  DollarSign,
  X,
  FileSpreadsheet,
  Layers,
  CheckCircle2,
  HelpCircle,
  Eye,
  Edit,
  Play,
  Pause,
  Power
} from "lucide-react";
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend
} from "recharts";

interface Coupon {
  id: string;
  code: string;
  campaignId?: string;
  rulesId?: string;
  discountType: "percentage" | "fixed";
  discountValue: number;
  expiryDate: string;
  usageLimit: number;
  timesUsed: number;
  minimumRideAmount: number;
  maximumDiscount: number;
  status: "active" | "inactive" | "expired";
}

interface Campaign {
  id: string;
  name: string;
  description: string;
  startDate: string;
  endDate: string;
  budget: number;
  spentBudget?: number;
  remainingBudget?: number;
  usageCount?: number;
  status: "active" | "inactive" | "draft";
}

interface Rule {
  id: string;
  allowedEmergencyTypes?: string[];
  allowedVillages?: string[];
  allowedVehicleTypes?: string[];
  userRideCountLimit?: number;
}

interface UsageLog {
  id: string;
  couponId: string;
  couponCode: string;
  userId: string;
  rideId: string;
  discountApplied: number;
  usedAt: string;
}

interface CouponAnalytics {
  totalCoupons: number;
  activeCoupons: number;
  totalRedemptions: number;
  totalDiscountsGiven: number;
  campaignStats: Array<{
    id: string;
    name: string;
    totalBudget: number;
    spentBudget: number;
    remainingBudget: number;
    usageCount: number;
    status: string;
  }>;
  trendData: Array<{
    date: string;
    usagesCount: number;
    discountsValue: number;
  }>;
}

interface CouponManagementProps {
  token: string;
}

export default function CouponManagement({ token }: CouponManagementProps) {
  // Tabs: "coupons" | "campaigns" | "rules" | "history" | "analytics"
  const [activeSubTab, setActiveSubTab] = useState<"coupons" | "campaigns" | "rules" | "history" | "analytics">("coupons");

  // Core lists
  const [coupons, setCoupons] = useState<Coupon[]>([]);
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [rules, setRules] = useState<Rule[]>([]);
  const [usages, setUsages] = useState<UsageLog[]>([]);
  const [analytics, setAnalytics] = useState<CouponAnalytics | null>(null);

  // States
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [toast, setToast] = useState<{ type: "success" | "error"; text: string } | null>(null);

  // Form modals trigger
  const [showCouponModal, setShowCouponModal] = useState<boolean>(false);
  const [showCampaignModal, setShowCampaignModal] = useState<boolean>(false);
  const [showRulesModal, setShowRulesModal] = useState<boolean>(false);

  // Editing states
  const [editingCoupon, setEditingCoupon] = useState<Coupon | null>(null);
  const [editingCampaign, setEditingCampaign] = useState<Campaign | null>(null);

  // Form states
  const [couponForm, setCouponForm] = useState({
    code: "",
    campaignId: "",
    rulesId: "",
    discountType: "fixed" as "fixed" | "percentage",
    discountValue: "",
    expiryDate: "",
    usageLimit: "100",
    minimumRideAmount: "0",
    maximumDiscount: "100",
    status: "active" as "active" | "inactive"
  });

  const [campaignForm, setCampaignForm] = useState({
    name: "",
    description: "",
    startDate: "",
    endDate: "",
    budget: "",
    status: "draft" as "draft" | "active" | "inactive"
  });

  const [rulesForm, setRulesForm] = useState({
    allowedEmergencyTypes: [] as string[],
    allowedVillages: [] as string[],
    allowedVehicleTypes: [] as string[],
    userRideCountLimit: "1"
  });

  // Inputs helper for rules array tagging
  const [emergencyInput, setEmergencyInput] = useState("");
  const [villageInput, setVillageInput] = useState("");
  const [vehicleInput, setVehicleInput] = useState("");

  const showToast = (text: string, type: "success" | "error" = "success") => {
    setToast({ text, type });
    setTimeout(() => setToast(null), 3000);
  };

  const fetchAllData = async () => {
    setIsLoading(true);
    try {
      const headers = { Authorization: `Bearer ${token}` };

      // Fetch coupons
      const cRes = await fetch("/api/coupons", { headers });
      const cData = await cRes.json();
      if (cRes.ok) setCoupons(cData);

      // Fetch campaigns
      const campRes = await fetch("/api/coupons/campaigns", { headers });
      const campData = await campRes.json();
      if (campRes.ok) setCampaigns(campData);

      // Fetch rules
      const rRes = await fetch("/api/coupons/rules", { headers });
      const rData = await rRes.json();
      if (rRes.ok) setRules(rData);

      // Fetch usages (will query all usages)
      const uRes = await fetch("/api/coupons/analytics", { headers });
      const uData = await uRes.json();
      if (uRes.ok) {
        setAnalytics(uData);
      }

      // Fetch raw usages list
      const usageRes = await fetch("/api/coupons", { headers }); // fallback to analytical or raw usages fetch
      const usagesRawRes = await fetch("/api/admin/commission-stats", { headers }); // using existing analytics to extract usages if needed, or we can fetch directly from our backend analytics
      if (uRes.ok) {
        // Usages can be seeded from mock or returned by analytics
      }
    } catch (err) {
      console.error("Failed to load coupon system data:", err);
      showToast("Failed to fetch coupon system configuration.", "error");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchAllData();
  }, [token]);

  // Handle coupon create
  const handleCreateCoupon = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!couponForm.code || !couponForm.discountValue || !couponForm.expiryDate) {
      showToast("Please fill all required fields.", "error");
      return;
    }

    try {
      const res = await fetch("/api/coupons", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({
          ...couponForm,
          discountValue: Number(couponForm.discountValue),
          usageLimit: Number(couponForm.usageLimit),
          minimumRideAmount: Number(couponForm.minimumRideAmount),
          maximumDiscount: Number(couponForm.maximumDiscount)
        })
      });

      const data = await res.json();
      if (res.ok) {
        showToast(`Coupon ${couponForm.code.toUpperCase()} created!`);
        setShowCouponModal(false);
        setCouponForm({
          code: "",
          campaignId: "",
          rulesId: "",
          discountType: "fixed",
          discountValue: "",
          expiryDate: "",
          status: "active"
        });
        fetchAllData();
      } else {
        showToast(data.error || "Failed to create coupon.", "error");
      }
    } catch (err) {
      showToast("Server connection error.", "error");
    }
  };

  // Handle start edit coupon helper
  const handleStartEditCoupon = (coupon: Coupon) => {
    setEditingCoupon(coupon);
    setCouponForm({
      code: coupon.code,
      campaignId: coupon.campaignId || "",
      rulesId: coupon.rulesId || "",
      discountType: coupon.discountType,
      discountValue: String(coupon.discountValue),
      expiryDate: coupon.expiryDate ? coupon.expiryDate.split("T")[0] : "",
      usageLimit: String(coupon.usageLimit),
      minimumRideAmount: String(coupon.minimumRideAmount),
      maximumDiscount: String(coupon.maximumDiscount),
      status: coupon.status as any
    });
    setShowCouponModal(true);
  };

  // Handle coupon update
  const handleUpdateCoupon = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingCoupon) return;
    if (!couponForm.code || !couponForm.discountValue || !couponForm.expiryDate) {
      showToast("Please fill all required fields.", "error");
      return;
    }

    try {
      const res = await fetch(`/api/coupons/${editingCoupon.id}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({
          ...couponForm,
          discountValue: Number(couponForm.discountValue),
          usageLimit: Number(couponForm.usageLimit),
          minimumRideAmount: Number(couponForm.minimumRideAmount),
          maximumDiscount: Number(couponForm.maximumDiscount)
        })
      });

      const data = await res.json();
      if (res.ok) {
        showToast(`Coupon ${couponForm.code.toUpperCase()} updated!`);
        setShowCouponModal(false);
        setEditingCoupon(null);
        setCouponForm({
          code: "",
          campaignId: "",
          rulesId: "",
          discountType: "fixed",
          discountValue: "",
          expiryDate: "",
          usageLimit: "100",
          minimumRideAmount: "0",
          maximumDiscount: "100",
          status: "active"
        });
        fetchAllData();
      } else {
        showToast(data.error || "Failed to update coupon.", "error");
      }
    } catch (err) {
      showToast("Server connection error.", "error");
    }
  };

  // Handle Pause / Activate coupon
  const handleToggleCouponStatus = async (coupon: Coupon) => {
    const newStatus = coupon.status === "active" ? "inactive" : "active";
    try {
      const res = await fetch(`/api/coupons/${coupon.id}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({
          status: newStatus
        })
      });

      if (res.ok) {
        showToast(`Coupon ${coupon.code} status updated to ${newStatus}!`);
        fetchAllData();
      } else {
        const data = await res.json();
        showToast(data.error || "Failed to update status.", "error");
      }
    } catch (err) {
      showToast("Server connection error.", "error");
    }
  };

  // Handle start edit campaign helper
  const handleStartEditCampaign = (camp: Campaign) => {
    setEditingCampaign(camp);
    setCampaignForm({
      name: camp.name,
      description: camp.description,
      startDate: camp.startDate ? camp.startDate.split("T")[0] : "",
      endDate: camp.endDate ? camp.endDate.split("T")[0] : "",
      budget: String(camp.budget),
      status: camp.status
    });
    setShowCampaignModal(true);
  };

  // Handle campaign update
  const handleUpdateCampaign = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingCampaign) return;
    if (!campaignForm.name || !campaignForm.description || !campaignForm.startDate || !campaignForm.endDate || !campaignForm.budget) {
      showToast("Please fill all required fields.", "error");
      return;
    }

    try {
      const res = await fetch(`/api/coupons/campaigns/${editingCampaign.id}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({
          ...campaignForm,
          budget: Number(campaignForm.budget)
        })
      });

      const data = await res.json();
      if (res.ok) {
        showToast(`Campaign '${campaignForm.name}' updated!`);
        setShowCampaignModal(false);
        setEditingCampaign(null);
        setCampaignForm({
          name: "",
          description: "",
          startDate: "",
          endDate: "",
          budget: "",
          status: "draft"
        });
        fetchAllData();
      } else {
        showToast(data.error || "Failed to update campaign.", "error");
      }
    } catch (err) {
      showToast("Server connection error.", "error");
    }
  };

  // Handle Pause / Activate campaign
  const handleToggleCampaignStatus = async (camp: Campaign) => {
    const newStatus = camp.status === "active" ? "inactive" : "active";
    try {
      const res = await fetch(`/api/coupons/campaigns/${camp.id}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({
          status: newStatus
        })
      });

      if (res.ok) {
        showToast(`Campaign status updated to ${newStatus}!`);
        fetchAllData();
      } else {
        const data = await res.json();
        showToast(data.error || "Failed to update campaign status.", "error");
      }
    } catch (err) {
      showToast("Server connection error.", "error");
    }
  };

  // Handle campaign create
  const handleCreateCampaign = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!campaignForm.name || !campaignForm.description || !campaignForm.startDate || !campaignForm.endDate || !campaignForm.budget) {
      showToast("Please fill all required fields.", "error");
      return;
    }

    try {
      const res = await fetch("/api/coupons/campaigns", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({
          ...campaignForm,
          budget: Number(campaignForm.budget)
        })
      });

      const data = await res.json();
      if (res.ok) {
        showToast(`Campaign '${campaignForm.name}' created!`);
        setShowCampaignModal(false);
        setCampaignForm({
          name: "",
          description: "",
          startDate: "",
          endDate: "",
          budget: "",
          status: "draft"
        });
        fetchAllData();
      } else {
        showToast(data.error || "Failed to create campaign.", "error");
      }
    } catch (err) {
      showToast("Server connection error.", "error");
    }
  };

  // Handle rules create
  const handleCreateRules = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await fetch("/api/coupons/rules", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({
          allowedEmergencyTypes: rulesForm.allowedEmergencyTypes,
          allowedVillages: rulesForm.allowedVillages,
          allowedVehicleTypes: rulesForm.allowedVehicleTypes,
          userRideCountLimit: Number(rulesForm.userRideCountLimit)
        })
      });

      const data = await res.json();
      if (res.ok) {
        showToast("Coupon rule configuration created successfully!");
        setShowRulesModal(false);
        setRulesForm({
          allowedEmergencyTypes: [],
          allowedVillages: [],
          allowedVehicleTypes: [],
          userRideCountLimit: "1"
        });
        fetchAllData();
      } else {
        showToast(data.error || "Failed to create rules.", "error");
      }
    } catch (err) {
      showToast("Server connection error.", "error");
    }
  };

  // Handle delete ops
  const handleDeleteCoupon = async (id: string) => {
    if (!window.confirm("Are you sure you want to delete this coupon? This is irreversible.")) return;
    try {
      const res = await fetch(`/api/coupons/${id}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        showToast("Coupon deleted successfully.");
        fetchAllData();
      } else {
        showToast("Failed to delete coupon.", "error");
      }
    } catch (err) {
      showToast("Server communication error.", "error");
    }
  };

  const handleDeleteCampaign = async (id: string) => {
    if (!window.confirm("Are you sure you want to delete this campaign? Associated coupons will remain but campaigns metrics will be decoupled.")) return;
    try {
      const res = await fetch(`/api/coupons/campaigns/${id}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        showToast("Campaign deleted successfully.");
        fetchAllData();
      } else {
        showToast("Failed to delete campaign.", "error");
      }
    } catch (err) {
      showToast("Server communication error.", "error");
    }
  };

  const handleDeleteRules = async (id: string) => {
    if (!window.confirm("Are you sure you want to delete this rule configuration?")) return;
    try {
      const res = await fetch(`/api/coupons/rules/${id}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        showToast("Rules configuration deleted.");
        fetchAllData();
      } else {
        showToast("Failed to delete rule.", "error");
      }
    } catch (err) {
      showToast("Server communication error.", "error");
    }
  };

  const addTag = (type: "emergency" | "village" | "vehicle") => {
    if (type === "emergency" && emergencyInput.trim()) {
      if (!rulesForm.allowedEmergencyTypes.includes(emergencyInput.trim())) {
        setRulesForm({
          ...rulesForm,
          allowedEmergencyTypes: [...rulesForm.allowedEmergencyTypes, emergencyInput.trim()]
        });
      }
      setEmergencyInput("");
    } else if (type === "village" && villageInput.trim()) {
      if (!rulesForm.allowedVillages.includes(villageInput.trim())) {
        setRulesForm({
          ...rulesForm,
          allowedVillages: [...rulesForm.allowedVillages, villageInput.trim()]
        });
      }
      setVillageInput("");
    } else if (type === "vehicle" && vehicleInput.trim()) {
      if (!rulesForm.allowedVehicleTypes.includes(vehicleInput.trim())) {
        setRulesForm({
          ...rulesForm,
          allowedVehicleTypes: [...rulesForm.allowedVehicleTypes, vehicleInput.trim()]
        });
      }
      setVehicleInput("");
    }
  };

  const removeTag = (type: "emergency" | "village" | "vehicle", val: string) => {
    if (type === "emergency") {
      setRulesForm({
        ...rulesForm,
        allowedEmergencyTypes: rulesForm.allowedEmergencyTypes.filter(t => t !== val)
      });
    } else if (type === "village") {
      setRulesForm({
        ...rulesForm,
        allowedVillages: rulesForm.allowedVillages.filter(v => v !== val)
      });
    } else if (type === "vehicle") {
      setRulesForm({
        ...rulesForm,
        allowedVehicleTypes: rulesForm.allowedVehicleTypes.filter(vt => vt !== val)
      });
    }
  };

  // Filtered coupons
  const filteredCoupons = coupons.filter(c => {
    const matchesSearch = c.code.toLowerCase().includes(searchQuery.toLowerCase()) || 
                          (c.campaignId && c.campaignId.toLowerCase().includes(searchQuery.toLowerCase()));
    const matchesStatus = statusFilter === "all" || c.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  return (
    <div className="space-y-8">
      {/* Toast */}
      {toast && (
        <div className={`fixed bottom-4 right-4 z-50 flex items-center gap-3 px-5 py-4 rounded-2xl shadow-xl border animate-fade-in ${
          toast.type === "success" 
            ? "bg-slate-900 text-emerald-400 border-slate-800" 
            : "bg-rose-900 text-rose-200 border-rose-800"
        }`}>
          <CheckCircle2 className="w-5 h-5" />
          <span className="text-xs font-extrabold">{toast.text}</span>
        </div>
      )}

      {/* Header Panel */}
      <div className="bg-gradient-to-r from-slate-900 via-slate-800 to-slate-950 text-white rounded-3xl p-8 border border-slate-800 shadow-2xl relative overflow-hidden">
        <div className="absolute top-0 right-0 p-8 opacity-5">
          <Ticket className="w-64 h-64 rotate-12" />
        </div>
        <div className="relative z-10 space-y-6">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="space-y-1.5">
              <span className="text-xs font-black uppercase tracking-widest text-emerald-400 bg-emerald-500/10 px-3.5 py-1 rounded-full border border-emerald-500/20">
                Panchayat Voucher Engine
              </span>
              <h2 className="text-2xl md:text-3xl font-black tracking-tight">Coupon & Subsidy Management</h2>
              <p className="text-slate-400 text-xs font-semibold max-w-xl">
                Configure smart discount vouchers, maternal healthcare campaigns, monsoon travel exemptions, and audit real-time redemption logs.
              </p>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={fetchAllData}
                disabled={isLoading}
                className="p-3 bg-slate-800 hover:bg-slate-700 rounded-2xl text-slate-300 hover:text-white border border-slate-700/80 transition cursor-pointer"
              >
                <RefreshCw className={`w-4 h-4 ${isLoading ? "animate-spin" : ""}`} />
              </button>
              {activeSubTab === "coupons" && (
                <button
                  onClick={() => setShowCouponModal(true)}
                  className="flex items-center gap-2 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black px-5 py-3 rounded-2xl text-xs transition shadow-lg cursor-pointer shadow-emerald-500/10"
                >
                  <Plus className="w-4 h-4" />
                  <span>Create Coupon</span>
                </button>
              )}
              {activeSubTab === "campaigns" && (
                <button
                  onClick={() => setShowCampaignModal(true)}
                  className="flex items-center gap-2 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black px-5 py-3 rounded-2xl text-xs transition shadow-lg cursor-pointer shadow-emerald-500/10"
                >
                  <Plus className="w-4 h-4" />
                  <span>Create Campaign</span>
                </button>
              )}
              {activeSubTab === "rules" && (
                <button
                  onClick={() => setShowRulesModal(true)}
                  className="flex items-center gap-2 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black px-5 py-3 rounded-2xl text-xs transition shadow-lg cursor-pointer shadow-emerald-500/10"
                >
                  <Plus className="w-4 h-4" />
                  <span>Configure Rules</span>
                </button>
              )}
            </div>
          </div>

          {/* Quick Metrics */}
          {analytics && (
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 pt-4 border-t border-slate-800/80">
              <div className="bg-slate-900/60 p-4 rounded-2xl border border-slate-800">
                <span className="text-[10px] text-slate-500 font-bold block uppercase tracking-wider">Total Active Vouchers</span>
                <span className="text-xl font-black text-white mt-1.5 block">{analytics.activeCoupons} / {analytics.totalCoupons}</span>
              </div>
              <div className="bg-slate-900/60 p-4 rounded-2xl border border-slate-800">
                <span className="text-[10px] text-slate-500 font-bold block uppercase tracking-wider">Total Redemptions</span>
                <span className="text-xl font-black text-emerald-400 mt-1.5 block">{analytics.totalRedemptions} times</span>
              </div>
              <div className="bg-slate-900/60 p-4 rounded-2xl border border-slate-800">
                <span className="text-[10px] text-slate-500 font-bold block uppercase tracking-wider">Subsidy Budget Spent</span>
                <span className="text-xl font-black text-white mt-1.5 block">₹{analytics.totalDiscountsGiven}</span>
              </div>
              <div className="bg-slate-900/60 p-4 rounded-2xl border border-slate-800">
                <span className="text-[10px] text-slate-500 font-bold block uppercase tracking-wider">Panchayat Safe Margin</span>
                <span className="text-xl font-black text-amber-400 mt-1.5 block">100% Verified</span>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Navigation Subtabs */}
      <div className="flex flex-wrap items-center gap-1.5 border-b border-slate-100 pb-4">
        {[
          { id: "coupons", label: "Subsidy Coupons", icon: Ticket },
          { id: "campaigns", label: "Health Campaigns", icon: Briefcase },
          { id: "rules", label: "Exemption Rules", icon: Sliders },
          { id: "analytics", label: "Campaign Analytics", icon: TrendingUp }
        ].map(sub => {
          const Icon = sub.icon;
          const isActive = activeSubTab === sub.id;
          return (
            <button
              key={sub.id}
              onClick={() => setActiveSubTab(sub.id as any)}
              className={`flex items-center gap-2 px-5 py-3 rounded-2xl text-xs font-extrabold transition-all cursor-pointer ${
                isActive
                  ? "bg-slate-900 text-white shadow-lg shadow-slate-100"
                  : "bg-white text-slate-500 hover:text-slate-950 border border-slate-100"
              }`}
            >
              <Icon className="w-3.5 h-3.5" />
              <span>{sub.label}</span>
            </button>
          );
        })}
      </div>

      {/* Main Panel Content */}
      {isLoading ? (
        <div className="flex flex-col items-center justify-center py-20 bg-white rounded-3xl border border-slate-100 space-y-3">
          <RefreshCw className="w-8 h-8 text-emerald-500 animate-spin" />
          <span className="text-xs font-black text-slate-400 uppercase tracking-widest">Loading Coupon Database...</span>
        </div>
      ) : (
        <div className="animate-fade-in">
          {/* TAB 1: COUPONS */}
          {activeSubTab === "coupons" && (
            <div className="space-y-6">
              {/* Search & Filter bar */}
              <div className="flex flex-col md:flex-row gap-4 items-center justify-between bg-white p-4 rounded-3xl border border-slate-100">
                <div className="relative w-full md:w-96">
                  <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                  <input
                    type="text"
                    placeholder="Search by code or campaign..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full pl-11 pr-4 py-3 bg-slate-50 hover:bg-slate-100/50 focus:bg-white rounded-2xl border border-slate-100 text-xs font-bold text-slate-800 placeholder-slate-400 focus:outline-none focus:border-emerald-500 transition"
                  />
                </div>
                <div className="flex items-center gap-3 w-full md:w-auto">
                  <Filter className="w-4 h-4 text-slate-400 hidden md:block" />
                  <select
                    value={statusFilter}
                    onChange={(e) => setStatusFilter(e.target.value)}
                    className="w-full md:w-48 px-4 py-3 bg-slate-50 hover:bg-slate-100/50 focus:bg-white rounded-2xl border border-slate-100 text-xs font-bold text-slate-700 focus:outline-none focus:border-emerald-500 transition cursor-pointer"
                  >
                    <option value="all">All Statuses</option>
                    <option value="active">Active Vouchers</option>
                    <option value="inactive">Inactive Vouchers</option>
                    <option value="expired">Expired Vouchers</option>
                  </select>
                </div>
              </div>

              {/* Coupon Grid */}
              {filteredCoupons.length === 0 ? (
                <div className="text-center py-16 bg-white rounded-3xl border border-slate-100 space-y-2">
                  <Ticket className="w-12 h-12 text-slate-300 mx-auto" />
                  <p className="text-xs font-black text-slate-400 uppercase tracking-wider">No matching coupons found</p>
                  <p className="text-xs text-slate-500">Create a new voucher code to get started.</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
                  {filteredCoupons.map((coupon) => {
                    const campaign = campaigns.find(c => c.id === coupon.campaignId);
                    const rule = rules.find(r => r.id === coupon.rulesId);
                    const isExpired = coupon.status === "expired" || new Date(coupon.expiryDate).getTime() < Date.now();

                    return (
                      <div
                        key={coupon.id}
                        className="bg-white rounded-3xl border border-slate-100 shadow-sm hover:shadow-lg transition-all p-6 relative flex flex-col justify-between space-y-6 group"
                      >
                        {/* Top banner coupon style */}
                        <div className="flex items-start justify-between">
                          <div className="space-y-1">
                            <div className="flex items-center gap-2">
                              <span className="font-mono text-base font-black tracking-wider text-slate-900 uppercase bg-slate-100 px-3 py-1 rounded-xl">
                                {coupon.code}
                              </span>
                              <span className={`px-2.5 py-0.5 rounded-full text-[9px] font-black uppercase border ${
                                isExpired
                                  ? "bg-rose-50 text-rose-700 border-rose-200"
                                  : coupon.status === "inactive"
                                  ? "bg-amber-50 text-amber-700 border-amber-200"
                                  : "bg-emerald-50 text-emerald-700 border-emerald-200"
                              }`}>
                                {isExpired ? "Expired" : coupon.status}
                              </span>
                            </div>
                            <span className="text-[10px] text-slate-400 font-extrabold block uppercase tracking-wider mt-2">
                              {campaign ? campaign.name : "Individual Exemption Code"}
                            </span>
                          </div>
                          <div className="flex items-center gap-1">
                            {!isExpired && (
                              <button
                                onClick={() => handleToggleCouponStatus(coupon)}
                                title={coupon.status === "active" ? "Pause Coupon" : "Activate Coupon"}
                                className={`p-2 rounded-xl transition cursor-pointer ${
                                  coupon.status === "active"
                                    ? "text-amber-600 hover:bg-amber-50"
                                    : "text-emerald-600 hover:bg-emerald-50"
                                }`}
                              >
                                {coupon.status === "active" ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
                              </button>
                            )}
                            <button
                              onClick={() => handleStartEditCoupon(coupon)}
                              title="Edit Coupon"
                              className="p-2 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-xl transition cursor-pointer"
                            >
                              <Edit className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => handleDeleteCoupon(coupon.id)}
                              title="Delete Coupon"
                              className="p-2 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-xl transition cursor-pointer"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </div>

                        {/* Middle discount detail */}
                        <div className="bg-slate-50/50 p-4 rounded-2xl border border-slate-100/50 space-y-3.5">
                          <div className="flex justify-between items-center">
                            <span className="text-[10px] text-slate-500 font-bold uppercase">Discount Amount</span>
                            <span className="text-sm font-black text-slate-800">
                              {coupon.discountType === "fixed" ? `₹${coupon.discountValue} OFF` : `${coupon.discountValue}% OFF`}
                            </span>
                          </div>
                          <div className="flex justify-between items-center">
                            <span className="text-[10px] text-slate-500 font-bold uppercase">Minimum Fare Required</span>
                            <span className="text-xs font-black text-slate-700">₹{coupon.minimumRideAmount}</span>
                          </div>
                          <div className="flex justify-between items-center">
                            <span className="text-[10px] text-slate-500 font-bold uppercase">Max Cap / Ceiling</span>
                            <span className="text-xs font-black text-slate-700">₹{coupon.maximumDiscount}</span>
                          </div>
                        </div>

                        {/* Expiry and usages info */}
                        <div className="space-y-4">
                          <div className="flex items-center justify-between text-[11px] text-slate-500 font-semibold">
                            <div className="flex items-center gap-1.5">
                              <Calendar className="w-3.5 h-3.5 text-slate-400" />
                              <span>Expires: {new Date(coupon.expiryDate).toLocaleDateString()}</span>
                            </div>
                            <span>Used {coupon.timesUsed} / {coupon.usageLimit} times</span>
                          </div>

                          {/* Progress bar of usage */}
                          <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden">
                            <div
                              className="h-full bg-slate-800 rounded-full transition-all"
                              style={{ width: `${Math.min(100, (coupon.timesUsed / coupon.usageLimit) * 100)}%` }}
                            />
                          </div>

                          {/* Render rule tags */}
                          {rule && (
                            <div className="flex flex-wrap gap-1 pt-1">
                              {rule.allowedEmergencyTypes && rule.allowedEmergencyTypes.map(t => (
                                <span key={t} className="text-[9px] font-black uppercase text-slate-500 bg-slate-100 px-1.5 py-0.5 rounded">
                                  {t}
                                </span>
                              ))}
                              {rule.allowedVillages && rule.allowedVillages.map(v => (
                                <span key={v} className="text-[9px] font-black uppercase text-slate-500 bg-slate-100 px-1.5 py-0.5 rounded">
                                  📍 {v}
                                </span>
                              ))}
                              {rule.allowedVehicleTypes && rule.allowedVehicleTypes.map(vt => (
                                <span key={vt} className="text-[9px] font-black uppercase text-slate-500 bg-slate-100 px-1.5 py-0.5 rounded">
                                  🛺 {vt}
                                </span>
                              ))}
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {/* TAB 2: CAMPAIGNS */}
          {activeSubTab === "campaigns" && (
            <div className="space-y-6">
              {campaigns.length === 0 ? (
                <div className="text-center py-16 bg-white rounded-3xl border border-slate-100 space-y-2">
                  <Briefcase className="w-12 h-12 text-slate-300 mx-auto" />
                  <p className="text-xs font-black text-slate-400 uppercase tracking-wider">No active campaigns</p>
                  <p className="text-xs text-slate-500">Initiate a health campaign to group subsidies and vouchers.</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {campaigns.map((camp) => {
                    const spent = camp.spentBudget || 0;
                    const total = camp.budget || 1;
                    const percentUsed = Math.min(100, Math.round((spent / total) * 100));

                    return (
                      <div
                        key={camp.id}
                        className="bg-white rounded-3xl border border-slate-100 p-6 space-y-6 relative flex flex-col justify-between"
                      >
                        <div className="space-y-4">
                          <div className="flex items-start justify-between">
                            <div className="space-y-1">
                              <h4 className="text-base font-black text-slate-800">{camp.name}</h4>
                              <p className="text-[11px] text-slate-400 font-semibold">{camp.description}</p>
                            </div>
                            <div className="flex items-center gap-1">
                              <span className={`px-2.5 py-0.5 rounded-full text-[9px] font-black uppercase mr-1 ${
                                camp.status === "active"
                                  ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                                  : "bg-slate-50 text-slate-500 border-slate-200"
                              }`}>
                                {camp.status}
                              </span>
                              <button
                                onClick={() => handleToggleCampaignStatus(camp)}
                                title={camp.status === "active" ? "Pause Campaign" : "Activate Campaign"}
                                className={`p-2 rounded-xl transition cursor-pointer ${
                                  camp.status === "active"
                                    ? "text-amber-600 hover:bg-amber-50"
                                    : "text-emerald-600 hover:bg-emerald-50"
                                }`}
                              >
                                {camp.status === "active" ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5" />}
                              </button>
                              <button
                                onClick={() => handleStartEditCampaign(camp)}
                                title="Edit Campaign"
                                className="p-2 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-xl transition cursor-pointer"
                              >
                                <Edit className="w-3.5 h-3.5" />
                              </button>
                              <button
                                onClick={() => handleDeleteCampaign(camp.id)}
                                title="Delete Campaign"
                                className="p-2 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-xl transition cursor-pointer"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </div>

                          {/* Budget status */}
                          <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100 space-y-4">
                            <div className="flex items-center justify-between">
                              <span className="text-[10px] font-bold text-slate-500 uppercase">Campaign Budget Utilisation</span>
                              <span className="text-xs font-black text-slate-800">{percentUsed}% spent</span>
                            </div>
                            <div className="w-full h-3 bg-slate-200 rounded-full overflow-hidden">
                              <div
                                className="h-full bg-emerald-500 rounded-full transition-all"
                                style={{ width: `${percentUsed}%` }}
                              />
                            </div>
                            <div className="grid grid-cols-3 gap-2 text-center pt-1">
                              <div>
                                <span className="text-[9px] font-bold text-slate-400 block uppercase">Total Budget</span>
                                <span className="text-xs font-black text-slate-700">₹{camp.budget}</span>
                              </div>
                              <div>
                                <span className="text-[9px] font-bold text-slate-400 block uppercase">Spent</span>
                                <span className="text-xs font-black text-emerald-600">₹{spent}</span>
                              </div>
                              <div>
                                <span className="text-[9px] font-bold text-slate-400 block uppercase">Remaining</span>
                                <span className="text-xs font-black text-slate-700">₹{camp.remainingBudget ?? (camp.budget - spent)}</span>
                              </div>
                            </div>
                          </div>
                        </div>

                        {/* Dates info */}
                        <div className="flex items-center justify-between text-[11px] text-slate-500 border-t border-slate-100 pt-4 font-semibold">
                          <span>Starts: {new Date(camp.startDate).toLocaleDateString()}</span>
                          <span>Ends: {new Date(camp.endDate).toLocaleDateString()}</span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {/* TAB 3: RULES */}
          {activeSubTab === "rules" && (
            <div className="space-y-6">
              {rules.length === 0 ? (
                <div className="text-center py-16 bg-white rounded-3xl border border-slate-100 space-y-2">
                  <Sliders className="w-12 h-12 text-slate-300 mx-auto" />
                  <p className="text-xs font-black text-slate-400 uppercase tracking-wider">No custom validation rules</p>
                  <p className="text-xs text-slate-500">Configure safety check rule structures to assign to your voucher codes.</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {rules.map((rule) => {
                    return (
                      <div
                        key={rule.id}
                        className="bg-white rounded-3xl border border-slate-100 p-6 space-y-6 relative flex flex-col justify-between shadow-sm"
                      >
                        <div className="space-y-4">
                          <div className="flex items-center justify-between">
                            <span className="font-mono text-xs font-black text-slate-400 block uppercase tracking-wider">
                              ID: {rule.id}
                            </span>
                            <button
                              onClick={() => handleDeleteRules(rule.id)}
                              className="p-2 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-xl transition cursor-pointer"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>

                          <div className="space-y-3">
                            <div className="text-xs">
                              <span className="text-[10px] text-slate-400 font-extrabold uppercase tracking-wider block">Allowed Emergencies</span>
                              <div className="flex flex-wrap gap-1 mt-1">
                                {rule.allowedEmergencyTypes && rule.allowedEmergencyTypes.length > 0 ? (
                                  rule.allowedEmergencyTypes.map(t => (
                                    <span key={t} className="px-2 py-0.5 bg-slate-100 rounded text-[10px] text-slate-700 font-black">{t}</span>
                                  ))
                                ) : (
                                  <span className="text-slate-400 text-[11px] font-medium">All Emergency Types Allowed</span>
                                )}
                              </div>
                            </div>

                            <div className="text-xs">
                              <span className="text-[10px] text-slate-400 font-extrabold uppercase tracking-wider block">Allowed Villages</span>
                              <div className="flex flex-wrap gap-1 mt-1">
                                {rule.allowedVillages && rule.allowedVillages.length > 0 ? (
                                  rule.allowedVillages.map(v => (
                                    <span key={v} className="px-2 py-0.5 bg-slate-100 rounded text-[10px] text-slate-700 font-black">📍 {v}</span>
                                  ))
                                ) : (
                                  <span className="text-slate-400 text-[11px] font-medium">All Villages Covered</span>
                                )}
                              </div>
                            </div>

                            <div className="text-xs">
                              <span className="text-[10px] text-slate-400 font-extrabold uppercase tracking-wider block">Allowed Vehicles</span>
                              <div className="flex flex-wrap gap-1 mt-1">
                                {rule.allowedVehicleTypes && rule.allowedVehicleTypes.length > 0 ? (
                                  rule.allowedVehicleTypes.map(vt => (
                                    <span key={vt} className="px-2 py-0.5 bg-slate-100 rounded text-[10px] text-slate-700 font-black">🛺 {vt}</span>
                                  ))
                                ) : (
                                  <span className="text-slate-400 text-[11px] font-medium">All Transport Types Allowed</span>
                                )}
                              </div>
                            </div>
                          </div>
                        </div>

                        <div className="border-t border-slate-100 pt-4 flex items-center justify-between text-xs font-bold text-slate-500">
                          <span>Usage count limit per user:</span>
                          <span className="text-slate-900 font-black bg-slate-100 px-2.5 py-0.5 rounded-full">{rule.userRideCountLimit || 1} time(s)</span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {/* TAB 4: ANALYTICS & TRENDS */}
          {activeSubTab === "analytics" && analytics && (
            <div className="space-y-6">
              {/* Chart section */}
              <div className="bg-white p-6 rounded-3xl border border-slate-100 space-y-4">
                <div className="space-y-1">
                  <h4 className="text-sm font-black text-slate-800 uppercase tracking-wider">Weekly Redemption Trend</h4>
                  <p className="text-[11px] text-slate-500 font-semibold">Track daily voucher uses and overall cost savings given to village passengers.</p>
                </div>
                <div className="h-64">
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={analytics.trendData}>
                      <defs>
                        <linearGradient id="colorUsages" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#10b981" stopOpacity={0.2} />
                          <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                      <XAxis dataKey="date" stroke="#94a3b8" fontSize={10} fontWeight={700} axisLine={false} tickLine={false} />
                      <YAxis stroke="#94a3b8" fontSize={10} fontWeight={700} axisLine={false} tickLine={false} />
                      <Tooltip />
                      <Area type="monotone" dataKey="usagesCount" stroke="#10b981" strokeWidth={2.5} fillOpacity={1} fill="url(#colorUsages)" name="Vouchers Redeemed" />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              </div>

              {/* Campaign Budgets */}
              <div className="bg-white p-6 rounded-3xl border border-slate-100 space-y-4">
                <h4 className="text-sm font-black text-slate-800 uppercase tracking-wider">Campaign Subsidy Ledger</h4>
                <div className="overflow-x-auto">
                  <table className="w-full text-xs text-left">
                    <thead>
                      <tr className="border-b border-slate-100 text-slate-400 font-extrabold uppercase">
                        <th className="py-3">Campaign Name</th>
                        <th className="py-3 text-center">Status</th>
                        <th className="py-3 text-right">Total Budget</th>
                        <th className="py-3 text-right">Spent</th>
                        <th className="py-3 text-right">Remaining</th>
                        <th className="py-3 text-right">Redemptions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {analytics.campaignStats && analytics.campaignStats.map(camp => (
                        <tr key={camp.id} className="border-b border-slate-100/50 text-slate-700 hover:bg-slate-50 transition">
                          <td className="py-4 font-bold">{camp.name}</td>
                          <td className="py-4 text-center">
                            <span className="px-2 py-0.5 rounded-full text-[9px] font-black uppercase bg-emerald-50 text-emerald-700 border border-emerald-100">
                              {camp.status}
                            </span>
                          </td>
                          <td className="py-4 text-right font-semibold">₹{camp.totalBudget}</td>
                          <td className="py-4 text-right text-emerald-600 font-bold">₹{camp.spentBudget}</td>
                          <td className="py-4 text-right font-semibold">₹{camp.remainingBudget}</td>
                          <td className="py-4 text-right font-black">{camp.usageCount}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* MODAL 1: CREATE COUPON */}
      {showCouponModal && (
        <div className="fixed inset-0 bg-slate-950/40 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-3xl max-w-lg w-full p-8 border border-slate-100 shadow-2xl relative animate-scale-in">
            <button
              onClick={() => {
                setShowCouponModal(false);
                setEditingCoupon(null);
                setCouponForm({
                  code: "",
                  campaignId: "",
                  rulesId: "",
                  discountType: "fixed",
                  discountValue: "",
                  expiryDate: "",
                  usageLimit: "100",
                  minimumRideAmount: "0",
                  maximumDiscount: "100",
                  status: "active"
                });
              }}
              className="absolute top-6 right-6 p-2 text-slate-400 hover:text-slate-900 bg-slate-50 hover:bg-slate-100 rounded-xl transition cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>

            <div className="flex items-center gap-2 mb-6">
              <span className="p-1.5 bg-emerald-100 text-emerald-600 rounded-lg">
                <Ticket className="w-5 h-5 text-emerald-600" />
              </span>
              <h3 className="text-lg font-black text-slate-900">
                {editingCoupon ? "Edit Coupon Voucher" : "Create New Coupon Voucher"}
              </h3>
            </div>

            <form onSubmit={editingCoupon ? handleUpdateCoupon : handleCreateCoupon} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-[10px] text-slate-500 font-bold uppercase tracking-wider">Coupon Code *</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. MONSOON30"
                    value={couponForm.code}
                    onChange={(e) => setCouponForm({ ...couponForm, code: e.target.value })}
                    className="w-full px-4 py-3 bg-slate-50 rounded-xl border border-slate-100 text-xs font-bold text-slate-800 focus:outline-none focus:border-emerald-500 transition"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-[10px] text-slate-500 font-bold uppercase tracking-wider">Discount Type *</label>
                  <select
                    value={couponForm.discountType}
                    onChange={(e) => setCouponForm({ ...couponForm, discountType: e.target.value as any })}
                    className="w-full px-4 py-3 bg-slate-50 rounded-xl border border-slate-100 text-xs font-bold text-slate-800 focus:outline-none focus:border-emerald-500 transition cursor-pointer"
                  >
                    <option value="fixed">Fixed Flat Rate (₹)</option>
                    <option value="percentage">Percentage Off (%)</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-[10px] text-slate-500 font-bold uppercase tracking-wider">Discount Value *</label>
                  <input
                    type="number"
                    required
                    placeholder="e.g. 50"
                    value={couponForm.discountValue}
                    onChange={(e) => setCouponForm({ ...couponForm, discountValue: e.target.value })}
                    className="w-full px-4 py-3 bg-slate-50 rounded-xl border border-slate-100 text-xs font-bold text-slate-800 focus:outline-none focus:border-emerald-500 transition"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-[10px] text-slate-500 font-bold uppercase tracking-wider">Expiry Date *</label>
                  <input
                    type="date"
                    required
                    value={couponForm.expiryDate}
                    onChange={(e) => setCouponForm({ ...couponForm, expiryDate: e.target.value })}
                    className="w-full px-4 py-3 bg-slate-50 rounded-xl border border-slate-100 text-xs font-bold text-slate-800 focus:outline-none focus:border-emerald-500 transition cursor-pointer"
                  />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-4">
                <div className="space-y-1.5">
                  <label className="text-[10px] text-slate-500 font-bold uppercase tracking-wider">Usage Limit *</label>
                  <input
                    type="number"
                    required
                    value={couponForm.usageLimit}
                    onChange={(e) => setCouponForm({ ...couponForm, usageLimit: e.target.value })}
                    className="w-full px-4 py-3 bg-slate-50 rounded-xl border border-slate-100 text-xs font-bold text-slate-800 focus:outline-none focus:border-emerald-500 transition"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-[10px] text-slate-500 font-bold uppercase tracking-wider">Min Booking Amt *</label>
                  <input
                    type="number"
                    required
                    value={couponForm.minimumRideAmount}
                    onChange={(e) => setCouponForm({ ...couponForm, minimumRideAmount: e.target.value })}
                    className="w-full px-4 py-3 bg-slate-50 rounded-xl border border-slate-100 text-xs font-bold text-slate-800 focus:outline-none focus:border-emerald-500 transition"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-[10px] text-slate-500 font-bold uppercase tracking-wider">Max Cap (Ceiling) *</label>
                  <input
                    type="number"
                    required
                    value={couponForm.maximumDiscount}
                    onChange={(e) => setCouponForm({ ...couponForm, maximumDiscount: e.target.value })}
                    className="w-full px-4 py-3 bg-slate-50 rounded-xl border border-slate-100 text-xs font-bold text-slate-800 focus:outline-none focus:border-emerald-500 transition"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-[10px] text-slate-500 font-bold uppercase tracking-wider">Link Campaign (Optional)</label>
                  <select
                    value={couponForm.campaignId}
                    onChange={(e) => setCouponForm({ ...couponForm, campaignId: e.target.value })}
                    className="w-full px-4 py-3 bg-slate-50 rounded-xl border border-slate-100 text-xs font-bold text-slate-800 focus:outline-none focus:border-emerald-500 transition cursor-pointer"
                  >
                    <option value="">No Campaign</option>
                    {campaigns.map(c => (
                      <option key={c.id} value={c.id}>{c.name}</option>
                    ))}
                  </select>
                </div>
                <div className="space-y-1.5">
                  <label className="text-[10px] text-slate-500 font-bold uppercase tracking-wider">Link Rules Configuration (Optional)</label>
                  <select
                    value={couponForm.rulesId}
                    onChange={(e) => setCouponForm({ ...couponForm, rulesId: e.target.value })}
                    className="w-full px-4 py-3 bg-slate-50 rounded-xl border border-slate-100 text-xs font-bold text-slate-800 focus:outline-none focus:border-emerald-500 transition cursor-pointer"
                  >
                    <option value="">No Custom Exemption Rules</option>
                    {rules.map(r => (
                      <option key={r.id} value={r.id}>Config ID: {r.id}</option>
                    ))}
                  </select>
                </div>
              </div>

              <button
                type="submit"
                className="w-full bg-slate-900 hover:bg-slate-800 text-white font-black py-4 rounded-2xl text-xs transition mt-6 cursor-pointer"
              >
                {editingCoupon ? "Save Changes" : "Create Coupon Code"}
              </button>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 2: CREATE CAMPAIGN */}
      {showCampaignModal && (
        <div className="fixed inset-0 bg-slate-950/40 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-3xl max-w-lg w-full p-8 border border-slate-100 shadow-2xl relative animate-scale-in">
            <button
              onClick={() => {
                setShowCampaignModal(false);
                setEditingCampaign(null);
                setCampaignForm({
                  name: "",
                  description: "",
                  startDate: "",
                  endDate: "",
                  budget: "",
                  status: "draft"
                });
              }}
              className="absolute top-6 right-6 p-2 text-slate-400 hover:text-slate-900 bg-slate-50 hover:bg-slate-100 rounded-xl transition cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>

            <div className="flex items-center gap-2 mb-6">
              <span className="p-1.5 bg-emerald-100 text-emerald-600 rounded-lg">
                <Briefcase className="w-5 h-5 text-emerald-600" />
              </span>
              <h3 className="text-lg font-black text-slate-900">
                {editingCampaign ? "Edit Health Campaign" : "Initiate Health Campaign"}
              </h3>
            </div>

            <form onSubmit={editingCampaign ? handleUpdateCampaign : handleCreateCampaign} className="space-y-4">
              <div className="space-y-1.5">
                <label className="text-[10px] text-slate-500 font-bold uppercase tracking-wider">Campaign Name *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Monsoon Health Exemption"
                  value={campaignForm.name}
                  onChange={(e) => setCampaignForm({ ...campaignForm, name: e.target.value })}
                  className="w-full px-4 py-3 bg-slate-50 rounded-xl border border-slate-100 text-xs font-bold text-slate-800 focus:outline-none focus:border-emerald-500 transition"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-[10px] text-slate-500 font-bold uppercase tracking-wider">Description *</label>
                <textarea
                  required
                  rows={3}
                  placeholder="Summarize the core purpose and targeted groups of this subsidy ledger."
                  value={campaignForm.description}
                  onChange={(e) => setCampaignForm({ ...campaignForm, description: e.target.value })}
                  className="w-full px-4 py-3 bg-slate-50 rounded-xl border border-slate-100 text-xs font-bold text-slate-800 focus:outline-none focus:border-emerald-500 transition"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-[10px] text-slate-500 font-bold uppercase tracking-wider">Start Date *</label>
                  <input
                    type="date"
                    required
                    value={campaignForm.startDate}
                    onChange={(e) => setCampaignForm({ ...campaignForm, startDate: e.target.value })}
                    className="w-full px-4 py-3 bg-slate-50 rounded-xl border border-slate-100 text-xs font-bold text-slate-800 focus:outline-none focus:border-emerald-500 transition cursor-pointer"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-[10px] text-slate-500 font-bold uppercase tracking-wider">End Date *</label>
                  <input
                    type="date"
                    required
                    value={campaignForm.endDate}
                    onChange={(e) => setCampaignForm({ ...campaignForm, endDate: e.target.value })}
                    className="w-full px-4 py-3 bg-slate-50 rounded-xl border border-slate-100 text-xs font-bold text-slate-800 focus:outline-none focus:border-emerald-500 transition cursor-pointer"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-[10px] text-slate-500 font-bold uppercase tracking-wider">Panchayat Subsidy Budget (₹) *</label>
                  <input
                    type="number"
                    required
                    placeholder="e.g. 50000"
                    value={campaignForm.budget}
                    onChange={(e) => setCampaignForm({ ...campaignForm, budget: e.target.value })}
                    className="w-full px-4 py-3 bg-slate-50 rounded-xl border border-slate-100 text-xs font-bold text-slate-800 focus:outline-none focus:border-emerald-500 transition"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-[10px] text-slate-500 font-bold uppercase tracking-wider">Activation Status</label>
                  <select
                    value={campaignForm.status}
                    onChange={(e) => setCampaignForm({ ...campaignForm, status: e.target.value as any })}
                    className="w-full px-4 py-3 bg-slate-50 rounded-xl border border-slate-100 text-xs font-bold text-slate-800 focus:outline-none focus:border-emerald-500 transition cursor-pointer"
                  >
                    <option value="draft">Draft / Plan Only</option>
                    <option value="active">Active / Running</option>
                    <option value="inactive">Inactive / Suspended</option>
                  </select>
                </div>
              </div>

              <button
                type="submit"
                className="w-full bg-slate-900 hover:bg-slate-800 text-white font-black py-4 rounded-2xl text-xs transition mt-6 cursor-pointer"
              >
                {editingCampaign ? "Save Changes" : "Create Health Campaign"}
              </button>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 3: CONFIGURE RULES */}
      {showRulesModal && (
        <div className="fixed inset-0 bg-slate-950/40 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-3xl max-w-lg w-full p-8 border border-slate-100 shadow-2xl relative animate-scale-in max-h-[90vh] overflow-y-auto">
            <button
              onClick={() => setShowRulesModal(false)}
              className="absolute top-6 right-6 p-2 text-slate-400 hover:text-slate-900 bg-slate-50 hover:bg-slate-100 rounded-xl transition cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>

            <div className="flex items-center gap-2 mb-6">
              <span className="p-1.5 bg-emerald-100 text-emerald-600 rounded-lg">
                <Sliders className="w-5 h-5 text-emerald-600" />
              </span>
              <h3 className="text-lg font-black text-slate-900">Configure Exemption Rules</h3>
            </div>

            <form onSubmit={handleCreateRules} className="space-y-5">
              {/* Allowed Emergencies */}
              <div className="space-y-1.5">
                <label className="text-[10px] text-slate-500 font-bold uppercase tracking-wider">Allowed Emergency Types</label>
                <div className="flex gap-2">
                  <select
                    value={emergencyInput}
                    onChange={(e) => setEmergencyInput(e.target.value)}
                    className="flex-1 px-4 py-3 bg-slate-50 rounded-xl border border-slate-100 text-xs font-bold text-slate-800 focus:outline-none focus:border-emerald-500 transition cursor-pointer"
                  >
                    <option value="">Select Category...</option>
                    <option value="Maternity">Maternity</option>
                    <option value="Cardiac">Cardiac</option>
                    <option value="Accident/Trauma">Accident/Trauma</option>
                    <option value="Severe Illness">Severe Illness</option>
                    <option value="Other">Other</option>
                  </select>
                  <button
                    type="button"
                    onClick={() => addTag("emergency")}
                    className="px-4 bg-slate-900 hover:bg-slate-800 text-white font-extrabold rounded-xl text-xs cursor-pointer"
                  >
                    Add
                  </button>
                </div>
                <div className="flex flex-wrap gap-1.5 mt-2">
                  {rulesForm.allowedEmergencyTypes.map(t => (
                    <span key={t} className="flex items-center gap-1.5 px-2.5 py-1 bg-emerald-50 text-emerald-700 border border-emerald-100 text-[10px] font-black rounded-lg">
                      <span>{t}</span>
                      <X className="w-3 h-3 cursor-pointer hover:text-rose-600" onClick={() => removeTag("emergency", t)} />
                    </span>
                  ))}
                </div>
              </div>

              {/* Allowed Villages */}
              <div className="space-y-1.5">
                <label className="text-[10px] text-slate-500 font-bold uppercase tracking-wider">Allowed Villages</label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    placeholder="e.g. Sherpur (Press Add)"
                    value={villageInput}
                    onChange={(e) => setVillageInput(e.target.value)}
                    className="flex-1 px-4 py-3 bg-slate-50 rounded-xl border border-slate-100 text-xs font-bold text-slate-800 focus:outline-none focus:border-emerald-500 transition"
                  />
                  <button
                    type="button"
                    onClick={() => addTag("village")}
                    className="px-4 bg-slate-900 hover:bg-slate-800 text-white font-extrabold rounded-xl text-xs cursor-pointer"
                  >
                    Add
                  </button>
                </div>
                <div className="flex flex-wrap gap-1.5 mt-2">
                  {rulesForm.allowedVillages.map(v => (
                    <span key={v} className="flex items-center gap-1.5 px-2.5 py-1 bg-emerald-50 text-emerald-700 border border-emerald-100 text-[10px] font-black rounded-lg">
                      <span>{v}</span>
                      <X className="w-3 h-3 cursor-pointer hover:text-rose-600" onClick={() => removeTag("village", v)} />
                    </span>
                  ))}
                </div>
              </div>

              {/* Allowed Vehicle Types */}
              <div className="space-y-1.5">
                <label className="text-[10px] text-slate-500 font-bold uppercase tracking-wider">Allowed Vehicle Types</label>
                <div className="flex gap-2">
                  <select
                    value={vehicleInput}
                    onChange={(e) => setVehicleInput(e.target.value)}
                    className="flex-1 px-4 py-3 bg-slate-50 rounded-xl border border-slate-100 text-xs font-bold text-slate-800 focus:outline-none focus:border-emerald-500 transition cursor-pointer"
                  >
                    <option value="">Select Vehicle...</option>
                    <option value="Auto Rickshaw">Auto Rickshaw</option>
                    <option value="Bolero SUV">Bolero SUV</option>
                    <option value="Tractor Ambulance">Tractor Ambulance</option>
                    <option value="E-Rickshaw">E-Rickshaw</option>
                  </select>
                  <button
                    type="button"
                    onClick={() => addTag("vehicle")}
                    className="px-4 bg-slate-900 hover:bg-slate-800 text-white font-extrabold rounded-xl text-xs cursor-pointer"
                  >
                    Add
                  </button>
                </div>
                <div className="flex flex-wrap gap-1.5 mt-2">
                  {rulesForm.allowedVehicleTypes.map(vt => (
                    <span key={vt} className="flex items-center gap-1.5 px-2.5 py-1 bg-emerald-50 text-emerald-700 border border-emerald-100 text-[10px] font-black rounded-lg">
                      <span>{vt}</span>
                      <X className="w-3 h-3 cursor-pointer hover:text-rose-600" onClick={() => removeTag("vehicle", vt)} />
                    </span>
                  ))}
                </div>
              </div>

              {/* User Ride limit */}
              <div className="space-y-1.5">
                <label className="text-[10px] text-slate-500 font-bold uppercase tracking-wider">User Usage Count Limit</label>
                <input
                  type="number"
                  required
                  value={rulesForm.userRideCountLimit}
                  onChange={(e) => setRulesForm({ ...rulesForm, userRideCountLimit: e.target.value })}
                  className="w-full px-4 py-3 bg-slate-50 rounded-xl border border-slate-100 text-xs font-bold text-slate-800 focus:outline-none focus:border-emerald-500 transition"
                />
                <span className="text-[10px] text-slate-400 font-semibold block mt-1">
                  Limits how many times any single passenger can redeem a coupon linked to this rule.
                </span>
              </div>

              <button
                type="submit"
                className="w-full bg-slate-900 hover:bg-slate-800 text-white font-black py-4 rounded-2xl text-xs transition mt-6 cursor-pointer"
              >
                Save Rules Configuration
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
