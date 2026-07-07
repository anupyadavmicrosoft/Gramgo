import { LOCAL_VILLAGES, calculateHaversineDistance, geocodeAddress } from "./locationService";
import { RideRequestDb } from "../models/RideRequest";
import { EmergencyRideDb } from "../models/EmergencyRide";

export interface PriorityRideState {
  rideId: string;
  searchRadius: number; // in km
  retries: number;
  rejectedDriverIds: string[];
  dispatchedDriverIds: string[];
  lastDispatchTime: number;
  logs: string[];
}

export interface EngineSettings {
  enabled: boolean;
  baseRadiusKm: number;
  maxRadiusKm: number;
  radiusStepKm: number;
  requestTimeoutMs: number; // driver response timeout before automatic retry/expansion
}

class PriorityEngineService {
  private rideStates = new Map<string, PriorityRideState>();
  
  public settings: EngineSettings = {
    enabled: true,
    baseRadiusKm: 10,
    maxRadiusKm: 50,
    radiusStepKm: 10,
    requestTimeoutMs: 25000, // 25 seconds for priority requests to expire/retry
  };

  private getGlobalDrivers(): any[] {
    return (global as any).drivers || [];
  }

  private getGlobalRides(): any[] {
    return (global as any).emergencyRides || [];
  }

  private getGlobalNotifications(): any[] {
    return (global as any).notifications || [];
  }

  public getOrCreateRideState(rideId: string): PriorityRideState {
    let state = this.rideStates.get(rideId);
    if (!state) {
      state = {
        rideId,
        searchRadius: this.settings.baseRadiusKm,
        retries: 0,
        rejectedDriverIds: [],
        dispatchedDriverIds: [],
        lastDispatchTime: 0,
        logs: ["🚨 Emergency ride priority session started."],
      };
      this.rideStates.set(rideId, state);
    }
    return state;
  }

  public getEngineStatus() {
    const activeStates = Array.from(this.rideStates.values()).map(state => {
      const ride = this.getGlobalRides().find(r => r.id === state.rideId);
      return {
        ...state,
        patientName: ride?.patientName || "Unknown",
        emergencyType: ride?.emergencyType || "Unknown",
        status: ride?.status || "Unknown",
        village: ride?.village || "Unknown",
      };
    });

    return {
      settings: this.settings,
      activeStates,
    };
  }

  public addLog(rideId: string, message: string) {
    const state = this.getOrCreateRideState(rideId);
    const timestamp = new Date().toLocaleTimeString();
    state.logs.push(`[${timestamp}] ${message}`);
    console.log(`[PriorityEngine] Ride ${rideId}: ${message}`);
  }

  /**
   * Helper to fetch driver coordinate fallback
   */
  private getDriverCoordinates(driver: any): { lat: number; lng: number } {
    const village = driver.village || "ghazipur";
    const normalized = village.toLowerCase();
    for (const [name, coords] of Object.entries(LOCAL_VILLAGES)) {
      if (normalized.includes(name) || name.includes(normalized)) {
        return coords;
      }
    }
    // Determinstic fallback coordinates based on driver id
    let hash = 0;
    for (let i = 0; i < driver.id.length; i++) {
      hash = driver.id.charCodeAt(i) + ((hash << 5) - hash);
    }
    const latOffset = ((hash % 100) / 1000);
    const lngOffset = (((hash >> 3) % 100) / 1000);
    return {
      lat: 25.5787 + latOffset,
      lng: 83.5772 + lngOffset,
    };
  }

  /**
   * Main matching Tick function
   */
  public async tick() {
    if (!this.settings.enabled) return;

    const rides = this.getGlobalRides();
    // Filter active critical (emergency SOS) rides that are searching
    const criticalRides = rides.filter(
      (r: any) => r.priority === "critical" && (r.status === "searching" || r.status === "Searching Driver")
    );

    for (const ride of criticalRides) {
      await this.processCriticalRide(ride);
    }
  }

