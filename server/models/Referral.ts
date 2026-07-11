import mongoose, { Schema } from "mongoose";

// --- Referral Code Model ---
export interface IReferral {
  id: string;
  userId: string;
  code: string;
  status: "active" | "inactive";
  referralLimit: number;
  timesUsed: number;
  expiryDate?: Date;
  createdAt: Date;
  updatedAt: Date;
}

const ReferralSchema = new Schema<IReferral>({
  id: { type: String, required: true, unique: true },
  userId: { type: String, required: true },
  code: { type: String, required: true, unique: true },
  status: { type: String, enum: ["active", "inactive"], default: "active" },
  referralLimit: { type: Number, default: 10 },
  timesUsed: { type: Number, default: 0 },
  expiryDate: { type: Date },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
});

let MongoReferralModel: any = null;
try {
  MongoReferralModel = mongoose.model<IReferral>("Referral", ReferralSchema);
} catch (e) {
  MongoReferralModel = mongoose.models.Referral;
}

// --- Referral Reward Model ---
export interface IReferralReward {
  id: string;
  userId: string;
  type: "referrer" | "referee";
  amount: number;
  status: "pending" | "claimed" | "expired";
  description: string;
  expiryDate?: Date;
  createdAt: Date;
  updatedAt: Date;
}

const ReferralRewardSchema = new Schema<IReferralReward>({
  id: { type: String, required: true, unique: true },
  userId: { type: String, required: true },
  type: { type: String, enum: ["referrer", "referee"], required: true },
  amount: { type: Number, required: true },
  status: { type: String, enum: ["pending", "claimed", "expired"], default: "pending" },
  description: { type: String, required: true },
  expiryDate: { type: Date },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
});

let MongoReferralRewardModel: any = null;
try {
  MongoReferralRewardModel = mongoose.model<IReferralReward>("ReferralReward", ReferralRewardSchema);
} catch (e) {
  MongoReferralRewardModel = mongoose.models.ReferralReward;
}

// --- Referral Transaction Model ---
export interface IReferralTransaction {
  id: string;
  referrerId: string;
  refereeId: string;
  refereeName: string;
  referralCode: string;
  status: "registered" | "completed_first_ride" | "rewarded";
  createdAt: Date;
  updatedAt: Date;
}

const ReferralTransactionSchema = new Schema<IReferralTransaction>({
  id: { type: String, required: true, unique: true },
  referrerId: { type: String, required: true },
  refereeId: { type: String, required: true },
  refereeName: { type: String, required: true },
  referralCode: { type: String, required: true },
  status: { type: String, enum: ["registered", "completed_first_ride", "rewarded"], default: "registered" },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
});

let MongoReferralTransactionModel: any = null;
try {
  MongoReferralTransactionModel = mongoose.model<IReferralTransaction>("ReferralTransaction", ReferralTransactionSchema);
} catch (e) {
  MongoReferralTransactionModel = mongoose.models.ReferralTransaction;
}

const isMongoActive = () => mongoose.connection.readyState === 1;

// --- Seeds for Memory Stores ---
const memoryReferrals: IReferral[] = [
  {
    id: "ref_seed_drv1",
    userId: "drv_1",
    code: "RAMESH50",
    status: "active",
    referralLimit: 10,
    timesUsed: 2,
    expiryDate: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000), // 1 year from now
    createdAt: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
    updatedAt: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)
  },
  {
    id: "ref_seed_drv2",
    userId: "drv_2",
    code: "AMITGO",
    status: "active",
    referralLimit: 5,
    timesUsed: 4,
    expiryDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days from now
    createdAt: new Date(Date.now() - 15 * 24 * 60 * 60 * 1000),
    updatedAt: new Date(Date.now() - 15 * 24 * 60 * 60 * 1000)
  },
  {
    id: "ref_seed_admin",
    userId: "admin_1",
    code: "GRAMGOVIP",
    status: "active",
    referralLimit: 100,
    timesUsed: 12,
    expiryDate: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000),
    createdAt: new Date(Date.now() - 60 * 24 * 60 * 60 * 1000),
    updatedAt: new Date(Date.now() - 60 * 24 * 60 * 60 * 1000)
  }
];

