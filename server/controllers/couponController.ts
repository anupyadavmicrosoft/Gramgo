import { CouponDb, ICoupon, ICouponCampaign, ICouponRules } from "../models/Coupon";
import { BookingDb } from "../models/Booking";

export const CouponController = {
  // Coupon CRUD
  async getCoupons(req: any, res: any) {
    try {
      const coupons = await CouponDb.getCoupons();
      res.json(coupons);
    } catch (error: any) {
      console.error("Error fetching coupons:", error);
      res.status(500).json({ error: "Failed to fetch coupons." });
    }
  },

  async getCouponByCode(req: any, res: any) {
    const { code } = req.params;
    try {
      const coupon = await CouponDb.getCouponByCode(code);
      if (!coupon) {
        return res.status(404).json({ error: "Coupon not found." });
      }
      res.json(coupon);
    } catch (error: any) {
      console.error("Error fetching coupon by code:", error);
      res.status(500).json({ error: "Failed to fetch coupon." });
    }
  },

  async createCoupon(req: any, res: any) {
    const {
      code, campaignId, rulesId, discountType, discountValue,
      expiryDate, usageLimit, minimumRideAmount, maximumDiscount, status
    } = req.body;

    if (!code || !discountType || discountValue === undefined || !expiryDate) {
      return res.status(400).json({ error: "Code, discount type, value, and expiry date are required." });
    }

    try {
      const existing = await CouponDb.getCouponByCode(code);
      if (existing) {
        return res.status(400).json({ error: `Coupon with code ${code.toUpperCase()} already exists.` });
      }

      const id = `coup_${Date.now()}`;
      const newCoupon = await CouponDb.createCoupon({
        id,
        code: code.toUpperCase().trim(),
        campaignId: campaignId || undefined,
        rulesId: rulesId || undefined,
        discountType,
        discountValue: Number(discountValue),
        expiryDate: new Date(expiryDate),
        usageLimit: usageLimit !== undefined ? Number(usageLimit) : 100,
        timesUsed: 0,
        minimumRideAmount: minimumRideAmount !== undefined ? Number(minimumRideAmount) : 0,
        maximumDiscount: maximumDiscount !== undefined ? Number(maximumDiscount) : 500,
        status: status || "active"
      });

      res.status(201).json(newCoupon);
    } catch (error: any) {
      console.error("Error creating coupon:", error);
      res.status(500).json({ error: "Failed to create coupon." });
    }
  },

  async updateCoupon(req: any, res: any) {
    const { id } = req.params;
    try {
      const updates = { ...req.body };
      if (updates.expiryDate) {
        updates.expiryDate = new Date(updates.expiryDate);
      }
      if (updates.code) {
        updates.code = updates.code.toUpperCase().trim();
      }

      const updated = await CouponDb.updateCoupon(id, updates);
      if (!updated) {
        return res.status(404).json({ error: "Coupon not found." });
      }
      res.json(updated);
    } catch (error: any) {
      console.error("Error updating coupon:", error);
      res.status(500).json({ error: "Failed to update coupon." });
    }
  },

  async deleteCoupon(req: any, res: any) {
    const { id } = req.params;
    try {
      const success = await CouponDb.deleteCoupon(id);
      if (!success) {
        return res.status(404).json({ error: "Coupon not found." });
      }
      res.json({ success: true, message: "Coupon deleted successfully." });
    } catch (error: any) {
      console.error("Error deleting coupon:", error);
      res.status(500).json({ error: "Failed to delete coupon." });
    }
  },

  // Campaigns CRUD
  async getCampaigns(req: any, res: any) {
    try {
      const campaigns = await CouponDb.getCampaigns();
      res.json(campaigns);
    } catch (error: any) {
      console.error("Error fetching campaigns:", error);
      res.status(500).json({ error: "Failed to fetch campaigns." });
    }
  },

  async createCampaign(req: any, res: any) {
    const { name, description, startDate, endDate, budget, status } = req.body;
    if (!name || !description || !startDate || !endDate || budget === undefined) {
      return res.status(400).json({ error: "Missing required campaign fields (name, description, dates, budget)." });
    }

    try {
      const id = `camp_${Date.now()}`;
      const campaign = await CouponDb.createCampaign({
        id,
        name,
        description,
        startDate: new Date(startDate),
        endDate: new Date(endDate),
        budget: Number(budget),
        status: status || "draft"
      });
      res.status(201).json(campaign);
    } catch (error: any) {
      console.error("Error creating campaign:", error);
      res.status(500).json({ error: "Failed to create campaign." });
    }
  },

  async updateCampaign(req: any, res: any) {
    const { id } = req.params;
    try {
      const updates = { ...req.body };
      if (updates.startDate) updates.startDate = new Date(updates.startDate);
      if (updates.endDate) updates.endDate = new Date(updates.endDate);

      const updated = await CouponDb.updateCampaign(id, updates);
      if (!updated) {
        return res.status(404).json({ error: "Campaign not found." });
      }
      res.json(updated);
    } catch (error: any) {
      console.error("Error updating campaign:", error);
      res.status(500).json({ error: "Failed to update campaign." });
    }
  },

  async deleteCampaign(req: any, res: any) {
    const { id } = req.params;
    try {
      const success = await CouponDb.deleteCampaign(id);
      if (!success) {
        return res.status(404).json({ error: "Campaign not found." });
      }
      res.json({ success: true, message: "Campaign deleted successfully." });
    } catch (error: any) {
      console.error("Error deleting campaign:", error);
      res.status(500).json({ error: "Failed to delete campaign." });
    }
  },

  // Rules CRUD
  async getRules(req: any, res: any) {
    try {
      const rules = await CouponDb.getRules();
      res.json(rules);
    } catch (error: any) {
      console.error("Error fetching rules:", error);
      res.status(500).json({ error: "Failed to fetch coupon rules." });
    }
  },

  async createRules(req: any, res: any) {
    const { allowedEmergencyTypes, allowedVillages, allowedVehicleTypes, userRideCountLimit } = req.body;
    try {
      const id = `rule_${Date.now()}`;
      const rule = await CouponDb.createRules({
        id,
        allowedEmergencyTypes: allowedEmergencyTypes || [],
        allowedVillages: allowedVillages || [],
        allowedVehicleTypes: allowedVehicleTypes || [],
        userRideCountLimit: userRideCountLimit !== undefined ? Number(userRideCountLimit) : 1
      });
      res.status(201).json(rule);
    } catch (error: any) {
      console.error("Error creating rules:", error);
      res.status(500).json({ error: "Failed to create coupon rules." });
    }
  },

  async updateRules(req: any, res: any) {
    const { id } = req.params;
    try {
      const updated = await CouponDb.updateRules(id, req.body);
      if (!updated) {
        return res.status(404).json({ error: "Rules config not found." });
      }
      res.json(updated);
    } catch (error: any) {
      console.error("Error updating rules:", error);
      res.status(500).json({ error: "Failed to update rules." });
    }
  },

  async deleteRules(req: any, res: any) {
    const { id } = req.params;
    try {
      const success = await CouponDb.deleteRules(id);
      if (!success) {
        return res.status(404).json({ error: "Rules config not found." });
      }
      res.json({ success: true, message: "Coupon rules configuration deleted." });
    } catch (error: any) {
      console.error("Error deleting rules:", error);
      res.status(500).json({ error: "Failed to delete rules." });
    }
  },

  // Validation API
  async validateCoupon(req: any, res: any) {
    const { code, rideAmount, emergencyType, village, vehicleType } = req.body;
    const userId = req.user.id;

    if (!code) {
      return res.status(400).json({ error: "Coupon code is required." });
    }

    try {
      const coupon = await CouponDb.getCouponByCode(code);
      if (!coupon) {
        return res.status(400).json({ error: "Invalid coupon code." });
      }

      // Check Status
      if (coupon.status !== "active") {
        return res.status(400).json({ error: `Coupon is ${coupon.status}.` });
      }

      // Check Expiry
      const now = new Date();
      if (new Date(coupon.expiryDate).getTime() < now.getTime()) {
        await CouponDb.updateCoupon(coupon.id, { status: "expired" });
        return res.status(400).json({ error: "Coupon has expired." });
      }

      // Check Global Usage Limit
      if (coupon.timesUsed >= coupon.usageLimit) {
        return res.status(400).json({ error: "Coupon usage limit has been reached." });
      }

      // Check Ride Amount
      if (rideAmount !== undefined && Number(rideAmount) < coupon.minimumRideAmount) {
        return res.status(400).json({ 
          error: `Minimum ride amount of ₹${coupon.minimumRideAmount} required. Your ride is ₹${rideAmount}.` 
        });
      }

      // Check Custom Rules
      if (coupon.rulesId) {
        const rules = await CouponDb.getRulesById(coupon.rulesId);
        if (rules) {
          // Check Emergency Type
          if (emergencyType && rules.allowedEmergencyTypes && rules.allowedEmergencyTypes.length > 0) {
            const allowed = rules.allowedEmergencyTypes.map(t => t.toLowerCase());
            if (!allowed.includes(emergencyType.toLowerCase())) {
              return res.status(400).json({ 
                error: `This coupon is not valid for '${emergencyType}' emergencies.` 
              });
            }
          }

          // Check Village
          if (village && rules.allowedVillages && rules.allowedVillages.length > 0) {
            const allowed = rules.allowedVillages.map(v => v.toLowerCase());
            if (!allowed.includes(village.toLowerCase())) {
              return res.status(400).json({ 
                error: `This coupon is not available for transits starting in village: ${village}.` 
              });
            }
          }

          // Check Vehicle Type
          if (vehicleType && rules.allowedVehicleTypes && rules.allowedVehicleTypes.length > 0) {
            const allowed = rules.allowedVehicleTypes.map(vt => vt.toLowerCase());
            if (!allowed.includes(vehicleType.toLowerCase())) {
              return res.status(400).json({ 
                error: `This coupon is not valid for ${vehicleType} vehicle type transits.` 
              });
            }
          }

          // Check User-Specific Usage Limit
          if (rules.userRideCountLimit) {
            const userUsages = await CouponDb.getUsagesByUserId(userId);
            const thisCouponUsages = userUsages.filter(u => u.couponId === coupon.id);
            if (thisCouponUsages.length >= rules.userRideCountLimit) {
              return res.status(400).json({ 
                error: `You have already used this coupon ${thisCouponUsages.length} time(s). Limit is ${rules.userRideCountLimit}.` 
              });
            }
          }
        }
      }

      // Calculate Discount
      let discountApplied = 0;
      const amt = Number(rideAmount) || 0;
      if (coupon.discountType === "fixed") {
        discountApplied = Math.min(amt, coupon.discountValue);
      } else {
        discountApplied = Math.round((amt * coupon.discountValue) / 100);
        discountApplied = Math.min(discountApplied, coupon.maximumDiscount);
      }

      res.json({
        success: true,
        coupon,
        discountApplied,
        message: `Coupon '${coupon.code}' applied successfully!`
      });
    } catch (error: any) {
      console.error("Coupon validation error:", error);
      res.status(500).json({ error: "Failed to validate coupon." });
    }
  },

  // Apply Coupon (Claim/Debit logic)
  async applyCoupon(req: any, res: any) {
    const { code, rideId, rideAmount, emergencyType, village, vehicleType } = req.body;
    const userId = req.user.id;

    if (!code || !rideId) {
      return res.status(400).json({ error: "Coupon code and Ride ID are required." });
    }

    try {
      const coupon = await CouponDb.getCouponByCode(code);
      if (!coupon) {
        return res.status(400).json({ error: "Invalid coupon code." });
      }

      // Verify constraints again before creating usage entry
      if (coupon.status !== "active") {
        return res.status(400).json({ error: "Coupon is inactive/expired." });
      }

      const now = new Date();
      if (new Date(coupon.expiryDate).getTime() < now.getTime()) {
        await CouponDb.updateCoupon(coupon.id, { status: "expired" });
        return res.status(400).json({ error: "Coupon has expired." });
      }

      if (coupon.timesUsed >= coupon.usageLimit) {
        return res.status(400).json({ error: "Coupon usage limit reached." });
      }

      // Check User Limit
      if (coupon.rulesId) {
        const rules = await CouponDb.getRulesById(coupon.rulesId);
        if (rules && rules.userRideCountLimit) {
          const userUsages = await CouponDb.getUsagesByUserId(userId);
          const thisCouponUsages = userUsages.filter(u => u.couponId === coupon.id);
          if (thisCouponUsages.length >= rules.userRideCountLimit) {
            return res.status(400).json({ error: "You have exceeded your usage limit for this coupon." });
          }
        }
      }

      // Calculate Discount
      let discountApplied = 0;
      const amt = Number(rideAmount) || 0;
      if (coupon.discountType === "fixed") {
        discountApplied = Math.min(amt, coupon.discountValue);
      } else {
        discountApplied = Math.round((amt * coupon.discountValue) / 100);
        discountApplied = Math.min(discountApplied, coupon.maximumDiscount);
      }

      // Increment Coupon timesUsed
      await CouponDb.incrementCouponUsage(code);

      // Create CouponUsage record
      const usageId = `usg_${Date.now()}`;
      const newUsage = await CouponDb.createUsage({
        id: usageId,
        couponId: coupon.id,
        couponCode: coupon.code,
        userId,
        rideId,
        discountApplied
      });

      // Update the booking itself with coupon info
      try {
        const booking = await BookingDb.findById(rideId);
        if (booking) {
          await BookingDb.updateStatus(rideId, booking.status, {
            couponCode: coupon.code,
            discountApplied: discountApplied
          });
        }
      } catch (bookingUpdateErr) {
        console.error("Failed to update booking with coupon details:", bookingUpdateErr);
      }

      res.status(201).json({
        success: true,
        message: "Coupon applied and transaction registered.",
        usage: newUsage,
        discountApplied
      });
    } catch (error: any) {
      console.error("Error applying coupon:", error);
      res.status(500).json({ error: "Failed to apply coupon." });
    }
  },

  // Get Analytics & Coupon Usage Report
  async getAnalytics(req: any, res: any) {
    try {
      const coupons = await CouponDb.getCoupons();
      const usages = await CouponDb.getUsages();
      const campaigns = await CouponDb.getCampaigns();

      const totalDiscounts = usages.reduce((sum, u) => sum + u.discountApplied, 0);

      // Calculate campaign budget utilisations
      const campaignStats = campaigns.map(camp => {
        const campCoupons = coupons.filter(c => c.campaignId === camp.id);
        const campCouponIds = campCoupons.map(c => c.id);
        const campUsages = usages.filter(u => campCouponIds.includes(u.couponId));
        const usedBudget = campUsages.reduce((sum, u) => sum + u.discountApplied, 0);

        return {
          id: camp.id,
          name: camp.name,
          totalBudget: camp.budget,
          spentBudget: usedBudget,
          remainingBudget: Math.max(0, camp.budget - usedBudget),
          usageCount: campUsages.length,
          status: camp.status
        };
      });

      // Group usages by day for trend charts
      const usagesByDay: Record<string, { count: number; savings: number }> = {};
      usages.forEach(u => {
        const dateStr = new Date(u.usedAt).toLocaleDateString(undefined, { month: "short", day: "numeric" });
        if (!usagesByDay[dateStr]) {
          usagesByDay[dateStr] = { count: 0, savings: 0 };
        }
        usagesByDay[dateStr].count += 1;
        usagesByDay[dateStr].savings += u.discountApplied;
      });

      const trendData = Object.keys(usagesByDay).map(date => ({
        date,
        usagesCount: usagesByDay[date].count,
        discountsValue: usagesByDay[date].savings
      })).slice(-7); // Last 7 days

      res.json({
        totalCoupons: coupons.length,
        activeCoupons: coupons.filter(c => c.status === "active").length,
        totalRedemptions: usages.length,
        totalDiscountsGiven: totalDiscounts,
        campaignStats,
        trendData
      });
    } catch (error: any) {
      console.error("Error building coupon analytics:", error);
      res.status(500).json({ error: "Failed to fetch coupon analytics." });
    }
  }
};
