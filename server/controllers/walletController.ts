import { Request, Response } from "express";
import { WalletService } from "../services/walletService";

export class WalletController {
  /**
   * GET /api/wallet
   * Retrieve the wallet of the authenticated user
   */
  static async getWallet(req: Request, res: Response) {
    try {
      const user = (req as any).user;
      if (!user) {
        return res.status(401).json({ error: "Access denied. Authentication required." });
      }

      const wallet = await WalletService.getOrCreateWallet(user.id);
      return res.json(wallet);
    } catch (error: any) {
      console.error("Error in WalletController.getWallet:", error);
      return res.status(500).json({ error: error.message || "Failed to retrieve wallet information." });
    }
  }

  /**
   * POST /api/wallet
   * Explicitly create or initialize a wallet for the authenticated user
   */
  static async createWallet(req: Request, res: Response) {
    try {
      const user = (req as any).user;
      if (!user) {
        return res.status(401).json({ error: "Access denied. Authentication required." });
      }

      const wallet = await WalletService.getOrCreateWallet(user.id);
      return res.status(201).json({
        message: "Wallet verified or created successfully.",
        wallet
      });
    } catch (error: any) {
      console.error("Error in WalletController.createWallet:", error);
      return res.status(500).json({ error: error.message || "Failed to initialize wallet." });
    }
  }

  /**
   * GET /api/wallet/transactions
   * Retrieve transaction history of the authenticated user (supporting pagination and filters)
   */
  static async getTransactions(req: Request, res: Response) {
    try {
      const user = (req as any).user;
      if (!user) {
        return res.status(401).json({ error: "Access denied. Authentication required." });
      }

      const { type, status, page, limit } = req.query;

      const pageNum = parseInt(page as string) || 1;
      const limitNum = parseInt(limit as string) || 10;

      const result = await WalletService.getTransactionHistory(
        user.id,
        {
          type: type as string,
          status: status as string
        },
        {
          page: pageNum,
          limit: limitNum
        }
      );

      return res.json(result);
    } catch (error: any) {
      console.error("Error in WalletController.getTransactions:", error);
      return res.status(500).json({ error: error.message || "Failed to retrieve transaction history." });
    }
  }

  /**
   * PUT /api/wallet/transaction
   * Perform a transaction (credit, debit, refund, adjustment) on the authenticated user's wallet
   */
  static async updateWallet(req: Request, res: Response) {
    try {
      const user = (req as any).user;
      if (!user) {
        return res.status(401).json({ error: "Access denied. Authentication required." });
      }

      const { amount, type, description } = req.body;

      if (amount === undefined || typeof amount !== "number" || amount <= 0) {
        return res.status(400).json({ error: "Valid positive numeric amount is required." });
      }

      const validTypes = ["credit", "debit", "refund", "adjustment"];
      if (!type || !validTypes.includes(type)) {
        return res.status(400).json({ error: "Transaction type must be 'credit', 'debit', 'refund', or 'adjustment'." });
      }

      const { wallet, transaction } = await WalletService.createTransaction(
        user.id,
        amount,
        type as any,
        description || `Simulated ${type}`
      );

      return res.json({
        success: true,
        message: `Wallet ${type} processed successfully.`,
        wallet,
        transaction
      });
    } catch (error: any) {
      console.error("Error in WalletController.updateWallet:", error);
      return res.status(400).json({ error: error.message || "Failed to process wallet transaction." });
    }
  }

