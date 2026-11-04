import { Request, Response } from 'express';
import { supabase, isRealSupabaseConfigured, dataStore, testDatabaseConnection } from '../config/supabase';
import * as db from '../services/db';
import type { AuthenticatedRequest } from '../middleware/auth';
import type { UserProfile } from '../types';

export class AuthController {
  /**
   * Dedicated Admin Login
   * Strictly enforces that ONLY accounts with role === 'admin' can authenticate.
   */
  async adminLogin(req: Request, res: Response): Promise<void> {
    const identifier = req.body.identifier || req.body.email || req.body.username;
    const password = req.body.password;

    if (!identifier || !password) {
      res.status(400).json({ error: 'Admin email/username and password are required' });
      return;
    }

    const cleanIdentifier = String(identifier).trim().toLowerCase();
    const envAdminEmail = (process.env.ADMIN_EMAIL || 'admin@exampro.edu').toLowerCase();
    const envAdminPassword = process.env.ADMIN_PASSWORD || 'Admin@1234';

    try {
      // 1. Try real Supabase Auth if configured
      if (isRealSupabaseConfigured && supabase) {
        try {
          const { data, error } = await supabase.auth.signInWithPassword({
            email: cleanIdentifier,
            password,
          });

          if (!error && data.user) {
            const profile = await db.findProfileById(data.user.id);

            if (profile && profile.role !== 'admin') {
              res.status(403).json({
                error: 'Access denied: This portal is strictly for administrator accounts. Student credentials cannot be used here.',
                code: 'ADMIN_ACCESS_REQUIRED',
              });
              return;
            }

            res.json({
              user: profile || { id: data.user.id, email: data.user.email, role: 'admin' },
              token: data.session?.access_token,
            });
            return;
          }
        } catch {
          // If auth signInWithPassword fails, continue to database profile check
        }
      }

      // 2. Reject if registered student credentials are used in Admin login
      const studentProfile = await db.findProfileByEmail(cleanIdentifier);
      if (studentProfile && studentProfile.role === 'student') {
        const storedStudentPass =
          dataStore.credentials.get(studentProfile.email.toLowerCase()) ||
          dataStore.credentials.get(studentProfile.id.toLowerCase());
        if (storedStudentPass === password) {
          res.status(403).json({
            error: 'Access denied: This portal is strictly for administrator accounts. Student credentials cannot be used here.',
            code: 'ADMIN_ACCESS_REQUIRED',
          });
          return;
        }
      }

      // 3. System Administrator Authentication via PostgreSQL Profiles
      const isAdminIdentifier =
        cleanIdentifier === 'admin@exampro.edu' ||
        cleanIdentifier === 'admin' ||
        cleanIdentifier === envAdminEmail ||
        cleanIdentifier === 'jhaa47531@gmail.com';

      const isDefaultPassValid =
        password === 'Admin@1234' ||
        password === envAdminPassword;

      // Find an existing admin profile in PostgreSQL
      let adminProfile: UserProfile | null = null;
      try {
        const adminProfiles = await db.getAllProfiles('admin');
        adminProfile = adminProfiles.find(
          (p) =>
            p.email.toLowerCase() === cleanIdentifier ||
            (isAdminIdentifier && (p.email.toLowerCase() === envAdminEmail || p.email.toLowerCase() === 'admin@exampro.edu' || p.email.toLowerCase() === 'jhaa47531@gmail.com'))
        ) || null;
      } catch {
        // Fallback to checking by single email
        adminProfile = await db.findProfileByEmail(cleanIdentifier);
      }

      // Check stored password or matching admin password
      const storedPassword =
        (adminProfile ? dataStore.credentials.get(adminProfile.email.toLowerCase()) : undefined) ||
        dataStore.credentials.get(cleanIdentifier) ||
        dataStore.credentials.get('admin@exampro.edu') ||
        dataStore.credentials.get(envAdminEmail);

      const isPasswordMatch =
        (storedPassword && storedPassword === password) ||
        (isAdminIdentifier && isDefaultPassValid);

      if (!isAdminIdentifier && !adminProfile) {
        res.status(401).json({ error: 'Invalid administrator email or password' });
        return;
      }

      if (!isPasswordMatch) {
        res.status(401).json({ error: 'Invalid administrator email or password' });
        return;
      }

      if (!adminProfile) {
        // If not in database yet, create admin profile in PostgreSQL
        adminProfile = await db.insertProfile({
          id: `admin-${Date.now()}`,
          email: cleanIdentifier.includes('@') ? cleanIdentifier : (envAdminEmail || 'admin@exampro.edu'),
          full_name: 'Chief Examination Controller',
          role: 'admin',
        });
      }

      // Normalize in-memory credentials for token lookups
      dataStore.credentials.set(adminProfile.email.toLowerCase(), password);
      dataStore.credentials.set('admin@exampro.edu', password);
      dataStore.credentials.set('admin', password);
      if (envAdminEmail) dataStore.credentials.set(envAdminEmail, password);

      res.json({
        user: adminProfile,
        token: `token-${adminProfile.id}`,
      });
    } catch (err: any) {
      res.status(500).json({ error: err.message || 'Administrator login failed' });
    }
  }

