import database, { now, PaginationOptions, PaginatedResult, DEFAULT_PAGE_SIZE } from '../lib/database.js';

export interface Task {
  id: string;
  task_key: string;
  project_id: string;
  column_id: string;
  sprint_id: string | null;
  parent_epic_id: string | null;
  title: string;
  description: string | null;
  type: string;
  priority: string;
  status: string | null;
  points: number | null;
  assignee_id: string | null;
  reporter_id: string | null;
  due_date: string | null;
  start_date: string | null;
  actual_start_date: string | null;
  completed_date: string | null;
  time_spent: string | null;
  estimate: string | null;
  impact_score: number | null;
  product_theme: string | null;
  acceptance_criteria: string[] | null;
  customer_value: string | null;
  technical_debt: boolean | null;
  environment: string[] | null;
  labels: string[] | null;
  resolution: string | null;
  external_links: string[] | null;
  blocked_by: string[] | null;
  blocks: string[] | null;
  image_url: string | null;
  created_at: string;
  updated_at: string;
}

export interface Subtask {
  id: string;
  task_id: string;
  title: string;
  type: string;
  status: string;
  is_completed: boolean;
  assignee_id: string | null;
  sprint_id: string | null;
  due_date: string | null;
  created_at: string;
}

export interface TaskLink {
  id: string;
  blocking_task_id: string;
  blocked_task_id: string;
  link_type: 'blocks' | 'relates_to' | 'duplicates';
  created_by: string | null;
  created_at: string;
  blocking_task?: {
    id: string;
    task_key: string;
    title: string;
    type: string;
    priority: string;
    column_id: string;
  };
  blocked_task?: {
    id: string;
    task_key: string;
    title: string;
    type: string;
    priority: string;
    column_id: string;
  };
}

export interface CreateTaskInput {
  project_id: string;
  title: string;
  description?: string;
  type?: string;
  priority?: string;
  points?: number;
  assignee_id?: string;
  reporter_id?: string;
  sprint_id?: string;
  column_id?: string;
  due_date?: string;
  start_date?: string;
  parent_epic_id?: string;
}

export interface TaskWithDetails extends Task {
  column_title?: string;
  assignee_name?: string;
  assignee_avatar?: string;
  tags?: any[];
  comments_count?: number;
  subtasks_count?: number;
  has_description?: boolean;
}

export interface TaskPermissions {
  canEdit: boolean;        // Full edit access (reporter, admin, project owner)
  canComment: boolean;     // Can add comments
  canChangeStatus: boolean; // Can move task between columns
  canDelete: boolean;      // Can delete the task
  isReporter: boolean;     // User is the reporter
  isAssignee: boolean;     // User is the assignee
}

export interface TaskWithPermissions extends TaskWithDetails {
  permissions?: TaskPermissions;
}

// Helper to generate task key
async function generateTaskKey(projectId: string): Promise<string> {
  const project = await database.findById<any>('projects', projectId);
  const projectCode = project?.code || 'TSK';

  // Get all tasks for this project to determine next number
  const tasks = await database.findMany<Task>('tasks', { project_id: projectId });
  const maxNum = tasks.reduce((max, task) => {
    const match = task.task_key?.match(/-(\d+)$/);
    const num = match ? parseInt(match[1], 10) : 0;
    return Math.max(max, num);
  }, 0);

  return `${projectCode}-${maxNum + 1}`;
}

