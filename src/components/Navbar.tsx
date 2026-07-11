import React from "react";
import { Link, useLocation } from "react-router-dom";
import { Truck, PhoneCall, Shield, Activity, Menu, X, LogIn, LogOut, UserPlus, Bell } from "lucide-react";
import { useAuth } from "../context/AuthContext";

export default function Navbar() {
  const location = useLocation();
  const [isOpen, setIsOpen] = React.useState(false);
  const { user, isAuthenticated, logout, token } = useAuth();
  const [unreadCount, setUnreadCount] = React.useState(0);

  const fetchUnreadCount = async () => {
    if (!isAuthenticated || !token) return;
    try {
      const res = await fetch("/api/notifications/unread-count", {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setUnreadCount(data.unreadCount);
      }
    } catch (e) {
      // quiet fail
    }
  };

  React.useEffect(() => {
    fetchUnreadCount();
    const interval = setInterval(fetchUnreadCount, 10000); // 10s poll for fast reactive simulation
    return () => clearInterval(interval);
  }, [isAuthenticated, token]);

  const navItems = [
    { name: "Home", path: "/" },
    { name: "Emergency Dispatch", path: "/emergency", highlight: true },
    ...(isAuthenticated && user && user.role === "passenger" ? [{ name: "Passenger Hub 🏡", path: "/passenger" }] : []),
    ...(isAuthenticated && user && user.role === "driver" ? [{ name: "Driver Control Hub 🚜", path: "/driver" }] : []),
    ...(isAuthenticated && user && user.role === "admin" ? [{ name: "Admin Control Center 🛡️", path: "/admin" }] : []),
    { name: "Volunteer Drivers", path: "/drivers" },
    { name: "Health Centres & Care", path: "/health-centres" },
  ];

  return (
    <nav id="gramgo-nav" className="sticky top-0 z-50 bg-white border-b border-orange-100 shadow-sm backdrop-blur-md bg-white/95">
      <div className="px-4 mx-auto max-w-7xl sm:px-6 lg:px-8">
        <div className="flex justify-between h-16">
          {/* Logo */}
          <div className="flex items-center">
            <Link to="/" className="flex items-center space-x-2">
              <div className="flex items-center justify-center w-10 h-10 bg-orange-600 rounded-xl shadow-md shadow-orange-200">
                <Truck className="w-6 h-6 text-white animate-pulse" />
              </div>
              <div>
                <span className="text-xl font-extrabold tracking-tight text-gray-900">
                  Gram<span className="text-orange-600">Go</span>
                </span>
                <span className="block text-[10px] font-medium text-emerald-600 tracking-wider uppercase leading-none">
                  Rural Lifeline • ग्रामगो
                </span>
              </div>
            </Link>
          </div>

          {/* Desktop Nav */}
          <div className="hidden md:flex md:items-center md:space-x-1 lg:space-x-4">
            {navItems.map((item) => {
              const isActive = location.pathname === item.path;
              return (
                <Link
                  key={item.path}
                  to={item.path}
                  className={`px-3 py-2 rounded-lg text-sm font-semibold transition-all duration-200 ${
                    item.highlight
                      ? "bg-red-500 hover:bg-red-600 text-white shadow-sm hover:shadow-md hover:-translate-y-0.5"
                      : isActive
                      ? "text-orange-600 bg-orange-50/50"
                      : "text-gray-600 hover:text-orange-600 hover:bg-orange-50/20"
                  }`}
                >
                  {item.name}
                </Link>
              );
            })}
            
            {/* Authentication States */}
            <div className="flex items-center space-x-2 pl-4 border-l border-gray-100">
              {isAuthenticated && (
                <Link
                  to="/notifications"
                  className="relative p-2 text-slate-500 hover:text-orange-600 hover:bg-orange-50/50 rounded-xl transition-all cursor-pointer mr-2"
                  title="Push Notifications Center"
                >
                  <Bell className="w-4.5 h-4.5" />
                  {unreadCount > 0 && (
                    <span className="absolute top-0.5 right-0.5 w-4 h-4 bg-orange-600 text-white rounded-full flex items-center justify-center text-[8px] font-black animate-pulse">
                      {unreadCount}
                    </span>
                  )}
                </Link>
              )}
              {isAuthenticated && user ? (
                <div className="flex items-center space-x-3">
                  <div className="flex flex-col text-right">
                    <span className="text-xs font-bold text-slate-800">{user.name}</span>
                    <span className="text-[10px] font-bold text-orange-600 uppercase tracking-wide leading-none capitalize">
                      {user.role}
                    </span>
                  </div>
                  <button
                    onClick={logout}
                    className="p-1.5 hover:bg-rose-50 text-slate-500 hover:text-rose-600 rounded-lg transition-colors cursor-pointer"
                    title="Log Out"
                  >
                    <LogOut className="w-4 h-4" />
                  </button>
                </div>
              ) : (
                <div className="flex items-center space-x-1">
                  <Link
                    to="/login"
                    className="flex items-center space-x-1 px-3 py-1.5 text-xs font-bold text-slate-700 hover:text-orange-600 hover:bg-slate-50 rounded-lg transition-all"
                  >
                    <LogIn className="w-3.5 h-3.5" />
                    <span>Sign In</span>
                  </Link>
                  <Link
                    to="/register"
                    className="flex items-center space-x-1 px-3 py-1.5 text-xs font-bold bg-orange-600 hover:bg-orange-700 text-white rounded-lg transition-all shadow-sm"
                  >
                    <UserPlus className="w-3.5 h-3.5" />
                    <span>Register</span>
                  </Link>
                </div>
              )}
            </div>
            
            {/* Quick Emergency Call */}
            <div className="flex items-center pl-4 ml-4 border-l border-gray-100">
              <a
                href="tel:108"
                className="flex items-center px-3.5 py-1.5 space-x-1.5 bg-emerald-50 border border-emerald-200 text-emerald-700 rounded-full text-xs font-bold hover:bg-emerald-100 transition-all cursor-pointer shadow-sm"
              >
                <PhoneCall className="w-3.5 h-3.5 animate-bounce" />
                <span>Call 108 Ambulance</span>
              </a>
            </div>
          </div>

          {/* Mobile Menu Button */}
          <div className="flex items-center md:hidden">
            <a
              href="tel:108"
              className="mr-2 flex items-center p-2 bg-emerald-50 text-emerald-700 rounded-full text-xs font-bold"
              title="Call Ambulance"
            >
              <PhoneCall className="w-4 h-4" />
            </a>
            <button
              onClick={() => setIsOpen(!isOpen)}
              className="p-2 text-gray-400 hover:text-gray-500 hover:bg-gray-100 rounded-lg"
              aria-label="Toggle menu"
            >
              {isOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile Menu */}
      {isOpen && (
        <div className="md:hidden bg-white border-t border-gray-100 animate-in fade-in slide-in-from-top-5 duration-200">
          <div className="px-2 pt-2 pb-3 space-y-1 sm:px-3">
            {navItems.map((item) => {
              const isActive = location.pathname === item.path;
              return (
                <Link
                  key={item.path}
                  to={item.path}
                  onClick={() => setIsOpen(false)}
                  className={`block px-3 py-2.5 rounded-lg text-base font-bold transition-all ${
                    item.highlight
                      ? "bg-red-500 text-white text-center shadow-md shadow-red-100"
                      : isActive
                      ? "text-orange-600 bg-orange-50"
                      : "text-gray-600 hover:text-orange-600 hover:bg-orange-50/50"
                  }`}
                >
                  {item.name}
                </Link>
              );
            })}
            
            {isAuthenticated && (
              <Link
                to="/notifications"
                onClick={() => setIsOpen(false)}
                className={`flex items-center justify-between px-3 py-2.5 rounded-lg text-base font-bold transition-all ${
                  location.pathname === "/notifications"
                    ? "text-orange-600 bg-orange-50"
                    : "text-gray-600 hover:text-orange-600 hover:bg-orange-50/50"
                }`}
              >
                <div className="flex items-center gap-2">
                  <Bell className="w-5 h-5 text-orange-600 animate-bounce" />
                  <span>FCM Push Notifications Center</span>
                </div>
                {unreadCount > 0 && (
                  <span className="bg-orange-600 text-white rounded-full px-2.5 py-0.5 text-[10px] font-black animate-pulse">
                    {unreadCount} unread
                  </span>
                )}
              </Link>
            )}
            
            {/* Mobile Auth Status */}
            <div className="pt-3 pb-3 border-t border-b border-gray-100 px-3 my-2">
              {isAuthenticated && user ? (
                <div className="flex items-center justify-between">
                  <div className="flex flex-col">
                    <span className="text-sm font-bold text-slate-800">{user.name}</span>
                    <span className="text-xs font-semibold text-orange-600 capitalize leading-none mt-1">
                      Role: {user.role} ({user.village})
                    </span>
                  </div>
                  <button
                    onClick={() => {
                      logout();
                      setIsOpen(false);
                    }}
                    className="flex items-center space-x-1 px-3 py-1.5 bg-rose-50 text-rose-600 rounded-lg text-xs font-bold transition-all cursor-pointer"
                  >
                    <LogOut className="w-3.5 h-3.5" />
                    <span>Sign Out</span>
                  </button>
                </div>
              ) : (
                <div className="grid grid-cols-2 gap-2">
                  <Link
                    to="/login"
                    onClick={() => setIsOpen(false)}
                    className="flex items-center justify-center space-x-1.5 py-2.5 border border-slate-200 text-slate-700 text-sm font-bold rounded-xl hover:bg-slate-50"
                  >
                    <LogIn className="w-4 h-4 text-slate-500" />
                    <span>Sign In</span>
                  </Link>
                  <Link
                    to="/register"
                    onClick={() => setIsOpen(false)}
                    className="flex items-center justify-center space-x-1.5 py-2.5 bg-orange-600 text-white text-sm font-bold rounded-xl hover:bg-orange-700 shadow-sm"
                  >
                    <UserPlus className="w-4 h-4" />
                    <span>Register</span>
                  </Link>
                </div>
              )}
            </div>

            <div className="pt-4 pb-2 border-t border-gray-100 px-3">
              <a
                href="tel:108"
                className="flex items-center justify-center w-full px-4 py-3 space-x-2 bg-emerald-600 text-white rounded-xl text-sm font-extrabold shadow-md shadow-emerald-100"
              >
                <PhoneCall className="w-4 h-4" />
                <span>Emergency: Dial 108 Ambulance</span>
              </a>
              <div className="mt-3 text-center">
                <span className="text-xs font-medium text-gray-400">
                  GramGo Support: 1800-309-GRAM
                </span>
              </div>
            </div>
          </div>
        </div>
      )}
    </nav>
  );
}
