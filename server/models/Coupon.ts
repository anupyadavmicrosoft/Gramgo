import mongoose, { Schema } from "mongoose";

// --- Coupon Campaign Model ---
export interface ICouponCampaign {
  id: string;
  name: string;
  description: string;
  startDate: Date;
  endDate: Date;
  budget: number;
  status: "active" | "inactive" | "draft";
  createdAt: Date;
  updatedAt: Date;
}

const CouponCampaignSchema = new Schema<ICouponCampaign>({
  id: { type: String, required: true, unique: true },
  name: { type: String, required: true },
  description: { type: String, required: true },
  startDate: { type: Date, required: true },
  endDate: { type: Date, required: true },
  budget: { type: Number, required: true },
  status: { type: String, enum: ["active", "inactive", "draft"], default: "draft" },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
});

let MongoCouponCampaignModel: any = null;
try {
  MongoCouponCampaignModel = mongoose.model<ICouponCampaign>("CouponCampaign", CouponCampaignSchema);
} catch (e) {
  MongoCouponCampaignModel = mongoose.models.CouponCampaign;
}

// --- Coupon Rules Model ---
export interface ICouponRules {
  id: string;
  allowedEmergencyTypes?: string[]; // e.g. ["Maternity", "Cardiac"]
  allowedVillages?: string[]; // e.g. ["Sherpur", "Gauspur"]
  allowedVehicleTypes?: string[]; // e.g. ["Tractor Ambulance", "E-Rickshaw"]
  userRideCountLimit?: number; // e.g. maximum usages of this coupon by a single user
}

const CouponRulesSchema = new Schema<ICouponRules>({
  id: { type: String, required: true, unique: true },
  allowedEmergencyTypes: { type: [String], default: [] },
  allowedVillages: { type: [String], default: [] },
  allowedVehicleTypes: { type: [String], default: [] },
  userRideCountLimit: { type: Number, default: 1 }
});

let MongoCouponRulesModel: any = null;
try {
  MongoCouponRulesModel = mongoose.model<ICouponRules>("CouponRules", CouponRulesSchema);
} catch (e) {
  MongoCouponRulesModel = mongoose.models.CouponRules;
}

// --- Coupon Model ---
export interface ICoupon {
  id: string;
  code: string;
  campaignId?: string;
  rulesId?: string;
  discountType: "percentage" | "fixed";
  discountValue: number; // Percentage (e.g. 20%) or Fixed (e.g. ₹50)
  expiryDate: Date;
  usageLimit: number; // Max times this coupon can be used across all users
  timesUsed: number;
  minimumRideAmount: number; // Minimum booking fare to apply this coupon
  maximumDiscount: number; // Cap for percentage discount
  status: "active" | "inactive" | "expired";
  createdAt: Date;
  updatedAt: Date;
}

const CouponSchema = new Schema<ICoupon>({
  id: { type: String, required: true, unique: true },
  code: { type: String, required: true, unique: true, uppercase: true, trim: true },
  campaignId: { type: String },
  rulesId: { type: String },
  discountType: { type: String, enum: ["percentage", "fixed"], required: true },
  discountValue: { type: Number, required: true },
  expiryDate: { type: Date, required: true },
  usageLimit: { type: Number, default: 100 },
  timesUsed: { type: Number, default: 0 },
  minimumRideAmount: { type: Number, default: 0 },
  maximumDiscount: { type: Number, default: 500 },
  status: { type: String, enum: ["active", "inactive", "expired"], default: "active" },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
});

let MongoCouponModel: any = null;
try {
  MongoCouponModel = mongoose.model<ICoupon>("Coupon", CouponSchema);
} catch (e) {
  MongoCouponModel = mongoose.models.Coupon;
}

// --- Coupon Usage Model ---
export interface ICouponUsage {
  id: string;
  couponId: string;
  couponCode: string;
  userId: string;
  rideId: string;
  discountApplied: number;
  usedAt: Date;
}

const CouponUsageSchema = new Schema<ICouponUsage>({
  id: { type: String, required: true, unique: true },
  couponId: { type: String, required: true },
  couponCode: { type: String, required: true, uppercase: true },
  userId: { type: String, required: true },
  rideId: { type: String, required: true },
  discountApplied: { type: Number, required: true },
  usedAt: { type: Date, default: Date.now }
});

let MongoCouponUsageModel: any = null;
try {
  MongoCouponUsageModel = mongoose.model<ICouponUsage>("CouponUsage", CouponUsageSchema);
} catch (e) {
  MongoCouponUsageModel = mongoose.models.CouponUsage;
}

const isMongoActive = () => mongoose.connection.readyState === 1;

