import mongoose, { Schema } from "mongoose";

export interface IEmergencyRide {
  id: string;
  passengerId?: string;
  patientName: string;
  patientPhone: string;
  emergencyType: "Maternity" | "Accident/Trauma" | "Severe Illness" | "Cardiac" | "Other";
  priority: "critical" | "urgent" | "non-urgent";
  village: string;
  landmark: string;
  driverId?: string;
  driverName?: string;
  driverPhone?: string;
  vehicleType?: string;
  status: "requested" | "searching" | "driver_assigned" | "driver_arriving" | "reached_pickup" | "ride_started" | "completed" | "cancelled" | "Emergency Requested" | "Searching Driver" | "Driver Assigned" | "Driver Arriving" | "Passenger Picked" | "Hospital Reached" | "Completed" | "Cancelled";
  createdAt: number;
  destinationChc: string;
  isManual?: boolean;
  cancelledBy?: "passenger" | "driver" | "admin";
  cancelReason?: string;
  cancelledAt?: number;
  // Summary Fields
  completedAt?: number;
  distanceKm?: number;
  durationMin?: number;
  fareRupees?: number;
  paymentStatus?: "subsidized" | "pending" | "paid" | "free";
  passengerName?: string;
  passengerPhone?: string;
}

export interface IRideCancellationLog {
  id: string;
  rideId: string;
  patientName: string;
  emergencyType: string;
  cancelledBy: "passenger" | "driver" | "admin";
  cancelledById: string;
  cancelledByName: string;
  reason: string;
  createdAt: number;
}

const EmergencyRideSchema = new Schema<IEmergencyRide>({
  id: { type: String, required: true, unique: true },
  passengerId: { type: String },
  patientName: { type: String, required: true },
  patientPhone: { type: String, required: true },
  emergencyType: { type: String, required: true },
  priority: { type: String, required: true },
  village: { type: String, required: true },
  landmark: { type: String },
  driverId: { type: String },
  driverName: { type: String },
  driverPhone: { type: String },
  vehicleType: { type: String },
  status: { type: String, required: true },
  createdAt: { type: Number, required: true },
  destinationChc: { type: String, required: true },
  isManual: { type: Boolean },
  cancelledBy: { type: String },
  cancelReason: { type: String },
  cancelledAt: { type: Number },
  completedAt: { type: Number },
  distanceKm: { type: Number },
  durationMin: { type: Number },
  fareRupees: { type: Number },
  paymentStatus: { type: String },
  passengerName: { type: String },
  passengerPhone: { type: String }
});

const RideCancellationLogSchema = new Schema<IRideCancellationLog>({
  id: { type: String, required: true, unique: true },
  rideId: { type: String, required: true },
  patientName: { type: String, required: true },
  emergencyType: { type: String, required: true },
  cancelledBy: { type: String, required: true },
  cancelledById: { type: String, required: true },
  cancelledByName: { type: String, required: true },
  reason: { type: String, required: true },
  createdAt: { type: Number, required: true }
});

let MongoEmergencyRideModel: any = null;
try {
  MongoEmergencyRideModel = mongoose.model<IEmergencyRide>("EmergencyRide", EmergencyRideSchema);
} catch (e) {
  MongoEmergencyRideModel = mongoose.models.EmergencyRide;
}

let MongoRideCancellationModel: any = null;
try {
  MongoRideCancellationModel = mongoose.model<IRideCancellationLog>("RideCancellationLog", RideCancellationLogSchema);
} catch (e) {
  MongoRideCancellationModel = mongoose.models.RideCancellationLog;
}

const isMongoActive = () => mongoose.connection.readyState === 1;

// Seed data to memory store for visual completeness if not using DB
const memoryRidesStore: IEmergencyRide[] = [];
const memoryCancellationsStore: IRideCancellationLog[] = [];

export const EmergencyRideDb = {
  async save(ride: IEmergencyRide): Promise<IEmergencyRide> {
    if (isMongoActive() && MongoEmergencyRideModel) {
      const existing = await MongoEmergencyRideModel.findOne({ id: ride.id });
      if (existing) {
        await MongoEmergencyRideModel.updateOne({ id: ride.id }, { $set: ride });
        return ride;
      } else {
        await MongoEmergencyRideModel.create(ride);
        return ride;
      }
    }
    const idx = memoryRidesStore.findIndex(r => r.id === ride.id);
    if (idx !== -1) {
      memoryRidesStore[idx] = { ...ride };
    } else {
      memoryRidesStore.push({ ...ride });
    }
    return ride;
  },

  async bulkSave(rides: IEmergencyRide[]): Promise<void> {
    for (const r of rides) {
      await this.save(r);
    }
  },

  async findAll(): Promise<IEmergencyRide[]> {
    if (isMongoActive() && MongoEmergencyRideModel) {
      const docs = await MongoEmergencyRideModel.find({}).sort({ createdAt: -1 });
      return docs.map((d: any) => d.toObject());
    }
    return [...memoryRidesStore];
  }
};

export const RideCancellationDb = {
  async log(cancellation: IRideCancellationLog): Promise<IRideCancellationLog> {
    if (isMongoActive() && MongoRideCancellationModel) {
      await MongoRideCancellationModel.create(cancellation);
      return cancellation;
    }
    memoryCancellationsStore.push({ ...cancellation });
    return cancellation;
  },

  async findAll(): Promise<IRideCancellationLog[]> {
    if (isMongoActive() && MongoRideCancellationModel) {
      const docs = await MongoRideCancellationModel.find({}).sort({ createdAt: -1 });
      return docs.map((d: any) => d.toObject());
    }
    return [...memoryCancellationsStore];
  }
};