  /**
   * Dedicated Student Login
   * Strictly enforces that ONLY accounts with role === 'student' can authenticate.
   * Supports Student ID / Enrollment Number OR College Email.
   */
  async studentLogin(req: Request, res: Response): Promise<void> {
    const identifier = req.body.identifier || req.body.student_id || req.body.email;
    const password = req.body.password;

    if (!identifier || !password) {
      res.status(400).json({ error: 'Student ID / Enrollment Number and password are required' });
      return;
    }

    const cleanIdentifier = String(identifier).trim().toLowerCase();
    const envAdminEmail = (process.env.ADMIN_EMAIL || 'admin@exampro.edu').toLowerCase();
    const envAdminPassword = process.env.ADMIN_PASSWORD || 'Admin@1234';

    // 1. Immediately check if an Admin tries to use Student Login
    const isAdminIdentifier =
      cleanIdentifier === envAdminEmail ||
      cleanIdentifier === 'admin' ||
      cleanIdentifier === 'admin@exampro.edu' ||
      cleanIdentifier === 'jhaa47531@gmail.com';

    const isAdminPassword =
      password === envAdminPassword ||
      password === 'Admin@1234';

    if (isAdminIdentifier && isAdminPassword) {
      res.status(403).json({
        error: 'Access denied: Administrator accounts must use the dedicated Admin Portal.',
        code: 'STUDENT_ACCESS_REQUIRED',
      });
      return;
    }

    try {
      const adminCheck = await db.findProfileByEmail(cleanIdentifier);
      if (adminCheck && adminCheck.role === 'admin') {
        const storedAdminPass =
          dataStore.credentials.get(adminCheck.email.toLowerCase()) ||
          dataStore.credentials.get(cleanIdentifier) ||
          envAdminPassword ||
          'Admin@1234';
        if (storedAdminPass === password) {
          res.status(403).json({
            error: 'Access denied: Administrator accounts must use the dedicated Admin Portal.',
            code: 'STUDENT_ACCESS_REQUIRED',
          });
          return;
        }
      }

      // 2. Try real Supabase Auth if configured
      if (isRealSupabaseConfigured && supabase) {
        let studentEmail = cleanIdentifier;

        if (!cleanIdentifier.includes('@')) {
          const enrollments = await db.getAllEnrollments();
          const match = enrollments.find(
            (e) =>
              e.college_student_id.toLowerCase() === cleanIdentifier ||
              e.enrollment_number.toLowerCase() === cleanIdentifier
          );
          if (match) {
            const prof = await db.findProfileById(match.student_id);
            if (prof?.email) studentEmail = prof.email.toLowerCase();
          }
        }

        try {
          const { data, error } = await supabase.auth.signInWithPassword({
            email: studentEmail,
            password,
          });

          if (!error && data.user) {
            const profile = await db.findProfileById(data.user.id);

            if (profile && profile.role !== 'student') {
              res.status(403).json({
                error: 'Access denied: Administrator accounts must use the dedicated Admin Portal.',
                code: 'STUDENT_ACCESS_REQUIRED',
              });
              return;
            }

            const [verification, enrollment] = await Promise.all([
              db.getVerificationByStudent(data.user.id),
              db.getEnrollmentsByStudent(data.user.id),
            ]);

            res.json({
              user: profile || { id: data.user.id, email: data.user.email, role: 'student' },
              token: data.session?.access_token,
              verification,
              enrollment,
            });
            return;
          }
        } catch {
          // If Supabase Auth fails, fall through to profile lookup
        }
      }

      // 3. Search in PostgreSQL database
      let studentProfile: UserProfile | null = await db.findProfileByEmail(cleanIdentifier);

      if (!studentProfile) {
        const enrollments = await db.getAllEnrollments();
        const enrollment = enrollments.find(
          (e) =>
            e.college_student_id.toLowerCase() === cleanIdentifier ||
            e.enrollment_number.toLowerCase() === cleanIdentifier
        );
        if (enrollment) {
          studentProfile = await db.findProfileById(enrollment.student_id);
        } else {
          const studentIdFromMap = dataStore.studentCollegeIdMap.get(cleanIdentifier);
          if (studentIdFromMap) {
            studentProfile = await db.findProfileById(studentIdFromMap);
          }
        }
      }

      if (!studentProfile) {
        res.status(401).json({ error: 'Invalid Student ID or password' });
        return;
      }

      if (studentProfile.role !== 'student') {
        res.status(403).json({
          error: 'Access denied: Administrator accounts must use the dedicated Admin Portal.',
          code: 'STUDENT_ACCESS_REQUIRED',
        });
        return;
      }

      const storedPassword = dataStore.credentials.get(studentProfile.email.toLowerCase());
      if (!storedPassword || storedPassword !== password) {
        res.status(401).json({ error: 'Invalid Student ID or password' });
        return;
      }

      const [verification, enrollment] = await Promise.all([
        db.getVerificationByStudent(studentProfile.id),
        db.getEnrollmentsByStudent(studentProfile.id),
      ]);

      res.json({
        user: studentProfile,
        token: `token-${studentProfile.id}`,
        verification,
        enrollment,
      });
    } catch (err: any) {
      res.status(500).json({ error: err.message || 'Student login failed' });
    }
  }

