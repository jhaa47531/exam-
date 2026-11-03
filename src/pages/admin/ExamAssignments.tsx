import React, { useState, useEffect } from 'react';
import { api } from '../../services/api';
import type { Exam } from '../../types';
import { UserPlus, BookOpen, CheckCircle2 } from 'lucide-react';
import { motion } from 'motion/react';

export const ExamAssignments: React.FC = () => {
  const [exams, setExams] = useState<Exam[]>([]);
  const [students, setStudents] = useState<any[]>([]);
  const [selectedExamId, setSelectedExamId] = useState('');
  const [selectedStudentIds, setSelectedStudentIds] = useState<Set<string>>(new Set());
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  useEffect(() => {
    Promise.all([api.admin.getExams(), api.admin.getStudents()]).then(([exRes, stRes]) => {
      setExams(exRes.exams || []);
      setStudents(stRes.students || []);
      if (exRes.exams && exRes.exams.length > 0) {
        setSelectedExamId(exRes.exams[0].id);
      }
    }).catch(console.error);
  }, []);

  const toggleStudent = (id: string) => {
    const next = new Set(selectedStudentIds);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    setSelectedStudentIds(next);
  };

  const handleAssign = async () => {
    if (!selectedExamId || selectedStudentIds.size === 0) {
      alert('Please select an exam and at least one student.');
      return;
    }

    setIsSubmitting(true);
    setSuccessMsg(null);
    try {
      const res = await api.admin.assignExam(selectedExamId, {
        student_ids: Array.from(selectedStudentIds),
        assignment_type: 'individual',
      });
      setSuccessMsg(`Successfully assigned ${res.newlyAssignedCount} students to this examination.`);
      setSelectedStudentIds(new Set());
    } catch (err: any) {
      alert(err.message || 'Assignment failed');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Exam Eligibility & Candidate Assignments</h1>
        <p className="text-xs text-slate-500 mt-1">Assign examinations to cohorts or individual student roll numbers</p>
      </div>

      {successMsg && (
        <motion.div
          initial={{ opacity: 0, y: -8 }}
          animate={{ opacity: 1, y: 0 }}
          className="p-3.5 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-semibold flex items-center gap-2 shadow-xs"
        >
          <CheckCircle2 className="w-4 h-4 text-emerald-600" />
          <span>{successMsg}</span>
        </motion.div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Left: Exam Selection */}
        <div className="bg-white border border-slate-200/80 rounded-2xl p-6 shadow-xs space-y-4">
          <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
            <BookOpen className="w-4 h-4 text-blue-600" />
            1. Select Examination
          </h3>

          <div className="space-y-2">
            {exams.map((ex) => (
              <button
                key={ex.id}
                type="button"
                onClick={() => setSelectedExamId(ex.id)}
                className={`w-full text-left p-3 rounded-xl border text-xs transition cursor-pointer ${
                  selectedExamId === ex.id
                    ? 'bg-blue-50 border-blue-400 text-blue-900 font-bold shadow-xs'
                    : 'bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100'
                }`}
              >
                <div className="font-bold">{ex.title}</div>
                <div className="text-[11px] text-slate-500 mt-0.5">{ex.subject} &bull; {ex.duration_minutes} Mins</div>
              </button>
            ))}
          </div>
        </div>

        {/* Right: Students Table */}
        <div className="md:col-span-2 bg-white border border-slate-200/80 rounded-2xl p-6 shadow-xs space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
              <UserPlus className="w-4 h-4 text-blue-600" />
              2. Select Students ({selectedStudentIds.size} selected)
            </h3>

            <button
              onClick={handleAssign}
              disabled={isSubmitting || selectedStudentIds.size === 0}
              className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-semibold text-xs shadow-sm transition disabled:opacity-50 cursor-pointer"
            >
              {isSubmitting ? 'Assigning...' : 'Assign Selected Candidates'}
            </button>
          </div>

          <div className="overflow-x-auto border border-slate-200 rounded-xl">
            <table className="w-full text-left text-xs text-slate-600">
              <thead className="bg-slate-50 text-[11px] font-bold text-slate-500 uppercase border-b border-slate-200">
                <tr>
                  <th className="py-2.5 px-3">Select</th>
                  <th className="py-2.5 px-3">Student Name</th>
                  <th className="py-2.5 px-3">Roll ID</th>
                  <th className="py-2.5 px-3">Program</th>
                  <th className="py-2.5 px-3">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {students.map((st) => (
                  <tr
                    key={st.id}
                    onClick={() => toggleStudent(st.id)}
                    className="hover:bg-slate-50/80 cursor-pointer transition"
                  >
                    <td className="py-2.5 px-3">
                      <input
                        type="checkbox"
                        checked={selectedStudentIds.has(st.id)}
                        onChange={() => {}}
                        className="rounded border-slate-300 text-blue-600 focus:ring-0 cursor-pointer"
                      />
                    </td>
                    <td className="py-2.5 px-3 font-bold text-slate-900">{st.full_name}</td>
                    <td className="py-2.5 px-3 font-mono font-semibold text-slate-800">{st.enrollment?.college_student_id || 'N/A'}</td>
                    <td className="py-2.5 px-3 font-medium text-slate-700">{st.course_name}</td>
                    <td className="py-2.5 px-3">
                      <span className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded-full ${
                        st.verification_status === 'approved'
                          ? 'text-emerald-700 bg-emerald-50 border border-emerald-200'
                          : 'text-amber-700 bg-amber-50 border border-amber-200'
                      }`}>
                        {st.verification_status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
};
