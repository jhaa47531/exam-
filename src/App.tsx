import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';

// Layouts
import { AuthLayout } from './layouts/AuthLayout';
import { AdminLayout } from './layouts/AdminLayout';
import { StudentLayout } from './layouts/StudentLayout';

// Auth Pages
import { PortalSelect } from './pages/auth/PortalSelect';
import { AdminLogin } from './pages/auth/AdminLogin';
import { StudentLogin } from './pages/auth/StudentLogin';
import { Register } from './pages/auth/Register';
import { ForgotPassword } from './pages/auth/ForgotPassword';

// Student Pages
import { StudentDashboard } from './pages/student/StudentDashboard';
import { AvailableExams } from './pages/student/AvailableExams';
import { ExamInterface } from './pages/student/ExamInterface';
import { ExamResultView } from './pages/student/ExamResultView';
import { StudentProfile } from './pages/student/StudentProfile';
import { StudentNotifications } from './pages/student/StudentNotifications';

// Admin Pages
import { AdminDashboard } from './pages/admin/AdminDashboard';
import { StudentVerification } from './pages/admin/StudentVerification';
import { StudentManagement } from './pages/admin/StudentManagement';
import { CourseManagement } from './pages/admin/CourseManagement';
import { SemesterManagement } from './pages/admin/SemesterManagement';
import { ExamManagement } from './pages/admin/ExamManagement';
import { QuestionManagement } from './pages/admin/QuestionManagement';
import { ExamAssignments } from './pages/admin/ExamAssignments';
import { LiveMonitoring } from './pages/admin/LiveMonitoring';
import { ResultsManagement } from './pages/admin/ResultsManagement';
import { ReportsAnalytics } from './pages/admin/ReportsAnalytics';
import { ActivityLogs } from './pages/admin/ActivityLogs';
import { AdminSettings } from './pages/admin/AdminSettings';
import { FacultyManagement } from './pages/admin/FacultyManagement';
import { SubjectManagement } from './pages/admin/SubjectManagement';

// Route Guards
const RootRedirect: React.FC = () => {
  const { user, isLoading } = useAuth();
  if (isLoading) return null;
  if (!user) return <Navigate to="/auth" replace />;
  const role = String(user.role || '').toLowerCase();
  return role === 'admin' ? (
    <Navigate to="/admin/dashboard" replace />
  ) : (
    <Navigate to="/student/dashboard" replace />
  );
};

const AdminRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user, isLoading } = useAuth();
  if (isLoading) return null;
  if (!user) return <Navigate to="/auth/admin-login" replace />;
  const role = String(user.role || '').toLowerCase();
  if (role !== 'admin') return <Navigate to="/student/dashboard" replace />;
  return <>{children}</>;
};

const StudentRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user, isLoading } = useAuth();
  if (isLoading) return null;
  if (!user) return <Navigate to="/auth/student-login" replace />;
  const role = String(user.role || '').toLowerCase();
  if (role !== 'student') return <Navigate to="/admin/dashboard" replace />;
  return <>{children}</>;
};

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          {/* Root Redirect */}
          <Route path="/" element={<RootRedirect />} />

          {/* Authentication Routes */}
          <Route path="/auth" element={<AuthLayout />}>
            <Route index element={<PortalSelect />} />
            <Route path="admin-login" element={<AdminLogin />} />
            <Route path="student-login" element={<StudentLogin />} />
            <Route path="login" element={<Navigate to="/auth" replace />} />
            <Route path="register" element={<Register />} />
            <Route path="forgot-password" element={<ForgotPassword />} />
          </Route>

          {/* Dedicated Fullscreen Proctored Exam Station */}
          <Route
            path="/student/exam/:id"
            element={
              <StudentRoute>
                <ExamInterface />
              </StudentRoute>
            }
          />

          {/* Student Portal Routes */}
          <Route
            path="/student"
            element={
              <StudentRoute>
                <StudentLayout />
              </StudentRoute>
            }
          >
            <Route index element={<Navigate to="/student/dashboard" replace />} />
            <Route path="dashboard" element={<StudentDashboard />} />
            <Route path="available-exams" element={<AvailableExams />} />
            <Route path="upcoming-exams" element={<AvailableExams />} />
            <Route path="history" element={<StudentDashboard />} />
            <Route path="results" element={<StudentDashboard />} />
            <Route path="results/:examId" element={<ExamResultView />} />
            <Route path="profile" element={<StudentProfile />} />
            <Route path="notifications" element={<StudentNotifications />} />
          </Route>

          {/* Admin Station Routes */}
          <Route
            path="/admin"
            element={
              <AdminRoute>
                <AdminLayout />
              </AdminRoute>
            }
          >
            <Route index element={<Navigate to="/admin/dashboard" replace />} />
            <Route path="dashboard" element={<AdminDashboard />} />
            <Route path="verifications" element={<StudentVerification />} />
            <Route path="students" element={<StudentManagement />} />
            <Route path="faculty" element={<FacultyManagement />} />
            <Route path="courses" element={<CourseManagement />} />
            <Route path="semesters" element={<SemesterManagement />} />
            <Route path="subjects" element={<SubjectManagement />} />
            <Route path="exams" element={<ExamManagement />} />
            <Route path="questions" element={<QuestionManagement />} />
            <Route path="assignments" element={<ExamAssignments />} />
            <Route path="monitoring" element={<LiveMonitoring />} />
            <Route path="results" element={<ResultsManagement />} />
            <Route path="reports" element={<ReportsAnalytics />} />
            <Route path="activity-logs" element={<ActivityLogs />} />
            <Route path="settings" element={<AdminSettings />} />
          </Route>

          {/* Catch-all */}
          <Route path="*" element={<RootRedirect />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}
