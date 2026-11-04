import { Request, Response } from 'express';
import * as db from '../services/db';
import { examService } from '../services/examService';
import { supabaseAdmin, dataStore } from '../config/supabase';
import type { AuthenticatedRequest } from '../middleware/auth';

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

    try {
      const existing = await db.findProfileByEmail(normalizedEmail);
      if (existing) {
        res.status(400).json({ error: 'An account with this email address already exists in database' });
        return;
      }

      let studentId = `student-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;

      // Create Auth user in Supabase if service role is available
      if (supabaseAdmin) {
        try {
          const { data: authUser, error: authErr } = await supabaseAdmin.auth.admin.createUser({
            email: normalizedEmail,
            password,
            email_confirm: true,
            user_metadata: {
              full_name: full_name.trim(),
              role: 'student',
            },
          });
          if (!authErr && authUser?.user) {
            studentId = authUser.user.id;
          }
        } catch {
          // If auth creation fails (e.g. mock or already exists in auth), keep generated ID
        }
      }

      // 1. Create Profile - STRICTLY ENFORCE STUDENT ROLE
      const profile = await db.insertProfile({
        id: studentId,
        email: normalizedEmail,
        full_name: full_name.trim(),
        role: 'student', // Never trust client-provided role
        phone: phone || '',
      });

      // Keep credentials mapped for local token auth
      dataStore.credentials.set(normalizedEmail, password);
      dataStore.credentials.set(college_student_id.trim().toLowerCase(), password);
      dataStore.credentials.set(enrollment_number.trim().toLowerCase(), password);
      dataStore.studentCollegeIdMap.set(college_student_id.trim().toLowerCase(), studentId);
      dataStore.studentCollegeIdMap.set(enrollment_number.trim().toLowerCase(), studentId);

      // 2. Create Enrollment
      let enrollment: any = null;
      try {
        enrollment = await db.insertEnrollment({
          student_id: studentId,
          course_id,
          semester_id,
          college_student_id: college_student_id.trim(),
          enrollment_number: enrollment_number.trim(),
        });
      } catch (e: any) {
        console.warn('[Registration] Enrollment table write error:', e.message);
        enrollment = {
          id: `enr-${studentId}`,
          student_id: studentId,
          course_id,
          semester_id,
          college_student_id: college_student_id.trim(),
          enrollment_number: enrollment_number.trim(),
          created_at: new Date().toISOString(),
        };
      }

      // 3. Create Verification Request
      let verification: any = null;
      try {
        const idCardPath = id_card_image_url || 'https://images.unsplash.com/photo-1544717305-2782549b5136?auto=format&fit=crop&q=80&w=800';
        verification = await db.insertVerification({
          student_id: studentId,
          id_card_path: idCardPath,
          status: 'pending',
        });
      } catch (e: any) {
        console.warn('[Registration] Verification table write error:', e.message);
        verification = {
          id: `verif-${studentId}`,
          student_id: studentId,
          college_student_id: college_student_id.trim(),
          enrollment_number: enrollment_number.trim(),
          course_id,
          semester_id,
          status: 'pending',
          created_at: new Date().toISOString(),
        };
      }

      // 4. Verification Log
      try {
        await db.insertVerificationLog({
          student_id: studentId,
          action: 'submitted',
          reason: 'Initial student registration with college identity card upload.',
        });
      } catch {}

      // 5. System Notification
      try {
        await db.insertNotification({
          user_id: studentId,
          title: 'Registration Submitted',
          message: 'Your registration and College ID are under administrative review in database. You will be notified once verified.',
        });
      } catch {}

      res.status(201).json({
        success: true,
        user: profile,
        token: `token-${studentId}`,
        verification,
        enrollment,
      });
    } catch (err: any) {
      res.status(500).json({ error: err.message || 'Failed to complete student registration in database' });
    }
  }

  async getProfile(req: AuthenticatedRequest, res: Response): Promise<void> {
    const studentId = req.user!.id;
    try {
      const [profile, enrollment, verification, courses, semesters] = await Promise.all([
        db.findProfileById(studentId),
        db.getEnrollmentsByStudent(studentId),
        db.getVerificationByStudent(studentId),
        db.getAllCourses(),
        db.getSemestersByCourse(),
      ]);

      const course = enrollment ? courses.find((c) => c.id === enrollment.course_id) : null;
      const semester = enrollment ? semesters.find((s) => s.id === enrollment.semester_id) : null;

      res.json({
        profile: profile || req.user,
        enrollment,
        verification,
        course,
        semester,
      });
    } catch (err: any) {
      res.status(500).json({ error: err.message || 'Failed to fetch student profile from database' });
    }
  }

  async updateProfile(req: AuthenticatedRequest, res: Response): Promise<void> {
    const studentId = req.user!.id;
    const { full_name, phone, avatar_url } = req.body;

    try {
      const updated = await db.updateProfile(studentId, {
        full_name: full_name ? String(full_name).trim() : undefined,
        phone: phone !== undefined ? String(phone).trim() : undefined,
        avatar_url: avatar_url ? String(avatar_url).trim() : undefined,
      });

      res.json({ success: true, profile: updated });
    } catch (err: any) {
      res.status(500).json({ error: err.message || 'Failed to update profile in database' });
    }
  }

  async getVerificationStatus(req: AuthenticatedRequest, res: Response): Promise<void> {
    const studentId = req.user!.id;
    try {
      const [verification, logs] = await Promise.all([
        db.getVerificationByStudent(studentId),
        db.getVerificationLogs(studentId),
      ]);

      res.json({
        status: verification ? verification.status : 'not_submitted',
        verification,
        logs,
      });
    } catch (err: any) {
      res.status(500).json({ error: err.message || 'Failed to fetch verification status from database' });
    }
  }

  async resubmitVerification(req: AuthenticatedRequest, res: Response): Promise<void> {
    const studentId = req.user!.id;
    const { id_card_image_url, note } = req.body;

    try {
      const verification = await db.getVerificationByStudent(studentId);
      if (!verification) {
        res.status(404).json({ error: 'No verification record found in database' });
        return;
      }

      const updated = await db.updateVerification(verification.id, {
        status: 'pending',
        rejection_reason: null,
        id_card_path: id_card_image_url || verification.id_card_storage_path,
      });

      await db.insertVerificationLog({
        student_id: studentId,
        action: 'resubmitted',
        reason: note || 'Student resubmitted updated college ID credentials.',
      });

      await db.insertNotification({
        user_id: studentId,
        title: 'Verification Resubmitted',
        message: 'Your updated ID details have been submitted to the proctoring office for re-verification in PostgreSQL.',
      });

      res.json({ success: true, verification: updated });
    } catch (err: any) {
      res.status(500).json({ error: err.message || 'Failed to resubmit verification in database' });
    }
  }

  async getExams(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const exams = await examService.getStudentExams(req.user!.id);
      res.json({ exams });
    } catch (err: any) {
      res.status(500).json({ error: err.message || 'Failed to fetch student exams from database' });
    }
  }

  async getResults(req: AuthenticatedRequest, res: Response): Promise<void> {
    const studentId = req.user!.id;
    try {
      const [results, exams, attempts] = await Promise.all([
        db.getAllResults({ student_id: studentId }),
        db.getAllExams(),
        db.getAllAttempts({ student_id: studentId }),
      ]);

      const publishedResults = results
        .filter((r) => r.status === 'published')
        .map((r) => {
          const exam = exams.find((e) => e.id === r.exam_id);
          const attempt = attempts.find((a) => a.id === r.attempt_id);
          return {
            ...r,
            exam_title: exam?.title || 'Examination',
            subject: exam?.subject || '',
            passing_marks: exam?.passing_marks || 0,
            submitted_at: attempt?.submitted_at,
          };
        });

      res.json({ results: publishedResults });
    } catch (err: any) {
      res.status(500).json({ error: err.message || 'Failed to fetch results from database' });
    }
  }

  async getNotifications(req: AuthenticatedRequest, res: Response): Promise<void> {
    const studentId = req.user!.id;
    try {
      const notifications = await db.getNotificationsByUser(studentId);
      res.json({ notifications });
    } catch (err: any) {
      res.status(500).json({ error: err.message || 'Failed to fetch notifications from database' });
    }
  }

  async markNotificationRead(req: AuthenticatedRequest, res: Response): Promise<void> {
    const { id } = req.params;
    try {
      await db.markNotificationAsRead(id);
      res.json({ success: true });
    } catch (err: any) {
      res.status(500).json({ error: err.message || 'Failed to mark notification as read in database' });
    }
  }

  async deleteNotification(req: AuthenticatedRequest, res: Response): Promise<void> {
    const { id } = req.params;
    try {
      await db.deleteNotification(id).catch(() => {});
      dataStore.notifications = dataStore.notifications.filter((n) => n.id !== id);
      res.json({ success: true });
    } catch (err: any) {
      res.status(500).json({ error: err.message || 'Failed to delete notification from database' });
    }
  }
}

export const studentController = new StudentController();
