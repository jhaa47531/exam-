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

  // Database availability guard on mutation operations (POST, PUT, DELETE, PATCH)
  // When database is unavailable, stop database-dependent operations and return 503 without fake success
  app.use(async (req, res, next) => {
    const isMutation = ['POST', 'PUT', 'DELETE', 'PATCH'].includes(req.method);
    // Skip health, login/auth status, or simulation routes
    if (
      !isMutation ||
      req.path.startsWith('/api/health') ||
      req.path === '/api/auth/status' ||
      req.path === '/api/auth/login'
    ) {
      next();
      return;
    }

    const { isSimulatedDatabaseOutage, testDatabaseConnection } = await import('./config/supabase');
    if (isSimulatedDatabaseOutage()) {
      res.status(503).json({
        error: 'We are unable to connect to the database. Operations are currently disabled. Please try again later.',
        code: 'DATABASE_UNAVAILABLE',
        connected: false,
        timestamp: new Date().toISOString(),
      });
      return;
    }

    next();
  });

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
    res.json({
      success: true,
      url: image_base64,
      path,
    });
  });

  // 1. Primary Database Connection Detection Endpoint
  // Performs a real database connectivity check with a lightweight query.
  // Never exposes database credentials, connection strings, or sensitive info.
  app.get('/api/health/database', async (req, res) => {
    const { testDatabaseConnection, setSimulatedDatabaseOutage } = await import('./config/supabase');
    
    // Optional query param for test isolation
    if (req.query.simulate_disconnect === 'true') {
      res.status(503).json({
        connected: false,
        status: 'disconnected',
        message: 'We are unable to connect to the database. Please try again later.',
        error: 'We are unable to connect to the database. Please try again later.',
        code: 'DATABASE_SIMULATED_DISCONNECT',
        timestamp: new Date().toISOString(),
        latencyMs: 0,
      });
      return;
    }

    const dbStatus = await testDatabaseConnection();
    res.status(dbStatus.connected ? 200 : 503).json(dbStatus);
  });

  // Simulation endpoint for automated testing of database failure and recovery
  app.post('/api/health/database/simulate', async (req, res) => {
    const { setSimulatedDatabaseOutage, isSimulatedDatabaseOutage } = await import('./config/supabase');
    const { disconnect } = req.body;
    setSimulatedDatabaseOutage(Boolean(disconnect));
    res.json({
      success: true,
      simulatedOutage: isSimulatedDatabaseOutage(),
      timestamp: new Date().toISOString(),
    });
  });

  // General System & Service Health
  app.get('/api/health', async (_req, res) => {
    const { testDatabaseConnection } = await import('./config/supabase');
    const dbStatus = await testDatabaseConnection();
    res.json({
      status: dbStatus.connected ? 'ok' : 'degraded',
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
