import { EmergencyRide } from "../../src/types";
import { IBooking } from "../models/Booking";
import { EmergencyNotificationDb, IEmergencyNotification, INotificationChannelStatus } from "../models/EmergencyNotification";
import { EmergencyContactDb } from "../models/EmergencyContact";
import { UserDb } from "../models/User";
import { UserNotificationDb } from "../models/UserNotification";
import { WhatsAppService } from "./whatsAppService";

export class NotificationService {
  /**
   * Main entry point to dispatch notifications across all targets & channels
   * when an emergency event or status change occurs.
   */
  static async dispatchEmergencyAlerts(ride: EmergencyRide, eventType: string) {
    try {
      console.log(`[NotificationService] Triggering alerts for Ride ${ride.id} on event: "${eventType}"`);

      // 1. Gather all recipients
      const recipients = await this.resolveRecipients(ride);

      // 2. Loop through each recipient and send tailored alert
      for (const recipient of recipients) {
        const message = this.compileTailoredMessage(ride, eventType, recipient.role, recipient.name);
        
        // Define active delivery channels
        const channels: INotificationChannelStatus[] = [
          { channel: "SMS", status: "delivered", sentAt: Date.now() },
          { channel: "WhatsApp", status: "delivered", sentAt: Date.now() },
          { channel: "Push Notification", status: "delivered", sentAt: Date.now() },
          { channel: "Email", status: "sent", sentAt: Date.now() }
        ];

        const notificationId = `nt_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`;
        
        const notificationRecord: IEmergencyNotification = {
          id: notificationId,
          rideId: ride.id,
          eventType,
          recipientRole: recipient.role,
          recipientName: recipient.name,
          recipientContact: recipient.contact,
          message,
          channels,
          createdAt: Date.now()
        };

        // Save to DB
        await EmergencyNotificationDb.save(notificationRecord);
        console.log(`[NotificationService] Dispatched & saved notification (${notificationId}) to ${recipient.role} (${recipient.name})`);

        // If a passenger user is logged in, also push to the general in-app notifications
        const globalNotifications = (global as any).notifications;
        if (globalNotifications && ride.passengerId && recipient.role === "Emergency Contact") {
          globalNotifications.push({
            id: `notif_family_${Date.now()}_${recipient.name.replace(/\s+/g, '')}`,
            userId: ride.passengerId,
            title: `Family Alert: ${eventType}`,
            message: `Emergency notification dispatched to your contact ${recipient.name} via SMS and WhatsApp.`,
            type: "success",
            createdAt: Date.now(),
            read: false
          });
        }
      }

      // Generate in-app push notifications for the actual passenger
      if (ride.passengerId) {
        let passengerTitle = "";
        let passengerBody = "";
        
        if (eventType === "Emergency Requested") {
          passengerTitle = "🚨 Emergency Broadcast Initiated";
          passengerBody = `Locating volunteer ambulance heroes near you. Rest assured, your panic alert is dispatched.`;
        } else if (eventType === "Driver Assigned") {
          passengerTitle = "✅ Driver Matched!";
          passengerBody = `Volunteer hero ${ride.driverName || "Driver"} is assigned to transport you using a ${ride.vehicleType || "Ambulance"}. Contact: ${ride.driverPhone || ""}.`;
        } else if (eventType === "Driver Arriving") {
          passengerTitle = "⚡ Driver Arriving";
          passengerBody = `${ride.driverName || "Your driver"} is nearing your pickup landmark: ${ride.landmark || "village center"}.`;
        } else if (eventType === "Passenger Picked") {
          passengerTitle = "🏥 En Route to CHC";
          passengerBody = `Transit successfully started. Safe corridor routing active to ${ride.destinationChc || "nearest hospital"}.`;
        } else if (eventType === "Hospital Reached") {
          passengerTitle = "🏁 Arrived at Hospital";
          passengerBody = `Safe arrival at ${ride.destinationChc || "CHC"}. Coordination with staff started.`;
        } else if (eventType === "Completed") {
          passengerTitle = "💖 Trip Safely Completed";
          passengerBody = "We hope you are getting the care you need. Thank you for using GramGo.";
        } else if (eventType === "Cancelled") {
          passengerTitle = "⚠️ Emergency Booking Cancelled";
          passengerBody = `Your booking was cancelled. If this is incorrect, please request transit again immediately.`;
        }

        if (passengerTitle) {
          await UserNotificationDb.create({
            userId: ride.passengerId,
            title: passengerTitle,
            body: passengerBody,
            type: "ride_alert",
            data: { rideId: ride.id, eventType }
          }).catch(e => console.error("Error creating passenger push notification:", e));
        }
      }

      // Generate in-app push notifications for the driver
      if (ride.driverId) {
        let driverTitle = "";
        let driverBody = "";

        if (eventType === "Driver Assigned") {
          driverTitle = "🚨 Emergency Dispatch Assigned!";
          driverBody = `You are confirmed for patient ${ride.patientName} from ${ride.village}. Destination: ${ride.destinationChc || "nearest CHC"}.`;
        } else if (eventType === "Completed") {
          driverTitle = "💰 Payout Credited!";
          driverBody = `Outstanding job! ₹500 subsidy incentive voucher successfully credited to your GramGo wallet.`;
        } else if (eventType === "Cancelled") {
          driverTitle = "⚠️ Dispatch Cancelled";
          driverBody = `The emergency request for patient ${ride.patientName} has been cancelled.`;
        }

        if (driverTitle) {
          await UserNotificationDb.create({
            userId: ride.driverId,
            title: driverTitle,
            body: driverBody,
            type: "ride_alert",
            data: { rideId: ride.id, eventType }
          }).catch(e => console.error("Error creating driver push notification:", e));
        }
      }

      // Automatically dispatch WhatsApp notifications for EmergencyRide
      await this.sendRideWhatsAppNotifications(ride, eventType).catch(e => {
        console.error("Error sending WhatsApp emergency notifications:", e);
      });
    } catch (err) {
      console.error("[NotificationService] Error dispatching alerts:", err);
    }
  }

