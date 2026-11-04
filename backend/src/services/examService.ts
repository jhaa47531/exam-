import * as db from './db';
import { calculateExamScore, validateExamEntryWindow } from '../utils/grading';
import type {
  Exam,
  ExamAttempt,
  Question,
  StudentAnswer,
  ExamResult,
} from '../types';

export class ExamService {
  /**
   * Retrieves all exams available/assigned to a verified student from PostgreSQL.
   */
  async getStudentExams(studentId: string) {
    const [enrollment, assignments, exams, attempts, results] = await Promise.all([
      db.getEnrollmentsByStudent(studentId),
      db.getAssignmentsByStudent(studentId),
      db.getAllExams(),
      db.getAllAttempts({ student_id: studentId }),
      db.getAllResults({ student_id: studentId }),
    ]);

    const assignedExamIds = new Set(assignments.map((a) => a.exam_id));

    const eligibleExams = exams.filter((exam) => {
      if (exam.status === 'draft' || exam.status === 'cancelled') return false;
      if (assignedExamIds.has(exam.id)) return true;
      if (
        enrollment &&
        exam.course_id === enrollment.course_id &&
        exam.semester_id === enrollment.semester_id
      ) {
        return true;
      }
      return false;
    });

    return eligibleExams.map((exam) => {
      const attempt = attempts.find((a) => a.exam_id === exam.id);
      const result = results.find((r) => r.exam_id === exam.id);

      return {
        ...exam,
        attempt: attempt
          ? {
              id: attempt.id,
              status: attempt.status,
              start_time: attempt.start_time,
              scheduled_end_time: attempt.scheduled_end_time,
              submitted_at: attempt.submitted_at,
              warning_count: attempt.warning_count,
            }
          : null,
        result: result && result.status === 'published' ? result : null,
      };
    });
  }

  /**
   * Starts a new attempt or resumes an active attempt with server-authoritative timing in PostgreSQL.
   */
  async startOrResumeAttempt(
    examId: string,
    studentId: string,
    _ipAddress?: string,
    _userAgent?: string
  ) {
    const exam = await db.getExamById(examId);
    if (!exam) {
      throw new Error('Exam not found in database');
    }

    if (exam.status !== 'published') {
      throw new Error(`Exam is not currently published (Status: ${exam.status})`);
    }

    // Check existing attempt in PostgreSQL
    let attempt = await db.getAttemptByExamAndStudent(examId, studentId);

    if (attempt) {
      if (attempt.status === 'submitted') {
        throw new Error('You have already submitted this examination. Duplicate attempts are prohibited.');
      }
      if (attempt.status === 'terminated') {
        throw new Error(`Your examination was terminated by the proctor: ${attempt.termination_reason || 'Security violation'}`);
      }

      // Check if time expired
      const remainingMs = new Date(attempt.scheduled_end_time).getTime() - Date.now();
      if (remainingMs <= 0) {
        return this.submitAttempt(attempt.id, studentId);
      }

      const questions = await this.getSanitizedQuestions(examId);
      const answers = await db.getAnswersByAttempt(attempt.id);

      return {
        attempt,
        exam,
        questions,
        answers,
      };
    }

    // New Attempt: Check entry window and late entry policy
    const windowCheck = validateExamEntryWindow(
      exam.start_time,
      exam.end_time,
      exam.late_entry_policy_minutes
    );
    if (!windowCheck.allowed) {
      throw new Error(windowCheck.reason || 'Exam window closed');
    }

    // Server calculates authoritative scheduled_end_time
    const nowMs = Date.now();
    const durationEndMs = nowMs + exam.duration_minutes * 60 * 1000;
    const commonWindowEndMs = new Date(exam.end_time).getTime();
    const authoritativeEndMs = Math.min(durationEndMs, commonWindowEndMs);

    attempt = await db.insertAttempt({
      exam_id: examId,
      student_id: studentId,
      start_time: new Date(nowMs).toISOString(),
      scheduled_end_time: new Date(authoritativeEndMs).toISOString(),
    });

    const questions = await this.getSanitizedQuestions(examId);

    return {
      attempt,
      exam,
      questions,
      answers: [],
    };
  }

  /**
   * Sanitizes questions to ensure correct answers and option keys are never exposed to students.
   */
  async getSanitizedQuestions(examId: string) {
    const questions = await db.getQuestionsByExam(examId);

    return questions.map((q) => {
      const sanitizedOptions = (q.options || []).map((opt) => ({
        id: opt.id,
        question_id: opt.question_id,
        option_text: opt.option_text,
        order_index: opt.order_index,
        // is_correct strictly omitted
      }));

      return {
        id: q.id,
        exam_id: q.exam_id,
        question_text: q.question_text,
        question_type: q.question_type,
        marks: q.marks,
        negative_marks: q.negative_marks,
        order_index: q.order_index,
        options: sanitizedOptions,
      };
    });
  }

