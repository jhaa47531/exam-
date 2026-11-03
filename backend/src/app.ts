import express, { Express } from 'express';
import authRoutes from './routes/authRoutes';
import studentRoutes from './routes/studentRoutes';
import adminRoutes from './routes/adminRoutes';
import examRoutes from './routes/examRoutes';
import { authenticateToken } from './middleware/auth';

export function createApp(): Express {
  const app = express();

  // Middleware
  app.use(express.json({ limit: '10mb' }));
  app.use(express.urlencoded({ extended: true, limit: '10mb' }));

  // API Routes
  app.use('/api/auth', authRoutes);
  app.use('/api/students', studentRoutes);
  app.use('/api/admin', adminRoutes);
  app.use('/api', examRoutes);

  // Storage / ID Card upload endpoint
  app.post('/api/upload/id-card', authenticateToken, (req: any, res) => {
    const { image_base64, filename } = req.body;
    if (!image_base64) {
      res.status(400).json({ error: 'No image data provided' });
      return;
    }

    const path = `${req.user?.id || 'guest'}/${filename || `id_${Date.now()}.png`}`;
    // Return image URL / data URI for viewing
    res.json({
      success: true,
      url: image_base64,
      path,
    });
  });

  // System & Database Health Check
  app.get('/api/health', async (_req, res) => {
    const { testDatabaseConnection } = await import('./config/supabase');
    const dbStatus = await testDatabaseConnection();
    res.json({
      status: 'ok',
      service: 'ExamPro API Engine',
      database: dbStatus,
      timestamp: new Date().toISOString(),
      version: '1.0.0',
    });
  });

  app.get('/api/system/status', async (_req, res) => {
    const { testDatabaseConnection } = await import('./config/supabase');
    const dbStatus = await testDatabaseConnection();
    res.json({
      status: dbStatus.connected ? 'online' : 'disconnected',
      database: dbStatus,
      timestamp: new Date().toISOString(),
    });
  });

  app.get('/api/database/status', async (_req, res) => {
    const { testDatabaseConnection } = await import('./config/supabase');
    const dbStatus = await testDatabaseConnection();
    res.json(dbStatus);
  });

  return app;
}
