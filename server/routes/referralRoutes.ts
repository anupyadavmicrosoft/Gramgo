import { Router } from "express";
import jwt from "jsonwebtoken";
import { ReferralController } from "../controllers/referralController";

const JWT_SECRET = process.env.JWT_SECRET || "gramgo_super_secret_jwt_token_key";

const router = Router();

// Middleware to authenticate JWT tokens locally inside referral routes
function authenticateToken(req: any, res: any, next: any) {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];
  
  if (!token) {
    return res.status(401).json({ error: "Access token required. Please login first." });
  }
  
  jwt.verify(token, JWT_SECRET, (err: any, decoded: any) => {
    if (err) {
      return res.status(403).json({ error: "Your session has expired. Please login again." });
    }
    req.user = decoded;
    next();
  });
}

// Middleware to optionally decode JWT tokens for validation if available
function optionalAuthenticateToken(req: any, res: any, next: any) {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];
  if (!token) {
    return next();
  }
  jwt.verify(token, JWT_SECRET, (err: any, decoded: any) => {
    if (!err) {
      req.user = decoded;
    }
    next();
  });
}

// Public: Validate a referral code (e.g. on signup page)
router.post("/validate", optionalAuthenticateToken, ReferralController.validateReferralCode);

// Protected: Get dashboard stats, rewards, and transactions
router.get("/dashboard", authenticateToken, ReferralController.getReferralDashboard);

// Protected: Customize referral code
router.post("/custom-code", authenticateToken, ReferralController.customizeReferralCode);

// Protected: Claim a pending reward
router.post("/claim/:rewardId", authenticateToken, ReferralController.claimReward);

export default router;
