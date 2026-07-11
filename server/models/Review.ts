import mongoose, { Schema } from "mongoose";

export interface IReview {
  id: string;
  rideId: string;
  reviewerId: string;
  reviewerName: string;
  reviewerRole: "passenger" | "driver";
  revieweeId: string;
  revieweeName: string;
  revieweeRole: "passenger" | "driver";
  rating: number; // 1 to 5 stars
  comment?: string;
  createdAt: Date;
  edited?: boolean;
  likes?: string[];
  reported?: boolean;
  reportsCount?: number;
  reportedBy?: string[];
  reply?: {
    text: string;
    userId: string;
    userName: string;
    createdAt: Date;
  };
}

const ReviewSchema = new Schema<IReview>({
  id: { type: String, required: true, unique: true },
  rideId: { type: String, required: true },
  reviewerId: { type: String, required: true },
  reviewerName: { type: String, required: true },
  reviewerRole: { type: String, enum: ["passenger", "driver"], required: true },
  revieweeId: { type: String, required: true },
  revieweeName: { type: String, required: true },
  revieweeRole: { type: String, enum: ["passenger", "driver"], required: true },
  rating: { type: Number, required: true, min: 1, max: 5 },
  comment: { type: String, default: "" },
  createdAt: { type: Date, default: Date.now },
  edited: { type: Boolean, default: false },
  likes: { type: [String], default: [] },
  reported: { type: Boolean, default: false },
  reportsCount: { type: Number, default: 0 },
  reportedBy: { type: [String], default: [] },
  reply: {
    text: { type: String },
    userId: { type: String },
    userName: { type: String },
    createdAt: { type: Date }
  }
});

let MongoReviewModel: any = null;
try {
  MongoReviewModel = mongoose.model<IReview>("Review", ReviewSchema);
} catch (e) {
  MongoReviewModel = mongoose.models.Review;
}

const memoryReviewsStore: IReview[] = [
  {
    id: "rev_1",
    rideId: "book_seed_1",
    reviewerId: "usr_pass_1",
    reviewerName: "Rahul Sharma",
    reviewerRole: "passenger",
    revieweeId: "drv_1",
    revieweeName: "Ramesh Yadav",
    revieweeRole: "driver",
    rating: 5,
    comment: "Very polite driver, reached the destination safely and on time.",
    createdAt: new Date(Date.now() - 2 * 86400 * 1000)
  },
  {
    id: "rev_2",
    rideId: "book_seed_1",
    reviewerId: "drv_1",
    reviewerName: "Ramesh Yadav",
    reviewerRole: "driver",
    revieweeId: "usr_pass_1",
    revieweeName: "Rahul Sharma",
    revieweeRole: "passenger",
    rating: 5,
    comment: "Excellent passenger. Respectful and on time.",
    createdAt: new Date(Date.now() - 2 * 86400 * 1000)
  },
  {
    id: "rev_3",
    rideId: "book_seed_2",
    reviewerId: "usr_pass_2",
    reviewerName: "Priya Patel",
    reviewerRole: "passenger",
    revieweeId: "drv_2",
    revieweeName: "Amit Sharma",
    revieweeRole: "driver",
    rating: 4,
    comment: "Helpful with luggage, but ride was slightly delayed due to traffic.",
    createdAt: new Date(Date.now() - 1 * 86400 * 1000)
  },
  {
    id: "rev_4",
    rideId: "book_seed_3",
    reviewerId: "usr_pass_3",
    reviewerName: "Siddharth Verma",
    reviewerRole: "passenger",
    revieweeId: "drv_3",
    revieweeName: "Savita Devi",
    revieweeRole: "driver",
    rating: 5,
    comment: "Savita is amazing! Very smooth driving and comfortable E-Rickshaw.",
    createdAt: new Date(Date.now() - 12 * 3600 * 1000)
  }
];

const isMongoActive = () => mongoose.connection.readyState === 1;

export const ReviewDb = {
  async findAll(): Promise<IReview[]> {
    if (isMongoActive() && MongoReviewModel) {
      const docs = await MongoReviewModel.find({}).sort({ createdAt: -1 });
      return docs.map((d: any) => d.toObject());
    }
    return [...memoryReviewsStore].sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
  },

  async findByReviewee(revieweeId: string): Promise<IReview[]> {
    if (isMongoActive() && MongoReviewModel) {
      const docs = await MongoReviewModel.find({ revieweeId }).sort({ createdAt: -1 });
      return docs.map((d: any) => d.toObject());
    }
    return memoryReviewsStore
      .filter(r => r.revieweeId === revieweeId)
      .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
  },

  async findByReviewer(reviewerId: string): Promise<IReview[]> {
    if (isMongoActive() && MongoReviewModel) {
      const docs = await MongoReviewModel.find({ reviewerId }).sort({ createdAt: -1 });
      return docs.map((d: any) => d.toObject());
    }
    return memoryReviewsStore
      .filter(r => r.reviewerId === reviewerId)
      .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
  },

  async findByRide(rideId: string): Promise<IReview[]> {
    if (isMongoActive() && MongoReviewModel) {
      const docs = await MongoReviewModel.find({ rideId });
      return docs.map((d: any) => d.toObject());
    }
    return memoryReviewsStore.filter(r => r.rideId === rideId);
  },

  async findOne(query: Partial<IReview>): Promise<IReview | null> {
    if (isMongoActive() && MongoReviewModel) {
      const doc = await MongoReviewModel.findOne(query);
      return doc ? doc.toObject() : null;
    }
    const found = memoryReviewsStore.find(r => {
      return Object.entries(query).every(([key, val]) => (r as any)[key] === val);
    });
    return found ? { ...found } : null;
  },

  async create(review: Omit<IReview, "id" | "createdAt">): Promise<IReview> {
    const generatedId = `rev_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
    const newReview: IReview = {
      ...review,
      id: generatedId,
      createdAt: new Date()
    };
    if (isMongoActive() && MongoReviewModel) {
      await MongoReviewModel.create(newReview);
    } else {
      memoryReviewsStore.push(newReview);
    }
    return newReview;
  },

  async delete(id: string): Promise<boolean> {
    if (isMongoActive() && MongoReviewModel) {
      const res = await MongoReviewModel.deleteOne({ id });
      return res.deletedCount > 0;
    }
    const idx = memoryReviewsStore.findIndex(r => r.id === id);
    if (idx !== -1) {
      memoryReviewsStore.splice(idx, 1);
      return true;
    }
    return false;
  },

  async update(id: string, updates: Partial<IReview>): Promise<IReview | null> {
    if (isMongoActive() && MongoReviewModel) {
      const doc = await MongoReviewModel.findOneAndUpdate({ id }, { $set: updates }, { new: true });
      return doc ? doc.toObject() : null;
    }
    const idx = memoryReviewsStore.findIndex(r => r.id === id);
    if (idx !== -1) {
      memoryReviewsStore[idx] = {
        ...memoryReviewsStore[idx],
        ...updates
      };
      return { ...memoryReviewsStore[idx] };
    }
    return null;
  },

  async seedOnMongo() {
    if (isMongoActive() && MongoReviewModel) {
      try {
        const count = await MongoReviewModel.countDocuments();
        if (count === 0) {
          await MongoReviewModel.insertMany(memoryReviewsStore);
          console.log("[GramGo Review] Seeded reviews to MongoDB.");
        }
      } catch (err) {
        console.error("Failed to seed Review models on MongoDB:", err);
      }
    }
  }
};
