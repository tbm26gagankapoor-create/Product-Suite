import database, { generateUUID, now } from '../lib/database.js';

export interface Project {
  id: string;
  name: string;
  description: string | null;
  code: string;
  status: string;
  progress_percentage: number;
  is_favorite: boolean;
  owner_id: string | null;
  organization_id?: string | null;
  image_url: string | null;
  icon: string | null;
  icon_color: string | null;
  created_at: string;
  updated_at: string;
}

export interface ProjectWithStats extends Project {
  total_tasks: number;
  completed_tasks: number;
  active_sprints: number;
  team_size: number;
}

export interface CreateProjectInput {
  name: string;
  description?: string;
  code: string;
  owner_id?: string;
  organization_id?: string;
  image_url?: string;
  icon?: string;
  icon_color?: string;
}

async function getProjectStats(projectId: string): Promise<{ total_tasks: number; completed_tasks: number; active_sprints: number; team_size: number }> {
  const tasks = await database.findMany<any>('tasks', { project_id: projectId });
  const columns = await database.getAll<any>('columns_status');
  const doneColumn = columns.find(c => c.project_id === projectId && c.title === 'DONE');
  const completedTasks = doneColumn
    ? tasks.filter(t => t.column_id === doneColumn.id).length
    : 0;
  const activeSprints = await database.count('sprints', { project_id: projectId, status: 'active' });
  const projectMembers = await database.findMany<any>('project_members', { project_id: projectId });
  const teamSize = new Set(projectMembers.map(pm => pm.user_id)).size;

  return {
    total_tasks: tasks.length,
    completed_tasks: completedTasks,
    active_sprints: activeSprints,
    team_size: teamSize,
  };
}

export const projectsService = {
  async getAll(): Promise<ProjectWithStats[]> {
    const projects = await database.getAll<Project>('projects');
    const projectsWithStats = await Promise.all(
      projects.map(async (project) => ({
        ...project,
        ...(await getProjectStats(project.id)),
      }))
    );
    return projectsWithStats;
  },

  async getAllForUser(userId: string, isAdmin: boolean): Promise<ProjectWithStats[]> {
    if (isAdmin) {
      return this.getAll();
    }

    const allProjects = await database.getAll<Project>('projects');

    // Get all project IDs where the user is a member
    const memberships = await database.findMany<any>('project_members', { user_id: userId });
    const membershipProjectIds = new Set(memberships.map(pm => pm.project_id));

    // Filter projects where user is owner or member
    const accessibleProjects = allProjects.filter(project =>
      project.owner_id === userId || membershipProjectIds.has(project.id)
    );

    const projectsWithStats = await Promise.all(
      accessibleProjects.map(async (project) => ({
        ...project,
        ...(await getProjectStats(project.id)),
      }))
    );
    return projectsWithStats;
  },

  async userHasAccess(projectId: string, userId: string, isAdmin: boolean): Promise<boolean> {
    if (isAdmin) return true;

    const project = await database.findById<Project>('projects', projectId);
    if (!project) return false;

    // User is owner
    if (project.owner_id === userId) return true;

    // User is member
    const membership = await database.findOne<any>('project_members', {
      project_id: projectId,
      user_id: userId
    });

    return Boolean(membership);
  },

  async getById(id: string): Promise<ProjectWithStats | null> {
    const project = await database.findById<Project>('projects', id);
    if (!project) return null;
    return { ...project, ...(await getProjectStats(id)) };
  },

  async getByCode(code: string): Promise<Project | null> {
    return database.findOne<Project>('projects', { code });
  },

  async create(input: CreateProjectInput): Promise<ProjectWithStats> {
    const existing = await this.getByCode(input.code);
    if (existing) {
      throw new Error('UNIQUE constraint failed: code already exists');
    }

    const project: Project = {
      id: generateUUID(),
      name: input.name,
      description: input.description || null,
      code: input.code,
      status: 'active',
      progress_percentage: 0,
      is_favorite: false,
      owner_id: input.owner_id || null,
      organization_id: input.organization_id || null,
      image_url: input.image_url || null,
      icon: input.icon || null,
      icon_color: input.icon_color || null,
      created_at: now(),
      updated_at: now(),
    };

    await database.insert('projects', project);

    // Create default columns
    const columns = ['IDEA', 'TO DO', 'IN PROGRESS', 'TESTING', 'DONE'];
    const colors = ['gray', 'blue', 'yellow', 'purple', 'green'];

    for (let index = 0; index < columns.length; index++) {
      await database.insert('columns_status', {
        id: generateUUID(),
        project_id: project.id,
        title: columns[index],
        display_order: index,
        color: colors[index],
        is_default: index === 1,
        created_at: now(),
      });
    }

    return (await this.getById(project.id))!;
  },

  async update(id: string, input: Partial<CreateProjectInput & { status?: string; progress_percentage?: number; is_favorite?: boolean; image_url?: string | null; icon?: string | null; icon_color?: string | null }>): Promise<ProjectWithStats | null> {
    const existing = await database.findById<Project>('projects', id);
    if (!existing) return null;

    await database.update<Project>('projects', id, {
      ...input,
      updated_at: now(),
    });

    return this.getById(id);
  },

  async delete(id: string): Promise<boolean> {
    // Also delete related data
    await database.deleteMany('tasks', { project_id: id });
    await database.deleteMany('sprints', { project_id: id });
    await database.deleteMany('columns_status', { project_id: id });
    await database.deleteMany('tags', { project_id: id });
    await database.deleteMany('project_members', { project_id: id });
    return database.delete('projects', id);
  },

  async getMembers(projectId: string) {
    const members = await database.findMany<any>('project_members', { project_id: projectId });
    const membersWithUsers = await Promise.all(
      members.map(async (pm) => {
        const user = await database.findById<any>('users', pm.user_id);
        return {
          id: user?.id,
          name: user?.name,
          email: user?.email,
          avatar_url: user?.avatar_url,
          user_role: user?.role,
          project_role: pm.role,
          joined_at: pm.joined_at,
        };
      })
    );
    return membersWithUsers.filter(m => m.id);
  },

  async addMember(projectId: string, userId: string, role: string = 'member') {
    const existing = await database.findOne<any>('project_members', {
      project_id: projectId,
      user_id: userId
    });
    if (existing) {
      throw new Error('UNIQUE constraint failed: user is already a member');
    }

    const member = {
      id: generateUUID(),
      project_id: projectId,
      user_id: userId,
      role,
      joined_at: now(),
    };
    await database.insert('project_members', member);
    return member;
  },

  async removeMember(projectId: string, userId: string): Promise<boolean> {
    const count = await database.deleteMany('project_members', {
      project_id: projectId,
      user_id: userId
    });
    return count > 0;
  },
};
