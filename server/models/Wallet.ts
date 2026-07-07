import mongoose, { Schema } from "mongoose";

export interface IWallet {
  id: string;
  userId: string;
  balance: number;
  currency: string;
  status: "active" | "frozen" | "closed";
  createdAt: Date;
  updatedAt: Date;
}

const WalletSchema = new Schema<IWallet>({
  id: { type: String, required: true, unique: true },
  userId: { type: String, required: true, unique: true },
  balance: { type: Number, required: true, default: 0 },
  currency: { type: String, required: true, default: "INR" },
  status: { type: String, enum: ["active", "frozen", "closed"], default: "active" },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
});

let MongoWalletModel: any = null;
try {
  MongoWalletModel = mongoose.model<IWallet>("Wallet", WalletSchema);
} catch (e) {
  MongoWalletModel = mongoose.models.Wallet;
}

const isMongoActive = () => mongoose.connection.readyState === 1;

// Memory storage fallback
const memoryWalletStore: IWallet[] = [
  {
    id: "wal_admin_1",
    userId: "admin_1",
    balance: 5000.00,
    currency: "INR",
    status: "active",
    createdAt: new Date("2026-07-01T10:00:00Z"),
    updatedAt: new Date("2026-07-01T10:00:00Z")
  },
  {
    id: "wal_drv_1",
    userId: "drv_1", // Ramesh Yadav
    balance: 1450.50,
    currency: "INR",
    status: "active",
    createdAt: new Date("2026-07-02T11:00:00Z"),
    updatedAt: new Date("2026-07-05T18:30:00Z")
  },
  {
    id: "wal_drv_2",
    userId: "drv_2", // Amit Sharma
    balance: 890.00,
    currency: "INR",
    status: "active",
    createdAt: new Date("2026-07-02T12:00:00Z"),
    updatedAt: new Date("2026-07-05T15:20:00Z")
  },
  {
    id: "wal_drv_3",
    userId: "drv_3", // Savita Devi
    balance: 2150.00,
    currency: "INR",
    status: "active",
    createdAt: new Date("2026-07-03T09:00:00Z"),
    updatedAt: new Date("2026-07-06T10:00:00Z")
  },
  {
    id: "wal_drv_4",
    userId: "drv_4", // Mohammad Yusuf
    balance: 320.00,
    currency: "INR",
    status: "active",
    createdAt: new Date("2026-07-03T14:00:00Z"),
    updatedAt: new Date("2026-07-05T19:45:00Z")
  }
];

export const WalletDb = {
  async findByUserId(userId: string): Promise<IWallet | null> {
    if (isMongoActive() && MongoWalletModel) {
      const doc = await MongoWalletModel.findOne({ userId });
      return doc ? doc.toObject() : null;
    }
    const found = memoryWalletStore.find(w => w.userId === userId);
    return found ? { ...found } : null;
  },

  async findById(id: string): Promise<IWallet | null> {
    if (isMongoActive() && MongoWalletModel) {
      const doc = await MongoWalletModel.findOne({ id });
      return doc ? doc.toObject() : null;
    }
    const found = memoryWalletStore.find(w => w.id === id);
    return found ? { ...found } : null;
  },

  async create(walletData: Partial<IWallet>): Promise<IWallet> {
    const id = walletData.id || `wal_${Date.now()}`;
    const newWallet: IWallet = {
      id,
      userId: walletData.userId || "",
      balance: walletData.balance ?? 0,
      currency: walletData.currency || "INR",
      status: walletData.status || "active",
      createdAt: walletData.createdAt || new Date(),
      updatedAt: walletData.updatedAt || new Date()
    };

    if (isMongoActive() && MongoWalletModel) {
      const doc = await MongoWalletModel.create(newWallet);
      return doc.toObject();
    }

    memoryWalletStore.push(newWallet);
    return { ...newWallet };
  },

  async save(wallet: IWallet): Promise<IWallet> {
    const now = new Date();
    wallet.updatedAt = now;

    if (isMongoActive() && MongoWalletModel) {
      const existing = await MongoWalletModel.findOne({ id: wallet.id });
      if (existing) {
        await MongoWalletModel.updateOne({ id: wallet.id }, { $set: wallet });
        return wallet;
      } else {
        const doc = await MongoWalletModel.create(wallet);
        return doc.toObject();
      }
    }

    const idx = memoryWalletStore.findIndex(w => w.id === wallet.id);
    if (idx !== -1) {
      memoryWalletStore[idx] = { ...wallet };
    } else {
      memoryWalletStore.push({ ...wallet });
    }
    return wallet;
  },

  async findAll(): Promise<IWallet[]> {
    if (isMongoActive() && MongoWalletModel) {
      const docs = await MongoWalletModel.find({});
      return docs.map((d: any) => d.toObject());
    }
    return [...memoryWalletStore];
  },

  async updateBalance(userId: string, amount: number, isCredit: boolean = true): Promise<IWallet | null> {
    const wallet = await this.findByUserId(userId);
    if (!wallet) return null;

    if (isCredit) {
      wallet.balance += amount;
    } else {
      wallet.balance -= amount;
    }

    return await this.save(wallet);
  }
};
