import { ReactNode } from "react";
import { Navigate, useLocation } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { UserRole } from "../types";
import { ShieldAlert, Loader } from "lucide-react";

interface ProtectedRouteProps {
  children: ReactNode;
  allowedRoles?: UserRole[];
}

export default function ProtectedRoute({ children, allowedRoles }: ProtectedRouteProps) {
  const { user, isAuthenticated, loading } = useAuth();
  const location = useLocation();

  if (loading) {
    return (
      <div id="auth-loading-state" className="flex flex-col items-center justify-center min-h-[60vh] text-slate-600 gap-3">
        <Loader className="w-10 h-10 animate-spin text-orange-500" />
        <p className="font-display font-medium text-slate-700">Verifying session details...</p>
      </div>
    );
  }

  if (!isAuthenticated) {
    // Save current path to redirect back after login
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  if (allowedRoles && user && !allowedRoles.includes(user.role)) {
    return (
      <div id="unauthorized-state" className="max-w-md mx-auto my-12 bg-white rounded-2xl shadow-xl border border-rose-100 p-8 text-center animate-fade-in">
        <div className="mx-auto w-16 h-16 rounded-full bg-rose-50 flex items-center justify-center mb-4 text-rose-500">
          <ShieldAlert className="w-8 h-8" />
        </div>
        <h2 className="text-2xl font-bold text-slate-900 mb-2">Access Denied</h2>
        <p className="text-slate-600 mb-6 leading-relaxed">
          Your account role (<span className="capitalize font-semibold text-slate-800">{user.role}</span>) does not have authorization to view this resource. 
          Please contact GramGo support if you believe this is an error.
        </p>
        <button
          onClick={() => window.history.back()}
          className="w-full bg-slate-900 text-white font-medium py-3 px-6 rounded-xl hover:bg-slate-800 transition duration-200 shadow-md cursor-pointer"
        >
          Go Back
        </button>
      </div>
    );
  }

  return <>{children}</>;
}
