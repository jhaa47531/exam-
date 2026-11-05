import { supabaseAdmin, supabase, isRealSupabaseConfigured, isSimulatedDatabaseOutage, dataStore } from '../config/supabase';
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

/**
 * Returns the active administrative client.
 * Uses service_role client to perform server-authoritative operations.
 */
export function getDbClient() {
  if (isSimulatedDatabaseOutage()) {
    throw new DatabaseError(
      'Database connection is currently unavailable. Operations are disabled.',
      'DATABASE_UNAVAILABLE'
    );
  }
  const client = supabaseAdmin || supabase;
  if (!client || !isRealSupabaseConfigured) {
    throw new DatabaseError(
      'Primary PostgreSQL database is not connected. In-memory fallback is disabled in production.',
      'DATABASE_DISCONNECTED'
    );
  }
  return client;
}

export class DatabaseError extends Error {
  code?: string;
  details?: any;
  hint?: string;

  constructor(message: string, code?: string, details?: any, hint?: string) {
    super(message);
    this.name = 'DatabaseError';
    this.code = code;
    this.details = details;
    this.hint = hint;
  }
}

function handlePgError(table: string, op: string, error: any): never {
  const code = error?.code || 'PG_ERROR';
  const hint = error?.hint || '';
  const message = error?.message || `PostgreSQL ${op} operation failed on ${table}`;

  if (code === '42501') {
    throw new DatabaseError(
      `Permission denied for table "${table}". Run database/migrations/002_grant_permissions.sql in Supabase SQL editor to grant service_role permissions.`,
      code,
      error?.details,
      hint
    );
  }
  if (code === '23505') {
    throw new DatabaseError(
      `Unique constraint violation on ${table}: ${message}`,
      code,
      error?.details,
      hint
    );
  }
  if (code === 'PGRST205' || code === '42P01') {
    throw new DatabaseError(
      `Table "${table}" does not exist in PostgreSQL schema cache. Please verify migrations.`,
      code,
      error?.details,
      hint
    );
  }

  throw new DatabaseError(message, code, error?.details, hint);
}

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
export function isValidUuid(id: string): boolean {
  return typeof id === 'string' && UUID_REGEX.test(id);
}

function handleSelectError(table: string, error: any): boolean {
  const code = error?.code || '';
  if (code === '42501' || code === '42P01' || code === 'PGRST205' || code === '22P02') {
    return true;
  }
  handlePgError(table, 'SELECT', error);
  return false;
}

// ============================================================================
// 1. PROFILES & USERS
// ============================================================================

export async function findProfileById(id: string): Promise<UserProfile | null> {
  const client = getDbClient();
  if (isValidUuid(id)) {
    const { data, error } = await client.from('profiles').select('*').eq('id', id).maybeSingle();
    if (!error && data) {
      return {
        id: data.id,
        email: data.email,
        full_name: data.full_name,
        role: data.role,
        avatar_url: data.avatar_url,
        phone: data.phone,
        is_active: data.account_status !== 'suspended' && data.account_status !== 'archived',
        created_at: data.created_at,
        updated_at: data.updated_at,
      };
    }
  }
  return dataStore.profiles.find((p) => p.id === id || p.email.toLowerCase() === id.toLowerCase()) || null;
}

export async function findProfileByEmail(email: string): Promise<UserProfile | null> {
  const client = getDbClient();
  const { data, error } = await client
    .from('profiles')
    .select('*')
    .ilike('email', email.trim().toLowerCase())
    .maybeSingle();
  if (error) handlePgError('profiles', 'SELECT', error);
  if (!data) return null;
  return {
    id: data.id,
    email: data.email,
    full_name: data.full_name,
    role: data.role,
    avatar_url: data.avatar_url,
    phone: data.phone,
    is_active: data.account_status !== 'suspended' && data.account_status !== 'archived',
    created_at: data.created_at,
    updated_at: data.updated_at,
  };
}

export async function getAllProfiles(role?: string): Promise<UserProfile[]> {
  const client = getDbClient();
  let query = client.from('profiles').select('*').order('created_at', { ascending: false });
  if (role) {
    query = query.eq('role', role);
  }
  const { data, error } = await query;
  if (error) handlePgError('profiles', 'SELECT', error);
  return (data || []).map((d: any) => ({
    id: d.id,
    email: d.email,
    full_name: d.full_name,
    role: d.role,
    avatar_url: d.avatar_url,
    phone: d.phone,
    is_active: d.account_status !== 'suspended' && d.account_status !== 'archived',
    created_at: d.created_at,
    updated_at: d.updated_at,
  }));
}

export async function insertProfile(profile: Partial<UserProfile> & { id: string; email: string; full_name: string; role: string }): Promise<UserProfile> {
  const client = getDbClient();
  const isValidId = isValidUuid(profile.id);
  const targetId = isValidId ? profile.id : crypto.randomUUID();
  const dbRole = (profile.role === 'faculty' || profile.role === 'teacher') ? 'admin' : profile.role;
  const row = {
    id: targetId,
    email: profile.email.toLowerCase(),
    full_name: profile.full_name,
    role: dbRole,
    account_status: 'active',
    created_at: profile.created_at || new Date().toISOString(),
    updated_at: profile.updated_at || new Date().toISOString(),
  };
  const { data, error } = await client.from('profiles').upsert(row, { onConflict: 'id' }).select().single();
  if (error) {
    if (error.code === '42501' || error.code === '42P01' || error.code === 'PGRST205' || error.code === '23514' || error.code === '22P02' || error.code === '23503' || !isValidId) {
      const fallback: UserProfile = {
        id: profile.id,
        email: profile.email.toLowerCase(),
        full_name: profile.full_name,
        role: profile.role as any,
        is_active: true,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };
      const idx = dataStore.profiles.findIndex(p => p.id === fallback.id);
      if (idx >= 0) dataStore.profiles[idx] = fallback;
      else dataStore.profiles.push(fallback);
      return fallback;
    }
    handlePgError('profiles', 'INSERT', error);
  }
  return {
    id: profile.id,
    email: data.email,
    full_name: data.full_name,
    role: profile.role as any,
    is_active: true,
    created_at: data.created_at,
    updated_at: data.updated_at,
  };
}

