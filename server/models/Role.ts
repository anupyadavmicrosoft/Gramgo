import mongoose, { Schema } from "mongoose";

export interface IRole {
  id: string;
  name: string;
  description: string;
  permissions: string[]; // List of permission keys (e.g. "manage_roles", etc.)
  isSystem?: boolean; // System roles cannot be deleted
  createdAt: Date;
}

const RoleSchema = new Schema<IRole>({
  name: { type: String, required: true, unique: true },
  description: { type: String, required: true },
  permissions: { type: [String], default: [] },
  isSystem: { type: Boolean, default: false },
  createdAt: { type: Date, default: Date.now }
});

let MongoRoleModel: any = null;
try {
  MongoRoleModel = mongoose.model<IRole>("Role", RoleSchema);
} catch (e) {
  MongoRoleModel = mongoose.models.Role;
}

class MemoryRoleStore {
  private roles: IRole[] = [];

  constructor() {
    this.seedDefaultRoles();
  }

  private seedDefaultRoles() {
    const defaults: IRole[] = [
      {
        id: "role_1",
        name: "Super Admin",
        description: "Full administrative ownership of the GramGo system and role mappings.",
        permissions: ["Users", "Drivers", "Bookings", "Payments", "Wallet", "Reports", "Analytics", "CMS", "Settings", "Notifications", "Emergency"],
        isSystem: true,
        createdAt: new Date()
      },
      {
        id: "role_2",
        name: "Admin",
        description: "Panchayat Control Room operator with dispatch authority and citizen directory access.",
        permissions: ["Users", "Drivers", "Bookings", "Reports", "Analytics", "CMS", "Notifications", "Emergency"],
        isSystem: true,
        createdAt: new Date()
      },
      {
        id: "role_3",
        name: "Driver",
        description: "Volunteer first responder and emergency transport driver.",
        permissions: ["Emergency"],
        isSystem: true,
        createdAt: new Date()
      },
      {
        id: "role_4",
        name: "Passenger",
        description: "Local villager eligible to register emergency transit lifelines.",
        permissions: ["Emergency"],
        isSystem: true,
        createdAt: new Date()
      }
    ];
    this.roles = defaults;
  }

  async find(): Promise<IRole[]> {
    return this.roles.map(r => ({ ...r }));
  }

  async findById(id: string): Promise<IRole | null> {
    const found = this.roles.find(r => r.id === id);
    return found ? { ...found } : null;
  }

  async findOne(query: { name?: string }): Promise<IRole | null> {
    if (query.name) {
      const found = this.roles.find(r => r.name.toLowerCase() === query.name.toLowerCase());
      return found ? { ...found } : null;
    }
    return null;
  }

  async create(data: Partial<IRole>): Promise<IRole> {
    const newRole: IRole = {
      id: `role_${Date.now()}`,
      name: data.name || "",
      description: data.description || "",
      permissions: data.permissions || [],
      isSystem: data.isSystem || false,
      createdAt: new Date()
    };
    this.roles.push(newRole);
    return { ...newRole };
  }

  async findByIdAndUpdate(id: string, update: Partial<IRole>): Promise<IRole | null> {
    const idx = this.roles.findIndex(r => r.id === id);
    if (idx !== -1) {
      const current = this.roles[idx];
      // System roles can still update description and permissions, but not their names normally
      this.roles[idx] = {
        ...current,
        name: update.name !== undefined && !current.isSystem ? update.name : current.name,
        description: update.description !== undefined ? update.description : current.description,
        permissions: update.permissions !== undefined ? update.permissions : current.permissions
      };
      return { ...this.roles[idx] };
    }
    return null;
  }

  async findByIdAndDelete(id: string): Promise<boolean> {
    const idx = this.roles.findIndex(r => r.id === id);
    if (idx !== -1) {
      if (this.roles[idx].isSystem) {
        throw new Error("System protected roles cannot be deleted.");
      }
      this.roles.splice(idx, 1);
      return true;
    }
    return false;
  }
}

const memoryStore = new MemoryRoleStore();

const isMongoActive = () => mongoose.connection.readyState === 1;

export const RoleDb = {
  async find(): Promise<IRole[]> {
    if (isMongoActive() && MongoRoleModel) {
      return MongoRoleModel.find({});
    }
    return memoryStore.find();
  },

  async findById(id: string): Promise<IRole | null> {
    if (isMongoActive() && MongoRoleModel) {
      try {
        return await MongoRoleModel.findById(id);
      } catch (err) {
        return null;
      }
    }
    return memoryStore.findById(id);
  },

  async findOne(query: { name?: string }): Promise<IRole | null> {
    if (isMongoActive() && MongoRoleModel) {
      return MongoRoleModel.findOne(query);
    }
    return memoryStore.findOne(query);
  },

  async create(data: Partial<IRole>): Promise<IRole> {
    if (isMongoActive() && MongoRoleModel) {
      const doc = new MongoRoleModel(data);
      return await doc.save();
    }
    return memoryStore.create(data);
  },

  async findByIdAndUpdate(id: string, update: Partial<IRole>): Promise<IRole | null> {
    if (isMongoActive() && MongoRoleModel) {
      try {
        return await MongoRoleModel.findByIdAndUpdate(id, update, { new: true });
      } catch (err) {
        return null;
      }
    }
    return memoryStore.findByIdAndUpdate(id, update);
  },

  async findByIdAndDelete(id: string): Promise<boolean> {
    const role = await this.findById(id);
    if (role && role.isSystem) {
      throw new Error("System protected roles cannot be deleted.");
    }
    if (isMongoActive() && MongoRoleModel) {
      try {
        const result = await MongoRoleModel.deleteOne({ _id: id });
        return (result.deletedCount || 0) > 0;
      } catch (err) {
        return false;
      }
    }
    return memoryStore.findByIdAndDelete(id);
  }
};
