import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { api } from '../../services/api';
import type { Exam, ExamResult } from '../../types';
import {
  Clock,
  ShieldCheck,
  AlertTriangle,
  FileCheck2,
  Calendar,
  Award,
  ArrowRight,
  GraduationCap,
  Sparkles,
  BookOpen,
  CheckCircle2,
  AlertCircle,
  Upload,
  RefreshCw,
  X,
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

export const StudentDashboard: React.FC = () => {
  const { user, verification, enrollment, refreshProfile } = useAuth();
  const navigate = useNavigate();

  const [exams, setExams] = useState<Exam[]>([]);
  const [results, setResults] = useState<ExamResult[]>([]);
  const [loading, setLoading] = useState(true);

  // Resubmit modal state
  const [showResubmitModal, setShowResubmitModal] = useState(false);
  const [newIdCardUrl, setNewIdCardUrl] = useState('');
  const [resubmitReason, setResubmitReason] = useState('');
  const [isResubmitting, setIsResubmitting] = useState(false);

  useEffect(() => {
    loadData();
  }, [verification?.status]);

  const loadData = async () => {
    setLoading(true);
    try {
      if (verification?.status === 'approved') {
        const [examsRes, resultsRes] = await Promise.all([
          api.student.getExams(),
          api.student.getResults(),
        ]);
        setExams(examsRes.exams || []);
        setResults(resultsRes.results || []);
      }
    } catch (err) {
      console.error('Failed to load dashboard data:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleResubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsResubmitting(true);
    try {
      await api.student.resubmitVerification({
        id_card_image_url: newIdCardUrl || 'https://images.unsplash.com/photo-1589829545856-d10d557cf95f?auto=format&fit=crop&q=80&w=800',
        note: resubmitReason || 'Resubmitted with updated clear ID image.',
      });
      setShowResubmitModal(false);
      await refreshProfile();
    } catch (err: any) {
      alert(err.message || 'Resubmission failed');
    } finally {
      setIsResubmitting(false);
    }
  };

  // =========================================================================
  // VIEW 1: PENDING VERIFICATION STATE
  // =========================================================================
  if (verification?.status === 'pending') {
    return (
      <div className="space-y-6">
        {/* Pending Banner */}
        <div className="relative overflow-hidden bg-white border border-amber-200/80 rounded-3xl p-6 sm:p-8 shadow-xs">
          <div className="absolute top-0 right-0 w-80 h-80 bg-gradient-to-bl from-amber-500/10 via-amber-500/5 to-transparent rounded-full blur-3xl pointer-events-none" />
          <div className="relative z-10 flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
            <div className="space-y-2">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-amber-50 text-amber-800 border border-amber-200 text-xs font-semibold">
                <Clock className="w-3.5 h-3.5 text-amber-600 animate-spin" />
                <span>Verification Status: Pending Administrative Review</span>
              </div>
              <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
                Welcome, {user?.full_name}
              </h1>
              <p className="text-sm text-slate-600 max-w-2xl leading-relaxed">
                Your college identity credentials have been queued for verification. The Controller of Examinations reviews student identity cards to ensure academic integrity before granting examination access.
              </p>
            </div>
            <button
              onClick={() => refreshProfile()}
              className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-white hover:bg-slate-50 text-slate-700 text-xs font-semibold border border-slate-200 shadow-xs transition cursor-pointer"
            >
              <RefreshCw className="w-3.5 h-3.5" /> Check Status
            </button>
          </div>
        </div>

        {/* Visual Verification Progress Tracker */}
        <div className="bg-white border border-slate-200/80 rounded-3xl p-6 shadow-xs">
          <h2 className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-6">
            Identity Card Verification Tracker
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 relative">
            {/* Step 1 */}
            <div className="p-4 rounded-2xl bg-emerald-50/70 border border-emerald-200 space-y-1.5">
              <div className="w-8 h-8 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center font-bold text-xs mb-2">
                <CheckCircle2 className="w-5 h-5" />
              </div>
              <h3 className="text-sm font-bold text-slate-900">1. Submission Received</h3>
              <p className="text-xs text-slate-600 leading-relaxed">Student details & College ID uploaded securely.</p>
              <span className="inline-block text-[10px] text-emerald-700 font-bold bg-emerald-100 px-2 py-0.5 rounded-full mt-2">Completed</span>
            </div>

            {/* Step 2 */}
            <div className="p-4 rounded-2xl bg-emerald-50/70 border border-emerald-200 space-y-1.5">
              <div className="w-8 h-8 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center font-bold text-xs mb-2">
                <CheckCircle2 className="w-5 h-5" />
              </div>
              <h3 className="text-sm font-bold text-slate-900">2. Document In Queue</h3>
              <p className="text-xs text-slate-600 leading-relaxed">Encrypted in university storage bucket.</p>
              <span className="inline-block text-[10px] text-emerald-700 font-bold bg-emerald-100 px-2 py-0.5 rounded-full mt-2">Completed</span>
            </div>

            {/* Step 3 (Active) */}
            <div className="p-4 rounded-2xl bg-amber-50/70 border border-amber-300 ring-2 ring-amber-400/20 space-y-1.5">
              <div className="w-8 h-8 rounded-full bg-amber-100 text-amber-700 flex items-center justify-center font-bold text-xs mb-2 animate-pulse">
                <Clock className="w-5 h-5" />
              </div>
              <h3 className="text-sm font-bold text-slate-900">3. Proctor Review</h3>
              <p className="text-xs text-slate-600 leading-relaxed">Administrator verifying student ID photo & enrollment.</p>
              <span className="inline-block text-[10px] text-amber-800 font-bold bg-amber-100 px-2 py-0.5 rounded-full mt-2">Under Review</span>
            </div>

            {/* Step 4 */}
            <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 opacity-60 space-y-1.5">
              <div className="w-8 h-8 rounded-full bg-slate-200 text-slate-500 flex items-center justify-center font-bold text-xs mb-2">
                4
              </div>
              <h3 className="text-sm font-bold text-slate-700">4. Exam Authorization</h3>
              <p className="text-xs text-slate-500 leading-relaxed">Portal unlocks examinations and testing tools.</p>
              <span className="inline-block text-[10px] text-slate-500 font-medium bg-slate-200/60 px-2 py-0.5 rounded-full mt-2">Pending Approval</span>
            </div>
          </div>
        </div>

        {/* Submitted Credentials Card */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="md:col-span-2 bg-white border border-slate-200/80 rounded-3xl p-6 shadow-xs">
            <h3 className="text-sm font-bold text-slate-900 mb-4 flex items-center gap-2">
              <BookOpen className="w-4 h-4 text-blue-600" />
              Submitted Academic Profile
            </h3>
            <div className="grid grid-cols-2 gap-3 text-xs">
              <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200/80">
                <span className="text-slate-500 block text-[11px] font-medium">College Student ID:</span>
                <span className="font-bold font-mono text-blue-600 text-sm">{verification?.college_student_id}</span>
              </div>
              <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200/80">
                <span className="text-slate-500 block text-[11px] font-medium">Enrollment Number:</span>
                <span className="font-bold font-mono text-slate-900 text-sm">{verification?.enrollment_number}</span>
              </div>
              <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200/80">
                <span className="text-slate-500 block text-[11px] font-medium">Course Program:</span>
                <span className="font-bold text-slate-900 text-sm">BCA (Computer Applications)</span>
              </div>
              <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200/80">
                <span className="text-slate-500 block text-[11px] font-medium">Current Semester:</span>
                <span className="font-bold text-slate-900 text-sm">Semester III</span>
              </div>
            </div>
          </div>

          <div className="bg-white border border-slate-200/80 rounded-3xl p-6 shadow-xs flex flex-col justify-between">
            <div>
              <h3 className="text-sm font-bold text-slate-900 mb-2 flex items-center gap-2">
                <ShieldCheck className="w-4 h-4 text-emerald-600" />
                Submitted College ID Card
              </h3>
              <p className="text-xs text-slate-500 mb-3">Encrypted private document</p>
              {verification?.id_card_image_url && (
                <img
                  src={verification.id_card_image_url}
                  alt="Student College ID"
                  className="w-full h-32 object-cover rounded-xl border border-slate-200 shadow-xs"
                />
              )}
            </div>
            <p className="text-[11px] text-slate-400 mt-3 text-center">
              Admins can approve requests in the Admin Panel &rarr; Student Verification.
            </p>
          </div>
        </div>
      </div>
    );
  }

  // =========================================================================
  // VIEW 2: REJECTED VERIFICATION STATE
  // =========================================================================
  if (verification?.status === 'rejected') {
    return (
      <div className="space-y-6">
        <div className="relative overflow-hidden bg-white border border-rose-200 rounded-3xl p-6 sm:p-8 shadow-xs">
          <div className="absolute top-0 right-0 w-80 h-80 bg-gradient-to-bl from-rose-500/10 via-rose-500/5 to-transparent rounded-full blur-3xl pointer-events-none" />
          <div className="relative z-10 flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
            <div className="space-y-2">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-rose-50 text-rose-700 border border-rose-200 text-xs font-semibold">
                <AlertTriangle className="w-3.5 h-3.5 text-rose-600" />
                <span>Verification Action Required: Document Rejected</span>
              </div>
              <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
                College ID Verification Needs Correction
              </h1>
              <p className="text-sm text-slate-600 max-w-2xl leading-relaxed">
                The Controller of Examinations reviewed your submission and flagged an issue. Please read the reason below and upload a corrected identity card photo to resubmit.
              </p>
            </div>
            <button
              onClick={() => setShowResubmitModal(true)}
              className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold shadow-md shadow-rose-600/20 transition cursor-pointer"
            >
              <Upload className="w-4 h-4" /> Resubmit ID Card
            </button>
          </div>
        </div>

        {/* Reason Box */}
        <div className="bg-white border border-rose-200 rounded-3xl p-6 shadow-xs">
          <h3 className="text-xs font-bold text-rose-700 uppercase tracking-wider mb-2">
            Proctor Review Feedback:
          </h3>
          <div className="p-4 rounded-2xl bg-rose-50 border border-rose-200 text-sm font-medium text-rose-900">
            &ldquo;{verification?.rejection_reason || 'Document photo was illegible or did not match registered university roll number.'}&rdquo;
          </div>
        </div>

        {/* Resubmit Modal */}
        <AnimatePresence>
          {showResubmitModal && (
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-xs">
              <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                className="bg-white border border-slate-200 rounded-3xl max-w-lg w-full p-6 shadow-2xl space-y-4"
              >
                <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                  <h3 className="text-base font-bold text-slate-900">Resubmit College Identity Card</h3>
                  <button
                    onClick={() => setShowResubmitModal(false)}
                    className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-xl transition cursor-pointer"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>
                <p className="text-xs text-slate-500">
                  Please attach a clear image with legible college name, student roll number, and photograph.
                </p>

                <form onSubmit={handleResubmit} className="space-y-4">
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      Image File / URL
                    </label>
                    <input
                      type="text"
                      value={newIdCardUrl}
                      onChange={(e) => setNewIdCardUrl(e.target.value)}
                      placeholder="https://... or paste image data URL"
                      className="w-full bg-slate-50 border border-slate-200 focus:bg-white focus:border-rose-500 rounded-xl px-3 py-2 text-xs text-slate-900 outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      Clarification Note for Proctor
                    </label>
                    <textarea
                      rows={3}
                      value={resubmitReason}
                      onChange={(e) => setResubmitReason(e.target.value)}
                      placeholder="e.g. Attached high-resolution scanned copy of official college ID."
                      className="w-full bg-slate-50 border border-slate-200 focus:bg-white focus:border-rose-500 rounded-xl p-3 text-xs text-slate-900 outline-none"
                    />
                  </div>

                  <div className="flex justify-end gap-2.5 pt-2">
                    <button
                      type="button"
                      onClick={() => setShowResubmitModal(false)}
                      className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 hover:text-slate-900 hover:bg-slate-100 cursor-pointer"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      disabled={isResubmitting}
                      className="px-5 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-semibold text-xs transition cursor-pointer shadow-sm"
                    >
                      {isResubmitting ? 'Submitting...' : 'Confirm Resubmission'}
                    </button>
                  </div>
                </form>
              </motion.div>
            </div>
          )}
        </AnimatePresence>
      </div>
    );
  }

  // =========================================================================
  // VIEW 3: FULL APPROVED STUDENT DASHBOARD
  // =========================================================================
  const activeExams = exams.filter((e) => e.status === 'published');
  const completedExams = exams.filter((e) => e.attempt?.status === 'submitted');

  return (
    <div className="space-y-6">
      {/* Welcome Banner */}
      <div className="relative overflow-hidden bg-white border border-slate-200/80 rounded-3xl p-6 sm:p-8 shadow-xs">
        <div className="absolute top-0 right-0 w-80 h-80 bg-gradient-to-bl from-blue-500/10 via-indigo-500/5 to-transparent rounded-full blur-3xl pointer-events-none" />
        <div className="relative z-10 flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
          <div className="space-y-2">
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 text-xs font-semibold">
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
              <span>College ID Verified &bull; Full Examination Access</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
              Welcome back, {user?.full_name}
            </h1>
            <p className="text-sm text-slate-600 max-w-2xl">
              Bachelor of Computer Applications &bull; Semester III &bull; Roll: <strong className="text-slate-800 font-mono">{enrollment?.college_student_id || 'CS-2026-8819'}</strong>
            </p>
          </div>

          <Link
            to="/student/available-exams"
            className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white text-xs font-bold shadow-md shadow-blue-500/20 transition shrink-0 cursor-pointer"
          >
            <span>View Available Exams</span>
            <ArrowRight className="w-4 h-4" />
          </Link>
        </div>
      </div>

      {/* Metrics Row */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <motion.div
          whileHover={{ y: -2 }}
          transition={{ duration: 0.15 }}
          className="p-4.5 rounded-2xl bg-white border border-slate-200/80 shadow-xs flex items-center gap-3.5"
        >
          <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center shrink-0">
            <FileCheck2 className="w-5 h-5" />
          </div>
          <div>
            <div className="text-xl font-black text-slate-900">{activeExams.length}</div>
            <div className="text-[11px] font-medium text-slate-500">Assigned Exams</div>
          </div>
        </motion.div>

        <motion.div
          whileHover={{ y: -2 }}
          transition={{ duration: 0.15 }}
          className="p-4.5 rounded-2xl bg-white border border-slate-200/80 shadow-xs flex items-center gap-3.5"
        >
          <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0">
            <CheckCircle2 className="w-5 h-5" />
          </div>
          <div>
            <div className="text-xl font-black text-emerald-600">{completedExams.length}</div>
            <div className="text-[11px] font-medium text-slate-500">Completed</div>
          </div>
        </motion.div>

        <motion.div
          whileHover={{ y: -2 }}
          transition={{ duration: 0.15 }}
          className="p-4.5 rounded-2xl bg-white border border-slate-200/80 shadow-xs flex items-center gap-3.5"
        >
          <div className="w-10 h-10 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center shrink-0">
            <Calendar className="w-5 h-5" />
          </div>
          <div>
            <div className="text-xl font-black text-slate-900">1</div>
            <div className="text-[11px] font-medium text-slate-500">Upcoming Final</div>
          </div>
        </motion.div>

        <motion.div
          whileHover={{ y: -2 }}
          transition={{ duration: 0.15 }}
          className="p-4.5 rounded-2xl bg-white border border-slate-200/80 shadow-xs flex items-center gap-3.5"
        >
          <div className="w-10 h-10 rounded-xl bg-cyan-50 text-cyan-600 flex items-center justify-center shrink-0">
            <Award className="w-5 h-5" />
          </div>
          <div>
            <div className="text-xl font-black text-slate-900">{results.length}</div>
            <div className="text-[11px] font-medium text-slate-500">Published Results</div>
          </div>
        </motion.div>
      </div>

      {/* Assigned Examinations List */}
      <div className="bg-white border border-slate-200/80 rounded-3xl p-6 shadow-xs">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-base font-bold text-slate-900">Assigned Examinations</h2>
            <p className="text-xs text-slate-500">Scheduled proctored online exams for your enrolled semester</p>
          </div>
          <Link
            to="/student/available-exams"
            className="text-xs text-blue-600 hover:text-blue-700 font-semibold"
          >
            All Exams &rarr;
          </Link>
        </div>

        {activeExams.length === 0 ? (
          <div className="p-12 text-center text-slate-400 text-xs">
            No exams currently scheduled for your course and semester.
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {activeExams.map((exam) => {
              const attempt = exam.attempt;
              const isSubmitted = attempt?.status === 'submitted';
              const isInProgress = attempt?.status === 'in_progress' || attempt?.status === 'held';

              return (
                <div
                  key={exam.id}
                  className="p-5 rounded-2xl bg-slate-50/70 border border-slate-200 hover:border-blue-300 hover:bg-white hover:shadow-sm transition-all duration-150 flex flex-col justify-between space-y-4"
                >
                  <div>
                    <div className="flex items-center justify-between gap-2 mb-2">
                      <span className="text-[10px] font-bold uppercase tracking-wider px-2.5 py-0.5 rounded-full bg-blue-50 text-blue-700 border border-blue-200">
                        {exam.subject}
                      </span>
                      <span className="text-xs text-slate-500 flex items-center gap-1 font-medium">
                        <Clock className="w-3.5 h-3.5 text-slate-400" />
                        {exam.duration_minutes} Mins
                      </span>
                    </div>

                    <h3 className="text-base font-bold text-slate-900 leading-snug">{exam.title}</h3>
                    <p className="text-xs text-slate-500 mt-1 line-clamp-2 leading-relaxed">
                      {exam.description}
                    </p>
                  </div>

                  <div className="pt-3 border-t border-slate-200/80 flex items-center justify-between">
                    <div className="text-xs text-slate-600">
                      Total: <strong className="text-slate-900 font-bold">{exam.total_marks} Marks</strong> ({exam.total_questions} Questions)
                    </div>

                    {isSubmitted ? (
                      <Link
                        to={`/student/results/${exam.id}`}
                        className="px-3.5 py-1.5 rounded-xl bg-emerald-50 text-emerald-700 border border-emerald-200 text-xs font-semibold hover:bg-emerald-100 transition cursor-pointer"
                      >
                        View Scorecard
                      </Link>
                    ) : isInProgress ? (
                      <Link
                        to={`/student/exam/${exam.id}`}
                        className="px-4 py-1.5 rounded-xl bg-amber-500 hover:bg-amber-600 text-slate-950 font-bold text-xs flex items-center gap-1.5 shadow-sm transition cursor-pointer"
                      >
                        <RefreshCw className="w-3 h-3 animate-spin" /> Resume Exam
                      </Link>
                    ) : new Date(exam.start_time).getTime() > Date.now() ? (
                      <span className="px-3.5 py-1.5 rounded-xl bg-slate-100 text-slate-500 border border-slate-200 text-xs font-semibold flex items-center gap-1.5">
                        <Clock className="w-3.5 h-3.5" /> Upcoming Final
                      </span>
                    ) : (
                      <Link
                        to={`/student/exam/${exam.id}`}
                        className="px-4 py-1.5 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white font-semibold text-xs flex items-center gap-1.5 shadow-sm shadow-blue-500/20 transition cursor-pointer"
                      >
                        <span>Start Proctored Exam</span>
                        <ArrowRight className="w-3.5 h-3.5" />
                      </Link>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Recent Published Results */}
      {results.length > 0 && (
        <div className="bg-white border border-slate-200/80 rounded-3xl p-6 shadow-xs">
          <h2 className="text-base font-bold text-slate-900 mb-4">Latest Published Scorecards</h2>
          <div className="space-y-3">
            {results.map((res) => (
              <div
                key={res.id}
                className="p-4 rounded-xl bg-slate-50 border border-slate-200 flex items-center justify-between"
              >
                <div>
                  <h4 className="text-sm font-bold text-slate-900">{res.exam_title}</h4>
                  <p className="text-xs text-slate-500">{res.subject}</p>
                </div>
                <div className="flex items-center gap-4 text-right">
                  <div>
                    <div className="text-sm font-bold text-slate-900">
                      {res.obtained_marks} / {res.total_marks} ({res.percentage}%)
                    </div>
                    <span
                      className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                        res.is_passed
                          ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                          : 'bg-rose-50 text-rose-700 border border-rose-200'
                      }`}
                    >
                      {res.is_passed ? 'PASSED' : 'NEEDS IMPROVEMENT'}
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
