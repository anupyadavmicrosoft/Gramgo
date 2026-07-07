import React, { useState, useEffect } from "react";
import { 
  Activity, 
  ShieldAlert, 
  HeartPulse, 
  Navigation, 
  Search, 
  Filter, 
  Users, 
  Flame, 
  MapPin, 
  RefreshCw, 
  Sliders, 
  Ambulance, 
  AlertCircle, 
  TrendingUp, 
  CheckCircle, 
  XCircle, 
  Clock, 
  Phone, 
  PlusSquare, 
  Sparkles, 
  Settings2,
  CheckCircle2,
  Map,
  ChevronRight,
  TrendingDown,
  Info
} from "lucide-react";
import { 
  ResponsiveContainer, 
  AreaChart, 
  Area, 
  XAxis, 
  YAxis, 
  Tooltip, 
  PieChart, 
  Pie, 
  Cell,
  BarChart,
  Bar,
  CartesianGrid
} from "recharts";
import { useAuth } from "../context/AuthContext";

// Types
interface Emergency {
  id: string;
  patientName: string;
  patientPhone: string;
  emergencyType: "Maternity" | "Accident/Trauma" | "Severe Illness" | "Cardiac" | "Other" | string;
  priority: "critical" | "urgent" | "non-urgent" | string;
  village: string;
  landmark?: string;
  driverId?: string;
  driverName?: string;
  driverPhone?: string;
  vehicleType?: string;
  status: string;
  createdAt: number;
  destinationChc: string;
  isManual?: boolean;
  completedAt?: number;
}

interface Hospital {
  id: string;
  name: string;
  type: string;
  village: string;
  bedsAvailable: number;
  totalBeds: number;
  contactNumber: string;
  hasVentilator: boolean;
  hasICU: boolean;
  hasOxygen: boolean;
  specialty: string;
}

interface Driver {
  id: string;
  name: string;
  phone: string;
  vehicleType: string;
  vehicleNumber: string;
  village: string;
  status: "available" | "busy" | "offline";
  rating: number;
  completedTrips: number;
}

interface VillageHeatNode {
  village: string;
  lat: number;
  lng: number;
  emergencyCount: number;
  activeCount: number;
  threatLevel: "high" | "medium" | "low";
}

interface DashboardData {
  emergencies: Emergency[];
  priorityQueue: Emergency[];
  hospitals: Hospital[];
  drivers: Driver[];
  analytics: {
    totalCount: number;
    activeCount: number;
    completedCount: number;
    cancelledCount: number;
    avgDispatchTime: number;
    survivalRate: number;
    categoryBreakdown: Record<string, number>;
    villageCounts: Record<string, number>;
    hourlyTrend: number[];
    weeklyTrend: number[];
  };
  heatMap: VillageHeatNode[];
}

