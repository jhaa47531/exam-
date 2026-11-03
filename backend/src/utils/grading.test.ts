import test from 'node:test';
import assert from 'node:assert/strict';
import {
  calculateExamScore,
  calculateRemainingSeconds,
  validateExamEntryWindow,
  type QuestionGradingRule,
  type StudentAnswerInput
} from './grading';

test('calculateExamScore: perfectly scores MCQ and True/False questions', () => {
  const questions: QuestionGradingRule[] = [
    { id: 'q1', type: 'mcq', marks: 3, correctOptionId: 'opt-a' },
    { id: 'q2', type: 'mcq', marks: 2, correctOptionId: 'opt-c' },
    { id: 'q3', type: 'true_false', marks: 1, correctOptionId: 'opt-true' },
  ];

  const answers: StudentAnswerInput[] = [
    { questionId: 'q1', selectedOptionId: 'opt-a' },
    { questionId: 'q2', selectedOptionId: 'opt-c' },
    { questionId: 'q3', selectedOptionId: 'opt-true' },
  ];

  const result = calculateExamScore(questions, answers, 3);
  assert.equal(result.totalMarks, 6);
  assert.equal(result.obtainedMarks, 6);
  assert.equal(result.percentage, 100);
  assert.equal(result.isPassed, true);
  assert.equal(result.hasPendingWrittenReview, false);
});

test('calculateExamScore: deducts negative marks correctly when enabled', () => {
  const questions: QuestionGradingRule[] = [
    { id: 'q1', type: 'mcq', marks: 4, negativeMarks: 1, correctOptionId: 'opt-correct' },
    { id: 'q2', type: 'mcq', marks: 4, negativeMarks: 1, correctOptionId: 'opt-correct-2' },
  ];

  // 1 correct (+4), 1 wrong (-1)
  const answers: StudentAnswerInput[] = [
    { questionId: 'q1', selectedOptionId: 'opt-correct' },
    { questionId: 'q2', selectedOptionId: 'opt-wrong' },
  ];

  const result = calculateExamScore(questions, answers, 4);
  assert.equal(result.totalMarks, 8);
  assert.equal(result.obtainedMarks, 3);
  assert.equal(result.percentage, 37.5);
  assert.equal(result.isPassed, false);
});

test('calculateExamScore: handles written questions and detects pending reviews', () => {
  const questions: QuestionGradingRule[] = [
    { id: 'q1', type: 'mcq', marks: 5, correctOptionId: 'opt-1' },
    { id: 'q2', type: 'written', marks: 5 },
  ];

  // Written question not yet graded
  const answers: StudentAnswerInput[] = [
    { questionId: 'q1', selectedOptionId: 'opt-1' },
    { questionId: 'q2', writtenAnswer: 'A relational model organizes data...' },
  ];

  const pending = calculateExamScore(questions, answers, 5);
  assert.equal(pending.hasPendingWrittenReview, true);
  assert.equal(pending.obtainedMarks, 5);

  // Once admin grades the written question
  const gradedAnswers: StudentAnswerInput[] = [
    { questionId: 'q1', selectedOptionId: 'opt-1' },
    { questionId: 'q2', writtenAnswer: '...', manualMarksAwarded: 4.5 },
  ];

  const reviewed = calculateExamScore(questions, gradedAnswers, 8);
  assert.equal(reviewed.hasPendingWrittenReview, false);
  assert.equal(reviewed.obtainedMarks, 9.5);
  assert.equal(reviewed.percentage, 95);
  assert.equal(reviewed.isPassed, true);
});

test('calculateRemainingSeconds: counts down correctly to 0 without going negative', () => {
  const now = 100000;
  assert.equal(calculateRemainingSeconds(now + 45000, now), 45);
  assert.equal(calculateRemainingSeconds(now - 5000, now), 0);
});

test('validateExamEntryWindow: strictly enforces start time, end time, and late entry cutoff', () => {
  const base = new Date('2026-11-03T10:00:00Z').getTime();
  const start = new Date(base).toISOString();
  const end = new Date(base + 60 * 60 * 1000).toISOString(); // 11:00
  const lateCutoffMins = 15;

  // Too early
  const earlyCheck = validateExamEntryWindow(start, end, lateCutoffMins, base - 5 * 60 * 1000);
  assert.equal(earlyCheck.allowed, false);

  // Exactly on time (10:00)
  const onTimeCheck = validateExamEntryWindow(start, end, lateCutoffMins, base);
  assert.equal(onTimeCheck.allowed, true);

  // 10 minutes in (within 15 min cutoff)
  const okCheck = validateExamEntryWindow(start, end, lateCutoffMins, base + 10 * 60 * 1000);
  assert.equal(okCheck.allowed, true);

  // 20 minutes in (exceeded 15 min cutoff)
  const lateCheck = validateExamEntryWindow(start, end, lateCutoffMins, base + 20 * 60 * 1000);
  assert.equal(lateCheck.allowed, false);

  // After exam end
  const endedCheck = validateExamEntryWindow(start, end, lateCutoffMins, base + 70 * 60 * 1000);
  assert.equal(endedCheck.allowed, false);
});