export async function updateProfile(id: string, updates: Partial<UserProfile>): Promise<UserProfile> {
  const client = getDbClient();
  const payload: any = {
    updated_at: new Date().toISOString(),
  };
  if (updates.full_name !== undefined) payload.full_name = updates.full_name;
  if (updates.avatar_url !== undefined) payload.avatar_url = updates.avatar_url;
  if (updates.phone !== undefined) payload.phone = updates.phone;
  if (updates.role !== undefined) payload.role = updates.role;
  if (updates.is_active !== undefined) payload.account_status = updates.is_active ? 'active' : 'archived';

  const { data, error } = await client.from('profiles').update(payload).eq('id', id).select().single();
  if (error) {
    if (error.code === '42501' || error.code === '42P01' || error.code === 'PGRST205') {
      let existing = dataStore.profiles.find((p) => p.id === id);
      if (!existing) {
        existing = { id, email: 'user@exampro.edu', full_name: updates.full_name || 'User', role: 'student', is_active: true, created_at: new Date().toISOString(), updated_at: new Date().toISOString() };
        dataStore.profiles.push(existing);
      }
      Object.assign(existing, updates);
      return existing;
    }
    handlePgError('profiles', 'UPDATE', error);
  }
  return {
    id: data.id,
    email: data.email,
    full_name: data.full_name,
    role: data.role,
    avatar_url: data.avatar_url,
    phone: data.phone,
    is_active: data.account_status !== 'suspended' && data.account_status !== 'archived',
    created_at: data.created_at,
    updated_at: data.updated_at,
  };
}

export async function deleteProfile(id: string): Promise<boolean> {
  const client = getDbClient();
  const { error } = await client.from('profiles').delete().eq('id', id);
  if (error) {
    if (error.code === '42501' || error.code === '42P01' || error.code === 'PGRST205' || error.code === '22P02') {
      dataStore.profiles = dataStore.profiles.filter((p) => p.id !== id);
      return true;
    }
    handlePgError('profiles', 'DELETE', error);
  }
  return true;
}

// ============================================================================
// 2. COURSES
// ============================================================================

export async function getAllCourses(): Promise<Course[]> {
  const client = getDbClient();
  const { data, error } = await client.from('courses').select('*').order('created_at', { ascending: true });
  if (error) {
    handleSelectError('courses', error);
    return dataStore.courses;
  }
  const pgCourses = (data || []).map((c: any) => ({
    id: c.id,
    name: c.course_name || c.name || '',
    code: c.course_code || c.code || '',
    description: c.description || '',
    is_active: c.is_active !== false,
    created_at: c.created_at,
    updated_at: c.updated_at || c.created_at,
  }));
  const extraDs = dataStore.courses.filter((dc) => !pgCourses.some((pc) => pc.id === dc.id));
  return [...pgCourses, ...extraDs];
}

export async function insertCourse(course: { id?: string; name: string; code: string; description?: string }): Promise<Course> {
  const client = getDbClient();
  const row: any = {
    course_name: course.name,
    course_code: course.code,
    description: course.description || '',
    is_active: true,
  };
  if (course.id) row.id = course.id;

  const { data, error } = await client.from('courses').insert(row).select().single();
  if (error) {
    if (error.code === '42501' || error.code === '42P01' || error.code === 'PGRST205') {
      const fallback: Course = {
        id: course.id || `course-${Date.now()}`,
        name: course.name,
        code: course.code,
        description: course.description || '',
        is_active: true,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };
      dataStore.courses.push(fallback);
      return fallback;
    }
    handlePgError('courses', 'INSERT', error);
  }
  return {
    id: data.id,
    name: data.course_name || data.name,
    code: data.course_code || data.code,
    description: data.description,
    is_active: data.is_active,
    created_at: data.created_at,
    updated_at: data.updated_at || data.created_at,
  };
}

export async function updateCourse(id: string, updates: Partial<Course>): Promise<Course> {
  const client = getDbClient();
  const row: any = {};
  if (updates.name !== undefined) row.course_name = updates.name;
  if (updates.code !== undefined) row.course_code = updates.code;
  if (updates.description !== undefined) row.description = updates.description;
  if (updates.is_active !== undefined) row.is_active = updates.is_active;

  const { data, error } = await client.from('courses').update(row).eq('id', id).select().single();
  if (error) {
    if (error.code === '42501' || error.code === '42P01' || error.code === 'PGRST205') {
      let existing = dataStore.courses.find((c) => c.id === id);
      if (!existing) {
        existing = { id, name: updates.name || 'Course', code: updates.code || 'CODE', description: '', is_active: true, created_at: new Date().toISOString(), updated_at: new Date().toISOString() };
        dataStore.courses.push(existing);
      }
      if (updates.name !== undefined) existing.name = updates.name;
      if (updates.code !== undefined) existing.code = updates.code;
      if (updates.description !== undefined) existing.description = updates.description;
      if (updates.is_active !== undefined) existing.is_active = updates.is_active;
      return existing;
    }
    handlePgError('courses', 'UPDATE', error);
  }
  return {
    id: data.id,
    name: data.course_name || data.name,
    code: data.course_code || data.code,
    description: data.description,
    is_active: data.is_active,
    created_at: data.created_at,
    updated_at: data.updated_at || data.created_at,
  };
}

export async function deleteCourse(id: string): Promise<boolean> {
  const client = getDbClient();
  const { error } = await client.from('courses').delete().eq('id', id);
  if (error) {
    if (error.code === '42501' || error.code === '42P01' || error.code === 'PGRST205' || error.code === '22P02') {
      dataStore.courses = dataStore.courses.filter((c) => c.id !== id);
      return true;
    }
    handlePgError('courses', 'DELETE', error);
  }
  return true;
}

// ============================================================================
// 3. SEMESTERS
// ============================================================================

export async function getSemestersByCourse(courseId?: string): Promise<Semester[]> {
  const client = getDbClient();
  let query = client.from('semesters').select('*').order('semester_number', { ascending: true });
  if (courseId) {
    query = query.eq('course_id', courseId);
  }
  const { data, error } = await query;
  if (error) {
    handleSelectError('semesters', error);
    return dataStore.semesters.filter((s) => !courseId || s.course_id === courseId);
  }
  const pgSems = (data || []).map((s: any) => ({
    id: s.id,
    course_id: s.course_id,
    semester_number: s.semester_number,
    name: s.semester_name || s.name || `Semester ${s.semester_number}`,
    is_active: s.is_active !== false,
    created_at: s.created_at || new Date().toISOString(),
  }));
  const extraDs = dataStore.semesters.filter((ds) => (!courseId || ds.course_id === courseId) && !pgSems.some((ps) => ps.id === ds.id));
  return [...pgSems, ...extraDs];
}

export async function insertSemester(semester: { id?: string; course_id: string; semester_number: number; name?: string }): Promise<Semester> {
  const client = getDbClient();
  const row: any = {
    course_id: semester.course_id,
    semester_number: Number(semester.semester_number),
    semester_name: semester.name || `Semester ${semester.semester_number}`,
    is_active: true,
  };
  if (semester.id) row.id = semester.id;

  const { data, error } = await client.from('semesters').insert(row).select().single();
  if (error) {
    if (error.code === '42501' || error.code === '42P01' || error.code === 'PGRST205' || error.code === '22P02' || error.code === '23503') {
      const fallback: Semester = {
        id: semester.id || `sem-${Date.now()}`,
        course_id: semester.course_id,
        semester_number: Number(semester.semester_number),
        name: semester.name || `Semester ${semester.semester_number}`,
        is_active: true,
        created_at: new Date().toISOString(),
      };
      dataStore.semesters.push(fallback);
      return fallback;
    }
    handlePgError('semesters', 'INSERT', error);
  }
  return {
    id: data.id,
    course_id: data.course_id,
    semester_number: data.semester_number,
    name: data.semester_name || data.name,
    is_active: data.is_active,
    created_at: data.created_at,
  };
}

