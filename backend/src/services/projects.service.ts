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
}

function getProjectStats(projectId: string): { total_tasks: number; completed_tasks: number; active_sprints: number; team_size: number } {
  const tasks = database.findMany<any>('tasks', t => t.project_id === projectId);
  const columns = database.getAll<any>('columns_status');
  const doneColumn = columns.find(c => c.project_id === projectId && c.title === 'DONE');
  const completedTasks = doneColumn
    ? tasks.filter(t => t.column_id === doneColumn.id).length
    : 0;
  const activeSprints = database.count('sprints', s => s.project_id === projectId && s.status === 'active');
  const teamSize = new Set(database.findMany<any>('project_members', pm => pm.project_id === projectId).map(pm => pm.user_id)).size;

  return {
    total_tasks: tasks.length,
    completed_tasks: completedTasks,
    active_sprints: activeSprints,
    team_size: teamSize,
  };
}

export const projectsService = {
  getAll(): ProjectWithStats[] {
    return database.getAll<Project>('projects').map(project => ({
      ...project,
      ...getProjectStats(project.id),
    }));
  },

  /**
   * Get projects filtered by user access
   * - Admins see all projects
   * - Non-admins see only projects where they are owner or member
   */
  getAllForUser(userId: string, isAdmin: boolean): ProjectWithStats[] {
    if (isAdmin) {
      return this.getAll();
    }

    const allProjects = database.getAll<Project>('projects');

    // Get all project IDs where the user is a member
    const membershipProjectIds = new Set(
      database.findMany<any>('project_members', pm => pm.user_id === userId)
        .map(pm => pm.project_id)
    );

    // Filter projects where user is owner or member
    const accessibleProjects = allProjects.filter(project =>
      project.owner_id === userId || membershipProjectIds.has(project.id)
    );

    return accessibleProjects.map(project => ({
      ...project,
      ...getProjectStats(project.id),
    }));
  },

  /**
   * Check if a user has access to a specific project
   */
  userHasAccess(projectId: string, userId: string, isAdmin: boolean): boolean {
    if (isAdmin) return true;

    const project = database.findById<Project>('projects', projectId);
    if (!project) return false;

    // User is owner
    if (project.owner_id === userId) return true;

    // User is member
    const membership = database.findOne<any>('project_members',
      pm => pm.project_id === projectId && pm.user_id === userId
    );

    return Boolean(membership);
  },

  getById(id: string): ProjectWithStats | null {
    const project = database.findById<Project>('projects', id);
    if (!project) return null;
    return { ...project, ...getProjectStats(id) };
  },

  getByCode(code: string): Project | null {
    return database.findOne<Project>('projects', p => p.code === code) || null;
  },

  create(input: CreateProjectInput): ProjectWithStats {
    if (this.getByCode(input.code)) {
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
      created_at: now(),
      updated_at: now(),
    };

    database.insert('projects', project);

    // Create default columns
    const columns = ['IDEA', 'TO DO', 'IN PROGRESS', 'TESTING', 'DONE'];
    const colors = ['gray', 'blue', 'yellow', 'purple', 'green'];
    columns.forEach((title, index) => {
      database.insert('columns_status', {
        id: generateUUID(),
        project_id: project.id,
        title,
        display_order: index,
        color: colors[index],
        is_default: index === 1,
        created_at: now(),
      });
    });

    return this.getById(project.id)!;
  },

  update(id: string, input: Partial<CreateProjectInput & { status?: string; progress_percentage?: number; is_favorite?: boolean }>): ProjectWithStats | null {
    const existing = database.findById<Project>('projects', id);
    if (!existing) return null;

    database.update<Project>('projects', id, {
      ...input,
      updated_at: now(),
    });

    return this.getById(id);
  },

  delete(id: string): boolean {
    // Also delete related data
    database.deleteMany('tasks', t => t.project_id === id);
    database.deleteMany('sprints', s => s.project_id === id);
    database.deleteMany('columns_status', c => c.project_id === id);
    database.deleteMany('tags', t => t.project_id === id);
    database.deleteMany('project_members', pm => pm.project_id === id);
    return database.delete('projects', id);
  },

  getMembers(projectId: string) {
    const members = database.findMany<any>('project_members', pm => pm.project_id === projectId);
    return members.map(pm => {
      const user = database.findById<any>('users', pm.user_id);
      return {
        id: user?.id,
        name: user?.name,
        email: user?.email,
        avatar_url: user?.avatar_url,
        user_role: user?.role,
        project_role: pm.role,
        joined_at: pm.joined_at,
      };
    }).filter(m => m.id);
  },

  addMember(projectId: string, userId: string, role: string = 'member') {
    const existing = database.findOne<any>('project_members', pm => pm.project_id === projectId && pm.user_id === userId);
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
    database.insert('project_members', member);
    return member;
  },

  removeMember(projectId: string, userId: string): boolean {
    const count = database.deleteMany('project_members', pm => pm.project_id === projectId && pm.user_id === userId);
    return count > 0;
  },
};
