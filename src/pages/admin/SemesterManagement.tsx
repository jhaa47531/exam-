import React, { useState, useEffect } from 'react';
import { api } from '../../services/api';
import type { Course, Semester } from '../../types';
import {
  CalendarDays,
  PlusCircle,
  BookOpen,
  X,
  CheckCircle2,
  Trash2,
  AlertCircle,
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { DeleteConfirmModal } from '../../components/common/DeleteConfirmModal';

export const SemesterManagement: React.FC = () => {
  const [courses, setCourses] = useState<Course[]>([]);
  const [selectedCourseId, setSelectedCourseId] = useState<string>('');
  const [semesters, setSemesters] = useState<Semester[]>([]);
  const [loading, setLoading] = useState(true);

  // Add Semester Modal
  const [showModal, setShowModal] = useState(false);
  const [semesterNumber, setSemesterNumber] = useState<number>(1);
  const [name, setName] = useState('Semester I');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  // Deletion Modal
  const [targetSemester, setTargetSemester] = useState<Semester | null>(null);
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const [bannerMessage, setBannerMessage] = useState<{ type: 'success' | 'info' | 'error'; text: string } | null>(null);

  useEffect(() => {
    api.admin
      .getCourses()
      .then((res) => {
        setCourses(res.courses || []);
        if (res.courses && res.courses.length > 0) {
          setSelectedCourseId(res.courses[0].id);
        }
      })
      .catch((err) => {
        console.error(err);
        setBannerMessage({ type: 'error', text: err.message || 'Failed to load courses' });
      })
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    if (!selectedCourseId) return;
    loadSemesters(selectedCourseId);
  }, [selectedCourseId]);

  const loadSemesters = async (courseId: string) => {
    try {
      const res = await api.admin.getSemesters(courseId);
      setSemesters(res.semesters || []);
    } catch (err: any) {
      console.error(err);
      setBannerMessage({ type: 'error', text: err.message || 'Failed to load semesters' });
    }
  };

  const handleAddSemester = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedCourseId) return;
    setIsSubmitting(true);
    setFormError(null);
    try {
      await api.admin.createSemester({
        course_id: selectedCourseId,
        semester_number: Number(semesterNumber),
        name: name.trim(),
        is_active: true,
      });
      setShowModal(false);
      setBannerMessage({ type: 'success', text: `Semester ${name} created successfully.` });
      await loadSemesters(selectedCourseId);
    } catch (err: any) {
      setFormError(err.message || 'Failed to add semester');
    } finally {
      setIsSubmitting(false);
    }
  };

  const openDeleteModal = (semester: Semester) => {
    setTargetSemester(semester);
    setDeleteError(null);
    setDeleteModalOpen(true);
  };

  const handleConfirmDelete = async () => {
    if (!targetSemester) return;
    setIsDeleting(true);
    setDeleteError(null);

    try {
      const res = await api.admin.deleteSemester(targetSemester.id);
      setDeleteModalOpen(false);
      setTargetSemester(null);
      setBannerMessage({
        type: 'success',
        text: res.message || `Semester term "${targetSemester.name}" deleted successfully.`,
      });
      if (selectedCourseId) {
        await loadSemesters(selectedCourseId);
      }
    } catch (err: any) {
      setDeleteError(err.message || 'Cannot delete semester term.');
    } finally {
      setIsDeleting(false);
    }
  };

  const selectedCourse = courses.find((c) => c.id === selectedCourseId);

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Semester & Cohort Management</h1>
          <p className="text-xs text-slate-500 mt-1">Configure academic semesters and term progression for courses</p>
        </div>

        <button
          onClick={() => {
            setShowModal(true);
            setFormError(null);
            setSemesterNumber((semesters.length || 0) + 1);
            setName(`Semester ${(semesters.length || 0) + 1}`);
          }}
          className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white font-semibold text-xs shadow-md shadow-blue-500/20 transition cursor-pointer"
        >
          <PlusCircle className="w-4 h-4" />
          <span>Add Semester</span>
        </button>
      </div>

      {bannerMessage && (
        <motion.div
          initial={{ opacity: 0, y: -6 }}
          animate={{ opacity: 1, y: 0 }}
          className={`p-4 rounded-2xl flex items-center justify-between gap-3 text-xs font-semibold shadow-xs ${
            bannerMessage.type === 'success'
              ? 'bg-emerald-50 border border-emerald-200 text-emerald-800'
              : 'bg-rose-50 border border-rose-200 text-rose-800'
          }`}
        >
          <div className="flex items-center gap-2">
            {bannerMessage.type === 'success' ? (
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
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

      <div className="p-4 rounded-2xl bg-white border border-slate-200/80 shadow-xs flex items-center gap-3">
        <label className="text-xs font-bold uppercase text-slate-500 shrink-0">Select Program:</label>
        <select
          value={selectedCourseId}
          onChange={(e) => setSelectedCourseId(e.target.value)}
          className="bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-semibold text-slate-900 max-w-sm w-full outline-none focus:bg-white focus:border-blue-500"
        >
          {courses.map((c) => (
            <option key={c.id} value={c.id}>
              {c.code} – {c.name}
            </option>
          ))}
        </select>
      </div>

      {/* Semesters Grid */}
      {loading ? (
        <div className="p-16 text-center text-slate-400 text-xs">
          <div className="w-6 h-6 border-2 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-2" />
          Loading semesters...
        </div>
      ) : semesters.length === 0 ? (
        <div className="p-16 text-center text-slate-400 text-xs bg-white rounded-2xl border border-slate-200">
          No semesters configured for this program. Click &quot;Add Semester&quot; above.
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {semesters.map((sem) => (
            <motion.div
              key={sem.id}
              whileHover={{ y: -3 }}
              transition={{ duration: 0.15 }}
              className="p-5 rounded-2xl bg-white border border-slate-200/80 hover:border-blue-400 hover:shadow-md transition-all flex flex-col justify-between space-y-4"
            >
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-600 border border-blue-200 flex items-center justify-center font-bold text-sm">
                    S{sem.semester_number}
                  </div>
                  <button
                    onClick={() => openDeleteModal(sem)}
                    className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition cursor-pointer"
                    title="Delete Semester"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-900">{sem.name}</h3>
                  <p className="text-xs text-slate-500">Term {sem.semester_number}</p>
                </div>
              </div>
              <div className="pt-2 border-t border-slate-100 text-[11px] text-emerald-700 font-bold flex items-center gap-1">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                Active for Examination
              </div>
            </motion.div>
          ))}
        </div>
      )}

      {/* Add Semester Modal */}
      <AnimatePresence>
        {showModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-xs">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white border border-slate-200 rounded-3xl max-w-md w-full p-6 shadow-2xl space-y-4"
            >
              <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                <h3 className="text-base font-bold text-slate-900">Add Semester to {selectedCourse?.code}</h3>
                <button
                  onClick={() => setShowModal(false)}
                  className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-xl transition cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {formError && (
                <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs font-semibold">
                  {formError}
                </div>
              )}

              <form onSubmit={handleAddSemester} className="space-y-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Semester Number (1-12)</label>
                  <input
                    type="number"
                    min={1}
                    max={12}
                    required
                    value={semesterNumber}
                    onChange={(e) => setSemesterNumber(Number(e.target.value))}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-900 outline-none focus:bg-white focus:border-blue-500 font-semibold"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Display Title</label>
                  <input
                    type="text"
                    required
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="e.g. Semester III"
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-900 outline-none focus:bg-white focus:border-blue-500"
                  />
                </div>

                <div className="pt-3 border-t border-slate-100 flex items-center justify-end gap-2">
                  <button
                    type="button"
                    onClick={() => setShowModal(false)}
                    className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-xl transition cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="px-4 py-2 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-xl transition cursor-pointer shadow-sm disabled:opacity-50"
                  >
                    {isSubmitting ? 'Adding...' : 'Add Semester'}
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Delete Confirmation Modal */}
      <DeleteConfirmModal
        isOpen={deleteModalOpen}
        title="Delete Semester Term"
        message={`Are you sure you want to delete "${targetSemester?.name}" for ${selectedCourse?.code}?`}
        academicWarning="If there are active examinations scheduled for this term, deletion will be blocked to protect students scheduled to take the exam."
        confirmText="Delete Semester"
        isArchiveOptionAvailable={false}
        onConfirm={handleConfirmDelete}
        onClose={() => {
          setDeleteModalOpen(false);
          setTargetSemester(null);
          setDeleteError(null);
        }}
        isLoading={isDeleting}
        error={deleteError}
      />
    </div>
  );
};