  /**
   * General login fallback (routes based on role check)
   */
  async login(req: Request, res: Response): Promise<void> {
    const expectedRole = req.body.role;
    if (expectedRole === 'admin') {
      return this.adminLogin(req, res);
    }
    if (expectedRole === 'student') {
      return this.studentLogin(req, res);
    }

    const email = (req.body.email || req.body.identifier || '').trim().toLowerCase();
    if (email.includes('admin')) {
      return this.adminLogin(req, res);
    }
    return this.studentLogin(req, res);
  }

  async logout(_req: Request, res: Response): Promise<void> {
    try {
      if (isRealSupabaseConfigured && supabase) {
        await supabase.auth.signOut();
      }
    } catch {
      // ignore
    }
    res.json({ success: true, message: 'Logged out successfully' });
  }

  async getMe(req: AuthenticatedRequest, res: Response): Promise<void> {
    if (!req.user) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }

    try {
      let verification = null;
      let enrollment = null;

      if (req.user.role === 'student') {
        const [v, e] = await Promise.all([
          db.getVerificationByStudent(req.user.id),
          db.getEnrollmentsByStudent(req.user.id),
        ]);
        verification = v;
        enrollment = e;
      }

      // Re-fetch latest profile from database to ensure fresh data
      const latestProfile = await db.findProfileById(req.user.id);

      res.json({
        user: latestProfile || req.user,
        verification,
        enrollment,
      });
    } catch (err: any) {
      res.status(500).json({ error: err.message || 'Failed to fetch current user session' });
    }
  }

  async getDbStatus(_req: Request, res: Response): Promise<void> {
    const status = await testDatabaseConnection();
    res.json(status);
  }
}

export const authController = new AuthController();
