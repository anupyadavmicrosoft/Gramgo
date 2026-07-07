import mongoose, { Schema } from "mongoose";

export interface IPayment {
  id: string;
  bookingId?: string;
  userId: string;
  userName: string;
  userEmail: string;
  amount: number;
  currency: string;
  status: "pending" | "success" | "failed" | "refunded";
  gateway: "razorpay" | "stripe" | "wallet" | "none";
  gatewayPaymentId?: string;
  gatewayOrderId?: string;
  gatewaySignature?: string;
  description?: string;
  refundReason?: string;
  refundedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

const PaymentSchema = new Schema<IPayment>({
  id: { type: String, required: true, unique: true },
  bookingId: { type: String },
  userId: { type: String, required: true },
  userName: { type: String, required: true },
  userEmail: { type: String, required: true },
  amount: { type: Number, required: true },
  currency: { type: String, default: "INR" },
  status: { type: String, enum: ["pending", "success", "failed", "refunded"], default: "pending" },
  gateway: { type: String, enum: ["razorpay", "stripe", "wallet", "none"], default: "none" },
  gatewayPaymentId: { type: String },
  gatewayOrderId: { type: String },
  gatewaySignature: { type: String },
  description: { type: String },
  refundReason: { type: String },
  refundedAt: { type: Date },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
});

let MongoPaymentModel: any = null;
try {
  MongoPaymentModel = mongoose.model<IPayment>("Payment", PaymentSchema);
} catch (e) {
  MongoPaymentModel = mongoose.models.Payment;
}

const isMongoActive = () => mongoose.connection.readyState === 1;

// Seed datasets for beautiful visual state of payment ledger
const memoryPaymentStore: IPayment[] = [
  {
    id: "pay_init_1",
    bookingId: "book_seeded_1",
    userId: "passenger_1",
    userName: "Rajesh Kumar",
    userEmail: "rajesh@gramgo.in",
    amount: 80,
    currency: "INR",
    status: "success",
    gateway: "wallet",
    gatewayPaymentId: "wall_tx_90112",
    description: "Transit Payment for Booked Ride #book_seeded_1",
    createdAt: new Date(Date.now() - 36 * 60 * 60 * 1000),
    updatedAt: new Date(Date.now() - 36 * 60 * 60 * 1000)
  },
  {
    id: "pay_init_2",
    bookingId: "book_seeded_2",
    userId: "passenger_1",
    userName: "Rajesh Kumar",
    userEmail: "rajesh@gramgo.in",
    amount: 250,
    currency: "INR",
    status: "success",
    gateway: "razorpay",
    gatewayPaymentId: "pay_Rzp_78234129",
    gatewayOrderId: "order_Rzp_3248911",
    description: "Transit Payment for Booked Ride #book_seeded_2",
    createdAt: new Date(Date.now() - 12 * 60 * 60 * 1000),
    updatedAt: new Date(Date.now() - 12 * 60 * 60 * 1000)
  },
  {
    id: "pay_init_3",
    userId: "passenger_1",
    userName: "Rajesh Kumar",
    userEmail: "rajesh@gramgo.in",
    amount: 500,
    currency: "INR",
    status: "success",
    gateway: "razorpay",
    gatewayPaymentId: "pay_Rzp_23489112",
    gatewayOrderId: "order_Rzp_1248921",
    description: "Wallet Recharge Deposit",
    createdAt: new Date(Date.now() - 48 * 60 * 60 * 1000),
    updatedAt: new Date(Date.now() - 48 * 60 * 60 * 1000)
  },
  {
    id: "pay_init_4",
    userId: "passenger_1",
    userName: "Rajesh Kumar",
    userEmail: "rajesh@gramgo.in",
    amount: 150,
    currency: "INR",
    status: "failed",
    gateway: "stripe",
    gatewayPaymentId: "ch_Str_failed_9912",
    description: "Wallet Recharge Attempt",
    createdAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000),
    updatedAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000)
  }
];

export const PaymentDb = {
  async findByUserId(userId: string): Promise<IPayment[]> {
    if (isMongoActive() && MongoPaymentModel) {
      const docs = await MongoPaymentModel.find({ userId }).sort({ createdAt: -1 });
      return docs.map((d: any) => d.toObject());
    }
    return memoryPaymentStore
      .filter(pay => pay.userId === userId)
      .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
  },

  async findById(id: string): Promise<IPayment | null> {
    if (isMongoActive() && MongoPaymentModel) {
      const doc = await MongoPaymentModel.findOne({ id });
      return doc ? doc.toObject() : null;
    }
    const found = memoryPaymentStore.find(pay => pay.id === id);
    return found ? { ...found } : null;
  },

  async findByBookingId(bookingId: string): Promise<IPayment | null> {
    if (isMongoActive() && MongoPaymentModel) {
      const doc = await MongoPaymentModel.findOne({ bookingId });
      return doc ? doc.toObject() : null;
    }
    const found = memoryPaymentStore.find(pay => pay.bookingId === bookingId);
    return found ? { ...found } : null;
  },

  async create(payData: Partial<IPayment>): Promise<IPayment> {
    const id = payData.id || `pay_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`;
    const newPay: IPayment = {
      id,
      bookingId: payData.bookingId,
      userId: payData.userId || "",
      userName: payData.userName || "GramGo User",
      userEmail: payData.userEmail || "user@gramgo.in",
      amount: payData.amount ?? 0,
      currency: payData.currency || "INR",
      status: payData.status || "pending",
      gateway: payData.gateway || "none",
      gatewayPaymentId: payData.gatewayPaymentId,
      gatewayOrderId: payData.gatewayOrderId,
      gatewaySignature: payData.gatewaySignature,
      description: payData.description,
      refundReason: payData.refundReason,
      refundedAt: payData.refundedAt,
      createdAt: payData.createdAt || new Date(),
      updatedAt: payData.updatedAt || new Date()
    };

    if (isMongoActive() && MongoPaymentModel) {
      const doc = await MongoPaymentModel.create(newPay);
      return doc.toObject();
    }

    memoryPaymentStore.unshift(newPay);
    return { ...newPay };
  },

  async updateStatus(
    id: string, 
    status: "pending" | "success" | "failed" | "refunded", 
    details?: Partial<Pick<IPayment, "gatewayPaymentId" | "gatewayOrderId" | "gatewaySignature" | "refundReason" | "refundedAt" | "description">>
  ): Promise<IPayment | null> {
    const updatedAt = new Date();
    const extraFields: any = details || {};
    
    if (status === "refunded") {
      extraFields.refundedAt = extraFields.refundedAt || new Date();
    }

    if (isMongoActive() && MongoPaymentModel) {
      const doc = await MongoPaymentModel.findOneAndUpdate(
        { id },
        { $set: { status, updatedAt, ...extraFields } },
        { new: true }
      );
      return doc ? doc.toObject() : null;
    }

    const found = memoryPaymentStore.find(pay => pay.id === id);
    if (found) {
      found.status = status;
      found.updatedAt = updatedAt;
      Object.assign(found, extraFields);
      return { ...found };
    }
    return null;
  },

  async findAll(): Promise<IPayment[]> {
    if (isMongoActive() && MongoPaymentModel) {
      const docs = await MongoPaymentModel.find({}).sort({ createdAt: -1 });
      return docs.map((d: any) => d.toObject());
    }
    return [...memoryPaymentStore].sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
  }
};
