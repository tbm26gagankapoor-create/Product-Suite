import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { config } from '../config/index.js';
import database from '../lib/database.js';

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

    // Get full user info from database
    const user = await database.findById<any>('users', decoded.userId);

    if (user) {
      req.user = {
        id: user.id,
        email: user.email,
        name: user.name,
        designation: user.designation || 'Member',
        isAdmin: user.designation === 'Admin',
        organizationId: user.organization_id || null,
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
    const decoded = jwt.verify(token, config.jwt.secret) as { userId: string; email: string };

    const user = await database.findById<any>('users', decoded.userId);

    if (!user) {
      return res.status(401).json({ success: false, error: 'User not found' });
    }

    req.user = {
      id: user.id,
      email: user.email,
      name: user.name,
      designation: user.designation || 'Member',
      isAdmin: user.designation === 'Admin',
      organizationId: user.organization_id || null,
    };

    next();
  } catch (error) {
    return res.status(401).json({ success: false, error: 'Invalid token' });
  }
}
