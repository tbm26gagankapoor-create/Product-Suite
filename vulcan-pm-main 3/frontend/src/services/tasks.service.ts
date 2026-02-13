/**
 * Tasks Service - Uses Local Backend
 * All Supabase calls have been replaced with local backend API calls
 */

import { api } from '../lib/api';
import { Task } from '../types';

const API_BASE = '/api/v1';

// Task Link types
export interface TaskLink {
  id: string;
  blocking_task_id: string;
  blocked_task_id: string;
  link_type: 'blocks' | 'relates_to' | 'duplicates';
  created_by: string | null;
  created_at: string;
  blocking_task?: {
    id: string;
    task_key: string;
    title: string;
    type: string;
    priority: string;
    column_id: string;
  };
  blocked_task?: {
    id: string;
    task_key: string;
    title: string;
    type: string;
    priority: string;
    column_id: string;
  };
}

export interface AvailableTask {
  id: string;
  task_key: string;
  title: string;
  type: string;
  priority: string;
}

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

export interface TaskFilters {
  projectId?: string;
  sprintId?: string | null;
  columnId?: string | string[];
  type?: string | string[];
  priority?: string | string[];
  assigneeId?: string | null;
  reporterId?: string;
  parentEpicId?: string | null;
  search?: string;
  tags?: string[];
  isOverdue?: boolean;
}

export class TasksService {
  // Get all tasks
  async getAll(filters?: TaskFilters, pagination?: { page?: number; limit?: number }): Promise<{ data: any[]; count: number }> {
    const users = await api.getUsers();
    const tasks = await api.getTasks(users);

    let filtered = tasks;

    if (filters?.projectId) {
      filtered = filtered.filter(t => t.projectId === filters.projectId);
    }
    if (filters?.sprintId !== undefined) {
      filtered = filters.sprintId === null
        ? filtered.filter(t => !t.sprintId)
        : filtered.filter(t => t.sprintId === filters.sprintId);
    }
    if (filters?.assigneeId) {
      filtered = filtered.filter(t => t.assignee?.id === filters.assigneeId);
    }
    if (filters?.type) {
      const types = Array.isArray(filters.type) ? filters.type : [filters.type];
      filtered = filtered.filter(t => types.includes(t.type));
    }

    return { data: filtered, count: filtered.length };
  }

  // Get all tasks with relations
  async getAllWithRelations(filters?: TaskFilters): Promise<any[]> {
    const { data } = await this.getAll(filters);
    return data;
  }

  // Get task by ID
  async getById(id: string): Promise<any | null> {
    const response = await fetch(`${API_BASE}/tasks/${id}`, {
      headers: getAuthHeaders(),
    });
    const data = await response.json();
    return data.success ? data.data : null;
  }

  // Create task
  async create(task: Partial<Task>): Promise<Task> {
    return api.createTask(task as Task);
  }

  // Update task
  async update(id: string, updates: Partial<Task>): Promise<Task> {
    const task = await this.getById(id);
    if (!task) throw new Error('Task not found');
    return api.updateTask({ ...task, ...updates, uuid: id });
  }

  // Delete task
  async delete(id: string): Promise<void> {
    await api.deleteTask(id);
  }

  // Move task to column
  async moveToColumn(taskId: string, columnId: string): Promise<Task> {
    return this.update(taskId, { columnId });
  }

  // Get project statistics
  async getProjectStats(projectId: string): Promise<{
    byStatus: Record<string, number>;
    byType: Record<string, number>;
    byPriority: Record<string, number>;
    byAssignee: { user: any; count: number }[];
  }> {
    const { data: tasks } = await this.getAll({ projectId });

    const stats = {
      byStatus: {} as Record<string, number>,
      byType: {} as Record<string, number>,
      byPriority: {} as Record<string, number>,
      byAssigneeMap: new Map<string, { user: any; count: number }>()
    };

    tasks.forEach((t: any) => {
      stats.byStatus[t.columnId] = (stats.byStatus[t.columnId] || 0) + 1;
      stats.byType[t.type] = (stats.byType[t.type] || 0) + 1;
      stats.byPriority[t.priority] = (stats.byPriority[t.priority] || 0) + 1;

      if (t.assignee) {
        if (!stats.byAssigneeMap.has(t.assignee.id)) {
          stats.byAssigneeMap.set(t.assignee.id, { user: t.assignee, count: 0 });
        }
        stats.byAssigneeMap.get(t.assignee.id)!.count++;
      }
    });

    return {
      byStatus: stats.byStatus,
      byType: stats.byType,
      byPriority: stats.byPriority,
      byAssignee: Array.from(stats.byAssigneeMap.values())
    };
  }

  // Log activity (stub - activity logging handled by backend)
  async logActivity(taskId: string, action: string, changes?: any): Promise<void> {
    console.log('Activity logged:', { taskId, action, changes });
  }

  // ============================================
  // Task Links (Dependencies)
  // ============================================

  // Get all task links (blocked by and blocks)
  async getTaskLinks(taskId: string): Promise<{ blockedBy: TaskLink[]; blocks: TaskLink[] }> {
    const response = await fetch(`${API_BASE}/tasks/${taskId}/links`, {
      headers: getAuthHeaders(),
    });
    const data = await response.json();
    return data.success ? data.data : { blockedBy: [], blocks: [] };
  }

  // Add a blocking task (this task is blocked by blockingTaskId)
  async addBlockingTask(taskId: string, blockingTaskId: string): Promise<TaskLink> {
    const response = await fetch(`${API_BASE}/tasks/${taskId}/links`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify({
        blocking_task_id: blockingTaskId,
        link_type: 'blocks',
      }),
    });
    const data = await response.json();
    if (!data.success) {
      throw new Error(data.error?.message || 'Failed to add blocking task');
    }
    return data.data;
  }

  // Remove a task link
  async removeTaskLink(taskId: string, linkId: string): Promise<void> {
    const response = await fetch(`${API_BASE}/tasks/${taskId}/links/${linkId}`, {
      method: 'DELETE',
      headers: getAuthHeaders(),
    });
    const data = await response.json();
    if (!data.success) {
      throw new Error(data.error?.message || 'Failed to remove link');
    }
  }

  // Get tasks available for linking
  async getAvailableLinksForTask(taskId: string): Promise<AvailableTask[]> {
    const response = await fetch(`${API_BASE}/tasks/${taskId}/available-links`, {
      headers: getAuthHeaders(),
    });
    const data = await response.json();
    return data.success ? data.data : [];
  }
}

export const tasksService = new TasksService();
