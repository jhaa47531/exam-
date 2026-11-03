import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { api } from '../../services/api';
import type { Exam, Question, ExamAttempt, StudentAnswer } from '../../types';
import {
  Clock,
  ShieldAlert,
  AlertTriangle,
  CheckCircle2,
  BookmarkCheck,
  ChevronLeft,
  ChevronRight,
  Maximize2,
  Send,
  Lock,
  PauseCircle,
  HelpCircle,
  Save,
  Radio,
  FileText,
  X,
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

export const ExamInterface: React.FC = () => {
  const { id: examId } = useParams<{ id: string }>();
  const { user } = useAuth();
  const navigate = useNavigate();

  // State
  const [exam, setExam] = useState<Exam | null>(null);
  const [attempt, setAttempt] = useState<ExamAttempt | null>(null);
  const [questions, setQuestions] = useState<Question[]>([]);
  const [currentIndex, setCurrentIndex] = useState<number>(0);
  const [answersMap, setAnswersMap] = useState<Map<string, { selectedOptionId?: string; writtenAnswer?: string }>>(new Map());
  const [markedForReview, setMarkedForReview] = useState<Set<string>>(new Set());

  // Timing
  const [remainingSeconds, setRemainingSeconds] = useState<number>(0);
  const [isTimeUp, setIsTimeUp] = useState(false);

  // States
  const [isLoading, setIsLoading] = useState(true);
  const [isAutosaving, setIsAutosaving] = useState(false);
  const [saveStatusText, setSaveStatusText] = useState('Autosave Ready');
  const [showSubmitModal, setShowSubmitModal] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Anti-Cheating & Proctor Overlays
  const [proctorWarning, setProctorWarning] = useState<string | null>(null);
  const [isExamHeld, setIsExamHeld] = useState(false);
  const [holdDetails, setHoldDetails] = useState<{ holdEnd?: string; reason?: string; secondsLeft?: number } | null>(null);
  const [isTerminated, setIsTerminated] = useState(false);
  const [terminationReason, setTerminationReason] = useState<string | null>(null);
  const [warningCount, setWarningCount] = useState<number>(0);
  const [initError, setInitError] = useState<string | null>(null);
  const [submitError, setSubmitError] = useState<string | null>(null);

  // Fullscreen state
  const [isFullscreen, setIsFullscreen] = useState(false);

  // Refs for autosave debounce & interval
  const autosaveTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const timerIntervalRef = useRef<NodeJS.Timeout | null>(null);

  // 1. Initialize Exam Attempt
  useEffect(() => {
    if (!examId) return;

    api.exam.start(examId)
      .then((data) => {
        setExam(data.exam);
        setAttempt(data.attempt);
        setQuestions(data.questions || []);

        // Load existing answers
        const map = new Map<string, { selectedOptionId?: string; writtenAnswer?: string }>();
        if (Array.isArray(data.answers)) {
          data.answers.forEach((ans) => {
            map.set(ans.question_id, {
              selectedOptionId: ans.selected_option_id,
              writtenAnswer: ans.written_answer,
            });
          });
        }
        setAnswersMap(map);

        // Calculate initial remaining seconds based on server scheduled_end_time
        const endMs = new Date(data.attempt.scheduled_end_time).getTime();
        const diff = Math.max(0, Math.floor((endMs - Date.now()) / 1000));
        setRemainingSeconds(diff);
        setWarningCount(data.attempt.warning_count || 0);

        if (data.attempt.status === 'held') {
          setIsExamHeld(true);
          setHoldDetails({
            holdEnd: data.attempt.hold_until,
            reason: data.attempt.hold_reason || 'Proctor hold active',
          });
        } else if (data.attempt.status === 'terminated') {
          setIsTerminated(true);
          setTerminationReason(data.attempt.termination_reason || 'Security termination');
        } else if (data.attempt.status === 'submitted') {
          navigate(`/student/results/${examId}`);
        }
      })
      .catch((err) => {
        setInitError(err.message || 'Could not initialize examination attempt');
      })
      .finally(() => {
        setIsLoading(false);
      });
  }, [examId, navigate]);

  // 2. Setup Server Timing Countdown
  useEffect(() => {
    if (!attempt || isTerminated || attempt.status === 'submitted') return;

    timerIntervalRef.current = setInterval(() => {
      const endMs = new Date(attempt.scheduled_end_time).getTime();
      const diff = Math.max(0, Math.floor((endMs - Date.now()) / 1000));
      setRemainingSeconds(diff);

      if (diff <= 0) {
        clearInterval(timerIntervalRef.current!);
        setIsTimeUp(true);
        handleAutoSubmit();
      }
    }, 1000);

    return () => {
      if (timerIntervalRef.current) clearInterval(timerIntervalRef.current);
    };
  }, [attempt, isTerminated]);

  // 3. Connect Real-time SSE Stream for Proctor Hold / Warning / Terminate
  useEffect(() => {
    if (!attempt) return;

    const token = localStorage.getItem('exampro_token') || '';
    const eventSource = new EventSource(`/api/attempts/${attempt.id}/stream?token=${encodeURIComponent(token)}`);

    eventSource.addEventListener('proctor_warning', (e: any) => {
      const data = JSON.parse(e.data);
      setProctorWarning(data.message);
      setWarningCount(data.warningCount || ((prev) => prev + 1));
    });

    eventSource.addEventListener('exam_held', (e: any) => {
      const data = JSON.parse(e.data);
      setIsExamHeld(true);
      setHoldDetails({
        holdEnd: data.holdEnd,
        reason: data.reason,
        secondsLeft: data.durationSeconds,
      });
    });

    eventSource.addEventListener('exam_resumed', () => {
      setIsExamHeld(false);
      setHoldDetails(null);
    });

    eventSource.addEventListener('exam_terminated', (e: any) => {
      const data = JSON.parse(e.data);
      setIsTerminated(true);
      setTerminationReason(data.reason);
    });

    return () => {
      eventSource.close();
    };
  }, [attempt]);

  // 4. Anti-Cheating Event Handlers: Visibility / Fullscreen Change
  useEffect(() => {
    if (!attempt || attempt.status === 'submitted' || isTerminated) return;

    const handleVisibilityChange = () => {
      if (document.hidden) {
        api.exam.recordSecurityEvent(attempt.id, 'tab_switch', {
          timestamp: new Date().toISOString(),
        }).then(() => {
          setWarningCount((c) => c + 1);
        }).catch(() => {});
      }
    };

    const handleFullscreenChange = () => {
      const inFull = Boolean(document.fullscreenElement);
      setIsFullscreen(inFull);
      if (!inFull && !isTerminated) {
        api.exam.recordSecurityEvent(attempt.id, 'fullscreen_exit', {
          timestamp: new Date().toISOString(),
        }).then(() => {
          setWarningCount((c) => c + 1);
        }).catch(() => {});
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    document.addEventListener('fullscreenchange', handleFullscreenChange);

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      document.removeEventListener('fullscreenchange', handleFullscreenChange);
    };
  }, [attempt, isTerminated]);

  // 5. Trigger Fullscreen
  const enterFullscreen = async () => {
    try {
      if (document.documentElement.requestFullscreen) {
        await document.documentElement.requestFullscreen();
        setIsFullscreen(true);
      }
    } catch {
      // Browser permissions or iframe constraint
    }
  };

  // 6. Autosave Answers to Server
  const triggerAutosave = useCallback(
    (newMap: Map<string, { selectedOptionId?: string; writtenAnswer?: string }>) => {
      if (!attempt || attempt.status === 'submitted' || isExamHeld || isTerminated) return;

      setIsAutosaving(true);
      setSaveStatusText('Syncing with server...');

      if (autosaveTimeoutRef.current) {
        clearTimeout(autosaveTimeoutRef.current);
      }

      autosaveTimeoutRef.current = setTimeout(async () => {
        try {
          const payload = Array.from(newMap.entries()).map(([qId, val]) => ({
            question_id: qId,
            selected_option_id: val.selectedOptionId,
            written_answer: val.writtenAnswer,
          }));

          await api.exam.saveAnswers(attempt.id, payload);
          setSaveStatusText('All answers autosaved');
        } catch {
          setSaveStatusText('Offline - Retrying connection...');
        } finally {
          setIsAutosaving(false);
        }
      }, 500);
    },
    [attempt, isExamHeld, isTerminated]
  );

  // Handlers for Question Answering
  const handleOptionSelect = (optionId: string) => {
    if (!currentQuestion || isExamHeld || isTerminated) return;
    const newMap = new Map(answersMap);
    newMap.set(currentQuestion.id, {
      ...newMap.get(currentQuestion.id),
      selectedOptionId: optionId,
    });
    setAnswersMap(newMap);
    triggerAutosave(newMap);
  };

  const handleWrittenChange = (text: string) => {
    if (!currentQuestion || isExamHeld || isTerminated) return;
    const newMap = new Map(answersMap);
    newMap.set(currentQuestion.id, {
      ...newMap.get(currentQuestion.id),
      writtenAnswer: text,
    });
    setAnswersMap(newMap);
    triggerAutosave(newMap);
  };

  const handleClearAnswer = () => {
    if (!currentQuestion) return;
    const newMap = new Map(answersMap);
    newMap.delete(currentQuestion.id);
    setAnswersMap(newMap);
    triggerAutosave(newMap);
  };

  const toggleMarkForReview = () => {
    if (!currentQuestion) return;
    const next = new Set(markedForReview);
    if (next.has(currentQuestion.id)) {
      next.delete(currentQuestion.id);
    } else {
      next.add(currentQuestion.id);
    }
    setMarkedForReview(next);
  };

  // Submit Handler
  const handleSubmitExam = async () => {
    if (!attempt) return;
    setIsSubmitting(true);
    try {
      await api.exam.submit(attempt.id);
      navigate(`/student/results/${examId}`);
    } catch (err: any) {
      setSubmitError(err.message || 'Submission failed');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleAutoSubmit = async () => {
    if (!attempt) return;
    try {
      await api.exam.submit(attempt.id);
      navigate(`/student/results/${examId}`);
    } catch {
      navigate('/student/dashboard');
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-[#F8FAFC] flex flex-col items-center justify-center p-6 text-slate-600">
        <div className="w-9 h-9 border-3 border-blue-600 border-t-transparent rounded-full animate-spin mb-4" />
        <h2 className="text-lg font-bold text-slate-900">Initializing Secure Proctored Station...</h2>
        <p className="text-xs text-slate-500 mt-1">Verifying eligibility token & server time sync</p>
      </div>
    );
  }

  if (initError) {
    return (
      <div className="min-h-screen bg-[#F8FAFC] flex items-center justify-center p-6">
        <div className="bg-white border border-slate-200/90 rounded-3xl p-8 max-w-md w-full text-center space-y-4 shadow-xl">
          <div className="w-14 h-14 rounded-2xl bg-amber-50 border border-amber-200 text-amber-600 flex items-center justify-center mx-auto">
            <AlertTriangle className="w-7 h-7" />
          </div>
          <h2 className="text-xl font-bold text-slate-900">Exam Window Notice</h2>
          <p className="text-sm text-slate-600 leading-relaxed">{initError}</p>
          <button
            onClick={() => navigate('/student/dashboard')}
            className="w-full mt-2 px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-semibold text-xs transition cursor-pointer shadow-sm"
          >
            Return to Student Dashboard
          </button>
        </div>
      </div>
    );
  }

  // Format Time Remaining
  const formatTimer = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const currentQuestion = questions[currentIndex];
  const currentAnswer = currentQuestion ? answersMap.get(currentQuestion.id) : null;
  const isAnswered = Boolean(currentAnswer?.selectedOptionId || currentAnswer?.writtenAnswer?.trim());
  const isReviewed = currentQuestion ? markedForReview.has(currentQuestion.id) : false;

  // Counts for summary
  const answeredCount = Array.from(answersMap.values()).filter(
    (a) => a.selectedOptionId || a.writtenAnswer?.trim()
  ).length;
  const unansweredCount = questions.length - answeredCount;

  return (
    <div className="min-h-screen bg-[#F8FAFC] text-slate-900 flex flex-col select-none font-sans">
      {/* 1. TOP PROCTOR & EXAM HUD BAR */}
      <header className="h-16 bg-white border-b border-slate-200/90 px-4 sm:px-6 flex items-center justify-between shrink-0 z-20 shadow-xs">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-xl bg-blue-50 border border-blue-200 flex items-center justify-center text-blue-600">
            <Radio className="w-4 h-4 animate-pulse" />
          </div>
          <div>
            <h1 className="text-sm font-bold text-slate-900 flex items-center gap-2 truncate max-w-xs sm:max-w-md">
              {exam?.title}
              <span className="text-[10px] font-bold uppercase px-2 py-0.5 rounded-full bg-blue-50 text-blue-700 border border-blue-200">
                {exam?.subject}
              </span>
            </h1>
            <p className="text-[11px] text-slate-500 font-medium">
              Candidate: <strong className="text-slate-800">{user?.full_name}</strong>
            </p>
          </div>
        </div>

        {/* Center / Right controls */}
        <div className="flex items-center gap-3 sm:gap-5">
          {/* Autosave status indicator */}
          <div className="hidden sm:flex items-center gap-1.5 text-xs text-slate-500 font-medium">
            <Save className={`w-3.5 h-3.5 ${isAutosaving ? 'text-amber-500 animate-spin' : 'text-emerald-600'}`} />
            <span>{saveStatusText}</span>
          </div>

          {/* Infractions / Warnings Counter */}
          <div className={`flex items-center gap-1 text-xs px-2.5 py-1 rounded-full border font-semibold ${
            warningCount > 0
              ? 'bg-amber-50 text-amber-800 border-amber-200'
              : 'bg-slate-100 text-slate-600 border-slate-200'
          }`}>
            <ShieldAlert className="w-3.5 h-3.5 text-amber-600" />
            <span>Warnings: <strong>{warningCount}</strong></span>
          </div>

          {/* Server-Authoritative Timer */}
          <div className={`flex items-center gap-2 px-3.5 py-1.5 rounded-xl border font-mono font-bold text-sm sm:text-base ${
            remainingSeconds < 300
              ? 'bg-rose-50 text-rose-700 border-rose-300 animate-pulse'
              : 'bg-slate-50 text-slate-900 border-slate-200'
          }`}>
            <Clock className={`w-4 h-4 shrink-0 ${remainingSeconds < 300 ? 'text-rose-600' : 'text-blue-600'}`} />
            <span>{formatTimer(remainingSeconds)}</span>
          </div>

          {/* Fullscreen Toggle */}
          {!isFullscreen && (
            <button
              onClick={enterFullscreen}
              className="hidden md:flex items-center gap-1 px-3 py-1.5 rounded-xl bg-slate-50 hover:bg-slate-100 text-slate-700 text-xs font-semibold border border-slate-200 cursor-pointer"
              title="Enter Fullscreen Proctored Mode"
            >
              <Maximize2 className="w-3.5 h-3.5" />
              <span>Fullscreen</span>
            </button>
          )}

          {/* Finish / Submit Button */}
          <button
            onClick={() => setShowSubmitModal(true)}
            className="px-4 py-2 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white font-semibold text-xs shadow-md shadow-blue-500/20 transition flex items-center gap-1.5 cursor-pointer"
          >
            <Send className="w-3.5 h-3.5" />
            <span>Submit Exam</span>
          </button>
        </div>
      </header>

      {/* 2. MAIN EXAM BODY (Left: Question area; Right: Palette) */}
      <div className="flex-1 flex overflow-hidden relative">
        {/* PROCTOR WARNING MODAL */}
        <AnimatePresence>
          {proctorWarning && (
            <div className="absolute inset-0 z-40 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4">
              <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                className="bg-white border-2 border-amber-400 rounded-3xl max-w-md w-full p-6 sm:p-8 shadow-2xl space-y-4 text-center"
              >
                <div className="w-14 h-14 rounded-2xl bg-amber-50 text-amber-600 border border-amber-200 flex items-center justify-center mx-auto">
                  <ShieldAlert className="w-8 h-8" />
                </div>
                <h3 className="text-lg font-bold text-slate-900">PROCTOR WARNING ISSUED</h3>
                <p className="text-xs text-slate-700 leading-relaxed bg-amber-50/60 p-3.5 rounded-2xl border border-amber-200">
                  &ldquo;{proctorWarning}&rdquo;
                </p>
                <p className="text-[11px] text-amber-800 font-semibold">
                  Total Warnings Recorded: <strong>{warningCount}</strong>. Continued infractions may result in an immediate exam hold or termination.
                </p>
                <button
                  onClick={() => setProctorWarning(null)}
                  className="w-full py-2.5 rounded-xl bg-amber-500 hover:bg-amber-600 text-slate-950 font-bold text-xs shadow-md transition cursor-pointer"
                >
                  I Acknowledge & Return to Exam
                </button>
              </motion.div>
            </div>
          )}
        </AnimatePresence>

        {/* EXAM HOLD OVERLAY */}
        <AnimatePresence>
          {isExamHeld && (
            <div className="absolute inset-0 z-50 bg-slate-900/60 backdrop-blur-md flex items-center justify-center p-4">
              <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                className="bg-white border-2 border-rose-300 rounded-3xl max-w-lg w-full p-8 shadow-2xl text-center space-y-4"
              >
                <div className="w-16 h-16 rounded-2xl bg-rose-50 text-rose-600 border border-rose-200 flex items-center justify-center mx-auto animate-pulse">
                  <PauseCircle className="w-9 h-9" />
                </div>
                <h2 className="text-xl font-bold text-slate-900 tracking-tight">EXAMINATION TEMPORARILY HELD</h2>
                <p className="text-xs text-rose-700 font-bold uppercase tracking-wider">
                  Access Paused by Controller of Examinations
                </p>

                <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 text-xs text-slate-700 space-y-2 text-left">
                  <div><strong>Reason:</strong> {holdDetails?.reason || 'Security inspection in progress.'}</div>
                  <div className="text-slate-500 text-[11px] leading-relaxed">
                    &bull; Your answers are safely preserved in the database.
                    <br />
                    &bull; The server exam timer continues ticking as per university policy.
                    <br />
                    &bull; The proctor will resume access shortly or access will restore automatically.
                  </div>
                </div>

                <div className="font-mono text-xl text-rose-600 font-extrabold">
                  Time Remaining on Exam: {formatTimer(remainingSeconds)}
                </div>
              </motion.div>
            </div>
          )}
        </AnimatePresence>

        {/* EXAM TERMINATED OVERLAY */}
        <AnimatePresence>
          {isTerminated && (
            <div className="absolute inset-0 z-50 bg-slate-900/60 backdrop-blur-md flex items-center justify-center p-4">
              <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                className="bg-white border-2 border-rose-500 rounded-3xl max-w-md w-full p-8 shadow-2xl text-center space-y-4"
              >
                <div className="w-16 h-16 rounded-2xl bg-rose-50 text-rose-600 border border-rose-200 flex items-center justify-center mx-auto">
                  <AlertTriangle className="w-9 h-9" />
                </div>
                <h2 className="text-xl font-bold text-slate-900">EXAMINATION TERMINATED</h2>
                <p className="text-xs text-slate-700 bg-rose-50 p-3.5 rounded-2xl border border-rose-200">
                  Reason: {terminationReason || 'Permanent disqualification due to repeated security infractions.'}
                </p>
                <button
                  onClick={() => navigate('/student/dashboard')}
                  className="w-full py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-semibold text-xs transition cursor-pointer"
                >
                  Return to Student Dashboard
                </button>
              </motion.div>
            </div>
          )}
        </AnimatePresence>

        {/* MAIN QUESTION DISPLAY AREA */}
        <main className="flex-1 overflow-y-auto p-4 sm:p-6 lg:p-8 flex flex-col justify-between custom-scrollbar">
          {currentQuestion ? (
            <div className="max-w-4xl mx-auto w-full space-y-6">
              {/* Question Card */}
              <div className="bg-white border border-slate-200/80 rounded-3xl p-6 sm:p-8 shadow-xs space-y-5">
                {/* Question Header */}
                <div className="flex flex-wrap items-center justify-between gap-3 pb-4 border-b border-slate-100">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-bold text-slate-900 bg-slate-100 px-3 py-1 rounded-xl">
                      Question {currentIndex + 1} of {questions.length}
                    </span>
                    <span className="text-xs uppercase font-bold px-2.5 py-1 rounded-full bg-blue-50 text-blue-700 border border-blue-200">
                      {currentQuestion.question_type === 'mcq'
                        ? 'Multiple Choice'
                        : currentQuestion.question_type === 'true_false'
                        ? 'True / False'
                        : 'Written Subjective'}
                    </span>
                  </div>

                  <div className="flex items-center gap-2.5 text-xs">
                    <span className="text-emerald-700 font-bold bg-emerald-50 px-2.5 py-1 rounded-full border border-emerald-200">
                      +{currentQuestion.marks} Marks
                    </span>
                    {currentQuestion.negative_marks > 0 && (
                      <span className="text-rose-700 font-bold bg-rose-50 px-2.5 py-1 rounded-full border border-rose-200">
                        -{currentQuestion.negative_marks} Negative
                      </span>
                    )}
                  </div>
                </div>

                {/* Question Text */}
                <div className="text-base sm:text-lg font-bold text-slate-900 leading-relaxed">
                  {currentQuestion.question_text}
                </div>

                {/* Options or Written Input */}
                <div className="pt-2">
                  {currentQuestion.question_type === 'written' ? (
                    <div>
                      <label className="block text-xs font-semibold uppercase text-slate-500 mb-2">
                        Type your structured academic response:
                      </label>
                      <textarea
                        rows={8}
                        value={currentAnswer?.writtenAnswer || ''}
                        onChange={(e) => handleWrittenChange(e.target.value)}
                        placeholder="Enter explanation, key points, syntax, or theoretical comparison..."
                        className="w-full bg-slate-50 border border-slate-200 focus:bg-white focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 rounded-2xl p-4 text-sm text-slate-900 placeholder-slate-400 outline-none transition"
                      />
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {currentQuestion.options?.map((opt, optIndex) => {
                        const isSelected = currentAnswer?.selectedOptionId === opt.id;
                        const optLetter = String.fromCharCode(65 + optIndex);

                        return (
                          <motion.button
                            key={opt.id}
                            whileHover={{ y: -1 }}
                            whileTap={{ scale: 0.995 }}
                            type="button"
                            onClick={() => handleOptionSelect(opt.id)}
                            className={`w-full text-left p-4 rounded-2xl border transition-all duration-150 flex items-center gap-3.5 cursor-pointer ${
                              isSelected
                                ? 'bg-blue-50/90 border-blue-500 text-slate-900 font-semibold ring-2 ring-blue-500/20 shadow-xs'
                                : 'bg-slate-50/60 border-slate-200 hover:border-slate-300 hover:bg-slate-100/70 text-slate-700'
                            }`}
                          >
                            <span
                              className={`w-8 h-8 rounded-xl flex items-center justify-center font-bold text-xs shrink-0 transition-colors ${
                                isSelected
                                  ? 'bg-blue-600 text-white shadow-xs'
                                  : 'bg-white border border-slate-200 text-slate-500'
                              }`}
                            >
                              {optLetter}
                            </span>
                            <span className="text-sm">{opt.option_text}</span>
                          </motion.button>
                        );
                      })}
                    </div>
                  )}
                </div>
              </div>
            </div>
          ) : (
            <div className="text-center py-12 text-slate-400">No questions loaded.</div>
          )}

          {/* Question Action Bottom Bar */}
          <div className="max-w-4xl mx-auto w-full pt-4 flex flex-wrap items-center justify-between gap-3 mt-4">
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={toggleMarkForReview}
                className={`px-3.5 py-2 rounded-xl text-xs font-semibold border transition flex items-center gap-1.5 cursor-pointer ${
                  isReviewed
                    ? 'bg-amber-50 text-amber-800 border-amber-300 font-bold shadow-xs'
                    : 'bg-white hover:bg-slate-50 text-slate-600 border-slate-200'
                }`}
              >
                <BookmarkCheck className="w-3.5 h-3.5" />
                <span>{isReviewed ? 'Marked for Review' : 'Mark for Review'}</span>
              </button>

              {isAnswered && (
                <button
                  type="button"
                  onClick={handleClearAnswer}
                  className="px-3.5 py-2 rounded-xl text-xs font-semibold text-slate-600 hover:text-slate-900 bg-white hover:bg-slate-50 border border-slate-200 transition cursor-pointer"
                >
                  Clear Response
                </button>
              )}
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setCurrentIndex((idx) => Math.max(0, idx - 1))}
                disabled={currentIndex === 0}
                className="px-4 py-2 rounded-xl bg-white hover:bg-slate-50 text-slate-700 text-xs font-semibold border border-slate-200 disabled:opacity-40 transition flex items-center gap-1 cursor-pointer shadow-xs"
              >
                <ChevronLeft className="w-4 h-4" /> Previous
              </button>

              <button
                type="button"
                onClick={() => setCurrentIndex((idx) => Math.min(questions.length - 1, idx + 1))}
                disabled={currentIndex === questions.length - 1}
                className="px-5 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold disabled:opacity-40 transition flex items-center gap-1 cursor-pointer shadow-xs"
              >
                <span>Next</span>
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        </main>

        {/* RIGHT SIDEBAR: QUESTION PALETTE / NAVIGATOR */}
        <aside className="w-72 bg-white border-l border-slate-200 p-5 shrink-0 hidden md:flex md:flex-col justify-between shadow-xs">
          <div>
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-3 flex items-center gap-1.5">
              <HelpCircle className="w-4 h-4 text-blue-600" />
              Question Palette
            </h3>

            {/* Legend */}
            <div className="grid grid-cols-2 gap-2 text-[10px] text-slate-600 mb-4 pb-3 border-b border-slate-100 font-medium">
              <div className="flex items-center gap-1.5">
                <span className="w-3 h-3 rounded-full bg-emerald-600" />
                <span>Answered ({answeredCount})</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="w-3 h-3 rounded-full bg-amber-500" />
                <span>Review ({markedForReview.size})</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="w-3 h-3 rounded-full bg-slate-200 border border-slate-300" />
                <span>Unattempted ({unansweredCount})</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="w-3 h-3 rounded-full bg-blue-600 ring-2 ring-blue-300" />
                <span>Current Q</span>
              </div>
            </div>

            {/* Palette Grid */}
            <div className="grid grid-cols-4 gap-2">
              {questions.map((q, idx) => {
                const ans = answersMap.get(q.id);
                const answered = Boolean(ans?.selectedOptionId || ans?.writtenAnswer?.trim());
                const reviewed = markedForReview.has(q.id);
                const isCurrent = idx === currentIndex;

                let btnClass = 'bg-slate-100 text-slate-600 border-slate-200 hover:bg-slate-200';
                if (answered && reviewed) {
                  btnClass = 'bg-amber-600 text-white font-bold ring-2 ring-emerald-500 border-amber-600';
                } else if (answered) {
                  btnClass = 'bg-emerald-600 text-white font-bold border-emerald-600';
                } else if (reviewed) {
                  btnClass = 'bg-amber-500 text-slate-950 font-bold border-amber-500';
                }

                if (isCurrent) {
                  btnClass += ' ring-2 ring-blue-600 ring-offset-2 ring-offset-white';
                }

                return (
                  <button
                    key={q.id}
                    onClick={() => setCurrentIndex(idx)}
                    className={`h-9 rounded-xl border text-xs font-semibold transition cursor-pointer ${btnClass}`}
                  >
                    {idx + 1}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Quick Summary Pill */}
          <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200/80 text-xs space-y-1.5 text-slate-600">
            <div className="flex justify-between">
              <span>Attempted:</span>
              <strong className="text-slate-900 font-bold">{answeredCount} / {questions.length}</strong>
            </div>
            <div className="flex justify-between">
              <span>Marked for Review:</span>
              <strong className="text-amber-700 font-bold">{markedForReview.size}</strong>
            </div>
            <div className="flex justify-between">
              <span>Unattempted:</span>
              <strong className="text-slate-500">{unansweredCount}</strong>
            </div>
          </div>
        </aside>
      </div>

      {/* SUBMISSION CONFIRMATION MODAL */}
      <AnimatePresence>
        {showSubmitModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-xs">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white border border-slate-200 rounded-3xl max-w-md w-full p-6 shadow-2xl space-y-4"
            >
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-emerald-50 text-emerald-600 border border-emerald-200 flex items-center justify-center shrink-0">
                  <CheckCircle2 className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-900">Final Exam Submission</h3>
                  <p className="text-xs text-slate-500">Confirm you are ready to conclude and submit your paper.</p>
                </div>
              </div>

              <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 text-xs space-y-2 text-slate-600">
                <div className="flex justify-between">
                  <span>Total Exam Questions:</span>
                  <strong className="text-slate-900 font-bold">{questions.length}</strong>
                </div>
                <div className="flex justify-between text-emerald-700 font-semibold">
                  <span>Questions Answered:</span>
                  <strong>{answeredCount}</strong>
                </div>
                <div className="flex justify-between text-slate-500">
                  <span>Questions Unanswered:</span>
                  <strong>{unansweredCount}</strong>
                </div>
                {markedForReview.size > 0 && (
                  <div className="flex justify-between text-amber-700 font-semibold">
                    <span>Questions Marked for Review:</span>
                    <strong>{markedForReview.size}</strong>
                  </div>
                )}
              </div>

              <p className="text-[11px] text-slate-400">
                Once submitted, your answers will be permanently saved and automatic grading will calculate your score.
              </p>

              <div className="flex justify-end gap-2.5 pt-2">
                <button
                  type="button"
                  onClick={() => setShowSubmitModal(false)}
                  className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 hover:text-slate-900 hover:bg-slate-100 cursor-pointer"
                >
                  Return to Questions
                </button>
                <button
                  type="button"
                  disabled={isSubmitting}
                  onClick={handleSubmitExam}
                  className="px-5 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-semibold text-xs shadow-sm transition flex items-center gap-2 cursor-pointer"
                >
                  {isSubmitting ? 'Evaluating...' : 'Yes, Submit Examination'}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};
