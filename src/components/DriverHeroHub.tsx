import React, { useState, useEffect } from "react";
import { 
  Award, 
  UserPlus, 
  Truck, 
  Search, 
  Smartphone, 
  ShieldCheck, 
  MapPin, 
  Users, 
  Activity, 
  UserCheck 
} from "lucide-react";
import { Driver } from "../types";

export default function DriverHeroHub() {
  // Local States
  const [driversList, setDriversList] = useState<Driver[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [isRegistering, setIsRegistering] = useState(false);
  
  // Registration Form States
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [vehicleType, setVehicleType] = useState<Driver["vehicleType"]>("Auto Rickshaw");
  const [vehicleNumber, setVehicleNumber] = useState("");
  const [village, setVillage] = useState("");
  
  // Fetch drivers list
  const fetchDrivers = () => {
    fetch("/api/drivers")
      .then((res) => res.json())
      .then((data) => setDriversList(data))
      .catch((err) => console.error("Error fetching drivers:", err));
  };

  useEffect(() => {
    fetchDrivers();
  }, []);

  const handleRegisterDriver = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name || !phone || !vehicleNumber || !village) {
      alert("Please fill in all volunteer details.");
      return;
    }

    setIsRegistering(true);
    try {
      const response = await fetch("/api/drivers", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name,
          phone,
          vehicleType,
          vehicleNumber,
          village,
        }),
      });

      if (!response.ok) throw new Error("Could not register driver.");
      const newDrv = await response.json();
      
      // Update local list
      setDriversList((prev) => [...prev, newDrv]);
      
      // Reset form
      setName("");
      setPhone("");
      setVehicleNumber("");
      setVillage("");
      alert("🎉 Successfully registered as a GramGo Volunteer Driver!");
    } catch (err: any) {
      alert(err.message || "Failed to register.");
    } finally {
      setIsRegistering(false);
    }
  };

  // Simulate toggling availability locally
  const toggleDriverStatus = (driverId: string) => {
    setDriversList((prev) =>
      prev.map((drv) => {
        if (drv.id === driverId) {
          const nextStatus: Driver["status"] = 
            drv.status === "available" ? "offline" : drv.status === "offline" ? "available" : "available";
          return { ...drv, status: nextStatus };
        }
        return drv;
      })
    );
  };

  // Filter list
  const filteredDrivers = driversList.filter((drv) => {
    return (
      drv.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      drv.village.toLowerCase().includes(searchTerm.toLowerCase()) ||
      drv.vehicleType.toLowerCase().includes(searchTerm.toLowerCase())
    );
  });

  return (
    <div id="driver-hero-hub" className="max-w-7xl mx-auto px-4 py-12 sm:px-6 lg:px-8 space-y-12">
      {/* Page Header */}
      <div className="text-center max-w-2xl mx-auto space-y-2">
        <div className="inline-flex items-center px-2.5 py-1 bg-emerald-100 text-emerald-800 rounded-full text-xs font-bold shadow-sm">
          <UserCheck className="w-3.5 h-3.5 mr-1.5 animate-pulse" />
          <span>Village volunteer platform • ग्राम सेवक संघ</span>
        </div>
        <h1 className="text-3xl sm:text-4xl font-extrabold text-slate-900 tracking-tight">
          Volunteer Gram Sevaks
        </h1>
        <p className="text-sm text-slate-500">
          Our drivers pledge their personal vehicles to ensure secure medical transit for remote communities.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* Left Column: List of Local Drivers */}
        <div className="lg:col-span-7 space-y-6">
          <div className="bg-white rounded-2xl border border-slate-100 shadow-xl p-6 space-y-6">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b border-slate-100 pb-4">
              <div>
                <h2 className="text-lg font-extrabold text-slate-900">Registered Local Heroes</h2>
                <p className="text-xs text-slate-400">Pledge list of active village vehicles.</p>
              </div>

              {/* Search Bar */}
              <div className="relative w-full sm:w-64">
                <Search className="absolute left-3 top-3 w-4 h-4 text-slate-400" />
                <input
                  type="text"
                  placeholder="Search village or driver name..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-9 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold focus:bg-white outline-none focus:ring-2 focus:ring-orange-500"
                />
              </div>
            </div>

            {/* Drivers List */}
            <div className="space-y-4">
              {filteredDrivers.map((driver) => (
                <div 
                  key={driver.id}
                  className="p-4 bg-slate-50/50 hover:bg-slate-50 border border-slate-100 rounded-xl flex flex-col sm:flex-row sm:items-center justify-between gap-4 transition"
                >
                  <div className="space-y-2">
                    <div className="flex items-center space-x-2">
                      <span className="font-extrabold text-sm text-slate-900">{driver.name}</span>
                      <span className="flex items-center text-amber-500 text-xs font-bold space-x-0.5">
                        <Award className="w-3.5 h-3.5" />
                        <span>{driver.rating} ★</span>
                      </span>
                    </div>

                    <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-xs text-slate-500 font-medium">
                      <span className="flex items-center space-x-1">
                        <MapPin className="w-3.5 h-3.5 text-gray-400" />
                        <span>Village: {driver.village}</span>
                      </span>
                      <span className="flex items-center space-x-1">
                        <Truck className="w-3.5 h-3.5 text-gray-400" />
                        <span>{driver.vehicleType}</span>
                      </span>
                      <span className="col-span-2 text-[10px] uppercase tracking-wider text-slate-400 font-mono mt-1">
                        Plate No: {driver.vehicleNumber}
                      </span>
                    </div>
                  </div>

                  <div className="flex sm:flex-col items-center sm:items-end justify-between gap-2 pt-3 sm:pt-0 border-t sm:border-t-0 border-slate-200">
                    {/* Status badge and simulator trigger */}
                    <div className="flex items-center space-x-2">
                      <span className={`px-2.5 py-1 rounded-full text-[10px] font-extrabold uppercase tracking-wide border ${
                        driver.status === "available"
                          ? "bg-emerald-50 border-emerald-200 text-emerald-700"
                          : driver.status === "busy"
                          ? "bg-amber-50 border-amber-200 text-amber-700"
                          : "bg-slate-100 border-slate-200 text-slate-500"
                      }`}>
                        {driver.status}
                      </span>

                      {/* Simulation Button */}
                      <button
                        onClick={() => toggleDriverStatus(driver.id)}
                        className="p-1 hover:bg-slate-200 rounded text-[10px] font-bold text-orange-600 transition"
                        title="Simulate driver toggling online/offline status"
                      >
                        [Toggle Available]
                      </button>
                    </div>

                    <span className="text-[10px] text-slate-400 font-bold">
                      {driver.completedTrips} Trips Completed
                    </span>
                  </div>
                </div>
              ))}

              {filteredDrivers.length === 0 && (
                <div className="py-8 text-center text-slate-400 text-xs">
                  No volunteer drivers match your search query.
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Right Column: Register Vehicle Form */}
        <div className="lg:col-span-5 space-y-6">
          <div className="bg-white rounded-2xl border border-slate-100 shadow-xl p-6 sm:p-8 space-y-6">
            <div className="border-b border-slate-100 pb-4">
              <h2 className="text-lg font-extrabold text-slate-900 flex items-center space-x-2">
                <UserPlus className="w-5 h-5 text-emerald-600" />
                <span>Pledge Your Vehicle</span>
              </h2>
              <p className="text-xs text-slate-400">
                Join our network to assist in critical local medical emergencies.
              </p>
            </div>

            <form onSubmit={handleRegisterDriver} className="space-y-4">
              {/* Full Name */}
              <div className="space-y-1">
                <label className="text-xs font-extrabold text-slate-700 uppercase tracking-wider block">Volunteer Name</label>
                <input
                  type="text"
                  placeholder="e.g. Ramesh Chandra Yadav"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full px-3.5 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium focus:bg-white focus:ring-2 focus:ring-orange-500 outline-none"
                  required
                />
              </div>

              {/* Mobile Phone */}
              <div className="space-y-1">
                <label className="text-xs font-extrabold text-slate-700 uppercase tracking-wider block">Phone Number</label>
                <div className="relative">
                  <Smartphone className="absolute left-3.5 top-3.5 w-4 h-4 text-gray-400" />
                  <input
                    type="tel"
                    placeholder="e.g. +91 XXXXX XXXXX"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    className="w-full pl-10 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium focus:bg-white focus:ring-2 focus:ring-orange-500 outline-none"
                    required
                  />
                </div>
              </div>

              {/* Vehicle Type */}
              <div className="space-y-1">
                <label className="text-xs font-extrabold text-slate-700 uppercase tracking-wider block">Vehicle Type</label>
                <select
                  value={vehicleType}
                  onChange={(e) => setVehicleType(e.target.value as any)}
                  className="w-full px-3.5 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold focus:bg-white focus:ring-2 focus:ring-orange-500 outline-none"
                >
                  <option value="Auto Rickshaw">🛺 Auto Rickshaw</option>
                  <option value="Bolero SUV">🚙 Bolero SUV / Utility Vehicle</option>
                  <option value="Tractor Ambulance">🚜 Tractor Ambulance (Heavy Duty)</option>
                  <option value="E-Rickshaw">⚡ Electric Rickshaw</option>
                </select>
              </div>

              {/* Vehicle Number Plate */}
              <div className="space-y-1">
                <label className="text-xs font-extrabold text-slate-700 uppercase tracking-wider block">Vehicle Registration Number</label>
                <input
                  type="text"
                  placeholder="e.g. UP-61-AB-1234"
                  value={vehicleNumber}
                  onChange={(e) => setVehicleNumber(e.target.value)}
                  className="w-full px-3.5 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium uppercase tracking-wider focus:bg-white focus:ring-2 focus:ring-orange-500 outline-none"
                  required
                />
              </div>

              {/* Village */}
              <div className="space-y-1">
                <label className="text-xs font-extrabold text-slate-700 uppercase tracking-wider block">Village Location</label>
                <input
                  type="text"
                  placeholder="e.g. Gauspur"
                  value={village}
                  onChange={(e) => setVillage(e.target.value)}
                  className="w-full px-3.5 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium focus:bg-white focus:ring-2 focus:ring-orange-500 outline-none"
                  required
                />
              </div>

              <button
                type="submit"
                disabled={isRegistering}
                className="w-full py-3.5 bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold text-sm rounded-xl shadow-lg shadow-emerald-100 hover:shadow-emerald-200 transition"
              >
                {isRegistering ? "Registering Your Vehicle..." : "PLEDGE VEHICLE & JOIN"}
              </button>
            </form>
          </div>

          {/* Impact Banner */}
          <div className="bg-slate-900 text-slate-300 p-6 rounded-2xl space-y-4">
            <h3 className="text-sm font-bold text-white flex items-center space-x-1.5">
              <ShieldCheck className="w-4 h-4 text-emerald-400" />
              <span>Panchayat Volunteer Incentives</span>
            </h3>
            <p className="text-xs leading-relaxed">
              Volunteer drivers who transport patients are honored at Panchayat assemblies, receive annual fuel vouchers subsidised by district health coalitions, and are highlighted in local gazettes.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
