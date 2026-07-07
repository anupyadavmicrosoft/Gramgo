import { RefundRequestDb, IRefundRequest } from "../models/RefundRequest";
import { WalletService } from "./walletService";
import { UserDb } from "../models/User";
import { WalletTransactionDb } from "../models/WalletTransaction";

export class RefundService {
  /**
   * Create a new refund request for a passenger or driver
   */
  static async createRefundRequest(
    userId: string,
    amount: number,
    reason: string,
    transactionId?: string
  ): Promise<IRefundRequest> {
    if (!userId) {
      throw new Error("User identifier is required to make a refund request.");
    }
    if (amount <= 0) {
      throw new Error("Refund request amount must be a positive number.");
    }
    if (!reason || reason.trim().length < 10) {
      throw new Error("A comprehensive reason (minimum 10 characters) is required to file a refund.");
    }

    // Retrieve user details
    const user = await UserDb.findById(userId);
    if (!user) {
      throw new Error("User account not found.");
    }

    // Ensure wallet exists and is active
    const wallet = await WalletService.getOrCreateWallet(userId);
    if (wallet.status !== "active") {
      throw new Error("Your wallet is currently frozen or inactive. Refund requests cannot be submitted.");
    }

    // Optional validation: if transactionId is specified, check that it belongs to this user and is not already refunded
    if (transactionId) {
      const originalTx = await WalletTransactionDb.findById(transactionId);
      if (!originalTx) {
        throw new Error(`Referenced transaction with ID ${transactionId} was not found.`);
      }
      if (originalTx.userId !== userId) {
        throw new Error("This transaction record does not belong to your account.");
      }
      if (originalTx.type === "credit" && originalTx.description.includes("Recharge")) {
        // Allow recharges to be refunded or not? Usually we can refund anything, but let's make sure requested amount doesn't exceed transaction amount
      }
      if (amount > originalTx.amount) {
        throw new Error(`Refund amount cannot exceed the original transaction value of ₹${originalTx.amount}.`);
      }
    }

    // Create the refund request in pending state
    const refundRequest = await RefundRequestDb.create({
      userId,
      userName: user.name || "GramGo Member",
      userEmail: user.email || "user@gramgo.in",
      walletId: wallet.id,
      transactionId,
      amount,
      reason: reason.trim(),
      status: "pending",
      createdAt: new Date()
    });

    return refundRequest;
  }

  /**
   * Get refund request details by ID
   */
  static async getRefundRequestById(id: string): Promise<IRefundRequest | null> {
    return await RefundRequestDb.findById(id);
  }

  /**
   * Get all refund requests filed by a specific user
   */
  static async getUserRefundRequests(userId: string): Promise<IRefundRequest[]> {
    return await RefundRequestDb.findByUserId(userId);
  }

  /**
   * Get all refund requests in the entire platform (Admin dashboard view)
   */
  static async getAllRefundRequests(): Promise<IRefundRequest[]> {
    return await RefundRequestDb.findAll();
  }

  /**
   * Admin: Approve or Reject a refund request
   */
  static async processRefundDecision(
    refundId: string,
    decision: "approved" | "rejected",
    adminNotes: string
  ): Promise<IRefundRequest> {
    const refundRequest = await RefundRequestDb.findById(refundId);
    if (!refundRequest) {
      throw new Error(`Refund request with ID ${refundId} not found.`);
    }

    if (refundRequest.status !== "pending") {
      throw new Error(`This refund request has already been ${refundRequest.status}.`);
    }

    if (!adminNotes || adminNotes.trim().length < 5) {
      throw new Error("Please specify administrative review notes (minimum 5 characters) for transparency.");
    }

    if (decision === "approved") {
      // Create and apply a credit/refund transaction to the user's wallet
      const description = `Refund Approved: ${refundRequest.reason}. ${adminNotes.trim()}`;
      
      // Attempt transaction (will throw error if wallet is frozen)
      await WalletService.createTransaction(
        refundRequest.userId,
        refundRequest.amount,
        "refund",
        description
      );
    }

    // Update status in db
    const updatedRefund = await RefundRequestDb.updateStatus(refundId, decision, adminNotes.trim());
    if (!updatedRefund) {
      throw new Error("Failed to persist refund status update.");
    }

    return updatedRefund;
  }
}
