import { Router } from "express";
import { WalletController } from "../controllers/walletController";
import { RefundController } from "../controllers/refundController";
import { WithdrawalController } from "../controllers/withdrawalController";

const router = Router();

// GET /api/wallet - Retrieve authenticated user's wallet
router.get("/", WalletController.getWallet);

// POST /api/wallet - Create / verify user's wallet
router.post("/", WalletController.createWallet);

// GET /api/wallet/transactions - Retrieve paginated transaction history
router.get("/transactions", WalletController.getTransactions);

// PUT /api/wallet/transaction - Deposit / withdraw (credit / debit)
router.put("/transaction", WalletController.updateWallet);

// POST /api/wallet/recharge - Recharge wallet with preset or custom amounts (simulated / live hooks)
router.post("/recharge", WalletController.rechargeWallet);

// Driver Withdrawal Routes
// POST /api/wallet/withdraw - Request a driver withdrawal
router.post("/withdraw", WithdrawalController.createWithdrawalRequest);

// GET /api/wallet/withdraw - Retrieve driver withdrawal request list
router.get("/withdraw", WithdrawalController.getDriverWithdrawals);

// GET /api/wallet/withdraw/stats - Retrieve driver wallet earnings & settlement stats
router.get("/withdraw/stats", WithdrawalController.getDriverEarningsStats);

// GET /api/wallet/admin/withdrawals - Retrieve all withdrawal requests (Admin only)
router.get("/admin/withdrawals", WithdrawalController.getAllWithdrawalsAdmin);

// PUT /api/wallet/admin/withdrawals/:id - Approve or reject a driver withdrawal request (Admin only)
router.put("/admin/withdrawals/:id", WithdrawalController.processWithdrawalAdmin);

// Refund System Routes
// POST /api/wallet/refunds - Request a refund
router.post("/refunds", RefundController.createRequest);

// GET /api/wallet/refunds - Get user's refund request logs
router.get("/refunds", RefundController.getUserRefunds);

// GET /api/wallet/admin/refunds - Retrieve all refund requests in the system (Admin only)
router.get("/admin/refunds", RefundController.getAllRefundsAdmin);

// PUT /api/wallet/admin/refunds/:id - Approve or reject a refund request (Admin only)
router.put("/admin/refunds/:id", RefundController.processRefundAdmin);

// GET /api/wallet/admin - Get all wallets (Admin only, verified inside controller)
router.get("/admin", WalletController.getAllWalletsAdmin);

// GET /api/wallet/admin/:userId - Get wallet of a specific user
router.get("/admin/:userId", WalletController.getWalletByUserIdAdmin);

// PUT /api/wallet/admin/:userId - Edit wallet of a specific user (Admin only)
router.put("/admin/:userId", WalletController.updateWalletAdmin);

export default router;