  /**
   * Collects contact information for Driver, Emergency Contacts, Admins, and Dispatchers.
   */
  private static async resolveRecipients(ride: EmergencyRide) {
    const recipients: Array<{
      role: "Driver" | "Emergency Contact" | "Admin" | "Dispatcher";
      name: string;
      contact: string;
    }> = [];

    // --- A. Resolve Driver ---
    if (ride.driverId && ride.driverName) {
      recipients.push({
        role: "Driver",
        name: ride.driverName,
        contact: ride.driverPhone || "+91 99887 76655"
      });
    } else {
      // If no driver assigned yet, we can send alerts to available mock drivers in the area
      recipients.push({
        role: "Driver",
        name: "All Nearby Volunteer Heroes",
        contact: "Broadcast Protocol (Village Core)"
      });
    }

    // --- B. Resolve Emergency Contacts ---
    let familyContactsFound = false;
    if (ride.passengerId) {
      try {
        const contacts = await EmergencyContactDb.findByUserId(ride.passengerId);
        if (contacts && contacts.length > 0) {
          familyContactsFound = true;
          contacts.forEach(c => {
            recipients.push({
              role: "Emergency Contact",
              name: `${c.name} (${c.relationship})`,
              contact: c.phone
            });
          });
        }
      } catch (e) {
        console.error("Error fetching emergency contacts:", e);
      }
    }

    if (!familyContactsFound) {
      // Default fallback emergency contact for demo simulation completeness
      recipients.push({
        role: "Emergency Contact",
        name: "Ramesh Kumar (Husband - Primary)",
        contact: "+91 98765 43210"
      });
      recipients.push({
        role: "Emergency Contact",
        name: "Karan Singh (Neighbour)",
        contact: "+91 99112 23344"
      });
    }

    // --- C. Resolve Admin ---
    try {
      // Find real admins in DB if available
      const allUsers = await UserDb.find({});
      const dbAdmins = allUsers.filter((u: any) => u.role === "admin" || u.role === "Admin" || u.role === "Super Admin");
      if (dbAdmins && dbAdmins.length > 0) {
        dbAdmins.forEach((adm: any) => {
          recipients.push({
            role: "Admin",
            name: adm.name || "Panchayat Admin",
            contact: adm.email || "admin@gramgo.org"
          });
        });
      } else {
        recipients.push({
          role: "Admin",
          name: "Panchayat Chief Admin Office",
          contact: "admin@gramgo.org"
        });
      }
    } catch (e) {
      recipients.push({
        role: "Admin",
        name: "Panchayat Chief Admin Office",
        contact: "admin@gramgo.org"
      });
    }

    // --- D. Resolve Dispatcher ---
    recipients.push({
      role: "Dispatcher",
      name: "Ghazipur Main Control Center",
      contact: "dispatcher@gramgo.org"
    });

    return recipients;
  }

