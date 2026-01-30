
import { supabase } from '../lib/supabase';
import { handleSupabaseError } from '../utils/errors';
import {
  Project,
  ProjectInsert,
  ProjectUpdate,
  ProjectWithDetails,
  PaginationParams
} from '../types/database.types';
import { activityService } from './activity.service';
import { organizationsService } from './organizations.service';

export class ProjectsService {
  // Get all projects with optional pagination (filtered by organization)
  async getAll(pagination?: PaginationParams, organizationId?: string): Promise<{ data: Project[]; count: number }> {
    let query = supabase.from('projects').select('*', { count: 'exact' });

    // Filter by organization if provided
    if (organizationId) {
      query = query.eq('organization_id', organizationId);
    }

    if (pagination?.page && pagination?.limit) {
      const from = (pagination.page - 1) * pagination.limit;
      const to = from + pagination.limit - 1;
      query = query.range(from, to);
    }

    query = query.order('created_at', { ascending: false });

    const { data, error, count } = await query;
    if (error) handleSupabaseError(error);
    return { data: data || [], count: count || 0 };
  }

  // Get all projects for the current user's organization
  async getAllForCurrentOrg(pagination?: PaginationParams): Promise<{ data: Project[]; count: number }> {
    const org = await organizationsService.getCurrentOrganization();
    if (!org) {
      return { data: [], count: 0 };
    }
    return this.getAll(pagination, org.id);
  }

  // Get project by ID with owner and member details
  async getById(id: string): Promise<ProjectWithDetails | null> {
    const { data, error } = await supabase
      .from('projects')
      .select(`
        *,
        owner:users!owner_id(*),
        members:project_members(user:users(*))
      `)
      .eq('id', id)
      .single();

    if (error) {
      // Check if it's just not found, return null. Otherwise throw.
      if (error.code === 'PGRST116') return null;
      handleSupabaseError(error);
    }

    // Flatten nested members structure
    const formattedData = {
        ...data,
        members: data.members?.map((m: any) => m.user).filter(Boolean) || []
    };

    return formattedData as unknown as ProjectWithDetails;
  }

  // Create new project (automatically associates with current user's organization)
  async create(data: ProjectInsert, memberIds: string[] = []): Promise<Project> {
    // Get current user's organization if not provided
    if (!data.organization_id) {
      const org = await organizationsService.getCurrentOrganization();
      if (org) {
        data.organization_id = org.id;
      }
    }

    const { data: project, error } = await supabase
      .from('projects')
      .insert(data)
      .select()
      .single();

    if (error) handleSupabaseError(error);

    // Add initial members
    if (memberIds.length > 0) {
      const members = memberIds.map(uid => ({
        project_id: project.id,
        user_id: uid,
        role: 'member'
      }));
      const { error: membersError } = await supabase.from('project_members').insert(members);
      if (membersError) console.error('Failed to add initial members:', membersError);
    }

    await activityService.log({
        entityType: 'project',
        entityId: project.id,
        action: 'created'
    });

    return project;
  }

  // Update project
  async update(id: string, data: ProjectUpdate): Promise<Project> {
    const { data: project, error } = await supabase
      .from('projects')
      .update(data)
      .eq('id', id)
      .select()
      .single();

    if (error) handleSupabaseError(error);

    await activityService.log({
        entityType: 'project',
        entityId: id,
        action: 'updated'
    });

    return project;
  }

  // Delete project
  async delete(id: string): Promise<void> {
    const { error } = await supabase.from('projects').delete().eq('id', id);
    if (error) handleSupabaseError(error);
  }
}

export const projectsService = new ProjectsService();
