import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { api } from '../../services/api';
import type { ExamResult, Exam } from '../../types';
import confetti from 'canvas-confetti';
import {
  Award,
  CheckCircle2,
  XCircle,
  Clock,
  ArrowRight,
  GraduationCap,
  Sparkles,
  BookOpen,
} from 'lucide-react';
import { motion } from 'motion/react';

export const ExamResultView: React.FC = () => {
  const { examId } = useParams<{ examId: string }>();
  const [result, setResult] = useState<ExamResult | null>(null);
  const [exam, setExam] = useState<Exam | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!examId) return;

    api.student.getResults()
      .then((res) => {
        const matching = res.results.find((r) => r.exam_id === examId);
        if (matching) {
          setResult(matching);
          if (matching.is_passed) {
            confetti({
              particleCount: 100,
              spread: 70,
              origin: { y: 0.6 },
            });
          }
        }
      })
      .catch((err) => console.error(err))
      .finally(() => setLoading(false));

    api.student.getExams()
      .then((res) => {
        const matching = res.exams.find((e) => e.id === examId);
        if (matching) setExam(matching);
      })
      .catch(() => {});
  }, [examId]);

  if (loading) {
    return (
      <div className="p-16 text-center text-slate-400">
        <div className="w-8 h-8 border-3 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
        <p className="text-sm font-medium text-slate-600">Retrieving official published score statement...</p>
      </div>
    );
  }

  if (!result) {
    return (
      <div className="max-w-xl mx-auto p-8 rounded-3xl bg-white border border-slate-200/80 shadow-xs text-center space-y-4">
        <div className="w-12 h-12 rounded-2xl bg-amber-50 text-amber-600 border border-amber-200 flex items-center justify-center mx-auto">
          <Clock className="w-6 h-6 animate-pulse" />
        </div>
        <h2 className="text-xl font-bold text-slate-900">Results Pending Verification</h2>
        <p className="text-xs text-slate-500 leading-relaxed max-w-md mx-auto">
          Your answers have been securely recorded. The Controller of Examinations is reviewing written responses before publishing your final scorecard.
        </p>
        <div className="pt-2">
          <Link
            to="/student/dashboard"
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-semibold text-xs shadow-sm transition"
          >
            Return to Student Dashboard
          </Link>
        </div>
      </div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.98 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.3 }}
      className="max-w-3xl mx-auto space-y-6"
    >
      {/* Result Hero Header */}
      <div className={`rounded-3xl p-6 sm:p-10 border text-center space-y-5 bg-white shadow-sm ${
        result.is_passed
          ? 'border-emerald-200'
          : 'border-rose-200'
      }`}>
        <div className="inline-flex items-center gap-1.5 px-3.5 py-1 rounded-full bg-slate-100 border border-slate-200 text-xs font-semibold text-slate-700">
          <GraduationCap className="w-3.5 h-3.5 text-blue-600" />
          Official Academic Examination Scorecard
        </div>

        <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
          {result.exam_title || exam?.title || 'Examination Assessment'}
        </h1>
        <p className="text-xs text-blue-700 uppercase tracking-widest font-bold">
          {result.subject || exam?.subject}
        </p>

        {/* Scorecard Hero Numbers */}
        <div className="py-6 flex flex-col sm:flex-row items-center justify-center gap-8 border-y border-slate-100 my-4">
          <div>
            <div className="text-4xl sm:text-5xl font-black text-slate-900">
              {result.obtained_marks}
              <span className="text-xl sm:text-2xl font-bold text-slate-400"> / {result.total_marks}</span>
            </div>
            <div className="text-xs font-bold uppercase tracking-wider text-slate-500 mt-1">
              Marks Obtained
            </div>
          </div>

          <div className="hidden sm:block w-px h-16 bg-slate-200" />

          <div>
            <div className={`text-4xl sm:text-5xl font-black ${
              result.is_passed ? 'text-emerald-600' : 'text-rose-600'
            }`}>
              {result.percentage}%
            </div>
            <div className="text-xs font-bold uppercase tracking-wider text-slate-500 mt-1">
              Calculated Percentage
            </div>
          </div>

          <div className="hidden sm:block w-px h-16 bg-slate-200" />

          <div>
            <div className={`inline-flex items-center gap-2 px-4 py-2 rounded-2xl text-sm font-bold uppercase tracking-wider ${
              result.is_passed
                ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                : 'bg-rose-50 text-rose-700 border border-rose-200'
            }`}>
              {result.is_passed ? <CheckCircle2 className="w-5 h-5 text-emerald-600" /> : <XCircle className="w-5 h-5 text-rose-600" />}
              <span>{result.is_passed ? 'PASSED' : 'FAILED'}</span>
            </div>
            <div className="text-[11px] font-medium text-slate-500 mt-1">
              Passing Mark: {result.passing_marks || exam?.passing_marks || 0}
            </div>
          </div>
        </div>

        <p className="text-xs text-slate-600 max-w-xl mx-auto leading-relaxed">
          {result.is_passed
            ? 'Congratulations! You have satisfied the academic passing threshold for this examination module.'
            : 'You scored below the passing cutoff. Contact your academic advisor or proctor regarding remediation.'}
        </p>

        <div className="pt-2">
          <Link
            to="/student/dashboard"
            className="inline-flex items-center gap-2 px-6 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-800 font-semibold text-xs transition cursor-pointer border border-slate-200"
          >
            <span>Back to Student Portal</span>
            <ArrowRight className="w-4 h-4" />
          </Link>
        </div>
      </div>
    </motion.div>
  );
};
