import { Request, Response } from "express";
import { EmergencyContactDb, IEmergencyContact } from "../models/EmergencyContact";

export class EmergencyContactController {
  // Get all emergency contacts for the authenticated passenger
  static async getContacts(req: Request, res: Response) {
    try {
      const user = (req as any).user;
      if (!user) {
        return res.status(401).json({ error: "Access denied. Authentication required." });
      }

      let contacts = await EmergencyContactDb.findByUserId(user.id);
      
      // If the passenger has 0 contacts, let's auto-generate a default contact to ensure they satisfy the "Minimum 1" requirement out-of-the-box
      if (contacts.length === 0) {
        const defaultContact: IEmergencyContact = {
          id: `contact_${Date.now()}_default`,
          userId: user.id,
          name: "GramGo Emergency Helpline",
          relationship: "Support Dispatch",
          phone: "+91 99999 55555",
          isPrimary: true,
          createdAt: Date.now()
        };
        await EmergencyContactDb.save(defaultContact);
        contacts = [defaultContact];
      }

      return res.json(contacts);
    } catch (error: any) {
      console.error("Error in getContacts:", error);
      return res.status(500).json({ error: error.message || "Failed to retrieve emergency contacts." });
    }
  }

  // Add a new emergency contact (max 5)
  static async addContact(req: Request, res: Response) {
    try {
      const user = (req as any).user;
      if (!user) {
        return res.status(401).json({ error: "Access denied. Authentication required." });
      }

      const { name, relationship, phone, isPrimary } = req.body;

      if (!name || !name.trim()) {
        return res.status(400).json({ error: "Contact name is required." });
      }
      if (!relationship || !relationship.trim()) {
        return res.status(400).json({ error: "Relationship status is required." });
      }
      if (!phone || !phone.trim()) {
        return res.status(400).json({ error: "Contact phone number is required." });
      }

      // Check existing contacts count
      const contacts = await EmergencyContactDb.findByUserId(user.id);
      if (contacts.length >= 5) {
        return res.status(400).json({ error: "Maximum limit of 5 emergency contacts reached." });
      }

      const contactId = `contact_${Date.now()}`;
      const shouldBePrimary = isPrimary || contacts.length === 0;

      // If this contact is marked primary, unset any other primary contacts
      if (shouldBePrimary) {
        for (const c of contacts) {
          if (c.isPrimary) {
            c.isPrimary = false;
            await EmergencyContactDb.save(c);
          }
        }
      }

      const newContact: IEmergencyContact = {
        id: contactId,
        userId: user.id,
        name: name.trim(),
        relationship: relationship.trim(),
        phone: phone.trim(),
        isPrimary: shouldBePrimary,
        createdAt: Date.now()
      };

      await EmergencyContactDb.save(newContact);
      return res.status(201).json(newContact);
    } catch (error: any) {
      console.error("Error in addContact:", error);
      return res.status(500).json({ error: error.message || "Failed to save emergency contact." });
    }
  }

  // Update an existing contact
  static async updateContact(req: Request, res: Response) {
    try {
      const user = (req as any).user;
      if (!user) {
        return res.status(401).json({ error: "Access denied. Authentication required." });
      }

      const { contactId } = req.params;
      const { name, relationship, phone, isPrimary } = req.body;

      const contact = await EmergencyContactDb.findById(contactId);
      if (!contact || contact.userId !== user.id) {
        return res.status(404).json({ error: "Emergency contact not found." });
      }

      if (!name || !name.trim()) {
        return res.status(400).json({ error: "Contact name is required." });
      }
      if (!relationship || !relationship.trim()) {
        return res.status(400).json({ error: "Relationship status is required." });
      }
      if (!phone || !phone.trim()) {
        return res.status(400).json({ error: "Contact phone number is required." });
      }

      const contacts = await EmergencyContactDb.findByUserId(user.id);

      // If marking this as primary, unset others
      if (isPrimary && !contact.isPrimary) {
        for (const c of contacts) {
          if (c.id !== contactId && c.isPrimary) {
            c.isPrimary = false;
            await EmergencyContactDb.save(c);
          }
        }
      }

      // If unmarking this as primary but it was primary, we should make sure another one becomes primary,
      // or if it's the only one, keep it primary.
      let resolvedIsPrimary = isPrimary;
      if (!isPrimary && contact.isPrimary) {
        const other = contacts.find(c => c.id !== contactId);
        if (other) {
          other.isPrimary = true;
          await EmergencyContactDb.save(other);
          resolvedIsPrimary = false;
        } else {
          // Keep as primary if it's the only contact
          resolvedIsPrimary = true;
        }
      }

      contact.name = name.trim();
      contact.relationship = relationship.trim();
      contact.phone = phone.trim();
      contact.isPrimary = resolvedIsPrimary;

      await EmergencyContactDb.save(contact);
      return res.json(contact);
    } catch (error: any) {
      console.error("Error in updateContact:", error);
      return res.status(500).json({ error: error.message || "Failed to update emergency contact." });
    }
  }

  // Delete an emergency contact (must keep at least 1)
  static async deleteContact(req: Request, res: Response) {
    try {
      const user = (req as any).user;
      if (!user) {
        return res.status(401).json({ error: "Access denied. Authentication required." });
      }

      const { contactId } = req.params;
      const contact = await EmergencyContactDb.findById(contactId);
      if (!contact || contact.userId !== user.id) {
        return res.status(404).json({ error: "Emergency contact not found." });
      }

      const contacts = await EmergencyContactDb.findByUserId(user.id);
      
      // Enforce minimum of 1 contact rule
      if (contacts.length <= 1) {
        return res.status(400).json({ error: "Safety Alert: You must retain at least 1 active emergency contact." });
      }

      // If we are deleting the primary contact, assign primary to the next available contact
      if (contact.isPrimary) {
        const nextPrimary = contacts.find(c => c.id !== contactId);
        if (nextPrimary) {
          nextPrimary.isPrimary = true;
          await EmergencyContactDb.save(nextPrimary);
        }
      }

      await EmergencyContactDb.delete(contactId);
      return res.json({ success: true, message: "Emergency contact removed successfully." });
    } catch (error: any) {
      console.error("Error in deleteContact:", error);
      return res.status(500).json({ error: error.message || "Failed to delete emergency contact." });
    }
  }
}
