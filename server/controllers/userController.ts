import { Request, Response } from "express";
import { UserService } from "../services/userService";
import { validateUserUpdate } from "../validation/userValidation";

export class UserController {
  // Fetch users list with search, filter, pagination
  static async getUsers(req: Request, res: Response) {
    try {
      const { search, role, status, page, limit, sortBy, sortOrder, district, village } = req.query;
      
      const queryParams = {
        search: search ? String(search) : undefined,
        role: role ? String(role) : undefined,
        status: status ? String(status) : undefined,
        page: page ? parseInt(String(page)) : undefined,
        limit: limit ? parseInt(String(limit)) : undefined,
        sortBy: sortBy ? String(sortBy) : undefined,
        sortOrder: sortOrder ? String(sortOrder) : undefined,
        district: district ? String(district) : undefined,
        village: village ? String(village) : undefined,
      };

      const result = await UserService.getUsers(queryParams);
      return res.json(result);
    } catch (error: any) {
      console.error("Error fetching users:", error);
      return res.status(500).json({ error: "Failed to fetch users database." });
    }
  }

  // Fetch a single user profile
  static async getUserById(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const user = await UserService.getUserById(id);
      if (!user) {
        return res.status(404).json({ error: "User profile not found." });
      }
      return res.json(user);
    } catch (error: any) {
      console.error("Error fetching user profile:", error);
      return res.status(500).json({ error: "Failed to retrieve user profile." });
    }
  }

  // Update specific user profile
  static async updateUser(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const { error, validatedData } = validateUserUpdate(req.body);
      
      if (error || !validatedData) {
        return res.status(400).json({ error });
      }

      // Check if user exists
      const existing = await UserService.getUserById(id);
      if (!existing) {
        return res.status(404).json({ error: "User not found." });
      }

      const updated = await UserService.updateUser(id, validatedData);
      
      // Sync with active drivers array if the role is a driver
      if (updated && updated.role === "driver") {
        if ((global as any).syncDriverFromDb) {
          (global as any).syncDriverFromDb(updated);
        }
      }

      return res.json({ success: true, user: updated, message: "User profile successfully updated." });
    } catch (error: any) {
      console.error("Error updating user profile:", error);
      return res.status(500).json({ error: "Failed to update user profile." });
    }
  }

  // Suspend a user
  static async suspendUser(req: Request, res: Response) {
    try {
      const { id } = req.params;
      
      // Prevent self-suspension
      const currentUser = (req as any).user;
      if (currentUser && currentUser.id === id) {
        return res.status(400).json({ error: "You cannot suspend your own admin account." });
      }

      const user = await UserService.getUserById(id);
      if (!user) {
        return res.status(404).json({ error: "User not found." });
      }

      const suspended = await UserService.suspendUser(id);
      if (suspended && suspended.role === "driver") {
        if ((global as any).syncDriverFromDb) {
          (global as any).syncDriverFromDb(suspended);
        }
      }

      return res.json({ success: true, user: suspended, message: "User status changed to Suspended." });
    } catch (error: any) {
      console.error("Error suspending user:", error);
      return res.status(500).json({ error: "Failed to suspend user account." });
    }
  }

  // Activate a user
  static async activateUser(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const user = await UserService.getUserById(id);
      if (!user) {
        return res.status(404).json({ error: "User not found." });
      }

      const activated = await UserService.activateUser(id);
      if (activated && activated.role === "driver") {
        if ((global as any).syncDriverFromDb) {
          (global as any).syncDriverFromDb(activated);
        }
      }

      return res.json({ success: true, user: activated, message: "User status activated successfully." });
    } catch (error: any) {
      console.error("Error activating user:", error);
      return res.status(500).json({ error: "Failed to activate user account." });
    }
  }

  // Delete a user
  static async deleteUser(req: Request, res: Response) {
    try {
      const { id } = req.params;

      // Prevent self-deletion
      const currentUser = (req as any).user;
      if (currentUser && currentUser.id === id) {
        return res.status(400).json({ error: "You cannot delete your own administrative account." });
      }

      const user = await UserService.getUserById(id);
      if (!user) {
        return res.status(404).json({ error: "User not found." });
      }

      const success = await UserService.deleteUser(id);
      if (!success) {
        return res.status(400).json({ error: "Failed to delete user." });
      }

      // Remove from active drivers array if necessary
      if (user.role === "driver") {
        if ((global as any).removeDriverFromActive) {
          (global as any).removeDriverFromActive(id);
        }
      }

      return res.json({ success: true, message: "User account deleted successfully." });
    } catch (error: any) {
      console.error("Error deleting user:", error);
      return res.status(500).json({ error: "Failed to delete user account." });
    }
  }

  // Get user ride history
  static async getUserRideHistory(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const user = await UserService.getUserById(id);
      if (!user) {
        return res.status(404).json({ error: "User not found." });
      }

      // Retrieve global emergencyRides array
      const allRides = (global as any).emergencyRides || [];
      const rideHistory = UserService.getUserRideHistory(id, user.role, allRides);

      return res.json({ success: true, rides: rideHistory });
    } catch (error: any) {
      console.error("Error fetching user ride history:", error);
      return res.status(500).json({ error: "Failed to fetch user ride history." });
    }
  }

  // Get user wallet history / subsidy details
  static async getUserWalletHistory(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const user = await UserService.getUserById(id);
      if (!user) {
        return res.status(404).json({ error: "User not found." });
      }

      const allRides = (global as any).emergencyRides || [];
      const userRides = UserService.getUserRideHistory(id, user.role, allRides);
      const walletDetails = UserService.getUserWalletHistory((user as any), userRides);

      return res.json({ success: true, wallet: walletDetails });
    } catch (error: any) {
      console.error("Error fetching user wallet details:", error);
      return res.status(500).json({ error: "Failed to fetch user wallet / subsidy ledger." });
    }
  }
}
