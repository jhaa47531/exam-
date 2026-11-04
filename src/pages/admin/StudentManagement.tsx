import React, { useState, useEffect } from 'react';
import { api } from '../../services/api';
import {
  Users,
  Search,
  Trash2,
  Archive,
  ShieldAlert,
  CheckCircle2,
  AlertCircle,
  Filter,
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { DeleteConfirmModal } from '../../components/common/DeleteConfirmModal';
import { useDatabaseConnection } from '../../context/DatabaseConnectionContext';

export const StudentManagement: React.FC = () => {
  const { isOperationsDisabled } = useDatabaseConnection();
  const [students, setStudents] = useState<any[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'archived'>('all');

  // Deletion modal state
  const [targetStudent, setTargetStudent] = useState<any | null>(null);
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const [bannerMessage, setBannerMessage] = useState<{ type: 'success' | 'info' | 'error'; text: string } | null>(null);

  useEffect(() => {
    loadStudents();
  }, []);

  const loadStudents = async () => {
    setLoading(true);
    try {
      const res = await api.admin.getStudents();
      setStudents(res.students || []);
    } catch (err: any) {
      console.error(err);
      setBannerMessage({ type: 'error', text: err.message || 'Failed to load student directory' });
    } finally {
      setLoading(false);
    }
  };

  const openDeleteModal = (student: any) => {
    setTargetStudent(student);
    setDeleteError(null);
    setDeleteModalOpen(true);
  };

  const handleConfirmDelete = async () => {
    if (!targetStudent) return;
    setIsDeleting(true);
    setDeleteError(null);

    try {
      const res = await api.admin.deleteStudent(targetStudent.id, { archive: false });
      setDeleteModalOpen(false);
      setTargetStudent(null);
      setBannerMessage({
        type: 'success',
        text: res.message || `Student candidate ${targetStudent.full_name} has been permanently deleted.`,
      });
      await loadStudents();
    } catch (err: any) {
      // If student has academic history, inform the admin and offer to archive
      setDeleteError(
        err.message ||
          'Failed to delete student. If the student has submitted examination attempts, select Archive to safely preserve audit history.'
      );
    } finally {
      setIsDeleting(false);
    }
  };

  const handleArchiveStudent = async () => {
    if (!targetStudent) return;
    setIsDeleting(true);
    setDeleteError(null);

    try {
      const res = await api.admin.deleteStudent(targetStudent.id, { archive: true });
      setDeleteModalOpen(false);
      setTargetStudent(null);
      setBannerMessage({
        type: 'info',
        text:
          res.message ||
          `Student candidate ${targetStudent.full_name} archived and deactivated. Examination history preserved.`,
      });
      await loadStudents();
    } catch (err: any) {
      setDeleteError(err.message || 'Failed to archive student record.');
    } finally {
      setIsDeleting(false);
    }
  };

  const filteredStudents = students.filter((s) => {
    if (statusFilter === 'active' && s.is_active === false) return false;
    if (statusFilter === 'archived' && s.is_active !== false) return false;

    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    return (
      s.full_name?.toLowerCase().includes(q) ||
      s.email?.toLowerCase().includes(q) ||
      s.enrollment?.college_student_id?.toLowerCase().includes(q) ||
      s.enrollment?.enrollment_number?.toLowerCase().includes(q)
    );
  });

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Student Roster Management</h1>
          <p className="text-xs text-slate-500 mt-1">
            Directory of candidate registrations, enrollment records, and ID verification status
          </p>
        </div>

        <div className="flex items-center gap-2">
          <div className="flex items-center bg-white border border-slate-200 rounded-xl p-1 shadow-xs text-xs">
            <button
              onClick={() => setStatusFilter('all')}
              className={`px-3 py-1.5 rounded-lg font-medium transition cursor-pointer ${
                statusFilter === 'all' ? 'bg-blue-600 text-white shadow-xs' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              All ({students.length})
            </button>
            <button
              onClick={() => setStatusFilter('active')}
              className={`px-3 py-1.5 rounded-lg font-medium transition cursor-pointer ${
                statusFilter === 'active' ? 'bg-blue-600 text-white shadow-xs' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Active ({students.filter((s) => s.is_active !== false).length})
            </button>
            <button
              onClick={() => setStatusFilter('archived')}
              className={`px-3 py-1.5 rounded-lg font-medium transition cursor-pointer ${
                statusFilter === 'archived' ? 'bg-blue-600 text-white shadow-xs' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Archived ({students.filter((s) => s.is_active === false).length})
            </button>
          </div>
        </div>
      </div>

      {bannerMessage && (
        <motion.div
          initial={{ opacity: 0, y: -6 }}
          animate={{ opacity: 1, y: 0 }}
          className={`p-4 rounded-2xl flex items-center justify-between gap-3 text-xs font-semibold shadow-xs ${
            bannerMessage.type === 'success'
              ? 'bg-emerald-50 border border-emerald-200 text-emerald-800'
              : bannerMessage.type === 'info'
              ? 'bg-blue-50 border border-blue-200 text-blue-800'
              : 'bg-rose-50 border border-rose-200 text-rose-800'
          }`}
        >
          <div className="flex items-center gap-2">
            {bannerMessage.type === 'success' ? (
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            ) : bannerMessage.type === 'info' ? (
              <Archive className="w-4 h-4 text-blue-600 shrink-0" />
            ) : (
              <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
            )}
            <span>{bannerMessage.text}</span>
          </div>
          <button
            onClick={() => setBannerMessage(null)}
            className="text-slate-400 hover:text-slate-700 text-xs font-bold cursor-pointer"
          >
            Dismiss
          </button>
        </motion.div>
      )}

      <div className="relative">
        <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-3.5" />
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Search by student name, roll ID, email, or enrollment number..."
          className="w-full bg-white border border-slate-200/90 focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 rounded-xl pl-10 pr-4 py-2.5 text-xs text-slate-900 placeholder-slate-400 shadow-xs outline-none transition"
        />
      </div>

      <div className="bg-white border border-slate-200/80 rounded-2xl overflow-hidden shadow-xs">
        {loading ? (
          <div className="p-16 text-center text-slate-400 text-xs">
            <div className="w-6 h-6 border-2 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-2" />
            Loading student records...
          </div>
        ) : filteredStudents.length === 0 ? (
          <div className="p-16 text-center text-slate-400 text-xs">No student candidates found.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-slate-600">
              <thead className="bg-slate-50 border-b border-slate-200 text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                <tr>
                  <th className="py-3 px-4">Candidate Name</th>
                  <th className="py-3 px-4">College Roll ID</th>
                  <th className="py-3 px-4">Enrollment No</th>
                  <th className="py-3 px-4">Program & Term</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4">Contact</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredStudents.map((student) => {
                  const status = student.verification_status;
                  const isArchived = student.is_active === false;

                  return (
                    <tr key={student.id} className="hover:bg-slate-50/80 transition-colors">
                      <td className="py-3.5 px-4">
                        <div className="flex items-center gap-2">
                          <div>
                            <div className="font-bold text-slate-900 flex items-center gap-1.5">
                              {student.full_name}
                              {isArchived && (
                                <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-slate-100 text-slate-600 border border-slate-200">
                                  Archived
                                </span>
                              )}
                            </div>
                            <div className="text-[11px] text-slate-400">{student.email}</div>
                          </div>
                        </div>
                      </td>
                      <td className="py-3.5 px-4 font-mono font-semibold text-slate-800">
                        {student.enrollment?.college_student_id || 'N/A'}
                      </td>
                      <td className="py-3.5 px-4 font-mono text-slate-500">
                        {student.enrollment?.enrollment_number || 'N/A'}
                      </td>
                      <td className="py-3.5 px-4">
                        <div className="font-semibold text-slate-900">{student.course_name}</div>
                        <div className="text-[11px] text-slate-400">{student.semester_name}</div>
                      </td>
                      <td className="py-3.5 px-4">
                        <span
                          className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase ${
                            status === 'approved'
                              ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                              : status === 'pending'
                              ? 'bg-amber-50 text-amber-700 border border-amber-200'
                              : 'bg-rose-50 text-rose-700 border border-rose-200'
                          }`}
                        >
                          {status}
                        </span>
                      </td>
                      <td className="py-3.5 px-4 text-slate-500">{student.phone || 'N/A'}</td>
                      <td className="py-3.5 px-4 text-right">
                        <button
                          onClick={() => openDeleteModal(student)}
                          disabled={isOperationsDisabled}
                          title={isOperationsDisabled ? 'Disabled: Database unavailable' : 'Delete or Archive Student'}
                          className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 border border-transparent hover:border-rose-200 transition cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Delete / Archive Confirmation Modal */}
      <DeleteConfirmModal
        isOpen={deleteModalOpen}
        title="Delete Candidate Record"
        message={`Are you sure you want to remove candidate record "${targetStudent?.full_name}" (${targetStudent?.email})?`}
        academicWarning="If this candidate has taken examinations, permanent deletion is prevented to safeguard the institutional audit trail. You can safely Archive the candidate to revoke portal access while preserving past exam results and answers."
        confirmText="Permanently Delete"
        archiveText="Archive & Revoke Access"
        isArchiveOptionAvailable={true}
        onConfirm={handleConfirmDelete}
        onArchive={handleArchiveStudent}
        onClose={() => {
          setDeleteModalOpen(false);
          setTargetStudent(null);
          setDeleteError(null);
        }}
        isLoading={isDeleting}
        error={deleteError}
      />
    </div>
  );
};
