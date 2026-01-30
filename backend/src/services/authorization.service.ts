import {
  fgaClient,
  writeTuples,
  deleteTuples,
  checkPermission,
  batchCheck,
  formatUser,
  formatWorkspace,
  formatTask,
  formatTenant,
  formatPlatform,
} from '../lib/openfga.js';
import type { TaskPermissions, WorkspacePermissions } from '../types/index.js';

class AuthorizationService {
  // ============================================
  // Permission Checks
  // ============================================

  async check(userId: string, permission: string, object: string): Promise<boolean> {
    return checkPermission(formatUser(userId), permission, object);
  }

  async getTaskPermissions(userId: string, taskId: string): Promise<TaskPermissions> {
    const taskObject = formatTask(taskId);
    const user = formatUser(userId);

    const results = await batchCheck([
      { user, relation: 'can_read', object: taskObject },
      { user, relation: 'can_comment', object: taskObject },
      { user, relation: 'can_manage_stages', object: taskObject },
      { user, relation: 'can_manage_fields', object: taskObject },
      { user, relation: 'can_delete', object: taskObject },
      { user, relation: 'can_assign', object: taskObject },
    ]);

    return {
      canRead: results[0],
      canComment: results[1],
      canManageStages: results[2],
      canManageFields: results[3],
      canDelete: results[4],
      canAssign: results[5],
    };
  }

  async getWorkspacePermissions(userId: string, workspaceId: string): Promise<WorkspacePermissions> {
    const wsObject = formatWorkspace(workspaceId);
    const user = formatUser(userId);

    const results = await batchCheck([
      { user, relation: 'can_read', object: wsObject },
      { user, relation: 'can_write', object: wsObject },
      { user, relation: 'can_manage', object: wsObject },
    ]);

    return {
      canRead: results[0],
      canWrite: results[1],
      canManage: results[2],
    };
  }

  // ============================================
  // Task Lifecycle
  // ============================================

  async onTaskCreated(
    taskId: string,
    workspaceId: string,
    reporterId: string,
    assigneeId?: string
  ): Promise<void> {
    const tuples = [
      { user: formatWorkspace(workspaceId), relation: 'workspace', object: formatTask(taskId) },
      { user: formatUser(reporterId), relation: 'reporter', object: formatTask(taskId) },
    ];

    if (assigneeId) {
      tuples.push({
        user: formatUser(assigneeId),
        relation: 'assignee',
        object: formatTask(taskId),
      });
    }

    await writeTuples(tuples);
  }

  async onTaskAssigneeChanged(
    taskId: string,
    oldAssigneeId: string | null,
    newAssigneeId: string | null
  ): Promise<void> {
    const taskObject = formatTask(taskId);

    if (oldAssigneeId) {
      await deleteTuples([
        { user: formatUser(oldAssigneeId), relation: 'assignee', object: taskObject },
      ]);
    }

    if (newAssigneeId) {
      await writeTuples([
        { user: formatUser(newAssigneeId), relation: 'assignee', object: taskObject },
      ]);
    }
  }

  async onTaskDeleted(
    taskId: string,
    workspaceId: string,
    reporterId: string,
    assigneeId?: string
  ): Promise<void> {
    const tuples = [
      { user: formatWorkspace(workspaceId), relation: 'workspace', object: formatTask(taskId) },
      { user: formatUser(reporterId), relation: 'reporter', object: formatTask(taskId) },
    ];

    if (assigneeId) {
      tuples.push({
        user: formatUser(assigneeId),
        relation: 'assignee',
        object: formatTask(taskId),
      });
    }

    await deleteTuples(tuples);
  }

  // ============================================
  // Workspace Management
  // ============================================

  async addUserToWorkspace(
    userId: string,
    workspaceId: string,
    role: 'admin' | 'member' | 'viewer'
  ): Promise<void> {
    await writeTuples([
      { user: formatUser(userId), relation: role, object: formatWorkspace(workspaceId) },
    ]);
  }

  async removeUserFromWorkspace(
    userId: string,
    workspaceId: string,
    role: 'admin' | 'member' | 'viewer'
  ): Promise<void> {
    await deleteTuples([
      { user: formatUser(userId), relation: role, object: formatWorkspace(workspaceId) },
    ]);
  }

  async linkWorkspaceToTenant(workspaceId: string, tenantId: string): Promise<void> {
    await writeTuples([
      { user: formatTenant(tenantId), relation: 'tenant', object: formatWorkspace(workspaceId) },
    ]);
  }

  // ============================================
  // Tenant Management
  // ============================================

  async addUserToTenant(
    userId: string,
    tenantId: string,
    role: 'admin' | 'member'
  ): Promise<void> {
    await writeTuples([
      { user: formatUser(userId), relation: role, object: formatTenant(tenantId) },
    ]);
  }

  async removeUserFromTenant(
    userId: string,
    tenantId: string,
    role: 'admin' | 'member'
  ): Promise<void> {
    await deleteTuples([
      { user: formatUser(userId), relation: role, object: formatTenant(tenantId) },
    ]);
  }

  async linkTenantToPlatform(tenantId: string, platformId: string): Promise<void> {
    await writeTuples([
      { user: formatPlatform(platformId), relation: 'platform', object: formatTenant(tenantId) },
    ]);
  }

  // ============================================
  // Platform Management
  // ============================================

  async addPlatformAdmin(userId: string, platformId: string): Promise<void> {
    await writeTuples([
      { user: formatUser(userId), relation: 'admin', object: formatPlatform(platformId) },
    ]);
  }
}

export const authorizationService = new AuthorizationService();