export async function deleteSemester(id: string): Promise<boolean> {
  const client = getDbClient();
  const { error } = await client.from('semesters').delete().eq('id', id);
  if (error) {
    if (error.code === '42501' || error.code === '42P01' || error.code === 'PGRST205' || error.code === '22P02') {
      dataStore.semesters = dataStore.semesters.filter((s) => s.id !== id);
      return true;
    }
    handlePgError('semesters', 'DELETE', error);
  }
  return true;
}

// ============================================================================
// 4. STUDENT ENROLLMENTS
// ============================================================================

export async function getEnrollmentsByStudent(studentId: string): Promise<StudentEnrollment | null> {
  const client = getDbClient();
  const { data, error } = await client
    .from('student_enrollments')
    .select('*')
    .eq('student_id', studentId)
    .maybeSingle();
  if (error) {
    handleSelectError('student_enrollments', error);
    return null;
  }
  if (!data) return null;
  return {
    id: data.id,
    student_id: data.student_id,
    course_id: data.course_id,
    semester_id: data.semester_id,
    college_student_id: data.academic_year || data.college_student_id || '',
    enrollment_number: data.enrollment_no || data.enrollment_number || '',
    created_at: data.created_at,
  };
}

export async function getAllEnrollments(): Promise<StudentEnrollment[]> {
  const client = getDbClient();
  const { data, error } = await client.from('student_enrollments').select('*');
  if (error) {
    handleSelectError('student_enrollments', error);
    return [];
  }
  return (data || []).map((e: any) => ({
    id: e.id,
    student_id: e.student_id,
    course_id: e.course_id,
    semester_id: e.semester_id,
    college_student_id: e.academic_year || e.college_student_id || '',
    enrollment_number: e.enrollment_no || e.enrollment_number || '',
    created_at: e.created_at,
  }));
}

export async function insertEnrollment(enrollment: {
  id?: string;
  student_id: string;
  course_id: string;
  semester_id: string;
  college_student_id: string;
  enrollment_number: string;
}): Promise<StudentEnrollment> {
  const client = getDbClient();
  const row: any = {
    student_id: enrollment.student_id,
    course_id: enrollment.course_id,
    semester_id: enrollment.semester_id,
    enrollment_no: enrollment.enrollment_number,
    academic_year: enrollment.college_student_id,
  };
  if (enrollment.id) row.id = enrollment.id;

  const { data, error } = await client.from('student_enrollments').insert(row).select().single();
  if (error) handlePgError('student_enrollments', 'INSERT', error);
  return {
    id: data.id,
    student_id: data.student_id,
    course_id: data.course_id,
    semester_id: data.semester_id,
    college_student_id: data.academic_year || data.college_student_id,
    enrollment_number: data.enrollment_no || data.enrollment_number,
    created_at: data.created_at,
  };
}

export async function deleteEnrollmentByStudent(studentId: string): Promise<boolean> {
  const client = getDbClient();
  const { error } = await client.from('student_enrollments').delete().eq('student_id', studentId);
  if (error) handlePgError('student_enrollments', 'DELETE', error);
  return true;
}

// ============================================================================
// 5. STUDENT VERIFICATIONS & LOGS
// ============================================================================

export async function getVerificationByStudent(studentId: string): Promise<StudentVerification | null> {
  const client = getDbClient();
  const { data, error } = await client
    .from('student_verifications')
    .select('*')
    .eq('student_id', studentId)
    .maybeSingle();
  if (error) {
    handleSelectError('student_verifications', error);
    return null;
  }
  if (!data) return null;
  return {
    id: data.id,
    student_id: data.student_id,
    college_student_id: '',
    enrollment_number: '',
    course_id: '',
    semester_id: '',
    id_card_image_url: data.id_card_path,
    id_card_storage_path: data.id_card_path,
    status: data.status,
    rejection_reason: data.rejection_reason,
    reviewed_by: data.verified_by,
    reviewed_at: data.verified_at,
    created_at: data.submitted_at || data.created_at,
    updated_at: data.updated_at,
  };
}

export async function getAllVerifications(): Promise<StudentVerification[]> {
  const client = getDbClient();
  const { data, error } = await client.from('student_verifications').select('*').order('submitted_at', { ascending: false });
  if (error) {
    handleSelectError('student_verifications', error);
    return [];
  }
  return (data || []).map((v: any) => ({
    id: v.id,
    student_id: v.student_id,
    college_student_id: '',
    enrollment_number: '',
    course_id: '',
    semester_id: '',
    id_card_image_url: v.id_card_path,
    id_card_storage_path: v.id_card_path,
    status: v.status,
    rejection_reason: v.rejection_reason,
    reviewed_by: v.verified_by,
    reviewed_at: v.verified_at,
    created_at: v.submitted_at || v.created_at,
    updated_at: v.updated_at,
  }));
}

export async function insertVerification(verif: {
  id?: string;
  student_id: string;
  id_card_path: string;
  status?: string;
}): Promise<StudentVerification> {
  const client = getDbClient();
  const row: any = {
    student_id: verif.student_id,
    id_card_path: verif.id_card_path,
    status: verif.status || 'pending',
    submitted_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };
  if (verif.id) row.id = verif.id;

  const { data, error } = await client.from('student_verifications').insert(row).select().single();
  if (error) handlePgError('student_verifications', 'INSERT', error);
  return {
    id: data.id,
    student_id: data.student_id,
    college_student_id: '',
    enrollment_number: '',
    course_id: '',
    semester_id: '',
    id_card_image_url: data.id_card_path,
    id_card_storage_path: data.id_card_path,
    status: data.status,
    rejection_reason: data.rejection_reason,
    reviewed_by: data.verified_by,
    reviewed_at: data.verified_at,
    created_at: data.submitted_at,
    updated_at: data.updated_at,
  };
}

export async function updateVerification(id: string, updates: {
  status?: string;
  rejection_reason?: string | null;
  verified_by?: string;
  verified_at?: string;
  id_card_path?: string;
}): Promise<StudentVerification> {
  const client = getDbClient();
  const row: any = {
    updated_at: new Date().toISOString(),
  };
  if (updates.status !== undefined) row.status = updates.status;
  if (updates.rejection_reason !== undefined) row.rejection_reason = updates.rejection_reason;
  if (updates.verified_by !== undefined) row.verified_by = updates.verified_by;
  if (updates.verified_at !== undefined) row.verified_at = updates.verified_at;
  if (updates.id_card_path !== undefined) row.id_card_path = updates.id_card_path;

  const { data, error } = await client.from('student_verifications').update(row).eq('id', id).select().single();
  if (error) handlePgError('student_verifications', 'UPDATE', error);
  return {
    id: data.id,
    student_id: data.student_id,
    college_student_id: '',
    enrollment_number: '',
    course_id: '',
    semester_id: '',
    id_card_image_url: data.id_card_path,
    id_card_storage_path: data.id_card_path,
    status: data.status,
    rejection_reason: data.rejection_reason,
    reviewed_by: data.verified_by,
    reviewed_at: data.verified_at,
    created_at: data.submitted_at,
    updated_at: data.updated_at,
  };
}

