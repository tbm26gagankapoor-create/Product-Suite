
import { supabase } from '../lib/supabase';
import { handleSupabaseError } from '../utils/errors';
import { 
  Task, 
  TaskInsert, 
  TaskUpdate, 
  TaskWithRelations,
  TaskTag,
  TagColor,
  Comment,
  CommentWithUser,
  TaskAttachment,
  ActivityLogWithUser,
  PaginationParams,
  TaskType,
  Priority,
  User
} from '../types/database.types';

export interface TaskFilters {
  projectId?: string;
  sprintId?: string | null;
  columnId?: string | string[];
  type?: TaskType | TaskType[];
  priority?: Priority | Priority[];
  assigneeId?: string | null;
  reporterId?: string;
  parentEpicId?: string | null;
  search?: string;
  tags?: string[];
  isOverdue?: boolean;
}

export class TasksService {
  // --- Basic CRUD ---

  async getAll(filters?: TaskFilters, pagination?: PaginationParams): Promise<{ data: Task[]; count: number }> {
    let query = supabase.from('tasks').select('*', { count: 'exact' });
    query = this.applyFilters(query, filters);

    if (pagination?.page && pagination?.limit) {
      const from = (pagination.page - 1) * pagination.limit;
      const to = from + pagination.limit - 1;
      query = query.range(from, to);
    }

    query = query.order('created_at', { ascending: false });

    const { data, error, count } = await query;
    if (error) handleSupabaseError(error);
    return { data: data || [], count: count || 0 };
  }

  async getAllWithRelations(filters?: TaskFilters): Promise<TaskWithRelations[]> {
    let query = supabase.from('tasks').select(`
      *,
      assignee:users!assignee_id(*),
      reporter:users!reporter_id(*),
      project:projects(*),
      sprint:sprints(*),
      parent_epic:tasks!parent_epic_id(*),
      tags:task_tags(*),
      comments:comments(*, user:users(*)),
      attachments:task_attachments(*),
      children:tasks!parent_epic_id(*)
    `);

    query = this.applyFilters(query, filters);
    query = query.order('created_at', { ascending: false });

    const { data, error } = await query;
    if (error) handleSupabaseError(error);

    return (data || []).map((t: any) => ({
      ...t,
      comments_count: t.comments?.length || 0
    })) as TaskWithRelations[];
  }

  async getById(id: string): Promise<TaskWithRelations | null> {
    const { data, error } = await supabase
      .from('tasks')
      .select(`
        *,
        assignee:users!assignee_id(*),
        reporter:users!reporter_id(*),
        project:projects(*),
        sprint:sprints(*),
        parent_epic:tasks!parent_epic_id(*),
        tags:task_tags(*),
        comments:comments(*, user:users(*)),
        attachments:task_attachments(*),
        children:tasks!parent_epic_id(*)
      `)
      .eq('id', id)
      .single();

    if (error) {
        if (error.code === 'PGRST116') return null;
        handleSupabaseError(error);
    }
    return { ...data, comments_count: data.comments?.length || 0 } as TaskWithRelations;
  }

  async create(data: TaskInsert): Promise<Task> {
    const { data: task, error } = await supabase
      .from('tasks')
      .insert(data)
      .select()
      .single();

    if (error) handleSupabaseError(error);
    await this.logActivity(task.id, 'created');
    return task;
  }

  async update(id: string, data: TaskUpdate): Promise<Task> {
    const { data: task, error } = await supabase
      .from('tasks')
      .update(data)
      .eq('id', id)
      .select()
      .single();

    if (error) handleSupabaseError(error);
    await this.logActivity(task.id, 'updated');
    return task;
  }

  async delete(id: string): Promise<void> {
    const { error } = await supabase.from('tasks').delete().eq('id', id);
    if (error) handleSupabaseError(error);
  }

  async moveToColumn(taskId: string, columnId: string): Promise<Task> {
    const { data: task, error } = await supabase
      .from('tasks')
      .update({ column_id: columnId })
      .eq('id', taskId)
      .select()
      .single();

    if (error) handleSupabaseError(error);
    await this.logActivity(taskId, 'moved', { field: 'column_id', oldValue: null, newValue: columnId });
    return task;
  }

