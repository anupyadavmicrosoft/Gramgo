import mongoose, { Schema } from "mongoose";

export interface IWhatsAppOtp {
  id: string;
  phone: string;
  code: string;
  type: "register" | "login" | "forgot_password";
  attempts: number;
  expiresAt: Date;
  createdAt: Date;
}

// Check if mongoose has an active connection (mirroring standard pattern)
const isMongoActive = (): boolean => {
  return mongoose.connection.readyState === 1;
};

// ---------------- Real Mongoose Schema definition ----------------
const WhatsAppOtpSchema = new Schema<IWhatsAppOtp>({
  phone: { type: String, required: true },
  code: { type: String, required: true },
  type: { type: String, required: true, enum: ["register", "login", "forgot_password"] },
  attempts: { type: Number, default: 0 },
  expiresAt: { type: Date, required: true },
  createdAt: { type: Date, default: Date.now }
});

let MongoWhatsAppOtpModel: any = null;
try {
  MongoWhatsAppOtpModel = mongoose.model<IWhatsAppOtp>("WhatsAppOtp", WhatsAppOtpSchema);
} catch (e) {
  MongoWhatsAppOtpModel = mongoose.models.WhatsAppOtp;
}

// ---------------- Graceful In-Memory Fallback Store ----------------
class MemoryOtpStore {
  private otps: IWhatsAppOtp[] = [];

  async create(data: Partial<IWhatsAppOtp>): Promise<IWhatsAppOtp> {
    const id = "otp_" + Math.random().toString(36).substr(2, 9);
    const newOtp: IWhatsAppOtp = {
      id,
      phone: data.phone || "",
      code: data.code || "",
      type: data.type || "register",
      attempts: data.attempts || 0,
      expiresAt: data.expiresAt || new Date(Date.now() + 5 * 60 * 1000),
      createdAt: data.createdAt || new Date()
    };
    this.otps.push(newOtp);
    return { ...newOtp };
  }

  async findLatest(phone: string, type: "register" | "login" | "forgot_password"): Promise<IWhatsAppOtp | null> {
    const matched = this.otps
      .filter(o => o.phone === phone && o.type === type)
      .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
    return matched.length > 0 ? { ...matched[0] } : null;
  }

  async incrementAttempts(id: string): Promise<void> {
    const otp = this.otps.find(o => o.id === id);
    if (otp) {
      otp.attempts += 1;
    }
  }

  async delete(id: string): Promise<void> {
    this.otps = this.otps.filter(o => o.id !== id);
  }

  async clearPhoneOtps(phone: string, type: "register" | "login" | "forgot_password"): Promise<void> {
    this.otps = this.otps.filter(o => !(o.phone === phone && o.type === type));
  }
}

const memoryStore = new MemoryOtpStore();

// ---------------- Unified WhatsAppOtp DB interface ----------------
export const WhatsAppOtpDb = {
  async create(data: Partial<IWhatsAppOtp>): Promise<IWhatsAppOtp> {
    if (isMongoActive() && MongoWhatsAppOtpModel) {
      const doc = new MongoWhatsAppOtpModel(data);
      const saved = await doc.save();
      return saved.toObject();
    }
    return memoryStore.create(data);
  },

  async findLatest(phone: string, type: "register" | "login" | "forgot_password"): Promise<IWhatsAppOtp | null> {
    if (isMongoActive() && MongoWhatsAppOtpModel) {
      const doc = await MongoWhatsAppOtpModel.findOne({ phone, type }).sort({ createdAt: -1 });
      return doc ? doc.toObject() : null;
    }
    return memoryStore.findLatest(phone, type);
  },

  async incrementAttempts(id: string): Promise<void> {
    if (isMongoActive() && MongoWhatsAppOtpModel) {
      await MongoWhatsAppOtpModel.updateOne({ _id: id }, { $inc: { attempts: 1 } });
      return;
    }
    return memoryStore.incrementAttempts(id);
  },

  async delete(id: string): Promise<void> {
    if (isMongoActive() && MongoWhatsAppOtpModel) {
      await MongoWhatsAppOtpModel.deleteOne({ _id: id });
      return;
    }
    return memoryStore.delete(id);
  },

  async clearPhoneOtps(phone: string, type: "register" | "login" | "forgot_password"): Promise<void> {
    if (isMongoActive() && MongoWhatsAppOtpModel) {
      await MongoWhatsAppOtpModel.deleteMany({ phone, type });
      return;
    }
    return memoryStore.clearPhoneOtps(phone, type);
  }
};
