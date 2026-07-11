import { Router } from "express";
import jwt from "jsonwebtoken";
import { WhatsAppController } from "../controllers/whatsAppController";

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

// PUBLIC WEBHOOK PORTS (Meta API Webhooks)
router.get("/webhook", WhatsAppController.verifyWebhook);
router.post("/webhook", WhatsAppController.handleWebhookEvent);

// ADMIN PROTECTED PORTS
router.get("/settings", authenticateToken, verifyAdmin, WhatsAppController.getSettings);
router.put("/settings", authenticateToken, verifyAdmin, WhatsAppController.updateSettings);
router.post("/test-connection", authenticateToken, verifyAdmin, WhatsAppController.testConnection);

router.get("/messages", authenticateToken, verifyAdmin, WhatsAppController.getMessages);
router.get("/logs", authenticateToken, verifyAdmin, WhatsAppController.getDeliveryLogs);

// Template Management
router.get("/templates", authenticateToken, verifyAdmin, WhatsAppController.getTemplates);
router.post("/templates", authenticateToken, verifyAdmin, WhatsAppController.createTemplate);
router.delete("/templates/:id", authenticateToken, verifyAdmin, WhatsAppController.deleteTemplate);

// Debug Inbound Message Simulator
router.post("/simulate-incoming", authenticateToken, verifyAdmin, WhatsAppController.simulateIncomingMessage);

export default router;
