import { Router, Response } from 'express';
import { z } from 'zod';
import { workspacesService } from '../services/workspaces.service.js';
import { authorizationService } from '../services/authorization.service.js';
import { authenticate } from '../middleware/auth.js';
import {
  canReadWorkspace,
  canWriteWorkspace,
  canManageWorkspace,
  canReadTenant,
} from '../middleware/authorize.js';
import { ValidationError, ForbiddenError } from '../utils/errors.js';
import { checkPermission, formatUser, formatTenant } from '../lib/openfga.js';
import type { AuthenticatedRequest, ApiResponse } from '../types/index.js';

const router = Router();

// Validation schemas
const createWorkspaceSchema = z.object({
  name: z.string().min(1).max(100),
  key: z.string().min(2).max(10).regex(/^[A-Z0-9]+$/i, 'Key must be alphanumeric'),
  description: z.string().max(500).optional(),
  tenant_id: z.string().uuid(),
});

const updateWorkspaceSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  description: z.string().max(500).optional(),
});

const addMemberSchema = z.object({
  user_id: z.string().uuid(),
  role: z.enum(['admin', 'member', 'viewer']),
});

const updateMemberRoleSchema = z.object({
  old_role: z.enum(['admin', 'member', 'viewer']),
  new_role: z.enum(['admin', 'member', 'viewer']),
});

/**
 * GET /workspaces
 * List workspaces for a tenant
 */
router.get('/', authenticate, async (req: AuthenticatedRequest, res: Response<ApiResponse>, next) => {
  try {
    const { tenantId, page, limit } = req.query;

    if (!tenantId) {
      throw new ValidationError('tenant_id is required');
    }

    // Check tenant access
    const canRead = await checkPermission(
      formatUser(req.userId!),
      'can_read',
      formatTenant(tenantId as string)
    );

    if (!canRead) {
      throw new ForbiddenError('No access to this tenant');
    }

    const result = await workspacesService.getAll(
      tenantId as string,
      {
        page: parseInt(page as string) || 1,
        limit: parseInt(limit as string) || 50,
      }
    );

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
 * GET /workspaces/:workspaceId
 * Get single workspace
 */
router.get('/:workspaceId', authenticate, canReadWorkspace, async (req: AuthenticatedRequest, res: Response<ApiResponse>, next) => {
  try {
    const workspace = await workspacesService.getById(req.params.workspaceId);

    res.json({
      success: true,
      data: workspace,
    });
  } catch (error) {
    next(error);
  }
});

/**
 * GET /workspaces/:workspaceId/permissions
 * Get workspace permissions for current user
 */
router.get('/:workspaceId/permissions', authenticate, async (req: AuthenticatedRequest, res: Response<ApiResponse>, next) => {
  try {
    const permissions = await authorizationService.getWorkspacePermissions(
      req.userId!,
      req.params.workspaceId
    );

    res.json({
      success: true,
      data: permissions,
    });
  } catch (error) {
    next(error);
  }
});

/**
 * POST /workspaces
 * Create new workspace
 */
router.post('/', authenticate, async (req: AuthenticatedRequest, res: Response<ApiResponse>, next) => {
  try {
    const parsed = createWorkspaceSchema.safeParse(req.body);
    if (!parsed.success) {
      throw new ValidationError('Invalid input', parsed.error.flatten());
    }

    // Check tenant manage permission
    const canManage = await checkPermission(
      formatUser(req.userId!),
      'can_manage',
      formatTenant(parsed.data.tenant_id)
    );

    if (!canManage) {
      throw new ForbiddenError('No permission to create workspaces in this tenant');
    }

    const workspace = await workspacesService.create(parsed.data, req.userId!);

    res.status(201).json({
      success: true,
      data: workspace,
    });
  } catch (error) {
    next(error);
  }
});

/**
 * PATCH /workspaces/:workspaceId
 * Update workspace
 */
router.patch('/:workspaceId', authenticate, canManageWorkspace, async (req: AuthenticatedRequest, res: Response<ApiResponse>, next) => {
  try {
    const parsed = updateWorkspaceSchema.safeParse(req.body);
    if (!parsed.success) {
      throw new ValidationError('Invalid input', parsed.error.flatten());
    }

    const workspace = await workspacesService.update(req.params.workspaceId, parsed.data);

    res.json({
      success: true,
      data: workspace,
    });
  } catch (error) {
    next(error);
  }
});

/**
 * DELETE /workspaces/:workspaceId
 * Delete workspace
 */
router.delete('/:workspaceId', authenticate, canManageWorkspace, async (req: AuthenticatedRequest, res: Response<ApiResponse>, next) => {
  try {
    await workspacesService.delete(req.params.workspaceId);

    res.json({
      success: true,
      data: { message: 'Workspace deleted successfully' },
    });
  } catch (error) {
    next(error);
  }
});

/**
 * GET /workspaces/:workspaceId/members
 * Get workspace members
 */
router.get('/:workspaceId/members', authenticate, canReadWorkspace, async (req: AuthenticatedRequest, res: Response<ApiResponse>, next) => {
  try {
    const members = await workspacesService.getMembers(req.params.workspaceId);

    res.json({
      success: true,
      data: members,
    });
  } catch (error) {
    next(error);
  }
});

/**
 * POST /workspaces/:workspaceId/members
 * Add member to workspace
 */
router.post('/:workspaceId/members', authenticate, canManageWorkspace, async (req: AuthenticatedRequest, res: Response<ApiResponse>, next) => {
  try {
    const parsed = addMemberSchema.safeParse(req.body);
    if (!parsed.success) {
      throw new ValidationError('Invalid input', parsed.error.flatten());
    }

    await workspacesService.addMember(
      req.params.workspaceId,
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
 * PATCH /workspaces/:workspaceId/members/:userId
 * Update member role
 */
router.patch('/:workspaceId/members/:userId', authenticate, canManageWorkspace, async (req: AuthenticatedRequest, res: Response<ApiResponse>, next) => {
  try {
    const parsed = updateMemberRoleSchema.safeParse(req.body);
    if (!parsed.success) {
      throw new ValidationError('Invalid input', parsed.error.flatten());
    }

    await workspacesService.updateMemberRole(
      req.params.workspaceId,
      req.params.userId,
      parsed.data.old_role,
      parsed.data.new_role
    );

    res.json({
      success: true,
      data: { message: 'Member role updated successfully' },
    });
  } catch (error) {
    next(error);
  }
});

/**
 * DELETE /workspaces/:workspaceId/members/:userId
 * Remove member from workspace
 */
router.delete('/:workspaceId/members/:userId', authenticate, canManageWorkspace, async (req: AuthenticatedRequest, res: Response<ApiResponse>, next) => {
  try {
    const { role } = req.query;

    if (!role || !['admin', 'member', 'viewer'].includes(role as string)) {
      throw new ValidationError('Valid role query parameter is required');
    }

    await workspacesService.removeMember(
      req.params.workspaceId,
      req.params.userId,
      role as 'admin' | 'member' | 'viewer'
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
