/**
 * Local Backend API Service - Uses Centralized HTTP Client
 * Calls the local Express backend with JWT authentication
 */

import { httpClient } from '../lib/httpClient';
import { mapProject, mapProjectToBackend } from '../lib/mappers';

export const localApi = {
  // Projects
  async getProjects() {
    return httpClient.get<any[]>('/projects');
  },

  async getProject(id: string) {
    return httpClient.get<any>(`/projects/${id}`);
  },

  async createProject(project: any) {
    const backendData = {
      name: project.name,
      code: project.key || project.code,
      description: project.description,
      owner_id: project.ownerId,
    };
    return httpClient.post<any>('/projects', backendData);
  },

  async updateProject(id: string, updates: any) {
    return httpClient.patch<any>(`/projects/${id}`, updates);
  },

  async deleteProject(id: string) {
    return httpClient.delete(`/projects/${id}`);
  },

  // Tasks
  async getTasks(filters?: Record<string, string>) {
    const params = filters ? new URLSearchParams(filters).toString() : '';
    return httpClient.get<any[]>(`/tasks${params ? `?${params}` : ''}`);
  },

  async getTask(id: string) {
    return httpClient.get<any>(`/tasks/${id}`);
  },

  async createTask(task: any) {
    return httpClient.post<any>('/tasks', task);
  },

  async updateTask(id: string, updates: any) {
    return httpClient.patch<any>(`/tasks/${id}`, updates);
  },

  async deleteTask(id: string) {
    return httpClient.delete(`/tasks/${id}`);
  },

  // Sprints
  async getSprints(projectId?: string) {
    const params = projectId ? `?project_id=${projectId}` : '';
    return httpClient.get<any[]>(`/sprints${params}`);
  },

  async createSprint(sprint: any) {
    return httpClient.post<any>('/sprints', sprint);
  },

  // Users
  async getUsers() {
    return httpClient.get<any[]>('/users');
  },

  async getCurrentUser() {
    return httpClient.get<any>('/auth/me');
  },
};