  /**
   * Execute priority dispatch and matching logic for an active SOS ride
   */
  public async processCriticalRide(ride: any) {
    const state = this.getOrCreateRideState(ride.id);

    // 1. Clean up expired dispatches and handle rejections/retry timeouts
    const now = Date.now();
    const hasActiveDispatches = state.dispatchedDriverIds.length > 0;
    const isTimeout = hasActiveDispatches && (now - state.lastDispatchTime >= this.settings.requestTimeoutMs);

    // Check ride requests in DB/memory to see if any drivers rejected
    const rideRequests = await RideRequestDb.findByDriver(""); // Get all
    const relevantRequests = rideRequests.filter((req: any) => req.rideId === ride.id);
    
    let rejectedCount = 0;
    let pendingCount = 0;

    for (const req of relevantRequests) {
      if (req.status === "rejected" && !state.rejectedDriverIds.includes(req.driverId)) {
        state.rejectedDriverIds.push(req.driverId);
        this.addLog(ride.id, `Driver ID ${req.driverId} rejected the dispatch.`);
        rejectedCount++;
      } else if (req.status === "pending") {
        if (now > new Date(req.expiresAt).getTime()) {
          // Auto expire
          await RideRequestDb.updateStatus(req.id, "expired");
          if (!state.rejectedDriverIds.includes(req.driverId)) {
            state.rejectedDriverIds.push(req.driverId);
          }
          this.addLog(ride.id, `Dispatch to driver ID ${req.driverId} expired.`);
        } else {
          pendingCount++;
        }
      }
    }

    // 2. If we have active pending dispatches, wait for them to decide (unless timeout occurs)
    if (pendingCount > 0 && !isTimeout) {
      return; // Wait for response
    }

    // 3. If all previous dispatches were rejected/expired, or we timed out, retry with expanded radius!
    if (state.dispatchedDriverIds.length === 0 || isTimeout || pendingCount === 0) {
      if (state.dispatchedDriverIds.length > 0) {
        // Expand search radius
        const prevRadius = state.searchRadius;
        if (state.searchRadius < this.settings.maxRadiusKm) {
          state.searchRadius = Math.min(this.settings.maxRadiusKm, state.searchRadius + this.settings.radiusStepKm);
          state.retries++;
          this.addLog(ride.id, `All dispatches within ${prevRadius} km rejected/expired. Expanding search radius to ${state.searchRadius} km. Retry: #${state.retries}`);
        } else {
          // Keep retrying at max radius, maybe notify passengers/admins
          state.retries++;
          this.addLog(ride.id, `Retrying dispatch at maximum radius of ${state.searchRadius} km. Retry: #${state.retries}`);
        }
      }

      // 4. Geocode ride location coordinates
      const rideCoords = await geocodeAddress(ride.village);

      // 5. Get available drivers and filter by distance & rejection list
      const allDrivers = this.getGlobalDrivers();
      const availableDrivers = allDrivers.filter(
        (d: any) => d.status === "available" && !state.rejectedDriverIds.includes(d.id)
      );

      const driversWithDistance = availableDrivers.map((drv: any) => {
        const drvCoords = this.getDriverCoordinates(drv);
        const distance = calculateHaversineDistance(
          rideCoords.lat,
          rideCoords.lng,
          drvCoords.lat,
          drvCoords.lng
        );
        return { driver: drv, distance };
      });

      // Filter by current search radius
      const nearbyDrivers = driversWithDistance
        .filter(item => item.distance <= state.searchRadius)
        .sort((a, b) => a.distance - b.distance);

      if (nearbyDrivers.length > 0) {
        this.addLog(ride.id, `Found ${nearbyDrivers.length} available drivers within ${state.searchRadius} km.`);
        
        // Notify/dispatch to nearest drivers (up to top 3 nearest drivers at once to bypass individual queuing delays)
        const targets = nearbyDrivers.slice(0, 3);
        const expiresAt = new Date(Date.now() + this.settings.requestTimeoutMs);
        
        const newDispatchedIds: string[] = [];
        
        for (const target of targets) {
          const drv = target.driver;
          this.addLog(ride.id, `Dispatching priority request to ${drv.name} (distance: ${target.distance} km).`);
          
          await RideRequestDb.create({
            rideId: ride.id,
            driverId: drv.id,
            passengerId: ride.passengerId,
            patientName: ride.patientName,
            patientPhone: ride.patientPhone,
            emergencyType: ride.emergencyType,
            priority: ride.priority,
            village: ride.village,
            landmark: ride.landmark || "Emergency Beacon",
            destinationChc: ride.destinationChc || "District Hospital Trauma Centre",
            status: "pending",
            expiresAt,
          });

          newDispatchedIds.push(drv.id);

          // Add a notification to the driver
          const notifs = this.getGlobalNotifications();
          notifs.push({
            id: `notif_drv_priority_${Date.now()}_${drv.id}`,
            userId: drv.id,
            title: "🚨 PRIORITY EMERGENCY DISPATCH",
            message: `CRITICAL: ${ride.patientName} in ${ride.village} needs immediate transport! Distance: ${target.distance} km. Accept now to bypass normal queue.`,
            type: "error",
            createdAt: Date.now(),
            read: false,
          });
        }

        state.dispatchedDriverIds = newDispatchedIds;
        state.lastDispatchTime = Date.now();
      } else {
        // If no available drivers within current radius, auto expand and schedule next tick check
        this.addLog(ride.id, `No available drivers found within ${state.searchRadius} km.`);
        
        // Let's force-expand immediately to check again, up to max
        if (state.searchRadius < this.settings.maxRadiusKm) {
          state.searchRadius = Math.min(this.settings.maxRadiusKm, state.searchRadius + this.settings.radiusStepKm);
          this.addLog(ride.id, `Auto-expanding search radius immediately to ${state.searchRadius} km to find drivers.`);
          // Trigger next check
          setImmediate(() => this.processCriticalRide(ride));
        } else {
          this.addLog(ride.id, `Alert: Maximum search radius of ${state.searchRadius} km reached and no volunteer drivers are available.`);
        }
      }
    }
  }

