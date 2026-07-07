import { Router } from "express";
import { PaymentController } from "../controllers/paymentController";

const router = Router();

// POST /api/payments/initialize - Create standard/wallet/gateway payment
router.post("/initialize", PaymentController.initializePayment);

// POST /api/payments/verify - Confirm gateway payment verification
router.post("/verify", PaymentController.verifyPayment);

// POST /api/payments/:paymentId/refund - Request refund on transaction
router.post("/:paymentId/refund", PaymentController.refundPayment);

// GET /api/payments/user - Retrieve caller's payment logs
router.get("/user", PaymentController.getUserPayments);

// GET /api/payments/gateways - Retrieve active credentials checklist
router.get("/gateways", PaymentController.getGatewaysConfig);

// GET /api/payments/admin/all - Retrieve all platform payments (Admin audit ledger)
router.get("/admin/all", PaymentController.getAllPaymentsAdmin);

export default router;