// --- Memory Fallbacks and Seeds ---
const memoryCampaigns: ICouponCampaign[] = [
  {
    id: "camp_1",
    name: "Monsoon Health Subsidies",
    description: "Subsidizing medical transits during the critical monsoon rain seasons.",
    startDate: new Date("2026-07-01"),
    endDate: new Date("2026-08-31"),
    budget: 50000,
    status: "active",
    createdAt: new Date(),
    updatedAt: new Date()
  },
  {
    id: "camp_2",
    name: "ASHA Maternal Outreach",
    description: "Specialized zero-charge transport incentives for critical maternity referrals.",
    startDate: new Date("2026-01-01"),
    endDate: new Date("2026-12-31"),
    budget: 100000,
    status: "active",
    createdAt: new Date(),
    updatedAt: new Date()
  }
];

const memoryRules: ICouponRules[] = [
  {
    id: "rule_maternity_only",
    allowedEmergencyTypes: ["Maternity"],
    allowedVillages: [],
    allowedVehicleTypes: [],
    userRideCountLimit: 2
  },
  {
    id: "rule_monsoon_general",
    allowedEmergencyTypes: ["Cardiac", "Maternity", "Accident/Trauma", "Severe Illness", "Other"],
    allowedVillages: ["Sherpur", "Gauspur", "Karimpur", "Malikpur"],
    allowedVehicleTypes: ["Tractor Ambulance", "Bolero SUV", "E-Rickshaw", "Auto Rickshaw"],
    userRideCountLimit: 3
  }
];

const memoryCoupons: ICoupon[] = [
  {
    id: "coup_1",
    code: "HEALTH50",
    campaignId: "camp_1",
    rulesId: "rule_monsoon_general",
    discountType: "fixed",
    discountValue: 50,
    expiryDate: new Date("2026-12-31"),
    usageLimit: 100,
    timesUsed: 12,
    minimumRideAmount: 100,
    maximumDiscount: 50,
    status: "active",
    createdAt: new Date(),
    updatedAt: new Date()
  },
  {
    id: "coup_2",
    code: "MATERNITYFREE",
    campaignId: "camp_2",
    rulesId: "rule_maternity_only",
    discountType: "percentage",
    discountValue: 100,
    expiryDate: new Date("2026-12-31"),
    usageLimit: 50,
    timesUsed: 4,
    minimumRideAmount: 0,
    maximumDiscount: 1000,
    status: "active",
    createdAt: new Date(),
    updatedAt: new Date()
  },
  {
    id: "coup_3",
    code: "MONSOON20",
    campaignId: "camp_1",
    rulesId: "rule_monsoon_general",
    discountType: "percentage",
    discountValue: 20,
    expiryDate: new Date("2026-08-31"),
    usageLimit: 200,
    timesUsed: 25,
    minimumRideAmount: 150,
    maximumDiscount: 200,
    status: "active",
    createdAt: new Date(),
    updatedAt: new Date()
  },
  {
    id: "coup_4",
    code: "EXPIRED30",
    campaignId: "camp_1",
    discountType: "fixed",
    discountValue: 30,
    expiryDate: new Date("2026-06-30"),
    usageLimit: 50,
    timesUsed: 50,
    minimumRideAmount: 50,
    maximumDiscount: 30,
    status: "expired",
    createdAt: new Date(Date.now() - 60 * 86400 * 1000),
    updatedAt: new Date()
  },
  {
    id: "coup_5",
    code: "GRAMGO30",
    campaignId: "camp_1",
    discountType: "fixed",
    discountValue: 30,
    expiryDate: new Date("2026-12-31"),
    usageLimit: 500,
    timesUsed: 0,
    minimumRideAmount: 0,
    maximumDiscount: 30,
    status: "active",
    createdAt: new Date(),
    updatedAt: new Date()
  }
];

const memoryUsages: ICouponUsage[] = [
  {
    id: "usg_1",
    couponId: "coup_1",
    couponCode: "HEALTH50",
    userId: "usr_passenger",
    rideId: "ride_seed_1",
    discountApplied: 50,
    usedAt: new Date(Date.now() - 3 * 86400 * 1000)
  },
  {
    id: "usg_2",
    couponId: "coup_3",
    couponCode: "MONSOON20",
    userId: "usr_passenger",
    rideId: "ride_seed_2",
    discountApplied: 30,
    usedAt: new Date(Date.now() - 2 * 86400 * 1000)
  },
  {
    id: "usg_3",
    couponId: "coup_2",
    couponCode: "MATERNITYFREE",
    userId: "usr_passenger",
    rideId: "ride_seed_4",
    discountApplied: 380,
    usedAt: new Date(Date.now() - 1 * 86400 * 1000)
  }
];

