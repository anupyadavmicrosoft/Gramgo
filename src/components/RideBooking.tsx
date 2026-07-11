import React, { useState, useEffect } from "react";
import { 
  MapPin, 
  Navigation, 
  Bike, 
  Car, 
  AlertCircle, 
  Phone, 
  Clock, 
  Compass, 
  Loader, 
  CheckCircle, 
  XCircle, 
  DollarSign, 
  Navigation2, 
  ShieldCheck,
  ChevronLeft,
  ChevronRight,
  Sparkles,
  Info,
  Ticket,
  X
} from "lucide-react";
import { useAuth } from "../context/AuthContext";
import { IBooking } from "../types";
import MapComponent from "./MapComponent";
import CurrentLocationTracker from "./CurrentLocationTracker";

export default function RideBooking() {
  const { token, user } = useAuth();

  // Active booking & status state
  const [activeBooking, setActiveBooking] = useState<IBooking | null>(null);
  const [isLoadingActive, setIsLoadingActive] = useState(true);

  // Form states
  const [pickupLocation, setPickupLocation] = useState("");
  const [destination, setDestination] = useState("");
  const [rideType, setRideType] = useState<"Bike" | "Auto" | "Car" | "Emergency">("Auto");
  const [notes, setNotes] = useState("");
  
  // Geolocation loading state
  const [isGettingLocation, setIsGettingLocation] = useState(false);
  const [locationError, setLocationError] = useState("");

  // Estimation state
  const [estimate, setEstimate] = useState<{ estimatedDistance: number; estimatedTime: number; estimatedFare: number } | null>(null);
  const [isEstimating, setIsEstimating] = useState(false);

  // Form submission state
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState("");

  // Coupon Voucher States
  const [couponCode, setCouponCode] = useState("");
  const [appliedCoupon, setAppliedCoupon] = useState<any>(null);
  const [discountApplied, setDiscountApplied] = useState(0);
  const [couponError, setCouponError] = useState("");
  const [isValidatingCoupon, setIsValidatingCoupon] = useState(false);

  // Live driver coordinates for active booking
  const [driverCoords, setDriverCoords] = useState<{ lat: number; lng: number; lastUpdated?: string } | null>(null);

  // Poll driver coordinates if there's an assigned driver in an active ride
  useEffect(() => {
    if (!token || !activeBooking || !activeBooking.driverId || ["completed", "cancelled"].includes(activeBooking.status)) {
      setDriverCoords(null);
      return;
    }

    const fetchDriverLocation = async () => {
      try {
        const res = await fetch(`/api/drivers/${activeBooking.driverId}/location`, {
          headers: { "Authorization": `Bearer ${token}` }
        });
        if (res.ok) {
          const data = await res.json();
          if (data.latitude && data.longitude) {
            setDriverCoords({
              lat: data.latitude,
              lng: data.longitude,
              lastUpdated: data.locationUpdatedAt ? new Date(data.locationUpdatedAt).toLocaleTimeString() : undefined
            });
          }
        }
      } catch (error) {
        console.error("Failed to poll driver location:", error);
      }
    };

    fetchDriverLocation();
    const interval = setInterval(fetchDriverLocation, 5000); // refresh every 5 seconds
    return () => clearInterval(interval);
  }, [token, activeBooking?.driverId, activeBooking?.status]);

  // History state
  const [history, setHistory] = useState<IBooking[]>([]);
  const [historyPage, setHistoryPage] = useState(1);
  const [totalHistory, setTotalHistory] = useState(0);
  const [isLoadingHistory, setIsLoadingHistory] = useState(false);
  const limit = 5;

  // Fetch active booking on mount
  useEffect(() => {
    if (!token) return;
    fetchActiveBooking();
    fetchHistory();
  }, [token, historyPage]);

  // Listen for real-time Socket.IO ride status events to update passenger state instantly
  useEffect(() => {
    if (!token) return;
    const handleStatusUpdate = () => {
      console.log("Real-time Socket.IO ride status event caught! Refreshing passenger active booking...");
      fetchActiveBookingSilently();
    };

    window.addEventListener("gramgo_ride_status_updated", handleStatusUpdate);
    return () => {
      window.removeEventListener("gramgo_ride_status_updated", handleStatusUpdate);
    };
  }, [token]);

  // Dynamic automatic estimation effect: query API whenever pickup/destination/rideType updates
  useEffect(() => {
    setAppliedCoupon(null);
    setDiscountApplied(0);
    setCouponError("");

    if (!pickupLocation.trim() || !destination.trim() || !rideType) {
      setEstimate(null);
      return;
    }

    const timer = setTimeout(() => {
      fetchEstimation();
    }, 500); // 500ms debounce

    return () => clearTimeout(timer);
  }, [pickupLocation, destination, rideType]);

  // Poll active booking status if it exists and is not finalized
  useEffect(() => {
    if (!activeBooking || ["completed", "cancelled"].includes(activeBooking.status)) return;

    const interval = setInterval(() => {
      fetchActiveBookingSilently();
    }, 4000);

    return () => clearInterval(interval);
  }, [activeBooking]);

  const fetchActiveBooking = async () => {
    setIsLoadingActive(true);
    try {
      const res = await fetch("/api/bookings/active", {
        headers: { "Authorization": `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setActiveBooking(data);
        if (data) {
          // prefill form fields if checking an active one
          setPickupLocation(data.pickupLocation);
          setDestination(data.destination);
          setRideType(data.rideType);
          setNotes(data.notes || "");
        }
      }
    } catch (e) {
      console.error("Error fetching active booking:", e);
    } finally {
      setIsLoadingActive(false);
    }
  };

  const fetchActiveBookingSilently = async () => {
    try {
      const res = await fetch("/api/bookings/active", {
        headers: { "Authorization": `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setActiveBooking(data);
        if (!data && activeBooking) {
          // If active booking was completed in background, refresh history
          fetchHistory();
        }
      }
    } catch (e) {
      console.error("Silent active booking fetch error:", e);
    }
  };

  const fetchHistory = async () => {
    setIsLoadingHistory(true);
    try {
      const res = await fetch(`/api/bookings/history?page=${historyPage}&limit=${limit}`, {
        headers: { "Authorization": `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setHistory(data.bookings || []);
        setTotalHistory(data.total || 0);
      }
    } catch (e) {
      console.error("Error fetching history:", e);
    } finally {
      setIsLoadingHistory(false);
    }
  };

  const fetchEstimation = async () => {
    setIsEstimating(true);
    try {
      const res = await fetch("/api/bookings/estimate", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token}`
        },
        body: JSON.stringify({ pickupLocation, destination, rideType })
      });
      if (res.ok) {
        const data = await res.json();
        setEstimate(data);
      }
    } catch (e) {
      console.error("Error estimating booking:", e);
    } finally {
      setIsEstimating(false);
    }
  };

  const handleValidateCoupon = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!couponCode.trim()) {
      setCouponError("Please enter a voucher code.");
      return;
    }
    if (!estimate) {
      setCouponError("Please specify pickup and destination to calculate fare first.");
      return;
    }

    setCouponError("");
    setIsValidatingCoupon(true);
    try {
      const mappedVehicleType = rideType === "Auto" 
        ? "Auto Rickshaw" 
        : rideType === "Emergency" 
        ? "Bolero SUV" 
        : rideType === "Bike" 
        ? "E-Rickshaw" 
        : "Bolero SUV";

      const res = await fetch("/api/coupons/validate", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token}`
        },
        body: JSON.stringify({
          code: couponCode.toUpperCase().trim(),
          rideAmount: estimate.estimatedFare,
          emergencyType: notes || "Other",
          village: user?.village,
          vehicleType: mappedVehicleType
        })
      });

      const data = await res.json();
      if (!res.ok) {
        setAppliedCoupon(null);
        setDiscountApplied(0);
        setCouponError(data.error || "Invalid coupon code.");
      } else {
        setAppliedCoupon(data.coupon);
        setDiscountApplied(data.discountApplied);
        setCouponError("");
      }
    } catch (err) {
      setCouponError("Failed to communicate with voucher system.");
    } finally {
      setIsValidatingCoupon(false);
    }
  };

  const handleRemoveCoupon = () => {
    setCouponCode("");
    setAppliedCoupon(null);
    setDiscountApplied(0);
    setCouponError("");
  };

  const handleGetCurrentLocation = () => {
    setIsGettingLocation(true);
    setLocationError("");
    
    if (!navigator.geolocation) {
      setLocationError("Geolocation is not supported by your browser.");
      setIsGettingLocation(false);
      // Graceful fallback
      if (user?.village) {
        setPickupLocation(`My Village House (${user.village})`);
      }
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (position) => {
        const lat = position.coords.latitude.toFixed(5);
        const lon = position.coords.longitude.toFixed(5);
        const locationStr = `My Current Location (${lat}, ${lon})`;
        setPickupLocation(locationStr);
        setIsGettingLocation(false);
      },
      (error) => {
        console.warn("Geolocation error:", error);
        let errorMsg = "Unable to retrieve your exact location. Using your registered home village instead.";
        if (error.code === error.PERMISSION_DENIED) {
          errorMsg = "Location permissions denied. Please enable them or write your location manually.";
        }
        setLocationError(errorMsg);
        setIsGettingLocation(false);
        
        // Graceful pre-fill based on registered user village
        if (user?.village) {
          setPickupLocation(`Panchayat Office, ${user.village}`);
        }
      },
      { timeout: 8000 }
    );
  };

  const handleBookRide = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitError("");
    
    if (!pickupLocation.trim() || !destination.trim()) {
      setSubmitError("Pickup and Destination locations are required.");
      return;
    }

    setIsSubmitting(true);
    try {
      const res = await fetch("/api/bookings", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token}`
        },
        body: JSON.stringify({
          pickupLocation,
          destination,
          rideType,
          notes
        })
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Failed to book your ride.");
      }

      setActiveBooking(data);

      // Apply coupon if present
      if (appliedCoupon) {
        try {
          const mappedVehicleType = rideType === "Auto" 
            ? "Auto Rickshaw" 
            : rideType === "Emergency" 
            ? "Bolero SUV" 
            : rideType === "Bike" 
            ? "E-Rickshaw" 
            : "Bolero SUV";

          await fetch("/api/coupons/apply", {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              "Authorization": `Bearer ${token}`
            },
            body: JSON.stringify({
              code: appliedCoupon.code,
              rideId: data.id || data._id,
              rideAmount: estimate?.estimatedFare || data.estimatedFare || 0,
              emergencyType: notes || "Other",
              village: user?.village,
              vehicleType: mappedVehicleType
            })
          });
        } catch (couponApplyErr) {
          console.error("Failed to automatically apply coupon:", couponApplyErr);
        }
      }

      handleRemoveCoupon(); // Clear coupon input state
      fetchHistory();
    } catch (err: any) {
      setSubmitError(err.message || "An unexpected error occurred.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCancelBooking = async (id: string) => {
    if (!window.confirm("Are you sure you want to cancel this ride booking?")) return;

    try {
      const res = await fetch(`/api/bookings/${id}/cancel`, {
        method: "POST",
        headers: { "Authorization": `Bearer ${token}` }
      });
      const data = await res.json();
      if (res.ok) {
        setActiveBooking(data);
        fetchHistory();
      } else {
        alert(data.error || "Failed to cancel booking.");
      }
    } catch (e) {
      console.error(e);
      alert("Error cancelling booking.");
    }
  };

  const totalPages = Math.ceil(totalHistory / limit);

  return (
    <div id="ride-booking-module" className="space-y-8 animate-fade-in">
      {/* Title Header */}
      <div className="border-b border-orange-50 pb-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-black text-slate-900 tracking-tight flex items-center gap-2">
            <Compass className="w-5 h-5 text-orange-600 animate-spin-slow" />
            <span>GramGo Ride Booking Service</span>
          </h2>
          <p className="text-xs text-slate-500 font-semibold mt-0.5">
            Book local transport options (Bikes, Autos, Cars, and Emergencies) with vetted rural volunteers.
          </p>
        </div>
        <div className="flex items-center gap-2 px-3 py-1.5 bg-emerald-50 rounded-full border border-emerald-100">
          <ShieldCheck className="w-4 h-4 text-emerald-600" />
          <span className="text-[10px] font-black text-emerald-800 uppercase tracking-wider">Panchayat Verified Drivers</span>
        </div>
      </div>

      {isLoadingActive ? (
        <div className="flex flex-col items-center justify-center py-16 border border-slate-100 bg-white rounded-2xl">
          <Loader className="w-8 h-8 text-orange-600 animate-spin mb-2" />
          <span className="text-xs font-black text-slate-500">Retrieving transit state details...</span>
        </div>
      ) : activeBooking && ["pending", "accepted"].includes(activeBooking.status) ? (
        /* ================= ACTIVE BOOKING TRACKING VIEW ================= */
        <div className="bg-gradient-to-br from-slate-900 via-slate-800 to-slate-950 text-white rounded-2xl p-6 md:p-8 shadow-xl border border-slate-700 relative overflow-hidden">
          <div className="absolute top-0 right-0 p-8 opacity-5 pointer-events-none">
            <Navigation className="w-48 h-48 animate-pulse" />
          </div>

          <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 border-b border-slate-700/60 pb-6">
            <div>
              <span className="inline-flex items-center gap-1 px-3 py-1 bg-amber-500/10 border border-amber-500/20 text-amber-400 rounded-full text-[10px] font-black uppercase tracking-wider mb-3 animate-pulse">
                <Navigation2 className="w-3.5 h-3.5 rotate-45" />
                Live Travel Dispatch Active
              </span>
              <h3 className="text-xl font-black tracking-tight text-white">
                Transit from {activeBooking.pickupLocation}
              </h3>
              <p className="text-xs font-bold text-slate-400 mt-1">
                Destination: <span className="text-white font-extrabold">{activeBooking.destination}</span>
              </p>
            </div>

            <div className="text-left md:text-right">
              <span className="text-[9px] text-slate-400 block font-black uppercase tracking-widest">CURRENT STATUS</span>
              <span className={`inline-block px-3.5 py-1.5 rounded-xl font-black text-xs uppercase tracking-wider mt-1.5 shadow-md ${
                activeBooking.status === "pending"
                  ? "bg-amber-500 text-slate-950 animate-pulse"
                  : "bg-emerald-500 text-white"
              }`}>
                {activeBooking.status}
              </span>
            </div>
          </div>

          {/* Graphical Journey Progress Bar */}
          <div className="my-8">
            <div className="flex items-center justify-between text-[11px] font-black text-slate-400 mb-2">
              <span className={activeBooking.status === "pending" ? "text-amber-400" : "text-emerald-400"}>1. Dispatch Sent</span>
              <span className={activeBooking.status === "accepted" ? "text-amber-400 font-extrabold" : activeBooking.driverId ? "text-emerald-400" : "text-slate-600"}>2. Driver Matched</span>
              <span className={activeBooking.status === "completed" ? "text-emerald-400" : "text-slate-600"}>3. Safe Arrival</span>
            </div>
            
            <div className="w-full bg-slate-700/60 h-3 rounded-full overflow-hidden flex p-0.5 border border-slate-600">
              <div className={`h-full rounded-full transition-all duration-1000 ${
                activeBooking.status === "pending" 
                  ? "w-1/3 bg-gradient-to-r from-amber-500 to-amber-400 animate-pulse" 
                  : "w-2/3 bg-gradient-to-r from-emerald-500 to-emerald-400 animate-pulse"
              }`} />
            </div>
            
            {activeBooking.status === "pending" && (
              <span className="block text-[10px] text-slate-400 text-center font-bold mt-2 animate-pulse">
                Matching nearby available drivers. This normally takes 5 seconds...
              </span>
            )}
          </div>

          {/* Active Live Dispatch Map */}
          <div className="my-6 text-slate-900">
            <MapComponent 
              pickupLocation={activeBooking.pickupLocation}
              destinationLocation={activeBooking.destination}
              driverId={activeBooking.driverId || undefined}
              role="passenger"
              rideId={activeBooking.id}
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-4">
            {/* Driver Match Information */}
            {activeBooking.driverId ? (
              <div className="bg-slate-800/80 rounded-xl p-5 border border-slate-700 space-y-4 shadow-inner">
                <div>
                  <span className="text-[10px] text-slate-400 font-black uppercase tracking-wider block">YOUR VOLUNTEER HERO</span>
                  <p className="text-base font-black text-white mt-1">{activeBooking.driverName}</p>
                </div>

                <div className="grid grid-cols-2 gap-4 pt-1">
                  <div>
                    <span className="text-[9px] text-slate-500 font-black uppercase block">VEHICLE CATEGORY</span>
                    <span className="text-xs font-bold text-slate-300 block capitalize">{activeBooking.rideType} Transport</span>
                  </div>
                  <div>
                    <span className="text-[9px] text-slate-500 font-black uppercase block">CONTACT PHONE</span>
                    <a href={`tel:${activeBooking.driverPhone}`} className="text-xs font-black text-orange-400 hover:underline flex items-center gap-1 mt-0.5">
                      <Phone className="w-3.5 h-3.5" />
                      {activeBooking.driverPhone}
                    </a>
                  </div>
                </div>

                {driverCoords && (
                  <div className="pt-3 border-t border-slate-700/50 flex items-center justify-between">
                    <div className="flex items-center gap-1.5 text-xs text-orange-400 font-bold">
                      <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                      <span>Driver GPS Active</span>
                    </div>
                    <span className="text-[10px] text-slate-400 font-mono font-bold">
                      {driverCoords.lat.toFixed(4)}, {driverCoords.lng.toFixed(4)}
                    </span>
                  </div>
                )}
              </div>
            ) : (
              <div className="bg-slate-800/40 rounded-xl p-5 border border-dashed border-slate-700 flex flex-col items-center justify-center text-center">
                <Loader className="w-6 h-6 text-amber-500 animate-spin mb-2" />
                <p className="text-xs font-bold text-slate-300">Searching active volunteer operators...</p>
                <p className="text-[10px] text-slate-500 mt-1">Checking available bikes and rickshaws in Ghazipur.</p>
              </div>
            )}

            {/* Travel Estimate & Calculations */}
            <div className="bg-slate-800/50 rounded-xl p-5 border border-slate-700 flex flex-col justify-between gap-4">
              <div className="grid grid-cols-3 gap-2 text-center">
                <div className="p-2.5 bg-slate-800/80 rounded-xl">
                  <span className="text-[9px] text-slate-400 font-black block uppercase">DISTANCE</span>
                  <span className="text-sm font-black text-orange-400 mt-1 block">{activeBooking.estimatedDistance} KM</span>
                </div>
                <div className="p-2.5 bg-slate-800/80 rounded-xl">
                  <span className="text-[9px] text-slate-400 font-black block uppercase">DURATION</span>
                  <span className="text-sm font-black text-orange-400 mt-1 block">{activeBooking.estimatedTime} MINS</span>
                </div>
                <div className="p-2.5 bg-slate-800/80 rounded-xl">
                  <span className="text-[9px] text-slate-400 font-black block uppercase">EST. FARE</span>
                  <span className="text-sm font-black text-emerald-400 mt-1 block">
                    {activeBooking.estimatedFare === 0 ? "FREE" : `₹${activeBooking.estimatedFare}`}
                  </span>
                </div>
              </div>

              {activeBooking.notes && (
                <p className="text-xs text-slate-400 font-semibold italic border-t border-slate-700/50 pt-2.5">
                  " {activeBooking.notes} "
                </p>
              )}
            </div>
          </div>

          <div className="mt-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-t border-slate-700/60 pt-6">
            <p className="text-[10px] text-slate-400 leading-normal max-w-lg font-medium">
              We monitor all volunteer bookings via GPS. In case of safety issues or delays, click the emergency call button or dial 112 directly.
            </p>
            
            <button
              onClick={() => handleCancelBooking(activeBooking.id)}
              className="px-5 py-2.5 bg-red-600 hover:bg-red-700 text-white rounded-xl text-xs font-black uppercase transition-all shadow-md shadow-red-950/40 cursor-pointer self-start sm:self-auto"
            >
              Cancel This Ride
            </button>
          </div>
        </div>
      ) : (
        /* ================= NEW BOOKING FORM VIEW ================= */
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          {/* Main Booking Form */}
          <div className="lg:col-span-7 bg-white rounded-2xl border border-orange-50/80 p-6 shadow-sm space-y-6">
            <h3 className="text-base font-black text-slate-800 border-b border-slate-100 pb-3">
              Request Travel Booking
            </h3>

            <form onSubmit={handleBookRide} className="space-y-6">
              {submitError && (
                <div className="p-4 bg-red-50 border border-red-100 text-red-700 rounded-xl text-xs flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 flex-shrink-0" />
                  <span className="font-semibold">{submitError}</span>
                </div>
              )}

              {/* Pickup Location Field with Location Button */}
              <div className="space-y-1.5">
                <div className="flex justify-between items-center">
                  <label className="text-xs font-black text-slate-700">Pickup Address / Village Point *</label>
                  <button
                    type="button"
                    onClick={handleGetCurrentLocation}
                    disabled={isGettingLocation}
                    className="text-[11px] font-black text-orange-600 hover:text-orange-700 hover:underline flex items-center gap-1 cursor-pointer disabled:opacity-50"
                  >
                    {isGettingLocation ? (
                      <>
                        <Loader className="w-3 h-3 animate-spin" />
                        <span>Locating...</span>
                      </>
                    ) : (
                      <>
                        <Navigation className="w-3 h-3 rotate-45 text-orange-600" />
                        <span>Use Current Location</span>
                      </>
                    )}
                  </button>
                </div>
                
                <div className="relative">
                  <span className="absolute left-3.5 top-3.5 text-slate-400">
                    <MapPin className="w-4 h-4" />
                  </span>
                  <input
                    type="text"
                    required
                    value={pickupLocation}
                    onChange={(e) => setPickupLocation(e.target.value)}
                    className="w-full bg-slate-50 hover:bg-slate-50/50 border border-slate-200 text-slate-800 text-xs font-bold pl-10 pr-4 py-3 rounded-xl focus:border-orange-500 outline-none transition"
                    placeholder="Enter pickup point or click Use Current Location"
                  />
                </div>

                {locationError && (
                  <p className="text-[10px] font-bold text-amber-600 flex items-center gap-1 mt-1 leading-normal">
                    <Info className="w-3 h-3 flex-shrink-0" />
                    <span>{locationError}</span>
                  </p>
                )}

                {/* Highly interactive high-fidelity GPS device tracker */}
                <CurrentLocationTracker 
                  role="passenger" 
                  title="Detect My Current Location" 
                  onLocationDetected={(address) => {
                    setPickupLocation(address);
                  }}
                  className="mt-2 border-dashed border-orange-100 bg-orange-50/10"
                />
              </div>

              {/* Destination Location Field */}
              <div className="space-y-1.5">
                <label className="text-xs font-black text-slate-700 block">Where are you going? (Destination) *</label>
                <div className="relative">
                  <span className="absolute left-3.5 top-3.5 text-slate-400">
                    <MapPin className="w-4 h-4 text-emerald-500" />
                  </span>
                  <input
                    type="text"
                    required
                    value={destination}
                    onChange={(e) => setDestination(e.target.value)}
                    className="w-full bg-slate-50 hover:bg-slate-50/50 border border-slate-200 text-slate-800 text-xs font-bold pl-10 pr-4 py-3 rounded-xl focus:border-orange-500 outline-none transition"
                    placeholder="Enter destination village, market or clinic"
                  />
                </div>
              </div>

              {/* Vehicle Options Grid selector */}
              <div className="space-y-2">
                <label className="text-xs font-black text-slate-700 block">Select Ride Option *</label>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  {[
                    { id: "Bike", icon: Bike, label: "Bike", text: "Swift & Solo" },
                    { id: "Auto", icon: Car, label: "Auto", text: "Standard Rural" },
                    { id: "Car", icon: Car, label: "Car/SUV", text: "Premium Comfort" },
                    { id: "Emergency", icon: AlertCircle, label: "Emergency", text: "Zero Cost" }
                  ].map(option => {
                    const active = rideType === option.id;
                    const IconComp = option.icon;
                    return (
                      <button
                        key={option.id}
                        type="button"
                        onClick={() => setRideType(option.id as any)}
                        className={`p-3.5 rounded-xl border-2 text-left flex flex-col justify-between gap-3 cursor-pointer transition ${
                          active 
                            ? "border-orange-600 bg-orange-50/40 text-orange-950" 
                            : "border-slate-100 bg-slate-50/50 hover:bg-slate-50 text-slate-700"
                        }`}
                      >
                        <span className={`p-1.5 rounded-lg w-fit ${
                          active 
                            ? option.id === "Emergency" ? "bg-red-100 text-red-600" : "bg-orange-100 text-orange-600"
                            : "bg-white text-slate-500 border border-slate-100"
                        }`}>
                          <IconComp className="w-4 h-4" />
                        </span>
                        
                        <div>
                          <p className="text-xs font-extrabold block leading-tight">{option.label}</p>
                          <p className="text-[9px] text-slate-400 font-bold block leading-tight mt-0.5">{option.text}</p>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Notes for Driver */}
              <div className="space-y-1.5">
                <label className="text-xs font-black text-slate-700 block">Notes for Driver (Optional)</label>
                <textarea
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  rows={2}
                  className="w-full bg-slate-50 hover:bg-slate-50/50 border border-slate-200 text-slate-800 text-xs font-bold p-3 rounded-xl focus:border-orange-500 outline-none transition resize-none"
                  placeholder="e.g. Near old banyan tree, carrying shopping bags"
                />
              </div>

              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full flex items-center justify-center space-x-1.5 px-6 py-3.5 bg-orange-600 hover:bg-orange-700 text-white rounded-xl text-xs font-extrabold transition-all shadow-md shadow-orange-100 disabled:opacity-50 cursor-pointer"
              >
                {isSubmitting ? (
                  <>
                    <Loader className="w-4 h-4 animate-spin" />
                    <span>BOOKING TRANSIT DISPATCH...</span>
                  </>
                ) : (
                  <>
                    <Navigation2 className="w-4 h-4 rotate-45" />
                    <span>CONFIRM & BOOK VOLUNTEER RIDE</span>
                  </>
                )}
              </button>
            </form>
          </div>

          {/* Side Estimate Panel */}
          <div className="lg:col-span-5 flex flex-col gap-6">
            {/* Live Interactive Map */}
            <MapComponent 
              pickupLocation={pickupLocation}
              destinationLocation={destination}
              onLocationSelect={(type, address) => {
                if (type === "pickup") setPickupLocation(address);
                else setDestination(address);
              }}
            />

            <div className="bg-gradient-to-br from-orange-50 to-orange-100/30 rounded-2xl border border-orange-100 p-6 space-y-6">
              <div className="flex items-center gap-2">
                <span className="p-1.5 bg-orange-100 text-orange-600 rounded-lg">
                  <Sparkles className="w-4 h-4 text-orange-600" />
                </span>
                <h4 className="text-sm font-black text-slate-800">Dynamic Fare Estimator</h4>
              </div>

              {isEstimating ? (
                <div className="flex items-center gap-2 py-4 text-slate-500">
                  <Loader className="w-4 h-4 animate-spin text-orange-600" />
                  <span className="text-xs font-black">Calculating distance and local rates...</span>
                </div>
              ) : estimate ? (
                <div className="space-y-4 animate-fade-in">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="bg-white/80 p-3 rounded-xl border border-orange-100/50">
                      <span className="text-[9px] text-slate-400 font-black block uppercase">Est. Distance</span>
                      <span className="text-base font-black text-slate-800 mt-1 block">{estimate.estimatedDistance} KM</span>
                    </div>
                    <div className="bg-white/80 p-3 rounded-xl border border-orange-100/50">
                      <span className="text-[9px] text-slate-400 font-black block uppercase">Est. Duration</span>
                      <span className="text-base font-black text-slate-800 mt-1 block">{estimate.estimatedTime} MINS</span>
                    </div>
                  </div>

                  {/* Coupon Exemption Code Input */}
                  <div className="bg-white/90 p-4 rounded-xl border border-orange-100 shadow-sm space-y-3">
                    <span className="text-[10px] text-slate-500 font-bold uppercase tracking-wider block">
                      Subsidy Exemption / Coupon Code
                    </span>
                    {!appliedCoupon ? (
                      <form onSubmit={handleValidateCoupon} className="flex gap-2">
                        <input
                          type="text"
                          placeholder="Enter voucher (e.g. HEALTH50)"
                          value={couponCode}
                          onChange={(e) => setCouponCode(e.target.value)}
                          className="flex-1 px-3 py-2 bg-slate-50 focus:bg-white rounded-lg border border-slate-200 text-xs font-bold text-slate-800 uppercase placeholder-slate-400 focus:outline-none focus:border-orange-500 transition"
                        />
                        <button
                          type="submit"
                          disabled={isValidatingCoupon}
                          className="px-4 py-2 bg-slate-900 hover:bg-slate-800 disabled:bg-slate-300 text-white font-extrabold rounded-lg text-xs transition cursor-pointer"
                        >
                          {isValidatingCoupon ? "Checking..." : "Apply"}
                        </button>
                      </form>
                    ) : (
                      <div className="flex items-center justify-between bg-emerald-50 border border-emerald-200 text-emerald-800 p-3 rounded-lg text-xs font-extrabold">
                        <div className="flex items-center gap-2">
                          <Ticket className="w-4 h-4 text-emerald-600 shrink-0" />
                          <div>
                            <span className="block font-black uppercase text-emerald-950">
                              {appliedCoupon.code} Applied!
                            </span>
                            <span className="text-[10px] text-emerald-700 font-semibold block">
                              -{appliedCoupon.discountType === "fixed" ? `₹${appliedCoupon.discountValue}` : `${appliedCoupon.discountValue}%`} voucher discount
                            </span>
                          </div>
                        </div>
                        <button
                          type="button"
                          onClick={handleRemoveCoupon}
                          className="p-1 text-emerald-700 hover:text-rose-600 rounded-md transition cursor-pointer"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      </div>
                    )}
                    {couponError && (
                      <p className="text-[10px] text-rose-600 font-bold flex items-center gap-1">
                        <AlertCircle className="w-3.5 h-3.5" />
                        <span>{couponError}</span>
                      </p>
                    )}
                  </div>

                  <div className="bg-slate-900 text-white rounded-xl p-4 flex items-center justify-between">
                    <div>
                      <span className="text-[9px] text-slate-400 font-black block uppercase">
                        {discountApplied > 0 ? "ESTIMATED TOTAL FARE" : "TOTAL VALUE"}
                      </span>
                      {discountApplied > 0 ? (
                        <div className="flex items-baseline gap-2 mt-0.5">
                          <span className="text-sm font-bold line-through text-slate-400">
                            ₹{estimate.estimatedFare}
                          </span>
                          <span className="text-lg font-black text-emerald-400">
                            {Math.max(0, estimate.estimatedFare - discountApplied) === 0 
                              ? "FREE" 
                              : `₹${Math.max(0, estimate.estimatedFare - discountApplied)}`
                            }
                          </span>
                        </div>
                      ) : (
                        <span className="text-lg font-black text-emerald-400 block mt-0.5">
                          {estimate.estimatedFare === 0 ? "FREE" : `₹${estimate.estimatedFare}`}
                        </span>
                      )}
                    </div>
                    <span className="text-[10px] font-black uppercase text-emerald-400 tracking-wider bg-emerald-500/10 px-2.5 py-1 rounded-full border border-emerald-500/20">
                      {rideType === "Emergency" ? "Panchayat Funded" : "Cash on Delivery"}
                    </span>
                  </div>

                  <p className="text-[10px] text-slate-500 leading-normal font-semibold">
                    * Rates are determined by local gram sabha collectives to cover fuel costs and driver incentives fairly.
                  </p>
                </div>
              ) : (
                <div className="py-6 text-center bg-white/40 rounded-xl border border-dashed border-orange-200">
                  <p className="text-xs text-slate-500 font-bold px-4">
                    Enter both pickup and destination locations above to retrieve instant distance, time, and budget fares!
                  </p>
                </div>
              )}
            </div>

            {/* Support/Info Alert */}
            <div className="bg-white rounded-2xl border border-slate-100 p-5 space-y-3.5">
              <div className="flex items-center gap-1.5">
                <Info className="w-4 h-4 text-slate-400" />
                <span className="text-xs font-black uppercase text-slate-500 tracking-wider">Travel Guidelines</span>
              </div>
              <ul className="text-[10px] text-slate-500 font-bold space-y-2 leading-relaxed list-disc list-inside">
                <li>Bikes are perfect for quick single commutes across fields and dirt roads.</li>
                <li>Autos can accommodate up to 3 people with modest cargo weight easily.</li>
                <li>Emergency category triggers the standard free ambulance service queue.</li>
              </ul>
            </div>
          </div>
        </div>
      )}

      {/* ================= BOOKING HISTORY VIEW ================= */}
      <div className="bg-white rounded-2xl border border-orange-50/50 p-6 shadow-sm space-y-4">
        <div className="border-b border-slate-50 pb-3">
          <h3 className="text-sm font-black text-slate-800">Your Travel Booking History</h3>
          <p className="text-[11px] text-slate-400 font-bold mt-0.5">Complete ledger of general commutes requested from this account.</p>
        </div>

        {isLoadingHistory ? (
          <div className="flex items-center justify-center py-12">
            <Loader className="w-6 h-6 text-orange-600 animate-spin mr-2" />
            <span className="text-xs font-black text-slate-400">Fetching previous travel registers...</span>
          </div>
        ) : history.length > 0 ? (
          <div className="space-y-3">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="border-b border-slate-100 text-slate-400 font-black uppercase tracking-wider text-[10px]">
                    <th className="py-2.5">Date</th>
                    <th className="py-2.5">Pickup & Destination</th>
                    <th className="py-2.5">Option</th>
                    <th className="py-2.5">Driver Match</th>
                    <th className="py-2.5">Fare</th>
                    <th className="py-2.5">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50 text-slate-700 font-bold">
                  {history.map((item) => (
                    <tr key={item.id} className="hover:bg-slate-50/50 transition">
                      <td className="py-3 text-slate-400 font-medium">
                        {new Date(item.createdAt).toLocaleDateString("en-IN", {
                          day: "numeric",
                          month: "short",
                          hour: "2-digit",
                          minute: "2-digit"
                        })}
                      </td>
                      <td className="py-3 max-w-xs truncate">
                        <div className="flex flex-col gap-0.5">
                          <span className="text-slate-800 truncate">{item.pickupLocation}</span>
                          <span className="text-[10px] text-slate-400 truncate font-semibold">to {item.destination}</span>
                        </div>
                      </td>
                      <td className="py-3">
                        <span className="px-2 py-0.5 bg-slate-100 text-slate-700 font-black rounded uppercase text-[9px]">
                          {item.rideType}
                        </span>
                      </td>
                      <td className="py-3 text-slate-500">
                        {item.driverName ? (
                          <div className="flex flex-col">
                            <span className="text-slate-700">{item.driverName}</span>
                            <span className="text-[10px] text-slate-400 font-semibold">{item.driverPhone}</span>
                          </div>
                        ) : (
                          <span className="text-slate-300 font-semibold">Not assigned</span>
                        )}
                      </td>
                      <td className="py-3 text-slate-800 font-black">
                        {item.estimatedFare === 0 ? (
                          <span className="text-emerald-600">FREE</span>
                        ) : (
                          `₹${item.estimatedFare}`
                        )}
                      </td>
                      <td className="py-3">
                        <span className={`inline-block px-2 py-0.5 rounded text-[9px] font-black uppercase tracking-wide ${
                          item.status === "completed"
                            ? "bg-emerald-50 text-emerald-700 border border-emerald-100"
                            : item.status === "cancelled"
                            ? "bg-red-50 text-red-700 border border-red-100"
                            : item.status === "accepted"
                            ? "bg-amber-50 text-amber-700 border border-amber-100"
                            : "bg-blue-50 text-blue-700 border border-blue-100"
                        }`}>
                          {item.status}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="flex items-center justify-between pt-4 border-t border-slate-50">
                <p className="text-[11px] text-slate-400 font-bold">
                  Showing page <strong className="text-slate-700">{historyPage}</strong> of <strong className="text-slate-700">{totalPages}</strong> ({totalHistory} rides)
                </p>
                <div className="flex items-center space-x-1.5">
                  <button
                    disabled={historyPage === 1}
                    onClick={() => setHistoryPage(prev => prev - 1)}
                    className="p-1.5 border border-slate-100 hover:border-slate-200 rounded-lg bg-slate-50 text-slate-500 disabled:opacity-40 transition cursor-pointer"
                  >
                    <ChevronLeft className="w-4 h-4" />
                  </button>
                  <span className="text-[11px] font-black text-slate-700 px-2.5 py-1 bg-slate-50 rounded-lg border border-slate-100">
                    {historyPage}
                  </span>
                  <button
                    disabled={historyPage === totalPages}
                    onClick={() => setHistoryPage(prev => prev + 1)}
                    className="p-1.5 border border-slate-100 hover:border-slate-200 rounded-lg bg-slate-50 text-slate-500 disabled:opacity-40 transition cursor-pointer"
                  >
                    <ChevronRight className="w-4 h-4" />
                  </button>
                </div>
              </div>
            )}
          </div>
        ) : (
          <div className="py-8 text-center border border-dashed border-slate-200 rounded-xl">
            <p className="text-xs text-slate-400 font-bold">No previous ride bookings found.</p>
          </div>
        )}
      </div>
    </div>
  );
}
