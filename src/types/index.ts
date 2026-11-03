export type UserRole = 'admin' | 'student' | 'faculty' | 'teacher';

export type VerificationStatus = 'pending' | 'approved' | 'rejected' | 'unregistered';

export type ExamStatus = 'draft' | 'published' | 'completed' | 'cancelled';

export type QuestionType = 'mcq' | 'true_false' | 'written';

export type AttemptStatus = 'in_progress' | 'submitted' | 'held' | 'terminated' | 'expired';

export type ResultStatus = 'draft' | 'published';

export interface UserProfile {
  id: string;
  email: string;
  full_name: string;
  role: UserRole;
  avatar_url?: string;
  phone?: string;
  is_active?: boolean;
  department?: string;
  designation?: string;
  created_at?: string;
  updated_at?: string;
}

export interface FacultyMember {
  id: string;
  email: string;
  full_name: string;
  role: 'faculty' | 'admin';
  department: string;
  designation: string;
  phone?: string;
  employee_id?: string;
  is_active: boolean;
  created_at?: string;
  updated_at?: string;
}

export interface Subject {
  id: string;
  code: string;
  name: string;
  course_id?: string;
  semester_id?: string;
  course_name?: string;
  semester_name?: string;
  description?: string;
  is_active: boolean;
  created_at?: string;
  updated_at?: string;
}

export interface Course {
  id: string;
  code: string;
  name: string;
  description?: string;
  is_active: boolean;
  is_archived?: boolean;
  semesters?: Semester[];
  studentCount?: number;
  created_at?: string;
}

export interface Semester {
  id: string;
  course_id: string;
  semester_number: number;
  name: string;
  is_active: boolean;
  created_at?: string;
}

export interface StudentEnrollment {
  id: string;
  student_id: string;
  course_id: string;
  semester_id: string;
  college_student_id: string;
  enrollment_number: string;
  created_at?: string;
}

export interface StudentVerification {
  id: string;
  student_id: string;
  college_student_id: string;
  enrollment_number: string;
  course_id: string;
  semester_id: string;
  id_card_image_url?: string;
  id_card_storage_path?: string;
  status: VerificationStatus;
  rejection_reason?: string;
  reviewed_by?: string;
  reviewed_at?: string;
  created_at?: string;
  updated_at?: string;
  student_name?: string;
  student_email?: string;
  course_name?: string;
  course_code?: string;
  semester_name?: string;
}

export interface VerificationLog {
  id: string;
  verification_id: string;
  student_id: string;
  action: 'submitted' | 'resubmitted' | 'approved' | 'rejected';
  note?: string;
  performed_by?: string;
  created_at: string;
}

export interface Exam {
  id: string;
  title: string;
  subject: string;
  description?: string;
  course_id: string;
  semester_id: string;
  exam_date: string;
  start_time: string;
  end_time: string;
  duration_minutes: number;
  total_questions: number;
  total_marks: number;
  passing_marks: number;
  negative_marking: boolean;
  negative_mark_value: number;
  result_release_setting: 'immediate' | 'manual' | 'scheduled';
  late_entry_policy_minutes: number;
  status: ExamStatus;
  instructions?: string;
  is_archived?: boolean;
  course_name?: string;
  course_code?: string;
  semester_name?: string;
  questionsCount?: number;
  assignmentsCount?: number;
  attemptsCount?: number;
  attempt?: {
    id: string;
    status: AttemptStatus;
    start_time: string;
    scheduled_end_time: string;
    submitted_at?: string;
    warning_count: number;
  } | null;
  result?: ExamResult | null;
}

export interface QuestionOption {
  id: string;
  question_id: string;
  option_text: string;
  is_correct?: boolean; // Only visible to admin
  order_index: number;
}

export interface Question {
  id: string;
  exam_id: string;
  question_text: string;
  question_type: QuestionType;
  marks: number;
  negative_marks: number;
  order_index: number;
  explanation?: string;
  options?: QuestionOption[];
}

export interface ExamAttempt {
  id: string;
  exam_id: string;
  student_id: string;
  start_time: string;
  scheduled_end_time: string;
  submitted_at?: string;
  status: AttemptStatus;
  hold_until?: string;
  hold_reason?: string;
  termination_reason?: string;
  warning_count: number;
  tab_switch_count: number;
  fullscreen_exit_count: number;
  student_name?: string;
  student_email?: string;
  college_student_id?: string;
  exam_title?: string;
  remainingSeconds?: number;
  securityEvents?: SecurityEvent[];
}

export interface StudentAnswer {
  id: string;
  attempt_id: string;
  question_id: string;
  selected_option_id?: string;
  written_answer?: string;
  marks_awarded?: number;
  is_marked: boolean;
  reviewed_by?: string;
  feedback?: string;
}

export interface ExamResult {
  id: string;
  attempt_id: string;
  exam_id: string;
  student_id: string;
  total_marks: number;
  obtained_marks: number;
  percentage: number;
  is_passed: boolean;
  status: ResultStatus;
  published_at?: string;
  generated_at?: string;
  exam_title?: string;
  subject?: string;
  student_name?: string;
  student_email?: string;
  passing_marks?: number;
  warning_count?: number;
  pendingWrittenCount?: number;
}

export interface SecurityEvent {
  id: string;
  attempt_id: string;
  student_id: string;
  event_type: 'tab_switch' | 'fullscreen_exit' | 'devtools_opened' | 'copy_paste' | 'window_blur' | 'network_disconnect' | 'network_reconnect';
  event_details?: Record<string, any>;
  client_timestamp: string;
  created_at: string;
}

export interface NotificationItem {
  id: string;
  user_id: string;
  title: string;
  message: string;
  type: 'info' | 'warning' | 'success' | 'alert';
  is_read: boolean;
  metadata?: Record<string, any>;
  created_at: string;
}
