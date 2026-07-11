import express from "express";
import path from "path";
import fs from "fs";
import mongoose from "mongoose";
import { createServer as createViteServer } from "vite";
import { GoogleGenAI } from "@google/genai";
import dotenv from "dotenv";
import jwt from "jsonwebtoken";
import bcrypt from "bcryptjs";
import { UserDb } from "./server/models/User";
import { RoleDb } from "./server/models/Role";
import { PermissionDb } from "./server/models/Permission";
import { PaymentDb, ReportDb, SupportDb } from "./server/models/SearchData";
import { BookingDb, IBooking } from "./server/models/Booking";
import { RideRequestDb, IRideRequest } from "./server/models/RideRequest";
import { EmergencyRideDb, RideCancellationDb } from "./server/models/EmergencyRide";
import { HospitalDb } from "./server/models/Hospital";
import { geocodeAddress, computeDirections } from "./server/services/locationService";
import { HospitalController } from "./server/controllers/hospitalController";
import { PriorityEngine } from "./server/services/priorityEngine";
import { EmergencyNotificationDb } from "./server/models/EmergencyNotification";
import { NotificationService } from "./server/services/notificationService";
import { WalletService } from "./server/services/walletService";
import { ReferralService } from "./server/services/referralService";
import { WithdrawalRequestDb } from "./server/models/WithdrawalRequest";
import { WalletDb } from "./server/models/Wallet";
import couponRoutes from "./server/routes/couponRoutes";
import { seedCouponData } from "./server/models/Coupon";
import reviewRoutes from "./server/routes/reviewRoutes";
import { ReviewDb } from "./server/models/Review";
import chatRoutes from "./server/routes/chatRoutes";
import { MessageDb } from "./server/models/Message";
import { CallDb } from "./server/models/Call";
import { UserNotificationDb } from "./server/models/UserNotification";
import whatsAppRoutes from "./server/routes/whatsAppRoutes";
import { WhatsAppService } from "./server/services/whatsAppService";
import { WhatsAppOtpDb } from "./server/models/WhatsAppOtp";

dotenv.config();

const JWT_SECRET = process.env.JWT_SECRET || "gramgo_secure_jwt_secret_key_2026";

const app = express();
const PORT = 3000;

import { createServer as createHttpServer } from "http";
import { Server as SocketIOServer } from "socket.io";

const httpServer = createHttpServer(app);
const io = new SocketIOServer(httpServer, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"]
  }
});

(global as any).ioInstance = io;

io.on("connection", (socket) => {
  console.log("Client connected via Socket.IO:", socket.id);

  // Join Ride
  socket.on("join_ride", (data) => {
    const rideId = typeof data === "string" ? data : data?.rideId;
    if (rideId) {
      socket.join(`ride_${rideId}`);
      console.log(`Socket ${socket.id} joined ride_${rideId}`);
      socket.emit("joined_ride", { rideId });
    }
  });
  socket.on("Join Ride", (data) => {
    const rideId = typeof data === "string" ? data : data?.rideId;
    if (rideId) {
      socket.join(`ride_${rideId}`);
      console.log(`Socket ${socket.id} joined ride_${rideId} via Join Ride`);
      socket.emit("joined_ride", { rideId });
    }
  });
  socket.on("join:ride", (data) => {
    const rideId = typeof data === "string" ? data : data?.rideId;
    if (rideId) {
      socket.join(`ride_${rideId}`);
      console.log(`Socket ${socket.id} joined ride_${rideId} via join:ride`);
      socket.emit("joined_ride", { rideId });
    }
  });

  // Leave Ride
  socket.on("leave_ride", (data) => {
    const rideId = typeof data === "string" ? data : data?.rideId;
    if (rideId) {
      socket.leave(`ride_${rideId}`);
      console.log(`Socket ${socket.id} left ride_${rideId}`);
      socket.emit("left_ride", { rideId });
    }
  });
  socket.on("Leave Ride", (data) => {
    const rideId = typeof data === "string" ? data : data?.rideId;
    if (rideId) {
      socket.leave(`ride_${rideId}`);
      console.log(`Socket ${socket.id} left ride_${rideId} via Leave Ride`);
    }
  });
  socket.on("leave:ride", (data) => {
    const rideId = typeof data === "string" ? data : data?.rideId;
    if (rideId) {
      socket.leave(`ride_${rideId}`);
      console.log(`Socket ${socket.id} left ride_${rideId} via leave:ride`);
    }
  });

  // Location Update (Driver continuously sends GPS location)
  socket.on("location_update", (data) => {
    const { rideId, driverId, latitude, longitude } = data || {};
    if (rideId && latitude && longitude) {
      io.to(`ride_${rideId}`).emit("location_update", { rideId, driverId, latitude, longitude, timestamp: Date.now() });
      io.to(`ride_${rideId}`).emit("Location Update", { rideId, driverId, latitude, longitude, timestamp: Date.now() });
      io.to(`ride_${rideId}`).emit("location:update", { rideId, driverId, latitude, longitude, timestamp: Date.now() });
      console.log(`Socket location_update: ride_${rideId} coords: ${latitude}, ${longitude}`);
    }
  });
  socket.on("Location Update", (data) => {
    const { rideId, driverId, latitude, longitude } = data || {};
    if (rideId && latitude && longitude) {
      io.to(`ride_${rideId}`).emit("location_update", { rideId, driverId, latitude, longitude, timestamp: Date.now() });
      io.to(`ride_${rideId}`).emit("Location Update", { rideId, driverId, latitude, longitude, timestamp: Date.now() });
      io.to(`ride_${rideId}`).emit("location:update", { rideId, driverId, latitude, longitude, timestamp: Date.now() });
    }
  });
  socket.on("location:update", (data) => {
    const { rideId, driverId, latitude, longitude } = data || {};
    if (rideId && latitude && longitude) {
      io.to(`ride_${rideId}`).emit("location_update", { rideId, driverId, latitude, longitude, timestamp: Date.now() });
      io.to(`ride_${rideId}`).emit("Location Update", { rideId, driverId, latitude, longitude, timestamp: Date.now() });
      io.to(`ride_${rideId}`).emit("location:update", { rideId, driverId, latitude, longitude, timestamp: Date.now() });
    }
  });

  // Ride Status
  socket.on("ride_status", (data) => {
    const { rideId, status } = data || {};
    if (rideId && status) {
      const rList = (global as any).emergencyRides || [];
      const ride = rList.find((r: any) => r.id === rideId);
      if (ride) {
        ride.status = status;
      }
      io.to(`ride_${rideId}`).emit("ride_status", { rideId, status });
      io.to(`ride_${rideId}`).emit("Ride Status", { rideId, status });
      io.to(`ride_${rideId}`).emit("ride:status", { rideId, status });
      console.log(`Socket ride_status: ride_${rideId} status: ${status}`);
    }
  });
  socket.on("Ride Status", (data) => {
    const { rideId, status } = data || {};
    if (rideId && status) {
      const rList = (global as any).emergencyRides || [];
      const ride = rList.find((r: any) => r.id === rideId);
      if (ride) {
        ride.status = status;
      }
      io.to(`ride_${rideId}`).emit("ride_status", { rideId, status });
      io.to(`ride_${rideId}`).emit("Ride Status", { rideId, status });
      io.to(`ride_${rideId}`).emit("ride:status", { rideId, status });
    }
  });
  socket.on("ride:status", (data) => {
    const { rideId, status } = data || {};
    if (rideId && status) {
      const rList = (global as any).emergencyRides || [];
      const ride = rList.find((r: any) => r.id === rideId);
      if (ride) {
        ride.status = status;
      }
      io.to(`ride_${rideId}`).emit("ride_status", { rideId, status });
      io.to(`ride_${rideId}`).emit("Ride Status", { rideId, status });
      io.to(`ride_${rideId}`).emit("ride:status", { rideId, status });
    }
  });

  // Join Conversation Room
  socket.on("join_conversation", (data) => {
    const conversationId = typeof data === "string" ? data : data?.conversationId;
    if (conversationId) {
      socket.join(`conversation_${conversationId}`);
      console.log(`Socket ${socket.id} joined conversation_${conversationId}`);
      socket.emit("joined_conversation", { conversationId });
    }
  });

  socket.on("Join Conversation", (data) => {
    const conversationId = typeof data === "string" ? data : data?.conversationId;
    if (conversationId) {
      socket.join(`conversation_${conversationId}`);
      console.log(`Socket ${socket.id} joined conversation_${conversationId}`);
    }
  });

  socket.on("join:conversation", (data) => {
    const conversationId = typeof data === "string" ? data : data?.conversationId;
    if (conversationId) {
      socket.join(`conversation_${conversationId}`);
      console.log(`Socket ${socket.id} joined conversation_${conversationId}`);
    }
  });

  // Leave Conversation Room
  socket.on("leave_conversation", (data) => {
    const conversationId = typeof data === "string" ? data : data?.conversationId;
    if (conversationId) {
      socket.leave(`conversation_${conversationId}`);
      console.log(`Socket ${socket.id} left conversation_${conversationId}`);
      socket.emit("left_conversation", { conversationId });
    }
  });

  socket.on("Leave Conversation", (data) => {
    const conversationId = typeof data === "string" ? data : data?.conversationId;
    if (conversationId) {
      socket.leave(`conversation_${conversationId}`);
      console.log(`Socket ${socket.id} left conversation_${conversationId}`);
    }
  });

  socket.on("leave:conversation", (data) => {
    const conversationId = typeof data === "string" ? data : data?.conversationId;
    if (conversationId) {
      socket.leave(`conversation_${conversationId}`);
      console.log(`Socket ${socket.id} left conversation_${conversationId}`);
    }
  });

  // User Presence (Online Status / Offline Status)
  socket.on("user:online", (data) => {
    const { userId, userName, role } = data || {};
    if (userId) {
      (socket as any).userId = userId;
      (global as any).onlineUsers = (global as any).onlineUsers || {};
      (global as any).onlineUsers[userId] = {
        socketId: socket.id,
        userName,
        role,
        lastSeen: Date.now()
      };
      console.log(`Presence: User ${userId} (${userName}) is online.`);
      io.emit("presence:update", {
        userId,
        status: "online",
        lastSeen: Date.now()
      });
    }
  });

  // Real-time Typing Indicators
  socket.on("typing:start", (data) => {
    const { conversationId, userId, userName } = data || {};
    if (conversationId && userId) {
      socket.to(`conversation_${conversationId}`).emit("typing:status", {
        conversationId,
        userId,
        userName,
        isTyping: true
      });
    }
  });

  socket.on("typing:stop", (data) => {
    const { conversationId, userId } = data || {};
    if (conversationId && userId) {
      socket.to(`conversation_${conversationId}`).emit("typing:status", {
        conversationId,
        userId,
        isTyping: false
      });
    }
  });

  // Real-time Read Receipts (Delivered / Seen)
  socket.on("message:read", async (data) => {
    const { conversationId, userId } = data || {};
    if (conversationId && userId) {
      try {
        await MessageDb.markAsRead(conversationId, userId);
        io.to(`conversation_${conversationId}`).emit("messages:read", {
          conversationId,
          userId
        });
      } catch (err) {
        console.error("Error marking messages as read from socket:", err);
      }
    }
  });

  // WebRTC Voice Calling signaling
  socket.on("call:initiate", (data) => {
    const { conversationId, callerId, callerName, receiverId, sdp } = data || {};
    const onlineUsers = (global as any).onlineUsers || {};
    const receiverSession = onlineUsers[receiverId];
    
    if (receiverSession && receiverSession.socketId) {
      io.to(receiverSession.socketId).emit("call:incoming", {
        conversationId,
        callerId,
        callerName,
        sdp
      });
    } else {
      socket.emit("call:failed", {
        conversationId,
        error: "Recipient is currently offline"
      });
    }
  });

  socket.on("call:accept", (data) => {
    const { conversationId, callerId, receiverId, sdp } = data || {};
    const onlineUsers = (global as any).onlineUsers || {};
    const callerSession = onlineUsers[callerId];
    
    if (callerSession && callerSession.socketId) {
      io.to(callerSession.socketId).emit("call:accepted", {
        conversationId,
        receiverId,
        sdp
      });
    }
  });

  socket.on("call:signal", (data) => {
    const { conversationId, targetId, senderId, signalData } = data || {};
    const onlineUsers = (global as any).onlineUsers || {};
    const targetSession = onlineUsers[targetId];
    
    if (targetSession && targetSession.socketId) {
      io.to(targetSession.socketId).emit("call:signal", {
        conversationId,
        senderId,
        signalData
      });
    }
  });

  socket.on("call:reject", (data) => {
    const { conversationId, callerId, receiverId } = data || {};
    const onlineUsers = (global as any).onlineUsers || {};
    const callerSession = onlineUsers[callerId];
    
    if (callerSession && callerSession.socketId) {
      io.to(callerSession.socketId).emit("call:rejected", {
        conversationId,
        receiverId
      });
    }
  });

  socket.on("call:end", (data) => {
    const { conversationId, otherUserId } = data || {};
    const onlineUsers = (global as any).onlineUsers || {};
    const otherSession = onlineUsers[otherUserId];
    
    if (otherSession && otherSession.socketId) {
      io.to(otherSession.socketId).emit("call:ended", {
        conversationId
      });
    }
  });

  socket.on("disconnect", () => {
    console.log("Client disconnected:", socket.id);
    const userId = (socket as any).userId;
    if (userId) {
      (global as any).onlineUsers = (global as any).onlineUsers || {};
      delete (global as any).onlineUsers[userId];
      console.log(`Presence: User ${userId} is offline.`);
      io.emit("presence:update", {
        userId,
        status: "offline",
        lastSeen: Date.now()
      });
    }
  });
});

app.use(express.json({ limit: "50mb" }));
app.use(express.urlencoded({ limit: "50mb", extended: true }));

const uploadsDir = path.join(process.cwd(), "uploads");
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}
app.use("/uploads", express.static(uploadsDir));

// In-Memory Database for demonstration and local play
interface Driver {
  id: string;
  name: string;
  phone: string;
  vehicleType: "Auto Rickshaw" | "Bolero SUV" | "Tractor Ambulance" | "E-Rickshaw";
  vehicleNumber: string;
  village: string;
  district: string;
  status: "available" | "busy" | "offline";
  rating: number;
  completedTrips: number;
}

interface CommunityHealthCentre {
  id: string;
  name: string;
  village: string;
  distanceKm: number;
  bedsAvailable: number;
  doctorsCount: number;
  contactNumber: string;
  hasVentilator: boolean;
  specialty: string;
}

interface EmergencyRide {
  id: string;
  passengerId?: string;
  patientName: string;
  patientPhone: string;
  emergencyType: "Maternity" | "Accident/Trauma" | "Severe Illness" | "Cardiac" | "Other";
  priority: "critical" | "urgent" | "non-urgent";
  village: string;
  landmark: string;
  driverId?: string;
  driverName?: string;
  driverPhone?: string;
  vehicleType?: string;
  status: "requested" | "searching" | "driver_assigned" | "driver_arriving" | "reached_pickup" | "ride_started" | "completed" | "cancelled" | "Emergency Requested" | "Searching Driver" | "Driver Assigned" | "Driver Arriving" | "Passenger Picked" | "Hospital Reached" | "Completed" | "Cancelled";
  createdAt: number;
  destinationChc: string;
  isManual?: boolean;
  cancelledBy?: "passenger" | "driver" | "admin";
  cancelReason?: string;
  cancelledAt?: number;
  // Summary Fields
  completedAt?: number;
  distanceKm?: number;
  durationMin?: number;
  fareRupees?: number;
  paymentStatus?: "subsidized" | "pending" | "paid" | "free";
  passengerName?: string;
  passengerPhone?: string;
}

interface RideCancellationLog {
  id: string;
  rideId: string;
  patientName: string;
  emergencyType: string;
  cancelledBy: "passenger" | "driver" | "admin";
  cancelledById: string;
  cancelledByName: string;
  reason: string;
  createdAt: number;
}

// Seed Data
const drivers: Driver[] = [
  {
    id: "drv_1",
    name: "Ramesh Yadav",
    phone: "+91 98765 43210",
    vehicleType: "Tractor Ambulance",
    vehicleNumber: "UP-61-AB-1234",
    village: "Gauspur",
    district: "Ghazipur",
    status: "available",
    rating: 4.9,
    completedTrips: 42,
  },
  {
    id: "drv_2",
    name: "Amit Sharma",
    phone: "+91 87654 32109",
    vehicleType: "Bolero SUV",
    vehicleNumber: "UP-61-XY-5678",
    village: "Karimpur",
    district: "Ghazipur",
    status: "available",
    rating: 4.8,
    completedTrips: 29,
  },
  {
    id: "drv_3",
    name: "Savita Devi",
    phone: "+91 76543 21098",
    vehicleType: "E-Rickshaw",
    vehicleNumber: "UP-61-ER-9012",
    village: "Malikpur",
    district: "Ghazipur",
    status: "available",
    rating: 4.7,
    completedTrips: 18,
  },
  {
    id: "drv_4",
    name: "Mohammad Yusuf",
    phone: "+91 99887 76655",
    vehicleType: "Auto Rickshaw",
    vehicleNumber: "UP-61-AR-4433",
    village: "Sherpur",
    district: "Ghazipur",
    status: "busy",
    rating: 4.6,
    completedTrips: 34,
  }
];

const chcs: CommunityHealthCentre[] = [
  {
    id: "chc_1",
    name: "Community Health Centre, Sherpur",
    village: "Sherpur",
    distanceKm: 4.2,
    bedsAvailable: 12,
    doctorsCount: 3,
    contactNumber: "0548-2220108",
    hasVentilator: true,
    specialty: "Maternity & Trauma Care",
  },
  {
    id: "chc_2",
    name: "Primary Health Centre, Malikpur",
    village: "Malikpur",
    distanceKm: 7.5,
    bedsAvailable: 4,
    doctorsCount: 1,
    contactNumber: "0548-2220102",
    hasVentilator: false,
    specialty: "General Medicine & Outpatient",
  },
  {
    id: "chc_3",
    name: "Sub-District Hospital, Mohammadabad",
    village: "Mohammadabad",
    distanceKm: 12.0,
    bedsAvailable: 45,
    doctorsCount: 8,
    contactNumber: "0548-2234567",
    hasVentilator: true,
    specialty: "Comprehensive Surgery, Pediatric & Gynaecology",
  }
];

const emergencyRides: EmergencyRide[] = [
  {
    id: "ride_seed_1",
    passengerId: "usr_passenger",
    patientName: "Anjali Devi",
    patientPhone: "+91 95551 23456",
    emergencyType: "Maternity",
    priority: "critical",
    village: "Sherpur",
    landmark: "Panchayat Bhavan",
    driverId: "drv_2",
    driverName: "Amit Sharma",
    driverPhone: "+91 87654 32109",
    vehicleType: "Bolero SUV",
    status: "completed",
    createdAt: Date.now() - 4 * 3600 * 1000, // 4 hours ago (today)
    destinationChc: "Community Health Centre, Sherpur"
  },
  {
    id: "ride_seed_2",
    passengerId: "usr_passenger",
    patientName: "Rajesh Kumar",
    patientPhone: "+91 96662 34567",
    emergencyType: "Cardiac",
    priority: "critical",
    village: "Karimpur",
    landmark: "Near Shiva Temple",
    driverId: "drv_1",
    driverName: "Ramesh Yadav",
    driverPhone: "+91 98765 43210",
    vehicleType: "Tractor Ambulance",
    status: "completed",
    createdAt: Date.now() - 26 * 3600 * 1000, // 26 hours ago (yesterday)
    destinationChc: "Sub-District Hospital, Mohammadabad"
  },
  {
    id: "ride_seed_3",
    passengerId: "usr_passenger",
    patientName: "Harish Chandra",
    patientPhone: "+91 97773 45678",
    emergencyType: "Accident/Trauma",
    priority: "urgent",
    village: "Gauspur",
    landmark: "Highway Mile 12",
    status: "cancelled",
    createdAt: Date.now() - 2 * 3600 * 1000, // 2 hours ago (today)
    destinationChc: "Primary Health Centre, Malikpur"
  },
  {
    id: "ride_seed_4",
    passengerId: "usr_passenger",
    patientName: "Lalta Prasad",
    patientPhone: "+91 98884 56789",
    emergencyType: "Severe Illness",
    priority: "non-urgent",
    village: "Malikpur",
    landmark: "Post Office Road",
    driverId: "drv_3",
    driverName: "Savita Devi",
    driverPhone: "+91 76543 21098",
    vehicleType: "E-Rickshaw",
    status: "completed",
    createdAt: Date.now() - 48 * 3600 * 1000, // 2 days ago
    destinationChc: "Primary Health Centre, Malikpur"
  }
];

// Attach to global for shared controller/service access
(global as any).drivers = drivers;
(global as any).emergencyRides = emergencyRides;

// Seed default emergency rides and load existing rides from Mongo on startup
async function initEmergencyRides() {
  try {
    // Save seed data to DB
    await EmergencyRideDb.bulkSave(emergencyRides);
    
    // Fetch all rides from DB to sync back to the in-memory array
    const dbRides = await EmergencyRideDb.findAll();
    if (dbRides && dbRides.length > 0) {
      emergencyRides.length = 0;
      emergencyRides.push(...dbRides);
    }
    console.log(`[GramGo Status] Synced ${emergencyRides.length} emergency rides with MongoDB.`);
  } catch (err) {
    console.error("Failed to initialize emergency rides DB syncing:", err);
  }
}

// Call initEmergencyRides
setTimeout(() => {
  initEmergencyRides();
  seedCouponData().catch(err => console.error("Coupon seeding failed:", err));
  ReviewDb.seedOnMongo().catch(err => console.error("Review seeding failed:", err));
}, 2500);

// Helper to sync driver changes from DB updates
(global as any).syncDriverFromDb = (updatedDriver: any) => {
  const index = drivers.findIndex(d => d.id === updatedDriver.id);
  if (index !== -1) {
    drivers[index].name = updatedDriver.name;
    drivers[index].phone = updatedDriver.phone;
    drivers[index].village = updatedDriver.village;
    drivers[index].district = updatedDriver.district || "Ghazipur";
    if (updatedDriver.vehicleType) drivers[index].vehicleType = updatedDriver.vehicleType;
    if (updatedDriver.vehicleNumber) drivers[index].vehicleNumber = updatedDriver.vehicleNumber;
    if (updatedDriver.status === "suspended") {
      drivers[index].status = "offline";
    }
  } else if (updatedDriver.role === "driver") {
    drivers.push({
      id: updatedDriver.id,
      name: updatedDriver.name,
      phone: updatedDriver.phone,
      vehicleType: updatedDriver.vehicleType || "Auto Rickshaw",
      vehicleNumber: updatedDriver.vehicleNumber || "UP-61-AB-1122",
      village: updatedDriver.village,
      district: updatedDriver.district || "Ghazipur",
      status: updatedDriver.status === "suspended" ? "offline" : "available",
      rating: 5.0,
      completedTrips: 0
    });
  }
};

(global as any).removeDriverFromActive = (driverId: string) => {
  const index = drivers.findIndex(d => d.id === driverId);
  if (index !== -1) {
    drivers.splice(index, 1);
  }
};

// Notifications State
interface Notification {
  id: string;
  userId: string;
  title: string;
  message: string;
  type: "info" | "success" | "warning" | "error";
  createdAt: number;
  read: boolean;
}

const notifications: Notification[] = [];

// User Settings State
interface UserSettings {
  language: "english" | "hindi";
  smsNotifications: boolean;
  whatsappNotifications: boolean;
  autoAdviceEnabled: boolean;
  emergencyContacts: { name: string; relation: string; phone: string }[];
}

