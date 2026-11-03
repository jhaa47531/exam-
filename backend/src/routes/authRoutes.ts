import { Router } from 'express';
import { authController } from '../controllers/authController';
import { authenticateToken } from '../middleware/auth';

const router = Router();

// General & legacy login route
router.post('/login', (req, res) => authController.login(req, res));

// Dedicated Admin Login
router.post('/admin/login', (req, res) => authController.adminLogin(req, res));

// Dedicated Student Login
router.post('/student/login', (req, res) => authController.studentLogin(req, res));

// Database connectivity status
router.get('/status', (req, res) => authController.getDbStatus(req, res));

// Session & profile
router.post('/logout', (req, res) => authController.logout(req, res));
router.get('/me', authenticateToken, (req, res) => authController.getMe(req, res));

export default router;
