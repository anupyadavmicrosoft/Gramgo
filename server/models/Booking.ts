import mongoose, { Schema } from "mongoose";

export interface IBooking {
  id: string;
  passengerId: string;
  passengerName: string;
  passengerPhone: string;
  pickupLocation: string;
  destination: string;
  rideType: "Bike" | "Auto" | "Car" | "Emergency";
  notes?: string;
  estimatedDistance: number;
  estimatedTime: number;
  estimatedFare: number;
  status: "pending" | "accepted" | "completed" | "cancelled";
  driverId?: string;
  driverName?: string;
  driverPhone?: string;
  couponCode?: string;
  discountApplied?: number;
  createdAt: Date;
}

const BookingSchema = new Schema<IBooking>({
  id: { type: String, required: true, unique: true },
  passengerId: { type: String, required: true },
  passengerName: { type: String, required: true },
  passengerPhone: { type: String, required: true },
  pickupLocation: { type: String, required: true },
  destination: { type: String, required: true },
  rideType: { type: String, enum: ["Bike", "Auto", "Car", "Emergency"], required: true },
  notes: { type: String },
  estimatedDistance: { type: Number, required: true },
  estimatedTime: { type: Number, required: true },
  estimatedFare: { type: Number, required: true },
  status: { type: String, enum: ["pending", "accepted", "completed", "cancelled"], default: "pending" },
  driverId: { type: String },
  driverName: { type: String },
  driverPhone: { type: String },
  couponCode: { type: String },
  discountApplied: { type: Number, default: 0 },
  createdAt: { type: Date, default: Date.now }
});

let MongoBookingModel: any = null;
try {
  MongoBookingModel = mongoose.model<IBooking>("Booking", BookingSchema);
} catch (e) {
  MongoBookingModel = mongoose.models.Booking;
}

class MemoryBookingStore {
  private bookings: IBooking[] = [];

  constructor() {
    // Let's seed some past bookings for the default passenger for visual completeness
    this.bookings.push({
      id: "book_seeded_1",
      passengerId: "passenger_1", // assuming standard passenger id
      passengerName: "Rajesh Kumar",
      passengerPhone: "+91 99999 88888",
      pickupLocation: "Sherpur Panchayat Bhawan",
      destination: "Mohammadabad Community Health Centre",
      rideType: "Auto",
      notes: "Bringing grandfather for medical checkup",
      estimatedDistance: 4.8,
      estimatedTime: 15,
      estimatedFare: 80,
      status: "completed",
      driverId: "drv_2",
      driverName: "Amit Sharma",
      driverPhone: "+91 87654 32109",
      createdAt: new Date(Date.now() - 36 * 60 * 60 * 1000) // 36 hours ago
    });

    this.bookings.push({
      id: "book_seeded_2",
      passengerId: "passenger_1",
      passengerName: "Rajesh Kumar",
      passengerPhone: "+91 99999 88888",
      pickupLocation: "Gauspur Market",
      destination: "Ghazipur Sadar Hospital",
      rideType: "Car",
      notes: "Please carry some change",
      estimatedDistance: 12.5,
      estimatedTime: 30,
      estimatedFare: 250,
      status: "completed",
      driverId: "drv_2",
      driverName: "Amit Sharma",
      driverPhone: "+91 87654 32109",
      createdAt: new Date(Date.now() - 12 * 60 * 60 * 1000) // 12 hours ago
    });
  }

  async findByPassenger(passengerId: string): Promise<IBooking[]> {
    return this.bookings.filter(b => b.passengerId === passengerId);
  }

  async findActiveByPassenger(passengerId: string): Promise<IBooking | null> {
    const active = this.bookings.find(b => b.passengerId === passengerId && ["pending", "accepted"].includes(b.status));
    return active || null;
  }

  async findById(id: string): Promise<IBooking | null> {
    const b = this.bookings.find(b => b.id === id);
    return b || null;
  }