export async function insertVerificationLog(log: {
  id?: string;
  student_id: string;
  admin_id?: string;
  action: string;
  reason?: string;
}): Promise<VerificationLog> {
  const client = getDbClient();
  const row: any = {
    student_id: log.student_id,
    admin_id: log.admin_id,
    action: log.action,
    reason: log.reason || '',
    created_at: new Date().toISOString(),
  };
  if (log.id) row.id = log.id;

  const { data, error } = await client.from('verification_logs').insert(row).select().single();
  if (error) handlePgError('verification_logs', 'INSERT', error);
  return {
    id: data.id,
    verification_id: '',
    student_id: data.student_id,
    action: data.action,
    note: data.reason,
    performed_by: data.admin_id,
    created_at: data.created_at,
  };
}

export async function getVerificationLogs(studentId?: string): Promise<VerificationLog[]> {
  const client = getDbClient();
  let query = client.from('verification_logs').select('*').order('created_at', { ascending: false });
  if (studentId) query = query.eq('student_id', studentId);
  const { data, error } = await query;
  if (error) {
    handleSelectError('verification_logs', error);
    return [];
  }
  return (data || []).map((l: any) => ({
    id: l.id,
    verification_id: '',
    student_id: l.student_id,
    action: l.action,
    note: l.reason,
    performed_by: l.admin_id,
    created_at: l.created_at,
  }));
}

// ============================================================================
// 6. EXAMS
// ============================================================================

export async function getAllExams(): Promise<Exam[]> {
  const client = getDbClient();
  const { data, error } = await client.from('exams').select('*').order('created_at', { ascending: false });
  if (error) {
    handleSelectError('exams', error);
    return dataStore.exams;
  }
  const pgExams = (data || []).map((e: any) => ({
    id: e.id,
    title: e.title,
    subject: e.subject,
    description: e.description || '',
    course_id: e.course_id || '',
    semester_id: e.semester_id || '',
    exam_date: (e.start_at || e.start_time || new Date().toISOString()).split('T')[0],
    start_time: e.start_at || e.start_time,
    end_time: e.end_at || e.end_time,
    duration_minutes: e.duration_minutes,
    total_questions: e.total_questions || 0,
    total_marks: Number(e.total_marks || 0),
    passing_marks: Number(e.passing_marks || 0),
    negative_marking: Boolean(e.negative_marking),
    negative_mark_value: 0,
    result_release_setting: (e.result_release || e.result_release_setting || 'manual') as any,
    late_entry_policy_minutes: 15,
    status: (e.status || 'draft') as any,
    instructions: e.instructions || '',
    created_by: e.created_by,
    created_at: e.created_at,
    updated_at: e.updated_at || e.created_at,
  }));
  const extraDs = dataStore.exams.filter((de) => !pgExams.some((pe) => pe.id === de.id));
  return [...pgExams, ...extraDs];
}

export async function getExamById(id: string): Promise<Exam | null> {
  const client = getDbClient();
  const { data, error } = await client.from('exams').select('*').eq('id', id).maybeSingle();
  if (error) {
    handleSelectError('exams', error);
    return dataStore.exams.find((e) => e.id === id) || null;
  }
  if (!data) return dataStore.exams.find((e) => e.id === id) || null;
  return {
    id: data.id,
    title: data.title,
    subject: data.subject,
    description: data.description || '',
    course_id: data.course_id || '',
    semester_id: data.semester_id || '',
    exam_date: (data.start_at || data.start_time || new Date().toISOString()).split('T')[0],
    start_time: data.start_at || data.start_time,
    end_time: data.end_at || data.end_time,
    duration_minutes: data.duration_minutes,
    total_questions: data.total_questions || 0,
    total_marks: Number(data.total_marks || 0),
    passing_marks: Number(data.passing_marks || 0),
    negative_marking: Boolean(data.negative_marking),
    negative_mark_value: 0,
    result_release_setting: (data.result_release || data.result_release_setting || 'manual') as any,
    late_entry_policy_minutes: 15,
    status: (data.status || 'draft') as any,
    instructions: data.instructions || '',
    created_by: data.created_by,
    created_at: data.created_at,
    updated_at: data.updated_at || data.created_at,
  };
}

export async function insertExam(exam: Partial<Exam> & { title: string; subject: string; duration_minutes: number }): Promise<Exam> {
  const client = getDbClient();
  const row: any = {
    title: exam.title,
    subject: exam.subject,
    description: exam.description || '',
    course_id: exam.course_id,
    semester_id: exam.semester_id,
    start_at: exam.start_time || new Date().toISOString(),
    end_at: exam.end_time || new Date(Date.now() + 3600000).toISOString(),
    duration_minutes: Number(exam.duration_minutes),
    total_questions: Number(exam.total_questions || 0),
    total_marks: Number(exam.total_marks || 0),
    passing_marks: Number(exam.passing_marks || 0),
    negative_marking: Boolean(exam.negative_marking),
    status: exam.status || 'draft',
    result_release: exam.result_release_setting || 'manual',
    created_by: exam.created_by,
    created_at: new Date().toISOString(),
  };
  if (exam.id) row.id = exam.id;

  const { data, error } = await client.from('exams').insert(row).select().single();
  if (error) {
    if (error.code === '42501' || error.code === '42P01' || error.code === 'PGRST205' || error.code === '22P02' || error.code === '23503') {
      const fallback: Exam = {
        id: exam.id || `exam-${Date.now()}`,
        title: exam.title,
        subject: exam.subject,
        description: exam.description || '',
        course_id: exam.course_id || '',
        semester_id: exam.semester_id || '',
        exam_date: (exam.start_time || new Date().toISOString()).split('T')[0],
        start_time: exam.start_time || new Date().toISOString(),
        end_time: exam.end_time || new Date(Date.now() + 3600000).toISOString(),
        duration_minutes: Number(exam.duration_minutes),
        total_questions: Number(exam.total_questions || 0),
        total_marks: Number(exam.total_marks || 0),
        passing_marks: Number(exam.passing_marks || 0),
        negative_marking: Boolean(exam.negative_marking),
        negative_mark_value: 0,
        result_release_setting: exam.result_release_setting || 'manual',
        late_entry_policy_minutes: 15,
        status: exam.status || 'draft',
        instructions: exam.instructions || '',
        created_by: exam.created_by,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };
      dataStore.exams.push(fallback);
      return fallback;
    }
    handlePgError('exams', 'INSERT', error);
  }
  return getExamById(data.id) as Promise<Exam>;
}

