import React, { useState, useEffect } from "react";
import { 
  Compass, 
  MapPin, 
  Search, 
  Filter, 
  Star, 
  Clock, 
  Navigation, 
  Bike, 
  Car, 
  Phone, 
  AlertCircle, 
  CheckCircle2, 
  Loader2, 
  XCircle,
  TrendingUp,
  ShieldCheck,
  RefreshCw
} from "lucide-react";
import { useAuth } from "../context/AuthContext";

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
  distance: number;
  eta: number;
}

export default function NearbyDrivers() {
  const { token, user } = useAuth();
  const [drivers, setDrivers] = useState<Driver[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  
  // Search & Filters
  const [villageSearch, setVillageSearch] = useState(user?.village || "Sherpur");
  const [statusFilter, setStatusFilter] = useState<"all" | "online" | "available">("online");
  const [vehicleFilter, setVehicleFilter] = useState<string>("all");

  const fetchNearbyDrivers = async () => {
    setLoading(true);
    setError("");
    try {
      const queryParams = new URLSearchParams({
        village: villageSearch,
        vehicleType: vehicleFilter,
        status: statusFilter
      });
      
      const res = await fetch(`/api/drivers/nearby?${queryParams.toString()}`, {
        headers: {
          "Authorization": `Bearer ${token}`
        }
      });
      
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to fetch nearby drivers.");
      }
      
      const data = await res.json();
      setDrivers(data.drivers || []);
    } catch (err: any) {
      console.error(err);
      setError(err.message || "Something went wrong while searching.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (token) {
      fetchNearbyDrivers();
    }
  }, [token, statusFilter, vehicleFilter]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    fetchNearbyDrivers();
  };

  const getStatusBadge = (status: "available" | "busy" | "offline") => {
    switch (status) {
      case "available":
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-emerald-50 text-emerald-700 border border-emerald-200 rounded-full text-[10px] font-black uppercase tracking-wider">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
            Available
          </span>
        );
      case "busy":
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-amber-50 text-amber-700 border border-amber-200 rounded-full text-[10px] font-black uppercase tracking-wider">
            <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse"></span>
            Busy (On Trip)
          </span>
        );
      case "offline":
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-slate-100 text-slate-500 border border-slate-200 rounded-full text-[10px] font-black uppercase tracking-wider">
            <span className="w-1.5 h-1.5 rounded-full bg-slate-400"></span>
            Offline
          </span>
        );
    }
  };

  const getVehicleIcon = (type: string) => {
    const lowerType = type.toLowerCase();
    if (lowerType.includes("tractor")) return <TrendingUp className="w-4 h-4 text-orange-600" />;
    if (lowerType.includes("rickshaw")) return <Bike className="w-4 h-4 text-orange-600" />;
    return <Car className="w-4 h-4 text-orange-600" />;
  };

  return (
    <div id="nearby-drivers-module" className="space-y-6 animate-fade-in">
      {/* Module Header */}
      <div className="border-b border-orange-50 pb-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-black text-slate-900 tracking-tight flex items-center gap-2">
            <Compass className="w-5 h-5 text-orange-600 animate-spin-slow" />
            <span>Nearby Driver Search</span>
          </h2>
          <p className="text-xs text-slate-500 font-semibold mt-0.5">
            Locate verified GramGo drivers nearest to your selected panchayat location in real-time.
          </p>
        </div>
        <button
          onClick={fetchNearbyDrivers}
          disabled={loading}
          className="flex items-center gap-1.5 px-4 py-2 bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-xl text-xs font-black text-slate-700 transition cursor-pointer disabled:opacity-50"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`} />
          <span>Refresh List</span>
        </button>
      </div>

      {/* Map Search & Filter Controls */}
      <div className="bg-white rounded-2xl border border-orange-50/80 p-5 shadow-sm space-y-4">
        <form onSubmit={handleSearchSubmit} className="grid grid-cols-1 md:grid-cols-12 gap-4">
          {/* Village location search */}
          <div className="md:col-span-6 space-y-1.5">
            <label className="text-xs font-black text-slate-700">Panchayat / Village Location</label>
            <div className="relative">
              <span className="absolute left-3.5 top-3 text-slate-400">
                <MapPin className="w-4 h-4 text-orange-500" />
              </span>
              <input
                type="text"
                value={villageSearch}
                onChange={(e) => setVillageSearch(e.target.value)}
                placeholder="Enter village (e.g., Sherpur, Malikpur, Gauspur)"
                className="w-full bg-slate-50 hover:bg-slate-50/50 border border-slate-200 text-slate-800 text-xs font-bold pl-10 pr-24 py-2.5 rounded-xl focus:border-orange-500 outline-none transition"
              />
              <button
                type="submit"
                disabled={loading}
                className="absolute right-1.5 top-1.5 px-3 py-1 bg-orange-600 hover:bg-orange-700 text-white rounded-lg text-[10px] font-black uppercase transition cursor-pointer"
              >
                Search
              </button>
            </div>
          </div>

          {/* Vehicle Type Filter */}
          <div className="md:col-span-3 space-y-1.5">
            <label className="text-xs font-black text-slate-700">Vehicle Type</label>
            <select
              value={vehicleFilter}
              onChange={(e) => setVehicleFilter(e.target.value)}
              className="w-full bg-slate-50 hover:bg-slate-50/50 border border-slate-200 text-slate-800 text-xs font-bold px-3.5 py-2.5 rounded-xl focus:border-orange-500 outline-none transition"
            >
              <option value="all">All Vehicles</option>
              <option value="Auto Rickshaw">Auto Rickshaw</option>
              <option value="Bolero SUV">Bolero SUV</option>
              <option value="Tractor Ambulance">Tractor Ambulance</option>
              <option value="E-Rickshaw">E-Rickshaw</option>
            </select>
          </div>

          {/* Online/Offline Status filter */}
          <div className="md:col-span-3 space-y-1.5">
            <label className="text-xs font-black text-slate-700">Status Filter</label>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value as any)}
              className="w-full bg-slate-50 hover:bg-slate-50/50 border border-slate-200 text-slate-800 text-xs font-bold px-3.5 py-2.5 rounded-xl focus:border-orange-500 outline-none transition"
            >
              <option value="online">Online Only</option>
              <option value="available">Available Only</option>
              <option value="all">All Registered</option>
            </select>
          </div>
        </form>

        {/* Quick Suggestion Chips */}
        <div className="flex flex-wrap gap-2 pt-1">
          <span className="text-[10px] font-bold text-slate-400 self-center">Quick Villages:</span>
          {["Sherpur", "Malikpur", "Gauspur", "Karimpur", "Mohammadabad"].map((v) => (
            <button
              key={v}
              type="button"
              onClick={() => {
                setVillageSearch(v);
                // Trigger query immediately
                setTimeout(() => {
                  fetchNearbyDrivers();
                }, 50);
              }}
              className={`px-2.5 py-1 text-[10px] font-bold rounded-lg border transition cursor-pointer ${
                villageSearch.toLowerCase() === v.toLowerCase()
                  ? "bg-orange-50 border-orange-200 text-orange-700"
                  : "bg-white border-slate-200 hover:bg-slate-50 text-slate-600"
              }`}
            >
              {v}
            </button>
          ))}
        </div>
      </div>

      {/* Driver List Display Area */}
      {loading ? (
        <div className="flex flex-col items-center justify-center py-16 bg-white border border-slate-100 rounded-2xl">
          <Loader2 className="w-8 h-8 text-orange-600 animate-spin mb-2" />
          <span className="text-xs font-black text-slate-500">Scanning satellite panchayat drivers...</span>
        </div>
      ) : error ? (
        <div className="p-6 bg-red-50 border border-red-100 rounded-2xl text-center space-y-2">
          <AlertCircle className="w-8 h-8 text-red-500 mx-auto" />
          <h4 className="text-xs font-black text-red-800 uppercase tracking-wider">Search Error</h4>
          <p className="text-xs font-bold text-red-600">{error}</p>
        </div>
      ) : drivers.length === 0 ? (
        <div className="py-16 text-center bg-white border border-dashed border-slate-200 rounded-2xl space-y-3">
          <Compass className="w-10 h-10 text-slate-300 mx-auto" />
          <div className="max-w-md mx-auto px-4">
            <h4 className="text-sm font-black text-slate-800">No Nearby Drivers Located</h4>
            <p className="text-xs text-slate-400 font-bold mt-1 leading-normal">
              No verified drivers match your search filters in {villageSearch} village right now. Try expanding your search location or filtering "All Registered" drivers.
            </p>
          </div>
        </div>
      ) : (
        /* Driver Grid / Card List */
        <div className="space-y-4">
          <div className="flex justify-between items-center px-1">
            <span className="text-[11px] font-black text-slate-400 uppercase tracking-widest">
              {drivers.length} MATCHING HEROES FOUND (SORTED BY NEAREST DISTANCE)
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {drivers.map((drv) => (
              /* Driver Card */
              <div 
                key={drv.id}
                className="bg-white rounded-2xl border border-orange-50/80 p-5 shadow-sm hover:shadow-md transition-all duration-300 flex flex-col justify-between gap-4 group relative overflow-hidden"
              >
                {/* Visual Accent */}
                <div className="absolute top-0 left-0 w-1.5 h-full bg-orange-600 transition-all group-hover:bg-orange-500" />
                
                {/* Driver Meta Data */}
                <div className="pl-2 space-y-3">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <h4 className="text-sm font-black text-slate-900 flex items-center gap-1.5">
                        {drv.name}
                        <ShieldCheck className="w-4 h-4 text-emerald-600" />
                      </h4>
                      <p className="text-[10px] text-slate-400 font-extrabold uppercase mt-0.5 tracking-wider">
                        Driver ID: {drv.id} • Village: <span className="text-slate-600">{drv.village}</span>
                      </p>
                    </div>
                    {getStatusBadge(drv.status)}
                  </div>

                  {/* Vehicle Information */}
                  <div className="flex items-center gap-2 px-3 py-2 bg-slate-50 rounded-xl border border-slate-100">
                    <span className="p-1 bg-white border border-slate-100 rounded-lg shadow-sm">
                      {getVehicleIcon(drv.vehicleType)}
                    </span>
                    <div>
                      <p className="text-xs font-extrabold text-slate-800">{drv.vehicleType}</p>
                      <p className="text-[9px] font-black text-slate-400 uppercase">{drv.vehicleNumber}</p>
                    </div>
                  </div>

                  {/* Ratings and Stats Row */}
                  <div className="grid grid-cols-3 gap-2 text-center pt-1">
                    <div className="p-2 bg-amber-500/[0.04] border border-amber-500/10 rounded-xl">
                      <span className="text-[9px] font-black text-slate-400 uppercase block">RATING</span>
                      <span className="text-xs font-black text-amber-700 mt-1 flex items-center justify-center gap-0.5">
                        <Star className="w-3.5 h-3.5 text-amber-500 fill-amber-500" />
                        {drv.rating.toFixed(1)}
                      </span>
                    </div>
                    <div className="p-2 bg-orange-500/[0.04] border border-orange-500/10 rounded-xl">
                      <span className="text-[9px] font-black text-slate-400 uppercase block">TRIPS</span>
                      <span className="text-xs font-black text-orange-800 mt-1 block">
                        {drv.completedTrips} Completed
                      </span>
                    </div>
                    <div className="p-2 bg-emerald-500/[0.04] border border-emerald-500/10 rounded-xl">
                      <span className="text-[9px] font-black text-slate-400 uppercase block">STATUS</span>
                      <span className="text-xs font-black text-emerald-800 mt-1 block capitalize">
                        {drv.status === "available" ? "Ready" : drv.status}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Distance and ETA Bottom Panel */}
                <div className="border-t border-slate-100 pt-3.5 pl-2 flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <div>
                      <span className="text-[9px] font-black text-slate-400 uppercase block">DISTANCE</span>
                      <span className="text-xs font-extrabold text-slate-800 flex items-center gap-1 mt-0.5">
                        <Navigation className="w-3.5 h-3.5 text-orange-600 rotate-45" />
                        {drv.distance} KM
                      </span>
                    </div>
                    <div>
                      <span className="text-[9px] font-black text-slate-400 uppercase block">ETA</span>
                      <span className="text-xs font-extrabold text-slate-800 flex items-center gap-1 mt-0.5">
                        <Clock className="w-3.5 h-3.5 text-orange-600" />
                        {drv.eta} MINS
                      </span>
                    </div>
                  </div>

                  {/* Call Action Button */}
                  <a
                    href={`tel:${drv.phone}`}
                    className="flex items-center gap-1 px-3 py-1.5 bg-slate-900 hover:bg-orange-600 hover:text-white text-white rounded-xl text-[10px] font-black uppercase tracking-wider transition cursor-pointer"
                  >
                    <Phone className="w-3.5 h-3.5" />
                    <span>Call Driver</span>
                  </a>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
