/**
 * Pure business logic for grading exam questions, calculating percentages and pass/fail determinations.
 */

export interface QuestionGradingRule {
  id: string;
  type: 'mcq' | 'true_false' | 'written';
  marks: number;
  negativeMarks?: number;
  correctOptionId?: string;
}

export interface StudentAnswerInput {
  questionId: string;
  selectedOptionId?: string;
  writtenAnswer?: string;
  manualMarksAwarded?: number;
}

export interface GradingResultItem {
  questionId: string;
  marksAwarded: number;
  isCorrect?: boolean;
  needsManualReview: boolean;
}

export interface ExamScoreSummary {
  totalMarks: number;
  obtainedMarks: number;
  percentage: number;
  isPassed: boolean;
  hasPendingWrittenReview: boolean;
  items: GradingResultItem[];
}

/**
 * Calculates question-level marks and returns complete exam score summary.
 */
export function calculateExamScore(
  questions: QuestionGradingRule[],
  studentAnswers: StudentAnswerInput[],
  passingMarks: number,
  globalNegativeMarking: boolean = false,
  globalNegativeValue: number = 0
): ExamScoreSummary {
  let totalMarks = 0;
  let obtainedMarks = 0;
  let hasPendingWrittenReview = false;
  const items: GradingResultItem[] = [];

  const answersMap = new Map<string, StudentAnswerInput>();
  for (const ans of studentAnswers) {
    answersMap.set(ans.questionId, ans);
  }

  for (const q of questions) {
    const qMarks = Number(q.marks) || 0;
    totalMarks += qMarks;

    const ans = answersMap.get(q.id);

    if (q.type === 'written') {
      if (ans && typeof ans.manualMarksAwarded === 'number') {
        const awarded = Math.min(Math.max(0, ans.manualMarksAwarded), qMarks);
        obtainedMarks += awarded;
        items.push({
          questionId: q.id,
          marksAwarded: awarded,
          needsManualReview: false,
        });
      } else {
        hasPendingWrittenReview = true;
        items.push({
          questionId: q.id,
          marksAwarded: 0,
          needsManualReview: true,
        });
      }
    } else {
      // MCQ or True/False
      if (!ans || !ans.selectedOptionId) {
        // Unattempted: 0 marks
        items.push({
          questionId: q.id,
          marksAwarded: 0,
          isCorrect: false,
          needsManualReview: false,
        });
      } else if (ans.selectedOptionId === q.correctOptionId) {
        // Correct answer
        obtainedMarks += qMarks;
        items.push({
          questionId: q.id,
          marksAwarded: qMarks,
          isCorrect: true,
          needsManualReview: false,
        });
      } else {
        // Wrong answer: apply negative marking if enabled
        let deduction = 0;
        if (typeof q.negativeMarks === 'number' && q.negativeMarks > 0) {
          deduction = q.negativeMarks;
        } else if (globalNegativeMarking && globalNegativeValue > 0) {
          deduction = globalNegativeValue;
        }

        obtainedMarks -= deduction;
        items.push({
          questionId: q.id,
          marksAwarded: -deduction,
          isCorrect: false,
          needsManualReview: false,
        });
      }
    }
  }

  // Obtained marks cannot fall below zero for the exam total
  obtainedMarks = Math.max(0, Math.round(obtainedMarks * 100) / 100);
  totalMarks = Math.max(1, Math.round(totalMarks * 100) / 100);

  const percentage = Math.round((obtainedMarks / totalMarks) * 10000) / 100;
  const isPassed = obtainedMarks >= passingMarks;

  return {
    totalMarks,
    obtainedMarks,
    percentage,
    isPassed,
    hasPendingWrittenReview,
    items,
  };
}

/**
 * Calculates remaining exam time in milliseconds given server schedule and current time.
 */
export function calculateRemainingSeconds(
  scheduledEndTime: string | Date | number,
  nowTime: string | Date | number = Date.now()
): number {
  const end = new Date(scheduledEndTime).getTime();
  const now = new Date(nowTime).getTime();
  const diffSec = Math.floor((end - now) / 1000);
  return Math.max(0, diffSec);
}

/**
 * Validates whether a student can enter an exam based on scheduled start and late entry policy.
 */
export function validateExamEntryWindow(
  startTime: string | Date,
  endTime: string | Date,
  lateEntryMinutes: number,
  nowTime: string | Date | number = Date.now()
): { allowed: boolean; reason?: string } {
  const start = new Date(startTime).getTime();
  const end = new Date(endTime).getTime();
  const now = new Date(nowTime).getTime();

  if (now < start) {
    const waitMins = Math.ceil((start - now) / (60 * 1000));
    return {
      allowed: false,
      reason: `Exam has not started yet. Starts in ${waitMins} minute(s).`,
    };
  }

  if (now > end) {
    return {
      allowed: false,
      reason: 'Exam window has ended. No further attempts permitted.',
    };
  }

  const cutoff = start + lateEntryMinutes * 60 * 1000;
  if (now > cutoff) {
    return {
      allowed: false,
      reason: `Late entry cutoff exceeded. Students must join within ${lateEntryMinutes} minutes of start time.`,
    };
  }

  return { allowed: true };
}
