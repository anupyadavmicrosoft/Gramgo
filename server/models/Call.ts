import mongoose, { Schema } from "mongoose";

export interface ICall {
  id: string;
  conversationId?: string;
  callerId: string;
  callerName: string;
  receiverId: string;
  receiverName: string;
  status: "completed" | "missed" | "rejected" | "no-answer";
  duration: number; // in seconds
  createdAt: Date;
}

const CallSchema = new Schema<ICall>({
  id: { type: String, required: true, unique: true },
  conversationId: { type: String, required: false },
  callerId: { type: String, required: true },
  callerName: { type: String, required: true },
  receiverId: { type: String, required: true },
  receiverName: { type: String, required: true },
  status: { type: String, enum: ["completed", "missed", "rejected", "no-answer"], required: true },
  duration: { type: Number, default: 0 },
  createdAt: { type: Date, default: Date.now }
});

let MongoCallModel: any = null;
try {
  MongoCallModel = mongoose.model<ICall>("Call", CallSchema);
} catch (e) {
  MongoCallModel = mongoose.models.Call;
}

const memoryCallStore: ICall[] = [
  // Seed some initial calls for demonstration / realism if empty
  {
    id: "call_seed_1",
    conversationId: "conv_1",
    callerId: "driver_1",
    callerName: "Aarav Sharma (Driver)",
    receiverId: "passenger_1",
    receiverName: "Anup Yadav",
    status: "completed",
    duration: 145,
    createdAt: new Date(Date.now() - 3600000 * 2) // 2 hours ago
  },
  {
    id: "call_seed_2",
    conversationId: "conv_1",
    callerId: "driver_1",
    callerName: "Aarav Sharma (Driver)",
    receiverId: "passenger_1",
    receiverName: "Anup Yadav",
    status: "missed",
    duration: 0,
    createdAt: new Date(Date.now() - 3600000 * 5) // 5 hours ago
  }
];

const isMongoActive = () => mongoose.connection.readyState === 1;

export const CallDb = {
  async findByUserId(userId: string): Promise<ICall[]> {
    if (isMongoActive() && MongoCallModel) {
      const docs = await MongoCallModel.find({
        $or: [{ callerId: userId }, { receiverId: userId }]
      }).sort({ createdAt: -1 });
      return docs.map((d: any) => d.toObject());
    }
    return [...memoryCallStore]
      .filter(c => c.callerId === userId || c.receiverId === userId)
      .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
  },

  async create(data: Partial<ICall>): Promise<ICall> {
    const id = data.id || "call_" + Math.random().toString(36).substr(2, 9);
    const newCall: ICall = {
      id,
      conversationId: data.conversationId,
      callerId: data.callerId || "",
      callerName: data.callerName || "Unknown",
      receiverId: data.receiverId || "",
      receiverName: data.receiverName || "Unknown",
      status: data.status || "missed",
      duration: data.duration || 0,
      createdAt: data.createdAt || new Date()
    };

    if (isMongoActive() && MongoCallModel) {
      const doc = new MongoCallModel(newCall);
      await doc.save();
      return doc.toObject();
    }

    memoryCallStore.unshift(newCall);
    return { ...newCall };
  }
};
