import { Response, NextFunction } from 'express';
import { AuthRequest } from './auth.middleware.js';
import { query } from '../db/postgres/client.js';
import { TenantDb, createTenantDb, initializeTenantDb } from '../lib/tenant-router.js';

export interface TenantContext {
  id: string;
  name: string;
  slug: string;
  domain: string | null;
  settings: Record<string, any>;
  subscription_status: string;
}

export interface TenantRequest extends AuthRequest {
  tenant?: TenantContext;
  tenantDb?: TenantDb;  // Tenant's MongoDB database
}

/**
 * Middleware to extract tenant context from authenticated user
 * Requires authMiddleware to run first
 *
 * Flow:
 * 1. Auth middleware sets req.user (from JWT + PostgreSQL users table)
 * 2. This middleware gets tenant_id from req.user
 * 3. Fetches tenant details from PostgreSQL
 * 4. Creates MongoDB connection for tenant's database
 * 5. Attaches tenant context and tenantDb to request
 */
export async function tenantMiddleware(
  req: TenantRequest,
  res: Response,
  next: NextFunction
) {
  try {
    // If no authenticated user, skip tenant resolution
    if (!req.user?.id) {
      return next();
    }

    // Get user's tenant_id from PostgreSQL
    // Note: req.user.organizationId is set by auth middleware from users table
    const tenantId = req.user.organizationId;

    if (!tenantId) {
      // User exists but has no tenant association
      return next();
    }

    // Get tenant details from PostgreSQL
    const result = await query<any>(
      `SELECT id, name, slug, domain, settings, subscription_status
       FROM tenants
       WHERE id = $1 AND is_active = true`,
      [tenantId]
    );

    const tenant = result.rows[0];

    if (!tenant) {
      return res.status(403).json({
        success: false,
        error: 'Tenant not found or inactive',
      });
    }

    // Attach tenant context to request
    req.tenant = {
      id: tenant.id,
      name: tenant.name,
      slug: tenant.slug,
      domain: tenant.domain,
      settings: tenant.settings || {},
      subscription_status: tenant.subscription_status,
    };

    // Attach tenant's MongoDB database (await since it's async)
    req.tenantDb = await createTenantDb(tenant.id);

    // Auto-initialize tenant database if it doesn't exist yet
    // This ensures the database exists on first access
    try {
      const collections = await req.tenantDb.db.listCollections().toArray();
      if (collections.length === 0) {
        console.log(`[TenantMiddleware] First access, initializing database for tenant: ${tenant.slug}`);
        await initializeTenantDb(tenant.id);
      }
    } catch (initError) {
      console.error('[TenantMiddleware] Database initialization error:', initError);
      // Non-fatal: continue even if initialization fails
    }

    next();
  } catch (error) {
    console.error('[TenantMiddleware] Error:', error);
    next(error);
  }
}

/**
 * Middleware that requires tenant context
 * Use after tenantMiddleware for routes that need tenant scope
 */
export function requireTenant(
  req: TenantRequest,
  res: Response,
  next: NextFunction
) {
  if (!req.tenant?.id) {
    return res.status(403).json({
      success: false,
      error: 'Tenant context required. User must belong to an organization.',
    });
  }

  if (!req.tenantDb) {
    return res.status(500).json({
      success: false,
      error: 'Tenant database not available',
    });
  }

  next();
}

/**
 * Extract tenant from subdomain or header
 * Alternative to user-based tenant resolution
 * Useful for webhooks or API endpoints that don't have user auth
 */
export async function tenantFromSubdomain(
  req: TenantRequest,
  res: Response,
  next: NextFunction
) {
  try {
    // Check X-Tenant-ID header first
    const headerTenantId = req.headers['x-tenant-id'] as string;
    if (headerTenantId) {
      const result = await query<any>(
        'SELECT id, name, slug, domain, settings, subscription_status FROM tenants WHERE id = $1 AND is_active = true',
        [headerTenantId]
      );
      const tenant = result.rows[0];

      if (tenant) {
        req.tenant = {
          id: tenant.id,
          name: tenant.name,
          slug: tenant.slug,
          domain: tenant.domain,
          settings: tenant.settings || {},
          subscription_status: tenant.subscription_status,
        };
        req.tenantDb = await createTenantDb(tenant.id);
        return next();
      }
    }

    // Check subdomain (e.g., acme.infinia.com → slug: acme)
    const host = req.headers.host || '';
    const subdomain = host.split('.')[0];

    if (subdomain && subdomain !== 'www' && subdomain !== 'api') {
      const result = await query<any>(
        'SELECT id, name, slug, domain, settings, subscription_status FROM tenants WHERE slug = $1 AND is_active = true',
        [subdomain]
      );
      const tenant = result.rows[0];

      if (tenant) {
        req.tenant = {
          id: tenant.id,
          name: tenant.name,
          slug: tenant.slug,
          domain: tenant.domain,
          settings: tenant.settings || {},
          subscription_status: tenant.subscription_status,
        };
        req.tenantDb = await createTenantDb(tenant.id);
      }
    }

    next();
  } catch (error) {
    console.error('[TenantFromSubdomain] Error:', error);
    next(error);
  }
}

/**
 * Middleware to check tenant subscription status
 * Use after tenantMiddleware to enforce subscription checks
 */
export function requireActiveSubscription(
  req: TenantRequest,
  res: Response,
  next: NextFunction
) {
  if (!req.tenant) {
    return res.status(403).json({
      success: false,
      error: 'Tenant context required',
    });
  }

  const allowedStatuses = ['active', 'trialing'];
  if (!allowedStatuses.includes(req.tenant.subscription_status)) {
    return res.status(402).json({
      success: false,
      error: 'Subscription required',
      message: `Your subscription is ${req.tenant.subscription_status}. Please update your payment method.`,
    });
  }

  next();
}

export default {
  tenantMiddleware,
  requireTenant,
  tenantFromSubdomain,
  requireActiveSubscription,
};