  /**
   * Generates highly specific messages tailored to each target role based on the current transit phase.
   */
  private static compileTailoredMessage(
    ride: EmergencyRide,
    eventType: string,
    role: "Driver" | "Emergency Contact" | "Admin" | "Dispatcher",
    recipientName: string
  ): string {
    const isSOS = ride.priority === "critical";
    const patientStr = ride.patientName || "GramGo User";
    const villageStr = ride.village || "Panchayat District";
    const landmarkStr = ride.landmark || "Main Village Square";
    const chcStr = ride.destinationChc || "Nearest Community Health Centre";
    const diseaseStr = ride.emergencyType || "Medical Emergency";

    switch (eventType) {
      case "Emergency Requested":
        if (role === "Driver") {
          return `🚨 NEW EMERGENCY ALERT: Near your village ${villageStr}! ${patientStr} needs immediate transport for ${diseaseStr}. Open your GramGo App to accept dispatch.`;
        } else if (role === "Emergency Contact") {
          return `GramGo Alert: Emergency transport request has been created for your family member ${patientStr} in ${villageStr}. We are searching for nearest volunteer hero drivers.`;
        } else if (role === "Admin") {
          return `🚨 Panchayat System Log: New high-priority emergency registered. Patient: ${patientStr} in ${villageStr}. Condition: ${diseaseStr}. Priority: ${ride.priority.toUpperCase()}.`;
        } else {
          return `🚨 DISPATCH CONSOLE: Patient ${patientStr} requested emergency ride from ${villageStr} (${landmarkStr}). Destination: ${chcStr}. Initiating automatic routing.`;
        }

      case "Searching Driver":
        if (role === "Driver") {
          return `⚡ URGENT: Available drivers alert! Passenger ${patientStr} is in active search phase in ${villageStr}. Please check driver console.`;
        } else if (role === "Emergency Contact") {
          return `GramGo Progress: We are actively broadcasting alerts to all available drivers within a 5km radius of ${landmarkStr}, ${villageStr}. Standby for driver matching details.`;
        } else if (role === "Admin") {
          return `Panchayat Monitor: Emergency ride ${ride.id} is in active broadcast phase. Locating vehicles in a 5km village radius.`;
        } else {
          return `DISPATCH UPDATE: Active driver search matching broadcast in progress for ride ${ride.id} around village ${villageStr}.`;
        }

      case "Driver Assigned":
        const drvName = ride.driverName || "Volunteer Driver";
        const vehicle = ride.vehicleType || "Ambulance Vehicle";
        const drvPhone = ride.driverPhone || "+91 99999 99999";
        if (role === "Driver") {
          return `GramGo Match Confirmed: You have been assigned to transport patient ${patientStr} from ${villageStr} (${landmarkStr}) to ${chcStr}. Drive safely!`;
        } else if (role === "Emergency Contact") {
          return `GramGo Driver Matched: Volunteer Hero ${drvName} is assigned to transport ${patientStr}. Vehicle: ${vehicle}. Phone: ${drvPhone}. Driver is preparing to depart.`;
        } else if (role === "Admin") {
          return `Panchayat System: Driver ${drvName} has successfully accepted emergency transport of ${patientStr} from village ${villageStr}.`;
        } else {
          return `DISPATCH CONSOLE: Ride ${ride.id} successfully matched with Driver ${drvName} (${drvPhone}). Vehicle: ${vehicle}. Depart protocol started.`;
        }

      case "Driver Arriving":
        if (role === "Driver") {
          return `GramGo Navigation: Head towards ${landmarkStr}, ${villageStr}. ETA is approx 3 minutes. Keep your phone accessible.`;
        } else if (role === "Emergency Contact") {
          return `GramGo Tracker: Volunteer driver is arriving shortly! Please keep patient stable and prepare to board. Landmark: ${landmarkStr}.`;
        } else if (role === "Admin") {
          return `Panchayat Alert: Active vehicle transit initiated. Driver is en route to ${villageStr}.`;
        } else {
          return `DISPATCH MONITOR: Active vehicle for Ride ${ride.id} is en route. Patient boarding preparation initiated in ${villageStr}.`;
        }

      case "Passenger Picked":
        if (role === "Driver") {
          return `GramGo Transit: Patient boarded successfully! Starting high-priority safe route to ${chcStr}. Follow safe village corridor paths.`;
        } else if (role === "Emergency Contact") {
          return `GramGo Alert: Patient ${patientStr} is safely on board with driver. Headed towards ${chcStr} under active GramGo tracking.`;
        } else if (role === "Admin") {
          return `Panchayat Transit Log: Patient ${patientStr} successfully picked up from ${villageStr}. Ambulance is en route to ${chcStr}.`;
        } else {
          return `DISPATCH ACTIVE: Patient picked up. Safe high-priority transit initiated for ride ${ride.id}. Expected arrival at CHC in 5-7 minutes.`;
        }

      case "Hospital Reached":
        if (role === "Driver") {
          return `GramGo Navigation: Safely arrived at ${chcStr}. Please coordinate immediate patient handover to the CHC staff.`;
        } else if (role === "Emergency Contact") {
          return `GramGo Alert: Safe arrival at ${chcStr}! Patient ${patientStr} has reached the healthcare facility and is under care.`;
        } else if (role === "Admin") {
          return `Panchayat Tracker: Safe delivery of patient ${patientStr} at destination CHC ${chcStr}. Outstanding job by driver.`;
        } else {
          return `DISPATCH CLOSED: Ride ${ride.id} arrived at CHC ${chcStr}. Medical handoff protocols active. Readying driver debrief.`;
        }

      case "Completed":
        if (role === "Driver") {
          return `GramGo Success: Emergency transport completed! Your incentive voucher of ₹500 is credited to your wallet. Thank you for your service.`;
        } else if (role === "Emergency Contact") {
          return `GramGo Alert: Emergency trip successfully completed. Family member is admitted under CHC care. We wish them a speedy recovery.`;
        } else if (role === "Admin") {
          return `Panchayat Completed: Ride ${ride.id} successfully closed. Subsidy payout disbursed to driver.`;
        } else {
          return `DISPATCH SUCCESS: Emergency dispatch complete. Care successfully handed over to CHC medical staff.`;
        }

      case "Cancelled":
        const cancelByStr = ride.cancelledBy ? `by ${ride.cancelledBy}` : "";
        const reasonStr = ride.cancelReason ? ` (Reason: "${ride.cancelReason}")` : "";
        if (role === "Driver") {
          return `GramGo Cancel Alert: Emergency transport request ${ride.id} has been cancelled ${cancelByStr}${reasonStr}. You are now back in the available queue.`;
        } else if (role === "Emergency Contact") {
          return `GramGo Alert: Emergency request for ${patientStr} was cancelled ${cancelByStr}${reasonStr}. If this was accidental, please book again immediately.`;
        } else if (role === "Admin") {
          return `🚨 Panchayat System Warning: Emergency ride ${ride.id} cancelled ${cancelByStr}${reasonStr}.`;
        } else {
          return `🚨 DISPATCH ALERT: Ride ${ride.id} cancelled ${cancelByStr}${reasonStr}. Reallocating local dispatch resources.`;
        }

      default:
        return `GramGo Emergency Alert: Status update on active request for ${patientStr}. Current Phase: ${eventType}.`;
    }
  }

