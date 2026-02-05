import database, { generateUUID, now, PaginationOptions, PaginatedResult, DEFAULT_PAGE_SIZE, withTransaction, supportsTransactions } from '../lib/database.js';

export interface ProjectDraftData {
  productName: string;
  description: string;
  tags: string;
  startDate: string;
  targetDate: string;
  ownerId: string;
  selectedTeam: string[];
  refinedVision: string;
  suggestions: Array<{
    title: string;
    description: string;
    type: 'feature' | 'monetization' | 'market' | 'ux';
    selected?: boolean;
  }>;
  generatedDocs: Record<string, string>;
  generatedEpics: Array<{
    title: string;
    description: string;
    tasks: Array<{
      title: string;
      description: string;
      type: string;
      priority: string;
      points: number;
    }>;
  }>;
  inputMode: 'scratch' | 'import';
  fileText?: string;
  productImage?: string;
}

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
  // Draft fields for saving incomplete product wizard state
  draft_step?: number | null;
  draft_data?: ProjectDraftData | null;
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
  // Document fields
  vision?: string;
  prd?: string;
  docs?: Record<string, string>;
  // Draft fields for saving incomplete product wizard state
  status?: string;
  draft_step?: number;
  draft_data?: ProjectDraftData;
}

// Single project stats (for backward compatibility)
async function getProjectStats(projectId: string): Promise<{ total_tasks: number; completed_tasks: number; active_sprints: number; team_size: number }> {
  // Use aggregation for efficient counting
  const [taskStats, activeSprints, teamSize] = await Promise.all([
    // Get task counts using aggregation
    database.aggregate<{ total: number; completed: number }>('tasks', [
      { $match: { project_id: projectId } },
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
          total: { $sum: 1 },
          completed: {
            $sum: { $cond: [{ $eq: ['$column.title', 'DONE'] }, 1, 0] }
          }
        }
      }
    ]),
    database.count('sprints', { project_id: projectId, status: 'active' }),
    database.count('project_members', { project_id: projectId }),
  ]);

  const stats = taskStats[0] || { total: 0, completed: 0 };

  return {
    total_tasks: stats.total,
    completed_tasks: stats.completed,
    active_sprints: activeSprints,
    team_size: teamSize,
  };
}

// Batch get stats for multiple projects (fixes N+1 in getAllForUser)
async function getProjectStatsBatch(projectIds: string[]): Promise<Map<string, { total_tasks: number; completed_tasks: number; active_sprints: number; team_size: number }>> {
  if (projectIds.length === 0) return new Map();

  // Batch fetch all data in parallel
  const [taskCountsByProject, sprintCountsByProject, memberCountsByProject, doneColumnsByProject] = await Promise.all([
    database.countByField('tasks', 'project_id', projectIds),
    // Count active sprints
    database.aggregate<{ _id: string; count: number }>('sprints', [
      { $match: { project_id: { $in: projectIds }, status: 'active' } },
      { $group: { _id: '$project_id', count: { $sum: 1 } } }
    ]),
    database.countByField('project_members', 'project_id', projectIds),
    // Get done columns for each project
    database.findMany<any>('columns_status', {
      project_id: { $in: projectIds },
      title: 'DONE'
    } as any),
  ]);

  // Build sprint counts map
  const sprintCounts = new Map<string, number>();
  sprintCountsByProject.forEach(s => sprintCounts.set(s._id, s.count));

  // Build done column IDs set
  const doneColumnIds = new Set(doneColumnsByProject.map(c => c.id));

  // Count completed tasks (tasks in DONE columns)
  const completedTasksByProject = await database.aggregate<{ _id: string; count: number }>('tasks', [
    { $match: { project_id: { $in: projectIds }, column_id: { $in: [...doneColumnIds] } } },
    { $group: { _id: '$project_id', count: { $sum: 1 } } }
  ]);

  const completedCounts = new Map<string, number>();
  completedTasksByProject.forEach(c => completedCounts.set(c._id, c.count));

  // Build result map
  const result = new Map<string, { total_tasks: number; completed_tasks: number; active_sprints: number; team_size: number }>();
  projectIds.forEach(id => {
    result.set(id, {
      total_tasks: taskCountsByProject.get(id) || 0,
      completed_tasks: completedCounts.get(id) || 0,
      active_sprints: sprintCounts.get(id) || 0,
      team_size: memberCountsByProject.get(id) || 0,
    });
  });

  return result;
}

