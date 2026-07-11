import { Request, Response } from "express";
import { 
  WhatsAppSettingsDb, 
  WhatsAppMessageDb, 
  MessageTemplateDb, 
  DeliveryLogDb 
} from "../models/WhatsApp";
import { WhatsAppService } from "../services/whatsAppService";

export class WhatsAppController {
  /**
   * Get global WhatsApp settings
   */
  public static async getSettings(req: Request, res: Response) {
    try {
      const settings = await WhatsAppSettingsDb.getSettings();
      res.json(settings);
    } catch (err: any) {
      console.error("Error getting settings:", err);
      res.status(500).json({ error: "Failed to load WhatsApp settings from database." });
    }
  }

  /**
   * Update global WhatsApp settings
   */
  public static async updateSettings(req: Request, res: Response) {
    try {
      const updated = await WhatsAppSettingsDb.updateSettings(req.body);
      res.json({ message: "WhatsApp configuration updated successfully.", settings: updated });
    } catch (err: any) {
      console.error("Error updating settings:", err);
      res.status(500).json({ error: "Failed to persist WhatsApp settings." });
    }
  }

  /**
   * Get all dispatched WhatsApp messages
   */
  public static async getMessages(req: Request, res: Response) {
    try {
      const messages = await WhatsAppMessageDb.find();
      res.json(messages);
    } catch (err: any) {
      console.error("Error getting messages:", err);
      res.status(500).json({ error: "Failed to retrieve WhatsApp transmission log." });
    }
  }

  /**
   * Get templates list
   */
  public static async getTemplates(req: Request, res: Response) {
    try {
      const templates = await MessageTemplateDb.find();
      res.json(templates);
    } catch (err: any) {
      console.error("Error getting templates:", err);
      res.status(500).json({ error: "Failed to load message templates." });
    }
  }

  /**
   * Create template
   */
  public static async createTemplate(req: Request, res: Response) {
    const { name, category, language, body, header, footer } = req.body;
    if (!name || !body) {
      return res.status(400).json({ error: "Template name and body content are required." });
    }

    // Format name to match WhatsApp requirements: lowercase, alphanumeric and underscores only
    const formattedName = name.toLowerCase().trim().replace(/[^a-z0-9_]/g, "_");

    try {
      const template = await MessageTemplateDb.create({
        name: formattedName,
        category,
        language,
        body,
        header,
        footer,
        status: "APPROVED" // Approved instantly in sandbox/simulation!
      });
      res.status(201).json({ message: "Template registered and approved.", template });
    } catch (err: any) {
      console.error("Error creating template:", err);
      res.status(500).json({ error: "Failed to save message template." });
    }
  }

  /**
   * Delete template
   */
  public static async deleteTemplate(req: Request, res: Response) {
    const { id } = req.params;
    try {
      const success = await MessageTemplateDb.delete(id);
      if (success) {
        res.json({ message: "Template removed successfully." });
      } else {
        res.status(404).json({ error: "Template record not found." });
      }
    } catch (err: any) {
      console.error("Error deleting template:", err);
      res.status(500).json({ error: "Failed to remove template." });
    }
  }

  /**
   * Get delivery logs
   */
  public static async getDeliveryLogs(req: Request, res: Response) {
    try {
      const logs = await DeliveryLogDb.find();
      res.json(logs);
    } catch (err: any) {
      console.error("Error getting delivery logs:", err);
      res.status(500).json({ error: "Failed to load webhook delivery logs." });
    }
  }

  /**
   * Verify WhatsApp Webhook challenge (GET)
   */
  public static async verifyWebhook(req: Request, res: Response) {
    const settings = await WhatsAppSettingsDb.getSettings();
    const mode = req.query["hub.mode"];
    const token = req.query["hub.verify_token"];
    const challenge = req.query["hub.challenge"];

    const verifyToken = settings.verifyToken || process.env.WHATSAPP_WEBHOOK_VERIFY_TOKEN || "gramgo_webhook_verification_token_2026";

    if (mode && token) {
      if (mode === "subscribe" && token === verifyToken) {
        console.log("[WhatsApp Webhook] Verification successful!");
        return res.status(200).send(challenge);
      } else {
        console.warn(`[WhatsApp Webhook] Verification failed. Received token: ${token}, Expected: ${verifyToken}`);
        return res.sendStatus(403);
      }
    }
    res.sendStatus(400);
  }

