import mongoose, { Schema } from "mongoose";

export interface IWhatsAppMessage {
  id: string;
  from: string;
  to: string;
  messageType: "text" | "template" | "image" | "document";
  body: string;
  status: "queued" | "sent" | "delivered" | "read" | "failed";
  direction: "outbound" | "inbound";
  templateName?: string;
  variables?: string[];
  metaMessageId?: string;
  error?: string;
  retryCount: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface IMessageTemplate {
  id: string;
  name: string;
  category: "UTILITY" | "MARKETING" | "AUTHENTICATION";
  language: string;
  status: "APPROVED" | "PENDING" | "REJECTED";
  header?: string;
  body: string;
  footer?: string;
  buttons?: any[];
  createdAt: Date;
}

export interface IDeliveryLog {
  id: string;
  messageId: string;
  status: "sent" | "delivered" | "read" | "failed";
  timestamp: Date;
  recipient: string;
  rawPayload?: any;
  errorCode?: string;
  errorMessage?: string;
}

export interface IWhatsAppSettings {
  id: string;
  enabled: boolean;
  accessToken?: string;
  phoneNumberId?: string;
  businessAccountId?: string;
  verifyToken?: string;
  defaultCountryCode: string;
  isSandbox: boolean;
  updatedAt: Date;
}

// Schemas
const WhatsAppMessageSchema = new Schema<IWhatsAppMessage>({
  id: { type: String, required: true, unique: true },
  from: { type: String, required: true },
  to: { type: String, required: true },
  messageType: { type: String, enum: ["text", "template", "image", "document"], default: "text" },
  body: { type: String, required: true },
  status: { type: String, enum: ["queued", "sent", "delivered", "read", "failed"], default: "queued" },
  direction: { type: String, enum: ["outbound", "inbound"], default: "outbound" },
  templateName: { type: String },
  variables: [{ type: String }],
  metaMessageId: { type: String },
  error: { type: String },
  retryCount: { type: Number, default: 0 },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
});

const MessageTemplateSchema = new Schema<IMessageTemplate>({
  id: { type: String, required: true, unique: true },
  name: { type: String, required: true, unique: true },
  category: { type: String, enum: ["UTILITY", "MARKETING", "AUTHENTICATION"], default: "UTILITY" },
  language: { type: String, default: "en" },
  status: { type: String, enum: ["APPROVED", "PENDING", "REJECTED"], default: "APPROVED" },
  header: { type: String },
  body: { type: String, required: true },
  footer: { type: String },
  buttons: { type: Schema.Types.Mixed },
  createdAt: { type: Date, default: Date.now }
});

const DeliveryLogSchema = new Schema<IDeliveryLog>({
  id: { type: String, required: true, unique: true },
  messageId: { type: String, required: true },
  status: { type: String, enum: ["sent", "delivered", "read", "failed"], required: true },
  timestamp: { type: Date, default: Date.now },
  recipient: { type: String, required: true },
  rawPayload: { type: Schema.Types.Mixed },
  errorCode: { type: String },
  errorMessage: { type: String }
});

const WhatsAppSettingsSchema = new Schema<IWhatsAppSettings>({
  id: { type: String, required: true, unique: true },
  enabled: { type: Boolean, default: false },
  accessToken: { type: String },
  phoneNumberId: { type: String },
  businessAccountId: { type: String },
  verifyToken: { type: String },
  defaultCountryCode: { type: String, default: "+91" },
  isSandbox: { type: Boolean, default: true },
  updatedAt: { type: Date, default: Date.now }
});

// Models
let MongoWhatsAppMessageModel: any = null;
let MongoMessageTemplateModel: any = null;
let MongoDeliveryLogModel: any = null;
let MongoWhatsAppSettingsModel: any = null;

try {
  MongoWhatsAppMessageModel = mongoose.model<IWhatsAppMessage>("WhatsAppMessage", WhatsAppMessageSchema);
  MongoMessageTemplateModel = mongoose.model<IMessageTemplate>("MessageTemplate", MessageTemplateSchema);
  MongoDeliveryLogModel = mongoose.model<IDeliveryLog>("DeliveryLog", DeliveryLogSchema);
  MongoWhatsAppSettingsModel = mongoose.model<IWhatsAppSettings>("WhatsAppSettings", WhatsAppSettingsSchema);
} catch (e) {
  MongoWhatsAppMessageModel = mongoose.models.WhatsAppMessage;
  MongoMessageTemplateModel = mongoose.models.MessageTemplate;
  MongoDeliveryLogModel = mongoose.models.DeliveryLog;
  MongoWhatsAppSettingsModel = mongoose.models.WhatsAppSettings;
}

const isMongoActive = () => mongoose.connection.readyState === 1;

// Memory Fallback Databases
const memoryMessages: IWhatsAppMessage[] = [];
const memoryTemplates: IMessageTemplate[] = [
  {
    id: "tpl_1",
    name: "emergency_broadcast",
    category: "UTILITY",
    language: "en",
    status: "APPROVED",
    body: "🚨 GRAMGO EMERGENCY ALERT: A critical patient {{1}} requires urgent medical transit from {{2}} to community health centre {{3}}. Contact: {{4}}.",
    createdAt: new Date()
  },
  {
    id: "tpl_2",
    name: "driver_matched",
    category: "UTILITY",
    language: "en",
    status: "APPROVED",
    body: "✅ GramGo Volunteer Driver Assigned: Volunteer hero {{1}} is assigned to transport patient {{2}} using vehicle {{3}} (Contact: {{4}}).",
    createdAt: new Date()
  },
  {
    id: "tpl_3",
    name: "trip_completed",
    category: "UTILITY",
    language: "en",
    status: "APPROVED",
    body: "💖 GramGo Emergency Ride Completed: Patient {{1}} has been safely transported to {{2}}. Thank you volunteer driver {{3}} for your heroic service!",
    createdAt: new Date()
  }
];
const memoryLogs: IDeliveryLog[] = [];
let memorySettings: IWhatsAppSettings = {
  id: "global",
  enabled: true, // Default to true in simulation for easy testing!
  accessToken: "",
  phoneNumberId: "",
  businessAccountId: "",
  verifyToken: "gramgo_webhook_verification_token_2026",
  defaultCountryCode: "+91",
  isSandbox: true,
  updatedAt: new Date()
};

export const WhatsAppMessageDb = {
  async find(): Promise<IWhatsAppMessage[]> {
    if (isMongoActive() && MongoWhatsAppMessageModel) {
      const docs = await MongoWhatsAppMessageModel.find().sort({ createdAt: -1 });
      return docs.map((d: any) => d.toObject());
    }
    return [...memoryMessages].sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
  },

  async findById(id: string): Promise<IWhatsAppMessage | null> {
    if (isMongoActive() && MongoWhatsAppMessageModel) {
      const doc = await MongoWhatsAppMessageModel.findOne({ id });
      return doc ? doc.toObject() : null;
    }
    return memoryMessages.find(m => m.id === id) || null;
  },

  async findQueued(): Promise<IWhatsAppMessage[]> {
    if (isMongoActive() && MongoWhatsAppMessageModel) {
      const docs = await MongoWhatsAppMessageModel.find({ status: "queued" });
      return docs.map((d: any) => d.toObject());
    }
    return memoryMessages.filter(m => m.status === "queued");
  },

  async create(data: Partial<IWhatsAppMessage>): Promise<IWhatsAppMessage> {
    const id = data.id || "wam_" + Math.random().toString(36).substr(2, 9);
    const newMsg: IWhatsAppMessage = {
      id,
      from: data.from || "",
      to: data.to || "",
      messageType: data.messageType || "text",
      body: data.body || "",
      status: data.status || "queued",
      direction: data.direction || "outbound",
      templateName: data.templateName,
      variables: data.variables,
      metaMessageId: data.metaMessageId,
      error: data.error,
      retryCount: data.retryCount || 0,
      createdAt: data.createdAt || new Date(),
      updatedAt: data.updatedAt || new Date()
    };

    if (isMongoActive() && MongoWhatsAppMessageModel) {
      const doc = new MongoWhatsAppMessageModel(newMsg);
      await doc.save();
      return doc.toObject();
    }

    memoryMessages.unshift(newMsg);
    return { ...newMsg };
  },

  async updateStatus(id: string, status: IWhatsAppMessage["status"], update: Partial<IWhatsAppMessage> = {}): Promise<IWhatsAppMessage | null> {
    const fields = { ...update, status, updatedAt: new Date() };
    if (isMongoActive() && MongoWhatsAppMessageModel) {
      const doc = await MongoWhatsAppMessageModel.findOneAndUpdate({ id }, { $set: fields }, { new: true });
      return doc ? doc.toObject() : null;
    }

    const msg = memoryMessages.find(m => m.id === id);
    if (msg) {
      Object.assign(msg, fields);
      return { ...msg };
    }
    return null;
  }
};

export const MessageTemplateDb = {
  async find(): Promise<IMessageTemplate[]> {
    if (isMongoActive() && MongoMessageTemplateModel) {
      const docs = await MongoMessageTemplateModel.find().sort({ createdAt: -1 });
      return docs.map((d: any) => d.toObject());
    }
    return [...memoryTemplates].sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
  },

  async findByName(name: string): Promise<IMessageTemplate | null> {
    if (isMongoActive() && MongoMessageTemplateModel) {
      const doc = await MongoMessageTemplateModel.findOne({ name });
      return doc ? doc.toObject() : null;
    }
    return memoryTemplates.find(t => t.name === name) || null;
  },

  async create(data: Partial<IMessageTemplate>): Promise<IMessageTemplate> {
    const id = data.id || "tpl_" + Math.random().toString(36).substr(2, 9);
    const newTpl: IMessageTemplate = {
      id,
      name: data.name || "template_name",
      category: data.category || "UTILITY",
      language: data.language || "en",
      status: data.status || "APPROVED",
      header: data.header,
      body: data.body || "",
      footer: data.footer,
      buttons: data.buttons,
      createdAt: data.createdAt || new Date()
    };

    if (isMongoActive() && MongoMessageTemplateModel) {
      const doc = new MongoMessageTemplateModel(newTpl);
      await doc.save();
      return doc.toObject();
    }

    memoryTemplates.unshift(newTpl);
    return { ...newTpl };
  },

  async delete(id: string): Promise<boolean> {
    if (isMongoActive() && MongoMessageTemplateModel) {
      const res = await MongoMessageTemplateModel.deleteOne({ id });
      return res.deletedCount > 0;
    }
    const idx = memoryTemplates.findIndex(t => t.id === id);
    if (idx !== -1) {
      memoryTemplates.splice(idx, 1);
      return true;
    }
    return false;
  }
};

export const DeliveryLogDb = {
  async find(): Promise<IDeliveryLog[]> {
    if (isMongoActive() && MongoDeliveryLogModel) {
      const docs = await MongoDeliveryLogModel.find().sort({ timestamp: -1 });
      return docs.map((d: any) => d.toObject());
    }
    return [...memoryLogs].sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());
  },

