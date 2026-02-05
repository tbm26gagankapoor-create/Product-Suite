import database, { generateUUID, now, PaginationOptions, PaginatedResult, DEFAULT_PAGE_SIZE } from '../lib/database.js';

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

// Single sprint stats (for backward compatibility)
async function getSprintStats(sprintId: string): Promise<{ total_tasks: number; completed_tasks: number; total_points: number; completed_points: number }> {
  // Use aggregation for efficient stats
  const stats = await database.aggregate<any>('tasks', [
    { $match: { sprint_id: sprintId } },
    {
      $lookup: {
        from: 'columnsstatuses',
        let: { columnId: '$column_id' },
        pipeline: [
          { $match: { $expr: { $eq: ['$id', '$$columnId'] } } }
        ],
        as: 'column'
      }
    },
    { $unwind: { path: '$column', preserveNullAndEmptyArrays: true } },
    {
      $group: {
        _id: null,
        total_tasks: { $sum: 1 },
        completed_tasks: {
          $sum: { $cond: [{ $eq: ['$column.title', 'DONE'] }, 1, 0] }
        },
        total_points: { $sum: { $ifNull: ['$points', 0] } },
        completed_points: {
          $sum: {
            $cond: [
              { $eq: ['$column.title', 'DONE'] },
              { $ifNull: ['$points', 0] },
              0
            ]
          }
        }
      }
    }
  ]);

  return stats[0] || { total_tasks: 0, completed_tasks: 0, total_points: 0, completed_points: 0 };
}

// Batch get stats for multiple sprints (fixes N+1)
async function getSprintStatsBatch(sprintIds: string[]): Promise<Map<string, { total_tasks: number; completed_tasks: number; total_points: number; completed_points: number }>> {
  if (sprintIds.length === 0) return new Map();

  // Get all done columns first
  const doneColumns = await database.findMany<any>('columns_status', { title: 'DONE' });
  const doneColumnIds = new Set(doneColumns.map(c => c.id));

  // Aggregate task stats grouped by sprint
  const stats = await database.aggregate<any>('tasks', [
    { $match: { sprint_id: { $in: sprintIds } } },
    {
      $group: {
        _id: '$sprint_id',
        total_tasks: { $sum: 1 },
        completed_tasks: {
          $sum: { $cond: [{ $in: ['$column_id', [...doneColumnIds]] }, 1, 0] }
        },
        total_points: { $sum: { $ifNull: ['$points', 0] } },
        completed_points: {
          $sum: {
            $cond: [
              { $in: ['$column_id', [...doneColumnIds]] },
              { $ifNull: ['$points', 0] },
              0
            ]
          }
        }
      }
    }
  ]);

  const result = new Map<string, { total_tasks: number; completed_tasks: number; total_points: number; completed_points: number }>();

  // Initialize all sprints with zero stats
  sprintIds.forEach(id => {
    result.set(id, { total_tasks: 0, completed_tasks: 0, total_points: 0, completed_points: 0 });
  });

  // Fill in actual stats
  stats.forEach(s => {
    result.set(s._id, {
      total_tasks: s.total_tasks,
      completed_tasks: s.completed_tasks,
      total_points: s.total_points,
      completed_points: s.completed_points,
    });
  });

  return result;
}

export const sprintsService = {
  async getAll(projectId?: string): Promise<SprintWithStats[]> {
    const query = projectId ? { project_id: projectId } : {};
    const sprints = Object.keys(query).length > 0
      ? await database.findMany<Sprint>('sprints', query)
      : await database.getAll<Sprint>('sprints');

    // Use batch stats instead of N+1
    const statsMap = await getSprintStatsBatch(sprints.map(s => s.id));

    return sprints
      .map(sprint => ({
        ...sprint,
        ...(statsMap.get(sprint.id) || { total_tasks: 0, completed_tasks: 0, total_points: 0, completed_points: 0 }),
      }))
      .sort((a, b) => new Date(b.start_date).getTime() - new Date(a.start_date).getTime());
  },

  async getAllForUser(userId: string, isAdmin: boolean, projectId?: string, organizationId?: string | null): Promise<SprintWithStats[]> {
    // Build project query with organization filter
    const projectQuery: Record<string, any> = {};
    if (organizationId) {
      projectQuery.organization_id = organizationId;
    }

    // Get projects at DB level with filter
    const allProjects = Object.keys(projectQuery).length > 0
      ? await database.findMany<any>('projects', projectQuery)
      : await database.getAll<any>('projects');

    const orgProjectIds = new Set(allProjects.map(p => p.id));

    let accessibleProjectIds: Set<string>;

    if (isAdmin) {
      accessibleProjectIds = orgProjectIds;
    } else {
      // Get user's memberships
      const memberships = await database.findMany<any>('project_members', { user_id: userId });
      accessibleProjectIds = new Set(memberships.map(pm => pm.project_id));

      // Add projects where user is owner
      allProjects.filter(p => p.owner_id === userId).forEach(p => accessibleProjectIds.add(p.id));

      // Intersect with org projects
      accessibleProjectIds = new Set([...accessibleProjectIds].filter(id => orgProjectIds.has(id)));
    }

    // Build sprint query
    const sprintQuery: Record<string, any> = {
      project_id: { $in: [...accessibleProjectIds] }
    };
    if (projectId) {
      sprintQuery.project_id = projectId;
    }

    const sprints = await database.findMany<Sprint>('sprints', sprintQuery);

    // Use batch stats
    const statsMap = await getSprintStatsBatch(sprints.map(s => s.id));

    return sprints
      .map(sprint => ({
        ...sprint,
        ...(statsMap.get(sprint.id) || { total_tasks: 0, completed_tasks: 0, total_points: 0, completed_points: 0 }),
      }))
      .sort((a, b) => new Date(b.start_date).getTime() - new Date(a.start_date).getTime());
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
