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
    // 1. Resolve local/in-memory session tokens first (generated during admin/student login)
    if (token.startsWith('token-')) {
      const userId = token.replace('token-', '');
      const profile = dataStore.profiles.find(
        (p) => p.id === userId || p.email.toLowerCase() === userId.toLowerCase()
      );

      if (profile) {
        req.user = {
          ...profile,
          role: String(profile.role).toLowerCase() as 'admin' | 'student',
        };
        next();
        return;
      }
    }

    // 2. Resolve external Supabase auth token if present
    if (isRealSupabaseConfigured && supabase) {
      try {
        const { data: { user }, error } = await supabase.auth.getUser(token);
        if (!error && user) {
          const { data: profile } = await supabase
            .from('profiles')
            .select('*')
            .eq('id', user.id)
            .maybeSingle();

          if (profile) {
            req.user = {
              ...profile,
              role: String(profile.role).toLowerCase() as 'admin' | 'student',
            } as UserProfile;
            next();
            return;
          }

          const localMatch = dataStore.profiles.find(
            (p) => p.id === user.id || p.email.toLowerCase() === user.email?.toLowerCase()
          );
          if (localMatch) {
            req.user = {
              ...localMatch,
              role: String(localMatch.role).toLowerCase() as 'admin' | 'student',
            };
            next();
            return;
          }

          const resolvedRole = (user.user_metadata?.role || (user.email?.includes('admin') ? 'admin' : 'student')).toLowerCase();
          req.user = {
            id: user.id,
            email: user.email || '',
            full_name: user.user_metadata?.full_name || user.email?.split('@')[0] || 'User',
            role: resolvedRole as 'admin' | 'student',
            created_at: user.created_at,
            updated_at: user.updated_at || user.created_at,
          };
          next();
          return;
        }
      } catch {
        // Fall through to local fallback
      }
    }

    // 3. Fallback: check raw token against store profiles
    const rawId = token.replace('token-', '');
    const profile = dataStore.profiles.find(
      (p) => p.id === rawId || p.email.toLowerCase() === rawId.toLowerCase()
    );

    if (!profile) {
      res.status(401).json({
        error: 'Invalid or expired authentication session',
        code: 'INVALID_SESSION',
      });
      return;
    }

    req.user = {
      ...profile,
      role: String(profile.role).toLowerCase() as 'admin' | 'student',
    };
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

  const role = String(req.user.role || '').toLowerCase();
  if (role !== 'admin') {
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

  const role = String(req.user.role || '').toLowerCase();
  if (role !== 'student') {
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
      try {
        const { data: verif } = await supabase
          .from('student_verifications')
          .select('status, rejection_reason')
          .eq('student_id', req.user.id)
          .maybeSingle();

        if (verif) {
          verifStatus = verif.status;
          rejectionReason = verif.rejection_reason;
        }
      } catch {
        // Fallback to dataStore below
      }
    }

    if (verifStatus === 'unregistered') {
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
