import React, { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { Phone, Lock, Key, ArrowLeft, Loader, CheckCircle } from "lucide-react";

export default function ForgotPassword() {
  const { forgotPassword, resetPassword } = useAuth();
  const navigate = useNavigate();

  const [phoneOrEmail, setPhoneOrEmail] = useState("");
  const [step, setStep] = useState<1 | 2 | 3>(1); // 1: request, 2: verify/reset, 3: success
  const [otp, setOtp] = useState("");
  const [newPassword, setNewPassword] = useState("");
  
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  const handleRequestOTP = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);

    if (!phoneOrEmail.trim()) {
      setErrorMsg("Please enter your registered phone number or email.");
      return;
    }

    setIsSubmitting(true);
    try {
      const data = await forgotPassword(phoneOrEmail.trim());
      setSuccessMsg(data.message);
      setStep(2);
    } catch (err: any) {
      setErrorMsg(err.message || "Failed to initiate recovery. Please ensure the user exists.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);

    if (!otp.trim()) {
      setErrorMsg("Please enter the verification OTP code.");
      return;
    }
    if (!newPassword) {
      setErrorMsg("Please enter a new password.");
      return;
    }
    if (newPassword.length < 6) {
      setErrorMsg("New password must be at least 6 characters.");
      return;
    }

    setIsSubmitting(true);
    try {
      await resetPassword(phoneOrEmail.trim(), otp.trim(), newPassword);
      setStep(3);
    } catch (err: any) {
      setErrorMsg(err.message || "Failed to reset password. Please double-check the OTP.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div id="forgot-password-container" className="max-w-md mx-auto my-12 px-4 animate-fade-in">
      <div className="bg-white rounded-2xl shadow-xl border border-slate-100 overflow-hidden">
        {/* Banner header */}
        <div className="bg-gradient-to-r from-slate-900 to-slate-850 p-8 text-center text-white relative">
          <Link to="/login" className="absolute left-4 top-4 text-slate-400 hover:text-white transition duration-150">
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <h2 className="text-2xl font-bold font-display tracking-tight text-white mb-2">Account Recovery</h2>
          <p className="text-slate-300 text-sm">Recover your password using your mobile number or email</p>
        </div>

        {/* Step 1: Request OTP */}
        {step === 1 && (
          <form onSubmit={handleRequestOTP} className="p-8 space-y-6">
            {errorMsg && (
              <div className="p-4 bg-rose-50 border-l-4 border-rose-500 rounded-r-xl text-rose-700 text-sm font-medium">
                {errorMsg}
              </div>
            )}

            <div className="space-y-2">
              <label htmlFor="recovery-id" className="block text-xs font-bold uppercase tracking-wider text-slate-500">
                Registered Phone or Email
              </label>
              <div className="relative">
                <span className="absolute inset-y-0 left-0 flex items-center pl-3.5 text-slate-400">
                  <Phone className="w-4 h-4" />
                </span>
                <input
                  id="recovery-id"
                  type="text"
                  placeholder="e.g. +91 99999 99999"
                  value={phoneOrEmail}
                  onChange={(e) => setPhoneOrEmail(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-10 pr-4 py-3 text-slate-800 placeholder-slate-400 focus:outline-none focus:border-orange-500 focus:bg-white transition-all duration-200"
                />
              </div>
            </div>

            <button
              id="request-otp-btn"
              type="submit"
              disabled={isSubmitting}
              className="w-full bg-orange-500 hover:bg-orange-600 disabled:bg-orange-400 text-white font-semibold py-3.5 rounded-xl transition duration-200 shadow-md shadow-orange-100 flex items-center justify-center gap-2 cursor-pointer"
            >
              {isSubmitting ? (
                <>
                  <Loader className="w-5 h-5 animate-spin" />
                  <span>Requesting OTP...</span>
                </>
              ) : (
                <span>Request OTP Code</span>
              )}
            </button>
          </form>
        )}

        {/* Step 2: Input OTP & Set New Password */}
        {step === 2 && (
          <form onSubmit={handleResetPassword} className="p-8 space-y-6">
            {successMsg && (
              <div className="p-4 bg-emerald-50 border-l-4 border-emerald-500 rounded-r-xl text-emerald-800 text-xs font-medium">
                {successMsg}
              </div>
            )}

            {errorMsg && (
              <div className="p-4 bg-rose-50 border-l-4 border-rose-500 rounded-r-xl text-rose-700 text-sm font-medium">
                {errorMsg}
              </div>
            )}

            {/* OTP Field */}
            <div className="space-y-2">
              <div className="flex justify-between items-center">
                <label htmlFor="recovery-otp" className="block text-xs font-bold uppercase tracking-wider text-slate-500">
                  Verification OTP Code
                </label>
                <span className="text-[10px] text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded font-bold">
                  Test OTP: 123456
                </span>
              </div>
              <div className="relative">
                <span className="absolute inset-y-0 left-0 flex items-center pl-3.5 text-slate-400">
                  <Key className="w-4 h-4" />
                </span>
                <input
                  id="recovery-otp"
                  type="text"
                  maxLength={6}
                  placeholder="Enter 6-digit OTP"
                  value={otp}
                  onChange={(e) => setOtp(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-10 pr-4 py-3 text-slate-800 focus:outline-none focus:border-orange-500 focus:bg-white transition-all duration-200 font-mono tracking-widest text-center text-lg"
                />
              </div>
            </div>

            {/* New Password Field */}
            <div className="space-y-2">
              <label htmlFor="recovery-pass" className="block text-xs font-bold uppercase tracking-wider text-slate-500">
                Set New Password
              </label>
              <div className="relative">
                <span className="absolute inset-y-0 left-0 flex items-center pl-3.5 text-slate-400">
                  <Lock className="w-4 h-4" />
                </span>
                <input
                  id="recovery-pass"
                  type="password"
                  placeholder="Min 6 characters"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-10 pr-4 py-3 text-slate-800 focus:outline-none focus:border-orange-500 focus:bg-white transition-all duration-200"
                />
              </div>
            </div>

            <button
              id="reset-password-btn"
              type="submit"
              disabled={isSubmitting}
              className="w-full bg-orange-500 hover:bg-orange-600 disabled:bg-orange-400 text-white font-semibold py-3.5 rounded-xl transition duration-200 shadow-md shadow-orange-100 flex items-center justify-center gap-2 cursor-pointer"
            >
              {isSubmitting ? (
                <>
                  <Loader className="w-5 h-5 animate-spin" />
                  <span>Resetting Password...</span>
                </>
              ) : (
                <span>Reset Password & Log In</span>
              )}
            </button>
          </form>
        )}

        {/* Step 3: Success State */}
        {step === 3 && (
          <div className="p-8 text-center space-y-6">
            <div className="mx-auto w-16 h-16 rounded-full bg-emerald-50 flex items-center justify-center text-emerald-500">
              <CheckCircle className="w-10 h-10" />
            </div>
            <div className="space-y-2">
              <h3 className="text-xl font-bold text-slate-900 font-display">Password Reset Completed</h3>
              <p className="text-slate-600 text-sm leading-relaxed">
                Your credentials have been securely updated. You can now use your new password to sign in.
              </p>
            </div>
            <button
              onClick={() => navigate("/login")}
              className="w-full bg-slate-900 hover:bg-slate-800 text-white font-medium py-3 px-6 rounded-xl transition duration-200 shadow-md cursor-pointer"
            >
              Back to Login
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
