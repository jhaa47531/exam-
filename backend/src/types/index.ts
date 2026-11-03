export type UserRole = 'admin' | 'student';

export type VerificationStatus = 'pending' | 'approved' | 'rejected';

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
  created_at: string;
  updated_at: string;
}

export interface Course {
  id: string;
  code: string;
  name: string;
  description?: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface Semester {
  id: string;
  course_id: string;
  semester_number: number;
  name: string;
  is_active: boolean;
  created_at: string;
}

export interface StudentEnrollment {
  id: string;
  student_id: string;
  course_id: string;
  semester_id: string;
  college_student_id: string;
  enrollment_number: string;
  created_at: string;
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
  created_at: string;
  updated_at: string;
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
  created_by?: string;
  created_at: string;
  updated_at: string;
}

export interface ExamAssignment {
  id: string;
  exam_id: string;
  student_id: string;
  assignment_type: 'course_semester' | 'individual' | 'all_eligible';
  assigned_at: string;
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
  created_at: string;
}

export interface QuestionOption {
  id: string;
  question_id: string;
  option_text: string;
  is_correct: boolean;
  order_index: number;
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
  ip_address?: string;
  user_agent?: string;
  created_at: string;
  updated_at: string;
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
  created_at: string;
  updated_at: string;
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
  generated_at: string;
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

export interface AdminAction {
  id: string;
  admin_id: string;
  target_attempt_id?: string;
  target_student_id?: string;
  action_type: 'warning' | 'hold' | 'resume' | 'terminate' | 'grade' | 'publish' | 'verify_approve' | 'verify_reject';
  details?: Record<string, any>;
  created_at: string;
}

export interface ExamHold {
  id: string;
  attempt_id: string;
  admin_id: string;
  duration_seconds: number;
  hold_start: string;
  hold_end: string;
  reason: string;
  status: 'active' | 'resumed' | 'expired';
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

export interface ActivityLog {
  id: string;
  user_id?: string;
  action: string;
  resource: string;
  details?: Record<string, any>;
  ip_address?: string;
  created_at: string;
}
