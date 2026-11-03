import React, { useState, useEffect } from 'react';
import { api } from '../../services/api';
import type { Course, Semester } from '../../types';
import { CalendarDays, PlusCircle, BookOpen, X, CheckCircle2 } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

export const SemesterManagement: React.FC = () => {
  const [courses, setCourses] = useState<Course[]>([]);
  const [selectedCourseId, setSelectedCourseId] = useState<string>('');
  const [semesters, setSemesters] = useState<Semester[]>([]);
  const [loading, setLoading] = useState(true);

  // Modal
  const [showModal, setShowModal] = useState(false);
  const [semesterNumber, setSemesterNumber] = useState<number>(1);
  const [name, setName] = useState('Semester I');
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    api.admin.getCourses().then((res) => {
      setCourses(res.courses || []);
      if (res.courses && res.courses.length > 0) {
        setSelectedCourseId(res.courses[0].id);
      }
    }).catch(console.error).finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    if (!selectedCourseId) return;
    api.admin.getSemesters(selectedCourseId).then((res) => {
      setSemesters(res.semesters || []);
    }).catch(console.error);
  }, [selectedCourseId]);

  const handleAddSemester = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedCourseId) return;
    setIsSubmitting(true);
    try {
      await api.admin.createSemester({
        course_id: selectedCourseId,
        semester_number: Number(semesterNumber),
        name: name.trim(),
        is_active: true,
      });
      setShowModal(false);
      const res = await api.admin.getSemesters(selectedCourseId);
      setSemesters(res.semesters || []);
    } catch (err: any) {
      alert(err.message || 'Failed to add semester');
    } finally {
      setIsSubmitting(false);
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
          onClick={() => setShowModal(true)}
          className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white font-semibold text-xs shadow-md shadow-blue-500/20 transition cursor-pointer"
        >
          <PlusCircle className="w-4 h-4" />
          <span>Add Semester</span>
        </button>
      </div>

      <div className="p-4 rounded-2xl bg-white border border-slate-200/80 shadow-xs flex items-center gap-3">
        <label className="text-xs font-bold uppercase text-slate-500 shrink-0">
          Select Program:
        </label>
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
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {semesters.map((sem) => (
          <motion.div
            key={sem.id}
            whileHover={{ y: -3 }}
            transition={{ duration: 0.15 }}
            className="p-5 rounded-2xl bg-white border border-slate-200/80 hover:border-blue-400 hover:shadow-md transition-all space-y-3"
          >
            <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-600 border border-blue-200 flex items-center justify-center font-bold text-sm">
              S{sem.semester_number}
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900">{sem.name}</h3>
              <p className="text-xs text-slate-500">Semester Number {sem.semester_number}</p>
            </div>
            <div className="text-[11px] text-emerald-700 font-bold flex items-center gap-1">
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
              Active for Examination
            </div>
          </motion.div>
        ))}
      </div>

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

              <form onSubmit={handleAddSemester} className="space-y-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Semester Number (1-12)
                  </label>
                  <input
                    type="number"
                    required
                    min={1}
                    max={12}
                    value={semesterNumber}
                    onChange={(e) => {
                      const num = Number(e.target.value);
                      setSemesterNumber(num);
                      setName(`Semester ${num}`);
                    }}
                    className="w-full bg-slate-50 border border-slate-200 focus:bg-white focus:border-blue-500 rounded-xl px-3 py-2 text-xs text-slate-900 outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Semester Name
                  </label>
                  <input
                    type="text"
                    required
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 focus:bg-white focus:border-blue-500 rounded-xl px-3 py-2 text-xs text-slate-900 outline-none"
                  />
                </div>

                <div className="flex justify-end gap-2.5 pt-3 border-t border-slate-100">
                  <button
                    type="button"
                    onClick={() => setShowModal(false)}
                    className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 hover:text-slate-900 hover:bg-slate-100 cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="px-5 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-semibold text-xs shadow-sm transition cursor-pointer"
                  >
                    {isSubmitting ? 'Saving...' : 'Add Semester'}
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
