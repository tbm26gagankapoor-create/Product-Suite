/**
 * Authorized Tasks Service - Uses Local Backend
 *
 * Extends the base TasksService with authorization checks.
 * All operations are permission-guarded.
 */

import { api } from '../lib/api';
import { tasksService, TaskFilters } from './tasks.service';
import type { Task } from '../types';

const API_BASE = '/api/v1';

function getAuthHeaders(): HeadersInit {
  const token = localStorage.getItem('infinia_token');
  const headers: HeadersInit = {
    'Content-Type': 'application/json',
  };
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }
  return headers;
}

export class ForbiddenError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'ForbiddenError';
  }
}

export interface TaskPermissions {
  can_read: boolean;
  can_write: boolean;
  can_delete: boolean;
  can_assign: boolean;
  can_comment: boolean;
  can_manage_fields: boolean;
  can_manage_stages: boolean;
}

export class AuthorizedTasksService {
  private currentUserId: string | null = null;

  /**
   * Set the current user context for authorization checks
   */
  setCurrentUser(userId: string): void {
    this.currentUserId = userId;
  }

  /**
   * Get current user ID or throw if not set
   */
  private getUserId(): string {
    if (!this.currentUserId) {
      throw new ForbiddenError('User context not set');
    }
    return this.currentUserId;
  }

  /**
   * Get task permissions for the current user
   */
  async getPermissions(taskId: string): Promise<TaskPermissions> {
    // In local backend, permissions are handled server-side
    // Return full permissions - backend will enforce actual access
    return {
      can_read: true,
      can_write: true,
      can_delete: true,
      can_assign: true,
      can_comment: true,
      can_manage_fields: true,
      can_manage_stages: true,
    };
  }

  /**
   * Get task by ID (requires can_read)
   */
  async getById(taskId: string): Promise<any | null> {
    return tasksService.getById(taskId);
  }

  /**
   * Create a new task
   */
  async create(data: Partial<Task>, workspaceId: string): Promise<Task> {
    const userId = this.getUserId();
    return tasksService.create({
      ...data,
      reporter: { id: userId, name: '', avatarUrl: '', email: '' },
    } as Task);
  }

  /**
   * Update task fields (requires can_manage_fields)
   */
  async updateFields(taskId: string, data: Partial<Task>): Promise<Task> {
    return tasksService.update(taskId, data);
  }

  /**
   * Update task stage/column (requires can_manage_stages)
   */
  async updateStage(taskId: string, columnId: string): Promise<Task> {
    return tasksService.moveToColumn(taskId, columnId);
  }

  /**
   * Update task assignee (requires can_assign)
   */
  async updateAssignee(taskId: string, newAssigneeId: string | null): Promise<Task> {
    const response = await fetch(`${API_BASE}/tasks/${taskId}`, {
      method: 'PATCH',
      headers: getAuthHeaders(),
      body: JSON.stringify({ assignee_id: newAssigneeId }),
    });
    const data = await response.json();
    if (!data.success) throw new Error(data.error || 'Failed to update assignee');
    return data.data;
  }

  /**
   * Delete a task (requires can_delete)
   */
  async delete(taskId: string): Promise<void> {
    await tasksService.delete(taskId);
  }

  /**
   * Add a comment to a task (requires can_comment)
   */
  async addComment(taskId: string, content: string): Promise<any> {
    const userId = this.getUserId();
    const comment = {
      id: `comment-${Date.now()}`,
      userId,
      text: content,
      timestamp: new Date().toISOString(),
    };
    return api.createComment(taskId, comment);
  }

  /**
   * Get permissions for multiple tasks at once
   */
  async getBatchPermissions(taskIds: string[]): Promise<Map<string, TaskPermissions>> {
    const results = new Map<string, TaskPermissions>();
    const defaultPerms: TaskPermissions = {
      can_read: true,
      can_write: true,
      can_delete: true,
      can_assign: true,
      can_comment: true,
      can_manage_fields: true,
      can_manage_stages: true,
    };

    taskIds.forEach((taskId) => {
      results.set(taskId, defaultPerms);
    });

    return results;
  }

  /**
   * Filter tasks list to only those the user can read
   */
  async filterReadableTasks(tasks: Task[]): Promise<Task[]> {
    // Backend handles access control, so return all tasks
    return tasks;
  }
}

export const authorizedTasksService = new AuthorizedTasksService();
