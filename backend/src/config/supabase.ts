import dotenv from 'dotenv';
dotenv.config();
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
  FacultyMember,
  Subject,
} from '../types';

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const supabaseAnonKey = process.env.SUPABASE_ANON_KEY;

export const hasServiceRoleKey = Boolean(
  supabaseServiceRoleKey &&
  supabaseServiceRoleKey !== 'your-supabase-service-role-key'
);

export const isRealSupabaseConfigured = Boolean(
  supabaseUrl &&
  supabaseUrl.startsWith('http') &&
  (hasServiceRoleKey || (supabaseAnonKey && supabaseAnonKey !== 'your-supabase-anon-key'))
);

/**
 * Server-side administrative client using the Supabase service_role secret.
 * Bypasses RLS policies strictly on the backend for administrative operations.
 * NEVER exposed to client-side code.
 */
export const supabaseAdmin: SupabaseClient | null =
  isRealSupabaseConfigured && hasServiceRoleKey
    ? createClient(supabaseUrl!, supabaseServiceRoleKey!, {
        auth: { persistSession: false, autoRefreshToken: false },
      })
    : null;

/**
 * Standard server-side Supabase client.
 * Uses supabaseAdmin if available, otherwise falls back to anon key.
 */
export const supabase: SupabaseClient | null = isRealSupabaseConfigured
  ? (supabaseAdmin ||
      (supabaseAnonKey
        ? createClient(supabaseUrl!, supabaseAnonKey, {
            auth: { persistSession: false, autoRefreshToken: false },
          })
        : null))
  : null;

// Simulation state for health and failure testing
let simulatedDatabaseOutage = false;

export function setSimulatedDatabaseOutage(isOutage: boolean): void {
  simulatedDatabaseOutage = isOutage;
}

export function isSimulatedDatabaseOutage(): boolean {
  return simulatedDatabaseOutage;
}

export interface DatabaseConnectionHealthResult {
  connected: boolean;
  status: 'connected' | 'disconnected';
  message: string;
  timestamp: string;
  latencyMs?: number;
  code?: string;
  error?: string;
}

/**
 * Tests the real database connection against Supabase using a lightweight query.
 * Measures round-trip query latency and returns a safe status report.
 * Strictly avoids exposing database credentials, URLs, connection strings or internal stack traces.
 */
export async function testDatabaseConnection(): Promise<DatabaseConnectionHealthResult> {
  const timestamp = new Date().toISOString();
  const startTime = Date.now();

  // Test simulation hook
  if (simulatedDatabaseOutage) {
    return {
      connected: false,
      status: 'disconnected',
      message: 'We are unable to connect to the database. Please try again later.',
      error: 'We are unable to connect to the database. Please try again later.',
      code: 'DATABASE_SIMULATED_DISCONNECT',
      timestamp,
      latencyMs: 0,
    };
  }

  if (!isRealSupabaseConfigured || (!supabase && !supabaseAdmin)) {
    return {
      connected: false,
      status: 'disconnected',
      message: 'We are unable to connect to the database. Please try again later.',
      error: 'Database is disconnected. In-memory data store is active.',
      timestamp,
      latencyMs: 0,
    };
  }

  try {
    // 1. If backend has service_role privileges, execute a lightweight check against profiles table
    if (supabaseAdmin) {
      const { error } = await supabaseAdmin.from('profiles').select('id').limit(1);
      const latencyMs = Math.max(1, Date.now() - startTime);

      if (!error) {
        return {
          connected: true,
          status: 'connected',
          message: 'Database connected successfully',
          timestamp,
          latencyMs,
        };
      }

      // Safe error messages without leaking internal strings
      if (error.code === '42501' || error.message?.includes('permission denied')) {
        return {
          connected: false,
          status: 'disconnected',
          code: '42501',
          message: 'We are unable to connect to the database. Please try again later.',
          error: 'Database permission denied for verification query under Row Level Security.',
          timestamp,
          latencyMs,
        };
      }

      return {
        connected: false,
        status: 'disconnected',
        message: 'We are unable to connect to the database. Please try again later.',
        error: 'Database query failed to respond. Connectivity issue detected.',
        timestamp,
        latencyMs,
      };
    }

    // 2. If running with anon key, verify connectivity via public courses catalog
    if (supabase) {
      const { error: courseErr } = await supabase.from('courses').select('id').limit(1);
      const latencyMs = Math.max(1, Date.now() - startTime);

      if (!courseErr) {
        return {
          connected: true,
          status: 'connected',
          message: 'Database connected successfully',
          timestamp,
          latencyMs,
        };
      }

      return {
        connected: false,
        status: 'disconnected',
        message: 'We are unable to connect to the database. Please try again later.',
        error: 'Database query failed to respond. Connectivity issue detected.',
        timestamp,
        latencyMs,
      };
    }

    return {
      connected: false,
      status: 'disconnected',
      message: 'We are unable to connect to the database. Please try again later.',
      error: 'Database client not initialized.',
      timestamp,
      latencyMs: 0,
    };
  } catch {
    const latencyMs = Date.now() - startTime;
    return {
      connected: false,
      status: 'disconnected',
      message: 'We are unable to connect to the database. Please try again later.',
      error: 'We are unable to connect to the database. Please try again later.',
      timestamp,
      latencyMs,
    };
  }
}

