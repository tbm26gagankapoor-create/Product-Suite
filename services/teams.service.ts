
import { supabase } from '../lib/supabase';
import {
  Team,
  TeamInsert,
  TeamUpdate,
  TeamWithMembers,
  User,
  PaginationParams
} from '../types/database.types';
import { organizationsService } from './organizations.service';

export class TeamsService {
  // Get all teams (filtered by organization)
  async getAll(params?: PaginationParams, organizationId?: string): Promise<{ data: Team[]; count: number }> {
    let query = supabase.from('teams').select('*', { count: 'exact' });

    // Filter by organization if provided
    if (organizationId) {
      query = query.eq('organization_id', organizationId);
    }

    if (params?.page && params?.limit) {
      const from = (params.page - 1) * params.limit;
      const to = from + params.limit - 1;
      query = query.range(from, to);
    }

    query = query.order('name', { ascending: true });

    const { data, count, error } = await query;
    if (error) throw error;

    return { data: data || [], count: count || 0 };
  }

  // Get all teams for the current user's organization
  async getAllForCurrentOrg(params?: PaginationParams): Promise<{ data: Team[]; count: number }> {
    const org = await organizationsService.getCurrentOrganization();
    if (!org) {
      return { data: [], count: 0 };
    }
    return this.getAll(params, org.id);
  }

  // Get all teams with members and projects populated
  async getAllWithDetails(): Promise<TeamWithMembers[]> {
    const { data, error } = await supabase
      .from('teams')
      .select(`
        *,
        team_members (
          user:users (*)
        ),
        team_projects (
          project:projects (*)
        )
      `);
      
    if (error) throw error;
    
    return (data || []).map(this.mapTeamDetails);
  }

  // Get team by ID with members
  async getById(id: string): Promise<TeamWithMembers | null> {
    const { data, error } = await supabase
      .from('teams')
      .select(`
        *,
        team_members (
          user:users (*)
        ),
        team_projects (
          project:projects (*)
        )
      `)
      .eq('id', id)
      .single();
      
    if (error) return null;
    return this.mapTeamDetails(data);
  }

  // Create new team and auto-add creator (associates with current user's organization)
  async create(data: TeamInsert, memberIds?: string[]): Promise<Team> {
    // Get current user's organization if not provided
    if (!data.organization_id) {
      const org = await organizationsService.getCurrentOrganization();
      if (org) {
        data.organization_id = org.id;
      }
    }

    // 1. Create Team
    const { data: team, error } = await supabase
      .from('teams')
      .insert(data)
      .select()
      .single();

    if (error) throw error;

    // 2. Add Members (Creator + provided list)
    const { data: { user: currentUser } } = await supabase.auth.getUser();
    const membersToAdd = new Set(memberIds || []);

    if (currentUser) {
      // Fetch public user profile ID from auth ID
      const { data: profile } = await supabase
        .from('users')
        .select('id')
        .eq('auth_user_id', currentUser.id)
        .single();

      if (profile) membersToAdd.add(profile.id);
    }

    if (membersToAdd.size > 0) {
      const rows = Array.from(membersToAdd).map(uid => ({
        team_id: team.id,
        user_id: uid
      }));
      const { error: memberError } = await supabase.from('team_members').insert(rows);
      if (memberError) console.error('Error adding team members:', memberError);
    }

    return team;
  }

  // Update team
  async update(id: string, data: TeamUpdate): Promise<Team> {
    const { data: updated, error } = await supabase
      .from('teams')
      .update(data)
      .eq('id', id)
      .select()
      .single();
      
    if (error) throw error;
    return updated;
  }

  // Delete team
  async delete(id: string): Promise<void> {
    const { error } = await supabase.from('teams').delete().eq('id', id);
    if (error) throw error;
  }

  // Add member to team
  async addMember(teamId: string, userId: string): Promise<void> {
    const { error } = await supabase.from('team_members').insert({
      team_id: teamId,
      user_id: userId
    });
    if (error) throw error;
  }

  // Remove member from team
  async removeMember(teamId: string, userId: string): Promise<void> {
    const { error } = await supabase.from('team_members')
      .delete()
      .match({ team_id: teamId, user_id: userId });
    if (error) throw error;
  }

  // Get team members
  async getMembers(teamId: string): Promise<User[]> {
    const { data, error } = await supabase
      .from('team_members')
      .select('user:users(*)')
      .eq('team_id', teamId);
      
    if (error) throw error;
    // Map the nested user object
    return (data || []).map((d: any) => d.user).filter(Boolean) as User[];
  }

  // Set team members (replace all)
  async setMembers(teamId: string, userIds: string[]): Promise<void> {
    // 1. Delete existing
    const { error: deleteError } = await supabase.from('team_members').delete().eq('team_id', teamId);
    if (deleteError) throw deleteError;
    
    // 2. Insert new
    if (userIds.length > 0) {
      const rows = userIds.map(uid => ({ team_id: teamId, user_id: uid }));
      const { error } = await supabase.from('team_members').insert(rows);
      if (error) throw error;
    }
  }

  // Add project to team
  async addProject(teamId: string, projectId: string): Promise<void> {
    // Assuming 'team_projects' table exists as per logic
    const { error } = await supabase.from('team_projects').insert({
      team_id: teamId,
      project_id: projectId
    });
    if (error) throw error;
  }

  // Remove project from team
  async removeProject(teamId: string, projectId: string): Promise<void> {
    const { error } = await supabase.from('team_projects')
      .delete()
      .match({ team_id: teamId, project_id: projectId });
    if (error) throw error;
  }

  // Get teams for a specific user
  async getTeamsForUser(userId: string): Promise<Team[]> {
    const { data, error } = await supabase
      .from('team_members')
      .select('team:teams(*)')
      .eq('user_id', userId);
      
    if (error) throw error;
    return (data || []).map((d: any) => d.team).filter(Boolean) as Team[];
  }

  // Get teams for a specific project
  async getTeamsForProject(projectId: string): Promise<Team[]> {
    const { data, error } = await supabase
      .from('team_projects')
      .select('team:teams(*)')
      .eq('project_id', projectId);
      
    if (error) throw error;
    return (data || []).map((d: any) => d.team).filter(Boolean) as Team[];
  }

  // Helper to map DB response structure to TeamWithMembers interface
  private mapTeamDetails(row: any): TeamWithMembers {
    return {
      ...row,
      members: row.team_members?.map((tm: any) => tm.user).filter(Boolean) || [],
      projects: row.team_projects?.map((tp: any) => tp.project).filter(Boolean) || []
    };
  }
}

export const teamsService = new TeamsService();
