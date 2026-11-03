import { Request, Response } from 'express';
import { dataStore } from '../config/supabase';
import { examService } from '../services/examService';
import type { AuthenticatedRequest } from '../middleware/auth';
import type {
  UserProfile,
  StudentEnrollment,
  StudentVerification,
  VerificationLog,
  NotificationItem,
} from '../types';

export class StudentController {
  async register(req: Request, res: Response): Promise<void> {
    const {
      full_name,
      email,
      password,
      college_student_id,
      enrollment_number,
      course_id,
      semester_id,
      id_card_image_url,
      phone,
    } = req.body;

    // Validate inputs
    if (
      !full_name ||
      !email ||
      !password ||
      !college_student_id ||
      !enrollment_number ||
      !course_id ||
      !semester_id
    ) {
      res.status(400).json({
        error: 'All fields including college ID and course details are required',
      });
      return;
    }

    if (password.length < 6) {
      res.status(400).json({ error: 'Password must be at least 6 characters long' });
      return;
    }

    const normalizedEmail = email.trim().toLowerCase();
    const existing = dataStore.profiles.find((p) => p.email.toLowerCase() === normalizedEmail);
    if (existing) {
      res.status(400).json({ error: 'An account with this email address already exists' });
      return;
    }

    const studentId = `student-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
    const now = new Date().toISOString();

    // 1. Create Profile - STRICTLY ENFORCE STUDENT ROLE
    const profile: UserProfile = {
      id: studentId,
      email: normalizedEmail,
      full_name: full_name.trim(),
      role: 'student', // Never trust client-provided role
      phone: phone || '',
      created_at: now,
      updated_at: now,
    };
    dataStore.profiles.push(profile);
    dataStore.credentials.set(normalizedEmail, password);

    // 2. Create Enrollment
    const enrollment: StudentEnrollment = {
      id: `enroll-${Date.now()}`,
      student_id: studentId,
      course_id,
      semester_id,
      college_student_id: college_student_id.trim(),
      enrollment_number: enrollment_number.trim(),
      created_at: now,
    };
    dataStore.studentEnrollments.push(enrollment);

    // 3. Create Verification Request (Status: pending)
    const verification: StudentVerification = {
      id: `verif-${Date.now()}`,
      student_id: studentId,
      college_student_id: college_student_id.trim(),
      enrollment_number: enrollment_number.trim(),
      course_id,
      semester_id,
      id_card_image_url: id_card_image_url || 'https://images.unsplash.com/photo-1544717305-2782549b5136?auto=format&fit=crop&q=80&w=800',
      id_card_storage_path: `${studentId}/college_id_${Date.now()}.png`,
      status: 'pending',
      created_at: now,
      updated_at: now,
    };
    dataStore.studentVerifications.push(verification);

    // 4. Verification Log
    const verifLog: VerificationLog = {
      id: `log-${Date.now()}`,
      verification_id: verification.id,
      student_id: studentId,
      action: 'submitted',
      note: 'Initial student registration with college identity card upload.',
      created_at: now,
    };
    dataStore.verificationLogs.push(verifLog);

    // 5. System Notification
    const notif: NotificationItem = {
      id: `notif-${Date.now()}`,
      user_id: studentId,
      title: 'Registration Submitted',
      message: 'Your registration and College ID are under administrative review. You will be notified once verified.',
      type: 'info',
      is_read: false,
      created_at: now,
    };
    dataStore.notifications.push(notif);

    res.status(201).json({
      success: true,
      user: profile,
      token: `token-${studentId}`,
      verification,
      enrollment,
    });
  }

  async getProfile(req: AuthenticatedRequest, res: Response): Promise<void> {
    const studentId = req.user!.id;
    const profile = dataStore.profiles.find((p) => p.id === studentId);
    const enrollment = dataStore.studentEnrollments.find((e) => e.student_id === studentId);
    const verification = dataStore.studentVerifications.find((v) => v.student_id === studentId);
    const course = enrollment ? dataStore.courses.find((c) => c.id === enrollment.course_id) : null;
    const semester = enrollment ? dataStore.semesters.find((s) => s.id === enrollment.semester_id) : null;

    res.json({
      profile,
      enrollment,
      verification,
      course,
      semester,
    });
  }

  async getVerificationStatus(req: AuthenticatedRequest, res: Response): Promise<void> {
    const studentId = req.user!.id;
    const verification = dataStore.studentVerifications.find((v) => v.student_id === studentId);
    const logs = dataStore.verificationLogs.filter((l) => l.student_id === studentId);

    res.json({
      status: verification ? verification.status : 'not_submitted',
      verification,
      logs,
    });
  }

  async resubmitVerification(req: AuthenticatedRequest, res: Response): Promise<void> {
    const studentId = req.user!.id;
    const { id_card_image_url, college_student_id, enrollment_number, note } = req.body;

    const verification = dataStore.studentVerifications.find((v) => v.student_id === studentId);
    if (!verification) {
      res.status(404).json({ error: 'No verification record found' });
      return;
    }

    const now = new Date().toISOString();
    verification.status = 'pending';
    verification.rejection_reason = undefined;
    if (id_card_image_url) verification.id_card_image_url = id_card_image_url;
    if (college_student_id) verification.college_student_id = college_student_id;
    if (enrollment_number) verification.enrollment_number = enrollment_number;
    verification.updated_at = now;

    const log: VerificationLog = {
      id: `log-${Date.now()}`,
      verification_id: verification.id,
      student_id: studentId,
      action: 'resubmitted',
      note: note || 'Student resubmitted updated college ID credentials.',
      created_at: now,
    };
    dataStore.verificationLogs.push(log);

    const notif: NotificationItem = {
      id: `notif-${Date.now()}`,
      user_id: studentId,
      title: 'Verification Resubmitted',
      message: 'Your updated ID details have been submitted to the proctoring office for re-verification.',
      type: 'info',
      is_read: false,
      created_at: now,
    };
    dataStore.notifications.push(notif);

    res.json({ success: true, verification });
  }

  async getExams(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const exams = examService.getStudentExams(req.user!.id);
      res.json({ exams });
    } catch (err: any) {
      res.status(500).json({ error: err.message || 'Failed to fetch student exams' });
    }
  }

  async getResults(req: AuthenticatedRequest, res: Response): Promise<void> {
    const studentId = req.user!.id;
    const publishedResults = dataStore.results
      .filter((r) => r.student_id === studentId && r.status === 'published')
      .map((r) => {
        const exam = dataStore.exams.find((e) => e.id === r.exam_id);
        const attempt = dataStore.examAttempts.find((a) => a.id === r.attempt_id);
        return {
          ...r,
          exam_title: exam?.title || 'Examination',
          subject: exam?.subject || '',
          passing_marks: exam?.passing_marks || 0,
          submitted_at: attempt?.submitted_at,
        };
      });

    res.json({ results: publishedResults });
  }

  async getNotifications(req: AuthenticatedRequest, res: Response): Promise<void> {
    const studentId = req.user!.id;
    const notifications = dataStore.notifications
      .filter((n) => n.user_id === studentId)
      .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());

    res.json({ notifications });
  }

  async markNotificationRead(req: AuthenticatedRequest, res: Response): Promise<void> {
    const { id } = req.params;
    const notif = dataStore.notifications.find(
      (n) => n.id === id && n.user_id === req.user!.id
    );

    if (notif) {
      notif.is_read = true;
    }

    res.json({ success: true });
  }
}

export const studentController = new StudentController();
