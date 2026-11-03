import React, { useState, useEffect } from 'react';
import { api } from '../../services/api';
import { BarChart3, TrendingUp, ShieldAlert, Award, Users, CheckCircle2 } from 'lucide-react';
import { motion } from 'motion/react';

export const ReportsAnalytics: React.FC = () => {
  const [data, setData] = useState<any>(null);
  const [results, setResults] = useState<any[]>([]);

  useEffect(() => {
    Promise.all([api.admin.getDashboard(), api.admin.getResults()]).then(([dRes, rRes]) => {
      setData(dRes);
      setResults(rRes.results || []);
    }).catch(console.error);
  }, []);

  const totalResults = results.length;
  const passedCount = results.filter((r) => r.is_passed).length;
  const overallPassRate = totalResults > 0 ? Math.round((passedCount / totalResults) * 100) : 100;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Institutional Reports & Analytics</h1>
        <p className="text-xs text-slate-500 mt-1">Academic performance, score distributions, and proctoring integrity analytics</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Pass Percentage Card */}
        <motion.div
          whileHover={{ y: -3 }}
          transition={{ duration: 0.15 }}
          className="p-6 rounded-3xl bg-white border border-slate-200/80 shadow-xs space-y-4"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-500">Institutional Pass Rate</span>
            <div className="p-2 rounded-xl bg-emerald-50 text-emerald-600">
              <TrendingUp className="w-4 h-4" />
            </div>
          </div>
          <div className="text-4xl font-black text-emerald-600">{overallPassRate}%</div>
          <div className="w-full bg-slate-100 h-2.5 rounded-full overflow-hidden">
            <div className="bg-emerald-500 h-full rounded-full transition-all duration-500" style={{ width: `${overallPassRate}%` }} />
          </div>
          <p className="text-xs text-slate-500 font-medium">{passedCount} of {totalResults} candidate assessments passed.</p>
        </motion.div>

        {/* Anti-Cheating Incident Breakdown */}
        <motion.div
          whileHover={{ y: -3 }}
          transition={{ duration: 0.15 }}
          className="p-6 rounded-3xl bg-white border border-slate-200/80 shadow-xs space-y-4"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-500">Proctoring Telemetry</span>
            <div className="p-2 rounded-xl bg-rose-50 text-rose-600">
              <ShieldAlert className="w-4 h-4" />
            </div>
          </div>
          <div className="text-4xl font-black text-slate-900">99.4%</div>
          <div className="text-xs text-slate-600 space-y-2 pt-1">
            <div className="flex justify-between">
              <span className="text-slate-500">Fullscreen Compliance:</span>
              <strong className="text-emerald-700 font-bold">98.1%</strong>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500">Tab Switching Rate:</span>
              <strong className="text-amber-700 font-bold">1.9%</strong>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500">Remote Holds Issued:</span>
              <strong className="text-blue-700 font-bold">1</strong>
            </div>
          </div>
        </motion.div>

        {/* Program Enrollment Distribution */}
        <motion.div
          whileHover={{ y: -3 }}
          transition={{ duration: 0.15 }}
          className="p-6 rounded-3xl bg-white border border-slate-200/80 shadow-xs space-y-4"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-500">Programs Represented</span>
            <div className="p-2 rounded-xl bg-blue-50 text-blue-600">
              <Users className="w-4 h-4" />
            </div>
          </div>
          <div className="space-y-3 text-xs">
            <div>
              <div className="flex justify-between text-slate-700 font-medium mb-1">
                <span>BCA (Computer Applications)</span>
                <strong className="text-slate-900">65%</strong>
              </div>
              <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
                <div className="bg-blue-600 h-full rounded-full" style={{ width: '65%' }} />
              </div>
            </div>
            <div>
              <div className="flex justify-between text-slate-700 font-medium mb-1">
                <span>BBA (Business Admin)</span>
                <strong className="text-slate-900">20%</strong>
              </div>
              <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
                <div className="bg-teal-500 h-full rounded-full" style={{ width: '20%' }} />
              </div>
            </div>
            <div>
              <div className="flex justify-between text-slate-700 font-medium mb-1">
                <span>MCA (Postgraduate)</span>
                <strong className="text-slate-900">15%</strong>
              </div>
              <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
                <div className="bg-amber-500 h-full rounded-full" style={{ width: '15%' }} />
              </div>
            </div>
          </div>
        </motion.div>
      </div>
    </div>
  );
};
