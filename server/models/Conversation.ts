import mongoose, { Schema } from "mongoose";

export interface IConversation {
  id: string;
  participants: string[]; // user IDs
  rideId?: string; // associated ride if any
  createdAt: Date;
  updatedAt: Date;
}

const ConversationSchema = new Schema<IConversation>({
  id: { type: String, required: true, unique: true },
  participants: { type: [String], required: true },
  rideId: { type: String },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
});

let MongoConversationModel: any = null;
try {
  MongoConversationModel = mongoose.model<IConversation>("Conversation", ConversationSchema);
} catch (e) {
  MongoConversationModel = mongoose.models.Conversation;
}

const memoryConversationStore: IConversation[] = [];

const isMongoActive = () => mongoose.connection.readyState === 1;

export const ConversationDb = {
  async findAll(): Promise<IConversation[]> {
    if (isMongoActive() && MongoConversationModel) {
      const docs = await MongoConversationModel.find({}).sort({ updatedAt: -1 });
      return docs.map((d: any) => d.toObject());
    }
    return [...memoryConversationStore].sort((a, b) => b.updatedAt.getTime() - a.updatedAt.getTime());
  },

  async findByParticipants(participants: string[]): Promise<IConversation | null> {
    if (isMongoActive() && MongoConversationModel) {
      // Find a conversation that contains exactly these participants
      const doc = await MongoConversationModel.findOne({
        participants: { $all: participants, $size: participants.length }
      });
      return doc ? doc.toObject() : null;
    }
    const conv = memoryConversationStore.find(c => 
      c.participants.length === participants.length &&
      participants.every(p => c.participants.includes(p))
    );
    return conv ? { ...conv } : null;
  },

  async findByRideId(rideId: string): Promise<IConversation | null> {
    if (isMongoActive() && MongoConversationModel) {
      const doc = await MongoConversationModel.findOne({ rideId });
      return doc ? doc.toObject() : null;
    }
    const conv = memoryConversationStore.find(c => c.rideId === rideId);
    return conv ? { ...conv } : null;
  },

  async findById(id: string): Promise<IConversation | null> {
    if (isMongoActive() && MongoConversationModel) {
      const doc = await MongoConversationModel.findOne({ id });
      return doc ? doc.toObject() : null;
    }
    const conv = memoryConversationStore.find(c => c.id === id);
    return conv ? { ...conv } : null;
  },

  async findByUserId(userId: string): Promise<IConversation[]> {
    if (isMongoActive() && MongoConversationModel) {
      const docs = await MongoConversationModel.find({
        participants: userId
      }).sort({ updatedAt: -1 });
      return docs.map((d: any) => d.toObject());
    }
    return memoryConversationStore
      .filter(c => c.participants.includes(userId))
      .sort((a, b) => b.updatedAt.getTime() - a.updatedAt.getTime());
  },

  async create(data: Partial<IConversation>): Promise<IConversation> {
    const id = data.id || "conv_" + Math.random().toString(36).substr(2, 9);
    const newConv: IConversation = {
      id,
      participants: data.participants || [],
      rideId: data.rideId,
      createdAt: new Date(),
      updatedAt: new Date()
    };

    if (isMongoActive() && MongoConversationModel) {
      const doc = new MongoConversationModel(newConv);
      await doc.save();
      return doc.toObject();
    }

    memoryConversationStore.push(newConv);
    return { ...newConv };
  },

  async updateTimestamp(id: string): Promise<void> {
    const now = new Date();
    if (isMongoActive() && MongoConversationModel) {
      await MongoConversationModel.updateOne({ id }, { $set: { updatedAt: now } });
      return;
    }
    const conv = memoryConversationStore.find(c => c.id === id);
    if (conv) {
      conv.updatedAt = now;
    }
  }
};
