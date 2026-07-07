import { Request, Response } from "express";
import { EmergencyRideDb } from "../models/EmergencyRide";
import { RideRequestDb } from "../models/RideRequest";
import { EmergencyRide } from "../../src/types";
import { NotificationService } from "../services/notificationService";

export class EmergencyController {
  // Trigger emergency SOS
  static async triggerSOS(req: Request, res: Response) {
    try {
      const user = (req as any).user;
      if (!user) {
        return res.status(401).json({ error: "Access denied. Passenger authentication required." });
      }

      const { village, landmark, emergencyType } = req.body;

      // SOS is always highest priority ("critical")
      const priority = "critical";
      const status = "searching";
      const timestamp = Date.now();
      const resolvedVillage = village || user.village || "Ghazipur Main Square";
      const resolvedLandmark = landmark || "SOS Floating Button Press";
      const resolvedEmergencyType = emergencyType || "Severe Illness";

      const rideId = `ride_sos_${Date.now()}`;

      const newRide: EmergencyRide = {
        id: rideId,
        passengerId: user.id,
        patientName: user.name || "GramGo SOS User",
        patientPhone: user.phone || "+91 99999 99999",
        emergencyType: resolvedEmergencyType as any,
        priority: priority as any,
        village: resolvedVillage,
        landmark: resolvedLandmark,
        status: status as any,
        createdAt: timestamp,
        destinationChc: "District Hospital Trauma Centre",
        isManual: true,
      };

      // Store in durable cloud database via model interface
      await EmergencyRideDb.save(newRide);

      // Add to shared global in-memory store for active tracking sync
      const globalRides = (global as any).emergencyRides;
      if (globalRides) {
        globalRides.push(newRide);
      }

      // Automatically dispatch requests to nearby available volunteer drivers
      const globalDrivers = (global as any).drivers;

      if (globalDrivers && RideRequestDb) {
        const availableDrivers = globalDrivers.filter((d: any) => d.status === "available");
        const expiresAt = new Date(Date.now() + 60000); // 60 seconds

        for (const drv of availableDrivers) {
          try {
            await RideRequestDb.create({
              rideId: newRide.id,
              driverId: drv.id,
              passengerId: newRide.passengerId,
              patientName: newRide.patientName,
              patientPhone: newRide.patientPhone,
              emergencyType: newRide.emergencyType,
              priority: newRide.priority,
              village: newRide.village,
              landmark: newRide.landmark,
              destinationChc: newRide.destinationChc,
              status: "pending",
              expiresAt,
            });
          } catch (err) {
            console.error(`SOS Auto-Dispatch: failed to dispatch request to driver ${drv.id}`, err);
          }
        }
      }

      // Also create a custom emergency event log (or notification)
      const globalNotifications = (global as any).notifications || [];
      globalNotifications.push({
        id: `notif_sos_${Date.now()}`,
        userId: user.id,
        title: "🚨 SOS ACTIVATED",
        message: `Highest priority critical responder dispatch initiated in ${resolvedVillage}. Keep calm, first aid instruction loading.`,
        type: "error",
        createdAt: Date.now(),
        read: false,
      });

      // Trigger multi-target emergency notifications (Driver, Family, Admin, Dispatcher) across all channels
      NotificationService.dispatchEmergencyAlerts(newRide, "Emergency Requested").catch((err: any) => {
        console.error("SOS Trigger Notification Error:", err);
      });

      return res.status(201).json({
        success: true,
        message: "SOS Emergency dispatch successfully triggered.",
        ride: newRide,
      });
    } catch (error: any) {
      console.error("SOS Trigger Error in Controller:", error);
      return res.status(500).json({ error: error.message || "Failed to trigger emergency SOS dispatch." });
    }
  }

  // Fetch single active SOS details
  static async getActiveSOS(req: Request, res: Response) {
    try {
      const user = (req as any).user;
      if (!user) {
        return res.status(401).json({ error: "Access denied." });
      }

      const globalRides = (global as any).emergencyRides || [];
      const activeSOS = globalRides.find(
        (ride: any) => ride.passengerId === user.id && ride.priority === "critical" && ride.status !== "completed"
      );

      return res.json(activeSOS || null);
    } catch (error: any) {
      return res.status(500).json({ error: error.message || "Failed to retrieve active SOS." });
    }
  }
}
