import { Request, Response } from "express";
import { RefundService } from "../services/refundService";

export class RefundController {
  /**
   * POST /api/wallet/refunds
   * File a new refund request (Passenger or Driver)
   */
  static async createRequest(req: Request, res: Response) {
    try {
      const user = (req as any).user;
      if (!user) {
        return res.status(401).json({ error: "Access denied. Authentication required." });
      }

      const { amount, reason, transactionId } = req.body;

      if (amount === undefined || typeof amount !== "number" || amount <= 0) {
        return res.status(400).json({ error: "A valid positive refund amount is required." });
      }

      if (!reason || reason.trim().length < 10) {
        return res.status(400).json({ error: "A comprehensive reason (minimum 10 characters) is required to file a refund." });
      }

      const refundRequest = await RefundService.createRefundRequest(
        user.id,
        amount,
        reason,
        transactionId
      );

      return res.status(201).json({
        success: true,
        message: "Your refund request has been submitted successfully for administrative review.",
        refund: refundRequest
      });
    } catch (error: any) {
      console.error("Error in RefundController.createRequest:", error);
      return res.status(400).json({ error: error.message || "Failed to file refund request." });
    }
  }

  /**
   * GET /api/wallet/refunds
   * Retrieve refund requests filed by the authenticated user
   */
  static async getUserRefunds(req: Request, res: Response) {
    try {
      const user = (req as any).user;
      if (!user) {
        return res.status(401).json({ error: "Access denied. Authentication required." });
      }

      const refunds = await RefundService.getUserRefundRequests(user.id);
      return res.json(refunds);
    } catch (error: any) {
      console.error("Error in RefundController.getUserRefunds:", error);
      return res.status(500).json({ error: error.message || "Failed to fetch refund history." });
    }
  }

  /**
   * GET /api/wallet/admin/refunds
   * Admin only: Retrieve all refund requests in the system
   */
  static async getAllRefundsAdmin(req: Request, res: Response) {
    try {
      const user = (req as any).user;
      if (!user || user.role !== "admin") {
        return res.status(403).json({ error: "Access forbidden. Administrator privileges required." });
      }

      const refunds = await RefundService.getAllRefundRequests();
      return res.json(refunds);
    } catch (error: any) {
      console.error("Error in RefundController.getAllRefundsAdmin:", error);
      return res.status(500).json({ error: error.message || "Failed to fetch platform refunds." });
    }
  }

  /**
   * PUT /api/wallet/admin/refunds/:id
   * Admin only: Approve or Reject a specific refund request
   */
  static async processRefundAdmin(req: Request, res: Response) {
    try {
      const user = (req as any).user;
      if (!user || user.role !== "admin") {
        return res.status(403).json({ error: "Access forbidden. Administrator privileges required." });
      }

      const { id } = req.params;
      const { decision, adminNotes } = req.body;

      if (!decision || (decision !== "approved" && decision !== "rejected")) {
        return res.status(400).json({ error: "Invalid refund decision. Use 'approved' or 'rejected'." });
      }

      if (!adminNotes || adminNotes.trim().length < 5) {
        return res.status(400).json({ error: "Please specify administrative review notes (minimum 5 characters)." });
      }

      const updatedRefund = await RefundService.processRefundDecision(
        id,
        decision,
        adminNotes
      );

      return res.json({
        success: true,
        message: `Refund request was successfully ${decision}.`,
        refund: updatedRefund
      });
    } catch (error: any) {
      console.error("Error in RefundController.processRefundAdmin:", error);
      return res.status(400).json({ error: error.message || "Failed to process refund decision." });
    }
  }
}
