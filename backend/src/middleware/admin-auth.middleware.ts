import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { config } from '../config/index.js';
import { query } from '../db/postgres/client.js';

export interface AdminUser {
  id: string;
  email: string;
  name: string;
  role: 'super_admin' | 'admin';
  isActive: boolean;
}

export interface AdminRequest extends Request {
  admin?: AdminUser;
}

/**
 * Admin Authentication Middleware
 * Verifies JWT token and loads admin user from PostgreSQL
 */
export async function adminAuthMiddleware(
  req: AdminRequest,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    // Get token from Authorization header
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      res.status(401).json({
        success: false,
        error: 'No authentication token provided',
      });
      return;
    }

    const token = authHeader.substring(7);

    // Verify JWT
    let decoded: any;
    try {
      decoded = jwt.verify(token, config.jwt.secret);
    } catch (error) {
      res.status(401).json({
        success: false,
        error: 'Invalid or expired token',
      });
      return;
    }

    // Get admin user from PostgreSQL
    const result = await query(
      `SELECT id, email, name, role, is_active
       FROM admin_users
       WHERE id = $1 AND is_active = true`,
      [decoded.adminId || decoded.userId] // Support both adminId and userId for compatibility
    );

    if (result.rows.length === 0) {
      res.status(401).json({
        success: false,
        error: 'Admin user not found or inactive',
      });
      return;
    }

    const adminUser = result.rows[0];

    // Attach admin user to request
    req.admin = {
      id: adminUser.id,
      email: adminUser.email,
      name: adminUser.name,
      role: adminUser.role,
      isActive: adminUser.is_active,
    };

    next();
  } catch (error: any) {
    console.error('[AdminAuth] Error:', error);
    res.status(500).json({
      success: false,
      error: 'Authentication error',
    });
  }
}

/**
 * Require Super Admin Role
 * Must be used after adminAuthMiddleware
 */
export function requireSuperAdmin(
  req: AdminRequest,
  res: Response,
  next: NextFunction
): void {
  if (!req.admin) {
    res.status(401).json({
      success: false,
      error: 'Authentication required',
    });
    return;
  }

  if (req.admin.role !== 'super_admin') {
    res.status(403).json({
      success: false,
      error: 'Super admin access required',
    });
    return;
  }

  next();
}

/**
 * Require Admin Role (admin or super_admin)
 * Must be used after adminAuthMiddleware
 */
export function requireAdmin(
  req: AdminRequest,
  res: Response,
  next: NextFunction
): void {
  if (!req.admin) {
    res.status(401).json({
      success: false,
      error: 'Authentication required',
    });
    return;
  }

  if (req.admin.role !== 'admin' && req.admin.role !== 'super_admin') {
    res.status(403).json({
      success: false,
      error: 'Admin access required',
    });
    return;
  }

  next();
}
