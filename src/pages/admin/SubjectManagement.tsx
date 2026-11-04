import React, { useState, useEffect } from 'react';
import { api } from '../../services/api';
import type { Subject, Course, Semester } from '../../types';
import {
  BookMarked,
  PlusCircle,
  Trash2,
  CheckCircle2,
  AlertCircle,
  Search,
  BookOpen,
  CalendarDays,
  X,
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { DeleteConfirmModal } from '../../components/common/DeleteConfirmModal';

export const SubjectManagement: React.FC = () => {
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [courses, setCourses] = useState<Course[]>([]);
  const [semesters, setSemesters] = useState<Semester[]>([]);
  const [selectedCourseFilter, setSelectedCourseFilter] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(true);

  // Add Subject Modal
  const [showModal, setShowModal] = useState(false);
  const [code, setCode] = useState('');
  const [name, setName] = useState('');
  const [courseId, setCourseId] = useState('');
  const [semesterId, setSemesterId] = useState('');
  const [description, setDescription] = useState('');
  const [modalSemesters, setModalSemesters] = useState<Semester[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  // Deletion Modal
  const [targetSubject, setTargetSubject] = useState<Subject | null>(null);
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const [bannerMessage, setBannerMessage] = useState<{ type: 'success' | 'info' | 'error'; text: string } | null>(null);

  useEffect(() => {
    loadInitialData();
  }, []);

  const loadInitialData = async () => {
    setLoading(true);
    try {
      const [subjRes, courseRes] = await Promise.all([
        api.admin.getSubjects(),
        api.admin.getCourses(),
      ]);
      setSubjects(subjRes.subjects || []);
      setCourses(courseRes.courses || []);
      if (courseRes.courses && courseRes.courses.length > 0) {
        setCourseId(courseRes.courses[0].id);
      }
    } catch (err: any) {
      console.error(err);
      setBannerMessage({ type: 'error', text: err.message || 'Failed to load subject catalog' });
    } finally {
      setLoading(false);
    }
  };

  const loadSubjects = async () => {
    try {
      const params = selectedCourseFilter !== 'all' ? { course_id: selectedCourseFilter } : undefined;
      const res = await api.admin.getSubjects(params);
      setSubjects(res.subjects || []);
    } catch (err: any) {
      console.error(err);
    }
  };

  useEffect(() => {
    loadSubjects();
  }, [selectedCourseFilter]);

  useEffect(() => {
    if (!courseId) return;
    api.admin.getSemesters(courseId).then((res) => {
      setModalSemesters(res.semesters || []);
      if (res.semesters && res.semesters.length > 0) {
        setSemesterId(res.semesters[0].id);
      } else {
        setSemesterId('');
      }
    }).catch(console.error);
  }, [courseId]);

  const handleOpenAdd = () => {
    setCode('');
    setName('');
    setDescription('');
    setFormError(null);
    if (courses.length > 0 && !courseId) {
      setCourseId(courses[0].id);
    }
    setShowModal(true);
  };

  const handleAddSubject = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setFormError(null);

    try {
      await api.admin.createSubject({
        code: code.trim().toUpperCase(),
        name: name.trim(),
        course_id: courseId || undefined,
        semester_id: semesterId || undefined,
        description: description.trim(),
      });

      setShowModal(false);
      setBannerMessage({ type: 'success', text: `Subject "${code} - ${name}" added to catalog.` });
      await loadSubjects();
    } catch (err: any) {
      setFormError(err.message || 'Failed to create subject');
    } finally {
      setIsSubmitting(false);
    }
  };

  const openDeleteModal = (subj: Subject) => {
    setTargetSubject(subj);
    setDeleteError(null);
    setDeleteModalOpen(true);
  };

  const handleConfirmDelete = async (force: boolean = false) => {
    if (!targetSubject) return;
    setIsDeleting(true);
    setDeleteError(null);

    try {
      const res = await api.admin.deleteSubject(targetSubject.id, force);
      setDeleteModalOpen(false);
      setTargetSubject(null);
      setBannerMessage({
        type: 'success',
        text: res.message || `Subject "${targetSubject.code}" removed from catalog.`,
      });
      await loadSubjects();
    } catch (err: any) {
      setDeleteError(
        err.message ||
          'Cannot delete subject. If examinations reference this subject, click Force Remove or delete the examinations first.'
      );
    } finally {
      setIsDeleting(false);
    }
  };

  const filteredSubjects = subjects.filter((s) => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    return (
      s.code.toLowerCase().includes(q) ||
      s.name.toLowerCase().includes(q) ||
      (s.course_name && s.course_name.toLowerCase().includes(q))
    );
  });

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Academic Subject Catalog</h1>
          <p className="text-xs text-slate-500 mt-1">
            Subject syllabus curriculum mapped across program degrees and semester cohorts
          </p>
        </div>

        <button
          onClick={handleOpenAdd}
          className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white font-semibold text-xs shadow-md shadow-blue-500/20 transition cursor-pointer"
        >
          <PlusCircle className="w-4 h-4" />
          <span>Add New Subject</span>
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

      {/* Filter and Search Bar */}
      <div className="flex flex-col sm:flex-row items-center gap-3">
        <div className="relative flex-1 w-full">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-3.5" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search subjects by code, title, or program name..."
            className="w-full bg-white border border-slate-200/90 focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 rounded-xl pl-10 pr-4 py-2.5 text-xs text-slate-900 placeholder-slate-400 shadow-xs outline-none transition"
          />
        </div>

        <div className="flex items-center gap-2 shrink-0 w-full sm:w-auto">
          <label className="text-xs font-bold text-slate-500 uppercase">Program:</label>
          <select
            value={selectedCourseFilter}
            onChange={(e) => setSelectedCourseFilter(e.target.value)}
            className="bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs font-semibold text-slate-900 outline-none focus:border-blue-500 shadow-xs"
          >
            <option value="all">All Programs</option>
            {courses.map((c) => (
              <option key={c.id} value={c.id}>
                {c.code} – {c.name}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="bg-white border border-slate-200/80 rounded-2xl overflow-hidden shadow-xs">
        {loading ? (
          <div className="p-16 text-center text-slate-400 text-xs">
            <div className="w-6 h-6 border-2 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-2" />
            Loading subjects...
          </div>
        ) : filteredSubjects.length === 0 ? (
          <div className="p-16 text-center text-slate-400 text-xs">No academic subjects found in this catalog.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-slate-600">
              <thead className="bg-slate-50 border-b border-slate-200 text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                <tr>
                  <th className="py-3 px-4">Subject Code</th>
                  <th className="py-3 px-4">Title & Description</th>
                  <th className="py-3 px-4">Course Program</th>
                  <th className="py-3 px-4">Term</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredSubjects.map((subject) => (
                  <tr key={subject.id} className="hover:bg-slate-50/80 transition-colors">
                    <td className="py-3.5 px-4 font-mono font-bold text-blue-700">
                      <span className="px-2.5 py-1 rounded-md bg-blue-50 border border-blue-200">
                        {subject.code}
                      </span>
                    </td>
                    <td className="py-3.5 px-4">
                      <div className="font-bold text-slate-900">{subject.name}</div>
                      <div className="text-[11px] text-slate-400 line-clamp-1">
                        {subject.description || 'No description provided'}
                      </div>
                    </td>
                    <td className="py-3.5 px-4">
                      <span className="font-semibold text-slate-800">{subject.course_name || 'General'}</span>
                    </td>
                    <td className="py-3.5 px-4 font-medium text-slate-600">
                      {subject.semester_name || 'N/A'}
                    </td>
                    <td className="py-3.5 px-4">
                      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase bg-emerald-50 text-emerald-700 border border-emerald-200">
                        Active
                      </span>
                    </td>
                    <td className="py-3.5 px-4 text-right">
                      <button
                        onClick={() => openDeleteModal(subject)}
                        className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition cursor-pointer"
                        title="Delete Subject"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Add Subject Modal */}
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
                  <BookMarked className="w-4 h-4 text-blue-600" />
                  Add Subject to Catalog
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

              <form onSubmit={handleAddSubject} className="space-y-3.5">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Subject Code *</label>
                  <input
                    type="text"
                    required
                    value={code}
                    onChange={(e) => setCode(e.target.value.toUpperCase())}
                    placeholder="CS-201"
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-900 outline-none focus:bg-white focus:border-blue-500 font-mono font-bold"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Subject Title *</label>
                  <input
                    type="text"
                    required
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Database Management Systems"
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-900 outline-none focus:bg-white focus:border-blue-500 font-semibold"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">Program</label>
                    <select
                      value={courseId}
                      onChange={(e) => setCourseId(e.target.value)}
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-900 outline-none focus:bg-white focus:border-blue-500"
                    >
                      {courses.map((c) => (
                        <option key={c.id} value={c.id}>
                          {c.code}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">Semester Term</label>
                    <select
                      value={semesterId}
                      onChange={(e) => setSemesterId(e.target.value)}
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-900 outline-none focus:bg-white focus:border-blue-500"
                    >
                      {modalSemesters.map((s) => (
                        <option key={s.id} value={s.id}>
                          {s.name}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Syllabus Overview</label>
                  <textarea
                    rows={3}
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    placeholder="Relational data models, normalization, SQL queries, transaction management..."
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-900 outline-none focus:bg-white focus:border-blue-500 resize-none"
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
                    {isSubmitting ? 'Adding...' : 'Add Subject'}
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
        title="Delete Academic Subject"
        message={`Are you sure you want to remove subject "${targetSubject?.code} - ${targetSubject?.name}" from the curriculum?`}
        academicWarning="If examinations reference this subject, deleting it will remove it from future exam selections. If exams are already linked, confirm Force Delete below."
        confirmText="Delete Subject"
        archiveText="Force Remove"
        isArchiveOptionAvailable={Boolean(deleteError)}
        onConfirm={() => handleConfirmDelete(false)}
        onArchive={() => handleConfirmDelete(true)}
        onClose={() => {
          setDeleteModalOpen(false);
          setTargetSubject(null);
          setDeleteError(null);
        }}
        isLoading={isDeleting}
        error={deleteError}
      />
    </div>
  );
};
