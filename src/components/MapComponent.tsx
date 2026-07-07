import React, { useState, useEffect, useRef, useMemo } from "react";
import { APIProvider, Map, AdvancedMarker, useMap } from "@vis.gl/react-google-maps";
import { io } from "socket.io-client";
import { 
  MapPin, 
  Navigation, 
  ZoomIn, 
  ZoomOut, 
  Compass, 
  Sparkles, 
  Loader, 
  AlertCircle, 
  Car, 
  Timer, 
  Play, 
  Square, 
  Flame, 
  Gauge, 
  ChevronRight, 
  CheckCircle2,
  RefreshCw,
  Info,
  Wifi,
  WifiOff
} from "lucide-react";

const API_KEY =
  process.env.GOOGLE_MAPS_PLATFORM_KEY ||
  (import.meta as any).env?.VITE_GOOGLE_MAPS_PLATFORM_KEY ||
  (globalThis as any).GOOGLE_MAPS_PLATFORM_KEY ||
  "";

const hasValidKey = Boolean(API_KEY) && API_KEY !== "YOUR_API_KEY" && API_KEY.trim().length > 10;

// Polyline helper component for drawing paths on real Google Map
interface RealPolylineProps {
  path: { lat: number; lng: number }[];
  color?: string;
  weight?: number;
  dashed?: boolean;
}

function RealPolyline({ path, color = "#ea580c", weight = 5, dashed = false }: RealPolylineProps) {
  const map = useMap();

  const polyline = useMemo(() => {
    if (typeof window === "undefined" || !window.google) return null;
    return new google.maps.Polyline({
      strokeColor: color,
      strokeOpacity: 0.85,
      strokeWeight: weight,
      ...(dashed ? {
        strokeOpacity: 0,
        icons: [{
          icon: {
            path: "M 0,-1 0,1",
            strokeOpacity: 1,
            scale: 2,
            strokeColor: color
          },
          offset: "0",
          repeat: "20px"
        }]
      } : {})
    });
  }, [color, weight, dashed]);

  useEffect(() => {
    if (!map || !polyline) return;
    polyline.setMap(map);
    return () => polyline.setMap(null);
  }, [map, polyline]);

  useEffect(() => {
    if (!polyline || path.length === 0) return;
    polyline.setPath(path);
    
    if (map) {
      const bounds = new google.maps.LatLngBounds();
      path.forEach(pt => bounds.extend(pt));
      map.fitBounds(bounds, { top: 50, right: 50, bottom: 50, left: 50 });
    }
  }, [path, polyline, map]);

  return null;
}

// Auto-fitting center helper when markers change
function MapController({ 
  pickup, 
  destination, 
  driver,
  path 
}: { 
  pickup: { lat: number; lng: number } | null; 
  destination: { lat: number; lng: number } | null;
  driver: { lat: number; lng: number } | null;
  path: { lat: number; lng: number }[];
}) {
  const map = useMap();

  useEffect(() => {
    if (!map) return;
    
    const bounds = new google.maps.LatLngBounds();
    let hasPoints = false;

    if (path && path.length > 0) {
      path.forEach(pt => bounds.extend(pt));
      hasPoints = true;
    }
    if (pickup) {
      bounds.extend(pickup);
      hasPoints = true;
    }
    if (destination) {
      bounds.extend(destination);
      hasPoints = true;
    }
    if (driver) {
      bounds.extend(driver);
      hasPoints = true;
    }

    if (hasPoints) {
      map.fitBounds(bounds, { top: 60, right: 60, bottom: 60, left: 60 });
    } else {
      map.panTo({ lat: 25.5787, lng: 83.5772 });
      map.setZoom(12);
    }
  }, [map, pickup, destination, driver, path]);

  return null;
}

interface MapComponentProps {
  pickupLocation?: string;
  destinationLocation?: string;
  onLocationSelect?: (type: "pickup" | "destination", address: string, latLng: { lat: number; lng: number }) => void;
  driverId?: string;
  role?: "passenger" | "driver";
  rideId?: string;
}