export default function EmergencyDashboard() {
  const { token } = useAuth();
  
  // State
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  
  // Filters
  const [selectedVillage, setSelectedVillage] = useState<string>("All");
  const [selectedCategory, setSelectedCategory] = useState<string>("All");
  const [selectedPriority, setSelectedPriority] = useState<string>("All");
  const [selectedStatus, setSelectedStatus] = useState<string>("All");
  
  // Selected elements for detail inspection
  const [selectedEmergency, setSelectedEmergency] = useState<Emergency | null>(null);
  const [editingHospital, setEditingHospital] = useState<Hospital | null>(null);
  const [updatingDriver, setUpdatingDriver] = useState<Driver | null>(null);
  const [actionSuccess, setActionSuccess] = useState<string | null>(null);

  // Load Dashboard Data
  const fetchDashboardData = async (isSilent = false) => {
    if (!isSilent) setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/admin/emergency-dashboard/summary", {
        headers: {
          "Authorization": `Bearer ${token}`
        }
      });
      if (!res.ok) {
        throw new Error("Failed to fetch emergency dashboard summary. Ensure you are an Admin.");
      }
      const json = await res.json();
      if (json.success) {
        setData(json);
        // Default to first emergency for timeline if none selected
        if (json.emergencies && json.emergencies.length > 0 && !selectedEmergency) {
          setSelectedEmergency(json.emergencies[0]);
        } else if (selectedEmergency) {
          // Keep selection up-to-date
          const updated = json.emergencies.find((e: Emergency) => e.id === selectedEmergency.id);
          if (updated) setSelectedEmergency(updated);
        }
      } else {
        throw new Error(json.error || "Dashboard compile failed.");
      }
    } catch (err: any) {
      setError(err.message || "Network Error.");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchDashboardData();
    // Poll updates every 6 seconds to show dynamic simulation shifts
    const interval = setInterval(() => {
      fetchDashboardData(true);
    }, 6000);
    return () => clearInterval(interval);
  }, [token]);

  // Handle manual mutations
  const updateHospitalCapacity = async () => {
    if (!editingHospital) return;
    try {
      const res = await fetch(`/api/admin/emergency-dashboard/hospitals/${editingHospital.id}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token}`
        },
        body: JSON.stringify({
          bedsAvailable: editingHospital.bedsAvailable,
          totalBeds: editingHospital.totalBeds,
          hasVentilator: editingHospital.hasVentilator,
          hasOxygen: editingHospital.hasOxygen,
          hasICU: editingHospital.hasICU,
          contactNumber: editingHospital.contactNumber
        })
      });
      const json = await res.json();
      if (json.success) {
        showSuccessMessage(`Hospital ${editingHospital.name} successfully updated!`);
        setEditingHospital(null);
        fetchDashboardData(true);
      } else {
        alert(json.error || "Failed to update hospital capacity.");
      }
    } catch (err) {
      console.error(err);
      alert("Error submitting hospital update.");
    }
  };

  const updateDriverStatus = async (driverId: string, status: "available" | "busy" | "offline") => {
    try {
      const res = await fetch(`/api/admin/emergency-dashboard/drivers/${driverId}/status`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token}`
        },
        body: JSON.stringify({ status })
      });
      const json = await res.json();
      if (json.success) {
        showSuccessMessage(`Driver status successfully shifted to ${status}.`);
        setUpdatingDriver(null);
        fetchDashboardData(true);
      } else {
        alert(json.error || "Failed to update driver status.");
      }
    } catch (err) {
      console.error(err);
      alert("Error submitting driver status shift.");
    }
  };

  const overrideRidePriority = async (rideId: string, priority: string) => {
    try {
      const res = await fetch(`/api/admin/emergency-dashboard/bookings/${rideId}/priority`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token}`
        },
        body: JSON.stringify({ priority })
      });
      const json = await res.json();
      if (json.success) {
        showSuccessMessage(`Ride priority updated to ${priority}.`);
        fetchDashboardData(true);
      } else {
        alert(json.error || "Failed to update ride priority.");
      }
    } catch (err) {
      console.error(err);
      alert("Error updating priority override.");
    }
  };

  const showSuccessMessage = (msg: string) => {
    setActionSuccess(msg);
    setTimeout(() => setActionSuccess(null), 4000);
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] p-8 space-y-4">
        <div className="w-12 h-12 border-4 border-orange-500 border-t-transparent rounded-full animate-spin"></div>
        <div className="text-slate-500 font-mono text-xs">LOADING PANCHAYAT EMERGENCY CONTROL ROOM...</div>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="bg-red-50 border border-red-200 text-red-800 p-6 rounded-2xl max-w-2xl mx-auto my-8 space-y-4 shadow-sm">
        <div className="flex items-center space-x-3">
          <AlertCircle className="w-6 h-6 text-red-600 shrink-0" />
          <h3 className="text-lg font-semibold">Access Denied / Initialization Error</h3>
        </div>
        <p className="text-sm text-red-700">{error || "No data received. Please ensure you are logged in with admin credentials."}</p>
        <button 
          onClick={() => fetchDashboardData()} 
          className="flex items-center space-x-2 px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-xl text-sm font-medium transition-colors"
        >
          <RefreshCw className="w-4 h-4" />
          <span>Retry Access Connection</span>
        </button>
      </div>
    );
  }

  const { emergencies, priorityQueue, hospitals, drivers, analytics, heatMap } = data;

  // Compile list of unique villages dynamically
  const uniqueVillages = ["All", ...Array.from(new Set(emergencies.map(e => e.village).filter(Boolean)))];

  // Frontend Live Filtering and Search
  const filteredEmergencies = emergencies.filter(e => {
    const matchesSearch = 
      e.patientName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      e.patientPhone.includes(searchQuery) ||
      e.village.toLowerCase().includes(searchQuery.toLowerCase()) ||
      e.destinationChc.toLowerCase().includes(searchQuery.toLowerCase());
      
    const matchesVillage = selectedVillage === "All" || e.village === selectedVillage;
    const matchesCategory = selectedCategory === "All" || e.emergencyType === selectedCategory;
    const matchesPriority = selectedPriority === "All" || e.priority === selectedPriority;
    
    let matchesStatus = true;
    if (selectedStatus !== "All") {
      if (selectedStatus === "Active") {
        matchesStatus = e.status !== "Completed" && e.status !== "completed" && e.status !== "Cancelled" && e.status !== "cancelled";
      } else if (selectedStatus === "Completed") {
        matchesStatus = e.status === "Completed" || e.status === "completed";
      } else if (selectedStatus === "Cancelled") {
        matchesStatus = e.status === "Cancelled" || e.status === "cancelled";
      }
    }

    return matchesSearch && matchesVillage && matchesCategory && matchesPriority && matchesStatus;
  });

  // Recharts color codes for categories
  const COLORS = ["#f97316", "#ef4444", "#3b82f6", "#a855f7", "#6b7280"];
  const pieData = Object.keys(analytics.categoryBreakdown).map((key, i) => ({
    name: key,
    value: analytics.categoryBreakdown[key],
    color: COLORS[i % COLORS.length]
  })).filter(item => item.value > 0);

  // Area Chart Data formatted for daily hours
  const hourlyChartData = analytics.hourlyTrend.map((count, hour) => ({
    time: `${hour}:00`,
    Dispatches: count
  }));

  // Bar Chart Data formatted for days
  const weekdays = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
  const weeklyChartData = analytics.weeklyTrend.map((count, idx) => ({
    day: weekdays[idx],
    Emergencies: count
  }));

  // Timeline stage sequence
  const timelineStages = [
    { key: "requested", label: "Requested", desc: "Dispatch SOS Triggered" },
    { key: "driver_assigned", label: "Assigned", desc: "Volunteer Accepted" },
    { key: "driver_arriving", label: "En Route", desc: "Vehicle Arriving" },
    { key: "reached_pickup", label: "Arrived", desc: "Patient Pick-up Contact" },
    { key: "ride_started", label: "In Transit", desc: "Speeding to CHC Hospital" },
    { key: "completed", label: "Admitted", desc: "Arrived at Medical Facility" }
  ];

  // Helper to resolve progress score (0 to 5)
  const getTimelineProgressIndex = (status: string) => {
    const s = status.toLowerCase();
    if (s.includes("requested")) return 0;
    if (s.includes("assigned")) return 1;
    if (s.includes("arriving")) return 2;
    if (s.includes("reached") || s.includes("arrived")) return 3;
    if (s.includes("started") || s.includes("transit")) return 4;
    if (s.includes("completed") || s.includes("hospital") || s.includes("reached")) return 5;
    return -1;
  };

  return (
    <div id="emergency-dashboard-root" className="space-y-8 pb-16">
      
      {/* Banner / Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-gradient-to-br from-slate-900 to-slate-950 text-white p-6 md:p-8 rounded-3xl shadow-xl border border-slate-800">
        <div className="space-y-2">
          <div className="flex items-center space-x-2">
            <span className="flex h-2.5 w-2.5 relative">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-red-500"></span>
            </span>
            <span className="text-xs font-semibold tracking-wider uppercase text-red-400 font-mono">PANCHAYAT COMMAND ROOM</span>
          </div>
          <h1 className="text-2xl md:text-3xl font-bold font-sans tracking-tight">GramGo Emergency Operations</h1>
          <p className="text-slate-400 text-sm max-w-xl">
            Live medical dispatch monitoring, volunteer fleet coordinates, regional heat maps, and real-time community health center capacity controls.
          </p>
        </div>
        
        <div className="flex items-center gap-3">
          <button
            onClick={() => {
              setRefreshing(true);
              fetchDashboardData();
            }}
            disabled={refreshing}
            className={`flex items-center space-x-2 px-4 py-2.5 bg-slate-800 hover:bg-slate-700 disabled:opacity-50 text-white font-medium text-xs rounded-xl transition-all border border-slate-700 font-mono`}
          >
            <RefreshCw className={`w-3.5 h-3.5 ${refreshing ? "animate-spin" : ""}`} />
            <span>{refreshing ? "REFRESHING LOGS..." : "FORCE SYNC DATA"}</span>
          </button>
          
          <div className="text-xs bg-red-950/40 border border-red-900/50 text-red-400 font-mono px-3 py-2 rounded-xl">
            ACTIVE ALERTS: <span className="font-bold">{analytics.activeCount}</span>
          </div>
        </div>
      </div>

      {/* Action Notification Alert Toast */}
      {actionSuccess && (
        <div className="fixed bottom-6 right-6 z-50 flex items-center space-x-3 bg-slate-950 border border-emerald-500 text-white px-5 py-4 rounded-2xl shadow-2xl animate-bounce">
          <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
          <span className="text-sm font-medium">{actionSuccess}</span>
        </div>
      )}

      {/* Analytics KPI Bento Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        
        {/* KPI 1 */}
        <div className="bg-white border border-slate-100 p-5 rounded-2xl shadow-sm flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-slate-500 text-xs font-semibold uppercase tracking-wider font-mono">Total Dispatches</span>
            <div className="p-2 bg-slate-50 rounded-xl">
              <Activity className="w-5 h-5 text-slate-600" />
            </div>
          </div>
          <div className="mt-4">
            <h3 className="text-2xl md:text-3xl font-bold text-slate-900 font-sans tracking-tight">{analytics.totalCount}</h3>
            <p className="text-xs text-slate-500 mt-1 flex items-center gap-1">
              <TrendingUp className="w-3.5 h-3.5 text-emerald-500" />
              <span>Lifetime logged cases</span>
            </p>
          </div>
        </div>

        {/* KPI 2 */}
        <div className="bg-white border border-slate-100 p-5 rounded-2xl shadow-sm flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-slate-500 text-xs font-semibold uppercase tracking-wider font-mono">Active Emergencies</span>
            <span className="flex h-2.5 w-2.5 relative">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-red-500"></span>
            </span>
          </div>
          <div className="mt-4">
            <h3 className="text-2xl md:text-3xl font-bold text-red-600 font-sans tracking-tight">{analytics.activeCount}</h3>
            <p className="text-xs text-slate-500 mt-1">Requiring immediate response</p>
          </div>
        </div>

        {/* KPI 3 */}
        <div className="bg-white border border-slate-100 p-5 rounded-2xl shadow-sm flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-slate-500 text-xs font-semibold uppercase tracking-wider font-mono">Avg Dispatch Speed</span>
            <div className="p-2 bg-orange-50 rounded-xl">
              <Clock className="w-5 h-5 text-orange-600" />
            </div>
          </div>
          <div className="mt-4">
            <h3 className="text-2xl md:text-3xl font-bold text-slate-900 font-sans tracking-tight">
              {analytics.avgDispatchTime} <span className="text-xs font-normal text-slate-500">mins</span>
            </h3>
            <p className="text-xs text-slate-500 mt-1">From request to CHC arrival</p>
          </div>
        </div>

        {/* KPI 4 */}
        <div className="bg-white border border-slate-100 p-5 rounded-2xl shadow-sm flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-slate-500 text-xs font-semibold uppercase tracking-wider font-mono">Safety / Success Rate</span>
            <div className="p-2 bg-emerald-50 rounded-xl">
              <TrendingUp className="w-5 h-5 text-emerald-600" />
            </div>
          </div>
          <div className="mt-4">
            <h3 className="text-2xl md:text-3xl font-bold text-slate-900 font-sans tracking-tight">{analytics.survivalRate}%</h3>
            <p className="text-xs text-slate-500 mt-1">Completed / non-cancelled dispatches</p>
          </div>
        </div>

      </div>

      {/* Main Core Section: Interactive Map Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        
        {/* Heat Map Visualization Panel (LG: Col 8) */}
        <div className="lg:col-span-8 bg-white border border-slate-100 p-6 rounded-3xl shadow-sm space-y-6">
          <div className="flex items-center justify-between border-b border-slate-50 pb-4">
            <div className="flex items-center space-x-3">
              <div className="p-2.5 bg-orange-500/10 text-orange-600 rounded-xl">
                <Map className="w-5 h-5" />
              </div>
              <div>
                <h2 className="text-lg font-bold text-slate-950 font-sans tracking-tight">Ghazipur Regional Heat Map</h2>
                <p className="text-xs text-slate-500">Visualizing active emergency density across village hubs</p>
              </div>
            </div>
            
            <div className="flex items-center gap-1.5 text-xs font-mono bg-slate-50 px-2.5 py-1 rounded-lg">
              <Flame className="w-3.5 h-3.5 text-red-500" />
              <span>Interactive Villages Grid</span>
            </div>
          </div>

          {/* SVG Canvas Map Graphic */}
          <div className="relative w-full aspect-[16/10] bg-slate-950 rounded-2xl border border-slate-900 overflow-hidden flex flex-col items-center justify-center p-4">
            {/* Grid Pattern Accent overlay */}
            <div className="absolute inset-0 opacity-[0.03] bg-[radial-gradient(#38bdf8_1px,transparent_1px)] [background-size:16px_16px]"></div>
            
            {/* Indian Road Route lines schematic representation */}
            <svg className="absolute inset-0 w-full h-full pointer-events-none opacity-25" viewBox="0 0 800 500">
              {/* Primary Roads linking villages */}
              <path d="M 100 150 Q 250 180 400 250 T 700 350" fill="none" stroke="#64748b" strokeWidth="2.5" strokeDasharray="5,5" />
              <path d="M 200 450 Q 350 300 400 250 T 600 80" fill="none" stroke="#334155" strokeWidth="2" />
              <path d="M 50 250 Q 300 150 750 280" fill="none" stroke="#f97316" strokeWidth="1" strokeOpacity="0.4" />
            </svg>

            {/* Render village bubble nodes based on HeatMap Data */}
            <div className="absolute inset-0">
              {heatMap.map((node, index) => {
                // Map approximate custom pixel coordinates on canvas for high-fidelity interactive grid placement
                const coordinatesMapping: Record<string, { x: number; y: number }> = {
                  "Gauspur": { x: 20, y: 30 },
                  "Karimpur": { x: 45, y: 22 },
                  "Sherpur": { x: 30, y: 55 },
                  "Malikpur": { x: 15, y: 68 },
                  "Yusufpur": { x: 62, y: 15 },
                  "Mohammadabad": { x: 78, y: 28 },
                  "Sauram": { x: 50, y: 50 },
                  "Reotipur": { x: 60, y: 75 },
                  "Bara": { x: 82, y: 78 },
                  "Nonhara": { x: 80, y: 52 },
                  "Jangipur": { x: 38, y: 80 },
                  "Suhawal": { x: 42, y: 40 }
                };

                const placement = coordinatesMapping[node.village] || { x: (index * 8) % 80 + 10, y: (index * 7) % 70 + 15 };
                
                // Color mapping based on threat level
                let bubbleColor = "bg-slate-700 text-slate-400 hover:bg-slate-600";
                let pulseColor = "bg-slate-400";
                
                if (node.threatLevel === "high") {
                  bubbleColor = "bg-red-500 text-white shadow-lg shadow-red-500/50 hover:bg-red-600 ring-4 ring-red-500/20";
                  pulseColor = "bg-red-400";
                } else if (node.threatLevel === "medium") {
                  bubbleColor = "bg-orange-500 text-white shadow-md shadow-orange-500/30 hover:bg-orange-600 ring-2 ring-orange-500/10";
                  pulseColor = "bg-orange-400";
                } else if (node.emergencyCount > 0) {
                  bubbleColor = "bg-blue-600 text-white hover:bg-blue-700";
                  pulseColor = "bg-blue-400";
                }

                const isActiveVillage = selectedVillage === node.village;

                return (
                  <div
                    key={node.village}
                    className="absolute transition-transform duration-300 hover:scale-110 cursor-pointer"
                    style={{ left: `${placement.x}%`, top: `${placement.y}%` }}
                    onClick={() => {
                      setSelectedVillage(selectedVillage === node.village ? "All" : node.village);
                    }}
                  >
                    {/* Ring Pulse animation for active/emergency hotspots */}
                    {(node.threatLevel === "high" || node.threatLevel === "medium") && (
                      <span className="absolute -inset-2.5 flex h-10 w-10 items-center justify-center">
                        <span className={`animate-ping absolute inline-flex h-full w-full rounded-full ${pulseColor} opacity-20`}></span>
                      </span>
                    )}

                    <div className={`relative flex items-center space-x-1.5 px-3 py-1.5 rounded-full text-[10px] font-semibold font-mono border border-slate-900 transition-all ${bubbleColor} ${isActiveVillage ? 'ring-4 ring-amber-400' : ''}`}>
                      <MapPin className="w-3 h-3" />
                      <span>{node.village}</span>
                      {node.emergencyCount > 0 && (
                        <span className="bg-slate-950/40 px-1 py-0.5 rounded text-[8px]">
                          {node.activeCount}/{node.emergencyCount}
                        </span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Floating Map Legend info */}
            <div className="absolute bottom-4 left-4 bg-slate-900/90 border border-slate-800 text-white p-3.5 rounded-xl text-[10px] font-mono space-y-2 pointer-events-none shadow-xl max-w-xs">
              <div className="text-[9px] text-slate-400 uppercase tracking-wider font-bold mb-1">PANCHAYAT RISK LEGEND</div>
              <div className="flex items-center space-x-2">
                <span className="w-2.5 h-2.5 rounded-full bg-red-500 inline-block animate-pulse"></span>
                <span>CRITICAL ZONE (≥2 Active SOS alerts)</span>
              </div>
              <div className="flex items-center space-x-2">
                <span className="w-2.5 h-2.5 rounded-full bg-orange-500 inline-block"></span>
                <span>ALERT ZONE (Active/High Volume Case)</span>
              </div>
              <div className="flex items-center space-x-2">
                <span className="w-2.5 h-2.5 rounded-full bg-blue-600 inline-block"></span>
                <span>STABLE HUB (Logged History)</span>
              </div>
              <div className="text-[9px] text-orange-400 mt-2 font-sans italic">
                *Tip: Click any village bubble node to filter logs.
              </div>
            </div>
            
            {/* Map Status indicators overlay top right */}
            <div className="absolute top-4 right-4 flex items-center space-x-2 text-[10px] bg-slate-900/80 backdrop-blur-sm border border-slate-800 text-slate-300 px-3 py-1.5 rounded-lg font-mono">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-ping"></span>
              <span>GPS Tracking Active</span>
            </div>
          </div>
        </div>

        {/* Priority Dispatch Queue Panel (LG: Col 4) */}
        <div className="lg:col-span-4 bg-white border border-slate-100 p-6 rounded-3xl shadow-sm flex flex-col justify-between space-y-6">
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2 text-slate-900">
                <Flame className="w-5 h-5 text-red-500" />
                <h2 className="text-lg font-bold font-sans tracking-tight">Priority Queue</h2>
              </div>
              <span className="bg-red-50 text-red-600 text-[10px] font-bold uppercase tracking-wider font-mono px-2.5 py-1 rounded-full">
                Triage Sorted
              </span>
            </div>
            <p className="text-xs text-slate-500">
              Immediate triage classification. Critical Maternity and Cardiac instances placed first.
            </p>
          </div>

          <div className="flex-grow overflow-y-auto space-y-3.5 pr-1 max-h-[340px]">
            {priorityQueue.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 text-center text-slate-400 space-y-3">
                <CheckCircle className="w-10 h-10 text-emerald-400" />
                <p className="text-xs font-mono">ALL CASES TRIAGED & SOLVED</p>
                <p className="text-[10px]">No active unassigned emergencies at this hour.</p>
              </div>
            ) : (
              priorityQueue.map(e => {
                const isCritical = e.priority === "critical";
                const isUrgent = e.priority === "urgent";
                
                return (
                  <div
                    key={e.id}
                    onClick={() => setSelectedEmergency(e)}
                    className={`p-3.5 rounded-2xl border transition-all cursor-pointer ${
                      selectedEmergency?.id === e.id 
                        ? "border-orange-500 bg-orange-50/20" 
                        : "border-slate-100 bg-white hover:border-slate-200"
                    }`}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="space-y-1">
                        <div className="flex items-center gap-1.5">
                          <span className={`w-2 h-2 rounded-full ${
                            isCritical ? "bg-red-500 animate-ping" : isUrgent ? "bg-orange-500" : "bg-slate-400"
                          }`}></span>
                          <span className={`text-xs font-bold ${
                            isCritical ? "text-red-600" : isUrgent ? "text-orange-600" : "text-slate-500"
                          } uppercase tracking-wider font-mono`}>
                            {e.priority} • {e.emergencyType}
                          </span>
                        </div>
                        
                        <h4 className="text-sm font-semibold text-slate-900">{e.patientName}</h4>
                        <p className="text-[11px] text-slate-500 font-mono">
                          Village: <span className="font-semibold text-slate-700">{e.village}</span>
                        </p>
                      </div>
                      
                      <div className="text-right">
                        <span className="text-[9px] bg-slate-100 text-slate-700 px-2 py-1 rounded-md font-mono">
                          {Math.floor((Date.now() - e.createdAt) / 60000)}m ago
                        </span>
                      </div>
                    </div>

                    <div className="mt-3 pt-2.5 border-t border-slate-100 flex items-center justify-between text-[10px] text-slate-500 font-mono">
                      <span>Status: <span className="text-slate-800 font-bold">{e.status}</span></span>
                      
                      {/* Priority toggler/override inline */}
                      <select
                        value={e.priority}
                        onChange={(event) => overrideRidePriority(e.id, event.target.value)}
                        onClick={(event) => event.stopPropagation()}
                        className="bg-slate-50 hover:bg-slate-100 border border-slate-200 text-slate-700 text-[9px] rounded-md px-1.5 py-0.5 outline-none font-bold cursor-pointer"
                      >
                        <option value="critical">CRITICAL</option>
                        <option value="urgent">URGENT</option>
                        <option value="non-urgent">NON-URGENT</option>
                      </select>
                    </div>
                  </div>
                );
              })
            )}
          </div>

          <div className="bg-amber-50 border border-amber-200 text-amber-800 p-3.5 rounded-2xl text-[10px] flex items-start space-x-2.5">
            <Info className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
            <div>
              <p className="font-bold">Automated Priority Escalation</p>
              <p className="text-slate-600 mt-0.5">
                Rides with &quot;searching&quot; driver states longer than 4 minutes are auto-escalated to critical alert severity.
              </p>
            </div>
          </div>
        </div>

      </div>

      {/* Interactive Logs / Analytics Tables split */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        
        {/* Live Emergencies Table (LG: Col 8) */}
        <div className="lg:col-span-8 bg-white border border-slate-100 p-6 rounded-3xl shadow-sm space-y-6">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-50 pb-4">
            <div className="flex items-center space-x-3">
              <div className="p-2.5 bg-orange-500/10 text-orange-600 rounded-xl">
                <Activity className="w-5 h-5" />
              </div>
              <div>
                <h2 className="text-lg font-bold text-slate-950 font-sans tracking-tight">Active Dispatches</h2>
                <p className="text-xs text-slate-500">Live search, filter and monitor emergency files</p>
              </div>
            </div>

            <div className="flex items-center space-x-2 self-start w-full md:w-auto">
              <div className="relative flex-grow">
                <Search className="absolute left-3 top-2.5 w-4 h-4 text-slate-400" />
                <input
                  type="text"
                  placeholder="Search patient, phone, village, CHC..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-9 pr-4 py-2 bg-slate-50 hover:bg-slate-100/80 focus:bg-white text-slate-800 text-xs rounded-xl outline-none border border-slate-100 focus:border-slate-200 transition-all w-full md:w-64 font-sans"
                />
              </div>
            </div>
          </div>

          {/* Filters Bar */}
          <div className="flex flex-wrap items-center gap-2 text-xs">
            {/* Village Filter */}
            <div className="flex items-center space-x-1 bg-slate-50 border border-slate-100 px-3 py-1.5 rounded-xl">
              <span className="text-slate-400 font-mono text-[10px]">VILLAGE:</span>
              <select
                value={selectedVillage}
                onChange={(e) => setSelectedVillage(e.target.value)}
                className="bg-transparent text-slate-700 font-bold outline-none cursor-pointer"
              >
                <option value="All">All Villages</option>
                {uniqueVillages.filter(v => v !== "All").map(v => (
                  <option key={v} value={v}>{v}</option>
                ))}
              </select>
            </div>

            {/* Category Filter */}
            <div className="flex items-center space-x-1 bg-slate-50 border border-slate-100 px-3 py-1.5 rounded-xl">
              <span className="text-slate-400 font-mono text-[10px]">CATEGORY:</span>
              <select
                value={selectedCategory}
                onChange={(e) => setSelectedCategory(e.target.value)}
                className="bg-transparent text-slate-700 font-bold outline-none cursor-pointer"
              >
                <option value="All">All Categories</option>
                <option value="Maternity">Maternity</option>
                <option value="Accident/Trauma">Accident/Trauma</option>
                <option value="Severe Illness">Severe Illness</option>
                <option value="Cardiac">Cardiac</option>
                <option value="Other">Other</option>
              </select>
            </div>

            {/* Priority Filter */}
            <div className="flex items-center space-x-1 bg-slate-50 border border-slate-100 px-3 py-1.5 rounded-xl">
              <span className="text-slate-400 font-mono text-[10px]">PRIORITY:</span>
              <select
                value={selectedPriority}
                onChange={(e) => setSelectedPriority(e.target.value)}
                className="bg-transparent text-slate-700 font-bold outline-none cursor-pointer"
              >
                <option value="All">All Priorities</option>
                <option value="critical">Critical</option>
                <option value="urgent">Urgent</option>
                <option value="non-urgent">Non-Urgent</option>
              </select>
            </div>

            {/* Status Filter */}
            <div className="flex items-center space-x-1 bg-slate-50 border border-slate-100 px-3 py-1.5 rounded-xl">
              <span className="text-slate-400 font-mono text-[10px]">STATUS:</span>
              <select
                value={selectedStatus}
                onChange={(e) => setSelectedStatus(e.target.value)}
                className="bg-transparent text-slate-700 font-bold outline-none cursor-pointer"
              >
                <option value="All">All Statuses</option>
                <option value="Active">Active Only</option>
                <option value="Completed">Completed</option>
                <option value="Cancelled">Cancelled</option>
              </select>
            </div>
          </div>

          {/* Table Container */}
          <div className="overflow-x-auto rounded-xl border border-slate-100">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50 text-slate-500 font-mono text-[10px] uppercase tracking-wider border-b border-slate-100">
                  <th className="p-4">Case File</th>
                  <th className="p-4">Patient Profile</th>
                  <th className="p-4">Dispatch Hub</th>
                  <th className="p-4">Assigned Pilot</th>
                  <th className="p-4">Status</th>
                  <th className="p-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50 text-xs">
                {filteredEmergencies.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="p-8 text-center text-slate-400 font-mono">
                      NO EMERGENCY LOGS MATCH THESE PARAMETERS
                    </td>
                  </tr>
                ) : (
                  filteredEmergencies.map((e) => {
                    const isSelected = selectedEmergency?.id === e.id;
                    const priorityWeights: Record<string, string> = {
                      critical: "bg-red-50 text-red-700 border-red-100",
                      urgent: "bg-orange-50 text-orange-700 border-orange-100",
                      "non-urgent": "bg-yellow-50 text-yellow-700 border-yellow-100"
                    };

                    return (
                      <tr 
                        key={e.id}
                        className={`hover:bg-slate-50/50 cursor-pointer transition-colors ${isSelected ? "bg-orange-50/20" : ""}`}
                        onClick={() => setSelectedEmergency(e)}
                      >
                        <td className="p-4 font-mono">
                          <div className="font-bold text-slate-900">{e.id.substring(0, 8)}</div>
                          <div className="text-[10px] text-slate-400">{new Date(e.createdAt).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</div>
                        </td>
                        <td className="p-4">
                          <div className="font-bold text-slate-900">{e.patientName}</div>
                          <div className="text-[10px] text-slate-500">{e.patientPhone}</div>
                        </td>
                        <td className="p-4">
                          <div className="font-semibold text-slate-800">{e.village}</div>
                          <div className="text-[10px] text-slate-400">CHC: {e.destinationChc}</div>
                        </td>
                        <td className="p-4">
                          {e.driverId ? (
                            <div>
                              <div className="font-semibold text-slate-800">{e.driverName}</div>
                              <div className="text-[10px] text-slate-400 font-mono">{e.vehicleType}</div>
                            </div>
                          ) : (
                            <span className="text-red-500 font-bold bg-red-50/50 border border-red-100 px-2 py-0.5 rounded text-[10px] font-mono animate-pulse">
                              UNASSIGNED
                            </span>
                          )}
                        </td>
                        <td className="p-4">
                          <span className={`px-2.5 py-1 rounded-full text-[10px] font-semibold border ${
                            priorityWeights[e.priority] || "bg-slate-50"
                          }`}>
                            {e.status}
                          </span>
                        </td>
                        <td className="p-4 text-right" onClick={(ev) => ev.stopPropagation()}>
                          <button
                            onClick={() => setSelectedEmergency(e)}
                            className="text-[10px] font-bold text-orange-600 bg-orange-50 hover:bg-orange-100 px-3 py-1.5 rounded-lg transition-colors font-mono"
                          >
                            INSPECT
                          </button>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Selected Emergency Timeline (LG: Col 4) */}
        <div className="lg:col-span-4 bg-white border border-slate-100 p-6 rounded-3xl shadow-sm space-y-6 flex flex-col justify-between">
          <div className="space-y-4">
            <div className="flex items-center space-x-3 border-b border-slate-50 pb-4">
              <div className="p-2.5 bg-orange-500/10 text-orange-600 rounded-xl">
                <Navigation className="w-5 h-5" />
              </div>
              <div>
                <h2 className="text-lg font-bold text-slate-950 font-sans tracking-tight">Active Timeline</h2>
                <p className="text-xs text-slate-500">Milestone validation tracking</p>
              </div>
            </div>

            {selectedEmergency ? (
              <div className="space-y-4">
                {/* Micro patient details */}
                <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100 space-y-2.5">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] bg-slate-900 text-white px-2 py-0.5 rounded font-mono font-bold uppercase">
                      CASE #{selectedEmergency.id.substring(0, 8)}
                    </span>
                    <span className="text-[10px] text-slate-400 font-mono">
                      {new Date(selectedEmergency.createdAt).toLocaleDateString()}
                    </span>
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-slate-900">{selectedEmergency.patientName}</h3>
                    <p className="text-xs text-slate-500">{selectedEmergency.patientPhone}</p>
                  </div>
                  <div className="grid grid-cols-2 gap-2 pt-2 border-t border-slate-200/60 text-[10px] font-mono text-slate-500">
                    <div>
                      Village: <span className="font-semibold text-slate-800">{selectedEmergency.village}</span>
                    </div>
                    <div>
                      Priority: <span className="font-bold text-red-600 uppercase">{selectedEmergency.priority}</span>
                    </div>
                    <div>
                      Category: <span className="font-semibold text-slate-800">{selectedEmergency.emergencyType}</span>
                    </div>
                    <div>
                      CHC: <span className="font-semibold text-slate-800">{selectedEmergency.destinationChc}</span>
                    </div>
                  </div>
                </div>

                {/* Vertical Timeline Stages representation */}
                <div className="relative pl-6 space-y-4 pt-1 pb-1">
                  {/* Vertical rule background track */}
                  <div className="absolute left-2.5 top-2 bottom-2 w-0.5 bg-slate-100"></div>

                  {timelineStages.map((stage, sIdx) => {
                    const currentProgressIdx = getTimelineProgressIndex(selectedEmergency.status);
                    const isCompleted = sIdx <= currentProgressIdx;
                    const isActive = sIdx === currentProgressIdx;

                    let nodeStyle = "bg-white border-slate-200 text-slate-400";
                    if (isActive) {
                      nodeStyle = "bg-orange-500 border-orange-500 text-white shadow-md shadow-orange-500/30 animate-pulse ring-4 ring-orange-500/20";
                    } else if (isCompleted) {
                      nodeStyle = "bg-emerald-500 border-emerald-500 text-white";
                    }

                    return (
                      <div key={stage.key} className="relative flex items-start space-x-3.5">
                        {/* Circle Indicator */}
                        <div className={`absolute -left-5 w-5 h-5 rounded-full border-2 flex items-center justify-center text-[10px] font-bold z-10 ${nodeStyle}`}>
                          {isCompleted && !isActive ? "✓" : sIdx + 1}
                        </div>
                        
                        <div>
                          <h4 className={`text-xs font-bold ${
                            isActive ? "text-orange-600 font-extrabold" : isCompleted ? "text-slate-800" : "text-slate-400"
                          }`}>
                            {stage.label}
                          </h4>
                          <p className="text-[10px] text-slate-400 mt-0.5">{stage.desc}</p>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            ) : (
              <div className="py-16 text-center text-slate-400 text-xs font-mono">
                SELECT A CASE TO VIEW LIVE TIMELINE
              </div>
            )}
          </div>
          
          <div className="pt-4 border-t border-slate-50 text-[10px] text-slate-500 font-mono text-center">
            Updated live from volunteer driver GPS devices
          </div>
        </div>

      </div>

      {/* Hospital Status Capacities Grid & Active Volunteer pool */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        
        {/* Hospital Capacity Status Grid (LG: Col 7) */}
        <div className="lg:col-span-7 bg-white border border-slate-100 p-6 rounded-3xl shadow-sm space-y-6">
          <div className="flex items-center justify-between border-b border-slate-50 pb-4">
            <div className="flex items-center space-x-3">
              <div className="p-2.5 bg-indigo-500/10 text-indigo-600 rounded-xl">
                <Ambulance className="w-5 h-5" />
              </div>
              <div>
                <h2 className="text-lg font-bold text-slate-950 font-sans tracking-tight">Health Centre Facilities</h2>
                <p className="text-xs text-slate-500">Real-time beds, ICU and oxygen tracking</p>
              </div>
            </div>
            
            <button
              onClick={() => {
                // Pick first hospital to mock edit
                if (hospitals && hospitals.length > 0) setEditingHospital({ ...hospitals[0] });
              }}
              className="text-[10px] font-bold text-indigo-600 bg-indigo-50 hover:bg-indigo-100 px-3 py-1.5 rounded-lg font-mono"
            >
              UPDATE CAPACITY
            </button>
          </div>

          {/* Hospitals list grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {hospitals.map(h => {
              const occupancy = Math.round(((h.totalBeds - h.bedsAvailable) / h.totalBeds) * 100) || 0;
              let barColor = "bg-emerald-500";
              if (occupancy >= 85) barColor = "bg-red-500";
              else if (occupancy >= 60) barColor = "bg-orange-500";

              return (
                <div key={h.id} className="p-4 bg-slate-50/50 border border-slate-100 rounded-2xl hover:border-slate-200 transition-all space-y-3.5">
                  <div className="flex items-start justify-between">
                    <div>
                      <h4 className="text-xs font-bold text-slate-900">{h.name}</h4>
                      <p className="text-[10px] text-indigo-600 font-mono font-bold mt-0.5">{h.type}</p>
                    </div>
                    
                    {/* Tiny edit button */}
                    <button
                      onClick={() => setEditingHospital({ ...h })}
                      className="p-1 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded"
                    >
                      <Settings2 className="w-3.5 h-3.5" />
                    </button>
                  </div>

                  {/* Bed available tracker bar */}
                  <div className="space-y-1">
                    <div className="flex justify-between text-[10px] font-mono">
                      <span className="text-slate-500">Beds Available</span>
                      <span className="text-slate-900 font-bold">{h.bedsAvailable}/{h.totalBeds} ({occupancy}% Occ)</span>
                    </div>
                    <div className="w-full h-1.5 bg-slate-200 rounded-full overflow-hidden">
                      <div className={`h-full ${barColor}`} style={{ width: `${occupancy}%` }}></div>
                    </div>
                  </div>

                  {/* Resources flags */}
                  <div className="flex flex-wrap gap-1 text-[9px] font-mono font-bold">
                    <span className={`px-2 py-0.5 rounded ${h.hasVentilator ? "bg-emerald-100 text-emerald-800" : "bg-slate-200/60 text-slate-500"}`}>
                      VENT: {h.hasVentilator ? "YES" : "NO"}
                    </span>
                    <span className={`px-2 py-0.5 rounded ${h.hasOxygen ? "bg-emerald-100 text-emerald-800" : "bg-slate-200/60 text-slate-500"}`}>
                      O2: {h.hasOxygen ? "YES" : "NO"}
                    </span>
                    <span className={`px-2 py-0.5 rounded ${h.hasICU ? "bg-emerald-100 text-emerald-800" : "bg-slate-200/60 text-slate-500"}`}>
                      ICU: {h.hasICU ? "YES" : "NO"}
                    </span>
                  </div>

                  <div className="pt-2 border-t border-slate-200/60 flex items-center justify-between text-[10px] font-mono text-slate-500">
                    <span className="flex items-center gap-1">
                      <Phone className="w-3 h-3 text-slate-400" />
                      {h.contactNumber}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Inline Editor Modal/Form overlay if active */}
          {editingHospital && (
            <div className="p-4 bg-slate-900 text-white rounded-2xl space-y-4 border border-slate-800 shadow-xl animate-fadeIn">
              <div className="flex items-center justify-between border-b border-slate-800 pb-2">
                <h4 className="text-xs font-bold font-mono text-indigo-400">ADMIN CONTROL: {editingHospital.name}</h4>
                <button 
                  onClick={() => setEditingHospital(null)} 
                  className="text-[10px] text-slate-400 hover:text-white"
                >
                  CANCEL
                </button>
              </div>

              <div className="grid grid-cols-2 gap-3 text-xs">
                <div>
                  <label className="block text-slate-400 font-mono text-[9px] mb-1">AVAILABLE BEDS</label>
                  <input
                    type="number"
                    value={editingHospital.bedsAvailable}
                    onChange={(e) => setEditingHospital({ ...editingHospital, bedsAvailable: Number(e.target.value) })}
                    className="w-full p-2 bg-slate-850 border border-slate-700 text-white rounded outline-none"
                  />
                </div>
                <div>
                  <label className="block text-slate-400 font-mono text-[9px] mb-1">TOTAL CAPACITY BEDS</label>
                  <input
                    type="number"
                    value={editingHospital.totalBeds}
                    onChange={(e) => setEditingHospital({ ...editingHospital, totalBeds: Number(e.target.value) })}
                    className="w-full p-2 bg-slate-850 border border-slate-700 text-white rounded outline-none"
                  />
                </div>
              </div>

              <div className="flex flex-wrap gap-4 pt-1">
                <label className="flex items-center space-x-2 text-xs font-mono cursor-pointer">
                  <input
                    type="checkbox"
                    checked={editingHospital.hasVentilator}
                    onChange={(e) => setEditingHospital({ ...editingHospital, hasVentilator: e.target.checked })}
                    className="rounded border-slate-700"
                  />
                  <span>Has Ventilators</span>
                </label>
                <label className="flex items-center space-x-2 text-xs font-mono cursor-pointer">
                  <input
                    type="checkbox"
                    checked={editingHospital.hasOxygen}
                    onChange={(e) => setEditingHospital({ ...editingHospital, hasOxygen: e.target.checked })}
                    className="rounded border-slate-700"
                  />
                  <span>Has Oxygen Supp</span>
                </label>
                <label className="flex items-center space-x-2 text-xs font-mono cursor-pointer">
                  <input
                    type="checkbox"
                    checked={editingHospital.hasICU}
                    onChange={(e) => setEditingHospital({ ...editingHospital, hasICU: e.target.checked })}
                    className="rounded border-slate-700"
                  />
                  <span>Has ICU Room</span>
                </label>
              </div>

              <div className="flex justify-end pt-2">
                <button
                  onClick={updateHospitalCapacity}
                  className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded font-mono"
                >
                  SAVE CHANGES
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Volunteer Driver pool control (LG: Col 5) */}
        <div className="lg:col-span-5 bg-white border border-slate-100 p-6 rounded-3xl shadow-sm space-y-6 flex flex-col justify-between">
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2 text-slate-900">
                <Users className="w-5 h-5 text-indigo-600" />
                <h2 className="text-lg font-bold font-sans tracking-tight">Volunteer Fleet</h2>
              </div>
              <span className="bg-indigo-50 text-indigo-600 text-[10px] font-bold font-mono px-2 py-0.5 rounded">
                Active Pool: {drivers.length}
              </span>
            </div>
            <p className="text-xs text-slate-500">
              Shift pilot emergency state logs to available or offline.
            </p>
          </div>

          <div className="flex-grow overflow-y-auto space-y-3.5 max-h-[300px] pr-1">
            {drivers.map(d => {
              const isAvailable = d.status === "available";
              const isBusy = d.status === "busy";

              return (
                <div key={d.id} className="p-3 bg-slate-50/60 border border-slate-100 rounded-2xl flex items-center justify-between gap-2">
                  <div className="space-y-1">
                    <div className="flex items-center space-x-2">
                      <span className={`w-2 h-2 rounded-full ${
                        isAvailable ? "bg-emerald-500 animate-pulse" : isBusy ? "bg-amber-500" : "bg-slate-400"
                      }`}></span>
                      <h4 className="text-xs font-bold text-slate-900">{d.name}</h4>
                    </div>
                    <p className="text-[10px] text-slate-500 font-mono">
                      {d.vehicleType} • <span className="font-semibold text-slate-800">{d.village}</span>
                    </p>
                    <p className="text-[9px] text-slate-400 font-mono">{d.phone}</p>
                  </div>

                  <div className="flex flex-col items-end space-y-1.5" onClick={(ev) => ev.stopPropagation()}>
                    <select
                      value={d.status}
                      onChange={(e) => updateDriverStatus(d.id, e.target.value as any)}
                      className="bg-white border border-slate-200 text-slate-700 text-[10px] rounded-md px-1.5 py-1 outline-none font-bold cursor-pointer"
                    >
                      <option value="available">AVAILABLE</option>
                      <option value="busy">BUSY</option>
                      <option value="offline">OFFLINE</option>
                    </select>
                    
                    <span className="text-[9px] text-indigo-600 font-bold bg-indigo-50 px-1.5 py-0.5 rounded font-mono">
                      ★ {d.rating} ({d.completedTrips} Trips)
                    </span>
                  </div>
                </div>
              );
            })}
          </div>

          <div className="bg-slate-50 p-3.5 rounded-2xl text-[10px] text-slate-500 font-mono flex items-center justify-between">
            <span>Online Pilots: {drivers.filter(d => d.status === "available").length}</span>
            <span>Busy Pilots: {drivers.filter(d => d.status === "busy").length}</span>
          </div>
        </div>

      </div>

      {/* Analytics Trend Visual Charts */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        
        {/* Dispatches Hourly Area Trend Chart */}
        <div className="bg-white border border-slate-100 p-6 rounded-3xl shadow-sm space-y-4">
          <div className="flex items-center justify-between border-b border-slate-50 pb-2">
            <h3 className="text-sm font-bold text-slate-900 font-mono">24H EMERGENCY DISPATCH CURVE</h3>
            <span className="text-[10px] text-slate-400">Hourly trend analysis</span>
          </div>
          
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={hourlyChartData} margin={{ top: 10, right: 10, left: -25, bottom: 0 }}>
                <defs>
                  <linearGradient id="dispatchColor" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#f97316" stopOpacity={0.4}/>
                    <stop offset="95%" stopColor="#f97316" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <XAxis dataKey="time" stroke="#94a3b8" fontSize={9} fontClassName="font-mono" />
                <YAxis stroke="#94a3b8" fontSize={9} fontClassName="font-mono" />
                <Tooltip />
                <Area type="monotone" dataKey="Dispatches" stroke="#f97316" strokeWidth={2} fillOpacity={1} fill="url(#dispatchColor)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Categories Distribution Donut Chart */}
        <div className="bg-white border border-slate-100 p-6 rounded-3xl shadow-sm space-y-4">
          <div className="flex items-center justify-between border-b border-slate-50 pb-2">
            <h3 className="text-sm font-bold text-slate-900 font-mono">EMERGENCY CLASSIFICATION SPLIT</h3>
            <span className="text-[10px] text-slate-400">Total volume distribution</span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 items-center">
            <div className="h-48 flex justify-center">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={pieData}
                    cx="50%"
                    cy="50%"
                    innerRadius={45}
                    outerRadius={65}
                    paddingAngle={3}
                    dataKey="value"
                  >
                    {pieData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            </div>

            <div className="space-y-2.5 font-mono text-[10px]">
              {pieData.map((entry, index) => {
                const total = pieData.reduce((acc, curr) => acc + curr.value, 0) || 1;
                const percentage = Math.round((entry.value / total) * 100);

                return (
                  <div key={entry.name} className="flex items-center justify-between text-slate-700">
                    <div className="flex items-center space-x-2">
                      <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: entry.color }}></span>
                      <span className="font-semibold text-slate-800">{entry.name}</span>
                    </div>
                    <span>{entry.value} Cases ({percentage}%)</span>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

      </div>

    </div>
  );
}
