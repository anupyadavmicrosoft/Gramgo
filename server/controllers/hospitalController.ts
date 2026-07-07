import { Request, Response } from "express";
import { HospitalDb, IHospital } from "../models/Hospital";

export class HospitalController {
  // Get list of hospitals with optional searches & filters
  static async getHospitals(req: Request, res: Response) {
    try {
      // Auto-seed if needed
      await HospitalDb.seed();

      let hospitals = await HospitalDb.findAll();

      const { q, type, hasVentilator, hasICU, hasBloodBank, hasOxygen, maxDistance } = req.query;

      // 1. Text Search Filter (Matches name, village, specialty)
      if (q && typeof q === "string" && q.trim()) {
        const queryLower = q.toLowerCase();
        hospitals = hospitals.filter(
          (h) =>
            h.name.toLowerCase().includes(queryLower) ||
            h.village.toLowerCase().includes(queryLower) ||
            h.specialty.toLowerCase().includes(queryLower)
        );
      }

      // 2. Type Filter (District Hospital, CHC, PHC, etc)
      if (type && typeof type === "string" && type !== "all") {
        hospitals = hospitals.filter((h) => h.type.toLowerCase() === type.toLowerCase());
      }

      // 3. Equipment/Service Filters
      if (hasVentilator === "true") {
        hospitals = hospitals.filter((h) => h.hasVentilator);
      }
      if (hasICU === "true") {
        hospitals = hospitals.filter((h) => h.hasICU);
      }
      if (hasBloodBank === "true") {
        hospitals = hospitals.filter((h) => h.hasBloodBank);
      }
      if (hasOxygen === "true") {
        hospitals = hospitals.filter((h) => h.hasOxygen);
      }

      // 4. Max Distance filter
      if (maxDistance) {
        const maxDistNum = parseFloat(maxDistance as string);
        if (!isNaN(maxDistNum)) {
          hospitals = hospitals.filter((h) => h.distanceKm <= maxDistNum);
        }
      }

      // Calculate dynamic ETAs based on general transit (average 1.8 mins per kilometer in rural sectors)
      const hospitalsWithETA = hospitals.map((h) => {
        const baseEta = Math.ceil(h.distanceKm * 1.8);
        return {
          ...h,
          etaMinutes: Math.max(3, baseEta) // Minimum 3 minutes
        };
      });

      // Sort by distance (closest first)
      hospitalsWithETA.sort((a, b) => a.distanceKm - b.distanceKm);

      return res.json(hospitalsWithETA);
    } catch (error: any) {
      console.error("Error fetching hospitals:", error);
      return res.status(500).json({ error: error.message || "Failed to load hospitals list." });
    }
  }

  // Get single hospital by ID
  static async getHospitalById(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const hospital = await HospitalDb.findById(id);
      if (!hospital) {
        return res.status(404).json({ error: "Hospital not found." });
      }

      const baseEta = Math.ceil(hospital.distanceKm * 1.8);
      const hospitalWithETA = {
        ...hospital,
        etaMinutes: Math.max(3, baseEta)
      };

      return res.json(hospitalWithETA);
    } catch (error: any) {
      return res.status(500).json({ error: error.message || "Failed to retrieve hospital details." });
    }
  }
}
