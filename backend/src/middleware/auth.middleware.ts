import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { config } from '../config/index.js';
import { query } from '../db/postgres/client.js';

export interface AuthUser {
  id: string;
  email: string;
  name: string;
  designation: string;
  isAdmin: boolean;
  organizationId: string | null;
}

export interface AuthRequest extends Request {
  user?: AuthUser;
}

// Simple in-memory cache for user lookups to avoid slow DB roundtrips on every request
const userCache = new Map<string, { user: AuthUser; expiresAt: number }>();
const USER_CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes

function getCachedUser(userId: string): AuthUser | null {
  const entry = userCache.get(userId);
  if (entry && entry.expiresAt > Date.now()) {
    return entry.user;
  }
  if (entry) {
    userCache.delete(userId);
  }
  return null;
}

function setCachedUser(userId: string, user: AuthUser): void {
  userCache.set(userId, { user, expiresAt: Date.now() + USER_CACHE_TTL_MS });
  // Evict old entries if cache grows too large
  if (userCache.size > 500) {
    const now = Date.now();
    for (const [key, entry] of userCache) {
      if (entry.expiresAt <= now) userCache.delete(key);
    }
  }
}

// Helper: PostgreSQL DB lookup with timeout to prevent hanging requests
async function findUserWithTimeout(userId: string, timeoutMs: number = 15000): Promise<any> {
  return Promise.race([
    query<any>(
      `SELECT id, email, name, role as designation, tenant_id as organization_id
       FROM users
       WHERE id = $1 AND status = 'active'`,
      [userId]
    ).then(result => result.rows[0] || null),
    new Promise<null>((_, reject) =>
      setTimeout(() => reject(new Error(`User lookup timed out after ${timeoutMs}ms`)), timeoutMs)
    ),
  ]);
}

/**
 * Middleware to extract and verify JWT token
 * Attaches user info to request object
 */
export async function authMiddleware(req: AuthRequest, res: Response, next: NextFunction) {
  const authHeader = req.headers.authorization;

  if (!authHeader?.startsWith('Bearer ')) {
    // No token provided - continue without user (public access)
    return next();
  }

  const token = authHeader.substring(7);

  try {
    const decoded = jwt.verify(token, config.jwt.secret) as { userId: string; email: string };

    // Check cache first
    const cached = getCachedUser(decoded.userId);
    if (cached) {
      req.user = cached;
      return next();
    }

    // Get full user info from database (with timeout)
    const user = await findUserWithTimeout(decoded.userId);

    if (user) {
      const authUser: AuthUser = {
        id: user.id,
        email: user.email,
        name: user.name,
        designation: user.designation || 'Member',
        isAdmin: user.designation === 'Admin',
        organizationId: user.organization_id || null,
      };
      req.user = authUser;
      setCachedUser(decoded.userId, authUser);
    }
  } catch (error) {
    // Invalid token or DB timeout - continue without user
    console.log('Auth middleware error:', error instanceof Error ? error.message : 'Unknown error');
  }

  next();
}

/**
 * Middleware that requires authentication
 * Returns 401 if no valid token
 */
export async function requireAuth(req: AuthRequest, res: Response, next: NextFunction) {
  const authHeader = req.headers.authorization;

  if (!authHeader?.startsWith('Bearer ')) {
    return res.status(401).json({ success: false, error: 'Authentication required' });
  }

  const token = authHeader.substring(7);

  try {
    const decoded = jwt.verify(token, config.jwt.secret) as { userId: string; email: string };

    // Check cache first
    const cached = getCachedUser(decoded.userId);
    if (cached) {
      req.user = cached;
      return next();
    }

    const user = await findUserWithTimeout(decoded.userId);

    if (!user) {
      return res.status(401).json({ success: false, error: 'User not found' });
    }

    const authUser: AuthUser = {
      id: user.id,
      email: user.email,
      name: user.name,
      designation: user.designation || 'Member',
      isAdmin: user.designation === 'Admin',
      organizationId: user.organization_id || null,
    };
    req.user = authUser;
    setCachedUser(decoded.userId, authUser);

    next();
  } catch (error) {
    return res.status(401).json({ success: false, error: 'Invalid token' });
  }
}
