import mongoose, { Schema } from "mongoose";

export interface IPermission {
  id: string;
  name: string;
  description: string;
  module: string;
  createdAt: Date;
}

const PermissionSchema = new Schema<IPermission>({
  name: { type: String, required: true, unique: true },
  description: { type: String, required: true },
  module: { type: String, required: true },
  createdAt: { type: Date, default: Date.now }
});

let MongoPermissionModel: any = null;
try {
  MongoPermissionModel = mongoose.model<IPermission>("Permission", PermissionSchema);
} catch (e) {
  MongoPermissionModel = mongoose.models.Permission;
}

class MemoryPermissionStore {
  private permissions: IPermission[] = [];

  constructor() {
    this.seedDefaultPermissions();
  }

  private seedDefaultPermissions() {
    const defaults: IPermission[] = [
      {
        id: "perm_users",
        name: "Users",
        description: "Access and manage user accounts, roles, and profiles.",
        module: "User Management",
        createdAt: new Date()
      },
      {
        id: "perm_drivers",
        name: "Drivers",
        description: "Approve, audit, and coordinate volunteer driver documentation and status.",
        module: "Driver Directory",
        createdAt: new Date()
      },
      {
        id: "perm_bookings",
        name: "Bookings",
        description: "Schedule, coordinate, and review emergency transit booking records.",
        module: "Booking Control",
        createdAt: new Date()
      },
      {
        id: "perm_payments",
        name: "Payments",
        description: "Process travel subsidies, review transit fuel grants, and monitor disbursements.",
        module: "Financial Ledger",
        createdAt: new Date()
      },
      {
        id: "perm_wallet",
        name: "Wallet",
        description: "Manage virtual community wallets and allocate credit limits to active villages.",
        module: "Financial Ledger",
        createdAt: new Date()
      },
      {
        id: "perm_reports",
        name: "Reports",
        description: "Generate and export travel summaries, performance audits, and compliance logs.",
        module: "System Reporting",
        createdAt: new Date()
      },
      {
        id: "perm_analytics",
        name: "Analytics",
        description: "Monitor real-time dispatch dashboards, heatmaps, and response statistics.",
        module: "Control Room",
        createdAt: new Date()
      },
      {
        id: "perm_cms",
        name: "CMS",
        description: "Manage content updates, localized tips, and health facility registers.",
        module: "Content Management",
        createdAt: new Date()
      },
      {
        id: "perm_settings",
        name: "Settings",
        description: "Configure system limits, notification templates, and api endpoints.",
        module: "Panchayat Settings",
        createdAt: new Date()
      },
      {
        id: "perm_notifications",
        name: "Notifications",
        description: "Send out critical system updates, SMS/Push dispatches, and emergency alerts.",
        module: "Communications Hub",
        createdAt: new Date()
      },
      {
        id: "perm_emergency",
        name: "Emergency",
        description: "Trigger live lifeline dispatches and assign active volunteer drivers.",
        module: "Lifeline System",
        createdAt: new Date()
      }
    ];
    this.permissions = defaults;
  }

  async find(): Promise<IPermission[]> {
    return this.permissions.map(p => ({ ...p }));
  }

  async findById(id: string): Promise<IPermission | null> {
    const found = this.permissions.find(p => p.id === id);
    return found ? { ...found } : null;
  }

  async findOne(query: { name?: string }): Promise<IPermission | null> {
    if (query.name) {
      const found = this.permissions.find(p => p.name === query.name);
      return found ? { ...found } : null;
    }
    return null;
  }

  async create(data: Partial<IPermission>): Promise<IPermission> {
    const newPerm: IPermission = {
      id: `perm_${Date.now()}`,
      name: data.name || "",
      description: data.description || "",
      module: data.module || "General",
      createdAt: new Date()
    };
    this.permissions.push(newPerm);
    return { ...newPerm };
  }

  async findByIdAndUpdate(id: string, update: Partial<IPermission>): Promise<IPermission | null> {
    const idx = this.permissions.findIndex(p => p.id === id);
    if (idx !== -1) {
      const current = this.permissions[idx];
      this.permissions[idx] = {
        ...current,
        name: update.name !== undefined ? update.name : current.name,
        description: update.description !== undefined ? update.description : current.description,
        module: update.module !== undefined ? update.module : current.module
      };
      return { ...this.permissions[idx] };
    }
    return null;
  }

  async findByIdAndDelete(id: string): Promise<boolean> {
    const idx = this.permissions.findIndex(p => p.id === id);
    if (idx !== -1) {
      this.permissions.splice(idx, 1);
      return true;
    }
    return false;
  }
}

const memoryStore = new MemoryPermissionStore();

// Reuse MongoDB connectivity state
const isMongoActive = () => mongoose.connection.readyState === 1;

export const PermissionDb = {
  async find(): Promise<IPermission[]> {
    if (isMongoActive() && MongoPermissionModel) {
      return MongoPermissionModel.find({});
    }
    return memoryStore.find();
  },

  async findById(id: string): Promise<IPermission | null> {
    if (isMongoActive() && MongoPermissionModel) {
      try {
        return await MongoPermissionModel.findById(id);
      } catch (err) {
        return null;
      }
    }
    return memoryStore.findById(id);
  },

  async findOne(query: { name?: string }): Promise<IPermission | null> {
    if (isMongoActive() && MongoPermissionModel) {
      return MongoPermissionModel.findOne(query);
    }
    return memoryStore.findOne(query);
  },

  async create(data: Partial<IPermission>): Promise<IPermission> {
    if (isMongoActive() && MongoPermissionModel) {
      const doc = new MongoPermissionModel(data);
      return await doc.save();
    }
    return memoryStore.create(data);
  },

  async findByIdAndUpdate(id: string, update: Partial<IPermission>): Promise<IPermission | null> {
    if (isMongoActive() && MongoPermissionModel) {
      try {
        return await MongoPermissionModel.findByIdAndUpdate(id, update, { new: true });
      } catch (err) {
        return null;
      }
    }
    return memoryStore.findByIdAndUpdate(id, update);
  },

  async findByIdAndDelete(id: string): Promise<boolean> {
    if (isMongoActive() && MongoPermissionModel) {
      try {
        const result = await MongoPermissionModel.deleteOne({ _id: id });
        return (result.deletedCount || 0) > 0;
      } catch (err) {
        return false;
      }
    }
    return memoryStore.findByIdAndDelete(id);
  }
};
