import React, { useState, useEffect } from 'react';
import { api } from '../../services/api';
import type { Exam, Course, Semester } from '../../types';
import {
  FileSpreadsheet,
  PlusCircle,
  Clock,
  Calendar,
  BookOpen,
  Trash2,
  Edit,
  UserPlus,
  HelpCircle,
  CheckCircle2,
  AlertCircle,
  ExternalLink,
  X,
  Archive,
} from 'lucide-react';
import { Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'motion/react';
import { DeleteConfirmModal } from '../../components/common/DeleteConfirmModal';

export const ExamManagement: React.FC = () => {
  const [exams, setExams] = useState<Exam[]>([]);
  const [courses, setCourses] = useState<Course[]>([]);
  const [semesters, setSemesters] = useState<Semester[]>([]);
  const [loading, setLoading] = useState(true);

  // Deletion Modal
  const [targetExam, setTargetExam] = useState<Exam | null>(null);
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const [bannerMessage, setBannerMessage] = useState<{ type: 'success' | 'info' | 'error'; text: string } | null>(null);

  // Modal
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Form State
  const [title, setTitle] = useState('');
  const [subject, setSubject] = useState('');
  const [description, setDescription] = useState('');
  const [courseId, setCourseId] = useState('');
  const [semesterId, setSemesterId] = useState('');
  const [examDate, setExamDate] = useState(new Date().toISOString().split('T')[0]);
  const [startTime, setStartTime] = useState(new Date(Date.now() + 30 * 60 * 1000).toISOString().slice(0, 16));
  const [endTime, setEndTime] = useState(new Date(Date.now() + 180 * 60 * 1000).toISOString().slice(0, 16));
  const [durationMinutes, setDurationMinutes] = useState(60);
  const [passingMarks, setPassingMarks] = useState(8);
  const [negativeMarking, setNegativeMarking] = useState(false);
  const [negativeMarkValue, setNegativeMarkValue] = useState(0.5);
  const [resultReleaseSetting, setResultReleaseSetting] = useState<'immediate' | 'manual' | 'scheduled'>('immediate');
  const [lateEntryPolicyMinutes, setLateEntryPolicyMinutes] = useState(15);
  const [status, setStatus] = useState<'draft' | 'published'>('published');
  const [instructions, setInstructions] = useState('Standard university proctored examination rules apply.');

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      const [examsRes, coursesRes] = await Promise.all([
        api.admin.getExams(),
        api.admin.getCourses(),
      ]);
      setExams(examsRes.exams || []);
      setCourses(coursesRes.courses || []);
      if (coursesRes.courses && coursesRes.courses.length > 0) {
        setCourseId(coursesRes.courses[0].id);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!courseId) return;
    api.admin.getSemesters(courseId).then((res) => {
      setSemesters(res.semesters || []);
      if (res.semesters && res.semesters.length > 0) {
        setSemesterId(res.semesters[0].id);
      }
    }).catch(console.error);
  }, [courseId]);

  const handleCreateExam = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      await api.admin.createExam({
        title,
        subject,
        description,
        course_id: courseId,
        semester_id: semesterId,
        exam_date: examDate,
        start_time: new Date(startTime).toISOString(),
        end_time: new Date(endTime).toISOString(),
        duration_minutes: Number(durationMinutes),
        passing_marks: Number(passingMarks),
        negative_marking: negativeMarking,
        negative_mark_value: Number(negativeMarkValue),
        result_release_setting: resultReleaseSetting,
        late_entry_policy_minutes: Number(lateEntryPolicyMinutes),
        status,
        instructions,
        assignment_type: 'course_semester',
      });
      setShowCreateModal(false);
      resetForm();
      setBannerMessage({ type: 'success', text: `Examination "${title}" scheduled and published successfully.` });
      await loadData();
    } catch (err: any) {
      setBannerMessage({ type: 'error', text: err.message || 'Failed to create exam' });
    } finally {
      setIsSubmitting(false);
    }
  };

  const openDeleteModal = (exam: Exam) => {
    setTargetExam(exam);
    setDeleteError(null);
    setDeleteModalOpen(true);
  };

  const handleConfirmDelete = async () => {
    if (!targetExam) return;
    setIsDeleting(true);
    setDeleteError(null);

    try {
      const res = await api.admin.deleteExam(targetExam.id, { archive: false });
      setDeleteModalOpen(false);
      setTargetExam(null);
      setBannerMessage({
        type: 'success',
        text: res.message || `Examination "${targetExam.title}" deleted successfully.`,
      });
      await loadData();
    } catch (err: any) {
      setDeleteError(
        err.message ||
          'Failed to permanently delete exam. If candidates have attempted this examination, select Archive Exam to preserve student test submissions and scores.'
      );
    } finally {
      setIsDeleting(false);
    }
  };

  const handleArchiveExam = async () => {
    if (!targetExam) return;
    setIsDeleting(true);
    setDeleteError(null);

    try {
      const res = await api.admin.deleteExam(targetExam.id, { archive: true });
      setDeleteModalOpen(false);
      setTargetExam(null);
      setBannerMessage({
        type: 'info',
        text: res.message || `Examination "${targetExam.title}" cancelled and archived. Student scores preserved.`,
      });
      await loadData();
    } catch (err: any) {
      setDeleteError(err.message || 'Failed to archive exam.');
    } finally {
      setIsDeleting(false);
    }
  };

  const resetForm = () => {
    setTitle('');
    setSubject('');
    setDescription('');
    setDurationMinutes(60);
    setPassingMarks(8);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Examination Management</h1>
          <p className="text-xs text-slate-500 mt-1">Configure scheduled exams, common time windows, and eligibility rules</p>
        </div>

        <button
          onClick={() => setShowCreateModal(true)}
          className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white font-semibold text-xs shadow-md shadow-blue-500/20 transition cursor-pointer"
        >
          <PlusCircle className="w-4 h-4" />
          <span>Create New Exam</span>
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

      {/* Exams Grid */}
      {loading ? (
        <div className="p-16 text-center text-slate-400 text-xs">
          <div className="w-6 h-6 border-2 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-2" />
          Loading examinations...
        </div>
      ) : exams.length === 0 ? (
        <div className="p-16 text-center text-slate-400 text-xs bg-white rounded-2xl border border-slate-200">
          No examinations scheduled. Click &quot;Create New Exam&quot; to build your first proctored test.
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {exams.map((exam) => (
            <motion.div
              key={exam.id}
              whileHover={{ y: -3 }}
              transition={{ duration: 0.15 }}
              className="p-5 rounded-2xl bg-white border border-slate-200/80 hover:border-blue-400 hover:shadow-md transition-all flex flex-col justify-between space-y-4"
            >
              <div className="space-y-2.5">
                <div className="flex items-center justify-between gap-2">
                  <span className="text-[10px] font-bold uppercase tracking-wider px-2.5 py-0.5 rounded-full bg-blue-50 text-blue-700 border border-blue-200">
                    {exam.subject}
                  </span>
                  <span
                    className={`text-[10px] font-bold uppercase px-2.5 py-0.5 rounded-full ${
                      exam.status === 'published'
                        ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                        : 'bg-slate-100 text-slate-600 border border-slate-200'
                    }`}
                  >
                    {exam.status}
                  </span>
                </div>

                <h3 className="text-base font-bold text-slate-900 leading-snug">{exam.title}</h3>
                <p className="text-xs text-slate-500 line-clamp-2 leading-relaxed">
                  {exam.description || 'No description provided'}
                </p>

                <div className="pt-2 border-t border-slate-100 space-y-1.5 text-xs text-slate-600">
                  <div className="flex justify-between">
                    <span className="text-slate-400 font-medium">Program:</span>
                    <span className="font-semibold text-slate-800">{exam.course_code || 'BCA'} &bull; {exam.semester_name || 'Sem III'}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400 font-medium">Duration:</span>
                    <span className="font-semibold text-slate-800">{exam.duration_minutes} Mins</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400 font-medium">Total Marks:</span>
                    <span className="font-semibold text-slate-800">{exam.total_marks} Marks ({exam.questionsCount || 0} Questions)</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400 font-medium">Passing Cutoff:</span>
                    <span className="font-semibold text-emerald-600">{exam.passing_marks} Marks</span>
                  </div>
                </div>
              </div>

              <div className="pt-3 border-t border-slate-100 flex items-center justify-between">
                <Link
                  to={`/admin/questions?exam_id=${exam.id}`}
                  className="text-xs text-blue-600 hover:text-blue-700 font-semibold flex items-center gap-1.5"
                >
                  <HelpCircle className="w-3.5 h-3.5" />
                  <span>Questions ({exam.questionsCount || 0})</span>
                </Link>

                <div className="flex items-center gap-2">
                  <button
                    onClick={() => openDeleteModal(exam)}
                    className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition cursor-pointer"
                    title="Delete or Archive Exam"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      )}

      {/* CREATE EXAM MODAL */}
      <AnimatePresence>
        {showCreateModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-xs">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white border border-slate-200 rounded-3xl max-w-2xl w-full p-6 sm:p-8 shadow-2xl max-h-[90vh] overflow-y-auto custom-scrollbar"
            >
              <div className="flex items-center justify-between border-b border-slate-100 pb-3 mb-4">
                <h3 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                  <FileSpreadsheet className="w-5 h-5 text-blue-600" />
                  Create New Scheduled Examination
                </h3>
                <button
                  onClick={() => setShowCreateModal(false)}
                  className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-xl transition cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <form onSubmit={handleCreateExam} className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      Exam Title *
                    </label>
                    <input
                      type="text"
                      required
                      value={title}
                      onChange={(e) => setTitle(e.target.value)}
                      placeholder="e.g. Database Management Systems Mid-Term"
                      className="w-full bg-slate-50 border border-slate-200 focus:bg-white focus:border-blue-500 focus:ring-3 focus:ring-blue-500/10 rounded-xl px-3 py-2 text-xs text-slate-900 outline-none transition"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      Subject Code & Name *
                    </label>
                    <input
                      type="text"
                      required
                      value={subject}
                      onChange={(e) => setSubject(e.target.value)}
                      placeholder="e.g. BCA-301: DBMS"
                      className="w-full bg-slate-50 border border-slate-200 focus:bg-white focus:border-blue-500 focus:ring-3 focus:ring-blue-500/10 rounded-xl px-3 py-2 text-xs text-slate-900 outline-none transition"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Description / Syllabus
                  </label>
                  <textarea
                    rows={2}
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    placeholder="Relational algebra, normal forms, SQL subqueries, and ACID properties."
                    className="w-full bg-slate-50 border border-slate-200 focus:bg-white focus:border-blue-500 focus:ring-3 focus:ring-blue-500/10 rounded-xl p-3 text-xs text-slate-900 outline-none transition"
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      Course Program *
                    </label>
                    <select
                      value={courseId}
                      onChange={(e) => setCourseId(e.target.value)}
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-900 outline-none"
                    >
                      {courses.map((c) => (
                        <option key={c.id} value={c.id}>
                          {c.code} – {c.name}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      Semester *
                    </label>
                    <select
                      value={semesterId}
                      onChange={(e) => setSemesterId(e.target.value)}
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-900 outline-none"
                    >
                      {semesters.map((s) => (
                        <option key={s.id} value={s.id}>
                          {s.name} (Semester {s.semester_number})
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                {/* Timing */}
                <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200/90 space-y-3">
                  <span className="text-xs font-bold uppercase tracking-wider text-blue-700 block">
                    Common Scheduled Exam Window & Duration
                  </span>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <div>
                      <label className="block text-[11px] font-semibold text-slate-600 mb-1">Common Start Time *</label>
                      <input
                        type="datetime-local"
                        required
                        value={startTime}
                        onChange={(e) => setStartTime(e.target.value)}
                        className="w-full bg-white border border-slate-200 rounded-xl px-2.5 py-1.5 text-xs text-slate-900"
                      />
                    </div>

                    <div>
                      <label className="block text-[11px] font-semibold text-slate-600 mb-1">Common End Time *</label>
                      <input
                        type="datetime-local"
                        required
                        value={endTime}
                        onChange={(e) => setEndTime(e.target.value)}
                        className="w-full bg-white border border-slate-200 rounded-xl px-2.5 py-1.5 text-xs text-slate-900"
                      />
                    </div>

                    <div>
                      <label className="block text-[11px] font-semibold text-slate-600 mb-1">Duration (Minutes) *</label>
                      <input
                        type="number"
                        required
                        min={5}
                        max={360}
                        value={durationMinutes}
                        onChange={(e) => setDurationMinutes(Number(e.target.value))}
                        className="w-full bg-white border border-slate-200 rounded-xl px-2.5 py-1.5 text-xs text-slate-900"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2">
                    <div>
                      <label className="block text-[11px] font-semibold text-slate-600 mb-1">Passing Marks</label>
                      <input
                        type="number"
                        value={passingMarks}
                        onChange={(e) => setPassingMarks(Number(e.target.value))}
                        className="w-full bg-white border border-slate-200 rounded-xl px-2.5 py-1.5 text-xs text-slate-900"
                      />
                    </div>

                    <div>
                      <label className="block text-[11px] font-semibold text-slate-600 mb-1">Late Entry Window (Mins)</label>
                      <input
                        type="number"
                        value={lateEntryPolicyMinutes}
                        onChange={(e) => setLateEntryPolicyMinutes(Number(e.target.value))}
                        className="w-full bg-white border border-slate-200 rounded-xl px-2.5 py-1.5 text-xs text-slate-900"
                      />
                    </div>

                    <div>
                      <label className="block text-[11px] font-semibold text-slate-600 mb-1">Result Release Setting</label>
                      <select
                        value={resultReleaseSetting}
                        onChange={(e: any) => setResultReleaseSetting(e.target.value)}
                        className="w-full bg-white border border-slate-200 rounded-xl px-2.5 py-1.5 text-xs text-slate-900"
                      >
                        <option value="immediate">Immediate Auto-Release</option>
                        <option value="manual">Manual Admin Release</option>
                        <option value="scheduled">Scheduled After End</option>
                      </select>
                    </div>
                  </div>

                  <div className="flex items-center gap-4 pt-2">
                    <label className="flex items-center gap-2 cursor-pointer text-xs font-semibold text-slate-700">
                      <input
                        type="checkbox"
                        checked={negativeMarking}
                        onChange={(e) => setNegativeMarking(e.target.checked)}
                        className="rounded border-slate-300 text-blue-600 focus:ring-0"
                      />
                      <span>Enable Negative Marking</span>
                    </label>

                    {negativeMarking && (
                      <div className="flex items-center gap-2 text-xs">
                        <span className="text-slate-500">Deduction:</span>
                        <input
                          type="number"
                          step={0.25}
                          min={0}
                          value={negativeMarkValue}
                          onChange={(e) => setNegativeMarkValue(Number(e.target.value))}
                          className="w-20 bg-white border border-slate-200 rounded px-2 py-1 text-xs text-slate-900"
                        />
                      </div>
                    )}
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Examination Status
                  </label>
                  <div className="flex gap-4 text-xs text-slate-700">
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="radio"
                        name="status"
                        checked={status === 'published'}
                        onChange={() => setStatus('published')}
                      />
                      <span>Published (Visible to eligible enrolled students)</span>
                    </label>
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="radio"
                        name="status"
                        checked={status === 'draft'}
                        onChange={() => setStatus('draft')}
                      />
                      <span>Draft (Private)</span>
                    </label>
                  </div>
                </div>

                <div className="flex justify-end gap-2.5 pt-3 border-t border-slate-100">
                  <button
                    type="button"
                    onClick={() => setShowCreateModal(false)}
                    className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 hover:text-slate-900 hover:bg-slate-100 cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="px-5 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-semibold text-xs shadow-sm transition cursor-pointer"
                  >
                    {isSubmitting ? 'Saving...' : 'Create Scheduled Exam'}
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
        title="Delete Examination"
        message={`Are you sure you want to delete examination "${targetExam?.title}" (${targetExam?.subject})?`}
        academicWarning="If students have already started or submitted attempts for this examination, permanent deletion is blocked to prevent data loss. Select Archive Exam to safely cancel the exam while preserving candidate scores and answer submissions."
        confirmText="Permanently Delete"
        archiveText="Archive & Cancel Exam"
        isArchiveOptionAvailable={true}
        onConfirm={handleConfirmDelete}
        onArchive={handleArchiveExam}
        onClose={() => {
          setDeleteModalOpen(false);
          setTargetExam(null);
          setDeleteError(null);
        }}
        isLoading={isDeleting}
        error={deleteError}
      />
    </div>
  );
};
