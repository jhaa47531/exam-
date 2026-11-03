import { Router } from 'express';
import { studentController } from '../controllers/studentController';
import { authenticateToken, requireStudent, requireVerifiedStudent } from '../middleware/auth';

const router = Router();

// Public registration endpoint
router.post('/register', (req, res) => studentController.register(req, res));

// Authenticated student routes
router.get('/profile', authenticateToken, requireStudent, (req, res) =>
  studentController.getProfile(req, res)
);
router.put('/profile', authenticateToken, requireStudent, (req, res) =>
  studentController.updateProfile(req, res)
);
router.get('/verification-status', authenticateToken, requireStudent, (req, res) =>
  studentController.getVerificationStatus(req, res)
);
router.post('/verification/resubmit', authenticateToken, requireStudent, (req, res) =>
  studentController.resubmitVerification(req, res)
);

// Verified student only routes (cannot access exams or results if verification is pending/rejected)
router.get('/exams', authenticateToken, requireStudent, requireVerifiedStudent, (req, res) =>
  studentController.getExams(req, res)
);
router.get('/results', authenticateToken, requireStudent, requireVerifiedStudent, (req, res) =>
  studentController.getResults(req, res)
);
router.get('/notifications', authenticateToken, requireStudent, (req, res) =>
  studentController.getNotifications(req, res)
);
router.put('/notifications/:id/read', authenticateToken, requireStudent, (req, res) =>
  studentController.markNotificationRead(req, res)
);

export default router;
