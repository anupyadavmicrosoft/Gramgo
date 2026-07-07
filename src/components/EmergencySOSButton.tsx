import React, { useState, useEffect, useRef } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "motion/react";
import { 
  AlertOctagon, 
  Flame, 
  ShieldAlert, 
  Clock, 
  X, 
  HelpCircle, 
  CheckCircle2, 
  Radio, 
  HeartPulse, 
  PhoneCall, 
  ChevronRight,
  Sparkles
} from "lucide-react";
import { useAuth } from "../context/AuthContext";

export default function EmergencySOSButton() {
  const { user, isAuthenticated, token } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();

  // States
  const [showModal, setShowModal] = useState<boolean>(false);
  const [isHolding, setIsHolding] = useState<boolean>(false);
  const [holdProgress, setHoldProgress] = useState<number>(0);
  const [countdown, setCountdown] = useState<number>(3);
  const [isCounting, setIsCounting] = useState<boolean>(false);
  const [sosTriggered, setSosTriggered] = useState<boolean>(false);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  // Custom fields
  const [emergencyType, setEmergencyType] = useState<string>("Severe Illness");
  const [village, setVillage] = useState<string>(user?.village || "");

  const holdTimer = useRef<any>(null);
  const countdownTimer = useRef<any>(null);
  const progressInterval = useRef<any>(null);

  // Sync village with user object once loaded
  useEffect(() => {
    if (user?.village) {
      setVillage(user.village);
    }
  }, [user]);

  // Don't render SOS button if not logged in or if user is a driver/admin
  if (!isAuthenticated || !user || user.role !== "passenger") {
    return null;
  }

  // Prevent rendering inside specific focus screens where SOS is redundant or distracting
  const blacklistedPaths = ["/login", "/register", "/forgot-password"];
  if (blacklistedPaths.includes(location.pathname)) {
    return null;
  }

  // Start holding sequence (Accidental press prevention)
  const handleStartHold = (e: React.MouseEvent | React.TouchEvent) => {
    e.preventDefault();
    setIsHolding(true);
    setHoldProgress(0);

    // Vibrate device on start of hold (where supported)
    if (navigator.vibrate) {
      navigator.vibrate([100, 50, 100]);
    }

    const startTime = Date.now();
    const duration = 1500; // 1.5 seconds to open the SOS Confirmation HUD

    progressInterval.current = setInterval(() => {
      const elapsed = Date.now() - startTime;
      const pct = Math.min((elapsed / duration) * 100, 100);
      setHoldProgress(pct);
      
      // Continuous micro-vibrations for tactile feedback
      if (navigator.vibrate && Math.floor(pct) % 15 === 0) {
        navigator.vibrate(40);
      }

      if (pct >= 100) {
        clearInterval(progressInterval.current);
        setIsHolding(false);
        setHoldProgress(0);
        openSOSModal();
      }
    }, 30);
  };

  const handleEndHold = () => {
    setIsHolding(false);
    setHoldProgress(0);
    if (progressInterval.current) clearInterval(progressInterval.current);
  };

  const openSOSModal = () => {
    setShowModal(true);
    setIsCounting(true);
    setCountdown(3);
    setError(null);
    setSosTriggered(false);

    // Start 3-second emergency automatic countdown
    countdownTimer.current = setInterval(() => {
      setCountdown((prev) => {
        if (navigator.vibrate) {
          navigator.vibrate(80); // Beat sound vibration
        }

        if (prev <= 1) {
          clearInterval(countdownTimer.current);
          setIsCounting(false);
          executeSOSTrigger();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
  };

  const cancelSOS = () => {
    clearInterval(countdownTimer.current);
    setIsCounting(false);
    setShowModal(false);
    setCountdown(3);
    if (navigator.vibrate) {
      navigator.vibrate([150]);
    }
  };

  const executeSOSTrigger = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/sos/trigger", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token}`
        },
        body: JSON.stringify({
          village: village || user?.village || "Ghazipur Main Square",
          emergencyType,
          landmark: "SOS Screen Overlay Activated"
        })
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to establish secure SOS link.");
      }

      const result = await res.json();
      setSosTriggered(true);
      if (navigator.vibrate) {
        navigator.vibrate([400, 200, 400]);
      }

      // Auto route to tracking view after 2.5 seconds
      setTimeout(() => {
        setShowModal(false);
        setSosTriggered(false);
        navigate("/passenger");
      }, 2500);

    } catch (err: any) {
      setError(err.message || "Network lost. Retrying radio link...");
    } finally {
      setLoading(false);
    }
  };

  const handleInstantTrigger = () => {
    clearInterval(countdownTimer.current);
    setIsCounting(false);
    executeSOSTrigger();
  };

  return (
    <>
      {/* FLOATING ACTION BUTTON */}
      <div className="fixed bottom-6 right-6 z-40 flex flex-col items-center select-none">
        
        {/* Helper Pulse Overlay for Holding Instruction */}
        <AnimatePresence>
          {isHolding && (
            <motion.div 
              initial={{ opacity: 0, scale: 0.8, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.8, y: 10 }}
              className="mb-3 px-3 py-1.5 bg-red-600 text-white border border-red-500 rounded-xl text-[10px] font-black uppercase tracking-widest shadow-xl flex items-center gap-1.5"
            >
              <Radio className="w-3.5 h-3.5 animate-pulse text-white" />
              <span>HOLDING... {Math.floor(holdProgress)}%</span>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Pulsating Ring (only visible in default state to prompt user) */}
        {!isHolding && (
          <div className="absolute -inset-2.5 bg-red-600/25 rounded-full blur-md animate-ping" />
        )}

        {/* SOS Floating Trigger */}
        <button
          onMouseDown={handleStartHold}
          onMouseUp={handleEndHold}
          onMouseLeave={handleEndHold}
          onTouchStart={handleStartHold}
          onTouchEnd={handleEndHold}
          className="relative w-16 h-16 sm:w-20 sm:h-20 bg-gradient-to-tr from-red-700 via-rose-600 to-red-500 hover:from-red-600 hover:to-rose-500 active:scale-95 text-white rounded-full flex flex-col items-center justify-center shadow-2xl border-2 border-red-400/50 cursor-pointer transition-all duration-150 overflow-hidden group"
          id="global-sos-btn"
          style={{ touchAction: "none" }}
          title="Press & Hold 1.5s for Critical SOS Dispatch"
        >
          {/* Progress fill bar */}
          {isHolding && (
            <div 
              className="absolute bottom-0 left-0 right-0 bg-black/40 transition-all duration-75"
              style={{ height: `${holdProgress}%` }}
            />
          )}

          <ShieldAlert className="w-7 h-7 sm:w-8 sm:h-8 text-white group-hover:scale-110 transition duration-150 relative z-10" />
          <span className="text-[10px] sm:text-[11px] font-black uppercase tracking-widest leading-none mt-1 relative z-10">
            SOS
          </span>
          <span className="text-[7px] text-red-100 uppercase tracking-widest leading-none font-bold block scale-90 relative z-10">
            Hold 1.5s
          </span>
        </button>
      </div>

      {/* CONFIRMATION & COUNTDOWN OVERLAY MODAL */}
      <AnimatePresence>
        {showModal && (
          <div 
            id="sos-overlay-modal"
            className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/90 backdrop-blur-md p-4 text-slate-100 overflow-y-auto"
          >
            
            {/* Flashing RED Warning Bar Top & Bottom */}
            <div className="absolute top-0 left-0 right-0 h-2 bg-red-600 animate-pulse" />
            <div className="absolute bottom-0 left-0 right-0 h-2 bg-red-600 animate-pulse" />

            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="max-w-md w-full bg-slate-900 border border-slate-800 rounded-3xl p-6 sm:p-8 shadow-2xl relative overflow-hidden"
            >
              
              {/* Radial Warning Glow Effect */}
              <div className="absolute -top-32 -left-32 w-64 h-64 bg-red-600/10 rounded-full blur-3xl pointer-events-none" />
              <div className="absolute -bottom-32 -right-32 w-64 h-64 bg-orange-600/10 rounded-full blur-3xl pointer-events-none" />

              {/* Close / Abort button */}
              {!sosTriggered && !loading && (
                <button
                  onClick={cancelSOS}
                  className="absolute right-4 top-4 p-2 bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white rounded-full transition cursor-pointer"
                  title="Cancel Emergency"
                >
                  <X className="w-4 h-4" />
                </button>
              )}

              {/* STAGE 1: Automatic Countdown Active */}
              {isCounting && !sosTriggered && (
                <div className="text-center space-y-6">
                  <div className="relative flex items-center justify-center w-24 h-24 mx-auto">
                    <div className="absolute inset-0 border-4 border-red-500/10 rounded-full" />
                    <div className="absolute inset-0 border-4 border-t-red-500 border-r-transparent border-b-transparent border-l-transparent rounded-full animate-spin" />
                    <span className="text-5xl font-black text-red-500 animate-pulse">
                      {countdown}
                    </span>
                  </div>

                  <div className="space-y-2">
                    <h2 className="text-xl sm:text-2xl font-black tracking-tight text-white uppercase flex items-center justify-center gap-2">
                      <Radio className="w-6 h-6 text-red-500 animate-pulse" />
                      <span>SOS COUNTDOWN</span>
                    </h2>
                    <p className="text-xs text-slate-400 font-semibold max-w-xs mx-auto leading-relaxed">
                      Automatically matching & dispatching the nearest volunteer first responder in <strong className="text-white">{village || user?.village}</strong>.
                    </p>
                  </div>

                  {/* Active Selection Details for Quick Adjustments if required */}
                  <div className="bg-slate-950/60 border border-slate-800 rounded-2xl p-4 text-left space-y-3.5">
                    <div>
                      <label className="text-[9px] font-black text-slate-500 uppercase tracking-widest block">Village Base Location</label>
                      <input 
                        type="text" 
                        value={village}
                        onChange={(e) => setVillage(e.target.value)}
                        placeholder="Current village coordinates..."
                        className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-xs font-bold text-white mt-1 focus:ring-1 focus:ring-red-500 focus:outline-none"
                      />
                    </div>

                    <div>
                      <label className="text-[9px] font-black text-slate-500 uppercase tracking-widest block">Medical Emergency Type</label>
                      <div className="grid grid-cols-2 gap-2 mt-1.5">
                        {["Severe Illness", "Accident/Trauma", "Cardiac", "Maternity"].map((type) => (
                          <button
                            key={type}
                            onClick={() => setEmergencyType(type)}
                            className={`px-3 py-1.5 rounded-xl text-[10px] font-black uppercase tracking-wider text-center border cursor-pointer transition ${
                              emergencyType === type
                                ? "bg-red-500/10 border-red-500 text-red-400"
                                : "bg-slate-900 border-slate-800 text-slate-400 hover:text-slate-300"
                            }`}
                          >
                            {type}
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>

                  {/* Controls */}
                  <div className="flex flex-col sm:flex-row gap-3 pt-2">
                    <button
                      onClick={cancelSOS}
                      className="flex-1 py-3 bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white rounded-xl text-xs font-black uppercase tracking-widest transition cursor-pointer border border-slate-700"
                    >
                      ABORT DISPATCH
                    </button>
                    <button
                      onClick={handleInstantTrigger}
                      className="flex-1 py-3 bg-red-600 hover:bg-red-500 text-white rounded-xl text-xs font-black uppercase tracking-widest transition cursor-pointer shadow-lg shadow-red-900/30 flex items-center justify-center gap-1.5"
                    >
                      <span>TRIGGER NOW</span>
                      <ChevronRight className="w-4 h-4 animate-bounce-horizontal" />
                    </button>
                  </div>
                </div>
              )}

              {/* STAGE 2: Loader linking socket */}
              {loading && !sosTriggered && (
                <div className="text-center py-8 space-y-5">
                  <div className="w-16 h-16 border-4 border-red-500/20 border-t-red-500 rounded-full animate-spin mx-auto" />
                  <div className="space-y-1.5">
                    <h3 className="text-sm font-black uppercase tracking-wider text-white">Transmitting Safe SOS Broadcast</h3>
                    <p className="text-xs text-slate-400 max-w-xs mx-auto">
                      Connecting directly to GramGo regional router towers & notifying verified first responders...
                    </p>
                  </div>
                  {error && (
                    <div className="p-3.5 bg-rose-500/10 border border-rose-500/20 rounded-xl text-[11px] font-semibold text-rose-400 max-w-xs mx-auto">
                      {error}
                    </div>
                  )}
                </div>
              )}

              {/* STAGE 3: Success Confirmation */}
              {sosTriggered && (
                <div className="text-center py-6 space-y-5">
                  <div className="relative w-20 h-20 bg-emerald-500/10 border border-emerald-500/30 rounded-full flex items-center justify-center mx-auto animate-pulse">
                    <CheckCircle2 className="w-12 h-12 text-emerald-500" />
                  </div>

                  <div className="space-y-1.5">
                    <h2 className="text-lg sm:text-xl font-black text-white uppercase tracking-wider">
                      🚨 AMBULANCE EN ROUTE!
                    </h2>
                    <p className="text-xs text-slate-400 font-semibold max-w-sm mx-auto leading-relaxed">
                      Emergency SOS booking successfully registered for <span className="text-emerald-400">{village || user?.village}</span>. Redirecting you to the live telemetry tracking HUD now.
                    </p>
                  </div>

                  <div className="bg-slate-950 border border-slate-900 rounded-xl p-3.5 flex items-start gap-2 max-w-sm mx-auto text-left">
                    <Sparkles className="w-4 h-4 text-amber-400 flex-shrink-0 mt-0.5 animate-bounce" />
                    <div>
                      <span className="text-[10px] font-black text-amber-400 uppercase tracking-wider block">First Aid Companion loading...</span>
                      <p className="text-[9px] text-slate-400 mt-0.5">
                        Keep calm. GramGo's integrated AI First Aid bot is loading specific guidelines for your case.
                      </p>
                    </div>
                  </div>
                </div>
              )}

            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </>
  );
}
