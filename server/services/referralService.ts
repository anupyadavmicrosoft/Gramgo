import { ReferralDb, ReferralRewardDb, ReferralTransactionDb, IReferral, IReferralReward, IReferralTransaction } from "../models/Referral";
import { UserDb } from "../models/User";

export class ReferralService {
  /**
   * Register a new referral (called during user registration if a code is provided)
   */
  static async registerReferral(refereeId: string, refereeName: string, code: string): Promise<IReferralTransaction | null> {
    try {
      const trimmedCode = code.toUpperCase().trim();
      if (!trimmedCode) return null;

      // 1. Find referral config by code
      const referral = await ReferralDb.findByCode(trimmedCode);
      if (!referral) {
        console.log(`[Referral Service] Code not found: ${trimmedCode}`);
        return null;
      }

      // 2. Validate referral constraints
      if (referral.status !== "active") {
        console.log(`[Referral Service] Referral code is inactive: ${trimmedCode}`);
        return null;
      }

      if (referral.expiryDate && new Date(referral.expiryDate).getTime() < Date.now()) {
        console.log(`[Referral Service] Referral code has expired: ${trimmedCode}`);
        return null;
      }

      if (referral.timesUsed >= referral.referralLimit) {
        console.log(`[Referral Service] Referral limit reached for code: ${trimmedCode}`);
        return null;
      }

      if (referral.userId === refereeId) {
        console.log(`[Referral Service] Users cannot refer themselves: ${refereeId}`);
        return null;
      }

      // 3. Check if referee has already been referred
      const existingTx = await ReferralTransactionDb.findByRefereeId(refereeId);
      if (existingTx) {
        console.log(`[Referral Service] User ${refereeId} has already been referred.`);
        return null;
      }

      // 4. Create Referral Transaction
      const transaction = await ReferralTransactionDb.create({
        referrerId: referral.userId,
        refereeId,
        refereeName,
        referralCode: trimmedCode,
        status: "registered"
      });

      // 5. Increment referral usage
      await ReferralDb.incrementTimesUsed(trimmedCode);

      // 6. Create Referee registration bonus reward (₹50 claimable)
      await ReferralRewardDb.create({
        userId: refereeId,
        type: "referee",
        amount: 50,
        status: "pending",
        description: `Welcome bonus for signing up using referral code ${trimmedCode}`
      });

      // 7. Create Referrer signup reward (₹50 claimable)
      const referrerUser = await UserDb.findById(referral.userId);
      const referrerName = referrerUser?.name || "Someone";
      await ReferralRewardDb.create({
        userId: referral.userId,
        type: "referrer",
        amount: 50,
        status: "pending",
        description: `Referral signup bonus for inviting ${refereeName}`
      });

      console.log(`[Referral Service] Successfully processed referral: Referrer ${referral.userId} referred Referee ${refereeId} (${refereeName})`);
      return transaction;
    } catch (err) {
      console.error("[Referral Service] Error registering referral:", err);
      return null;
    }
  }

  /**
   * Process first-ride completion referral rewards
   */
  static async processRideCompletion(refereeId: string): Promise<boolean> {
    try {
      // 1. Find if this passenger was referred
      const transaction = await ReferralTransactionDb.findByRefereeId(refereeId);
      if (!transaction) return false;

      // 2. Only reward first ride once (when status is "registered")
      if (transaction.status !== "registered") {
        return false;
      }

      // 3. Update transaction status
      await ReferralTransactionDb.updateStatus(transaction.id, "completed_first_ride");

      // 4. Issue first-ride bonus to Referrer (₹100 claimable)
      await ReferralRewardDb.create({
        userId: transaction.referrerId,
        type: "referrer",
        amount: 100,
        status: "pending",
        description: `First ride completion bonus for referred friend: ${transaction.refereeName}`
      });

      // 5. Update transaction status to fully rewarded
      await ReferralTransactionDb.updateStatus(transaction.id, "rewarded");

      console.log(`[Referral Service] Issued first ride referral rewards: Referrer ${transaction.referrerId} gets ₹100 for referee ${refereeId}`);
      return true;
    } catch (err) {
      console.error("[Referral Service] Error processing ride completion referral:", err);
      return false;
    }
  }
}
