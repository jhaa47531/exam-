import React, { useState, useEffect } from 'react';
import { api } from '../../services/api';
import type { Course } from '../../types';
import {
  BookOpen,
  PlusCircle,
  Trash2,
  Edit,
  CheckCircle2,
  XCircle,
  Users,
  X,
  Archive,
  AlertCircle,
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { DeleteConfirmModal } from '../../components/common/DeleteConfirmModal';

export const CourseManagement: React.FC = () => {
  const [courses, setCourses] = useState<Course[]>([]);
  const [loading, setLoading] = useState(true);

  // Create / Edit Modal
  const [showModal, setShowModal] = useState(false);
  const [editingCourse, setEditingCourse] = useState<Course | null>(null);
  const [code, setCode] = useState('');
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [isActive, setIsActive] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  // Deletion Modal
  const [targetCourse, setTargetCourse] = useState<Course | null>(null);
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const [bannerMessage, setBannerMessage] = useState<{ type: 'success' | 'info' | 'error'; text: string } | null>(null);

  useEffect(() => {
    loadCourses();
  }, []);

  const loadCourses = async () => {
    setLoading(true);
    try {
      const res = await api.admin.getCourses();
      setCourses(res.courses || []);
    } catch (err: any) {
      console.error(err);
      setBannerMessage({ type: 'error', text: err.message || 'Failed to load course programs' });
    } finally {
      setLoading(false);
    }
  };

  const handleOpenCreate = () => {
    setEditingCourse(null);
    setCode('');
    setName('');
    setDescription('');
    setIsActive(true);
    setFormError(null);
    setShowModal(true);
  };

  const handleOpenEdit = (course: Course) => {
    setEditingCourse(course);
    setCode(course.code);
    setName(course.name);
    setDescription(course.description || '');
    setIsActive(course.is_active);
    setFormError(null);
    setShowModal(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setFormError(null);
    try {
      if (editingCourse) {
        await api.admin.updateCourse(editingCourse.id, {
          code,
          name,
          description,
          is_active: isActive,
        });
        setBannerMessage({ type: 'success', text: `Course ${code} updated successfully.` });
      } else {
        await api.admin.createCourse({
          code,
          name,
          description,
          is_active: isActive,
        });
        setBannerMessage({ type: 'success', text: `Course ${code} created successfully.` });
      }
      setShowModal(false);
      await loadCourses();
    } catch (err: any) {
      setFormError(err.message || 'Operation failed');
    } finally {
      setIsSubmitting(false);
    }
  };

  const openDeleteModal = (course: Course) => {
    setTargetCourse(course);
    setDeleteError(null);
    setDeleteModalOpen(true);
  };

  const handleConfirmDelete = async () => {
    if (!targetCourse) return;
    setIsDeleting(true);
    setDeleteError(null);

    try {
      const res = await api.admin.deleteCourse(targetCourse.id, { archive: false });
      setDeleteModalOpen(false);
      setTargetCourse(null);
      setBannerMessage({
        type: 'success',
        text: res.message || `Course program ${targetCourse.code} deleted successfully.`,
      });
      await loadCourses();
    } catch (err: any) {
      setDeleteError(
        err.message ||
          'Cannot permanently delete this course program. If candidates are enrolled, choose Archive Course to deactivate it safely without breaking student enrollments.'
      );
    } finally {
      setIsDeleting(false);
    }
  };

  const handleArchiveCourse = async () => {
    if (!targetCourse) return;
    setIsDeleting(true);
    setDeleteError(null);

    try {
      const res = await api.admin.deleteCourse(targetCourse.id, { archive: true });
      setDeleteModalOpen(false);
      setTargetCourse(null);
      setBannerMessage({
        type: 'info',
        text: res.message || `Course program ${targetCourse.code} archived successfully.`,
      });
      await loadCourses();
    } catch (err: any) {
      setDeleteError(err.message || 'Failed to archive course program.');
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Course Program Management</h1>
          <p className="text-xs text-slate-500 mt-1">
            Configure academic programs (BCA, MCA, BBA, BCom) and assigned cohorts
          </p>
        </div>

        <button
          onClick={handleOpenCreate}
          className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white font-semibold text-xs shadow-md shadow-blue-500/20 transition cursor-pointer"
        >
          <PlusCircle className="w-4 h-4" />
          <span>Add New Course</span>
        </button>
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

      {loading ? (
        <div className="p-16 text-center text-slate-400 text-xs">
          <div className="w-6 h-6 border-2 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-2" />
          Loading course programs...
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {courses.map((course) => (
            <motion.div
              key={course.id}
              whileHover={{ y: -3 }}
              transition={{ duration: 0.15 }}
              className="p-5 rounded-2xl bg-white border border-slate-200/80 hover:border-blue-400 hover:shadow-md transition-all flex flex-col justify-between space-y-4"
            >
              <div className="space-y-2.5">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold uppercase tracking-wider px-2.5 py-1 rounded-full bg-blue-50 text-blue-700 border border-blue-200">
                    {course.code}
                  </span>
                  <span
                    className={`text-[10px] font-bold uppercase px-2.5 py-0.5 rounded-full ${
                      course.is_active
                        ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                        : 'bg-slate-100 text-slate-600 border border-slate-200'
                    }`}
                  >
                    {course.is_active ? 'Active' : 'Archived'}
                  </span>
                </div>

                <h3 className="text-base font-bold text-slate-900 leading-snug">{course.name}</h3>
                <p className="text-xs text-slate-500 line-clamp-2 leading-relaxed">
                  {course.description || 'No description provided'}
                </p>

                <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-xs text-slate-600">
                  <div className="flex items-center gap-1.5 text-slate-500 font-medium">
                    <Users className="w-3.5 h-3.5 text-blue-600" />
                    <span>
                      Enrolled Students: <strong className="text-slate-900">{course.studentCount || 0}</strong>
                    </span>
                  </div>
                  <div className="text-slate-500 font-medium">
                    Semesters: <strong className="text-slate-900">{course.semesters?.length || 2}</strong>
                  </div>
                </div>
              </div>

              <div className="pt-3 border-t border-slate-100 flex items-center justify-end gap-1.5">
                <button
                  onClick={() => handleOpenEdit(course)}
                  className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition cursor-pointer"
                  title="Edit Course"
                >
                  <Edit className="w-4 h-4" />
                </button>
                <button
                  onClick={() => openDeleteModal(course)}
                  className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition cursor-pointer"
                  title="Delete or Archive Course"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </motion.div>
          ))}
        </div>
      )}

      {/* Course Create/Edit Modal */}
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
                <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                  <BookOpen className="w-4 h-4 text-blue-600" />
                  {editingCourse ? 'Edit Course Program' : 'Create Course Program'}
                </h3>
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

              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Course Code (e.g., BCA, MCA, BBA)
                  </label>
                  <input
                    type="text"
                    required
                    value={code}
                    onChange={(e) => setCode(e.target.value.toUpperCase())}
                    placeholder="BCA"
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-900 outline-none focus:bg-white focus:border-blue-500 font-mono font-bold"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Program Full Title</label>
                  <input
                    type="text"
                    required
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Bachelor of Computer Applications"
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-900 outline-none focus:bg-white focus:border-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Description</label>
                  <textarea
                    rows={3}
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    placeholder="Three-year undergraduate program focusing on computer science, programming..."
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-900 outline-none focus:bg-white focus:border-blue-500 resize-none"
                  />
                </div>

                <div className="flex items-center gap-2 pt-1">
                  <input
                    type="checkbox"
                    id="isActiveCheckbox"
                    checked={isActive}
                    onChange={(e) => setIsActive(e.target.checked)}
                    className="rounded border-slate-300 text-blue-600 focus:ring-0 cursor-pointer"
                  />
                  <label htmlFor="isActiveCheckbox" className="text-xs font-semibold text-slate-700 cursor-pointer">
                    Course is active for candidate registration
                  </label>
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
                    {isSubmitting ? 'Saving...' : editingCourse ? 'Save Changes' : 'Create Program'}
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Delete / Archive Confirmation Modal */}
      <DeleteConfirmModal
        isOpen={deleteModalOpen}
        title="Delete Course Program"
        message={`Are you sure you want to delete "${targetCourse?.name}" (${targetCourse?.code})?`}
        academicWarning={
          targetCourse?.studentCount && targetCourse.studentCount > 0
            ? `There are currently ${targetCourse.studentCount} enrolled candidate(s) in this course. Permanent deletion is blocked to prevent breaking student profiles. Select Archive to safely deactivate this course.`
            : 'If student candidates are enrolled in this program, select Archive to preserve candidate enrollment links.'
        }
        confirmText="Permanently Delete"
        archiveText="Archive Course"
        isArchiveOptionAvailable={true}
        onConfirm={handleConfirmDelete}
        onArchive={handleArchiveCourse}
        onClose={() => {
          setDeleteModalOpen(false);
          setTargetCourse(null);
          setDeleteError(null);
        }}
        isLoading={isDeleting}
        error={deleteError}
      />
    </div>
  );
};
