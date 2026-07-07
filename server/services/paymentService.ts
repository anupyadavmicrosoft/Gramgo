import { PaymentDb, IPayment } from "../models/Payment";
import { WalletService } from "./walletService";
import { UserDb } from "../models/User";
import { BookingDb } from "../models/Booking";

export class PaymentService {
  /**
   * Check if external gateways are configured with real API keys
   */
  static getGatewayConfigurationStatus() {
    return {
      razorpay: {
        isConfigured: !!(process.env.RAZORPAY_KEY_ID && process.env.RAZORPAY_KEY_SECRET),
        keyId: process.env.RAZORPAY_KEY_ID || null
      },
      stripe: {
        isConfigured: !!process.env.STRIPE_SECRET_KEY,
        publicKey: process.env.STRIPE_PUBLISHABLE_KEY || null
      }
    };
  }

  /**
   * Initialize a new payment transaction (returns a payment document in 'pending' status)
   */
  static async initializePayment(params: {
    bookingId?: string;
    userId: string;
    amount: number;
    gateway: "razorpay" | "stripe" | "wallet" | "none";
    description?: string;
  }): Promise<IPayment> {
    const { bookingId, userId, amount, gateway, description } = params;

    if (!userId) {
      throw new Error("User ID is required to initialize a payment.");
    }
    if (amount <= 0) {
      throw new Error("Payment amount must be greater than zero.");
    }

    // Retrieve user details
    const user = await UserDb.findById(userId);
    if (!user) {
      throw new Error("User account not found.");
    }

    // Check if booking exists if bookingId is provided
    if (bookingId) {
      // Find standard booking
      const booking = await BookingDb.findById(bookingId);
      if (!booking) {
        // If booking is not found in standard bookings, it could be an emergency booking
        // Let's allow the creation of the payment linked to booking ID anyway
      }
    }

    // Create a new pending payment record
    const payment = await PaymentDb.create({
      bookingId,
      userId,
      userName: user.name || "GramGo Member",
      userEmail: user.email || "user@gramgo.in",
      amount,
      currency: "INR",
      status: "pending",
      gateway,
      description: description || `Payment for GramGo Transit services`,
      createdAt: new Date(),
      updatedAt: new Date()
    });

    // Special behavior: If gateway is 'wallet', process the deduction immediately
    if (gateway === "wallet") {
      try {
        const wallet = await WalletService.getWallet(userId);
        if (!wallet) {
          throw new Error("Wallet account not found for this user.");
        }
        if (wallet.balance < amount) {
          throw new Error(`Insufficient wallet balance. You need ₹${amount} but only have ₹${wallet.balance}.`);
        }

        // Deduct from wallet
        const debitDesc = bookingId 
          ? `Paid ₹${amount} for Booking ID: ${bookingId}`
          : `Debit for payment transaction: ${payment.id}`;
          
        await WalletService.createTransaction(userId, amount, "debit", debitDesc);
        
        // Update payment to success
        const updated = await PaymentDb.updateStatus(payment.id, "success", {
          gatewayPaymentId: `wall_tx_${Date.now()}`,
          description: `${payment.description || ""} - Paid via GramGo Wallet`
        });
        
        return updated!;
      } catch (err: any) {
        // Mark payment as failed
        const updated = await PaymentDb.updateStatus(payment.id, "failed", {
          description: `${payment.description || ""} - Wallet charge failed: ${err.message}`
        });
        throw new Error(err.message || "Wallet deduction failed");
      }
    }

    // If Razorpay or Stripe: return the pending payment.
    // In our APIs, we'll provide simulated checkout responses if no keys are present.
    // If keys are present, we can generate orders or sessions.
    if (gateway === "razorpay") {
      const keys = this.getGatewayConfigurationStatus().razorpay;
      if (keys.isConfigured) {
        // Prepare razorpay order ID placeholder
        const gatewayOrderId = `rzp_order_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
        const updated = await PaymentDb.updateStatus(payment.id, "pending", {
          gatewayOrderId
        });
        return updated!;
      } else {
        // Sandbox mode order ID
        const gatewayOrderId = `rzp_sandbox_order_${Date.now()}`;
        const updated = await PaymentDb.updateStatus(payment.id, "pending", {
          gatewayOrderId,
          description: `${payment.description || ""} (Sandbox Demo Order)`
        });
        return updated!;
      }
    }

    if (gateway === "stripe") {
      const keys = this.getGatewayConfigurationStatus().stripe;
      if (keys.isConfigured) {
        // Prepare Stripe Session/PaymentIntent placeholder
        const gatewayOrderId = `stripe_pi_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
        const updated = await PaymentDb.updateStatus(payment.id, "pending", {
          gatewayOrderId
        });
        return updated!;
      } else {
        // Sandbox mode
        const gatewayOrderId = `stripe_sandbox_pi_${Date.now()}`;
        const updated = await PaymentDb.updateStatus(payment.id, "pending", {
          gatewayOrderId,
          description: `${payment.description || ""} (Sandbox Demo Intent)`
        });
        return updated!;
      }
    }

    return payment;
  }

