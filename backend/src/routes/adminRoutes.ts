import { Router } from 'express';
import { adminController } from '../controllers/adminController';
import { authenticateToken, requireAdmin } from '../middleware/auth';
import { monitoringService } from '../services/monitoringService';

const router = Router();

// Public course & semester listings (needed for candidate registration and course selection)
router.get('/courses', (req, res) => adminController.getCourses(req, res));
router.get('/semesters', (req, res) => adminController.getSemesters(req, res));

// All mutating admin routes and sensitive operations require valid authentication and admin role
router.use(authenticateToken, requireAdmin);

// Dashboard
router.get('/dashboard', (req, res) => adminController.getDashboardStats(req, res));

// Students & Verifications
router.get('/students', (req, res) => adminController.getStudents(req, res));
router.delete('/students/:id', (req, res) => adminController.deleteStudent(req, res));
router.get('/verifications', (req, res) => adminController.getVerifications(req, res));
router.post('/verifications/:id/approve', (req, res) => adminController.approveVerification(req, res));
router.post('/verifications/:id/reject', (req, res) => adminController.rejectVerification(req, res));

// Faculty Management
router.get('/faculty', (req, res) => adminController.getFaculty(req, res));
router.post('/faculty', (req, res) => adminController.createFaculty(req, res));
router.delete('/faculty/:id', (req, res) => adminController.deleteFaculty(req, res));

// Course & Semester Management (Mutations)
router.post('/courses', (req, res) => adminController.createCourse(req, res));
router.put('/courses/:id', (req, res) => adminController.updateCourse(req, res));
router.delete('/courses/:id', (req, res) => adminController.deleteCourse(req, res));

router.post('/semesters', (req, res) => adminController.createSemester(req, res));
router.delete('/semesters/:id', (req, res) => adminController.deleteSemester(req, res));

// Subject Catalog Management
router.get('/subjects', (req, res) => adminController.getSubjects(req, res));
router.post('/subjects', (req, res) => adminController.createSubject(req, res));
router.delete('/subjects/:id', (req, res) => adminController.deleteSubject(req, res));

// Exams
router.get('/exams', (req, res) => adminController.getExams(req, res));
router.post('/exams', (req, res) => adminController.createExam(req, res));
router.put('/exams/:id', (req, res) => adminController.updateExam(req, res));
router.delete('/exams/:id', (req, res) => adminController.deleteExam(req, res));
router.post('/exams/:id/assign', (req, res) => adminController.assignExam(req, res));

// Questions
router.get('/questions', (req, res) => adminController.getQuestions(req, res));
router.post('/questions', (req, res) => adminController.createQuestion(req, res));
router.delete('/questions/:id', (req, res) => adminController.deleteQuestion(req, res));

// Live Monitoring & Anti-cheating Proctor Actions
router.get('/monitoring', (req, res) => adminController.getLiveMonitoring(req, res));
router.get('/monitoring/stream', (req, res) => {
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  res.flushHeaders();

  monitoringService.addClient({
    id: `admin-${Date.now()}`,
    res,
    role: 'admin',
  });
  res.write(`event: connected\ndata: ${JSON.stringify({ status: 'connected' })}\n\n`);
});

router.post('/attempts/:id/warning', (req, res) => adminController.sendWarning(req, res));
router.post('/attempts/:id/hold', (req, res) => adminController.holdAttempt(req, res));
router.post('/attempts/:id/resume', (req, res) => adminController.resumeAttempt(req, res));
router.post('/attempts/:id/terminate', (req, res) => adminController.terminateAttempt(req, res));

// Results & Manual Evaluation
router.get('/results', (req, res) => adminController.getResults(req, res));
router.post('/results/:id/publish', (req, res) => adminController.publishResult(req, res));
router.post('/results/:attempt_id/questions/:question_id/grade', (req, res) =>
  adminController.gradeWrittenAnswer(req, res)
);

// Audit Activity Logs & Notifications
router.get('/activity-logs', (req, res) => adminController.getActivityLogs(req, res));
router.delete('/activity-logs', (req, res) => adminController.clearActivityLogs(req, res));
router.delete('/activity-logs/:id', (req, res) => adminController.deleteActivityLog(req, res));
router.delete('/notifications/:id', (req, res) => adminController.deleteNotification(req, res));

export default router;
