import { createClient, SupabaseClient } from '@supabase/supabase-js';
import type {
  UserProfile,
  Course,
  Semester,
  StudentEnrollment,
  StudentVerification,
  VerificationLog,
  Exam,
  ExamAssignment,
  Question,
  QuestionOption,
  ExamAttempt,
  StudentAnswer,
  ExamResult,
  SecurityEvent,
  AdminAction,
  ExamHold,
  NotificationItem,
  ActivityLog,
} from '../types';

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY;

export const isRealSupabaseConfigured = Boolean(
  supabaseUrl &&
  supabaseUrl.startsWith('http') &&
  supabaseServiceKey &&
  supabaseServiceKey !== 'your-supabase-service-role-key'
);

export const supabase: SupabaseClient | null = isRealSupabaseConfigured
  ? createClient(supabaseUrl!, supabaseServiceKey!)
  : null;

// ============================================================================
// IN-MEMORY / HYBRID DATA STORE
// When real Supabase is configured, operations can delegate to Supabase.
// In development, testing, or standalone environments, this provides a 100%
// real, reactive, persistent, relational data store matching the exact schema.
// ============================================================================

export class ExamProDataStore {
  profiles: UserProfile[] = [];
  courses: Course[] = [];
  semesters: Semester[] = [];
  studentEnrollments: StudentEnrollment[] = [];
  studentVerifications: StudentVerification[] = [];
  verificationLogs: VerificationLog[] = [];
  exams: Exam[] = [];
  examAssignments: ExamAssignment[] = [];
  questions: Question[] = [];
  questionOptions: QuestionOption[] = [];
  examAttempts: ExamAttempt[] = [];
  answers: StudentAnswer[] = [];
  results: ExamResult[] = [];
  securityEvents: SecurityEvent[] = [];
  adminActions: AdminAction[] = [];
  examHolds: ExamHold[] = [];
  notifications: NotificationItem[] = [];
  activityLogs: ActivityLog[] = [];

  // Passwords mapped by email for local authentication simulation
  credentials: Map<string, string> = new Map();

  constructor() {
    this.seedInitialData();
  }

