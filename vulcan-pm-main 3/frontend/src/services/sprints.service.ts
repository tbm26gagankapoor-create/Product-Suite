/**
 * Sprints Service - Uses Local Backend
 * All Supabase calls have been replaced with local backend API calls
 */

import { api } from '../lib/api';
import { Sprint } from '../types';

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

export interface SprintFilters {
  projectId?: string;
  status?: string | string[];
  search?: string;
}

export class SprintsService {
  // Get all sprints with optional filters
  async getAll(filters?: SprintFilters, pagination?: { page?: number; limit?: number }): Promise<{ data: any[]; count: number }> {
    const sprints = await api.getSprints();
    let filtered = sprints;

    if (filters?.projectId) {
      filtered = filtered.filter(s => s.projectId === filters.projectId);
    }
    if (filters?.status) {
      const statuses = Array.isArray(filters.status) ? filters.status : [filters.status];
      filtered = filtered.filter(s => statuses.includes(s.status));
    }
    if (filters?.search) {
      const search = filters.search.toLowerCase();
      filtered = filtered.filter(s => s.name.toLowerCase().includes(search));
    }

    return { data: filtered, count: filtered.length };
  }

  // Get sprints for a specific project
  async getByProject(projectId: string): Promise<any[]> {
    const { data } = await this.getAll({ projectId });
    return data;
  }

  // Get sprint by ID
  async getById(id: string): Promise<any | null> {
    const response = await fetch(`${API_BASE}/sprints/${id}`, {
      headers: getAuthHeaders(),
    });
    const data = await response.json();
    return data.success ? data.data : null;
  }

  // Get active sprint for a project
  async getActiveSprint(projectId: string): Promise<any | null> {
    const response = await fetch(`${API_BASE}/sprints/project/${projectId}/active`, {
      headers: getAuthHeaders(),
    });
    const data = await response.json();
    return data.success ? data.data : null;
  }

  // Create new sprint
  async create(sprint: Partial<Sprint>): Promise<Sprint> {
    return api.createSprint(sprint as Sprint);
  }

  // Update sprint
  async update(id: string, updates: Partial<Sprint>): Promise<any> {
    const response = await fetch(`${API_BASE}/sprints/${id}`, {
      method: 'PATCH',
      headers: getAuthHeaders(),
      body: JSON.stringify(updates),
    });
    const data = await response.json();
    if (!data.success) throw new Error(data.error || 'Failed to update sprint');
    return data.data;
  }

  // Delete sprint
  async delete(id: string, moveTasksToBacklog: boolean = true): Promise<void> {
    await fetch(`${API_BASE}/sprints/${id}`, {
      method: 'DELETE',
      headers: getAuthHeaders(),
    });
  }

  // Start sprint
  async startSprint(id: string): Promise<any> {
    const response = await fetch(`${API_BASE}/sprints/${id}/start`, {
      method: 'POST',
      headers: getAuthHeaders(),
    });
    const data = await response.json();
    if (!data.success) throw new Error(data.error || 'Failed to start sprint');
    return data.data;
  }

  // Complete sprint
  async completeSprint(id: string, moveIncompleteTo: string | 'backlog' = 'backlog'): Promise<any> {
    const response = await fetch(`${API_BASE}/sprints/${id}/complete`, {
      method: 'POST',
      headers: getAuthHeaders(),
    });
    const data = await response.json();
    if (!data.success) throw new Error(data.error || 'Failed to complete sprint');
    return data.data;
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
        velocity: 0
      };
    }

    return {
      totalTasks: sprint.total_tasks || 0,
      completedTasks: sprint.completed_tasks || 0,
      totalPoints: sprint.total_points || 0,
      completedPoints: sprint.completed_points || 0,
      tasksByStatus: {},
      tasksByType: {},
      velocity: sprint.completed_points || 0
    };
  }

  // Get tasks in sprint
  async getTasks(sprintId: string): Promise<any[]> {
    const users = await api.getUsers();
    const tasks = await api.getTasks(users);
    return tasks.filter(t => t.sprintId === sprintId);
  }

  // Add task to sprint
  async addTask(sprintId: string, taskId: string): Promise<void> {
    await fetch(`${API_BASE}/tasks/${taskId}`, {
      method: 'PATCH',
      headers: getAuthHeaders(),
      body: JSON.stringify({ sprint_id: sprintId }),
    });
  }

  // Remove task from sprint
  async removeTask(sprintId: string, taskId: string): Promise<void> {
    await fetch(`${API_BASE}/tasks/${taskId}`, {
      method: 'PATCH',
      headers: getAuthHeaders(),
      body: JSON.stringify({ sprint_id: null }),
    });
  }

  // Bulk add tasks
  async addTasks(sprintId: string, taskIds: string[]): Promise<void> {
    for (const taskId of taskIds) {
      await this.addTask(sprintId, taskId);
    }
  }

  // Get burndown chart data
  async getBurndownData(sprintId: string): Promise<{ date: string; remaining: number; ideal: number }[]> {
    const sprint = await this.getById(sprintId);
    if (!sprint) return [];

    const startDate = new Date(sprint.start_date || sprint.startDate);
    const endDate = new Date(sprint.end_date || sprint.endDate);
    const totalDays = Math.ceil((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24));
    const totalPoints = sprint.total_points || 0;

    const data = [];
    const pointsPerDay = totalPoints / totalDays;

    for (let i = 0; i <= totalDays; i++) {
      const d = new Date(startDate);
      d.setDate(d.getDate() + i);
      const dateStr = d.toISOString().split('T')[0];
      const ideal = Math.max(0, totalPoints - (pointsPerDay * i));

      data.push({
        date: dateStr,
        remaining: Math.round(ideal),
        ideal: Math.round(ideal)
      });
    }

    return data;
  }

  // Get velocity history for project
  async getVelocityHistory(projectId: string, lastN: number = 5): Promise<{ sprintId: string; sprintName: string; completedPoints: number }[]> {
    const { data: sprints } = await this.getAll({ projectId, status: 'completed' });
    return sprints.slice(0, lastN).map(s => ({
      sprintId: s.id,
      sprintName: s.name,
      completedPoints: s.completed_points || 0
    }));
  }
}

export const sprintsService = new SprintsService();
