import { Request, Response } from "express";
import { WalletDb } from "../models/Wallet";
import { WalletTransactionDb } from "../models/WalletTransaction";
import { WithdrawalRequestDb, IWithdrawalRequest } from "../models/WithdrawalRequest";
import { WalletService } from "../services/walletService";

export class WithdrawalController {
  /**
   * POST /api/wallet/withdraw
   * Create a withdrawal request (Driver only)
   */
  static async createWithdrawalRequest(req: Request, res: Response) {
    try {
      const user = (req as any).user;
      if (!user) {
        return res.status(401).json({ error: "Access denied. Authentication required." });
      }

      // Check if user is a driver or admin (allow admin for ease of testing)
      if (user.role !== "driver" && user.role !== "admin") {
        return res.status(403).json({ error: "Access forbidden. Only driver accounts can request withdrawals." });
      }

      const { amount, paymentMethod, paymentDetails } = req.body;

      if (!amount || typeof amount !== "number" || amount <= 0) {
        return res.status(400).json({ error: "A valid positive withdrawal amount is required." });
      }

      if (amount < 100) {
        return res.status(400).json({ error: "Minimum withdrawal amount is ₹100." });
      }

      if (amount > 50000) {
        return res.status(400).json({ error: "Maximum single withdrawal limit is ₹50,000." });
      }

      if (!paymentMethod || (paymentMethod !== "UPI" && paymentMethod !== "Bank Transfer")) {
        return res.status(400).json({ error: "Payment method must be 'UPI' or 'Bank Transfer'." });
      }

      // Validate payment details
      if (paymentMethod === "UPI" && (!paymentDetails || !paymentDetails.upiId)) {
        return res.status(400).json({ error: "UPI ID is required for UPI withdrawals." });
      }

      if (paymentMethod === "Bank Transfer" && (!paymentDetails || !paymentDetails.bankName || !paymentDetails.accountNumber || !paymentDetails.ifscCode)) {
        return res.status(400).json({ error: "Bank Name, Account Number, and IFSC Code are required for Bank Transfer withdrawals." });
      }

      // Fetch or create user's wallet
      const wallet = await WalletService.getOrCreateWallet(user.id);

      if (wallet.status !== "active") {
        return res.status(400).json({ error: "Withdrawal blocked. Your wallet is currently frozen or inactive." });
      }

      // Check available balance
      if (wallet.balance < amount) {
        return res.status(400).json({ 
          error: "INSUFFICIENT_FUNDS",
          message: `Insufficient balance. Available balance: ₹${wallet.balance.toLocaleString("en-IN")}, Requested: ₹${amount.toLocaleString("en-IN")}` 
        });
      }

      // Deduct amount from wallet balance
      wallet.balance -= amount;
      wallet.updatedAt = new Date();
      await WalletDb.save(wallet);

      // Create a pending wallet transaction log
      const txDescription = paymentMethod === "UPI"
        ? `Self-Withdrawal to UPI (${paymentDetails.upiId}) - Pending Settlement`
        : `Self-Withdrawal to Bank A/C (...${paymentDetails.accountNumber.slice(-4)}) - Pending Settlement`;

      const transaction = await WalletTransactionDb.create({
        walletId: wallet.id,
        userId: user.id,
        amount,
        type: "debit",
        status: "pending",
        description: txDescription,
        createdAt: new Date()
      });

      // Create the withdrawal request record
      const withdrawal = await WithdrawalRequestDb.create({
        userId: user.id,
        userName: user.name || "GramGo Driver",
        walletId: wallet.id,
        transactionId: transaction.id,
        amount,
        status: "pending",
        paymentMethod,
        paymentDetails: {
          upiId: paymentDetails.upiId,
          bankName: paymentDetails.bankName,
          accountNumber: paymentDetails.accountNumber,
          ifscCode: paymentDetails.ifscCode,
          beneficiaryName: paymentDetails.beneficiaryName || user.name
        },
        createdAt: new Date()
      });

      return res.status(201).json({
        success: true,
        message: "Your withdrawal request has been submitted and is pending settlement.",
        wallet,
        withdrawal
      });

    } catch (error: any) {
      console.error("Error in WithdrawalController.createWithdrawalRequest:", error);
      return res.status(500).json({ error: error.message || "Failed to submit withdrawal request." });
    }
  }

  /**
   * GET /api/wallet/withdraw
   * Get all withdrawal requests for the authenticated user (Driver)
   */
  static async getDriverWithdrawals(req: Request, res: Response) {
    try {
      const user = (req as any).user;
      if (!user) {
        return res.status(401).json({ error: "Access denied. Authentication required." });
      }

      const withdrawals = await WithdrawalRequestDb.findByUserId(user.id);
      return res.json(withdrawals);
    } catch (error: any) {
      console.error("Error in WithdrawalController.getDriverWithdrawals:", error);
      return res.status(500).json({ error: error.message || "Failed to retrieve withdrawal history." });
    }
  }

