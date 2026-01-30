import { supabaseAdmin } from '../lib/supabase.js';
import { NotFoundError, BadRequestError } from '../utils/errors.js';
import { authorizationService } from './authorization.service.js';
import type { Task, TaskCreate, TaskUpdate, PaginationParams } from '../types/index.js';

export interface TaskFilters {
  projectId?: string;
  sprintId?: string | null;
  columnId?: string;
  assigneeId?: string | null;
  reporterId?: string;
  search?: string;
}

class TasksService {
  async getAll(
    filters?: TaskFilters,
    pagination?: PaginationParams
  ): Promise<{ data: Task[]; total: number }> {
    let query = supabaseAdmin.from('tasks').select('*', { count: 'exact' });

    if (filters?.projectId) {
      query = query.eq('project_id', filters.projectId);
    }
    if (filters?.sprintId !== undefined) {
      query = filters.sprintId === null
        ? query.is('sprint_id', null)
        : query.eq('sprint_id', filters.sprintId);
    }
    if (filters?.columnId) {
      query = query.eq('column_id', filters.columnId);
    }
    if (filters?.assigneeId !== undefined) {
      query = filters.assigneeId === null
        ? query.is('assignee_id', null)
        : query.eq('assignee_id', filters.assigneeId);
    }
    if (filters?.reporterId) {
      query = query.eq('reporter_id', filters.reporterId);
    }
    if (filters?.search) {
      query = query.or(
        `title.ilike.%${filters.search}%,description.ilike.%${filters.search}%,task_key.ilike.%${filters.search}%`
      );
    }

    if (pagination) {
      const from = (pagination.page - 1) * pagination.limit;
      const to = from + pagination.limit - 1;
      query = query.range(from, to);
    }

    query = query.order('created_at', { ascending: false });

    const { data, error, count } = await query;

    if (error) {
      throw new BadRequestError(error.message);
    }

    return { data: data || [], total: count || 0 };
  }

  async getById(taskId: string): Promise<Task> {
    const { data, error } = await supabaseAdmin
      .from('tasks')
      .select(`
        *,
        assignee:users!assignee_id(*),
        reporter:users!reporter_id(*),
        project:projects(*),
        sprint:sprints(*),
        comments:comments(*, user:users(*)),
        attachments:task_attachments(*)
      `)
      .eq('id', taskId)
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        throw new NotFoundError('Task');
      }
      throw new BadRequestError(error.message);
    }

    return data as Task;
  }

  async create(
    data: TaskCreate,
    reporterId: string,
    workspaceId: string
  ): Promise<Task> {
    // Generate task key
    const { data: project } = await supabaseAdmin
      .from('projects')
      .select('key, task_count')
      .eq('id', data.project_id)
      .single();

    const taskKey = project
      ? `${project.key}-${(project.task_count || 0) + 1}`
      : `TASK-${Date.now()}`;

    const { data: task, error } = await supabaseAdmin
      .from('tasks')
      .insert({
        ...data,
        task_key: taskKey,
        reporter_id: reporterId,
      })
      .select()
      .single();

    if (error) {
      throw new BadRequestError(error.message);
    }

    // Update task count
    if (project) {
      await supabaseAdmin
        .from('projects')
        .update({ task_count: (project.task_count || 0) + 1 })
        .eq('id', data.project_id);
    }

    // Create authorization tuples
    await authorizationService.onTaskCreated(
      task.id,
      workspaceId,
      reporterId,
      data.assignee_id
    );

    // Log activity
    await this.logActivity(task.id, reporterId, 'created');

    return task as Task;
  }

  async update(taskId: string, data: TaskUpdate, userId: string): Promise<Task> {
    const { data: task, error } = await supabaseAdmin
      .from('tasks')
      .update(data)
      .eq('id', taskId)
      .select()
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        throw new NotFoundError('Task');
      }
      throw new BadRequestError(error.message);
    }

    await this.logActivity(taskId, userId, 'updated');

    return task as Task;
  }

  async updateStage(taskId: string, columnId: string, userId: string): Promise<Task> {
    const { data: task, error } = await supabaseAdmin
      .from('tasks')
      .update({ column_id: columnId })
      .eq('id', taskId)
      .select()
      .single();

    if (error) {
      throw new BadRequestError(error.message);
    }

    await this.logActivity(taskId, userId, 'stage_changed', {
      field: 'column_id',
      newValue: columnId,
    });

    return task as Task;
  }

  async updateAssignee(
    taskId: string,
    newAssigneeId: string | null,
    userId: string
  ): Promise<Task> {
    // Get current assignee
    const { data: currentTask } = await supabaseAdmin
      .from('tasks')
      .select('assignee_id')
      .eq('id', taskId)
      .single();

    const oldAssigneeId = currentTask?.assignee_id || null;

    // Update task
    const { data: task, error } = await supabaseAdmin
      .from('tasks')
      .update({ assignee_id: newAssigneeId })
      .eq('id', taskId)
      .select()
      .single();

    if (error) {
      throw new BadRequestError(error.message);
    }

    // Update authorization tuples
    await authorizationService.onTaskAssigneeChanged(
      taskId,
      oldAssigneeId,
      newAssigneeId
    );

    await this.logActivity(taskId, userId, 'assignee_changed', {
      field: 'assignee_id',
      oldValue: oldAssigneeId,
      newValue: newAssigneeId,
    });

    return task as Task;
  }

  async delete(taskId: string, workspaceId: string): Promise<void> {
    // Get task details first
    const { data: task } = await supabaseAdmin
      .from('tasks')
      .select('reporter_id, assignee_id')
      .eq('id', taskId)
      .single();

    if (!task) {
      throw new NotFoundError('Task');
    }

    // Delete task
    const { error } = await supabaseAdmin
      .from('tasks')
      .delete()
      .eq('id', taskId);

    if (error) {
      throw new BadRequestError(error.message);
    }

    // Clean up authorization tuples
    await authorizationService.onTaskDeleted(
      taskId,
      workspaceId,
      task.reporter_id,
      task.assignee_id
    );
  }

  // Comments
  async addComment(
    taskId: string,
    userId: string,
    content: string
  ): Promise<{ id: string; content: string }> {
    const { data: comment, error } = await supabaseAdmin
      .from('comments')
      .insert({
        task_id: taskId,
        user_id: userId,
        content,
      })
      .select()
      .single();

    if (error) {
      throw new BadRequestError(error.message);
    }

    await this.logActivity(taskId, userId, 'commented');

    return comment;
  }

  async getComments(taskId: string): Promise<any[]> {
    const { data, error } = await supabaseAdmin
      .from('comments')
      .select('*, user:users(*)')
      .eq('task_id', taskId)
      .order('created_at', { ascending: true });

    if (error) {
      throw new BadRequestError(error.message);
    }

    return data || [];
  }

  // Activity logging
  private async logActivity(
    taskId: string,
    userId: string,
    action: string,
    changes?: { field: string; oldValue?: any; newValue?: any }
  ): Promise<void> {
    try {
      await supabaseAdmin.from('activity_logs').insert({
        entity_type: 'task',
        entity_id: taskId,
        action,
        user_id: userId,
        field_changed: changes?.field,
        old_value: changes?.oldValue ? String(changes.oldValue) : null,
        new_value: changes?.newValue ? String(changes.newValue) : null,
      });
    } catch (error) {
      console.error('Failed to log activity:', error);
    }
  }
}

export const tasksService = new TasksService();
