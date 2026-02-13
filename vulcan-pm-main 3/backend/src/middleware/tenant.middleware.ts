import { Response, NextFunction } from 'express';
import { AuthRequest } from './auth.middleware.js';
import { tenantsRepository, Tenant } from '../db/postgres/repositories/tenants.repository.js';
import { usersRepository } from '../db/postgres/repositories/users.repository.js';
import { TenantDb, createTenantDb, initializeTenantDb } from '../db/mongo/tenant-router.js';

export interface TenantContext {
  id: string;
  name: string;
  slug: string;
  settings: Record<string, any>;
}

export interface TenantRequest extends AuthRequest {
  tenant?: TenantContext;
  tenantDb?: TenantDb;  // Tenant's MongoDB database
}

/**
 * Middleware to extract tenant context from authenticated user
 * Requires authMiddleware to run first
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
    const user = await usersRepository.findById(req.user.id);

    if (!user?.tenant_id) {
      return next();
    }

    // Get tenant details
    const tenant = await tenantsRepository.findById(user.tenant_id);

    if (!tenant || !tenant.is_active) {
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
      settings: tenant.settings || {},
    };

    // Attach tenant's MongoDB database
    req.tenantDb = createTenantDb(tenant.id);

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
      error: 'Tenant context required',
    });
  }
  next();
}

/**
 * Extract tenant from subdomain or header
 * Alternative to user-based tenant resolution
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
      const tenant = await tenantsRepository.findById(headerTenantId);
      if (tenant && tenant.is_active) {
        req.tenant = {
          id: tenant.id,
          name: tenant.name,
          slug: tenant.slug,
          settings: tenant.settings || {},
        };
        req.tenantDb = createTenantDb(tenant.id);
        return next();
      }
    }

    // Check subdomain
    const host = req.headers.host || '';
    const subdomain = host.split('.')[0];

    if (subdomain && subdomain !== 'www' && subdomain !== 'api') {
      const tenant = await tenantsRepository.findBySlug(subdomain);
      if (tenant && tenant.is_active) {
        req.tenant = {
          id: tenant.id,
          name: tenant.name,
          slug: tenant.slug,
          settings: tenant.settings || {},
        };
        req.tenantDb = createTenantDb(tenant.id);
      }
    }

    next();
  } catch (error) {
    console.error('[TenantFromSubdomain] Error:', error);
    next(error);
  }
}

export default { tenantMiddleware, requireTenant, tenantFromSubdomain };
