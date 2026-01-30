import database, { generateUUID, now } from '../lib/database.js';

export interface Task {
  id: string;
  project_id: string;
  column_id: string | null;
  sprint_id: string | null;
  assignee_id: string | null;
  reporter_id: string | null;
  task_number: number;
  title: string;
  description: string | null;
  type: 'feature' | 'task' | 'bug' | 'story';
  priority: 'HIGH' | 'MEDIUM' | 'LOW';
  points: number | null;
  estimate: string | null;
  time_spent: string | null;
  start_date: string | null;
  due_date: string | null;
  completed_at: string | null;
  impact_score: number | null;
  product_theme: string | null;
  image_url: string | null;
  has_description: boolean;
  created_at: string;
  updated_at: string;
}

export interface TaskDetailed extends Task {
  task_key: string;
  project_name: string;
  project_code: string;
  column_title: string | null;
  sprint_name: string | null;
  assignee_name: string | null;
  assignee_avatar: string | null;
  comments_count: number;
  subtasks_count: number;
  subtasks_completed: number;
  tags: Array<{ id: string; label: string; color: string }>;
  subtasks: Array<any>;
}

export interface CreateTaskInput {
  project_id: string;
  column_id?: string;
  sprint_id?: string;
  assignee_id?: string;
  reporter_id?: string;
  title: string;
  description?: string;
  type?: 'feature' | 'task' | 'bug' | 'story';
  priority?: 'HIGH' | 'MEDIUM' | 'LOW';
  points?: number;
  estimate?: string;
  start_date?: string;
  due_date?: string;
  impact_score?: number;
  product_theme?: string;
  image_url?: string;
  tag_ids?: string[];
}

// Map frontend column IDs to column titles
const frontendColumnIdToTitle: Record<string, string> = {
  'idea': 'IDEA',
  'todo': 'TO DO',
  'inprogress': 'IN PROGRESS',
  'blocked': 'BLOCKED',
  'testing': 'TESTING',
  'done': 'DONE',
};

// Resolve column_id: if it's a frontend ID like 'todo', find the actual column UUID
function resolveColumnId(columnId: string | undefined, projectId: string): string | null {
  if (!columnId) return null;

  // Check if it's a frontend column ID (not a UUID)
  const isFrontendId = !columnId.includes('-') || columnId.length < 20;

  if (isFrontendId && frontendColumnIdToTitle[columnId.toLowerCase()]) {
    // Look up the column by title for this project
    const title = frontendColumnIdToTitle[columnId.toLowerCase()];
    const column = database.findOne<any>('columns_status',
      c => c.project_id === projectId && c.title.toUpperCase() === title
    );
    return column?.id || null;
  }

  // It's already a UUID, use it directly
  return columnId;
}

function enrichTask(task: Task): TaskDetailed {
  const project = database.findById<any>('projects', task.project_id);
  const column = task.column_id ? database.findById<any>('columns_status', task.column_id) : null;
  const sprint = task.sprint_id ? database.findById<any>('sprints', task.sprint_id) : null;
  const assignee = task.assignee_id ? database.findById<any>('users', task.assignee_id) : null;

  const taskTags = database.findMany<any>('task_tags', tt => tt.task_id === task.id);
  const tags = taskTags.map(tt => database.findById<any>('tags', tt.tag_id)).filter(Boolean);

  const subtasks = database.findMany<any>('subtasks', s => s.parent_task_id === task.id)
    .sort((a, b) => a.display_order - b.display_order)
    .map(s => {
      const subtaskAssignee = s.assignee_id ? database.findById<any>('users', s.assignee_id) : null;
      return {
        ...s,
        assignee_name: subtaskAssignee?.name || null,
        assignee_avatar: subtaskAssignee?.avatar_url || null,
      };
    });

  const commentsCount = database.count('comments', c => c.task_id === task.id);

  return {
    ...task,
    task_key: `${project?.code || ''}-${task.task_number}`,
    project_name: project?.name || '',
    project_code: project?.code || '',
    column_title: column?.title || null,
    sprint_name: sprint?.name || null,
    assignee_name: assignee?.name || null,
    assignee_avatar: assignee?.avatar_url || null,
    comments_count: commentsCount,
    subtasks_count: subtasks.length,
    subtasks_completed: subtasks.filter(s => s.is_completed).length,
    tags: tags.map(t => ({ id: t.id, label: t.label, color: t.color })),
    subtasks,
  };
}

