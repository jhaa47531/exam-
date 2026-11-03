import React from 'react';
import { Link } from 'react-router-dom';
import { ShieldCheck, GraduationCap, ArrowRight, UserPlus } from 'lucide-react';
import { motion } from 'motion/react';

export const PortalSelect: React.FC = () => {
  return (
    <div className="bg-white border border-slate-200/90 rounded-3xl p-6 sm:p-8 shadow-xl shadow-slate-200/40">
      <div className="mb-8 text-center">
        <h2 className="text-xl sm:text-2xl font-extrabold text-slate-900 tracking-tight">
          Select Examination Portal
        </h2>
        <p className="text-xs sm:text-sm text-slate-500 mt-1.5 max-w-sm mx-auto">
          Please select your designated role to enter the secure proctoring portal or student station.
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {/* Admin Portal Selection */}
        <Link
          to="/auth/admin-login"
          className="group p-6 rounded-2xl bg-gradient-to-b from-slate-50 to-white border border-slate-200 hover:border-blue-500 hover:shadow-lg hover:shadow-blue-500/10 transition-all duration-200 flex flex-col justify-between text-left cursor-pointer"
        >
          <div>
            <div className="w-12 h-12 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center mb-4 group-hover:bg-blue-600 group-hover:text-white transition-colors duration-200 shadow-xs">
              <ShieldCheck className="w-6 h-6" />
            </div>
            <div className="inline-block px-2.5 py-0.5 rounded-md bg-blue-100/70 text-blue-800 text-[10px] font-bold uppercase tracking-wider mb-2">
              Proctor & Faculty
            </div>
            <h3 className="text-lg font-bold text-slate-900 mb-1.5 group-hover:text-blue-600 transition-colors">
              Admin Login
            </h3>
            <p className="text-xs text-slate-500 leading-relaxed">
              Examination creation, proctoring station, candidate verification, and result publishing.
            </p>
          </div>

          <div className="mt-6 pt-4 border-t border-slate-100 flex items-center justify-between text-xs font-bold text-blue-600 group-hover:translate-x-0.5 transition-transform">
            <span>Enter Admin Portal</span>
            <ArrowRight className="w-4 h-4" />
          </div>
        </Link>

        {/* Student Portal Selection */}
        <Link
          to="/auth/student-login"
          className="group p-6 rounded-2xl bg-gradient-to-b from-slate-50 to-white border border-slate-200 hover:border-emerald-500 hover:shadow-lg hover:shadow-emerald-500/10 transition-all duration-200 flex flex-col justify-between text-left cursor-pointer"
        >
          <div>
            <div className="w-12 h-12 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center mb-4 group-hover:bg-emerald-600 group-hover:text-white transition-colors duration-200 shadow-xs">
              <GraduationCap className="w-6 h-6" />
            </div>
            <div className="inline-block px-2.5 py-0.5 rounded-md bg-emerald-100/70 text-emerald-800 text-[10px] font-bold uppercase tracking-wider mb-2">
              Candidates & Examinees
            </div>
            <h3 className="text-lg font-bold text-slate-900 mb-1.5 group-hover:text-emerald-600 transition-colors">
              Student Login
            </h3>
            <p className="text-xs text-slate-500 leading-relaxed">
              Take scheduled examinations, monitor timers, view verification review, and download scorecards.
            </p>
          </div>

          <div className="mt-6 pt-4 border-t border-slate-100 flex items-center justify-between text-xs font-bold text-emerald-600 group-hover:translate-x-0.5 transition-transform">
            <span>Enter Student Portal</span>
            <ArrowRight className="w-4 h-4" />
          </div>
        </Link>
      </div>

      <div className="mt-8 pt-6 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
        <span>Enrolling for the first time?</span>
        <Link
          to="/auth/register"
          className="font-bold text-blue-600 hover:text-blue-700 flex items-center gap-1.5 underline underline-offset-2"
        >
          <UserPlus className="w-3.5 h-3.5" />
          <span>Register with College ID</span>
        </Link>
      </div>
    </div>
  );
};
