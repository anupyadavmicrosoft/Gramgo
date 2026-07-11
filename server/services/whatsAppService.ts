import { 
  WhatsAppMessageDb, 
  WhatsAppSettingsDb, 
  DeliveryLogDb, 
  MessageTemplateDb, 
  IWhatsAppMessage 
} from "../models/WhatsApp";

export class WhatsAppService {
  private static isProcessingQueue = false;

  /**
   * Initialize the background worker queue processor for WhatsApp dispatches
   */
  public static startQueueWorker() {
    console.log("[WhatsApp Service] Initializing queue worker and seeding templates...");
    
    // Seed default templates asynchronously on startup
    MessageTemplateDb.seedTemplates()
      .then(() => console.log("[WhatsApp Service] Default templates ensured successfully."))
      .catch(err => console.error("[WhatsApp Service] Error seeding default templates:", err));

    setInterval(async () => {
      await this.processMessageQueue();
    }, 5000); // Check every 5 seconds
  }

  /**
   * Queue an outbound WhatsApp message for delivery
   */
  public static async queueMessage(
    to: string, 
    messageType: "text" | "template", 
    body: string, 
    templateName?: string, 
    variables?: string[]
  ): Promise<IWhatsAppMessage> {
    const settings = await WhatsAppSettingsDb.getSettings();
    
    // Normalize destination number
    let formattedPhone = to.trim().replace(/[\s\-\(\)]/g, "");
    if (!formattedPhone.startsWith("+") && !formattedPhone.startsWith("0")) {
      formattedPhone = (settings.defaultCountryCode || "+91") + formattedPhone;
    }

    const message = await WhatsAppMessageDb.create({
      from: settings.phoneNumberId || "GramGo_Gateway",
      to: formattedPhone,
      messageType,
      body,
      status: "queued",
      direction: "outbound",
      templateName,
      variables,
      retryCount: 0
    });

    console.log(`[WhatsApp Service] Message ${message.id} added to transmission queue.`);
    
    // Trigger immediate out-of-band processing
    this.processMessageQueue().catch(e => console.error("Immediate queue run error:", e));

    return message;
  }

  /**
   * Process all pending queued or failed retryable messages
   */
  private static async processMessageQueue() {
    if (this.isProcessingQueue) return;
    this.isProcessingQueue = true;

    try {
      const messages = await WhatsAppMessageDb.find();
      const retryableMessages = messages.filter(
        m => m.status === "queued" || (m.status === "failed" && m.retryCount < 3)
      );

      if (retryableMessages.length > 0) {
        console.log(`[WhatsApp Queue] Found ${retryableMessages.length} message(s) for dispatch.`);
      }

      for (const msg of retryableMessages) {
        await this.dispatchMessage(msg);
      }
    } catch (err) {
      console.error("[WhatsApp Queue] Processor failure:", err);
    } finally {
      this.isProcessingQueue = false;
    }
  }

  /**
   * Actual dispatch logic using Meta Business API or Simulated Sandbox
   */
  private static async dispatchMessage(msg: IWhatsAppMessage) {
    const settings = await WhatsAppSettingsDb.getSettings();
    
    if (!settings.enabled) {
      console.log(`[WhatsApp Service] Service is disabled. Skipping message ${msg.id}.`);
      return;
    }

    const isSandbox = settings.isSandbox || 
      !settings.accessToken || 
      !settings.phoneNumberId || 
      settings.accessToken === "YOUR_META_ACCESS_TOKEN";

    await WhatsAppMessageDb.updateStatus(msg.id, "queued", {
      retryCount: msg.retryCount + 1
    });

    if (isSandbox) {
      await this.dispatchSimulation(msg);
    } else {
      await this.dispatchMetaCloudAPI(msg, settings);
    }
  }

  /**
   * Simulated sandbox dispatch with microtasks for status updates (sent -> delivered -> read)
   */
  private static async dispatchSimulation(msg: IWhatsAppMessage) {
    console.log(`\n--- 📱 SIMULATED WHATSAPP OUTBOX DISPATCH ---`);
    console.log(`ID: ${msg.id}`);
    console.log(`To: ${msg.to}`);
    console.log(`Type: ${msg.messageType.toUpperCase()}`);
    if (msg.templateName) {
      console.log(`Template: ${msg.templateName}`);
      console.log(`Params: [${(msg.variables || []).join(", ")}]`);
    }
    console.log(`Body: "${msg.body}"`);
    console.log(`---------------------------------------------\n`);

    // Complete local dispatch
    const mockMetaId = "wamid.HBgL" + Math.random().toString(36).substring(2, 16).toUpperCase();
    
    await WhatsAppMessageDb.updateStatus(msg.id, "sent", {
      metaMessageId: mockMetaId,
      error: undefined
    });

    await DeliveryLogDb.create({
      messageId: msg.id,
      status: "sent",
      recipient: msg.to,
      rawPayload: { simulated: true, mockMetaId }
    });

    this.notifySocketUpdate(msg.id, "sent");

    // Simulate "Delivered" delivery status hook after 2 seconds
    setTimeout(async () => {
      await WhatsAppMessageDb.updateStatus(msg.id, "delivered");
      await DeliveryLogDb.create({
        messageId: msg.id,
        status: "delivered",
        recipient: msg.to,
        rawPayload: { simulated: true, event: "delivered_hook" }
      });
      this.notifySocketUpdate(msg.id, "delivered");

      // Simulate "Read" status receipt after 4 seconds
      setTimeout(async () => {
        await WhatsAppMessageDb.updateStatus(msg.id, "read");
        await DeliveryLogDb.create({
          messageId: msg.id,
          status: "read",
          recipient: msg.to,
          rawPayload: { simulated: true, event: "read_hook" }
        });
        this.notifySocketUpdate(msg.id, "read");
      }, 2000);

    }, 2000);
  }

