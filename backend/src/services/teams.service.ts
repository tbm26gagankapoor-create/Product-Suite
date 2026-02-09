import database, { generateUUID, now } from '../lib/database.js';

export interface Team {
  id: string;
  name: string;
  description: string | null;
  avatar_url: string | null;
  organization_id: string | null;
  created_at: string;
  updated_at: string;
}

export interface TeamMember {
  id: string;
  team_id: string;
  user_id: string;
  joined_at: string;
}

export interface TeamProject {
  id: string;
  team_id: string;
  project_id: string;
  added_at: string;
}

export interface CreateTeamInput {
  name: string;
  description?: string;
  avatar_url?: string;
  organization_id?: string;
  member_ids?: string[];
}

export interface TeamWithMembers extends Team {
  members: string[];
  projectIds: string[];
}

export const teamsService = {
  async getAll(): Promise<TeamWithMembers[]> {
    const teams = await database.getAll<Team>('teams');
    // Use batch enrichment instead of N+1
    return this.enrichTeamsBatch(teams);
  },

  async getById(id: string): Promise<TeamWithMembers | null> {
    const team = await database.findById<Team>('teams', id);
    if (!team) return null;
    return this.enrichTeam(team);
  },

  async enrichTeam(team: Team): Promise<TeamWithMembers> {
    const [teamMembers, teamProjects] = await Promise.all([
      database.findMany<TeamMember>('team_members', { team_id: team.id }),
      database.findMany<TeamProject>('team_projects', { team_id: team.id }),
    ]);

    return {
      ...team,
      members: teamMembers.map(tm => tm.user_id),
      projectIds: teamProjects.map(tp => tp.project_id),
    };
  },

  // Batch enrich teams (fixes N+1)
  async enrichTeamsBatch(teams: Team[]): Promise<TeamWithMembers[]> {
    if (teams.length === 0) return [];

    const teamIds = teams.map(t => t.id);

    // Batch load members and projects for all teams
    const [membersMap, projectsMap] = await Promise.all([
      database.findManyByField<TeamMember>('team_members', 'team_id', teamIds),
      database.findManyByField<TeamProject>('team_projects', 'team_id', teamIds),
    ]);

    return teams.map(team => ({
      ...team,
      members: (membersMap.get(team.id) || []).map(tm => tm.user_id),
      projectIds: (projectsMap.get(team.id) || []).map(tp => tp.project_id),
    }));
  },

  async create(input: CreateTeamInput): Promise<TeamWithMembers> {
    const team: Team = {
      id: generateUUID(),
      name: input.name,
      description: input.description || null,
      avatar_url: input.avatar_url || null,
      organization_id: input.organization_id || null,
      created_at: now(),
      updated_at: now(),
    };

    await database.insert('teams', team);

    // Add members if provided
    if (input.member_ids && input.member_ids.length > 0) {
      for (const userId of input.member_ids) {
        const teamMember: TeamMember = {
          id: generateUUID(),
          team_id: team.id,
          user_id: userId,
          joined_at: now(),
        };
        await database.insert('team_members', teamMember);
      }
    }

    return this.enrichTeam(team);
  },

  async update(id: string, input: Partial<CreateTeamInput>): Promise<TeamWithMembers | null> {
    const existing = await database.findById<Team>('teams', id);
    if (!existing) return null;

    const updates: Record<string, any> = {
      updated_at: now(),
    };
    if (input.name !== undefined) (updates as any).name = input.name;
    if (input.description !== undefined) (updates as any).description = input.description;
    if (input.avatar_url !== undefined) (updates as any).avatar_url = input.avatar_url;

    const updated = await database.update<Team>('teams', id, updates);

    if (!updated) return null;
    return this.enrichTeam(updated);
  },

  async delete(id: string): Promise<boolean> {
    // Delete team members first
    await database.deleteMany('team_members', { team_id: id });
    // Delete team projects
    await database.deleteMany('team_projects', { team_id: id });
    // Delete the team
    return database.delete('teams', id);
  },

  // Member management
  async addMember(teamId: string, userId: string): Promise<TeamMember | null> {
    const team = await database.findById<Team>('teams', teamId);
    if (!team) return null;

    // Check if already a member
    const existing = await database.findOne<TeamMember>('team_members', {
      team_id: teamId,
      user_id: userId
    });
    if (existing) return existing;

    const teamMember: TeamMember = {
      id: generateUUID(),
      team_id: teamId,
      user_id: userId,
      joined_at: now(),
    };
    await database.insert('team_members', teamMember);
    return teamMember;
  },

  async removeMember(teamId: string, userId: string): Promise<boolean> {
    const deleted = await database.deleteMany('team_members', {
      team_id: teamId,
      user_id: userId
    });
    return deleted > 0;
  },

  async getMembers(teamId: string): Promise<string[]> {
    const teamMembers = await database.findMany<TeamMember>('team_members', { team_id: teamId });
    return teamMembers.map(tm => tm.user_id);
  },

  async setMembers(teamId: string, userIds: string[]): Promise<void> {
    // Remove all existing members
    await database.deleteMany('team_members', { team_id: teamId });

    // Add new members
    for (const userId of userIds) {
      const teamMember: TeamMember = {
        id: generateUUID(),
        team_id: teamId,
        user_id: userId,
        joined_at: now(),
      };
      await database.insert('team_members', teamMember);
    }
  },

  // Project management
  async addProject(teamId: string, projectId: string): Promise<TeamProject | null> {
    const team = await database.findById<Team>('teams', teamId);
    if (!team) return null;

    // Check if already added
    const existing = await database.findOne<TeamProject>('team_projects', {
      team_id: teamId,
      project_id: projectId
    });
    if (existing) return existing;

    const teamProject: TeamProject = {
      id: generateUUID(),
      team_id: teamId,
      project_id: projectId,
      added_at: now(),
    };
    await database.insert('team_projects', teamProject);
    return teamProject;
  },

  async removeProject(teamId: string, projectId: string): Promise<boolean> {
    const deleted = await database.deleteMany('team_projects', {
      team_id: teamId,
      project_id: projectId
    });
    return deleted > 0;
  },

  // Get teams for a user (optimized with batch loading)
  async getTeamsForUser(userId: string): Promise<TeamWithMembers[]> {
    const teamMembers = await database.findMany<TeamMember>('team_members', { user_id: userId });
    if (teamMembers.length === 0) return [];

    const teamIds = teamMembers.map(tm => tm.team_id);

    // Batch load all teams at once
    const teamsMap = await database.findByIds<Team>('teams', teamIds);
    const teams = [...teamsMap.values()];

    // Batch enrich
    return this.enrichTeamsBatch(teams);
  },

  // Get teams for a project (optimized with batch loading)
  async getTeamsForProject(projectId: string): Promise<TeamWithMembers[]> {
    const teamProjects = await database.findMany<TeamProject>('team_projects', { project_id: projectId });
    if (teamProjects.length === 0) return [];

    const teamIds = teamProjects.map(tp => tp.team_id);

    // Batch load all teams at once
    const teamsMap = await database.findByIds<Team>('teams', teamIds);
    const teams = [...teamsMap.values()];

    // Batch enrich
    return this.enrichTeamsBatch(teams);
  },
};
