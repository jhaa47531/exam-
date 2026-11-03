import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { api } from '../../services/api';
import type { Exam } from '../../types';
import {
  FileCheck2,
  Clock,
  ShieldCheck,
  AlertTriangle,
  ArrowRight,
  Info,
  Calendar,
  Lock,
  X,
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

export const AvailableExams: React.FC = () => {
  const [exams, setExams] = useState<Exam[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedExam, setSelectedExam] = useState<Exam | null>(null);
  const navigate = useNavigate();

  useEffect(() => {
    api.student.getExams().then((res) => {
      setExams(res.exams || []);
    }).catch((err) => {
      console.error(err);
    }).finally(() => {
      setLoading(false);
    });
  }, []);

  if (loading) {
    return (
      <div className="p-16 text-center text-slate-400">
        <div className="w-8 h-8 border-3 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
        <p className="text-sm font-medium text-slate-600">Loading your scheduled examination schedule...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Available Examinations</h1>
          <p className="text-xs text-slate-500 mt-1">
            Official semester assessments with anti-cheating monitoring and automated submission
          </p>
        </div>
      </div>

      <div className="space-y-4">
        {exams.map((exam) => {
          const attempt = exam.attempt;
          const isSubmitted = attempt?.status === 'submitted';
          const isTerminated = attempt?.status === 'terminated';
          const isInProgress = attempt?.status === 'in_progress' || attempt?.status === 'held';

          return (
            <motion.div
              key={exam.id}
              whileHover={{ y: -2 }}
              transition={{ duration: 0.15 }}
              className="p-6 rounded-3xl bg-white border border-slate-200/80 hover:border-blue-400 hover:shadow-md transition-all flex flex-col md:flex-row items-start md:items-center justify-between gap-6"
            >
              <div className="space-y-2 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="text-xs font-bold uppercase tracking-wider px-2.5 py-0.5 rounded-full bg-blue-50 text-blue-700 border border-blue-200">
                    {exam.subject}
                  </span>
                  <span className="text-xs text-slate-500 flex items-center gap-1 font-medium">
                    <Clock className="w-3.5 h-3.5 text-slate-400" />
                    {exam.duration_minutes} Mins
                  </span>
                  {exam.negative_marking && (
                    <span className="text-[10px] font-bold text-rose-700 bg-rose-50 px-2 py-0.5 rounded-full border border-rose-200">
                      Negative Marking ({exam.negative_mark_value} marks)
                    </span>
                  )}
                </div>

                <h2 className="text-lg font-bold text-slate-900">{exam.title}</h2>
                <p className="text-xs text-slate-500 line-clamp-2 leading-relaxed">{exam.description}</p>

                <div className="flex flex-wrap items-center gap-4 text-xs text-slate-500 pt-1 font-medium">
                  <span>Total Marks: <strong className="text-slate-900 font-bold">{exam.total_marks}</strong></span>
                  <span>Passing Marks: <strong className="text-slate-900 font-bold">{exam.passing_marks}</strong></span>
                  <span>Total Questions: <strong className="text-slate-900 font-bold">{exam.total_questions}</strong></span>
                  <span>Late Entry Window: <strong className="text-slate-900 font-bold">{exam.late_entry_policy_minutes} mins</strong></span>
                </div>
              </div>

              <div className="shrink-0 flex items-center gap-2.5 w-full md:w-auto justify-end pt-3 md:pt-0 border-t md:border-t-0 border-slate-100">
                <button
                  onClick={() => setSelectedExam(exam)}
                  className="px-3.5 py-2 rounded-xl bg-slate-50 hover:bg-slate-100 text-slate-700 text-xs font-semibold border border-slate-200 transition flex items-center gap-1.5 cursor-pointer"
                >
                  <Info className="w-3.5 h-3.5" /> Instructions
                </button>

                {isSubmitted ? (
                  <Link
                    to={`/student/results/${exam.id}`}
                    className="px-4 py-2 rounded-xl bg-emerald-50 text-emerald-700 border border-emerald-200 text-xs font-semibold hover:bg-emerald-100 transition cursor-pointer"
                  >
                    View Scorecard
                  </Link>
                ) : isTerminated ? (
                  <span className="px-3.5 py-2 rounded-xl bg-rose-50 text-rose-700 border border-rose-200 text-xs font-bold">
                    Terminated by Proctor
                  </span>
                ) : isInProgress ? (
                  <Link
                    to={`/student/exam/${exam.id}`}
                    className="px-5 py-2 rounded-xl bg-amber-500 hover:bg-amber-600 text-slate-950 text-xs font-bold shadow-md shadow-amber-500/20 transition flex items-center gap-1.5 cursor-pointer"
                  >
                    <span>Resume Attempt</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </Link>
                ) : (
                  <Link
                    to={`/student/exam/${exam.id}`}
                    className="px-5 py-2 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white text-xs font-bold shadow-md shadow-blue-500/20 transition flex items-center gap-1.5 cursor-pointer"
                  >
                    <span>Start Exam</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </Link>
                )}
              </div>
            </motion.div>
          );
        })}
      </div>

      {/* Instructions Modal */}
      <AnimatePresence>
        {selectedExam && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-xs">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white border border-slate-200 rounded-3xl max-w-xl w-full p-6 sm:p-8 shadow-2xl space-y-4"
            >
              <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                  <ShieldCheck className="w-5 h-5 text-blue-600" />
                  Examination Instructions & Security Rules
                </h3>
                <button
                  onClick={() => setSelectedExam(null)}
                  className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-xl transition cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="space-y-3 text-xs text-slate-600">
                <p className="font-bold text-slate-900 text-sm">
                  Exam: {selectedExam.title} ({selectedExam.subject})
                </p>
                <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 space-y-2 leading-relaxed">
                  <div>&bull; <strong className="text-slate-800">Server-Authoritative Timing:</strong> The countdown timer is controlled strictly by the university examination server and survives browser refreshes.</div>
                  <div>&bull; <strong className="text-slate-800">Anti-Cheating Monitoring:</strong> Tab switches and exiting fullscreen mode are automatically flagged as security infractions and reported to the proctor in real-time.</div>
                  <div>&bull; <strong className="text-slate-800">Proctor Hold & Warnings:</strong> The proctor administrator can issue direct warnings, pause access with an Exam Hold, or terminate unauthorized attempts.</div>
                  <div>&bull; <strong className="text-slate-800">Autosaving:</strong> Answers are immediately synced to the examination database.</div>
                  <div>&bull; <strong className="text-slate-800">Submission:</strong> The exam will automatically finalize upon timer expiration.</div>
                </div>
              </div>

              <div className="flex justify-end gap-2.5 pt-2">
                <button
                  onClick={() => setSelectedExam(null)}
                  className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 hover:text-slate-900 hover:bg-slate-100 cursor-pointer"
                >
                  Close
                </button>
                <Link
                  to={`/student/exam/${selectedExam.id}`}
                  className="px-5 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-semibold text-xs shadow-sm transition cursor-pointer"
                >
                  Enter Examination Station
                </Link>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};
