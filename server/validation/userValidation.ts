import { IUser } from "../models/User";

export function validateUserUpdate(data: any): { error?: string; validatedData?: Partial<IUser> } {
  const { name, phone, email, role, village, district, vehicleType, vehicleNumber, status } = data;

  const validated: Partial<IUser> = {};

  if (name !== undefined) {
    if (typeof name !== "string" || name.trim().length === 0) {
      return { error: "Name must be a non-empty string" };
    }
    validated.name = name.trim();
  }

  if (phone !== undefined) {
    if (typeof phone !== "string" || !/^\+?[1-9]\d{1,14}$/.test(phone.replace(/\s+/g, ""))) {
      return { error: "Phone number must be a valid international format (e.g. +91 99999 99999)" };
    }
    validated.phone = phone.trim();
  }

  if (email !== undefined) {
    if (email !== null && email !== "" && (typeof email !== "string" || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email))) {
      return { error: "Email must be a valid email format" };
    }
    validated.email = email ? email.trim() : undefined;
  }

  if (role !== undefined) {
    if (!["passenger", "driver", "admin"].includes(role)) {
      return { error: "Role must be 'passenger', 'driver', or 'admin'" };
    }
    validated.role = role as any;
  }

  if (village !== undefined) {
    if (typeof village !== "string" || village.trim().length === 0) {
      return { error: "Village must be a non-empty string" };
    }
    validated.village = village.trim();
  }

  if (district !== undefined) {
    if (typeof district !== "string") {
      return { error: "District must be a string" };
    }
    validated.district = district.trim();
  }

  if (vehicleType !== undefined) {
    if (vehicleType !== null && vehicleType !== "") {
      if (!["Auto Rickshaw", "Bolero SUV", "Tractor Ambulance", "E-Rickshaw"].includes(vehicleType)) {
        return { error: "Invalid vehicle type" };
      }
      validated.vehicleType = vehicleType as any;
    } else {
      validated.vehicleType = undefined;
    }
  }

  if (vehicleNumber !== undefined) {
    validated.vehicleNumber = vehicleNumber ? vehicleNumber.trim() : undefined;
  }

  if (status !== undefined) {
    if (!["active", "suspended"].includes(status)) {
      return { error: "Status must be 'active' or 'suspended'" };
    }
    validated.status = status as any;
  }

  return { validatedData: validated };
}
