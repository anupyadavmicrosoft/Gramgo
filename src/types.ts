export type UserRole = "passenger" | "driver" | "admin";

export interface User {
  id: string;
  name: string;
  phone: string;
  email?: string;
  role: UserRole;
  village: string;
  district?: string;
  createdAt: number;
  status?: "active" | "suspended";
  // Specific for Driver role
  vehicleType?: "Auto Rickshaw" | "Bolero SUV" | "Tractor Ambulance" | "E-Rickshaw";
  vehicleNumber?: string;
  latitude?: number;
  longitude?: number;
  locationUpdatedAt?: number;
}

export interface AuthResponse {
  token: string;
  user: User;
}

export interface Driver {
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
  latitude?: number;
  longitude?: number;
  locationUpdatedAt?: number;
}

export interface CommunityHealthCentre {
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

export interface Hospital {
  id: string;
  name: string;
  type: string;
  village: string;
  district: string;
  distanceKm: number;
  bedsAvailable: number;
  totalBeds: number;
  contactNumber: string;
  hasVentilator: boolean;
  hasICU: boolean;
  hasBloodBank: boolean;
  hasOxygen: boolean;
  specialty: string;
  lat: number;
  lng: number;
  etaMinutes?: number;
}

export interface EmergencyRide {
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

export interface RideCancellationLog {
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

export interface EmergencyContact {
  id: string;
  userId: string;
  name: string;
  relationship: string;
  phone: string;
  isPrimary: boolean;
  createdAt: number;
}

export interface EmergencyContacts {
  nationalAmbulance: string;
  police: string;
  womensHelpline: string;
  gramGoHelpline: string;
  regionalContacts: {
    designation: string;
    number: string;
  }[];
}

export interface IBooking {
  id: string;
  passengerId: string;
  passengerName: string;
  passengerPhone: string;
  pickupLocation: string;
  destination: string;
  rideType: "Bike" | "Auto" | "Car" | "Emergency";
  notes?: string;
  estimatedDistance: number;
  estimatedTime: number;
  estimatedFare: number;
  status: "pending" | "accepted" | "completed" | "cancelled";
  driverId?: string;
  driverName?: string;
  driverPhone?: string;
  createdAt: string; // Date serialized to string in JSON
}
