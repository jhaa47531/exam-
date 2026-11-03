import { Response } from 'express';
import { examService } from '../services/examService';
import { monitoringService } from '../services/monitoringService';
import { dataStore } from '../config/supabase';
import type { AuthenticatedRequest } from '../middleware/auth';

export class ExamController {
  async startExam(req: AuthenticatedRequest, res: Response): Promise<void> {
    const { id } = req.params; // exam_id
    const studentId = req.user!.id;
    const ipAddress = req.ip || req.socket.remoteAddress;
    const userAgent = req.headers['user-agent'];

    try {
      const data = examService.startOrResumeAttempt(id, studentId, ipAddress, userAgent);
      res.json(data);
    } catch (err: any) {
      res.status(400).json({ error: err.message || 'Could not start examination' });
    }
  }

  async getAttempt(req: AuthenticatedRequest, res: Response): Promise<void> {
    const { id } = req.params; // attempt_id
    const studentId = req.user!.id;

    const attempt = dataStore.examAttempts.find((a) => a.id === id);
    if (!attempt) {
      res.status(404).json({ error: 'Attempt not found' });
      return;
    }

    if (attempt.student_id !== studentId && req.user!.role !== 'admin') {
      res.status(403).json({ error: 'Access denied' });
      return;
    }

    const exam = dataStore.exams.find((e) => e.id === attempt.exam_id);
    const questions = examService.getSanitizedQuestions(attempt.exam_id);
    const answers = dataStore.answers.filter((a) => a.attempt_id === id);

    // Calculate remaining seconds
    const endMs = new Date(attempt.scheduled_end_time).getTime();
    const remainingSeconds = Math.max(0, Math.floor((endMs - Date.now()) / 1000));

    res.json({
      attempt,
      exam,
      questions,
      answers,
      remainingSeconds,
    });
  }

  async saveAnswers(req: AuthenticatedRequest, res: Response): Promise<void> {
    const { id } = req.params; // attempt_id
    const { answers } = req.body;
    const studentId = req.user!.id;

    if (!Array.isArray(answers)) {
      res.status(400).json({ error: 'answers must be an array' });
      return;
    }

    try {
      const result = examService.saveAnswers(id, studentId, answers);
      res.json(result);
    } catch (err: any) {
      res.status(400).json({ error: err.message || 'Failed to save answers' });
    }
  }

  async submitExam(req: AuthenticatedRequest, res: Response): Promise<void> {
    const { id } = req.params; // attempt_id
    const studentId = req.user!.id;

    try {
      const result = examService.submitAttempt(id, studentId);
      res.json(result);
    } catch (err: any) {
      res.status(400).json({ error: err.message || 'Failed to submit exam' });
    }
  }

  async recordSecurityEvent(req: AuthenticatedRequest, res: Response): Promise<void> {
    const { id } = req.params; // attempt_id
    const { event_type, event_details } = req.body;
    const studentId = req.user!.id;

    if (!event_type) {
      res.status(400).json({ error: 'event_type is required' });
      return;
    }

    const event = monitoringService.recordSecurityEvent(
      id,
      studentId,
      event_type,
      event_details
    );

    res.json({ success: true, event });
  }

  // SSE Stream for Real-time Attempt Updates (Holds, Warnings, Terminations)
  streamAttempt(req: AuthenticatedRequest, res: Response): void {
    const { id } = req.params; // attempt_id
    const studentId = req.user!.id;

    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    res.flushHeaders();

    monitoringService.addClient({
      id: `client-${Date.now()}`,
      res,
      role: 'student',
      attemptId: id,
      studentId,
    });

    res.write(`event: connected\ndata: ${JSON.stringify({ status: 'connected', attemptId: id })}\n\n`);
  }
}

export const examController = new ExamController();
