import { Request, Response, NextFunction } from 'express';
import { supabase, isRealSupabaseConfigured, dataStore } from '../config/supabase';
import type { UserProfile } from '../types';

export interface AuthenticatedRequest extends Request {
  user?: UserProfile;
}

export async function authenticateToken(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> {
  let token: string | undefined;
  const authHeader = req.headers.authorization;
  if (authHeader && authHeader.startsWith('Bearer ')) {
    token = authHeader.substring(7).trim();
  } else if (typeof req.query.token === 'string') {
    token = req.query.token;
  }

  if (!token) {
    res.status(401).json({ error: 'Missing or malformed Authorization header or token param' });
    return;
  }

  try {
    if (isRealSupabaseConfigured && supabase) {
      const { data: { user }, error } = await supabase.auth.getUser(token);
      if (error || !user) {
        res.status(401).json({ error: 'Invalid or expired authentication session' });
        return;
      }

      // Query profile
      const { data: profile } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .single();

      if (!profile) {
        res.status(401).json({ error: 'User profile not found in database' });
        return;
      }

      req.user = profile as UserProfile;
      next();
      return;
    }

    // When real database is not connected, check if session is stored or reject
    const userId = token.replace('token-', '');
    const profile = dataStore.profiles.find((p) => p.id === userId || p.email === userId);

    if (!profile) {
      res.status(401).json({
        error: 'Database is disconnected. No active authenticated session found.',
        code: 'DATABASE_DISCONNECTED',
      });
      return;
    }

    req.user = profile;
    next();
  } catch {
    res.status(500).json({ error: 'Internal server error verifying authentication' });
  }
}

export function requireAdmin(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): void {
  if (!req.user) {
    res.status(401).json({ error: 'Authentication required' });
    return;
  }

  if (req.user.role !== 'admin') {
    res.status(403).json({
      error: 'Forbidden: Administrative privileges required',
      code: 'ADMIN_ACCESS_REQUIRED',
    });
    return;
  }

  next();
}

export function requireStudent(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): void {
  if (!req.user) {
    res.status(401).json({ error: 'Authentication required' });
    return;
  }

  if (req.user.role !== 'student') {
    res.status(403).json({
      error: 'Forbidden: Student privileges required',
      code: 'STUDENT_ACCESS_REQUIRED',
    });
    return;
  }

  next();
}

export async function requireVerifiedStudent(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> {
  if (!req.user || req.user.role !== 'student') {
    res.status(403).json({ error: 'Student verification required' });
    return;
  }

  let verifStatus: string = 'unregistered';
  let rejectionReason: string | undefined;

  if (isRealSupabaseConfigured && supabase) {
    const { data: verif } = await supabase
      .from('student_verifications')
      .select('status, rejection_reason')
      .eq('student_id', req.user.id)
      .maybeSingle();

    if (verif) {
      verifStatus = verif.status;
      rejectionReason = verif.rejection_reason;
    }
  } else {
    const verif = dataStore.studentVerifications.find(
      (v) => v.student_id === req.user!.id
    );
    if (verif) {
      verifStatus = verif.status;
      rejectionReason = verif.rejection_reason;
    }
  }

  if (verifStatus !== 'approved') {
    res.status(403).json({
      error: 'Access denied: College ID verification is not approved',
      code: 'VERIFICATION_RESTRICTED',
      verificationStatus: verifStatus,
      rejectionReason,
    });
    return;
  }

  next();
}
