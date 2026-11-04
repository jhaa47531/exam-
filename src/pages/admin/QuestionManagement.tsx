import React, { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { api } from '../../services/api';
import type { Exam, Question } from '../../types';
import {
  HelpCircle,
  PlusCircle,
  Trash2,
  CheckCircle2,
  AlertCircle,
  BookOpen,
  Check,
  X,
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { DeleteConfirmModal } from '../../components/common/DeleteConfirmModal';

export const QuestionManagement: React.FC = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const [exams, setExams] = useState<Exam[]>([]);
  const [selectedExamId, setSelectedExamId] = useState<string>(searchParams.get('exam_id') || '');
  const [questions, setQuestions] = useState<Question[]>([]);
  const [loading, setLoading] = useState(true);

  // Deletion Modal
  const [targetQuestion, setTargetQuestion] = useState<Question | null>(null);
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const [bannerMessage, setBannerMessage] = useState<{ type: 'success' | 'info' | 'error'; text: string } | null>(null);

  // Add Question Modal
  const [showAddModal, setShowAddModal] = useState(false);
  const [questionText, setQuestionText] = useState('');
  const [questionType, setQuestionType] = useState<'mcq' | 'true_false' | 'written'>('mcq');
  const [marks, setMarks] = useState<number>(3);
  const [negativeMarks, setNegativeMarks] = useState<number>(0);
  const [explanation, setExplanation] = useState('');

  // Options for MCQ
  const [mcqOptions, setMcqOptions] = useState<Array<{ text: string; isCorrect: boolean }>>([
    { text: '', isCorrect: true },
    { text: '', isCorrect: false },
    { text: '', isCorrect: false },
    { text: '', isCorrect: false },
  ]);

  // Options for True/False
  const [tfCorrect, setTfCorrect] = useState<'True' | 'False'>('True');

  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    api.admin.getExams().then((res) => {
      setExams(res.exams || []);
      if (res.exams && res.exams.length > 0 && !selectedExamId) {
        setSelectedExamId(res.exams[0].id);
      }
    }).catch(console.error).finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    if (!selectedExamId) return;
    setSearchParams({ exam_id: selectedExamId });
    loadQuestions(selectedExamId);
  }, [selectedExamId]);

  const loadQuestions = async (examId: string) => {
    try {
      const res = await api.admin.getQuestions(examId);
      setQuestions(res.questions || []);
    } catch (err) {
      console.error(err);
    }
  };

  const handleAddQuestion = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedExamId) return;

    let optionsPayload: any[] = [];
    if (questionType === 'mcq') {
      optionsPayload = mcqOptions
        .filter((o) => o.text.trim())
        .map((o) => ({
          option_text: o.text.trim(),
          is_correct: o.isCorrect,
        }));
      if (optionsPayload.length < 2) {
        alert('Please provide at least 2 options for an MCQ question.');
        return;
      }
    } else if (questionType === 'true_false') {
      optionsPayload = [
        { option_text: 'True', is_correct: tfCorrect === 'True' },
        { option_text: 'False', is_correct: tfCorrect === 'False' },
      ];
    }

    setIsSubmitting(true);
    try {
      await api.admin.createQuestion({
        exam_id: selectedExamId,
        question_text: questionText.trim(),
        question_type: questionType,
        marks: Number(marks),
        negative_marks: Number(negativeMarks),
        explanation: explanation.trim(),
        options: optionsPayload,
      });

      setShowAddModal(false);
      resetModalForm();
      setBannerMessage({ type: 'success', text: 'Question added successfully to question bank.' });
      await loadQuestions(selectedExamId);
      const exRes = await api.admin.getExams();
      setExams(exRes.exams || []);
    } catch (err: any) {
      setBannerMessage({ type: 'error', text: err.message || 'Failed to add question' });
    } finally {
      setIsSubmitting(false);
    }
  };

  const openDeleteModal = (question: Question) => {
    setTargetQuestion(question);
    setDeleteError(null);
    setDeleteModalOpen(true);
  };

  const handleConfirmDelete = async () => {
    if (!targetQuestion) return;
    setIsDeleting(true);
    setDeleteError(null);

    try {
      await api.admin.deleteQuestion(targetQuestion.id);
      setDeleteModalOpen(false);
      setTargetQuestion(null);
      setBannerMessage({ type: 'success', text: 'Question removed from examination successfully.' });
      await loadQuestions(selectedExamId);
      const exRes = await api.admin.getExams();
      setExams(exRes.exams || []);
    } catch (err: any) {
      setDeleteError(err.message || 'Failed to delete question');
    } finally {
      setIsDeleting(false);
    }
  };

  const resetModalForm = () => {
    setQuestionText('');
    setExplanation('');
    setMarks(3);
    setNegativeMarks(0);
    setMcqOptions([
      { text: '', isCorrect: true },
      { text: '', isCorrect: false },
      { text: '', isCorrect: false },
      { text: '', isCorrect: false },
    ]);
  };

  const selectedExam = exams.find((e) => e.id === selectedExamId);
  const totalCalculatedMarks = questions.reduce((acc, q) => acc + Number(q.marks), 0);

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Question Item Bank & Grading Schema</h1>
          <p className="text-xs text-slate-500 mt-1">
            Build and manage MCQ, True/False, and Written questions with automated marking
          </p>
        </div>

        <button
          onClick={() => setShowAddModal(true)}
          disabled={!selectedExamId}
          className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white font-semibold text-xs shadow-md shadow-blue-500/20 transition disabled:opacity-50 cursor-pointer"
        >
          <PlusCircle className="w-4 h-4" />
          <span>Add New Question</span>
        </button>
      </div>

      {/* Select Exam Dropdown & Auto Total Marks Bar */}
      <div className="p-4 rounded-2xl bg-white border border-slate-200/80 shadow-xs flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3 w-full sm:w-auto">
          <label className="text-xs font-bold uppercase text-slate-500 shrink-0">
            Select Exam:
          </label>
          <select
            value={selectedExamId}
            onChange={(e) => setSelectedExamId(e.target.value)}
            className="bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-medium text-slate-900 max-w-md w-full outline-none focus:bg-white focus:border-blue-500"
          >
            {exams.map((ex) => (
              <option key={ex.id} value={ex.id}>
                {ex.title} ({ex.subject})
              </option>
            ))}
          </select>
        </div>

        <div className="flex items-center gap-3 text-xs">
          <div className="bg-slate-50 px-3.5 py-1.5 rounded-xl border border-slate-200/80 text-slate-600 font-medium">
            Questions: <strong className="text-slate-900">{questions.length}</strong>
          </div>
          <div className="bg-emerald-50 px-3.5 py-1.5 rounded-xl border border-emerald-200 text-emerald-800 font-medium">
            Total Marks: <strong className="text-emerald-700 font-bold">{totalCalculatedMarks} Marks</strong>
          </div>
        </div>
      </div>

      {/* Question List */}
      <div className="space-y-4">
        {questions.length === 0 ? (
          <div className="p-16 text-center bg-white border border-slate-200 rounded-2xl text-slate-400 text-xs">
            No questions configured for this exam yet. Click &ldquo;Add New Question&rdquo; to build your question bank.
          </div>
        ) : (
          questions.map((q, idx) => (
            <motion.div
              key={q.id}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              className="p-5 rounded-2xl bg-white border border-slate-200/80 shadow-xs space-y-3"
            >
              <div className="flex items-start justify-between gap-4">
                <div className="space-y-1.5 flex-1">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold text-slate-700 bg-slate-100 px-2 py-0.5 rounded-md">
                      Q{idx + 1}
                    </span>
                    <span className="text-[10px] font-bold uppercase px-2 py-0.5 rounded-full bg-blue-50 text-blue-700 border border-blue-200">
                      {q.question_type}
                    </span>
                    <span className="text-xs font-bold text-emerald-600">
                      +{q.marks} Marks
                    </span>
                    {q.negative_marks > 0 && (
                      <span className="text-xs font-bold text-rose-600">
                        -{q.negative_marks} Neg
                      </span>
                    )}
                  </div>
                  <h3 className="text-sm font-bold text-slate-900 pt-1 leading-snug">{q.question_text}</h3>
                </div>

                <button
                  onClick={() => openDeleteModal(q)}
                  className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition cursor-pointer"
                  title="Delete question"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>

              {/* Options */}
              {q.question_type !== 'written' && q.options && q.options.length > 0 && (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-2 border-t border-slate-100 text-xs">
                  {q.options.map((opt, oIdx) => (
                    <div
                      key={opt.id}
                      className={`p-3 rounded-xl border flex items-center justify-between ${
                        opt.is_correct
                          ? 'bg-emerald-50 border-emerald-200 text-emerald-900 font-bold'
                          : 'bg-slate-50 border-slate-200/80 text-slate-700 font-medium'
                      }`}
                    >
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-slate-400">{String.fromCharCode(65 + oIdx)}.</span>
                        <span>{opt.option_text}</span>
                      </div>
                      {opt.is_correct && (
                        <span className="text-[10px] uppercase font-bold text-emerald-700 flex items-center gap-1 bg-emerald-100/60 px-2 py-0.5 rounded-full">
                          <Check className="w-3.5 h-3.5" /> Correct
                        </span>
                      )}
                    </div>
                  ))}
                </div>
              )}

              {q.explanation && (
                <div className="text-[11px] text-slate-600 bg-slate-50 p-3 rounded-xl border border-slate-200/80">
                  <strong className="text-slate-800 font-bold">Explanation:</strong> {q.explanation}
                </div>
              )}
            </motion.div>
          ))
        )}
      </div>

      {/* ADD QUESTION MODAL */}
      <AnimatePresence>
        {showAddModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-xs">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white border border-slate-200 rounded-3xl max-w-xl w-full p-6 sm:p-8 shadow-2xl max-h-[90vh] overflow-y-auto custom-scrollbar"
            >
              <div className="flex items-center justify-between border-b border-slate-100 pb-3 mb-4">
                <h3 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                  <PlusCircle className="w-5 h-5 text-blue-600" />
                  Add Question to Exam
                </h3>
                <button
                  onClick={() => setShowAddModal(false)}
                  className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-xl transition cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <form onSubmit={handleAddQuestion} className="space-y-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Question Type
                  </label>
                  <div className="grid grid-cols-3 gap-2">
                    {[
                      { id: 'mcq', label: 'Multiple Choice' },
                      { id: 'true_false', label: 'True / False' },
                      { id: 'written', label: 'Written Subjective' },
                    ].map((t) => (
                      <button
                        key={t.id}
                        type="button"
                        onClick={() => setQuestionType(t.id as any)}
                        className={`py-2 rounded-xl border text-xs font-semibold transition cursor-pointer ${
                          questionType === t.id
                            ? 'bg-blue-600 border-blue-600 text-white shadow-xs'
                            : 'bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100'
                        }`}
                      >
                        {t.label}
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Question Text *
                  </label>
                  <textarea
                    rows={3}
                    required
                    value={questionText}
                    onChange={(e) => setQuestionText(e.target.value)}
                    placeholder="Enter the full question formulation..."
                    className="w-full bg-slate-50 border border-slate-200 focus:bg-white focus:border-blue-500 focus:ring-3 focus:ring-blue-500/10 rounded-xl p-3 text-xs text-slate-900 outline-none transition"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      Marks Awarded *
                    </label>
                    <input
                      type="number"
                      required
                      min={1}
                      value={marks}
                      onChange={(e) => setMarks(Number(e.target.value))}
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-900 outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      Negative Penalty Marks
                    </label>
                    <input
                      type="number"
                      step={0.25}
                      min={0}
                      value={negativeMarks}
                      onChange={(e) => setNegativeMarks(Number(e.target.value))}
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-900 outline-none"
                    />
                  </div>
                </div>

                {/* MCQ Options Builder */}
                {questionType === 'mcq' && (
                  <div className="space-y-2 pt-2 border-t border-slate-100">
                    <label className="block text-xs font-semibold text-slate-700">
                      MCQ Options (Select the correct answer):
                    </label>

                    {mcqOptions.map((opt, idx) => (
                      <div key={idx} className="flex items-center gap-2">
                        <input
                          type="radio"
                          name="correctOpt"
                          checked={opt.isCorrect}
                          onChange={() => {
                            setMcqOptions((prev) =>
                              prev.map((o, i) => ({ ...o, isCorrect: i === idx }))
                            );
                          }}
                          className="text-emerald-600 focus:ring-0 cursor-pointer"
                          title="Mark as correct answer"
                        />
                        <span className="text-xs font-bold text-slate-400 w-4">
                          {String.fromCharCode(65 + idx)}
                        </span>
                        <input
                          type="text"
                          required
                          value={opt.text}
                          onChange={(e) => {
                            const val = e.target.value;
                            setMcqOptions((prev) =>
                              prev.map((o, i) => (i === idx ? { ...o, text: val } : o))
                            );
                          }}
                          placeholder={`Option ${String.fromCharCode(65 + idx)} text`}
                          className="flex-1 bg-slate-50 border border-slate-200 focus:bg-white focus:border-blue-500 rounded-lg px-3 py-1.5 text-xs text-slate-900 outline-none"
                        />
                      </div>
                    ))}
                  </div>
                )}

                {/* True / False Selection */}
                {questionType === 'true_false' && (
                  <div className="pt-2 border-t border-slate-100 space-y-2">
                    <label className="block text-xs font-semibold text-slate-700">
                      Correct State:
                    </label>
                    <div className="flex gap-4 text-xs font-semibold text-slate-800">
                      <label className="flex items-center gap-2 cursor-pointer">
                        <input
                          type="radio"
                          name="tf"
                          checked={tfCorrect === 'True'}
                          onChange={() => setTfCorrect('True')}
                        />
                        <span>True</span>
                      </label>
                      <label className="flex items-center gap-2 cursor-pointer">
                        <input
                          type="radio"
                          name="tf"
                          checked={tfCorrect === 'False'}
                          onChange={() => setTfCorrect('False')}
                        />
                        <span>False</span>
                      </label>
                    </div>
                  </div>
                )}

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Answer Explanation / Solution Key
                  </label>
                  <textarea
                    rows={2}
                    value={explanation}
                    onChange={(e) => setExplanation(e.target.value)}
                    placeholder="Theoretical background or explanation for student results review..."
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 text-xs text-slate-900 outline-none"
                  />
                </div>

                <div className="flex justify-end gap-2.5 pt-3 border-t border-slate-100">
                  <button
                    type="button"
                    onClick={() => setShowAddModal(false)}
                    className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 hover:text-slate-900 hover:bg-slate-100 cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="px-5 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-semibold text-xs shadow-sm transition cursor-pointer"
                  >
                    {isSubmitting ? 'Saving...' : 'Save Question'}
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
        title="Delete Question"
        message={`Are you sure you want to delete this question? "${targetQuestion?.question_text}"`}
        academicWarning="Deleting this question will recalculate the examination's total marks and total question count."
        confirmText="Delete Question"
        isArchiveOptionAvailable={false}
        onConfirm={handleConfirmDelete}
        onClose={() => {
          setDeleteModalOpen(false);
          setTargetQuestion(null);
          setDeleteError(null);
        }}
        isLoading={isDeleting}
        error={deleteError}
      />
    </div>
  );
};
