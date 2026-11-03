import React, { useState, useEffect } from 'react';
import { api } from '../../services/api';
import type { StudentVerification as StudentVerificationRecord } from '../../types';
import {
  ShieldAlert,
  ShieldCheck,
  CheckCircle2,
  XCircle,
  Eye,
  Clock,
  AlertTriangle,
  Search,
  Filter,
  GraduationCap,
  FileText,
  User,
  X,
  ExternalLink,
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

export const StudentVerification: React.FC = () => {
  const [verifications, setVerifications] = useState<StudentVerificationRecord[]>([]);
  const [filterStatus, setFilterStatus] = useState<string>('pending');
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(true);

  // Modal states
  const [selectedVerification, setSelectedVerification] = useState<StudentVerificationRecord | null>(null);
  const [rejectReason, setRejectReason] = useState('');
  const [showRejectModal, setShowRejectModal] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);

  useEffect(() => {
    loadVerifications();
  }, []);

  const loadVerifications = async () => {
    setLoading(true);
    try {
      const res = await api.admin.getVerifications();
      setVerifications(res.verifications || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleApprove = async (id: string) => {
    setIsProcessing(true);
    try {
      await api.admin.approveVerification(id);
      await loadVerifications();
      setSelectedVerification(null);
    } catch (err: any) {
      console.error('Approval failed:', err);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleReject = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedVerification || !rejectReason.trim()) return;

    setIsProcessing(true);
    try {
      await api.admin.rejectVerification(selectedVerification.id, rejectReason.trim());
      setShowRejectModal(false);
      setSelectedVerification(null);
      setRejectReason('');
      await loadVerifications();
    } catch (err: any) {
      console.error('Rejection failed:', err);
    } finally {
      setIsProcessing(false);
    }
  };

  // Filter & Search
  const filteredList = verifications.filter((v) => {
    if (filterStatus !== 'all' && v.status !== filterStatus) return false;
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const matchName = v.student_name?.toLowerCase().includes(q);
      const matchEmail = v.student_email?.toLowerCase().includes(q);
      const matchRoll = v.college_student_id.toLowerCase().includes(q);
      const matchEnroll = v.enrollment_number.toLowerCase().includes(q);
      return matchName || matchEmail || matchRoll || matchEnroll;
    }
    return true;
  });

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Student Identity Card Verification</h1>
          <p className="text-xs text-slate-500 mt-1">Review official student ID cards before approving examination access</p>
        </div>

        {/* Tab Filters */}
        <div className="flex items-center gap-1 p-1 rounded-xl bg-slate-100 border border-slate-200/80 text-xs">
          {['pending', 'approved', 'rejected', 'all'].map((tab) => {
            const count = verifications.filter((v) => tab === 'all' || v.status === tab).length;
            const isActive = filterStatus === tab;
            return (
              <button
                key={tab}
                onClick={() => setFilterStatus(tab)}
                className={`px-3 py-1.5 rounded-lg capitalize font-semibold transition-all duration-150 cursor-pointer ${
                  isActive
                    ? 'bg-white text-blue-600 shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                {tab} ({count})
              </button>
            );
          })}
        </div>
      </div>

      {/* Search Bar */}
      <div className="relative">
        <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-3.5" />
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Search by student name, college roll ID, email, or enrollment number..."
          className="w-full bg-white border border-slate-200/90 focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 rounded-xl pl-10 pr-4 py-2.5 text-xs text-slate-900 placeholder-slate-400 shadow-xs transition outline-none"
        />
      </div>

      {/* Verifications Table */}
      <div className="bg-white border border-slate-200/80 rounded-2xl overflow-hidden shadow-xs">
        {loading ? (
          <div className="p-12 text-center text-slate-400 text-xs">
            <div className="w-6 h-6 border-2 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-2" />
            Loading verification queue...
          </div>
        ) : filteredList.length === 0 ? (
          <div className="p-12 text-center text-slate-400 text-xs">
            No verification requests found matching this filter.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-slate-600">
              <thead className="bg-slate-50 border-b border-slate-200 text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                <tr>
                  <th className="py-3 px-4">Student Candidate</th>
                  <th className="py-3 px-4">College Roll ID</th>
                  <th className="py-3 px-4">Enrollment No</th>
                  <th className="py-3 px-4">Course & Term</th>
                  <th className="py-3 px-4">ID Card Document</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredList.map((item) => (
                  <tr key={item.id} className="hover:bg-slate-50/80 transition-colors">
                    <td className="py-3.5 px-4">
                      <div className="font-bold text-slate-900">{item.student_name}</div>
                      <div className="text-[11px] text-slate-400">{item.student_email}</div>
                    </td>
                    <td className="py-3.5 px-4 font-mono font-semibold text-slate-800">
                      {item.college_student_id}
                    </td>
                    <td className="py-3.5 px-4 font-mono text-slate-500">
                      {item.enrollment_number}
                    </td>
                    <td className="py-3.5 px-4">
                      <div className="text-slate-900 font-semibold">{item.course_code || 'BCA'}</div>
                      <div className="text-[11px] text-slate-400">{item.semester_name || 'Semester III'}</div>
                    </td>
                    <td className="py-3.5 px-4">
                      {item.id_card_image_url ? (
                        <button
                          onClick={() => setSelectedVerification(item)}
                          className="inline-flex items-center gap-1.5 text-blue-600 hover:text-blue-700 font-semibold cursor-pointer"
                        >
                          <Eye className="w-3.5 h-3.5" /> View Photo
                        </button>
                      ) : (
                        <span className="text-slate-400">No document</span>
                      )}
                    </td>
                    <td className="py-3.5 px-4">
                      <span
                        className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase ${
                          item.status === 'approved'
                            ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                            : item.status === 'pending'
                            ? 'bg-amber-50 text-amber-700 border border-amber-200'
                            : 'bg-rose-50 text-rose-700 border border-rose-200'
                        }`}
                      >
                        {item.status}
                      </span>
                    </td>
                    <td className="py-3.5 px-4 text-right">
                      <div className="flex items-center justify-end gap-2">
                        {item.status !== 'approved' && (
                          <button
                            onClick={() => handleApprove(item.id)}
                            disabled={isProcessing}
                            className="px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-[11px] transition shadow-xs cursor-pointer"
                          >
                            Approve
                          </button>
                        )}
                        {item.status !== 'rejected' && (
                          <button
                            onClick={() => {
                              setSelectedVerification(item);
                              setShowRejectModal(true);
                            }}
                            disabled={isProcessing}
                            className="px-3 py-1.5 rounded-lg bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 font-semibold text-[11px] transition cursor-pointer"
                          >
                            Reject
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* ID CARD REVIEW MODAL */}
      <AnimatePresence>
        {selectedVerification && !showRejectModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-xs">
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 10 }}
              className="bg-white border border-slate-200 rounded-3xl max-w-2xl w-full p-6 sm:p-8 shadow-2xl space-y-6"
            >
              <div className="flex items-center justify-between border-b border-slate-100 pb-4">
                <div>
                  <h3 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                    <ShieldCheck className="w-5 h-5 text-blue-600" />
                    Review College ID Document
                  </h3>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Private storage document inspection for {selectedVerification.student_name}
                  </p>
                </div>
                <button
                  onClick={() => setSelectedVerification(null)}
                  className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-xl transition cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Candidate Details Summary */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs bg-slate-50 p-4 rounded-2xl border border-slate-200/80">
                <div>
                  <span className="text-slate-500 block text-[10px] font-medium">Student Name:</span>
                  <span className="font-bold text-slate-900">{selectedVerification.student_name}</span>
                </div>
                <div>
                  <span className="text-slate-500 block text-[10px] font-medium">Roll ID:</span>
                  <span className="font-mono font-bold text-blue-600">{selectedVerification.college_student_id}</span>
                </div>
                <div>
                  <span className="text-slate-500 block text-[10px] font-medium">Enrollment No:</span>
                  <span className="font-mono font-bold text-slate-800">{selectedVerification.enrollment_number}</span>
                </div>
                <div>
                  <span className="text-slate-500 block text-[10px] font-medium">Program:</span>
                  <span className="font-bold text-slate-900">{selectedVerification.course_code || 'BCA'}</span>
                </div>
              </div>

              {/* Document Image Display */}
              <div className="rounded-2xl overflow-hidden border border-slate-200 bg-slate-100 flex items-center justify-center p-3">
                <img
                  src={selectedVerification.id_card_image_url}
                  alt="College ID Document Preview"
                  className="max-h-80 w-auto object-contain rounded-xl shadow-md"
                />
              </div>

              {/* Action Buttons */}
              <div className="flex flex-wrap items-center justify-between gap-3 pt-2">
                <span className="text-xs text-slate-400">
                  Storage: <code className="text-slate-600 text-[11px] font-mono">college-id-cards/{selectedVerification.id_card_storage_path}</code>
                </span>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setShowRejectModal(true)}
                    className="px-4 py-2 rounded-xl bg-rose-50 text-rose-700 border border-rose-200 text-xs font-semibold hover:bg-rose-100 transition cursor-pointer"
                  >
                    Reject with Reason
                  </button>
                  <button
                    type="button"
                    onClick={() => handleApprove(selectedVerification.id)}
                    disabled={isProcessing}
                    className="px-5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold shadow-md shadow-emerald-600/20 transition cursor-pointer"
                  >
                    Confirm Approval
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* REJECT REASON MODAL */}
      <AnimatePresence>
        {showRejectModal && selectedVerification && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-xs">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white border border-slate-200 rounded-3xl max-w-md w-full p-6 shadow-2xl space-y-4"
            >
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-rose-50 text-rose-600 border border-rose-200 flex items-center justify-center shrink-0">
                  <AlertTriangle className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-900">Reject College ID Verification</h3>
                  <p className="text-xs text-slate-500">Specify reason to guide student in uploading a corrected ID.</p>
                </div>
              </div>

              <form onSubmit={handleReject} className="space-y-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                    Official Rejection Reason *
                  </label>
                  <textarea
                    rows={4}
                    required
                    value={rejectReason}
                    onChange={(e) => setRejectReason(e.target.value)}
                    placeholder="e.g. Photograph is blurred, semester date unreadable, or roll number does not match registrar records..."
                    className="w-full bg-slate-50 border border-slate-200 focus:bg-white focus:border-rose-500 focus:ring-3 focus:ring-rose-500/10 rounded-xl p-3 text-xs text-slate-900 placeholder-slate-400 outline-none transition"
                  />
                </div>

                <div className="flex justify-end gap-2.5 pt-2">
                  <button
                    type="button"
                    onClick={() => setShowRejectModal(false)}
                    className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 hover:text-slate-900 hover:bg-slate-100 cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={isProcessing || !rejectReason.trim()}
                    className="px-5 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-semibold text-xs transition disabled:opacity-50 shadow-sm cursor-pointer"
                  >
                    {isProcessing ? 'Recording...' : 'Confirm Rejection'}
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