const userSettingsMap: Record<string, UserSettings> = {};

// Helper for dynamic simulation status updating
function getUpdatedRideStatus(ride: EmergencyRide): EmergencyRide {
  if (ride.priority === "critical" && (ride.status === "searching" || ride.status === "Searching Driver") && !ride.driverId) {
    // Process critical ride dispatching via Priority Engine
    PriorityEngine.processCriticalRide(ride).catch(err => {
      console.error("PriorityEngine error processing critical ride:", err);
    });
    return ride;
  }

  if (ride.isManual) return ride;
  const elapsedSeconds = (Date.now() - ride.createdAt) / 1000;
  const oldStatus = ride.status;
  
  if (ride.status === "completed" || ride.status === "cancelled" || ride.status === "Completed" || ride.status === "Cancelled") return ride;
  
  let newStatus: EmergencyRide["status"] = ride.status;
  let driverAssigned = ride.driverId !== undefined;
  
  if (elapsedSeconds < 3) {
    newStatus = "Emergency Requested";
  } else if (elapsedSeconds >= 3 && elapsedSeconds < 8) {
    newStatus = "Searching Driver";
  } else if (elapsedSeconds >= 8) {
    if (!driverAssigned) {
      // Automatically match with the first available driver
      const availableDriver = drivers.find(d => d.status === "available");
      if (availableDriver) {
        ride.driverId = availableDriver.id;
        ride.driverName = availableDriver.name;
        ride.driverPhone = availableDriver.phone;
        ride.vehicleType = availableDriver.vehicleType;
        availableDriver.status = "busy";
        newStatus = "Driver Assigned";
        driverAssigned = true;
      } else {
        newStatus = "Searching Driver";
      }
    }
    
    if (driverAssigned) {
      if (elapsedSeconds >= 48) {
        newStatus = "Completed";
        // Free up the driver
        const drv = drivers.find(d => d.id === ride.driverId);
        if (drv) {
          drv.status = "available";
          drv.completedTrips += 1;
        }
      } else if (elapsedSeconds >= 36) {
        newStatus = "Hospital Reached";
      } else if (elapsedSeconds >= 26) {
        newStatus = "Passenger Picked";
      } else if (elapsedSeconds >= 16) {
        newStatus = "Driver Arriving";
      } else {
        newStatus = "Driver Assigned";
      }
    }
  }
  
  ride.status = newStatus;

  if (oldStatus !== newStatus) {
    NotificationService.dispatchEmergencyAlerts(ride, newStatus).catch(err => {
      console.error("Error dispatching alerts in getUpdatedRideStatus:", err);
    });
  }

  // Emit status change notification
  if (oldStatus !== newStatus && ride.passengerId) {
    let title = "";
    let message = "";
    let type: Notification["type"] = "info";
    
    const statusStr = newStatus as string;
    if (statusStr === "searching" || statusStr === "Searching Driver") {
      title = "Searching Volunteer Driver";
      message = `We are matching your emergency request with nearby volunteer drivers. Standby...`;
      type = "info";
    } else if (statusStr === "driver_assigned" || statusStr === "Driver Assigned") {
      title = "Volunteer Driver Assigned";
      message = `Volunteer Driver ${ride.driverName} (${ride.vehicleType}) has accepted your emergency request. Contact: ${ride.driverPhone}.`;
      type = "success";
    } else if (statusStr === "driver_arriving" || statusStr === "Driver Arriving") {
      title = "Driver is Arriving";
      message = `Driver ${ride.driverName} is arriving and on their way to your location in ${ride.village}.`;
      type = "info";
    } else if (statusStr === "reached_pickup" || statusStr === "Passenger Picked") {
      title = "Driver Reached Pickup Point";
      message = `Your GramGo vehicle has reached ${ride.landmark || "your village"}. Please board the vehicle immediately.`;
      type = "warning";
    } else if (statusStr === "ride_started" || statusStr === "Hospital Reached") {
      title = "Emergency Transit Status Update";
      message = `The emergency transit status is updated. En route to ${ride.destinationChc} safely.`;
      type = "info";
    } else if (statusStr === "completed" || statusStr === "Completed") {
      title = "Ride Completed Successfully";
      message = `You have safely arrived at ${ride.destinationChc}. Medical handoff is in progress.`;
      type = "success";
    }
    
    if (title && message) {
      notifications.push({
        id: `notif_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`,
        userId: ride.passengerId,
        title,
        message,
        type,
        createdAt: Date.now(),
        read: false
      });
    }
    
    // Sync to MongoDB
    EmergencyRideDb.save(ride).catch(err => console.error("Error saving updated ride to DB:", err));
  }
  
  return ride;
}

// Helper to dispatch Ride Requests to all available drivers
async function dispatchRideRequests(ride: EmergencyRide) {
  // Flag manual to prevent auto-match simulation overriding driver's decision
  ride.isManual = true;
  
  // Find all available drivers
  const availableDrivers = drivers.filter(d => d.status === "available");
  const expiresAt = new Date(Date.now() + 45000); // 45 seconds timer
  
  for (const drv of availableDrivers) {
    try {
      await RideRequestDb.create({
        rideId: ride.id,
        driverId: drv.id,
        passengerId: ride.passengerId,
        patientName: ride.patientName,
        patientPhone: ride.patientPhone,
        emergencyType: ride.emergencyType,
        priority: ride.priority,
        village: ride.village,
        landmark: ride.landmark || "Main Village Square",
        destinationChc: ride.destinationChc || "Nearest CHC",
        status: "pending",
        expiresAt
      });
    } catch (err) {
      console.error(`Error creating RideRequest for driver ${drv.id}:`, err);
    }
  }
}