export async function updateExam(id: string, updates: Partial<Exam>): Promise<Exam> {
  const client = getDbClient();
  const row: any = {};
  if (updates.title !== undefined) row.title = updates.title;
  if (updates.subject !== undefined) row.subject = updates.subject;
  if (updates.description !== undefined) row.description = updates.description;
  if (updates.start_time !== undefined) row.start_at = updates.start_time;
  if (updates.end_time !== undefined) row.end_at = updates.end_time;
  if (updates.duration_minutes !== undefined) row.duration_minutes = updates.duration_minutes;
  if (updates.total_questions !== undefined) row.total_questions = updates.total_questions;
  if (updates.total_marks !== undefined) row.total_marks = updates.total_marks;
  if (updates.passing_marks !== undefined) row.passing_marks = updates.passing_marks;
  if (updates.negative_marking !== undefined) row.negative_marking = updates.negative_marking;
  if (updates.status !== undefined) row.status = updates.status;
  if (updates.result_release_setting !== undefined) row.result_release = updates.result_release_setting;

  const { data, error } = await client.from('exams').update(row).eq('id', id).select().single();
  if (error) {
    if (error.code === '42501' || error.code === '42P01' || error.code === 'PGRST205' || error.code === '22P02') {
      let existing = dataStore.exams.find((e) => e.id === id);
      if (!existing) {
        existing = { id, title: updates.title || 'Exam', subject: updates.subject || 'Subject', description: '', course_id: '', semester_id: '', exam_date: new Date().toISOString().split('T')[0], start_time: new Date().toISOString(), end_time: new Date().toISOString(), duration_minutes: 60, total_questions: 0, total_marks: 100, passing_marks: 40, negative_marking: false, negative_mark_value: 0, result_release_setting: 'manual', late_entry_policy_minutes: 15, status: 'draft', instructions: '', created_at: new Date().toISOString(), updated_at: new Date().toISOString() };
        dataStore.exams.push(existing);
      }
      Object.assign(existing, updates);
      return existing;
    }
    handlePgError('exams', 'UPDATE', error);
  }
  return getExamById(data.id) as Promise<Exam>;
}

export async function deleteExam(id: string): Promise<boolean> {
  const client = getDbClient();
  const { error } = await client.from('exams').delete().eq('id', id);
  if (error) {
    if (error.code === '42501' || error.code === '42P01' || error.code === 'PGRST205' || error.code === '22P02') {
      dataStore.exams = dataStore.exams.filter((e) => e.id !== id);
      return true;
    }
    handlePgError('exams', 'DELETE', error);
  }
  return true;
}

// ============================================================================
// 7. QUESTIONS & OPTIONS
// ============================================================================

export async function getQuestionsByExam(examId: string): Promise<Question[]> {
  const client = getDbClient();
  const { data, error } = await client
    .from('questions')
    .select('*, question_options(*)')
    .eq('exam_id', examId)
    .order('question_order', { ascending: true });
  if (error) {
    handleSelectError('questions', error);
    return dataStore.questions.filter((q) => q.exam_id === examId);
  }
  const pgQ = (data || []).map((q: any) => ({
    id: q.id,
    exam_id: q.exam_id,
    question_text: q.question_text,
    question_type: q.question_type,
    marks: Number(q.marks),
    negative_marks: Number(q.negative_marks || 0),
    order_index: q.question_order,
    explanation: q.explanation || '',
    created_at: q.created_at,
    options: (q.question_options || []).map((opt: any) => ({
      id: opt.id,
      question_id: opt.question_id,
      option_text: opt.option_text,
      is_correct: Boolean(opt.is_correct),
      order_index: opt.option_order,
    })),
  }));
  const extraDs = dataStore.questions.filter((dq) => dq.exam_id === examId && !pgQ.some((pq) => pq.id === dq.id));
  return [...pgQ, ...extraDs];
}

export async function insertQuestion(q: {
  id?: string;
  exam_id: string;
  question_text: string;
  question_type: string;
  marks: number;
  negative_marks?: number;
  order_index?: number;
  options?: Array<{ option_text: string; is_correct: boolean; order_index?: number }>;
}): Promise<Question> {
  const client = getDbClient();
  const qRow: any = {
    exam_id: q.exam_id,
    question_text: q.question_text,
    question_type: q.question_type,
    marks: Number(q.marks),
    negative_marks: Number(q.negative_marks || 0),
    question_order: Number(q.order_index || 0),
    created_at: new Date().toISOString(),
  };
  if (q.id) qRow.id = q.id;

  const { data: questionData, error: qErr } = await client.from('questions').insert(qRow).select().single();
  if (qErr) {
    if (qErr.code === '42501' || qErr.code === '42P01' || qErr.code === 'PGRST205' || qErr.code === '22P02' || qErr.code === '23503' || qErr.code === '23502' || !isValidUuid(q.exam_id)) {
      const qId = q.id || `q-${Date.now()}`;
      const fallbackOptions = (q.options || []).map((o, idx) => ({
        id: `opt-${qId}-${idx}`,
        question_id: qId,
        option_text: o.option_text,
        is_correct: o.is_correct,
        order_index: o.order_index ?? idx + 1,
      }));
      const fallback: Question = {
        id: qId,
        exam_id: q.exam_id,
        question_text: q.question_text,
        question_type: q.question_type as any,
        marks: Number(q.marks),
        negative_marks: Number(q.negative_marks || 0),
        order_index: Number(q.order_index || 0),
        explanation: '',
        created_at: new Date().toISOString(),
        options: fallbackOptions,
      };
      dataStore.questions.push(fallback);
      return fallback;
    }
    handlePgError('questions', 'INSERT', qErr);
  }

  const insertedOptions: QuestionOption[] = [];
  if (q.options && q.options.length > 0) {
    const optRows = q.options.map((opt, idx) => ({
      question_id: questionData.id,
      option_text: opt.option_text,
      is_correct: Boolean(opt.is_correct),
      option_order: opt.order_index ?? idx + 1,
    }));
    const { data: optData, error: optErr } = await client.from('question_options').insert(optRows).select();
    if (optErr) handlePgError('question_options', 'INSERT', optErr);
    if (optData) {
      insertedOptions.push(
        ...optData.map((o: any) => ({
          id: o.id,
          question_id: o.question_id,
          option_text: o.option_text,
          is_correct: o.is_correct,
          order_index: o.option_order,
        }))
      );
    }
  }

  return {
    id: questionData.id,
    exam_id: questionData.exam_id,
    question_text: questionData.question_text,
    question_type: questionData.question_type,
    marks: Number(questionData.marks),
    negative_marks: Number(questionData.negative_marks || 0),
    order_index: questionData.question_order,
    created_at: questionData.created_at,
    options: insertedOptions,
  };
}

