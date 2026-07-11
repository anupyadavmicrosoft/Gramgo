import mongoose, { Schema } from "mongoose";

export interface IUserNotification {
  id: string;
  userId: string;
  title: string;
  body: string;
  type: "ride_alert" | "chat_alert" | "voice_call" | "general" | "system";
  data?: Record<string, any>;
  read: boolean;
  createdAt: Date;
}

export interface IUserNotificationSettings {
  userId: string;
  pushToken?: string;
  enabled: boolean;
  rideAlerts: boolean;
  chatAlerts: boolean;
  voiceAlerts: boolean;
  soundEnabled: boolean;
  alertSound: "default" | "siren" | "chime" | "ping";
}

const UserNotificationSchema = new Schema<IUserNotification>({
  id: { type: String, required: true, unique: true },
  userId: { type: String, required: true },
  title: { type: String, required: true },
  body: { type: String, required: true },
  type: { type: String, enum: ["ride_alert", "chat_alert", "voice_call", "general", "system"], default: "general" },
  data: { type: Schema.Types.Mixed },
  read: { type: Boolean, default: false },
  createdAt: { type: Date, default: Date.now }
});

const UserNotificationSettingsSchema = new Schema<IUserNotificationSettings>({
  userId: { type: String, required: true, unique: true },
  pushToken: { type: String },
  enabled: { type: Boolean, default: true },
  rideAlerts: { type: Boolean, default: true },
  chatAlerts: { type: Boolean, default: true },
  voiceAlerts: { type: Boolean, default: true },
  soundEnabled: { type: Boolean, default: true },
  alertSound: { type: String, enum: ["default", "siren", "chime", "ping"], default: "default" }
});

let MongoUserNotificationModel: any = null;
let MongoUserNotificationSettingsModel: any = null;

try {
  MongoUserNotificationModel = mongoose.model<IUserNotification>("UserNotification", UserNotificationSchema);
  MongoUserNotificationSettingsModel = mongoose.model<IUserNotificationSettings>("UserNotificationSettings", UserNotificationSettingsSchema);
} catch (e) {
  MongoUserNotificationModel = mongoose.models.UserNotification;
  MongoUserNotificationSettingsModel = mongoose.models.UserNotificationSettings;
}

const isMongoActive = () => mongoose.connection.readyState === 1;

// Memory Fallbacks
const memoryNotifications: IUserNotification[] = [
  {
    id: "un_1",
    userId: "passenger_1",
    title: "Welcome to GramGo!",
    body: "Your secure emergency rural healthcare transit application is configured and ready to protect you.",
    type: "system",
    read: false,
    createdAt: new Date(Date.now() - 3600000 * 24)
  },
  {
    id: "un_2",
    userId: "drv_1",
    title: "Driver Account Approved",
    body: "Welcome aboard, Ramesh Yadav! Your emergency tractor ambulance profile has been approved by local Panchayat admins.",
    type: "system",
    read: false,
    createdAt: new Date(Date.now() - 3600000 * 12)
  },
  {
    id: "un_3",
    userId: "passenger_1",
    title: "Emergency Ride Dispatched",
    body: "Ambulance driver Savita Devi has been assigned and is heading to Sherpur Village.",
    type: "ride_alert",
    data: { rideId: "ride_seed_1" },
    read: true,
    createdAt: new Date(Date.now() - 3600000 * 3)
  }
];

const memorySettings: Record<string, IUserNotificationSettings> = {};

