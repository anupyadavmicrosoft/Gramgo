import { Router } from "express";
import { WalletController } from "../controllers/walletController";

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

// GET /api/wallet/admin - Get all wallets (Admin only, verified inside controller)
router.get("/admin", WalletController.getAllWalletsAdmin);

// GET /api/wallet/admin/:userId - Get wallet of a specific user
router.get("/admin/:userId", WalletController.getWalletByUserIdAdmin);

// PUT /api/wallet/admin/:userId - Edit wallet of a specific user (Admin only)
router.put("/admin/:userId", WalletController.updateWalletAdmin);

export default router;
