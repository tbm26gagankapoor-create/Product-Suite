import { supabaseAdmin } from '../lib/supabase.js';
import { NotFoundError, BadRequestError, ConflictError } from '../utils/errors.js';
import { authorizationService } from './authorization.service.js';
import type { Workspace, PaginationParams } from '../types/index.js';

interface WorkspaceCreate {
  name: string;
  key: string;
  description?: string;
  tenant_id: string;
}

interface WorkspaceUpdate {
  name?: string;
  description?: string;
}

class WorkspacesService {
  async getAll(
    tenantId: string,
    pagination?: PaginationParams
  ): Promise<{ data: Workspace[]; total: number }> {
    let query = supabaseAdmin
      .from('projects')
      .select('*', { count: 'exact' })
      .eq('tenant_id', tenantId);

    if (pagination) {
      const from = (pagination.page - 1) * pagination.limit;
      const to = from + pagination.limit - 1;
      query = query.range(from, to);
    }

    query = query.order('created_at', { ascending: false });

    const { data, error, count } = await query;

    if (error) {
      throw new BadRequestError(error.message);
    }

    return { data: (data || []) as Workspace[], total: count || 0 };
  }

  async getById(workspaceId: string): Promise<Workspace> {
    const { data, error } = await supabaseAdmin
      .from('projects')
      .select('*')
      .eq('id', workspaceId)
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        throw new NotFoundError('Workspace');
      }
      throw new BadRequestError(error.message);
    }

    return data as Workspace;
  }

  async create(data: WorkspaceCreate, creatorId: string): Promise<Workspace> {
    // Check if key is unique within tenant
    const { data: existing } = await supabaseAdmin
      .from('projects')
      .select('id')
      .eq('tenant_id', data.tenant_id)
      .eq('key', data.key.toUpperCase())
      .single();

    if (existing) {
      throw new ConflictError('Workspace key already exists in this tenant');
    }

    const { data: workspace, error } = await supabaseAdmin
      .from('projects')
      .insert({
        ...data,
        key: data.key.toUpperCase(),
      })
      .select()
      .single();

    if (error) {
      throw new BadRequestError(error.message);
    }

    // Set up authorization
    await authorizationService.linkWorkspaceToTenant(workspace.id, data.tenant_id);
    await authorizationService.addUserToWorkspace(creatorId, workspace.id, 'admin');

    return workspace as Workspace;
  }

  async update(workspaceId: string, data: WorkspaceUpdate): Promise<Workspace> {
    const { data: workspace, error } = await supabaseAdmin
      .from('projects')
      .update(data)
      .eq('id', workspaceId)
      .select()
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        throw new NotFoundError('Workspace');
      }
      throw new BadRequestError(error.message);
    }

    return workspace as Workspace;
  }

  async delete(workspaceId: string): Promise<void> {
    const { error } = await supabaseAdmin
      .from('projects')
      .delete()
      .eq('id', workspaceId);

    if (error) {
      throw new BadRequestError(error.message);
    }
  }

  // Member management
  async addMember(
    workspaceId: string,
    userId: string,
    role: 'admin' | 'member' | 'viewer'
  ): Promise<void> {
    await authorizationService.addUserToWorkspace(userId, workspaceId, role);

    // Also store in database for querying
    await supabaseAdmin.from('workspace_members').upsert({
      workspace_id: workspaceId,
      user_id: userId,
      role,
    });
  }

  async removeMember(
    workspaceId: string,
    userId: string,
    role: 'admin' | 'member' | 'viewer'
  ): Promise<void> {
    await authorizationService.removeUserFromWorkspace(userId, workspaceId, role);

    await supabaseAdmin
      .from('workspace_members')
      .delete()
      .eq('workspace_id', workspaceId)
      .eq('user_id', userId);
  }

  async getMembers(workspaceId: string): Promise<any[]> {
    const { data, error } = await supabaseAdmin
      .from('workspace_members')
      .select('*, user:users(*)')
      .eq('workspace_id', workspaceId);

    if (error) {
      throw new BadRequestError(error.message);
    }

    return data || [];
  }

  async updateMemberRole(
    workspaceId: string,
    userId: string,
    oldRole: 'admin' | 'member' | 'viewer',
    newRole: 'admin' | 'member' | 'viewer'
  ): Promise<void> {
    // Remove old role
    await authorizationService.removeUserFromWorkspace(userId, workspaceId, oldRole);

    // Add new role
    await authorizationService.addUserToWorkspace(userId, workspaceId, newRole);

    // Update database
    await supabaseAdmin
      .from('workspace_members')
      .update({ role: newRole })
      .eq('workspace_id', workspaceId)
      .eq('user_id', userId);
  }
}

export const workspacesService = new WorkspacesService();
