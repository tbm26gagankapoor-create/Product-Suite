/**
 * Authorization Service
 *
 * Handles all authorization operations using OpenFGA.
 * Provides methods for checking permissions and managing relationships.
 */

import {
  fgaClient,
  formatUser,
  formatWorkspace,
  formatTask,
  formatTenant,
  formatPlatform,
} from './openfga-client';
import type {
  AuthorizationTuple,
  TaskPermissions,
  WorkspacePermissions,
  TaskPermission,
  WorkspacePermission,
  Relation,
} from './types';

export class AuthorizationService {
  // ============================================
  // Permission Checks
  // ============================================

  /**
   * Check if a user has a specific permission on an object
   */
  async check(userId: string, permission: string, object: string): Promise<boolean> {
    try {
      const response = await fgaClient.check({
        user: formatUser(userId),
        relation: permission,
        object,
      });
      return response.allowed ?? false;
    } catch (error) {
      console.error('Authorization check failed:', error);
      return false;
    }
  }

  /**
   * Get all task permissions for a user
   */
  async getTaskPermissions(userId: string, taskId: string): Promise<TaskPermissions> {
    const taskObject = formatTask(taskId);
    const permissions: TaskPermission[] = [
      'can_read',
      'can_comment',
      'can_manage_stages',
      'can_manage_fields',
      'can_delete',
      'can_assign',
    ];

    const results = await Promise.all(
      permissions.map((perm) => this.check(userId, perm, taskObject))
    );

    return {
      canRead: results[0],
      canComment: results[1],
      canManageStages: results[2],
      canManageFields: results[3],
      canDelete: results[4],
      canAssign: results[5],
    };
  }

  /**
   * Get all workspace permissions for a user
   */
  async getWorkspacePermissions(
    userId: string,
    workspaceId: string
  ): Promise<WorkspacePermissions> {
    const workspaceObject = formatWorkspace(workspaceId);
    const permissions: WorkspacePermission[] = ['can_read', 'can_write', 'can_manage'];

    const results = await Promise.all(
      permissions.map((perm) => this.check(userId, perm, workspaceObject))
    );

    return {
      canRead: results[0],
      canWrite: results[1],
      canManage: results[2],
    };
  }

  // ============================================
  // Relationship Management
  // ============================================

  /**
   * Write authorization tuples (create relationships)
   */
  async writeTuples(tuples: AuthorizationTuple[]): Promise<void> {
    try {
      await fgaClient.write({
        writes: tuples.map((t) => ({
          user: t.user,
          relation: t.relation,
          object: t.object,
        })),
      });
    } catch (error) {
      console.error('Failed to write tuples:', error);
      throw error;
    }
  }

  /**
   * Delete authorization tuples (remove relationships)
   */
  async deleteTuples(tuples: AuthorizationTuple[]): Promise<void> {
    try {
      await fgaClient.write({
        deletes: tuples.map((t) => ({
          user: t.user,
          relation: t.relation,
          object: t.object,
        })),
      });
    } catch (error) {
      console.error('Failed to delete tuples:', error);
      throw error;
    }
  }

  // ============================================
  // Task Authorization Helpers
  // ============================================

  /**
   * Create authorization tuples when a task is created
   */
  async onTaskCreated(
    taskId: string,
    workspaceId: string,
    reporterId: string,
    assigneeId?: string
  ): Promise<void> {
    const tuples: AuthorizationTuple[] = [
      {
        user: formatWorkspace(workspaceId),
        relation: 'workspace' as Relation,
        object: formatTask(taskId),
      },
      {
        user: formatUser(reporterId),
        relation: 'reporter' as Relation,
        object: formatTask(taskId),
      },
    ];

    if (assigneeId) {
      tuples.push({
        user: formatUser(assigneeId),
        relation: 'assignee' as Relation,
        object: formatTask(taskId),
      });
    }

    await this.writeTuples(tuples);
  }

  /**
   * Update assignee relationship when task is reassigned
   */
  async onTaskAssigneeChanged(
    taskId: string,
    oldAssigneeId: string | null,
    newAssigneeId: string | null
  ): Promise<void> {
    const taskObject = formatTask(taskId);

    // Remove old assignee
    if (oldAssigneeId) {
      await this.deleteTuples([
        {
          user: formatUser(oldAssigneeId),
          relation: 'assignee' as Relation,
          object: taskObject,
        },
      ]);
    }

    // Add new assignee
    if (newAssigneeId) {
      await this.writeTuples([
        {
          user: formatUser(newAssigneeId),
          relation: 'assignee' as Relation,
          object: taskObject,
        },
      ]);
    }
  }

  /**
   * Clean up authorization tuples when a task is deleted
   */
  async onTaskDeleted(
    taskId: string,
    workspaceId: string,
    reporterId: string,
    assigneeId?: string
  ): Promise<void> {
    const tuples: AuthorizationTuple[] = [
      {
        user: formatWorkspace(workspaceId),
        relation: 'workspace' as Relation,
        object: formatTask(taskId),
      },
      {
        user: formatUser(reporterId),
        relation: 'reporter' as Relation,
        object: formatTask(taskId),
      },
    ];

    if (assigneeId) {
      tuples.push({
        user: formatUser(assigneeId),
        relation: 'assignee' as Relation,
        object: formatTask(taskId),
      });
    }

    await this.deleteTuples(tuples);
  }

  // ============================================
  // Workspace Authorization Helpers
  // ============================================

  /**
   * Add a user to a workspace with a specific role
   */
  async addUserToWorkspace(
    userId: string,
    workspaceId: string,
    role: 'admin' | 'member' | 'viewer'
  ): Promise<void> {
    await this.writeTuples([
      {
        user: formatUser(userId),
        relation: role as Relation,
        object: formatWorkspace(workspaceId),
      },
    ]);
  }

  /**
   * Remove a user from a workspace
   */
  async removeUserFromWorkspace(
    userId: string,
    workspaceId: string,
    role: 'admin' | 'member' | 'viewer'
  ): Promise<void> {
    await this.deleteTuples([
      {
        user: formatUser(userId),
        relation: role as Relation,
        object: formatWorkspace(workspaceId),
      },
    ]);
  }

  /**
   * Link a workspace to a tenant
   */
  async linkWorkspaceToTenant(workspaceId: string, tenantId: string): Promise<void> {
    await this.writeTuples([
      {
        user: formatTenant(tenantId),
        relation: 'tenant' as Relation,
        object: formatWorkspace(workspaceId),
      },
    ]);
  }

  // ============================================
  // Tenant Authorization Helpers
  // ============================================

  /**
   * Add a user to a tenant with a specific role
   */
  async addUserToTenant(
    userId: string,
    tenantId: string,
    role: 'admin' | 'member'
  ): Promise<void> {
    await this.writeTuples([
      {
        user: formatUser(userId),
        relation: role as Relation,
        object: formatTenant(tenantId),
      },
    ]);
  }

  /**
   * Link a tenant to a platform
   */
  async linkTenantToPlatform(tenantId: string, platformId: string): Promise<void> {
    await this.writeTuples([
      {
        user: formatPlatform(platformId),
        relation: 'platform' as Relation,
        object: formatTenant(tenantId),
      },
    ]);
  }

  // ============================================
  // Platform Authorization Helpers
  // ============================================

  /**
   * Add a platform admin
   */
  async addPlatformAdmin(userId: string, platformId: string): Promise<void> {
    await this.writeTuples([
      {
        user: formatUser(userId),
        relation: 'admin' as Relation,
        object: formatPlatform(platformId),
      },
    ]);
  }
}

export const authorizationService = new AuthorizationService();
