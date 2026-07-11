import { ConversationDb } from "../models/Conversation";
import { MessageDb } from "../models/Message";
import { UserDb } from "../models/User";
import fs from "fs";
import path from "path";

export const ChatController = {
  // Fetch all conversations for the authenticated user
  async getConversations(req: any, res: any) {
    const userId = req.user.id;

    try {
      const conversations = await ConversationDb.findByUserId(userId);
      const enhancedConversations = await Promise.all(
        conversations.map(async (conv) => {
          // Find the other participant ID
          const otherId = conv.participants.find((pId) => pId !== userId);
          let otherParticipant: any = null;

          if (otherId) {
            if (otherId === "admin" || otherId.startsWith("admin_")) {
              otherParticipant = {
                id: "admin",
                name: "GramGo Panchayat Support",
                role: "admin",
                village: "District Headquarters",
                phone: "+91 11-GRAMGO-SOS"
              };
            } else {
              const userProfile = await UserDb.findById(otherId);
              if (userProfile) {
                otherParticipant = {
                  id: userProfile.id,
                  name: userProfile.name,
                  role: userProfile.role,
                  phone: userProfile.phone,
                  village: userProfile.village,
                  vehicleType: userProfile.vehicleType,
                  vehicleNumber: userProfile.vehicleNumber
                };
              } else {
                otherParticipant = {
                  id: otherId,
                  name: "Community Member",
                  role: "passenger",
                  village: "Ghazipur"
                };
              }
            }
          } else {
            otherParticipant = {
              id: "system",
              name: "GramGo Automated Desk",
              role: "admin",
              village: "System Gateway"
            };
          }

          // Fetch messages for last-message snapshot and unread counts
          const messages = await MessageDb.findByConversationId(conv.id);
          const lastMessage = messages.length > 0 ? messages[messages.length - 1] : null;

          // Count unread messages (messages sent by others that don't have this user in readBy)
          const unreadCount = messages.filter(
            (m) => m.senderId !== userId && (!m.readBy || !m.readBy.includes(userId))
          ).length;

          return {
            id: conv.id,
            participants: conv.participants,
            rideId: conv.rideId,
            createdAt: conv.createdAt,
            updatedAt: conv.updatedAt,
            otherParticipant,
            lastMessage: lastMessage
              ? {
                  id: lastMessage.id,
                  text: lastMessage.text,
                  senderId: lastMessage.senderId,
                  senderName: lastMessage.senderName,
                  senderRole: lastMessage.senderRole,
                  createdAt: lastMessage.createdAt
                }
              : null,
            unreadCount
          };
        })
      );

      // Sort by last message / update timestamp descending
      enhancedConversations.sort(
        (a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
      );

      res.json(enhancedConversations);
    } catch (error) {
      console.error("Failed to fetch conversations:", error);
      res.status(500).json({ error: "Failed to load community chat channels." });
    }
  },

  // Fetch messages for a specific conversation
  async getMessages(req: any, res: any) {
    const { conversationId } = req.params;
    const userId = req.user.id;

    try {
      const conversation = await ConversationDb.findById(conversationId);
      if (!conversation) {
        return res.status(404).json({ error: "Chat room not found." });
      }

      // Authorize participant
      if (!conversation.participants.includes(userId)) {
        return res.status(403).json({ error: "You are not a participant in this conversation." });
      }

      // Mark messages as read by the user
      await MessageDb.markAsRead(conversationId, userId);

      const messages = await MessageDb.findByConversationId(conversationId);
      res.json(messages);

      // Notify other participants of read status via socket
      const io = (global as any).ioInstance;
      if (io) {
        io.to(`conversation_${conversationId}`).emit("messages:read", {
          conversationId,
          userId
        });
      }
    } catch (error) {
      console.error("Failed to load chat messages:", error);
      res.status(500).json({ error: "Failed to retrieve message logs." });
    }
  },

  // Create or retrieve conversation
  async createConversation(req: any, res: any) {
    const { participantId, rideId } = req.body;
    const userId = req.user.id;

    if (!participantId) {
      return res.status(400).json({ error: "Recipient ID (participantId) is required." });
    }

    try {
      // Form the participant array
      const participants = [userId, participantId].sort();

      // Check if a conversation between these exact users already exists
      let conversation = await ConversationDb.findByParticipants(participants);

      if (!conversation) {
        // Create new conversation
        conversation = await ConversationDb.create({
          participants,
          rideId
        });
      } else if (rideId && conversation.rideId !== rideId) {
        // Update ride association if a new ride is linked
        // We'll update the record
        if (typeof (conversation as any).save === "function") {
          conversation.rideId = rideId;
          await (conversation as any).save();
        }
      }

      // Fetch the other participant detail
      let otherParticipant: any = null;
      if (participantId === "admin" || participantId.startsWith("admin_")) {
        otherParticipant = {
          id: "admin",
          name: "GramGo Panchayat Support",
          role: "admin",
          village: "District Headquarters",
          phone: "+91 11-GRAMGO-SOS"
        };
      } else {
        const userProfile = await UserDb.findById(participantId);
        if (userProfile) {
          otherParticipant = {
            id: userProfile.id,
            name: userProfile.name,
            role: userProfile.role,
            phone: userProfile.phone,
            village: userProfile.village,
            vehicleType: userProfile.vehicleType,
            vehicleNumber: userProfile.vehicleNumber
          };
        } else {
          otherParticipant = {
            id: participantId,
            name: "Community Member",
            role: "passenger",
            village: "Ghazipur"
          };
        }
      }

      res.status(201).json({
        id: conversation.id,
        participants: conversation.participants,
        rideId: conversation.rideId,
        createdAt: conversation.createdAt,
        updatedAt: conversation.updatedAt,
        otherParticipant,
        lastMessage: null,
        unreadCount: 0
      });
    } catch (error) {
      console.error("Failed to establish conversation:", error);
      res.status(500).json({ error: "Failed to open communication channel." });
    }
  },

  // Send a message in a conversation
  async sendMessage(req: any, res: any) {
    const { conversationId } = req.params;
    const { text, attachments } = req.body;
    const userId = req.user.id;

    if ((!text || text.trim() === "") && (!attachments || !Array.isArray(attachments) || attachments.length === 0)) {
      return res.status(400).json({ error: "Message content or attachments must be provided." });
    }

    try {
      const conversation = await ConversationDb.findById(conversationId);
      if (!conversation) {
        return res.status(404).json({ error: "Chat room not found." });
      }

      // Authorize participant
      if (!conversation.participants.includes(userId)) {
        return res.status(403).json({ error: "You are not a participant in this conversation." });
      }

      // Fetch sender info
      let senderName = "User";
      let senderRole = "passenger";
      
      const senderProfile = await UserDb.findById(userId);
      if (senderProfile) {
        senderName = senderProfile.name;
        senderRole = senderProfile.role;
      } else if (userId === "admin" || userId.startsWith("admin_")) {
        senderName = "GramGo Admin";
        senderRole = "admin";
      }

      // Create message
      const message = await MessageDb.create({
        conversationId,
        senderId: userId,
        senderName,
        senderRole: senderRole as any,
        text: (text || "").trim(),
        readBy: [userId],
        attachments: attachments || []
      });

      // Update conversation timestamp
      await ConversationDb.updateTimestamp(conversationId);

      // Emit Socket.IO event to all clients in the conversation room
      const io = (global as any).ioInstance;
      if (io) {
        // Emit to room
        io.to(`conversation_${conversationId}`).emit("message:received", message);
        io.to(`conversation_${conversationId}`).emit("Message Received", message);
        
        // General broadcast for passive notifications
        io.emit("message:new", {
          conversationId,
          message
        });
        io.emit("Message New", {
          conversationId,
          message
        });
      }

      res.status(201).json(message);
    } catch (error) {
      console.error("Failed to dispatch message:", error);
      res.status(500).json({ error: "Failed to dispatch message to channel." });
    }
  },

  // Get list of online user IDs
  async getPresence(req: any, res: any) {
    try {
      const onlineObj = (global as any).onlineUsers || {};
      res.json(Object.keys(onlineObj));
    } catch (error) {
      res.status(500).json({ error: "Failed to load presence details" });
    }
  },

  // Upload a media file (image, document, or audio)
  async uploadFile(req: any, res: any) {
    const { filename, fileData } = req.body;
    if (!filename || !fileData) {
      return res.status(400).json({ error: "Filename and fileData base64 string are required." });
    }

    try {
      let buffer: Buffer;
      let extension = path.extname(filename);
      let baseName = path.basename(filename, extension);
      
      if (fileData.startsWith("data:")) {
        const matches = fileData.match(/^data:([A-Za-z-+\/]+);base64,(.+)$/);
        if (!matches || matches.length !== 3) {
          return res.status(400).json({ error: "Invalid data URI format." });
        }
        buffer = Buffer.from(matches[2], "base64");
      } else {
        buffer = Buffer.from(fileData, "base64");
      }

      const uploadsDir = path.join(process.cwd(), "uploads");
      if (!fs.existsSync(uploadsDir)) {
        fs.mkdirSync(uploadsDir, { recursive: true });
      }

      const uniqueName = `${baseName}_${Date.now()}${extension}`;
      const destPath = path.join(uploadsDir, uniqueName);
      
      fs.writeFileSync(destPath, buffer);

      res.status(200).json({
        url: `/uploads/${uniqueName}`,
        name: filename,
        size: buffer.length
      });
    } catch (error: any) {
      console.error("Failed to upload file:", error);
      res.status(500).json({ error: "Failed to upload file: " + error.message });
    }
  }
};
