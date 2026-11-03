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

/**
 * Tests the real database connection against Supabase.
 * Returns true only if actual credentials are valid and a ping query succeeds.
 */
export async function testDatabaseConnection(): Promise<{ connected: boolean; message: string; timestamp: string }> {
  const timestamp = new Date().toISOString();

  if (!isRealSupabaseConfigured || !supabase) {
    return {
      connected: false,
      message: 'Database is disconnected. SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY is missing.',
      timestamp,
    };
  }

  try {
    const { error } = await supabase.from('profiles').select('id').limit(1);
    if (error) {
      return {
        connected: false,
        message: `Database error: ${error.message}`,
        timestamp,
      };
    }
    return {
      connected: true,
      message: 'PostgreSQL database connected via Supabase.',
      timestamp,
    };
  } catch (err: any) {
    return {
      connected: false,
      message: `Database connection failed: ${err.message || 'Network unreachable'}`,
      timestamp,
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
  credentials: Map<string, string> = new Map();

  constructor() {
    // Intentionally empty. Zero demo data seeded.
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
