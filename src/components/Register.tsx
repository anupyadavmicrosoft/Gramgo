import React, { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { User, Phone, Lock, Home, Shield, Loader, Car, Compass, Gift, Check, AlertCircle } from "lucide-react";

const VILLAGES = [
  "Sherpur",
  "Gauspur",
  "Malikpur",
  "Karimpur",
  "Mohammadabad",
  "Dildarnagar",
  "Suhawal",
  "Yusufpur"
];

const VEHICLE_TYPES = [
  "Auto Rickshaw",
  "Bolero SUV",
  "Tractor Ambulance",
  "E-Rickshaw"
];

export default function Register() {
  const { register, error, clearError } = useAuth();
  const navigate = useNavigate();

  // Basic Details
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState<"passenger" | "driver" | "admin">("passenger");
  const [village, setVillage] = useState(VILLAGES[0]);
  const [customVillage, setCustomVillage] = useState("");
  const [isCustomVillage, setIsCustomVillage] = useState(false);

  // Referral Details
  const [referralCode, setReferralCode] = useState("");
  const [isValidatingReferral, setIsValidatingReferral] = useState(false);
  const [referralValidationResult, setReferralValidationResult] = useState<{ valid: boolean; message: string; referrerName?: string } | null>(null);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const ref = params.get("ref");
    if (ref) {
      setReferralCode(ref.toUpperCase());
      validateRefCode(ref.toUpperCase());
    }
  }, []);

  const validateRefCode = async (codeToValidate: string) => {
    if (!codeToValidate.trim()) {
      setReferralValidationResult(null);
      return;
    }
    setIsValidatingReferral(true);
    setReferralValidationResult(null);
    try {
      const res = await fetch("/api/referrals/validate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code: codeToValidate.toUpperCase().trim() })
      });
      const data = await res.json();
      if (res.ok && data.valid) {
        setReferralValidationResult({
          valid: true,
          message: `Valid code from ${data.referrerName || "a neighbor"}. You will receive a ₹50 credit bonus!`,
          referrerName: data.referrerName
        });
      } else {
        setReferralValidationResult({
          valid: false,
          message: data.error || "This referral code is invalid or expired."
        });
      }
    } catch (err) {
      setReferralValidationResult({
        valid: false,
        message: "Unable to verify code at this time."
      });
    } finally {
      setIsValidatingReferral(false);
    }
  };

  // Driver Specific Details
  const [vehicleType, setVehicleType] = useState(VEHICLE_TYPES[0]);
  const [vehicleNumber, setVehicleNumber] = useState("");

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  const handleRegisterSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);
    clearError();

    // Validation
    if (!name.trim()) return setFormError("Full Name is required.");
    if (!phone.trim()) return setFormError("Mobile Phone is required.");
    if (phone.trim().length < 10) return setFormError("Please enter a valid 10-digit mobile number.");
    if (!password) return setFormError("Password is required.");
    if (password.length < 6) return setFormError("Password must be at least 6 characters long.");

    const finalVillage = isCustomVillage ? customVillage.trim() : village;
    if (!finalVillage) return setFormError("Please select or enter your home village.");

    // Driver validation
    if (role === "driver") {
      if (!vehicleNumber.trim()) {
        return setFormError("As a registered driver, you must supply your vehicle number (e.g. UP-61-AB-1234).");
      }
    }

    setIsSubmitting(true);
    try {
      await register({
        name: name.trim(),
        phone: phone.trim(),
        email: email.trim() || undefined,
        password,
        role,
        village: finalVillage,
        vehicleType: role === "driver" ? vehicleType : undefined,
        vehicleNumber: role === "driver" ? vehicleNumber.trim() : undefined,
        referralCode: referralCode.trim() || undefined
      });

      // Redirect based on role
      if (role === "driver") {
        navigate("/drivers");
      } else if (role === "admin") {
        navigate("/");
      } else {
        navigate("/passenger");
      }
    } catch (err: any) {
      setFormError(err.message || "Failed to create account. Please review your entries.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div id="register-container" className="max-w-2xl mx-auto my-12 px-4 animate-fade-in">
      <div className="bg-white rounded-2xl shadow-xl border border-slate-100 overflow-hidden">
        {/* Banner Header */}
        <div className="bg-gradient-to-r from-slate-900 to-slate-850 p-8 text-center text-white">
          <h2 className="text-3xl font-bold font-display tracking-tight text-white mb-2">Create GramGo Account</h2>
          <p className="text-slate-300 text-sm">Join our community-driven emergency transportation network</p>
        </div>

        <form onSubmit={handleRegisterSubmit} className="p-8 space-y-6">
          {(formError || error) && (
            <div className="p-4 bg-rose-50 border-l-4 border-rose-500 rounded-r-xl text-rose-700 text-sm font-medium">
              {formError || error}
            </div>
          )}

          {/* Role Selection Segment */}
          <div className="space-y-3">
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 text-center">
              Choose Your Primary Role
            </label>
            <div className="grid grid-cols-3 gap-3">
              <button
                type="button"
                onClick={() => {
                  setRole("passenger");
                  setFormError(null);
                }}
                className={`flex flex-col items-center justify-center p-4 rounded-xl border-2 transition-all duration-200 cursor-pointer ${
                  role === "passenger"
                    ? "border-orange-500 bg-orange-50 text-orange-900"
                    : "border-slate-200 bg-white hover:border-slate-300 text-slate-600"
                }`}
              >
                <Compass className="w-6 h-6 mb-2" />
                <span className="font-semibold text-sm">Passenger</span>
                <span className="text-[10px] text-slate-500 mt-1">Needs rides</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  setRole("driver");
                  setFormError(null);
                }}
                className={`flex flex-col items-center justify-center p-4 rounded-xl border-2 transition-all duration-200 cursor-pointer ${
                  role === "driver"
                    ? "border-orange-500 bg-orange-50 text-orange-900"
                    : "border-slate-200 bg-white hover:border-slate-300 text-slate-600"
                }`}
              >
                <Car className="w-6 h-6 mb-2" />
                <span className="font-semibold text-sm">Volunteer Driver</span>
                <span className="text-[10px] text-slate-500 mt-1">Has a vehicle</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  setRole("admin");
                  setFormError(null);
                }}
                className={`flex flex-col items-center justify-center p-4 rounded-xl border-2 transition-all duration-200 cursor-pointer ${
                  role === "admin"
                    ? "border-orange-500 bg-orange-50 text-orange-900"
                    : "border-slate-200 bg-white hover:border-slate-300 text-slate-600"
                }`}
              >
                <Shield className="w-6 h-6 mb-2" />
                <span className="font-semibold text-sm">Gram Admin</span>
                <span className="text-[10px] text-slate-500 mt-1">Village officer</span>
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-2">
            {/* Full Name */}
            <div className="space-y-2">
              <label htmlFor="reg-name" className="block text-xs font-bold uppercase tracking-wider text-slate-500">
                Full Name (पूरा नाम)
              </label>
              <div className="relative">
                <span className="absolute inset-y-0 left-0 flex items-center pl-3.5 text-slate-400">
                  <User className="w-4 h-4" />
                </span>
                <input
                  id="reg-name"
                  type="text"
                  placeholder="e.g. Anand Kumar"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-10 pr-4 py-3 text-slate-800 focus:outline-none focus:border-orange-500 focus:bg-white transition duration-200"
                />
              </div>
            </div>

            {/* Mobile Phone */}
            <div className="space-y-2">
              <label htmlFor="reg-phone" className="block text-xs font-bold uppercase tracking-wider text-slate-500">
                Mobile Number (मोबाइल नंबर)
              </label>
              <div className="relative">
                <span className="absolute inset-y-0 left-0 flex items-center pl-3.5 text-slate-400">
                  <Phone className="w-4 h-4" />
                </span>
                <input
                  id="reg-phone"
                  type="tel"
                  placeholder="e.g. 9876543210"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-10 pr-4 py-3 text-slate-800 focus:outline-none focus:border-orange-500 focus:bg-white transition duration-200"
                />
              </div>
            </div>

            {/* Password */}
            <div className="space-y-2">
              <label htmlFor="reg-pass" className="block text-xs font-bold uppercase tracking-wider text-slate-500">
                Password (पासवर्ड)
              </label>
              <div className="relative">
                <span className="absolute inset-y-0 left-0 flex items-center pl-3.5 text-slate-400">
                  <Lock className="w-4 h-4" />
                </span>
                <input
                  id="reg-pass"
                  type="password"
                  placeholder="Minimum 6 characters"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-10 pr-4 py-3 text-slate-800 focus:outline-none focus:border-orange-500 focus:bg-white transition duration-200"
                />
              </div>
            </div>

            {/* Home Village */}
            <div className="space-y-2">
              <div className="flex justify-between items-center">
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-500">
                  Home Village (गाँव)
                </label>
                <button
                  type="button"
                  onClick={() => setIsCustomVillage(!isCustomVillage)}
                  className="text-xs font-semibold text-orange-600 hover:text-orange-500"
                >
                  {isCustomVillage ? "Select from list" : "Other Village?"}
                </button>
              </div>

              {isCustomVillage ? (
                <div className="relative">
                  <span className="absolute inset-y-0 left-0 flex items-center pl-3.5 text-slate-400">
                    <Home className="w-4 h-4" />
                  </span>
                  <input
                    type="text"
                    placeholder="Enter village name"
                    value={customVillage}
                    onChange={(e) => setCustomVillage(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-10 pr-4 py-3 text-slate-800 focus:outline-none focus:border-orange-500 focus:bg-white transition duration-200"
                  />
                </div>
              ) : (
                <select
                  value={village}
                  onChange={(e) => setVillage(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-slate-800 focus:outline-none focus:border-orange-500 focus:bg-white transition duration-200 font-sans cursor-pointer"
                >
                  {VILLAGES.map((v) => (
                    <option key={v} value={v}>
                      {v}
                    </option>
                  ))}
                </select>
              )}
            </div>
          </div>

          {/* Email (Optional) */}
          <div className="space-y-2">
            <label htmlFor="reg-email" className="block text-xs font-bold uppercase tracking-wider text-slate-500">
              Email Address (Optional)
            </label>
            <input
              id="reg-email"
              type="email"
              placeholder="e.g. user@gramgo.org"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-slate-800 focus:outline-none focus:border-orange-500 focus:bg-white transition duration-200"
            />
          </div>

          {/* Driver Specific section */}
          {role === "driver" && (
            <div id="driver-details-section" className="p-6 bg-slate-50 rounded-xl border border-slate-200 space-y-4 animate-fade-in">
              <h3 className="text-sm font-bold uppercase text-slate-700 border-b border-slate-200 pb-2">
                Emergency Transportation details
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Vehicle Type */}
                <div className="space-y-2">
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-500">
                    Vehicle Type
                  </label>
                  <select
                    value={vehicleType}
                    onChange={(e) => setVehicleType(e.target.value)}
                    className="w-full bg-white border border-slate-200 rounded-xl px-4 py-3 text-slate-800 focus:outline-none focus:border-orange-500 cursor-pointer"
                  >
                    {VEHICLE_TYPES.map((type) => (
                      <option key={type} value={type}>
                        {type}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Vehicle Number */}
                <div className="space-y-2">
                  <label htmlFor="reg-veh-num" className="block text-xs font-bold uppercase tracking-wider text-slate-500">
                    Vehicle Number (UP Registration)
                  </label>
                  <input
                    id="reg-veh-num"
                    type="text"
                    placeholder="e.g. UP-61-AB-1234"
                    value={vehicleNumber}
                    onChange={(e) => setVehicleNumber(e.target.value.toUpperCase())}
                    className="w-full bg-white border border-slate-200 rounded-xl px-4 py-3 text-slate-800 focus:outline-none focus:border-orange-500 transition duration-200 placeholder:normal-case"
                  />
                </div>
              </div>
            </div>
          )}

          {/* Referral Code (Optional) */}
          <div className="space-y-2 border-t border-slate-100 pt-4">
            <label htmlFor="reg-referral" className="block text-xs font-bold uppercase tracking-wider text-slate-500">
              Referral Code (Optional)
            </label>
            <div className="flex gap-2">
              <div className="relative flex-grow">
                <span className="absolute inset-y-0 left-0 flex items-center pl-3.5 text-slate-400">
                  <Gift className="w-4 h-4" />
                </span>
                <input
                  id="reg-referral"
                  type="text"
                  placeholder="e.g. AMIT50"
                  value={referralCode}
                  onChange={(e) => {
                    const val = e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, "");
                    setReferralCode(val);
                    if (!val) setReferralValidationResult(null);
                  }}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-10 pr-4 py-3 text-slate-800 font-mono font-bold uppercase focus:outline-none focus:border-orange-500 focus:bg-white transition duration-200"
                />
              </div>
              <button
                type="button"
                onClick={() => validateRefCode(referralCode)}
                disabled={isValidatingReferral || !referralCode.trim()}
                className="px-4 bg-slate-800 hover:bg-slate-900 disabled:bg-slate-200 disabled:text-slate-400 text-white font-bold text-xs rounded-xl transition duration-200 cursor-pointer flex items-center gap-1 shrink-0"
              >
                {isValidatingReferral ? "Verifying..." : "Verify Code"}
              </button>
            </div>

            {referralValidationResult && (
              <div className={`text-xs font-bold flex items-center space-x-1.5 mt-1.5 ${
                referralValidationResult.valid ? "text-emerald-600" : "text-red-500"
              }`}>
                {referralValidationResult.valid ? (
                  <Check className="w-4 h-4 text-emerald-600 shrink-0" />
                ) : (
                  <AlertCircle className="w-4 h-4 text-red-500 shrink-0" />
                )}
                <span>{referralValidationResult.message}</span>
              </div>
            )}
          </div>

          {/* Submit Button */}
          <button
            id="register-submit-btn"
            type="submit"
            disabled={isSubmitting}
            className="w-full bg-orange-500 hover:bg-orange-600 disabled:bg-orange-400 text-white font-semibold py-4 rounded-xl transition duration-200 shadow-md shadow-orange-100 flex items-center justify-center gap-2 cursor-pointer"
          >
            {isSubmitting ? (
              <>
                <Loader className="w-5 h-5 animate-spin" />
                <span>Creating Account...</span>
              </>
            ) : (
              <span>Create Account</span>
            )}
          </button>
        </form>

        {/* Footer */}
        <div className="px-8 py-5 bg-slate-50 border-t border-slate-100 text-center text-sm text-slate-600 flex justify-between">
          <span>Already have an account?</span>
          <Link to="/login" className="font-bold text-orange-600 hover:text-orange-500 hover:underline">
            Sign In
          </Link>
        </div>
      </div>
    </div>
  );
}
