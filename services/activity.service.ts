
import { supabase } from '../lib/supabase';
import { 
  ActivityLog, 
  ActivityLogWithUser, 
  PaginationParams 
} from '../types/database.types';

export class ActivityService {
  
  // Log an activity
  async log(data: {
    entityType: 'task' | 'project' | 'sprint' | 'comment' | 'document';
    entityId: string;
    action: 'created' | 'updated' | 'deleted' | 'moved' | 'assigned' | 'commented';
    fieldChanged?: string;
    oldValue?: any;
    newValue?: any;
  }): Promise<ActivityLog> {
    const { data: { user } } = await supabase.auth.getUser();
    
    // Get public user id
    let userId = null;
    if (user) {
        const { data: profile } = await supabase.from('users').select('id').eq('auth_user_id', user.id).single();
        userId = profile?.id;
    }

    const { data: log, error } = await supabase
      .from('activity_logs')
      .insert({
        entity_type: data.entityType,
        entity_id: data.entityId,
        action: data.action,
        field_changed: data.fieldChanged,
        old_value: data.oldValue ? String(data.oldValue) : null,
        new_value: data.newValue ? String(data.newValue) : null,
        user_id: userId
      })
      .select()
      .single();

    if (error) throw error;
    return log;
  }

  // Get activity for a specific entity (generic)
  async getForEntity(entityType: string, entityId: string, pagination?: PaginationParams): Promise<{ data: ActivityLogWithUser[]; count: number }> {
    let query = supabase
      .from('activity_logs')
      .select('*, user:users(*)', { count: 'exact' })
      .eq('entity_type', entityType)
      .eq('entity_id', entityId)
      .order('created_at', { ascending: false });

    if (pagination?.page && pagination?.limit) {
      const from = (pagination.page - 1) * pagination.limit;
      const to = from + pagination.limit - 1;
      query = query.range(from, to);
    }

    const { data, count, error } = await query;
    if (error) throw error;
    
    return { data: (data || []) as unknown as ActivityLogWithUser[], count: count || 0 };
  }

  // Get activity for a specific task
  async getForTask(taskId: string): Promise<ActivityLogWithUser[]> {
    const { data } = await this.getForEntity('task', taskId);
    return data;
  }

  // Get activity for a project (includes project itself and its tasks)
  async getForProject(projectId: string, pagination?: PaginationParams): Promise<{ data: ActivityLogWithUser[]; count: number }> {
    // 1. Get all task IDs for this project to include their activity
    const { data: tasks } = await supabase.from('tasks').select('id').eq('project_id', projectId);
    const taskIds = tasks?.map(t => t.id) || [];
    
    // Include the project ID itself in the filter
    const relevantIds = [projectId, ...taskIds];
    
    if (relevantIds.length === 0) return { data: [], count: 0 };

    let query = supabase
      .from('activity_logs')
      .select('*, user:users(*)', { count: 'exact' })
      .in('entity_id', relevantIds)
      .order('created_at', { ascending: false });

    if (pagination?.page && pagination?.limit) {
      const from = (pagination.page - 1) * pagination.limit;
      const to = from + pagination.limit - 1;
      query = query.range(from, to);
    }

    const { data, count, error } = await query;
    if (error) throw error;

    return { data: (data || []) as unknown as ActivityLogWithUser[], count: count || 0 };
  }

  // Get recent activity performed BY a user
  async getForUser(userId: string, pagination?: PaginationParams): Promise<{ data: ActivityLogWithUser[]; count: number }> {
    let query = supabase
      .from('activity_logs')
      .select('*, user:users(*)', { count: 'exact' })
      .eq('user_id', userId)
      .order('created_at', { ascending: false });

    if (pagination?.page && pagination?.limit) {
        const from = (pagination.page - 1) * pagination.limit;
        const to = from + pagination.limit - 1;
        query = query.range(from, to);
    }

    const { data, count, error } = await query;
    if (error) throw error;

    return { data: (data || []) as unknown as ActivityLogWithUser[], count: count || 0 };
  }

  // Get activity feed for current user (global view)
  async getFeed(pagination?: PaginationParams): Promise<{ data: ActivityLogWithUser[]; count: number }> {
    // Fetch all logs (RLS will filter to only what user is allowed to see)
    let query = supabase
      .from('activity_logs')
      .select('*, user:users(*)', { count: 'exact' })
      .order('created_at', { ascending: false });

    if (pagination?.page && pagination?.limit) {
        const from = (pagination.page - 1) * pagination.limit;
        const to = from + pagination.limit - 1;
        query = query.range(from, to);
    }

    const { data, count, error } = await query;
    if (error) throw error;

    return { data: (data || []) as unknown as ActivityLogWithUser[], count: count || 0 };
  }

  // Get activity summary grouped by date (for charts/graphs)
  async getSummary(projectId: string, days: number = 30): Promise<{ date: string; counts: Record<string, number> }[]> {
    // 1. Identify relevant entities
    const { data: tasks } = await supabase.from('tasks').select('id').eq('project_id', projectId);
    const taskIds = tasks?.map(t => t.id) || [];
    const relevantIds = [projectId, ...taskIds];

    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    // 2. Fetch logs within range
    const { data: logs, error } = await supabase
        .from('activity_logs')
        .select('created_at, action')
        .in('entity_id', relevantIds)
        .gte('created_at', startDate.toISOString());

    if (error) throw error;

    // 3. Aggregate in memory
    const summary: Record<string, Record<string, number>> = {};
    
    // Initialize date keys
    for(let i=0; i<days; i++) {
        const d = new Date();
        d.setDate(d.getDate() - i);
        const dateStr = d.toISOString().split('T')[0];
        summary[dateStr] = {};
    }

    (logs || []).forEach(log => {
        const dateStr = new Date(log.created_at).toISOString().split('T')[0];
        if (!summary[dateStr]) summary[dateStr] = {};
        
        const action = log.action;
        summary[dateStr][action] = (summary[dateStr][action] || 0) + 1;
    });

    return Object.entries(summary).map(([date, counts]) => ({
        date,
        counts
    })).sort((a,b) => a.date.localeCompare(b.date));
  }

  // Subscribe to real-time activity for a project
  subscribeToProject(projectId: string, callback: (activity: ActivityLogWithUser) => void): () => void {
    const channel = supabase
      .channel(`project-activity-${projectId}`)
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'activity_logs' },
        async (payload) => {
          const newLog = payload.new as ActivityLog;
          
          // Check if relevant to this project
          let isRelevant = false;
          if (newLog.entity_id === projectId) {
              isRelevant = true;
          } else if (newLog.entity_type === 'task') {
              // Check if task belongs to project
              const { data } = await supabase.from('tasks').select('project_id').eq('id', newLog.entity_id).single();
              if (data && data.project_id === projectId) isRelevant = true;
          }

          if (isRelevant) {
              // Fetch user details to Hydrate the log
              let user = null;
              if (newLog.user_id) {
                  const { data: u } = await supabase.from('users').select('*').eq('id', newLog.user_id).single();
                  user = u;
              }
              callback({ ...newLog, user } as ActivityLogWithUser);
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }
}

export const activityService = new ActivityService();
