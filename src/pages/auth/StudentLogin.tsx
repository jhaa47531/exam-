import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { Lock, GraduationCap, ArrowRight, ArrowLeft, AlertCircle, UserCheck } from 'lucide-react';
import { motion } from 'motion/react';

export const StudentLogin: React.FC = () => {
  const { studentLogin } = useAuth();
  const navigate = useNavigate();

  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsSubmitting(true);

    try {
      await studentLogin({ identifier, password });
      navigate('/student/dashboard', { replace: true });
    } catch (err: any) {
      setError(err.message || 'Invalid student credentials');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="bg-white border border-slate-200/90 rounded-3xl p-6 sm:p-8 shadow-xl shadow-slate-200/40">
      <div className="mb-6 flex items-center justify-between">
        <Link
          to="/auth"
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-500 hover:text-slate-800 transition"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Back to Portal Selection</span>
        </Link>
        <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-md bg-emerald-50 text-emerald-700 border border-emerald-200">
          Student Portal
        </span>
      </div>

      <div className="mb-6 text-center">
        <div className="w-12 h-12 rounded-2xl bg-emerald-600 text-white flex items-center justify-center mx-auto mb-3 shadow-md shadow-emerald-500/20">
          <GraduationCap className="w-6 h-6" />
        </div>
        <h2 className="text-xl sm:text-2xl font-extrabold text-slate-900 tracking-tight">
          Student Sign In
        </h2>
        <p className="text-xs sm:text-sm text-slate-500 mt-1">
          Sign in using your College Student ID, Enrollment Number, or Registered Email
        </p>
      </div>

      {error && (
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="mb-5 p-3.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs flex items-center gap-2.5"
        >
          <AlertCircle className="w-4 h-4 shrink-0 text-rose-500" />
          <span>{error}</span>
        </motion.div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1.5">
            Student ID / Enrollment Number / Email
          </label>
          <div className="relative">
            <UserCheck className="w-4 h-4 text-slate-400 absolute left-3.5 top-3.5 pointer-events-none" />
            <input
              type="text"
              required
              value={identifier}
              onChange={(e) => setIdentifier(e.target.value)}
              placeholder="e.g. CS-2026-9022 or student@college.edu"
              className="w-full bg-slate-50/70 border border-slate-200 focus:bg-white focus:border-emerald-500 focus:ring-4 focus:ring-emerald-100 rounded-xl pl-10 pr-4 py-2.5 text-sm text-slate-900 placeholder:text-slate-400 transition outline-none"
            />
          </div>
        </div>

        <div>
          <div className="flex items-center justify-between mb-1.5">
            <label className="text-xs font-bold uppercase tracking-wider text-slate-600">
              Password
            </label>
            <Link
              to="/auth/forgot-password"
              className="text-xs font-semibold text-emerald-600 hover:text-emerald-700 transition"
            >
              Forgot password?
            </Link>
          </div>
          <div className="relative">
            <Lock className="w-4 h-4 text-slate-400 absolute left-3.5 top-3.5 pointer-events-none" />
            <input
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••••••"
              className="w-full bg-slate-50/70 border border-slate-200 focus:bg-white focus:border-emerald-500 focus:ring-4 focus:ring-emerald-100 rounded-xl pl-10 pr-4 py-2.5 text-sm text-slate-900 placeholder:text-slate-400 transition outline-none"
            />
          </div>
        </div>

        <button
          type="submit"
          disabled={isSubmitting}
          className="w-full mt-2 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white font-semibold py-2.5 rounded-xl shadow-md shadow-emerald-500/25 flex items-center justify-center gap-2 transition-all duration-150 cursor-pointer disabled:opacity-60 hover:shadow-lg hover:shadow-emerald-500/30 active:scale-[0.99]"
        >
          {isSubmitting ? (
            <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
          ) : (
            <>
              <span>Sign In to Student Station</span>
              <ArrowRight className="w-4 h-4" />
            </>
          )}
        </button>
      </form>

      <div className="mt-4 p-3 rounded-xl bg-emerald-50/70 border border-emerald-200/80 text-xs text-slate-700 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
        <div>
          <span className="font-semibold text-emerald-950">Demo Candidate:</span>{' '}
          <code className="text-emerald-800 bg-white/70 px-1.5 py-0.5 rounded">CS-2026-9022</code> /{' '}
          <code className="text-emerald-800 bg-white/70 px-1.5 py-0.5 rounded">Student@1234</code>
        </div>
        <button
          type="button"
          onClick={() => {
            setIdentifier('CS-2026-9022');
            setPassword('Student@1234');
          }}
          className="text-xs font-bold text-emerald-700 hover:text-emerald-900 underline underline-offset-2 cursor-pointer self-start sm:self-auto"
        >
          Auto-fill
        </button>
      </div>

      <div className="mt-6 pt-5 border-t border-slate-100 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-slate-500">
        <div>
          Don&apos;t have an account?{' '}
          <Link to="/auth/register" className="font-bold text-emerald-600 hover:text-emerald-700 underline underline-offset-2">
            Register with College ID &rarr;
          </Link>
        </div>
        <Link to="/auth/admin-login" className="font-semibold text-slate-400 hover:text-slate-600 transition">
          Admin Portal &rarr;
        </Link>
      </div>
    </div>
  );
};