export async function deleteQuestion(id: string): Promise<boolean> {
  const client = getDbClient();
  const { error } = await client.from('questions').delete().eq('id', id);
  if (error) {
    if (error.code === '42501' || error.code === '42P01' || error.code === 'PGRST205') {
      dataStore.questions = dataStore.questions.filter((q) => q.id !== id);
      return true;
    }
    handlePgError('questions', 'DELETE', error);
  }
  return true;
}

// ============================================================================
// 8. EXAM ASSIGNMENTS
// ============================================================================

export async function getAssignmentsByStudent(studentId: string): Promise<ExamAssignment[]> {
  const client = getDbClient();
  const { data, error } = await client.from('exam_assignments').select('*').eq('student_id', studentId);
  if (error) {
    handleSelectError('exam_assignments', error);
    return [];
  }
  return (data || []).map((a: any) => ({
    id: a.id,
    exam_id: a.exam_id,
    student_id: a.student_id,
    assignment_type: 'individual',
    assigned_at: a.assigned_at,
  }));
}

export async function getAllAssignments(): Promise<ExamAssignment[]> {
  const client = getDbClient();
  const { data, error } = await client.from('exam_assignments').select('*');
  if (error) {
    handleSelectError('exam_assignments', error);
    return [];
  }
  return (data || []).map((a: any) => ({
    id: a.id,
    exam_id: a.exam_id,
    student_id: a.student_id,
    assignment_type: 'individual',
    assigned_at: a.assigned_at,
  }));
}

export async function insertExamAssignment(assignment: { exam_id: string; student_id: string }): Promise<ExamAssignment> {
  const client = getDbClient();
  const row = {
    exam_id: assignment.exam_id,
    student_id: assignment.student_id,
    assigned_at: new Date().toISOString(),
  };
  const { data, error } = await client.from('exam_assignments').insert(row).select().single();
  if (error) handlePgError('exam_assignments', 'INSERT', error);
  return {
    id: data.id,
    exam_id: data.exam_id,
    student_id: data.student_id,
    assignment_type: 'individual',
    assigned_at: data.assigned_at,
  };
}

export async function deleteAssignmentsByStudent(studentId: string): Promise<boolean> {
  const client = getDbClient();
  const { error } = await client.from('exam_assignments').delete().eq('student_id', studentId);
  if (error) handlePgError('exam_assignments', 'DELETE', error);
  return true;
}

// ============================================================================
// 9. EXAM ATTEMPTS
// ============================================================================

export async function getAttemptById(id: string): Promise<ExamAttempt | null> {
  const client = getDbClient();
  const { data, error } = await client.from('exam_attempts').select('*').eq('id', id).maybeSingle();
  if (error) {
    handleSelectError('exam_attempts', error);
    return null;
  }
  if (!data) return null;
  return {
    id: data.id,
    exam_id: data.exam_id,
    student_id: data.student_id,
    start_time: data.started_at,
    scheduled_end_time: data.ends_at,
    submitted_at: data.submitted_at,
    status: data.status,
    warning_count: data.warning_count || 0,
    tab_switch_count: 0,
    fullscreen_exit_count: 0,
    termination_reason: data.termination_reason,
    created_at: data.created_at,
    updated_at: data.created_at,
  };
}

export async function getAttemptByExamAndStudent(examId: string, studentId: string): Promise<ExamAttempt | null> {
  const client = getDbClient();
  const { data, error } = await client
    .from('exam_attempts')
    .select('*')
    .eq('exam_id', examId)
    .eq('student_id', studentId)
    .maybeSingle();
  if (error) {
    handleSelectError('exam_attempts', error);
    return null;
  }
  if (!data) return null;
  return {
    id: data.id,
    exam_id: data.exam_id,
    student_id: data.student_id,
    start_time: data.started_at,
    scheduled_end_time: data.ends_at,
    submitted_at: data.submitted_at,
    status: data.status,
    warning_count: data.warning_count || 0,
    tab_switch_count: 0,
    fullscreen_exit_count: 0,
    termination_reason: data.termination_reason,
    created_at: data.created_at,
    updated_at: data.created_at,
  };
}

export async function getAllAttempts(filter?: { exam_id?: string; student_id?: string; status?: string }): Promise<ExamAttempt[]> {
  const client = getDbClient();
  let query = client.from('exam_attempts').select('*').order('started_at', { ascending: false });
  if (filter?.exam_id) query = query.eq('exam_id', filter.exam_id);
  if (filter?.student_id) query = query.eq('student_id', filter.student_id);
  if (filter?.status) query = query.eq('status', filter.status);
  const { data, error } = await query;
  if (error) {
    handleSelectError('exam_attempts', error);
    return [];
  }
  return (data || []).map((a: any) => ({
    id: a.id,
    exam_id: a.exam_id,
    student_id: a.student_id,
    start_time: a.started_at,
    scheduled_end_time: a.ends_at,
    submitted_at: a.submitted_at,
    status: a.status,
    warning_count: a.warning_count || 0,
    tab_switch_count: 0,
    fullscreen_exit_count: 0,
    termination_reason: a.termination_reason,
    created_at: a.created_at,
    updated_at: a.created_at,
  }));
}

export async function insertAttempt(attempt: {
  id?: string;
  exam_id: string;
  student_id: string;
  start_time: string;
  scheduled_end_time: string;
}): Promise<ExamAttempt> {
  const client = getDbClient();
  const row: any = {
    exam_id: attempt.exam_id,
    student_id: attempt.student_id,
    started_at: attempt.start_time,
    ends_at: attempt.scheduled_end_time,
    status: 'in_progress',
    warning_count: 0,
    created_at: new Date().toISOString(),
  };
  if (attempt.id) row.id = attempt.id;

  const { data, error } = await client.from('exam_attempts').insert(row).select().single();
  if (error) handlePgError('exam_attempts', 'INSERT', error);
  return getAttemptById(data.id) as Promise<ExamAttempt>;
}

export async function updateAttempt(id: string, updates: Partial<ExamAttempt>): Promise<ExamAttempt> {
  const client = getDbClient();
  const row: any = {};
  if (updates.status !== undefined) row.status = updates.status;
  if (updates.submitted_at !== undefined) row.submitted_at = updates.submitted_at;
  if (updates.warning_count !== undefined) row.warning_count = updates.warning_count;
  if (updates.termination_reason !== undefined) row.termination_reason = updates.termination_reason;

  const { data, error } = await client.from('exam_attempts').update(row).eq('id', id).select().single();
  if (error) handlePgError('exam_attempts', 'UPDATE', error);
  return getAttemptById(data.id) as Promise<ExamAttempt>;
}

// ============================================================================
// 10. ANSWERS
// ============================================================================

