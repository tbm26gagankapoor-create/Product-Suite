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

async function getSprintStats(sprintId: string): Promise<{ total_tasks: number; completed_tasks: number; total_points: number; completed_points: number }> {
  const tasks = await database.findMany<any>('tasks', { sprint_id: sprintId });
  const columns = await database.getAll<any>('columns_status');

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
  async getAll(projectId?: string): Promise<SprintWithStats[]> {
    let sprints: Sprint[];
    if (projectId) {
      sprints = await database.findMany<Sprint>('sprints', { project_id: projectId });
    } else {
      sprints = await database.getAll<Sprint>('sprints');
    }

    const sprintsWithStats = await Promise.all(
      sprints.map(async (sprint) => ({
        ...sprint,
        ...(await getSprintStats(sprint.id)),
      }))
    );

    return sprintsWithStats.sort((a, b) =>
      new Date(b.start_date).getTime() - new Date(a.start_date).getTime()
    );
  },

  async getAllForUser(userId: string, isAdmin: boolean, projectId?: string): Promise<SprintWithStats[]> {
    if (isAdmin) {
      return this.getAll(projectId);
    }

    // Get all project IDs the user has access to
    const memberships = await database.findMany<any>('project_members', { user_id: userId });
    const membershipProjectIds = new Set(memberships.map(pm => pm.project_id));

    // Also include projects where user is owner
    const projects = await database.getAll<any>('projects');
    projects.filter(p => p.owner_id === userId).forEach(p => membershipProjectIds.add(p.id));

    let sprints = await database.getAll<Sprint>('sprints');

    // Filter by accessible projects
    sprints = sprints.filter(s => membershipProjectIds.has(s.project_id));

    if (projectId) {
      sprints = sprints.filter(s => s.project_id === projectId);
    }

    const sprintsWithStats = await Promise.all(
      sprints.map(async (sprint) => ({
        ...sprint,
        ...(await getSprintStats(sprint.id)),
      }))
    );

    return sprintsWithStats.sort((a, b) =>
      new Date(b.start_date).getTime() - new Date(a.start_date).getTime()
    );
  },

  async userHasAccess(sprintId: string, userId: string, isAdmin: boolean): Promise<boolean> {
    if (isAdmin) return true;

    const sprint = await database.findById<Sprint>('sprints', sprintId);
    if (!sprint) return false;

    // Check project access
    const project = await database.findById<any>('projects', sprint.project_id);
    if (project?.owner_id === userId) return true;

    const membership = await database.findOne<any>('project_members', {
      project_id: sprint.project_id,
      user_id: userId
    });

    return Boolean(membership);
  },

  async getById(id: string): Promise<SprintWithStats | null> {
    const sprint = await database.findById<Sprint>('sprints', id);
    if (!sprint) return null;
    return { ...sprint, ...(await getSprintStats(id)) };
  },

  async getActive(projectId: string): Promise<SprintWithStats | null> {
    const sprint = await database.findOne<Sprint>('sprints', {
      project_id: projectId,
      status: 'active'
    });
    if (!sprint) return null;
    return { ...sprint, ...(await getSprintStats(sprint.id)) };
  },

  async create(input: CreateSprintInput): Promise<SprintWithStats> {
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

    await database.insert('sprints', sprint);
    return (await this.getById(sprint.id))!;
  },

  async update(id: string, input: Partial<CreateSprintInput & { status?: 'planned' | 'active' | 'completed'; velocity?: number }>): Promise<SprintWithStats | null> {
    const existing = await database.findById<Sprint>('sprints', id);
    if (!existing) return null;

    await database.update('sprints', id, {
      ...input,
      updated_at: now(),
    } as Partial<Sprint>);

    return this.getById(id);
  },

  async delete(id: string): Promise<boolean> {
    // Unassign tasks from this sprint
    const tasks = await database.findMany<any>('tasks', { sprint_id: id });
    for (const task of tasks) {
      await database.update('tasks', task.id, { sprint_id: null });
    }
    return database.delete('sprints', id);
  },

  async startSprint(id: string): Promise<SprintWithStats | null> {
    const sprint = await this.getById(id);
    if (!sprint) return null;

    // Complete any active sprints
    const activeSprints = await database.findMany<Sprint>('sprints', {
      project_id: sprint.project_id,
      status: 'active'
    });

    for (const s of activeSprints) {
      await database.update<Sprint>('sprints', s.id, { status: 'completed', updated_at: now() });
    }

    return this.update(id, { status: 'active' });
  },

  async completeSprint(id: string): Promise<SprintWithStats | null> {
    return this.update(id, { status: 'completed' });
  },
};