  /**
   * Live HTTP dispatch to the Meta WhatsApp Business Cloud API Gateway
   */
  private static async dispatchMetaCloudAPI(msg: IWhatsAppMessage, settings: any) {
    const url = `https://graph.facebook.com/v18.0/${settings.phoneNumberId}/messages`;
    
    let payload: any = {
      messaging_product: "whatsapp",
      recipient_type: "individual",
      to: msg.to
    };

    if (msg.messageType === "template" && msg.templateName) {
      // Build official Meta Template JSON
      payload.type = "template";
      payload.template = {
        name: msg.templateName,
        language: { code: "en" },
        components: []
      };

      if (msg.variables && msg.variables.length > 0) {
        payload.template.components.push({
          type: "body",
          parameters: msg.variables.map(v => ({
            type: "text",
            text: v
          }))
        });
      }
    } else {
      payload.type = "text";
      payload.text = {
        preview_url: false,
        body: msg.body
      };
    }

    try {
      const response = await fetch(url, {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${settings.accessToken}`,
          "Content-Type": "application/json"
        },
        body: JSON.stringify(payload)
      });

      const responseData = await response.json();

      if (response.ok) {
        const metaId = responseData.messages?.[0]?.id || "unknown_meta_id";
        
        await WhatsAppMessageDb.updateStatus(msg.id, "sent", {
          metaMessageId: metaId,
          error: undefined
        });

        await DeliveryLogDb.create({
          messageId: msg.id,
          status: "sent",
          recipient: msg.to,
          rawPayload: responseData
        });

        this.notifySocketUpdate(msg.id, "sent");
        console.log(`[WhatsApp Business] Message ${msg.id} successfully transmitted. Meta ID: ${metaId}`);
      } else {
        // Parse Facebook Graph API error message
        const fbError = responseData.error || {};
        const errorMsg = fbError.message || "Unknown error";
        const errorCode = fbError.code || "unknown";
        const errorSubcode = fbError.error_subcode || "";

        console.error(`[WhatsApp API Error] HTTP ${response.status}: ${errorMsg} (Code: ${errorCode}, Sub: ${errorSubcode})`);

        await WhatsAppMessageDb.updateStatus(msg.id, "failed", {
          error: `${errorMsg} (Code: ${errorCode})`
        });

        await DeliveryLogDb.create({
          messageId: msg.id,
          status: "failed",
          recipient: msg.to,
          errorCode: String(errorCode),
          errorMessage: `${errorMsg} (Subcode: ${errorSubcode})`,
          rawPayload: responseData
        });

        this.notifySocketUpdate(msg.id, "failed");
      }
    } catch (err: any) {
      console.error(`[WhatsApp Service Network Error]`, err);
      
      await WhatsAppMessageDb.updateStatus(msg.id, "failed", {
        error: err.message || "Network request failed"
      });

      await DeliveryLogDb.create({
        messageId: msg.id,
        status: "failed",
        recipient: msg.to,
        errorCode: "NETWORK_ERROR",
        errorMessage: err.message || "Failed to make HTTP call to Meta services"
      });

      this.notifySocketUpdate(msg.id, "failed");
    }
  }

  /**
   * Socket.io status helper
   */
  private static notifySocketUpdate(messageId: string, status: string) {
    const io = (global as any).ioInstance;
    if (io) {
      io.emit("whatsapp_status_update", { messageId, status });
    }
  }

  /**
   * High-level utility to send predefined triggers with variable bindings
   */
  public static async sendTemplateTrigger(to: string, templateName: string, variables: string[]): Promise<IWhatsAppMessage | null> {
    const template = await MessageTemplateDb.findByName(templateName);
    if (!template) {
      console.error(`[WhatsApp Service] Template '${templateName}' not found in database.`);
      return null;
    }

    // Replace body placeholders for message record preview
    let renderedBody = template.body;
    variables.forEach((val, idx) => {
      renderedBody = renderedBody.replace(`{{${idx + 1}}}`, val);
    });

    return await this.queueMessage(to, "template", renderedBody, templateName, variables);
  }
}
