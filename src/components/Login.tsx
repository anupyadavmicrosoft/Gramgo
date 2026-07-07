import React, { useState } from "react";
import { Link, useNavigate, useLocation } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { Phone, Lock, Eye, EyeOff, Loader, Shield, ArrowRight } from "lucide-react";

export default function Login() {
  const { login, error, clearError } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [phoneOrEmail, setPhoneOrEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  // Determine redirect path from navigation state
  const from = location.state?.from?.pathname || "/";

  const handleLoginSubmit = async (e: React.FormEvent) => {
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
      // Success: redirect user to their destination
      const redirectPath = from === "/"
        ? (loggedInUser?.role === "driver" ? "/drivers" : loggedInUser?.role === "passenger" ? "/passenger" : "/")
        : from;
      navigate(redirectPath, { replace: true });
    } catch (err: any) {
      // Error is caught and stored in auth context, or we can handle it here
      setFormError(err.message || "Failed to log in. Please check your credentials.");
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

        {/* Form area */}
        <form onSubmit={handleLoginSubmit} className="p-8 space-y-6">
          {/* External server errors or form validation errors */}
          {(formError || error) && (
            <div className="p-4 bg-rose-50 border-l-4 border-rose-500 rounded-r-xl text-rose-700 text-sm font-medium animate-pulse">
              {formError || error}
            </div>
          )}

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
