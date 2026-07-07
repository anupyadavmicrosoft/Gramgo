import mongoose, { Schema } from "mongoose";

export interface INotificationChannelStatus {
  channel: "WhatsApp" | "SMS" | "Push Notification" | "Email";
  status: "sent" | "delivered" | "failed" | "simulated";
  sentAt: number;
}

export interface IEmergencyNotification {
  id: string;
  rideId: string;
  eventType: string; // 'Emergency Requested' | 'Searching Driver' | 'Driver Assigned' | 'Driver Arriving' | 'Passenger Picked' | 'Hospital Reached' | 'Completed' | 'Cancelled'
  recipientRole: "Driver" | "Emergency Contact" | "Admin" | "Dispatcher";
  recipientName: string;
  recipientContact: string; // Phone or Email or ID
  message: string;
  channels: INotificationChannelStatus[];
  createdAt: number;
}

const EmergencyNotificationSchema = new Schema<IEmergencyNotification>({
  id: { type: String, required: true, unique: true },
  rideId: { type: String, required: true },
  eventType: { type: String, required: true },
  recipientRole: { type: String, required: true },
  recipientName: { type: String, required: true },
  recipientContact: { type: String, required: true },
  message: { type: String, required: true },
  channels: [
    {
      channel: { type: String, required: true },
      status: { type: String, required: true },
      sentAt: { type: Number, required: true }
    }
  ],
  createdAt: { type: Number, required: true }
});

let MongoEmergencyNotificationModel: any = null;
try {
  MongoEmergencyNotificationModel = mongoose.model<IEmergencyNotification>("EmergencyNotification", EmergencyNotificationSchema);
} catch (e) {
  MongoEmergencyNotificationModel = mongoose.models.EmergencyNotification;
}

const isMongoActive = () => mongoose.connection.readyState === 1;

// Seed data store for visual completeness if not using MongoDB
const memoryNotificationsStore: IEmergencyNotification[] = [];

// Seed some initial logs for display/realism in the panel
const seedInitialLogs = () => {
  if (memoryNotificationsStore.length === 0) {
    const now = Date.now();
    memoryNotificationsStore.push(
      {
        id: "nt_seed_1",
        rideId: "ride_seed_1",
        eventType: "Emergency Requested",
        recipientRole: "Dispatcher",
        recipientName: "Ghazipur Main Control Center",
        recipientContact: "dispatcher@gramgo.org",
        message: "🚨 EMERGENCY ALERT: Critical pregnancy transport needed in Village Sherpur. Patient: Sunita Devi.",
        channels: [
          { channel: "SMS", status: "delivered", sentAt: now - 3600000 },
          { channel: "Email", status: "sent", sentAt: now - 3600000 },
          { channel: "Push Notification", status: "delivered", sentAt: now - 3600000 }
        ],
        createdAt: now - 3600000
      },
      {
        id: "nt_seed_2",
        rideId: "ride_seed_1",
        eventType: "Emergency Requested",
        recipientRole: "Admin",
        recipientName: "Panchayat Chief Office",
        recipientContact: "admin@gramgo.org",
        message: "🚨 Critical SOS Alert triggered in Sherpur village. High Priority Medical Dispatch active.",
        channels: [
          { channel: "Push Notification", status: "delivered", sentAt: now - 3550000 },
          { channel: "WhatsApp", status: "delivered", sentAt: now - 3550000 }
        ],
        createdAt: now - 3550000
      },
      {
        id: "nt_seed_3",
        rideId: "ride_seed_1",
        eventType: "Driver Assigned",
        recipientRole: "Emergency Contact",
        recipientName: "Ramesh Kumar (Husband)",
        recipientContact: "+91 98765 43210",
        message: "GramGo Alert: Volunteer Hero Driver Amit Singh has been matched for Sunita Devi's transport. Vehicle: Auto (UP-61-AB-1234). Phone: +91 99887 76655.",
        channels: [
          { channel: "SMS", status: "delivered", sentAt: now - 3400000 },
          { channel: "WhatsApp", status: "delivered", sentAt: now - 3400000 }
        ],
        createdAt: now - 3400000
      },
      {
        id: "nt_seed_4",
        rideId: "ride_seed_1",
        eventType: "Driver Assigned",
        recipientRole: "Driver",
        recipientName: "Amit Singh",
        recipientContact: "+91 99887 76655",
        message: "GramGo Dispatch: Urgent match accepted. Please head to Village Sherpur immediately for patient Sunita Devi.",
        channels: [
          { channel: "SMS", status: "delivered", sentAt: now - 3400000 },
          { channel: "Push Notification", status: "delivered", sentAt: now - 3400000 }
        ],
        createdAt: now - 3400000
      }
    );
  }
};

seedInitialLogs();

export const EmergencyNotificationDb = {
  async save(notification: IEmergencyNotification): Promise<IEmergencyNotification> {
    if (isMongoActive() && MongoEmergencyNotificationModel) {
      const existing = await MongoEmergencyNotificationModel.findOne({ id: notification.id });
      if (existing) {
        await MongoEmergencyNotificationModel.updateOne({ id: notification.id }, { $set: notification });
        return notification;
      } else {
        await MongoEmergencyNotificationModel.create(notification);
        return notification;
      }
    }
    const idx = memoryNotificationsStore.findIndex(n => n.id === notification.id);
    if (idx !== -1) {
      memoryNotificationsStore[idx] = { ...notification };
    } else {
      memoryNotificationsStore.push({ ...notification });
    }
    return notification;
  },

  async findAll(): Promise<IEmergencyNotification[]> {
    if (isMongoActive() && MongoEmergencyNotificationModel) {
      const docs = await MongoEmergencyNotificationModel.find({});
      return docs.map((d: any) => d.toObject());
    }
    return [...memoryNotificationsStore];
  },

  async findByRideId(rideId: string): Promise<IEmergencyNotification[]> {
    if (isMongoActive() && MongoEmergencyNotificationModel) {
      const docs = await MongoEmergencyNotificationModel.find({ rideId });
      return docs.map((d: any) => d.toObject());
    }
    return memoryNotificationsStore.filter(n => n.rideId === rideId);
  },

  async clear(): Promise<boolean> {
    if (isMongoActive() && MongoEmergencyNotificationModel) {
      await MongoEmergencyNotificationModel.deleteMany({});
      return true;
    }
    memoryNotificationsStore.length = 0;
    seedInitialLogs();
    return true;
  }
};