// Helper for dynamic Ride Booking simulation status updating
async function getUpdatedBookingStatus(booking: IBooking): Promise<IBooking> {
  if (["completed", "cancelled"].includes(booking.status)) return booking;

  const elapsedSeconds = (Date.now() - booking.createdAt.getTime()) / 1000;
  const oldStatus = booking.status;
  let newStatus = booking.status;
  let updateFields: Partial<IBooking> = {};

  if (booking.status === "pending" && elapsedSeconds > 5) {
    // Match with the first available driver if possible
    const availableDriver = drivers.find(d => d.status === "available");
    if (availableDriver) {
      updateFields.driverId = availableDriver.id;
      updateFields.driverName = availableDriver.name;
      updateFields.driverPhone = availableDriver.phone;
      availableDriver.status = "busy";
      newStatus = "accepted";
    } else {
      const names = ["Vijay Singh", "Rajesh Yadav", "Sanjay Mishra", "Anil Maurya"];
      const randomIdx = Math.floor(Math.random() * names.length);
      updateFields.driverId = `drv_gen_${Date.now()}`;
      updateFields.driverName = names[randomIdx];
      updateFields.driverPhone = `+91 94544 ${Math.floor(10000 + Math.random() * 90000)}`;
      newStatus = "accepted";
    }
  } else if (booking.status === "accepted" && elapsedSeconds > 45) {
    newStatus = "completed";
    if (booking.driverId && !booking.driverId.startsWith("drv_gen_")) {
      const drv = drivers.find(d => d.id === booking.driverId);
      if (drv) {
        drv.status = "available";
        drv.completedTrips += 1;
      }
    }
  }

  if (oldStatus !== newStatus) {
    const updated = await BookingDb.updateStatus(booking.id, newStatus, updateFields);
    if (updated) {
      let title = "";
      let message = "";
      let type: "info" | "success" | "warning" | "error" = "info";

      if (newStatus === "accepted") {
        title = "Ride Booking Accepted";
        message = `Your ${updated.rideType} ride booking from ${updated.pickupLocation} to ${updated.destination} has been accepted by Driver ${updated.driverName} (${updated.driverPhone}).`;
        type = "success";

        // Trigger WhatsApp Driver Assigned template
        NotificationService.dispatchStandardRideAlerts(updated, "driver_assigned").catch(e => {
          console.error("Error sending driver_assigned WhatsApp:", e);
        });

        // Simulate intermediate states asynchronously for testing the logs panel
        // 10s: Driver Arriving
        setTimeout(() => {
          NotificationService.dispatchStandardRideAlerts(updated, "driver_arriving").catch(e => {
            console.error("Error sending driver_arriving WhatsApp:", e);
          });
        }, 10000);

        // 20s: Driver Reached pickup point
        setTimeout(() => {
          NotificationService.dispatchStandardRideAlerts(updated, "driver_reached").catch(e => {
            console.error("Error sending driver_reached WhatsApp:", e);
          });
        }, 20000);

        // 30s: Ride Started
        setTimeout(() => {
          NotificationService.dispatchStandardRideAlerts(updated, "ride_started").catch(e => {
            console.error("Error sending ride_started WhatsApp:", e);
          });
        }, 30000);

      } else if (newStatus === "completed") {
        title = "Ride Booking Completed";
        message = `Your ride from ${updated.pickupLocation} to ${updated.destination} is complete. Estimated Fare: Rs. ${updated.estimatedFare}. Thank you for riding with GramGo!`;
        type = "success";

        // Trigger WhatsApp Ride Completed template
        NotificationService.dispatchStandardRideAlerts(updated, "ride_completed").catch(e => {
          console.error("Error sending ride_completed WhatsApp:", e);
        });

        // Credit driver wallet with Net Earnings (Fare - Platform Commission)
        if (updated.driverId && !updated.driverId.startsWith("drv_gen_")) {
          const fare = updated.estimatedFare || 0;
          const pct = adminSettings.commissionPercentage !== undefined ? adminSettings.commissionPercentage : 10;
          const commission = Math.round((fare * pct) / 100);
          const driverShare = fare - commission;
          try {
            await WalletService.createTransaction(
              updated.driverId,
              driverShare,
              "credit",
              `Earnings for Ride ${updated.id} (Fare: ₹${fare}, Platform Commission: ₹${commission} deducted)`
            );
            console.log(`[Commission] Credited driver ${updated.driverId} with ₹${driverShare} for ride ${updated.id}`);
          } catch (e) {
            console.error("Failed to credit driver wallet for completed ride:", e);
          }
        }
      }

      if (title && message) {
        notifications.push({
          id: `notif_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
          userId: updated.passengerId,
          title,
          message,
          type,
          createdAt: Date.now(),
          read: false
        });
      }
      return updated;
    }
  }

  return booking;
}

// Lazy Gemini API initialization
let aiInstance: GoogleGenAI | null = null;
function getGeminiAI() {
  if (!aiInstance) {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey || apiKey === "MY_GEMINI_API_KEY" || apiKey.trim() === "") {
      throw new Error("GEMINI_API_KEY environment variable is not configured.");
    }
    aiInstance = new GoogleGenAI({
      apiKey,
      httpOptions: {
        headers: {
          'User-Agent': 'aistudio-build',
        }
      }
    });
  }
  return aiInstance;
}

// ---------------- AUTHENTICATION MIDDLEWARE & ENDPOINTS ----------------

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

// Send WhatsApp OTP
app.post("/api/auth/otp/send", async (req, res) => {
  const { phone, type } = req.body;
  if (!phone || !type) {
    return res.status(400).json({ error: "Missing required fields: phone and type." });
  }

  if (!["register", "login", "forgot_password"].includes(type)) {
    return res.status(400).json({ error: "Invalid OTP type." });
  }

  try {
    const cleanPhone = phone.trim();
    const existingUser = await UserDb.findOne({ phone: cleanPhone });

    if (type === "register" && existingUser) {
      return res.status(400).json({ error: "A user with this phone number already exists." });
    }

    if ((type === "login" || type === "forgot_password") && !existingUser) {
      return res.status(404).json({ error: "No registered user found with this phone number." });
    }

    if (type === "login" && existingUser && existingUser.status === "suspended") {
      return res.status(403).json({ error: "Your account has been suspended. Please contact the Panchayat Admin." });
    }

    // Generate 6-digit code
    const code = String(100000 + Math.floor(Math.random() * 900000));
    const expiresAt = new Date(Date.now() + 5 * 60 * 1000); // 5 minutes

    // Clear previous OTPs
    await WhatsAppOtpDb.clearPhoneOtps(cleanPhone, type);

    // Save to DB
    await WhatsAppOtpDb.create({
      phone: cleanPhone,
      code,
      type: type as any,
      attempts: 0,
      expiresAt
    });

    // Send WhatsApp Message template
    await WhatsAppService.sendTemplateTrigger(cleanPhone, "whatsapp_otp", [code]).catch(err => {
      console.error("Failed to send WhatsApp OTP:", err);
    });

    res.json({
      message: `Verification OTP successfully sent to ${cleanPhone} via WhatsApp.`,
      phone: cleanPhone,
      otpSimulated: code // Include for easy sandbox/dev testing
    });
  } catch (err: any) {
    console.error("Error sending OTP:", err);
    res.status(500).json({ error: "Internal server error sending OTP." });
  }
});

// Verify WhatsApp OTP
app.post("/api/auth/otp/verify", async (req, res) => {
  const { phone, type, code } = req.body;
  if (!phone || !type || !code) {
    return res.status(400).json({ error: "Missing required fields: phone, type, and code." });
  }

  try {
    const cleanPhone = phone.trim();
    const otpRecord = await WhatsAppOtpDb.findLatest(cleanPhone, type as any);

    if (!otpRecord) {
      return res.status(400).json({ error: "No active OTP request found for this phone number." });
    }

    // Check expiry
    if (new Date() > new Date(otpRecord.expiresAt)) {
      await WhatsAppOtpDb.delete(otpRecord.id);
      return res.status(400).json({ error: "OTP has expired. Please request a new one." });
    }

    // Check attempt limit (max 3 attempts)
    if (otpRecord.attempts >= 3) {
      await WhatsAppOtpDb.delete(otpRecord.id);
      return res.status(400).json({ error: "Too many failed attempts. This OTP has been invalidated. Please generate a new one." });
    }

    // Verify code
    const isCodeValid = otpRecord.code === code.trim() || code.trim() === "123456"; // Allow universal debug code
    if (!isCodeValid) {
      await WhatsAppOtpDb.incrementAttempts(otpRecord.id);
      const remainingAttempts = 3 - (otpRecord.attempts + 1);
      
      if (remainingAttempts <= 0) {
        await WhatsAppOtpDb.delete(otpRecord.id);
        return res.status(400).json({ error: "Invalid code. Too many failed attempts. OTP has been invalidated." });
      }
      
      return res.status(400).json({ error: `Invalid verification code. ${remainingAttempts} attempts remaining.` });
    }

    // Successful verification: delete OTP record
    await WhatsAppOtpDb.delete(otpRecord.id);

    // If it's a login, we can log them in immediately and return JWT token
    if (type === "login") {
      const user = await UserDb.findOne({ phone: cleanPhone });
      if (!user) {
        return res.status(404).json({ error: "User profile not found." });
      }

      if (user.status === "suspended") {
        return res.status(403).json({ error: "Your account has been suspended. Please contact the Panchayat Admin." });
      }

      const token = jwt.sign({ id: user.id, phone: user.phone, role: user.role }, JWT_SECRET, { expiresIn: "7d" });
      const { passwordHash: _, ...userResponse } = user;
      return res.json({
        verified: true,
        message: "Login successful!",
        token,
        user: userResponse
      });
    }

    res.json({
      verified: true,
      message: "Phone number verified successfully."
    });
  } catch (err: any) {
    console.error("Error verifying OTP:", err);
    res.status(500).json({ error: "Internal server error verifying OTP." });
  }
});

// Register user
app.post("/api/auth/register", async (req, res) => {
  const { name, phone, email, password, role, village, district, vehicleType, vehicleNumber, referralCode, otp } = req.body;
  
  // Validation
  if (!name || !phone || !password || !role || !village) {
    return res.status(400).json({ error: "Please enter all required fields: name, phone, password, role, and village." });
  }
  
  if (password.length < 6) {
    return res.status(400).json({ error: "Password must be at least 6 characters long." });
  }
  
  if (!["passenger", "driver", "admin"].includes(role)) {
    return res.status(400).json({ error: "Invalid role specified." });
  }
  
  try {
    // Verify OTP if supplied (required for front-end registration flow)
    if (otp) {
      const otpRecord = await WhatsAppOtpDb.findLatest(phone.trim(), "register");
      const isMockOtp = otp === "123456";

      if (!otpRecord && !isMockOtp) {
        return res.status(400).json({ error: "No active verification OTP request found. Please request an OTP first." });
      }

      if (otpRecord) {
        if (new Date() > new Date(otpRecord.expiresAt)) {
          await WhatsAppOtpDb.delete(otpRecord.id);
          return res.status(400).json({ error: "Your verification OTP has expired. Please request a new one." });
        }
        if (otpRecord.attempts >= 3) {
          await WhatsAppOtpDb.delete(otpRecord.id);
          return res.status(400).json({ error: "Too many failed attempts. Please generate a new verification OTP." });
        }
        if (otpRecord.code !== otp.trim() && !isMockOtp) {
          await WhatsAppOtpDb.incrementAttempts(otpRecord.id);
          const remaining = 3 - (otpRecord.attempts + 1);
          if (remaining <= 0) {
            await WhatsAppOtpDb.delete(otpRecord.id);
            return res.status(400).json({ error: "Invalid code. OTP has been invalidated. Please generate a new one." });
          }
          return res.status(400).json({ error: `Invalid verification OTP. ${remaining} attempts remaining.` });
        }
        // Success: clear OTP
        await WhatsAppOtpDb.delete(otpRecord.id);
      }
    }

    // Check if user already exists
    const existingUser = await UserDb.findOne({ phone, email });
    if (existingUser) {
      return res.status(400).json({ error: "A user with this phone or email already exists." });
    }
    
    // Hash password
    const passwordHash = bcrypt.hashSync(password, 10);
    
    // Create new user in DB
    const newUser = await UserDb.create({
      name,
      phone,
      email,
      passwordHash,
      role: role as any,
      village,
      district: district || "Ghazipur",
      vehicleType,
      vehicleNumber
    });
    
    // If it's a driver, let's also sync with the in-memory active drivers list
    if (role === "driver") {
      drivers.push({
        id: newUser.id,
        name: newUser.name,
        phone: newUser.phone,
        vehicleType: (vehicleType as any) || "Auto Rickshaw",
        vehicleNumber: vehicleNumber || "UP-61-NEW-99",
        village: newUser.village,
        district: newUser.district,
        status: "available",
        rating: 5.0,
        completedTrips: 0
      });
    }

    // Process referral registration if code was supplied
    if (referralCode) {
      await ReferralService.registerReferral(newUser.id, newUser.name, referralCode);
    }
    
    // Generate JWT
    const token = jwt.sign({ id: newUser.id, phone: newUser.phone, role: newUser.role }, JWT_SECRET, { expiresIn: "7d" });
    
    // Respond (exclude passwordHash)
    const { passwordHash: _, ...userResponse } = newUser;
    res.status(201).json({ token, user: userResponse });
  } catch (error: any) {
    console.error("Registration error:", error);
    res.status(500).json({ error: "Server error during registration. Please try again." });
  }
});

// Login user
app.post("/api/auth/login", async (req, res) => {
  const { phoneOrEmail, password } = req.body;
  
  if (!phoneOrEmail || !password) {
    return res.status(400).json({ error: "Please provide both phone/email and password." });
  }
  
  try {
    const user = await UserDb.findOne({ phone: phoneOrEmail, email: phoneOrEmail });
    if (!user) {
      return res.status(400).json({ error: "No registered user found with this phone number or email." });
    }
    
    if (user.status === "suspended") {
      return res.status(403).json({ error: "Your account has been suspended. Please contact the Panchayat Admin." });
    }
    
    const isMatch = bcrypt.compareSync(password, user.passwordHash);
    if (!isMatch) {
      return res.status(400).json({ error: "Invalid credentials. Please double-check your password." });
    }
    
    const token = jwt.sign({ id: user.id, phone: user.phone, role: user.role }, JWT_SECRET, { expiresIn: "7d" });
    
    const { passwordHash: _, ...userResponse } = user;
    res.json({ token, user: userResponse });
  } catch (error: any) {
    console.error("Login error:", error);
    res.status(500).json({ error: "Server error during login. Please try again." });
  }
});

// Forgot Password OTP Trigger (real WhatsApp OTP integration)
app.post("/api/auth/forgot-password", async (req, res) => {
  const { phoneOrEmail } = req.body;
  if (!phoneOrEmail) {
    return res.status(400).json({ error: "Please provide your phone number or email." });
  }
  
  try {
    const user = await UserDb.findOne({ phone: phoneOrEmail, email: phoneOrEmail });
    if (!user) {
      return res.status(404).json({ error: "User not found with this phone number or email." });
    }
    
    // Generate real WhatsApp OTP for password recovery!
    const code = String(100000 + Math.floor(Math.random() * 900000));
    const expiresAt = new Date(Date.now() + 5 * 60 * 1000); // 5 mins
    
    await WhatsAppOtpDb.clearPhoneOtps(user.phone, "forgot_password");
    await WhatsAppOtpDb.create({
      phone: user.phone,
      code,
      type: "forgot_password",
      attempts: 0,
      expiresAt
    });

    // Send WhatsApp Message template
    await WhatsAppService.sendTemplateTrigger(user.phone, "whatsapp_otp", [code]).catch(err => {
      console.error("Failed to send Forgot Password WhatsApp OTP:", err);
    });
    
    res.json({
      message: "An OTP has been successfully triggered to your registered mobile number via WhatsApp.",
      otpSimulated: code,
      phone: user.phone
    });
  } catch (error) {
    console.error("Forgot password error:", error);
    res.status(500).json({ error: "Server error triggering password reset." });
  }
});

// Reset Password (real WhatsApp OTP integration)
app.post("/api/auth/reset-password", async (req, res) => {
  const { phoneOrEmail, otp, newPassword } = req.body;
  if (!phoneOrEmail || !otp || !newPassword) {
    return res.status(400).json({ error: "Missing required fields: phone/email, OTP, and new password." });
  }
  
  if (newPassword.length < 6) {
    return res.status(400).json({ error: "New password must be at least 6 characters long." });
  }
  
  try {
    const user = await UserDb.findOne({ phone: phoneOrEmail, email: phoneOrEmail });
    if (!user) {
      return res.status(404).json({ error: "User not found." });
    }

    // Verify WhatsApp OTP for forgot_password type
    const otpRecord = await WhatsAppOtpDb.findLatest(user.phone, "forgot_password");
    
    // Allow universal debug code "123456"
    const isMockOtp = otp === "123456";
    
    if (!otpRecord && !isMockOtp) {
      return res.status(400).json({ error: "No active OTP recovery request found." });
    }

    if (otpRecord) {
      if (new Date() > new Date(otpRecord.expiresAt)) {
        await WhatsAppOtpDb.delete(otpRecord.id);
        return res.status(400).json({ error: "OTP has expired. Please request a new one." });
      }
      if (otpRecord.attempts >= 3) {
        await WhatsAppOtpDb.delete(otpRecord.id);
        return res.status(400).json({ error: "Too many failed attempts. Please generate a new OTP." });
      }
      if (otpRecord.code !== otp.trim() && !isMockOtp) {
        await WhatsAppOtpDb.incrementAttempts(otpRecord.id);
        const remaining = 3 - (otpRecord.attempts + 1);
        if (remaining <= 0) {
          await WhatsAppOtpDb.delete(otpRecord.id);
          return res.status(400).json({ error: "Invalid code. OTP has been invalidated." });
        }
        return res.status(400).json({ error: `Invalid recovery OTP. ${remaining} attempts remaining.` });
      }
      // Success: clear OTP
      await WhatsAppOtpDb.delete(otpRecord.id);
    }
    
    const newPasswordHash = bcrypt.hashSync(newPassword, 10);
    await UserDb.updatePassword(user.phone, newPasswordHash);
    
    res.json({ message: "Password reset successfully! You can now log in with your new password." });
  } catch (error) {
    console.error("Reset password error:", error);
    res.status(500).json({ error: "Server error resetting your password." });
  }
});

// Get Current User
app.get("/api/auth/me", authenticateToken, async (req: any, res: any) => {
  try {
    const user = await UserDb.findById(req.user.id);
    if (!user) {
      return res.status(404).json({ error: "User profile not found." });
    }
    const { passwordHash: _, ...userResponse } = user;
    res.json(userResponse);
  } catch (error) {
    res.status(500).json({ error: "Server error fetching user details." });
  }
});

// ---------------- CALL HISTORY APIS ----------------

app.get("/api/calls", authenticateToken, async (req: any, res: any) => {
  try {
    const userId = req.user.id;
    const calls = await CallDb.findByUserId(userId);
    res.json(calls);
  } catch (error) {
    console.error("Error fetching calls:", error);
    res.status(500).json({ error: "Server error fetching call history." });
  }
});

app.post("/api/calls", authenticateToken, async (req: any, res: any) => {
  try {
    const { conversationId, callerId, callerName, receiverId, receiverName, status, duration } = req.body;
    
    const newCall = await CallDb.create({
      conversationId,
      callerId: callerId || req.user.id,
      callerName: callerName || "Unknown",
      receiverId: receiverId || "",
      receiverName: receiverName || "Unknown",
      status: status || "missed",
      duration: Number(duration) || 0,
      createdAt: new Date()
    });
    
    res.status(201).json(newCall);
  } catch (error) {
    console.error("Error creating call log:", error);
    res.status(500).json({ error: "Server error saving call record." });
  }
});

// ---------------- USER NOTIFICATIONS & PUSH SETTINGS APIS ----------------

app.get("/api/notifications", authenticateToken, async (req: any, res: any) => {
  try {
    const userId = req.user.id;
    const notifications = await UserNotificationDb.getNotifications(userId);
    res.json(notifications);
  } catch (error) {
    console.error("Error getting user notifications:", error);
    res.status(500).json({ error: "Server error getting notifications." });
  }
});

app.get("/api/notifications/unread-count", authenticateToken, async (req: any, res: any) => {
  try {
    const userId = req.user.id;
    const count = await UserNotificationDb.getUnreadCount(userId);
    res.json({ unreadCount: count });
  } catch (error) {
    console.error("Error getting notification count:", error);
    res.status(500).json({ error: "Server error getting unread count." });
  }
});

app.post("/api/notifications/mark-read", authenticateToken, async (req: any, res: any) => {
  try {
    const userId = req.user.id;
    const { id } = req.body;
    if (!id) {
      return res.status(400).json({ error: "Notification ID is required." });
    }
    const success = await UserNotificationDb.markAsRead(id, userId);
    res.json({ success });
  } catch (error) {
    console.error("Error marking notification as read:", error);
    res.status(500).json({ error: "Server error marking notification." });
  }
});

app.post("/api/notifications/mark-all-read", authenticateToken, async (req: any, res: any) => {
  try {
    const userId = req.user.id;
    const success = await UserNotificationDb.markAllAsRead(userId);
    res.json({ success });
  } catch (error) {
    console.error("Error marking all notifications as read:", error);
    res.status(500).json({ error: "Server error." });
  }
});

app.delete("/api/notifications/:id", authenticateToken, async (req: any, res: any) => {
  try {
    const userId = req.user.id;
    const { id } = req.params;
    const success = await UserNotificationDb.delete(id, userId);
    res.json({ success });
  } catch (error) {
    console.error("Error deleting notification:", error);
    res.status(500).json({ error: "Server error." });
  }
});

app.delete("/api/notifications", authenticateToken, async (req: any, res: any) => {
  try {
    const userId = req.user.id;
    const success = await UserNotificationDb.clearAll(userId);
    res.json({ success });
  } catch (error) {
    console.error("Error clearing notifications:", error);
    res.status(500).json({ error: "Server error clearing notification log." });
  }
});

app.get("/api/notifications/settings", authenticateToken, async (req: any, res: any) => {
  try {
    const userId = req.user.id;
    const settings = await UserNotificationDb.getSettings(userId);
    res.json(settings);
  } catch (error) {
    console.error("Error getting notification settings:", error);
    res.status(500).json({ error: "Server error fetching notification settings." });
  }
});

app.put("/api/notifications/settings", authenticateToken, async (req: any, res: any) => {
  try {
    const userId = req.user.id;
    const { pushToken, enabled, rideAlerts, chatAlerts, voiceAlerts, soundEnabled, alertSound } = req.body;
    
    const updated = await UserNotificationDb.updateSettings(userId, {
      pushToken,
      enabled,
      rideAlerts,
      chatAlerts,
      voiceAlerts,
      soundEnabled,
      alertSound
    });
    
    res.json(updated);
  } catch (error) {
    console.error("Error updating notification settings:", error);
    res.status(500).json({ error: "Server error saving settings." });
  }
});

app.post("/api/notifications/simulate", authenticateToken, async (req: any, res: any) => {
  try {
    const userId = req.user.id;
    const { title, body, type, data } = req.body;
    
    // Fetch settings to ensure delivery checks can be simulated
    const settings = await UserNotificationDb.getSettings(userId);
    if (!settings.enabled) {
      return res.status(400).json({ error: "Push notifications are disabled in user settings." });
    }
    
    // Category check
    if (type === "ride_alert" && !settings.rideAlerts) {
      return res.status(400).json({ error: "Ride Alerts are disabled in user settings." });
    }
    if (type === "chat_alert" && !settings.chatAlerts) {
      return res.status(400).json({ error: "Chat Alerts are disabled in user settings." });
    }
    if (type === "voice_call" && !settings.voiceAlerts) {
      return res.status(400).json({ error: "Voice Call Alerts are disabled in user settings." });
    }

    const newNotification = await UserNotificationDb.create({
      userId,
      title: title || "Simulated Push Notification",
      body: body || "This is a simulated Firebase Cloud Messaging message.",
      type: type || "general",
      data: data || {},
      read: false,
      createdAt: new Date()
    });

    res.status(201).json({
      success: true,
      message: "Simulated push notification dispatched successfully.",
      fcmTokenUsed: settings.pushToken || "simulated_fcm_token_xyz_123",
      notification: newNotification
    });
  } catch (error) {
    console.error("Error simulating notification dispatch:", error);
    res.status(500).json({ error: "Server error during push simulation." });
  }
});

// ---------------- API ROUTES ----------------
app.use("/api/whatsapp", whatsAppRoutes);


// Get emergency contacts and national helplines
app.get("/api/emergency-contacts", (req, res) => {
  res.json({
    nationalAmbulance: "108",
    police: "112",
    womensHelpline: "1091",
    gramGoHelpline: "1800-309-GRAM (4726)",
    regionalContacts: [
      { designation: "Block Medical Officer, Mohammadabad", number: "+91 94544 12345" },
      { designation: "Ghazipur District Hospital Helpline", number: "0548-2220456" },
      { designation: "District Emergency Control Room", number: "1077" }
    ]
  });
});

// Get Community Health Centres
app.get("/api/chcs", (req, res) => {
  res.json(chcs);
});

// Nearby Hospitals API Endpoints
app.get("/api/hospitals", HospitalController.getHospitals);
app.get("/api/hospitals/:id", HospitalController.getHospitalById);

// Get/List all community drivers
app.get("/api/drivers", (req, res) => {
  res.json(drivers);
});

// Register a new volunteer driver
app.post("/api/drivers", (req, res) => {
  const { name, phone, vehicleType, vehicleNumber, village, district } = req.body;
  if (!name || !phone || !vehicleType || !vehicleNumber || !village) {
    res.status(400).json({ error: "Missing required volunteer driver details." });
    return;
  }
  
  const newDriver: Driver = {
    id: `drv_${Date.now()}`,
    name,
    phone,
    vehicleType,
    vehicleNumber,
    village,
    district: district || "Ghazipur",
    status: "available",
    rating: 5.0,
    completedTrips: 0
  };
  
  drivers.push(newDriver);
  res.status(201).json(newDriver);
});

// Trigger an emergency transport booking
app.post("/api/book-emergency", async (req, res) => {
  const { patientName, patientPhone, emergencyType, priority, village, landmark, destinationChc } = req.body;
  
  if (!patientName || !patientPhone || !emergencyType || !village) {
    res.status(400).json({ error: "Missing emergency details (name, phone, type, and village are mandatory)." });
    return;
  }
  
  const newRide: EmergencyRide = {
    id: `ride_${Date.now()}`,
    patientName,
    patientPhone,
    emergencyType,
    priority: priority || "urgent",
    village,
    landmark: landmark || "Main Square",
    status: "searching",
    createdAt: Date.now(),
    destinationChc: destinationChc || "Nearest Community Health Centre"
  };
  
  emergencyRides.push(newRide);
  await dispatchRideRequests(newRide);
  NotificationService.dispatchEmergencyAlerts(newRide, "Emergency Requested").catch(err => {
    console.error("Error dispatching alerts in book-emergency:", err);
  });
  res.status(201).json(newRide);
});

// Check booking status
app.get("/api/ride-status/:id", (req, res) => {
  const ride = emergencyRides.find(r => r.id === req.params.id);
  if (!ride) {
    res.status(404).json({ error: "Emergency ride booking not found." });
    return;
  }
  const updatedRide = getUpdatedRideStatus(ride);
  res.json(updatedRide);
});

// ---------------- DRIVER MODULE APIS ----------------

// Helper to get or create driver profile for user
function getOrCreateDriver(userId: string, user: any): Driver {
  let drv = drivers.find(d => d.id === userId);
  if (!drv) {
    drv = {
      id: userId,
      name: user.name,
      phone: user.phone,
      vehicleType: user.vehicleType || "Auto Rickshaw",
      vehicleNumber: user.vehicleNumber || "UP-61-NEW-99",
      village: user.village,
      district: user.district || "Ghazipur",
      status: "available",
      rating: 5.0,
      completedTrips: 0
    };
    drivers.push(drv);
  }
  return drv;
}

// In-memory documents map
const driverDocumentsMap: Record<string, any[]> = {
  "drv_1": [
    { id: "doc_1_1", docType: "license", fileName: "license_ramesh.pdf", number: "DL-UP61-20261100", verified: true, uploadedAt: Date.now() },
    { id: "doc_1_2", docType: "rc", fileName: "rc_ramesh.pdf", number: "UP-61-AB-1234", verified: true, uploadedAt: Date.now() },
    { id: "doc_1_3", docType: "insurance", fileName: "insurance_ramesh.pdf", number: "INS-GPZ-998811", verified: true, uploadedAt: Date.now() },
    { id: "doc_1_4", docType: "aadhaar", fileName: "aadhaar_ramesh.pdf", number: "3842-1234-4821", verified: true, uploadedAt: Date.now() },
    { id: "doc_1_5", docType: "pan", fileName: "pan_ramesh.pdf", number: "ABCDE1234F", verified: true, uploadedAt: Date.now() },
    { id: "doc_1_6", docType: "vehicle_image", fileName: "tractor_ambulance.jpg", number: "UP-61-AB-1234", verified: true, uploadedAt: Date.now() },
    { id: "doc_1_7", docType: "profile_image", fileName: "ramesh_avatar.jpg", number: "+91 98765 43210", verified: true, uploadedAt: Date.now() }
  ],
  "drv_2": [
    { id: "doc_2_1", docType: "license", fileName: "license_amit.pdf", number: "DL-UP61-20261200", verified: true, uploadedAt: Date.now() },
    { id: "doc_2_2", docType: "rc", fileName: "rc_amit.pdf", number: "UP-61-XY-5678", verified: false, uploadedAt: Date.now() },
    { id: "doc_2_3", docType: "insurance", fileName: "insurance_amit.pdf", number: "INS-GPZ-998822", verified: false, uploadedAt: Date.now() },
    { id: "doc_2_4", docType: "aadhaar", fileName: "aadhaar_amit.pdf", number: "3842-5678-4821", verified: true, uploadedAt: Date.now() },
    { id: "doc_2_5", docType: "pan", fileName: "pan_amit.pdf", number: "ABCDE5678F", verified: true, uploadedAt: Date.now() },
    { id: "doc_2_6", docType: "vehicle_image", fileName: "bolero_suv.jpg", number: "UP-61-XY-5678", verified: false, uploadedAt: Date.now() },
    { id: "doc_2_7", docType: "profile_image", fileName: "amit_avatar.jpg", number: "+91 87654 32109", verified: false, uploadedAt: Date.now() }
  ],
  "drv_3": [
    { id: "doc_3_1", docType: "license", fileName: "license_savita.pdf", number: "DL-UP61-20261300", verified: false, uploadedAt: Date.now() },
    { id: "doc_3_2", docType: "rc", fileName: "rc_savita.pdf", number: "UP-61-ER-9012", verified: false, uploadedAt: Date.now() },
    { id: "doc_3_3", docType: "insurance", fileName: "insurance_savita.pdf", number: "INS-GPZ-998833", verified: false, uploadedAt: Date.now() },
    { id: "doc_3_4", docType: "aadhaar", fileName: "aadhaar_savita.pdf", number: "3842-9012-4821", verified: false, uploadedAt: Date.now() },
    { id: "doc_3_5", docType: "pan", fileName: "pan_savita.pdf", number: "ABCDE9012F", verified: false, uploadedAt: Date.now() },
    { id: "doc_3_6", docType: "vehicle_image", fileName: "e_rickshaw.jpg", number: "UP-61-ER-9012", verified: false, uploadedAt: Date.now() },
    { id: "doc_3_7", docType: "profile_image", fileName: "savita_avatar.jpg", number: "+91 76543 21098", verified: false, uploadedAt: Date.now() }
  ],
  "drv_4": [
    { id: "doc_4_1", docType: "license", fileName: "license_yusuf.pdf", number: "DL-UP61-20261400", verified: false, uploadedAt: Date.now() },
    { id: "doc_4_2", docType: "rc", fileName: "rc_yusuf.pdf", number: "UP-61-AR-4433", verified: true, uploadedAt: Date.now() },
    { id: "doc_4_3", docType: "insurance", fileName: "insurance_yusuf.pdf", number: "INS-GPZ-998844", verified: true, uploadedAt: Date.now() },
    { id: "doc_4_4", docType: "aadhaar", fileName: "aadhaar_yusuf.pdf", number: "3842-4433-4821", verified: true, uploadedAt: Date.now() },
    { id: "doc_4_5", docType: "pan", fileName: "pan_yusuf.pdf", number: "ABCDE4433F", verified: true, uploadedAt: Date.now() },
    { id: "doc_4_6", docType: "vehicle_image", fileName: "auto_rickshaw.jpg", number: "UP-61-AR-4433", verified: false, uploadedAt: Date.now() },
    { id: "doc_4_7", docType: "profile_image", fileName: "yusuf_avatar.jpg", number: "+91 99887 76655", verified: false, uploadedAt: Date.now() }
  ]
};

// Get driver stats, active ride, and documents
app.get("/api/driver/stats", authenticateToken, async (req: any, res: any) => {
  try {
    const user = await UserDb.findById(req.user.id);
    if (!user || user.role !== "driver") {
      return res.status(403).json({ error: "Access denied. Only registered drivers can access this page." });
    }
    
    const driverProfile = getOrCreateDriver(user.id, user);
    const docs = driverDocumentsMap[user.id] || [];
    
    // Check if driver has an active manual assigned ride
    const activeRide = emergencyRides.find(
      r => r.driverId === user.id && r.status !== "completed" && r.status !== "Completed" && r.status !== "cancelled" && r.status !== "Cancelled"
    );
    
    // Let's calculate simulated earnings: ₹500 per completed trip
    const completedRides = emergencyRides.filter(r => r.driverId === user.id && (r.status === "completed" || r.status === "Completed"));
    const earnings = completedRides.length * 500;
    
    res.json({
      profile: driverProfile,
      documents: docs,
      activeRide: activeRide || null,
      rideHistory: completedRides,
      earnings: {
        totalTrips: completedRides.length,
        basePayout: earnings,
        incentives: completedRides.length * 150, // ₹150 Panchayat incentive
        total: earnings + (completedRides.length * 150)
      }
    });
  } catch (error) {
    console.error("Error fetching driver stats:", error);
    res.status(500).json({ error: "Server error fetching stats." });
  }
});

// Update driver availability status (Go Online / Go Offline)
app.put("/api/driver/status", authenticateToken, async (req: any, res: any) => {
  const { status } = req.body;
  if (!status || !["available", "offline"].includes(status)) {
    return res.status(400).json({ error: "Invalid status. Must be 'available' or 'offline'." });
  }
  
  try {
    const user = await UserDb.findById(req.user.id);
    if (!user || user.role !== "driver") {
      return res.status(403).json({ error: "Access denied." });
    }
    
    const driverProfile = getOrCreateDriver(user.id, user);
    driverProfile.status = status;
    
    res.json({ success: true, status: driverProfile.status });
  } catch (error) {
    res.status(500).json({ error: "Failed to update driver status." });
  }
});

// Upload a simulated document (license, rc, aadhaar, insurance)
app.post("/api/driver/documents", authenticateToken, async (req: any, res: any) => {
  const { docType, fileName } = req.body;
  if (!docType || !fileName) {
    return res.status(400).json({ error: "Document type and filename are required." });
  }
  
  try {
    const user = await UserDb.findById(req.user.id);
    if (!user || user.role !== "driver") {
      return res.status(403).json({ error: "Access denied." });
    }
    
    if (!driverDocumentsMap[user.id]) {
      driverDocumentsMap[user.id] = [];
    }
    
    // If document type already exists, remove it first to simulate replacement
    driverDocumentsMap[user.id] = driverDocumentsMap[user.id].filter(d => d.docType !== docType);
    
    const newDoc = {
      docType,
      fileName,
      uploadedAt: Date.now(),
      status: "approved" // Auto-approve for seamless user experience
    };
    
    driverDocumentsMap[user.id].push(newDoc);
    res.status(201).json(newDoc);
  } catch (error) {
    res.status(500).json({ error: "Failed to upload document." });
  }
});

// Get incoming unassigned "searching" dispatches
app.get("/api/driver/requests", authenticateToken, async (req: any, res: any) => {
  try {
    const user = await UserDb.findById(req.user.id);
    if (!user || user.role !== "driver") {
      return res.status(403).json({ error: "Access denied." });
    }
    
    const driverProfile = getOrCreateDriver(user.id, user);
    if (driverProfile.status === "offline") {
      return res.json([]); // Offline drivers don't receive requests
    }
    
    // Auto-create RideRequest for any 'searching' ride if it doesn't already exist for this driver
    const searchingRides = emergencyRides.filter(r => r.status === "searching");
    for (const ride of searchingRides) {
      const existing = await RideRequestDb.findByRideAndDriver(ride.id, user.id);
      if (!existing) {
        const expiresAt = new Date(Date.now() + 45000); // 45s timer
        await RideRequestDb.create({
          rideId: ride.id,
          driverId: user.id,
          passengerId: ride.passengerId,
          patientName: ride.patientName,
          patientPhone: ride.patientPhone,
          emergencyType: ride.emergencyType,
          priority: ride.priority,
          village: ride.village,
          landmark: ride.landmark || "Main Village Square",
          destinationChc: ride.destinationChc || "Nearest CHC",
          status: "pending",
          expiresAt
        });
      }
    }
    
    // Fetch all requests for this driver
    const requests = await RideRequestDb.findByDriver(user.id);
    res.json(requests);
  } catch (error) {
    console.error("Error in GET /api/driver/requests:", error);
    res.status(500).json({ error: "Failed to fetch dispatches." });
  }
});

// Accept Ride Request
app.post("/api/driver/rides/:rideId/accept", authenticateToken, async (req: any, res: any) => {
  const { rideId } = req.params;
  try {
    const user = await UserDb.findById(req.user.id);
    if (!user || user.role !== "driver") {
      return res.status(403).json({ error: "Access denied." });
    }
    
    const ride = emergencyRides.find(r => r.id === rideId);
    if (!ride) {
      return res.status(404).json({ error: "Ride request not found." });
    }
    
    if (ride.driverId && ride.driverId !== user.id) {
      return res.status(400).json({ error: "This emergency has already been assigned to another volunteer driver." });
    }
    
    // Check if the request is expired
    const request = await RideRequestDb.findByRideAndDriver(rideId, user.id);
    if (request && request.status === "expired") {
      return res.status(400).json({ error: "This request has expired and can no longer be accepted." });
    }

    const driverProfile = getOrCreateDriver(user.id, user);
    driverProfile.status = "busy";
    
    ride.driverId = user.id;
    ride.driverName = user.name;
    ride.driverPhone = user.phone;
    ride.vehicleType = driverProfile.vehicleType;
    ride.status = "Driver Assigned";
    ride.isManual = true; // Turn off automated simulation advances
    NotificationService.dispatchEmergencyAlerts(ride, "Driver Assigned").catch(err => {
      console.error("Error dispatching alerts in driver/accept:", err);
    });
    
    // Update RideRequest status
    if (request) {
      await RideRequestDb.updateStatus(request.id, "accepted");
    }

    // Set other pending requests for this same ride to "expired"
    if (mongoose.connection.readyState === 1) {
      try {
        const MongoModel = mongoose.model("RideRequest");
        await MongoModel.updateMany(
          { rideId, id: { $ne: request?.id }, status: "pending" },
          { $set: { status: "expired" } }
        );
      } catch (err) {
        console.error("Error updating other Mongo requests:", err);
      }
    } else {
      const otherReqs = (await RideRequestDb.findByDriver(user.id)).filter(r => r.rideId === rideId && r.id !== request?.id);
      for (const r of otherReqs) {
        r.status = "expired";
      }
    }
    
    // Add passenger notification
    if (ride.passengerId) {
      notifications.push({
        id: `notif_assign_${Date.now()}`,
        userId: ride.passengerId,
        title: "Volunteer Driver Assigned",
        message: `Local Hero ${user.name} (${driverProfile.vehicleType}) has accepted your emergency request! Contact them at ${user.phone}.`,
        type: "success",
        createdAt: Date.now(),
        read: false
      });
    }
    
    res.json(ride);
  } catch (error) {
    console.error("Error in accept ride:", error);
    res.status(500).json({ error: "Failed to accept ride." });
  }
});

// Reject Ride Request
app.post("/api/driver/rides/:rideId/reject", authenticateToken, async (req: any, res: any) => {
  const { rideId } = req.params;
  try {
    const user = await UserDb.findById(req.user.id);
    if (!user || user.role !== "driver") {
      return res.status(403).json({ error: "Access denied." });
    }

    const request = await RideRequestDb.findByRideAndDriver(rideId, user.id);
    if (request) {
      await RideRequestDb.updateStatus(request.id, "rejected");
    }
    
    res.json({ success: true, message: "Ride request rejected successfully." });
  } catch (error) {
    console.error("Error in reject ride:", error);
    res.status(500).json({ error: "Failed to reject ride." });
  }
});

// Accept Request by RequestId
app.post("/api/driver/requests/:requestId/accept", authenticateToken, async (req: any, res: any) => {
  const { requestId } = req.params;
  try {
    const user = await UserDb.findById(req.user.id);
    if (!user || user.role !== "driver") {
      return res.status(403).json({ error: "Access denied." });
    }

    const request = await RideRequestDb.findById(requestId);
    if (!request) {
      return res.status(404).json({ error: "Request not found." });
    }

    if (request.status === "expired" || new Date() > new Date(request.expiresAt)) {
      await RideRequestDb.updateStatus(requestId, "expired");
      return res.status(400).json({ error: "This request has expired and can no longer be accepted." });
    }

    const ride = emergencyRides.find(r => r.id === request.rideId);
    if (!ride) {
      return res.status(404).json({ error: "Corresponding emergency ride not found." });
    }

    if (ride.driverId && ride.driverId !== user.id) {
      return res.status(400).json({ error: "This emergency has already been assigned to another volunteer driver." });
    }

    const driverProfile = getOrCreateDriver(user.id, user);
    driverProfile.status = "busy";

    ride.driverId = user.id;
    ride.driverName = user.name;
    ride.driverPhone = user.phone;
    ride.vehicleType = driverProfile.vehicleType;
    ride.status = "Driver Assigned";
    ride.isManual = true;

    await RideRequestDb.updateStatus(requestId, "accepted");

    // Set other pending requests for this ride to "expired"
    if (mongoose.connection.readyState === 1) {
      try {
        const MongoModel = mongoose.model("RideRequest");
        await MongoModel.updateMany(
          { rideId: request.rideId, id: { $ne: requestId }, status: "pending" },
          { $set: { status: "expired" } }
        );
      } catch (err) {
        console.error("Error updating Mongo requests:", err);
      }
    } else {
      const otherReqs = (await RideRequestDb.findByDriver(user.id)).filter(r => r.rideId === request.rideId && r.id !== requestId);
      for (const r of otherReqs) {
        r.status = "expired";
      }
    }

    // Add passenger notification
    if (ride.passengerId) {
      notifications.push({
        id: `notif_assign_${Date.now()}`,
        userId: ride.passengerId,
        title: "Volunteer Driver Assigned",
        message: `Local Hero ${user.name} (${driverProfile.vehicleType}) has accepted your emergency request! Contact them at ${user.phone}.`,
        type: "success",
        createdAt: Date.now(),
        read: false
      });
    }

    res.json({ success: true, ride });
  } catch (error) {
    console.error("Error accepting request:", error);
    res.status(500).json({ error: "Failed to accept request." });
  }
});

// Reject Request by RequestId
app.post("/api/driver/requests/:requestId/reject", authenticateToken, async (req: any, res: any) => {
  const { requestId } = req.params;
  try {
    const user = await UserDb.findById(req.user.id);
    if (!user || user.role !== "driver") {
      return res.status(403).json({ error: "Access denied." });
    }

    const request = await RideRequestDb.findById(requestId);
    if (!request) {
      return res.status(404).json({ error: "Request not found." });
    }

    await RideRequestDb.updateStatus(requestId, "rejected");
    res.json({ success: true, message: "Request rejected successfully." });
  } catch (error) {
    console.error("Error rejecting request:", error);
    res.status(500).json({ error: "Failed to reject request." });
  }
});

// Update Accepted Ride status (driver_assigned -> driver_arriving -> reached_pickup -> ride_started -> completed)
app.post("/api/driver/rides/:rideId/status", authenticateToken, async (req: any, res: any) => {
  const { rideId } = req.params;
  let { status } = req.body;
  
  // Normalise old statuses to new statuses if they are submitted
  if (status === "en_route" || status === "driver_arriving") status = "Driver Arriving";
  if (status === "arrived" || status === "reached_pickup") status = "Passenger Picked";
  if (status === "ride_started" || status === "Hospital Reached") status = "Hospital Reached";
  if (status === "completed" || status === "Completed") status = "Completed";
  if (status === "driver_assigned" || status === "Driver Assigned") status = "Driver Assigned";
  
  const validStatuses = [
    "driver_assigned", "driver_arriving", "reached_pickup", "ride_started", "completed",
    "Driver Assigned", "Driver Arriving", "Passenger Picked", "Hospital Reached", "Completed"
  ];
  if (!status || !validStatuses.includes(status)) {
    return res.status(400).json({ error: "Invalid status update stage." });
  }
  
  try {
    const user = await UserDb.findById(req.user.id);
    if (!user || user.role !== "driver") {
      return res.status(403).json({ error: "Access denied." });
    }
    
    const ride = emergencyRides.find(r => r.id === rideId && r.driverId === user.id);
    if (!ride) {
      return res.status(404).json({ error: "No active assigned ride found with this ID." });
    }
    
    ride.status = status as any;
    NotificationService.dispatchEmergencyAlerts(ride, status).catch(err => {
      console.error("Error dispatching alerts in driver status update:", err);
    });
    
    const driverProfile = getOrCreateDriver(user.id, user);
    
    let title = "";
    let message = "";
    let type: "info" | "success" | "warning" = "info";
    
    if (status === "Driver Arriving") {
      title = "Driver is Arriving";
      message = `Volunteer Driver ${user.name} is on their way with their ${driverProfile.vehicleType}. Keep your phone close!`;
      type = "info";
    } else if (status === "Passenger Picked") {
      title = "Driver Reached Pickup Point / Passenger Picked";
      message = `Driver ${user.name} has arrived at ${ride.landmark || "your village"} and picked up the passenger.`;
      type = "warning";
    } else if (status === "Hospital Reached") {
      title = "Hospital Reached";
      message = `The emergency transit has successfully reached ${ride.destinationChc}. Handing over the patient safely.`;
      type = "info";
    } else if (status === "Completed") {
      title = "Emergency Transit Completed";
      message = `You have safely arrived at ${ride.destinationChc}. Transitioning care to CHC medical staff.`;
      type = "success";
      
      // Process any referral first-ride rewards
      if (ride.passengerId) {
        ReferralService.processRideCompletion(ride.passengerId).catch(err => {
          console.error("Error in ReferralService.processRideCompletion:", err);
        });
      }
      
      // Free driver up
      driverProfile.status = "available";
      driverProfile.completedTrips += 1;

      // Populate Ride Summary and History details
      ride.completedAt = Date.now();
      
      const chc = chcs.find(c => c.name === ride.destinationChc);
      const chcVillage = chc ? chc.village : "Sherpur";
      const distance = calculateVillageDistance(ride.village, chcVillage);
      ride.distanceKm = distance;

      const speedKmh = driverProfile.vehicleType === "Bolero SUV" ? 45 : driverProfile.vehicleType === "Tractor Ambulance" ? 18 : driverProfile.vehicleType === "E-Rickshaw" ? 15 : 25;
      const duration = Math.round((distance / speedKmh) * 60) + 3; // distance / speed in hours * 60 minutes + 3 min boarding time
      ride.durationMin = duration;

      const baseFare = driverProfile.vehicleType === "Bolero SUV" ? 100 : driverProfile.vehicleType === "Tractor Ambulance" ? 150 : driverProfile.vehicleType === "E-Rickshaw" ? 30 : 50;
      const perKmRate = driverProfile.vehicleType === "Bolero SUV" ? 15 : driverProfile.vehicleType === "Tractor Ambulance" ? 10 : driverProfile.vehicleType === "E-Rickshaw" ? 8 : 12;
      const fare = Math.round(baseFare + (distance * perKmRate));
      ride.fareRupees = fare;
      ride.paymentStatus = "subsidized";

      ride.driverName = user.name;
      ride.driverPhone = user.phone;
      ride.vehicleType = driverProfile.vehicleType;
      
      const passengerUser = ride.passengerId ? await UserDb.findById(ride.passengerId) : null;
      ride.passengerName = passengerUser ? passengerUser.name : ride.patientName;
      ride.passengerPhone = passengerUser ? passengerUser.phone : ride.patientPhone;

      // Credit driver wallet with Net Earnings (Fare - Emergency Flat Platform Surcharge)
      if (ride.driverId) {
        const emergencyFlatChg = adminSettings.emergencyCharges !== undefined ? adminSettings.emergencyCharges : 50;
        const driverShare = Math.max(0, fare - emergencyFlatChg);
        try {
          await WalletService.createTransaction(
            ride.driverId,
            driverShare,
            "credit",
            `Earnings for Emergency Ride ${ride.id} (Fare: ₹${fare}, Platform Emergency Charge: ₹${emergencyFlatChg} deducted)`
          );
          console.log(`[Commission] Credited driver ${ride.driverId} with ₹${driverShare} for emergency ride ${ride.id}`);
        } catch (e) {
          console.error("Failed to credit driver wallet for completed emergency ride:", e);
        }
      }
    }
    
    if (ride.passengerId && title && message) {
      notifications.push({
        id: `notif_stat_${Date.now()}`,
        userId: ride.passengerId,
        title,
        message,
        type,
        createdAt: Date.now(),
        read: false
      });
    }
    
    // Save updated ride to DB
    await EmergencyRideDb.save(ride);
    
    // Broadcast over Socket.IO for real-time tracking
    if (typeof io !== "undefined" && io) {
      io.to(`ride_${rideId}`).emit("ride_status", { rideId, status });
      io.to(`ride_${rideId}`).emit("Ride Status", { rideId, status });
      io.to(`ride_${rideId}`).emit("ride:status", { rideId, status });
    }
    
    res.json(ride);
  } catch (error) {
    res.status(500).json({ error: "Failed to update ride status." });
  }
});

// ---------------- PASSENGER MODULE APIS ----------------

const villageDistances: Record<string, Record<string, number>> = {
  "Gauspur": { "Gauspur": 0, "Karimpur": 2.5, "Malikpur": 4.8, "Sherpur": 6.1, "Mohammadabad": 8.5 },
  "Karimpur": { "Gauspur": 2.5, "Karimpur": 0, "Malikpur": 3.2, "Sherpur": 5.4, "Mohammadabad": 7.0 },
  "Malikpur": { "Gauspur": 4.8, "Karimpur": 3.2, "Malikpur": 0, "Sherpur": 4.2, "Mohammadabad": 5.8 },
  "Sherpur": { "Gauspur": 6.1, "Karimpur": 5.4, "Malikpur": 4.2, "Sherpur": 0, "Mohammadabad": 3.5 },
  "Mohammadabad": { "Gauspur": 8.5, "Karimpur": 7.0, "Malikpur": 5.8, "Sherpur": 3.5, "Mohammadabad": 0 }
};

function calculateVillageDistance(v1: string, v2: string): number {
  const norm1 = (v1 || "").trim().toLowerCase();
  const norm2 = (v2 || "").trim().toLowerCase();
  if (!norm1 || !norm2) return 5.0;
  if (norm1 === norm2) return 0.5;
  
  for (const k1 in villageDistances) {
    if (k1.toLowerCase() === norm1) {
      for (const k2 in villageDistances[k1]) {
        if (k2.toLowerCase() === norm2) {
          return villageDistances[k1][k2];
        }
      }
    }
  }

  const lenSum = norm1.length + norm2.length;
  const diff = Math.abs(norm1.length - norm2.length);
  return parseFloat(((lenSum * 0.3) + (diff * 0.5) + 1.2).toFixed(1));
}

// Get nearby drivers for a passenger's village location
app.get("/api/drivers/nearby", authenticateToken, async (req: any, res: any) => {
  try {
    const passenger = await UserDb.findById(req.user.id);
    if (!passenger) {
      return res.status(404).json({ error: "Passenger profile not found." });
    }

    const searchVillage = (req.query.village as string) || passenger.village || "Sherpur";
    const vehicleFilter = (req.query.vehicleType as string) || "all";
    const statusFilter = (req.query.status as string) || "all";

    const queryObj: any = { role: "driver", approvalStatus: "approved", status: "active" };
    if (vehicleFilter !== "all") {
      queryObj.vehicleType = vehicleFilter;
    }

    const dbDrivers = await UserDb.find(queryObj);

    let matchingDrivers = dbDrivers.map(drv => {
      const distance = calculateVillageDistance(searchVillage, drv.village || "Sherpur");
      const eta = Math.ceil(distance * 2.5 + 2);

      const inMemDrv = drivers.find(d => d.id === drv.id);
      const currentDriverStatus = inMemDrv ? inMemDrv.status : (drv.driverStatus || "available");

      return {
        id: drv.id,
        name: drv.name,
        phone: drv.phone,
        vehicleType: drv.vehicleType || "Auto Rickshaw",
        vehicleNumber: drv.vehicleNumber || "UP-61-AB-1111",
        village: drv.village,
        status: currentDriverStatus,
        rating: drv.rating || 4.7,
        completedTrips: drv.completedTrips || 0,
        distance,
        eta
      };
    });

    if (statusFilter === "online") {
      matchingDrivers = matchingDrivers.filter(drv => drv.status !== "offline");
    } else if (statusFilter === "available") {
      matchingDrivers = matchingDrivers.filter(drv => drv.status === "available");
    }

    matchingDrivers.sort((a, b) => a.distance - b.distance);

    res.json({
      passengerVillage: searchVillage,
      driversCount: matchingDrivers.length,
      drivers: matchingDrivers
    });
  } catch (error) {
    console.error("Error finding nearby drivers:", error);
    res.status(500).json({ error: "Failed to find nearby drivers." });
  }
});

// Estimation API for Ride Bookings
app.post("/api/bookings/estimate", authenticateToken, async (req: any, res: any) => {
  const { pickupLocation, destination, rideType } = req.body;
  
  if (!pickupLocation || !pickupLocation.trim() || !destination || !destination.trim()) {
    return res.status(400).json({ error: "Pickup and Destination are required to calculate estimate." });
  }
  
  if (!["Bike", "Auto", "Car", "Emergency"].includes(rideType)) {
    return res.status(400).json({ error: "Invalid ride type specified." });
  }

  try {
    const directions = await computeDirections(pickupLocation, destination);
    const estimatedDistance = directions.distanceKm;
    const estimatedTime = directions.durationMin;
    
    let estimatedFare = 0;
    if (rideType === "Bike") {
      estimatedFare = Math.round(estimatedDistance * 6 + 15);
    } else if (rideType === "Auto") {
      estimatedFare = Math.round(estimatedDistance * 11 + 25);
    } else if (rideType === "Car") {
      estimatedFare = Math.round(estimatedDistance * 16 + 45);
    } else if (rideType === "Emergency") {
      estimatedFare = 0; // Subsidized/Free
    }

    res.json({
      estimatedDistance,
      estimatedTime,
      estimatedFare,
      route: directions
    });
  } catch (error: any) {
    console.error("Estimation failed:", error);
    // Fallback
    const textSum = pickupLocation.trim().length + destination.trim().length;
    const estimatedDistance = parseFloat(((textSum * 0.15) + 1.5).toFixed(1));
    const estimatedTime = Math.ceil(estimatedDistance * 2.2 + 4);
    let estimatedFare = 0;
    if (rideType === "Bike") estimatedFare = Math.round(estimatedDistance * 6 + 15);
    else if (rideType === "Auto") estimatedFare = Math.round(estimatedDistance * 11 + 25);
    else if (rideType === "Car") estimatedFare = Math.round(estimatedDistance * 16 + 45);

    res.json({
      estimatedDistance,
      estimatedTime,
      estimatedFare,
      route: null
    });
  }
});

// Location APIs
app.get("/api/location/geocode", authenticateToken, async (req: any, res: any) => {
  try {
    const { address } = req.query;
    if (!address) {
      return res.status(400).json({ error: "Address query parameter is required." });
    }
    const coords = await geocodeAddress(address as string);
    res.json(coords);
  } catch (error: any) {
    res.status(500).json({ error: error.message || "Failed to geocode address." });
  }
});

app.get("/api/location/directions", authenticateToken, async (req: any, res: any) => {
  try {
    const { origin, destination } = req.query;
    if (!origin || !destination) {
      return res.status(400).json({ error: "Origin and destination query parameters are required." });
    }
    const directions = await computeDirections(origin as string, destination as string);
    res.json(directions);
  } catch (error: any) {
    res.status(500).json({ error: error.message || "Failed to compute directions." });
  }
});

// Public Location APIs for Family Live Tracking
app.get("/api/public/location/geocode", async (req: any, res: any) => {
  try {
    const { address } = req.query;
    if (!address) {
      return res.status(400).json({ error: "Address query parameter is required." });
    }
    const coords = await geocodeAddress(address as string);
    res.json(coords);
  } catch (error: any) {
    res.status(500).json({ error: error.message || "Failed to geocode address." });
  }
});

app.get("/api/public/location/directions", async (req: any, res: any) => {
  try {
    const { origin, destination } = req.query;
    if (!origin || !destination) {
      return res.status(400).json({ error: "Origin and destination query parameters are required." });
    }
    const directions = await computeDirections(origin as string, destination as string);
    res.json(directions);
  } catch (error: any) {
    res.status(500).json({ error: error.message || "Failed to compute directions." });
  }
});

// Book a Ride
app.post("/api/bookings", authenticateToken, async (req: any, res: any) => {
  try {
    const { pickupLocation, destination, rideType, notes } = req.body;
    
    if (!pickupLocation || !pickupLocation.trim() || !destination || !destination.trim() || !rideType) {
      return res.status(400).json({ error: "Pickup location, destination, and ride type are mandatory." });
    }
    
    if (!["Bike", "Auto", "Car", "Emergency"].includes(rideType)) {
      return res.status(400).json({ error: "Invalid ride type specified." });
    }

    // Check if user already has an active booking
    const activeBooking = await BookingDb.findActiveByPassenger(req.user.id);
    if (activeBooking) {
      return res.status(400).json({ error: "You already have an active ride booking. Please complete or cancel it first." });
    }

    // Calculate estimations
    const textSum = pickupLocation.trim().length + destination.trim().length;
    const estimatedDistance = parseFloat(((textSum * 0.15) + 1.5).toFixed(1));
    const estimatedTime = Math.ceil(estimatedDistance * 2.2 + 4);
    
    let estimatedFare = 0;
    if (rideType === "Bike") {
      estimatedFare = Math.round(estimatedDistance * 6 + 15);
    } else if (rideType === "Auto") {
      estimatedFare = Math.round(estimatedDistance * 11 + 25);
    } else if (rideType === "Car") {
      estimatedFare = Math.round(estimatedDistance * 16 + 45);
    } else if (rideType === "Emergency") {
      estimatedFare = 0;
    }

    const booking = await BookingDb.create({
      passengerId: req.user.id,
      passengerName: req.user.name || "GramGo Passenger",
      passengerPhone: req.user.phone || "+91 99999 99999",
      pickupLocation,
      destination,
      rideType,
      notes,
      estimatedDistance,
      estimatedTime,
      estimatedFare,
      status: "pending"
    });

    // Create a notification
    notifications.push({
      id: `notif_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      userId: req.user.id,
      title: "Ride Search Started",
      message: `Searching for a nearby GramGo ${rideType} from ${pickupLocation} to ${destination}.`,
      type: "info",
      createdAt: Date.now(),
      read: false
    });

    // Trigger WhatsApp notification for new standard ride booking
    NotificationService.dispatchStandardRideAlerts(booking, "ride_booked").catch(e => {
      console.error("Error sending ride_booked WhatsApp notification:", e);
    });

    res.status(201).json(booking);
  } catch (error) {
    console.error("Booking creation error:", error);
    res.status(500).json({ error: "Failed to create ride booking." });
  }
});

// Get active booking for current user
app.get("/api/bookings/active", authenticateToken, async (req: any, res: any) => {
  try {
    const booking = await BookingDb.findActiveByPassenger(req.user.id);
    if (!booking) {
      return res.json(null);
    }
    
    // Advance simulation status if applicable
    const updated = await getUpdatedBookingStatus(booking);
    res.json(updated);
  } catch (error) {
    console.error("Get active booking error:", error);
    res.status(500).json({ error: "Failed to fetch active booking." });
  }
});

// Get booking history for current user
app.get("/api/bookings/history", authenticateToken, async (req: any, res: any) => {
  try {
    const page = parseInt(String(req.query.page)) || 1;
    const limit = parseInt(String(req.query.limit)) || 5;

    // Run active simulation checks first to keep history up to date
    const activeBooking = await BookingDb.findActiveByPassenger(req.user.id);
    if (activeBooking) {
      await getUpdatedBookingStatus(activeBooking);
    }

    const result = await BookingDb.findByPassenger(req.user.id, page, limit);
    res.json(result);
  } catch (error) {
    console.error("Get booking history error:", error);
    res.status(500).json({ error: "Failed to fetch booking history." });
  }
});

// Cancel active booking
app.post("/api/bookings/:id/cancel", authenticateToken, async (req: any, res: any) => {
  try {
    const { id } = req.params;
    const booking = await BookingDb.findById(id);
    
    if (!booking) {
      return res.status(404).json({ error: "Ride booking not found." });
    }

    if (booking.passengerId !== req.user.id) {
      return res.status(403).json({ error: "Unauthorized access to this booking." });
    }

    if (!["pending", "accepted"].includes(booking.status)) {
      return res.status(400).json({ error: "Cannot cancel a booking that is already completed or cancelled." });
    }

    const updated = await BookingDb.updateStatus(id, "cancelled");
    
    // Free the driver if assigned
    if (booking.driverId && !booking.driverId.startsWith("drv_gen_")) {
      const drv = drivers.find(d => d.id === booking.driverId);
      if (drv) {
        drv.status = "available";
      }
    }

    // Add cancellation notification
    notifications.push({
      id: `notif_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      userId: req.user.id,
      title: "Ride Booking Cancelled",
      message: `Your ${booking.rideType} ride booking has been cancelled successfully.`,
      type: "warning",
      createdAt: Date.now(),
      read: false
    });

    if (updated) {
      NotificationService.dispatchStandardRideAlerts(updated, "ride_cancelled").catch(e => {
        console.error("Error sending ride_cancelled WhatsApp notification:", e);
      });
    }

    res.json(updated);
  } catch (error) {
    console.error("Cancel booking error:", error);
    res.status(500).json({ error: "Failed to cancel booking." });
  }
});

// Book ride (authenticated)
app.post("/api/rides/book", authenticateToken, async (req: any, res: any) => {
  const { patientName, patientPhone, emergencyType, priority, village, landmark, destinationChc } = req.body;
  
  if (!patientName || !patientPhone || !emergencyType || !village) {
    return res.status(400).json({ error: "Missing ride details (patient name, phone, type, and village are required)." });
  }
  
  const newRide: EmergencyRide = {
    id: `ride_${Date.now()}`,
    passengerId: req.user.id,
    patientName,
    patientPhone,
    emergencyType,
    priority: priority || "urgent",
    village,
    landmark: landmark || "Main Square",
    status: "searching",
    createdAt: Date.now(),
    destinationChc: destinationChc || "Nearest Community Health Centre"
  };
  
  emergencyRides.push(newRide);
  await dispatchRideRequests(newRide);
  
  NotificationService.dispatchEmergencyAlerts(newRide, "Emergency Requested").catch(err => {
    console.error("Error dispatching alerts in rides/book:", err);
  });
  
  // Emit starting notification
  notifications.push({
    id: `notif_${Date.now()}`,
    userId: req.user.id,
    title: "Ride Dispatch Initiated",
    message: `Searching for available volunteer drivers near ${village} for ${emergencyType} transport.`,
    type: "warning",
    createdAt: Date.now(),
    read: false
  });
  
  res.status(201).json(newRide);
});

// Get passenger ride history
app.get("/api/rides/history", authenticateToken, (req: any, res: any) => {
  // Update status dynamically first
  emergencyRides.forEach(ride => {
    if (ride.passengerId === req.user.id) {
      getUpdatedRideStatus(ride);
    }
  });
  
  const userRides = emergencyRides.filter(ride => ride.passengerId === req.user.id);
  userRides.sort((a, b) => b.createdAt - a.createdAt);
  res.json(userRides);
});

// Get active passenger ride
app.get("/api/rides/active", authenticateToken, (req: any, res: any) => {
  // Update statuses
  emergencyRides.forEach(ride => {
    if (ride.passengerId === req.user.id) {
      getUpdatedRideStatus(ride);
    }
  });
  
  const active = emergencyRides.find(
    ride => ride.passengerId === req.user.id && ride.status !== "completed"
  );
  
  res.json(active || null);
});

// Get cancellation reasons
app.get("/api/rides/cancellation-reasons", authenticateToken, (req: any, res: any) => {
  const reasons = {
    passenger: [
      "Patient found alternative transport",
      "Condition improved / No longer needed",
      "Accidentally requested / Test request",
      "Driver is taking too long to arrive",
      "Other emergency services arrived (e.g., 108 ambulance)"
    ],
    driver: [
      "Vehicle issue / Mechanical breakdown",
      "Route is blocked / Road inaccessible",
      "Unable to contact patient",
      "Another higher-priority emergency came up",
      "Incorrect location / landmark details"
    ]
  };
  res.json(reasons);
});

// Get cancellation history / logs
app.get("/api/rides/cancellations/history", authenticateToken, async (req: any, res: any) => {
  try {
    const allLogs = await RideCancellationDb.findAll();
    // Non-admin users only see logs related to their passengerId or driverId
    if (req.user.role === "admin") {
      res.json(allLogs);
    } else if (req.user.role === "driver") {
      // Find rides where they were the driver and check logs
      const driverRideIds = emergencyRides
        .filter(r => r.driverId === req.user.id)
        .map(r => r.id);
      const filteredLogs = allLogs.filter(log => driverRideIds.includes(log.rideId));
      res.json(filteredLogs);
    } else {
      // Passenger
      const passengerRideIds = emergencyRides
        .filter(r => r.passengerId === req.user.id)
        .map(r => r.id);
      const filteredLogs = allLogs.filter(log => passengerRideIds.includes(log.rideId));
      res.json(filteredLogs);
    }
  } catch (err: any) {
    console.error("Fetch cancellation history error:", err);
    res.status(500).json({ error: "Failed to fetch cancellation history." });
  }
});

// Get details of a single ride by ID (for Ride Summary display)
app.get("/api/rides/:rideId", authenticateToken, async (req: any, res: any) => {
  const { rideId } = req.params;
  try {
    const ride = emergencyRides.find(r => r.id === rideId);
    if (!ride) {
      return res.status(404).json({ error: "Ride not found." });
    }
    // Verify user is authorized to view this ride's details
    if (ride.passengerId !== req.user.id && ride.driverId !== req.user.id && req.user.role !== "admin") {
      return res.status(403).json({ error: "Unauthorized access to ride details." });
    }
    res.json(ride);
  } catch (error) {
    res.status(500).json({ error: "Failed to fetch ride details." });
  }
});

// Cancel active emergency ride
app.post("/api/rides/:id/cancel", authenticateToken, async (req: any, res: any) => {
  const { id } = req.params;
  const { reason, cancelledBy } = req.body;
  
  if (!reason) {
    return res.status(400).json({ error: "Cancellation reason is required." });
  }
  
  try {
    const ride = emergencyRides.find(r => r.id === id);
    if (!ride) {
      return res.status(404).json({ error: "Emergency ride request not found." });
    }
    
    // Check authorization:
    // Admin can cancel anything.
    // Passenger can cancel their own ride.
    // Driver can cancel if they are the assigned driver.
    let authorized = false;
    if (req.user.role === "admin") {
      authorized = true;
    } else if (req.user.role === "driver" && ride.driverId === req.user.id) {
      authorized = true;
    } else if (req.user.id === ride.passengerId) {
      authorized = true;
    }
    
    if (!authorized) {
      return res.status(403).json({ error: "Unauthorized to cancel this ride request." });
    }
    
    if (ride.status === "completed" || ride.status === "Completed" || ride.status === "cancelled" || ride.status === "Cancelled") {
      return res.status(400).json({ error: "Cannot cancel a completed or already cancelled ride." });
    }
    
    // Update ride properties
    const oldStatus = ride.status;
    ride.status = "Cancelled";
    ride.cancelledBy = cancelledBy || (req.user.role === "driver" ? "driver" : req.user.role === "admin" ? "admin" : "passenger");
    ride.cancelReason = reason;
    ride.cancelledAt = Date.now();
    
    NotificationService.dispatchEmergencyAlerts(ride, "Cancelled").catch(err => {
      console.error("Error dispatching alerts in cancel ride:", err);
    });
    
    // Free up the driver if assigned
    if (ride.driverId) {
      const drv = drivers.find(d => d.id === ride.driverId);
      if (drv) {
        drv.status = "available";
      }
    }
    
    // Log the cancellation history
    const logId = `canc_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`;
    const logEntry = {
      id: logId,
      rideId: ride.id,
      patientName: ride.patientName,
      emergencyType: ride.emergencyType,
      cancelledBy: ride.cancelledBy,
      cancelledById: req.user.id,
      cancelledByName: req.user.name || "User",
      reason: reason,
      createdAt: Date.now()
    };
    
    await RideCancellationDb.log(logEntry);
    await EmergencyRideDb.save(ride);
    
    // Dispatch notifications
    // Passenger notification
    if (ride.passengerId) {
      notifications.push({
        id: `notif_${Date.now()}_p`,
        userId: ride.passengerId,
        title: "Emergency Ride Cancelled",
        message: `Your emergency ride request for ${ride.patientName} was cancelled by ${ride.cancelledBy}. Reason: "${reason}".`,
        type: "error",
        createdAt: Date.now(),
        read: false
      });
    }
    
    // Driver notification
    if (ride.driverId) {
      notifications.push({
        id: `notif_${Date.now()}_d`,
        userId: ride.driverId,
        title: "Emergency Assigned Ride Cancelled",
        message: `The assigned emergency ride for ${ride.patientName} was cancelled. Reason: "${reason}".`,
        type: "error",
        createdAt: Date.now(),
        read: false
      });
    }
    
    res.json({ success: true, ride, cancellationLog: logEntry });
  } catch (err: any) {
    console.error("Cancel ride error:", err);
    res.status(500).json({ error: "Failed to cancel emergency ride." });
  }
});

// Get passenger notifications
app.get("/api/notifications", authenticateToken, (req: any, res: any) => {
  const userNotifs = notifications.filter(n => n.userId === req.user.id);
  
  // Seed a welcome notification if there are none
  if (userNotifs.length === 0) {
    notifications.push({
      id: `notif_welcome_${Date.now()}`,
      userId: req.user.id,
      title: "Welcome to GramGo!",
      message: "Your secure localized emergency dispatcher is active. Set up your emergency contacts and home village in Settings to receive faster match times.",
      type: "info",
      createdAt: Date.now() - 3600000,
      read: false
    });
  }
  
  const updatedNotifs = notifications.filter(n => n.userId === req.user.id);
  updatedNotifs.sort((a, b) => b.createdAt - a.createdAt);
  res.json(updatedNotifs);
});

// Mark passenger notifications as read
app.post("/api/notifications/read", authenticateToken, (req: any, res: any) => {
  notifications.forEach(n => {
    if (n.userId === req.user.id) {
      n.read = true;
    }
  });
  res.json({ success: true });
});

// --- EMERGENCY NOTIFICATION SYSTEM ENDPOINTS ---

// Get all emergency notifications (Log)
app.get("/api/emergency-notifications", async (req, res) => {
  try {
    const logs = await EmergencyNotificationDb.findAll();
    logs.sort((a, b) => b.createdAt - a.createdAt);
    res.json(logs);
  } catch (err: any) {
    res.status(500).json({ error: err.message || "Failed to fetch notification logs." });
  }
});

// Trigger a manual simulated emergency notification
app.post("/api/emergency-notifications/test", async (req, res) => {
  const { recipientRole, recipientName, recipientContact, message, eventType, channels } = req.body;
  if (!recipientRole || !recipientName || !recipientContact || !message) {
    return res.status(400).json({ error: "Missing required notification fields." });
  }

  try {
    const activeChannels = (channels || ["SMS", "WhatsApp", "Push Notification", "Email"]).map((chan: string) => {
      let name = chan;
      if (chan === "Push") name = "Push Notification";
      return {
        channel: name as any,
        status: "delivered" as const,
        sentAt: Date.now()
      };
    });

    const mockRecord = {
      id: `nt_manual_${Date.now()}`,
      rideId: "ride_manual",
      eventType: eventType || "Manual Broadcast",
      recipientRole,
      recipientName,
      recipientContact,
      message,
      channels: activeChannels,
      createdAt: Date.now()
    };

    await EmergencyNotificationDb.save(mockRecord);
    res.status(201).json(mockRecord);
  } catch (err: any) {
    res.status(500).json({ error: err.message || "Failed to dispatch simulation alert." });
  }
});

// Clear/Reset emergency notification log
app.post("/api/emergency-notifications/clear", async (req, res) => {
  try {
    await EmergencyNotificationDb.clear();
    res.json({ success: true, message: "Emergency notification logs reset to seed data." });
  } catch (err: any) {
    res.status(500).json({ error: err.message || "Failed to reset notification logs." });
  }
});

// Update passenger profile details
app.put("/api/profile", authenticateToken, async (req: any, res: any) => {
  const { name, email, phone, village, district, vehicleType, vehicleNumber } = req.body;
  
  try {
    const updatedUser = await UserDb.updateProfile(req.user.id, {
      name,
      email,
      phone,
      village,
      district,
      vehicleType,
      vehicleNumber
    });
    
    if (!updatedUser) {
      return res.status(404).json({ error: "User profile not found." });
    }
    
    notifications.push({
      id: `notif_${Date.now()}`,
      userId: req.user.id,
      title: "Profile Updated",
      message: "Your personal details have been updated successfully.",
      type: "success",
      createdAt: Date.now(),
      read: false
    });
    
    const { passwordHash: _, ...userResponse } = updatedUser;
    res.json(userResponse);
  } catch (error: any) {
    console.error("Profile update error:", error);
    res.status(500).json({ error: "Failed to update profile." });
  }
});

// Update user or driver location coordinates
app.post("/api/user/location", authenticateToken, async (req: any, res: any) => {
  const { latitude, longitude } = req.body;
  if (latitude === undefined || longitude === undefined) {
    return res.status(400).json({ error: "Latitude and longitude are required." });
  }

  try {
    const updatedUser = await UserDb.updateProfile(req.user.id, {
      latitude: parseFloat(latitude),
      longitude: parseFloat(longitude),
      locationUpdatedAt: new Date()
    });

    if (!updatedUser) {
      return res.status(404).json({ error: "User profile not found." });
    }

    const { passwordHash: _, ...userResponse } = updatedUser;
    res.json({
      success: true,
      user: userResponse
    });
  } catch (error: any) {
    console.error("Failed to update user location:", error);
    res.status(500).json({ error: "Failed to save user coordinates." });
  }
});

// Get driver location by driverId
app.get("/api/drivers/:driverId/location", authenticateToken, async (req: any, res: any) => {
  try {
    const driver = await UserDb.findById(req.params.driverId);
    if (!driver || driver.role !== "driver") {
      return res.status(404).json({ error: "Driver not found." });
    }

    res.json({
      driverId: driver.id,
      name: driver.name,
      phone: driver.phone,
      latitude: driver.latitude || null,
      longitude: driver.longitude || null,
      locationUpdatedAt: driver.locationUpdatedAt || null
    });
  } catch (error: any) {
    console.error("Failed to fetch driver location:", error);
    res.status(500).json({ error: "Failed to fetch driver location." });
  }
});

// Get all driver locations
app.get("/api/drivers/locations", authenticateToken, async (req: any, res: any) => {
  try {
    const drivers = await UserDb.find({ role: "driver" });
    const locations = drivers.map(d => ({
      driverId: d.id,
      name: d.name,
      phone: d.phone,
      status: d.driverStatus || "offline",
      vehicleType: d.vehicleType || "Auto Rickshaw",
      latitude: d.latitude || null,
      longitude: d.longitude || null,
      locationUpdatedAt: d.locationUpdatedAt || null
    }));
    res.json(locations);
  } catch (error: any) {
    console.error("Failed to fetch driver locations:", error);
    res.status(500).json({ error: "Failed to fetch driver locations." });
  }
});

// Get passenger settings
app.get("/api/user/settings", authenticateToken, (req: any, res: any) => {
  const userId = req.user.id;
  if (!userSettingsMap[userId]) {
    userSettingsMap[userId] = {
      language: "english",
      smsNotifications: true,
      whatsappNotifications: false,
      autoAdviceEnabled: true,
      emergencyContacts: [
        { name: "Gram Panchayat Sarpanch", relation: "Village Leader", phone: "+91 94544 99999" },
        { name: "District Hospital Desk", relation: "Primary Medical Help", phone: "0548-2220456" }
      ]
    };
  }
  res.json(userSettingsMap[userId]);
});

// Update passenger settings
app.put("/api/user/settings", authenticateToken, (req: any, res: any) => {
  const userId = req.user.id;
  const { language, smsNotifications, whatsappNotifications, autoAdviceEnabled, emergencyContacts } = req.body;
  
  if (!userSettingsMap[userId]) {
    userSettingsMap[userId] = {
      language: "english",
      smsNotifications: true,
      whatsappNotifications: false,
      autoAdviceEnabled: true,
      emergencyContacts: []
    };
  }
  
  if (language !== undefined) userSettingsMap[userId].language = language;
  if (smsNotifications !== undefined) userSettingsMap[userId].smsNotifications = smsNotifications;
  if (whatsappNotifications !== undefined) userSettingsMap[userId].whatsappNotifications = whatsappNotifications;
  if (autoAdviceEnabled !== undefined) userSettingsMap[userId].autoAdviceEnabled = autoAdviceEnabled;
  if (emergencyContacts !== undefined) userSettingsMap[userId].emergencyContacts = emergencyContacts;
  
  res.json(userSettingsMap[userId]);
});

// Gemini AI first responder advice route
app.post("/api/gemini/first-aid", async (req, res) => {
  const { emergencyType, language } = req.body;
  
  if (!emergencyType) {
    res.status(400).json({ error: "Please provide the type of medical emergency." });
    return;
  }
  
  const targetLang = language === "hindi" ? "Hindi" : "English";
  
  try {
    const ai = getGeminiAI();
    
    const prompt = `You are a warm, highly expert emergency medical advisor assisting rural families in India. 
They are waiting for a village vehicle to transport them to the Community Health Centre (CHC) for a '${emergencyType}' emergency.
Provide exactly 4 clear, life-saving, simple first-aid bullet points in ${targetLang} language that a layperson with no medical background can do right now. 
Keep it extremely practical, action-oriented, brief, and highly reassuring. Mention what NOT to do as well if relevant.
Do not use technical medical jargon. Use simple, direct sentences. Response length must be short (maximum 150 words).`;

    const response = await ai.models.generateContent({
      model: "gemini-3.5-flash",
      contents: prompt,
      config: {
        temperature: 0.7,
      }
    });
    
    res.json({ advice: response.text });
  } catch (error: any) {
    if (error && error.message && error.message.includes("GEMINI_API_KEY")) {
      console.log("[GramGo Status] Gemini API key not configured. Responding with rich localized first-aid guidelines.");
    } else {
      console.error("Gemini API Error:", error);
    }
    
    // Provide a solid, highly detailed fallback for the specified emergencies when Gemini isn't available
    let fallbackAdvice = "";
    if (language === "hindi") {
      if (emergencyType.toLowerCase().includes("maternity") || emergencyType.toLowerCase().includes("delivery")) {
        fallbackAdvice = "• गर्भवती महिला को हवादार और शांत जगह पर आराम से लेटने दें।\n• महिला को आश्वस्त करें और गहरी सांसें लेने को कहें।\n• साफ-सुथरा कपड़ा, पानी और जरूरी दस्तावेज तैयार रखें।\n• घबराएं नहीं, वाहन रास्ते में है। डॉक्टर से संपर्क बनाए रखें।";
      } else if (emergencyType.toLowerCase().includes("accident") || emergencyType.toLowerCase().includes("trauma")) {
        fallbackAdvice = "• यदि खून बह रहा है, तो साफ कपड़े से घाव पर सीधा दबाव डालें।\n• घायल व्यक्ति को हिलाने-डुलाने से बचें, विशेषकर गर्दन या रीढ़ की हड्डी को।\n• होश में रहने पर उनसे बात करते रहें, उन्हें सोने न दें।\n• कोई भी खाने-पीने की चीज़ जबरदस्ती मुंह में न डालें।";
      } else {
        fallbackAdvice = "• मरीज को शांत रखें और आरामदेह स्थिति में बैठाएं/लेटाएं।\n• ढीले कपड़े पहनाएं और ताजी हवा आने दें।\n• मरीज के होश और सांस लेने की गति पर नजर रखें।\n• घबराएं नहीं, वाहन जल्द ही आपके पास पहुंच रहा है।";
      }
    } else {
      if (emergencyType.toLowerCase().includes("maternity") || emergencyType.toLowerCase().includes("delivery")) {
        fallbackAdvice = "• Keep the expectant mother lying comfortably in a calm, well-ventilated space.\n• Help her remain calm by encouraging slow, deep breathing.\n• Keep clean towels, warm water, and her medical card ready.\n• Stay in call contact with the local ASHA worker or auxiliary nurse.";
      } else if (emergencyType.toLowerCase().includes("accident") || emergencyType.toLowerCase().includes("trauma")) {
        fallbackAdvice = "• Apply firm, direct pressure with a clean cloth to any bleeding wounds to stop blood loss.\n• Do not move the injured person unnecessarily, especially if neck/spine injury is suspected.\n• Keep the person warm, comfortable, and reassure them constantly.\n• Do not give them anything to eat or drink if they are semi-conscious.";
      } else {
        fallbackAdvice = "• Help the patient sit or lie down in a comfortable, breezy location.\n• Loosen any tight clothing around their neck and chest.\n• Continuously monitor their breathing and consciousness levels.\n• Reassure them that help is on the way and keep fluids ready only if fully awake.";
      }
    }
    
    res.json({
      advice: fallbackAdvice,
      isFallback: true,
      errorInfo: error.message
    });
  }
});

// ---------------- ADMIN MODULE STATE & APIS ----------------

let adminSettings = {
  autoSimulateRides: true,
  smsNotifications: true,
  maxDriverRadiusKm: 15,
  emergencyHotline: "+91 94544 99999",
  allowedVillages: ["Sherpur", "Gauspur", "Karimpur", "Malikpur", "Sohwal", "Dildarnagar"],
  commissionPercentage: 10,
  emergencyCharges: 50
};

// Middleware to verify admin access
function verifyAdmin(req: any, res: any, next: any) {
  if (req.user && (req.user.role === "admin" || req.user.role === "Super Admin" || req.user.role === "Admin")) {
    next();
  } else {
    res.status(403).json({ error: "Access denied. Admin credentials required." });
  }
}

// ---------------- ROLE MANAGEMENT APIS ----------------

// Roles CRUD - Read All
app.get("/api/admin/roles", authenticateToken, verifyAdmin, async (req: any, res: any) => {
  try {
    const roles = await RoleDb.find();
    res.json(roles);
  } catch (err: any) {
    res.status(500).json({ error: "Failed to fetch roles." });
  }
});

// Roles CRUD - Read One
app.get("/api/admin/roles/:id", authenticateToken, verifyAdmin, async (req: any, res: any) => {
  try {
    const role = await RoleDb.findById(req.params.id);
    if (!role) {
      return res.status(404).json({ error: "Role not found." });
    }
    res.json(role);
  } catch (err: any) {
    res.status(500).json({ error: "Failed to fetch role." });
  }
});

// Roles CRUD - Create
app.post("/api/admin/roles", authenticateToken, verifyAdmin, async (req: any, res: any) => {
  try {
    const { name, description, permissions } = req.body;
    if (!name || !description) {
      return res.status(400).json({ error: "Name and description are required." });
    }
    // Check if duplicate name
    const existing = await RoleDb.findOne({ name });
    if (existing) {
      return res.status(400).json({ error: "A role with this name already exists." });
    }

    const newRole = await RoleDb.create({
      name,
      description,
      permissions: permissions || [],
      isSystem: false
    });
    res.status(201).json(newRole);
  } catch (err: any) {
    res.status(500).json({ error: "Failed to create role." });
  }
});

// Roles CRUD - Update
app.put("/api/admin/roles/:id", authenticateToken, verifyAdmin, async (req: any, res: any) => {
  try {
    const { name, description, permissions } = req.body;
    const role = await RoleDb.findById(req.params.id);
    if (!role) {
      return res.status(404).json({ error: "Role not found." });
    }

    // Prevent duplicating names on update
    if (name && name.toLowerCase() !== role.name.toLowerCase()) {
      const existing = await RoleDb.findOne({ name });
      if (existing) {
        return res.status(400).json({ error: "A role with this name already exists." });
      }
    }

    const updated = await RoleDb.findByIdAndUpdate(req.params.id, {
      name,
      description,
      permissions
    });
    res.json(updated);
  } catch (err: any) {
    res.status(500).json({ error: "Failed to update role." });
  }
});

// Roles CRUD - Delete
app.delete("/api/admin/roles/:id", authenticateToken, verifyAdmin, async (req: any, res: any) => {
  try {
    const success = await RoleDb.findByIdAndDelete(req.params.id);
    if (!success) {
      return res.status(404).json({ error: "Role not found or cannot be deleted." });
    }
    res.json({ success: true, message: "Role deleted successfully." });
  } catch (err: any) {
    res.status(400).json({ error: err.message || "Failed to delete role." });
  }
});


// ---------------- PERMISSION MANAGEMENT APIS ----------------

// Permissions CRUD - Read All
app.get("/api/admin/permissions", authenticateToken, verifyAdmin, async (req: any, res: any) => {
  try {
    const permissions = await PermissionDb.find();
    res.json(permissions);
  } catch (err: any) {
    res.status(500).json({ error: "Failed to fetch permissions." });
  }
});

// Permissions CRUD - Read One
app.get("/api/admin/permissions/:id", authenticateToken, verifyAdmin, async (req: any, res: any) => {
  try {
    const permission = await PermissionDb.findById(req.params.id);
    if (!permission) {
      return res.status(404).json({ error: "Permission not found." });
    }
    res.json(permission);
  } catch (err: any) {
    res.status(500).json({ error: "Failed to fetch permission." });
  }
});

// Permissions CRUD - Create
app.post("/api/admin/permissions", authenticateToken, verifyAdmin, async (req: any, res: any) => {
  try {
    const { name, description, module } = req.body;
    if (!name || !description || !module) {
      return res.status(400).json({ error: "Name, description, and module are required." });
    }

    // Check if duplicate name
    const existing = await PermissionDb.findOne({ name });
    if (existing) {
      return res.status(400).json({ error: "A permission with this name already exists." });
    }

    const newPerm = await PermissionDb.create({ name, description, module });
    res.status(201).json(newPerm);
  } catch (err: any) {
    res.status(500).json({ error: "Failed to create permission." });
  }
});

// Permissions CRUD - Update
app.put("/api/admin/permissions/:id", authenticateToken, verifyAdmin, async (req: any, res: any) => {
  try {
    const { name, description, module } = req.body;
    const permission = await PermissionDb.findById(req.params.id);
    if (!permission) {
      return res.status(404).json({ error: "Permission not found." });
    }

    if (name && name.toLowerCase() !== permission.name.toLowerCase()) {
      const existing = await PermissionDb.findOne({ name });
      if (existing) {
        return res.status(400).json({ error: "A permission with this name already exists." });
      }
    }

    const updated = await PermissionDb.findByIdAndUpdate(req.params.id, { name, description, module });
    res.json(updated);
  } catch (err: any) {
    res.status(500).json({ error: "Failed to update permission." });
  }
});

// Permissions CRUD - Delete
app.delete("/api/admin/permissions/:id", authenticateToken, verifyAdmin, async (req: any, res: any) => {
  try {
    const success = await PermissionDb.findByIdAndDelete(req.params.id);
    if (!success) {
      return res.status(404).json({ error: "Permission not found." });
    }
    res.json({ success: true, message: "Permission deleted successfully." });
  } catch (err: any) {
    res.status(500).json({ error: "Failed to delete permission." });
  }
});


// ---------------- ADMIN ACCOUNT MANAGEMENT APIS ----------------

// Fetch admins (with Search, Pagination, Filters)
app.get("/api/admin/admins", authenticateToken, verifyAdmin, async (req: any, res: any) => {
  try {
    const allUsers = await UserDb.find({});
    
    // Admins are users whose role is admin, Super Admin, Admin, or any role other than passenger/driver
    let admins = allUsers.filter(u => 
      u.role.toLowerCase() === "admin" || 
      u.role.toLowerCase() === "super admin" || 
      (u.role.toLowerCase() !== "passenger" && u.role.toLowerCase() !== "driver")
    );

    // Search filter (name, email, phone)
    const { search, status, role, page = 1, limit = 5 } = req.query;
    if (search) {
      const q = String(search).toLowerCase();
      admins = admins.filter(u => 
        u.name.toLowerCase().includes(q) || 
        (u.email && u.email.toLowerCase().includes(q)) || 
        u.phone.includes(q)
      );
    }

    // Status filter
    if (status && status !== "all") {
      admins = admins.filter(u => (u.status || "active") === status);
    }

    // Role filter
    if (role && role !== "all") {
      admins = admins.filter(u => u.role.toLowerCase() === String(role).toLowerCase());
    }

    // Pagination
    const totalCount = admins.length;
    const p = Math.max(1, parseInt(String(page)) || 1);
    const lim = Math.max(1, parseInt(String(limit)) || 5);
    const totalPages = Math.ceil(totalCount / lim);
    const startIndex = (p - 1) * lim;
    const paginatedAdmins = admins.slice(startIndex, startIndex + lim);

    // Remove passwordHash from response
    const safeAdmins = paginatedAdmins.map(({ passwordHash, ...rest }) => rest);

    res.json({
      admins: safeAdmins,
      totalCount,
      page: p,
      totalPages,
      limit: lim
    });
  } catch (err: any) {
    console.error("Fetch admins error:", err);
    res.status(500).json({ error: "Failed to fetch admin accounts." });
  }
});

// Create Admin
app.post("/api/admin/admins", authenticateToken, verifyAdmin, async (req: any, res: any) => {
  try {
    const { name, phone, email, password, role, village, district } = req.body;
    if (!name || !phone || !password || !role || !village) {
      return res.status(400).json({ error: "Name, phone, password, role, and village are required." });
    }

    // Check duplicate
    const existing = await UserDb.findOne({ phone, email });
    if (existing) {
      return res.status(400).json({ error: "A user with this phone or email already exists." });
    }

    const passwordHash = bcrypt.hashSync(password, 10);
    const newAdmin = await UserDb.create({
      name,
      phone,
      email,
      passwordHash,
      role,
      village,
      district: district || "Ghazipur",
      status: "active"
    });

    const { passwordHash: _, ...response } = newAdmin;
    res.status(201).json(response);
  } catch (err: any) {
    console.error("Create admin error:", err);
    res.status(500).json({ error: "Failed to create admin account." });
  }
});

// Edit Admin
app.put("/api/admin/admins/:id", authenticateToken, verifyAdmin, async (req: any, res: any) => {
  try {
    const { name, phone, email, role, village, district, status } = req.body;
    const adminId = req.params.id;

    const user = await UserDb.findById(adminId);
    if (!user) {
      return res.status(404).json({ error: "Admin account not found." });
    }

    const updateData: any = {};
    if (name !== undefined) updateData.name = name;
    if (phone !== undefined) updateData.phone = phone;
    if (email !== undefined) updateData.email = email;
    if (role !== undefined) updateData.role = role;
    if (village !== undefined) updateData.village = village;
    if (district !== undefined) updateData.district = district;
    if (status !== undefined) updateData.status = status;

    const updatedUser = await UserDb.updateProfile(adminId, updateData);
    if (!updatedUser) {
      return res.status(400).json({ error: "Failed to update admin account." });
    }

    const { passwordHash: _, ...response } = updatedUser;
    res.json(response);
  } catch (err: any) {
    console.error("Update admin error:", err);
    res.status(500).json({ error: "Failed to update admin account." });
  }
});

// Delete Admin
app.delete("/api/admin/admins/:id", authenticateToken, verifyAdmin, async (req: any, res: any) => {
  try {
    const adminId = req.params.id;
    if (adminId === req.user.id) {
      return res.status(400).json({ error: "You cannot delete your own administrative account." });
    }

    const success = await UserDb.delete(adminId);
    if (!success) {
      return res.status(404).json({ error: "Admin account not found." });
    }

    res.json({ success: true, message: "Admin account deleted successfully." });
  } catch (err: any) {
    console.error("Delete admin error:", err);
    res.status(500).json({ error: "Failed to delete admin account." });
  }
});

// Suspend Admin
app.put("/api/admin/admins/:id/suspend", authenticateToken, verifyAdmin, async (req: any, res: any) => {
  try {
    const adminId = req.params.id;
    if (adminId === req.user.id) {
      return res.status(400).json({ error: "You cannot suspend your own administrative account." });
    }

    const updated = await UserDb.updateProfile(adminId, { status: "suspended" });
    if (!updated) {
      return res.status(404).json({ error: "Admin account not found." });
    }

    res.json({ success: true, message: "Admin account suspended successfully." });
  } catch (err: any) {
    res.status(500).json({ error: "Failed to suspend admin account." });
  }
});

// Activate Admin
app.put("/api/admin/admins/:id/activate", authenticateToken, verifyAdmin, async (req: any, res: any) => {
  try {
    const adminId = req.params.id;
    const updated = await UserDb.updateProfile(adminId, { status: "active" });
    if (!updated) {
      return res.status(404).json({ error: "Admin account not found." });
    }

    res.json({ success: true, message: "Admin account activated successfully." });
  } catch (err: any) {
    res.status(500).json({ error: "Failed to activate admin account." });
  }
});

// Reset Admin Password
app.put("/api/admin/admins/:id/reset-password", authenticateToken, verifyAdmin, async (req: any, res: any) => {
  try {
    const { password } = req.body;
    if (!password || password.length < 6) {
      return res.status(400).json({ error: "A valid new password of at least 6 characters is required." });
    }

    const adminId = req.params.id;
    const passwordHash = bcrypt.hashSync(password, 10);
    const updated = await UserDb.updateProfile(adminId, { passwordHash });
    if (!updated) {
      return res.status(404).json({ error: "Admin account not found." });
    }

    res.json({ success: true, message: "Password reset completed successfully." });
  } catch (err: any) {
    res.status(500).json({ error: "Failed to reset password." });
  }
});


// ---------------- USER MANAGEMENT SYSTEM REST APIS ----------------
import { UserController } from "./server/controllers/userController";
import { EmergencyController } from "./server/controllers/emergencyController";
import { EmergencyContactController } from "./server/controllers/emergencyContactController";

// Emergency SOS APIs
app.post("/api/sos/trigger", authenticateToken, EmergencyController.triggerSOS);
app.get("/api/sos/active", authenticateToken, EmergencyController.getActiveSOS);

// Emergency Contacts CRUD APIs
app.get("/api/contacts", authenticateToken, EmergencyContactController.getContacts);
app.post("/api/contacts", authenticateToken, EmergencyContactController.addContact);
app.put("/api/contacts/:contactId", authenticateToken, EmergencyContactController.updateContact);
app.delete("/api/contacts/:contactId", authenticateToken, EmergencyContactController.deleteContact);

// Users Table - Paginated, searched & filtered
app.get("/api/admin/users", authenticateToken, verifyAdmin, UserController.getUsers);

// Single User Profile Details
app.get("/api/admin/users/:id", authenticateToken, verifyAdmin, UserController.getUserById);

// Update/Edit User Details
app.put("/api/admin/users/:id", authenticateToken, verifyAdmin, UserController.updateUser);

// Suspend User
app.put("/api/admin/users/:id/suspend", authenticateToken, verifyAdmin, UserController.suspendUser);

// Activate User
app.put("/api/admin/users/:id/activate", authenticateToken, verifyAdmin, UserController.activateUser);

// Delete User
app.delete("/api/admin/users/:id", authenticateToken, verifyAdmin, UserController.deleteUser);

// Get User's Emergency Ride History
app.get("/api/admin/users/:id/rides", authenticateToken, verifyAdmin, UserController.getUserRideHistory);

// Get User's Subsidy Wallet Ledger & Balance
app.get("/api/admin/users/:id/wallet", authenticateToken, verifyAdmin, UserController.getUserWalletHistory);

// --- WALLET FOUNDATION APIS ---
import walletRoutes from "./server/routes/walletRoutes";
app.use("/api/wallet", authenticateToken, walletRoutes);

// --- PAYMENT FOUNDATION APIS ---
import paymentRoutes from "./server/routes/paymentRoutes";
app.use("/api/payments", authenticateToken, paymentRoutes);

// --- REFERRAL FOUNDATION APIS ---
import referralRoutes from "./server/routes/referralRoutes";
app.use("/api/referrals", referralRoutes);

// --- COUPON SYSTEM APIS ---
app.use("/api/coupons", couponRoutes);

// --- RATING SYSTEM APIS ---
app.use("/api/reviews", reviewRoutes);

// --- CHAT SYSTEM APIS ---
app.use("/api/chat", authenticateToken, chatRoutes);



// --- EMERGENCY PRIORITY ENGINE APIS ---

// Get priority engine matching logs, settings, and active states
app.get("/api/admin/priority-engine/status", authenticateToken, verifyAdmin, (req: any, res: any) => {
  res.json(PriorityEngine.getEngineStatus());
});

// Update settings
app.post("/api/admin/priority-engine/settings", authenticateToken, verifyAdmin, (req: any, res: any) => {
  const { enabled, baseRadiusKm, maxRadiusKm, radiusStepKm, requestTimeoutMs } = req.body;
  if (enabled !== undefined) PriorityEngine.settings.enabled = Boolean(enabled);
  if (baseRadiusKm !== undefined) PriorityEngine.settings.baseRadiusKm = Number(baseRadiusKm);
  if (maxRadiusKm !== undefined) PriorityEngine.settings.maxRadiusKm = Number(maxRadiusKm);
  if (radiusStepKm !== undefined) PriorityEngine.settings.radiusStepKm = Number(radiusStepKm);
  if (requestTimeoutMs !== undefined) PriorityEngine.settings.requestTimeoutMs = Number(requestTimeoutMs);
  
  res.json({ success: true, settings: PriorityEngine.settings });
});

// Manual Assign override / Dispatcher override
app.post("/api/admin/priority-engine/override", authenticateToken, verifyAdmin, async (req: any, res: any) => {
  const { rideId, driverId } = req.body;
  if (!rideId || !driverId) {
    return res.status(400).json({ error: "rideId and driverId are required." });
  }
  try {
    const ride = await PriorityEngine.manualOverrideAssign(rideId, driverId, req.user);
    res.json({ success: true, message: "Manual override assignment completed.", ride });
  } catch (err: any) {
    res.status(500).json({ error: err.message || "Override failed." });
  }
});

// Force retry/re-match now
app.post("/api/admin/priority-engine/retry/:rideId", authenticateToken, verifyAdmin, async (req: any, res: any) => {
  const { rideId } = req.params;
  const ride = emergencyRides.find(r => r.id === rideId);
  if (!ride) {
    return res.status(404).json({ error: "Ride not found." });
  }
  try {
    const state = PriorityEngine.getOrCreateRideState(rideId);
    state.dispatchedDriverIds = []; // clear so processCriticalRide will try matching again
    await PriorityEngine.processCriticalRide(ride);
    res.json({ success: true, message: "Priority matching retry triggered successfully.", status: PriorityEngine.getOrCreateRideState(rideId) });
  } catch (err: any) {
    res.status(500).json({ error: err.message || "Retry failed." });
  }
});

// Reset engine state
app.post("/api/admin/priority-engine/reset/:rideId", authenticateToken, verifyAdmin, (req: any, res: any) => {
  const { rideId } = req.params;
  PriorityEngine.resetEngineState(rideId);
  res.json({ success: true, message: "State reset completed." });
});


// Get Admin System Settings
app.get("/api/admin/settings", authenticateToken, verifyAdmin, (req: any, res: any) => {
  res.json(adminSettings);
});

// Update Admin System Settings
app.put("/api/admin/settings", authenticateToken, verifyAdmin, (req: any, res: any) => {
  const { autoSimulateRides, smsNotifications, maxDriverRadiusKm, emergencyHotline, allowedVillages, commissionPercentage, emergencyCharges } = req.body;
  if (autoSimulateRides !== undefined) adminSettings.autoSimulateRides = autoSimulateRides;
  if (smsNotifications !== undefined) adminSettings.smsNotifications = smsNotifications;
  if (maxDriverRadiusKm !== undefined) adminSettings.maxDriverRadiusKm = Number(maxDriverRadiusKm);
  if (emergencyHotline !== undefined) adminSettings.emergencyHotline = emergencyHotline;
  if (allowedVillages !== undefined && Array.isArray(allowedVillages)) adminSettings.allowedVillages = allowedVillages;
  if (commissionPercentage !== undefined) adminSettings.commissionPercentage = Number(commissionPercentage);
  if (emergencyCharges !== undefined) adminSettings.emergencyCharges = Number(emergencyCharges);
  res.json({ success: true, settings: adminSettings });
});

// Get Admin Platform Commission and Earnings stats
app.get("/api/admin/commission-stats", authenticateToken, verifyAdmin, async (req: any, res: any) => {
  try {
    const bookingData = await BookingDb.getDashboardBookings(1, 10000);
    const completedBookings = bookingData.bookings.filter(b => (b.status as string) === "completed" || (b.status as string) === "Completed");
    const completedEmergencyRides = emergencyRides.filter(r => r.status === "completed" || r.status === "Completed");

    const withdrawals = await WithdrawalRequestDb.findAll();
    const completedWithdrawals = withdrawals.filter((w: any) => w.status === "completed");
    const pendingWithdrawals = withdrawals.filter((w: any) => w.status === "pending");

    const totalSettledAmount = completedWithdrawals.reduce((sum: number, w: any) => sum + w.amount, 0);
    const totalPendingSettlement = pendingWithdrawals.reduce((sum: number, w: any) => sum + w.amount, 0);

    const commissionPct = adminSettings.commissionPercentage !== undefined ? adminSettings.commissionPercentage : 10;
    const emergencyFlatChg = adminSettings.emergencyCharges !== undefined ? adminSettings.emergencyCharges : 50;

    let totalCompletedNormalRides = 0;
    let totalNormalFares = 0;
    let totalCommissionCollected = 0;

    const processedNormalRides = completedBookings.map((b: any) => {
      totalCompletedNormalRides++;
      const fare = b.estimatedFare || 0;
      totalNormalFares += fare;
      const commAmount = Math.round((fare * commissionPct) / 100);
      totalCommissionCollected += commAmount;
      const drvShare = fare - commAmount;

      return {
        id: b.id,
        passengerName: b.passengerName,
        driverName: b.driverName || "Assigned Driver",
        driverId: b.driverId,
        rideType: b.rideType || "Auto",
        createdAt: b.createdAt,
        fare,
        commissionPercentage: commissionPct,
        commissionAmount: commAmount,
        emergencyCharge: 0,
        driverShare: drvShare,
      };
    });

    let totalCompletedEmergencyRides = 0;
    let totalEmergencyFares = 0;
    let totalEmergencyChargesCollected = 0;

    const processedEmergencyRides = completedEmergencyRides.map((r: any) => {
      totalCompletedEmergencyRides++;
      const fare = r.fareRupees || 500;
      totalEmergencyFares += fare;
      totalEmergencyChargesCollected += emergencyFlatChg;
      const drvShare = Math.max(0, fare - emergencyFlatChg);

      return {
        id: r.id,
        passengerName: r.patientName,
        driverName: r.driverName || "Volunteer Driver",
        driverId: r.driverId,
        rideType: "Emergency",
        createdAt: new Date(r.createdAt),
        fare,
        commissionPercentage: 0,
        commissionAmount: 0,
        emergencyCharge: emergencyFlatChg,
        driverShare: drvShare,
      };
    });

    const allRides = [...processedNormalRides, ...processedEmergencyRides];
    allRides.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

    const totalCompletedRides = totalCompletedNormalRides + totalCompletedEmergencyRides;
    const totalRideFares = totalNormalFares + totalEmergencyFares;
    const totalPlatformEarnings = totalCommissionCollected + totalEmergencyChargesCollected;
    const totalDriverShare = totalRideFares - totalPlatformEarnings;

    const driverStats = drivers.map((drv: any) => {
      const drvNormal = processedNormalRides.filter((r: any) => r.driverId === drv.id);
      const drvEmergency = processedEmergencyRides.filter((r: any) => r.driverId === drv.id);

      const drvCompleted = drvNormal.length + drvEmergency.length;
      const drvGrossFares = drvNormal.reduce((sum, r) => sum + r.fare, 0) + drvEmergency.reduce((sum, r) => sum + r.fare, 0);
      const drvCommission = drvNormal.reduce((sum, r) => sum + r.commissionAmount, 0) + drvEmergency.reduce((sum, r) => sum + r.emergencyCharge, 0);
      const drvNetEarned = drvGrossFares - drvCommission;

      const drvSettled = completedWithdrawals
        .filter((w: any) => w.userId === drv.id)
        .reduce((sum, w) => sum + w.amount, 0);

      const drvPending = pendingWithdrawals
        .filter((w: any) => w.userId === drv.id)
        .reduce((sum, w) => sum + w.amount, 0);

      return {
        id: drv.id,
        name: drv.name,
        phone: drv.phone,
        vehicleType: drv.vehicleType,
        completedTrips: drvCompleted || drv.completedTrips || 0,
        totalEarned: drvGrossFares,
        commissionDeducted: drvCommission,
        netEarned: drvNetEarned,
        withdrawn: drvSettled,
        pendingWithdrawal: drvPending,
        availableBalance: Math.max(0, drvNetEarned - drvSettled)
      };
    });

    const chartData = [];
    const weekdays = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
    for (let i = 6; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const dayName = weekdays[d.getDay()];
      const startOfDay = new Date(d);
      startOfDay.setHours(0, 0, 0, 0);
      const endOfDay = new Date(d);
      endOfDay.setHours(23, 59, 59, 999);

      const dayNormal = processedNormalRides.filter((r: any) => {
        const rDate = new Date(r.createdAt);
        return rDate >= startOfDay && rDate <= endOfDay;
      });

      const dayEmergency = processedEmergencyRides.filter((r: any) => {
        const rDate = new Date(r.createdAt);
        return rDate >= startOfDay && rDate <= endOfDay;
      });

      const normalFares = dayNormal.reduce((sum, r) => sum + r.fare, 0);
      const emergencyFares = dayEmergency.reduce((sum, r) => sum + r.fare, 0);
      const normalComm = dayNormal.reduce((sum, r) => sum + r.commissionAmount, 0);
      const emergencyComm = dayEmergency.reduce((sum, r) => sum + r.emergencyCharge, 0);

      chartData.push({
        name: dayName,
        fares: normalFares + emergencyFares,
        commission: normalComm + emergencyComm,
        driverShare: (normalFares + emergencyFares) - (normalComm + emergencyComm)
      });
    }

    res.json({
      settings: {
        commissionPercentage: commissionPct,
        emergencyCharges: emergencyFlatChg
      },
      metrics: {
        totalCompletedRides,
        totalCompletedNormalRides,
        totalCompletedEmergencyRides,
        totalRideFares,
        totalCommissionCollected,
        totalEmergencyChargesCollected,
        totalPlatformEarnings,
        totalDriverShare,
        totalSettledAmount,
        totalPendingSettlement
      },
      rides: allRides,
      drivers: driverStats,
      chartData
    });
  } catch (error: any) {
    console.error("Error in /api/admin/commission-stats:", error);
    res.status(500).json({ error: error.message || "Failed to fetch platform commission stats." });
  }
});

// Admin stats
app.get("/api/admin/stats", authenticateToken, verifyAdmin, async (req: any, res: any) => {
  try {
    const allUsers = await UserDb.find({});
    
    // update statuses of all searching/active rides to simulate live activity
    emergencyRides.forEach(r => {
      if (adminSettings.autoSimulateRides) {
        getUpdatedRideStatus(r);
      }
    });

    const totalUsers = allUsers.length;
    const passengersCount = allUsers.filter(u => u.role === "passenger").length;
    const driversCount = drivers.length;
    
    const activeBookings = emergencyRides.filter(r => r.status !== "completed" && r.status !== "Completed" && r.status !== "cancelled" && r.status !== "Cancelled").length;
    const completedBookings = emergencyRides.filter(r => r.status === "completed" || r.status === "Completed").length;
    const cancelledBookings = emergencyRides.filter(r => r.status === "cancelled" || r.status === "Cancelled").length;
    
    // subsidy calculations (₹650 per completed ride)
    const totalSubsidy = completedBookings * 650;

    // Online drivers (status is "available" or "busy", i.e. not "offline")
    const onlineDriversCount = drivers.filter(d => d.status !== "offline").length;

    // Today's rides (created today)
    const startOfToday = new Date();
    startOfToday.setHours(0, 0, 0, 0);
    const todaysRidesCount = emergencyRides.filter(r => r.createdAt >= startOfToday.getTime()).length;

    // Total emergency rides
    const emergencyRidesCount = emergencyRides.length;

    // Pending Approvals (drivers with missing/unverified documents)
    const pendingApprovalsCount = drivers.filter(d => {
      const docs = driverDocumentsMap[d.id] || [];
      return docs.length < 7 || docs.some(doc => !doc.verified);
    }).length;
    
    // Emergency types count
    const emergencyTypeCounts = {
      Maternity: emergencyRides.filter(r => r.emergencyType === "Maternity").length,
      "Accident/Trauma": emergencyRides.filter(r => r.emergencyType === "Accident/Trauma").length,
      "Severe Illness": emergencyRides.filter(r => r.emergencyType === "Severe Illness").length,
      Cardiac: emergencyRides.filter(r => r.emergencyType === "Cardiac").length,
      Other: emergencyRides.filter(r => r.emergencyType === "Other").length,
    };
    
    // Villagewise dispatches
    const villageCounts: Record<string, number> = {};
    emergencyRides.forEach(r => {
      villageCounts[r.village] = (villageCounts[r.village] || 0) + 1;
    });
    
    // CHC destination dispatches
    const chcCounts: Record<string, number> = {};
    emergencyRides.forEach(r => {
      const chcName = r.destinationChc || "Nearest CHC";
      chcCounts[chcName] = (chcCounts[chcName] || 0) + 1;
    });

    // Daily Rides (last 7 days, ending today)
    const dailyRides = [];
    const weekdays = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
    for (let i = 6; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const dayName = weekdays[d.getDay()];
      const startOfDay = new Date(d);
      startOfDay.setHours(0, 0, 0, 0);
      const endOfDay = new Date(d);
      endOfDay.setHours(23, 59, 59, 999);
      const count = emergencyRides.filter(r => r.createdAt >= startOfDay.getTime() && r.createdAt <= endOfDay.getTime()).length;
      const baselines = [4, 6, 3, 5, 8, 4, 6];
      dailyRides.push({
        name: dayName,
        rides: count > 0 ? count : baselines[d.getDay()]
      });
    }

    // Weekly Rides (last 4 weeks)
    const weeklyRides = [
      { name: "Week 1", rides: 28 },
      { name: "Week 2", rides: 35 },
      { name: "Week 3", rides: 42 },
      { name: "Week 4", rides: 24 + emergencyRides.length }
    ];

    // Monthly Revenue (last 6 months)
    const monthlyRevenue = [
      { name: "Jan", revenue: 14500 },
      { name: "Feb", revenue: 18200 },
      { name: "Mar", revenue: 15600 },
      { name: "Apr", revenue: 19800 },
      { name: "May", revenue: 22100 },
      { name: "Jun", revenue: totalSubsidy > 0 ? totalSubsidy : 24700 }
    ];

    // Driver Growth (cumulative drivers count)
    const driverGrowth = [
      { name: "Jan", count: 8 },
      { name: "Feb", count: 12 },
      { name: "Mar", count: 17 },
      { name: "Apr", count: 21 },
      { name: "May", count: 26 },
      { name: "Jun", count: Math.max(30, driversCount) }
    ];

    // Passenger Growth (cumulative passengers count)
    const passengerGrowth = [
      { name: "Jan", count: 45 },
      { name: "Feb", count: 68 },
      { name: "Mar", count: 95 },
      { name: "Apr", count: 120 },
      { name: "May", count: 148 },
      { name: "Jun", count: Math.max(160, passengersCount) }
    ];

    res.json({
      metrics: {
        totalUsers,
        passengersCount,
        driversCount,
        onlineDriversCount,
        todaysRidesCount,
        emergencyRidesCount,
        revenue: totalSubsidy,
        pendingApprovalsCount,
        completedBookings,
        cancelledBookings,
        activeBookings,
        totalSubsidy
      },
      charts: {
        emergencies: Object.entries(emergencyTypeCounts).map(([name, value]) => ({ name, value })),
        villages: Object.entries(villageCounts).map(([name, value]) => ({ name, value })).sort((a,b) => b.value - a.value).slice(0, 5),
        chcs: Object.entries(chcCounts).map(([name, value]) => ({ name, value })).sort((a,b) => b.value - a.value).slice(0, 5),
        dailyRides,
        weeklyRides,
        monthlyRevenue,
        driverGrowth,
        passengerGrowth
      }
    });
  } catch (error) {
    console.error("Admin stats error:", error);
    res.status(500).json({ error: "Failed to load system stats." });
  }
});

// Admin Get Users List (All registered accounts)
app.get("/api/admin/users", authenticateToken, verifyAdmin, async (req: any, res: any) => {
  try {
    const allUsers = await UserDb.find({});
    // filter out password hashes
    const sanitized = allUsers.map(({ passwordHash: _, ...u }) => u);
    res.json(sanitized);
  } catch (err) {
    res.status(500).json({ error: "Failed to fetch users." });
  }
});

// Admin edit user role or details
app.put("/api/admin/users/:userId/role", authenticateToken, verifyAdmin, async (req: any, res: any) => {
  const { userId } = req.params;
  const { role } = req.body;
  
  try {
    const rolesList = await RoleDb.find();
    const validRoles = rolesList.map(r => r.name);
    const allValid = [...new Set(["passenger", "driver", "admin", "Passenger", "Driver", "Admin", "Super Admin", ...validRoles])];
    
    if (!role || !allValid.includes(role)) {
      return res.status(400).json({ error: "Invalid role specification." });
    }
    
    const user = await UserDb.findById(userId);
    if (!user) {
      return res.status(404).json({ error: "User not found." });
    }
    
    const updatedUser = await UserDb.updateProfile(userId, { role });
    
    const normalizedRole = role.toLowerCase();
    const isDriverRole = normalizedRole === "driver" || 
                         (rolesList.find(r => r.name === role)?.permissions.some(p => p.toLowerCase() === "emergency" || p.toLowerCase() === "accept_rides"));
    
    // If upgraded to driver and doesn't exist in drivers array, sync it
    if (isDriverRole) {
      const exists = drivers.some(d => d.id === userId);
      if (!exists) {
        drivers.push({
          id: user.id,
          name: user.name,
          phone: user.phone,
          vehicleType: user.vehicleType || "Auto Rickshaw",
          vehicleNumber: user.vehicleNumber || "UP-61-NEW-99",
          village: user.village,
          district: user.district || "Ghazipur",
          status: "available",
          rating: 5.0,
          completedTrips: 0
        });
      }
    } else {
      // Remove from drivers array if role changed away from driver
      const idx = drivers.findIndex(d => d.id === userId);
      if (idx !== -1) {
        drivers.splice(idx, 1);
      }
    }
    
    res.json({ success: true, user: updatedUser });
  } catch (err) {
    res.status(500).json({ error: "Failed to update user role." });
  }
});

// Admin delete user
app.delete("/api/admin/users/:userId", authenticateToken, verifyAdmin, async (req: any, res: any) => {
  const { userId } = req.params;
  try {
    const success = await UserDb.delete(userId);
    if (!success) {
      return res.status(404).json({ error: "User not found." });
    }
    
    // Also remove from in-memory drivers array if applicable
    const idx = drivers.findIndex(d => d.id === userId);
    if (idx !== -1) {
      drivers.splice(idx, 1);
    }
    
    res.json({ success: true, message: "User deleted successfully." });
  } catch (err) {
    res.status(500).json({ error: "Failed to delete user." });
  }
});

// Admin Get Drivers List (with Search, Filters, and Pagination)
app.get("/api/admin/drivers", authenticateToken, verifyAdmin, async (req: any, res: any) => {
  try {
    const { search = "", status = "all", vehicleType = "all", verification = "all", approvalStatus = "all", page, limit, all, sortBy, sortOrder } = req.query;
    
    const pageNum = parseInt(page as string) || 1;
    const limitNum = parseInt(limit as string) || 10;
    
    // Fetch all user accounts to see their statuses, approval status, notes, and rejection reasons
    const allUsers = await UserDb.find({ role: "driver" });
    const userMap = new Map(allUsers.map(u => [u.id, u]));

    // Collect and enhance all drivers
    let enhancedDrivers = drivers.map(drv => {
      let docs = driverDocumentsMap[drv.id];
      if (!docs || docs.length < 7) {
        const existingDocs = docs || [];
        const typesNeeded = ["license", "rc", "insurance", "aadhaar", "pan", "vehicle_image", "profile_image"];
        const seedMap: Record<string, any> = {
          license: { docType: "license", fileName: "license_uploaded.pdf", number: "DL-UP61-2026" + Math.floor(1000 + Math.random() * 9000), verified: drv.completedTrips > 10, uploadedAt: Date.now() - 86400000 * 5 },
          rc: { docType: "rc", fileName: "rc_uploaded.pdf", number: drv.vehicleNumber || "UP-61-AB-" + Math.floor(1000 + Math.random() * 9000), verified: drv.completedTrips > 10, uploadedAt: Date.now() - 86400000 * 5 },
          insurance: { docType: "insurance", fileName: "insurance_policy.pdf", number: "INS-GPZ-" + Math.floor(10000 + Math.random() * 90000), verified: drv.completedTrips > 15, uploadedAt: Date.now() - 86400000 * 5 },
          aadhaar: { docType: "aadhaar", fileName: "aadhaar_card.pdf", number: "3842-" + Math.floor(1000 + Math.random() * 9000) + "-4821", verified: drv.completedTrips > 5, uploadedAt: Date.now() - 86400000 * 6 },
          pan: { docType: "pan", fileName: "pan_card.pdf", number: "ABCDE" + Math.floor(1000 + Math.random() * 9000) + "F", verified: drv.completedTrips > 5, uploadedAt: Date.now() - 86400000 * 6 },
          vehicle_image: { docType: "vehicle_image", fileName: "vehicle_photo.jpg", number: drv.vehicleNumber, verified: drv.completedTrips > 8, uploadedAt: Date.now() - 86400000 * 4 },
          profile_image: { docType: "profile_image", fileName: "profile_photo.jpg", number: drv.phone, verified: drv.completedTrips > 8, uploadedAt: Date.now() - 86400000 * 7 }
        };

        const updatedDocs: any[] = [];
        typesNeeded.forEach(type => {
          const existing = existingDocs.find(d => d.docType === type);
          if (existing) {
            updatedDocs.push(existing);
          } else {
            const seed = seedMap[type];
            updatedDocs.push({
              id: `doc_${drv.id}_${type.substring(0, 3)}`,
              ...seed
            });
          }
        });
        docs = updatedDocs;
        driverDocumentsMap[drv.id] = docs;
      }

      const activeRide = emergencyRides.find(r => r.driverId === drv.id && r.status !== "completed" && r.status !== "Completed" && r.status !== "cancelled" && r.status !== "Cancelled");
      const completedRides = emergencyRides.filter(r => r.driverId === drv.id && (r.status === "completed" || r.status === "Completed"));
      const basePayout = completedRides.length * 500;
      const incentives = completedRides.length * 150;
      const totalEarnings = basePayout + incentives;
      
      const dbUser = userMap.get(drv.id);
      const userStatus = dbUser ? (dbUser.status || "active") : "active";
      const approvalStatus = dbUser ? (dbUser.approvalStatus || "approved") : "approved";
      const approvalNotes = dbUser ? (dbUser.approvalNotes || "") : "";
      const rejectionReason = dbUser ? (dbUser.rejectionReason || "") : "";
      
      // Check document verifications
      const licenseDoc = docs.find(d => d.docType === "license");
      const rcDoc = docs.find(d => d.docType === "rc");
      const insuranceDoc = docs.find(d => d.docType === "insurance");
      const aadhaarDoc = docs.find(d => d.docType === "aadhaar");
      const panDoc = docs.find(d => d.docType === "pan");
      const vehicleImageDoc = docs.find(d => d.docType === "vehicle_image");
      const profileImageDoc = docs.find(d => d.docType === "profile_image");

      const hasLicense = docs.some(d => d.docType === "license" && d.verified);
      const hasRc = docs.some(d => d.docType === "rc" && d.verified);
      const hasInsurance = docs.some(d => d.docType === "insurance" && d.verified);
      const hasAadhaar = docs.some(d => d.docType === "aadhaar" && d.verified);
      const hasPan = docs.some(d => d.docType === "pan" && d.verified);
      const hasVehicleImage = docs.some(d => d.docType === "vehicle_image" && d.verified);
      const hasProfileImage = docs.some(d => d.docType === "profile_image" && d.verified);

      // Determine verification status
      const allSevenVerified = hasLicense && hasRc && hasInsurance && hasAadhaar && hasPan && hasVehicleImage && hasProfileImage;
      
      let verificationStatus = "unverified";
      if (allSevenVerified) {
        verificationStatus = "verified";
      } else if (docs.some(d => d.verified)) {
        verificationStatus = "pending";
      }

      return {
        ...drv,
        userStatus, // 'active' | 'suspended'
        documents: docs,
        documentsCount: docs.length,
        hasLicense,
        hasRc,
        hasInsurance,
        hasAadhaar,
        hasPan,
        hasVehicleImage,
        hasProfileImage,
        licenseDetails: licenseDoc ? { number: licenseDoc.number || "DL-UP61-20260001", verified: licenseDoc.verified } : null,
        rcDetails: rcDoc ? { number: rcDoc.number || "RC-UP61-AB-1234", verified: rcDoc.verified } : null,
        insuranceDetails: insuranceDoc ? { number: insuranceDoc.number || "INS-GPZ-998822", verified: insuranceDoc.verified } : null,
        aadhaarDetails: aadhaarDoc ? { number: aadhaarDoc.number || "3842-1234-5678", verified: aadhaarDoc.verified } : null,
        panDetails: panDoc ? { number: panDoc.number || "ABCDE1234F", verified: panDoc.verified } : null,
        vehicleImageDetails: vehicleImageDoc ? { number: vehicleImageDoc.number || drv.vehicleNumber, verified: vehicleImageDoc.verified } : null,
        profileImageDetails: profileImageDoc ? { number: profileImageDoc.number || drv.phone, verified: profileImageDoc.verified } : null,
        activeRide: activeRide ? { id: activeRide.id, patientName: activeRide.patientName, status: activeRide.status, destinationChc: activeRide.destinationChc } : null,
        earnings: {
          totalTrips: completedRides.length,
          basePayout,
          incentives,
          total: totalEarnings
        },
        verificationStatus, // 'verified' | 'pending' | 'unverified'
        approvalStatus,
        approvalNotes,
        rejectionReason
      };
    });

    // Apply Filters
    // 1. Search filter
    if (search) {
      const s = (search as string).toLowerCase();
      enhancedDrivers = enhancedDrivers.filter(d => 
        d.name.toLowerCase().includes(s) ||
        d.phone.includes(s) ||
        (d.vehicleNumber && d.vehicleNumber.toLowerCase().includes(s)) ||
        d.village.toLowerCase().includes(s)
      );
    }

    // 2. Status filter
    if (status !== "all") {
      enhancedDrivers = enhancedDrivers.filter(d => d.status === status);
    }

    // 3. Vehicle Type filter
    if (vehicleType !== "all") {
      enhancedDrivers = enhancedDrivers.filter(d => d.vehicleType === vehicleType);
    }

    // 4. Verification filter
    if (verification !== "all") {
      enhancedDrivers = enhancedDrivers.filter(d => d.verificationStatus === verification);
    }

    // 5. Approval Status filter
    if (approvalStatus !== "all") {
      enhancedDrivers = enhancedDrivers.filter(d => d.approvalStatus === approvalStatus);
    }

    // 6. Dynamic sorting
    if (sortBy) {
      const sortField = sortBy as string;
      const sortDir = sortOrder === "asc" ? 1 : -1;
      enhancedDrivers.sort((a: any, b: any) => {
        let valA = a[sortField];
        let valB = b[sortField];

        if (sortField === "earnings") {
          valA = a.earnings?.total || 0;
          valB = b.earnings?.total || 0;
        }

        if (valA === undefined || valA === null) valA = '';
        if (valB === undefined || valB === null) valB = '';

        if (typeof valA === "string" && typeof valB === "string") {
          return valA.localeCompare(valB) * sortDir;
        }
        return (valA < valB ? -1 : valA > valB ? 1 : 0) * sortDir;
      });
    }

    const total = enhancedDrivers.length;

    if (all === "true" || (!page && !limit)) {
      return res.json(enhancedDrivers);
    }

    const paginatedDrivers = enhancedDrivers.slice((pageNum - 1) * limitNum, pageNum * limitNum);
    
    res.json({
      drivers: paginatedDrivers,
      total,
      page: pageNum,
      totalPages: Math.ceil(total / limitNum) || 1
    });
  } catch (err) {
    console.error("Admin drivers list error:", err);
    res.status(500).json({ error: "Failed to fetch drivers." });
  }
});

// Admin Create Driver
app.post("/api/admin/drivers", authenticateToken, verifyAdmin, async (req: any, res: any) => {
  try {
    const { 
      name, phone, email, password, 
      vehicleType, vehicleNumber, village, district,
      drivingLicenseNumber, rcNumber, insuranceNumber 
    } = req.body;

    if (!name || !phone || !vehicleType || !vehicleNumber || !village) {
      return res.status(400).json({ error: "Missing required driver fields." });
    }

    // Check if phone already registered
    const existingUser = await UserDb.findOne({ phone });
    if (existingUser) {
      return res.status(400).json({ error: "A user with this mobile number is already registered." });
    }

    const passHash = bcrypt.hashSync(password || "driver123", 10);
    const newId = `drv_${Date.now()}`;

    const newUser = await UserDb.create({
      id: newId,
      name,
      phone,
      email,
      passwordHash: passHash,
      role: "driver",
      village,
      district: district || "Ghazipur",
      vehicleType,
      vehicleNumber,
      status: "active"
    });

    // Register inside memory drivers pool
    const newDriver = {
      id: newId,
      name,
      phone,
      vehicleType,
      vehicleNumber,
      village,
      district: district || "Ghazipur",
      status: "available" as const,
      rating: 5.0,
      completedTrips: 0
    };
    drivers.push(newDriver);

    // Register initial documents for verification
    driverDocumentsMap[newId] = [
      { id: `doc_${newId}_lic`, docType: "license", fileName: "license_uploaded.pdf", number: drivingLicenseNumber || "DL-UP61-" + Math.floor(1000 + Math.random() * 9000), verified: false, uploadedAt: Date.now() },
      { id: `doc_${newId}_rc`, docType: "rc", fileName: "rc_uploaded.pdf", number: rcNumber || vehicleNumber, verified: false, uploadedAt: Date.now() },
      { id: `doc_${newId}_ins`, docType: "insurance", fileName: "insurance_uploaded.pdf", number: insuranceNumber || "INS-GPZ-" + Math.floor(10000 + Math.random() * 90000), verified: false, uploadedAt: Date.now() }
    ];

    res.status(201).json({ success: true, message: "Volunteer driver registered successfully.", driver: newDriver });
  } catch (err) {
    console.error("Create driver error:", err);
    res.status(500).json({ error: "Failed to register driver." });
  }
});

// Admin Verify/Reject Driver Document
app.put("/api/admin/drivers/:driverId/documents/:docType/verify", authenticateToken, verifyAdmin, (req: any, res: any) => {
  const { driverId, docType } = req.params;
  const { verified } = req.body;

  if (verified === undefined) {
    return res.status(400).json({ error: "Verification status is required." });
  }

  const docs = driverDocumentsMap[driverId];
  if (!docs) {
    return res.status(404).json({ error: "Driver documents not found." });
  }

  // Handle both "insurance" and old "aadhaar" as verification docs
  const doc = docs.find(d => d.docType === docType || (docType === "insurance" && d.docType === "aadhaar"));
  if (!doc) {
    return res.status(404).json({ error: `Document of type ${docType} not found.` });
  }

  doc.verified = !!verified;
  res.json({ success: true, message: `Document ${docType} verification updated successfully.`, doc });
});

// Admin Download Driver Document
app.get("/api/admin/drivers/:driverId/documents/:docType/download", authenticateToken, verifyAdmin, (req: any, res: any) => {
  const { driverId, docType } = req.params;
  const docs = driverDocumentsMap[driverId];
  if (!docs) {
    return res.status(404).json({ error: "Driver documents not found." });
  }
  const doc = docs.find(d => d.docType === docType);
  if (!doc) {
    return res.status(404).json({ error: `Document of type ${docType} not found.` });
  }
  
  const ext = (docType === "vehicle_image" || docType === "profile_image") ? "jpg" : "pdf";
  res.setHeader("Content-Disposition", `attachment; filename="${doc.fileName || docType + '_document.' + ext}"`);
  res.setHeader("Content-Type", ext === "jpg" ? "image/jpeg" : "application/pdf");
  res.send(Buffer.from(`GramGo Secure Verification Document\nDriver ID: ${driverId}\nDocument Type: ${docType}\nDoc ID: ${doc.id}\nUploaded: ${new Date(doc.uploadedAt).toISOString()}\nStatus: Verified=${doc.verified}\nDocument Ref: ${doc.number || "N/A"}`));
});

// Admin Download All Driver Documents in Bundle
app.get("/api/admin/drivers/:driverId/documents/download-all", authenticateToken, verifyAdmin, (req: any, res: any) => {
  const { driverId } = req.params;
  const docs = driverDocumentsMap[driverId] || [];
  
  res.setHeader("Content-Disposition", `attachment; filename="driver_${driverId}_documents_bundle.txt"`);
  res.setHeader("Content-Type", "text/plain");
  
  let content = `========================================================\n`;
  content += `GRAMGO VOLUNTEER DRIVER DOCUMENT BUNDLE\n`;
  content += `Driver ID: ${driverId}\n`;
  content += `Generated on: ${new Date().toISOString()}\n`;
  content += `========================================================\n\n`;
  
  if (docs.length === 0) {
    content += `No documents uploaded for this driver.\n`;
  } else {
    docs.forEach(d => {
      content += `Document Type: ${d.docType.toUpperCase()}\n`;
      content += `File Name: ${d.fileName}\n`;
      content += `Status: ${d.verified ? "VERIFIED" : "PENDING/REJECTED"}\n`;
      content += `Doc Value/Number: ${d.number || "N/A"}\n`;
      content += `Uploaded At: ${new Date(d.uploadedAt).toISOString()}\n`;
      content += `--------------------------------------------------------\n`;
    });
  }
  
  res.send(Buffer.from(content));
});

// Admin Suspend Driver
app.put("/api/admin/drivers/:driverId/suspend", authenticateToken, verifyAdmin, async (req: any, res: any) => {
  const { driverId } = req.params;
  try {
    const user = await UserDb.findById(driverId);
    if (!user) {
      return res.status(404).json({ error: "Driver not found." });
    }

    await UserDb.updateProfile(driverId, { status: "suspended" });

    // Sync driver state in pool
    const drv = drivers.find(d => d.id === driverId);
    if (drv) {
      drv.status = "offline";
    }

    res.json({ success: true, message: "Driver suspended successfully." });
  } catch (err) {
    res.status(500).json({ error: "Failed to suspend driver." });
  }
});

// Admin Activate Driver
app.put("/api/admin/drivers/:driverId/activate", authenticateToken, verifyAdmin, async (req: any, res: any) => {
  const { driverId } = req.params;
  try {
    const user = await UserDb.findById(driverId);
    if (!user) {
      return res.status(404).json({ error: "Driver not found." });
    }

    await UserDb.updateProfile(driverId, { status: "active" });

    // Sync driver state in pool
    const drv = drivers.find(d => d.id === driverId);
    if (drv) {
      drv.status = "available";
    }

    res.json({ success: true, message: "Driver activated successfully." });
  } catch (err) {
    res.status(500).json({ error: "Failed to activate driver." });
  }
});

// Admin Approve Driver
app.put("/api/admin/drivers/:driverId/approve", authenticateToken, verifyAdmin, async (req: any, res: any) => {
  const { driverId } = req.params;
  const { approvalNotes } = req.body;
  try {
    const user = await UserDb.findById(driverId);
    if (!user) {
      return res.status(404).json({ error: "Driver not found." });
    }

    await UserDb.updateProfile(driverId, {
      approvalStatus: "approved",
      approvalNotes: approvalNotes || "Approved by Admin",
      rejectionReason: ""
    });

    // Mark driver available in the dispatch pool
    const drv = drivers.find(d => d.id === driverId);
    if (drv) {
      drv.status = "available";
    }

    res.json({ success: true, message: "Driver approved successfully." });
  } catch (err) {
    res.status(500).json({ error: "Failed to approve driver." });
  }
});

// Admin Reject Driver
app.put("/api/admin/drivers/:driverId/reject", authenticateToken, verifyAdmin, async (req: any, res: any) => {
  const { driverId } = req.params;
  const { rejectionReason } = req.body;
  try {
    const user = await UserDb.findById(driverId);
    if (!user) {
      return res.status(404).json({ error: "Driver not found." });
    }

    await UserDb.updateProfile(driverId, {
      approvalStatus: "rejected",
      rejectionReason: rejectionReason || "Rejected by Admin",
      approvalNotes: ""
    });

    // Mark driver offline if rejected so they can't take requests
    const drv = drivers.find(d => d.id === driverId);
    if (drv) {
      drv.status = "offline";
    }

    res.json({ success: true, message: "Driver rejected successfully." });
  } catch (err) {
    res.status(500).json({ error: "Failed to reject driver." });
  }
});

// Admin Delete Driver
app.delete("/api/admin/drivers/:driverId", authenticateToken, verifyAdmin, async (req: any, res: any) => {
  const { driverId } = req.params;
  try {
    const success = await UserDb.delete(driverId);
    if (!success) {
      return res.status(404).json({ error: "Driver not found." });
    }

    // Delete from drivers array
    const idx = drivers.findIndex(d => d.id === driverId);
    if (idx !== -1) {
      drivers.splice(idx, 1);
    }

    // Delete from documents
    delete driverDocumentsMap[driverId];

    res.json({ success: true, message: "Driver deleted successfully." });
  } catch (err) {
    res.status(500).json({ error: "Failed to delete driver." });
  }
});

// Admin Set Driver Rating Manual
app.put("/api/admin/drivers/:driverId/rating", authenticateToken, verifyAdmin, (req: any, res: any) => {
  const { driverId } = req.params;
  const { rating } = req.body;

  if (rating === undefined || Number(rating) < 1 || Number(rating) > 5) {
    return res.status(400).json({ error: "A valid rating between 1 and 5 is required." });
  }

  const drv = drivers.find(d => d.id === driverId);
  if (!drv) {
    return res.status(404).json({ error: "Driver not found." });
  }

  drv.rating = Number(rating);
  res.json({ success: true, message: "Driver rating updated successfully.", rating: drv.rating });
});

// Admin edit driver status manually
app.put("/api/admin/drivers/:driverId/status", authenticateToken, verifyAdmin, (req: any, res: any) => {
  const { driverId } = req.params;
  const { status } = req.body;
  
  if (!status || !["available", "busy", "offline"].includes(status)) {
    return res.status(400).json({ error: "Invalid status value." });
  }
  
  const drv = drivers.find(d => d.id === driverId);
  if (!drv) {
    return res.status(404).json({ error: "Driver not found." });
  }
  
  drv.status = status as any;
  res.json({ success: true, driver: drv });
});

// Admin edit driver details manually
app.put("/api/admin/drivers/:driverId/details", authenticateToken, verifyAdmin, async (req: any, res: any) => {
  const { driverId } = req.params;
  const { name, phone, vehicleType, vehicleNumber, village, rating } = req.body;
  
  const drv = drivers.find(d => d.id === driverId);
  if (!drv) {
    return res.status(404).json({ error: "Driver profile not found." });
  }
  
  if (name) drv.name = name;
  if (phone) drv.phone = phone;
  if (vehicleType) drv.vehicleType = vehicleType;
  if (vehicleNumber) drv.vehicleNumber = vehicleNumber;
  if (village) drv.village = village;
  if (rating !== undefined) drv.rating = Number(rating);
  
  // also sync with user profile DB if exists
  try {
    await UserDb.updateProfile(driverId, {
      name,
      phone,
      vehicleType,
      vehicleNumber,
      village
    });
  } catch (err) {
    console.error("Syncing with profile DB failed:", err);
  }
  
  res.json({ success: true, driver: drv });
});

// Admin get bookings list
app.get("/api/admin/bookings", authenticateToken, verifyAdmin, (req: any, res: any) => {
  if (adminSettings.autoSimulateRides) {
    emergencyRides.forEach(r => getUpdatedRideStatus(r));
  }
  
  const sortedRides = [...emergencyRides].sort((a,b) => b.createdAt - a.createdAt);
  res.json(sortedRides);
});

// Admin manual assign driver to booking
app.post("/api/admin/bookings/:rideId/assign", authenticateToken, verifyAdmin, (req: any, res: any) => {
  const { rideId } = req.params;
  const { driverId } = req.body;
  
  if (!driverId) {
    return res.status(400).json({ error: "Driver ID is required for assignment." });
  }
  
  const ride = emergencyRides.find(r => r.id === rideId);
  if (!ride) {
    return res.status(404).json({ error: "Booking not found." });
  }
  
  const drv = drivers.find(d => d.id === driverId);
  if (!drv) {
    return res.status(404).json({ error: "Driver not found." });
  }
  
  ride.driverId = drv.id;
  ride.driverName = drv.name;
  ride.driverPhone = drv.phone;
  ride.vehicleType = drv.vehicleType;
  ride.status = "Driver Assigned";
  ride.isManual = true;
  
  drv.status = "busy";
  
  if (ride.passengerId) {
    notifications.push({
      id: `notif_admin_assign_${Date.now()}`,
      userId: ride.passengerId,
      title: "Driver Assigned by Control Room",
      message: `Panchayat Control Room has assigned Local Hero ${drv.name} (${drv.vehicleType}) to your medical request! Contact them at ${drv.phone}.`,
      type: "success",
      createdAt: Date.now(),
      read: false
    });
  }
  
  res.json({ success: true, ride });
});

// Admin update booking status manually
app.put("/api/admin/bookings/:rideId/status", authenticateToken, verifyAdmin, async (req: any, res: any) => {
  const { rideId } = req.params;
  let { status } = req.body;
  
  // Normalise status
  if (status === "searching" || status === "Searching Driver") status = "Searching Driver";
  if (status === "driver_assigned" || status === "Driver Assigned") status = "Driver Assigned";
  if (status === "en_route" || status === "Driver Arriving") status = "Driver Arriving";
  if (status === "arrived" || status === "Passenger Picked") status = "Passenger Picked";
  if (status === "ride_started" || status === "Hospital Reached") status = "Hospital Reached";
  if (status === "completed" || status === "Completed") status = "Completed";
  if (status === "cancelled" || status === "Cancelled") status = "Cancelled";
  if (status === "requested" || status === "Emergency Requested") status = "Emergency Requested";
  
  const allowedStatuses = [
    "Emergency Requested", "Searching Driver", "Driver Assigned", "Driver Arriving", "Passenger Picked", "Hospital Reached", "Completed", "Cancelled",
    "requested", "searching", "driver_assigned", "en_route", "arrived", "completed", "cancelled"
  ];
  if (!status || !allowedStatuses.includes(status)) {
    return res.status(400).json({ error: "Invalid status value." });
  }
  
  const ride = emergencyRides.find(r => r.id === rideId);
  if (!ride) {
    return res.status(404).json({ error: "Booking not found." });
  }
  
  const oldStatus = ride.status;
  ride.status = status as any;
  ride.isManual = true;
  
  if ((status === "completed" || status === "Completed") && ride.driverId) {
    const drv = drivers.find(d => d.id === ride.driverId);
    if (drv) {
      drv.status = "available";
      if (oldStatus !== "completed" && oldStatus !== "Completed") {
        drv.completedTrips += 1;
      }
    }

    if (oldStatus !== "completed" && oldStatus !== "Completed") {
      // Process referral first-ride rewards
      if (ride.passengerId) {
        ReferralService.processRideCompletion(ride.passengerId).catch(err => {
          console.error("Error in ReferralService.processRideCompletion:", err);
        });
      }
      
      // Calculate fare
      const chc = chcs.find(c => c.name === ride.destinationChc);
      const chcVillage = chc ? chc.village : "Sherpur";
      const distance = calculateVillageDistance(ride.village, chcVillage);
      ride.distanceKm = distance;
      ride.completedAt = Date.now();

      const drvProfile = drv ? getOrCreateDriver(ride.driverId, drv) : null;
      const vehicleType = drvProfile ? drvProfile.vehicleType : (ride.vehicleType || "Bolero SUV");
      const speedKmh = vehicleType === "Bolero SUV" ? 45 : vehicleType === "Tractor Ambulance" ? 18 : vehicleType === "E-Rickshaw" ? 15 : 25;
      const duration = Math.round((distance / speedKmh) * 60) + 3;
      ride.durationMin = duration;

      const baseFare = vehicleType === "Bolero SUV" ? 100 : vehicleType === "Tractor Ambulance" ? 150 : vehicleType === "E-Rickshaw" ? 30 : 50;
      const perKmRate = vehicleType === "Bolero SUV" ? 15 : vehicleType === "Tractor Ambulance" ? 10 : vehicleType === "E-Rickshaw" ? 8 : 12;
      const fare = Math.round(baseFare + (distance * perKmRate));
      ride.fareRupees = fare;
      ride.paymentStatus = "subsidized";

      const emergencyFlatChg = adminSettings.emergencyCharges !== undefined ? adminSettings.emergencyCharges : 50;
      const driverShare = Math.max(0, fare - emergencyFlatChg);

      try {
        await WalletService.createTransaction(
          ride.driverId,
          driverShare,
          "credit",
          `Earnings for Admin Override Completed Emergency Ride ${ride.id} (Fare: ₹${fare}, Platform Emergency Charge: ₹${emergencyFlatChg} deducted)`
        );
        console.log(`[Commission] Credited driver ${ride.driverId} with ₹${driverShare} for manual override completed emergency ride ${ride.id}`);
      } catch (e) {
        console.error("Failed to credit driver wallet for manual override completed emergency ride:", e);
      }
    }
  }
  
  if (ride.passengerId && oldStatus !== status) {
    notifications.push({
      id: `notif_admin_status_${Date.now()}`,
      userId: ride.passengerId,
      title: "Ride Status Updated",
      message: `Control Room updated your emergency transit status to: ${status}.`,
      type: "info",
      createdAt: Date.now(),
      read: false
    });
  }
  
  res.json({ success: true, ride });
});

// Admin delete booking
app.delete("/api/admin/bookings/:rideId", authenticateToken, verifyAdmin, (req: any, res: any) => {
  const { rideId } = req.params;
  const idx = emergencyRides.findIndex(r => r.id === rideId);
  if (idx === -1) {
    return res.status(404).json({ error: "Booking not found." });
  }
  
  const deleted = emergencyRides.splice(idx, 1)[0];
  
  if (deleted.driverId && deleted.status !== "completed") {
    const drv = drivers.find(d => d.id === deleted.driverId);
    if (drv) {
      drv.status = "available";
    }
  }
  
  res.json({ success: true, message: "Booking removed successfully." });
});

// Admin unified global search endpoint
app.get("/api/admin/global-search", authenticateToken, verifyAdmin, async (req: any, res: any) => {
  const q = (req.query.q || "").trim();
  const searchLower = q.toLowerCase();

  try {
    const allUsers = await UserDb.find({});
    let matchedUsers = [];
    let matchedDrivers = [];
    let matchedBookings = [];
    let matchedEmergencyRequests = [];
    let matchedPayments = [];
    let matchedReports = [];
    let matchedSupport = [];

    if (!q) {
      // Return recent or first few seeded elements for each category as default view
      matchedUsers = allUsers.slice(0, 5);
      matchedDrivers = drivers.slice(0, 5);
      matchedBookings = emergencyRides.slice(0, 5);
      matchedEmergencyRequests = emergencyRides.filter(r => r.priority === "critical" || r.priority === "urgent").slice(0, 5);
      matchedPayments = await PaymentDb.find("");
      matchedReports = await ReportDb.find("");
      matchedSupport = await SupportDb.find("");
    } else {
      // 1. Users Search
      matchedUsers = allUsers.filter((u: any) => 
        u.name.toLowerCase().includes(searchLower) ||
        (u.phone && u.phone.toLowerCase().includes(searchLower)) ||
        (u.email && u.email.toLowerCase().includes(searchLower)) ||
        (u.village && u.village.toLowerCase().includes(searchLower)) ||
        (u.district && u.district.toLowerCase().includes(searchLower))
      );

      // 2. Drivers Search
      matchedDrivers = drivers.filter((d: any) => 
        d.name.toLowerCase().includes(searchLower) ||
        (d.phone && d.phone.toLowerCase().includes(searchLower)) ||
        (d.vehicleType && d.vehicleType.toLowerCase().includes(searchLower)) ||
        (d.vehicleNumber && d.vehicleNumber.toLowerCase().includes(searchLower)) ||
        (d.village && d.village.toLowerCase().includes(searchLower))
      );

      // 3. Bookings Search (all bookings/rides)
      matchedBookings = emergencyRides.filter((r: any) => 
        r.patientName.toLowerCase().includes(searchLower) ||
        (r.patientPhone && r.patientPhone.toLowerCase().includes(searchLower)) ||
        (r.village && r.village.toLowerCase().includes(searchLower)) ||
        (r.landmark && r.landmark.toLowerCase().includes(searchLower)) ||
        (r.driverName && r.driverName.toLowerCase().includes(searchLower)) ||
        (r.destinationChc && r.destinationChc.toLowerCase().includes(searchLower)) ||
        (r.status && r.status.toLowerCase().includes(searchLower)) ||
        (r.id && r.id.toLowerCase().includes(searchLower))
      );

      // 4. Emergency Requests Search (typically critical, active or high priority)
      matchedEmergencyRequests = emergencyRides.filter((r: any) => {
        const matchesQuery = 
          r.patientName.toLowerCase().includes(searchLower) ||
          r.emergencyType.toLowerCase().includes(searchLower) ||
          (r.village && r.village.toLowerCase().includes(searchLower)) ||
          (r.priority && r.priority.toLowerCase().includes(searchLower)) ||
          (r.status && r.status.toLowerCase().includes(searchLower)) ||
          (r.id && r.id.toLowerCase().includes(searchLower));
        
        return matchesQuery && (r.priority === "critical" || r.priority === "urgent" || r.status === "searching");
      });

      // 5. Payments Search
      matchedPayments = await PaymentDb.find(q);

      // 6. Reports Search
      matchedReports = await ReportDb.find(q);

      // 7. Support Search
      matchedSupport = await SupportDb.find(q);
    }

    res.json({
      query: q,
      results: {
        users: matchedUsers,
        drivers: matchedDrivers,
        bookings: matchedBookings,
        emergencyRequests: matchedEmergencyRequests,
        payments: matchedPayments,
        reports: matchedReports,
        support: matchedSupport
      }
    });
  } catch (error: any) {
    console.error("Global search error:", error);
    res.status(500).json({ error: "An error occurred executing global search." });
  }
});

// Admin update payment status
app.put("/api/admin/payments/:id/status", authenticateToken, verifyAdmin, async (req: any, res: any) => {
  const { id } = req.params;
  const { status } = req.body;
  try {
    const updated = await PaymentDb.updateStatus(id, status);
    if (!updated) {
      return res.status(404).json({ error: "Payment not found." });
    }
    res.json({ success: true, payment: updated });
  } catch (err: any) {
    res.status(500).json({ error: "Failed to update payment status." });
  }
});

// Admin update report status
app.put("/api/admin/reports/:id/status", authenticateToken, verifyAdmin, async (req: any, res: any) => {
  const { id } = req.params;
  const { status } = req.body;
  try {
    const updated = await ReportDb.updateStatus(id, status);
    if (!updated) {
      return res.status(404).json({ error: "Report not found." });
    }
    res.json({ success: true, report: updated });
  } catch (err: any) {
    res.status(500).json({ error: "Failed to update report status." });
  }
});

// Admin update support ticket status
app.put("/api/admin/support-tickets/:id/status", authenticateToken, verifyAdmin, async (req: any, res: any) => {
  const { id } = req.params;
  const { status } = req.body;
  try {
    const updated = await SupportDb.updateStatus(id, status);
    if (!updated) {
      return res.status(404).json({ error: "Support ticket not found." });
    }
    res.json({ success: true, ticket: updated });
  } catch (err: any) {
    res.status(500).json({ error: "Failed to update support ticket status." });
  }
});

// --- EMERGENCY DASHBOARD UNIFIED APIs ---

// Get unified emergency dashboard summary
app.get("/api/admin/emergency-dashboard/summary", authenticateToken, verifyAdmin, async (req: any, res: any) => {
  try {
    // 1. Get all emergencies
    if (adminSettings.autoSimulateRides) {
      emergencyRides.forEach(r => getUpdatedRideStatus(r));
    }
    const rides = [...emergencyRides].sort((a, b) => b.createdAt - a.createdAt);

    // 2. Get all hospitals
    const hospitalsList = await HospitalDb.findAll();

    // 3. Compile priority queue
    const activeRides = rides.filter(r => r.status !== "Completed" && r.status !== "completed" && r.status !== "Cancelled" && r.status !== "cancelled");
    const priorityQueue = [...activeRides].sort((a, b) => {
      const priorityWeight = { critical: 3, urgent: 2, "non-urgent": 1 };
      const weightA = priorityWeight[a.priority as "critical" | "urgent" | "non-urgent"] || 0;
      const weightB = priorityWeight[b.priority as "critical" | "urgent" | "non-urgent"] || 0;
      if (weightA !== weightB) return weightB - weightA;
      return b.createdAt - a.createdAt; // Newer first
    });

    // 4. Compiled Analytics
    const totalCount = rides.length;
    const completedCount = rides.filter(r => r.status === "Completed" || r.status === "completed").length;
    const cancelledCount = rides.filter(r => r.status === "Cancelled" || r.status === "cancelled").length;
    const activeCount = activeRides.length;

    // Average Dispatch/Assign speed in minutes
    let totalDuration = 0;
    let countWithDuration = 0;
    rides.forEach(r => {
      if ((r.status === "Completed" || r.status === "completed") && r.completedAt && r.createdAt) {
        totalDuration += (r.completedAt - r.createdAt) / 60000;
        countWithDuration++;
      }
    });
    const avgDispatchTime = countWithDuration > 0 ? Number((totalDuration / countWithDuration).toFixed(1)) : 14.5;

    // Survival rate or safety rating
    const survivalRate = totalCount > 0 ? Number(((completedCount / (totalCount - cancelledCount || 1)) * 100).toFixed(1)) : 98.4;

    // Group by type
    const categoryBreakdown = {
      Maternity: rides.filter(r => r.emergencyType === "Maternity").length,
      "Accident/Trauma": rides.filter(r => r.emergencyType === "Accident/Trauma").length,
      "Severe Illness": rides.filter(r => r.emergencyType === "Severe Illness").length,
      Cardiac: rides.filter(r => r.emergencyType === "Cardiac").length,
      Other: rides.filter(r => r.emergencyType === "Other").length
    };

    // Village dispatches
    const villageCounts: Record<string, number> = {};
    rides.forEach(r => {
      if (r.village) {
        villageCounts[r.village] = (villageCounts[r.village] || 0) + 1;
      }
    });

    // Peak hours trend (group by hour 0-23)
    const hourlyTrend = Array(24).fill(0);
    rides.forEach(r => {
      const date = new Date(r.createdAt);
      const hour = date.getHours();
      hourlyTrend[hour]++;
    });

    // Weekly trend (by day index)
    const weeklyTrend = Array(7).fill(0); // Sun, Mon, Tue, Wed, Thu, Fri, Sat
    rides.forEach(r => {
      const date = new Date(r.createdAt);
      const day = date.getDay();
      weeklyTrend[day]++;
    });

    // 5. Heat Map Villages Data
    const villageCoordinates: Record<string, { lat: number; lng: number }> = {
      "Gauspur": { lat: 25.5682, lng: 83.5511 },
      "Karimpur": { lat: 25.5891, lng: 83.5932 },
      "Sherpur": { lat: 25.5721, lng: 83.5824 },
      "Malikpur": { lat: 25.5901, lng: 83.5611 },
      "Yusufpur": { lat: 25.6085, lng: 83.7312 },
      "Mohammadabad": { lat: 25.6142, lng: 83.7548 },
      "Sauram": { lat: 25.5534, lng: 83.6122 },
      "Reotipur": { lat: 25.5245, lng: 83.6421 },
      "Bara": { lat: 25.4988, lng: 83.6743 },
      "Nonhara": { lat: 25.6421, lng: 83.5412 },
      "Jangipur": { lat: 25.6488, lng: 83.4732 },
      "Suhawal": { lat: 25.5422, lng: 83.5899 }
    };

    const heatMapData = Object.keys(villageCoordinates).map(vName => {
      const coords = villageCoordinates[vName];
      const count = villageCounts[vName] || 0;
      const activeCountInVillage = activeRides.filter(r => r.village === vName).length;
      let threatLevel: "high" | "medium" | "low" = "low";
      if (activeCountInVillage > 0) {
        threatLevel = activeCountInVillage >= 2 ? "high" : "medium";
      } else if (count > 5) {
        threatLevel = "medium";
      }

      return {
        village: vName,
        lat: coords.lat,
        lng: coords.lng,
        emergencyCount: count,
        activeCount: activeCountInVillage,
        threatLevel
      };
    });

    res.json({
      success: true,
      emergencies: rides,
      priorityQueue,
      hospitals: hospitalsList,
      drivers,
      analytics: {
        totalCount,
        activeCount,
        completedCount,
        cancelledCount,
        avgDispatchTime,
        survivalRate,
        categoryBreakdown,
        villageCounts,
        hourlyTrend,
        weeklyTrend
      },
      heatMap: heatMapData
    });
  } catch (err: any) {
    console.error("Dashboard summary error:", err);
    res.status(500).json({ error: "Failed to compile emergency dashboard data." });
  }
});

// Update a hospital's status directly from Emergency Dashboard
app.put("/api/admin/emergency-dashboard/hospitals/:id", authenticateToken, verifyAdmin, async (req: any, res: any) => {
  const { id } = req.params;
  const { bedsAvailable, totalBeds, hasVentilator, hasOxygen, hasICU, contactNumber } = req.body;

  try {
    const hospital = await HospitalDb.findById(id);
    if (!hospital) {
      return res.status(404).json({ error: "Hospital not found." });
    }

    if (bedsAvailable !== undefined) hospital.bedsAvailable = Number(bedsAvailable);
    if (totalBeds !== undefined) hospital.totalBeds = Number(totalBeds);
    if (hasVentilator !== undefined) hospital.hasVentilator = Boolean(hasVentilator);
    if (hasOxygen !== undefined) hospital.hasOxygen = Boolean(hasOxygen);
    if (hasICU !== undefined) hospital.hasICU = Boolean(hasICU);
    if (contactNumber !== undefined) hospital.contactNumber = contactNumber;

    await HospitalDb.save(hospital);
    res.json({ success: true, message: "Hospital status updated successfully.", hospital });
  } catch (err: any) {
    console.error("Error updating hospital from dashboard:", err);
    res.status(500).json({ error: "Failed to update hospital status." });
  }
});

// Update driver status from Emergency Dashboard
app.put("/api/admin/emergency-dashboard/drivers/:id/status", authenticateToken, verifyAdmin, async (req: any, res: any) => {
  const { id } = req.params;
  const { status } = req.body;

  if (!status || !["available", "busy", "offline"].includes(status)) {
    return res.status(400).json({ error: "Invalid status value." });
  }

  try {
    const driverInstance = drivers.find(d => d.id === id);
    if (!driverInstance) {
      return res.status(404).json({ error: "Driver not found." });
    }

    driverInstance.status = status as any;

    const userProfile = await UserDb.findById(id);
    if (userProfile) {
      await UserDb.updateProfile(id, { driverStatus: status as any });
    }

    res.json({ success: true, message: "Driver status updated successfully.", driver: driverInstance });
  } catch (err: any) {
    console.error("Error updating driver status from dashboard:", err);
    res.status(500).json({ error: "Failed to update driver status." });
  }
});

// Manually override/upgrade booking priority
app.post("/api/admin/emergency-dashboard/bookings/:id/priority", authenticateToken, verifyAdmin, async (req: any, res: any) => {
  const { id } = req.params;
  const { priority } = req.body;

  if (!priority || !["critical", "urgent", "non-urgent"].includes(priority)) {
    return res.status(400).json({ error: "Invalid priority value." });
  }

  try {
    const ride = emergencyRides.find(r => r.id === id);
    if (!ride) {
      return res.status(404).json({ error: "Emergency ride not found." });
    }

    ride.priority = priority as any;
    res.json({ success: true, message: "Ride priority updated successfully.", ride });
  } catch (err: any) {
    console.error("Error overriding booking priority:", err);
    res.status(500).json({ error: "Failed to update ride priority." });
  }
});

// Serve frontend assets and SPA fallback
async function startServer() {
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  httpServer.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
    
    // Start WhatsApp Queue Worker background processor
    try {
      WhatsAppService.startQueueWorker();
    } catch (err) {
      console.error("Failed to start WhatsApp queue worker:", err);
    }
    
    // Start Emergency Priority Engine background loop (ticks every 4 seconds)
    setInterval(() => {
      PriorityEngine.tick().catch(err => {
        console.error("Error in PriorityEngine background tick:", err);
      });
    }, 4000);
  });

}

startServer();
