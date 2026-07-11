import React, { useState, useEffect, useRef } from "react";
import { Link, useNavigate, useLocation } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { Phone, Lock, Eye, EyeOff, Loader, Shield, ArrowRight, Smartphone, Key } from "lucide-react";

export default function Login() {
  const { login, saveAuthSession, error, clearError } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  // Tab State: "password" | "otp"
  const [loginMethod, setLoginMethod] = useState<"password" | "otp">("password");

  // Common State
  const [phoneOrEmail, setPhoneOrEmail] = useState("");
  const [formError, setFormError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Password Login State
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);

  // OTP Login State
  const [otpPhone, setOtpPhone] = useState("");
  const [otpSent, setOtpSent] = useState(false);
  const [otpCode, setOtpCode] = useState("");
  const [simulatedOtp, setSimulatedOtp] = useState<string | null>(null);
  const [resendCountdown, setResendCountdown] = useState(0);

  // Timer Ref
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  // Clear timer on unmount
  useEffect(() => {
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, []);

  // Countdown handler
  useEffect(() => {
    if (resendCountdown > 0) {
      timerRef.current = setInterval(() => {
        setResendCountdown((prev) => {
          if (prev <= 1) {
            if (timerRef.current) clearInterval(timerRef.current);
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    }
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [resendCountdown]);

  // Determine redirect path from navigation state
  const from = location.state?.from?.pathname || "/";

  // Standard Password Login Submit
  const handlePasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);
    clearError();

    if (!phoneOrEmail.trim()) {
      setFormError("Please enter your registered mobile number or email.");
      return;
    }
    if (!password) {
      setFormError("Please enter your password.");
      return;
    }

    setIsSubmitting(true);
    try {
      const loggedInUser = await login(phoneOrEmail.trim(), password);
      const redirectPath = from === "/"
        ? (loggedInUser?.role === "driver" ? "/drivers" : loggedInUser?.role === "passenger" ? "/passenger" : "/")
        : from;
      navigate(redirectPath, { replace: true });
    } catch (err: any) {
      setFormError(err.message || "Failed to log in. Please check your credentials.");
    } finally {
      setIsSubmitting(false);
    }
  };

  // Send WhatsApp OTP
  const handleSendOtp = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    setFormError(null);
    clearError();

    if (!otpPhone.trim()) {
      setFormError("Please enter your registered mobile number.");
      return;
    }

    setIsSubmitting(true);
    try {
      const res = await fetch("/api/auth/otp/send", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phone: otpPhone.trim(), type: "login" })
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Failed to trigger OTP. Please verify your phone number.");
      }

      setOtpSent(true);
      setResendCountdown(30); // 30 seconds wait for resend
      if (data.otpSimulated) {
        setSimulatedOtp(data.otpSimulated);
      }
    } catch (err: any) {
      setFormError(err.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  // Verify WhatsApp OTP & Log In
  const handleVerifyOtpSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);
    clearError();

    if (!otpCode.trim()) {
      setFormError("Please enter the 6-digit verification code.");
      return;
    }

    setIsSubmitting(true);
    try {
      const res = await fetch("/api/auth/otp/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          phone: otpPhone.trim(),
          type: "login",
          code: otpCode.trim()
        })
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Verification failed. Please check the OTP and try again.");
      }

      // Login Successful! Save token & user
      if (data.token && data.user) {
        saveAuthSession(data.token, data.user);
        const redirectPath = from === "/"
          ? (data.user.role === "driver" ? "/drivers" : data.user.role === "passenger" ? "/passenger" : "/")
          : from;
        navigate(redirectPath, { replace: true });
      } else {
        throw new Error("Invalid response payload from server.");
      }
    } catch (err: any) {
      setFormError(err.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div id="login-container" className="max-w-md mx-auto my-12 px-4 animate-fade-in">
      <div className="bg-white rounded-2xl shadow-xl border border-slate-100 overflow-hidden">
        {/* Banner header */}
        <div className="bg-gradient-to-r from-slate-900 to-slate-850 p-8 text-center text-white relative">
          <div className="absolute top-3 right-3 bg-orange-500 text-white text-[10px] uppercase tracking-wider font-bold py-1 px-2 rounded-full flex items-center gap-1 shadow-sm">
            <Shield className="w-2.5 h-2.5" /> Secure
          </div>
          <h2 className="text-3xl font-bold font-display tracking-tight text-white mb-2">Welcome Back</h2>
          <p className="text-slate-300 text-sm">Sign in to book a vehicle or access your driver dashboard</p>
        </div>

        {/* Tab Toggle */}
        <div className="flex border-b border-slate-100 bg-slate-50">
          <button
            type="button"
            onClick={() => {
              setLoginMethod("password");
              setFormError(null);
              clearError();
            }}
            className={`flex-1 py-4 text-center font-bold text-sm border-b-2 flex justify-center items-center gap-2 transition-all duration-200 cursor-pointer ${
              loginMethod === "password"
                ? "border-orange-500 text-orange-600 bg-white"
                : "border-transparent text-slate-500 hover:text-slate-800"
            }`}
          >
            <Lock className="w-4 h-4" />
            Password
          </button>
          <button
            type="button"
            onClick={() => {
              setLoginMethod("otp");
              setFormError(null);
              clearError();
            }}
            className={`flex-1 py-4 text-center font-bold text-sm border-b-2 flex justify-center items-center gap-2 transition-all duration-200 cursor-pointer ${
              loginMethod === "otp"
                ? "border-orange-500 text-orange-600 bg-white"
                : "border-transparent text-slate-500 hover:text-slate-800"
            }`}
          >
            <Smartphone className="w-4 h-4" />
            WhatsApp OTP
          </button>
        </div>

        {/* Form area */}
        <div className="p-8">
          {/* External server errors or form validation errors */}
          {(formError || error) && (
            <div className="mb-6 p-4 bg-rose-50 border-l-4 border-rose-500 rounded-r-xl text-rose-700 text-sm font-medium animate-pulse">
              {formError || error}
            </div>
          )}

          {loginMethod === "password" ? (
            /* Password Login Form */
            <form onSubmit={handlePasswordSubmit} className="space-y-6">
              {/* Phone or Email Input */}
              <div className="space-y-2">
                <label htmlFor="login-identity" className="block text-xs font-bold uppercase tracking-wider text-slate-500">
                  Phone Number or Email
                </label>
                <div className="relative">
                  <span className="absolute inset-y-0 left-0 flex items-center pl-3.5 text-slate-400">
                    <Phone className="w-4 h-4" />
                  </span>
                  <input
                    id="login-identity"
                    type="text"
                    placeholder="+91 99999 99999 or email"
                    value={phoneOrEmail}
                    onChange={(e) => {
                      setPhoneOrEmail(e.target.value);
                      setFormError(null);
                      clearError();
                    }}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-10 pr-4 py-3 text-slate-800 placeholder-slate-400 focus:outline-none focus:border-orange-500 focus:bg-white transition-all duration-200 font-sans"
                  />
                </div>
              </div>

              {/* Password Input */}
              <div className="space-y-2">
                <div className="flex justify-between items-center">
                  <label htmlFor="login-password" className="block text-xs font-bold uppercase tracking-wider text-slate-500">
                    Password
                  </label>
                  <Link
                    to="/forgot-password"
                    className="text-xs font-semibold text-orange-600 hover:text-orange-500 hover:underline"
                  >
                    Forgot Password?
                  </Link>
                </div>
                <div className="relative">
                  <span className="absolute inset-y-0 left-0 flex items-center pl-3.5 text-slate-400">
                    <Lock className="w-4 h-4" />
                  </span>
                  <input
                    id="login-password"
                    type={showPassword ? "text" : "password"}
                    placeholder="••••••••"
                    value={password}
                    onChange={(e) => {
                      setPassword(e.target.value);
                      setFormError(null);
                      clearError();
                    }}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-10 pr-10 py-3 text-slate-800 placeholder-slate-400 focus:outline-none focus:border-orange-500 focus:bg-white transition-all duration-200 font-sans"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute inset-y-0 right-0 flex items-center pr-3 text-slate-400 hover:text-slate-600 focus:outline-none"
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              {/* Submit Button */}
              <button
                id="login-submit-btn"
                type="submit"
                disabled={isSubmitting}
                className="w-full bg-orange-500 hover:bg-orange-600 disabled:bg-orange-400 text-white font-semibold py-3.5 rounded-xl transition duration-200 shadow-md shadow-orange-100 flex items-center justify-center gap-2 cursor-pointer"
              >
                {isSubmitting ? (
                  <>
                    <Loader className="w-5 h-5 animate-spin" />
                    <span>Authenticating...</span>
                  </>
                ) : (
                  <>
                    <span>Sign In</span>
                    <ArrowRight className="w-4 h-4" />
                  </>
                )}
              </button>
            </form>
          ) : (
            /* WhatsApp OTP Login Form */
            <div className="space-y-6">
              {!otpSent ? (
                /* Phase 1: Enter Phone to Request OTP */
                <form onSubmit={handleSendOtp} className="space-y-6">
                  <div className="space-y-2">
                    <label htmlFor="login-otp-phone" className="block text-xs font-bold uppercase tracking-wider text-slate-500">
                      WhatsApp Mobile Number
                    </label>
                    <div className="relative">
                      <span className="absolute inset-y-0 left-0 flex items-center pl-3.5 text-slate-400">
                        <Phone className="w-4 h-4" />
                      </span>
                      <input
                        id="login-otp-phone"
                        type="tel"
                        placeholder="+91 99999 99999"
                        value={otpPhone}
                        onChange={(e) => {
                          setOtpPhone(e.target.value);
                          setFormError(null);
                        }}
                        className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-10 pr-4 py-3 text-slate-800 placeholder-slate-400 focus:outline-none focus:border-orange-500 focus:bg-white transition-all duration-200 font-sans"
                      />
                    </div>
                    <p className="text-xs text-slate-400 mt-1">
                      We will securely send a 6-digit verification code to your WhatsApp account.
                    </p>
                  </div>

                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="w-full bg-orange-500 hover:bg-orange-600 disabled:bg-orange-400 text-white font-semibold py-3.5 rounded-xl transition duration-200 shadow-md shadow-orange-100 flex items-center justify-center gap-2 cursor-pointer"
                  >
                    {isSubmitting ? (
                      <>
                        <Loader className="w-5 h-5 animate-spin" />
                        <span>Sending OTP...</span>
                      </>
                    ) : (
                      <>
                        <span>Send OTP via WhatsApp</span>
                        <ArrowRight className="w-4 h-4" />
                      </>
                    )}
                  </button>
                </form>
              ) : (
                /* Phase 2: Enter Verification Code */
                <form onSubmit={handleVerifyOtpSubmit} className="space-y-6">
                  {simulatedOtp && (
                    <div className="p-3.5 bg-orange-50 border border-orange-100 rounded-xl flex items-center gap-3">
                      <Key className="w-5 h-5 text-orange-500 shrink-0" />
                      <div className="text-xs text-orange-800">
                        <span className="font-bold">WhatsApp simulation active:</span> Your OTP verification code is <code className="bg-white px-2 py-0.5 rounded font-mono font-bold text-sm tracking-wider border border-orange-200">{simulatedOtp}</code>. You can also use universal debug code <code className="bg-white px-1.5 py-0.5 rounded font-mono font-bold border border-orange-200">123456</code>.
                      </div>
                    </div>
                  )}

                  <div className="space-y-2">
                    <div className="flex justify-between items-center">
                      <label htmlFor="login-otp-code" className="block text-xs font-bold uppercase tracking-wider text-slate-500">
                        Enter 6-Digit Code
                      </label>
                      <button
                        type="button"
                        onClick={() => {
                          setOtpSent(false);
                          setSimulatedOtp(null);
                          setOtpCode("");
                        }}
                        className="text-xs font-bold text-orange-600 hover:text-orange-500 hover:underline"
                      >
                        Change Number
                      </button>
                    </div>
                    <div className="relative">
                      <span className="absolute inset-y-0 left-0 flex items-center pl-3.5 text-slate-400">
                        <Key className="w-4 h-4" />
                      </span>
                      <input
                        id="login-otp-code"
                        type="text"
                        maxLength={6}
                        placeholder="••••••"
                        value={otpCode}
                        onChange={(e) => {
                          setOtpCode(e.target.value.replace(/\D/g, ""));
                          setFormError(null);
                        }}
                        className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-10 pr-4 py-3 text-center tracking-[0.75em] text-lg font-bold text-slate-800 focus:outline-none focus:border-orange-500 focus:bg-white transition-all duration-200 font-mono"
                      />
                    </div>
                  </div>

                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="w-full bg-orange-500 hover:bg-orange-600 disabled:bg-orange-400 text-white font-semibold py-3.5 rounded-xl transition duration-200 shadow-md shadow-orange-100 flex items-center justify-center gap-2 cursor-pointer"
                  >
                    {isSubmitting ? (
                      <>
                        <Loader className="w-5 h-5 animate-spin" />
                        <span>Verifying & Logging In...</span>
                      </>
                    ) : (
                      <>
                        <span>Verify & Sign In</span>
                        <ArrowRight className="w-4 h-4" />
                      </>
                    )}
                  </button>

                  {/* Resend Logic */}
                  <div className="text-center text-xs">
                    {resendCountdown > 0 ? (
                      <span className="text-slate-400">
                        Resend verification code in <strong className="text-slate-600">{resendCountdown}s</strong>
                      </span>
                    ) : (
                      <button
                        type="button"
                        onClick={handleSendOtp}
                        disabled={isSubmitting}
                        className="font-bold text-orange-600 hover:text-orange-500 hover:underline focus:outline-none"
                      >
                        Resend Code via WhatsApp
                      </button>
                    )}
                  </div>
                </form>
              )}
            </div>
          )}
        </div>

        {/* Footer info links */}
        <div className="px-8 py-5 bg-slate-50 border-t border-slate-100 text-center text-sm text-slate-600 flex justify-between">
          <span>New to GramGo?</span>
          <Link to="/register" className="font-bold text-orange-600 hover:text-orange-500 hover:underline">
            Create Account
          </Link>
        </div>
      </div>

      {/* Demo helper */}
      <div className="mt-6 bg-slate-100 rounded-xl p-4 border border-slate-200 text-xs text-slate-600 leading-relaxed">
        <p className="font-bold text-slate-800 mb-1">💡 Demo Accounts Available:</p>
        <ul className="list-disc pl-4 space-y-1">
          <li><strong>Admin:</strong> Phone <code className="bg-slate-200 px-1 py-0.5 rounded">+91 99999 99999</code> / Password <code className="bg-slate-200 px-1 py-0.5 rounded">admin123</code></li>
          <li><strong>Driver:</strong> Phone <code className="bg-slate-200 px-1 py-0.5 rounded">+91 98765 43210</code> / Password <code className="bg-slate-200 px-1 py-0.5 rounded">ramesh123</code></li>
        </ul>
      </div>
    </div>
  );
}
