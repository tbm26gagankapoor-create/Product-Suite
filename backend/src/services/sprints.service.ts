import database, { generateUUID, now } from '../lib/database.js';

export interface Sprint {
  id: string;
  project_id: string;
  name: string;
  goal: string | null;
  start_date: string;
  end_date: string;
  status: 'planned' | 'active' | 'completed';
  velocity: number | null;
  created_at: string;
  updated_at: string;
}

export interface SprintWithStats extends Sprint {
  total_tasks: number;
  completed_tasks: number;
  total_points: number;
  completed_points: number;
}

export interface CreateSprintInput {
  project_id: string;
  name: string;
  goal?: string;
  start_date: string;
  end_date: string;
}

function getSprintStats(sprintId: string): { total_tasks: number; completed_tasks: number; total_points: number; completed_points: number } {
  const tasks = database.findMany<any>('tasks', t => t.sprint_id === sprintId);
  const columns = database.getAll<any>('columns_status');

  let completedTasks = 0;
  let completedPoints = 0;

  tasks.forEach(task => {
    const column = columns.find(c => c.id === task.column_id);
    if (column?.title === 'DONE') {
      completedTasks++;
      completedPoints += task.points || 0;
    }
  });

  return {
    total_tasks: tasks.length,
    completed_tasks: completedTasks,
    total_points: tasks.reduce((sum, t) => sum + (t.points || 0), 0),
    completed_points: completedPoints,
  };
}

export const sprintsService = {
  getAll(projectId?: string): SprintWithStats[] {
    let sprints = database.getAll<Sprint>('sprints');
    if (projectId) {
      sprints = sprints.filter(s => s.project_id === projectId);
    }
    return sprints
      .map(sprint => ({ ...sprint, ...getSprintStats(sprint.id) }))
      .sort((a, b) => new Date(b.start_date).getTime() - new Date(a.start_date).getTime());
  },

  /**
   * Get sprints filtered by user access
   * - Admins see all sprints
   * - Non-admins see only sprints from projects they have access to
   */
  getAllForUser(userId: string, isAdmin: boolean, projectId?: string): SprintWithStats[] {
    if (isAdmin) {
      return this.getAll(projectId);
    }

    // Get all project IDs the user has access to
    const membershipProjectIds = new Set(
      database.findMany<any>('project_members', pm => pm.user_id === userId)
        .map(pm => pm.project_id)
    );

    // Also include projects where user is owner
    database.getAll<any>('projects')
      .filter(p => p.owner_id === userId)
      .forEach(p => membershipProjectIds.add(p.id));

    let sprints = database.getAll<Sprint>('sprints');

    // Filter by accessible projects
    sprints = sprints.filter(s => membershipProjectIds.has(s.project_id));

    if (projectId) {
      sprints = sprints.filter(s => s.project_id === projectId);
    }

    return sprints
      .map(sprint => ({ ...sprint, ...getSprintStats(sprint.id) }))
      .sort((a, b) => new Date(b.start_date).getTime() - new Date(a.start_date).getTime());
  },

  /**
   * Check if a user has access to a specific sprint
   */
  userHasAccess(sprintId: string, userId: string, isAdmin: boolean): boolean {
    if (isAdmin) return true;

    const sprint = database.findById<Sprint>('sprints', sprintId);
    if (!sprint) return false;

    // Check project access
    const project = database.findById<any>('projects', sprint.project_id);
    if (project?.owner_id === userId) return true;

    const membership = database.findOne<any>('project_members',
      pm => pm.project_id === sprint.project_id && pm.user_id === userId
    );

    return Boolean(membership);
  },

  getById(id: string): SprintWithStats | null {
    const sprint = database.findById<Sprint>('sprints', id);
    if (!sprint) return null;
    return { ...sprint, ...getSprintStats(id) };
  },

  getActive(projectId: string): SprintWithStats | null {
    const sprint = database.findOne<Sprint>('sprints', s => s.project_id === projectId && s.status === 'active');
    if (!sprint) return null;
    return { ...sprint, ...getSprintStats(sprint.id) };
  },

  create(input: CreateSprintInput): SprintWithStats {
    const sprint: Sprint = {
      id: generateUUID(),
      project_id: input.project_id,
      name: input.name,
      goal: input.goal || null,
      start_date: input.start_date,
      end_date: input.end_date,
      status: 'planned',
      velocity: null,
      created_at: now(),
      updated_at: now(),
    };

    database.insert('sprints', sprint);
    return this.getById(sprint.id)!;
  },

  update(id: string, input: Partial<CreateSprintInput & { status?: string; velocity?: number }>): SprintWithStats | null {
    const existing = database.findById<Sprint>('sprints', id);
    if (!existing) return null;

    database.update<Sprint>('sprints', id, {
      ...input,
      updated_at: now(),
    });

    return this.getById(id);
  },

  delete(id: string): boolean {
    // Unassign tasks from this sprint
    const tasks = database.findMany<any>('tasks', t => t.sprint_id === id);
    tasks.forEach(task => {
      database.update('tasks', task.id, { sprint_id: null });
    });
    return database.delete('sprints', id);
  },

  startSprint(id: string): SprintWithStats | null {
    const sprint = this.getById(id);
    if (!sprint) return null;

    // Complete any active sprints
    const activeSprints = database.findMany<Sprint>('sprints', s => s.project_id === sprint.project_id && s.status === 'active');
    activeSprints.forEach(s => {
      database.update<Sprint>('sprints', s.id, { status: 'completed', updated_at: now() });
    });

    return this.update(id, { status: 'active' });
  },

  completeSprint(id: string): SprintWithStats | null {
    return this.update(id, { status: 'completed' });
  },
};
