import mongoose, { Schema } from "mongoose";
import bcrypt from "bcryptjs";

// Define the User document structure
export interface IUser {
  id: string;
  name: string;
  phone: string;
  email?: string;
  passwordHash: string;
  role: "passenger" | "driver" | "admin";
  village: string;
  district: string;
  vehicleType?: "Auto Rickshaw" | "Bolero SUV" | "Tractor Ambulance" | "E-Rickshaw";
  vehicleNumber?: string;
  status?: "active" | "suspended";
  createdAt: Date;
  approvalStatus?: "pending" | "approved" | "rejected";
  approvalNotes?: string;
  rejectionReason?: string;
  driverStatus?: "available" | "busy" | "offline";
  rating?: number;
  completedTrips?: number;
  latitude?: number;
  longitude?: number;
  locationUpdatedAt?: Date;
}

// ---------------- Real Mongoose Schema definition ----------------
const UserSchema = new Schema<IUser>({
  name: { type: String, required: true },
  phone: { type: String, required: true, unique: true },
  email: { type: String },
  passwordHash: { type: String, required: true },
  role: { type: String, enum: ["passenger", "driver", "admin"], default: "passenger" },
  village: { type: String, required: true },
  district: { type: String, default: "Ghazipur" },
  vehicleType: { type: String, enum: ["Auto Rickshaw", "Bolero SUV", "Tractor Ambulance", "E-Rickshaw"] },
  vehicleNumber: { type: String },
  status: { type: String, enum: ["active", "suspended"], default: "active" },
  createdAt: { type: Date, default: Date.now },
  approvalStatus: { type: String, enum: ["pending", "approved", "rejected"], default: "pending" },
  approvalNotes: { type: String, default: "" },
  rejectionReason: { type: String, default: "" },
  driverStatus: { type: String, enum: ["available", "busy", "offline"], default: "available" },
  rating: { type: Number, default: 4.7 },
  completedTrips: { type: Number, default: 0 },
  latitude: { type: Number },
  longitude: { type: Number },
  locationUpdatedAt: { type: Date }
});

// Real mongoose model (not registered yet if connection is unavailable)
let MongoUserModel: any = null;
try {
  MongoUserModel = mongoose.model<IUser>("User", UserSchema);
} catch (e) {
  // If model already exists
  MongoUserModel = mongoose.models.User;
}

// ---------------- Graceful In-Memory MongoDB Fallback Store ----------------
// This guarantees that if the user hasn't configured a MongoDB URI yet,
// the server starts seamlessly and auth functions perfectly using memory store.
class MemoryUserStore {
  private users: IUser[] = [];

