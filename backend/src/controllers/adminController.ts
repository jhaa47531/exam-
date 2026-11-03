import { Response } from 'express';
import { dataStore, supabaseAdmin, isRealSupabaseConfigured } from '../config/supabase';
import { monitoringService } from '../services/monitoringService';
import type { AuthenticatedRequest } from '../middleware/auth';
import type {
  Course,
  Semester,
  Exam,
  ExamAssignment,
  Question,
  QuestionOption,
  VerificationLog,
  NotificationItem,
  AdminAction,
  FacultyMember,
  Subject,
} from '../types';

export class AdminController {
  // 1. Dashboard Overview Stats
  async getDashboardStats(_req: AuthenticatedRequest, res: Response): Promise<void> {
    const students = dataStore.profiles.filter((p) => p.role === 'student');
    const verifications = dataStore.studentVerifications;

    const totalStudents = students.length;
    const verifiedStudents = verifications.filter((v) => v.status === 'approved').length;
    const pendingVerifications = verifications.filter((v) => v.status === 'pending').length;
    const rejectedStudents = verifications.filter((v) => v.status === 'rejected').length;

    const totalCourses = dataStore.courses.length;
    const totalFaculty = dataStore.faculty.length;
    const totalSubjects = dataStore.subjects.length;
    const totalExams = dataStore.exams.length;
    const activeExams = dataStore.exams.filter((e) => e.status === 'published').length;
    const completedExams = dataStore.exams.filter((e) => e.status === 'completed').length;
    const publishedResults = dataStore.results.filter((r) => r.status === 'published').length;

    // Recent activity
    const recentAttempts = dataStore.examAttempts
      .slice(-5)
      .reverse()
      .map((att) => {
        const student = dataStore.profiles.find((p) => p.id === att.student_id);
        const exam = dataStore.exams.find((e) => e.id === att.exam_id);
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
  }

  // 2. Student Management & Verification
  async getStudents(_req: AuthenticatedRequest, res: Response): Promise<void> {
    const students = dataStore.profiles
      .filter((p) => p.role === 'student')
      .map((student) => {
        const enrollment = dataStore.studentEnrollments.find((e) => e.student_id === student.id);
        const verification = dataStore.studentVerifications.find((v) => v.student_id === student.id);
        const course = enrollment ? dataStore.courses.find((c) => c.id === enrollment.course_id) : null;
        const semester = enrollment ? dataStore.semesters.find((s) => s.id === enrollment.semester_id) : null;

        return {
          ...student,
          enrollment,
          verification,
          course_name: course ? course.name : 'Not assigned',
          semester_name: semester ? semester.name : 'N/A',
          verification_status: verification ? verification.status : 'unregistered',
        };
      });

    res.json({ students });
  }

  async deleteStudent(req: AuthenticatedRequest, res: Response): Promise<void> {
    const { id } = req.params;
    const archiveRequested = req.query.archive === 'true' || req.body?.archive === true;

    const studentIndex = dataStore.profiles.findIndex(
      (p) => p.id === id && (p.role === 'student' || !p.role || (p.role as string) === 'archived_student')
    );
    if (studentIndex === -1) {
      res.status(404).json({ error: 'Student record not found' });
      return;
    }

    const student = dataStore.profiles[studentIndex];

    // Check historical exam attempts or results
    const attempts = dataStore.examAttempts.filter((a) => a.student_id === id);
    const results = dataStore.results.filter((r) => r.student_id === id);
    const hasAcademicHistory = attempts.length > 0 || results.length > 0;

    if (hasAcademicHistory && !archiveRequested) {
      res.status(400).json({
        error: `Cannot permanently delete candidate: Student has ${attempts.length} examination attempt(s) and academic audit records. Archiving is required to preserve academic audit integrity.`,
        code: 'ACADEMIC_HISTORY_EXISTS',
        hasAcademicHistory: true,
        attemptsCount: attempts.length,
      });
      return;
    }

    if (archiveRequested || hasAcademicHistory) {
      // Soft-delete / Archive student to protect academic integrity
      student.is_active = false;
      student.updated_at = new Date().toISOString();
      const verif = dataStore.studentVerifications.find((v) => v.student_id === id);
      if (verif) {
        verif.status = 'rejected';
        verif.rejection_reason = 'Candidate record deactivated / archived by administrator.';
        verif.updated_at = new Date().toISOString();
      }
      // Remove upcoming unstarted assignments
      dataStore.examAssignments = dataStore.examAssignments.filter((a) => a.student_id !== id);

      dataStore.adminActions.push({
        id: `act-${Date.now()}`,
        admin_id: req.user!.id,
        target_student_id: id,
        action_type: 'terminate',
        details: { reason: 'Archived / Deactivated student record' },
        created_at: new Date().toISOString(),
      });

      if (isRealSupabaseConfigured && supabaseAdmin) {
        try {
          await supabaseAdmin.from('profiles').update({ updated_at: new Date().toISOString() }).eq('id', id);
        } catch {}
      }

      res.json({
        success: true,
        archived: true,
        message: 'Student account successfully archived and deactivated. Academic history preserved.',
      });
      return;
    }

    // Permanent delete when student has NO exam attempts
    dataStore.profiles.splice(studentIndex, 1);
    dataStore.studentEnrollments = dataStore.studentEnrollments.filter((e) => e.student_id !== id);
    dataStore.studentVerifications = dataStore.studentVerifications.filter((v) => v.student_id !== id);
    dataStore.verificationLogs = dataStore.verificationLogs.filter((l) => l.student_id !== id);
    dataStore.examAssignments = dataStore.examAssignments.filter((a) => a.student_id !== id);
    dataStore.notifications = dataStore.notifications.filter((n) => n.user_id !== id);

    if (isRealSupabaseConfigured && supabaseAdmin) {
      try {
        await supabaseAdmin.from('profiles').delete().eq('id', id);
      } catch {}
    }

    res.json({
      success: true,
      archived: false,
      message: 'Student candidate record deleted successfully.',
    });
  }

  // 2b. Faculty Management
  async getFaculty(_req: AuthenticatedRequest, res: Response): Promise<void> {
    res.json({ faculty: dataStore.faculty });
  }

  async createFaculty(req: AuthenticatedRequest, res: Response): Promise<void> {
    const { full_name, email, department, designation, phone, employee_id } = req.body;
    if (!full_name || !email || !department) {
      res.status(400).json({ error: 'Full name, email, and department are required' });
      return;
    }
    const cleanEmail = email.trim().toLowerCase();
    const existing = dataStore.faculty.find((f) => f.email.toLowerCase() === cleanEmail);
    if (existing) {
      res.status(400).json({ error: 'Faculty member with this email already exists' });
      return;
    }

    const now = new Date().toISOString();
    const facultyMember: FacultyMember = {
      id: `fac-${Date.now()}`,
      full_name: full_name.trim(),
      email: cleanEmail,
      department: department.trim(),
      designation: designation?.trim() || 'Faculty & Proctor',
      phone: phone?.trim(),
      employee_id: employee_id?.trim() || `EMP-${Date.now().toString().slice(-4)}`,
      role: 'faculty',
      is_active: true,
      created_at: now,
      updated_at: now,
    };
    dataStore.faculty.push(facultyMember);
    dataStore.profiles.push({
      id: facultyMember.id,
      email: facultyMember.email,
      full_name: facultyMember.full_name,
      role: 'faculty',
      department: facultyMember.department,
      designation: facultyMember.designation,
      phone: facultyMember.phone,
      is_active: true,
      created_at: now,
      updated_at: now,
    });
    dataStore.credentials.set(cleanEmail, 'Faculty@1234');

    if (isRealSupabaseConfigured && supabaseAdmin) {
      try {
        await supabaseAdmin.from('profiles').insert({
          id: facultyMember.id,
          email: facultyMember.email,
          full_name: facultyMember.full_name,
          role: 'faculty',
          phone: facultyMember.phone,
          created_at: now,
          updated_at: now,
        });
      } catch {}
    }

    res.status(201).json({ success: true, faculty: facultyMember });
  }

  async deleteFaculty(req: AuthenticatedRequest, res: Response): Promise<void> {
    const { id } = req.params;
    if (req.user?.id === id) {
      res.status(400).json({ error: 'Cannot delete your own active administrator account' });
      return;
    }

    const facIndex = dataStore.faculty.findIndex((f) => f.id === id);
    if (facIndex === -1) {
      const profIndex = dataStore.profiles.findIndex((p) => p.id === id && p.role === 'faculty');
      if (profIndex === -1) {
        res.status(404).json({ error: 'Faculty member not found' });
        return;
      }
      dataStore.profiles.splice(profIndex, 1);
    } else {
      dataStore.faculty.splice(facIndex, 1);
      const profIndex = dataStore.profiles.findIndex((p) => p.id === id);
      if (profIndex !== -1) {
        dataStore.profiles.splice(profIndex, 1);
      }
    }

    if (isRealSupabaseConfigured && supabaseAdmin) {
      try {
        await supabaseAdmin.from('profiles').delete().eq('id', id);
      } catch {}
    }

    res.json({ success: true, message: 'Faculty member deleted successfully.' });
  }

  async getVerifications(_req: AuthenticatedRequest, res: Response): Promise<void> {
    const list = dataStore.studentVerifications.map((v) => {
      const student = dataStore.profiles.find((p) => p.id === v.student_id);
      const course = dataStore.courses.find((c) => c.id === v.course_id);
      const semester = dataStore.semesters.find((s) => s.id === v.semester_id);
      const logs = dataStore.verificationLogs.filter((l) => l.verification_id === v.id);

      return {
        ...v,
        student_name: student?.full_name || 'Unknown',
        student_email: student?.email || 'Unknown',
        course_name: course?.name || 'N/A',
        course_code: course?.code || '',
        semester_name: semester?.name || 'N/A',
        logs,
      };
    });

    res.json({ verifications: list });
  }

  async approveVerification(req: AuthenticatedRequest, res: Response): Promise<void> {
    const { id } = req.params;
    const adminId = req.user!.id;

    const verification = dataStore.studentVerifications.find((v) => v.id === id);
    if (!verification) {
      res.status(404).json({ error: 'Verification request not found' });
      return;
    }

    const now = new Date().toISOString();
    verification.status = 'approved';
    verification.reviewed_by = adminId;
    verification.reviewed_at = now;
    verification.rejection_reason = undefined;
    verification.updated_at = now;

    // Log approval
    const log: VerificationLog = {
      id: `log-${Date.now()}`,
      verification_id: verification.id,
      student_id: verification.student_id,
      action: 'approved',
      note: 'Verified and approved by proctor administrator.',
      performed_by: adminId,
      created_at: now,
    };
    dataStore.verificationLogs.push(log);

    // Notify student
    const notif: NotificationItem = {
      id: `notif-${Date.now()}`,
      user_id: verification.student_id,
      title: 'College ID Verified',
      message: 'Congratulations! Your College ID verification has been approved. You now have full dashboard and exam access.',
      type: 'success',
      is_read: false,
      created_at: now,
    };
    dataStore.notifications.push(notif);

    // Record admin action
    const action: AdminAction = {
      id: `act-${Date.now()}`,
      admin_id: adminId,
      target_student_id: verification.student_id,
      action_type: 'verify_approve',
      details: { verificationId: id },
      created_at: now,
    };
    dataStore.adminActions.push(action);

    res.json({ success: true, verification });
  }

  async rejectVerification(req: AuthenticatedRequest, res: Response): Promise<void> {
    const { id } = req.params;
    const { reason } = req.body;
    const adminId = req.user!.id;

    if (!reason || !reason.trim()) {
      res.status(400).json({ error: 'A specific rejection reason is required' });
      return;
    }

    const verification = dataStore.studentVerifications.find((v) => v.id === id);
    if (!verification) {
      res.status(404).json({ error: 'Verification request not found' });
      return;
    }

    const now = new Date().toISOString();
    verification.status = 'rejected';
    verification.rejection_reason = reason.trim();
    verification.reviewed_by = adminId;
    verification.reviewed_at = now;
    verification.updated_at = now;

    const log: VerificationLog = {
      id: `log-${Date.now()}`,
      verification_id: verification.id,
      student_id: verification.student_id,
      action: 'rejected',
      note: reason.trim(),
      performed_by: adminId,
      created_at: now,
    };
    dataStore.verificationLogs.push(log);

    const notif: NotificationItem = {
      id: `notif-${Date.now()}`,
      user_id: verification.student_id,
      title: 'College ID Verification Rejected',
      message: `Your verification request was rejected: ${reason.trim()}. Please resubmit with a corrected document.`,
      type: 'warning',
      is_read: false,
      metadata: { reason: reason.trim() },
      created_at: now,
    };
    dataStore.notifications.push(notif);

    res.json({ success: true, verification });
  }

  // 3. Courses & Semesters
  async getCourses(_req: AuthenticatedRequest, res: Response): Promise<void> {
    const courses = dataStore.courses.map((course) => {
      const semesters = dataStore.semesters.filter((s) => s.course_id === course.id);
      const studentCount = dataStore.studentEnrollments.filter((e) => e.course_id === course.id).length;
      return {
        ...course,
        semesters,
        studentCount,
      };
    });
    res.json({ courses });
  }

  async createCourse(req: AuthenticatedRequest, res: Response): Promise<void> {
    const { code, name, description, is_active } = req.body;
    if (!code || !name) {
      res.status(400).json({ error: 'Course code and name are required' });
      return;
    }

    const existing = dataStore.courses.find((c) => c.code.toUpperCase() === code.toUpperCase());
    if (existing) {
      res.status(400).json({ error: 'A course with this code already exists' });
      return;
    }

    const course: Course = {
      id: `course-${Date.now()}`,
      code: code.trim().toUpperCase(),
      name: name.trim(),
      description: description?.trim() || '',
      is_active: is_active !== false,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };
    dataStore.courses.push(course);

    res.status(201).json({ success: true, course });
  }

  async updateCourse(req: AuthenticatedRequest, res: Response): Promise<void> {
    const { id } = req.params;
    const { code, name, description, is_active } = req.body;

    const course = dataStore.courses.find((c) => c.id === id);
    if (!course) {
      res.status(404).json({ error: 'Course not found' });
      return;
    }

    if (code) course.code = code.trim().toUpperCase();
    if (name) course.name = name.trim();
    if (description !== undefined) course.description = description.trim();
    if (is_active !== undefined) course.is_active = is_active;
    course.updated_at = new Date().toISOString();

    res.json({ success: true, course });
  }

  async deleteCourse(req: AuthenticatedRequest, res: Response): Promise<void> {
    const { id } = req.params;
    const archiveRequested = req.query.archive === 'true' || req.body?.archive === true;

    const courseIndex = dataStore.courses.findIndex((c) => c.id === id);
    if (courseIndex === -1) {
      res.status(404).json({ error: 'Course program not found' });
      return;
    }

    const course = dataStore.courses[courseIndex];
    const enrolledStudents = dataStore.studentEnrollments.filter((e) => e.course_id === id);

    if (enrolledStudents.length > 0 && !archiveRequested) {
      res.status(400).json({
        error: `Cannot permanently delete course: ${enrolledStudents.length} candidate(s) are currently enrolled. Select Archive Course to safely deactivate without breaking student enrollments.`,
        code: 'ENROLLED_STUDENTS_EXIST',
        enrolledCount: enrolledStudents.length,
      });
      return;
    }

    if (archiveRequested) {
      course.is_active = false;
      course.is_archived = true;
      course.updated_at = new Date().toISOString();

      if (isRealSupabaseConfigured && supabaseAdmin) {
        try {
          await supabaseAdmin.from('courses').update({ is_active: false }).eq('id', id);
        } catch {}
      }

      res.json({
        success: true,
        archived: true,
        message: 'Course program successfully archived and deactivated.',
      });
      return;
    }

    // Permanent delete when no students are enrolled
    dataStore.courses.splice(courseIndex, 1);
    dataStore.semesters = dataStore.semesters.filter((s) => s.course_id !== id);

    if (isRealSupabaseConfigured && supabaseAdmin) {
      try {
        await supabaseAdmin.from('courses').delete().eq('id', id);
      } catch {}
    }

    res.json({
      success: true,
      archived: false,
      message: 'Course program and associated terms deleted successfully.',
    });
  }

  async getSemesters(req: AuthenticatedRequest, res: Response): Promise<void> {
    const { course_id } = req.query;
    let list = dataStore.semesters;
    if (course_id) {
      list = list.filter((s) => s.course_id === course_id);
    }
    res.json({ semesters: list });
  }

  async createSemester(req: AuthenticatedRequest, res: Response): Promise<void> {
    const { course_id, semester_number, name, is_active } = req.body;
    if (!course_id || !semester_number || !name) {
      res.status(400).json({ error: 'Course ID, semester number, and name are required' });
      return;
    }

    const semester: Semester = {
      id: `sem-${Date.now()}`,
      course_id,
      semester_number: Number(semester_number),
      name: name.trim(),
      is_active: is_active !== false,
      created_at: new Date().toISOString(),
    };
    dataStore.semesters.push(semester);

    if (isRealSupabaseConfigured && supabaseAdmin) {
      try {
        await supabaseAdmin.from('semesters').insert(semester);
      } catch {}
    }

    res.status(201).json({ success: true, semester });
  }

  async deleteSemester(req: AuthenticatedRequest, res: Response): Promise<void> {
    const { id } = req.params;
    const semIndex = dataStore.semesters.findIndex((s) => s.id === id);
    if (semIndex === -1) {
      res.status(404).json({ error: 'Semester term not found' });
      return;
    }

    // Check if active exams are scheduled for this semester
    const activeExams = dataStore.exams.filter((e) => e.semester_id === id && e.status === 'published');
    if (activeExams.length > 0) {
      res.status(400).json({
        error: `Cannot delete semester: ${activeExams.length} active examination(s) are currently scheduled for this term. Complete or cancel the examinations first.`,
        code: 'ACTIVE_EXAMS_EXIST',
      });
      return;
    }

    dataStore.semesters.splice(semIndex, 1);

    if (isRealSupabaseConfigured && supabaseAdmin) {
      try {
        await supabaseAdmin.from('semesters').delete().eq('id', id);
      } catch {}
    }

    res.json({ success: true, message: 'Semester term deleted successfully.' });
  }

  // 3b. Subject Catalog Management
  async getSubjects(req: AuthenticatedRequest, res: Response): Promise<void> {
    const { course_id, semester_id } = req.query;
    let list = dataStore.subjects;
    if (course_id) {
      list = list.filter((s) => s.course_id === course_id);
    }
    if (semester_id) {
      list = list.filter((s) => s.semester_id === semester_id);
    }

    const enriched = list.map((s) => {
      const course = dataStore.courses.find((c) => c.id === s.course_id);
      const semester = dataStore.semesters.find((sem) => sem.id === s.semester_id);
      return {
        ...s,
        course_name: course?.name || 'N/A',
        course_code: course?.code || '',
        semester_name: semester?.name || 'N/A',
      };
    });

    res.json({ subjects: enriched });
  }

  async createSubject(req: AuthenticatedRequest, res: Response): Promise<void> {
    const { code, name, course_id, semester_id, description } = req.body;
    if (!code || !name) {
      res.status(400).json({ error: 'Subject code and title are required' });
      return;
    }

    const cleanCode = code.trim().toUpperCase();
    const existing = dataStore.subjects.find((s) => s.code.toUpperCase() === cleanCode);
    if (existing) {
      res.status(400).json({ error: 'A subject with this subject code already exists' });
      return;
    }

    const now = new Date().toISOString();
    const subject: Subject = {
      id: `subj-${Date.now()}`,
      code: cleanCode,
      name: name.trim(),
      course_id: course_id || undefined,
      semester_id: semester_id || undefined,
      description: description?.trim() || '',
      is_active: true,
      created_at: now,
      updated_at: now,
    };
    dataStore.subjects.push(subject);

    if (isRealSupabaseConfigured && supabaseAdmin) {
      try {
        await supabaseAdmin.from('subjects').insert(subject);
      } catch {}
    }

    res.status(201).json({ success: true, subject });
  }

  async deleteSubject(req: AuthenticatedRequest, res: Response): Promise<void> {
    const { id } = req.params;
    const index = dataStore.subjects.findIndex((s) => s.id === id);
    if (index === -1) {
      res.status(404).json({ error: 'Subject not found' });
      return;
    }

    const subject = dataStore.subjects[index];
    const relatedExams = dataStore.exams.filter(
      (e) =>
        e.subject.toLowerCase() === subject.name.toLowerCase() ||
        e.subject.toLowerCase() === subject.code.toLowerCase()
    );

    if (relatedExams.length > 0 && req.query.force !== 'true') {
      res.status(400).json({
        error: `Cannot delete subject: ${relatedExams.length} examination(s) reference this subject. Archive or remove the examinations first, or confirm forced removal.`,
        code: 'EXAMS_ATTACHED',
      });
      return;
    }

    dataStore.subjects.splice(index, 1);

    if (isRealSupabaseConfigured && supabaseAdmin) {
      try {
        await supabaseAdmin.from('subjects').delete().eq('id', id);
      } catch {}
    }

    res.json({ success: true, message: 'Subject deleted successfully.' });
  }

  // 4. Exam Management
  async getExams(_req: AuthenticatedRequest, res: Response): Promise<void> {
    const exams = dataStore.exams.map((exam) => {
      const course = dataStore.courses.find((c) => c.id === exam.course_id);
      const semester = dataStore.semesters.find((s) => s.id === exam.semester_id);
      const questionsCount = dataStore.questions.filter((q) => q.exam_id === exam.id).length;
      const assignmentsCount = dataStore.examAssignments.filter((a) => a.exam_id === exam.id).length;
      const attemptsCount = dataStore.examAttempts.filter((a) => a.exam_id === exam.id).length;

      return {
        ...exam,
        course_name: course?.name || 'N/A',
        course_code: course?.code || '',
        semester_name: semester?.name || 'N/A',
        questionsCount,
        assignmentsCount,
        attemptsCount,
      };
    });

    res.json({ exams });
  }

  async createExam(req: AuthenticatedRequest, res: Response): Promise<void> {
    const {
      title,
      subject,
      description,
      course_id,
      semester_id,
      exam_date,
      start_time,
      end_time,
      duration_minutes,
      passing_marks,
      negative_marking,
      negative_mark_value,
      result_release_setting,
      late_entry_policy_minutes,
      status,
      instructions,
      assignment_type,
      selected_student_ids,
    } = req.body;

    if (!title || !subject || !course_id || !semester_id || !exam_date || !start_time || !end_time) {
      res.status(400).json({ error: 'Missing required exam fields' });
      return;
    }

    const examId = `exam-${Date.now()}`;
    const now = new Date().toISOString();

    const exam: Exam = {
      id: examId,
      title: title.trim(),
      subject: subject.trim(),
      description: description?.trim() || '',
      course_id,
      semester_id,
      exam_date,
      start_time,
      end_time,
      duration_minutes: Number(duration_minutes) || 60,
      total_questions: 0,
      total_marks: 0,
      passing_marks: Number(passing_marks) || 0,
      negative_marking: Boolean(negative_marking),
      negative_mark_value: Number(negative_mark_value) || 0,
      result_release_setting: result_release_setting || 'manual',
      late_entry_policy_minutes: Number(late_entry_policy_minutes) || 15,
      status: status || 'draft',
      instructions: instructions || 'Follow standard proctored examination rules.',
      created_by: req.user!.id,
      created_at: now,
      updated_at: now,
    };
    dataStore.exams.push(exam);

    // Auto-assign based on setting
    if (assignment_type === 'course_semester' || !assignment_type) {
      const eligibleStudents = dataStore.studentEnrollments
        .filter((e) => e.course_id === course_id && e.semester_id === semester_id)
        .map((e) => e.student_id);

      for (const stId of eligibleStudents) {
        dataStore.examAssignments.push({
          id: `assign-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
          exam_id: examId,
          student_id: stId,
          assignment_type: 'course_semester',
          assigned_at: now,
        });
      }
    } else if (assignment_type === 'individual' && Array.isArray(selected_student_ids)) {
      for (const stId of selected_student_ids) {
        dataStore.examAssignments.push({
          id: `assign-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
          exam_id: examId,
          student_id: stId,
          assignment_type: 'individual',
          assigned_at: now,
        });
      }
    }

    res.status(201).json({ success: true, exam });
  }

  async updateExam(req: AuthenticatedRequest, res: Response): Promise<void> {
    const { id } = req.params;
    const exam = dataStore.exams.find((e) => e.id === id);
    if (!exam) {
      res.status(404).json({ error: 'Exam not found' });
      return;
    }

    Object.assign(exam, req.body, { updated_at: new Date().toISOString() });
    res.json({ success: true, exam });
  }

  async deleteExam(req: AuthenticatedRequest, res: Response): Promise<void> {
    const { id } = req.params;
    const archiveRequested = req.query.archive === 'true' || req.body?.archive === true;

    const examIndex = dataStore.exams.findIndex((e) => e.id === id);
    if (examIndex === -1) {
      res.status(404).json({ error: 'Examination record not found' });
      return;
    }

    const exam = dataStore.exams[examIndex];
    const attempts = dataStore.examAttempts.filter((a) => a.exam_id === id);
    const hasAttempts = attempts.length > 0;

    if (hasAttempts && !archiveRequested) {
      res.status(400).json({
        error: `This examination has ${attempts.length} candidate attempt(s). Permanent deletion is blocked to protect student examination history. Select Archive Exam to safely cancel and preserve audit records.`,
        code: 'ATTEMPTS_EXIST',
        attemptsCount: attempts.length,
      });
      return;
    }

    if (archiveRequested || hasAttempts) {
      // Archive / cancel exam safely to preserve academic audit trail
      exam.status = 'cancelled';
      exam.is_archived = true;
      exam.updated_at = new Date().toISOString();

      if (isRealSupabaseConfigured && supabaseAdmin) {
        try {
          await supabaseAdmin.from('exams').update({ status: 'cancelled' }).eq('id', id);
        } catch {}
      }

      res.json({
        success: true,
        archived: true,
        message: 'Examination successfully archived and cancelled. Candidate attempt records preserved.',
      });
      return;
    }

    // Permanent delete when no attempts exist
    dataStore.exams.splice(examIndex, 1);
    dataStore.examAssignments = dataStore.examAssignments.filter((a) => a.exam_id !== id);
    const questionIds = new Set(
      dataStore.questions.filter((q) => q.exam_id === id).map((q) => q.id)
    );
    dataStore.questions = dataStore.questions.filter((q) => q.exam_id !== id);
    dataStore.questionOptions = dataStore.questionOptions.filter(
      (o) => !questionIds.has(o.question_id)
    );

    if (isRealSupabaseConfigured && supabaseAdmin) {
      try {
        await supabaseAdmin.from('exams').delete().eq('id', id);
      } catch {}
    }

    res.json({ success: true, message: 'Examination deleted successfully.' });
  }

  async assignExam(req: AuthenticatedRequest, res: Response): Promise<void> {
    const { id } = req.params;
    const { student_ids, assignment_type } = req.body;

    const exam = dataStore.exams.find((e) => e.id === id);
    if (!exam) {
      res.status(404).json({ error: 'Exam not found' });
      return;
    }

    const now = new Date().toISOString();
    let count = 0;

    if (Array.isArray(student_ids)) {
      for (const stId of student_ids) {
        const exists = dataStore.examAssignments.find(
          (a) => a.exam_id === id && a.student_id === stId
        );
        if (!exists) {
          dataStore.examAssignments.push({
            id: `assign-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
            exam_id: id,
            student_id: stId,
            assignment_type: assignment_type || 'individual',
            assigned_at: now,
          });
          count++;
        }
      }
    }

    res.json({ success: true, newlyAssignedCount: count });
  }

  // 5. Question Management (Admin views include correct answers)
  async getQuestions(req: AuthenticatedRequest, res: Response): Promise<void> {
    const { exam_id } = req.query;
    if (!exam_id) {
      res.status(400).json({ error: 'exam_id query param is required' });
      return;
    }

    const questions = dataStore.questions
      .filter((q) => q.exam_id === exam_id)
      .sort((a, b) => a.order_index - b.order_index)
      .map((q) => {
        const options = dataStore.questionOptions
          .filter((opt) => opt.question_id === q.id)
          .sort((a, b) => a.order_index - b.order_index);
        return {
          ...q,
          options,
        };
      });

    res.json({ questions });
  }

  async createQuestion(req: AuthenticatedRequest, res: Response): Promise<void> {
    const { exam_id, question_text, question_type, marks, negative_marks, explanation, options } = req.body;

    if (!exam_id || !question_text || !question_type) {
      res.status(400).json({ error: 'Exam ID, question text, and question type are required' });
      return;
    }

    const exam = dataStore.exams.find((e) => e.id === exam_id);
    if (!exam) {
      res.status(404).json({ error: 'Exam not found' });
      return;
    }

    const questionId = `q-${Date.now()}`;
    const currentQuestions = dataStore.questions.filter((q) => q.exam_id === exam_id);

    const question: Question = {
      id: questionId,
      exam_id,
      question_text: question_text.trim(),
      question_type,
      marks: Number(marks) || 1,
      negative_marks: Number(negative_marks) || 0,
      order_index: currentQuestions.length + 1,
      explanation: explanation?.trim() || '',
      created_at: new Date().toISOString(),
    };
    dataStore.questions.push(question);

    // Save options if MCQ or True/False
    const createdOptions: QuestionOption[] = [];
    if (Array.isArray(options)) {
      options.forEach((opt: any, index: number) => {
        const optionObj: QuestionOption = {
          id: `opt-${Date.now()}-${index}`,
          question_id: questionId,
          option_text: opt.option_text.trim(),
          is_correct: Boolean(opt.is_correct),
          order_index: index + 1,
        };
        dataStore.questionOptions.push(optionObj);
        createdOptions.push(optionObj);
      });
    }

    // Auto-update total questions and total marks on Exam
    const allExamQuestions = dataStore.questions.filter((q) => q.exam_id === exam_id);
    exam.total_questions = allExamQuestions.length;
    exam.total_marks = allExamQuestions.reduce((sum, q) => sum + Number(q.marks), 0);
    exam.updated_at = new Date().toISOString();

    res.status(201).json({
      success: true,
      question: { ...question, options: createdOptions },
      exam_summary: {
        total_questions: exam.total_questions,
        total_marks: exam.total_marks,
      },
    });
  }

  async deleteQuestion(req: AuthenticatedRequest, res: Response): Promise<void> {
    const { id } = req.params;
    const qIndex = dataStore.questions.findIndex((q) => q.id === id);
    if (qIndex === -1) {
      res.status(404).json({ error: 'Question not found' });
      return;
    }

    const examId = dataStore.questions[qIndex].exam_id;
    dataStore.questions.splice(qIndex, 1);
    dataStore.questionOptions = dataStore.questionOptions.filter((o) => o.question_id !== id);

    // Recalculate exam totals
    const exam = dataStore.exams.find((e) => e.id === examId);
    if (exam) {
      const remaining = dataStore.questions.filter((q) => q.exam_id === examId);
      exam.total_questions = remaining.length;
      exam.total_marks = remaining.reduce((sum, q) => sum + Number(q.marks), 0);
      exam.updated_at = new Date().toISOString();
    }

    res.json({ success: true });
  }

  // 6. Live Monitoring & Proctor Actions
  async getLiveMonitoring(_req: AuthenticatedRequest, res: Response): Promise<void> {
    const attempts = dataStore.examAttempts.map((att) => {
      const student = dataStore.profiles.find((p) => p.id === att.student_id);
      const enrollment = dataStore.studentEnrollments.find((e) => e.student_id === att.student_id);
      const exam = dataStore.exams.find((e) => e.id === att.exam_id);
      const events = dataStore.securityEvents
        .filter((s) => s.attempt_id === att.id)
        .slice(-10);

      // Remaining seconds
      const endMs = new Date(att.scheduled_end_time).getTime();
      const remainingSeconds = Math.max(0, Math.floor((endMs - Date.now()) / 1000));

      return {
        ...att,
        student_name: student?.full_name || 'Student',
        student_email: student?.email || '',
        college_student_id: enrollment?.college_student_id || 'N/A',
        exam_title: exam?.title || 'Exam',
        remainingSeconds,
        securityEvents: events,
      };
    });

    res.json({ attempts });
  }

  async sendWarning(req: AuthenticatedRequest, res: Response): Promise<void> {
    const { id } = req.params; // attempt_id
    const { message } = req.body;
    const adminId = req.user!.id;

    const result = monitoringService.sendWarning(
      id,
      adminId,
      message || 'Proctor Warning: Tab switching and external applications are prohibited.'
    );

    if (!result.success) {
      res.status(404).json({ error: 'Attempt not found' });
      return;
    }

    res.json({ success: true, attempt: result.attempt });
  }

  async holdAttempt(req: AuthenticatedRequest, res: Response): Promise<void> {
    const { id } = req.params;
    const { durationSeconds, reason } = req.body;
    const adminId = req.user!.id;

    const duration = Number(durationSeconds) || 60;
    const holdReason = reason || 'Proctor initiated temporary hold for security verification.';

    const result = monitoringService.holdAttempt(id, adminId, duration, holdReason);
    if (!result.success) {
      res.status(400).json({ error: 'Unable to hold attempt (may be submitted or not found)' });
      return;
    }

    res.json({ success: true, hold: result.hold, attempt: result.attempt });
  }

  async resumeAttempt(req: AuthenticatedRequest, res: Response): Promise<void> {
    const { id } = req.params;
    const adminId = req.user!.id;

    const result = monitoringService.resumeAttempt(id, adminId);
    if (!result.success) {
      res.status(400).json({ error: 'Attempt is not currently held' });
      return;
    }

    res.json({ success: true, attempt: result.attempt });
  }

  async terminateAttempt(req: AuthenticatedRequest, res: Response): Promise<void> {
    const { id } = req.params;
    const { reason } = req.body;
    const adminId = req.user!.id;

    if (!reason || !reason.trim()) {
      res.status(400).json({ error: 'A specific reason is mandatory to terminate an examination attempt.' });
      return;
    }

    const result = monitoringService.terminateAttempt(id, adminId, reason.trim());
    if (!result.success) {
      res.status(400).json({ error: 'Unable to terminate attempt' });
      return;
    }

    res.json({ success: true, attempt: result.attempt });
  }

  // 7. Results Management & Manual Written Evaluation
  async getResults(_req: AuthenticatedRequest, res: Response): Promise<void> {
    const results = dataStore.results.map((resItem) => {
      const student = dataStore.profiles.find((p) => p.id === resItem.student_id);
      const exam = dataStore.exams.find((e) => e.id === resItem.exam_id);
      const attempt = dataStore.examAttempts.find((a) => a.id === resItem.attempt_id);

      // Check if there are written questions pending manual grading
      const answers = dataStore.answers.filter((a) => a.attempt_id === resItem.attempt_id);
      const pendingWrittenCount = answers.filter((a) => {
        const q = dataStore.questions.find((quest) => quest.id === a.question_id);
        return q?.question_type === 'written' && !a.is_marked;
      }).length;

      return {
        ...resItem,
        student_name: student?.full_name || 'Student',
        student_email: student?.email || '',
        exam_title: exam?.title || 'Exam',
        passing_marks: exam?.passing_marks || 0,
        warning_count: attempt?.warning_count || 0,
        pendingWrittenCount,
      };
    });

    res.json({ results });
  }

  async gradeWrittenAnswer(req: AuthenticatedRequest, res: Response): Promise<void> {
    const { attempt_id, question_id } = req.params;
    const { marks_awarded, feedback } = req.body;
    const adminId = req.user!.id;

    const answer = dataStore.answers.find(
      (a) => a.attempt_id === attempt_id && a.question_id === question_id
    );
    const question = dataStore.questions.find((q) => q.id === question_id);

    if (!answer || !question) {
      res.status(404).json({ error: 'Answer or Question record not found' });
      return;
    }

    const awarded = Math.min(Math.max(0, Number(marks_awarded) || 0), question.marks);
    answer.marks_awarded = awarded;
    answer.feedback = feedback?.trim() || '';
    answer.is_marked = true;
    answer.reviewed_by = adminId;
    answer.updated_at = new Date().toISOString();

    // Recalculate result
    const allAnswers = dataStore.answers.filter((a) => a.attempt_id === attempt_id);
    const result = dataStore.results.find((r) => r.attempt_id === attempt_id);
    const exam = dataStore.exams.find((e) => e.id === question.exam_id);

    if (result && exam) {
      const totalObtained = allAnswers.reduce((sum, a) => sum + (Number(a.marks_awarded) || 0), 0);
      result.obtained_marks = Math.max(0, Math.round(totalObtained * 100) / 100);
      result.percentage = Math.round((result.obtained_marks / result.total_marks) * 10000) / 100;
      result.is_passed = result.obtained_marks >= exam.passing_marks;
    }

    res.json({ success: true, answer, result });
  }

  async publishResult(req: AuthenticatedRequest, res: Response): Promise<void> {
    const { id } = req.params; // result_id
    const result = dataStore.results.find((r) => r.id === id);
    if (!result) {
      res.status(404).json({ error: 'Result not found' });
      return;
    }

    result.status = 'published';
    result.published_at = new Date().toISOString();

    const exam = dataStore.exams.find((e) => e.id === result.exam_id);
    const notif: NotificationItem = {
      id: `notif-${Date.now()}`,
      user_id: result.student_id,
      title: 'Exam Result Published',
      message: `Your final score for ${exam?.title || 'Exam'} has been published: ${result.obtained_marks}/${result.total_marks} (${result.percentage}%).`,
      type: result.is_passed ? 'success' : 'info',
      is_read: false,
      metadata: { resultId: result.id, examId: result.exam_id },
      created_at: new Date().toISOString(),
    };
    dataStore.notifications.push(notif);

    res.json({ success: true, result });
  }

  // 8. Activity Logs & Notifications Deletion
  async getActivityLogs(_req: AuthenticatedRequest, res: Response): Promise<void> {
    const logs = dataStore.activityLogs.slice(-50).reverse();
    res.json({ logs });
  }

  async clearActivityLogs(_req: AuthenticatedRequest, res: Response): Promise<void> {
    dataStore.activityLogs = [];
    if (isRealSupabaseConfigured && supabaseAdmin) {
      try {
        await supabaseAdmin.from('activity_logs').delete().neq('id', '0');
      } catch {}
    }
    res.json({ success: true, message: 'Activity logs cleared successfully.' });
  }

  async deleteActivityLog(req: AuthenticatedRequest, res: Response): Promise<void> {
    const { id } = req.params;
    dataStore.activityLogs = dataStore.activityLogs.filter((l) => l.id !== id);
    if (isRealSupabaseConfigured && supabaseAdmin) {
      try {
        await supabaseAdmin.from('activity_logs').delete().eq('id', id);
      } catch {}
    }
    res.json({ success: true, message: 'Log record removed successfully.' });
  }

  // 9. Admin Notifications Deletion
  async deleteNotification(req: AuthenticatedRequest, res: Response): Promise<void> {
    const { id } = req.params;
    const index = dataStore.notifications.findIndex((n) => n.id === id);
    if (index === -1) {
      res.status(404).json({ error: 'Notification not found' });
      return;
    }

    dataStore.notifications.splice(index, 1);
    if (isRealSupabaseConfigured && supabaseAdmin) {
      try {
        await supabaseAdmin.from('notifications').delete().eq('id', id);
      } catch {}
    }
    res.json({ success: true, message: 'Notification deleted successfully.' });
  }
}

export const adminController = new AdminController();