  /**
   * Saves or updates student answers in PostgreSQL in real-time.
   */
  async saveAnswers(
    attemptId: string,
    studentId: string,
    answersList: Array<{
      question_id: string;
      selected_option_id?: string;
      written_answer?: string;
    }>
  ) {
    const attempt = await db.getAttemptById(attemptId);
    if (!attempt) throw new Error('Attempt not found in database');
    if (attempt.student_id !== studentId) throw new Error('Unauthorized attempt access');
    if (attempt.status === 'held') throw new Error('Exam is currently on proctor hold');
    if (attempt.status === 'terminated') throw new Error('Exam attempt has been terminated');
    if (attempt.status === 'submitted') throw new Error('Exam already submitted');

    // Check timer expiry with 15 second grace period for network transit
    const now = Date.now();
    const scheduledEnd = new Date(attempt.scheduled_end_time).getTime();
    if (now > scheduledEnd + 15000) {
      return this.submitAttempt(attemptId, studentId);
    }

    for (const item of answersList) {
      await db.upsertAnswer({
        attempt_id: attemptId,
        question_id: item.question_id,
        selected_option_id: item.selected_option_id,
        written_answer: item.written_answer,
      });
    }

    return { success: true, savedCount: answersList.length };
  }

  /**
   * Submits exam attempt and computes automatic grading in PostgreSQL.
   */
  async submitAttempt(attemptId: string, studentId: string) {
    const attempt = await db.getAttemptById(attemptId);
    if (!attempt) throw new Error('Attempt not found in database');
    if (attempt.student_id !== studentId) throw new Error('Unauthorized');
    if (attempt.status === 'submitted') {
      const existingResult = await db.getResultByAttempt(attemptId);
      return { success: true, attempt, result: existingResult };
    }

    const exam = await db.getExamById(attempt.exam_id);
    if (!exam) throw new Error('Exam not found in database');

    const submittedAt = new Date().toISOString();
    const updatedAttempt = await db.updateAttempt(attemptId, {
      status: 'submitted',
      submitted_at: submittedAt,
    });

    // Load grading rules and correct options from PostgreSQL
    const examQuestions = await db.getQuestionsByExam(exam.id);
    const rules = examQuestions.map((q) => {
      const correctOpt = (q.options || []).find((o) => o.is_correct);
      return {
        id: q.id,
        type: q.question_type,
        marks: q.marks,
        negativeMarks: q.negative_marks,
        correctOptionId: correctOpt?.id,
      };
    });

    const studentAnswers = await db.getAnswersByAttempt(attemptId);
    const answersInput = studentAnswers.map((a) => ({
      questionId: a.question_id,
      selectedOptionId: a.selected_option_id,
      writtenAnswer: a.written_answer,
      manualMarksAwarded: a.marks_awarded,
    }));

    const scoreSummary = calculateExamScore(
      rules,
      answersInput,
      exam.passing_marks,
      exam.negative_marking,
      exam.negative_mark_value
    );

    // Update marks_awarded on individual answer records in PostgreSQL
    for (const item of scoreSummary.items) {
      await db.upsertAnswer({
        attempt_id: attemptId,
        question_id: item.questionId,
        marks_awarded: item.marksAwarded,
      });
    }

    // Determine result publish status
    const shouldPublish =
      exam.result_release_setting === 'immediate' && !scoreSummary.hasPendingWrittenReview;

    const result = await db.upsertResult({
      attempt_id: attemptId,
      exam_id: exam.id,
      student_id: studentId,
      total_marks: scoreSummary.totalMarks,
      obtained_marks: scoreSummary.obtainedMarks,
      percentage: scoreSummary.percentage,
      is_passed: scoreSummary.isPassed,
      is_published: shouldPublish,
    });

    if (shouldPublish) {
      await db.insertNotification({
        user_id: studentId,
        title: 'Exam Result Published',
        message: `Your score for ${exam.title}: ${scoreSummary.obtainedMarks}/${scoreSummary.totalMarks} (${scoreSummary.percentage}% - ${scoreSummary.isPassed ? 'PASSED' : 'NEEDS IMPROVEMENT'}).`,
      });
    }

    return {
      success: true,
      attempt: updatedAttempt,
      result: shouldPublish ? result : null,
      scoreSummary: shouldPublish ? scoreSummary : null,
    };
  }
}

export const examService = new ExamService();