  /**
   * POST /api/wallet/recharge
   * Handle wallet recharge with custom/preset amount and prepared payment gateway hooks
   */
  static async rechargeWallet(req: Request, res: Response) {
    try {
      const user = (req as any).user;
      if (!user) {
        return res.status(401).json({ error: "Access denied. Authentication required." });
      }

      const { amount, method, useLiveGateway } = req.body;

      if (amount === undefined || typeof amount !== "number" || amount <= 0) {
        return res.status(400).json({ error: "A valid positive recharge amount is required." });
      }

      // Recharge validation rules
      if (amount < 50) {
        return res.status(400).json({ error: "Minimum recharge amount is ₹50." });
      }
      if (amount > 50000) {
        return res.status(400).json({ error: "Maximum single recharge limit is ₹50,000." });
      }

      const wallet = await WalletService.getOrCreateWallet(user.id);
      if (wallet.status !== "active") {
        return res.status(400).json({ error: "Recharge blocked. This wallet is currently frozen or inactive." });
      }

      // Prepare payment integration hooks
      if (useLiveGateway) {
        // Stripe integration check
        if (method === "stripe") {
          const stripeKey = process.env.STRIPE_SECRET_KEY;
          if (!stripeKey) {
            return res.status(400).json({
              error: "CREDENTIALS_REQUIRED",
              gateway: "Stripe",
              message: "Stripe API key is not configured. Please add STRIPE_SECRET_KEY in the AI Studio Settings secrets panel to connect a live payment gateway."
            });
          }
          console.log(`[Stripe Hook] Initiating checkout for ₹${amount} with key: ${stripeKey.substring(0, 8)}...`);
        } else if (method === "razorpay") {
          const razorpayKey = process.env.RAZORPAY_KEY_ID;
          const razorpaySecret = process.env.RAZORPAY_KEY_SECRET;
          if (!razorpayKey || !razorpaySecret) {
            return res.status(400).json({
              error: "CREDENTIALS_REQUIRED",
              gateway: "Razorpay",
              message: "Razorpay credentials are not configured. Please add RAZORPAY_KEY_ID and RAZORPAY_KEY_SECRET in the AI Studio Settings secrets panel to connect live payment APIs."
            });
          }
          console.log(`[Razorpay Hook] Initiating order for ₹${amount} with key: ${razorpayKey.substring(0, 8)}...`);
        } else {
          return res.status(400).json({ error: "Unsupported payment method selected." });
        }
      }

      // For sandbox mode OR once live payment integration succeeds/is simulated, credit the wallet
      const description = useLiveGateway 
        ? `Wallet Recharge via ${method.toUpperCase()} Live Gateway`
        : `Instant Wallet Recharge (Simulated Gateway)`;

      const { wallet: updatedWallet, transaction } = await WalletService.createTransaction(
        user.id,
        amount,
        "credit",
        description
      );

      return res.json({
        success: true,
        message: `Successfully recharged ₹${amount.toLocaleString()} to your wallet.`,
        wallet: updatedWallet,
        transaction,
        gatewayMode: useLiveGateway ? "live" : "sandbox"
      });
    } catch (error: any) {
      console.error("Error in WalletController.rechargeWallet:", error);
      return res.status(500).json({ error: error.message || "Failed to process wallet recharge." });
    }
  }


  /**
   * GET /api/admin/wallets
   * Retrieve all wallets (Admin only)
   */
  static async getAllWalletsAdmin(req: Request, res: Response) {
    try {
      const user = (req as any).user;
      if (!user || user.role !== "admin") {
        return res.status(403).json({ error: "Access forbidden. Administrator privileges required." });
      }

      const wallets = await WalletService.getAllWallets();
      return res.json(wallets);
    } catch (error: any) {
      console.error("Error in WalletController.getAllWalletsAdmin:", error);
      return res.status(500).json({ error: error.message || "Failed to fetch wallets." });
    }
  }

  /**
   * GET /api/admin/wallets/:userId
   * Retrieve a specific user's wallet (Admin or authorized personnel)
   */
  static async getWalletByUserIdAdmin(req: Request, res: Response) {
    try {
      const { userId } = req.params;
      const wallet = await WalletService.getOrCreateWallet(userId);
      return res.json(wallet);
    } catch (error: any) {
      console.error("Error in WalletController.getWalletByUserIdAdmin:", error);
      return res.status(500).json({ error: error.message || "Failed to retrieve user's wallet." });
    }
  }

  /**
   * PUT /api/admin/wallets/:userId
   * Modify a specific user's wallet balance or status (Admin only)
   */
  static async updateWalletAdmin(req: Request, res: Response) {
    try {
      const user = (req as any).user;
      if (!user || user.role !== "admin") {
        return res.status(403).json({ error: "Access forbidden. Administrator privileges required." });
      }

      const { userId } = req.params;
      const { balance, status } = req.body;

      let wallet = await WalletService.getOrCreateWallet(userId);

      if (balance !== undefined) {
        if (typeof balance !== "number" || balance < 0) {
          return res.status(400).json({ error: "Balance must be a positive number." });
        }
        wallet.balance = balance;
      }

      if (status !== undefined) {
        if (status !== "active" && status !== "frozen" && status !== "closed") {
          return res.status(400).json({ error: "Invalid wallet status. Use 'active', 'frozen', or 'closed'." });
        }
        wallet.status = status;
      }

      wallet.updatedAt = new Date();
      const updatedWallet = await WalletService.updateWalletStatus(userId, wallet.status);
      if (balance !== undefined) {
        updatedWallet.balance = balance;
        await WalletService.updateWalletStatus(userId, wallet.status); // Save updated values
      }

      return res.json({
        success: true,
        message: "Wallet updated successfully by admin.",
        wallet: updatedWallet
      });
    } catch (error: any) {
      console.error("Error in WalletController.updateWalletAdmin:", error);
      return res.status(500).json({ error: error.message || "Failed to update wallet parameters." });
    }
  }
}
