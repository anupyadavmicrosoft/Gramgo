import React, { useState, useEffect } from "react";
import { MapPin, Navigation, Loader2, AlertCircle, RefreshCw, CheckCircle2 } from "lucide-react";
import { useAuth } from "../context/AuthContext";

interface CurrentLocationTrackerProps {
  role: "passenger" | "driver";
  onLocationDetected?: (address: string, coords: { lat: number; lng: number }) => void;
  title?: string;
  className?: string;
}

export default function CurrentLocationTracker({
  role,
  onLocationDetected,
  title = "Detect Current Location",
  className = ""
}: CurrentLocationTrackerProps) {
  const { token, user, login } = useAuth();
  const [isLocating, setIsLocating] = useState(false);
  const [coords, setCoords] = useState<{ lat: number; lng: number } | null>(null);
  const [errorMsg, setErrorMsg] = useState<string>("");
  const [lastSynced, setLastSynced] = useState<Date | null>(null);
  const [showStatus, setShowStatus] = useState<"idle" | "requesting" | "success" | "denied" | "error">("idle");

  // Load existing coordinates from user profile on mount
  useEffect(() => {
    if (user?.latitude && user?.longitude) {
      setCoords({ lat: user.latitude, lng: user.longitude });
      if (user.locationUpdatedAt) {
        setLastSynced(new Date(user.locationUpdatedAt));
      } else {
        setLastSynced(new Date());
      }
      setShowStatus("success");
    }
  }, [user]);

  const saveCoordinatesToDatabase = async (lat: number, lng: number) => {
    if (!token) return;

    try {
      const response = await fetch("/api/user/location", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ latitude: lat, longitude: lng })
      });

      if (response.ok) {
        const data = await response.json();
        setLastSynced(new Date());
        
        // Quietly update our global auth context if the method exists
        if (data.user && login) {
          // Keep state synced in AuthContext
          try {
            const currentToken = localStorage.getItem("token") || token;
            // update local auth state
            localStorage.setItem("user", JSON.stringify(data.user));
          } catch (err) {
            console.error("Failed to sync local user state:", err);
          }
        }
      } else {
        console.warn("Failed to persist coordinates on server.");
      }
    } catch (error) {
      console.error("Error saving coordinates:", error);
    }
  };

  const handleDetectLocation = () => {
    setIsLocating(true);
    setErrorMsg("");
    setShowStatus("requesting");

    if (!navigator.geolocation) {
      setErrorMsg("Your web browser does not support Geolocation services.");
      setShowStatus("error");
      setIsLocating(false);
      return;
    }

    navigator.geolocation.getCurrentPosition(
      async (position) => {
        const lat = position.coords.latitude;
        const lng = position.coords.longitude;
        
        setCoords({ lat, lng });
        setErrorMsg("");
        setShowStatus("success");
        setIsLocating(false);

        // 1. Save to MongoDB (Backend DB)
        await saveCoordinatesToDatabase(lat, lng);

        // 2. Trigger callback
        if (onLocationDetected) {
          const latStr = lat.toFixed(5);
          const lngStr = lng.toFixed(5);
          const addressString = `My Current Location (${latStr}, ${lngStr})`;
          onLocationDetected(addressString, { lat, lng });
        }
      },
      (error) => {
        console.error("Geolocation error:", error);
        setIsLocating(false);

        if (error.code === error.PERMISSION_DENIED) {
          setErrorMsg("Permission denied. Please click the site settings padlock in the browser address bar and enable 'Location' access.");
          setShowStatus("denied");
        } else if (error.code === error.POSITION_UNAVAILABLE) {
          setErrorMsg("Your exact position is currently unavailable from GPS satellites or network.");
          setShowStatus("error");
        } else if (error.code === error.TIMEOUT) {
          setErrorMsg("Location request timed out. Please check your signal strength and try again.");
          setShowStatus("error");
        } else {
          setErrorMsg("An unexpected error occurred while locating your device.");
          setShowStatus("error");
        }
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
    );
  };

  return (
    <div className={`bg-white border border-slate-100 rounded-3xl p-5 shadow-sm space-y-4 ${className}`}>
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="p-1.5 bg-orange-50 text-orange-600 rounded-lg">
            <Navigation className="w-4 h-4 rotate-45 animate-pulse" />
          </div>
          <div>
            <h4 className="text-xs font-black text-slate-800 uppercase tracking-wider">{title}</h4>
            <p className="text-[10px] text-slate-400 font-bold leading-normal">
              {role === "driver" 
                ? "Keeps emergency dispatch routes precise and fast."
                : "Guides community drivers directly to your door."
              }
            </p>
          </div>
        </div>

        {/* Sync status pills */}
        {showStatus === "success" && coords && (
          <span className="flex items-center gap-1 text-[9px] bg-emerald-50 text-emerald-700 px-2.5 py-1 rounded-full font-black uppercase tracking-wider">
            <CheckCircle2 className="w-3 h-3" />
            <span>Live GPS Synced</span>
          </span>
        )}
        {showStatus === "denied" && (
          <span className="flex items-center gap-1 text-[9px] bg-red-50 text-red-700 px-2.5 py-1 rounded-full font-black uppercase tracking-wider">
            <AlertCircle className="w-3 h-3" />
            <span>Blocked</span>
          </span>
        )}
      </div>

      {/* Main interactive segment */}
      <div className="bg-slate-50 border border-slate-100 p-4 rounded-2xl flex flex-col sm:flex-row items-center justify-between gap-4">
        {isLocating ? (
          <div className="flex items-center gap-3 py-1 text-slate-600 font-bold text-xs">
            <Loader2 className="w-4 h-4 text-orange-600 animate-spin" />
            <span>Requesting high-accuracy device location coordinates...</span>
          </div>
        ) : coords ? (
          <div className="text-xs space-y-1 w-full sm:w-auto">
            <div className="flex items-center gap-1.5 font-extrabold text-slate-800">
              <MapPin className="w-3.5 h-3.5 text-orange-600" />
              <span>Registered Coordinates:</span>
            </div>
            <div className="font-mono text-slate-500 font-bold text-[11px] pl-5">
              Lat: <span className="text-slate-800 font-bold">{coords.lat.toFixed(6)}</span> • Lng: <span className="text-slate-800 font-bold">{coords.lng.toFixed(6)}</span>
            </div>
            {lastSynced && (
              <p className="text-[9px] text-slate-400 font-bold pl-5">
                Last synced: {lastSynced.toLocaleTimeString()}
              </p>
            )}
          </div>
        ) : (
          <p className="text-[11px] text-slate-500 font-bold max-w-sm text-center sm:text-left leading-relaxed">
            Your location coordinates have not been saved yet. Let the network detect your GPS for faster dispatches.
          </p>
        )}

        <div className="flex-shrink-0 w-full sm:w-auto">
          {coords ? (
            <button
              type="button"
              onClick={handleDetectLocation}
              disabled={isLocating}
              className="w-full sm:w-auto px-4 py-2 bg-white hover:bg-slate-50 text-slate-700 border border-slate-200 text-xs font-bold rounded-xl transition flex items-center justify-center gap-1.5 cursor-pointer shadow-sm"
            >
              <RefreshCw className={`w-3.5 h-3.5 text-slate-500 ${isLocating ? "animate-spin" : ""}`} />
              <span>Update GPS Location</span>
            </button>
          ) : (
            <button
              type="button"
              onClick={handleDetectLocation}
              disabled={isLocating}
              className="w-full sm:w-auto px-4.5 py-2.5 bg-orange-600 hover:bg-orange-700 text-white text-xs font-black rounded-xl transition flex items-center justify-center gap-1.5 cursor-pointer shadow-md shadow-orange-100"
            >
              <Navigation className="w-3.5 h-3.5 rotate-45" />
              <span>Share My Location</span>
            </button>
          )}
        </div>
      </div>

      {/* Error notification & troubleshooting */}
      {errorMsg && (
        <div className="bg-red-50/50 border border-red-100 p-3.5 rounded-2xl flex items-start gap-2.5 animate-fade-in text-xs">
          <AlertCircle className="w-4 h-4 text-red-600 flex-shrink-0 mt-0.5" />
          <div className="space-y-1 flex-grow">
            <p className="font-extrabold text-red-800">Location Detection Failed</p>
            <p className="text-slate-600 leading-normal font-bold">{errorMsg}</p>
            
            {showStatus === "denied" && (
              <div className="pt-2 flex gap-2">
                <button
                  type="button"
                  onClick={handleDetectLocation}
                  className="px-3 py-1.5 bg-red-100 hover:bg-red-200 text-red-800 text-[10px] font-black uppercase rounded-lg transition cursor-pointer flex items-center gap-1"
                >
                  <RefreshCw className="w-3 h-3" />
                  <span>Retry Detection</span>
                </button>
              </div>
            )}
            
            {showStatus === "error" && (
              <button
                type="button"
                onClick={handleDetectLocation}
                className="mt-2 px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-800 text-[10px] font-black uppercase rounded-lg transition cursor-pointer flex items-center gap-1"
              >
                <RefreshCw className="w-3 h-3" />
                <span>Retry Connection</span>
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
