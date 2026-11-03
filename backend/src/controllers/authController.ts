import { Request, Response } from 'express';
import { supabase, isRealSupabaseConfigured, dataStore } from '../config/supabase';
import type { AuthenticatedRequest } from '../middleware/auth';

export class AuthController {
  async login(req: Request, res: Response): Promise<void> {
    const { email, password } = req.body;

    if (!email || !password) {
      res.status(400).json({ error: 'Email and password are required' });
      return;
    }

    try {
      if (isRealSupabaseConfigured && supabase) {
        const { data, error } = await supabase.auth.signInWithPassword({
          email,
          password,
        });

        if (error || !data.user) {
          res.status(401).json({ error: error?.message || 'Invalid credentials' });
          return;
        }

        const { data: profile } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', data.user.id)
          .single();

        res.json({
          user: profile || { id: data.user.id, email: data.user.email, role: 'student' },
          token: data.session?.access_token,
        });
        return;
      }

      // Local / Dev authentication
      const storedPassword = dataStore.credentials.get(email.toLowerCase());
      const profile = dataStore.profiles.find((p) => p.email.toLowerCase() === email.toLowerCase());

      if (!profile || !storedPassword || storedPassword !== password) {
        res.status(401).json({ error: 'Invalid email or password' });
        return;
      }

      // Fetch verification info if student
      let verification = null;
      if (profile.role === 'student') {
        verification = dataStore.studentVerifications.find((v) => v.student_id === profile.id);
      }

      res.json({
        user: profile,
        token: `token-${profile.id}`,
        verification,
      });
    } catch (err: any) {
      res.status(500).json({ error: err.message || 'Login failed' });
    }
  }

  async logout(_req: Request, res: Response): Promise<void> {
    res.json({ success: true, message: 'Logged out successfully' });
  }

  async getMe(req: AuthenticatedRequest, res: Response): Promise<void> {
    if (!req.user) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }

    let verification = null;
    let enrollment = null;

    if (req.user.role === 'student') {
      verification = dataStore.studentVerifications.find((v) => v.student_id === req.user!.id);
      enrollment = dataStore.studentEnrollments.find((e) => e.student_id === req.user!.id);
    }

    res.json({
      user: req.user,
      verification,
      enrollment,
    });
  }
}

export const authController = new AuthController();