  /**
   * Handle Webhook notifications from Meta (POST)
   */
  public static async handleWebhookEvent(req: Request, res: Response) {
    try {
      const body = req.body;
      console.log("[WhatsApp Webhook] Event payload received:", JSON.stringify(body, null, 2));

      if (body.object === "whatsapp_business_account") {
        const entry = body.entry?.[0];
        const changes = entry?.changes?.[0];
        const value = changes?.value;

        if (value) {
          // 1. Process Message Status Updates (sent, delivered, read, failed)
          const statuses = value.statuses?.[0];
          if (statuses) {
            const metaId = statuses.id;
            const status = statuses.status; // 'sent', 'delivered', 'read', 'failed'
            const recipient = statuses.recipient_id;

            console.log(`[WhatsApp Webhook] Status change: Meta ID ${metaId} status updated to '${status}' for ${recipient}`);

            // Find matching message in our DB by metaMessageId
            const messages = await WhatsAppMessageDb.find();
            const matchingMsg = messages.find(m => m.metaMessageId === metaId);

            if (matchingMsg) {
              let updateFields: any = {};
              if (status === "failed") {
                const errors = statuses.errors?.[0];
                updateFields.error = errors ? `${errors.title} (Code: ${errors.code})` : "Meta status delivery failed";
              }

              await WhatsAppMessageDb.updateStatus(matchingMsg.id, status, updateFields);

              // Add delivery log entry
              await DeliveryLogDb.create({
                messageId: matchingMsg.id,
                status,
                recipient,
                rawPayload: statuses,
                errorCode: statuses.errors?.[0]?.code ? String(statuses.errors[0].code) : undefined,
                errorMessage: statuses.errors?.[0]?.title
              });

              // Notify socket
              const io = (global as any).ioInstance;
              if (io) {
                io.emit("whatsapp_status_update", { messageId: matchingMsg.id, status });
              }
            }
          }

          // 2. Process Incoming Customer Messages
          const incomingMessage = value.messages?.[0];
          if (incomingMessage) {
            const contact = value.contacts?.[0];
            const fromName = contact?.profile?.name || "WhatsApp Customer";
            const fromPhone = incomingMessage.from;
            const messageId = incomingMessage.id;
            const timestamp = incomingMessage.timestamp;

            let textBody = "";
            if (incomingMessage.type === "text") {
              textBody = incomingMessage.text?.body || "";
            } else if (incomingMessage.type === "interactive") {
              textBody = incomingMessage.interactive?.button_reply?.title || "[Interactive Reply]";
            } else {
              textBody = `[Received ${incomingMessage.type} message]`;
            }

            console.log(`[WhatsApp Webhook] Incoming message from ${fromName} (${fromPhone}): ${textBody}`);

            // Create inbound message record
            const newMsg = await WhatsAppMessageDb.create({
              from: fromPhone,
              to: value.metadata?.display_phone_number || "GramGo",
              messageType: "text",
              body: textBody,
              status: "read", // Automatically read since we just received it
              direction: "inbound",
              metaMessageId: messageId,
              createdAt: new Date(Number(timestamp) * 1000)
            });

            // Log event
            await DeliveryLogDb.create({
              messageId: newMsg.id,
              status: "read",
              recipient: fromPhone,
              rawPayload: incomingMessage
            });

            // Send notification update via Socket
            const io = (global as any).ioInstance;
            if (io) {
              io.emit("whatsapp_message_received", newMsg);
            }
          }
        }

        return res.status(200).send("EVENT_RECEIVED");
      } else {
        return res.sendStatus(404);
      }
    } catch (err: any) {
      console.error("[WhatsApp Webhook Error]", err);
      res.status(500).json({ error: "Webhook event handling failed." });
    }
  }

