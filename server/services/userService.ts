import { UserDb, IUser } from "../models/User";

// Define Transaction interface for the wallet history
export interface WalletTransaction {
  id: string;
  userId: string;
  type: "credit" | "debit";
  amount: number;
  description: string;
  referenceId?: string;
  createdAt: number;
  status: "completed" | "pending" | "failed";
}

export class UserService {
  // Get all users paginated, filtered, and searched
  static async getUsers(params: {
    search?: string;
    role?: string;
    status?: string;
    page?: number;
    limit?: number;
    sortBy?: string;
    sortOrder?: string;
    district?: string;
    village?: string;
  }) {
    const search = params.search || "";
    const page = params.page || 1;
    const limit = params.limit || 10;
    
    const filter: any = {};
    if (params.role && params.role !== "all") {
      filter.role = params.role;
    }
    if (params.status && params.status !== "all") {
      filter.status = params.status;
    }
    if (params.district && params.district !== "all") {
      filter.district = params.district;
    }
    if (params.village && params.village !== "all") {
      filter.village = params.village;
    }

    const { users, total } = await UserDb.findWithPagination(
      filter, 
      search, 
      page, 
      limit, 
      params.sortBy, 
      params.sortOrder
    );

    // Exclude password hashes from response
    const safeUsers = users.map(({ passwordHash, ...rest }) => rest);

    return {
      users: safeUsers,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit)
    };
  }

  // Get specific user details
  static async getUserById(id: string) {
    const user = await UserDb.findById(id);
    if (!user) return null;
    
    const { passwordHash, ...safeUser } = user;
    return safeUser;
  }

  // Update user profile
  static async updateUser(id: string, updateData: Partial<IUser>) {
    const updated = await UserDb.updateProfile(id, updateData);
    if (!updated) return null;

    const { passwordHash, ...safeUser } = updated;
    return safeUser;
  }

  // Suspend user
  static async suspendUser(id: string) {
    const updated = await UserDb.updateProfile(id, { status: "suspended" });
    if (!updated) return null;

    const { passwordHash, ...safeUser } = updated;
    return safeUser;
  }

  // Activate user
  static async activateUser(id: string) {
    const updated = await UserDb.updateProfile(id, { status: "active" });
    if (!updated) return null;

    const { passwordHash, ...safeUser } = updated;
    return safeUser;
  }

  // Delete user
  static async deleteUser(id: string) {
    return await UserDb.delete(id);
  }

  // Get User Ride History from active ride collection
  static getUserRideHistory(userId: string, userRole: "passenger" | "driver" | "admin", allRides: any[]) {
    if (userRole === "passenger") {
      return allRides.filter(ride => ride.passengerId === userId || ride.patientPhone === userId);
    } else if (userRole === "driver") {
      return allRides.filter(ride => ride.driverId === userId);
    }
    return [];
  }

  // Generate complete interactive Panchayat subsidy wallet details/transactions dynamically for realism
  static getUserWalletHistory(user: IUser, userRides: any[]) {
    const transactions: WalletTransaction[] = [];
    let balance = 0;

    const creationTime = user.createdAt instanceof Date ? user.createdAt.getTime() : new Date(user.createdAt).getTime();

    if (user.role === "passenger") {
      // Patients get initial ₹2,500 health transport grant
      balance = 2500;
      transactions.push({
        id: `tx_init_${user.id}`,
        userId: user.id,
        type: "credit",
        amount: 2500,
        description: "Panchayat Maternity & Health Transport Subsidy Grant Allocated",
        createdAt: creationTime,
        status: "completed"
      });

      // Deduct ₹450 for each completed ride
      userRides.forEach((ride, index) => {
        if (ride.status === "completed") {
          const deduction = 450;
          balance -= deduction;
          transactions.push({
            id: `tx_ded_${ride.id}_${index}`,
            userId: user.id,
            type: "debit",
            amount: deduction,
            description: `GramGo Transport Subsidy Voucher Debited for Emergency Ride to ${ride.destinationChc || "CHC"}`,
            referenceId: ride.id,
            createdAt: ride.createdAt || (creationTime + (index + 1) * 24 * 3600 * 1000),
            status: "completed"
          });
        }
      });
    } else if (user.role === "driver") {
      // Drivers start with 0, and earn ₹500 per completed ride
      userRides.forEach((ride, index) => {
        if (ride.status === "completed") {
          const reward = 500;
          balance += reward;
          transactions.push({
            id: `tx_earn_${ride.id}_${index}`,
            userId: user.id,
            type: "credit",
            amount: reward,
            description: `Panchayat Emergency Disbursed Transport Incentive - Trip Code #${ride.id.substr(0,6).toUpperCase()}`,
            referenceId: ride.id,
            createdAt: ride.createdAt || (creationTime + (index + 1) * 24 * 3600 * 1000),
            status: "completed"
          });
        }
      });

      // Simulated payout if they accumulated a significant balance
      if (balance >= 1000) {
        const payout = 1000;
        balance -= payout;
        transactions.push({
          id: `tx_pay_${user.id}_payout`,
          userId: user.id,
          type: "debit",
          amount: payout,
          description: "Subsidy Incentive Disbursed to Registered Bank Account via DBT",
          createdAt: Date.now() - 2 * 3600 * 1000,
          status: "completed"
        });
      }
    }

    // Sort transactions by date descending
    transactions.sort((a, b) => b.createdAt - a.createdAt);

    return {
      userId: user.id,
      role: user.role,
      balance,
      currency: "INR",
      transactions
    };
  }
}
