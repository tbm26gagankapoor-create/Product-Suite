/**
 * Projects Service - Uses Local Backend
 * All Supabase calls have been replaced with local backend API calls
 */

import { api } from '../lib/api';

export interface ProjectInsert {
  name: string;
  key?: string;
  code?: string;
  description?: string;
  owner_id?: string;
  organization_id?: string;
}

export interface ProjectUpdate {
  name?: string;
  description?: string;
  status?: string;
}

export class ProjectsService {
  // Get all projects with optional pagination
  async getAll(pagination?: { page?: number; limit?: number }, organizationId?: string): Promise<{ data: any[]; count: number }> {
    const projects = await api.getProjects();
    return { data: projects, count: projects.length };
  }

  // Get all projects for the current user's organization
  async getAllForCurrentOrg(pagination?: { page?: number; limit?: number }): Promise<{ data: any[]; count: number }> {
    return this.getAll(pagination);
  }

  // Get project by ID with owner and member details
  async getById(id: string): Promise<any | null> {
    const projects = await api.getProjects();
    return projects.find((p: any) => p.id === id) || null;
  }

  // Create new project
  async create(data: ProjectInsert, memberIds: string[] = []): Promise<any> {
    const project = await api.createProject({
      id: '',
      name: data.name,
      key: data.key || data.code || '',
      description: data.description,
      ownerId: data.owner_id,
      organizationId: data.organization_id,
      members: [],
      progress: 0,
    });
    return project;
  }

  // Update project
  async update(id: string, data: ProjectUpdate): Promise<any> {
    const project = await this.getById(id);
    if (!project) throw new Error('Project not found');
    return api.updateProject({ ...project, ...data });
  }

  // Delete project
  async delete(id: string): Promise<void> {
    await api.deleteProject(id);
  }
}

export const projectsService = new ProjectsService();
