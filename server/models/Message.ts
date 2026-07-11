import mongoose, { Schema } from "mongoose";

export interface IAttachment {
  type: "image" | "document" | "location" | "voice";
  url?: string;
  name?: string;
  mimeType?: string;
  size?: number;
  latitude?: number;
  longitude?: number;
  address?: string;
}

export interface IMessage {
  id: string;
  conversationId: string;
  senderId: string;
  senderName: string;
  senderRole: "passenger" | "driver" | "admin";
  text: string;
  createdAt: Date;
  readBy?: string[];
  attachments?: IAttachment[];
}

const MessageSchema = new Schema<IMessage>({
  id: { type: String, required: true, unique: true },
  conversationId: { type: String, required: true },
  senderId: { type: String, required: true },
  senderName: { type: String, required: true },
  senderRole: { type: String, enum: ["passenger", "driver", "admin"], required: true },
  text: { type: String, required: false, default: "" },
  createdAt: { type: Date, default: Date.now },
  readBy: { type: [String], default: [] },
  attachments: { type: [Schema.Types.Mixed] as any, default: [] }
});

let MongoMessageModel: any = null;
try {
  MongoMessageModel = mongoose.model<IMessage>("Message", MessageSchema);
} catch (e) {
  MongoMessageModel = mongoose.models.Message;
}

const memoryMessageStore: IMessage[] = [];

const isMongoActive = () => mongoose.connection.readyState === 1;

export const MessageDb = {
  async findByConversationId(conversationId: string): Promise<IMessage[]> {
    if (isMongoActive() && MongoMessageModel) {
      const docs = await MongoMessageModel.find({ conversationId }).sort({ createdAt: 1 });
      return docs.map((d: any) => d.toObject());
    }
    return memoryMessageStore
      .filter(m => m.conversationId === conversationId)
      .sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime());
  },

  async create(data: Partial<IMessage>): Promise<IMessage> {
    const id = data.id || "msg_" + Math.random().toString(36).substr(2, 9);
    const newMessage: IMessage = {
      id,
      conversationId: data.conversationId || "",
      senderId: data.senderId || "",
      senderName: data.senderName || "Unknown",
      senderRole: data.senderRole || "passenger",
      text: data.text || "",
      createdAt: new Date(),
      readBy: data.readBy || [data.senderId || ""],
      attachments: data.attachments || []
    };

    if (isMongoActive() && MongoMessageModel) {
      const doc = new MongoMessageModel(newMessage);
      await doc.save();
      return doc.toObject();
    }

    memoryMessageStore.push(newMessage);
    return { ...newMessage };
  },

  async markAsRead(conversationId: string, userId: string): Promise<void> {
    if (isMongoActive() && MongoMessageModel) {
      await MongoMessageModel.updateMany(
        { conversationId, readBy: { $ne: userId } },
        { $addToSet: { readBy: userId } }
      );
      return;
    }
    memoryMessageStore
      .filter(m => m.conversationId === conversationId)
      .forEach(m => {
        if (!m.readBy) m.readBy = [];
        if (!m.readBy.includes(userId)) {
          m.readBy.push(userId);
        }
      });
  }
};
