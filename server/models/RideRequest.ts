import mongoose, { Schema } from "mongoose";

export interface IRideRequest {
  id: string;
  rideId: string;
  driverId: string;
  passengerId?: string;
  patientName: string;
  patientPhone: string;
  emergencyType: string;
  priority: string;
  village: string;
  landmark?: string;
  destinationChc: string;
  status: "pending" | "accepted" | "rejected" | "expired";
  expiresAt: Date;
  createdAt: Date;
}

const RideRequestSchema = new Schema<IRideRequest>({
  id: { type: String, required: true, unique: true },
  rideId: { type: String, required: true },
  driverId: { type: String, required: true },
  passengerId: { type: String },
  patientName: { type: String, required: true },
  patientPhone: { type: String, required: true },
  emergencyType: { type: String, required: true },
  priority: { type: String, required: true },
  village: { type: String, required: true },
  landmark: { type: String },
  destinationChc: { type: String, required: true },
  status: { type: String, enum: ["pending", "accepted", "rejected", "expired"], default: "pending" },
  expiresAt: { type: Date, required: true },
  createdAt: { type: Date, default: Date.now }
});

let MongoRideRequestModel: any = null;
try {
  MongoRideRequestModel = mongoose.model<IRideRequest>("RideRequest", RideRequestSchema);
} catch (e) {
  MongoRideRequestModel = mongoose.models.RideRequest;
}

class MemoryRideRequestStore {
  private requests: IRideRequest[] = [];

  async findByDriver(driverId: string): Promise<IRideRequest[]> {
    // Auto-expire requests if current time is past expiresAt
    const now = new Date();
    this.requests.forEach(r => {
      if (r.status === "pending" && now > r.expiresAt) {
        r.status = "expired";
      }
    });
    return this.requests.filter(r => r.driverId === driverId);
  }

  async findById(id: string): Promise<IRideRequest | null> {
    const r = this.requests.find(req => req.id === id);
    if (r && r.status === "pending" && new Date() > r.expiresAt) {
      r.status = "expired";
    }
    return r || null;
  }

  async findByRideAndDriver(rideId: string, driverId: string): Promise<IRideRequest | null> {
    const r = this.requests.find(req => req.rideId === rideId && req.driverId === driverId);
    if (r && r.status === "pending" && new Date() > r.expiresAt) {
      r.status = "expired";
    }
    return r || null;
  }

  async create(data: Omit<IRideRequest, "id" | "createdAt">): Promise<IRideRequest> {
    const request: IRideRequest = {
      ...data,
      id: `req_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      createdAt: new Date()
    };
    this.requests.push(request);
    return request;
  }

  async updateStatus(id: string, status: "pending" | "accepted" | "rejected" | "expired"): Promise<IRideRequest | null> {
    const r = this.requests.find(req => req.id === id);
    if (r) {
      r.status = status;
      return r;
    }
    return null;
  }

  async findAll(): Promise<IRideRequest[]> {
    return [...this.requests];
  }
}

const memoryStore = new MemoryRideRequestStore();

const isMongoActive = () => mongoose.connection.readyState === 1;

export const RideRequestDb = {
  async findByDriver(driverId: string): Promise<IRideRequest[]> {
    if (isMongoActive() && MongoRideRequestModel) {
      const now = new Date();
      // Auto-expire in DB
      await MongoRideRequestModel.updateMany(
        { driverId, status: "pending", expiresAt: { $lt: now } },
        { $set: { status: "expired" } }
      );
      const docs = await MongoRideRequestModel.find({ driverId }).sort({ createdAt: -1 });
      return docs.map((d: any) => d.toObject());
    }

    return memoryStore.findByDriver(driverId);
  },

  async findById(id: string): Promise<IRideRequest | null> {
    if (isMongoActive() && MongoRideRequestModel) {
      const now = new Date();
      // Check and update if expired
      await MongoRideRequestModel.updateOne(
        { id, status: "pending", expiresAt: { $lt: now } },
        { $set: { status: "expired" } }
      );
      const doc = await MongoRideRequestModel.findOne({ id });
      return doc ? doc.toObject() : null;
    }
    return memoryStore.findById(id);
  },

  async findByRideAndDriver(rideId: string, driverId: string): Promise<IRideRequest | null> {
    if (isMongoActive() && MongoRideRequestModel) {
      const now = new Date();
      await MongoRideRequestModel.updateOne(
        { rideId, driverId, status: "pending", expiresAt: { $lt: now } },
        { $set: { status: "expired" } }
      );
      const doc = await MongoRideRequestModel.findOne({ rideId, driverId });
      return doc ? doc.toObject() : null;
    }
    return memoryStore.findByRideAndDriver(rideId, driverId);
  },

  async create(data: Omit<IRideRequest, "id" | "createdAt">): Promise<IRideRequest> {
    if (isMongoActive() && MongoRideRequestModel) {
      const generatedId = `req_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
      const doc = await MongoRideRequestModel.create({
        ...data,
        id: generatedId,
        createdAt: new Date()
      });
      return doc.toObject();
    }
    return memoryStore.create(data);
  },

  async updateStatus(id: string, status: "pending" | "accepted" | "rejected" | "expired"): Promise<IRideRequest | null> {
    if (isMongoActive() && MongoRideRequestModel) {
      const doc = await MongoRideRequestModel.findOneAndUpdate(
        { id },
        { $set: { status } },
        { new: true }
      );
      return doc ? doc.toObject() : null;
    }
    return memoryStore.updateStatus(id, status);
  }
};
