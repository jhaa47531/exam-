import React from 'react';
import { useAuth } from '../context/AuthContext';
import { ShieldCheck, UserCheck, Clock, AlertTriangle, ArrowRightLeft, Sparkles } from 'lucide-react';

export const DemoBar: React.FC = () => {
  const { user, switchDemoUser, isLoading } = useAuth();

  return (
    <div className="bg-white/95 backdrop-blur-md border-b border-slate-200 text-xs text-slate-600 px-4 py-2 flex flex-wrap items-center justify-between gap-3 shadow-xs sticky top-0 z-50">
      <div className="flex items-center gap-2.5">
        <span className="flex h-2 w-2 rounded-full bg-emerald-500 animate-pulse"></span>
        <span className="font-bold text-slate-800 tracking-wide uppercase text-[10px] bg-slate-100 px-2 py-0.5 rounded-md border border-slate-200/80">
          ExamPro Sandbox
        </span>
        <span className="hidden sm:inline text-slate-500">
          Current Role: <strong className="text-slate-900 font-semibold">{user?.full_name || 'Guest'}</strong>{' '}
          <span className="text-slate-400">({user?.role ? user.role.toUpperCase() : 'Not Logged In'})</span>
        </span>
      </div>

      <div className="flex items-center gap-1.5 flex-wrap">
        <span className="text-slate-400 text-[11px] font-medium flex items-center gap-1 mr-1">
          <ArrowRightLeft className="w-3 h-3 text-blue-500" /> Switch Role:
        </span>

        <button
          onClick={() => switchDemoUser('admin@exampro.edu')}
          disabled={isLoading || user?.email === 'admin@exampro.edu'}
          className={`px-2.5 py-1 rounded-lg flex items-center gap-1.5 text-xs font-semibold transition-all duration-150 cursor-pointer ${
            user?.email === 'admin@exampro.edu'
              ? 'bg-blue-600 text-white shadow-xs shadow-blue-500/30'
              : 'bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-200'
          }`}
          title="Switch to Proctor Administrator"
        >
          <ShieldCheck className={`w-3.5 h-3.5 ${user?.email === 'admin@exampro.edu' ? 'text-white' : 'text-blue-600'}`} />
          <span>Admin</span>
        </button>

        <button
          onClick={() => switchDemoUser('student@college.edu')}
          disabled={isLoading || user?.email === 'student@college.edu'}
          className={`px-2.5 py-1 rounded-lg flex items-center gap-1.5 text-xs font-semibold transition-all duration-150 cursor-pointer ${
            user?.email === 'student@college.edu'
              ? 'bg-emerald-600 text-white shadow-xs shadow-emerald-500/30'
              : 'bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-200'
          }`}
          title="Switch to Verified Student (Alex Rivera)"
        >
          <UserCheck className={`w-3.5 h-3.5 ${user?.email === 'student@college.edu' ? 'text-white' : 'text-emerald-600'}`} />
          <span>Verified Student</span>
        </button>

        <button
          onClick={() => switchDemoUser('aditya@student.edu')}
          disabled={isLoading || user?.email === 'aditya@student.edu'}
          className={`px-2.5 py-1 rounded-lg flex items-center gap-1.5 text-xs font-semibold transition-all duration-150 cursor-pointer ${
            user?.email === 'aditya@student.edu'
              ? 'bg-amber-500 text-white shadow-xs shadow-amber-500/30'
              : 'bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-200'
          }`}
          title="Switch to Pending Verification Student (Aditya Kumar Jha)"
        >
          <Clock className={`w-3.5 h-3.5 ${user?.email === 'aditya@student.edu' ? 'text-white' : 'text-amber-600'}`} />
          <span>Pending Student</span>
        </button>

        <button
          onClick={() => switchDemoUser('sarah.connor@student.edu')}
          disabled={isLoading || user?.email === 'sarah.connor@student.edu'}
          className={`px-2.5 py-1 rounded-lg flex items-center gap-1.5 text-xs font-semibold transition-all duration-150 cursor-pointer ${
            user?.email === 'sarah.connor@student.edu'
              ? 'bg-rose-500 text-white shadow-xs shadow-rose-500/30'
              : 'bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-200'
          }`}
          title="Switch to Rejected Verification Student (Sarah Connor)"
        >
          <AlertTriangle className={`w-3.5 h-3.5 ${user?.email === 'sarah.connor@student.edu' ? 'text-white' : 'text-rose-500'}`} />
          <span>Rejected Student</span>
        </button>
      </div>
    </div>
  );
};
