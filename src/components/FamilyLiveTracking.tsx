import React, { useState, useEffect } from "react";
import { useParams, Link } from "react-router-dom";
import { 
  Share2, 
  Copy, 
  MessageSquare, 
  Mail, 
  Phone, 
  MapPin, 
  Clock, 
  HeartPulse, 
  AlertTriangle, 
  ArrowLeft, 
  ShieldAlert, 
  CheckCircle2, 
  User, 
  Info,
  ExternalLink
} from "lucide-react";
import MapComponent from "./MapComponent";
import { EmergencyRide } from "../types";

export default function FamilyLiveTracking() {
  const { rideId } = useParams<{ rideId: string }>();
  const [ride, setRide] = useState<EmergencyRide | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState<boolean>(false);

  // Fetch ride info initially and set up a status updates polling loop
  useEffect(() => {
    if (!rideId) return;

    const fetchRide = async () => {
      try {
        const res = await fetch(`/api/ride-status/${rideId}`);
        if (!res.ok) {
          throw new Error("Unable to locate active emergency trip.");
        }
        const data = await res.json();
        setRide(data);
        setError(null);
      } catch (err: any) {
        setError(err.message || "Failed to retrieve tracking details.");
      } finally {
        setLoading(false);
      }
    };

    fetchRide();
    const interval = setInterval(fetchRide, 4000); // Poll status every 4 seconds
    return () => clearInterval(interval);
  }, [rideId]);

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-900 text-slate-100 flex flex-col items-center justify-center p-6 text-center">
        <div className="relative flex items-center justify-center w-16 h-16 mb-4">
          <div className="absolute w-full h-full border-4 border-orange-500/25 rounded-full animate-ping" />
          <div className="absolute w-full h-full border-4 border-t-orange-500 border-r-transparent border-b-transparent border-l-transparent rounded-full animate-spin" />
          <HeartPulse className="w-8 h-8 text-orange-500 animate-pulse" />
        </div>
        <h2 className="text-lg font-black tracking-wider uppercase text-slate-200">Retrieving Safe Transit Stream</h2>
        <p className="text-xs text-slate-400 mt-2 max-w-sm">
          Securing encrypted socket link to GramGo volunteer dispatch vehicle telemetry systems. Standby...
        </p>
      </div>
    );
  }

  if (error || !ride) {
    return (
      <div className="min-h-screen bg-slate-900 text-slate-100 flex flex-col items-center justify-center p-6 text-center">
        <div className="w-12 h-12 rounded-full bg-rose-500/10 border border-rose-500/30 flex items-center justify-center mb-4">
          <AlertTriangle className="w-6 h-6 text-rose-500" />
        </div>
        <h2 className="text-lg font-black tracking-wider uppercase text-slate-200">Safe Stream Not Found</h2>
        <p className="text-xs text-slate-400 mt-2 max-w-sm">
          {error || "This active tracking session has ended or is temporarily unavailable."}
        </p>
        <Link 
          to="/" 
          className="mt-6 flex items-center gap-2 px-5 py-2.5 bg-slate-800 hover:bg-slate-700/80 rounded-xl text-xs font-black uppercase tracking-wider transition border border-slate-700/50"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Return Home</span>
        </Link>
      </div>
    );
  }

  // Generate share elements
  const trackingUrl = window.location.href;
  const shareText = `🏥 GramGo Live Emergency Ambulance Tracking!\nPassenger: ${ride.patientName}\nVillage: ${ride.village}\nDestination CHC: ${ride.destinationChc}\nTrack our volunteer driver here in real-time:\n${trackingUrl}`;

  const shareViaWhatsApp = () => {
    window.open(`https://api.whatsapp.com/send?text=${encodeURIComponent(shareText)}`, "_blank");
  };

  const shareViaSMS = () => {
    window.open(`sms:?&body=${encodeURIComponent(shareText)}`, "_blank");
  };

  const shareViaEmail = () => {
    window.open(`mailto:?subject=${encodeURIComponent(`GramGo Active Emergency Tracking (Patient: ${ride.patientName})`)}&body=${encodeURIComponent(shareText)}`, "_blank");
  };

  const copyToClipboard = () => {
    navigator.clipboard.writeText(trackingUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 3000);
  };

  return (
    <div id="family-tracking-root" className="min-h-screen bg-slate-950 text-slate-100 py-8 px-4 sm:px-6">
      <div className="max-w-6xl mx-auto space-y-6">
        
        {/* Header Block */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-slate-900/40 border border-slate-900 rounded-3xl p-6 shadow-xl">
          <div className="space-y-1.5 text-left">
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-[10px] bg-red-500/10 border border-red-500/30 text-red-400 font-black uppercase tracking-widest px-3 py-1 rounded-full animate-pulse flex items-center gap-1.5">
                <ShieldAlert className="w-3.5 h-3.5" />
                <span>Live Family Stream</span>
              </span>
              <span className="text-[10px] bg-slate-800 text-slate-400 font-bold tracking-wider uppercase px-2.5 py-1 rounded-full">
                Trip ID: #{ride.id.substring(0, 8)}
              </span>
            </div>
            <h1 className="text-xl sm:text-2xl font-black tracking-tight text-white flex items-center gap-2">
              <span>Ambulance Tracking HUD</span>
            </h1>
            <p className="text-xs text-slate-400 font-medium">
              Real-time volunteer ambulance tracking for family members & healthcare workers.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <Link 
              to="/" 
              className="flex items-center gap-1.5 px-4 py-2 bg-slate-900 border border-slate-800 hover:bg-slate-800 hover:text-white rounded-xl text-[10px] font-black uppercase tracking-wider transition text-slate-400"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>Portal Main</span>
            </Link>
          </div>
        </div>

        {/* Dynamic Map Visualization Container */}
        <div className="bg-slate-900/40 border border-slate-900 rounded-3xl shadow-xl overflow-hidden">
          <div className="p-4 border-b border-slate-900 bg-slate-900/60 flex items-center justify-between flex-wrap gap-2">
            <div className="flex items-center gap-2">
              <span className="flex h-2.5 w-2.5 relative">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500"></span>
              </span>
              <span className="text-xs font-black tracking-widest text-slate-200 uppercase">
                Active Telemetry Stream
              </span>
            </div>
            
            {/* Status Phase indicators */}
            <div className="text-xs font-black uppercase px-3 py-1 rounded-full bg-orange-500/10 border border-orange-500/30 text-orange-400">
              {ride.status.replace("_", " ")}
            </div>
          </div>

          {/* Map view wrapper */}
          <div className="relative h-[480px] w-full bg-slate-900">
            <MapComponent 
              pickupLocation={ride.village} 
              destinationLocation={ride.destinationChc} 
              driverId={ride.driverId} 
              role="passenger" 
              rideId={ride.id} 
            />
          </div>
        </div>

        {/* Info Grid & Share Toolkit */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          
          {/* Ambulance & Dispatch Information Panel */}
          <div className="lg:col-span-7 bg-slate-900/40 border border-slate-900 rounded-3xl p-6 space-y-6 shadow-xl text-left">
            <h3 className="text-xs font-black tracking-widest text-slate-400 uppercase flex items-center gap-2">
              <User className="w-4 h-4 text-orange-500" />
              Volunteer Ambulance Details
            </h3>

            {ride.driverId ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                <div className="bg-slate-950 border border-slate-900 rounded-2xl p-4 space-y-1.5">
                  <span className="text-[9px] font-black tracking-wider text-slate-500 uppercase block">Volunteer Driver</span>
                  <span className="text-sm font-extrabold text-white block">{ride.driverName}</span>
                  <span className="text-[10px] text-slate-400 font-bold bg-slate-900 px-2 py-0.5 rounded-md inline-block">
                    Verified Emergency Responder
                  </span>
                </div>

                <div className="bg-slate-950 border border-slate-900 rounded-2xl p-4 space-y-1.5">
                  <span className="text-[9px] font-black tracking-wider text-slate-500 uppercase block">Contact Number</span>
                  <a 
                    href={`tel:${ride.driverPhone}`} 
                    className="text-sm font-extrabold text-orange-400 hover:underline flex items-center gap-1 mt-0.5"
                  >
                    <Phone className="w-3.5 h-3.5" />
                    <span>{ride.driverPhone}</span>
                  </a>
                  <span className="text-[9px] text-emerald-400 font-bold block">
                    Tap to Call Responder
                  </span>
                </div>

                <div className="bg-slate-950 border border-slate-900 rounded-2xl p-4 space-y-1.5">
                  <span className="text-[9px] font-black tracking-wider text-slate-500 uppercase block">Ambulance Vehicle</span>
                  <span className="text-sm font-extrabold text-white block">{ride.vehicleType || "Emergency Van"}</span>
                  <span className="text-[10px] font-mono text-slate-400 tracking-wider">
                    Registration Verified
                  </span>
                </div>

                <div className="bg-slate-950 border border-slate-900 rounded-2xl p-4 space-y-1.5">
                  <span className="text-[9px] font-black tracking-wider text-slate-500 uppercase block">Patient Name</span>
                  <span className="text-sm font-extrabold text-white block">{ride.patientName}</span>
                  <span className="text-[10px] text-rose-400 font-bold uppercase flex items-center gap-1">
                    <HeartPulse className="w-3 h-3" />
                    <span>{ride.emergencyType} Case</span>
                  </span>
                </div>
              </div>
            ) : (
              <div className="bg-slate-950 border border-slate-900 rounded-2xl p-6 text-center space-y-2">
                <div className="w-10 h-10 rounded-full bg-amber-500/10 border border-amber-500/20 flex items-center justify-center mx-auto">
                  <Clock className="w-5 h-5 text-amber-500 animate-spin" />
                </div>
                <h4 className="text-xs font-black uppercase text-slate-300">Searching Volunteer Fleet</h4>
                <p className="text-[10px] text-slate-400 max-w-xs mx-auto">
                  Emergency dispatch is finding the nearest volunteer first responder in {ride.village}. Please standby.
                </p>
              </div>
            )}

            {/* Location Indicators */}
            <div className="border-t border-slate-900 pt-5 space-y-3.5">
              <div className="flex items-start gap-3">
                <div className="w-7 h-7 rounded-full bg-orange-500/10 border border-orange-500/20 flex items-center justify-center flex-shrink-0 mt-0.5">
                  <MapPin className="w-3.5 h-3.5 text-orange-500" />
                </div>
                <div>
                  <span className="text-[9px] font-black text-slate-500 uppercase tracking-widest block">Patient Location</span>
                  <span className="text-xs font-extrabold text-white block mt-0.5">{ride.village}</span>
                  {ride.landmark && (
                    <span className="text-[10px] text-slate-400">Landmark: {ride.landmark}</span>
                  )}
                </div>
              </div>

              <div className="flex items-start gap-3">
                <div className="w-7 h-7 rounded-full bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center flex-shrink-0 mt-0.5">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
                </div>
                <div>
                  <span className="text-[9px] font-black text-slate-500 uppercase tracking-widest block">Destination Community Health Centre</span>
                  <span className="text-xs font-extrabold text-white block mt-0.5">{ride.destinationChc}</span>
                  <span className="text-[10px] text-slate-400">Rural Trauma Emergency Unit</span>
                </div>
              </div>
            </div>
          </div>

          {/* Share Toolkit & Live Actions */}
          <div className="lg:col-span-5 bg-slate-900/40 border border-slate-900 rounded-3xl p-6 space-y-5 shadow-xl text-left flex flex-col justify-between">
            <div className="space-y-4">
              <h3 className="text-xs font-black tracking-widest text-slate-400 uppercase flex items-center gap-2">
                <Share2 className="w-4 h-4 text-orange-500" />
                Family Share Toolkit
              </h3>
              <p className="text-xs text-slate-400 leading-relaxed">
                Provide instant tracking updates to relatives, village heads, or hospital emergency departments so that they are fully prepared upon the patient's arrival.
              </p>

              {/* Direct Copy Link Container */}
              <div className="bg-slate-950 border border-slate-900 rounded-2xl p-4 space-y-2">
                <span className="text-[9px] font-black tracking-wider text-slate-500 uppercase block">Tracking Stream Link</span>
                <div className="flex gap-2">
                  <input 
                    type="text" 
                    readOnly 
                    value={trackingUrl} 
                    className="flex-1 bg-slate-900/60 border border-slate-800 rounded-xl px-3 py-2 text-[10px] font-mono text-slate-300 focus:outline-none"
                  />
                  <button
                    onClick={copyToClipboard}
                    className="flex items-center justify-center p-2.5 bg-slate-800 border border-slate-700/80 hover:bg-slate-700 text-white rounded-xl transition cursor-pointer"
                    title="Copy to Clipboard"
                  >
                    <Copy className="w-4 h-4" />
                  </button>
                </div>
                {copied && (
                  <p className="text-[10px] text-emerald-400 font-extrabold flex items-center gap-1 animate-pulse">
                    <span>✓</span> Link copied! Share on any messenger.
                  </p>
                )}
              </div>
            </div>

            {/* Grid of sharing buttons */}
            <div className="space-y-3.5 pt-4">
              <button
                onClick={shareViaWhatsApp}
                className="w-full flex items-center justify-center gap-2 py-3 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl font-extrabold text-xs uppercase tracking-wider transition shadow-lg cursor-pointer"
              >
                <MessageSquare className="w-4 h-4" />
                <span>Share via WhatsApp</span>
              </button>

              <div className="grid grid-cols-2 gap-3">
                <button
                  onClick={shareViaSMS}
                  className="flex items-center justify-center gap-2 py-3 bg-slate-800 border border-slate-700/80 hover:bg-slate-700 text-white rounded-xl font-extrabold text-[10px] uppercase tracking-wider transition cursor-pointer"
                >
                  <MessageSquare className="w-3.5 h-3.5 text-orange-400" />
                  <span>Share via SMS</span>
                </button>

                <button
                  onClick={shareViaEmail}
                  className="flex items-center justify-center gap-2 py-3 bg-slate-800 border border-slate-700/80 hover:bg-slate-700 text-white rounded-xl font-extrabold text-[10px] uppercase tracking-wider transition cursor-pointer"
                >
                  <Mail className="w-3.5 h-3.5 text-orange-400" />
                  <span>Share via Email</span>
                </button>
              </div>

              {/* Safety notice disclaimer */}
              <div className="bg-slate-950 border border-slate-900 rounded-xl p-3 flex items-start gap-2 text-slate-500">
                <Info className="w-4 h-4 text-slate-500 flex-shrink-0 mt-0.5" />
                <p className="text-[9px] leading-relaxed">
                  GramGo utilizes secure end-to-end Socket tracking. This public page can be viewed by anyone with the link to ensure direct safety orchestration.
                </p>
              </div>
            </div>

          </div>

        </div>

      </div>
    </div>
  );
}
