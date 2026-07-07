import React from "react";
import { 
  X, 
  MapPin, 
  Phone, 
  Car, 
  Clock, 
  ShieldCheck, 
  DollarSign, 
  Award,
  Calendar,
  HeartHandshake
} from "lucide-react";
import { EmergencyRide } from "../types";

interface RideSummaryModalProps {
  ride: EmergencyRide | null;
  isOpen: boolean;
  onClose: () => void;
}

export function RideSummaryModal({ ride, isOpen, onClose }: RideSummaryModalProps) {
  if (!isOpen || !ride) return null;

  const completedDate = ride.completedAt 
    ? new Date(ride.completedAt).toLocaleString() 
    : new Date(ride.createdAt + (ride.durationMin || 25) * 60000).toLocaleString();

  // Robust default calculations if fields are somehow missing for older seed rides
  const distance = ride.distanceKm || 5.8;
  const duration = ride.durationMin || 18;
  const fare = ride.fareRupees || Math.round(50 + (distance * 12));
  const paymentStatus = ride.paymentStatus || "subsidized";

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4">
      <div 
        className="bg-white border border-slate-100 rounded-3xl max-w-lg w-full p-6 sm:p-8 shadow-2xl relative space-y-6 animate-in fade-in zoom-in-95 duration-200 overflow-y-auto max-h-[90vh]"
        id="ride-summary-modal"
      >
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute right-4 top-4 p-1.5 text-slate-400 hover:text-slate-600 rounded-full hover:bg-slate-100 transition-all cursor-pointer"
          id="close-summary-btn"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Header with Stamp */}
        <div className="flex items-start justify-between border-b border-dashed border-slate-100 pb-5">
          <div className="space-y-1.5">
            <span className="px-2.5 py-0.5 bg-emerald-50 text-emerald-700 border border-emerald-100 text-[10px] font-black uppercase rounded-md tracking-wider">
              GramGo Lifeline Receipt
            </span>
            <h3 className="text-xl font-black text-slate-900">Emergency Transit Summary</h3>
            <div className="flex items-center space-x-1.5 text-[11px] text-slate-500 font-bold">
              <Calendar className="w-3.5 h-3.5" />
              <span>{completedDate}</span>
            </div>
          </div>
          <div className="hidden sm:flex flex-col items-center bg-emerald-50 text-emerald-700 p-3 rounded-2xl border border-emerald-100 rotate-3">
            <Award className="w-6 h-6" />
            <span className="text-[9px] font-black uppercase tracking-wider mt-1">Life Saved</span>
          </div>
        </div>

        {/* Metrics Block */}
        <div className="grid grid-cols-3 gap-3">
          <div className="bg-slate-50/50 border border-slate-100 rounded-2xl p-3 text-center space-y-0.5">
            <span className="text-[9px] text-slate-400 font-bold uppercase tracking-wider block">Distance</span>
            <span className="font-mono text-base font-extrabold text-slate-800">{distance.toFixed(1)} km</span>
          </div>
          <div className="bg-slate-50/50 border border-slate-100 rounded-2xl p-3 text-center space-y-0.5">
            <span className="text-[9px] text-slate-400 font-bold uppercase tracking-wider block">Duration</span>
            <span className="font-mono text-base font-extrabold text-slate-800">{duration} mins</span>
          </div>
          <div className="bg-slate-50/50 border border-slate-100 rounded-2xl p-3 text-center space-y-0.5">
            <span className="text-[9px] text-slate-400 font-bold uppercase tracking-wider block">Panchayat Subsidy</span>
            <span className="font-mono text-base font-extrabold text-emerald-600">₹{fare}</span>
          </div>
        </div>

        {/* Passenger Details */}
        <div className="space-y-3 bg-slate-50/35 p-4 rounded-2xl border border-slate-100">
          <h4 className="text-xs font-black text-slate-800 uppercase tracking-wider flex items-center space-x-1.5 border-b border-slate-100/50 pb-2">
            <HeartHandshake className="w-4 h-4 text-emerald-600" />
            <span>Passenger (Patient) Details</span>
          </h4>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs font-semibold">
            <div>
              <span className="text-[10px] text-slate-400 block font-bold">Patient Name</span>
              <span className="text-slate-800 font-black">{ride.patientName}</span>
            </div>
            <div>
              <span className="text-[10px] text-slate-400 block font-bold">Contact Number</span>
              <span className="text-slate-700">{ride.patientPhone}</span>
            </div>
            <div>
              <span className="text-[10px] text-slate-400 block font-bold">Origin Village</span>
              <span className="text-slate-800 font-extrabold">{ride.village}</span>
            </div>
            <div>
              <span className="text-[10px] text-slate-400 block font-bold">Landmark Reference</span>
              <span className="text-slate-700">{ride.landmark || "Main Village Square"}</span>
            </div>
          </div>
        </div>

        {/* Volunteer Driver & Vehicle Details */}
        <div className="space-y-3 bg-slate-50/35 p-4 rounded-2xl border border-slate-100">
          <h4 className="text-xs font-black text-slate-800 uppercase tracking-wider flex items-center space-x-1.5 border-b border-slate-100/50 pb-2">
            <Car className="w-4 h-4 text-slate-600" />
            <span>Volunteer Driver Details</span>
          </h4>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs font-semibold">
            <div>
              <span className="text-[10px] text-slate-400 block font-bold">Driver Name</span>
              <span className="text-slate-800 font-black">{ride.driverName || "GramGo Volunteer"}</span>
            </div>
            <div>
              <span className="text-[10px] text-slate-400 block font-bold">Driver Contact</span>
              <span className="text-slate-700">{ride.driverPhone || "Not Available"}</span>
            </div>
            <div>
              <span className="text-[10px] text-slate-400 block font-bold">Vehicle Assigned</span>
              <span className="text-slate-800 font-extrabold">{ride.vehicleType || "Tractor Ambulance"}</span>
            </div>
            <div>
              <span className="text-[10px] text-slate-400 block font-bold">Plate / Vehicle ID</span>
              <span className="font-mono text-slate-700 uppercase">{ride.vehicleType ? "UP-61-EM-0912" : "UP-61-EM-XXXX"}</span>
            </div>
          </div>
        </div>

        {/* Destination CHC */}
        <div className="space-y-3 p-4 bg-emerald-50/30 border border-emerald-100/50 rounded-2xl">
          <h4 className="text-xs font-black text-slate-800 uppercase tracking-wider flex items-center space-x-1.5">
            <MapPin className="w-4 h-4 text-emerald-600" />
            <span>Destination Care Centre</span>
          </h4>
          <p className="text-xs font-bold text-slate-700">{ride.destinationChc}</p>
        </div>

        {/* Payment / Subsidy breakdown */}
        <div className="border-t border-dashed border-slate-150 pt-4 space-y-3">
          <div className="flex items-center justify-between text-xs font-bold">
            <span className="text-slate-500">Transit Cost (Fully Subsidized)</span>
            <span className="text-slate-700 font-mono">₹{fare}.00</span>
          </div>
          <div className="flex items-center justify-between text-xs font-bold">
            <span className="text-slate-500">Patient Share Payable</span>
            <span className="text-emerald-600 font-black font-mono">₹0.00</span>
          </div>

          <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl flex items-center space-x-2.5">
            <ShieldCheck className="w-5 h-5 text-emerald-600 shrink-0" />
            <div className="text-[11px] text-emerald-800 leading-snug font-bold">
              <span>Paid by Gram Panchayat Rural Health Fund. 100% Cashless Lifeline Transit.</span>
            </div>
          </div>
        </div>

        {/* Actions */}
        <div className="flex flex-col sm:flex-row gap-2 pt-2">
          <button
            onClick={() => window.print()}
            className="flex-1 px-4 py-3 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-extrabold transition-all uppercase tracking-wider cursor-pointer text-center"
          >
            Print Receipt 🖨️
          </button>
          <button
            onClick={() => {
              const content = `=========================================
          GRAMGO LIFELINE TRANSIT RECEIPT
=========================================
Receipt Date: ${completedDate}
Emergency ID: ${ride.id}
Priority: ${ride.priority.toUpperCase()}
Emergency Type: ${ride.emergencyType}

-----------------------------------------
PATIENT DETAILS:
Name: ${ride.patientName}
Phone: ${ride.patientPhone}
Pickup Village: ${ride.village}
Landmark: ${ride.landmark || "Main Village Square"}

-----------------------------------------
DRIVER & VEHICLE DETAILS:
Driver Name: ${ride.driverName || "GramGo Volunteer"}
Driver Contact: ${ride.driverPhone || "Not Available"}
Vehicle Assigned: ${ride.vehicleType || "Tractor Ambulance"}

-----------------------------------------
TRANSIT DETAIL:
Destination CHC: ${ride.destinationChc}
Distance: ${distance.toFixed(1)} km
Duration: ${duration} minutes

-----------------------------------------
BILLING SUMMARY:
Transit Cost: INR ${fare}.00
Panchayat Subsidy: 100% Cashless
Patient Share: INR 0.00
Payment Status: PAID & SUBSIDIZED (100% Cashless)

=========================================
      SAVING LIVES, CONNECTING VILLAGES
=========================================`;
              const blob = new Blob([content], { type: "text/plain" });
              const url = URL.createObjectURL(blob);
              const link = document.createElement("a");
              link.href = url;
              link.download = `GramGo_Receipt_${ride.id.substring(0,8)}.txt`;
              document.body.appendChild(link);
              link.click();
              document.body.removeChild(link);
              URL.revokeObjectURL(url);
            }}
            className="flex-1 px-4 py-3 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-200 rounded-xl text-xs font-extrabold transition-all uppercase tracking-wider cursor-pointer text-center"
          >
            Download Receipt 📥
          </button>
          <button
            onClick={onClose}
            className="flex-1 px-4 py-3 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-extrabold transition-all uppercase tracking-wider cursor-pointer text-center"
          >
            Close
          </button>
        </div>

      </div>
    </div>
  );
}