const memoryReferralRewards: IReferralReward[] = [
  {
    id: "rew_seed_1",
    userId: "drv_1",
    type: "referrer",
    amount: 50,
    status: "claimed",
    description: "Referral bonus for inviting Ramesh's contact (registered)",
    createdAt: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000),
    updatedAt: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000)
  },
  {
    id: "rew_seed_2",
    userId: "drv_1",
    type: "referrer",
    amount: 100,
    status: "pending",
    description: "Referral bonus for referee completing first medical transit ride",
    createdAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000),
    updatedAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000)
  },
  {
    id: "rew_seed_3",
    userId: "drv_2",
    type: "referrer",
    amount: 50,
    status: "claimed",
    description: "Referral signup reward",
    createdAt: new Date(Date.now() - 12 * 24 * 60 * 60 * 1000),
    updatedAt: new Date(Date.now() - 12 * 24 * 60 * 60 * 1000)
  }
];

const memoryReferralTransactions: IReferralTransaction[] = [
  {
    id: "tx_seed_1",
    referrerId: "drv_1",
    refereeId: "drv_3",
    refereeName: "Savita Devi",
    referralCode: "RAMESH50",
    status: "completed_first_ride",
    createdAt: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000),
    updatedAt: new Date(Date.now() - 8 * 24 * 60 * 60 * 1000)
  },
  {
    id: "tx_seed_2",
    referrerId: "drv_2",
    refereeId: "drv_4",
    refereeName: "Mohammad Yusuf",
    referralCode: "AMITGO",
    status: "rewarded",
    createdAt: new Date(Date.now() - 12 * 24 * 60 * 60 * 1000),
    updatedAt: new Date(Date.now() - 11 * 24 * 60 * 60 * 1000)
  }
];

// --- Referral Data Access Object (ReferralDb) ---
export const ReferralDb = {
  async findByUserId(userId: string): Promise<IReferral | null> {
    if (isMongoActive() && MongoReferralModel) {
      const doc = await MongoReferralModel.findOne({ userId });
      return doc ? doc.toObject() : null;
    }
    const found = memoryReferrals.find(r => r.userId === userId);
    return found ? { ...found } : null;
  },

  async findByCode(code: string): Promise<IReferral | null> {
    const uppercaseCode = code.toUpperCase().trim();
    if (isMongoActive() && MongoReferralModel) {
      const doc = await MongoReferralModel.findOne({ code: uppercaseCode });
      return doc ? doc.toObject() : null;
    }
    const found = memoryReferrals.find(r => r.code.toUpperCase() === uppercaseCode);
    return found ? { ...found } : null;
  },

  async create(data: Partial<IReferral>): Promise<IReferral> {
    const id = data.id || `ref_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`;
    const newRef: IReferral = {
      id,
      userId: data.userId || "",
      code: (data.code || "").toUpperCase().trim(),
      status: data.status || "active",
      referralLimit: data.referralLimit ?? 10,
      timesUsed: data.timesUsed ?? 0,
      expiryDate: data.expiryDate,
      createdAt: data.createdAt || new Date(),
      updatedAt: data.updatedAt || new Date()
    };

    if (isMongoActive() && MongoReferralModel) {
      const doc = await MongoReferralModel.create(newRef);
      return doc.toObject();
    }

    memoryReferrals.unshift(newRef);
    return { ...newRef };
  },

  async incrementTimesUsed(code: string): Promise<IReferral | null> {
    const uppercaseCode = code.toUpperCase().trim();
    if (isMongoActive() && MongoReferralModel) {
      const doc = await MongoReferralModel.findOneAndUpdate(
        { code: uppercaseCode },
        { $inc: { timesUsed: 1 }, $set: { updatedAt: new Date() } },
        { new: true }
      );
      return doc ? doc.toObject() : null;
    }

    const found = memoryReferrals.find(r => r.code.toUpperCase() === uppercaseCode);
    if (found) {
      found.timesUsed += 1;
      found.updatedAt = new Date();
      return { ...found };
    }
    return null;
  },

  async updateStatus(userId: string, status: "active" | "inactive"): Promise<IReferral | null> {
    if (isMongoActive() && MongoReferralModel) {
      const doc = await MongoReferralModel.findOneAndUpdate(
        { userId },
        { $set: { status, updatedAt: new Date() } },
        { new: true }
      );
      return doc ? doc.toObject() : null;
    }

    const found = memoryReferrals.find(r => r.userId === userId);
    if (found) {
      found.status = status;
      found.updatedAt = new Date();
      return { ...found };
    }
    return null;
  }
};

