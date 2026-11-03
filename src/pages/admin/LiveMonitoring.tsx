import React, { useState, useEffect } from 'react';
import { api } from '../../services/api';
import type { ExamAttempt } from '../../types';
import {
  Radio,
  ShieldAlert,
  PauseCircle,
  PlayCircle,
  StopCircle,
  Clock,
  Eye,
  AlertTriangle,
  RefreshCw,
  Search,
  CheckCircle2,
  Lock,
  X,
  Shield,
  Activity,
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

export const LiveMonitoring: React.FC = () => {
  const [attempts, setAttempts] = useState<ExamAttempt[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');

  // Modals
  const [selectedAttempt, setSelectedAttempt] = useState<ExamAttempt | null>(null);
  const [warningModalOpen, setWarningModalOpen] = useState(false);
  const [warningMessage, setWarningMessage] = useState('Proctor Warning: Tab switching and secondary screen usage is strictly prohibited.');

  const [holdModalOpen, setHoldModalOpen] = useState(false);
  const [holdDurationSec, setHoldDurationSec] = useState<number>(60);
  const [holdReason, setHoldReason] = useState('Proctor temporary hold for identity check and ambient verification.');

  const [terminateModalOpen, setTerminateModalOpen] = useState(false);
  const [terminateReason, setTerminateReason] = useState('');

  const [isProcessing, setIsProcessing] = useState(false);

  useEffect(() => {
    loadMonitoring();

    // SSE Stream
    const token = localStorage.getItem('exampro_token') || '';
    const eventSource = new EventSource(`/api/admin/monitoring/stream?token=${encodeURIComponent(token)}`);
    eventSource.addEventListener('security_event', () => {
      loadMonitoring();
    });

    // Also poll every 3 seconds for countdown sync
    const interval = setInterval(() => {
      loadMonitoring();
    }, 3000);

    return () => {
      eventSource.close();
      clearInterval(interval);
    };
  }, []);

  const loadMonitoring = async () => {
    try {
      const res = await api.admin.getMonitoring();
      setAttempts(res.attempts || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleSendWarning = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedAttempt) return;
    setIsProcessing(true);
    try {
      await api.admin.sendWarning(selectedAttempt.id, warningMessage);
      setWarningModalOpen(false);
      await loadMonitoring();
    } catch (err: any) {
      alert(err.message || 'Warning dispatch failed');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleHold = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedAttempt) return;
    setIsProcessing(true);
    try {
      await api.admin.holdAttempt(selectedAttempt.id, holdDurationSec, holdReason);
      setHoldModalOpen(false);
      await loadMonitoring();
    } catch (err: any) {
      alert(err.message || 'Hold failed');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleResume = async (attemptId: string) => {
    setIsProcessing(true);
    try {
      await api.admin.resumeAttempt(attemptId);
      await loadMonitoring();
    } catch (err: any) {
      alert(err.message || 'Resume failed');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleTerminate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedAttempt || !terminateReason.trim()) return;
    setIsProcessing(true);
    try {
      await api.admin.terminateAttempt(selectedAttempt.id, terminateReason.trim());
      setTerminateModalOpen(false);
      setTerminateReason('');
      await loadMonitoring();
    } catch (err: any) {
      alert(err.message || 'Termination failed');
    } finally {
      setIsProcessing(false);
    }
  };

  const formatTimer = (seconds?: number) => {
    if (typeof seconds !== 'number' || seconds <= 0) return '00:00';
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  const filteredAttempts = attempts.filter((att) => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    return (
      att.student_name?.toLowerCase().includes(q) ||
      att.college_student_id?.toLowerCase().includes(q) ||
      att.exam_title?.toLowerCase().includes(q)
    );
  });

  return (
    <div className="space-y-6">
      {/* Title & Live Status Radar Banner */}
      <div className="relative overflow-hidden bg-white border border-slate-200/80 rounded-3xl p-6 sm:p-8 shadow-xs">
        <div className="absolute top-0 right-0 w-80 h-80 bg-gradient-to-bl from-rose-500/10 via-amber-500/5 to-transparent rounded-full blur-3xl pointer-events-none" />
        <div className="relative z-10 flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
          <div className="space-y-2">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-rose-50 border border-rose-200 text-rose-700 text-xs font-semibold">
              <span className="w-2 h-2 rounded-full bg-rose-500 animate-ping" />
              <span>Live Proctoring Radar Active</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
              Live Anti-Cheating & Proctor Monitoring Station
            </h1>
            <p className="text-sm text-slate-600 max-w-2xl leading-relaxed">
              Real-time feed tracking candidate focus, window switches, fullscreen exits, remote hold lockouts, and permanent disqualifications.
            </p>
          </div>

          <button
            onClick={loadMonitoring}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-white hover:bg-slate-50 text-slate-700 text-xs font-semibold border border-slate-200 shadow-xs transition cursor-pointer"
          >
            <RefreshCw className="w-3.5 h-3.5" /> Refresh Stream
          </button>
        </div>
      </div>

      {/* Search Input */}
      <div className="relative">
        <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-3.5" />
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Filter active candidates by student name, roll ID, or exam..."
          className="w-full bg-white border border-slate-200/90 focus:border-rose-500 focus:ring-4 focus:ring-rose-500/10 rounded-xl pl-10 pr-4 py-2.5 text-xs text-slate-900 placeholder-slate-400 shadow-xs outline-none transition"
        />
      </div>

      {/* Monitoring Grid Table */}
      <div className="bg-white border border-slate-200/80 rounded-2xl overflow-hidden shadow-xs">
        {loading ? (
          <div className="p-12 text-center text-slate-400 text-xs">
            <div className="w-6 h-6 border-2 border-rose-500 border-t-transparent rounded-full animate-spin mx-auto mb-2" />
            Establishing proctor streaming feed...
          </div>
        ) : filteredAttempts.length === 0 ? (
          <div className="p-16 text-center text-slate-500 text-xs space-y-2">
            <CheckCircle2 className="w-10 h-10 text-slate-300 mx-auto" />
            <p className="font-semibold text-slate-700">No active examination sessions running right now.</p>
            <p className="text-[11px] text-slate-400 max-w-md mx-auto">
              When a verified student clicks &ldquo;Start Proctored Exam&rdquo;, their real-time telemetry will appear here instantly.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-slate-600">
              <thead className="bg-slate-50 border-b border-slate-200 text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                <tr>
                  <th className="py-3 px-4">Candidate</th>
                  <th className="py-3 px-4">Roll ID</th>
                  <th className="py-3 px-4">Exam Module</th>
                  <th className="py-3 px-4">Timer Remaining</th>
                  <th className="py-3 px-4">Infractions (Tab/Exit)</th>
                  <th className="py-3 px-4">Session Status</th>
                  <th className="py-3 px-4 text-right">Proctor Controls</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredAttempts.map((att) => {
                  const isHeld = att.status === 'held';
                  const isSubmitted = att.status === 'submitted';
                  const isTerminated = att.status === 'terminated';

                  return (
                    <tr
                      key={att.id}
                      className={`hover:bg-slate-50/80 transition-colors ${
                        isHeld ? 'bg-amber-50/40' : isTerminated ? 'bg-rose-50/40' : ''
                      }`}
                    >
                      <td className="py-3.5 px-4">
                        <div className="font-bold text-slate-900">{att.student_name}</div>
                        <div className="text-[11px] text-slate-400">{att.student_email}</div>
                      </td>
                      <td className="py-3.5 px-4 font-mono font-semibold text-slate-800">
                        {att.college_student_id || 'CS-2026-8819'}
                      </td>
                      <td className="py-3.5 px-4">
                        <div className="text-slate-900 font-semibold">{att.exam_title}</div>
                      </td>
                      <td className="py-3.5 px-4 font-mono font-bold">
                        <span
                          className={
                            (att.remainingSeconds || 0) < 300
                              ? 'text-rose-600 animate-pulse font-extrabold'
                              : 'text-emerald-600'
                          }
                        >
                          {formatTimer(att.remainingSeconds)}
                        </span>
                      </td>
                      <td className="py-3.5 px-4">
                        <div className="flex items-center gap-2">
                          <span
                            className={`px-2 py-0.5 rounded-full font-bold text-[10px] ${
                              att.warning_count > 0
                                ? 'bg-amber-50 text-amber-700 border border-amber-200'
                                : 'bg-slate-100 text-slate-500'
                            }`}
                          >
                            {att.warning_count} Warnings
                          </span>
                          <span className="text-[11px] text-slate-400">
                            (Tabs: {att.tab_switch_count || 0}, Exits: {att.fullscreen_exit_count || 0})
                          </span>
                        </div>
                      </td>
                      <td className="py-3.5 px-4">
                        <span
                          className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase ${
                            att.status === 'in_progress'
                              ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                              : att.status === 'held'
                              ? 'bg-amber-50 text-amber-700 border border-amber-200 animate-pulse'
                              : att.status === 'submitted'
                              ? 'bg-blue-50 text-blue-700 border border-blue-200'
                              : 'bg-rose-50 text-rose-700 border border-rose-200'
                          }`}
                        >
                          {att.status}
                        </span>
                      </td>
                      <td className="py-3.5 px-4 text-right">
                        {!isSubmitted && !isTerminated ? (
                          <div className="flex items-center justify-end gap-1.5">
                            {/* WARNING BUTTON */}
                            <button
                              onClick={() => {
                                setSelectedAttempt(att);
                                setWarningModalOpen(true);
                              }}
                              className="px-2.5 py-1 rounded-lg bg-amber-50 hover:bg-amber-100 text-amber-700 border border-amber-200 font-semibold text-[11px] transition cursor-pointer"
                            >
                              Warning
                            </button>

                            {/* HOLD / RESUME BUTTON */}
                            {isHeld ? (
                              <button
                                onClick={() => handleResume(att.id)}
                                disabled={isProcessing}
                                className="px-2.5 py-1 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-[11px] transition shadow-xs cursor-pointer"
                              >
                                Resume
                              </button>
                            ) : (
                              <button
                                onClick={() => {
                                  setSelectedAttempt(att);
                                  setHoldModalOpen(true);
                                }}
                                className="px-2.5 py-1 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-200 font-semibold text-[11px] transition cursor-pointer"
                              >
                                Hold
                              </button>
                            )}

                            {/* TERMINATE BUTTON */}
                            <button
                              onClick={() => {
                                setSelectedAttempt(att);
                                setTerminateModalOpen(true);
                              }}
                              className="px-2.5 py-1 rounded-lg bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 font-semibold text-[11px] transition cursor-pointer"
                            >
                              Terminate
                            </button>
                          </div>
                        ) : (
                          <span className="text-slate-400 text-[11px]">Concluded</span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* WARNING MODAL */}
      <AnimatePresence>
        {warningModalOpen && selectedAttempt && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-xs">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white border border-slate-200 rounded-3xl max-w-md w-full p-6 shadow-2xl space-y-4"
            >
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-amber-50 text-amber-600 border border-amber-200 flex items-center justify-center shrink-0">
                  <ShieldAlert className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-900">Issue Proctor Warning</h3>
                  <p className="text-xs text-slate-500">Recipient: {selectedAttempt.student_name}</p>
                </div>
              </div>

              <form onSubmit={handleSendWarning} className="space-y-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Warning Notification Text
                  </label>
                  <textarea
                    rows={3}
                    required
                    value={warningMessage}
                    onChange={(e) => setWarningMessage(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 focus:bg-white focus:border-amber-500 focus:ring-3 focus:ring-amber-500/10 rounded-xl p-3 text-xs text-slate-900 outline-none transition"
                  />
                </div>

                <div className="flex justify-end gap-2.5 pt-2">
                  <button
                    type="button"
                    onClick={() => setWarningModalOpen(false)}
                    className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 hover:text-slate-900 hover:bg-slate-100 cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={isProcessing}
                    className="px-5 py-2 rounded-xl bg-amber-500 hover:bg-amber-600 text-slate-950 font-bold text-xs transition shadow-sm cursor-pointer"
                  >
                    {isProcessing ? 'Dispatching...' : 'Send Warning Alert'}
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* HOLD MODAL */}
      <AnimatePresence>
        {holdModalOpen && selectedAttempt && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-xs">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white border border-slate-200 rounded-3xl max-w-md w-full p-6 shadow-2xl space-y-4"
            >
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-blue-50 text-blue-600 border border-blue-200 flex items-center justify-center shrink-0">
                  <PauseCircle className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-900">Place Exam on Hold</h3>
                  <p className="text-xs text-slate-500">Lock candidate screen temporarily: {selectedAttempt.student_name}</p>
                </div>
              </div>

              <form onSubmit={handleHold} className="space-y-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                    Hold Duration
                  </label>
                  <div className="grid grid-cols-4 gap-2 text-xs">
                    {[
                      { label: '30s', val: 30 },
                      { label: '1 min', val: 60 },
                      { label: '5 min', val: 300 },
                      { label: '10 min', val: 600 },
                    ].map((opt) => (
                      <button
                        type="button"
                        key={opt.val}
                        onClick={() => setHoldDurationSec(opt.val)}
                        className={`py-2 rounded-xl border font-semibold transition cursor-pointer ${
                          holdDurationSec === opt.val
                            ? 'bg-blue-600 border-blue-600 text-white shadow-xs'
                            : 'bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100'
                        }`}
                      >
                        {opt.label}
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Reason for Hold
                  </label>
                  <input
                    type="text"
                    required
                    value={holdReason}
                    onChange={(e) => setHoldReason(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 focus:bg-white focus:border-blue-500 focus:ring-3 focus:ring-blue-500/10 rounded-xl px-3 py-2 text-xs text-slate-900 outline-none transition"
                  />
                </div>

                <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 text-[11px] text-slate-600 space-y-1">
                  <div>&bull; Student questions will be temporarily hidden.</div>
                  <div>&bull; Existing answers remain safely preserved.</div>
                  <div>&bull; Exam countdown timer continues running.</div>
                </div>

                <div className="flex justify-end gap-2.5 pt-2">
                  <button
                    type="button"
                    onClick={() => setHoldModalOpen(false)}
                    className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 hover:text-slate-900 hover:bg-slate-100 cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={isProcessing}
                    className="px-5 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-semibold text-xs shadow-sm transition cursor-pointer"
                  >
                    {isProcessing ? 'Locking...' : 'Confirm Hold'}
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* TERMINATE MODAL */}
      <AnimatePresence>
        {terminateModalOpen && selectedAttempt && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-xs">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white border border-slate-200 rounded-3xl max-w-md w-full p-6 shadow-2xl space-y-4"
            >
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-rose-50 text-rose-600 border border-rose-200 flex items-center justify-center shrink-0">
                  <StopCircle className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-900">Permanently Terminate Attempt</h3>
                  <p className="text-xs text-slate-500">Candidate: {selectedAttempt.student_name}</p>
                </div>
              </div>

              <form onSubmit={handleTerminate} className="space-y-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                    Mandatory Disqualification Reason *
                  </label>
                  <textarea
                    rows={3}
                    required
                    value={terminateReason}
                    onChange={(e) => setTerminateReason(e.target.value)}
                    placeholder="e.g. Unsanctioned electronic devices observed; persistent tab switching after repeated proctor warnings..."
                    className="w-full bg-slate-50 border border-slate-200 focus:bg-white focus:border-rose-500 focus:ring-3 focus:ring-rose-500/10 rounded-xl p-3 text-xs text-slate-900 placeholder-slate-400 outline-none transition"
                  />
                </div>

                <div className="flex justify-end gap-2.5 pt-2">
                  <button
                    type="button"
                    onClick={() => setTerminateModalOpen(false)}
                    className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 hover:text-slate-900 hover:bg-slate-100 cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={isProcessing || !terminateReason.trim()}
                    className="px-5 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-semibold text-xs shadow-sm transition disabled:opacity-50 cursor-pointer"
                  >
                    {isProcessing ? 'Terminating...' : 'Disqualify & Conclude Exam'}
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};
