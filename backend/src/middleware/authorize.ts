import { Response, NextFunction } from 'express';
import { checkPermission, formatUser, formatTask, formatWorkspace } from '../lib/openfga.js';
import { ForbiddenError } from '../utils/errors.js';
import type { AuthenticatedRequest } from '../types/index.js';

type ResourceType = 'task' | 'workspace' | 'tenant' | 'platform';
type Permission = string;

/**
 * Authorization middleware factory
 * Creates middleware that checks if user has permission on a resource
 */
export function authorize(
  resourceType: ResourceType,
  permission: Permission,
  getResourceId: (req: AuthenticatedRequest) => string | undefined
) {
  return async (
    req: AuthenticatedRequest,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      const userId = req.userId;
      if (!userId) {
        throw new ForbiddenError('User not authenticated');
      }

      const resourceId = getResourceId(req);
      if (!resourceId) {
        throw new ForbiddenError('Resource ID not provided');
      }

      const user = formatUser(userId);
      const object = formatResource(resourceType, resourceId);

      const allowed = await checkPermission(user, permission, object);

      if (!allowed) {
        throw new ForbiddenError(
          `You don't have ${permission} permission on this ${resourceType}`
        );
      }

      next();
    } catch (error) {
      next(error);
    }
  };
}

/**
 * Format resource ID to OpenFGA object format
 */
function formatResource(type: ResourceType, id: string): string {
  switch (type) {
    case 'task':
      return formatTask(id);
    case 'workspace':
      return formatWorkspace(id);
    case 'tenant':
      return `tenant:${id}`;
    case 'platform':
      return `platform:${id}`;
    default:
      return `${type}:${id}`;
  }
}

// Pre-built authorization middlewares for common operations

/**
 * Task permissions
 */
export const canReadTask = authorize('task', 'can_read', (req) => req.params.taskId);
export const canCommentTask = authorize('task', 'can_comment', (req) => req.params.taskId);
export const canManageTaskStages = authorize('task', 'can_manage_stages', (req) => req.params.taskId);
export const canManageTaskFields = authorize('task', 'can_manage_fields', (req) => req.params.taskId);
export const canDeleteTask = authorize('task', 'can_delete', (req) => req.params.taskId);
export const canAssignTask = authorize('task', 'can_assign', (req) => req.params.taskId);

/**
 * Workspace permissions
 */
export const canReadWorkspace = authorize('workspace', 'can_read', (req) => req.params.workspaceId);
export const canWriteWorkspace = authorize('workspace', 'can_write', (req) => req.params.workspaceId);
export const canManageWorkspace = authorize('workspace', 'can_manage', (req) => req.params.workspaceId);

/**
 * Tenant permissions
 */
export const canReadTenant = authorize('tenant', 'can_read', (req) => req.params.tenantId);
export const canManageTenant = authorize('tenant', 'can_manage', (req) => req.params.tenantId);