// --- Coupon Database Operations Wrapper ---
export const CouponDb = {
  // Campaign Ops
  async getCampaigns(): Promise<ICouponCampaign[]> {
    if (isMongoActive() && MongoCouponCampaignModel) {
      return await MongoCouponCampaignModel.find({});
    }
    return [...memoryCampaigns];
  },

  async createCampaign(campaign: Omit<ICouponCampaign, "createdAt" | "updatedAt">): Promise<ICouponCampaign> {
    const newCamp: ICouponCampaign = {
      ...campaign,
      createdAt: new Date(),
      updatedAt: new Date()
    };
    if (isMongoActive() && MongoCouponCampaignModel) {
      await MongoCouponCampaignModel.create(newCamp);
    } else {
      memoryCampaigns.push(newCamp);
    }
    return newCamp;
  },

  async getCampaignById(id: string): Promise<ICouponCampaign | null> {
    if (isMongoActive() && MongoCouponCampaignModel) {
      const doc = await MongoCouponCampaignModel.findOne({ id });
      return doc ? doc.toObject() : null;
    }
    const found = memoryCampaigns.find(c => c.id === id);
    return found ? { ...found } : null;
  },

  async updateCampaign(id: string, updates: Partial<ICouponCampaign>): Promise<ICouponCampaign | null> {
    if (isMongoActive() && MongoCouponCampaignModel) {
      const doc = await MongoCouponCampaignModel.findOneAndUpdate({ id }, { ...updates, updatedAt: new Date() }, { new: true });
      return doc ? doc.toObject() : null;
    }
    const idx = memoryCampaigns.findIndex(c => c.id === id);
    if (idx !== -1) {
      memoryCampaigns[idx] = { ...memoryCampaigns[idx], ...updates, updatedAt: new Date() };
      return { ...memoryCampaigns[idx] };
    }
    return null;
  },

  async deleteCampaign(id: string): Promise<boolean> {
    if (isMongoActive() && MongoCouponCampaignModel) {
      const result = await MongoCouponCampaignModel.deleteOne({ id });
      return result.deletedCount > 0;
    }
    const idx = memoryCampaigns.findIndex(c => c.id === id);
    if (idx !== -1) {
      memoryCampaigns.splice(idx, 1);
      return true;
    }
    return false;
  },

  // Rules Ops
  async getRules(): Promise<ICouponRules[]> {
    if (isMongoActive() && MongoCouponRulesModel) {
      return await MongoCouponRulesModel.find({});
    }
    return [...memoryRules];
  },

  async createRules(rules: ICouponRules): Promise<ICouponRules> {
    if (isMongoActive() && MongoCouponRulesModel) {
      await MongoCouponRulesModel.create(rules);
    } else {
      memoryRules.push(rules);
    }
    return rules;
  },

  async getRulesById(id: string): Promise<ICouponRules | null> {
    if (isMongoActive() && MongoCouponRulesModel) {
      const doc = await MongoCouponRulesModel.findOne({ id });
      return doc ? doc.toObject() : null;
    }
    const found = memoryRules.find(r => r.id === id);
    return found ? { ...found } : null;
  },

  async updateRules(id: string, updates: Partial<ICouponRules>): Promise<ICouponRules | null> {
    if (isMongoActive() && MongoCouponRulesModel) {
      const doc = await MongoCouponRulesModel.findOneAndUpdate({ id }, updates, { new: true });
      return doc ? doc.toObject() : null;
    }
    const idx = memoryRules.findIndex(r => r.id === id);
    if (idx !== -1) {
      memoryRules[idx] = { ...memoryRules[idx], ...updates };
      return { ...memoryRules[idx] };
    }
    return null;
  },

  async deleteRules(id: string): Promise<boolean> {
    if (isMongoActive() && MongoCouponRulesModel) {
      const result = await MongoCouponRulesModel.deleteOne({ id });
      return result.deletedCount > 0;
    }
    const idx = memoryRules.findIndex(r => r.id === id);
    if (idx !== -1) {
      memoryRules.splice(idx, 1);
      return true;
    }
    return false;
  },

  // Coupon Ops
  async getCoupons(): Promise<ICoupon[]> {
    if (isMongoActive() && MongoCouponModel) {
      return await MongoCouponModel.find({});
    }
    // Automatically flag expired coupons
    const now = new Date();
    memoryCoupons.forEach(c => {
      if (new Date(c.expiryDate).getTime() < now.getTime()) {
        c.status = "expired";
      }
    });
    return [...memoryCoupons];
  },

  async createCoupon(coupon: Omit<ICoupon, "createdAt" | "updatedAt">): Promise<ICoupon> {
    const newCoup: ICoupon = {
      ...coupon,
      createdAt: new Date(),
      updatedAt: new Date()
    };
    if (isMongoActive() && MongoCouponModel) {
      await MongoCouponModel.create(newCoup);
    } else {
      memoryCoupons.push(newCoup);
    }
    return newCoup;
  },

  async getCouponById(id: string): Promise<ICoupon | null> {
    if (isMongoActive() && MongoCouponModel) {
      const doc = await MongoCouponModel.findOne({ id });
      return doc ? doc.toObject() : null;
    }
    const found = memoryCoupons.find(c => c.id === id);
    return found ? { ...found } : null;
  },

  async getCouponByCode(code: string): Promise<ICoupon | null> {
    const normalizedCode = code.toUpperCase().trim();
    if (isMongoActive() && MongoCouponModel) {
      const doc = await MongoCouponModel.findOne({ code: normalizedCode });
      return doc ? doc.toObject() : null;
    }
    const found = memoryCoupons.find(c => c.code.toUpperCase() === normalizedCode);
    return found ? { ...found } : null;
  },

  async updateCoupon(id: string, updates: Partial<ICoupon>): Promise<ICoupon | null> {
    if (isMongoActive() && MongoCouponModel) {
      const doc = await MongoCouponModel.findOneAndUpdate({ id }, { ...updates, updatedAt: new Date() }, { new: true });
      return doc ? doc.toObject() : null;
    }
    const idx = memoryCoupons.findIndex(c => c.id === id);
    if (idx !== -1) {
      memoryCoupons[idx] = { ...memoryCoupons[idx], ...updates, updatedAt: new Date() };
      return { ...memoryCoupons[idx] };
    }
    return null;
  },

  async incrementCouponUsage(code: string): Promise<boolean> {
    const normalizedCode = code.toUpperCase().trim();
    if (isMongoActive() && MongoCouponModel) {
      const doc = await MongoCouponModel.findOneAndUpdate(
        { code: normalizedCode },
        { $inc: { timesUsed: 1 } },
        { new: true }
      );
      return !!doc;
    }
    const idx = memoryCoupons.findIndex(c => c.code.toUpperCase() === normalizedCode);
    if (idx !== -1) {
      memoryCoupons[idx].timesUsed += 1;
      return true;
    }
    return false;
  },

  async deleteCoupon(id: string): Promise<boolean> {
    if (isMongoActive() && MongoCouponModel) {
      const result = await MongoCouponModel.deleteOne({ id });
      return result.deletedCount > 0;
    }
    const idx = memoryCoupons.findIndex(c => c.id === id);
    if (idx !== -1) {
      memoryCoupons.splice(idx, 1);
      return true;
    }
    return false;
  },

  // Usage Ops
  async getUsages(): Promise<ICouponUsage[]> {
    if (isMongoActive() && MongoCouponUsageModel) {
      return await MongoCouponUsageModel.find({});
    }
    return [...memoryUsages];
  },

  async createUsage(usage: Omit<ICouponUsage, "usedAt">): Promise<ICouponUsage> {
    const newUsage: ICouponUsage = {
      ...usage,
      usedAt: new Date()
    };
    if (isMongoActive() && MongoCouponUsageModel) {
      await MongoCouponUsageModel.create(newUsage);
    } else {
      memoryUsages.push(newUsage);
    }
    return newUsage;
  },

  async getUsagesByUserId(userId: string): Promise<ICouponUsage[]> {
    if (isMongoActive() && MongoCouponUsageModel) {
      return await MongoCouponUsageModel.find({ userId });
    }
    return memoryUsages.filter(u => u.userId === userId);
  },

  async getUsagesByCouponId(couponId: string): Promise<ICouponUsage[]> {
    if (isMongoActive() && MongoCouponUsageModel) {
      return await MongoCouponUsageModel.find({ couponId });
    }
    return memoryUsages.filter(u => u.couponId === couponId);
  }
};

// Also sync with DB collections initially if Mongo is ready
export async function seedCouponData() {
  if (isMongoActive()) {
    try {
      const campaignCount = await MongoCouponCampaignModel.countDocuments();
      if (campaignCount === 0) {
        await MongoCouponCampaignModel.insertMany(memoryCampaigns);
        console.log("[GramGo Coupon] Seeded campaigns to MongoDB.");
      }
      const rulesCount = await MongoCouponRulesModel.countDocuments();
      if (rulesCount === 0) {
        await MongoCouponRulesModel.insertMany(memoryRules);
        console.log("[GramGo Coupon] Seeded rules to MongoDB.");
      }
      const couponCount = await MongoCouponModel.countDocuments();
      if (couponCount === 0) {
        await MongoCouponModel.insertMany(memoryCoupons);
        console.log("[GramGo Coupon] Seeded coupons to MongoDB.");
      }
      const usageCount = await MongoCouponUsageModel.countDocuments();
      if (usageCount === 0) {
        await MongoCouponUsageModel.insertMany(memoryUsages);
        console.log("[GramGo Coupon] Seeded usages to MongoDB.");
      }
    } catch (err) {
      console.error("Failed to seed Coupon models on MongoDB:", err);
    }
  }
}