export const projectsService = {
  async getAll(): Promise<ProjectWithStats[]> {
    const projects = await database.getAll<Project>('projects');
    // Use batch stats instead of N+1 queries
    const statsMap = await getProjectStatsBatch(projects.map(p => p.id));
    return projects.map(project => ({
      ...project,
      ...(statsMap.get(project.id) || { total_tasks: 0, completed_tasks: 0, active_sprints: 0, team_size: 0 }),
    }));
  },

  // Paginated version for large datasets
  async getAllPaginated(
    filters?: { organization_id?: string },
    pagination?: PaginationOptions
  ): Promise<PaginatedResult<ProjectWithStats>> {
    const query: Record<string, any> = {};
    if (filters?.organization_id) {
      query.organization_id = filters.organization_id;
    }

    const result = await database.findManyPaginated<Project>('projects', query, {
      page: pagination?.page || 1,
      limit: pagination?.limit || DEFAULT_PAGE_SIZE,
      sortBy: pagination?.sortBy || 'updated_at',
      sortOrder: pagination?.sortOrder || 'desc',
    });

    // Batch get stats for paginated projects
    const statsMap = await getProjectStatsBatch(result.data.map(p => p.id));

    return {
      data: result.data.map(project => ({
        ...project,
        ...(statsMap.get(project.id) || { total_tasks: 0, completed_tasks: 0, active_sprints: 0, team_size: 0 }),
      })),
      pagination: result.pagination,
    };
  },

  async getAllForUser(userId: string, isAdmin: boolean, organizationId?: string | null, includeDrafts: boolean = true): Promise<ProjectWithStats[]> {
    // Build query to filter at database level
    const query: Record<string, any> = {};
    if (organizationId) {
      query.organization_id = organizationId;
    }

    // Get projects filtered by organization at DB level
    const allProjects = Object.keys(query).length > 0
      ? await database.findMany<Project>('projects', query)
      : await database.getAll<Project>('projects');

    let accessibleProjects: Project[];

    if (isAdmin) {
      accessibleProjects = allProjects;
    } else {
      // Get user's memberships in a single query
      const memberships = await database.findMany<any>('project_members', { user_id: userId });
      const membershipProjectIds = new Set(memberships.map(pm => pm.project_id));

      // Filter projects where user is owner or member
      accessibleProjects = allProjects.filter(project =>
        project.owner_id === userId || membershipProjectIds.has(project.id)
      );
    }

    // Filter drafts if not included
    if (!includeDrafts) {
      accessibleProjects = accessibleProjects.filter(project => project.status !== 'draft');
    }

    // Batch get stats (1 set of queries instead of N*4 queries)
    const statsMap = await getProjectStatsBatch(accessibleProjects.map(p => p.id));

    return accessibleProjects.map(project => ({
      ...project,
      ...(statsMap.get(project.id) || { total_tasks: 0, completed_tasks: 0, active_sprints: 0, team_size: 0 }),
    }));
  },

  // Get projects where a specific user is a member (for displaying user's projects)
  async getByMemberId(memberId: string): Promise<ProjectWithStats[]> {
    const memberships = await database.findMany<any>('project_members', { user_id: memberId });
    const memberProjectIds = memberships.map(pm => pm.project_id);

    const projects = await Promise.all(
      memberProjectIds.map(id => this.getById(id))
    );
    return projects.filter((p): p is ProjectWithStats => p !== null);
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

    const projectData: Project = {
      id: generateUUID(),
      name: input.name,
      description: input.description || null,
      code: input.code,
      status: input.status || 'active',
      progress_percentage: 0,
      is_favorite: false,
      owner_id: input.owner_id || null,
      organization_id: input.organization_id || null,
      image_url: input.image_url || null,
      icon: input.icon || null,
      icon_color: input.icon_color || null,
      // Document fields
      vision: input.vision || null,
      prd: input.prd || null,
      docs: input.docs || null,
      // Draft fields
      draft_step: input.draft_step ?? null,
      draft_data: input.draft_data || null,
      created_at: now(),
      updated_at: now(),
    };

    // Default columns to create
    const columns = ['IDEA', 'TO DO', 'IN PROGRESS', 'TESTING', 'DONE'];
    const colors = ['gray', 'blue', 'yellow', 'purple', 'green'];

    // Check if transactions are supported
    const canUseTransactions = await supportsTransactions();

    if (canUseTransactions) {
      // Use transaction for atomic project + columns creation
      await withTransaction(async (session) => {
        await database.insertWithSession('projects', projectData, session);

        for (let index = 0; index < columns.length; index++) {
          await database.insertWithSession('columns_status', {
            id: generateUUID(),
            project_id: projectData.id,
            title: columns[index],
            display_order: index,
            color: colors[index],
            is_default: index === 1,
            created_at: now(),
          }, session);
        }
      });
    } else {
      // Fallback: non-transactional insert
      await database.insert('projects', projectData);

      for (let index = 0; index < columns.length; index++) {
        await database.insert('columns_status', {
          id: generateUUID(),
          project_id: projectData.id,
          title: columns[index],
          display_order: index,
          color: colors[index],
          is_default: index === 1,
          created_at: now(),
        });
      }
    }

    return (await this.getById(projectData.id))!;
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
    // Check if transactions are supported
    const canUseTransactions = await supportsTransactions();

    if (canUseTransactions) {
      // Use transaction for atomic cascading delete
      return withTransaction(async (session) => {
        await database.deleteManyWithSession('tasks', { project_id: id }, session);
        await database.deleteManyWithSession('sprints', { project_id: id }, session);
        await database.deleteManyWithSession('columns_status', { project_id: id }, session);
        await database.deleteManyWithSession('tags', { project_id: id }, session);
        await database.deleteManyWithSession('project_members', { project_id: id }, session);
        return database.deleteWithSession('projects', id, session);
      });
    } else {
      // Fallback: non-transactional delete
      await database.deleteMany('tasks', { project_id: id });
      await database.deleteMany('sprints', { project_id: id });
      await database.deleteMany('columns_status', { project_id: id });
      await database.deleteMany('tags', { project_id: id });
      await database.deleteMany('project_members', { project_id: id });
      return database.delete('projects', id);
    }
  },

  async getMembers(projectId: string) {
    const members = await database.findMany<any>('project_members', { project_id: projectId });
    if (members.length === 0) return [];

    // Batch load all users at once instead of N queries
    const userIds = members.map(pm => pm.user_id);
    const usersMap = await database.findByIds<any>('users', userIds);

    return members
      .map(pm => {
        const user = usersMap.get(pm.user_id);
        if (!user) return null;
        return {
          id: user.id,
          name: user.name,
          email: user.email,
          avatar_url: user.avatar_url,
          user_role: user.role,
          project_role: pm.role,
          joined_at: pm.joined_at,
        };
      })
      .filter(Boolean);
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