  /**
   * DISPATCHER OVERRIDE: Manually force match a specific driver to an emergency ride,
   * bypassing normal filters, availability check, or queues.
   */
  public async manualOverrideAssign(rideId: string, driverId: string, adminUser: any): Promise<any> {
    const rides = this.getGlobalRides();
    const ride = rides.find(r => r.id === rideId);
    if (!ride) {
      throw new Error("Emergency ride not found.");
    }

    const allDrivers = this.getGlobalDrivers();
    const driver = allDrivers.find(d => d.id === driverId);
    if (!driver) {
      throw new Error("Driver profile not found.");
    }

    // Set ride status and assign driver
    ride.driverId = driver.id;
    ride.driverName = driver.name;
    ride.driverPhone = driver.phone;
    ride.vehicleType = driver.vehicleType;
    ride.status = "Driver Assigned";
    ride.isManual = true; // prevent automatic status progress overriding dispatcher's will

    // Free up any other dispatches
    const state = this.getOrCreateRideState(rideId);
    state.dispatchedDriverIds = [];
    this.addLog(rideId, `👮 DISPATCHER OVERRIDE: Admin ${adminUser.name || "System"} manually assigned driver ${driver.name}.`);

    // Force driver state to busy
    driver.status = "busy";

    // Expire any pending ride requests for this ride
    const requests = await RideRequestDb.findByDriver("");
    const relevantRequests = requests.filter((req: any) => req.rideId === rideId);
    for (const req of relevantRequests) {
      await RideRequestDb.updateStatus(req.id, "expired");
    }

    // Add assigned notifications
    const notifs = this.getGlobalNotifications();
    if (ride.passengerId) {
      notifs.push({
        id: `notif_override_pass_${Date.now()}`,
        userId: ride.passengerId,
        title: "Volunteer Driver Manually Dispatched",
        message: `Admin Override: Driver ${driver.name} has been manually dispatched to your emergency. Contact: ${driver.phone}.`,
        type: "success",
        createdAt: Date.now(),
        read: false,
      });
    }

    notifs.push({
      id: `notif_override_drv_${Date.now()}`,
      userId: driver.id,
      title: "🚨 MANDATORY DISPATCH ASSIGNMENT",
      message: `Dispatcher assigned you to emergency for ${ride.patientName} at ${ride.village}. Head there immediately!`,
      type: "error",
      createdAt: Date.now(),
      read: false,
    });

    // Save ride details in MongoDB
    await EmergencyRideDb.save(ride);

    return ride;
  }

  /**
   * DISPATCHER OVERRIDE: Cancel active matching and reset priority engine state
   */
  public resetEngineState(rideId: string) {
    this.rideStates.delete(rideId);
    console.log(`[PriorityEngine] Reset session state for ride ${rideId}`);
  }
}

export const PriorityEngine = new PriorityEngineService();
