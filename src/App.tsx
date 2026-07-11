/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import Navbar from "./components/Navbar";
import Footer from "./components/Footer";
import LandingPage from "./components/LandingPage";
import EmergencyBooking from "./components/EmergencyBooking";
import DriverHeroHub from "./components/DriverHeroHub";
import HealthCentreLocator from "./components/HealthCentreLocator";
import Login from "./components/Login";
import Register from "./components/Register";
import ForgotPassword from "./components/ForgotPassword";
import PassengerHub from "./components/PassengerHub";
import DriverHub from "./components/DriverHub";
import AdminHub from "./components/AdminHub";
import ProtectedRoute from "./components/ProtectedRoute";
import FamilyLiveTracking from "./components/FamilyLiveTracking";
import EmergencySOSButton from "./components/EmergencySOSButton";
import NotificationModule from "./components/NotificationModule";
import { AuthProvider } from "./context/AuthContext";

export default function App() {
  return (
    <AuthProvider>
      <Router>
        <div id="gramgo-root-layout" className="flex flex-col min-h-screen bg-slate-50 text-slate-800 antialiased selection:bg-orange-500 selection:text-white">
          {/* Navigation bar */}
          <Navbar />

          {/* Primary Screen Area */}
          <main className="flex-grow">
            <Routes>
              {/* Public Routes */}
              <Route path="/" element={<LandingPage />} />
              <Route path="/health-centres" element={<HealthCentreLocator />} />
              <Route path="/login" element={<Login />} />
              <Route path="/register" element={<Register />} />
              <Route path="/forgot-password" element={<ForgotPassword />} />
              <Route path="/track/:rideId" element={<FamilyLiveTracking />} />

              {/* Protected Routes */}
              <Route
                path="/notifications"
                element={
                  <ProtectedRoute>
                    <div className="py-10 px-4 max-w-7xl mx-auto">
                      <NotificationModule />
                    </div>
                  </ProtectedRoute>
                }
              />
              <Route
                path="/emergency"
                element={
                  <ProtectedRoute>
                    <EmergencyBooking />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/drivers"
                element={
                  <ProtectedRoute>
                    <DriverHeroHub />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/passenger"
                element={
                  <ProtectedRoute>
                    <PassengerHub />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/driver"
                element={
                  <ProtectedRoute>
                    <DriverHub />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/admin"
                element={
                  <ProtectedRoute allowedRoles={["admin"]}>
                    <AdminHub />
                  </ProtectedRoute>
                }
              />
            </Routes>
          </main>

          {/* Footer */}
          <Footer />

          {/* Floating Emergency SOS Action Control */}
          <EmergencySOSButton />
        </div>
      </Router>
    </AuthProvider>
  );
}
