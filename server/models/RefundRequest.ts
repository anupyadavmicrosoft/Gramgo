import mongoose, { Schema } from "mongoose";

export interface IRefundRequest {
  id: string;
  userId: string;
  userName: string;
  userEmail: string;
  walletId: string;
  transactionId?: string;
  amount: number;
  reason: string;
  status: "pending" | "approved" | "rejected";
  adminNotes?: string;
  createdAt: Date;
  resolvedAt?: Date;
}

const RefundRequestSchema = new Schema<IRefundRequest>({
  id: { type: String, required: true, unique: true },
  userId: { type: String, required: true },
  userName: { type: String, required: true },
  userEmail: { type: String, required: true },
  walletId: { type: String, required: true },
  transactionId: { type: String },
  amount: { type: Number, required: true },
  reason: { type: String, required: true },
  status: { type: String, enum: ["pending", "approved", "rejected"], default: "pending" },
  adminNotes: { type: String },
  createdAt: { type: Date, default: Date.now },
  resolvedAt: { type: Date }
});

let MongoRefundRequestModel: any = null;
try {
  MongoRefundRequestModel = mongoose.model<IRefundRequest>("RefundRequest", RefundRequestSchema);
} catch (e) {
  MongoRefundRequestModel = mongoose.models.RefundRequest;
}

const isMongoActive = () => mongoose.connection.readyState === 1;

// Seed datasets for beautiful visual state
const memoryRefundStore: IRefundRequest[] = [
  {
    id: "ref_init_1",
    userId: "drv_1",
    userName: "Ramesh Kumar",
    userEmail: "ramesh@gramgo.in",
    walletId: "wal_drv_1",
    transactionId: "tx_init_4",
    amount: 110,
    reason: "Duplicate toll deduction occurred during Malikpur passenger transit",
    status: "approved",
    adminNotes: "System error verified. Reversal approved.",
    createdAt: new Date("2026-07-05T16:00:00Z"),
    resolvedAt: new Date("2026-07-06T09:30:00Z")
  },
  {
    id: "ref_init_2",
    userId: "drv_1",
    userName: "Ramesh Kumar",
    userEmail: "ramesh@gramgo.in",
    walletId: "wal_drv_1",
    amount: 250,
    reason: "Accidental double-charge for monthly vehicle wellness inspection processing",
    status: "pending",
    createdAt: new Date("2026-07-07T08:15:00Z")
  }
];

export const RefundRequestDb = {
  async findByUserId(userId: string): Promise<IRefundRequest[]> {
    if (isMongoActive() && MongoRefundRequestModel) {
      const docs = await MongoRefundRequestModel.find({ userId }).sort({ createdAt: -1 });
      return docs.map((d: any) => d.toObject());
    }
    return memoryRefundStore
      .filter(ref => ref.userId === userId)
      .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
  },

  async findById(id: string): Promise<IRefundRequest | null> {
    if (isMongoActive() && MongoRefundRequestModel) {
      const doc = await MongoRefundRequestModel.findOne({ id });
      return doc ? doc.toObject() : null;
    }
    const found = memoryRefundStore.find(ref => ref.id === id);
    return found ? { ...found } : null;
  },

  async create(refData: Partial<IRefundRequest>): Promise<IRefundRequest> {
    const id = refData.id || `ref_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`;
    const newRef: IRefundRequest = {
      id,
      userId: refData.userId || "",
      userName: refData.userName || "GramGo User",
      userEmail: refData.userEmail || "user@gramgo.in",
      walletId: refData.walletId || "",
      transactionId: refData.transactionId,
      amount: refData.amount ?? 0,
      reason: refData.reason || "Unspecified refund request",
      status: refData.status || "pending",
      adminNotes: refData.adminNotes,
      createdAt: refData.createdAt || new Date(),
      resolvedAt: refData.resolvedAt
    };

    if (isMongoActive() && MongoRefundRequestModel) {
      const doc = await MongoRefundRequestModel.create(newRef);
      return doc.toObject();
    }

    memoryRefundStore.unshift(newRef);
    return { ...newRef };
  },

  async updateStatus(id: string, status: "approved" | "rejected", adminNotes?: string): Promise<IRefundRequest | null> {
    const resolvedAt = new Date();
    if (isMongoActive() && MongoRefundRequestModel) {
      const doc = await MongoRefundRequestModel.findOneAndUpdate(
        { id },
        { $set: { status, adminNotes, resolvedAt } },
        { new: true }
      );
      return doc ? doc.toObject() : null;
    }

    const found = memoryRefundStore.find(ref => ref.id === id);
    if (found) {
      found.status = status;
      found.adminNotes = adminNotes;
      found.resolvedAt = resolvedAt;
      return { ...found };
    }
    return null;
  },

  async findAll(): Promise<IRefundRequest[]> {
    if (isMongoActive() && MongoRefundRequestModel) {
      const docs = await MongoRefundRequestModel.find({}).sort({ createdAt: -1 });
      return docs.map((d: any) => d.toObject());
    }
    return [...memoryRefundStore].sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
  }
};
