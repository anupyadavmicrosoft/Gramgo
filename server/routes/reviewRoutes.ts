import { Router } from "express";
import jwt from "jsonwebtoken";
import { ReviewController } from "../controllers/reviewController";

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

// Routes
router.get("/", authenticateToken, ReviewController.getReviews);
router.post("/", authenticateToken, ReviewController.createReview);
router.get("/about/:userId", authenticateToken, ReviewController.getReviewsAboutUser);
router.get("/by/:userId", authenticateToken, ReviewController.getReviewsByUser);
router.get("/ride/:rideId", authenticateToken, ReviewController.getReviewsForRide);
router.get("/stats/:userId", authenticateToken, ReviewController.getUserStats);
router.delete("/:id", authenticateToken, ReviewController.deleteReview);

export default router;