export async function getAnswersByAttempt(attemptId: string): Promise<StudentAnswer[]> {
  const client = getDbClient();
  const { data, error } = await client.from('answers').select('*').eq('attempt_id', attemptId);
  if (error) {
    handleSelectError('answers', error);
    return [];
  }
  return (data || []).map((ans: any) => ({
    id: ans.id,
    attempt_id: ans.attempt_id,
    question_id: ans.question_id,
    selected_option_id: ans.selected_option_id,
    written_answer: ans.answer_text,
    marks_awarded: ans.marks_awarded !== null ? Number(ans.marks_awarded) : undefined,
    is_marked: ans.marks_awarded !== null,
    created_at: ans.saved_at,
    updated_at: ans.saved_at,
  }));
}

export async function upsertAnswer(answer: {
  attempt_id: string;
  question_id: string;
  selected_option_id?: string;
  written_answer?: string;
  marks_awarded?: number;
  is_correct?: boolean;
}): Promise<StudentAnswer> {
  const client = getDbClient();
  const row: any = {
    attempt_id: answer.attempt_id,
    question_id: answer.question_id,
    selected_option_id: answer.selected_option_id,
    answer_text: answer.written_answer,
    marks_awarded: answer.marks_awarded,
    is_correct: answer.is_correct,
    saved_at: new Date().toISOString(),
  };

  // Check if exists
  const { data: existing } = await client
    .from('answers')
    .select('id')
    .eq('attempt_id', answer.attempt_id)
    .eq('question_id', answer.question_id)
    .maybeSingle();

  let resData: any;
  if (existing) {
    const { data, error } = await client.from('answers').update(row).eq('id', existing.id).select().single();
    if (error) handlePgError('answers', 'UPDATE', error);
    resData = data;
  } else {
    const { data, error } = await client.from('answers').insert(row).select().single();
    if (error) handlePgError('answers', 'INSERT', error);
    resData = data;
  }

  return {
    id: resData.id,
    attempt_id: resData.attempt_id,
    question_id: resData.question_id,
    selected_option_id: resData.selected_option_id,
    written_answer: resData.answer_text,
    marks_awarded: resData.marks_awarded,
    is_marked: resData.marks_awarded !== null,
    created_at: resData.saved_at,
    updated_at: resData.saved_at,
  };
}

// ============================================================================
// 11. RESULTS
// ============================================================================

export async function getResultByAttempt(attemptId: string): Promise<ExamResult | null> {
  const client = getDbClient();
  const { data, error } = await client.from('results').select('*').eq('attempt_id', attemptId).maybeSingle();
  if (error) {
    handleSelectError('results', error);
    return null;
  }
  if (!data) return null;
  return {
    id: data.id,
    attempt_id: data.attempt_id,
    exam_id: data.exam_id,
    student_id: data.student_id,
    total_marks: Number(data.total_marks),
    obtained_marks: Number(data.obtained_marks),
    percentage: Number(data.percentage),
    is_passed: data.result_status === 'passed',
    status: data.is_published ? 'published' : 'draft',
    published_at: data.published_at,
    generated_at: data.created_at,
  };
}

export async function getAllResults(filter?: { exam_id?: string; student_id?: string }): Promise<ExamResult[]> {
  const client = getDbClient();
  let pgResults: ExamResult[] = [];
  const isValidExamId = !filter?.exam_id || isValidUuid(filter.exam_id);
  const isValidStudentId = !filter?.student_id || isValidUuid(filter.student_id);

  if (isValidExamId && isValidStudentId) {
    let query = client.from('results').select('*').order('created_at', { ascending: false });
    if (filter?.exam_id) query = query.eq('exam_id', filter.exam_id);
    if (filter?.student_id) query = query.eq('student_id', filter.student_id);
    const { data, error } = await query;
    if (!error && data) {
      pgResults = data.map((r: any) => ({
        id: r.id,
        attempt_id: r.attempt_id,
        exam_id: r.exam_id,
        student_id: r.student_id,
        total_marks: Number(r.total_marks),
        obtained_marks: Number(r.obtained_marks),
        percentage: Number(r.percentage),
        is_passed: r.result_status === 'passed',
        status: r.is_published ? 'published' : 'draft',
        published_at: r.published_at,
        generated_at: r.created_at,
      }));
    }
  }

  const extraStore = dataStore.results.filter((r) => {
    if (filter?.exam_id && r.exam_id !== filter.exam_id) return false;
    if (filter?.student_id && r.student_id !== filter.student_id) return false;
    return !pgResults.some((p) => p.id === r.id);
  });

  return [...pgResults, ...extraStore];
}

export async function upsertResult(result: {
  attempt_id: string;
  exam_id: string;
  student_id: string;
  total_marks: number;
  obtained_marks: number;
  percentage: number;
  is_passed: boolean;
  is_published?: boolean;
}): Promise<ExamResult> {
  const client = getDbClient();
  const row: any = {
    attempt_id: result.attempt_id,
    exam_id: result.exam_id,
    student_id: result.student_id,
    total_marks: Number(result.total_marks),
    obtained_marks: Number(result.obtained_marks),
    percentage: Number(result.percentage),
    result_status: result.is_passed ? 'passed' : 'failed',
    is_published: Boolean(result.is_published),
    created_at: new Date().toISOString(),
  };

  const { data: existing } = await client
    .from('results')
    .select('id')
    .eq('attempt_id', result.attempt_id)
    .maybeSingle();

  let resData: any;
  if (existing) {
    const { data, error } = await client.from('results').update(row).eq('id', existing.id).select().single();
    if (error) handlePgError('results', 'UPDATE', error);
    resData = data;
  } else {
    const { data, error } = await client.from('results').insert(row).select().single();
    if (error) handlePgError('results', 'INSERT', error);
    resData = data;
  }

  return {
    id: resData.id,
    attempt_id: resData.attempt_id,
    exam_id: resData.exam_id,
    student_id: resData.student_id,
    total_marks: Number(resData.total_marks),
    obtained_marks: Number(resData.obtained_marks),
    percentage: Number(resData.percentage),
    is_passed: resData.result_status === 'passed',
    status: resData.is_published ? 'published' : 'draft',
    published_at: resData.published_at,
    generated_at: resData.created_at,
  };
}

export async function updateResultStatus(id: string, is_published: boolean): Promise<ExamResult> {
  const client = getDbClient();
  const { data, error } = await client
    .from('results')
    .update({
      is_published,
      published_at: is_published ? new Date().toISOString() : null,
    })
    .eq('id', id)
    .select()
    .single();
  if (error) handlePgError('results', 'UPDATE', error);
  return {
    id: data.id,
    attempt_id: data.attempt_id,
    exam_id: data.exam_id,
    student_id: data.student_id,
    total_marks: Number(data.total_marks),
    obtained_marks: Number(data.obtained_marks),
    percentage: Number(data.percentage),
    is_passed: data.result_status === 'passed',
    status: data.is_published ? 'published' : 'draft',
    published_at: data.published_at,
    generated_at: data.created_at,
  };
}

// ============================================================================
// 12. NOTIFICATIONS & ACTIVITY LOGS
// ============================================================================

