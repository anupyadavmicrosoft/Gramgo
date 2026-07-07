import { motion } from "motion/react";
import { Link } from "react-router-dom";
import { 
  Truck, 
  Heart, 
  ShieldCheck, 
  MapPin, 
  Clock, 
  UserPlus, 
  PhoneCall, 
  Award, 
  Users, 
  Ambulance, 
  Sparkles,
  ArrowRight
} from "lucide-react";

export default function LandingPage() {
  // Pre-populated spotlights of local village champions
  const heroDrivers = [
    {
      name: "Ramesh Yadav",
      village: "Gauspur",
      vehicle: "Tractor Ambulance",
      trips: 42,
      savedMoms: 8,
      rating: 4.9,
      badge: "Saviour of Gauspur"
    },
    {
      name: "Amit Sharma",
      village: "Karimpur",
      vehicle: "Bolero SUV",
      trips: 29,
      savedMoms: 5,
      rating: 4.8,
      badge: "Fastest Responder"
    },
    {
      name: "Savita Devi",
      village: "Malikpur",
      vehicle: "Electric Rickshaw",
      trips: 18,
      savedMoms: 2,
      rating: 4.7,
      badge: "Community Pioneer"
    }
  ];

  return (
    <div id="landing-page" className="bg-slate-50 min-h-screen">
      {/* Hero Section */}
      <section className="relative overflow-hidden bg-gradient-to-br from-orange-50 via-white to-emerald-50/40 py-20 lg:py-28">
        <div className="absolute top-0 right-0 w-96 h-96 bg-orange-200/20 rounded-full blur-3xl -z-10" />
        <div className="absolute bottom-0 left-0 w-96 h-96 bg-emerald-100/20 rounded-full blur-3xl -z-10" />

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 lg:gap-8 items-center">
            {/* Left Column: Heading and Description */}
            <div className="lg:col-span-7 space-y-8 text-center lg:text-left">
              <div className="inline-flex items-center space-x-2 px-3 py-1 bg-orange-100/60 border border-orange-200 text-orange-800 rounded-full text-xs font-bold shadow-sm">
                <Sparkles className="w-4 h-4 text-orange-600 animate-spin" />
                <span>Panchayat-led Emergency Transport Coalition</span>
              </div>

              <h1 className="text-4xl sm:text-5xl lg:text-6xl font-black text-slate-900 tracking-tight leading-none">
                Rural India's Lifeline for <span className="text-orange-600">Emergency</span> Mobility
              </h1>

              <p className="text-lg text-slate-600 max-w-2xl mx-auto lg:mx-0 font-medium leading-relaxed">
                GramGo coordinates local village vehicle owners (Gram Sevaks) into a rapid emergency response network. When every minute matters, we bridge the gap between remote villages and Community Health Centres (CHCs).
              </p>

              {/* Action Buttons */}
              <div className="flex flex-col sm:flex-row items-center justify-center lg:justify-start gap-4">
                <Link
                  to="/emergency"
                  className="w-full sm:w-auto px-8 py-4 bg-red-500 hover:bg-red-600 text-white font-extrabold text-base rounded-2xl shadow-lg shadow-red-200 hover:shadow-red-300 transform hover:-translate-y-0.5 transition-all flex items-center justify-center space-x-2"
                >
                  <Ambulance className="w-5 h-5 animate-pulse" />
                  <span>Request Emergency Transport</span>
                  <ArrowRight className="w-4 h-4" />
                </Link>

                <Link
                  to="/drivers"
                  className="w-full sm:w-auto px-8 py-4 bg-white border-2 border-slate-200 hover:border-orange-500 text-slate-800 hover:text-orange-600 font-bold text-base rounded-2xl shadow-sm hover:shadow transition-all flex items-center justify-center space-x-2"
                >
                  <UserPlus className="w-5 h-5 text-gray-500" />
                  <span>Register Your Vehicle</span>
                </Link>
              </div>

              {/* Direct Support */}
              <div className="pt-4 flex flex-col sm:flex-row items-center justify-center lg:justify-start gap-6 text-xs text-slate-500 font-semibold">
                <span className="flex items-center space-x-1.5">
                  <ShieldCheck className="w-4 h-4 text-emerald-600" />
                  <span>Panchayat Approved & Managed</span>
                </span>
                <span className="hidden sm:inline text-slate-300">•</span>
                <span className="flex items-center space-x-1.5">
                  <Clock className="w-4 h-4 text-orange-600" />
                  <span>Avg. Match Time: Under 3 Minutes</span>
                </span>
              </div>
            </div>

            {/* Right Column: Interactive Dispatch Preview Mockup */}
            <div className="lg:col-span-5 relative">
              <div className="relative mx-auto max-w-sm rounded-3xl bg-slate-900 shadow-2xl border-4 border-slate-800 overflow-hidden p-1">
                {/* Mock Iframe UI */}
                <div className="bg-slate-950 px-4 py-3 border-b border-slate-800 flex justify-between items-center text-[10px] text-slate-400 font-mono">
                  <span>DISPATCH TERMINAL #0548</span>
                  <span className="flex items-center space-x-1.5">
                    <span className="w-2 h-2 bg-emerald-500 rounded-full animate-ping" />
                    <span className="text-emerald-400 font-bold uppercase">LIVE STATUS</span>
                  </span>
                </div>

                <div className="p-4 space-y-4 bg-slate-900/40 text-left">
                  {/* Emergency active box */}
                  <div className="p-3.5 bg-red-950/50 border border-red-900/50 rounded-xl space-y-1">
                    <span className="text-[10px] font-bold text-red-400 tracking-wider uppercase">Active Call • Village Gauspur</span>
                    <h4 className="text-white font-extrabold text-sm">Emergency Maternity Transport</h4>
                    <p className="text-slate-400 text-xs">Patient: Smt. Sunita Yadav • Destination: CHC Sherpur</p>
                  </div>

                  {/* Drivers matched timeline */}
                  <div className="space-y-3">
                    <h5 className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Active Dispatch Timeline</h5>
                    <div className="relative pl-6 space-y-4 text-xs">
                      {/* Timeline Line */}
                      <div className="absolute top-1.5 bottom-1.5 left-2.5 w-0.5 bg-slate-700" />

                      <div className="relative flex items-start space-x-2">
                        <div className="absolute -left-[19px] w-2.5 h-2.5 bg-emerald-500 rounded-full border-4 border-slate-900" />
                        <div>
                          <p className="text-slate-200 font-bold leading-none">Emergency Call Lodged</p>
                          <p className="text-slate-500 text-[10px] mt-0.5">09:42 AM - Panchayat Desk</p>
                        </div>
                      </div>

                      <div className="relative flex items-start space-x-2">
                        <div className="absolute -left-[19px] w-2.5 h-2.5 bg-emerald-500 rounded-full border-4 border-slate-900" />
                        <div>
                          <p className="text-slate-200 font-bold leading-none">Driver Ramesh Assigned</p>
                          <p className="text-slate-400 text-[10px] mt-0.5">Tractor Ambulance • UP-61-AB-1234</p>
                        </div>
                      </div>

                      <div className="relative flex items-start space-x-2">
                        <div className="absolute -left-[19px] w-2.5 h-2.5 bg-orange-500 rounded-full border-4 border-slate-900 animate-pulse" />
                        <div>
                          <p className="text-orange-400 font-extrabold leading-none">Driver En-Route</p>
                          <p className="text-slate-400 text-[10px] mt-0.5">Distance: 1.2 Km • ETA: 4 mins</p>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Trigger view button */}
                  <Link
                    to="/emergency"
                    className="block w-full py-2.5 bg-slate-800 hover:bg-slate-700 border border-slate-700 text-center text-slate-200 hover:text-white font-extrabold text-xs rounded-xl transition"
                  >
                    View Interactive Map Simulator
                  </Link>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Impact Metric Counters */}
      <section className="bg-white py-12 border-y border-slate-100">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8 text-center">
            <div className="space-y-1">
              <span className="block text-4xl sm:text-5xl font-black text-slate-950">1,240+</span>
              <span className="block text-xs font-extrabold text-slate-500 uppercase tracking-widest">Village Rides Matched</span>
            </div>
            <div className="space-y-1">
              <span className="block text-4xl sm:text-5xl font-black text-orange-600">320+</span>
              <span className="block text-xs font-extrabold text-slate-500 uppercase tracking-widest">Active Gram Sevaks</span>
            </div>
            <div className="space-y-1">
              <span className="block text-4xl sm:text-5xl font-black text-emerald-600">100%</span>
              <span className="block text-xs font-extrabold text-slate-500 uppercase tracking-widest">Panchayat Endorsed</span>
            </div>
            <div className="space-y-1">
              <span className="block text-4xl sm:text-5xl font-black text-slate-950">26</span>
              <span className="block text-xs font-extrabold text-slate-500 uppercase tracking-widest">Connected PHCs/CHCs</span>
            </div>
          </div>
        </div>
      </section>

      {/* GramGo Core Pillars */}
      <section className="py-16 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center max-w-2xl mx-auto space-y-2 mb-12">
          <h2 className="text-3xl font-black text-slate-900">How GramGo Works</h2>
          <p className="text-sm font-medium text-slate-500">
            A cooperative model solving the vital rural transport deficit across India.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {/* Pillar 1 */}
          <div className="bg-white p-8 rounded-2xl border border-slate-100 shadow-sm hover:shadow-md transition duration-200 space-y-4">
            <div className="w-12 h-12 bg-orange-100 text-orange-600 rounded-xl flex items-center justify-center font-bold text-xl shadow-inner">
              1
            </div>
            <h3 className="text-lg font-bold text-slate-900">Panchayat Sourced Vehicles</h3>
            <p className="text-sm text-slate-500 leading-relaxed">
              We leverage existing assets in the community. Local farmers, auto drivers, and shopkeepers pledge their transport for immediate medical emergencies.
            </p>
          </div>

          {/* Pillar 2 */}
          <div className="bg-white p-8 rounded-2xl border border-slate-100 shadow-sm hover:shadow-md transition duration-200 space-y-4">
            <div className="w-12 h-12 bg-red-100 text-red-600 rounded-xl flex items-center justify-center font-bold text-xl shadow-inner">
              2
            </div>
            <h3 className="text-lg font-bold text-slate-900">Dynamic Emergency Dispatch</h3>
            <p className="text-sm text-slate-500 leading-relaxed">
              Upon placing a call, our system coordinates with active drivers within a 5km radius, prioritizing emergency transport like maternity and road accidents.
            </p>
          </div>

          {/* Pillar 3 */}
          <div className="bg-white p-8 rounded-2xl border border-slate-100 shadow-sm hover:shadow-md transition duration-200 space-y-4">
            <div className="w-12 h-12 bg-emerald-100 text-emerald-600 rounded-xl flex items-center justify-center font-bold text-xl shadow-inner">
              3
            </div>
            <h3 className="text-lg font-bold text-slate-900">Hospital Admission Linkage</h3>
            <p className="text-sm text-slate-500 leading-relaxed">
              The matched driver coordinates directly with the target Community Health Centre (CHC), ensuring healthcare workers are waiting at the outpatient gate.
            </p>
          </div>
        </div>
      </section>

      {/* Spotlighting Village Champions */}
      <section className="bg-emerald-800 text-white py-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col md:flex-row md:items-end justify-between mb-12">
            <div className="space-y-2">
              <span className="text-xs font-extrabold text-emerald-300 uppercase tracking-widest block">Village Spotlights • हमारे हीरोज</span>
              <h2 className="text-3xl font-black">Active Volunteer Gram Sevaks</h2>
              <p className="text-emerald-100 text-sm max-w-xl">
                Meet the local vehicle owners who have answered the call of duty, ensuring healthcare is within reach.
              </p>
            </div>
            <Link
              to="/drivers"
              className="mt-4 md:mt-0 inline-flex items-center space-x-1 text-sm font-extrabold text-emerald-200 hover:text-white transition"
            >
              <span>View Driver Directory</span>
              <ArrowRight className="w-4 h-4" />
            </Link>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {heroDrivers.map((driver, index) => (
              <div 
                key={index} 
                className="bg-emerald-900/60 border border-emerald-700/50 p-6 rounded-2xl space-y-4 hover:bg-emerald-900 transition"
              >
                <div className="flex justify-between items-start">
                  <span className="px-3 py-1 bg-emerald-950/80 text-emerald-300 rounded-full text-[10px] font-extrabold uppercase tracking-wide">
                    {driver.badge}
                  </span>
                  <span className="flex items-center space-x-1 text-amber-400 font-bold text-sm">
                    <Award className="w-4 h-4" />
                    <span>{driver.rating} ★</span>
                  </span>
                </div>

                <div>
                  <h4 className="text-lg font-extrabold text-white">{driver.name}</h4>
                  <p className="text-xs text-emerald-200">Village: {driver.village}, Ghazipur</p>
                </div>

                <div className="grid grid-cols-2 gap-4 pt-3 border-t border-emerald-800 text-center">
                  <div>
                    <span className="block text-2xl font-black text-white">{driver.trips}</span>
                    <span className="block text-[10px] font-bold text-emerald-300 uppercase tracking-widest">Trips Made</span>
                  </div>
                  <div>
                    <span className="block text-2xl font-black text-orange-400">{driver.savedMoms}</span>
                    <span className="block text-[10px] font-bold text-emerald-300 uppercase tracking-widest">Maternity Trips</span>
                  </div>
                </div>

                <div className="text-xs font-semibold text-emerald-200 bg-emerald-950/40 p-2.5 rounded-lg text-center">
                  Vehicle: {driver.vehicle}
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Final Call to Action */}
      <section className="py-20 text-center max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="bg-white border border-slate-100 p-10 sm:p-16 rounded-3xl shadow-xl space-y-8 relative overflow-hidden">
          {/* Subtle background visual */}
          <div className="absolute top-0 right-0 w-32 h-32 bg-orange-100/30 rounded-full blur-2xl" />
          <div className="absolute bottom-0 left-0 w-32 h-32 bg-emerald-100/30 rounded-full blur-2xl" />

          <h2 className="text-3xl sm:text-4xl font-extrabold text-slate-900 tracking-tight">
            Pledge Your Support. Save Rural Lives.
          </h2>
          
          <p className="text-sm text-slate-500 leading-relaxed max-w-xl mx-auto">
            Are you a local vehicle owner? Or are you a Gram Panchayat officer looking to secure emergency healthcare for your block? Connect with the GramGo coalition today.
          </p>

          <div className="flex flex-col sm:flex-row justify-center gap-4 pt-4">
            <Link
              to="/emergency"
              className="px-8 py-3.5 bg-red-500 hover:bg-red-600 text-white font-extrabold text-sm rounded-xl shadow-lg shadow-red-100 transition"
            >
              Simulate Emergency Request
            </Link>
            <Link
              to="/drivers"
              className="px-8 py-3.5 bg-slate-900 hover:bg-slate-850 text-white font-extrabold text-sm rounded-xl transition"
            >
              Add Your Vehicle
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}
