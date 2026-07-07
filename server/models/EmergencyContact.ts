import mongoose, { Schema } from "mongoose";

export interface IEmergencyContact {
  id: string;
  userId: string;
  name: string;
  relationship: string;
  phone: string;
  isPrimary: boolean;
  createdAt: number;
}

const EmergencyContactSchema = new Schema<IEmergencyContact>({
  id: { type: String, required: true, unique: true },
  userId: { type: String, required: true },
  name: { type: String, required: true },
  relationship: { type: String, required: true },
  phone: { type: String, required: true },
  isPrimary: { type: Boolean, default: false },
  createdAt: { type: Number, required: true }
});

let MongoEmergencyContactModel: any = null;
try {
  MongoEmergencyContactModel = mongoose.model<IEmergencyContact>("EmergencyContact", EmergencyContactSchema);
} catch (e) {
  MongoEmergencyContactModel = mongoose.models.EmergencyContact;
}

const isMongoActive = () => mongoose.connection.readyState === 1;

// Seed data to memory store for visual completeness if not using MongoDB
const memoryContactsStore: IEmergencyContact[] = [];

export const EmergencyContactDb = {
  async save(contact: IEmergencyContact): Promise<IEmergencyContact> {
    if (isMongoActive() && MongoEmergencyContactModel) {
      const existing = await MongoEmergencyContactModel.findOne({ id: contact.id });
      if (existing) {
        await MongoEmergencyContactModel.updateOne({ id: contact.id }, { $set: contact });
        return contact;
      } else {
        await MongoEmergencyContactModel.create(contact);
        return contact;
      }
    }
    const idx = memoryContactsStore.findIndex(c => c.id === contact.id);
    if (idx !== -1) {
      memoryContactsStore[idx] = { ...contact };
    } else {
      memoryContactsStore.push({ ...contact });
    }
    return contact;
  },

  async findByUserId(userId: string): Promise<IEmergencyContact[]> {
    if (isMongoActive() && MongoEmergencyContactModel) {
      const docs = await MongoEmergencyContactModel.find({ userId });
      return docs.map((d: any) => d.toObject());
    }
    return memoryContactsStore.filter(c => c.userId === userId);
  },

  async findById(id: string): Promise<IEmergencyContact | null> {
    if (isMongoActive() && MongoEmergencyContactModel) {
      const doc = await MongoEmergencyContactModel.findOne({ id });
      return doc ? doc.toObject() : null;
    }
    const found = memoryContactsStore.find(c => c.id === id);
    return found ? { ...found } : null;
  },

  async delete(id: string): Promise<boolean> {
    if (isMongoActive() && MongoEmergencyContactModel) {
      const res = await MongoEmergencyContactModel.deleteOne({ id });
      return res.deletedCount > 0;
    }
    const idx = memoryContactsStore.findIndex(c => c.id === id);
    if (idx !== -1) {
      memoryContactsStore.splice(idx, 1);
      return true;
    }
    return false;
  }
};