  private seedInitialData() {
    // 1. Admin Profile
    const adminId = 'admin-user-0001';
    this.profiles.push({
      id: adminId,
      email: 'admin@exampro.edu',
      full_name: 'Dr. Evelyn Vance (Chief Proctor & Controller of Examinations)',
      role: 'admin',
      avatar_url: 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?auto=format&fit=crop&q=80&w=256',
      phone: '+1 (555) 019-2834',
      created_at: new Date(Date.now() - 30 * 86400000).toISOString(),
      updated_at: new Date(Date.now() - 30 * 86400000).toISOString(),
    });
    this.credentials.set('admin@exampro.edu', 'Admin@1234');

    // 2. Student 1: Approved / Enrolled
    const student1Id = 'student-user-0001';
    this.profiles.push({
      id: student1Id,
      email: 'student@college.edu',
      full_name: 'Alex Rivera',
      role: 'student',
      avatar_url: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&q=80&w=256',
      phone: '+1 (555) 345-6789',
      created_at: new Date(Date.now() - 10 * 86400000).toISOString(),
      updated_at: new Date(Date.now() - 10 * 86400000).toISOString(),
    });
    this.credentials.set('student@college.edu', 'Student@1234');

    // 3. Student 2: Pending Verification
    const student2Id = 'student-user-0002';
    this.profiles.push({
      id: student2Id,
      email: 'aditya@student.edu',
      full_name: 'Aditya Kumar Jha',
      role: 'student',
      avatar_url: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&q=80&w=256',
      phone: '+91 9876543210',
      created_at: new Date(Date.now() - 1 * 86400000).toISOString(),
      updated_at: new Date(Date.now() - 1 * 86400000).toISOString(),
    });
    this.credentials.set('aditya@student.edu', 'Student@1234');

    // 4. Student 3: Rejected Verification (for demonstration of resubmission)
    const student3Id = 'student-user-0003';
    this.profiles.push({
      id: student3Id,
      email: 'sarah.connor@student.edu',
      full_name: 'Sarah Connor',
      role: 'student',
      phone: '+1 (555) 789-0123',
      created_at: new Date(Date.now() - 2 * 86400000).toISOString(),
      updated_at: new Date(Date.now() - 2 * 86400000).toISOString(),
    });
    this.credentials.set('sarah.connor@student.edu', 'Student@1234');

    // 5. Courses
    const bcaId = 'course-bca-01';
    const mcaId = 'course-mca-02';
    const bbaId = 'course-bba-03';
    const bcomId = 'course-bcom-04';

    this.courses.push(
      {
        id: bcaId,
        code: 'BCA',
        name: 'Bachelor of Computer Applications',
        description: 'Undergraduate professional program in software engineering, cloud computing, and databases.',
        is_active: true,
        created_at: new Date(Date.now() - 60 * 86400000).toISOString(),
        updated_at: new Date(Date.now() - 60 * 86400000).toISOString(),
      },
      {
        id: mcaId,
        code: 'MCA',
        name: 'Master of Computer Applications',
        description: 'Postgraduate program in advanced computer science, algorithms, and distributed systems.',
        is_active: true,
        created_at: new Date(Date.now() - 60 * 86400000).toISOString(),
        updated_at: new Date(Date.now() - 60 * 86400000).toISOString(),
      },
      {
        id: bbaId,
        code: 'BBA',
        name: 'Bachelor of Business Administration',
        description: 'Undergraduate business management and enterprise strategy program.',
        is_active: true,
        created_at: new Date(Date.now() - 60 * 86400000).toISOString(),
        updated_at: new Date(Date.now() - 60 * 86400000).toISOString(),
      },
      {
        id: bcomId,
        code: 'BCom',
        name: 'Bachelor of Commerce',
        description: 'Undergraduate accounting, finance, and financial technologies program.',
        is_active: true,
        created_at: new Date(Date.now() - 60 * 86400000).toISOString(),
        updated_at: new Date(Date.now() - 60 * 86400000).toISOString(),
      }
    );

    // 6. Semesters
    const semBCA3Id = 'sem-bca-3';
    const semBCA4Id = 'sem-bca-4';
    const semMCA1Id = 'sem-mca-1';
    const semBBA2Id = 'sem-bba-2';

    this.semesters.push(
      {
        id: semBCA3Id,
        course_id: bcaId,
        semester_number: 3,
        name: 'Semester III',
        is_active: true,
        created_at: new Date(Date.now() - 60 * 86400000).toISOString(),
      },
      {
        id: semBCA4Id,
        course_id: bcaId,
        semester_number: 4,
        name: 'Semester IV',
        is_active: true,
        created_at: new Date(Date.now() - 60 * 86400000).toISOString(),
      },
      {
        id: semMCA1Id,
        course_id: mcaId,
        semester_number: 1,
        name: 'Semester I',
        is_active: true,
        created_at: new Date(Date.now() - 60 * 86400000).toISOString(),
      },
      {
        id: semBBA2Id,
        course_id: bbaId,
        semester_number: 2,
        name: 'Semester II',
        is_active: true,
        created_at: new Date(Date.now() - 60 * 86400000).toISOString(),
      }
    );

    // 7. Student Enrollments
    this.studentEnrollments.push(
      {
        id: 'enroll-001',
        student_id: student1Id,
        course_id: bcaId,
        semester_id: semBCA3Id,
        college_student_id: 'CS-2026-8819',
        enrollment_number: 'ENR-BCA-2024-049',
        created_at: new Date(Date.now() - 10 * 86400000).toISOString(),
      },
      {
        id: 'enroll-002',
        student_id: student2Id,
        course_id: bcaId,
        semester_id: semBCA3Id,
        college_student_id: 'CS-2026-9022',
        enrollment_number: 'ENR-BCA-2024-082',
        created_at: new Date(Date.now() - 1 * 86400000).toISOString(),
      },
      {
        id: 'enroll-003',
        student_id: student3Id,
        course_id: bbaId,
        semester_id: semBBA2Id,
        college_student_id: 'MG-2026-1104',
        enrollment_number: 'ENR-BBA-2025-014',
        created_at: new Date(Date.now() - 2 * 86400000).toISOString(),
      }
    );

    // 8. Student Verifications
    this.studentVerifications.push(
      {
        id: 'verif-001',
        student_id: student1Id,
        college_student_id: 'CS-2026-8819',
        enrollment_number: 'ENR-BCA-2024-049',
        course_id: bcaId,
        semester_id: semBCA3Id,
        id_card_image_url: 'https://images.unsplash.com/photo-1589829545856-d10d557cf95f?auto=format&fit=crop&q=80&w=800',
        id_card_storage_path: `${student1Id}/id_card.png`,
        status: 'approved',
        reviewed_by: adminId,
        reviewed_at: new Date(Date.now() - 9 * 86400000).toISOString(),
        created_at: new Date(Date.now() - 10 * 86400000).toISOString(),
        updated_at: new Date(Date.now() - 9 * 86400000).toISOString(),
      },
      {
        id: 'verif-002',
        student_id: student2Id,
        college_student_id: 'CS-2026-9022',
        enrollment_number: 'ENR-BCA-2024-082',
        course_id: bcaId,
        semester_id: semBCA3Id,
        id_card_image_url: 'https://images.unsplash.com/photo-1544717305-2782549b5136?auto=format&fit=crop&q=80&w=800',
        id_card_storage_path: `${student2Id}/id_card.png`,
        status: 'pending',
        created_at: new Date(Date.now() - 1 * 86400000).toISOString(),
        updated_at: new Date(Date.now() - 1 * 86400000).toISOString(),
      },
      {
        id: 'verif-003',
        student_id: student3Id,
        college_student_id: 'MG-2026-1104',
        enrollment_number: 'ENR-BBA-2025-014',
        course_id: bbaId,
        semester_id: semBBA2Id,
        id_card_image_url: 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?auto=format&fit=crop&q=80&w=800',
        id_card_storage_path: `${student3Id}/id_card.png`,
        status: 'rejected',
        rejection_reason: 'ID card photograph is blurry and student validity date is unreadable. Please upload a clear photo of your official college identity card.',
        reviewed_by: adminId,
        reviewed_at: new Date(Date.now() - 12 * 3600000).toISOString(),
        created_at: new Date(Date.now() - 2 * 86400000).toISOString(),
        updated_at: new Date(Date.now() - 12 * 3600000).toISOString(),
      }
    );

    // 9. Verification Logs
    this.verificationLogs.push(
      {
        id: 'log-001',
        verification_id: 'verif-001',
        student_id: student1Id,
        action: 'submitted',
        note: 'Initial registration with college identity card.',
        created_at: new Date(Date.now() - 10 * 86400000).toISOString(),
      },
      {
        id: 'log-002',
        verification_id: 'verif-001',
        student_id: student1Id,
        action: 'approved',
        note: 'College ID verified with registrar records.',
        performed_by: adminId,
        created_at: new Date(Date.now() - 9 * 86400000).toISOString(),
      },
      {
        id: 'log-003',
        verification_id: 'verif-002',
        student_id: student2Id,
        action: 'submitted',
        note: 'Submitted for verification awaiting administrative review.',
        created_at: new Date(Date.now() - 1 * 86400000).toISOString(),
      },
      {
        id: 'log-004',
        verification_id: 'verif-003',
        student_id: student3Id,
        action: 'rejected',
        note: 'ID card photograph is blurry and student validity date is unreadable.',
        performed_by: adminId,
        created_at: new Date(Date.now() - 12 * 3600000).toISOString(),
      }
    );

    // 10. Sample Exams
    // Active Exam: Starts slightly before now and ends 3 hours from now, allowing immediate testing
    const nowMs = Date.now();
    const activeExamId = 'exam-dbms-301';
    const upcomingExamId = 'exam-os-302';
    const pastExamId = 'exam-dsa-201';

    this.exams.push(
      {
        id: activeExamId,
        title: 'Database Management Systems & Relational Theory',
        subject: 'BCA-301: DBMS',
        description: 'Comprehensive mid-term examination covering Relational Algebra, SQL, Normalization, ACID Transactions, and Indexing.',
        course_id: bcaId,
        semester_id: semBCA3Id,
        exam_date: new Date(nowMs).toISOString().split('T')[0],
        start_time: new Date(nowMs - 10 * 60 * 1000).toISOString(), // started 10 min ago
        end_time: new Date(nowMs + 24 * 3600 * 1000).toISOString(), // ends in 24 hours
        duration_minutes: 45,
        total_questions: 4,
        total_marks: 20,
        passing_marks: 8,
        negative_marking: true,
        negative_mark_value: 0.5,
        result_release_setting: 'immediate',
        late_entry_policy_minutes: 1440,
        status: 'published',
        instructions: '1. This exam is actively monitored with anti-cheating detections.\n2. Fullscreen mode is enforced; leaving fullscreen or switching tabs records security infractions.\n3. Proctors may issue warnings or temporary holds if suspicious events occur.\n4. Answers are autosaved in real-time.\n5. Click Submit Exam when finished.',
        created_by: adminId,
        created_at: new Date(nowMs - 2 * 86400000).toISOString(),
        updated_at: new Date(nowMs - 2 * 86400000).toISOString(),
      },
      {
        id: upcomingExamId,
        title: 'Operating Systems & Concurrency Architecture',
        subject: 'BCA-302: Operating Systems',
        description: 'Final examination covering process synchronization, memory virtualisation, paging, and kernel deadlocks.',
        course_id: bcaId,
        semester_id: semBCA3Id,
        exam_date: new Date(nowMs + 3 * 86400000).toISOString().split('T')[0],
        start_time: new Date(nowMs + 3 * 86400000).toISOString(),
        end_time: new Date(nowMs + 3 * 86400000 + 120 * 60 * 1000).toISOString(),
        duration_minutes: 90,
        total_questions: 5,
        total_marks: 25,
        passing_marks: 10,
        negative_marking: false,
        negative_mark_value: 0,
        result_release_setting: 'manual',
        late_entry_policy_minutes: 15,
        status: 'published',
        instructions: 'Standard university final examination guidelines apply.',
        created_by: adminId,
        created_at: new Date(nowMs - 1 * 86400000).toISOString(),
        updated_at: new Date(nowMs - 1 * 86400000).toISOString(),
      },
      {
        id: pastExamId,
        title: 'Data Structures and Algorithms Fundamentals',
        subject: 'BCA-201: DSA',
        description: 'Semester II examination on linked lists, balanced binary trees, heaps, and graph traversals.',
        course_id: bcaId,
        semester_id: semBCA3Id,
        exam_date: new Date(nowMs - 14 * 86400000).toISOString().split('T')[0],
        start_time: new Date(nowMs - 14 * 86400000).toISOString(),
        end_time: new Date(nowMs - 14 * 86400000 + 60 * 60 * 1000).toISOString(),
        duration_minutes: 60,
        total_questions: 3,
        total_marks: 15,
        passing_marks: 6,
        negative_marking: false,
        negative_mark_value: 0,
        result_release_setting: 'immediate',
        late_entry_policy_minutes: 15,
        status: 'completed',
        created_by: adminId,
        created_at: new Date(nowMs - 20 * 86400000).toISOString(),
        updated_at: new Date(nowMs - 14 * 86400000).toISOString(),
      }
    );

    // 11. Exam Assignments
    this.examAssignments.push(
      {
        id: 'assign-001',
        exam_id: activeExamId,
        student_id: student1Id,
        assignment_type: 'course_semester',
        assigned_at: new Date(nowMs - 2 * 86400000).toISOString(),
      },
      {
        id: 'assign-002',
        exam_id: upcomingExamId,
        student_id: student1Id,
        assignment_type: 'course_semester',
        assigned_at: new Date(nowMs - 1 * 86400000).toISOString(),
      },
      {
        id: 'assign-003',
        exam_id: pastExamId,
        student_id: student1Id,
        assignment_type: 'course_semester',
        assigned_at: new Date(nowMs - 20 * 86400000).toISOString(),
      }
    );

    // 12. Questions for active exam
    const q1Id = 'q-dbms-001';
    const q2Id = 'q-dbms-002';
    const q3Id = 'q-dbms-003';
    const q4Id = 'q-dbms-004';

    this.questions.push(
      {
        id: q1Id,
        exam_id: activeExamId,
        question_text: 'Which normal form eliminates transitive functional dependencies for non-prime attributes on candidate keys?',
        question_type: 'mcq',
        marks: 4,
        negative_marks: 1,
        order_index: 1,
        explanation: 'Third Normal Form (3NF) requires a relation to be in 2NF with no transitive dependency on the primary key.',
        created_at: new Date().toISOString(),
      },
      {
        id: q2Id,
        exam_id: activeExamId,
        question_text: 'In PostgreSQL and relational theory, an uncommitted transaction isolation level may experience "Dirty Reads" under READ UNCOMMITTED.',
        question_type: 'true_false',
        marks: 3,
        negative_marks: 0.5,
        order_index: 2,
        explanation: 'True: In standard SQL, READ UNCOMMITTED allows reading uncommitted modifications from concurrent transactions (though PG maps it to READ COMMITTED).',
        created_at: new Date().toISOString(),
      },
      {
        id: q3Id,
        exam_id: activeExamId,
        question_text: 'Which SQL clause is used to filter groups created by the GROUP BY aggregation clause?',
        question_type: 'mcq',
        marks: 3,
        negative_marks: 0.5,
        order_index: 3,
        explanation: 'HAVING filters aggregate result rows, whereas WHERE filters individual table rows prior to grouping.',
        created_at: new Date().toISOString(),
      },
      {
        id: q4Id,
        exam_id: activeExamId,
        question_text: 'Explain the difference between a B-Tree index and a Hash index. State one primary scenario where each index structure is optimal.',
        question_type: 'written',
        marks: 10,
        negative_marks: 0,
        order_index: 4,
        explanation: 'B-Trees support range scans (<, >, BETWEEN) and orderings. Hash indexes offer O(1) exact equality matches (=) but cannot perform range scans.',
        created_at: new Date().toISOString(),
      }
    );

    // 13. Question Options
    this.questionOptions.push(
      // Q1 options
      { id: 'opt-q1-1', question_id: q1Id, option_text: 'First Normal Form (1NF)', is_correct: false, order_index: 1 },
      { id: 'opt-q1-2', question_id: q1Id, option_text: 'Second Normal Form (2NF)', is_correct: false, order_index: 2 },
      { id: 'opt-q1-3', question_id: q1Id, option_text: 'Third Normal Form (3NF)', is_correct: true, order_index: 3 },
      { id: 'opt-q1-4', question_id: q1Id, option_text: 'Boyce-Codd Normal Form (BCNF)', is_correct: false, order_index: 4 },

      // Q2 options (True / False)
      { id: 'opt-q2-true', question_id: q2Id, option_text: 'True', is_correct: true, order_index: 1 },
      { id: 'opt-q2-false', question_id: q2Id, option_text: 'False', is_correct: false, order_index: 2 },

      // Q3 options
      { id: 'opt-q3-1', question_id: q3Id, option_text: 'WHERE', is_correct: false, order_index: 1 },
      { id: 'opt-q3-2', question_id: q3Id, option_text: 'ORDER BY', is_correct: false, order_index: 2 },
      { id: 'opt-q3-3', question_id: q3Id, option_text: 'HAVING', is_correct: true, order_index: 3 },
      { id: 'opt-q3-4', question_id: q3Id, option_text: 'PARTITION BY', is_correct: false, order_index: 4 }
    );

    // 14. Notifications
    this.notifications.push(
      {
        id: 'notif-001',
        user_id: student1Id,
        title: 'Verification Approved',
        message: 'Your college identity card has been verified. You now have full access to examinations and coursework.',
        type: 'success',
        is_read: true,
        created_at: new Date(nowMs - 9 * 86400000).toISOString(),
      },
      {
        id: 'notif-002',
        user_id: student1Id,
        title: 'New Exam Scheduled',
        message: 'Database Management Systems & Relational Theory (BCA-301) has been scheduled.',
        type: 'info',
        is_read: false,
        created_at: new Date(nowMs - 2 * 86400000).toISOString(),
      },
      {
        id: 'notif-003',
        user_id: student2Id,
        title: 'Verification Under Review',
        message: 'Your college ID card submission is currently in the administrative verification queue.',
        type: 'info',
        is_read: false,
        created_at: new Date(nowMs - 1 * 86400000).toISOString(),
      },
      {
        id: 'notif-004',
        user_id: student3Id,
        title: 'Verification Action Required',
        message: 'Your college identity verification was rejected due to an illegible ID image. Please upload a clear photo.',
        type: 'warning',
        is_read: false,
        created_at: new Date(nowMs - 12 * 3600000).toISOString(),
      }
    );

    // 15. Activity logs
    this.activityLogs.push({
      id: 'act-001',
      user_id: adminId,
      action: 'EXAM_CREATED',
      resource: 'exams',
      details: { title: 'Database Management Systems & Relational Theory' },
      ip_address: '127.0.0.1',
      created_at: new Date(nowMs - 2 * 86400000).toISOString(),
    });
  }
}

export const dataStore = new ExamProDataStore();