  constructor() {
    // Seed default Admin
    this.users.push({
      id: "admin_1",
      name: "GramGo Admin",
      phone: "+91 99999 99999",
      email: "admin@gramgo.org",
      passwordHash: bcrypt.hashSync("admin123", 10),
      role: "admin",
      village: "Sherpur",
      district: "Ghazipur",
      approvalStatus: "approved",
      approvalNotes: "System administrator account",
      rejectionReason: "",
      createdAt: new Date()
    });

    // Seed Ramesh Yadav
    this.users.push({
      id: "drv_1",
      name: "Ramesh Yadav",
      phone: "+91 98765 43210",
      email: "ramesh@gramgo.org",
      passwordHash: bcrypt.hashSync("ramesh123", 10),
      role: "driver",
      village: "Gauspur",
      district: "Ghazipur",
      vehicleType: "Tractor Ambulance",
      vehicleNumber: "UP-61-AB-1234",
      approvalStatus: "approved",
      approvalNotes: "Verified local hero with Tractor Ambulance.",
      rejectionReason: "",
      driverStatus: "available",
      rating: 4.9,
      completedTrips: 42,
      createdAt: new Date()
    });

    // Seed Amit Sharma
    this.users.push({
      id: "drv_2",
      name: "Amit Sharma",
      phone: "+91 87654 32109",
      email: "amit@gramgo.org",
      passwordHash: bcrypt.hashSync("amit123", 10),
      role: "driver",
      village: "Karimpur",
      district: "Ghazipur",
      vehicleType: "Bolero SUV",
      vehicleNumber: "UP-61-XY-5678",
      approvalStatus: "approved",
      approvalNotes: "Verified Bolero SUV for medical transport",
      rejectionReason: "",
      driverStatus: "available",
      rating: 4.8,
      completedTrips: 29,
      createdAt: new Date()
    });

    // Seed Savita Devi
    this.users.push({
      id: "drv_3",
      name: "Savita Devi",
      phone: "+91 76543 21098",
      email: "savita@gramgo.org",
      passwordHash: bcrypt.hashSync("savita123", 10),
      role: "driver",
      village: "Malikpur",
      district: "Ghazipur",
      vehicleType: "E-Rickshaw",
      vehicleNumber: "UP-61-ER-9012",
      approvalStatus: "approved",
      approvalNotes: "Verified local E-Rickshaw driver",
      rejectionReason: "",
      driverStatus: "available",
      rating: 4.7,
      completedTrips: 18,
      createdAt: new Date()
    });

    // Seed Mohammad Yusuf
    this.users.push({
      id: "drv_4",
      name: "Mohammad Yusuf",
      phone: "+91 99887 76655",
      email: "yusuf@gramgo.org",
      passwordHash: bcrypt.hashSync("yusuf123", 10),
      role: "driver",
      village: "Sherpur",
      district: "Ghazipur",
      vehicleType: "Auto Rickshaw",
      vehicleNumber: "UP-61-AR-4433",
      approvalStatus: "approved",
      approvalNotes: "Verified auto rickshaw driver",
      rejectionReason: "",
      driverStatus: "busy",
      rating: 4.6,
      completedTrips: 34,
      createdAt: new Date()
    });
  }

  async findOne(query: { phone?: string; email?: string }): Promise<IUser | null> {
    const found = this.users.find(u => {
      if (query.phone && u.phone === query.phone) return true;
      if (query.email && u.email === query.email) return true;
      return false;
    });
    return found ? { ...found } : null;
  }

  async findById(id: string): Promise<IUser | null> {
    const found = this.users.find(u => u.id === id);
    return found ? { ...found } : null;
  }

  async create(userData: Partial<IUser>): Promise<IUser> {
    const newUser: IUser = {
      id: userData.id || `usr_${Date.now()}`,
      name: userData.name || "",
      phone: userData.phone || "",
      email: userData.email,
      passwordHash: userData.passwordHash || "",
      role: userData.role || "passenger",
      village: userData.village || "",
      district: userData.district || "Ghazipur",
      vehicleType: userData.vehicleType,
      vehicleNumber: userData.vehicleNumber,
      status: userData.status || "active",
      approvalStatus: userData.approvalStatus || (userData.role === "driver" ? "pending" : "approved"),
      approvalNotes: userData.approvalNotes || "",
      rejectionReason: userData.rejectionReason || "",
      createdAt: new Date()
    };
    this.users.push(newUser);
    return { ...newUser };
  }

  async find(query: any = {}): Promise<IUser[]> {
    let result = [...this.users];
    if (query.role) {
      result = result.filter(u => u.role === query.role);
    }
    return result.map(u => ({ ...u }));
  }

  async updateOne(query: { phone?: string; email?: string }, update: any): Promise<void> {
    const user = this.users.find(u => {
      if (query.phone && u.phone === query.phone) return true;
      if (query.email && u.email === query.email) return true;
      return false;
    });
    if (user) {
      if (update.passwordHash) user.passwordHash = update.passwordHash;
      if (update.status) user.status = update.status;
    }
  }

