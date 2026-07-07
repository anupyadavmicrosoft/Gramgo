import { Request, Response } from "express";
import { PaymentService } from "../services/paymentService";

export class PaymentController {
  /**
   * POST /api/payments/initialize
   * Initialize standard or wallet transit payment
   */
  static async initializePayment(req: Request, res: Response) {
    try {
      const user = (req as any).user;
      if (!user) {
        return res.status(401).json({ error: "Access denied. Authentication required." });
      }

      const { bookingId, amount, gateway, description } = req.body;

      if (!amount || isNaN(amount) || Number(amount) <= 0) {
        return res.status(400).json({ error: "A valid amount greater than zero is required to pay." });
      }

      if (!gateway || !["razorpay", "stripe", "wallet", "none"].includes(gateway)) {
        return res.status(400).json({ error: "A valid payment gateway selection (razorpay, stripe, wallet) is required." });
      }

      const payment = await PaymentService.initializePayment({
        bookingId,
        userId: user.id,
        amount: Number(amount),
        gateway,
        description
      });

      return res.status(201).json({
        success: true,
        message: "Payment initialized successfully.",
        payment,
        gatewayConfig: PaymentService.getGatewayConfigurationStatus()[gateway === "wallet" ? "razorpay" : (gateway as "stripe" | "razorpay")] || null
      });
    } catch (error: any) {
      console.error("Error in PaymentController.initializePayment:", error);
      return res.status(500).json({ error: error.message || "Failed to initialize payment." });
    }
  }

  /**
   * POST /api/payments/verify
   * Verify and complete payment transaction
   */
  static async verifyPayment(req: Request, res: Response) {
    try {
      const user = (req as any).user;
      if (!user) {
        return res.status(401).json({ error: "Access denied. Authentication required." });
      }

      const { paymentId, status, gatewayDetails } = req.body;

      if (!paymentId) {
        return res.status(400).json({ error: "Payment transaction ID is required for verification." });
      }

      if (!status || !["success", "failed"].includes(status)) {
        return res.status(400).json({ error: "A valid transaction status (success, failed) is required." });
      }

      const payment = await PaymentService.verifyPayment(paymentId, status, gatewayDetails);

      return res.json({
        success: true,
        message: status === "success" ? "Payment completed and verified." : "Payment marked as failed.",
        payment
      });
    } catch (error: any) {
      console.error("Error in PaymentController.verifyPayment:", error);
      return res.status(500).json({ error: error.message || "Failed to verify payment." });
    }
  }

  /**
   * POST /api/payments/:paymentId/refund
   * Refund an existing successful payment (Requires user owner or admin role)
   */
  static async refundPayment(req: Request, res: Response) {
    try {
      const user = (req as any).user;
      if (!user) {
        return res.status(401).json({ error: "Access denied. Authentication required." });
      }

      const { paymentId } = req.params;
      const { refundReason } = req.body;

      const payment = await PaymentService.getPaymentDetails(paymentId);
      if (!payment) {
        return res.status(404).json({ error: "Payment transaction not found." });
      }

      // Check permissions: only the payee user or an administrator can trigger refunds
      const isAdmin = user.role === "admin" || user.isAdmin === true;
      if (payment.userId !== user.id && !isAdmin) {
        return res.status(403).json({ error: "Access forbidden. You can only refund payments initialized by yourself or as an admin." });
      }

      const updatedPayment = await PaymentService.refundPayment(paymentId, refundReason || "Requested refund");

      return res.json({
        success: true,
        message: "Payment refunded successfully.",
        payment: updatedPayment
      });
    } catch (error: any) {
      console.error("Error in PaymentController.refundPayment:", error);
      return res.status(500).json({ error: error.message || "Failed to process refund." });
    }
  }

  /**
   * GET /api/payments/user
   * Retrieve payment history of the authenticated user
   */
  static async getUserPayments(req: Request, res: Response) {
    try {
      const user = (req as any).user;
      if (!user) {
        return res.status(401).json({ error: "Access denied. Authentication required." });
      }

      const payments = await PaymentService.getUserPayments(user.id);
      return res.json(payments);
    } catch (error: any) {
      console.error("Error in PaymentController.getUserPayments:", error);
      return res.status(500).json({ error: error.message || "Failed to retrieve payment history." });
    }
  }

  /**
   * GET /api/payments/gateways
   * Retrieve system configuration settings for gateways
   */
  static async getGatewaysConfig(req: Request, res: Response) {
    try {
      const config = PaymentService.getGatewayConfigurationStatus();
      return res.json(config);
    } catch (error: any) {
      console.error("Error in PaymentController.getGatewaysConfig:", error);
      return res.status(500).json({ error: "Failed to fetch gateway configs." });
    }
  }

  /**
   * GET /api/payments/admin/all
   * Retrieve all payments in the system (Admin only)
   */
  static async getAllPaymentsAdmin(req: Request, res: Response) {
    try {
      const user = (req as any).user;
      if (!user || (user.role !== "admin" && user.isAdmin !== true)) {
        return res.status(403).json({ error: "Access denied. Administrator privileges required." });
      }

      const payments = await PaymentService.getAllPayments();
      return res.json(payments);
    } catch (error: any) {
      console.error("Error in PaymentController.getAllPaymentsAdmin:", error);
      return res.status(500).json({ error: error.message || "Failed to retrieve administrative payment logs." });
    }
  }
}
