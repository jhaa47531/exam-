import { Router } from 'express';
import { examController } from '../controllers/examController';
import { authenticateToken, requireStudent, requireVerifiedStudent } from '../middleware/auth';

const router = Router();

// Student starting exam (Requires verified student status)
router.post('/exams/:id/start', authenticateToken, requireStudent, requireVerifiedStudent, (req, res) =>
  examController.startExam(req, res)
);

// Active attempt interactions
router.get('/attempts/:id', authenticateToken, (req, res) =>
  examController.getAttempt(req, res)
);

router.put('/attempts/:id/answers', authenticateToken, requireStudent, (req, res) =>
  examController.saveAnswers(req, res)
);

router.post('/attempts/:id/submit', authenticateToken, requireStudent, (req, res) =>
  examController.submitExam(req, res)
);

router.post('/attempts/:id/security-event', authenticateToken, requireStudent, (req, res) =>
  examController.recordSecurityEvent(req, res)
);

router.get('/attempts/:id/stream', authenticateToken, (req, res) =>
  examController.streamAttempt(req, res)
);

export default router;