// --- Referral Reward Data Access Object (ReferralRewardDb) ---
export const ReferralRewardDb = {
  async findByUserId(userId: string): Promise<IReferralReward[]> {
    if (isMongoActive() && MongoReferralRewardModel) {
      const docs = await MongoReferralRewardModel.find({ userId }).sort({ createdAt: -1 });
      return docs.map((d: any) => d.toObject());
    }
    return memoryReferralRewards
      .filter(r => r.userId === userId)
      .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
  },

  async create(data: Partial<IReferralReward>): Promise<IReferralReward> {
    const id = data.id || `rew_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`;
    const newReward: IReferralReward = {
      id,
      userId: data.userId || "",
      type: data.type || "referrer",
      amount: data.amount ?? 50,
      status: data.status || "pending",
      description: data.description || "Referral reward",
      expiryDate: data.expiryDate || new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // Default 30 days
      createdAt: data.createdAt || new Date(),
      updatedAt: data.updatedAt || new Date()
    };

    if (isMongoActive() && MongoReferralRewardModel) {
      const doc = await MongoReferralRewardModel.create(newReward);
      return doc.toObject();
    }

    memoryReferralRewards.unshift(newReward);
    return { ...newReward };
  },

  async claimReward(id: string): Promise<IReferralReward | null> {
    if (isMongoActive() && MongoReferralRewardModel) {
      const doc = await MongoReferralRewardModel.findOneAndUpdate(
        { id },
        { $set: { status: "claimed", updatedAt: new Date() } },
        { new: true }
      );
      return doc ? doc.toObject() : null;
    }

    const found = memoryReferralRewards.find(r => r.id === id);
    if (found) {
      found.status = "claimed";
      found.updatedAt = new Date();
      return { ...found };
    }
    return null;
  },

  async expireReward(id: string): Promise<IReferralReward | null> {
    if (isMongoActive() && MongoReferralRewardModel) {
      const doc = await MongoReferralRewardModel.findOneAndUpdate(
        { id },
        { $set: { status: "expired", updatedAt: new Date() } },
        { new: true }
      );
      return doc ? doc.toObject() : null;
    }

    const found = memoryReferralRewards.find(r => r.id === id);
    if (found) {
      found.status = "expired";
      found.updatedAt = new Date();
      return { ...found };
    }
    return null;
  }
};

// --- Referral Transaction Data Access Object (ReferralTransactionDb) ---
export const ReferralTransactionDb = {
  async findByReferrerId(referrerId: string): Promise<IReferralTransaction[]> {
    if (isMongoActive() && MongoReferralTransactionModel) {
      const docs = await MongoReferralTransactionModel.find({ referrerId }).sort({ createdAt: -1 });
      return docs.map((d: any) => d.toObject());
    }
    return memoryReferralTransactions
      .filter(t => t.referrerId === referrerId)
      .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
  },

  async findByRefereeId(refereeId: string): Promise<IReferralTransaction | null> {
    if (isMongoActive() && MongoReferralTransactionModel) {
      const doc = await MongoReferralTransactionModel.findOne({ refereeId });
      return doc ? doc.toObject() : null;
    }
    const found = memoryReferralTransactions.find(t => t.refereeId === refereeId);
    return found ? { ...found } : null;
  },

  async create(data: Partial<IReferralTransaction>): Promise<IReferralTransaction> {
    const id = data.id || `tx_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`;
    const newTx: IReferralTransaction = {
      id,
      referrerId: data.referrerId || "",
      refereeId: data.refereeId || "",
      refereeName: data.refereeName || "Referred User",
      referralCode: (data.referralCode || "").toUpperCase().trim(),
      status: data.status || "registered",
      createdAt: data.createdAt || new Date(),
      updatedAt: data.updatedAt || new Date()
    };

    if (isMongoActive() && MongoReferralTransactionModel) {
      const doc = await MongoReferralTransactionModel.create(newTx);
      return doc.toObject();
    }

    memoryReferralTransactions.unshift(newTx);
    return { ...newTx };
  },

  async updateStatus(id: string, status: IReferralTransaction["status"]): Promise<IReferralTransaction | null> {
    if (isMongoActive() && MongoReferralTransactionModel) {
      const doc = await MongoReferralTransactionModel.findOneAndUpdate(
        { id },
        { $set: { status, updatedAt: new Date() } },
        { new: true }
      );
      return doc ? doc.toObject() : null;
    }

    const found = memoryReferralTransactions.find(t => t.id === id);
    if (found) {
      found.status = status;
      found.updatedAt = new Date();
      return { ...found };
    }
    return null;
  }
};