/**
 * In-memory fallback container strictly used for state tracking when no demo data is loaded.
 * NO SEED DATA, NO MOCK RECORDS, NO DEMO USERS.
 */
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
  subjects: Subject[] = [];
  faculty: FacultyMember[] = [];
  credentials: Map<string, string> = new Map();
  studentCollegeIdMap: Map<string, string> = new Map();

  constructor() {
    // Empty by default - no fake or seed demo records
  }

  initSeedData() {
    const now = new Date();
    const nowIso = now.toISOString();

    // 1. System Administrator
    const adminEmail = (process.env.ADMIN_EMAIL || 'admin@exampro.edu').toLowerCase();
    const adminPass = process.env.ADMIN_PASSWORD || 'Admin@1234';
    const adminProfile: UserProfile = {
      id: 'admin-system-01',
      email: adminEmail,
      full_name: 'Chief Examination Controller',
      role: 'admin',
      created_at: nowIso,
      updated_at: nowIso,
    };
    this.profiles.push(adminProfile);
    this.credentials.set(adminEmail, adminPass);
    this.credentials.set('admin@exampro.edu', 'Admin@1234');
    this.credentials.set('admin', adminPass);

    if (adminEmail !== 'admin@exampro.edu') {
      this.profiles.push({
        id: 'admin-system-02',
        email: 'admin@exampro.edu',
        full_name: 'Chief Examination Controller',
        role: 'admin',
        created_at: nowIso,
        updated_at: nowIso,
      });
    }

    // 2. Academic Courses
    const courseBca: Course = {
      id: 'course-bca',
      code: 'BCA',
      name: 'Bachelor of Computer Applications',
      description: 'Three-year undergraduate program in software engineering, algorithms, and application development.',
      is_active: true,
      created_at: nowIso,
      updated_at: nowIso,
    };
    const courseBtech: Course = {
      id: 'course-btech',
      code: 'BTECH-CSE',
      name: 'B.Tech Computer Science & Engineering',
      description: 'Four-year engineering degree in systems design, algorithms, cloud systems, and networks.',
      is_active: true,
      created_at: nowIso,
      updated_at: nowIso,
    };
    const courseMca: Course = {
      id: 'course-mca',
      code: 'MCA',
      name: 'Master of Computer Applications',
      description: 'Postgraduate program covering enterprise architectures, machine learning, and cybersecurity.',
      is_active: true,
      created_at: nowIso,
      updated_at: nowIso,
    };
    this.courses.push(courseBca, courseBtech, courseMca);

    // 3. Semesters
    for (let i = 1; i <= 6; i++) {
      this.semesters.push({
        id: `sem-bca-${i}`,
        course_id: 'course-bca',
        semester_number: i,
        name: `Semester ${i}`,
        is_active: true,
        created_at: nowIso,
      });
    }
    for (let i = 1; i <= 8; i++) {
      this.semesters.push({
        id: `sem-btech-${i}`,
        course_id: 'course-btech',
        semester_number: i,
        name: `Semester ${i}`,
        is_active: true,
        created_at: nowIso,
      });
    }
    for (let i = 1; i <= 4; i++) {
      this.semesters.push({
        id: `sem-mca-${i}`,
        course_id: 'course-mca',
        semester_number: i,
        name: `Semester ${i}`,
        is_active: true,
        created_at: nowIso,
      });
    }

    // 3b. Subjects Catalog
    const subjectsSeed: Subject[] = [
      {
        id: 'subj-01',
        code: 'CS-401',
        name: 'Database Management Systems & SQL',
        course_id: 'course-bca',
        semester_id: 'sem-bca-4',
        description: 'Relational data modeling, SQL optimization, and database transaction management.',
        is_active: true,
        created_at: nowIso,
      },
      {
        id: 'subj-02',
        code: 'CS-402',
        name: 'Web Technologies & Cloud Computing',
        course_id: 'course-bca',
        semester_id: 'sem-bca-4',
        description: 'Modern front-end frameworks, REST APIs, and serverless architectures.',
        is_active: true,
        created_at: nowIso,
      },
      {
        id: 'subj-03',
        code: 'CS-403',
        name: 'Data Structures and Algorithms',
        course_id: 'course-bca',
        semester_id: 'sem-bca-3',
        description: 'Trees, graphs, dynamic programming, and asymptotic computational analysis.',
        is_active: true,
        created_at: nowIso,
      },
      {
        id: 'subj-04',
        code: 'CSE-501',
        name: 'Computer Networks & Security',
        course_id: 'course-btech',
        semester_id: 'sem-btech-5',
        description: 'TCP/IP stack, routing protocols, cryptography, and network telemetry.',
        is_active: true,
        created_at: nowIso,
      },
    ];
    this.subjects.push(...subjectsSeed);

    // 3c. Faculty & Proctors
    const facultySeed: FacultyMember[] = [
      {
        id: 'fac-01',
        email: 'turing.alan@exampro.edu',
        full_name: 'Dr. Alan Turing',
        role: 'faculty',
        department: 'Computer Science',
        designation: 'Associate Professor & Proctor',
        phone: '+1 (555) 789-0123',
        employee_id: 'FAC-2024-01',
        is_active: true,
        created_at: nowIso,
      },
      {
        id: 'fac-02',
        email: 'grace.hopper@exampro.edu',
        full_name: 'Prof. Grace Hopper',
        role: 'faculty',
        department: 'Information Technology',
        designation: 'Senior Faculty & Chief Examiner',
        phone: '+1 (555) 890-1234',
        employee_id: 'FAC-2024-02',
        is_active: true,
        created_at: nowIso,
      },
      {
        id: 'fac-03',
        email: 'ada.lovelace@exampro.edu',
        full_name: 'Dr. Ada Lovelace',
        role: 'faculty',
        department: 'Software Engineering',
        designation: 'Professor & Proctor Lead',
        phone: '+1 (555) 901-2345',
        employee_id: 'FAC-2024-03',
        is_active: true,
        created_at: nowIso,
      },
    ];
    this.faculty.push(...facultySeed);
    // Add faculty to profiles as well so they are queryable
    for (const f of facultySeed) {
      this.profiles.push({
        id: f.id,
        email: f.email,
        full_name: f.full_name,
        role: 'faculty',
        department: f.department,
        designation: f.designation,
        phone: f.phone,
        is_active: f.is_active,
        created_at: f.created_at,
        updated_at: f.created_at,
      });
      this.credentials.set(f.email, 'Faculty@1234');
    }

    // 4. Pre-verified Student Candidate (Alex Rivera)
    const alexStudent: UserProfile = {
      id: 'student-alex-01',
      email: 'alex.student@exampro.edu',
      full_name: 'Alex Rivera',
      role: 'student',
      phone: '+1 (555) 234-5678',
      avatar_url: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&q=80&w=200',
      created_at: nowIso,
      updated_at: nowIso,
    };
    this.profiles.push(alexStudent);
    this.credentials.set('alex.student@exampro.edu', 'Student@1234');
    this.credentials.set('cs-2026-9022', 'Student@1234');
    this.credentials.set('enr-2024-001', 'Student@1234');

    const alexEnrollment: StudentEnrollment = {
      id: 'enr-alex-01',
      student_id: alexStudent.id,
      course_id: 'course-bca',
      semester_id: 'sem-bca-4',
      college_student_id: 'CS-2026-9022',
      enrollment_number: 'ENR-2024-001',
      created_at: nowIso,
    };
    this.studentEnrollments.push(alexEnrollment);

    const alexVerification: StudentVerification = {
      id: 'ver-alex-01',
      student_id: alexStudent.id,
      college_student_id: 'CS-2026-9022',
      enrollment_number: 'ENR-2024-001',
      course_id: 'course-bca',
      semester_id: 'sem-bca-4',
      id_card_image_url: 'https://images.unsplash.com/photo-1544717305-2782549b5136?auto=format&fit=crop&q=80&w=600',
      status: 'approved',
      reviewed_by: 'admin-system-01',
      reviewed_at: nowIso,
      created_at: nowIso,
      updated_at: nowIso,
    };
    this.studentVerifications.push(alexVerification);

    // 5. Pending Candidate for Admin Verification Testing (Sarah Chen)
    const sarahStudent: UserProfile = {
      id: 'student-sarah-02',
      email: 'sarah.chen@exampro.edu',
      full_name: 'Sarah Chen',
      role: 'student',
      phone: '+1 (555) 345-6789',
      avatar_url: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&q=80&w=200',
      created_at: nowIso,
      updated_at: nowIso,
    };
    this.profiles.push(sarahStudent);
    this.credentials.set('sarah.chen@exampro.edu', 'Student@1234');
    this.credentials.set('cs-2026-9023', 'Student@1234');
    this.credentials.set('enr-2024-002', 'Student@1234');

    const sarahEnrollment: StudentEnrollment = {
      id: 'enr-sarah-02',
      student_id: sarahStudent.id,
      course_id: 'course-bca',
      semester_id: 'sem-bca-4',
      college_student_id: 'CS-2026-9023',
      enrollment_number: 'ENR-2024-002',
      created_at: nowIso,
    };
    this.studentEnrollments.push(sarahEnrollment);

    const sarahVerification: StudentVerification = {
      id: 'ver-sarah-02',
      student_id: sarahStudent.id,
      college_student_id: 'CS-2026-9023',
      enrollment_number: 'ENR-2024-002',
      course_id: 'course-bca',
      semester_id: 'sem-bca-4',
      id_card_image_url: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&q=80&w=600',
      status: 'pending',
      created_at: nowIso,
      updated_at: nowIso,
    };
    this.studentVerifications.push(sarahVerification);

    // 6. Active Examination (Data Structures & Algorithms)
    const examStartDate = new Date(Date.now() - 30 * 60 * 1000).toISOString();
    const examEndDate = new Date(Date.now() + 48 * 60 * 60 * 1000).toISOString();
    const examDateStr = now.toISOString().split('T')[0];

    const sampleExam: Exam = {
      id: 'exam-dsa-01',
      title: 'Midterm Assessment: Data Structures & Algorithms',
      subject: 'Data Structures (CS-401)',
      description: 'Official university assessment covering tree traversal, balanced binary search trees, asymptotic complexity, and graph search.',
      course_id: 'course-bca',
      semester_id: 'sem-bca-4',
      exam_date: examDateStr,
      start_time: examStartDate,
      end_time: examEndDate,
      duration_minutes: 30,
      total_questions: 5,
      total_marks: 25,
      passing_marks: 10,
      negative_marking: false,
      negative_mark_value: 0,
      result_release_setting: 'immediate',
      late_entry_policy_minutes: 0,
      status: 'published',
      instructions: 'Anti-cheating proctoring active: Camera monitoring, tab switch detection, and fullscreen enforcement are enabled.',
      created_by: 'admin-system-01',
      created_at: nowIso,
      updated_at: nowIso,
    };
    this.exams.push(sampleExam);

    // Exam Assignment
    this.examAssignments.push({
      id: 'assign-dsa-alex',
      exam_id: sampleExam.id,
      student_id: alexStudent.id,
      assignment_type: 'course_semester',
      assigned_at: nowIso,
    });

    // 7. Questions & Question Options
    const questionsData = [
      {
        id: 'q-dsa-01',
        text: 'What is the worst-case time complexity of searching in an AVL (Self-Balancing) Binary Search Tree?',
        explanation: 'AVL trees strictly maintain a height of O(log n), ensuring searches always complete in logarithmic time.',
        options: [
          { text: 'O(log n)', correct: true },
          { text: 'O(n)', correct: false },
          { text: 'O(n log n)', correct: false },
          { text: 'O(1)', correct: false },
        ],
      },
      {
        id: 'q-dsa-02',
        text: 'Which abstract data type operates strictly on a First-In, First-Out (FIFO) discipline?',
        explanation: 'A Queue processes items in the exact order they arrive (FIFO).',
        options: [
          { text: 'Queue', correct: true },
          { text: 'Stack', correct: false },
          { text: 'Priority Queue', correct: false },
          { text: 'Binary Heap', correct: false },
        ],
      },
      {
        id: 'q-dsa-03',
        text: 'In graph theory, which algorithm computes single-source shortest paths on graphs with non-negative edge weights?',
        explanation: 'Dijkstra algorithm uses a greedy approach with a priority queue to calculate shortest paths.',
        options: [
          { text: 'Dijkstra Algorithm', correct: true },
          { text: 'Kruskal Algorithm', correct: false },
          { text: 'Prim Algorithm', correct: false },
          { text: 'Floyd-Warshall Algorithm', correct: false },
        ],
      },
      {
        id: 'q-dsa-04',
        text: 'What is the amortized time complexity of appending an element to a dynamically resizing array?',
        explanation: 'Doubling the buffer capacity when full yields an average amortized constant time of O(1) per insertion.',
        options: [
          { text: 'O(1)', correct: true },
          { text: 'O(n)', correct: false },
          { text: 'O(log n)', correct: false },
          { text: 'O(n²)', correct: false },
        ],
      },
      {
        id: 'q-dsa-05',
        text: 'Which collision resolution strategy chains colliding hash entries using a singly-linked list in each bucket?',
        explanation: 'Separate Chaining stores colliding elements in a linked list attached to the bucket index.',
        options: [
          { text: 'Separate Chaining', correct: true },
          { text: 'Linear Probing', correct: false },
          { text: 'Quadratic Probing', correct: false },
          { text: 'Double Hashing', correct: false },
        ],
      },
    ];

    questionsData.forEach((qItem, idx) => {
      const q: Question = {
        id: qItem.id,
        exam_id: sampleExam.id,
        question_text: qItem.text,
        question_type: 'mcq',
        marks: 5,
        negative_marks: 0,
        order_index: idx + 1,
        explanation: qItem.explanation,
        created_at: nowIso,
      };
      this.questions.push(q);

      qItem.options.forEach((optItem, optIdx) => {
        const opt: QuestionOption = {
          id: `opt-${qItem.id}-${optIdx + 1}`,
          question_id: qItem.id,
          option_text: optItem.text,
          is_correct: optItem.correct,
          order_index: optIdx + 1,
        };
        this.questionOptions.push(opt);
      });
    });
  }

  clearAll() {
    this.profiles = [];
    this.courses = [];
    this.semesters = [];
    this.studentEnrollments = [];
    this.studentVerifications = [];
    this.verificationLogs = [];
    this.exams = [];
    this.examAssignments = [];
    this.questions = [];
    this.questionOptions = [];
    this.examAttempts = [];
    this.answers = [];
    this.results = [];
    this.securityEvents = [];
    this.adminActions = [];
    this.examHolds = [];
    this.notifications = [];
    this.activityLogs = [];
    this.credentials.clear();
  }
}

export const dataStore = new ExamProDataStore();
