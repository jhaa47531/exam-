import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../../services/api';
import {
  Users,
  ShieldCheck,
  Clock,
  AlertTriangle,
  BookOpen,
  FileSpreadsheet,
  Radio,
  Award,
  ArrowRight,
  TrendingUp,
  Activity,
  PlusCircle,
  CheckCircle2,
  ExternalLink,
  ChevronRight,
} from 'lucide-react';
import { motion } from 'motion/react';

export const AdminDashboard: React.FC = () => {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadDashboard();
  }, []);

  const loadDashboard = async () => {
    try {
      const res = await api.admin.getDashboard();
      setData(res);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="p-16 text-center text-slate-400">
        <div className="w-9 h-9 border-3 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
        <p className="text-sm font-medium text-slate-600">Loading command center analytics...</p>
      </div>
    );
  }

  const stats = data?.stats || {};
  const recentAttempts = data?.recentAttempts || [];

  const containerVariants = {
    hidden: { opacity: 0 },
    show: {
      opacity: 1,
      transition: {
        staggerChildren: 0.08,
      },
    },
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 12 },
    show: { opacity: 1, y: 0, transition: { duration: 0.3 } },
  };

  return (
    <motion.div
      variants={containerVariants}
      initial="hidden"
      animate="show"
      className="space-y-8"
    >
      {/* Header Banner */}
      <motion.div
        variants={itemVariants}
        className="relative overflow-hidden bg-white border border-slate-200/80 rounded-3xl p-6 sm:p-8 shadow-sm"
      >
        <div className="absolute top-0 right-0 w-96 h-96 bg-gradient-to-bl from-blue-500/10 via-indigo-500/5 to-transparent rounded-full blur-3xl pointer-events-none" />
        <div className="relative z-10 flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
          <div className="space-y-2">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-50 border border-blue-200 text-blue-700 text-xs font-semibold">
              <span className="w-2 h-2 rounded-full bg-rose-500 animate-ping" />
              <span>Live Examination Radar Active</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
              Proctoring & Assessment Command Center
            </h1>
            <p className="text-sm text-slate-600 max-w-2xl leading-relaxed">
              Real-time candidate monitoring, college ID verification workflow, automated grading evaluation, and examination scheduling.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <Link
              to="/admin/monitoring"
              className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-gradient-to-r from-rose-600 to-rose-700 hover:from-rose-700 hover:to-rose-800 text-white font-semibold text-xs shadow-md shadow-rose-600/20 transition cursor-pointer"
            >
              <Radio className="w-4 h-4 animate-pulse" />
              <span>Open Live Monitoring</span>
            </Link>
            <Link
              to="/admin/exams"
              className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-semibold text-xs shadow-md shadow-blue-600/20 transition cursor-pointer"
            >
              <PlusCircle className="w-4 h-4" />
              <span>Create Exam</span>
            </Link>
          </div>
        </div>
      </motion.div>

      {/* KPI Stats Grid */}
      <motion.div
        variants={containerVariants}
        className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4"
      >
        {/* Total Students */}
        <motion.div variants={itemVariants}>
          <Link
            to="/admin/students"
            className="group block p-5 rounded-2xl bg-white border border-slate-200/80 hover:border-blue-400 hover:shadow-md transition-all duration-200 space-y-3"
          >
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-slate-500">Total Students</span>
              <div className="p-2 rounded-xl bg-blue-50 text-blue-600 group-hover:scale-110 transition-transform">
                <Users className="w-4 h-4" />
              </div>
            </div>
            <div className="text-2xl font-black text-slate-900">{stats.totalStudents || 0}</div>
            <div className="text-[11px] text-slate-500 flex items-center gap-1 font-medium">
              Enrolled Candidates
            </div>
          </Link>
        </motion.div>

        {/* Verified Students */}
        <motion.div variants={itemVariants}>
          <Link
            to="/admin/students"
            className="group block p-5 rounded-2xl bg-white border border-slate-200/80 hover:border-emerald-400 hover:shadow-md transition-all duration-200 space-y-3"
          >
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-slate-500">Verified</span>
              <div className="p-2 rounded-xl bg-emerald-50 text-emerald-600 group-hover:scale-110 transition-transform">
                <ShieldCheck className="w-4 h-4" />
              </div>
            </div>
            <div className="text-2xl font-black text-emerald-600">{stats.verifiedStudents || 0}</div>
            <div className="text-[11px] text-emerald-600 font-medium">Approved ID Cards</div>
          </Link>
        </motion.div>

        {/* Pending Verifications */}
        <motion.div variants={itemVariants}>
          <Link
            to="/admin/verifications"
            className="group block p-5 rounded-2xl bg-white border border-amber-300 hover:border-amber-400 hover:shadow-md transition-all duration-200 space-y-3 relative overflow-hidden"
          >
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-amber-800">Pending Review</span>
              <div className="p-2 rounded-xl bg-amber-50 text-amber-600 group-hover:scale-110 transition-transform">
                <Clock className="w-4 h-4 animate-spin" />
              </div>
            </div>
            <div className="text-2xl font-black text-amber-600">{stats.pendingVerifications || 0}</div>
            <div className="text-[11px] text-amber-700 font-bold flex items-center gap-1">
              Action Required &rarr;
            </div>
          </Link>
        </motion.div>

        {/* Active Exams */}
        <motion.div variants={itemVariants}>
          <Link
            to="/admin/monitoring"
            className="group block p-5 rounded-2xl bg-white border border-rose-200 hover:border-rose-400 hover:shadow-md transition-all duration-200 space-y-3"
          >
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-rose-700">Active Exams</span>
              <div className="p-2 rounded-xl bg-rose-50 text-rose-600 group-hover:scale-110 transition-transform">
                <Radio className="w-4 h-4" />
              </div>
            </div>
            <div className="text-2xl font-black text-rose-600">{stats.activeExams || 0}</div>
            <div className="text-[11px] text-rose-600 font-medium">In-Session Today</div>
          </Link>
        </motion.div>

        {/* Published Results */}
        <motion.div variants={itemVariants}>
          <Link
            to="/admin/results"
            className="group block p-5 rounded-2xl bg-white border border-slate-200/80 hover:border-cyan-400 hover:shadow-md transition-all duration-200 space-y-3"
          >
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-slate-500">Results</span>
              <div className="p-2 rounded-xl bg-cyan-50 text-cyan-600 group-hover:scale-110 transition-transform">
                <Award className="w-4 h-4" />
              </div>
            </div>
            <div className="text-2xl font-black text-cyan-700">{stats.publishedResults || 0}</div>
            <div className="text-[11px] text-slate-500 font-medium">Official Scorecards</div>
          </Link>
        </motion.div>
      </motion.div>

      {/* Verification Queue & Active Proctor Stream Preview */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Verification Action Box */}
        <motion.div
          variants={itemVariants}
          className="bg-white border border-slate-200/80 rounded-3xl p-6 flex flex-col justify-between shadow-xs"
        >
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
                <Clock className="w-4 h-4 text-amber-500" />
                Student Verification Queue
              </h2>
              <span className="text-xs font-bold text-amber-700 bg-amber-50 px-2.5 py-0.5 rounded-full border border-amber-200">
                {stats.pendingVerifications} Pending
              </span>
            </div>
            <p className="text-xs text-slate-600 leading-relaxed">
              Review attached college ID card documents for new registrants. Unverified students cannot enter proctored examinations.
            </p>
          </div>

          <div className="pt-6">
            <Link
              to="/admin/verifications"
              className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-600 text-slate-950 font-bold text-xs transition shadow-sm cursor-pointer"
            >
              <span>Review Verification Requests</span>
              <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
        </motion.div>

        {/* Live Proctoring Status Box */}
        <motion.div
          variants={itemVariants}
          className="lg:col-span-2 bg-white border border-slate-200/80 rounded-3xl p-6 shadow-xs"
        >
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
                <Activity className="w-4 h-4 text-rose-500" />
                Recent Examination Sessions
              </h2>
              <p className="text-xs text-slate-500">Live attempt records and security status</p>
            </div>
            <Link
              to="/admin/monitoring"
              className="text-xs text-blue-600 hover:text-blue-700 font-semibold flex items-center gap-1"
            >
              Full Live Radar &rarr;
            </Link>
          </div>

          {recentAttempts.length === 0 ? (
            <div className="p-8 text-center text-slate-400 text-xs">
              No recent examination sessions found.
            </div>
          ) : (
            <div className="space-y-2.5">
              {recentAttempts.map((att: any) => (
                <div
                  key={att.id}
                  className="p-3.5 rounded-xl bg-slate-50/70 border border-slate-200/80 flex items-center justify-between text-xs hover:bg-slate-100/70 transition"
                >
                  <div>
                    <h4 className="font-bold text-slate-900">{att.student_name}</h4>
                    <p className="text-[11px] text-slate-500">{att.exam_title}</p>
                  </div>

                  <div className="flex items-center gap-3">
                    <span
                      className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase ${
                        att.status === 'submitted'
                          ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                          : att.status === 'in_progress'
                          ? 'bg-amber-50 text-amber-700 border border-amber-200'
                          : att.status === 'held'
                          ? 'bg-indigo-50 text-indigo-700 border border-indigo-200'
                          : 'bg-rose-50 text-rose-700 border border-rose-200'
                      }`}
                    >
                      {att.status}
                    </span>

                    <span className="text-slate-500 text-[11px]">
                      Warnings: <strong className={att.warning_count > 0 ? 'text-amber-600 font-bold' : 'text-slate-700'}>{att.warning_count}</strong>
                    </span>

                    <Link
                      to="/admin/monitoring"
                      className="px-3 py-1 rounded-lg bg-white hover:bg-slate-50 border border-slate-200 text-blue-600 text-[11px] font-semibold transition shadow-2xs"
                    >
                      Monitor
                    </Link>
                  </div>
                </div>
              ))}
            </div>
          )}
        </motion.div>
      </div>
    </motion.div>
  );
};
