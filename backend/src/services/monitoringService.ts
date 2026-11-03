import { Response } from 'express';
import { dataStore } from '../config/supabase';
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

  recordSecurityEvent(
    attemptId: string,
    studentId: string,
    eventType: SecurityEvent['event_type'],
    details?: Record<string, any>
  ): SecurityEvent {
    const attempt = dataStore.examAttempts.find((a) => a.id === attemptId);
    if (attempt) {
      if (eventType === 'tab_switch') {
        attempt.tab_switch_count += 1;
        attempt.warning_count += 1;
      } else if (eventType === 'fullscreen_exit') {
        attempt.fullscreen_exit_count += 1;
        attempt.warning_count += 1;
      } else if (eventType === 'devtools_opened' || eventType === 'copy_paste') {
        attempt.warning_count += 1;
      }
      attempt.updated_at = new Date().toISOString();
    }

    const event: SecurityEvent = {
      id: `sec-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      attempt_id: attemptId,
      student_id: studentId,
      event_type: eventType,
      event_details: details,
      client_timestamp: new Date().toISOString(),
      created_at: new Date().toISOString(),
    };
    dataStore.securityEvents.push(event);

    // Notify admins in real-time
    this.broadcastToAdmins('security_event', {
      event,
      attempt,
      student: dataStore.profiles.find((p) => p.id === studentId),
    });

    return event;
  }

  sendWarning(
    attemptId: string,
    adminId: string,
    message: string
  ): { success: boolean; attempt?: ExamAttempt } {
    const attempt = dataStore.examAttempts.find((a) => a.id === attemptId);
    if (!attempt) return { success: false };

    attempt.warning_count += 1;
    attempt.updated_at = new Date().toISOString();

    const action: AdminAction = {
      id: `act-${Date.now()}`,
      admin_id: adminId,
      target_attempt_id: attemptId,
      target_student_id: attempt.student_id,
      action_type: 'warning',
      details: { message, warningCount: attempt.warning_count },
      created_at: new Date().toISOString(),
    };
    dataStore.adminActions.push(action);

    const notif: NotificationItem = {
      id: `notif-${Date.now()}`,
      user_id: attempt.student_id,
      title: 'PROCTOR WARNING ISSUED',
      message,
      type: 'warning',
      is_read: false,
      metadata: { attemptId, warningCount: attempt.warning_count },
      created_at: new Date().toISOString(),
    };
    dataStore.notifications.push(notif);

    this.broadcastToAttempt(attemptId, 'proctor_warning', {
      attemptId,
      warningCount: attempt.warning_count,
      message,
      timestamp: new Date().toISOString(),
    });

    return { success: true, attempt };
  }

  holdAttempt(
    attemptId: string,
    adminId: string,
    durationSeconds: number,
    reason: string
  ): { success: boolean; hold?: ExamHold; attempt?: ExamAttempt } {
    const attempt = dataStore.examAttempts.find((a) => a.id === attemptId);
    if (!attempt || attempt.status === 'submitted' || attempt.status === 'terminated') {
      return { success: false };
    }

    const holdStart = new Date().toISOString();
    const holdEnd = new Date(Date.now() + durationSeconds * 1000).toISOString();

    attempt.status = 'held';
    attempt.hold_until = holdEnd;
    attempt.hold_reason = reason;
    attempt.updated_at = holdStart;

    const hold: ExamHold = {
      id: `hold-${Date.now()}`,
      attempt_id: attemptId,
      admin_id: adminId,
      duration_seconds: durationSeconds,
      hold_start: holdStart,
      hold_end: holdEnd,
      reason,
      status: 'active',
      created_at: holdStart,
    };
    dataStore.examHolds.push(hold);

    const action: AdminAction = {
      id: `act-${Date.now()}`,
      admin_id: adminId,
      target_attempt_id: attemptId,
      target_student_id: attempt.student_id,
      action_type: 'hold',
      details: { durationSeconds, reason, holdEnd },
      created_at: holdStart,
    };
    dataStore.adminActions.push(action);

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
      holdEnd,
      reason,
    });

    return { success: true, hold, attempt };
  }

  resumeAttempt(
    attemptId: string,
    adminId: string
  ): { success: boolean; attempt?: ExamAttempt } {
    const attempt = dataStore.examAttempts.find((a) => a.id === attemptId);
    if (!attempt || attempt.status !== 'held') {
      return { success: false };
    }

    if (this.activeHoldTimeouts.has(attemptId)) {
      clearTimeout(this.activeHoldTimeouts.get(attemptId)!);
      this.activeHoldTimeouts.delete(attemptId);
    }

    attempt.status = 'in_progress';
    attempt.hold_until = undefined;
    attempt.hold_reason = undefined;
    attempt.updated_at = new Date().toISOString();

    const activeHold = dataStore.examHolds.find(
      (h) => h.attempt_id === attemptId && h.status === 'active'
    );
    if (activeHold) {
      activeHold.status = 'resumed';
    }

    const action: AdminAction = {
      id: `act-${Date.now()}`,
      admin_id: adminId,
      target_attempt_id: attemptId,
      target_student_id: attempt.student_id,
      action_type: 'resume',
      details: { resumedAt: new Date().toISOString() },
      created_at: new Date().toISOString(),
    };
    dataStore.adminActions.push(action);

    this.broadcastToAttempt(attemptId, 'exam_resumed', {
      attemptId,
      resumedAt: new Date().toISOString(),
    });

    return { success: true, attempt };
  }

  terminateAttempt(
    attemptId: string,
    adminId: string,
    reason: string
  ): { success: boolean; attempt?: ExamAttempt } {
    const attempt = dataStore.examAttempts.find((a) => a.id === attemptId);
    if (!attempt || attempt.status === 'submitted') {
      return { success: false };
    }

    if (this.activeHoldTimeouts.has(attemptId)) {
      clearTimeout(this.activeHoldTimeouts.get(attemptId)!);
      this.activeHoldTimeouts.delete(attemptId);
    }

    attempt.status = 'terminated';
    attempt.termination_reason = reason;
    attempt.submitted_at = new Date().toISOString();
    attempt.updated_at = new Date().toISOString();

    const action: AdminAction = {
      id: `act-${Date.now()}`,
      admin_id: adminId,
      target_attempt_id: attemptId,
      target_student_id: attempt.student_id,
      action_type: 'terminate',
      details: { reason },
      created_at: new Date().toISOString(),
    };
    dataStore.adminActions.push(action);

    const notif: NotificationItem = {
      id: `notif-${Date.now()}`,
      user_id: attempt.student_id,
      title: 'EXAMINATION TERMINATED BY PROCTOR',
      message: `Your examination was terminated: ${reason}`,
      type: 'alert',
      is_read: false,
      metadata: { attemptId, reason },
      created_at: new Date().toISOString(),
    };
    dataStore.notifications.push(notif);

    this.broadcastToAttempt(attemptId, 'exam_terminated', {
      attemptId,
      reason,
      terminatedAt: attempt.submitted_at,
    });

    return { success: true, attempt };
  }
}

export const monitoringService = new MonitoringService();