export const tasksService = {
  // Paginated getAll with efficient batch loading
  async getAllPaginated(
    filters?: {
      project_id?: string;
      sprint_id?: string;
      assignee_id?: string;
      reporter_id?: string;
      user_id?: string;
      project_ids?: string[]; // For filtering by multiple projects
    },
    pagination?: PaginationOptions
  ): Promise<PaginatedResult<TaskWithDetails>> {
    // Build MongoDB query
    const query: Record<string, any> = {};

    if (filters?.project_id) {
      query.project_id = filters.project_id;
    } else if (filters?.project_ids && filters.project_ids.length > 0) {
      query.project_id = { $in: filters.project_ids };
    }

    if (filters?.sprint_id) {
      query.sprint_id = filters.sprint_id;
    }
    if (filters?.assignee_id) {
      query.assignee_id = filters.assignee_id;
    }
    if (filters?.reporter_id) {
      query.reporter_id = filters.reporter_id;
    }
    if (filters?.user_id) {
      query.$or = [
        { assignee_id: filters.user_id },
        { reporter_id: filters.user_id }
      ];
    }

    const result = await database.findManyPaginated<Task>('tasks', query, {
      page: pagination?.page || 1,
      limit: pagination?.limit || DEFAULT_PAGE_SIZE,
      sortBy: pagination?.sortBy || 'updated_at',
      sortOrder: pagination?.sortOrder || 'desc',
    });

    // Batch enrich tasks (fixes N+1)
    const enrichedTasks = await this.enrichTasksBatch(result.data);

    return {
      data: enrichedTasks,
      pagination: result.pagination,
    };
  },

  // Legacy getAll for backward compatibility (still uses batch enrichment)
  async getAll(filters?: { project_id?: string; sprint_id?: string; assignee_id?: string; reporter_id?: string; user_id?: string }): Promise<TaskWithDetails[]> {
    // Build MongoDB query instead of filtering in JS
    const query: Record<string, any> = {};

    if (filters?.project_id) {
      query.project_id = filters.project_id;
    }
    if (filters?.sprint_id) {
      query.sprint_id = filters.sprint_id;
    }
    if (filters?.assignee_id) {
      query.assignee_id = filters.assignee_id;
    }
    if (filters?.reporter_id) {
      query.reporter_id = filters.reporter_id;
    }
    if (filters?.user_id) {
      query.$or = [
        { assignee_id: filters.user_id },
        { reporter_id: filters.user_id }
      ];
    }

    const tasks = Object.keys(query).length > 0
      ? await database.findMany<Task>('tasks', query)
      : await database.getAll<Task>('tasks');

    // Use batch enrichment instead of individual enrichment
    return this.enrichTasksBatch(tasks);
  },

  async getById(id: string): Promise<TaskWithDetails | null> {
    // Try by ID first, then by task_key
    let task = await database.findById<Task>('tasks', id);
    if (!task) {
      task = await database.findOne<Task>('tasks', { task_key: id });
    }
    if (!task) return null;
    return this.enrichTask(task);
  },

  async enrichTask(task: Task): Promise<TaskWithDetails> {
    // Get column title
    const column = task.column_id ? await database.findById<any>('columns_status', task.column_id) : null;

    // Get assignee info
    const assignee = task.assignee_id ? await database.findById<any>('users', task.assignee_id) : null;

    // Get tags
    const taskTags = await database.findMany<any>('task_tags', { task_id: task.id });
    const tags = await Promise.all(taskTags.map(async tt => {
      const tag = await database.findById<any>('tags', tt.tag_id);
      return tag;
    }));

    // Get counts
    const comments = await database.findMany<any>('comments', { task_id: task.id });
    const subtasks = await database.findMany<any>('subtasks', { task_id: task.id });

    return {
      ...task,
      column_title: column?.title || null,
      assignee_name: assignee?.name || null,
      assignee_avatar: assignee?.avatar_url || null,
      tags: tags.filter(Boolean),
      comments_count: comments.length,
      subtasks_count: subtasks.length,
      has_description: !!task.description && task.description.length > 0,
    };
  },

  // Batch enrich tasks - fixes N+1 query problem
  // Instead of 6+ queries per task, this does ~6 total queries for ALL tasks
  async enrichTasksBatch(tasks: Task[]): Promise<TaskWithDetails[]> {
    if (tasks.length === 0) return [];

    const taskIds = tasks.map(t => t.id);
    const columnIds = [...new Set(tasks.map(t => t.column_id).filter(Boolean))];
    const assigneeIds = [...new Set(tasks.map(t => t.assignee_id).filter(Boolean))] as string[];

    // Batch load all related data in parallel (6 queries total instead of 6 * N)
    const [columnsMap, usersMap, taskTagsMap, commentsCountMap, subtasksCountMap] = await Promise.all([
      // Load all columns at once
      database.findByIds<any>('columns_status', columnIds),
      // Load all assignees at once
      database.findByIds<any>('users', assigneeIds),
      // Load all task_tags grouped by task_id
      database.findManyByField<any>('task_tags', 'task_id', taskIds),
      // Count comments per task
      database.countByField('comments', 'task_id', taskIds),
      // Count subtasks per task
      database.countByField('subtasks', 'task_id', taskIds),
    ]);

    // Get all unique tag IDs from task_tags
    const allTagIds: string[] = [];
    taskTagsMap.forEach(taskTags => {
      taskTags.forEach(tt => allTagIds.push(tt.tag_id));
    });
    const tagsMap = await database.findByIds<any>('tags', [...new Set(allTagIds)]);

    // Enrich all tasks using the batch-loaded data
    return tasks.map(task => {
      const column = task.column_id ? columnsMap.get(task.column_id) : null;
      const assignee = task.assignee_id ? usersMap.get(task.assignee_id) : null;
      const taskTags = taskTagsMap.get(task.id) || [];
      const tags = taskTags.map(tt => tagsMap.get(tt.tag_id)).filter(Boolean);

      return {
        ...task,
        column_title: column?.title || null,
        assignee_name: assignee?.name || null,
        assignee_avatar: assignee?.avatar_url || null,
        tags,
        comments_count: commentsCountMap.get(task.id) || 0,
        subtasks_count: subtasksCountMap.get(task.id) || 0,
        has_description: !!task.description && task.description.length > 0,
      };
    });
  },

  async create(input: CreateTaskInput): Promise<TaskWithDetails> {
    const taskKey = await generateTaskKey(input.project_id);

    // Get default column if not provided
    let columnId = input.column_id;
    if (!columnId) {
      const defaultColumn = await database.findOne<any>('columns_status', {
        project_id: input.project_id,
        is_default: true
      });
      columnId = defaultColumn?.id;

      // If no default, get first column
      if (!columnId) {
        const columns = await database.findMany<any>('columns_status', { project_id: input.project_id });
        columnId = columns[0]?.id;
      }
    }

    const taskData = {
      task_key: taskKey,
      project_id: input.project_id,
      column_id: columnId || '',
      sprint_id: input.sprint_id || null,
      parent_epic_id: input.parent_epic_id || null,
      title: input.title,
      description: input.description || null,
      type: input.type || 'task',
      priority: input.priority || 'MEDIUM',
      status: null,
      points: input.points || null,
      assignee_id: input.assignee_id || null,
      reporter_id: input.reporter_id || null,
      due_date: input.due_date || null,
      start_date: input.start_date || null,
      actual_start_date: null,
      completed_date: null,
      time_spent: null,
      estimate: null,
      impact_score: null,
      product_theme: null,
      acceptance_criteria: null,
      customer_value: null,
      technical_debt: null,
      environment: null,
      labels: null,
      resolution: null,
      external_links: null,
      blocked_by: null,
      blocks: null,
      image_url: null,
      created_at: now(),
      updated_at: now(),
    };

    // Use the returned document which has the correct MongoDB-generated _id
    const task = await database.insert<Task>('tasks', taskData);
    return this.enrichTask(task);
  },

  async update(id: string, updates: Partial<CreateTaskInput>): Promise<TaskWithDetails | null> {
    const existing = await database.findById<Task>('tasks', id);
    if (!existing) {
      // Try by task_key
      const byKey = await database.findOne<Task>('tasks', { task_key: id });
      if (!byKey) return null;
      id = byKey.id;
    }

    // If column_id is provided, resolve it to actual column UUID
    // Frontend sends short names like 'todo', 'inprogress' - need to find actual column
    if (updates.column_id) {
      const isUUID = updates.column_id.includes('-') && updates.column_id.length > 20;
      if (!isUUID) {
        // Map frontend column names to backend column titles
        const columnNameMap: Record<string, string> = {
          'idea': 'IDEA',
          'todo': 'TO DO',
          'inprogress': 'IN PROGRESS',
          'blocked': 'BLOCKED',
          'testing': 'TESTING',
          'done': 'DONE',
        };
        const columnTitle = columnNameMap[updates.column_id.toLowerCase()] || updates.column_id.toUpperCase();

        // Find the column by title for this task's project
        const task = existing || await database.findById<Task>('tasks', id);
        if (task) {
          const column = await database.findOne<any>('columns_status', {
            project_id: task.project_id,
            title: columnTitle
          });
          if (column) {
            updates.column_id = column.id;
          }
        }
      }
    }

    const updated = await database.update<Task>('tasks', id, {
      ...updates,
      updated_at: now(),
    });

    if (!updated) return null;
    return this.enrichTask(updated);
  },

  async delete(id: string): Promise<boolean> {
    // Try by ID first
    let task = await database.findById<Task>('tasks', id);
    if (!task) {
      task = await database.findOne<Task>('tasks', { task_key: id });
      if (task) id = task.id;
    }
    if (!task) return false;

    // Delete related data
    await database.deleteMany('subtasks', { task_id: id });
    await database.deleteMany('task_tags', { task_id: id });
    await database.deleteMany('comments', { task_id: id });
    await database.deleteMany('attachments', { task_id: id });

    return database.delete('tasks', id);
  },

  // Move task to different column
  async moveToColumn(id: string, columnId: string): Promise<TaskWithDetails | null> {
    return this.update(id, { column_id: columnId } as any);
  },

  // Assign task to sprint
  async assignToSprint(id: string, sprintId: string | null): Promise<TaskWithDetails | null> {
    return this.update(id, { sprint_id: sprintId } as any);
  },

  // Subtask management
  async getSubtasks(taskId: string): Promise<Subtask[]> {
    return database.findMany<Subtask>('subtasks', { task_id: taskId });
  },

  async createSubtask(taskId: string, input: { title: string; assignee_id?: string }): Promise<Subtask> {
    const subtaskData = {
      task_id: taskId,
      title: input.title,
      type: 'task',
      status: 'pending',
      is_completed: false,
      assignee_id: input.assignee_id || null,
      sprint_id: null,
      due_date: null,
      created_at: now(),
    };

    // Use the returned document which has the correct MongoDB-generated _id
    return database.insert<Subtask>('subtasks', subtaskData);
  },

  async updateSubtask(subtaskId: string, updates: Partial<Subtask>): Promise<Subtask | null> {
    return database.update<Subtask>('subtasks', subtaskId, updates);
  },

  async deleteSubtask(subtaskId: string): Promise<boolean> {
    return database.delete('subtasks', subtaskId);
  },

  // ============================================
  // Task Links (Dependencies)
  // ============================================

  async getTaskLinks(taskId: string): Promise<{ blockedBy: TaskLink[]; blocks: TaskLink[] }> {
    // Get links where this task is blocked by others
    const blockedByLinks = await database.findMany<TaskLink>('task_links', { blocked_task_id: taskId });
    // Get links where this task blocks others
    const blocksLinks = await database.findMany<TaskLink>('task_links', { blocking_task_id: taskId });

    // Enrich with task details
    const enrichedBlockedBy = await Promise.all(blockedByLinks.map(async (link) => {
      const blockingTask = await database.findById<Task>('tasks', link.blocking_task_id);
      return {
        ...link,
        blocking_task: blockingTask ? {
          id: blockingTask.id,
          task_key: blockingTask.task_key,
          title: blockingTask.title,
          type: blockingTask.type,
          priority: blockingTask.priority,
          column_id: blockingTask.column_id,
        } : undefined,
      };
    }));

    const enrichedBlocks = await Promise.all(blocksLinks.map(async (link) => {
      const blockedTask = await database.findById<Task>('tasks', link.blocked_task_id);
      return {
        ...link,
        blocked_task: blockedTask ? {
          id: blockedTask.id,
          task_key: blockedTask.task_key,
          title: blockedTask.title,
          type: blockedTask.type,
          priority: blockedTask.priority,
          column_id: blockedTask.column_id,
        } : undefined,
      };
    }));

    return { blockedBy: enrichedBlockedBy, blocks: enrichedBlocks };
  },

  async addTaskLink(blockedTaskId: string, blockingTaskId: string, linkType: string = 'blocks', createdBy?: string): Promise<TaskLink> {
    const linkData = {
      blocking_task_id: blockingTaskId,
      blocked_task_id: blockedTaskId,
      link_type: (linkType as 'blocks' | 'relates_to' | 'duplicates') || 'blocks',
      created_by: createdBy || null,
      created_at: now(),
    };

    // Use the returned document which has the correct MongoDB-generated _id
    const link = await database.insert<TaskLink>('task_links', linkData);

    // Return enriched link
    const blockingTask = await database.findById<Task>('tasks', blockingTaskId);
    return {
      ...link,
      blocking_task: blockingTask ? {
        id: blockingTask.id,
        task_key: blockingTask.task_key,
        title: blockingTask.title,
        type: blockingTask.type,
        priority: blockingTask.priority,
        column_id: blockingTask.column_id,
      } : undefined,
    };
  },

  async removeTaskLink(linkId: string): Promise<boolean> {
    return database.delete('task_links', linkId);
  },

  async getAvailableLinksForTask(taskId: string): Promise<{ id: string; task_key: string; title: string; type: string; priority: string }[]> {
    // Get the current task to find its project
    const task = await database.findById<Task>('tasks', taskId);
    if (!task) return [];

    // Get all tasks in the same project
    const projectTasks = await database.findMany<Task>('tasks', { project_id: task.project_id });

    // Get existing links for this task
    const existingLinks = await database.findMany<TaskLink>('task_links', { blocked_task_id: taskId });
    const linkedTaskIds = new Set(existingLinks.map(l => l.blocking_task_id));

    // Filter out the current task and already linked tasks
    return projectTasks
      .filter(t => t.id !== taskId && !linkedTaskIds.has(t.id))
      .map(t => ({
        id: t.id,
        task_key: t.task_key,
        title: t.title,
        type: t.type,
        priority: t.priority,
      }));
  },

  // ============================================
  // Permission Checking
  // ============================================

  async getTaskPermissions(taskId: string, userId: string, isAdmin: boolean): Promise<TaskPermissions> {
    const task = await database.findById<Task>('tasks', taskId);
    if (!task) {
      return {
        canEdit: false,
        canComment: false,
        canChangeStatus: false,
        canDelete: false,
        isReporter: false,
        isAssignee: false,
      };
    }

    const isReporter = task.reporter_id === userId;
    const isAssignee = task.assignee_id === userId;

    // Get project to check ownership
    const project = await database.findById<any>('projects', task.project_id);
    const isProjectOwner = project?.owner_id === userId;

    // Get project membership to check role
    const membership = await database.findOne<any>('project_members', {
      project_id: task.project_id,
      user_id: userId
    });
    const isProjectMember = !!membership;
    const projectRole = membership?.role || 'member';

    // Admins, project owners, and reporters have full edit access
    const canEdit = isAdmin || isProjectOwner || isReporter || projectRole === 'owner' || projectRole === 'admin';

    // All project members can comment and change status
    const canComment = isProjectMember || isAdmin || isProjectOwner;
    const canChangeStatus = isProjectMember || isAdmin || isProjectOwner;

    // Only admins, project owners, and reporters can delete
    const canDelete = isAdmin || isProjectOwner || isReporter || projectRole === 'owner';

    return {
      canEdit,
      canComment,
      canChangeStatus,
      canDelete,
      isReporter,
      isAssignee,
    };
  },

  // Check if update is a status-only change (allowed for all members)
  isStatusOnlyUpdate(updates: Partial<CreateTaskInput>): boolean {
    const statusOnlyFields = ['column_id', 'status'];
    const updateKeys = Object.keys(updates).filter(k => updates[k as keyof CreateTaskInput] !== undefined);
    return updateKeys.every(key => statusOnlyFields.includes(key));
  },

  // Batch get permissions for multiple tasks (fixes N+1 permission queries)
  // Caches project data to avoid repeated lookups
  async getTaskPermissionsBatch(
    tasks: TaskWithDetails[],
    userId: string,
    isAdmin: boolean
  ): Promise<Map<string, TaskPermissions>> {
    if (tasks.length === 0) return new Map();

    const projectIds = [...new Set(tasks.map(t => t.project_id))];

    // Batch load all projects and memberships
    const [projectsMap, membershipsByProject] = await Promise.all([
      database.findByIds<any>('projects', projectIds),
      database.findManyByField<any>('project_members', 'project_id', projectIds),
    ]);

    // Build a map of user's membership by project
    const userMembershipByProject = new Map<string, any>();
    membershipsByProject.forEach((members, projectId) => {
      const userMembership = members.find(m => m.user_id === userId);
      if (userMembership) {
        userMembershipByProject.set(projectId, userMembership);
      }
    });

    const permissionsMap = new Map<string, TaskPermissions>();

    for (const task of tasks) {
      const isReporter = task.reporter_id === userId;
      const isAssignee = task.assignee_id === userId;

      const project = projectsMap.get(task.project_id);
      const isProjectOwner = project?.owner_id === userId;

      const membership = userMembershipByProject.get(task.project_id);
      const isProjectMember = !!membership;
      const projectRole = membership?.role || 'member';

      const canEdit = isAdmin || isProjectOwner || isReporter || projectRole === 'owner' || projectRole === 'admin';
      const canComment = isProjectMember || isAdmin || isProjectOwner;
      const canChangeStatus = isProjectMember || isAdmin || isProjectOwner;
      const canDelete = isAdmin || isProjectOwner || isReporter || projectRole === 'owner';

      permissionsMap.set(task.id, {
        canEdit,
        canComment,
        canChangeStatus,
        canDelete,
        isReporter,
        isAssignee,
      });
    }

    return permissionsMap;
  },
};
