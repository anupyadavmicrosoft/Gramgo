import { Link } from "react-router-dom";
import { Truck, Heart, ShieldAlert, Award, ArrowUpRight } from "lucide-react";

export default function Footer() {
  return (
    <footer id="gramgo-footer" className="bg-slate-900 text-slate-300 border-t-4 border-orange-500">
      {/* Upper Footer / Support Highlights */}
      <div className="px-4 py-12 mx-auto max-w-7xl sm:px-6 lg:px-8 border-b border-slate-800">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          <div className="flex items-start space-x-3">
            <div className="p-3 bg-slate-800 rounded-lg text-orange-400">
              <ShieldAlert className="w-6 h-6" />
            </div>
            <div>
              <h4 className="text-white font-bold text-base">Rural Safe Transport Guarantee</h4>
              <p className="mt-1 text-sm text-slate-400 leading-relaxed">
                Every GramGo vehicle is verified by local Panchayats. Drivers are trained in first-aid response and immediate hospital coordination.
              </p>
            </div>
          </div>
          
          <div className="flex items-start space-x-3">
            <div className="p-3 bg-slate-800 rounded-lg text-emerald-400">
              <Award className="w-6 h-6" />
            </div>
            <div>
              <h4 className="text-white font-bold text-base">Local Gram Sevak Pledges</h4>
              <p className="mt-1 text-sm text-slate-400 leading-relaxed">
                Our network consists of volunteer drivers who pledge their personal autos, SUVs, and tractor-trolleys to serve in critical emergencies.
              </p>
            </div>
          </div>

          <div className="flex items-start space-x-3">
            <div className="p-3 bg-slate-800 rounded-lg text-sky-400">
              <Heart className="w-6 h-6 animate-pulse" />
            </div>
            <div>
              <h4 className="text-white font-bold text-base">Digital India & Rural Empowerment</h4>
              <p className="mt-1 text-sm text-slate-400 leading-relaxed">
                By bridging modern technology with local community leadership, GramGo brings reliable life-saving medical transport to the last mile.
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Main Footer Links */}
      <div className="px-4 py-12 mx-auto max-w-7xl sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
          {/* Logo & Summary */}
          <div className="space-y-4">
            <div className="flex items-center space-x-2">
              <div className="flex items-center justify-center w-8 h-8 bg-orange-600 rounded-lg">
                <Truck className="w-5 h-5 text-white" />
              </div>
              <span className="text-lg font-black text-white tracking-wider">
                Gram<span className="text-orange-500">Go</span>
              </span>
            </div>
            <p className="text-sm text-slate-400 leading-relaxed">
              GramGo is dedicated to ensuring that no medical emergency in rural India goes unassisted due to lack of a vehicle. We are rural emergency transport, reimagined.
            </p>
          </div>

          {/* Quick Nav */}
          <div>
            <h4 className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-4">Platform Pages</h4>
            <ul className="space-y-2 text-sm">
              <li>
                <Link to="/" className="hover:text-orange-400 transition">Home & Impact Dashboard</Link>
              </li>
              <li>
                <Link to="/emergency" className="hover:text-orange-400 transition font-semibold text-orange-400">Book Emergency Transport</Link>
              </li>
              <li>
                <Link to="/drivers" className="hover:text-orange-400 transition">Register as a Volunteer Driver</Link>
              </li>
              <li>
                <Link to="/health-centres" className="hover:text-orange-400 transition">CHC Locator & Medical Guides</Link>
              </li>
            </ul>
          </div>

          {/* District Coverage */}
          <div>
            <h4 className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-4">Initial Coverage Areas</h4>
            <ul className="space-y-2 text-sm text-slate-400">
              <li className="flex items-center space-x-1">
                <span>Ghazipur (Uttar Pradesh)</span>
                <span className="px-1.5 py-0.5 text-[10px] font-bold bg-emerald-950 text-emerald-400 rounded">Active</span>
              </li>
              <li className="flex items-center space-x-1">
                <span>Alwar (Rajasthan)</span>
                <span className="px-1.5 py-0.5 text-[10px] font-bold bg-amber-950 text-amber-400 rounded">Upcoming</span>
              </li>
              <li className="flex items-center space-x-1">
                <span>Saran (Bihar)</span>
                <span className="px-1.5 py-0.5 text-[10px] font-bold bg-amber-950 text-amber-400 rounded">Upcoming</span>
              </li>
            </ul>
          </div>

          {/* Urgent Direct Helpline */}
          <div className="p-6 bg-slate-800/50 border border-slate-700/50 rounded-2xl">
            <h4 className="text-xs font-bold text-slate-300 uppercase tracking-wider mb-2">Panchayat Helpline Desk</h4>
            <p className="text-2xl font-extrabold text-white tracking-tight">1800-309-GRAM</p>
            <p className="mt-1 text-xs text-slate-400 leading-relaxed">
              Toll-free 24/7 coordinator assistance for elderly without smartphones.
            </p>
            <a
              href="tel:108"
              className="mt-4 flex items-center justify-between px-4 py-2 bg-red-600 hover:bg-red-700 text-white text-xs font-extrabold rounded-xl transition shadow-md shadow-red-900/30"
            >
              <span>National Ambulance</span>
              <span className="flex items-center space-x-0.5 font-bold">
                <span>Dial 108</span>
                <ArrowUpRight className="w-3.5 h-3.5" />
              </span>
            </a>
          </div>
        </div>

        <div className="mt-12 pt-8 border-t border-slate-800 flex flex-col sm:flex-row items-center justify-between text-xs text-slate-500">
          <p>© 2026 GramGo India Foundation. Serving Rural Health Security.</p>
          <p className="mt-4 sm:mt-0">Developed with ❤️ for Indian Gram Panchayats.</p>
        </div>
      </div>
    </footer>
  );
}