  // --- Statistics ---

  async getProjectStats(projectId: string): Promise<{
    byStatus: Record<string, number>;
    byType: Record<TaskType, number>;
    byPriority: Record<Priority, number>;
    byAssignee: { user: User; count: number }[];
  }> {
    const { data, error } = await supabase
      .from('tasks')
      .select('column_id, type, priority, assignee:users!assignee_id(*)')
      .eq('project_id', projectId);

    if (error) handleSupabaseError(error);

    const stats = {
      byStatus: {} as Record<string, number>,
      byType: {} as Record<TaskType, number>,
      byPriority: {} as Record<Priority, number>,
      byAssigneeMap: new Map<string, { user: User; count: number }>()
    };

    (data || []).forEach((t: any) => {
      stats.byStatus[t.column_id] = (stats.byStatus[t.column_id] || 0) + 1;
      stats.byType[t.type] = (stats.byType[t.type] || 0) + 1;
      stats.byPriority[t.priority] = (stats.byPriority[t.priority] || 0) + 1;
      
      if (t.assignee) {
        if (!stats.byAssigneeMap.has(t.assignee.id)) {
          stats.byAssigneeMap.set(t.assignee.id, { user: t.assignee, count: 0 });
        }
        stats.byAssigneeMap.get(t.assignee.id)!.count++;
      }
    });

    return {
      byStatus: stats.byStatus,
      byType: stats.byType,
      byPriority: stats.byPriority,
      byAssignee: Array.from(stats.byAssigneeMap.values())
    };
  }

  // --- Activity ---

  async logActivity(taskId: string, action: string, changes?: { field: string; oldValue: any; newValue: any }): Promise<void> {
    const userId = await this.getCurrentUserId();
    const { error } = await supabase.from('activity_logs').insert({
      entity_type: 'task',
      entity_id: taskId,
      action,
      user_id: userId,
      field_changed: changes?.field,
      old_value: changes?.oldValue ? String(changes.oldValue) : null,
      new_value: changes?.newValue ? String(changes.newValue) : null
    });
    
    if (error) console.error('Failed to log activity:', error);
  }

  // --- Private Helpers ---

  private applyFilters(query: any, filters?: TaskFilters) {
    if (!filters) return query;

    if (filters.projectId) query = query.eq('project_id', filters.projectId);
    if (filters.sprintId !== undefined) {
      if (filters.sprintId === null) query = query.is('sprint_id', null);
      else query = query.eq('sprint_id', filters.sprintId);
    }
    if (filters.assigneeId !== undefined) {
      if (filters.assigneeId === null) query = query.is('assignee_id', null);
      else query = query.eq('assignee_id', filters.assigneeId);
    }
    if (filters.reporterId) query = query.eq('reporter_id', filters.reporterId);
    if (filters.parentEpicId !== undefined) {
      if (filters.parentEpicId === null) query = query.is('parent_epic_id', null);
      else query = query.eq('parent_epic_id', filters.parentEpicId);
    }

    if (filters.columnId) {
      Array.isArray(filters.columnId) 
        ? query = query.in('column_id', filters.columnId)
        : query = query.eq('column_id', filters.columnId);
    }
    if (filters.type) {
      Array.isArray(filters.type) 
        ? query = query.in('type', filters.type)
        : query = query.eq('type', filters.type);
    }
    if (filters.priority) {
      Array.isArray(filters.priority) 
        ? query = query.in('priority', filters.priority)
        : query = query.eq('priority', filters.priority);
    }
    
    if (filters.search) {
      query = query.or(`title.ilike.%${filters.search}%,description.ilike.%${filters.search}%,task_key.ilike.%${filters.search}%`);
    }

    if (filters.isOverdue) {
        const today = new Date().toISOString().split('T')[0];
        query = query.lt('due_date', today).neq('column_id', 'done');
    }

    return query;
  }

  private async getCurrentUserId(): Promise<string | null> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return null;
    // Cache this lookup in a real app or rely on RLS
    const { data: profile } = await supabase.from('users').select('id').eq('auth_user_id', user.id).single();
    return profile?.id || null;
  }
}

export const tasksService = new TasksService();