  async create(data: Omit<IBooking, "id" | "createdAt">): Promise<IBooking> {
    const booking: IBooking = {
      ...data,
      id: `book_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      createdAt: new Date()
    };
    this.bookings.push(booking);
    return booking;
  }

  async updateStatus(id: string, status: "pending" | "accepted" | "completed" | "cancelled", updateFields?: Partial<IBooking>): Promise<IBooking | null> {
    const b = this.bookings.find(b => b.id === id);
    if (b) {
      b.status = status;
      if (updateFields) {
        Object.assign(b, updateFields);
      }
      return b;
    }
    return null;
  }

  async findAll(): Promise<IBooking[]> {
    return [...this.bookings];
  }
}

const memoryStore = new MemoryBookingStore();

const isMongoActive = () => mongoose.connection.readyState === 1;

export const BookingDb = {
  async findByPassenger(passengerId: string, page: number = 1, limit: number = 5): Promise<{ bookings: IBooking[]; total: number }> {
    if (isMongoActive() && MongoBookingModel) {
      const total = await MongoBookingModel.countDocuments({ passengerId });
      const bookings = await MongoBookingModel.find({ passengerId })
        .sort({ createdAt: -1 })
        .skip((page - 1) * limit)
        .limit(limit);
      return { bookings: bookings.map((b: any) => b.toObject()), total };
    }

    const passengerBookings = await memoryStore.findByPassenger(passengerId);
    passengerBookings.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
    const total = passengerBookings.length;
    const paginated = passengerBookings.slice((page - 1) * limit, page * limit);
    return { bookings: paginated, total };
  },

  async findActiveByPassenger(passengerId: string): Promise<IBooking | null> {
    if (isMongoActive() && MongoBookingModel) {
      const doc = await MongoBookingModel.findOne({
        passengerId,
        status: { $in: ["pending", "accepted"] }
      });
      return doc ? doc.toObject() : null;
    }
    return memoryStore.findActiveByPassenger(passengerId);
  },

  async findById(id: string): Promise<IBooking | null> {
    if (isMongoActive() && MongoBookingModel) {
      const doc = await MongoBookingModel.findOne({ id });
      return doc ? doc.toObject() : null;
    }
    return memoryStore.findById(id);
  },

  async create(data: Omit<IBooking, "id" | "createdAt">): Promise<IBooking> {
    if (isMongoActive() && MongoBookingModel) {
      const generatedId = `book_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
      const doc = await MongoBookingModel.create({
        ...data,
        id: generatedId,
        createdAt: new Date()
      });
      return doc.toObject();
    }
    return memoryStore.create(data);
  },

  async updateStatus(
    id: string, 
    status: "pending" | "accepted" | "completed" | "cancelled", 
    updateFields?: Partial<IBooking>
  ): Promise<IBooking | null> {
    if (isMongoActive() && MongoBookingModel) {
      const doc = await MongoBookingModel.findOneAndUpdate(
        { id },
        { $set: { status, ...updateFields } },
        { new: true }
      );
      return doc ? doc.toObject() : null;
    }
    return memoryStore.updateStatus(id, status, updateFields);
  },

  async getDashboardBookings(page: number = 1, limit: number = 10, search?: string, status?: string): Promise<{ bookings: IBooking[]; total: number }> {
    if (isMongoActive() && MongoBookingModel) {
      const query: any = {};
      if (status && status !== "all") {
        query.status = status;
      }
      if (search) {
        const regex = new RegExp(search, "i");
        query.$or = [
          { passengerName: { $regex: regex } },
          { pickupLocation: { $regex: regex } },
          { destination: { $regex: regex } },
          { rideType: { $regex: regex } }
        ];
      }

      const total = await MongoBookingModel.countDocuments(query);
      const docs = await MongoBookingModel.find(query)
        .sort({ createdAt: -1 })
        .skip((page - 1) * limit)
        .limit(limit);
      return { bookings: docs.map((d: any) => d.toObject()), total };
    }

    let results = await memoryStore.findAll();
    if (status && status !== "all") {
      results = results.filter(b => b.status === status);
    }
    if (search) {
      const s = search.toLowerCase();
      results = results.filter(b => 
        b.passengerName.toLowerCase().includes(s) ||
        b.pickupLocation.toLowerCase().includes(s) ||
        b.destination.toLowerCase().includes(s) ||
        b.rideType.toLowerCase().includes(s)
      );
    }

    results.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
    const total = results.length;
    const paginated = results.slice((page - 1) * limit, page * limit);
    return { bookings: paginated, total };
  }
};
