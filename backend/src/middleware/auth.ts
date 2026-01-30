import { Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { config } from '../config/index.js';
import { supabaseAdmin } from '../lib/supabase.js';
import { UnauthorizedError } from '../utils/errors.js';
import type { AuthenticatedRequest, User } from '../types/index.js';

interface JwtPayload {
  sub: string;
  email: string;
  iat: number;
  exp: number;
}

/**
 * Authentication middleware
 * Validates JWT token and attaches user to request
 */
export async function authenticate(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader?.startsWith('Bearer ')) {
      throw new UnauthorizedError('No token provided');
    }

    const token = authHeader.substring(7);

    // Verify JWT
    const decoded = jwt.verify(token, config.jwt.secret) as JwtPayload;

    // Get user from database
    const { data: user, error } = await supabaseAdmin
      .from('users')
      .select('*')
      .eq('auth_user_id', decoded.sub)
      .single();

    if (error || !user) {
      throw new UnauthorizedError('User not found');
    }

    // Attach user to request
    req.user = user as User;
    req.userId = user.id;

    next();
  } catch (error) {
    if (error instanceof jwt.JsonWebTokenError) {
      next(new UnauthorizedError('Invalid token'));
    } else if (error instanceof jwt.TokenExpiredError) {
      next(new UnauthorizedError('Token expired'));
    } else {
      next(error);
    }
  }
}

/**
 * Optional authentication middleware
 * Attaches user if token is present, but doesn't require it
 */
export async function optionalAuth(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader?.startsWith('Bearer ')) {
      return next();
    }

    const token = authHeader.substring(7);
    const decoded = jwt.verify(token, config.jwt.secret) as JwtPayload;

    const { data: user } = await supabaseAdmin
      .from('users')
      .select('*')
      .eq('auth_user_id', decoded.sub)
      .single();

    if (user) {
      req.user = user as User;
      req.userId = user.id;
    }

    next();
  } catch {
    // Ignore errors, just continue without user
    next();
  }
}

/**
 * Generate JWT token for user
 */
export function generateToken(user: User): string {
  return jwt.sign(
    {
      sub: user.auth_user_id,
      email: user.email,
    },
    config.jwt.secret,
    {
      expiresIn: config.jwt.expiresIn,
    }
  );
}