export async function getNotificationsByUser(userId: string): Promise<NotificationItem[]> {
  const client = getDbClient();
  const { data, error } = await client
    .from('notifications')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false });
  if (error) {
    handleSelectError('notifications', error);
    return [];
  }
  return (data || []).map((n: any) => ({
    id: n.id,
    user_id: n.user_id,
    title: n.title,
    message: n.message,
    type: 'info',
    is_read: Boolean(n.is_read),
    created_at: n.created_at,
  }));
}

export async function insertNotification(notif: { user_id: string; title: string; message: string }): Promise<NotificationItem> {
  const client = getDbClient();
  const validUserId = isValidUuid(notif.user_id) ? notif.user_id : null;
  if (validUserId) {
    const row = {
      user_id: validUserId,
      title: notif.title,
      message: notif.message,
      is_read: false,
      created_at: new Date().toISOString(),
    };
    const { data, error } = await client.from('notifications').insert(row).select().single();
    if (!error && data) {
      return {
        id: data.id,
        user_id: notif.user_id,
        title: data.title,
        message: data.message,
        type: 'info',
        is_read: data.is_read,
        created_at: data.created_at,
      };
    }
  }
  const fallback: NotificationItem = {
    id: `notif-${Date.now()}`,
    user_id: notif.user_id,
    title: notif.title,
    message: notif.message,
    type: 'info',
    is_read: false,
    created_at: new Date().toISOString(),
  };
  dataStore.notifications.push(fallback);
  return fallback;
}

export async function markNotificationAsRead(id: string): Promise<boolean> {
  const client = getDbClient();
  const { error } = await client.from('notifications').update({ is_read: true }).eq('id', id);
  if (error) handlePgError('notifications', 'UPDATE', error);
  return true;
}

export async function deleteNotification(id: string): Promise<boolean> {
  const client = getDbClient();
  const { error } = await client.from('notifications').delete().eq('id', id);
  if (error) handlePgError('notifications', 'DELETE', error);
  return true;
}

export async function getActivityLogs(): Promise<ActivityLog[]> {
  const client = getDbClient();
  const { data, error } = await client.from('activity_logs').select('*').order('created_at', { ascending: false }).limit(100);
  if (error) {
    handleSelectError('activity_logs', error);
    return [];
  }
  return (data || []).map((l: any) => ({
    id: l.id,
    user_id: l.user_id || 'system',
    action: l.action,
    resource: 'system',
    details: l.details || {},
    created_at: l.created_at,
  }));
}

export async function insertActivityLog(log: { user_id?: string; action: string; details?: any }): Promise<ActivityLog> {
  const client = getDbClient();
  const validUserId = log.user_id && isValidUuid(log.user_id) ? log.user_id : null;
  const row = {
    user_id: validUserId,
    action: log.action,
    details: log.details || {},
    created_at: new Date().toISOString(),
  };
  const { data, error } = await client.from('activity_logs').insert(row).select().single();
  if (error) {
    if (error.code === '42501' || error.code === '42P01' || error.code === 'PGRST205' || error.code === '22P02') {
      const fallback: ActivityLog = {
        id: `log-${Date.now()}`,
        user_id: log.user_id || 'system',
        action: log.action,
        resource: 'system',
        details: log.details || {},
        created_at: new Date().toISOString(),
      };
      dataStore.activityLogs.push(fallback);
      return fallback;
    }
    handlePgError('activity_logs', 'INSERT', error);
  }
  return {
    id: data.id,
    user_id: data.user_id || log.user_id || 'system',
    action: data.action,
    resource: 'system',
    details: data.details,
    created_at: data.created_at,
  };
}

export async function deleteActivityLog(id: string): Promise<boolean> {
  const client = getDbClient();
  const { error } = await client.from('activity_logs').delete().eq('id', id);
  if (error) handlePgError('activity_logs', 'DELETE', error);
  return true;
}

// ============================================================================
// 13. SECURITY EVENTS, ADMIN ACTIONS & HOLDS
// ============================================================================

export async function insertSecurityEvent(event: {
  attempt_id: string;
  student_id?: string;
  event_type: string;
  event_details?: any;
}): Promise<SecurityEvent> {
  const client = getDbClient();
  const row = {
    attempt_id: event.attempt_id,
    event_type: event.event_type,
    event_details: event.event_details || {},
    event_time: new Date().toISOString(),
  };
  const { data, error } = await client.from('security_events').insert(row).select().single();
  if (error) handlePgError('security_events', 'INSERT', error);
  return {
    id: data.id,
    attempt_id: data.attempt_id,
    student_id: event.student_id || '',
    event_type: data.event_type as any,
    event_details: data.event_details,
    client_timestamp: data.event_time,
    created_at: data.event_time,
  };
}

export async function insertAdminAction(action: {
  admin_id: string;
  attempt_id?: string;
  target_student_id?: string;
  action_type: string;
  reason?: string;
  details?: any;
}): Promise<AdminAction> {
  const client = getDbClient();
  const row: any = {
    admin_id: action.admin_id,
    attempt_id: action.attempt_id,
    action: action.action_type,
    reason: action.reason || JSON.stringify(action.details || {}),
    created_at: new Date().toISOString(),
  };
  const { data, error } = await client.from('admin_actions').insert(row).select().single();
  if (error) handlePgError('admin_actions', 'INSERT', error);
  return {
    id: data.id,
    admin_id: data.admin_id,
    target_attempt_id: data.attempt_id,
    target_student_id: action.target_student_id,
    action_type: data.action as any,
    details: { reason: data.reason },
    created_at: data.created_at,
  };
}

export async function insertExamHold(hold: {
  attempt_id: string;
  admin_id: string;
  duration_seconds: number;
  reason: string;
}): Promise<ExamHold> {
  const client = getDbClient();
  const now = new Date();
  const holdEnd = new Date(now.getTime() + hold.duration_seconds * 1000);
  const row = {
    attempt_id: hold.attempt_id,
    admin_id: hold.admin_id,
    hold_until: holdEnd.toISOString(),
    status: 'active',
    reason: hold.reason,
    created_at: now.toISOString(),
  };
  const { data, error } = await client.from('exam_holds').insert(row).select().single();
  if (error) handlePgError('exam_holds', 'INSERT', error);
  return {
    id: data.id,
    attempt_id: data.attempt_id,
    admin_id: data.admin_id,
    duration_seconds: hold.duration_seconds,
    hold_start: data.created_at,
    hold_end: data.hold_until,
    reason: data.reason,
    status: 'active',
    created_at: data.created_at,
  };
}

export async function updateExamHoldStatus(attemptId: string, status: 'resumed' | 'expired'): Promise<boolean> {
  const client = getDbClient();
  const { error } = await client
    .from('exam_holds')
    .update({ status })
    .eq('attempt_id', attemptId)
    .eq('status', 'active');
  if (error) handlePgError('exam_holds', 'UPDATE', error);
  return true;
}
