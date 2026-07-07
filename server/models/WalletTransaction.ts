import mongoose, { Schema } from "mongoose";

export interface IWalletTransaction {
  id: string;
  walletId: string;
  userId: string;
  amount: number;
  type: "credit" | "debit" | "refund" | "adjustment";
  status: "completed" | "pending" | "failed";
  description: string;
  createdAt: Date;
}

const WalletTransactionSchema = new Schema<IWalletTransaction>({
  id: { type: String, required: true, unique: true },
  walletId: { type: String, required: true },
  userId: { type: String, required: true },
  amount: { type: Number, required: true },
  type: { type: String, enum: ["credit", "debit", "refund", "adjustment"], required: true },
  status: { type: String, enum: ["completed", "pending", "failed"], default: "completed" },
  description: { type: String, required: true },
  createdAt: { type: Date, default: Date.now }
});

let MongoWalletTransactionModel: any = null;
try {
  MongoWalletTransactionModel = mongoose.model<IWalletTransaction>("WalletTransaction", WalletTransactionSchema);
} catch (e) {
  MongoWalletTransactionModel = mongoose.models.WalletTransaction;
}

const isMongoActive = () => mongoose.connection.readyState === 1;

// Memory storage fallback
const memoryTransactionStore: IWalletTransaction[] = [
  {
    id: "tx_init_1",
    walletId: "wal_drv_1",
    userId: "drv_1",
    amount: 1000,
    type: "credit",
    status: "completed",
    description: "Welcome Pilot Gas Subsidy Onboarding Bonus",
    createdAt: new Date("2026-07-02T11:00:00Z")
  },
  {
    id: "tx_init_2",
    walletId: "wal_drv_1",
    userId: "drv_1",
    amount: 450.50,
    type: "credit",
    status: "completed",
    description: "Maternity Transport Lifeline Reimbursement (#M420)",
    createdAt: new Date("2026-07-05T18:30:00Z")
  },
  {
    id: "tx_init_3",
    walletId: "wal_drv_2",
    userId: "drv_2",
    amount: 1000,
    type: "credit",
    status: "completed",
    description: "Welcome Pilot Gas Subsidy Onboarding Bonus",
    createdAt: new Date("2026-07-02T12:00:00Z")
  },
  {
    id: "tx_init_4",
    walletId: "wal_drv_2",
    userId: "drv_2",
    amount: 110,
    type: "debit",
    status: "completed",
    description: "Ghazipur Road Toll Auto-Debit",
    createdAt: new Date("2026-07-05T15:20:00Z")
  },
  {
    id: "tx_init_5",
    walletId: "wal_drv_3",
    userId: "drv_3",
    amount: 2000,
    type: "credit",
    status: "completed",
    description: "Emergency Medical Driver Award Scheme",
    createdAt: new Date("2026-07-03T09:00:00Z")
  },
  {
    id: "tx_init_6",
    walletId: "wal_drv_3",
    userId: "drv_3",
    amount: 150,
    type: "credit",
    status: "completed",
    description: "Severe Illness Patient Transit Incentive",
    createdAt: new Date("2026-07-06T10:00:00Z")
  },
  {
    id: "tx_init_7",
    walletId: "wal_drv_4",
    userId: "drv_4",
    amount: 500,
    type: "credit",
    status: "completed",
    description: "Initial Regional Transit Fuel Subsidy Allocation",
    createdAt: new Date("2026-07-03T14:00:00Z")
  },
  {
    id: "tx_init_8",
    walletId: "wal_drv_4",
    userId: "drv_4",
    amount: 180,
    type: "debit",
    status: "completed",
    description: "Vehicle Inspection Certification Processing Fee",
    createdAt: new Date("2026-07-05T19:45:00Z")
  }
];

export const WalletTransactionDb = {
  async findByUserId(userId: string): Promise<IWalletTransaction[]> {
    if (isMongoActive() && MongoWalletTransactionModel) {
      const docs = await MongoWalletTransactionModel.find({ userId }).sort({ createdAt: -1 });
      return docs.map((d: any) => d.toObject());
    }
    return memoryTransactionStore
      .filter(tx => tx.userId === userId)
      .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
  },

  async findById(id: string): Promise<IWalletTransaction | null> {
    if (isMongoActive() && MongoWalletTransactionModel) {
      const doc = await MongoWalletTransactionModel.findOne({ id });
      return doc ? doc.toObject() : null;
    }
    const found = memoryTransactionStore.find(tx => tx.id === id);
    return found ? { ...found } : null;
  },

  async create(txData: Partial<IWalletTransaction>): Promise<IWalletTransaction> {
    const id = txData.id || `tx_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`;
    const newTx: IWalletTransaction = {
      id,
      walletId: txData.walletId || "",
      userId: txData.userId || "",
      amount: txData.amount ?? 0,
      type: txData.type || "credit",
      status: txData.status || "completed",
      description: txData.description || "Incentive ledger record",
      createdAt: txData.createdAt || new Date()
    };

    if (isMongoActive() && MongoWalletTransactionModel) {
      const doc = await MongoWalletTransactionModel.create(newTx);
      return doc.toObject();
    }

    memoryTransactionStore.unshift(newTx);
    return { ...newTx };
  },

  async findAll(): Promise<IWalletTransaction[]> {
    if (isMongoActive() && MongoWalletTransactionModel) {
      const docs = await MongoWalletTransactionModel.find({}).sort({ createdAt: -1 });
      return docs.map((d: any) => d.toObject());
    }
    return [...memoryTransactionStore].sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
  }
};
