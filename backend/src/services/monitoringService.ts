import { Response } from 'express';
import * as db from './db';
import type { ExamAttempt, SecurityEvent, AdminAction, ExamHold, NotificationItem } from '../types';

interface SSEClient {
  id: string;
  res: Response;
  role: 'admin' | 'student';
  attemptId?: string;
  studentId?: string;
}

class MonitoringService {
  private clients: Set<SSEClient> = new Set();
  private activeHoldTimeouts: Map<string, NodeJS.Timeout> = new Map();

  addClient(client: SSEClient) {
    this.clients.add(client);
    client.res.on('close', () => {
      this.clients.delete(client);
    });
  }

  broadcastToAdmins(event: string, data: any) {
    const payload = `event: ${event}\ndata: ${JSON.stringify(data)}\n\n`;
    for (const client of this.clients) {
      if (client.role === 'admin') {
        try {
          client.res.write(payload);
        } catch {
          this.clients.delete(client);
        }
      }
    }
  }

  broadcastToAttempt(attemptId: string, event: string, data: any) {
    const payload = `event: ${event}\ndata: ${JSON.stringify(data)}\n\n`;
    for (const client of this.clients) {
      if (client.attemptId === attemptId || client.role === 'admin') {
        try {
          client.res.write(payload);
        } catch {
          this.clients.delete(client);
        }
      }
    }
  }

  async recordSecurityEvent(
    attemptId: string,
    studentId: string,
    eventType: SecurityEvent['event_type'],
    details?: Record<string, any>
  ): Promise<SecurityEvent> {
    const attempt = await db.getAttemptById(attemptId);
    if (attempt) {
      await db.updateAttempt(attemptId, {
        warning_count: (attempt.warning_count || 0) + 1,
      });
    }

    const event = await db.insertSecurityEvent({
      attempt_id: attemptId,
      student_id: studentId,
      event_type: eventType,
      event_details: details,
    });

    const student = await db.findProfileById(studentId);

    // Notify admins in real-time
    this.broadcastToAdmins('security_event', {
      event,
      attempt,
      student,
    });

    return event;
  }

  async sendWarning(
    attemptId: string,
    adminId: string,
    message: string
  ): Promise<{ success: boolean; attempt?: ExamAttempt }> {
    const attempt = await db.getAttemptById(attemptId);
    if (!attempt) return { success: false };

    const updated = await db.updateAttempt(attemptId, {
      warning_count: (attempt.warning_count || 0) + 1,
    });

    await db.insertAdminAction({
      admin_id: adminId,
      attempt_id: attemptId,
      target_student_id: attempt.student_id,
      action_type: 'warning',
      reason: message,
      details: { message, warningCount: updated.warning_count },
    });

    await db.insertNotification({
      user_id: attempt.student_id,
      title: 'PROCTOR WARNING ISSUED',
      message,
    });

    this.broadcastToAttempt(attemptId, 'proctor_warning', {
      attemptId,
      warningCount: updated.warning_count,
      message,
      timestamp: new Date().toISOString(),
    });

    return { success: true, attempt: updated };
  }

  async holdAttempt(
    attemptId: string,
    adminId: string,
    durationSeconds: number,
    reason: string
  ): Promise<{ success: boolean; hold?: ExamHold; attempt?: ExamAttempt }> {
    const attempt = await db.getAttemptById(attemptId);
    if (!attempt || attempt.status === 'submitted' || attempt.status === 'terminated') {
      return { success: false };
    }

    const hold = await db.insertExamHold({
      attempt_id: attemptId,
      admin_id: adminId,
      duration_seconds: durationSeconds,
      reason,
    });

    const updated = await db.updateAttempt(attemptId, {
      status: 'held' as any,
    });

    // Schedule auto-resume if duration > 0
    if (this.activeHoldTimeouts.has(attemptId)) {
      clearTimeout(this.activeHoldTimeouts.get(attemptId)!);
    }
    const timeout = setTimeout(() => {
      this.resumeAttempt(attemptId, 'system-auto-resume');
    }, durationSeconds * 1000);
    this.activeHoldTimeouts.set(attemptId, timeout);

    this.broadcastToAttempt(attemptId, 'exam_held', {
      attemptId,
      durationSeconds,
      holdEnd: hold.hold_end,
      reason,
    });

    return { success: true, hold, attempt: updated };
  }

  async resumeAttempt(
    attemptId: string,
    adminId: string
  ): Promise<{ success: boolean; attempt?: ExamAttempt }> {
    const attempt = await db.getAttemptById(attemptId);
    if (!attempt || attempt.status !== 'held') {
      return { success: false };
    }

    if (this.activeHoldTimeouts.has(attemptId)) {
      clearTimeout(this.activeHoldTimeouts.get(attemptId)!);
      this.activeHoldTimeouts.delete(attemptId);
    }

    const updated = await db.updateAttempt(attemptId, {
      status: 'in_progress' as any,
    });

    await db.updateExamHoldStatus(attemptId, 'resumed');

    await db.insertAdminAction({
      admin_id: adminId,
      attempt_id: attemptId,
      target_student_id: attempt.student_id,
      action_type: 'resume',
      reason: 'Resumed exam attempt',
    });

    this.broadcastToAttempt(attemptId, 'exam_resumed', {
      attemptId,
      resumedAt: new Date().toISOString(),
    });

    return { success: true, attempt: updated };
  }

  async terminateAttempt(
    attemptId: string,
    adminId: string,
    reason: string
  ): Promise<{ success: boolean; attempt?: ExamAttempt }> {
    const attempt = await db.getAttemptById(attemptId);
    if (!attempt || attempt.status === 'submitted') {
      return { success: false };
    }

    if (this.activeHoldTimeouts.has(attemptId)) {
      clearTimeout(this.activeHoldTimeouts.get(attemptId)!);
      this.activeHoldTimeouts.delete(attemptId);
    }

    const updated = await db.updateAttempt(attemptId, {
      status: 'terminated' as any,
      termination_reason: reason,
      submitted_at: new Date().toISOString(),
    });

    await db.insertAdminAction({
      admin_id: adminId,
      attempt_id: attemptId,
      target_student_id: attempt.student_id,
      action_type: 'terminate',
      reason,
    });

    await db.insertNotification({
      user_id: attempt.student_id,
      title: 'EXAMINATION TERMINATED BY PROCTOR',
      message: `Your examination was terminated: ${reason}`,
    });

    this.broadcastToAttempt(attemptId, 'exam_terminated', {
      attemptId,
      reason,
      terminatedAt: updated.submitted_at,
    });

    return { success: true, attempt: updated };
  }
}

export const monitoringService = new MonitoringService();
