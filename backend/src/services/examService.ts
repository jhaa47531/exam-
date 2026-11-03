import { dataStore } from '../config/supabase';
import { calculateExamScore, validateExamEntryWindow } from '../utils/grading';
import type {
  Exam,
  ExamAttempt,
  Question,
  QuestionOption,
  StudentAnswer,
  ExamResult,
  NotificationItem,
} from '../types';

export class ExamService {
  /**
   * Retrieves all exams available/assigned to a verified student.
   */
  getStudentExams(studentId: string) {
    const enrollment = dataStore.studentEnrollments.find(
      (e) => e.student_id === studentId
    );

    const assignments = dataStore.examAssignments.filter(
      (a) => a.student_id === studentId
    );
    const assignedExamIds = new Set(assignments.map((a) => a.exam_id));

    const eligibleExams = dataStore.exams.filter((exam) => {
      if (exam.status === 'draft') return false;
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
      const attempt = dataStore.examAttempts.find(
        (a) => a.exam_id === exam.id && a.student_id === studentId
      );
      const result = dataStore.results.find(
        (r) => r.exam_id === exam.id && r.student_id === studentId
      );

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
   * Starts a new attempt or resumes an active attempt with server-authoritative timing.
   */
  startOrResumeAttempt(
    examId: string,
    studentId: string,
    ipAddress?: string,
    userAgent?: string
  ) {
    const exam = dataStore.exams.find((e) => e.id === examId);
    if (!exam) {
      throw new Error('Exam not found');
    }

    if (exam.status !== 'published') {
      throw new Error(`Exam is not currently published (Status: ${exam.status})`);
    }

    // Check existing attempt
    let attempt = dataStore.examAttempts.find(
      (a) => a.exam_id === examId && a.student_id === studentId
    );

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

      return {
        attempt,
        exam,
        questions: this.getSanitizedQuestions(examId),
        answers: dataStore.answers.filter((a) => a.attempt_id === attempt!.id),
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
    // End time is min(now + duration, exam.end_time)
    const nowMs = Date.now();
    const durationEndMs = nowMs + exam.duration_minutes * 60 * 1000;
    const commonWindowEndMs = new Date(exam.end_time).getTime();
    const authoritativeEndMs = Math.min(durationEndMs, commonWindowEndMs);

    attempt = {
      id: `attempt-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      exam_id: examId,
      student_id: studentId,
      start_time: new Date(nowMs).toISOString(),
      scheduled_end_time: new Date(authoritativeEndMs).toISOString(),
      status: 'in_progress',
      warning_count: 0,
      tab_switch_count: 0,
      fullscreen_exit_count: 0,
      ip_address: ipAddress,
      user_agent: userAgent,
      created_at: new Date(nowMs).toISOString(),
      updated_at: new Date(nowMs).toISOString(),
    };
    dataStore.examAttempts.push(attempt);

    return {
      attempt,
      exam,
      questions: this.getSanitizedQuestions(examId),
      answers: [],
    };
  }

  /**
   * Sanitizes questions to ensure correct answers and option keys are never exposed to students.
   */
  getSanitizedQuestions(examId: string) {
    const rawQuestions = dataStore.questions
      .filter((q) => q.exam_id === examId)
      .sort((a, b) => a.order_index - b.order_index);

    return rawQuestions.map((q) => {
      const options = dataStore.questionOptions
        .filter((opt) => opt.question_id === q.id)
        .sort((a, b) => a.order_index - b.order_index)
        .map((opt) => ({
          id: opt.id,
          question_id: opt.question_id,
          option_text: opt.option_text,
          order_index: opt.order_index,
          // NOTE: is_correct is strictly omitted!
        }));

      return {
        id: q.id,
        exam_id: q.exam_id,
        question_text: q.question_text,
        question_type: q.question_type,
        marks: q.marks,
        negative_marks: q.negative_marks,
        order_index: q.order_index,
        options,
      };
    });
  }

  /**
   * Saves or updates student answers in real-time.
   */
  saveAnswers(
    attemptId: string,
    studentId: string,
    answersList: Array<{
      question_id: string;
      selected_option_id?: string;
      written_answer?: string;
    }>
  ) {
    const attempt = dataStore.examAttempts.find((a) => a.id === attemptId);
    if (!attempt) throw new Error('Attempt not found');
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
      let existing = dataStore.answers.find(
        (a) => a.attempt_id === attemptId && a.question_id === item.question_id
      );

      if (existing) {
        existing.selected_option_id = item.selected_option_id;
        existing.written_answer = item.written_answer;
        existing.updated_at = new Date().toISOString();
      } else {
        const newAns: StudentAnswer = {
          id: `ans-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
          attempt_id: attemptId,
          question_id: item.question_id,
          selected_option_id: item.selected_option_id,
          written_answer: item.written_answer,
          is_marked: false,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        };
        dataStore.answers.push(newAns);
      }
    }

    attempt.updated_at = new Date().toISOString();
    return { success: true, savedCount: answersList.length };
  }

  /**
   * Submits exam attempt and computes automatic grading.
   */
  submitAttempt(attemptId: string, studentId: string) {
    const attempt = dataStore.examAttempts.find((a) => a.id === attemptId);
    if (!attempt) throw new Error('Attempt not found');
    if (attempt.student_id !== studentId) throw new Error('Unauthorized');
    if (attempt.status === 'submitted') {
      const existingResult = dataStore.results.find((r) => r.attempt_id === attemptId);
      return { success: true, attempt, result: existingResult };
    }

    const exam = dataStore.exams.find((e) => e.id === attempt.exam_id);
    if (!exam) throw new Error('Exam not found');

    const submittedAt = new Date().toISOString();
    attempt.status = 'submitted';
    attempt.submitted_at = submittedAt;
    attempt.updated_at = submittedAt;

    // Load grading rules and correct options
    const examQuestions = dataStore.questions.filter((q) => q.exam_id === exam.id);
    const rules = examQuestions.map((q) => {
      const correctOpt = dataStore.questionOptions.find(
        (o) => o.question_id === q.id && o.is_correct
      );
      return {
        id: q.id,
        type: q.question_type,
        marks: q.marks,
        negativeMarks: q.negative_marks,
        correctOptionId: correctOpt?.id,
      };
    });

    const studentAnswers = dataStore.answers.filter((a) => a.attempt_id === attemptId);
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

    // Update marks_awarded on individual answer records
    for (const item of scoreSummary.items) {
      const ans = studentAnswers.find((a) => a.question_id === item.questionId);
      if (ans) {
        ans.marks_awarded = item.marksAwarded;
        ans.is_marked = !item.needsManualReview;
      }
    }

    // Determine result publish status
    const shouldPublish =
      exam.result_release_setting === 'immediate' && !scoreSummary.hasPendingWrittenReview;

    let result = dataStore.results.find((r) => r.attempt_id === attemptId);
    if (result) {
      result.total_marks = scoreSummary.totalMarks;
      result.obtained_marks = scoreSummary.obtainedMarks;
      result.percentage = scoreSummary.percentage;
      result.is_passed = scoreSummary.isPassed;
      result.status = shouldPublish ? 'published' : result.status;
      if (shouldPublish && !result.published_at) {
        result.published_at = submittedAt;
      }
    } else {
      result = {
        id: `res-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
        attempt_id: attemptId,
        exam_id: exam.id,
        student_id: studentId,
        total_marks: scoreSummary.totalMarks,
        obtained_marks: scoreSummary.obtainedMarks,
        percentage: scoreSummary.percentage,
        is_passed: scoreSummary.isPassed,
        status: shouldPublish ? 'published' : 'draft',
        published_at: shouldPublish ? submittedAt : undefined,
        generated_at: submittedAt,
      };
      dataStore.results.push(result);
    }

    if (shouldPublish) {
      const notif: NotificationItem = {
        id: `notif-${Date.now()}`,
        user_id: studentId,
        title: 'Exam Result Published',
        message: `Your score for ${exam.title}: ${scoreSummary.obtainedMarks}/${scoreSummary.totalMarks} (${scoreSummary.percentage}% - ${scoreSummary.isPassed ? 'PASSED' : 'NEEDS IMPROVEMENT'}).`,
        type: scoreSummary.isPassed ? 'success' : 'info',
        is_read: false,
        metadata: { examId: exam.id, resultId: result.id },
        created_at: submittedAt,
      };
      dataStore.notifications.push(notif);
    }

    return {
      success: true,
      attempt,
      result: shouldPublish ? result : null,
      scoreSummary: shouldPublish ? scoreSummary : null,
    };
  }
}

export const examService = new ExamService();
