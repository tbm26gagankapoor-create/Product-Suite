/**
 * Sprints Service - Uses Centralized HTTP Client
 */

import { Sprint } from '../types';
import { httpClient, buildQueryString } from '../lib/httpClient';
import { mapSprint, mapSprints, mapSprintToBackend } from '../lib/mappers';

export interface SprintFilters {
  projectId?: string;
  status?: string | string[];
  search?: string;
}

export class SprintsService {
  // Get all sprints with optional filters
  async getAll(
    filters?: SprintFilters,
    pagination?: { page?: number; limit?: number }
  ): Promise<{ data: Sprint[]; count: number }> {
    try {
      const query = buildQueryString({
        project_id: filters?.projectId,
        status: Array.isArray(filters?.status) ? filters.status.join(',') : filters?.status,
        search: filters?.search,
        page: pagination?.page,
        limit: pagination?.limit,
      });

      const response = await httpClient.get<any[]>(`/sprints${query}`);
      const sprints = mapSprints(response);
      return { data: sprints, count: sprints.length };
    } catch {
      return { data: [], count: 0 };
    }
  }

  // Get sprints for a specific project
  async getByProject(projectId: string): Promise<Sprint[]> {
    const { data } = await this.getAll({ projectId });
    return data;
  }

  // Get sprint by ID
  async getById(id: string): Promise<Sprint | null> {
    try {
      const response = await httpClient.get<any>(`/sprints/${id}`);
      return mapSprint(response);
    } catch {
      return null;
    }
  }

  // Get active sprint for a project
  async getActiveSprint(projectId: string): Promise<Sprint | null> {
    try {
      const response = await httpClient.get<any>(`/sprints/project/${projectId}/active`);
      return mapSprint(response);
    } catch {
      return null;
    }
  }

  // Create new sprint
  async create(sprint: Partial<Sprint>): Promise<Sprint> {
    const backendData = mapSprintToBackend(sprint);
    const response = await httpClient.post<any>('/sprints', backendData);
    return mapSprint(response);
  }

  // Update sprint
  async update(id: string, updates: Partial<Sprint>): Promise<Sprint> {
    const backendUpdates = mapSprintToBackend(updates);
    const response = await httpClient.patch<any>(`/sprints/${id}`, backendUpdates);
    return mapSprint(response);
  }

  // Delete sprint
  async delete(id: string, moveTasksToBacklog: boolean = true): Promise<void> {
    await httpClient.delete(`/sprints/${id}`);
  }

  // Start sprint
  async startSprint(id: string): Promise<Sprint> {
    const response = await httpClient.post<any>(`/sprints/${id}/start`);
    return mapSprint(response);
  }

  // Complete sprint
  async completeSprint(
    id: string,
    moveIncompleteTo: string | 'backlog' = 'backlog'
  ): Promise<Sprint> {
    const response = await httpClient.post<any>(`/sprints/${id}/complete`);
    return mapSprint(response);
  }

  // Get sprint statistics
  async getStats(sprintId: string): Promise<{
    totalTasks: number;
    completedTasks: number;
    totalPoints: number;
    completedPoints: number;
    tasksByStatus: Record<string, number>;
    tasksByType: Record<string, number>;
    velocity: number;
  }> {
    const sprint = await this.getById(sprintId);
    if (!sprint) {
      return {
        totalTasks: 0,
        completedTasks: 0,
        totalPoints: 0,
        completedPoints: 0,
        tasksByStatus: {},
        tasksByType: {},
        velocity: 0,
      };
    }

    // Sprint stats can be extended when backend supports it
    return {
      totalTasks: (sprint as any).total_tasks || 0,
      completedTasks: (sprint as any).completed_tasks || 0,
      totalPoints: (sprint as any).total_points || 0,
      completedPoints: (sprint as any).completed_points || 0,
      tasksByStatus: {},
      tasksByType: {},
      velocity: (sprint as any).completed_points || 0,
    };
  }

  // Get tasks in sprint
  async getTasks(sprintId: string): Promise<any[]> {
    try {
      const response = await httpClient.get<any[]>(`/tasks?sprint_id=${sprintId}`);
      return response || [];
    } catch {
      return [];
    }
  }

  // Add task to sprint
  async addTask(sprintId: string, taskId: string): Promise<void> {
    await httpClient.patch(`/tasks/${taskId}`, { sprint_id: sprintId });
  }

  // Remove task from sprint
  async removeTask(sprintId: string, taskId: string): Promise<void> {
    await httpClient.patch(`/tasks/${taskId}`, { sprint_id: null });
  }

  // Bulk add tasks
  async addTasks(sprintId: string, taskIds: string[]): Promise<void> {
    await Promise.all(taskIds.map((taskId) => this.addTask(sprintId, taskId)));
  }

  // Get burndown chart data
  async getBurndownData(
    sprintId: string
  ): Promise<{ date: string; remaining: number; ideal: number }[]> {
    const sprint = await this.getById(sprintId);
    if (!sprint) return [];

    const startDate = new Date(sprint.startDate);
    const endDate = new Date(sprint.endDate);
    const totalDays = Math.ceil((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24));
    const totalPoints = (sprint as any).total_points || 0;

    const data = [];
    const pointsPerDay = totalPoints / totalDays;

    for (let i = 0; i <= totalDays; i++) {
      const d = new Date(startDate);
      d.setDate(d.getDate() + i);
      const dateStr = d.toISOString().split('T')[0];
      const ideal = Math.max(0, totalPoints - pointsPerDay * i);

      data.push({
        date: dateStr,
        remaining: Math.round(ideal),
        ideal: Math.round(ideal),
      });
    }

    return data;
  }

  // Get velocity history for project
  async getVelocityHistory(
    projectId: string,
    lastN: number = 5
  ): Promise<{ sprintId: string; sprintName: string; completedPoints: number }[]> {
    const { data: sprints } = await this.getAll({ projectId, status: 'completed' });
    return sprints.slice(0, lastN).map((s) => ({
      sprintId: s.id,
      sprintName: s.name,
      completedPoints: (s as any).completed_points || 0,
    }));
  }
}

export const sprintsService = new SprintsService();
