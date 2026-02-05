/**
 * Tasks Service - Uses Centralized HTTP Client
 */

import { Task } from '../types';
import { httpClient, buildQueryString } from '../lib/httpClient';
import { mapTask, mapTasks, mapTaskToBackend, mapUsers } from '../lib/mappers';

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
  async getAll(
    filters?: TaskFilters,
    pagination?: { page?: number; limit?: number }
  ): Promise<{ data: Task[]; count: number }> {
    try {
      // First get users for mapping
      const usersResponse = await httpClient.get<any[]>('/users');
      const users = mapUsers(usersResponse || []);

      // Build query
      const query = buildQueryString({
        project_id: filters?.projectId,
        sprint_id: filters?.sprintId,
        assignee_id: filters?.assigneeId,
        reporter_id: filters?.reporterId,
        type: Array.isArray(filters?.type) ? filters.type.join(',') : filters?.type,
        priority: Array.isArray(filters?.priority) ? filters.priority.join(',') : filters?.priority,
        search: filters?.search,
        page: pagination?.page,
        limit: pagination?.limit,
      });

      const response = await httpClient.get<any[]>(`/tasks${query}`);
      const tasks = mapTasks(response || [], users);
      return { data: tasks, count: tasks.length };
    } catch {
      return { data: [], count: 0 };
    }
  }

  // Get all tasks with relations
  async getAllWithRelations(filters?: TaskFilters): Promise<Task[]> {
    const { data } = await this.getAll(filters);
    return data;
  }

  // Get task by ID
  async getById(id: string): Promise<any | null> {
    try {
      const response = await httpClient.get<any>(`/tasks/${id}`);
      return response;
    } catch {
      return null;
    }
  }

  // Create task
  async create(task: Partial<Task>): Promise<Task> {
    const backendData = mapTaskToBackend(task);
    const response = await httpClient.post<any>('/tasks', backendData);

    // Get users for proper mapping
    const usersResponse = await httpClient.get<any[]>('/users');
    const users = mapUsers(usersResponse || []);

    return mapTask(response, users);
  }

  // Update task
  async update(id: string, updates: Partial<Task>): Promise<Task> {
    const backendUpdates = mapTaskToBackend(updates);
    const response = await httpClient.patch<any>(`/tasks/${id}`, backendUpdates);

    // Get users for proper mapping
    const usersResponse = await httpClient.get<any[]>('/users');
    const users = mapUsers(usersResponse || []);

    return mapTask(response, users);
  }

  // Delete task
  async delete(id: string): Promise<void> {
    await httpClient.delete(`/tasks/${id}`);
  }

  // Move task to column
  async moveToColumn(taskId: string, columnId: string): Promise<Task> {
    return this.update(taskId, { columnId } as Partial<Task>);
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
      byAssigneeMap: new Map<string, { user: any; count: number }>(),
    };

    tasks.forEach((t: Task) => {
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
      byAssignee: Array.from(stats.byAssigneeMap.values()),
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
    try {
      const response = await httpClient.get<{ blockedBy: TaskLink[]; blocks: TaskLink[] }>(
        `/tasks/${taskId}/links`
      );
      return response || { blockedBy: [], blocks: [] };
    } catch {
      return { blockedBy: [], blocks: [] };
    }
  }

  // Add a blocking task (this task is blocked by blockingTaskId)
  async addBlockingTask(taskId: string, blockingTaskId: string): Promise<TaskLink> {
    return httpClient.post<TaskLink>(`/tasks/${taskId}/links`, {
      blocking_task_id: blockingTaskId,
      link_type: 'blocks',
    });
  }

  // Remove a task link
  async removeTaskLink(taskId: string, linkId: string): Promise<void> {
    await httpClient.delete(`/tasks/${taskId}/links/${linkId}`);
  }

  // Get tasks available for linking
  async getAvailableLinksForTask(taskId: string): Promise<AvailableTask[]> {
    try {
      const response = await httpClient.get<AvailableTask[]>(`/tasks/${taskId}/available-links`);
      return response || [];
    } catch {
      return [];
    }
  }
}

export const tasksService = new TasksService();