  async create(data: Partial<IDeliveryLog>): Promise<IDeliveryLog> {
    const id = data.id || "log_" + Math.random().toString(36).substr(2, 9);
    const newLog: IDeliveryLog = {
      id,
      messageId: data.messageId || "",
      status: data.status || "sent",
      timestamp: data.timestamp || new Date(),
      recipient: data.recipient || "",
      rawPayload: data.rawPayload,
      errorCode: data.errorCode,
      errorMessage: data.errorMessage
    };

    if (isMongoActive() && MongoDeliveryLogModel) {
      const doc = new MongoDeliveryLogModel(newLog);
      await doc.save();
      return doc.toObject();
    }

    memoryLogs.unshift(newLog);
    return { ...newLog };
  }
};

export const WhatsAppSettingsDb = {
  async getSettings(): Promise<IWhatsAppSettings> {
    if (isMongoActive() && MongoWhatsAppSettingsModel) {
      const doc = await MongoWhatsAppSettingsModel.findOne({ id: "global" });
      if (doc) return doc.toObject();
      const newDoc = new MongoWhatsAppSettingsModel(memorySettings);
      await newDoc.save();
      return newDoc.toObject();
    }
    return { ...memorySettings };
  },

  async updateSettings(update: Partial<IWhatsAppSettings>): Promise<IWhatsAppSettings> {
    const fields = { ...update, updatedAt: new Date() };
    if (isMongoActive() && MongoWhatsAppSettingsModel) {
      const doc = await MongoWhatsAppSettingsModel.findOneAndUpdate(
        { id: "global" },
        { $set: fields },
        { new: true, upsert: true }
      );
      return doc.toObject();
    }

    memorySettings = { ...memorySettings, ...fields };
    return { ...memorySettings };
  }
};
