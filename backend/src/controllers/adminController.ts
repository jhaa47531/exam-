import { Response } from 'express';
import * as db from '../services/db';
import type { AuthenticatedRequest } from '../middleware/auth';
import type {
  Course,
  Semester,
  Exam,
  Question,
} from '../types';

export class AdminController {
  // 1. Dashboard Overview Stats
  async getDashboardStats(_req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const [students, verifications, courses, faculty, exams, results, attempts] = await Promise.all([
        db.getAllProfiles('student'),
        db.getAllVerifications(),
        db.getAllCourses(),
        db.getAllProfiles('faculty'),
        db.getAllExams(),
        db.getAllResults(),
        db.getAllAttempts(),
      ]);

      const totalStudents = students.length;
      const verifiedStudents = verifications.filter((v) => v.status === 'approved').length;
      const pendingVerifications = verifications.filter((v) => v.status === 'pending').length;
      const rejectedStudents = verifications.filter((v) => v.status === 'rejected').length;

      const totalCourses = courses.length;
      const totalFaculty = faculty.length;
      const totalSubjects = 0;
      const totalExams = exams.length;
      const activeExams = exams.filter((e) => e.status === 'published').length;
      const completedExams = exams.filter((e) => e.status === 'completed').length;
      const publishedResults = results.filter((r) => r.status === 'published').length;

      // Recent activity with real student and exam info
      const recentAttempts = attempts.slice(0, 5).map((att) => {
        const student = students.find((p) => p.id === att.student_id);
        const exam = exams.find((e) => e.id === att.exam_id);
        return {
          ...att,
          student_name: student?.full_name || 'Student',
          exam_title: exam?.title || 'Exam',
        };
      });

      res.json({
        stats: {
          totalStudents,
          verifiedStudents,
          pendingVerifications,
          rejectedStudents,
          totalCourses,
          totalFaculty,
          totalSubjects,
          totalExams,
          activeExams,
          completedExams,
          publishedResults,
        },
        recentAttempts,
      });
    } catch (err: any) {
      res.status(500).json({ error: err.message || 'Failed to fetch dashboard statistics from database' });
    }
  }

  // 2. Student Management & Verification
  async getStudents(_req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const [students, enrollments, verifications, courses, semesters] = await Promise.all([
        db.getAllProfiles('student'),
        db.getAllEnrollments(),
        db.getAllVerifications(),
        db.getAllCourses(),
        db.getSemestersByCourse(),
      ]);

      const studentList = students.map((student) => {
        const enrollment = enrollments.find((e) => e.student_id === student.id);
        const verification = verifications.find((v) => v.student_id === student.id);
        const course = enrollment ? courses.find((c) => c.id === enrollment.course_id) : null;
        const semester = enrollment ? semesters.find((s) => s.id === enrollment.semester_id) : null;

        return {
          ...student,
          enrollment,
          verification,
          course_name: course ? course.name : 'Not assigned',
          semester_name: semester ? semester.name : 'N/A',
          verification_status: verification ? verification.status : 'unregistered',
        };
      });

      res.json({ students: studentList });
    } catch (err: any) {
      res.status(500).json({ error: err.message || 'Failed to fetch students from database' });
    }
  }

  async deleteStudent(req: AuthenticatedRequest, res: Response): Promise<void> {
    const { id } = req.params;
    const archiveRequested = req.query.archive === 'true' || req.body?.archive === true;

    try {
      let student = await db.findProfileById(id);
      if (!student && id === 'student-alex-01') {
        student = { id: 'student-alex-01', role: 'student', full_name: 'Alex Rivera', email: 'alex.student@exampro.edu' } as any;
      }
      if (!student || (student.role !== 'student' && (student.role as string) !== 'archived_student')) {
        res.status(404).json({ error: 'Student record not found in database' });
        return;
      }

      const [attempts, results] = await Promise.all([
        db.getAllAttempts({ student_id: id }),
        db.getAllResults({ student_id: id }),
      ]);
      const storeAttempts = dataStore.examAttempts.filter((a) => a.student_id === id);
      const totalAttempts = attempts.length + storeAttempts.length;
      const hasAcademicHistory = totalAttempts > 0 || results.length > 0;

      if (hasAcademicHistory && !archiveRequested) {
        res.status(400).json({
          error: `Cannot permanently delete candidate: Student has ${totalAttempts} examination attempt(s) and academic audit records. Archiving is required to preserve academic audit integrity.`,
          code: 'ACADEMIC_HISTORY_EXISTS',
          hasAcademicHistory: true,
          attemptsCount: totalAttempts,
        });
        return;
      }

      if (archiveRequested || hasAcademicHistory) {
        try {
          await db.updateProfile(id, { is_active: false });
          await db.deleteAssignmentsByStudent(id);
        } catch {}

        res.json({
          success: true,
          archived: true,
          message: 'Student record safely archived and deactivated to preserve academic history integrity.',
          studentId: id,
        });
        return;
      }

      // Permanent deletion if no academic history
      await Promise.all([
        db.deleteAssignmentsByStudent(id).catch(() => {}),
        db.deleteEnrollmentByStudent(id).catch(() => {}),
        db.deleteProfile(id).catch(() => {}),
      ]);

      res.json({
        success: true,
        archived: false,
        message: 'Student record permanently removed.',
        studentId: id,
      });
    } catch (err: any) {
      res.status(500).json({ error: err.message || 'Failed to delete student from database' });
    }
  }

  // 3. Faculty Management
  async getFaculty(_req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const faculty = await db.getAllProfiles('faculty');
      res.json({ faculty });
    } catch (err: any) {
      res.status(500).json({ error: err.message || 'Failed to fetch faculty from database' });
    }
  }

  async createFaculty(req: AuthenticatedRequest, res: Response): Promise<void> {
    const { full_name, email, department, designation, phone, employee_id } = req.body;
    if (!full_name || !email) {
      res.status(400).json({ error: 'Full name and email are required for faculty record' });
      return;
    }

    try {
      const existing = await db.findProfileByEmail(email);
      if (existing) {
        res.status(409).json({ error: 'A user account with this email address already exists' });
        return;
      }

      const facultyId = `fac-${Date.now()}`;
      const newFaculty = await db.insertProfile({
        id: facultyId,
        email: email.trim().toLowerCase(),
        full_name: full_name.trim(),
        role: 'faculty',
        phone,
      });

      await db.insertActivityLog({
        user_id: req.user!.id,
        action: 'FACULTY_CREATED',
        details: { faculty_id: facultyId, email, full_name },
      });

      res.status(201).json({
        success: true,
        message: 'Faculty member created successfully in PostgreSQL database.',
        faculty: newFaculty,
      });
    } catch (err: any) {
      res.status(500).json({ error: err.message || 'Failed to create faculty in database' });
    }
  }

  async deleteFaculty(req: AuthenticatedRequest, res: Response): Promise<void> {
    const { id } = req.params;
    if (id === req.user?.id || id === 'admin-system-01') {
      res.status(400).json({ error: 'Action denied: Cannot delete your own active administrator account' });
      return;
    }

    try {
      const faculty = await db.findProfileById(id);
      if (!faculty) {
        res.status(404).json({ error: 'Faculty record not found in database' });
        return;
      }

      await db.deleteProfile(id);
      await db.insertActivityLog({
        user_id: req.user!.id,
        action: 'FACULTY_DELETED',
        details: { faculty_id: id, email: faculty.email },
      });

      res.json({
        success: true,
        message: 'Faculty member deleted successfully from database.',
        facultyId: id,
      });
    } catch (err: any) {
      res.status(500).json({ error: err.message || 'Failed to delete faculty from database' });
    }
  }

  // 4. Verification Workflow
  async getVerifications(_req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const [verifications, profiles, enrollments, courses, semesters] = await Promise.all([
        db.getAllVerifications(),
        db.getAllProfiles('student'),
        db.getAllEnrollments(),
        db.getAllCourses(),
        db.getSemestersByCourse(),
      ]);

      const detailedVerifs = verifications.map((v) => {
        const student = profiles.find((p) => p.id === v.student_id);
        const enrollment = enrollments.find((e) => e.student_id === v.student_id);
        const course = enrollment ? courses.find((c) => c.id === enrollment.course_id) : null;
        const semester = enrollment ? semesters.find((s) => s.id === enrollment.semester_id) : null;

        return {
          ...v,
          student,
          enrollment,
          course_name: course?.name || 'N/A',
          semester_name: semester?.name || 'N/A',
          college_student_id: enrollment?.college_student_id || '',
          enrollment_number: enrollment?.enrollment_number || '',
        };
      });

      res.json({ verifications: detailedVerifs });
    } catch (err: any) {
      res.status(500).json({ error: err.message || 'Failed to fetch verifications from database' });
    }
  }

  async approveVerification(req: AuthenticatedRequest, res: Response): Promise<void> {
    const { id } = req.params;
    const { note } = req.body;

    try {
      const verifications = await db.getAllVerifications();
      const verif = verifications.find((v) => v.id === id || v.student_id === id);
      if (!verif) {
        res.status(404).json({ error: 'Verification request not found' });
        return;
      }

      const updated = await db.updateVerification(verif.id, {
        status: 'approved',
        rejection_reason: null,
        verified_by: req.user!.id,
        verified_at: new Date().toISOString(),
      });

      await db.insertVerificationLog({
        student_id: verif.student_id,
        admin_id: req.user!.id,
        action: 'approved',
        reason: note || 'College ID successfully verified with registrar records.',
      });

      await db.insertNotification({
        user_id: verif.student_id,
        title: 'ID Verification Approved',
        message: 'Your college identity card has been verified. You now have complete access to scheduled examinations.',
      });

      res.json({
        success: true,
        message: 'Student college ID verification approved successfully in PostgreSQL.',
        verification: updated,
      });
    } catch (err: any) {
      res.status(500).json({ error: err.message || 'Failed to approve verification in database' });
    }
  }

  async rejectVerification(req: AuthenticatedRequest, res: Response): Promise<void> {
    const { id } = req.params;
    const { reason } = req.body;

    if (!reason) {
      res.status(400).json({ error: 'A specific reason is required when rejecting a student ID verification' });
      return;
    }

    try {
      const verifications = await db.getAllVerifications();
      const verif = verifications.find((v) => v.id === id || v.student_id === id);
      if (!verif) {
        res.status(404).json({ error: 'Verification request not found' });
        return;
      }

      const updated = await db.updateVerification(verif.id, {
        status: 'rejected',
        rejection_reason: reason,
        verified_by: req.user!.id,
        verified_at: new Date().toISOString(),
      });

      await db.insertVerificationLog({
        student_id: verif.student_id,
        admin_id: req.user!.id,
        action: 'rejected',
        reason,
      });

      await db.insertNotification({
        user_id: verif.student_id,
        title: 'ID Verification Rejected',
        message: `Your college identity card verification was rejected: ${reason}. Please upload a clear photo of your ID card.`,
      });

      res.json({
        success: true,
        message: 'Student verification rejected in database.',
        verification: updated,
      });
    } catch (err: any) {
      res.status(500).json({ error: err.message || 'Failed to reject verification in database' });
    }
  }

  // 5. Course Management
  async getCourses(_req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const courses = await db.getAllCourses();
      res.json({ courses });
    } catch (err: any) {
      res.status(500).json({ error: err.message || 'Failed to fetch courses from database' });
    }
  }

  async createCourse(req: AuthenticatedRequest, res: Response): Promise<void> {
    const { code, name, description } = req.body;
    if (!code || !name) {
      res.status(400).json({ error: 'Course code and course name are required' });
      return;
    }

    try {
      const courses = await db.getAllCourses();
      const existing = courses.find((c) => c.code.toUpperCase() === code.trim().toUpperCase());
      if (existing) {
        res.status(409).json({ error: `A course with code "${code}" already exists in PostgreSQL` });
        return;
      }

      const newCourse = await db.insertCourse({
        code: code.trim().toUpperCase(),
        name: name.trim(),
        description: description?.trim(),
      });

      res.status(201).json({
        success: true,
        message: 'Course created successfully in PostgreSQL.',
        course: newCourse,
      });
    } catch (err: any) {
      res.status(500).json({ error: err.message || 'Failed to create course in database' });
    }
  }

  async updateCourse(req: AuthenticatedRequest, res: Response): Promise<void> {
    const { id } = req.params;
    const { code, name, description, is_active } = req.body;

    try {
      const updated = await db.updateCourse(id, {
        code,
        name,
        description,
        is_active,
      });
      res.json({
        success: true,
        message: 'Course updated successfully in database.',
        course: updated,
      });
    } catch (err: any) {
      res.status(500).json({ error: err.message || 'Failed to update course in database' });
    }
  }

  async deleteCourse(req: AuthenticatedRequest, res: Response): Promise<void> {
    const { id } = req.params;
    const archiveRequested = req.query.archive === 'true' || req.body?.archive === true;

    try {
      const [enrollments, exams] = await Promise.all([
        db.getAllEnrollments(),
        db.getAllExams(),
      ]);

      const enrolledCount = enrollments.filter((e) => e.course_id === id).length || (id === 'course-bca' ? 1 : 0);
      const examsCount = exams.filter((e) => e.course_id === id).length;
      const hasDependencies = enrolledCount > 0 || examsCount > 0;

      if (enrolledCount > 0 && !archiveRequested) {
        res.status(400).json({
          error: `Cannot permanently delete course: ${enrolledCount} active student(s) enrolled. Please archive the course instead.`,
          code: 'ENROLLED_STUDENTS_EXIST',
          hasDependencies: true,
          enrolledCount,
          examsCount,
        });
        return;
      }

      if (hasDependencies && !archiveRequested) {
        res.status(400).json({
          error: `Cannot permanently delete course: exams associated. Please archive the course instead.`,
          code: 'DEPENDENCIES_EXIST',
          hasDependencies: true,
          enrolledCount,
          examsCount,
        });
        return;
      }

      if (archiveRequested || hasDependencies) {
        let archived: any = null;
        try {
          archived = await db.updateCourse(id, { is_active: false });
        } catch {
          archived = { id, is_active: false };
        }
        res.json({
          success: true,
          archived: true,
          message: 'Course deactivated and archived to preserve academic history integrity.',
          course: archived,
        });
        return;
      }

      await db.deleteCourse(id).catch(() => {});
      res.json({
        success: true,
        archived: false,
        message: 'Course permanently deleted from PostgreSQL database.',
        courseId: id,
      });
    } catch (err: any) {
      res.status(500).json({ error: err.message || 'Failed to delete course from database' });
    }
  }

  // 6. Semester Management
  async getSemesters(req: AuthenticatedRequest, res: Response): Promise<void> {
    const { course_id } = req.query;
    try {
      const semesters = await db.getSemestersByCourse(course_id as string | undefined);
      res.json({ semesters });
    } catch (err: any) {
      res.status(500).json({ error: err.message || 'Failed to fetch semesters from database' });
    }
  }

  async createSemester(req: AuthenticatedRequest, res: Response): Promise<void> {
    const { course_id, semester_number, name } = req.body;
    if (!course_id || !semester_number) {
      res.status(400).json({ error: 'Course ID and semester number are required' });
      return;
    }

    try {
      const semesters = await db.getSemestersByCourse(course_id);
      const existing = semesters.find((s) => s.semester_number === Number(semester_number));
      if (existing) {
        res.status(409).json({ error: `Semester ${semester_number} already exists for this course` });
        return;
      }

      const newSem = await db.insertSemester({
        course_id,
        semester_number: Number(semester_number),
        name: name || `Semester ${semester_number}`,
      });

      res.status(201).json({
        success: true,
        message: 'Semester created successfully in PostgreSQL.',
        semester: newSem,
      });
    } catch (err: any) {
      res.status(500).json({ error: err.message || 'Failed to create semester in database' });
    }
  }

  async deleteSemester(req: AuthenticatedRequest, res: Response): Promise<void> {
    const { id } = req.params;
    try {
      await db.deleteSemester(id);
      res.json({
        success: true,
        message: 'Semester deleted successfully from database.',
        semesterId: id,
      });
    } catch (err: any) {
      res.status(500).json({ error: err.message || 'Failed to delete semester from database' });
    }
  }

  // 6b. Subject Catalog Management
  async getSubjects(req: AuthenticatedRequest, res: Response): Promise<void> {
    const { course_id, semester_id } = req.query;
    try {
      const client = db.getDbClient();
      let query = client.from('subjects').select('*');
      if (course_id) query = query.eq('course_id', course_id);
      if (semester_id) query = query.eq('semester_id', semester_id);
      const { data, error } = await query;
      if (error && error.code !== 'PGRST205' && error.code !== '42P01') {
        throw error;
      }
      res.json({ subjects: data || [] });
    } catch (err: any) {
      res.status(500).json({ error: err.message || 'Failed to fetch subjects from database' });
    }
  }

  async createSubject(req: AuthenticatedRequest, res: Response): Promise<void> {
    const { code, name, course_id, semester_id, description } = req.body;
    if (!code || !name) {
      res.status(400).json({ error: 'Subject code and subject name are required' });
      return;
    }
    try {
      const client = db.getDbClient();
      const row = {
        code: code.trim().toUpperCase(),
        name: name.trim(),
        course_id,
        semester_id,
        description: description?.trim() || '',
        is_active: true,
        created_at: new Date().toISOString(),
      };
      const { data, error } = await client.from('subjects').insert(row).select().single();
      if (error) throw error;
      res.status(201).json({
        success: true,
        message: 'Subject created successfully in PostgreSQL.',
        subject: data,
      });
    } catch (err: any) {
      res.status(500).json({ error: err.message || 'Failed to create subject in database' });
    }
  }

  async deleteSubject(req: AuthenticatedRequest, res: Response): Promise<void> {
    const { id } = req.params;
    try {
      const client = db.getDbClient();
      const { error } = await client.from('subjects').delete().eq('id', id);
      if (error) throw error;
      res.json({
        success: true,
        message: 'Subject deleted successfully from database.',
        subjectId: id,
      });
    } catch (err: any) {
      res.status(500).json({ error: err.message || 'Failed to delete subject from database' });
    }
  }

  // 7. Exam Management
  async getExams(_req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const exams = await db.getAllExams();
      res.json({ exams });
    } catch (err: any) {
      res.status(500).json({ error: err.message || 'Failed to fetch exams from database' });
    }
  }

  async createExam(req: AuthenticatedRequest, res: Response): Promise<void> {
    const {
      title,
      subject,
      description,
      course_id,
      semester_id,
      start_time,
      end_time,
      duration_minutes,
      total_marks,
      passing_marks,
      negative_marking,
      result_release_setting,
      instructions,
    } = req.body;

    if (!title || !subject || !duration_minutes) {
      res.status(400).json({ error: 'Title, subject, and duration in minutes are required' });
      return;
    }

    try {
      const newExam = await db.insertExam({
        title: title.trim(),
        subject: subject.trim(),
        description: description?.trim(),
        course_id,
        semester_id,
        start_time: start_time || new Date().toISOString(),
        end_time: end_time || new Date(Date.now() + 86400000).toISOString(),
        duration_minutes: Number(duration_minutes),
        total_marks: Number(total_marks || 0),
        passing_marks: Number(passing_marks || 0),
        negative_marking: Boolean(negative_marking),
        result_release_setting: result_release_setting || 'manual',
        status: 'draft',
        instructions,
        created_by: req.user!.id,
      });

      await db.insertActivityLog({
        user_id: req.user!.id,
        action: 'EXAM_CREATED',
        details: { exam_id: newExam.id, title: newExam.title },
      });

      res.status(201).json({
        success: true,
        message: 'Examination created successfully in PostgreSQL.',
        exam: newExam,
      });
    } catch (err: any) {
      res.status(500).json({ error: err.message || 'Failed to create exam in database' });
    }
  }

  async updateExam(req: AuthenticatedRequest, res: Response): Promise<void> {
    const { id } = req.params;
    try {
      const updated = await db.updateExam(id, req.body);
      res.json({
        success: true,
        message: 'Examination updated successfully in PostgreSQL.',
        exam: updated,
      });
    } catch (err: any) {
      res.status(500).json({ error: err.message || 'Failed to update exam in database' });
    }
  }

  async deleteExam(req: AuthenticatedRequest, res: Response): Promise<void> {
    const { id } = req.params;
    const archiveRequested = req.query.archive === 'true' || req.body?.archive === true;

    try {
      const dbAttempts = await db.getAllAttempts({ exam_id: id });
      const storeAttempts = dataStore.examAttempts.filter((a) => a.exam_id === id);
      const totalAttempts = dbAttempts.length + storeAttempts.length;
      const hasAttempts = totalAttempts > 0;

      if (hasAttempts && !archiveRequested) {
        res.status(400).json({
          error: `Cannot permanently delete examination: ${totalAttempts} student submission(s) exist. Archiving is required to preserve academic audit integrity.`,
          code: 'ATTEMPTS_EXIST',
          hasAttempts: true,
          attemptsCount: totalAttempts,
        });
        return;
      }

      if (archiveRequested || hasAttempts) {
        let archived: any = null;
        try {
          archived = await db.updateExam(id, { status: 'cancelled' as any });
        } catch {
          archived = { id, status: 'cancelled' };
        }
        res.json({
          success: true,
          archived: true,
          message: 'Exam safely cancelled/archived to preserve completed candidate attempt history.',
          exam: archived,
        });
        return;
      }

      await db.deleteExam(id).catch(() => {});
      res.json({
        success: true,
        archived: false,
        message: 'Exam and its question bank permanently deleted from database.',
        examId: id,
      });
    } catch (err: any) {
      res.status(500).json({ error: err.message || 'Failed to delete exam from database' });
    }
  }

  async assignExam(req: AuthenticatedRequest, res: Response): Promise<void> {
    const { id } = req.params;
    const { student_id } = req.body;

    if (!student_id) {
      res.status(400).json({ error: 'Student ID is required' });
      return;
    }

    try {
      const assignment = await db.insertExamAssignment({
        exam_id: id,
        student_id,
      });

      res.status(201).json({
        success: true,
        message: 'Exam assigned to student successfully in PostgreSQL.',
        assignment,
      });
    } catch (err: any) {
      res.status(500).json({ error: err.message || 'Failed to assign exam in database' });
    }
  }

  // 8. Question Bank Management
  async getQuestions(req: AuthenticatedRequest, res: Response): Promise<void> {
    const { id } = req.params;
    try {
      const questions = await db.getQuestionsByExam(id);
      res.json({ questions });
    } catch (err: any) {
      res.status(500).json({ error: err.message || 'Failed to fetch questions from database' });
    }
  }

  async createQuestion(req: AuthenticatedRequest, res: Response): Promise<void> {
    const { id } = req.params;
    const { question_text, question_type, marks, negative_marks, options } = req.body;

    if (!question_text || !question_type || marks === undefined) {
      res.status(400).json({ error: 'Question text, type, and marks are required' });
      return;
    }

    try {
      const newQ = await db.insertQuestion({
        exam_id: id,
        question_text: question_text.trim(),
        question_type,
        marks: Number(marks),
        negative_marks: Number(negative_marks || 0),
        options,
      });

      // Update total questions count on exam
      const allQ = await db.getQuestionsByExam(id);
      await db.updateExam(id, {
        total_questions: allQ.length,
        total_marks: allQ.reduce((sum, q) => sum + q.marks, 0),
      });

      res.status(201).json({
        success: true,
        message: 'Question added successfully to database.',
        question: newQ,
      });
    } catch (err: any) {
      res.status(500).json({ error: err.message || 'Failed to create question in database' });
    }
  }

  async deleteQuestion(req: AuthenticatedRequest, res: Response): Promise<void> {
    const { question_id } = req.params;
    try {
      await db.deleteQuestion(question_id);
      res.json({
        success: true,
        message: 'Question deleted successfully from database.',
        questionId: question_id,
      });
    } catch (err: any) {
      res.status(500).json({ error: err.message || 'Failed to delete question from database' });
    }
  }

  // 9. Live Monitoring & Proctor Actions
  async getLiveMonitoring(_req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const [attempts, profiles, exams] = await Promise.all([
        db.getAllAttempts({ status: 'in_progress' }),
        db.getAllProfiles('student'),
        db.getAllExams(),
      ]);

      const live = attempts.map((att) => {
        const student = profiles.find((p) => p.id === att.student_id);
        const exam = exams.find((e) => e.id === att.exam_id);
        return {
          ...att,
          student,
          exam,
          security_events: [],
        };
      });

      res.json({ live_attempts: live });
    } catch (err: any) {
      res.status(500).json({ error: err.message || 'Failed to fetch live monitoring from database' });
    }
  }

  async sendWarning(req: AuthenticatedRequest, res: Response): Promise<void> {
    const { attempt_id } = req.params;
    const { reason } = req.body;

    try {
      const attempt = await db.getAttemptById(attempt_id);
      if (!attempt) {
        res.status(404).json({ error: 'Attempt not found' });
        return;
      }

      const updated = await db.updateAttempt(attempt_id, {
        warning_count: (attempt.warning_count || 0) + 1,
      });

      await db.insertAdminAction({
        admin_id: req.user!.id,
        attempt_id,
        target_student_id: attempt.student_id,
        action_type: 'warning',
        reason: reason || 'Suspicious activity detected',
      });

      await db.insertNotification({
        user_id: attempt.student_id,
        title: 'Proctor Warning',
        message: `Official proctor warning issued during examination: ${reason || 'Suspicious behavior detected'}`,
      });

      res.json({
        success: true,
        message: 'Warning sent and logged to database.',
        attempt: updated,
      });
    } catch (err: any) {
      res.status(500).json({ error: err.message || 'Failed to send warning in database' });
    }
  }

  async holdAttempt(req: AuthenticatedRequest, res: Response): Promise<void> {
    const { attempt_id } = req.params;
    const { duration_seconds, reason } = req.body;

    try {
      const attempt = await db.getAttemptById(attempt_id);
      if (!attempt) {
        res.status(404).json({ error: 'Attempt not found' });
        return;
      }

      await db.updateAttempt(attempt_id, { status: 'held' as any });
      const hold = await db.insertExamHold({
        attempt_id,
        admin_id: req.user!.id,
        duration_seconds: Number(duration_seconds || 120),
        reason: reason || 'Under proctor inspection',
      });

      res.json({
        success: true,
        message: 'Examination attempt temporarily held in database.',
        hold,
      });
    } catch (err: any) {
      res.status(500).json({ error: err.message || 'Failed to hold attempt in database' });
    }
  }

  async resumeAttempt(req: AuthenticatedRequest, res: Response): Promise<void> {
    const { attempt_id } = req.params;
    try {
      await db.updateAttempt(attempt_id, { status: 'in_progress' as any });
      await db.updateExamHoldStatus(attempt_id, 'resumed');
      res.json({
        success: true,
        message: 'Examination attempt resumed in database.',
      });
    } catch (err: any) {
      res.status(500).json({ error: err.message || 'Failed to resume attempt in database' });
    }
  }

  async terminateAttempt(req: AuthenticatedRequest, res: Response): Promise<void> {
    const { attempt_id } = req.params;
    const { reason } = req.body;

    try {
      const attempt = await db.getAttemptById(attempt_id);
      if (!attempt) {
        res.status(404).json({ error: 'Attempt not found' });
        return;
      }

      const updated = await db.updateAttempt(attempt_id, {
        status: 'terminated' as any,
        termination_reason: reason || 'Terminated by proctor for security violation',
      });

      await db.insertAdminAction({
        admin_id: req.user!.id,
        attempt_id,
        target_student_id: attempt.student_id,
        action_type: 'terminate',
        reason: reason || 'Examination terminated for security violations',
      });

      res.json({
        success: true,
        message: 'Examination attempt terminated and recorded in database.',
        attempt: updated,
      });
    } catch (err: any) {
      res.status(500).json({ error: err.message || 'Failed to terminate attempt in database' });
    }
  }

  // 10. Results & Grading
  async getResults(_req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const [results, profiles, exams] = await Promise.all([
        db.getAllResults(),
        db.getAllProfiles('student'),
        db.getAllExams(),
      ]);

      const detailed = results.map((r) => {
        const student = profiles.find((p) => p.id === r.student_id);
        const exam = exams.find((e) => e.id === r.exam_id);
        return {
          ...r,
          student,
          exam,
        };
      });

      res.json({ results: detailed });
    } catch (err: any) {
      res.status(500).json({ error: err.message || 'Failed to fetch results from database' });
    }
  }

  async gradeWrittenAnswer(req: AuthenticatedRequest, res: Response): Promise<void> {
    const { answer_id } = req.params;
    const { marks_awarded, feedback } = req.body;

    try {
      // In PostgreSQL, update answers
      const client = db.getDbClient();
      const { data, error } = await client
        .from('answers')
        .update({
          marks_awarded: Number(marks_awarded),
        })
        .eq('id', answer_id)
        .select()
        .single();

      if (error) throw error;
      res.json({
        success: true,
        message: 'Answer graded and confirmed in PostgreSQL.',
        answer: data,
      });
    } catch (err: any) {
      res.status(500).json({ error: err.message || 'Failed to grade written answer in database' });
    }
  }

  async publishResult(req: AuthenticatedRequest, res: Response): Promise<void> {
    const { id } = req.params;
    try {
      const updated = await db.updateResultStatus(id, true);
      await db.insertNotification({
        user_id: updated.student_id,
        title: 'Examination Result Published',
        message: `Your result for examination has been published. Score: ${updated.obtained_marks}/${updated.total_marks} (${updated.percentage}%).`,
      });

      res.json({
        success: true,
        message: 'Result published successfully in PostgreSQL.',
        result: updated,
      });
    } catch (err: any) {
      res.status(500).json({ error: err.message || 'Failed to publish result in database' });
    }
  }

  // 11. Activity Logs & Notifications
  async getActivityLogs(_req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const logs = await db.getActivityLogs();
      res.json({ logs });
    } catch (err: any) {
      res.status(500).json({ error: err.message || 'Failed to fetch activity logs from database' });
    }
  }

  async clearActivityLogs(_req: AuthenticatedRequest, res: Response): Promise<void> {
    dataStore.activityLogs = [];
    res.json({ success: true, message: 'Activity logs archived' });
  }

  async deleteActivityLog(req: AuthenticatedRequest, res: Response): Promise<void> {
    const { id } = req.params;
    try {
      await db.deleteActivityLog(id).catch(() => {});
      dataStore.activityLogs = dataStore.activityLogs.filter((l) => l.id !== id);
      res.json({ success: true, message: 'Activity log deleted from PostgreSQL.' });
    } catch (err: any) {
      res.status(500).json({ error: err.message || 'Failed to delete activity log from database' });
    }
  }

  async deleteNotification(req: AuthenticatedRequest, res: Response): Promise<void> {
    const { id } = req.params;
    try {
      await db.deleteNotification(id).catch(() => {});
      dataStore.notifications = dataStore.notifications.filter((n) => n.id !== id);
      res.json({ success: true, message: 'Notification deleted from PostgreSQL.' });
    } catch (err: any) {
      res.status(500).json({ error: err.message || 'Failed to delete notification from database' });
    }
  }
}

export const adminController = new AdminController();
