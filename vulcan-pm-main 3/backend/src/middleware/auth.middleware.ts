import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { config } from '../config/index.js';
import { usersRepository } from '../db/postgres/repositories/users.repository.js';

export interface AuthUser {
  id: string;
  email: string;
  name: string;
  role: string;
  isAdmin: boolean;
  isOrgAdmin: boolean;
  tenantId: string | null;
  avatarUrl: string | null;
}

export interface AuthRequest extends Request {
  user?: AuthUser;
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
    const decoded = jwt.verify(token, config.jwt.secret) as {
      userId: string;
      email: string;
      isOrgAdmin?: boolean;
    };

    // Get full user info from PostgreSQL
    const user = await usersRepository.findById(decoded.userId);

    if (user) {
      req.user = {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role || 'member',
        isAdmin: user.role === 'admin' || user.role === 'owner',
        isOrgAdmin: decoded.isOrgAdmin || false,
        tenantId: user.tenant_id,
        avatarUrl: user.avatar_url,
      };
    }
  } catch (error) {
    // Invalid token - continue without user
    console.log('Invalid token:', error instanceof Error ? error.message : 'Unknown error');
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
    const decoded = jwt.verify(token, config.jwt.secret) as {
      userId: string;
      email: string;
      isOrgAdmin?: boolean;
    };

    const user = await usersRepository.findById(decoded.userId);

    if (!user) {
      return res.status(401).json({ success: false, error: 'User not found' });
    }

    if (user.status !== 'active') {
      return res.status(403).json({ success: false, error: 'Account is inactive' });
    }

    // Check org admin from JWT or from user role/metadata in database
    const isOrgAdminFromDb = user.role === 'org_admin' ||
      (user.metadata as any)?.isOrgAdmin === true;

    req.user = {
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.role || 'member',
      isAdmin: user.role === 'admin' || user.role === 'owner',
      isOrgAdmin: decoded.isOrgAdmin || isOrgAdminFromDb,
      tenantId: user.tenant_id,
      avatarUrl: user.avatar_url,
    };

    next();
  } catch (error) {
    return res.status(401).json({ success: false, error: 'Invalid token' });
  }
}

/**
 * Middleware that requires admin role
 */
export function requireAdmin(req: AuthRequest, res: Response, next: NextFunction) {
  if (!req.user?.isAdmin) {
    return res.status(403).json({ success: false, error: 'Admin access required' });
  }
  next();
}

/**
 * Middleware that requires organization admin role
 * This is for actions like creating projects, managing org settings
 */
export function requireOrgAdmin(req: AuthRequest, res: Response, next: NextFunction) {
  if (!req.user?.isOrgAdmin) {
    return res.status(403).json({
      success: false,
      error: 'Organization admin access required',
    });
  }
  next();
}
