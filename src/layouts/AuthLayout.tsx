import React from 'react';
import { Outlet } from 'react-router-dom';
import { ShieldCheck, GraduationCap, Lock, Award } from 'lucide-react';
import { DemoBar } from '../components/DemoBar';
import { motion } from 'motion/react';

export const AuthLayout: React.FC = () => {
  return (
    <div className="min-h-screen bg-[#F8FAFC] text-slate-900 flex flex-col font-sans selection:bg-blue-600 selection:text-white relative">
      <DemoBar />

      {/* Ambient background glows */}
      <div className="absolute top-12 left-1/4 w-96 h-96 bg-blue-100/60 rounded-full blur-3xl pointer-events-none -z-10" />
      <div className="absolute bottom-12 right-1/4 w-96 h-96 bg-indigo-100/50 rounded-full blur-3xl pointer-events-none -z-10" />

      {/* Main Container */}
      <div className="flex-1 flex flex-col justify-center items-center p-4 sm:p-6 lg:p-8">
        {/* Top Branding */}
        <motion.div
          initial={{ opacity: 0, y: -12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.35, ease: 'easeOut' }}
          className="mb-6 flex items-center gap-3"
        >
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-blue-600 to-indigo-600 flex items-center justify-center shadow-lg shadow-blue-500/20 text-white">
            <GraduationCap className="w-6 h-6 text-white" />
          </div>
          <div>
            <h1 className="text-2xl font-extrabold tracking-tight text-slate-900 flex items-center gap-2">
              Exam<span className="text-blue-600">Pro</span>
              <span className="text-[11px] font-semibold bg-blue-50 text-blue-700 border border-blue-200/80 px-2 py-0.5 rounded-full">
                Cloud
              </span>
            </h1>
            <p className="text-xs text-slate-500 font-medium">Proctored Online Examination & Assessment System</p>
          </div>
        </motion.div>

        {/* Auth Card Outlet */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.05, ease: 'easeOut' }}
          className="w-full max-w-xl"
        >
          <Outlet />
        </motion.div>

        {/* Trust Badges */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.5, delay: 0.2 }}
          className="mt-8 flex flex-wrap items-center justify-center gap-6 text-xs text-slate-500"
        >
          <div className="flex items-center gap-1.5 font-medium">
            <ShieldCheck className="w-4 h-4 text-emerald-600" />
            <span>AI Anti-Cheating Telemetry</span>
          </div>
          <div className="flex items-center gap-1.5 font-medium">
            <Lock className="w-4 h-4 text-blue-600" />
            <span>Server-Authoritative Timing</span>
          </div>
          <div className="flex items-center gap-1.5 font-medium">
            <Award className="w-4 h-4 text-indigo-600" />
            <span>Verified Student ID Security</span>
          </div>
        </motion.div>
      </div>
    </div>
  );
};