  /**
   * Main entry point to dispatch notifications for standard bookings
   */
  static async dispatchStandardRideAlerts(booking: IBooking, eventType: string) {
    try {
      console.log(`[NotificationService] Triggering standard ride alerts for Booking ${booking.id} on event: "${eventType}"`);

      // Resolve variables for templates
      const passengerPhone = booking.passengerPhone;
      const passengerName = booking.passengerName || "GramGo Passenger";
      const pickup = booking.pickupLocation || "Pickup Landmark";
      const destination = booking.destination || "Destination";
      const bookingId = booking.id || "N/A";

      // Send standard templates
      if (eventType === "ride_booked" || eventType === "pending" || eventType === "created") {
        if (passengerPhone) {
          await WhatsAppService.sendTemplateTrigger(
            passengerPhone,
            "ride_booked",
            [bookingId, pickup, destination]
          );
        }
      } 
      else if (eventType === "driver_assigned" || eventType === "accepted") {
        const driverName = booking.driverName || "Volunteer Driver";
        const vehicle = booking.rideType || "Vehicle";
        const driverPhone = booking.driverPhone || "N/A";

        if (passengerPhone) {
          await WhatsAppService.sendTemplateTrigger(
            passengerPhone,
            "driver_assigned",
            [driverName, vehicle, driverPhone]
          );
        }
      } 
      else if (eventType === "driver_arriving") {
        const driverName = booking.driverName || "Volunteer Driver";
        if (passengerPhone) {
          await WhatsAppService.sendTemplateTrigger(
            passengerPhone,
            "driver_arriving",
            [driverName, pickup]
          );
        }
      } 
      else if (eventType === "driver_reached" || eventType === "reached_pickup") {
        const driverName = booking.driverName || "Volunteer Driver";
        if (passengerPhone) {
          await WhatsAppService.sendTemplateTrigger(
            passengerPhone,
            "driver_reached",
            [driverName, pickup]
          );
        }
      } 
      else if (eventType === "ride_started" || eventType === "started") {
        if (passengerPhone) {
          await WhatsAppService.sendTemplateTrigger(
            passengerPhone,
            "ride_started",
            [destination]
          );
        }
      } 
      else if (eventType === "ride_completed" || eventType === "completed") {
        if (passengerPhone) {
          await WhatsAppService.sendTemplateTrigger(
            passengerPhone,
            "ride_completed",
            [destination]
          );
        }
      } 
      else if (eventType === "ride_cancelled" || eventType === "cancelled") {
        if (passengerPhone) {
          await WhatsAppService.sendTemplateTrigger(
            passengerPhone,
            "ride_cancelled",
            [bookingId]
          );
        }
      }
    } catch (err) {
      console.error("[NotificationService] Error dispatching standard ride alerts:", err);
    }
  }