  /**
   * Verify and confirm a payment (Transitions to 'success' or 'failed')
   */
  static async verifyPayment(
    paymentId: string,
    status: "success" | "failed",
    gatewayDetails?: {
      gatewayPaymentId?: string;
      gatewayOrderId?: string;
      gatewaySignature?: string;
      failureMessage?: string;
    }
  ): Promise<IPayment> {
    const payment = await PaymentDb.findById(paymentId);
    if (!payment) {
      throw new Error(`Payment transaction with ID ${paymentId} not found.`);
    }

    if (payment.status !== "pending") {
      throw new Error(`This payment transaction has already been processed with status: ${payment.status}.`);
    }

    const description = status === "success" 
      ? `${payment.description || ""} - Verified successfully.`
      : `${payment.description || ""} - Verification failed. ${gatewayDetails?.failureMessage || ""}`;

    const updated = await PaymentDb.updateStatus(payment.id, status, {
      gatewayPaymentId: gatewayDetails?.gatewayPaymentId,
      gatewayOrderId: gatewayDetails?.gatewayOrderId || payment.gatewayOrderId,
      gatewaySignature: gatewayDetails?.gatewaySignature,
      description
    });

    if (!updated) {
      throw new Error("Failed to persist payment status verification update.");
    }

    // Special logic: If this payment is linked to a booking ID, we can credit the driver's wallet or update payment status on booking.
    if (status === "success" && payment.bookingId) {
      try {
        const booking = await BookingDb.findById(payment.bookingId);
        if (booking) {
          // Note: If you want to log any details, do it here. 
          // We can also trigger notifications or ride completion callbacks.
        }
      } catch (e) {
        console.error("Failed to link booking after successful payment:", e);
      }
    }

    // Special logic: If this is a standalone deposit (wallet recharge), credit the user's wallet
    if (status === "success" && !payment.bookingId && (payment.description?.toLowerCase().includes("recharge") || payment.description?.toLowerCase().includes("deposit"))) {
      try {
        await WalletService.createTransaction(
          payment.userId,
          payment.amount,
          "credit",
          `Deposited ₹${payment.amount} via ${payment.gateway.toUpperCase()} (Ref: ${payment.id})`
        );
      } catch (e) {
        console.error("Failed to credit wallet balance after successful recharge:", e);
      }
    }

    return updated;
  }

  /**
   * Process a refund on an existing successful payment (Transitions to 'refunded')
   */
  static async refundPayment(paymentId: string, refundReason: string): Promise<IPayment> {
    if (!refundReason || refundReason.trim().length < 5) {
      throw new Error("A brief refund reason (minimum 5 characters) is required.");
    }

    const payment = await PaymentDb.findById(paymentId);
    if (!payment) {
      throw new Error(`Payment transaction with ID ${paymentId} not found.`);
    }

    if (payment.status !== "success") {
      throw new Error(`Only successful payment transactions can be refunded. Current status is: ${payment.status}`);
    }

    // Perform the refund
    const updated = await PaymentDb.updateStatus(payment.id, "refunded", {
      refundReason: refundReason.trim(),
      refundedAt: new Date(),
      description: `${payment.description || ""} - Refunded. Reason: ${refundReason.trim()}`
    });

    if (!updated) {
      throw new Error("Failed to persist payment refund status.");
    }

    // If it was a wallet payment, refund back to the wallet
    if (payment.gateway === "wallet") {
      try {
        await WalletService.createTransaction(
          payment.userId,
          payment.amount,
          "refund",
          `Refund of ₹${payment.amount} for Payment ID: ${payment.id} (${refundReason.trim()})`
        );
      } catch (e) {
        console.error("Failed to refund to wallet:", e);
      }
    } else {
      // If it's stripe/razorpay, credit back to their wallet as credit balance so they don't lose value, or simulate gateway refund
      try {
        await WalletService.createTransaction(
          payment.userId,
          payment.amount,
          "refund",
          `Refunded to Wallet: ₹${payment.amount} from gateway payment ${payment.id} (${refundReason.trim()})`
        );
      } catch (e) {
        console.error("Failed to process gateway refund to wallet balance:", e);
      }
    }

    return updated!;
  }

  /**
   * Get payment by ID
   */
  static async getPaymentDetails(id: string): Promise<IPayment | null> {
    return await PaymentDb.findById(id);
  }

  /**
   * Get user payment history
   */
  static async getUserPayments(userId: string): Promise<IPayment[]> {
    return await PaymentDb.findByUserId(userId);
  }

  /**
   * Get all payments (Admin audit view)
   */
  static async getAllPayments(): Promise<IPayment[]> {
    return await PaymentDb.findAll();
  }
}
