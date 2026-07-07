import mongoose, { Schema } from "mongoose";

export interface IWithdrawalRequest {
  id: string;
  userId: string;
  userName: string;
  walletId: string;
  transactionId?: string;
  amount: number;
  status: "pending" | "completed" | "rejected";
  paymentMethod: "UPI" | "Bank Transfer";
  paymentDetails: {
    upiId?: string;
    bankName?: string;
    accountNumber?: string;
    ifscCode?: string;
    beneficiaryName?: string;
  };
  adminNotes?: string;
  createdAt: Date;
  resolvedAt?: Date;
}

const WithdrawalRequestSchema = new Schema<IWithdrawalRequest>({
  id: { type: String, required: true, unique: true },
  userId: { type: String, required: true },
  userName: { type: String, required: true },
  walletId: { type: String, required: true },
  transactionId: { type: String },
  amount: { type: Number, required: true },
  status: { type: String, enum: ["pending", "completed", "rejected"], default: "pending" },
  paymentMethod: { type: String, enum: ["UPI", "Bank Transfer"], required: true },
  paymentDetails: {
    upiId: { type: String },
    bankName: { type: String },
    accountNumber: { type: String },
    ifscCode: { type: String },
    beneficiaryName: { type: String }
  },
  adminNotes: { type: String },
  createdAt: { type: Date, default: Date.now },
  resolvedAt: { type: Date }
});

let MongoWithdrawalRequestModel: any = null;
try {
  MongoWithdrawalRequestModel = mongoose.model<IWithdrawalRequest>("WithdrawalRequest", WithdrawalRequestSchema);
} catch (e) {
  MongoWithdrawalRequestModel = mongoose.models.WithdrawalRequest;
}

const isMongoActive = () => mongoose.connection.readyState === 1;

// Seed default driver withdrawal requests for realistic visual displays
const memoryWithdrawalStore: IWithdrawalRequest[] = [
  {
    id: "wd_init_1",
    userId: "drv_1", // Ramesh Yadav
    userName: "Ramesh Yadav",
    walletId: "wal_drv_1",
    amount: 1000,
    status: "completed",
    paymentMethod: "UPI",
    paymentDetails: {
      upiId: "ramesh.yadav@ybl",
      beneficiaryName: "Ramesh Yadav"
    },
    adminNotes: "Disbursed via GramGo Panchayat Core Bank Node API.",
    createdAt: new Date("2026-07-03T10:00:00Z"),
    resolvedAt: new Date("2026-07-04T12:30:00Z")
  },
  {
    id: "wd_init_2",
    userId: "drv_1", // Ramesh Yadav
    userName: "Ramesh Yadav",
    walletId: "wal_drv_1",
    amount: 500,
    status: "pending",
    paymentMethod: "Bank Transfer",
    paymentDetails: {
      bankName: "State Bank of India (SBI)",
      accountNumber: "30291048591",
      ifscCode: "SBIN0001234",
      beneficiaryName: "Ramesh Yadav"
    },
    createdAt: new Date("2026-07-07T09:00:00Z")
  },
  {
    id: "wd_init_3",
    userId: "drv_2", // Amit Sharma
    userName: "Amit Sharma",
    walletId: "wal_drv_2",
    amount: 600,
    status: "completed",
    paymentMethod: "UPI",
    paymentDetails: {
      upiId: "amit.sharma@paytm",
      beneficiaryName: "Amit Sharma"
    },
    adminNotes: "Settlement complete",
    createdAt: new Date("2026-07-04T15:00:00Z"),
    resolvedAt: new Date("2026-07-05T11:00:00Z")
  },
  {
    id: "wd_init_4",
    userId: "drv_3", // Savita Devi
    userName: "Savita Devi",
    walletId: "wal_drv_3",
    amount: 800,
    status: "pending",
    paymentMethod: "UPI",
    paymentDetails: {
      upiId: "savita.devi@okhdfc",
      beneficiaryName: "Savita Devi"
    },
    createdAt: new Date("2026-07-07T07:30:00Z")
  }
];

export const WithdrawalRequestDb = {
  async findByUserId(userId: string): Promise<IWithdrawalRequest[]> {
    if (isMongoActive() && MongoWithdrawalRequestModel) {
      const docs = await MongoWithdrawalRequestModel.find({ userId }).sort({ createdAt: -1 });
      return docs.map((d: any) => d.toObject());
    }
    return memoryWithdrawalStore
      .filter(w => w.userId === userId)
      .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
  },

  async findById(id: string): Promise<IWithdrawalRequest | null> {
    if (isMongoActive() && MongoWithdrawalRequestModel) {
      const doc = await MongoWithdrawalRequestModel.findOne({ id });
      return doc ? doc.toObject() : null;
    }
    const found = memoryWithdrawalStore.find(w => w.id === id);
    return found ? { ...found } : null;
  },

  async create(wdData: Partial<IWithdrawalRequest>): Promise<IWithdrawalRequest> {
    const id = wdData.id || `wd_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`;
    const newWd: IWithdrawalRequest = {
      id,
      userId: wdData.userId || "",
      userName: wdData.userName || "GramGo Driver",
      walletId: wdData.walletId || "",
      transactionId: wdData.transactionId,
      amount: wdData.amount ?? 0,
      status: wdData.status || "pending",
      paymentMethod: wdData.paymentMethod || "UPI",
      paymentDetails: wdData.paymentDetails || {},
      adminNotes: wdData.adminNotes,
      createdAt: wdData.createdAt || new Date(),
      resolvedAt: wdData.resolvedAt
    };

    if (isMongoActive() && MongoWithdrawalRequestModel) {
      const doc = await MongoWithdrawalRequestModel.create(newWd);
      return doc.toObject();
    }

    memoryWithdrawalStore.unshift(newWd);
    return { ...newWd };
  },

  async updateStatus(id: string, status: "completed" | "rejected", adminNotes?: string): Promise<IWithdrawalRequest | null> {
    const resolvedAt = new Date();
    if (isMongoActive() && MongoWithdrawalRequestModel) {
      const doc = await MongoWithdrawalRequestModel.findOneAndUpdate(
        { id },
        { $set: { status, adminNotes, resolvedAt } },
        { new: true }
      );
      return doc ? doc.toObject() : null;
    }

    const found = memoryWithdrawalStore.find(w => w.id === id);
    if (found) {
      found.status = status;
      found.adminNotes = adminNotes;
      found.resolvedAt = resolvedAt;
      return { ...found };
    }
    return null;
  },

  async findAll(): Promise<IWithdrawalRequest[]> {
    if (isMongoActive() && MongoWithdrawalRequestModel) {
      const docs = await MongoWithdrawalRequestModel.find({}).sort({ createdAt: -1 });
      return docs.map((d: any) => d.toObject());
    }
    return [...memoryWithdrawalStore].sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
  }
};
