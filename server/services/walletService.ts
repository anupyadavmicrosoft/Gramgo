import { WalletDb, IWallet } from "../models/Wallet";
import { UserDb } from "../models/User";
import { WalletTransactionDb, IWalletTransaction } from "../models/WalletTransaction";

export class WalletService {
  /**
   * Get an existing wallet or auto-create one with default values if it doesn't exist
   */
  static async getOrCreateWallet(userId: string): Promise<IWallet> {
    let wallet = await WalletDb.findByUserId(userId);
    if (!wallet) {
      // Find the user to verify if they exist
      const user = await UserDb.findById(userId);
      const initialBalance = user?.role === "driver" ? 1000 : 250;
      const walletId = `wal_${Date.now()}`;
      
      // Create new wallet
      wallet = await WalletDb.create({
        id: walletId,
        userId,
        balance: initialBalance,
        currency: "INR",
        status: "active",
        createdAt: new Date(),
        updatedAt: new Date()
      });

      // Record welcome transaction log
      await WalletTransactionDb.create({
        walletId,
        userId,
        amount: initialBalance,
        type: "credit",
        status: "completed",
        description: user?.role === "driver" 
          ? "Welcome Pilot Gas Subsidy Onboarding Bonus" 
          : "GramGo Passenger Security Onboarding Bonus",
        createdAt: new Date()
      });
    }
    return wallet;
  }

  /**
   * Get wallet for user
   */
  static async getWallet(userId: string): Promise<IWallet | null> {
    return await WalletDb.findByUserId(userId);
  }

  /**
   * Update balance with credit, debit, refund, or adjustment
   */
  static async createTransaction(
    userId: string,
    amount: number,
    type: "credit" | "debit" | "refund" | "adjustment",
    description: string
  ): Promise<{ wallet: IWallet; transaction: IWalletTransaction }> {
    if (amount <= 0) {
      throw new Error("Transaction amount must be greater than zero.");
    }

    const wallet = await this.getOrCreateWallet(userId);

    if (wallet.status !== "active") {
      throw new Error(`Transaction blocked. Wallet status is currently '${wallet.status}'.`);
    }

    // Process balance based on type
    if (type === "debit") {
      if (wallet.balance < amount) {
        throw new Error("Insufficient funds inside your wallet for this withdrawal.");
      }
      wallet.balance -= amount;
    } else if (type === "credit" || type === "refund") {
      wallet.balance += amount;
    } else if (type === "adjustment") {
      // Adjustments can be positive or negative or replace. For simplicity, let's treat adjustment as credit here.
      // If we want negative adjustments, let's allow it if we have separate input, but let's default adjustment to credit-based addition.
      wallet.balance += amount;
    }

    wallet.updatedAt = new Date();
    const updatedWallet = await WalletDb.save(wallet);

    // Create the transaction record
    const transaction = await WalletTransactionDb.create({
      walletId: wallet.id,
      userId,
      amount,
      type,
      status: "completed",
      description: description || `${type.charAt(0).toUpperCase() + type.slice(1)} transaction`,
      createdAt: new Date()
    });

    return { wallet: updatedWallet, transaction };
  }

  /**
   * Get user's transaction history with custom filters and pagination
   */
  static async getTransactionHistory(
    userId: string,
    filters: {
      type?: string;
      status?: string;
    } = {},
    pagination: {
      page: number;
      limit: number;
    } = { page: 1, limit: 10 }
  ): Promise<{
    transactions: IWalletTransaction[];
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  }> {
    // Auto-create wallet if not exist to ensure consistent initial welcome state log
    await this.getOrCreateWallet(userId);

    const allTx = await WalletTransactionDb.findByUserId(userId);

    // Apply filters
    let filtered = allTx;
    if (filters.type && filters.type !== "all") {
      filtered = filtered.filter(tx => tx.type === filters.type);
    }
    if (filters.status && filters.status !== "all") {
      filtered = filtered.filter(tx => tx.status === filters.status);
    }

    // Paginate
    const total = filtered.length;
    const { page, limit } = pagination;
    const startIndex = (page - 1) * limit;
    const endIndex = page * limit;
    const paginated = filtered.slice(startIndex, endIndex);

    return {
      transactions: paginated,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit) || 1
    };
  }

  /**
   * Update wallet status
   */
  static async updateWalletStatus(
    userId: string,
    status: "active" | "frozen" | "closed"
  ): Promise<IWallet> {
    const wallet = await this.getOrCreateWallet(userId);
    wallet.status = status;
    wallet.updatedAt = new Date();
    return await WalletDb.save(wallet);
  }

  /**
   * Retrieve all wallets
   */
  static async getAllWallets(): Promise<IWallet[]> {
    return await WalletDb.findAll();
  }
}
