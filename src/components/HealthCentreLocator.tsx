import { useState, useEffect, useMemo, useRef } from "react";
import { 
  Building, 
  Phone, 
  MapPin, 
  Activity, 
  ShieldAlert, 
  Users, 
  PhoneCall, 
  ListOrdered,
  BookOpen,
  Info,
  Search,
  Filter,
  Navigation,
  Compass,
  AlertTriangle,
  CheckCircle,
  HelpCircle,
  TrendingUp,
  Map as MapIcon,
  Layers,
  ChevronRight,
  PhoneForwarded,
  Heart,
  Maximize2
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { Hospital } from "../types";
import { APIProvider, Map, AdvancedMarker, useMap } from "@vis.gl/react-google-maps";

const GOOGLE_MAPS_API_KEY =
  (import.meta as any).env?.VITE_GOOGLE_MAPS_PLATFORM_KEY ||
  "";

const hasValidKey = Boolean(GOOGLE_MAPS_API_KEY) && 
  GOOGLE_MAPS_API_KEY !== "YOUR_API_KEY" && 
  GOOGLE_MAPS_API_KEY.trim().length > 10;

// Village Coordinates in Ghazipur ecosystem for dynamic distance math
const VILLAGES = [
  { name: "Sherpur", lat: 25.5721, lng: 83.5824, label: "Sherpur Village (Panchayat Head)" },
  { name: "Malikpur", lat: 25.5901, lng: 83.5611, label: "Malikpur (Rural Fields Block)" },
  { name: "Ghazipur City", lat: 25.5812, lng: 83.5714, label: "Ghazipur Town (Nodal Hub)" },
  { name: "Mohammadabad", lat: 25.6142, lng: 83.7548, label: "Mohammadabad Sub-District Sector" },
  { name: "Yusufpur", lat: 25.6085, lng: 83.7312, label: "Yusufpur (Railway Station Zone)" }
];

// Helper to calculate mathematical distance
const calculateHaversineDistance = (lat1: number, lon1: number, lat2: number, lon2: number): number => {
  const R = 6371; // Radius of Earth in km
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a = 
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return parseFloat((R * c).toFixed(1));
};

export default function HealthCentreLocator() {
  const [hospitals, setHospitals] = useState<Hospital[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  // Search & Filters state
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedType, setSelectedType] = useState<string>("all");
  const [maxDistance, setMaxDistance] = useState<number>(30);
  
  // Equipments Filter
  const [filterVentilator, setFilterVentilator] = useState(false);
  const [filterICU, setFilterICU] = useState(false);
  const [filterOxygen, setFilterOxygen] = useState(false);
  const [filterBloodBank, setFilterBloodBank] = useState(false);

  // Simulated Location Selection (defaults to Sherpur)
  const [selectedVillage, setSelectedVillage] = useState(VILLAGES[0]);
  
  // Selected hospital for map navigation focus and routing path
  const [selectedHospital, setSelectedHospital] = useState<Hospital | null>(null);
  const [sirenMode, setSirenMode] = useState<boolean>(false);
  const [activeTab, setActiveTab] = useState<"list" | "map">("list"); // Mobile View Switcher

  // Call simulation state
  const [simulatedCall, setSimulatedCall] = useState<Hospital | null>(null);
  const [callingSeconds, setCallingSeconds] = useState(0);
  const [callConnected, setCallConnected] = useState(false);

  // Offline medical guide
  const [activeGuide, setActiveGuide] = useState<"snakebite" | "maternity" | "heatstroke" | "accident">("snakebite");

  // Fetch Hospitals
  const fetchHospitals = async () => {
    setLoading(true);
    setError(null);
    try {
      const queryParams = new URLSearchParams({
        q: searchQuery,
        type: selectedType,
        hasVentilator: filterVentilator.toString(),
        hasICU: filterICU.toString(),
        hasBloodBank: filterBloodBank.toString(),
        hasOxygen: filterOxygen.toString(),
        maxDistance: maxDistance.toString()
      });

      const res = await fetch(`/api/hospitals?${queryParams}`);
      if (res.ok) {
        const data = await res.json();
        setHospitals(data);
      } else {
        throw new Error("Failed to load clinical directory.");
      }
    } catch (err: any) {
      setError(err.message || "Network error loading hospitals.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchHospitals();
  }, [searchQuery, selectedType, filterVentilator, filterICU, filterOxygen, filterBloodBank, maxDistance]);

  // Dynamically compute distance & ETA on the fly from selected user location
  const hospitalsWithDynamicMath = useMemo(() => {
    return hospitals.map(h => {
      const dist = calculateHaversineDistance(selectedVillage.lat, selectedVillage.lng, h.lat, h.lng);
      const speedKmh = sirenMode ? 65 : 40; // Siren vs Standard rural speed
      const etaMin = Math.ceil((dist / speedKmh) * 60) + 3; // add 3 mins baseline setup time
      return {
        ...h,
        distanceKm: dist,
        etaMinutes: etaMin
      };
    }).filter(h => h.distanceKm <= maxDistance)
      .sort((a, b) => a.distanceKm - b.distanceKm);
  }, [hospitals, selectedVillage, sirenMode, maxDistance]);

  // Set default selected hospital on load
  useEffect(() => {
    if (hospitalsWithDynamicMath.length > 0 && !selectedHospital) {
      setSelectedHospital(hospitalsWithDynamicMath[0]);
    }
  }, [hospitalsWithDynamicMath]);

  // Simulate Hospital Call Timer
  useEffect(() => {
    let interval: any;
    if (simulatedCall) {
      interval = setInterval(() => {
        setCallingSeconds(prev => {
          if (prev >= 2) {
            setCallConnected(true);
          }
          return prev + 1;
        });
      }, 1000);
    } else {
      setCallingSeconds(0);
      setCallConnected(false);
    }
    return () => clearInterval(interval);
  }, [simulatedCall]);

  const handleCallSimulation = (hospital: Hospital) => {
    setSimulatedCall(hospital);
  };

  const closeCall = () => {
    setSimulatedCall(null);
  };

  // Simulated Map navigation instructions list
  const navigationSteps = useMemo(() => {
    if (!selectedHospital) return [];
    const steps = [
      `Head outward from ${selectedVillage.name} local Panchayat block.`,
      `Merge onto the primary rural link road towards Ghazipur highway corridor.`,
      sirenMode 
        ? `🚨 Siren Active: Clearing path through rural junction crossings.` 
        : `Drive carefully past agricultural fields and school zones.`,
      `Enter the main entrance compound of ${selectedHospital.name}.`
    ];
    return steps;
  }, [selectedHospital, selectedVillage, sirenMode]);

  // Total Beds and ICU summary
  const totalBedsAvailable = hospitalsWithDynamicMath.reduce((sum, h) => sum + h.bedsAvailable, 0);
  const icuHospitalsCount = hospitalsWithDynamicMath.filter(h => h.hasICU).length;

  const guides = {
    snakebite: {
      title: "🐍 Snakebite First-Aid Protocol",
      description: "Vital instructions for venomous snakebites in rural fields.",
      steps: [
        "Keep the victim completely calm and still. Movement spreads venom faster.",
        "Immobilise the bitten limb with a loose splint. Keep it below heart level.",
        "Remove any tight rings, anklets, or clothing near the bite.",
        "⚠️ DO NOT cut the wound, suck out venom, or apply tight tourniquets.",
        "Call GramGo immediately to dispatch transport to a hospital with anti-venom (ASV)."
      ]
    },
    maternity: {
      title: "🤰 Maternity / Birth Preparation",
      description: "Steps to assist an expectant mother waiting for dispatch.",
      steps: [
        "Encourage the mother to lie comfortably on her left side to maximize baby blood flow.",
        "Reassure her and guide her to take slow, deep, calming breaths.",
        "Gather clean towels, warm water, fresh cotton blankets, and medical card.",
        "Ensure her transport files, ID, and ASHA card are gathered in one folder.",
        "Keep the local ASHA or auxiliary nurse updated via continuous phone calls."
      ]
    },
    heatstroke: {
      title: "🌡️ Heatstroke & Dehydration",
      description: "Immediate actions for severe summer agricultural heat distress.",
      steps: [
        "Move the victim immediately to a cool, shaded place with fresh breeze.",
        "Loosen their clothing and apply cool, wet cloths over their body.",
        "Fanning the victim is essential to lower core body temperature.",
        "Give them cool water or ORS (Oral Rehydration Salts) only if fully conscious.",
        "If unconscious or fever exceeds 103°F, book emergency transport instantly."
      ]
    },
    accident: {
      title: "🩹 Bleeding & Wound Trauma",
      description: "How to manage road accidents or farming machine injuries.",
      steps: [
        "Apply firm, continuous pressure directly on the bleeding wound with a clean cloth.",
        "Keep the bleeding limb elevated above heart level if possible.",
        "⚠️ DO NOT remove deeply embedded objects; pack bandages around them to stabilise.",
        "If the patient feels dizzy or cold, lay them flat and cover with blankets.",
        "Transport urgently to CHC Sherpur or District Hospital for surgical suture."
      ]
    }
  };

  return (
    <div id="health-centre-locator" className="max-w-7xl mx-auto px-4 py-8 sm:px-6 lg:px-8 space-y-8">
      {/* Page Header */}
      <div className="bg-gradient-to-r from-sky-900 to-slate-900 text-white p-6 sm:p-8 rounded-3xl shadow-xl flex flex-col md:flex-row md:items-center justify-between gap-6 border border-slate-800">
        <div className="space-y-2">
          <div className="inline-flex items-center px-2.5 py-1 bg-sky-500/20 text-sky-300 rounded-full text-[10px] font-black uppercase tracking-widest border border-sky-500/30">
            <Building className="w-3.5 h-3.5 mr-1.5 text-sky-400" />
            <span>Smart Regional Medical Directory • स्वास्थ्य केंद्र</span>
          </div>
          <h1 className="text-2xl sm:text-3.5xl font-black tracking-tight leading-none text-white">
            GramGo Hospital Locator
          </h1>
          <p className="text-xs sm:text-sm text-slate-300 max-w-xl font-medium">
            Locate critical trauma centres, ICU beds, oxygen supplies, and anti-venom stocks. Track real-time rural distances and ETA routes.
          </p>
        </div>

        {/* Dynamic Regional Stat counters */}
        <div className="grid grid-cols-2 gap-3 sm:w-auto w-full">
          <div className="bg-slate-800/60 p-3.5 rounded-2xl border border-slate-700 text-center">
            <span className="block text-xl font-black text-emerald-400">{totalBedsAvailable}</span>
            <span className="block text-[10px] uppercase font-bold text-slate-400 mt-0.5">Beds Available</span>
          </div>
          <div className="bg-slate-800/60 p-3.5 rounded-2xl border border-slate-700 text-center">
            <span className="block text-xl font-black text-sky-400">{icuHospitalsCount}</span>
            <span className="block text-[10px] uppercase font-bold text-slate-400 mt-0.5">ICU Facilities</span>
          </div>
        </div>
      </div>

      {/* Floating Call Simulator overlay */}
      <AnimatePresence>
        {simulatedCall && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm z-50 flex items-center justify-center p-4"
          >
            <motion.div 
              initial={{ scale: 0.9, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.9, y: 20 }}
              className="bg-slate-900 border border-slate-800 rounded-3xl p-6 sm:p-8 text-center text-white max-w-sm w-full shadow-2xl relative overflow-hidden"
            >
              {/* Grid backdrop */}
              <div className="absolute inset-0 bg-[radial-gradient(#1e293b_1px,transparent_1px)] [background-size:16px_16px] opacity-10 pointer-events-none" />

              <div className="w-16 h-16 bg-sky-500/10 border border-sky-500/20 text-sky-400 rounded-full flex items-center justify-center mx-auto mb-4 animate-pulse">
                <Phone className="w-8 h-8" />
              </div>

              <div className="space-y-1">
                <span className="text-[10px] uppercase text-sky-400 font-extrabold tracking-widest block">Connecting Dial-In...</span>
                <h3 className="text-lg font-black text-white">{simulatedCall.name}</h3>
                <p className="text-xs text-slate-400 font-semibold">📞 {simulatedCall.contactNumber}</p>
              </div>

              <div className="my-6">
                {callConnected ? (
                  <div className="space-y-2">
                    <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 text-[10px] font-black uppercase tracking-widest rounded-full">
                      <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping" />
                      Connected
                    </span>
                    <p className="text-xs text-slate-300 font-medium px-4">
                      "Emergency Room desk active. How can we prepare for your arrival?"
                    </p>
                    <p className="text-[11px] text-slate-500 font-mono">Call duration: {callingSeconds - 2}s</p>
                  </div>
                ) : (
                  <div className="space-y-2">
                    <span className="inline-flex items-center gap-1 px-3 py-1 bg-amber-500/10 text-amber-400 border border-amber-500/20 text-[10px] font-black uppercase tracking-widest rounded-full animate-pulse">
                      Calling...
                    </span>
                    <p className="text-xs text-slate-400 font-medium">Bypassing congestion. Connecting direct priority lines.</p>
                  </div>
                )}
              </div>

              <button 
                onClick={closeCall}
                className="w-full py-3 bg-red-600 hover:bg-red-700 text-white text-xs font-black uppercase tracking-wider rounded-xl transition duration-150 cursor-pointer shadow-md shadow-red-900/20"
              >
                Disconnect Call
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Main Core Layout Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        
        {/* Left column: Search, Filters & Hospital cards list (col-span-7) */}
        <div className="lg:col-span-7 space-y-6">
          
          {/* Controls Box */}
          <div className="bg-white rounded-3xl border border-slate-100 p-5 shadow-sm space-y-4">
            
            {/* Row 1: Search & Simulated User Location */}
            <div className="grid grid-cols-1 md:grid-cols-12 gap-3">
              <div className="md:col-span-7 relative">
                <Search className="absolute left-3.5 top-3 w-4 h-4 text-slate-400" />
                <input 
                  type="text"
                  placeholder="Search hospitals, village or medical specialties..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 text-slate-800 text-xs font-semibold rounded-2xl outline-none focus:ring-1 focus:ring-sky-500 focus:border-sky-500 transition-all placeholder:text-slate-400"
                />
              </div>

              {/* simulated location dropdown */}
              <div className="md:col-span-5 space-y-1">
                <select
                  value={selectedVillage.name}
                  onChange={(e) => {
                    const found = VILLAGES.find(v => v.name === e.target.value);
                    if (found) setSelectedVillage(found);
                  }}
                  className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 text-slate-800 text-xs font-black rounded-2xl outline-none focus:ring-1 focus:ring-sky-500 transition-all cursor-pointer"
                >
                  {VILLAGES.map((v) => (
                    <option key={v.name} value={v.name}>
                      📍 Center: {v.label}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Row 2: Equipment fast filter switches */}
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-[10px] text-slate-400 font-extrabold uppercase tracking-widest mr-2 flex items-center gap-1">
                <Filter className="w-3 h-3" /> Filters:
              </span>
              <button 
                onClick={() => setFilterVentilator(p => !p)}
                className={`px-3 py-1.5 rounded-full text-[11px] font-bold border transition ${
                  filterVentilator 
                    ? "bg-sky-50 text-sky-700 border-sky-300 shadow-sm" 
                    : "bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100"
                }`}
              >
                💨 Ventilator
              </button>
              <button 
                onClick={() => setFilterICU(p => !p)}
                className={`px-3 py-1.5 rounded-full text-[11px] font-bold border transition ${
                  filterICU 
                    ? "bg-sky-50 text-sky-700 border-sky-300 shadow-sm" 
                    : "bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100"
                }`}
              >
                🏥 ICU beds
              </button>
              <button 
                onClick={() => setFilterOxygen(p => !p)}
                className={`px-3 py-1.5 rounded-full text-[11px] font-bold border transition ${
                  filterOxygen 
                    ? "bg-sky-50 text-sky-700 border-sky-300 shadow-sm" 
                    : "bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100"
                }`}
              >
                💨 Oxygen Cylinders
              </button>
              <button 
                onClick={() => setFilterBloodBank(p => !p)}
                className={`px-3 py-1.5 rounded-full text-[11px] font-bold border transition ${
                  filterBloodBank 
                    ? "bg-sky-50 text-sky-700 border-sky-300 shadow-sm" 
                    : "bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100"
                }`}
              >
                🩸 Blood Bank
              </button>
            </div>

            {/* Row 3: Facility Type Tabs & Max Distance Slider */}
            <div className="grid grid-cols-1 md:grid-cols-12 gap-4 pt-2 border-t border-slate-100 items-center">
              <div className="md:col-span-7 flex items-center space-x-1.5 overflow-x-auto pb-1">
                {["all", "CHC", "PHC", "District Hospital", "Private Hospital"].map(type => (
                  <button
                    key={type}
                    onClick={() => setSelectedType(type)}
                    className={`px-3 py-1.5 text-center rounded-xl text-[10px] font-black uppercase tracking-wider border whitespace-nowrap transition ${
                      selectedType === type
                        ? "bg-slate-900 text-white border-slate-900"
                        : "bg-slate-50 text-slate-500 border-slate-200 hover:bg-slate-100"
                    }`}
                  >
                    {type === "all" ? "🏥 All Types" : type}
                  </button>
                ))}
              </div>

              {/* Slider */}
              <div className="md:col-span-5 flex items-center space-x-3 bg-slate-50 px-3.5 py-1.5 rounded-2xl border border-slate-100">
                <span className="text-[10px] text-slate-400 font-extrabold uppercase tracking-wider whitespace-nowrap">Distance:</span>
                <input 
                  type="range"
                  min="5"
                  max="35"
                  step="5"
                  value={maxDistance}
                  onChange={(e) => setMaxDistance(parseInt(e.target.value))}
                  className="w-full accent-sky-600 cursor-pointer"
                />
                <span className="text-xs font-black text-slate-700 whitespace-nowrap">{maxDistance} km</span>
              </div>
            </div>

            {/* Siren Toggle Banner */}
            <div className="bg-orange-50 border border-orange-100 rounded-2xl p-3 flex items-center justify-between">
              <div className="flex items-center space-x-2.5">
                <div className={`w-8 h-8 rounded-xl flex items-center justify-center ${sirenMode ? "bg-orange-500 text-white animate-pulse" : "bg-orange-100 text-orange-600"}`}>
                  <ShieldAlert className="w-4 h-4" />
                </div>
                <div>
                  <span className="text-xs font-black text-slate-800 block">Sirens Emergency Transit Math</span>
                  <p className="text-[10px] text-slate-500 font-semibold">Simulate faster route times during active ambulance transport.</p>
                </div>
              </div>
              <button 
                onClick={() => setSirenMode(p => !p)}
                className={`px-4 py-1.5 rounded-xl text-xs font-black uppercase tracking-wider transition ${
                  sirenMode 
                    ? "bg-orange-500 text-white" 
                    : "bg-white text-orange-600 border border-orange-200 hover:bg-orange-50"
                }`}
              >
                {sirenMode ? "🚨 Active" : "Standard"}
              </button>
            </div>

          </div>

          {/* Hospital List Cards */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-[10px] text-slate-400 font-extrabold uppercase tracking-widest block">
                Found {hospitalsWithDynamicMath.length} matching health facilities
              </span>
              {/* Mobile View Toggle */}
              <div className="lg:hidden flex bg-white rounded-xl border border-slate-200 p-0.5">
                <button 
                  onClick={() => setActiveTab("list")}
                  className={`px-3 py-1 rounded-lg text-[10px] font-black uppercase tracking-wider transition ${activeTab === "list" ? "bg-slate-950 text-white" : "text-slate-500"}`}
                >
                  List
                </button>
                <button 
                  onClick={() => setActiveTab("map")}
                  className={`px-3 py-1 rounded-lg text-[10px] font-black uppercase tracking-wider transition ${activeTab === "map" ? "bg-slate-950 text-white" : "text-slate-500"}`}
                >
                  Map View
                </button>
              </div>
            </div>

            {loading ? (
              <div className="text-center py-16 bg-white rounded-3xl border border-slate-100 shadow-sm">
                <Activity className="w-8 h-8 text-sky-500 animate-spin mx-auto" />
                <span className="text-xs text-slate-500 mt-2 block font-semibold">Searching clinical grid...</span>
              </div>
            ) : hospitalsWithDynamicMath.length === 0 ? (
              <div className="text-center py-16 bg-white rounded-3xl border border-slate-100 shadow-sm space-y-3">
                <AlertTriangle className="w-10 h-10 text-slate-300 mx-auto" />
                <h3 className="text-sm font-black text-slate-800 uppercase tracking-wider">No matching facilities</h3>
                <p className="text-xs text-slate-400 px-6 max-w-sm mx-auto font-medium">
                  Try adjusting the distance slider, removing equipment filters, or resetting your search term.
                </p>
                <button 
                  onClick={() => {
                    setSearchQuery("");
                    setSelectedType("all");
                    setMaxDistance(30);
                    setFilterVentilator(false);
                    setFilterICU(false);
                    setFilterOxygen(false);
                    setFilterBloodBank(false);
                  }}
                  className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white text-[10px] font-black uppercase tracking-widest rounded-xl"
                >
                  Reset Filters
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-1 gap-3">
                {hospitalsWithDynamicMath.map((h) => {
                  const isSelected = selectedHospital?.id === h.id;
                  const bedsPercent = Math.min(100, Math.ceil((h.bedsAvailable / h.totalBeds) * 100));
                  return (
                    <div 
                      key={h.id}
                      onClick={() => setSelectedHospital(h)}
                      className={`p-5 rounded-3xl border text-slate-800 transition-all duration-200 cursor-pointer ${
                        isSelected 
                          ? "bg-slate-900 border-slate-900 text-white shadow-xl ring-2 ring-sky-500" 
                          : "bg-white border-slate-100 hover:border-sky-200 hover:shadow-sm"
                      }`}
                    >
                      <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
                        <div className="space-y-1">
                          <div className="flex items-center flex-wrap gap-2">
                            <h3 className="font-black text-sm">{h.name}</h3>
                            <span className={`px-2 py-0.5 rounded-md text-[9px] font-black uppercase tracking-wider ${
                              isSelected 
                                ? "bg-sky-500/20 text-sky-300 border border-sky-400/30" 
                                : "bg-sky-50 text-sky-700 border border-sky-100"
                            }`}>
                              {h.type}
                            </span>
                          </div>

                          <p className={`text-[11px] font-semibold flex items-center space-x-1.5 ${isSelected ? "text-slate-300" : "text-slate-500"}`}>
                            <MapPin className="w-3.5 h-3.5 flex-shrink-0" />
                            <span>Village: {h.village} District: {h.district}</span>
                          </p>
                        </div>

                        {/* Distance & ETA badges */}
                        <div className="flex items-center gap-2">
                          <div className={`p-2 rounded-2xl text-center min-w-16 border ${
                            isSelected 
                              ? "bg-slate-800 border-slate-700" 
                              : "bg-slate-50 border-slate-150"
                          }`}>
                            <span className="block text-xs font-black leading-none">{h.distanceKm}</span>
                            <span className="block text-[8px] uppercase font-bold text-slate-400 mt-0.5">Km Dist</span>
                          </div>
                          
                          <div className={`p-2 rounded-2xl text-center min-w-16 border ${
                            isSelected 
                              ? "bg-emerald-950 border-emerald-900 text-emerald-300" 
                              : "bg-emerald-50 border-emerald-100 text-emerald-700"
                          }`}>
                            <span className="block text-xs font-black leading-none">{h.etaMinutes} mins</span>
                            <span className="block text-[8px] uppercase font-bold text-slate-400 mt-0.5">ETA Drive</span>
                          </div>
                        </div>
                      </div>

                      {/* Beds progress bar */}
                      <div className="mt-4 space-y-1.5">
                        <div className="flex justify-between text-[10px] font-extrabold uppercase">
                          <span className={isSelected ? "text-slate-300" : "text-slate-400"}>Beds Occupancy & Availability</span>
                          <span className={isSelected ? "text-emerald-400" : "text-emerald-600"}>{h.bedsAvailable} / {h.totalBeds} Beds Free</span>
                        </div>
                        <div className="w-full bg-slate-200 rounded-full h-1.5 overflow-hidden">
                          <div 
                            className={`h-full rounded-full transition-all duration-300 ${h.bedsAvailable > 10 ? "bg-emerald-500" : "bg-rose-500"}`}
                            style={{ width: `${bedsPercent}%` }}
                          />
                        </div>
                      </div>

                      {/* Facilities pill tags */}
                      <div className="mt-4 flex flex-wrap gap-1.5">
                        {h.hasVentilator && (
                          <span className={`px-2 py-0.5 rounded-lg text-[9px] font-bold ${
                            isSelected ? "bg-slate-800 text-slate-200 border border-slate-700" : "bg-slate-50 text-slate-600 border border-slate-100"
                          }`}>
                            💨 Ventilator
                          </span>
                        )}
                        {h.hasICU && (
                          <span className={`px-2 py-0.5 rounded-lg text-[9px] font-bold ${
                            isSelected ? "bg-slate-800 text-slate-200 border border-slate-700" : "bg-slate-50 text-slate-600 border border-slate-100"
                          }`}>
                            🏥 ICU Care
                          </span>
                        )}
                        {h.hasOxygen && (
                          <span className={`px-2 py-0.5 rounded-lg text-[9px] font-bold ${
                            isSelected ? "bg-slate-800 text-slate-200 border border-slate-700" : "bg-slate-50 text-slate-600 border border-slate-100"
                          }`}>
                            💨 Oxygen Cylinders
                          </span>
                        )}
                        {h.hasBloodBank && (
                          <span className={`px-2 py-0.5 rounded-lg text-[9px] font-bold ${
                            isSelected ? "bg-slate-800 text-slate-200 border border-slate-700" : "bg-slate-50 text-slate-600 border border-slate-100"
                          }`}>
                            🩸 Blood Bank
                          </span>
                        )}
                      </div>

                      <p className={`text-[10px] italic mt-3 border-t pt-2.5 ${isSelected ? "border-slate-800 text-slate-400" : "border-slate-100 text-slate-500"}`}>
                        ⭐ Specialty: {h.specialty}
                      </p>

                      {/* Card Action Buttons */}
                      <div className="mt-4 grid grid-cols-2 gap-2 pt-2 border-t border-slate-800/20">
                        <button 
                          onClick={(e) => {
                            e.stopPropagation();
                            handleCallSimulation(h);
                          }}
                          className={`w-full py-2.5 rounded-xl text-[10px] font-black uppercase tracking-wider flex items-center justify-center space-x-1.5 transition cursor-pointer ${
                            isSelected 
                              ? "bg-slate-800 hover:bg-slate-700 text-white" 
                              : "bg-slate-50 hover:bg-slate-100 text-slate-700 border border-slate-200"
                          }`}
                        >
                          <Phone className="w-3.5 h-3.5" />
                          <span>Call Hospital</span>
                        </button>

                        <button 
                          onClick={(e) => {
                            e.stopPropagation();
                            setSelectedHospital(h);
                            // Highlight or navigate action triggers map plot
                          }}
                          className={`w-full py-2.5 rounded-xl text-[10px] font-black uppercase tracking-wider flex items-center justify-center space-x-1.5 transition cursor-pointer ${
                            isSelected 
                              ? "bg-sky-500 hover:bg-sky-600 text-white" 
                              : "bg-sky-550 hover:bg-sky-600 text-sky-900 border border-sky-100"
                          }`}
                        >
                          <Navigation className="w-3.5 h-3.5" />
                          <span>Plot Nav Route</span>
                        </button>
                      </div>

                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Life Saving Emergency Guides Section */}
          <div className="bg-white rounded-3xl border border-slate-100 p-6 shadow-sm space-y-6">
            <div className="border-b border-slate-100 pb-4">
              <h3 className="text-sm font-black text-slate-900 flex items-center space-x-1.5">
                <BookOpen className="w-4 h-4 text-sky-600" />
                <span>First Responder Offline Clinical Manual</span>
              </h3>
              <p className="text-xs text-slate-400">Essential protocols recommended by medical officers while transport arrives.</p>
            </div>

            {/* Selector Grid Buttons */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              {[
                { id: "snakebite", label: "🐍 Snakebite" },
                { id: "maternity", label: "🤰 Pregnancy" },
                { id: "heatstroke", label: "🌡️ Heatstroke" },
                { id: "accident", label: "🩹 Trauma Care" }
              ].map((b) => (
                <button
                  key={b.id}
                  onClick={() => setActiveGuide(b.id as any)}
                  className={`py-2 px-3 text-center rounded-xl text-[10px] font-black uppercase tracking-wider border transition cursor-pointer ${
                    activeGuide === b.id
                      ? "bg-sky-50 border-sky-300 text-sky-700 shadow-inner"
                      : "bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100"
                  }`}
                >
                  {b.label}
                </button>
              ))}
            </div>

            {/* Display active first aid steps */}
            <div className="p-5 bg-sky-50/50 border border-sky-100/60 rounded-2xl space-y-3">
              <div>
                <h4 className="font-extrabold text-xs text-slate-950 uppercase tracking-wider">{guides[activeGuide].title}</h4>
                <p className="text-xs text-slate-500 mt-0.5">{guides[activeGuide].description}</p>
              </div>

              <ol className="list-decimal pl-4 space-y-2 text-xs text-slate-700 font-semibold leading-relaxed">
                {guides[activeGuide].steps.map((st, i) => (
                  <li key={i}>{st}</li>
                ))}
              </ol>
            </div>

            {/* Warning Info footer */}
            <div className="flex items-start space-x-2 text-[10px] text-slate-400 bg-slate-50 p-3 rounded-xl border border-slate-100">
              <Info className="w-4 h-4 text-slate-400 flex-shrink-0 mt-0.5" />
              <span>
                These clinical guidelines are adapted from Ministry of Health (MoHFW) training sheets compiled for Rural ASHA, Anganwadi, and Panchayati first-responders.
              </span>
            </div>
          </div>

        </div>

        {/* Right column: Interactive GPS Map Visualization & Step-by-Step Directions (col-span-5) */}
        <div className={`lg:col-span-5 space-y-6 ${activeTab === "map" ? "block" : "hidden lg:block"}`}>
          
          {/* Map card component */}
          <div className="bg-slate-900 rounded-3xl border border-slate-800 shadow-2xl p-4 space-y-4 relative overflow-hidden text-white min-h-[480px]">
            
            {/* Grid background */}
            <div className="absolute inset-0 bg-[radial-gradient(#1e293b_1px,transparent_1px)] [background-size:16px_16px] opacity-20 pointer-events-none" />

            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="space-y-0.5">
                <span className="text-[10px] text-sky-400 font-extrabold uppercase tracking-widest block">Emergency GIS Radar</span>
                <h3 className="text-xs font-black text-white flex items-center gap-1.5">
                  <Compass className="w-3.5 h-3.5 text-orange-500 animate-spin" />
                  <span>Interactive Route Tracker</span>
                </h3>
              </div>
              <span className="px-2.5 py-1 bg-slate-850 text-slate-300 rounded-full text-[10px] font-black uppercase tracking-wider border border-slate-800">
                Ghazipur Rural Grid
              </span>
            </div>

            {/* The Map Rendering Box */}
            <div className="relative w-full h-80 rounded-2xl bg-slate-950 border border-slate-800 overflow-hidden shadow-inner flex items-center justify-center">
              
              {/* If Google Maps API Key is active, render real Map, else render our gorgeously styled simulated vector canvas */}
              {hasValidKey ? (
                <APIProvider apiKey={GOOGLE_MAPS_API_KEY}>
                  <Map
                    defaultCenter={{ lat: selectedVillage.lat, lng: selectedVillage.lng }}
                    defaultZoom={11}
                    mapId="gramgo_medical_map"
                    className="w-full h-full"
                  >
                    {/* User Location marker */}
                    <AdvancedMarker position={{ lat: selectedVillage.lat, lng: selectedVillage.lng }}>
                      <div className="w-6 h-6 bg-orange-600 rounded-full border-2 border-white flex items-center justify-center shadow-lg animate-bounce">
                        📍
                      </div>
                    </AdvancedMarker>

                    {/* Hospital Markers */}
                    {hospitalsWithDynamicMath.map((h) => (
                      <AdvancedMarker 
                        key={h.id} 
                        position={{ lat: h.lat, lng: h.lng }}
                        onClick={() => setSelectedHospital(h)}
                      >
                        <div className={`p-1.5 rounded-lg border text-[9px] font-black uppercase flex items-center space-x-1 shadow ${
                          selectedHospital?.id === h.id 
                            ? "bg-sky-500 text-white border-sky-300" 
                            : h.bedsAvailable > 0 ? "bg-emerald-600 text-white border-emerald-400" : "bg-rose-600 text-white border-rose-400"
                        }`}>
                          <span>{h.name.split(",")[0]}</span>
                          <span>({h.bedsAvailable} Beds)</span>
                        </div>
                      </AdvancedMarker>
                    ))}
                  </Map>
                </APIProvider>
              ) : (
                /* GORGEOUS VECTOR SIMULATION CANVAS */
                <div className="absolute inset-0 flex flex-col justify-between p-4 bg-slate-950 select-none">
                  {/* Outer radar grid effect */}
                  <div className="absolute inset-0 bg-[linear-gradient(to_right,#0f172a_1px,transparent_1px),linear-gradient(to_bottom,#0f172a_1px,transparent_1px)] bg-[size:24px_24px] opacity-40" />

                  {/* Radiating beacon rings around Selected Village */}
                  <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-72 h-72 rounded-full border border-slate-900 pointer-events-none" />
                  <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-48 h-48 rounded-full border border-slate-900 pointer-events-none" />
                  <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-24 h-24 rounded-full border border-slate-900 pointer-events-none" />

                  {/* Pulsing Beacon sweep */}
                  <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-64 h-64 bg-emerald-500/5 rounded-full border border-emerald-500/10 animate-pulse pointer-events-none" />

                  {/* Vector SVG Paths for hospitals */}
                  <svg className="absolute inset-0 w-full h-full pointer-events-none">
                    {/* User Pin is always near the center */}
                    {selectedHospital && (
                      <motion.line 
                        x1="50%" 
                        y1="50%" 
                        x2="70%" 
                        y2="35%" 
                        stroke="#06b6d4" 
                        strokeWidth="2.5" 
                        strokeDasharray="6,4"
                        animate={{ strokeDashoffset: [0, -20] }}
                        transition={{ repeat: Infinity, ease: "linear", duration: 1.5 }}
                      />
                    )}
                  </svg>

                  {/* User Pin Center */}
                  <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-10 flex flex-col items-center">
                    <span className="w-4 h-4 bg-orange-500 border-2 border-white rounded-full flex items-center justify-center shadow-lg animate-ping absolute" />
                    <span className="w-4 h-4 bg-orange-600 border-2 border-white rounded-full flex items-center justify-center shadow-lg relative z-20">
                      📍
                    </span>
                    <span className="bg-slate-900/90 text-orange-400 border border-orange-500/20 px-2 py-0.5 rounded-md text-[8px] font-black uppercase tracking-wider mt-1.5 whitespace-nowrap shadow">
                      {selectedVillage.name}
                    </span>
                  </div>

                  {/* Hospital Pins scattered around */}
                  {hospitalsWithDynamicMath.map((h, i) => {
                    const isSelected = selectedHospital?.id === h.id;
                    // scattered vectors relative to center
                    const coords = [
                      { top: "25%", left: "70%" },
                      { top: "35%", left: "20%" },
                      { top: "65%", left: "80%" },
                      { top: "75%", left: "30%" },
                      { top: "15%", left: "45%" }
                    ];
                    const coord = coords[i % coords.length];
                    return (
                      <div 
                        key={h.id} 
                        style={{ top: coord.top, left: coord.left }}
                        onClick={() => setSelectedHospital(h)}
                        className={`absolute z-10 flex flex-col items-center cursor-pointer transform hover:scale-110 transition`}
                      >
                        <span className={`w-3.5 h-3.5 rounded-full flex items-center justify-center border-2 border-white text-[8px] shadow ${
                          isSelected 
                            ? "bg-sky-500" 
                            : h.bedsAvailable > 0 ? "bg-emerald-500 animate-pulse" : "bg-rose-500"
                        }`} />
                        <span className={`px-1.5 py-0.5 rounded text-[8px] font-black uppercase tracking-tight mt-1 whitespace-nowrap border shadow ${
                          isSelected 
                            ? "bg-sky-950 border-sky-500 text-sky-400" 
                            : "bg-slate-900 border-slate-800 text-slate-300"
                        }`}>
                          {h.name.split(" ")[0]} ({h.bedsAvailable} Beds)
                        </span>
                      </div>
                    );
                  })}

                  {/* Map overlay controls */}
                  <div className="absolute top-2 right-2 flex flex-col gap-1 z-20">
                    <button className="w-7 h-7 bg-slate-900 border border-slate-800 rounded-lg text-xs font-black flex items-center justify-center hover:bg-slate-800">+</button>
                    <button className="w-7 h-7 bg-slate-900 border border-slate-800 rounded-lg text-xs font-black flex items-center justify-center hover:bg-slate-800">-</button>
                  </div>

                  <div className="absolute bottom-2 left-2 z-20 bg-slate-950/90 border border-slate-800 rounded-lg p-2 flex items-center space-x-1.5 text-[8px] font-extrabold text-slate-400 uppercase">
                    <span className="w-1.5 h-1.5 bg-orange-600 rounded-full" />
                    <span>My Location</span>
                    <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full ml-1" />
                    <span>Active Beds</span>
                    <span className="w-1.5 h-1.5 bg-rose-500 rounded-full ml-1" />
                    <span>Full</span>
                  </div>

                </div>
              )}

            </div>

            {/* Selected Hospital Live Navigation Card */}
            {selectedHospital ? (
              <div className="bg-slate-950 border border-slate-800 rounded-2xl p-4.5 space-y-3 relative z-10">
                <div className="flex justify-between items-start">
                  <div>
                    <span className="text-[10px] text-emerald-400 font-extrabold uppercase tracking-widest block">Active Target Destination</span>
                    <h4 className="text-sm font-black text-white">{selectedHospital.name}</h4>
                    <p className="text-[10px] text-slate-400 font-semibold">{selectedHospital.specialty}</p>
                  </div>

                  <a 
                    href={`https://www.google.com/maps/dir/?api=1&origin=${selectedVillage.lat},${selectedVillage.lng}&destination=${selectedHospital.lat},${selectedHospital.lng}`}
                    target="_blank"
                    rel="noreferrer"
                    className="px-3 py-1.5 bg-slate-900 border border-slate-800 hover:bg-slate-800 text-sky-400 text-[10px] font-black uppercase tracking-wider rounded-xl flex items-center gap-1 cursor-pointer transition"
                  >
                    <span>Google Maps</span>
                    <Maximize2 className="w-3 h-3" />
                  </a>
                </div>

                {/* Driving details */}
                <div className="grid grid-cols-2 gap-2 bg-slate-900 p-3 rounded-xl border border-slate-850 text-center">
                  <div>
                    <span className="text-[9px] text-slate-400 uppercase font-bold block">Distance Map Path</span>
                    <span className="text-sm font-black text-white">{selectedHospital.distanceKm} Kilometers</span>
                  </div>
                  <div>
                    <span className="text-[9px] text-slate-400 uppercase font-bold block">Estimated Transit Time</span>
                    <span className="text-sm font-black text-emerald-400">{selectedHospital.etaMinutes} Minutes</span>
                  </div>
                </div>

                {/* Driving steps directions list */}
                <div className="space-y-2">
                  <span className="text-[9px] text-slate-500 font-extrabold uppercase tracking-widest block">Plot Nav Instructions</span>
                  <div className="space-y-2.5 max-h-36 overflow-y-auto pr-1">
                    {navigationSteps.map((step, index) => (
                      <div key={index} className="flex items-start space-x-2 text-[10px] font-semibold text-slate-300">
                        <span className="w-4 h-4 rounded-full bg-slate-850 border border-slate-800 flex items-center justify-center text-slate-400 font-bold flex-shrink-0">
                          {index + 1}
                        </span>
                        <span className="leading-normal">{step}</span>
                      </div>
                    ))}
                  </div>
                </div>

              </div>
            ) : (
              <div className="text-center py-12 text-slate-500 border border-dashed border-slate-800 rounded-2xl">
                <Compass className="w-8 h-8 mx-auto animate-pulse" />
                <span className="text-xs font-bold block mt-2">Select a hospital to trigger radar and navigation paths.</span>
              </div>
            )}

          </div>

          {/* Quick Helplines Box */}
          <div className="bg-slate-900 text-white rounded-3xl border border-slate-800 p-5 shadow-xl space-y-4">
            <h3 className="text-xs font-black text-white flex items-center space-x-1.5 border-b border-slate-800 pb-2">
              <PhoneCall className="w-4 h-4 text-orange-500 animate-bounce" />
              <span>Priority Medical Emergency Helplines</span>
            </h3>

            <div className="grid grid-cols-2 gap-3">
              <a href="tel:108" className="bg-slate-950 p-3 rounded-2xl border border-slate-850 hover:bg-slate-900 transition block text-center shadow-inner">
                <span className="block text-2.5xl font-black text-orange-500 leading-none">108</span>
                <span className="block text-[9px] font-black text-slate-400 uppercase tracking-widest mt-1">National Ambulance</span>
              </a>
              <a href="tel:18003094726" className="bg-slate-950 p-3 rounded-2xl border border-slate-850 hover:bg-slate-900 transition block text-center shadow-inner">
                <span className="block text-[11px] font-black text-emerald-400 truncate leading-none pt-2.5">1800-309-GRAM</span>
                <span className="block text-[9px] font-black text-slate-400 uppercase tracking-widest mt-2">GramGo Desk</span>
              </a>
            </div>

            <div className="border-t border-slate-800/80 pt-3 space-y-2">
              <span className="text-[10px] uppercase font-extrabold text-slate-500 tracking-wider block">Regional Nodal Officers</span>
              <ul className="space-y-2 text-xs font-bold">
                <li className="flex justify-between items-center text-slate-300">
                  <span className="text-[10px] text-slate-400 font-semibold">Block Medical Officer, Mohammadabad</span>
                  <a href="tel:+919454412345" className="font-extrabold text-orange-400 hover:underline">+91 94544 12345</a>
                </li>
                <li className="flex justify-between items-center text-slate-300">
                  <span className="text-[10px] text-slate-400 font-semibold">Ghazipur District Hospital Helpline</span>
                  <a href="tel:05482220456" className="font-extrabold text-orange-400 hover:underline">0548-2220456</a>
                </li>
                <li className="flex justify-between items-center text-slate-300">
                  <span className="text-[10px] text-slate-400 font-semibold">District Emergency Control Room</span>
                  <a href="tel:1077" className="font-extrabold text-orange-400 hover:underline">1077</a>
                </li>
              </ul>
            </div>
          </div>

        </div>

      </div>

    </div>
  );
}