  /**
   * GET /api/wallet/withdraw/stats
   * Get driver earnings & settlement statistics
   */
  static async getDriverEarningsStats(req: Request, res: Response) {
    try {
      const user = (req as any).user;
      if (!user) {
        return res.status(401).json({ error: "Access denied. Authentication required." });
      }

      const wallet = await WalletService.getOrCreateWallet(user.id);
      const withdrawals = await WithdrawalRequestDb.findByUserId(user.id);
      const transactions = await WalletTransactionDb.findByUserId(user.id);

      // Calculations
      const availableBalance = wallet.balance;
      
      const pendingSettlement = withdrawals
        .filter(w => w.status === "pending")
        .reduce((sum, w) => sum + w.amount, 0);

      const completedSettlement = withdrawals
        .filter(w => w.status === "completed")
        .reduce((sum, w) => sum + w.amount, 0);

      // Total earnings is all credits ever received (Onboarding, patient transits, ride earnings etc.)
      const totalEarnings = transactions
        .filter(tx => tx.type === "credit" || tx.type === "refund")
        .reduce((sum, tx) => sum + tx.amount, 0);

      return res.json({
        availableBalance,
        pendingSettlement,
        completedSettlement,
        totalEarnings,
        currency: "INR"
      });

    } catch (error: any) {
      console.error("Error in WithdrawalController.getDriverEarningsStats:", error);
      return res.status(500).json({ error: error.message || "Failed to calculate earnings statistics." });
    }
  }

  /**
   * GET /api/wallet/admin/withdrawals
   * Retrieve all drivers' withdrawal requests (Admin only)
   */
  static async getAllWithdrawalsAdmin(req: Request, res: Response) {
    try {
      const user = (req as any).user;
      if (!user || user.role !== "admin") {
        return res.status(403).json({ error: "Access forbidden. Administrator privileges required." });
      }

      const withdrawals = await WithdrawalRequestDb.findAll();
      return res.json(withdrawals);
    } catch (error: any) {
      console.error("Error in WithdrawalController.getAllWithdrawalsAdmin:", error);
      return res.status(500).json({ error: error.message || "Failed to retrieve system-wide withdrawals." });
    }
  }

  /**
   * PUT /api/wallet/admin/withdrawals/:id
   * Approve/complete or reject/fail a driver's withdrawal request (Admin only)
   */
  static async processWithdrawalAdmin(req: Request, res: Response) {
    try {
      const user = (req as any).user;
      if (!user || user.role !== "admin") {
        return res.status(403).json({ error: "Access forbidden. Administrator privileges required." });
      }

      const { id } = req.params;
      const { status, adminNotes } = req.body;

      if (!status || (status !== "completed" && status !== "rejected")) {
        return res.status(400).json({ error: "A valid status of 'completed' or 'rejected' is required." });
      }

      const withdrawal = await WithdrawalRequestDb.findById(id);
      if (!withdrawal) {
        return res.status(404).json({ error: "Withdrawal request not found." });
      }

      if (withdrawal.status !== "pending") {
        return res.status(400).json({ error: "This withdrawal request has already been processed." });
      }

      let updatedWithdrawal;
      if (status === "completed") {
        // Mark withdrawal as completed
        updatedWithdrawal = await WithdrawalRequestDb.updateStatus(id, "completed", adminNotes || "Settlement disbursed successfully.");

        // Mark associated transaction as completed
        if (withdrawal.transactionId) {
          const finalTxDescription = withdrawal.paymentMethod === "UPI"
            ? `Self-Withdrawal to UPI (${withdrawal.paymentDetails.upiId}) - Completed`
            : `Self-Withdrawal to Bank A/C (...${withdrawal.paymentDetails.accountNumber?.slice(-4)}) - Completed`;

          await WalletTransactionDb.updateStatus(withdrawal.transactionId, "completed", finalTxDescription);
        }
      } else {
        // Mark withdrawal as rejected
        updatedWithdrawal = await WithdrawalRequestDb.updateStatus(id, "rejected", adminNotes || "Withdrawal request rejected.");

        // Mark associated transaction as failed/cancelled
        if (withdrawal.transactionId) {
          const finalTxDescription = `Self-Withdrawal request of ₹${withdrawal.amount} REJECTED - Funds Returned`;
          await WalletTransactionDb.updateStatus(withdrawal.transactionId, "failed", finalTxDescription);
        }

        // Return the funds back to the user's wallet
        const wallet = await WalletService.getOrCreateWallet(withdrawal.userId);
        wallet.balance += withdrawal.amount;
        wallet.updatedAt = new Date();
        await WalletDb.save(wallet);
      }

      return res.json({
        success: true,
        message: `Withdrawal request successfully ${status === "completed" ? "approved" : "rejected"}.`,
        withdrawal: updatedWithdrawal
      });

    } catch (error: any) {
      console.error("Error in WithdrawalController.processWithdrawalAdmin:", error);
      return res.status(500).json({ error: error.message || "Failed to process withdrawal request." });
    }
  }
}
