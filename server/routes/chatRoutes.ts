import express from "express";
import { ChatController } from "../controllers/chatController";

const router = express.Router();

router.get("/presence", ChatController.getPresence);
router.post("/upload", ChatController.uploadFile);
router.get("/conversations", ChatController.getConversations);
router.get("/conversations/:conversationId/messages", ChatController.getMessages);
router.post("/conversations", ChatController.createConversation);
router.post("/conversations/:conversationId/messages", ChatController.sendMessage);

export default router;