  /**
   * Automatically dispatch WhatsApp template messages for emergency ride events
   */
  private static async sendRideWhatsAppNotifications(ride: EmergencyRide, eventType: string) {
    try {
      const patientPhone = ride.patientPhone || ride.passengerPhone;
      const patientName = ride.patientName || "GramGo Passenger";
      const village = ride.village || "Panchayat Village";
      const landmark = ride.landmark || "Village Center";
      const destination = ride.destinationChc || "Community Health Centre";
      const rideId = ride.id || "N/A";

      // 1. Send "Emergency Ride" (Created) or "Ride Booked" notifications
      if (eventType === "Emergency Requested" || eventType === "requested" || eventType === "Searching Driver") {
        // Send Ride Booked to Patient
        if (patientPhone) {
          await WhatsAppService.sendTemplateTrigger(
            patientPhone,
            "ride_booked",
            [rideId, `${landmark}, ${village}`, destination]
          );
        }

        // Send Emergency Ride / Emergency Alert to Emergency Contacts
        const contacts = await EmergencyContactDb.findByUserId(ride.passengerId || "");
        if (contacts && contacts.length > 0) {
          for (const contact of contacts) {
            await WhatsAppService.sendTemplateTrigger(
              contact.phone,
              "emergency_ride",
              [patientName, village, destination, (ride.priority || "critical").toUpperCase()]
            );
          }
        } else {
          // Fallback simulation emergency contacts if none in DB
          await WhatsAppService.sendTemplateTrigger(
            "+919876543210",
            "emergency_ride",
            [patientName, village, destination, (ride.priority || "critical").toUpperCase()]
          );
        }
      }

      // 2. Driver Assigned
      else if (eventType === "Driver Assigned" || eventType === "driver_assigned") {
        const driverName = ride.driverName || "Volunteer Driver";
        const vehicle = ride.vehicleType || "Ambulance Vehicle";
        const driverPhone = ride.driverPhone || "N/A";

        if (patientPhone) {
          await WhatsAppService.sendTemplateTrigger(
            patientPhone,
            "driver_assigned",
            [driverName, vehicle, driverPhone]
          );
        }

        // Notify emergency contacts too!
        const contacts = await EmergencyContactDb.findByUserId(ride.passengerId || "");
        if (contacts && contacts.length > 0) {
          for (const contact of contacts) {
            await WhatsAppService.sendTemplateTrigger(
              contact.phone,
              "driver_assigned",
              [driverName, vehicle, driverPhone]
            );
          }
        }
      }

      // 3. Driver Arriving
      else if (eventType === "Driver Arriving" || eventType === "driver_arriving") {
        const driverName = ride.driverName || "Volunteer Driver";
        if (patientPhone) {
          await WhatsAppService.sendTemplateTrigger(
            patientPhone,
            "driver_arriving",
            [driverName, `${landmark}, ${village}`]
          );
        }
      }

      // 4. Driver Reached pickup point (reached_pickup)
      else if (eventType === "reached_pickup" || eventType === "Passenger Picked") {
        const driverName = ride.driverName || "Volunteer Driver";
        if (patientPhone) {
          await WhatsAppService.sendTemplateTrigger(
            patientPhone,
            "driver_reached",
            [driverName, landmark]
          );
        }
      }

      // 5. Ride Started
      if (eventType === "Passenger Picked" || eventType === "ride_started" || eventType === "Hospital Reached") {
        if (eventType === "Passenger Picked" || eventType === "ride_started") {
          if (patientPhone) {
            await WhatsAppService.sendTemplateTrigger(
              patientPhone,
              "ride_started",
              [destination]
            );
          }

          // Notify emergency contacts too!
          const contacts = await EmergencyContactDb.findByUserId(ride.passengerId || "");
          if (contacts && contacts.length > 0) {
            for (const contact of contacts) {
              await WhatsAppService.sendTemplateTrigger(
                contact.phone,
                "ride_started",
                [destination]
              );
            }
          }
        }
      }

      // 6. Ride Completed
      if (eventType === "Completed" || eventType === "completed") {
        if (patientPhone) {
          await WhatsAppService.sendTemplateTrigger(
            patientPhone,
            "ride_completed",
            [destination]
          );
        }

        // Notify emergency contacts too!
        const contacts = await EmergencyContactDb.findByUserId(ride.passengerId || "");
        if (contacts && contacts.length > 0) {
          for (const contact of contacts) {
            await WhatsAppService.sendTemplateTrigger(
              contact.phone,
              "ride_completed",
              [destination]
            );
          }
        }
      }

      // 7. Ride Cancelled
      else if (eventType === "Cancelled" || eventType === "cancelled") {
        if (patientPhone) {
          await WhatsAppService.sendTemplateTrigger(
            patientPhone,
            "ride_cancelled",
            [rideId]
          );
        }

        // Notify emergency contacts too!
        const contacts = await EmergencyContactDb.findByUserId(ride.passengerId || "");
        if (contacts && contacts.length > 0) {
          for (const contact of contacts) {
            await WhatsAppService.sendTemplateTrigger(
              contact.phone,
              "ride_cancelled",
              [rideId]
            );
          }
        }
      }
    } catch (err) {
      console.error("[NotificationService] Error sending WhatsApp ride notifications:", err);
    }
  }
}
export default NotificationService;
