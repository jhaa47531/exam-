import type {
  UserProfile,
  Course,
  Semester,
  StudentVerification,
  Exam,
  Question,
  ExamAttempt,
  StudentAnswer,
  ExamResult,
  NotificationItem,
} from '../types';

const TOKEN_KEY = 'exampro_token';

export const tokenStorage = {
  get: () => localStorage.getItem(TOKEN_KEY),
  set: (token: string) => localStorage.setItem(TOKEN_KEY, token),
  clear: () => localStorage.removeItem(TOKEN_KEY),
};

async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
  const token = tokenStorage.get();
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options.headers as Record<string, string>),
  };

  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const response = await fetch(path, {
    ...options,
    headers,
  });

  const contentType = response.headers.get('content-type');
  let data: any = null;
  if (contentType && contentType.includes('application/json')) {
    data = await response.json();
  } else {
    data = await response.text();
  }

  if (!response.ok) {
    const errorMsg = data?.error || data?.message || `Request failed with status ${response.status}`;
    const err = new Error(errorMsg) as any;
    err.status = response.status;
    err.code = data?.code;
    err.data = data;
    throw err;
  }

  return data as T;
}

export const api = {
  // Auth
  auth: {
    login: (credentials: { email?: string; identifier?: string; password: string }) =>
      request<{ user: UserProfile; token: string; verification?: StudentVerification; enrollment?: any }>('/api/auth/login', {
        method: 'POST',
        body: JSON.stringify(credentials),
      }),
    adminLogin: (credentials: { identifier: string; password: string }) =>
      request<{ user: UserProfile; token: string }>('/api/auth/admin/login', {
        method: 'POST',
        body: JSON.stringify(credentials),
      }),
    studentLogin: (credentials: { identifier: string; password: string }) =>
      request<{ user: UserProfile; token: string; verification?: StudentVerification; enrollment?: any }>('/api/auth/student/login', {
        method: 'POST',
        body: JSON.stringify(credentials),
      }),
    logout: () =>
      request<{ success: boolean }>('/api/auth/logout', { method: 'POST' }),
    me: () =>
      request<{ user: UserProfile; verification?: StudentVerification; enrollment?: any }>('/api/auth/me'),
    getDbStatus: () =>
      request<{ connected: boolean; message: string; timestamp: string }>('/api/database/status'),
  },

  // Student
  student: {
    register: (formData: any) =>
      request<{ user: UserProfile; token: string; verification: StudentVerification }>('/api/students/register', {
        method: 'POST',
        body: JSON.stringify(formData),
      }),
    getProfile: () =>
      request<any>('/api/students/profile'),
    updateProfile: (data: Partial<UserProfile>) =>
      request<{ success: boolean; profile: UserProfile }>('/api/students/profile', {
        method: 'PUT',
        body: JSON.stringify(data),
      }),
    getVerificationStatus: () =>
      request<{ status: string; verification: StudentVerification; logs: any[] }>('/api/students/verification-status'),
    resubmitVerification: (payload: any) =>
      request<{ success: boolean; verification: StudentVerification }>('/api/students/verification/resubmit', {
        method: 'POST',
        body: JSON.stringify(payload),
      }),
    getExams: () =>
      request<{ exams: Exam[] }>('/api/students/exams'),
    getResults: () =>
      request<{ results: ExamResult[] }>('/api/students/results'),
    getNotifications: () =>
      request<{ notifications: NotificationItem[] }>('/api/students/notifications'),
    markNotificationRead: (id: string) =>
      request<{ success: boolean }>(`/api/students/notifications/${id}/read`, { method: 'PUT' }),
    deleteNotification: (id: string) =>
      request<{ success: boolean }>(`/api/students/notifications/${id}`, { method: 'DELETE' }),
  },

  // Exam taking
  exam: {
    start: (examId: string) =>
      request<{ attempt: ExamAttempt; exam: Exam; questions: Question[]; answers: StudentAnswer[] }>(
        `/api/exams/${examId}/start`,
        { method: 'POST' }
      ),
    getAttempt: (attemptId: string) =>
      request<{
        attempt: ExamAttempt;
        exam: Exam;
        questions: Question[];
        answers: StudentAnswer[];
        remainingSeconds: number;
      }>(`/api/attempts/${attemptId}`),
    saveAnswers: (attemptId: string, answers: Array<{ question_id: string; selected_option_id?: string; written_answer?: string }>) =>
      request<{ success: boolean; savedCount: number }>(`/api/attempts/${attemptId}/answers`, {
        method: 'PUT',
        body: JSON.stringify({ answers }),
      }),
    submit: (attemptId: string) =>
      request<{ success: boolean; attempt: ExamAttempt; result?: ExamResult; scoreSummary?: any }>(
        `/api/attempts/${attemptId}/submit`,
        { method: 'POST' }
      ),
    recordSecurityEvent: (attemptId: string, eventType: string, eventDetails?: any) =>
      request<{ success: boolean; event: any }>(`/api/attempts/${attemptId}/security-event`, {
        method: 'POST',
        body: JSON.stringify({ event_type: eventType, event_details: eventDetails }),
      }),
  },

  // Admin
  admin: {
    getDashboard: () =>
      request<any>('/api/admin/dashboard'),
    getStudents: () =>
      request<{ students: any[] }>('/api/admin/students'),
    getVerifications: () =>
      request<{ verifications: StudentVerification[] }>('/api/admin/verifications'),
    approveVerification: (id: string) =>
      request<{ success: boolean; verification: StudentVerification }>(`/api/admin/verifications/${id}/approve`, {
        method: 'POST',
      }),
    rejectVerification: (id: string, reason: string) =>
      request<{ success: boolean; verification: StudentVerification }>(`/api/admin/verifications/${id}/reject`, {
        method: 'POST',
        body: JSON.stringify({ reason }),
      }),
    // Courses
    getCourses: () =>
      request<{ courses: Course[] }>('/api/admin/courses'),
    createCourse: (data: Partial<Course>) =>
      request<{ success: boolean; course: Course }>('/api/admin/courses', {
        method: 'POST',
        body: JSON.stringify(data),
      }),
    updateCourse: (id: string, data: Partial<Course>) =>
      request<{ success: boolean; course: Course }>(`/api/admin/courses/${id}`, {
        method: 'PUT',
        body: JSON.stringify(data),
      }),
    deleteCourse: (id: string) =>
      request<{ success: boolean }>(`/api/admin/courses/${id}`, { method: 'DELETE' }),
    // Semesters
    getSemesters: (courseId?: string) =>
      request<{ semesters: Semester[] }>(`/api/admin/semesters${courseId ? `?course_id=${courseId}` : ''}`),
    createSemester: (data: Partial<Semester>) =>
      request<{ success: boolean; semester: Semester }>('/api/admin/semesters', {
        method: 'POST',
        body: JSON.stringify(data),
      }),
    // Exams
    getExams: () =>
      request<{ exams: Exam[] }>('/api/admin/exams'),
    createExam: (data: any) =>
      request<{ success: boolean; exam: Exam }>('/api/admin/exams', {
        method: 'POST',
        body: JSON.stringify(data),
      }),
    updateExam: (id: string, data: any) =>
      request<{ success: boolean; exam: Exam }>(`/api/admin/exams/${id}`, {
        method: 'PUT',
        body: JSON.stringify(data),
      }),
    deleteExam: (id: string) =>
      request<{ success: boolean }>(`/api/admin/exams/${id}`, { method: 'DELETE' }),
    assignExam: (id: string, payload: { student_ids: string[]; assignment_type?: string }) =>
      request<{ success: boolean; newlyAssignedCount: number }>(`/api/admin/exams/${id}/assign`, {
        method: 'POST',
        body: JSON.stringify(payload),
      }),
    // Questions
    getQuestions: (examId: string) =>
      request<{ questions: Question[] }>(`/api/admin/questions?exam_id=${examId}`),
    createQuestion: (data: any) =>
      request<{ success: boolean; question: Question; exam_summary: any }>('/api/admin/questions', {
        method: 'POST',
        body: JSON.stringify(data),
      }),
    deleteQuestion: (id: string) =>
      request<{ success: boolean }>(`/api/admin/questions/${id}`, { method: 'DELETE' }),
    // Live Monitoring
    getMonitoring: () =>
      request<{ attempts: ExamAttempt[] }>('/api/admin/monitoring'),
    sendWarning: (attemptId: string, message: string) =>
      request<{ success: boolean; attempt: ExamAttempt }>(`/api/admin/attempts/${attemptId}/warning`, {
        method: 'POST',
        body: JSON.stringify({ message }),
      }),
    holdAttempt: (attemptId: string, durationSeconds: number, reason: string) =>
      request<{ success: boolean; hold: any; attempt: ExamAttempt }>(`/api/admin/attempts/${attemptId}/hold`, {
        method: 'POST',
        body: JSON.stringify({ durationSeconds, reason }),
      }),
    resumeAttempt: (attemptId: string) =>
      request<{ success: boolean; attempt: ExamAttempt }>(`/api/admin/attempts/${attemptId}/resume`, {
        method: 'POST',
      }),
    terminateAttempt: (attemptId: string, reason: string) =>
      request<{ success: boolean; attempt: ExamAttempt }>(`/api/admin/attempts/${attemptId}/terminate`, {
        method: 'POST',
        body: JSON.stringify({ reason }),
      }),
    // Results
    getResults: () =>
      request<{ results: ExamResult[] }>('/api/admin/results'),
    publishResult: (resultId: string) =>
      request<{ success: boolean; result: ExamResult }>(`/api/admin/results/${resultId}/publish`, {
        method: 'POST',
      }),
    gradeWrittenAnswer: (attemptId: string, questionId: string, payload: { marks_awarded: number; feedback?: string }) =>
      request<{ success: boolean; answer: any; result: ExamResult }>(
        `/api/admin/results/${attemptId}/questions/${questionId}/grade`,
        {
          method: 'POST',
          body: JSON.stringify(payload),
        }
      ),
    // Activity Logs
    getActivityLogs: () =>
      request<{ logs: any[] }>('/api/admin/activity-logs'),
  },

  // Upload
  upload: {
    idCard: (image_base64: string, filename?: string) =>
      request<{ success: boolean; url: string; path: string }>('/api/upload/id-card', {
        method: 'POST',
        body: JSON.stringify({ image_base64, filename }),
      }),
  },
};