export default function MapComponent({ 
  pickupLocation, 
  destinationLocation,
  onLocationSelect,
  driverId,
  role = "passenger",
  rideId
}: MapComponentProps) {
  const [pickupCoords, setPickupCoords] = useState<{ lat: number; lng: number } | null>(null);
  const [destCoords, setDestCoords] = useState<{ lat: number; lng: number } | null>(null);
  const [driverCoords, setDriverCoords] = useState<{ lat: number; lng: number } | null>(null);

  // Live ETA Engine States
  const [recalcTrigger, setRecalcTrigger] = useState<number>(0);
  const [recalculating, setRecalculating] = useState<boolean>(false);
  const [recalcNotification, setRecalcNotification] = useState<string | null>(null);
  const [etaRefreshCountdown, setEtaRefreshCountdown] = useState<number>(15);
  
  // Socket.IO States and References
  const [socketConnected, setSocketConnected] = useState<boolean>(false);
  const [socketConnecting, setSocketConnecting] = useState<boolean>(false);
  const [socketError, setSocketError] = useState<string | null>(null);
  const [lastSocketMessage, setLastSocketMessage] = useState<string | null>(null);
  const [rideStatusLog, setRideStatusLog] = useState<string[]>([]);
  const socketRef = useRef<any>(null);

  // Initialize Socket.IO connection, handles connect/disconnect, joins specific ride room, and listens to location updates.
  useEffect(() => {
    if (!rideId) return;

    setSocketConnecting(true);
    setSocketError(null);

    // Connect to single-port dev server using relative connection
    const socket = io({
      reconnection: true,
      reconnectionAttempts: 20,
      reconnectionDelay: 2000,
      timeout: 15000
    });

    socketRef.current = socket;

    socket.on("connect", () => {
      setSocketConnected(true);
      setSocketConnecting(false);
      setSocketError(null);
      console.log("Socket.IO client connected. Joining ride room:", rideId);
      socket.emit("join_ride", { rideId });
      socket.emit("Join Ride", { rideId });
      socket.emit("join:ride", { rideId });
    });

    socket.on("disconnect", (reason) => {
      setSocketConnected(false);
      setSocketConnecting(false);
      console.warn("Socket.IO client disconnected:", reason);
      setLastSocketMessage(`Disconnected: ${reason}`);
    });

    socket.on("connect_error", (err) => {
      setSocketConnected(false);
      setSocketConnecting(false);
      setSocketError("Connection Error");
      console.error("Socket.IO connection error:", err);
    });

    const handleLocationUpdate = (data: any) => {
      console.log("Socket.IO location_update event received:", data);
      if (data && data.latitude && data.longitude) {
        setDriverCoords({ lat: data.latitude, lng: data.longitude });
        setLastSocketMessage(`Driver location updated in real-time`);
      }
    };

    socket.on("location_update", handleLocationUpdate);
    socket.on("Location Update", handleLocationUpdate);
    socket.on("location:update", handleLocationUpdate);

    const handleRideStatus = (data: any) => {
      console.log("Socket.IO ride_status event received:", data);
      if (data && data.status) {
        const formattedStatus = data.status.replace("_", " ").toUpperCase();
        setRideStatusLog(prev => [`[${new Date().toLocaleTimeString()}] STATUS CHANGED TO: ${formattedStatus}`, ...prev.slice(0, 10)]);
        setLastSocketMessage(`Ride status updated in real-time: ${formattedStatus}`);
        
        // Dispatch global event for other pages to react to status updates instantly
        const event = new CustomEvent("gramgo_ride_status_updated", { detail: data });
        window.dispatchEvent(event);
      }
    };

    socket.on("ride_status", handleRideStatus);
    socket.on("Ride Status", handleRideStatus);
    socket.on("ride:status", handleRideStatus);

    return () => {
      console.log("Disconnecting Socket.IO client, leaving room:", rideId);
      socket.emit("leave_ride", { rideId });
      socket.emit("Leave Ride", { rideId });
      socket.emit("leave:ride", { rideId });
      socket.disconnect();
      socketRef.current = null;
    };
  }, [rideId]);
  
  // Segment Paths
  const [driverToPickupPath, setDriverToPickupPath] = useState<{ lat: number; lng: number }[]>([]);
  const [routePath, setRoutePath] = useState<{ lat: number; lng: number }[]>([]);
  
  // Operational Metrics
  const [totalDistance, setTotalDistance] = useState<number | null>(null);
  const [totalDuration, setTotalDuration] = useState<number | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  // Speed and Traffic factors
  const [speedMode, setSpeedMode] = useState<"normal" | "emergency" | "heavy">("normal");
  const speedMultipliers = {
    normal: 1.0,      // standard rural speed
    emergency: 1.5,   // ambulance sirens activated (faster transit)
    heavy: 0.4        // heavy monsoon / unpaved terrain (slower transit)
  };

  // Map simulated controls (fallback mode)
  const [simulatedZoom, setSimulatedZoom] = useState(1);
  const [simulatedPan, setSimulatedPan] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const dragStart = useRef({ x: 0, y: 0 });

  // Simulation parameters for driver en route
  const [isSimulating, setIsSimulating] = useState(false);
  const [simStep, setSimStep] = useState(0);

  // Default Center: Ghazipur Center
  const defaultCenter = { lat: 25.5787, lng: 83.5772 };

  // 1. Fetch / Poll Driver's Live Coordinates if driverId is specified
  useEffect(() => {
    if (!driverId) {
      setDriverCoords(null);
      return;
    }

    const fetchDriverCoords = async () => {
      try {
        const token = localStorage.getItem("token");
        const headers: HeadersInit = {};
        if (token) {
          headers["Authorization"] = `Bearer ${token}`;
        }
        const res = await fetch(`/api/drivers/${driverId}/location`, { headers });
        if (res.ok) {
          const data = await res.json();
          if (data.latitude && data.longitude) {
            // Only overwrite if we are not actively driving the simulation locally
            if (!isSimulating) {
              setDriverCoords({ lat: data.latitude, lng: data.longitude });
            }
          }
        }
      } catch (err) {
        console.error("Failed to fetch driver coords on map:", err);
      }
    };

    fetchDriverCoords();
    const interval = setInterval(fetchDriverCoords, 5000);
    return () => clearInterval(interval);
  }, [driverId, isSimulating]);

  // 1b. Continuous background GPS location update if role is driver
  useEffect(() => {
    if (role !== "driver" || !rideId) return;

    const interval = setInterval(() => {
      if (driverCoords && socketRef.current && socketRef.current.connected) {
        const payload = {
          rideId,
          driverId,
          latitude: driverCoords.lat,
          longitude: driverCoords.lng
        };
        socketRef.current.emit("location_update", payload);
        socketRef.current.emit("Location Update", payload);
        socketRef.current.emit("location:update", payload);
        console.log("Continuous background location_update emitted:", payload);
      }
    }, 4000); // Send every 4 seconds

    return () => clearInterval(interval);
  }, [role, rideId, driverCoords, driverId]);

  // 2. Fetch coordinates, routes, and compute directions dynamically
  useEffect(() => {
    if (!pickupLocation && !destinationLocation) {
      setPickupCoords(null);
      setDestCoords(null);
      setRoutePath([]);
      setDriverToPickupPath([]);
      setTotalDistance(null);
      setTotalDuration(null);
      return;
    }

    const fetchMapRoutes = async () => {
      setIsLoading(true);
      setRecalculating(true);
      try {
        const token = localStorage.getItem("token");
        const headers: HeadersInit = {
          ...(token ? { "Authorization": `Bearer ${token}` } : {})
        };

        const geocodeUrl = token ? "/api/location/geocode" : "/api/public/location/geocode";
        const directionsUrl = token ? "/api/location/directions" : "/api/public/location/directions";

        let resolvedPickup = pickupCoords;
        let resolvedDest = destCoords;

        // Geocode pickup address if not present
        if (pickupLocation) {
          const res = await fetch(`${geocodeUrl}?address=${encodeURIComponent(pickupLocation)}`, { headers });
          if (res.ok) {
            resolvedPickup = await res.json();
            setPickupCoords(resolvedPickup);
          }
        }

        // Geocode destination address if not present
        if (destinationLocation) {
          const res = await fetch(`${geocodeUrl}?address=${encodeURIComponent(destinationLocation)}`, { headers });
          if (res.ok) {
            resolvedDest = await res.json();
            setDestCoords(resolvedDest);
          }
        }

        // Calculate segment paths
        if (resolvedPickup && resolvedDest) {
          // Route: Pickup to Destination
          const res = await fetch(`${directionsUrl}?origin=${encodeURIComponent(pickupLocation || "")}&destination=${encodeURIComponent(destinationLocation || "")}`, { headers });
          if (res.ok) {
            const data = await res.json();
            setRoutePath(data.path || []);
            setTotalDistance(data.distanceKm);
            setTotalDuration(data.durationMin);
          }
        }

        // Route: Driver to Pickup
        if (driverCoords && resolvedPickup) {
          const originStr = `(${driverCoords.lat.toFixed(5)},${driverCoords.lng.toFixed(5)})`;
          const res = await fetch(`${directionsUrl}?origin=${encodeURIComponent(originStr)}&destination=${encodeURIComponent(pickupLocation || "")}`, { headers });
          if (res.ok) {
            const data = await res.json();
            setDriverToPickupPath(data.path || []);
            
            // If tracking driver, add driver-to-pickup metrics to total distance
            if (role === "driver" || driverId) {
              setTotalDistance(prev => {
                const baseDist = prev || 0;
                return parseFloat((baseDist + data.distanceKm).toFixed(1));
              });
              setTotalDuration(prev => {
                const baseDur = prev || 0;
                return baseDur + data.durationMin;
              });
            }
          }
        }
      } catch (err) {
        console.error("Failed to load map location service details:", err);
      } finally {
        setIsLoading(false);
        setRecalculating(false);
      }
    };

    const debounceTimer = setTimeout(() => {
      fetchMapRoutes();
    }, 600);

    return () => clearTimeout(debounceTimer);
  }, [pickupLocation, destinationLocation, driverCoords?.lat, driverCoords?.lng, recalcTrigger]);

  // Auto Refresh ETA - Background loop that automatically recalculates routing details
  useEffect(() => {
    if (!rideId) return;

    const timer = setInterval(() => {
      setEtaRefreshCountdown(prev => {
        if (prev <= 1) {
          // Refresh trigger!
          setRecalcTrigger(t => t + 1);
          setRecalcNotification("ETA Auto-Refreshed");
          setTimeout(() => setRecalcNotification(null), 2500);
          return 15; // Reset back to 15 seconds
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [rideId]);
  // Geolocation trigger
  const handleMyLocation = () => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          const coords = { lat: pos.coords.latitude, lng: pos.coords.longitude };
          const addressString = `My Current Location (${coords.lat.toFixed(5)}, ${coords.lng.toFixed(5)})`;
          setPickupCoords(coords);
          if (onLocationSelect) {
            onLocationSelect("pickup", addressString, coords);
          }
        },
        (err) => {
          console.warn("Could not fetch current geolocation:", err);
        }
      );
    }
  };

  // Drag Simulated Map (Fallback vector mode)
  const handleMouseDown = (e: React.MouseEvent) => {
    if (hasValidKey) return;
    setIsDragging(true);
    dragStart.current = { x: e.clientX - simulatedPan.x, y: e.clientY - simulatedPan.y };
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDragging || hasValidKey) return;
    setSimulatedPan({
      x: e.clientX - dragStart.current.x,
      y: e.clientY - dragStart.current.y
    });
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  // 3. Consolidated simulated simulation path (combining driver-to-pickup and pickup-to-destination)
  const simulationPath = useMemo(() => {
    const arr: { lat: number; lng: number }[] = [];
    if (driverToPickupPath && driverToPickupPath.length > 0) {
      arr.push(...driverToPickupPath);
    }
    if (routePath && routePath.length > 0) {
      if (arr.length > 0 && routePath[0] && 
          arr[arr.length - 1].lat === routePath[0].lat && 
          arr[arr.length - 1].lng === routePath[0].lng) {
        arr.push(...routePath.slice(1));
      } else {
        arr.push(...routePath);
      }
    }
    return arr;
  }, [driverToPickupPath, routePath]);

  // Handle live driver path simulation & database integration (Auto-update route)
  useEffect(() => {
    if (!isSimulating || simulationPath.length === 0) return;

    const interval = setInterval(async () => {
      setSimStep(prev => {
        const next = prev + 1;
        if (next >= simulationPath.length) {
          setIsSimulating(false);
          return prev;
        }

        const nextCoord = simulationPath[next];
        setDriverCoords(nextCoord);

        // Emit over Socket.IO for immediate real-time updates!
        if (socketRef.current && socketRef.current.connected) {
          const payload = {
            rideId,
            driverId,
            latitude: nextCoord.lat,
            longitude: nextCoord.lng
          };
          socketRef.current.emit("location_update", payload);
          socketRef.current.emit("Location Update", payload);
          socketRef.current.emit("location:update", payload);
          console.log("Simulated location_update emitted via Socket.IO:", payload);
        }

        // Sync with backend API to update real position database (automatically updates route across clients)
        const token = localStorage.getItem("token");
        if (token) {
          fetch("/api/user/location", {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              "Authorization": `Bearer ${token}`
            },
            body: JSON.stringify({
              latitude: nextCoord.lat,
              longitude: nextCoord.lng
            })
          }).catch(err => console.warn("Failed to update simulation coords in DB:", err));
        }

        return next;
      });
    }, 2500); // 2.5 second movement step ticks

    return () => clearInterval(interval);
  }, [isSimulating, simulationPath, rideId, driverId]);

  // Calculate dynamic outputs adjusted by simulation steps & speed settings
  const { remainingDistance, remainingDuration, dynamicEta, turnByTurnDirections } = useMemo(() => {
    const totalDist = totalDistance || 0;
    const totalDur = totalDuration || 0;

    // Remaining ratio based on simulation index
    const remainingRatio = simulationPath.length > 1
      ? Math.max(0, 1 - simStep / (simulationPath.length - 1))
      : 1.0;

    const remainingDist = parseFloat((totalDist * remainingRatio).toFixed(1));
    
    // Adjust duration by speed mode multiplier
    const adjustedTotalDur = totalDur / speedMultipliers[speedMode];
    const remainingDur = Math.ceil(adjustedTotalDur * remainingRatio);

    // Calculate dynamic calendar clock ETA
    const etaDate = new Date();
    etaDate.setMinutes(etaDate.getMinutes() + remainingDur);
    const etaString = etaDate.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });

    // Turn-by-Turn instruction dynamic generator
    let directions = "Dispatched from volunteer base station. Navigating to patient.";
    if (simulationPath.length > 0) {
      const currentIdx = Math.min(simStep, simulationPath.length - 1);
      const isApproachingPickup = driverToPickupPath.length > 0 && currentIdx < driverToPickupPath.length;

      if (isApproachingPickup) {
        if (currentIdx === 0) {
          directions = "Departing base. Turning onto rural district highway.";
        } else if (currentIdx < driverToPickupPath.length - 2) {
          directions = `Headed to Patient. Cruising past village junction. Distance: ${remainingDist} km.`;
        } else {
          directions = "Approaching patient pickup village coordinates. Arriving shortly.";
        }
      } else {
        const routeIdx = driverToPickupPath.length > 0 ? currentIdx - driverToPickupPath.length : currentIdx;
        if (routeIdx <= 1) {
          directions = "Patient boarded. Moving towards Community Health Centre (CHC).";
        } else if (routeIdx < routePath.length - 3) {
          directions = `En route. Taking State Highway link road. Priority Sirens Active.`;
        } else if (routeIdx < routePath.length - 1) {
          directions = "Nearing health facility gates. Slowing down for secure ambulance bay entrance.";
        } else {
          directions = "Safely arrived at Community Health Centre. Commencing handover procedures.";
        }
      }
    }

    return {
      remainingDistance: remainingDist,
      remainingDuration: remainingDur,
      dynamicEta: etaString,
      turnByTurnDirections: directions
    };
  }, [totalDistance, totalDuration, simStep, simulationPath, speedMode]);

  // Convert map coords to simulated SVG viewport coords for fallback rendering
  const simulatedCoords = useMemo(() => {
    const scale = 500 * simulatedZoom;
    const originX = 250 + simulatedPan.x;
    const originY = 200 + simulatedPan.y;

    const toSvg = (coords: { lat: number; lng: number } | null) => {
      if (!coords) return null;
      // Ghazipur bounds: Lat 25.5-25.65, Lng 83.5-83.8
      const latRatio = (coords.lat - 25.5787) * 15; // vertical offset
      const lngRatio = (coords.lng - 83.5772) * 15; // horizontal offset

      return {
        x: originX + lngRatio * scale,
        y: originY - latRatio * scale // Invert Y for SVG coords
      };
    };

    return {
      pickup: toSvg(pickupCoords),
      destination: toSvg(destCoords),
      driver: toSvg(driverCoords),
      path: routePath.map(toSvg).filter(Boolean) as { x: number; y: number }[],
      driverToPickupPath: driverToPickupPath.map(toSvg).filter(Boolean) as { x: number; y: number }[]
    };
  }, [pickupCoords, destCoords, driverCoords, routePath, driverToPickupPath, simulatedZoom, simulatedPan]);

  return (
    <div className="w-full bg-slate-900 text-white rounded-3xl border border-slate-800 overflow-hidden shadow-2xl flex flex-col">
      {/* 1. Header Status Bar */}
      <div className="bg-slate-950/80 border-b border-slate-800/80 px-5 py-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
        <div className="flex items-center gap-2">
          <div className="p-1.5 bg-orange-500/10 text-orange-400 rounded-lg border border-orange-500/20">
            <Compass className={`w-4 h-4 ${isLoading ? "animate-spin" : "animate-spin-slow"}`} />
          </div>
          <div>
            <span className="font-black tracking-wider uppercase text-slate-200">Active Route Navigation</span>
            <p className="text-[10px] text-slate-500 font-bold mt-0.5">Automated Multi-Point Transit Mapping</p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {rideId && (
            <div className="flex items-center">
              {socketConnected ? (
                <span className="flex items-center gap-1 text-[9px] bg-emerald-500/15 border border-emerald-500/30 text-emerald-400 px-3 py-1 rounded-full font-extrabold uppercase tracking-widest shadow-[0_0_10px_rgba(16,185,129,0.1)]">
                  <Wifi className="w-3 h-3 animate-pulse" />
                  <span>Tracking: Active</span>
                </span>
              ) : socketConnecting ? (
                <span className="flex items-center gap-1 text-[9px] bg-amber-500/15 border border-amber-500/30 text-amber-400 px-3 py-1 rounded-full font-extrabold uppercase tracking-widest animate-pulse">
                  <Loader className="w-3 h-3 animate-spin" />
                  <span>Tracking: Reconnecting</span>
                </span>
              ) : (
                <span className="flex items-center gap-1 text-[9px] bg-rose-500/15 border border-rose-500/30 text-rose-400 px-3 py-1 rounded-full font-extrabold uppercase tracking-widest">
                  <WifiOff className="w-3 h-3" />
                  <span>Tracking: Offline</span>
                </span>
              )}
            </div>
          )}

          {hasValidKey ? (
            <span className="flex items-center gap-1.5 text-[9px] bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 px-3 py-1 rounded-full font-extrabold uppercase tracking-widest">
              ● Live Street Google Maps
            </span>
          ) : (
            <span className="flex items-center gap-1.5 text-[9px] bg-amber-500/10 border border-amber-500/30 text-amber-400 px-3 py-1 rounded-full font-extrabold uppercase tracking-widest animate-pulse">
              ● Simulated Vector GPS
            </span>
          )}
        </div>
      </div>

      {/* 2. Interactive Live ETA & Dispatch Progress HUD */}
      {rideId && (
        <div className="bg-slate-950 border-b border-slate-900 p-4 space-y-4">
          {/* Recalculate Alert Toast */}
          {recalcNotification && (
            <div className="bg-emerald-500/15 border border-emerald-500/30 rounded-xl px-4 py-2.5 text-xs text-emerald-400 font-extrabold flex items-center justify-between animate-bounce">
              <span className="flex items-center gap-2">
                <span className="flex h-2 w-2 relative">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                </span>
                <span>{recalcNotification}</span>
              </span>
              <span className="text-[9px] font-mono text-emerald-500/80">Synchronized Live</span>
            </div>
          )}

          <div className="flex flex-col md:flex-row md:items-center justify-between gap-3.5 bg-slate-900/60 border border-slate-800/80 rounded-2xl p-4">
            {/* Left side: Live progress bar showing exact vehicle transit state */}
            <div className="flex-1 space-y-2">
              <div className="flex items-center justify-between text-[10px] font-black tracking-wider uppercase text-slate-400">
                <span className="flex items-center gap-1">
                  <span className="w-2 h-2 rounded-full bg-orange-500" />
                  Pickup Point
                </span>
                <span className="text-orange-400">
                  {remainingDistance > 0 ? `${remainingDistance} KM remaining` : "Arrived"}
                </span>
                <span className="flex items-center gap-1">
                  <span className="w-2 h-2 rounded-full bg-emerald-500" />
                  Destination Hospital
                </span>
              </div>
              
              <div className="h-1.5 bg-slate-800 rounded-full overflow-hidden relative">
                <div 
                  className="h-full bg-gradient-to-r from-orange-500 via-amber-400 to-emerald-500 transition-all duration-700" 
                  style={{ 
                    width: `${Math.max(5, Math.min(100, (1 - (remainingDistance / (totalDistance || 1))) * 100))}%` 
                  }}
                />
                <div 
                  className="absolute top-1/2 -translate-y-1/2 -translate-x-1/2 w-4 h-4 rounded-full bg-white border-2 border-orange-500 shadow-md flex items-center justify-center transition-all duration-700"
                  style={{ 
                    left: `${Math.max(5, Math.min(95, (1 - (remainingDistance / (totalDistance || 1))) * 100))}%` 
                  }}
                >
                  <Navigation className="w-2.5 h-2.5 text-orange-600 rotate-90" />
                </div>
              </div>
              <div className="flex justify-between text-[9px] font-bold text-slate-500">
                <span>0.0 KM</span>
                <span>Transit Completion: {((1 - (remainingDistance / (totalDistance || 1))) * 100).toFixed(0)}%</span>
                <span>{totalDistance || "0.0"} KM Total</span>
              </div>
            </div>

            {/* Right side: Recalculate control & Auto-Refresh ETA indicators */}
            <div className="flex items-center gap-3 self-end md:self-auto">
              <div className="text-right">
                <span className="text-[9px] font-black uppercase text-slate-500 block tracking-wider">AUTO REFRESH ETA</span>
                <div className="flex items-center gap-1.5 justify-end mt-0.5">
                  <div className="relative flex items-center justify-center w-5 h-5">
                    <svg className="w-full h-full -rotate-90">
                      <circle cx="10" cy="10" r="8" fill="none" stroke="#1e293b" strokeWidth="2" />
                      <circle 
                        cx="10" 
                        cy="10" 
                        r="8" 
                        fill="none" 
                        stroke="#e2e8f0" 
                        strokeWidth="2" 
                        strokeDasharray="50" 
                        strokeDashoffset={(50 - (50 * etaRefreshCountdown) / 15).toString()} 
                        className="transition-all duration-1000"
                      />
                    </svg>
                    <span className="absolute text-[8px] font-extrabold text-slate-300">{etaRefreshCountdown}s</span>
                  </div>
                  <span className="text-[10px] text-slate-400 font-bold">Auto Sync</span>
                </div>
              </div>

              <button
                type="button"
                onClick={() => {
                  setRecalcTrigger(t => t + 1);
                  setRecalcNotification("Route & ETA Recalculating...");
                  setTimeout(() => setRecalcNotification("Route & ETA Recalculated Successfully"), 1000);
                  setTimeout(() => setRecalcNotification(null), 3000);
                }}
                disabled={recalculating}
                className="flex items-center gap-1.5 px-3.5 py-2 bg-slate-800 border border-slate-700/80 hover:bg-slate-700/90 text-white rounded-xl transition font-extrabold text-[10px] uppercase tracking-wider cursor-pointer shadow-md disabled:opacity-50"
              >
                <RefreshCw className={`w-3 h-3 ${recalculating ? 'animate-spin text-orange-400' : ''}`} />
                <span>{recalculating ? 'Recalculating...' : 'Recalculate Route'}</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 2. Interactive Navigation Statistics HUD */}
      <div className="bg-slate-900 border-b border-slate-800/60 p-5 grid grid-cols-2 md:grid-cols-4 gap-4 divide-y md:divide-y-0 md:divide-x divide-slate-800 text-center">
        <div className="pt-2 md:pt-0">
          <span className="text-[9px] font-black uppercase text-slate-500 block tracking-wider">REMAINING DISTANCE</span>
          <span className="text-lg font-black text-white block mt-1">
            {remainingDistance > 0 ? `${remainingDistance} KM` : "0.0 KM"}
          </span>
          <span className="text-[9px] text-slate-500 font-bold block mt-0.5">Calculated Path</span>
        </div>

        <div className="pt-2 md:pt-0">
          <span className="text-[9px] font-black uppercase text-slate-500 block tracking-wider">REMAINING TIME</span>
          <span className="text-lg font-black text-orange-400 block mt-1">
            {remainingDuration > 0 ? `${remainingDuration} MINS` : "Arrived"}
          </span>
          <span className="text-[9px] text-slate-500 font-bold block mt-0.5">Winding Road W/ Overheads</span>
        </div>

        <div className="pt-2 md:pt-0">
          <span className="text-[9px] font-black uppercase text-slate-500 block tracking-wider">DRIVER ARRIVAL TIME</span>
          <span className="text-lg font-black text-emerald-400 block mt-1">
            {remainingDuration > 0 ? dynamicEta : "Now"}
          </span>
          <span className="text-[9px] text-slate-500 font-bold block mt-0.5">Dynamic Clock Sync</span>
        </div>

        <div className="pt-2 md:pt-0">
          <span className="text-[9px] font-black uppercase text-slate-500 block tracking-wider">SPEED MULTIPLIER</span>
          <span className="text-lg font-black text-slate-300 block mt-1 flex items-center justify-center gap-1">
            <Gauge className="w-4 h-4 text-orange-500" />
            <span>{speedMultipliers[speedMode]}x</span>
          </span>
          <span className="text-[9px] text-slate-500 font-bold block mt-0.5">Adjusted Live</span>
        </div>
      </div>

      {/* 3. Map Canvas Visualizer */}
      <div 
        id="dispatch-map-container"
        className="w-full h-[320px] md:h-[360px] relative bg-slate-950 cursor-grab active:cursor-grabbing overflow-hidden border-b border-slate-800"
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
      >
        {hasValidKey ? (
          /* ================= GOOGLE MAPS PLATFORM MODE ================= */
          <APIProvider apiKey={API_KEY} version="weekly">
            <Map
              defaultCenter={defaultCenter}
              defaultZoom={12}
              gestureHandling="greedy"
              disableDefaultUI={true}
              mapId="DEMO_MAP_ID"
              internalUsageAttributionIds={["gmp_mcp_codeassist_v1_aistudio"]}
              style={{ width: "100%", height: "100%" }}
            >
              {pickupCoords && (
                <AdvancedMarker position={pickupCoords} title="Pickup Point">
                  <div className="flex items-center justify-center w-8 h-8 bg-orange-600 rounded-full border-2 border-white shadow-lg animate-bounce">
                    <MapPin className="w-4 h-4 text-white" />
                  </div>
                </AdvancedMarker>
              )}

              {destCoords && (
                <AdvancedMarker position={destCoords} title="Destination CHC Point">
                  <div className="flex items-center justify-center w-8 h-8 bg-emerald-600 rounded-full border-2 border-white shadow-lg">
                    <MapPin className="w-4 h-4 text-white" />
                  </div>
                </AdvancedMarker>
              )}

              {driverCoords && (
                <AdvancedMarker position={driverCoords} title="GramGo Driver Unit">
                  <div className="flex items-center justify-center w-9 h-9 bg-slate-900 border-2 border-orange-500 rounded-full shadow-lg">
                    <Car className="w-4 h-4 text-orange-400" />
                  </div>
                </AdvancedMarker>
              )}

              {driverToPickupPath.length > 0 && (
                <RealPolyline path={driverToPickupPath} color="#f59e0b" weight={4} dashed={true} />
              )}

              {routePath.length > 0 && (
                <RealPolyline path={routePath} color="#ea580c" weight={6} />
              )}

              <MapController 
                pickup={pickupCoords} 
                destination={destCoords} 
                driver={driverCoords}
                path={simulationPath} 
              />
            </Map>
          </APIProvider>
        ) : (
          /* ================= HIGH-FIDELITY VECTOR SIMULATION MODE ================= */
          <div className="w-full h-full select-none relative overflow-hidden bg-[#0f172a]">
            {/* Dark Mode Grid overlay */}
            <div className="absolute inset-0 bg-[radial-gradient(#334155_1px,transparent_1px)] [background-size:20px_20px] opacity-60 pointer-events-none" />

            {/* Simulated Map Vectors */}
            <svg className="w-full h-full absolute inset-0 pointer-events-none">
              <defs>
                <linearGradient id="riverGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                  <stop offset="0%" stopColor="#0284c7" />
                  <stop offset="100%" stopColor="#0369a1" />
                </linearGradient>
              </defs>

              {/* Simulated Ganges River */}
              <path
                d={`M -500,${250 + simulatedPan.y} C 0,${220 + simulatedPan.y} 200,${340 + simulatedPan.y} 500,${300 + simulatedPan.y} S 800,${200 + simulatedPan.y} 1200,${280 + simulatedPan.y}`}
                fill="none"
                stroke="url(#riverGrad)"
                strokeWidth={35 * simulatedZoom}
                opacity="0.4"
              />

              {/* Major Highway connecting villages */}
              <path
                d={`M -400,${150 + simulatedPan.y} Q 250,${180 + simulatedPan.y} 1000,${120 + simulatedPan.y}`}
                fill="none"
                stroke="#1e293b"
                strokeWidth={8 * simulatedZoom}
                opacity="0.8"
              />
              <path
                d={`M -400,${150 + simulatedPan.y} Q 250,${180 + simulatedPan.y} 1000,${120 + simulatedPan.y}`}
                fill="none"
                stroke="#475569"
                strokeDasharray="4 4"
                strokeWidth={2 * simulatedZoom}
                opacity="0.9"
              />

              {/* Village names */}
              {[
                { name: "Ghazipur CHC Hub", x: 250, y: 200 },
                { name: "Malikpur Village", x: 340, y: 150 },
                { name: "Sherpur Village", x: 480, y: 220 },
                { name: "Gauspur Village", x: 180, y: 240 },
                { name: "Karimpur Village", x: 120, y: 160 },
              ].map((village, idx) => {
                const vx = village.x + simulatedPan.x;
                const vy = village.y + simulatedPan.y;
                return (
                  <g key={idx} opacity={simulatedZoom * 0.7}>
                    <circle cx={vx} cy={vy} r={4 * simulatedZoom} fill="#475569" />
                    <text x={vx + 6} y={vy + 4} fill="#64748b" className="text-[10px] font-black tracking-wider uppercase font-sans">
                      {village.name}
                    </text>
                  </g>
                );
              })}

              {/* Segment 1: Driver to Pickup path (Amber glowing dashed) */}
              {simulatedCoords.driverToPickupPath.length > 0 && (
                <>
                  <path
                    d={`M ${simulatedCoords.driverToPickupPath.map(p => `${p.x},${p.y}`).join(" L ")}`}
                    fill="none"
                    stroke="#b45309"
                    strokeWidth={5}
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    opacity="0.4"
                  />
                  <path
                    d={`M ${simulatedCoords.driverToPickupPath.map(p => `${p.x},${p.y}`).join(" L ")}`}
                    fill="none"
                    stroke="#f59e0b"
                    strokeWidth={3}
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeDasharray="6 6"
                    className="animate-dash-travel"
                  />
                </>
              )}

              {/* Segment 2: Pickup to Destination (Orange primary route path) */}
              {simulatedCoords.path.length > 0 && (
                <>
                  <path
                    d={`M ${simulatedCoords.path.map(p => `${p.x},${p.y}`).join(" L ")}`}
                    fill="none"
                    stroke="#c2410c"
                    strokeWidth={8}
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    opacity="0.5"
                  />
                  <path
                    d={`M ${simulatedCoords.path.map(p => `${p.x},${p.y}`).join(" L ")}`}
                    fill="none"
                    stroke="#ea580c"
                    strokeWidth={4}
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeDasharray="10 4"
                    className="animate-dash-travel"
                  />
                </>
              )}
            </svg>

            {/* Simulated pickup Pin */}
            {simulatedCoords.pickup && (
              <div 
                className="absolute -translate-x-1/2 -translate-y-full flex flex-col items-center group cursor-pointer"
                style={{ left: simulatedCoords.pickup.x, top: simulatedCoords.pickup.y }}
              >
                <div className="bg-orange-600 border border-orange-500 text-white font-extrabold text-[9px] px-2.5 py-0.5 rounded-md shadow-md whitespace-nowrap mb-1 flex items-center gap-1 animate-bounce">
                  <MapPin className="w-2.5 h-2.5" />
                  <span>Pickup Location</span>
                </div>
                <div className="w-3.5 h-3.5 bg-orange-600 rounded-full border-2 border-white shadow-md" />
              </div>
            )}

            {/* Simulated destination Pin */}
            {simulatedCoords.destination && (
              <div 
                className="absolute -translate-x-1/2 -translate-y-full flex flex-col items-center group cursor-pointer"
                style={{ left: simulatedCoords.destination.x, top: simulatedCoords.destination.y }}
              >
                <div className="bg-emerald-600 border border-emerald-500 text-white font-extrabold text-[9px] px-2.5 py-0.5 rounded-md shadow-md whitespace-nowrap mb-1 flex items-center gap-1">
                  <MapPin className="w-2.5 h-2.5" />
                  <span>Destination CHC</span>
                </div>
                <div className="w-3.5 h-3.5 bg-emerald-600 rounded-full border-2 border-white shadow-md" />
              </div>
            )}

            {/* Simulated Live Driver Icon */}
            {simulatedCoords.driver && (
              <div 
                className="absolute -translate-x-1/2 -translate-y-1/2 flex flex-col items-center cursor-pointer transition-all duration-500"
                style={{ left: simulatedCoords.driver.x, top: simulatedCoords.driver.y }}
              >
                <div className="bg-slate-950 border-2 border-orange-500 text-orange-400 p-1.5 rounded-full shadow-lg flex items-center justify-center">
                  <Car className="w-4 h-4 animate-pulse" />
                </div>
                <span className="text-[8px] bg-slate-950 text-orange-400 border border-slate-800 px-1.5 py-0.5 rounded font-black uppercase mt-1 tracking-wider whitespace-nowrap shadow-md">
                  Driver Unit
                </span>
              </div>
            )}

            {/* Instruction overlay for raw api configuration */}
            {!hasValidKey && (
              <div className="absolute top-4 left-4 bg-slate-950/90 backdrop-blur-sm border border-slate-800 p-3.5 rounded-2xl flex items-start gap-2.5 shadow-xl max-w-xs pointer-events-auto">
                <Sparkles className="w-4 h-4 text-orange-400 flex-shrink-0 mt-0.5 animate-pulse" />
                <div className="space-y-1">
                  <p className="text-[10px] font-black text-slate-200 leading-tight">
                    API Key Configurable
                  </p>
                  <p className="text-[9px] text-slate-400 font-medium leading-relaxed">
                    Insert a <code className="bg-slate-900 text-orange-400 px-1 py-0.5 rounded text-[8px] font-mono border border-slate-800">GOOGLE_MAPS_PLATFORM_KEY</code> in Secrets for full actual street-level routing.
                  </p>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Loading overlay spinner */}
        {isLoading && (
          <div className="absolute inset-0 bg-slate-950/60 backdrop-blur-[1px] flex items-center justify-center pointer-events-none">
            <div className="bg-slate-900 border border-slate-800 p-4 rounded-2xl flex items-center gap-2.5 shadow-2xl">
              <Loader className="w-4 h-4 text-orange-500 animate-spin" />
              <span className="text-[10px] font-black text-slate-200 uppercase tracking-widest">Compiling path vector routes...</span>
            </div>
          </div>
        )}

        {/* Map Floating Zoom and Control actions */}
        <div className="absolute bottom-4 right-4 flex flex-col gap-1.5 pointer-events-auto">
          <button 
            type="button"
            onClick={handleMyLocation}
            title="Locate My Position"
            className="w-9 h-9 bg-slate-900 hover:bg-slate-800 text-orange-400 border border-slate-800 rounded-xl shadow-lg flex items-center justify-center transition cursor-pointer"
          >
            <Navigation className="w-4 h-4 rotate-45 text-orange-400" />
          </button>
          
          <button 
            type="button"
            onClick={() => {
              if (!hasValidKey) {
                setSimulatedZoom(prev => Math.min(prev + 0.3, 3.5));
              }
            }}
            title="Zoom In"
            className="w-9 h-9 bg-slate-900 hover:bg-slate-800 text-slate-200 border border-slate-800 rounded-xl shadow-lg flex items-center justify-center transition cursor-pointer"
          >
            <ZoomIn className="w-4 h-4" />
          </button>

          <button 
            type="button"
            onClick={() => {
              if (!hasValidKey) {
                setSimulatedZoom(prev => Math.max(prev - 0.3, 0.4));
              }
            }}
            title="Zoom Out"
            className="w-9 h-9 bg-slate-900 hover:bg-slate-800 text-slate-200 border border-slate-800 rounded-xl shadow-lg flex items-center justify-center transition cursor-pointer"
          >
            <ZoomOut className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* 4. Live Automatic Route Update / Simulation & Turn-by-Turn HUD */}
      <div className="bg-slate-950 p-5 space-y-4">
        {/* Turn-by-Turn Dynamic Banner */}
        <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-3.5 flex items-start gap-3">
          <div className="p-2 bg-orange-500/10 text-orange-400 rounded-xl border border-orange-500/20 mt-0.5 animate-pulse">
            <Car className="w-3.5 h-3.5" />
          </div>
          <div className="space-y-1">
            <span className="text-[9px] font-black tracking-widest text-orange-400 uppercase">Live Turn-by-Turn Navigation</span>
            <p className="text-xs font-bold text-slate-100 leading-normal">{turnByTurnDirections}</p>
          </div>
        </div>

        {/* Speed Adjustment and Automatic updates controls */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pt-1">
          <div className="space-y-1.5">
            <span className="text-[9px] text-slate-400 font-black uppercase tracking-wider block">Route Condition & Speed Limit</span>
            <div className="flex items-center gap-1.5 flex-wrap">
              {[
                { mode: "normal", label: "Standard Rural (40 km/h)", color: "border-slate-800 hover:border-slate-700 bg-slate-900/40 text-slate-300" },
                { mode: "emergency", label: "Emergency Sirens (60 km/h)", color: "border-rose-900/40 bg-rose-950/20 text-rose-300 hover:border-rose-800" },
                { mode: "heavy", label: "Heavy Monsoon (15 km/h)", color: "border-blue-900/40 bg-blue-950/20 text-blue-300 hover:border-blue-800" }
              ].map((cfg) => (
                <button
                  key={cfg.mode}
                  type="button"
                  onClick={() => setSpeedMode(cfg.mode as any)}
                  className={`px-3 py-1.5 border text-[10px] font-black rounded-lg transition-all cursor-pointer ${
                    speedMode === cfg.mode 
                      ? "bg-orange-500 border-orange-500 text-white hover:bg-orange-600 shadow-md shadow-orange-500/10" 
                      : cfg.color
                  }`}
                >
                  {cfg.label}
                </button>
              ))}
            </div>
          </div>

          {/* Simulation Toggle - updates route coordinates dynamically */}
          <div className="flex items-center gap-3">
            {isSimulating ? (
              <button
                type="button"
                onClick={() => setIsSimulating(false)}
                className="w-full md:w-auto px-4 py-2.5 bg-red-600 hover:bg-red-700 text-white text-xs font-black rounded-xl transition flex items-center justify-center gap-2 cursor-pointer shadow-lg shadow-red-500/10"
              >
                <Square className="w-3.5 h-3.5 fill-current" />
                <span>Pause Simulator</span>
              </button>
            ) : (
              <button
                type="button"
                onClick={() => {
                  if (simulationPath.length === 0) return;
                  if (simStep >= simulationPath.length - 1) {
                    setSimStep(0);
                  }
                  setIsSimulating(true);
                }}
                disabled={simulationPath.length === 0}
                className="w-full md:w-auto px-5 py-2.5 bg-orange-600 hover:bg-orange-700 text-white text-xs font-black rounded-xl transition flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed shadow-lg shadow-orange-500/25"
              >
                <Play className="w-3.5 h-3.5 fill-current" />
                <span>
                  {simStep > 0 && simStep < simulationPath.length - 1 
                    ? "Resume Simulator" 
                    : "Simulate Driver Transit"
                  }
                </span>
              </button>
            )}

            {simStep > 0 && (
              <button
                type="button"
                onClick={() => {
                  setIsSimulating(false);
                  setSimStep(0);
                  if (simulationPath[0]) {
                    setDriverCoords(simulationPath[0]);
                  }
                }}
                title="Reset simulation to base"
                className="p-2.5 bg-slate-900 border border-slate-800 hover:bg-slate-800 text-slate-400 rounded-xl transition cursor-pointer"
              >
                <RefreshCw className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>

        {/* Real-time Socket.IO log panel */}
        {rideId && (
          <div className="mt-3 bg-slate-900/40 border border-slate-800/80 rounded-2xl p-4 space-y-2.5 text-left">
            <div className="flex items-center justify-between">
              <span className="text-[9px] font-black tracking-widest text-orange-400 uppercase flex items-center gap-1.5">
                <span className={`w-1.5 h-1.5 rounded-full ${socketConnected ? 'bg-emerald-500 animate-pulse' : 'bg-red-500'}`} />
                Live Tracking Stream Logs
              </span>
              <span className="text-[9px] text-slate-500 font-bold uppercase tracking-wider">
                Room: ride_{rideId.substring(0, 8)}...
              </span>
            </div>

            {lastSocketMessage && (
              <p className="text-[10px] text-emerald-400 font-extrabold flex items-center gap-1 animate-pulse">
                <span>⚡</span>
                <span>Latest Socket Event: {lastSocketMessage}</span>
              </p>
            )}

            <div className="text-[9px] font-mono text-slate-400/85 space-y-1 max-h-24 overflow-y-auto divide-y divide-slate-800/50 pr-2">
              {rideStatusLog.length > 0 ? (
                rideStatusLog.map((log, idx) => (
                  <div key={idx} className="py-1 first:pt-0 last:pb-0 text-slate-300">
                    {log}
                  </div>
                ))
              ) : (
                <div className="text-slate-500 italic py-1">
                  No state changes recorded in current tracking session. Continuous GPS telemetry stream connected.
                </div>
              )}
            </div>
          </div>
        )}

        {/* Small operational notice */}
        <p className="text-[9px] text-slate-500 font-medium leading-relaxed pt-2 border-t border-slate-900 flex items-center gap-1.5">
          <Info className="w-3 h-3 text-slate-500" />
          <span>Simulation triggers live REST endpoint updates inside GramGo which synchronization-updates client views concurrently.</span>
        </p>
      </div>
    </div>
  );
}