export const UserNotificationDb = {
  async getNotifications(userId: string): Promise<IUserNotification[]> {
    if (isMongoActive() && MongoUserNotificationModel) {
      const docs = await MongoUserNotificationModel.find({ userId }).sort({ createdAt: -1 });
      return docs.map((d: any) => d.toObject());
    }
    return memoryNotifications
      .filter(n => n.userId === userId)
      .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
  },

  async getUnreadCount(userId: string): Promise<number> {
    if (isMongoActive() && MongoUserNotificationModel) {
      return await MongoUserNotificationModel.countDocuments({ userId, read: false });
    }
    return memoryNotifications.filter(n => n.userId === userId && !n.read).length;
  },

  async create(data: Partial<IUserNotification>): Promise<IUserNotification> {
    const id = data.id || "un_" + Math.random().toString(36).substr(2, 9);
    const newNotif: IUserNotification = {
      id,
      userId: data.userId || "",
      title: data.title || "Notification",
      body: data.body || "",
      type: data.type || "general",
      data: data.data,
      read: data.read || false,
      createdAt: data.createdAt || new Date()
    };

    if (isMongoActive() && MongoUserNotificationModel) {
      const doc = new MongoUserNotificationModel(newNotif);
      await doc.save();
      return doc.toObject();
    }

    memoryNotifications.unshift(newNotif);
    return { ...newNotif };
  },

  async markAsRead(id: string, userId: string): Promise<boolean> {
    if (isMongoActive() && MongoUserNotificationModel) {
      const res = await MongoUserNotificationModel.updateOne({ id, userId }, { read: true });
      return res.modifiedCount > 0;
    }
    const notif = memoryNotifications.find(n => n.id === id && n.userId === userId);
    if (notif) {
      notif.read = true;
      return true;
    }
    return false;
  },

  async markAllAsRead(userId: string): Promise<boolean> {
    if (isMongoActive() && MongoUserNotificationModel) {
      const res = await MongoUserNotificationModel.updateMany({ userId, read: false }, { read: true });
      return res.modifiedCount > 0;
    }
    memoryNotifications.forEach(n => {
      if (n.userId === userId) n.read = true;
    });
    return true;
  },

  async delete(id: string, userId: string): Promise<boolean> {
    if (isMongoActive() && MongoUserNotificationModel) {
      const res = await MongoUserNotificationModel.deleteOne({ id, userId });
      return res.deletedCount > 0;
    }
    const idx = memoryNotifications.findIndex(n => n.id === id && n.userId === userId);
    if (idx !== -1) {
      memoryNotifications.splice(idx, 1);
      return true;
    }
    return false;
  },

  async clearAll(userId: string): Promise<boolean> {
    if (isMongoActive() && MongoUserNotificationModel) {
      await MongoUserNotificationModel.deleteMany({ userId });
      return true;
    }
    for (let i = memoryNotifications.length - 1; i >= 0; i--) {
      if (memoryNotifications[i].userId === userId) {
        memoryNotifications.splice(i, 1);
      }
    }
    return true;
  },

  async getSettings(userId: string): Promise<IUserNotificationSettings> {
    const defaultVal: IUserNotificationSettings = {
      userId,
      pushToken: "",
      enabled: true,
      rideAlerts: true,
      chatAlerts: true,
      voiceAlerts: true,
      soundEnabled: true,
      alertSound: "default"
    };

    if (isMongoActive() && MongoUserNotificationSettingsModel) {
      const doc = await MongoUserNotificationSettingsModel.findOne({ userId });
      if (doc) return doc.toObject();
      const newDoc = new MongoUserNotificationSettingsModel(defaultVal);
      await newDoc.save();
      return newDoc.toObject();
    }

    if (!memorySettings[userId]) {
      memorySettings[userId] = { ...defaultVal };
    }
    return { ...memorySettings[userId] };
  },

  async updateSettings(userId: string, update: Partial<IUserNotificationSettings>): Promise<IUserNotificationSettings> {
    if (isMongoActive() && MongoUserNotificationSettingsModel) {
      const doc = await MongoUserNotificationSettingsModel.findOneAndUpdate(
        { userId },
        { $set: update },
        { new: true, upsert: true }
      );
      return doc.toObject();
    }

    if (!memorySettings[userId]) {
      await this.getSettings(userId);
    }
    memorySettings[userId] = { ...memorySettings[userId], ...update };
    return { ...memorySettings[userId] };
  }
};
