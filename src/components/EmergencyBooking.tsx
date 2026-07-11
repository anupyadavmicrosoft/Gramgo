import React, { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { 
  HeartHandshake, 
  MapPin, 
  Phone, 
  User, 
  Flame, 
  HelpCircle, 
  Activity, 
  Navigation, 
  PhoneCall, 
  AlertTriangle,
  Languages,
  CheckCircle,
  Clock,
  Sparkles,
  Home
} from "lucide-react";
import { EmergencyRide, CommunityHealthCentre } from "../types";

export default function EmergencyBooking() {
  const { user, isAuthenticated } = useAuth();
  // Local states
  const [patientName, setPatientName] = useState("");
  const [patientPhone, setPatientPhone] = useState("");
  const [emergencyType, setEmergencyType] = useState<EmergencyRide["emergencyType"]>("Maternity");
  const [priority, setPriority] = useState<EmergencyRide["priority"]>("urgent");
  const [village, setVillage] = useState("");
  const [landmark, setLandmark] = useState("");
  const [destinationChc, setDestinationChc] = useState("");
  
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [activeRide, setActiveRide] = useState<EmergencyRide | null>(null);
  const [chcList, setChcList] = useState<CommunityHealthCentre[]>([]);
  
  // First Aid AI States
  const [aiAdvice, setAiAdvice] = useState("");
  const [aiLanguage, setAiLanguage] = useState<"english" | "hindi">("hindi");
  const [isLoadingAi, setIsLoadingAi] = useState(false);

  // Pre-seed sample villages
  const standardVillages = ["Gauspur", "Karimpur", "Malikpur", "Sherpur", "Dharampur", "Baraun"];

  // Fetch Community Health Centres
  useEffect(() => {
    fetch("/api/chcs")
      .then((res) => {
        const contentType = res.headers.get("content-type");
        if (contentType && contentType.includes("application/json") && res.ok) {
          return res.json();
        }
        return [];
      })
      .then((data) => {
        setChcList(data);
        if (data && data.length > 0) {
          setDestinationChc(data[0].name);
        }
      })
      .catch((err) => console.debug("Error fetching CHCs:", err));
  }, []);

  // Poll active ride status
  useEffect(() => {
    if (!activeRide || activeRide.status === "completed" || activeRide.status === "Completed" || activeRide.status === "cancelled" || activeRide.status === "Cancelled") return;

    const interval = setInterval(() => {
      fetch(`/api/ride-status/${activeRide.id}`)
        .then((res) => {
          const contentType = res.headers.get("content-type");
          if (res.ok && contentType && contentType.includes("application/json")) {
            return res.json();
          }
          return null;
        })
        .then((data) => {
          if (data) {
            setActiveRide(data);
          }
        })
        .catch((err) => console.debug("Error polling ride status:", err));
    }, 4000);

    return () => clearInterval(interval);
  }, [activeRide]);

  // Fetch AI First-Aid Companion Advice
  const fetchFirstAidAdvice = (type: string, lang: "english" | "hindi") => {
    setIsLoadingAi(true);
    fetch("/api/gemini/first-aid", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ emergencyType: type, language: lang }),
    })
      .then((res) => {
        const contentType = res.headers.get("content-type");
        if (res.ok && contentType && contentType.includes("application/json")) {
          return res.json();
        }
        return { advice: "First aid guidance is currently unavailable." };
      })
      .then((data) => {
        setAiAdvice(data.advice);
        setIsLoadingAi(false);
      })
      .catch((err) => {
        console.debug("AI First Aid Error:", err);
        setIsLoadingAi(false);
      });
  };

  // React to emergency type and language change
  useEffect(() => {
    if (activeRide) {
      fetchFirstAidAdvice(activeRide.emergencyType, aiLanguage);
    }
  }, [aiLanguage, activeRide?.id]);

  const handleBookingSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!patientName || !patientPhone || !village) {
      alert("Please fill in patient name, phone number, and village.");
      return;
    }

    setIsSubmitting(true);
    try {
      const response = await fetch("/api/book-emergency", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          patientName,
          patientPhone,
          emergencyType,
          priority,
          village,
          landmark,
          destinationChc,
        }),
      });

      if (!response.ok) throw new Error("Emergency dispatch call failed.");
      const data: EmergencyRide = await response.json();
      setActiveRide(data);
      
      // Load AI advice immediately
      fetchFirstAidAdvice(data.emergencyType, aiLanguage);
    } catch (err: any) {
      alert(err.message || "Something went wrong.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCancelSimulation = () => {
    setActiveRide(null);
    setAiAdvice("");
    // Clear inputs
    setPatientName("");
    setPatientPhone("");
    setVillage("");
    setLandmark("");
  };

  return (
    <div id="emergency-booking" className="max-w-7xl mx-auto px-4 py-12 sm:px-6 lg:px-8">
      
      {/* Passenger Hub Redirection Banner */}
      {isAuthenticated && user && user.role === "passenger" && (
        <div className="mb-8 p-4 bg-orange-50 border border-orange-200 rounded-2xl flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 shadow-sm">
          <div className="flex items-center space-x-3">
            <span className="p-2 bg-orange-100 text-orange-600 rounded-xl">
              <Home className="w-5 h-5" />
            </span>
            <div>
              <span className="text-xs font-black text-orange-950 block">GramGo Passenger Hub is Active</span>
              <span className="text-xs text-slate-600 font-semibold">Pre-fill bookings, view personal ride history, manage family contacts, and check live notifications.</span>
            </div>
          </div>
          <Link 
            to="/passenger"
            className="self-start sm:self-auto px-4 py-2 bg-orange-600 hover:bg-orange-700 text-white rounded-xl text-xs font-extrabold shadow-sm transition-all text-center whitespace-nowrap"
          >
            Go to Passenger Hub 🏡
          </Link>
        </div>
      )}

      {/* Page Header */}
      <div className="text-center max-w-2xl mx-auto mb-10 space-y-2">
        <div className="inline-flex items-center px-2.5 py-1 bg-red-100 text-red-800 rounded-full text-xs font-bold shadow-sm">
          <AlertTriangle className="w-3.5 h-3.5 mr-1.5 animate-pulse" />
          <span>Rural Active Emergency dispatch</span>
        </div>
        <h1 className="text-3xl sm:text-4xl font-extrabold text-slate-900 tracking-tight">
          Request Medical Transport
        </h1>
        <p className="text-sm text-slate-500">
          Complete the rapid Panchayat dispatch form below. Our network matches you with the nearest active village vehicle.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* Left Column: Form or Dispatch Status */}
        <div className="lg:col-span-7">
          {!activeRide ? (
            /* Dispatch Form */
            <div className="bg-white rounded-2xl border border-slate-100 shadow-xl p-6 sm:p-8 space-y-6">
              <div className="border-b border-gray-100 pb-4">
                <h2 className="text-lg font-extrabold text-slate-900 flex items-center space-x-2">
                  <HeartHandshake className="w-5 h-5 text-red-500" />
                  <span>Patient & Location Details</span>
                </h2>
                <p className="text-xs text-slate-400">All coordinates and routes are automatically calculated.</p>
              </div>

              <form onSubmit={handleBookingSubmit} className="space-y-4">
                {/* Patient Name & Phone */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <label className="text-xs font-extrabold text-slate-700 uppercase tracking-wider block">Patient's Full Name</label>
                    <div className="relative">
                      <User className="absolute left-3.5 top-3.5 w-4 h-4 text-gray-400" />
                      <input
                        type="text"
                        placeholder="e.g. Ram Charan Singh"
                        value={patientName}
                        onChange={(e) => setPatientName(e.target.value)}
                        className="w-full pl-10 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium focus:bg-white focus:ring-2 focus:ring-orange-500 focus:border-orange-500 transition-all outline-none"
                        required
                      />
                    </div>
                  </div>

                  <div className="space-y-1">
                    <label className="text-xs font-extrabold text-slate-700 uppercase tracking-wider block">Relative's Phone Number</label>
                    <div className="relative">
                      <Phone className="absolute left-3.5 top-3.5 w-4 h-4 text-gray-400" />
                      <input
                        type="tel"
                        placeholder="e.g. +91 98765 XXXXX"
                        value={patientPhone}
                        onChange={(e) => setPatientPhone(e.target.value)}
                        className="w-full pl-10 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium focus:bg-white focus:ring-2 focus:ring-orange-500 focus:border-orange-500 transition-all outline-none"
                        required
                      />
                    </div>
                  </div>
                </div>

                {/* Emergency Type & Priority */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <label className="text-xs font-extrabold text-slate-700 uppercase tracking-wider block">Type of Medical Emergency</label>
                    <select
                      value={emergencyType}
                      onChange={(e) => setEmergencyType(e.target.value as any)}
                      className="w-full px-3.5 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold focus:bg-white focus:ring-2 focus:ring-orange-500 focus:border-orange-500 outline-none"
                    >
                      <option value="Maternity">🤰 Maternity / Delivery</option>
                      <option value="Accident/Trauma">🩹 Accident / Injury Trauma</option>
                      <option value="Severe Illness">🌡️ Severe Fever / Illness</option>
                      <option value="Cardiac">❤️ Cardiac / Chest Pain</option>
                      <option value="Other">❓ Other Urgent Help</option>
                    </select>
                  </div>

                  <div className="space-y-1">
                    <label className="text-xs font-extrabold text-slate-700 uppercase tracking-wider block">Urgency Priority Level</label>
                    <div className="grid grid-cols-3 gap-2">
                      {(["critical", "urgent", "non-urgent"] as const).map((lvl) => (
                        <button
                          key={lvl}
                          type="button"
                          onClick={() => setPriority(lvl)}
                          className={`py-2 text-center rounded-xl text-xs font-bold border transition-all capitalize ${
                            priority === lvl
                              ? lvl === "critical"
                                ? "bg-red-500 border-red-600 text-white shadow-sm"
                                : lvl === "urgent"
                                ? "bg-orange-500 border-orange-600 text-white shadow-sm"
                                : "bg-emerald-500 border-emerald-600 text-white shadow-sm"
                              : "bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100"
                          }`}
                        >
                          {lvl.replace("-", " ")}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Village Selector & Landmark */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <label className="text-xs font-extrabold text-slate-700 uppercase tracking-wider block">Village / Hamlet</label>
                    <div className="relative">
                      <MapPin className="absolute left-3.5 top-3.5 w-4 h-4 text-gray-400" />
                      <input
                        type="text"
                        list="villages-datalist"
                        placeholder="Search or enter village..."
                        value={village}
                        onChange={(e) => setVillage(e.target.value)}
                        className="w-full pl-10 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium focus:bg-white focus:ring-2 focus:ring-orange-500 focus:border-orange-500 outline-none"
                        required
                      />
                      <datalist id="villages-datalist">
                        {standardVillages.map(v => <option key={v} value={v} />)}
                      </datalist>
                    </div>
                  </div>

                  <div className="space-y-1">
                    <label className="text-xs font-extrabold text-slate-700 uppercase tracking-wider block">Nearby Landmark (For Drivers)</label>
                    <input
                      type="text"
                      placeholder="e.g. Near Panchayat Bhawan, Primary School"
                      value={landmark}
                      onChange={(e) => setLandmark(e.target.value)}
                      className="w-full px-3.5 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium focus:bg-white focus:ring-2 focus:ring-orange-500 focus:border-orange-500 outline-none"
                    />
                  </div>
                </div>

                {/* Target CHC Destination */}
                <div className="space-y-1">
                  <label className="text-xs font-extrabold text-slate-700 uppercase tracking-wider block">Target Community Health Centre (CHC)</label>
                  <select
                    value={destinationChc}
                    onChange={(e) => setDestinationChc(e.target.value)}
                    className="w-full px-3.5 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold focus:bg-white focus:ring-2 focus:ring-orange-500 focus:border-orange-500 outline-none"
                  >
                    {chcList.map((chc) => (
                      <option key={chc.id} value={chc.name}>
                        🏥 {chc.name} ({chc.distanceKm} km away)
                      </option>
                    ))}
                    {chcList.length === 0 && <option>Loading health centres...</option>}
                  </select>
                </div>

                {/* Submit Trigger Button */}
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="w-full py-4 bg-red-600 hover:bg-red-700 disabled:bg-slate-300 text-white font-extrabold text-base rounded-2xl shadow-lg shadow-red-200 hover:shadow-red-300 transition-all flex items-center justify-center space-x-2"
                >
                  <Flame className="w-5 h-5 text-yellow-300 animate-pulse" />
                  <span>{isSubmitting ? "Initiating Emergency Dispatch..." : "DISPATCH EMERGENCY TRANSPORT NOW"}</span>
                </button>
              </form>
            </div>
          ) : (
            /* Active Live Booking Tracker Simulation */
            <div className="bg-slate-900 text-white rounded-2xl border-4 border-slate-800 shadow-2xl p-6 sm:p-8 space-y-6">
              {/* Header Status Bar */}
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pb-4 border-b border-slate-800">
                <div>
                  <span className="text-[10px] font-extrabold text-red-400 tracking-widest uppercase">DISPATCH ID: {activeRide.id}</span>
                  <h3 className="text-lg font-black mt-0.5">Live Emergency Transport Status</h3>
                </div>
                <div className="flex items-center space-x-2">
                  <span className="relative flex h-3 w-3">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-3 w-3 bg-emerald-500"></span>
                  </span>
                  <span className="text-emerald-400 font-extrabold text-xs uppercase tracking-wider">Simulation Active</span>
                </div>
              </div>

              {/* Patient and Target Card */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 p-4 bg-slate-950/50 rounded-xl border border-slate-800 text-xs">
                <div>
                  <span className="text-slate-500 uppercase tracking-widest font-extrabold text-[9px]">Patient Name</span>
                  <p className="text-slate-200 font-bold mt-0.5">{activeRide.patientName}</p>
                  <p className="text-slate-400 mt-1">Village: {activeRide.village}</p>
                  <p className="text-slate-400">Landmark: {activeRide.landmark}</p>
                </div>
                <div>
                  <span className="text-slate-500 uppercase tracking-widest font-extrabold text-[9px]">Destination Facility</span>
                  <p className="text-orange-400 font-bold mt-0.5">{activeRide.destinationChc}</p>
                  <p className="text-slate-400 mt-1">Emergency Type: {activeRide.emergencyType}</p>
                  <p className="text-slate-400">Relative Contact: {activeRide.patientPhone}</p>
                </div>
              </div>

              {/* Progress Timeline Tracker */}
              <div className="space-y-4">
                <h4 className="text-xs font-bold text-slate-400 uppercase tracking-widest">Active Progress Timeline</h4>

                <div className="relative pl-6 space-y-6 text-sm">
                  {/* Vertical connector */}
                  <div className="absolute top-2 bottom-2 left-2 w-0.5 bg-slate-800" />

                  {(() => {
                    const currentIdx = (() => {
                      const s = activeRide.status;
                      if (s === "requested" || s === "Emergency Requested") return 0;
                      if (s === "searching" || s === "Searching Driver") return 1;
                      if (s === "driver_assigned" || s === "Driver Assigned") return 2;
                      if (s === "driver_arriving" || s === "en_route" || s === "Driver Arriving") return 3;
                      if (s === "reached_pickup" || s === "arrived" || s === "Passenger Picked") return 4;
                      if (s === "ride_started" || s === "Hospital Reached") return 5;
                      if (s === "completed" || s === "Completed") return 6;
                      if (s === "cancelled" || s === "Cancelled") return 7;
                      return -1;
                    })();

                    if (currentIdx === 7) {
                      return (
                        <div className="relative bg-red-950/40 border border-red-900/50 p-4 rounded-xl text-red-400 space-y-1">
                          <p className="font-extrabold flex items-center gap-1.5 text-red-300">
                            <span className="w-2 h-2 rounded-full bg-red-500 animate-ping" />
                            Emergency Ride Cancelled
                          </p>
                          <p className="text-xs text-red-400/90 leading-relaxed">
                            {activeRide.cancelReason ? `Reason: "${activeRide.cancelReason}"` : "This request has been cancelled."}
                          </p>
                        </div>
                      );
                    }

                    const steps = [
                      {
                        id: "requested",
                        label: "Emergency Requested",
                        desc: "Emergency registered in GramGo. Initializing dispatch protocols."
                      },
                      {
                        id: "searching",
                        label: "Searching Driver",
                        desc: "Alerting nearest available volunteer hero drivers within a 5km radius."
                      },
                      {
                        id: "driver_assigned",
                        label: "Driver Assigned",
                        desc: activeRide.driverId ? `Driver matched: ${activeRide.driverName} (${activeRide.vehicleType})` : "Matching driver..."
                      },
                      {
                        id: "driver_arriving",
                        label: "Driver Arriving",
                        desc: "Volunteer driver is en route and heading to your village."
                      },
                      {
                        id: "reached_pickup",
                        label: "Passenger Picked",
                        desc: `Ambulance reached pickup point and passenger has boarded.`
                      },
                      {
                        id: "ride_started",
                        label: "Hospital Reached",
                        desc: `Transit complete. Safely arrived at CHC: ${activeRide.destinationChc}.`
                      },
                      {
                        id: "completed",
                        label: "Completed",
                        desc: "Care handed over to CHC medical staff successfully."
                      }
                    ];

                    return steps.map((step, idx) => {
                      const isCurrent = currentIdx === idx;
                      const isCompleted = idx < currentIdx;
                      const isFuture = idx > currentIdx;

                      // Only show steps relevant to driver details if a driver has been matched
                      if (idx >= 2 && !activeRide.driverId && !isCompleted) return null;

                      return (
                        <div key={step.id} className={`relative transition-opacity ${isFuture ? "opacity-35" : "opacity-100"}`}>
                          <div className={`absolute -left-[19px] w-2.5 h-2.5 rounded-full border-4 border-slate-900 transition-all ${
                            isCurrent 
                              ? "bg-orange-500 scale-125 ring-4 ring-orange-950/40 animate-pulse" 
                              : isCompleted 
                                ? "bg-emerald-500" 
                                : "bg-slate-700"
                          }`} />
                          
                          <div className="space-y-1.5">
                            <div className="flex justify-between items-start">
                              <p className={`font-bold leading-none ${isCurrent ? "text-orange-400" : isCompleted ? "text-emerald-400" : "text-slate-400"}`}>
                                {step.label}
                              </p>
                              {idx === 2 && isCurrent && activeRide.driverId && (
                                <a
                                  href={`tel:${activeRide.driverPhone}`}
                                  className="flex items-center space-x-1 px-2.5 py-1 bg-emerald-500 hover:bg-emerald-600 text-slate-900 font-extrabold text-[10px] rounded-full transition cursor-pointer"
                                >
                                  <PhoneCall className="w-3 h-3" />
                                  <span>Call Driver</span>
                                </a>
                              )}
                            </div>
                            <p className="text-[11px] text-slate-500 leading-normal">{step.desc}</p>
                            
                            {idx === 2 && activeRide.driverId && (isCurrent || isCompleted) && (
                              <div className="bg-slate-950/80 border border-slate-800 px-3 py-2 rounded-xl text-[11px] space-y-0.5 mt-2">
                                <span className="text-slate-500 uppercase font-extrabold text-[9px] tracking-wider block">Vehicle Registration</span>
                                <p className="text-slate-200 font-extrabold tracking-wide uppercase">
                                  {activeRide.driverId === "drv_1" ? "UP-61-AB-1234" : activeRide.driverId === "drv_2" ? "UP-61-XY-5678" : "UP-61-ER-9012"}
                                </p>
                              </div>
                            )}
                          </div>
                        </div>
                      );
                    });
                  })()}
                </div>
              </div>

              {/* Simulation Actions */}
              <div className="pt-4 border-t border-slate-800 flex justify-between items-center text-xs">
                <span className="text-slate-500">
                  {activeRide.status === "completed" || activeRide.status === "Completed" ? "Ride complete" : activeRide.status === "cancelled" || activeRide.status === "Cancelled" ? "Ride Cancelled" : "Simulation updates automatically every 4 seconds..."}
                </span>
                <button
                  onClick={handleCancelSimulation}
                  className="px-4 py-2 bg-slate-850 hover:bg-slate-800 text-slate-300 hover:text-white font-extrabold rounded-lg transition"
                >
                  {activeRide.status === "completed" || activeRide.status === "Completed" || activeRide.status === "cancelled" || activeRide.status === "Cancelled" ? "Book New Emergency" : "Reset Simulation"}
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Right Column: First-Aid AI Companion */}
        <div className="lg:col-span-5">
          <div className="bg-white rounded-2xl border border-slate-100 shadow-xl p-6 sm:p-8 space-y-6 relative overflow-hidden">
            <div className="absolute top-0 right-0 w-24 h-24 bg-red-100/30 rounded-full blur-2xl" />
            <div className="absolute bottom-0 left-0 w-24 h-24 bg-orange-100/30 rounded-full blur-2xl" />

            <div className="flex justify-between items-center pb-4 border-b border-slate-100">
              <div className="flex items-center space-x-2">
                <div className="w-8 h-8 bg-red-100 text-red-600 rounded-lg flex items-center justify-center">
                  <Activity className="w-4 h-4 animate-pulse" />
                </div>
                <div>
                  <h3 className="text-sm font-black text-slate-900 flex items-center space-x-1">
                    <span>AI First Responder</span>
                    <Sparkles className="w-3.5 h-3.5 text-orange-500 animate-pulse" />
                  </h3>
                  <p className="text-[10px] text-slate-400 leading-none">Immediate Advice • डॉक्टर की सलाह</p>
                </div>
              </div>

              {/* Language Switcher */}
              <div className="flex items-center bg-slate-50 border border-slate-200 rounded-lg p-0.5">
                <button
                  onClick={() => setAiLanguage("hindi")}
                  className={`px-2 py-1 text-[10px] font-extrabold rounded-md transition ${
                    aiLanguage === "hindi" ? "bg-white text-orange-600 shadow-sm" : "text-gray-400"
                  }`}
                >
                  हिन्दी
                </button>
                <button
                  onClick={() => setAiLanguage("english")}
                  className={`px-2 py-1 text-[10px] font-extrabold rounded-md transition ${
                    aiLanguage === "english" ? "bg-white text-orange-600 shadow-sm" : "text-gray-400"
                  }`}
                >
                  Eng
                </button>
              </div>
            </div>

            {/* AI Response Display Box */}
            <div className="space-y-4">
              {activeRide ? (
                <>
                  <div className="p-3 bg-orange-50 border border-orange-100 rounded-xl text-xs text-orange-800 leading-relaxed">
                    <strong>Panchayat Advisory:</strong> While the driver is heading your way for <strong>{activeRide.emergencyType}</strong> emergency, please perform these immediate first-aid procedures.
                  </div>

                  {isLoadingAi ? (
                    <div className="py-12 flex flex-col items-center justify-center space-y-3">
                      <div className="w-8 h-8 border-4 border-orange-500 border-t-transparent rounded-full animate-spin" />
                      <p className="text-xs font-bold text-slate-400 animate-pulse">Generating localized advice...</p>
                    </div>
                  ) : (
                    <div className="p-4 bg-slate-50 border border-slate-100 rounded-2xl text-slate-700 text-sm whitespace-pre-wrap leading-relaxed font-semibold">
                      {aiAdvice || "No recommendations generated yet."}
                    </div>
                  )}
                </>
              ) : (
                <div className="py-12 text-center space-y-4">
                  <div className="w-12 h-12 bg-slate-100 rounded-full flex items-center justify-center mx-auto text-slate-400">
                    <Clock className="w-6 h-6" />
                  </div>
                  <p className="text-xs text-slate-400 leading-relaxed max-w-xs mx-auto">
                    Initiate an emergency dispatch simulation using the form to generate real-time, localized medical first-aid guidance.
                  </p>
                </div>
              )}
            </div>

            {/* Disclaimer */}
            <div className="pt-4 border-t border-slate-100 text-[10px] text-slate-400 leading-relaxed">
              *First-aid companion provides simple emergency guidance. Always prioritize transport to the Community Health Centre (CHC).
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