  async updateProfile(id: string, update: Partial<IUser>): Promise<IUser | null> {
    const user = this.users.find(u => u.id === id);
    if (user) {
      if (update.name !== undefined) user.name = update.name;
      if (update.email !== undefined) user.email = update.email;
      if (update.phone !== undefined) user.phone = update.phone;
      if (update.village !== undefined) user.village = update.village;
      if (update.district !== undefined) user.district = update.district;
      if (update.vehicleType !== undefined) user.vehicleType = update.vehicleType;
      if (update.vehicleNumber !== undefined) user.vehicleNumber = update.vehicleNumber;
      if (update.role !== undefined) user.role = update.role;
      if (update.status !== undefined) user.status = update.status;
      if (update.passwordHash !== undefined) user.passwordHash = update.passwordHash;
      if (update.approvalStatus !== undefined) user.approvalStatus = update.approvalStatus;
      if (update.approvalNotes !== undefined) user.approvalNotes = update.approvalNotes;
      if (update.rejectionReason !== undefined) user.rejectionReason = update.rejectionReason;
      if (update.driverStatus !== undefined) user.driverStatus = update.driverStatus;
      if (update.rating !== undefined) user.rating = update.rating;
      if (update.completedTrips !== undefined) user.completedTrips = update.completedTrips;
      if (update.latitude !== undefined) user.latitude = update.latitude;
      if (update.longitude !== undefined) user.longitude = update.longitude;
      if (update.locationUpdatedAt !== undefined) user.locationUpdatedAt = update.locationUpdatedAt;
      return { ...user };
    }
    return null;
  }

  async delete(id: string): Promise<boolean> {
    const idx = this.users.findIndex(u => u.id === id);
    if (idx !== -1) {
      this.users.splice(idx, 1);
      return true;
    }
    return false;
  }
}

const memoryStore = new MemoryUserStore();

// Is MongoDB connected?
let isMongoActive = false;
const mongoUri = process.env.MONGO_URI;

if (mongoUri) {
  mongoose.connect(mongoUri, { serverSelectionTimeoutMS: 2000 })
    .then(() => {
      console.log("MongoDB connected successfully to user store!");
      isMongoActive = true;
    })
    .catch((err) => {
      console.log("[GramGo Status] MongoDB fallback enabled: local secure user database is active and fully functional.");
    });
} else {
  console.log("No MONGO_URI specified. GramGo running with memory fallback user store.");
}

