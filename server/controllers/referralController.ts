import { Request, Response } from "express";
import { ReferralDb, ReferralRewardDb, ReferralTransactionDb } from "../models/Referral";
import { UserDb } from "../models/User";
import { WalletService } from "../services/walletService";

export class ReferralController {
  /**
   * GET /api/referrals/dashboard
   * Retrieve referral statistics, code, history, and rewards
   */
  static async getReferralDashboard(req: Request, res: Response) {
    try {
      const user = (req as any).user;
      if (!user) {
        return res.status(401).json({ error: "Access denied. Authentication required." });
      }

      // 1. Get or Auto-create Referral Code for the User
      let referral = await ReferralDb.findByUserId(user.id);
      if (!referral) {
        const userProfile = await UserDb.findById(user.id);
        const userName = userProfile?.name || "User";
        const cleanedName = userName.replace(/[^a-zA-Z0-9]/g, "").toUpperCase().slice(0, 10);
        const randomNum = Math.floor(100 + Math.random() * 900);
        const defaultCode = `GRAMGO-${cleanedName}-${randomNum}`;

        referral = await ReferralDb.create({
          userId: user.id,
          code: defaultCode,
          status: "active",
          referralLimit: 15,
          timesUsed: 0,
          expiryDate: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000) // 1 year
        });
      }

      // 2. Fetch all referral transactions (referee signups)
      const transactions = await ReferralTransactionDb.findByReferrerId(user.id);

      // 3. Fetch all referral rewards
      const rewards = await ReferralRewardDb.findByUserId(user.id);

      // 4. Compute statistics
      const stats = {
        totalReferrals: transactions.length,
        timesUsed: referral.timesUsed,
        referralLimit: referral.referralLimit,
        remainingLimit: Math.max(0, referral.referralLimit - referral.timesUsed),
        pendingRewardsCount: rewards.filter(r => r.status === "pending").length,
        claimedRewardsCount: rewards.filter(r => r.status === "claimed").length,
        totalRewardsEarned: rewards.reduce((sum, r) => sum + r.amount, 0),
        pendingRewardsAmount: rewards.filter(r => r.status === "pending").reduce((sum, r) => sum + r.amount, 0),
        claimedRewardsAmount: rewards.filter(r => r.status === "claimed").reduce((sum, r) => sum + r.amount, 0)
      };

      return res.json({
        success: true,
        referral,
        stats,
        transactions,
        rewards
      });
    } catch (error: any) {
      console.error("Error in ReferralController.getReferralDashboard:", error);
      return res.status(500).json({ error: "Failed to load referral dashboard." });
    }
  }

  /**
   * POST /api/referrals/custom-code
   * Customize/Update user's referral code
   */
  static async customizeReferralCode(req: Request, res: Response) {
    try {
      const user = (req as any).user;
      if (!user) {
        return res.status(401).json({ error: "Access denied. Authentication required." });
      }

      const { code } = req.body;
      if (!code || typeof code !== "string" || code.trim().length < 4 || code.trim().length > 15) {
        return res.status(400).json({ error: "Referral code must be an alphanumeric string between 4 and 15 characters." });
      }

      const cleanCode = code.replace(/[^a-zA-Z0-9]/g, "").toUpperCase().trim();
      if (!cleanCode) {
        return res.status(400).json({ error: "Referral code must contain at least some alphanumeric characters." });
      }

      // Check if code is already taken
      const existing = await ReferralDb.findByCode(cleanCode);
      if (existing) {
        if (existing.userId === user.id) {
          return res.json({ success: true, message: "This is already your active referral code.", referral: existing });
        }
        return res.status(400).json({ error: "This referral code is already taken. Please try another combination." });
      }

      let referral = await ReferralDb.findByUserId(user.id);
      if (referral) {
        // Update existing
        referral.code = cleanCode;
        referral.updatedAt = new Date();
        // Save back
        await ReferralDb.updateStatus(user.id, "active"); // ensures it's active
        const updated = await ReferralDb.create(referral); // saves to db/store
        return res.json({
          success: true,
          message: "Referral code customized successfully!",
          referral: updated
        });
      } else {
        // Create new
        const created = await ReferralDb.create({
          userId: user.id,
          code: cleanCode,
          status: "active",
          referralLimit: 15,
          timesUsed: 0,
          expiryDate: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000)
        });
        return res.json({
          success: true,
          message: "Referral code created successfully!",
          referral: created
        });
      }
    } catch (error: any) {
      console.error("Error in ReferralController.customizeReferralCode:", error);
      return res.status(500).json({ error: "Failed to customize referral code." });
    }
  }

  /**
   * POST /api/referrals/validate
   * Validate a referral code before using it during signup
   */
  static async validateReferralCode(req: Request, res: Response) {
    try {
      const { code } = req.body;
      if (!code) {
        return res.status(400).json({ valid: false, error: "Please enter a referral code." });
      }

      const cleanCode = code.toUpperCase().trim();
      const referral = await ReferralDb.findByCode(cleanCode);
      if (!referral) {
        return res.status(404).json({ valid: false, error: "Referral code not found. Please double-check spelling." });
      }

      if (referral.status !== "active") {
        return res.status(400).json({ valid: false, error: "This referral code is currently inactive." });
      }

      if (referral.expiryDate && new Date(referral.expiryDate).getTime() < Date.now()) {
        return res.status(400).json({ valid: false, error: "This referral code has expired." });
      }

      if (referral.timesUsed >= referral.referralLimit) {
        return res.status(400).json({ valid: false, error: "This referral code has reached its maximum referral limit." });
      }

      // Check if logged-in user is attempting to validate their own code
      const loggedInUser = (req as any).user;
      if (loggedInUser && referral.userId === loggedInUser.id) {
        return res.status(400).json({ valid: false, error: "You cannot refer yourself." });
      }

      const referrerUser = await UserDb.findById(referral.userId);

      return res.json({
        valid: true,
        referrerName: referrerUser?.name || "A GramGo Hero",
        referral
      });
    } catch (error: any) {
      console.error("Error in ReferralController.validateReferralCode:", error);
      return res.status(500).json({ valid: false, error: "Failed to validate referral code." });
    }
  }

  /**
   * POST /api/referrals/claim/:rewardId
   * Claim a pending referral reward and transfer the credit directly into the wallet balance
   */
  static async claimReward(req: Request, res: Response) {
    try {
      const user = (req as any).user;
      if (!user) {
        return res.status(401).json({ error: "Access denied. Authentication required." });
      }

      const { rewardId } = req.params;
      const rewards = await ReferralRewardDb.findByUserId(user.id);
      const reward = rewards.find(r => r.id === rewardId);

      if (!reward) {
        return res.status(404).json({ error: "Referral reward not found." });
      }

      if (reward.status !== "pending") {
        return res.status(400).json({ error: `This reward has already been ${reward.status}.` });
      }

      // 1. Mark reward as claimed
      await ReferralRewardDb.claimReward(rewardId);

      // 2. Credit user's wallet balance using WalletService
      const walletResult = await WalletService.createTransaction(
        user.id,
        reward.amount,
        "credit",
        `Claimed Referral Reward: ${reward.description}`
      );

      return res.json({
        success: true,
        message: `Successfully claimed ₹${reward.amount}! Credits added to your GramGo Subsidy Wallet.`,
        reward: { ...reward, status: "claimed" },
        wallet: walletResult.wallet
      });
    } catch (error: any) {
      console.error("Error in ReferralController.claimReward:", error);
      return res.status(500).json({ error: error.message || "Failed to claim referral reward." });
    }
  }
}