export const tasksService = {
  getAll(filters?: {
    project_id?: string;
    column_id?: string;
    sprint_id?: string;
    assignee_id?: string;
    type?: string;
    priority?: string;
    search?: string;
  }): TaskDetailed[] {
    let tasks = database.getAll<Task>('tasks');

    if (filters?.project_id) tasks = tasks.filter(t => t.project_id === filters.project_id);
    if (filters?.column_id) tasks = tasks.filter(t => t.column_id === filters.column_id);
    if (filters?.sprint_id) tasks = tasks.filter(t => t.sprint_id === filters.sprint_id);
    if (filters?.assignee_id) tasks = tasks.filter(t => t.assignee_id === filters.assignee_id);
    if (filters?.type) tasks = tasks.filter(t => t.type === filters.type);
    if (filters?.priority) tasks = tasks.filter(t => t.priority === filters.priority);
    if (filters?.search) {
      const search = filters.search.toLowerCase();
      tasks = tasks.filter(t =>
        t.title.toLowerCase().includes(search) ||
        (t.description?.toLowerCase().includes(search) || false)
      );
    }

    return tasks
      .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
      .map(enrichTask);
  },

  /**
   * Get tasks filtered by user access
   * - Admins see all tasks
   * - Non-admins see tasks where:
   *   - They are the reporter, OR
   *   - They are the assignee, OR
   *   - They are a member of the task's project
   */
  getAllForUser(userId: string, isAdmin: boolean, filters?: {
    project_id?: string;
    column_id?: string;
    sprint_id?: string;
    assignee_id?: string;
    type?: string;
    priority?: string;
    search?: string;
  }): TaskDetailed[] {
    let tasks = database.getAll<Task>('tasks');

    // Apply access control for non-admins
    if (!isAdmin) {
      // Get all project IDs where the user is a member or owner
      const membershipProjectIds = new Set(
        database.findMany<any>('project_members', pm => pm.user_id === userId)
          .map(pm => pm.project_id)
      );

      // Also include projects where user is owner
      database.getAll<any>('projects')
        .filter(p => p.owner_id === userId)
        .forEach(p => membershipProjectIds.add(p.id));

      // Filter tasks where user has access
      tasks = tasks.filter(task =>
        task.reporter_id === userId ||
        task.assignee_id === userId ||
        membershipProjectIds.has(task.project_id)
      );
    }

    // Apply standard filters
    if (filters?.project_id) tasks = tasks.filter(t => t.project_id === filters.project_id);
    if (filters?.column_id) tasks = tasks.filter(t => t.column_id === filters.column_id);
    if (filters?.sprint_id) tasks = tasks.filter(t => t.sprint_id === filters.sprint_id);
    if (filters?.assignee_id) tasks = tasks.filter(t => t.assignee_id === filters.assignee_id);
    if (filters?.type) tasks = tasks.filter(t => t.type === filters.type);
    if (filters?.priority) tasks = tasks.filter(t => t.priority === filters.priority);
    if (filters?.search) {
      const search = filters.search.toLowerCase();
      tasks = tasks.filter(t =>
        t.title.toLowerCase().includes(search) ||
        (t.description?.toLowerCase().includes(search) || false)
      );
    }

    return tasks
      .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
      .map(enrichTask);
  },

  /**
   * Check if a user has access to a specific task
   */
  userHasAccess(taskId: string, userId: string, isAdmin: boolean): boolean {
    if (isAdmin) return true;

    const task = database.findById<Task>('tasks', taskId);
    if (!task) return false;

    // User is reporter or assignee
    if (task.reporter_id === userId || task.assignee_id === userId) {
      return true;
    }

    // User is a member of the project
    const project = database.findById<any>('projects', task.project_id);
    if (project?.owner_id === userId) return true;

    const membership = database.findOne<any>('project_members',
      pm => pm.project_id === task.project_id && pm.user_id === userId
    );

    return Boolean(membership);
  },

  getById(id: string): TaskDetailed | null {
    const task = database.findById<Task>('tasks', id);
    if (!task) return null;
    return enrichTask(task);
  },

  getTaskTags(taskId: string) {
    const taskTags = database.findMany<any>('task_tags', tt => tt.task_id === taskId);
    return taskTags.map(tt => database.findById<any>('tags', tt.tag_id)).filter(Boolean);
  },

  getSubtasks(taskId: string) {
    return database.findMany<any>('subtasks', s => s.parent_task_id === taskId)
      .sort((a, b) => a.display_order - b.display_order)
      .map(s => {
        const assignee = s.assignee_id ? database.findById<any>('users', s.assignee_id) : null;
        return {
          ...s,
          assignee_name: assignee?.name || null,
          assignee_avatar: assignee?.avatar_url || null,
        };
      });
  },

  getNextTaskNumber(projectId: string): number {
    const tasks = database.findMany<Task>('tasks', t => t.project_id === projectId);
    const maxNumber = tasks.reduce((max, t) => Math.max(max, t.task_number), 0);
    return maxNumber + 1;
  },

  create(input: CreateTaskInput): TaskDetailed {
    const taskNumber = this.getNextTaskNumber(input.project_id);

    // Resolve column_id (handles frontend IDs like 'todo' -> actual UUID)
    let columnId = resolveColumnId(input.column_id, input.project_id);
    if (!columnId) {
      const defaultCol = database.findOne<any>('columns_status', c => c.project_id === input.project_id && c.is_default);
      columnId = defaultCol?.id || null;
    }

    const task: Task = {
      id: generateUUID(),
      project_id: input.project_id,
      column_id: columnId || null,
      sprint_id: input.sprint_id || null,
      assignee_id: input.assignee_id || null,
      reporter_id: input.reporter_id || null,
      task_number: taskNumber,
      title: input.title,
      description: input.description || null,
      type: input.type || 'task',
      priority: input.priority || 'MEDIUM',
      points: input.points || null,
      estimate: input.estimate || null,
      time_spent: null,
      start_date: input.start_date || null,
      due_date: input.due_date || null,
      completed_at: null,
      impact_score: input.impact_score || null,
      product_theme: input.product_theme || null,
      image_url: input.image_url || null,
      has_description: Boolean(input.description),
      created_at: now(),
      updated_at: now(),
    };

    database.insert('tasks', task);

    if (input.tag_ids?.length) {
      input.tag_ids.forEach(tagId => {
        database.insert('task_tags', {
          id: generateUUID(),
          task_id: task.id,
          tag_id: tagId,
          created_at: now(),
        });
      });
    }

    return this.getById(task.id)!;
  },

  update(id: string, input: Partial<CreateTaskInput & { time_spent?: string; completed_at?: string }>): TaskDetailed | null {
    const existing = database.findById<Task>('tasks', id);
    if (!existing) return null;

    // Resolve column_id if provided (handles frontend IDs like 'todo' -> actual UUID)
    const updateData: any = { ...input };
    if (input.column_id) {
      updateData.column_id = resolveColumnId(input.column_id, existing.project_id);
    }

    database.update<Task>('tasks', id, {
      ...updateData,
      has_description: input.description !== undefined ? Boolean(input.description) : existing.has_description,
      updated_at: now(),
    });

    if (input.tag_ids !== undefined) {
      database.deleteMany('task_tags', tt => tt.task_id === id);
      input.tag_ids.forEach(tagId => {
        database.insert('task_tags', {
          id: generateUUID(),
          task_id: id,
          tag_id: tagId,
          created_at: now(),
        });
      });
    }

    return this.getById(id);
  },

  moveToColumn(id: string, columnId: string): TaskDetailed | null {
    const existing = database.findById<Task>('tasks', id);
    if (!existing) return null;

    // Resolve column_id (handles frontend IDs like 'todo' -> actual UUID)
    const resolvedColumnId = resolveColumnId(columnId, existing.project_id);
    database.update<Task>('tasks', id, { column_id: resolvedColumnId, updated_at: now() });
    return this.getById(id);
  },

  assignToSprint(id: string, sprintId: string | null): TaskDetailed | null {
    database.update<Task>('tasks', id, { sprint_id: sprintId, updated_at: now() });
    return this.getById(id);
  },

  delete(id: string): boolean {
    database.deleteMany('task_tags', tt => tt.task_id === id);
    database.deleteMany('subtasks', s => s.parent_task_id === id);
    database.deleteMany('comments', c => c.task_id === id);
    return database.delete('tasks', id);
  },

  createSubtask(input: {
    parent_task_id: string;
    title: string;
    type?: 'task' | 'bug';
    assignee_id?: string;
    sprint_id?: string;
  }) {
    const subtasks = database.findMany<any>('subtasks', s => s.parent_task_id === input.parent_task_id);
    const maxOrder = subtasks.reduce((max, s) => Math.max(max, s.display_order || 0), 0);

    const subtask = {
      id: generateUUID(),
      parent_task_id: input.parent_task_id,
      sprint_id: input.sprint_id || null,
      assignee_id: input.assignee_id || null,
      title: input.title,
      description: null,
      type: input.type || 'task',
      status: 'todo',
      is_completed: false,
      display_order: maxOrder + 1,
      created_at: now(),
      updated_at: now(),
    };

    database.insert('subtasks', subtask);
    return subtask;
  },

  updateSubtask(id: string, input: {
    title?: string;
    status?: string;
    is_completed?: boolean;
    assignee_id?: string;
  }) {
    database.update('subtasks', id, { ...input, updated_at: now() });
    return database.findById('subtasks', id);
  },

  deleteSubtask(id: string): boolean {
    return database.delete('subtasks', id);
  },
};