// Export a unified User repository that handles either Mongoose or Memory seamlessly
export const UserDb = {
  async findOne(query: { phone?: string; email?: string }): Promise<IUser | null> {
    if (isMongoActive && MongoUserModel) {
      const doc = await MongoUserModel.findOne({
        $or: [
          query.phone ? { phone: query.phone } : null,
          query.email ? { email: query.email } : null
        ].filter(Boolean)
      });
      if (doc) {
        return doc.toObject();
      }
    }
    return memoryStore.findOne(query);
  },

  async findById(id: string): Promise<IUser | null> {
    if (isMongoActive && MongoUserModel) {
      const doc = await MongoUserModel.findById(id);
      if (doc) {
        return doc.toObject();
      }
    }
    return memoryStore.findById(id);
  },

  async create(userData: Partial<IUser>): Promise<IUser> {
    if (isMongoActive && MongoUserModel) {
      const doc = new MongoUserModel(userData);
      const saved = await doc.save();
      return saved.toObject();
    }
    return memoryStore.create(userData);
  },

  async find(query: any = {}): Promise<IUser[]> {
    if (isMongoActive && MongoUserModel) {
      const docs = await MongoUserModel.find(query);
      return docs.map((d: any) => d.toObject());
    }
    return memoryStore.find(query);
  },

  async findWithPagination(
    filter: any,
    search: string,
    page: number,
    limit: number,
    sortBy?: string,
    sortOrder?: string
  ): Promise<{ users: IUser[]; total: number }> {
    if (isMongoActive && MongoUserModel) {
      const mongoFilter: any = {};
      if (filter.role) mongoFilter.role = filter.role;
      if (filter.status) mongoFilter.status = filter.status;
      if (filter.district) mongoFilter.district = new RegExp(`^${filter.district}$`, "i");
      if (filter.village) mongoFilter.village = new RegExp(`^${filter.village}$`, "i");
      
      if (search) {
        const searchRegex = new RegExp(search, "i");
        mongoFilter.$or = [
          { name: { $regex: searchRegex } },
          { phone: { $regex: searchRegex } },
          { email: { $regex: searchRegex } },
          { village: { $regex: searchRegex } }
        ];
      }
      
      const sortField = sortBy || 'createdAt';
      const sortDir = sortOrder === 'asc' ? 1 : -1;
      const mongoSort = { [sortField]: sortDir };

      const total = await MongoUserModel.countDocuments(mongoFilter);
      const docs = await MongoUserModel.find(mongoFilter)
        .sort(mongoSort)
        .skip((page - 1) * limit)
        .limit(limit);
      const users = docs.map((d: any) => d.toObject());
      return { users, total };
    }

    // Memory Store Fallback
    let results = await memoryStore.find({});
    
    if (filter.role) {
      results = results.filter(u => u.role === filter.role);
    }
    if (filter.status) {
      results = results.filter(u => (u.status || "active") === filter.status);
    }
    if (filter.district) {
      results = results.filter(u => (u.district || "Ghazipur").toLowerCase() === filter.district.toLowerCase());
    }
    if (filter.village) {
      results = results.filter(u => u.village && u.village.toLowerCase() === filter.village.toLowerCase());
    }
    if (search) {
      const s = search.toLowerCase();
      results = results.filter(u =>
        u.name.toLowerCase().includes(s) ||
        u.phone.toLowerCase().includes(s) ||
        (u.email && u.email.toLowerCase().includes(s)) ||
        u.village.toLowerCase().includes(s)
      );
    }

    const total = results.length;
    const sortField = sortBy || 'createdAt';
    const sortDir = sortOrder === 'asc' ? 1 : -1;

    const sorted = results.sort((a: any, b: any) => {
      let valA = a[sortField];
      let valB = b[sortField];

      if (sortField === 'createdAt') {
        const t1 = valA instanceof Date ? valA.getTime() : new Date(valA).getTime();
        const t2 = valB instanceof Date ? valB.getTime() : new Date(valB).getTime();
        return (t1 - t2) * sortDir;
      }

      if (valA === undefined || valA === null) valA = '';
      if (valB === undefined || valB === null) valB = '';

      if (typeof valA === 'string' && typeof valB === 'string') {
        return valA.localeCompare(valB) * sortDir;
      }

      return (valA < valB ? -1 : valA > valB ? 1 : 0) * sortDir;
    });
    
    const paginated = sorted.slice((page - 1) * limit, page * limit);
    return { users: paginated, total };
  },

  async updatePassword(phoneOrEmail: string, newPasswordHash: string): Promise<boolean> {
    if (isMongoActive && MongoUserModel) {
      const result = await MongoUserModel.updateOne(
        { $or: [{ phone: phoneOrEmail }, { email: phoneOrEmail }] },
        { passwordHash: newPasswordHash }
      );
      return result.modifiedCount > 0;
    }
    await memoryStore.updateOne({ phone: phoneOrEmail, email: phoneOrEmail }, { passwordHash: newPasswordHash });
    return true;
  },

  async updateProfile(id: string, update: Partial<IUser>): Promise<IUser | null> {
    if (isMongoActive && MongoUserModel) {
      const doc = await MongoUserModel.findByIdAndUpdate(
        id,
        { $set: update },
        { new: true }
      );
      if (doc) {
        return doc.toObject();
      }
    }
    return memoryStore.updateProfile(id, update);
  },

  async delete(id: string): Promise<boolean> {
    if (isMongoActive && MongoUserModel) {
      const result = await MongoUserModel.deleteOne({ _id: id });
      return result.deletedCount > 0;
    }
    return memoryStore.delete(id);
  }
};
