import { Router } from "express";
import jwt from "jsonwebtoken";
import { CouponController } from "../controllers/couponController";

const JWT_SECRET = process.env.JWT_SECRET || "gramgo_secure_jwt_secret_key_2026";

const router = Router();

// Middleware to authenticate JWT tokens
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

// Middleware to verify admin access
function verifyAdmin(req: any, res: any, next: any) {
  if (req.user && (
    req.user.role?.toLowerCase() === "admin" || 
    req.user.role?.toLowerCase() === "super admin"
  )) {
    next();
  } else {
    res.status(403).json({ error: "Access denied. Administrative credentials required." });
  }
}

// Public/Passenger APIs
router.post("/validate", authenticateToken, CouponController.validateCoupon);
router.post("/apply", authenticateToken, CouponController.applyCoupon);

// Campaign Routes (Admin)
router.get("/campaigns", authenticateToken, CouponController.getCampaigns);
router.post("/campaigns", authenticateToken, verifyAdmin, CouponController.createCampaign);
router.put("/campaigns/:id", authenticateToken, verifyAdmin, CouponController.updateCampaign);
router.delete("/campaigns/:id", authenticateToken, verifyAdmin, CouponController.deleteCampaign);

// Rule Routes (Admin)
router.get("/rules", authenticateToken, CouponController.getRules);
router.post("/rules", authenticateToken, verifyAdmin, CouponController.createRules);
router.put("/rules/:id", authenticateToken, verifyAdmin, CouponController.updateRules);
router.delete("/rules/:id", authenticateToken, verifyAdmin, CouponController.deleteRules);

// Coupon Analytics (Admin)
router.get("/analytics", authenticateToken, verifyAdmin, CouponController.getAnalytics);

// Coupon Base Routes
router.get("/", authenticateToken, CouponController.getCoupons);
router.get("/code/:code", authenticateToken, CouponController.getCouponByCode);
router.post("/", authenticateToken, verifyAdmin, CouponController.createCoupon);
router.put("/:id", authenticateToken, verifyAdmin, CouponController.updateCoupon);
router.delete("/:id", authenticateToken, verifyAdmin, CouponController.deleteCoupon);

export default router;
