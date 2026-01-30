import { Router, Response } from 'express';
import { z } from 'zod';
import { tenantsService } from '../services/tenants.service.js';
import { authenticate } from '../middleware/auth.js';
import { canReadTenant, canManageTenant } from '../middleware/authorize.js';
import { ValidationError } from '../utils/errors.js';
import type { AuthenticatedRequest, ApiResponse } from '../types/index.js';

const router = Router();

// Validation schemas
const createTenantSchema = z.object({
  name: z.string().min(1).max(100),
  slug: z.string().min(2).max(50).regex(/^[a-z0-9-]+$/, 'Slug must be lowercase alphanumeric with hyphens'),
});

const updateTenantSchema = z.object({
  name: z.string().min(1).max(100).optional(),
});

const addMemberSchema = z.object({
  user_id: z.string().uuid(),
  role: z.enum(['admin', 'member']),
});

/**
 * GET /tenants
 * List all tenants (user has access to)
 */
router.get('/', authenticate, async (req: AuthenticatedRequest, res: Response<ApiResponse>, next) => {
  try {
    const { page, limit } = req.query;

    const result = await tenantsService.getAll({
      page: parseInt(page as string) || 1,
      limit: parseInt(limit as string) || 50,
    });

    res.json({
      success: true,
      data: result.data,
      meta: {
        total: result.total,
        page: parseInt(page as string) || 1,
        limit: parseInt(limit as string) || 50,
      },
    });
  } catch (error) {
    next(error);
  }
});

/**
 * GET /tenants/:tenantId
 * Get single tenant
 */
router.get('/:tenantId', authenticate, canReadTenant, async (req: AuthenticatedRequest, res: Response<ApiResponse>, next) => {
  try {
    const tenant = await tenantsService.getById(req.params.tenantId);

    res.json({
      success: true,
      data: tenant,
    });
  } catch (error) {
    next(error);
  }
});

/**
 * GET /tenants/slug/:slug
 * Get tenant by slug
 */
router.get('/slug/:slug', authenticate, async (req: AuthenticatedRequest, res: Response<ApiResponse>, next) => {
  try {
    const tenant = await tenantsService.getBySlug(req.params.slug);

    res.json({
      success: true,
      data: tenant,
    });
  } catch (error) {
    next(error);
  }
});

/**
 * POST /tenants
 * Create new tenant
 */
router.post('/', authenticate, async (req: AuthenticatedRequest, res: Response<ApiResponse>, next) => {
  try {
    const parsed = createTenantSchema.safeParse(req.body);
    if (!parsed.success) {
      throw new ValidationError('Invalid input', parsed.error.flatten());
    }

    const tenant = await tenantsService.create(parsed.data, req.userId!);

    res.status(201).json({
      success: true,
      data: tenant,
    });
  } catch (error) {
    next(error);
  }
});

/**
 * PATCH /tenants/:tenantId
 * Update tenant
 */
router.patch('/:tenantId', authenticate, canManageTenant, async (req: AuthenticatedRequest, res: Response<ApiResponse>, next) => {
  try {
    const parsed = updateTenantSchema.safeParse(req.body);
    if (!parsed.success) {
      throw new ValidationError('Invalid input', parsed.error.flatten());
    }

    const tenant = await tenantsService.update(req.params.tenantId, parsed.data);

    res.json({
      success: true,
      data: tenant,
    });
  } catch (error) {
    next(error);
  }
});

/**
 * DELETE /tenants/:tenantId
 * Delete tenant
 */
router.delete('/:tenantId', authenticate, canManageTenant, async (req: AuthenticatedRequest, res: Response<ApiResponse>, next) => {
  try {
    await tenantsService.delete(req.params.tenantId);

    res.json({
      success: true,
      data: { message: 'Tenant deleted successfully' },
    });
  } catch (error) {
    next(error);
  }
});

/**
 * GET /tenants/:tenantId/members
 * Get tenant members
 */
router.get('/:tenantId/members', authenticate, canReadTenant, async (req: AuthenticatedRequest, res: Response<ApiResponse>, next) => {
  try {
    const members = await tenantsService.getMembers(req.params.tenantId);

    res.json({
      success: true,
      data: members,
    });
  } catch (error) {
    next(error);
  }
});

/**
 * POST /tenants/:tenantId/members
 * Add member to tenant
 */
router.post('/:tenantId/members', authenticate, canManageTenant, async (req: AuthenticatedRequest, res: Response<ApiResponse>, next) => {
  try {
    const parsed = addMemberSchema.safeParse(req.body);
    if (!parsed.success) {
      throw new ValidationError('Invalid input', parsed.error.flatten());
    }

    await tenantsService.addMember(
      req.params.tenantId,
      parsed.data.user_id,
      parsed.data.role
    );

    res.status(201).json({
      success: true,
      data: { message: 'Member added successfully' },
    });
  } catch (error) {
    next(error);
  }
});

/**
 * DELETE /tenants/:tenantId/members/:userId
 * Remove member from tenant
 */
router.delete('/:tenantId/members/:userId', authenticate, canManageTenant, async (req: AuthenticatedRequest, res: Response<ApiResponse>, next) => {
  try {
    const { role } = req.query;

    if (!role || !['admin', 'member'].includes(role as string)) {
      throw new ValidationError('Valid role query parameter is required');
    }

    await tenantsService.removeMember(
      req.params.tenantId,
      req.params.userId,
      role as 'admin' | 'member'
    );

    res.json({
      success: true,
      data: { message: 'Member removed successfully' },
    });
  } catch (error) {
    next(error);
  }
});

export default router;
