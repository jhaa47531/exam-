import React, { useState, useEffect } from 'react';
import { api } from '../../services/api';
import type { ExamResult } from '../../types';
import {
  Award,
  CheckCircle2,
  XCircle,
  Clock,
  Send,
  Edit,
  FileCheck2,
  Search,
  Filter,
  X,
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

export const ResultsManagement: React.FC = () => {
  const [results, setResults] = useState<ExamResult[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');

  // Grading Modal
  const [selectedResult, setSelectedResult] = useState<ExamResult | null>(null);
  const [writtenAnswers, setWrittenAnswers] = useState<any[]>([]);
  const [marksInput, setMarksInput] = useState<number>(0);
  const [feedbackInput, setFeedbackInput] = useState<string>('');
  const [gradingQuestionId, setGradingQuestionId] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    loadResults();
  }, []);

  const loadResults = async () => {
    setLoading(true);
    try {
      const res = await api.admin.getResults();
      setResults(res.results || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handlePublish = async (id: string) => {
    try {
      await api.admin.publishResult(id);
      await loadResults();
    } catch (err: any) {
      alert(err.message || 'Publish failed');
    }
  };

  const handleOpenGrading = async (result: ExamResult) => {
    setSelectedResult(result);
    // Fetch attempt questions and answers
    try {
      const attRes = await api.exam.getAttempt(result.attempt_id);
      const writtenList = (attRes.questions || [])
        .filter((q) => q.question_type === 'written')
        .map((q) => {
          const ans = attRes.answers?.find((a) => a.question_id === q.id);
          return {
            question: q,
            answer: ans,
          };
        });

      setWrittenAnswers(writtenList);
      if (writtenList.length > 0) {
        setGradingQuestionId(writtenList[0].question.id);
        setMarksInput(writtenList[0].answer?.marks_awarded || 0);
        setFeedbackInput(writtenList[0].answer?.feedback || '');
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleSaveGrade = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedResult || !gradingQuestionId) return;

    setIsSubmitting(true);
    try {
      await api.admin.gradeWrittenAnswer(selectedResult.attempt_id, gradingQuestionId, {
        marks_awarded: Number(marksInput),
        feedback: feedbackInput.trim(),
      });
      alert('Marks and feedback recorded successfully');
      setSelectedResult(null);
      await loadResults();
    } catch (err: any) {
      alert(err.message || 'Grading failed');
    } finally {
      setIsSubmitting(false);
    }
  };

  const filteredResults = results.filter((r) => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    return (
      r.student_name?.toLowerCase().includes(q) ||
      r.student_email?.toLowerCase().includes(q) ||
      r.exam_title?.toLowerCase().includes(q)
    );
  });

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Examination Results & Evaluation</h1>
          <p className="text-xs text-slate-500 mt-1">Automatic scorecard generation, written answer evaluation, and publication</p>
        </div>
      </div>

      <div className="relative">
        <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-3.5" />
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Search by student candidate or exam module..."
          className="w-full bg-white border border-slate-200/90 focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 rounded-xl pl-10 pr-4 py-2.5 text-xs text-slate-900 placeholder-slate-400 shadow-xs outline-none transition"
        />
      </div>

      {/* Results Table */}
      <div className="bg-white border border-slate-200/80 rounded-2xl overflow-hidden shadow-xs">
        {loading ? (
          <div className="p-16 text-center text-slate-400 text-xs">
            <div className="w-6 h-6 border-2 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-2" />
            Loading examination results...
          </div>
        ) : filteredResults.length === 0 ? (
          <div className="p-16 text-center text-slate-400 text-xs">No result records available yet.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-slate-600">
              <thead className="bg-slate-50 border-b border-slate-200 text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                <tr>
                  <th className="py-3 px-4">Student Candidate</th>
                  <th className="py-3 px-4">Exam Module</th>
                  <th className="py-3 px-4">Score Awarded</th>
                  <th className="py-3 px-4">Percentage</th>
                  <th className="py-3 px-4">Outcome</th>
                  <th className="py-3 px-4">Publication</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredResults.map((res) => (
                  <tr key={res.id} className="hover:bg-slate-50/80 transition-colors">
                    <td className="py-3.5 px-4">
                      <div className="font-bold text-slate-900">{res.student_name}</div>
                      <div className="text-[11px] text-slate-400">{res.student_email}</div>
                    </td>
                    <td className="py-3.5 px-4 font-semibold text-slate-800">{res.exam_title}</td>
                    <td className="py-3.5 px-4 font-mono font-bold text-slate-900">
                      {res.obtained_marks} / {res.total_marks}
                    </td>
                    <td className="py-3.5 px-4 font-mono font-bold text-blue-600">
                      {res.percentage}%
                    </td>
                    <td className="py-3.5 px-4">
                      <span
                        className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase ${
                          res.is_passed
                            ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                            : 'bg-rose-50 text-rose-700 border border-rose-200'
                        }`}
                      >
                        {res.is_passed ? 'PASSED' : 'FAILED'}
                      </span>
                    </td>
                    <td className="py-3.5 px-4">
                      <span
                        className={`text-[10px] font-bold uppercase px-2.5 py-0.5 rounded-full ${
                          res.status === 'published'
                            ? 'bg-teal-50 text-teal-700 border border-teal-200'
                            : 'bg-slate-100 text-slate-600 border border-slate-200'
                        }`}
                      >
                        {res.status}
                      </span>
                    </td>
                    <td className="py-3.5 px-4 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <button
                          onClick={() => handleOpenGrading(res)}
                          className="px-2.5 py-1 rounded-lg bg-blue-50 hover:bg-blue-100 text-blue-700 border border-blue-200 text-[11px] font-semibold transition cursor-pointer"
                        >
                          Grade / Review
                        </button>

                        {res.status !== 'published' && (
                          <button
                            onClick={() => handlePublish(res.id)}
                            className="px-2.5 py-1 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-[11px] font-semibold shadow-xs transition cursor-pointer"
                          >
                            Publish
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

      {/* MANUAL WRITTEN EVALUATION MODAL */}
      <AnimatePresence>
        {selectedResult && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-xs">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white border border-slate-200 rounded-3xl max-w-2xl w-full p-6 sm:p-8 shadow-2xl space-y-4 max-h-[90vh] overflow-y-auto custom-scrollbar"
            >
              <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                <div>
                  <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                    <Edit className="w-4 h-4 text-blue-600" />
                    Evaluate Written Answers
                  </h3>
                  <p className="text-xs text-slate-500">Candidate: {selectedResult.student_name}</p>
                </div>
                <button
                  onClick={() => setSelectedResult(null)}
                  className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-xl transition cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {writtenAnswers.length === 0 ? (
                <div className="p-8 text-center text-slate-400 text-xs">
                  This exam contained only automatically graded questions (MCQs & True/False).
                </div>
              ) : (
                <form onSubmit={handleSaveGrade} className="space-y-4">
                  {writtenAnswers.map((item, idx) => (
                    <div key={item.question.id} className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-2">
                      <div className="flex justify-between items-center text-xs">
                        <span className="font-bold text-slate-900">Written Question {idx + 1}</span>
                        <span className="text-emerald-700 font-bold">Max Marks: {item.question.marks}</span>
                      </div>

                      <p className="text-xs text-slate-700 font-medium">{item.question.question_text}</p>

                      <div className="p-3 rounded-lg bg-white border border-slate-200 text-xs text-slate-800">
                        <span className="text-slate-400 block text-[10px] uppercase font-bold mb-1">Candidate Answer:</span>
                        {item.answer?.written_answer || <span className="italic text-slate-400">Unanswered</span>}
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
                        <div>
                          <label className="block text-[11px] font-semibold text-slate-600 mb-1">Marks Awarded</label>
                          <input
                            type="number"
                            step={0.5}
                            min={0}
                            max={item.question.marks}
                            value={marksInput}
                            onChange={(e) => setMarksInput(Number(e.target.value))}
                            className="w-full bg-white border border-slate-200 rounded-lg px-2.5 py-1.5 text-xs text-slate-900 outline-none"
                          />
                        </div>

                        <div>
                          <label className="block text-[11px] font-semibold text-slate-600 mb-1">Proctor Feedback</label>
                          <input
                            type="text"
                            value={feedbackInput}
                            onChange={(e) => setFeedbackInput(e.target.value)}
                            placeholder="e.g. Good theoretical clarity"
                            className="w-full bg-white border border-slate-200 rounded-lg px-2.5 py-1.5 text-xs text-slate-900 outline-none"
                          />
                        </div>
                      </div>
                    </div>
                  ))}

                  <div className="flex justify-end gap-2.5 pt-2">
                    <button
                      type="button"
                      onClick={() => setSelectedResult(null)}
                      className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 hover:text-slate-900 hover:bg-slate-100 cursor-pointer"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      disabled={isSubmitting}
                      className="px-5 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-semibold text-xs shadow-sm transition cursor-pointer"
                    >
                      {isSubmitting ? 'Saving...' : 'Save Evaluated Score'}
                    </button>
                  </div>
                </form>
              )}
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};