  /**
   * Test Gateway Connection (Simulates pinging Meta Graph API or validates API configuration)
   */
  public static async testConnection(req: Request, res: Response) {
    const { testNumber } = req.body;
    const settings = await WhatsAppSettingsDb.getSettings();

    const isSandbox = settings.isSandbox || 
      !settings.accessToken || 
      !settings.phoneNumberId || 
      settings.accessToken === "YOUR_META_ACCESS_TOKEN";

    try {
      if (isSandbox) {
        // Simulated response delay
        await new Promise(resolve => setTimeout(resolve, 800));
        
        if (testNumber) {
          // Send simulated test template message
          await WhatsAppService.sendTemplateTrigger(testNumber, "emergency_broadcast", [
            "Sharda Devi", "Gauspur Village", "Sherpur Community Health Centre", "+91 95551 23456"
          ]);
        }

        return res.json({
          success: true,
          mode: "Sandbox Simulation",
          message: "Simulator connection tests successful! Dispatch registers correctly, and simulated webhook notifications (sent, delivered, read) will trigger on delay.",
          fcmEquivalentActive: true
        });
      }

      // Live mode test: Query phone_number_id details from Meta to confirm valid token and configuration
      const url = `https://graph.facebook.com/v18.0/${settings.phoneNumberId}`;
      const response = await fetch(url, {
        headers: {
          "Authorization": `Bearer ${settings.accessToken}`
        }
      });

      const data = await response.json();

      if (response.ok) {
        if (testNumber) {
          // Dispatch live test template to number
          await WhatsAppService.sendTemplateTrigger(testNumber, "emergency_broadcast", [
            "Test Patient", "Sherpur Square", "Sherpur CHC", "+91 99999 88888"
          ]);
        }

        return res.json({
          success: true,
          mode: "Live Production Cloud API",
          message: `Successfully authenticated with Meta Graph API! Display Phone Number: ${data.display_phone_number || "N/A"}, Account ID: ${data.id}.`,
          metadata: data
        });
      } else {
        const errDesc = data.error?.message || "Unknown error";
        return res.status(400).json({
          success: false,
          error: `Meta Authentication Failed: ${errDesc} (Code: ${data.error?.code || "unknown"})`
        });
      }
    } catch (err: any) {
      console.error("[WhatsApp Test Conn Error]", err);
      res.status(500).json({
        success: false,
        error: `Gateway test failed: ${err.message || "Network request failure"}`
      });
    }
  }

  /**
   * Simulate Incoming WhatsApp message (for full-stack test coverage in local preview!)
   */
  public static async simulateIncomingMessage(req: Request, res: Response) {
    const { from, fromName, body } = req.body;
    if (!from || !body) {
      return res.status(400).json({ error: "From phone number and body content are required." });
    }

    try {
      const displayPhone = "GramGo_Simulated_Receiver";
      const messageId = "wamid.ABgL" + Math.random().toString(36).substring(2, 14).toUpperCase();

      const newMsg = await WhatsAppMessageDb.create({
        from,
        to: displayPhone,
        messageType: "text",
        body,
        status: "read",
        direction: "inbound",
        metaMessageId: messageId
      });

      await DeliveryLogDb.create({
        messageId: newMsg.id,
        status: "read",
        recipient: from,
        rawPayload: { simulated: true, fromName, direction: "inbound" }
      });

      // Emit over socket
      const io = (global as any).ioInstance;
      if (io) {
        io.emit("whatsapp_message_received", newMsg);
      }

      res.status(201).json({ message: "Inbound message simulation injected.", messageData: newMsg });
    } catch (err: any) {
      console.error("Simulation error:", err);
      res.status(500).json({ error: "Failed to inject simulated incoming WhatsApp message." });
    }
  }
}
