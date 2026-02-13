import database, { generateUUID, now } from '../db/json/database.js';

export interface ActivityLog {
  id: string;
  entity_type: 'task' | 'project' | 'sprint' | 'comment';
  entity_id: string;
  action: string;
  user_id: string | null;
  field_changed: string | null;
  old_value: string | null;
  new_value: string | null;
  created_at: string;
}

export interface ActivityLogWithUser extends ActivityLog {
  user_name: string | null;
  user_avatar: string | null;
}

function enrichActivity(activity: ActivityLog): ActivityLogWithUser {
  const user = activity.user_id ? database.findById<any>('users', activity.user_id) : null;
  return {
    ...activity,
    user_name: user?.name || null,
    user_avatar: user?.avatar_url || null,
  };
}

export const activityService = {
  // Log an activity
  log(data: {
    entity_type: 'task' | 'project' | 'sprint' | 'comment';
    entity_id: string;
    action: string;
    user_id?: string | null;
    field_changed?: string;
    old_value?: string;
    new_value?: string;
  }): ActivityLog {
    const activity: ActivityLog = {
      id: generateUUID(),
      entity_type: data.entity_type,
      entity_id: data.entity_id,
      action: data.action,
      user_id: data.user_id || null,
      field_changed: data.field_changed || null,
      old_value: data.old_value || null,
      new_value: data.new_value || null,
      created_at: now(),
    };

    database.insert('activity_log', activity);
    return activity;
  },

  // Get activity for a specific entity
  getByEntity(entityType: string, entityId: string): ActivityLogWithUser[] {
    const activities = database.findMany<ActivityLog>(
      'activity_log',
      a => a.entity_type === entityType && a.entity_id === entityId
    );
    return activities
      .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
      .map(enrichActivity);
  },

  // Get activity for a task (including comments on that task)
  getByTask(taskId: string): ActivityLogWithUser[] {
    const activities = database.findMany<ActivityLog>(
      'activity_log',
      a => a.entity_id === taskId ||
           (a.entity_type === 'comment' && this.isCommentOnTask(a.entity_id, taskId))
    );
    return activities
      .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
      .map(enrichActivity);
  },

  // Helper to check if a comment belongs to a task
  isCommentOnTask(commentId: string, taskId: string): boolean {
    const comment = database.findById<any>('comments', commentId);
    return comment?.task_id === taskId;
  },

  // Get activity for a project (all tasks in that project)
  getByProject(projectId: string): ActivityLogWithUser[] {
    // Get all task IDs for the project
    const tasks = database.findMany<any>('tasks', t => t.project_id === projectId);
    const taskIds = new Set(tasks.map(t => t.id));

    const activities = database.findMany<ActivityLog>(
      'activity_log',
      a => a.entity_id === projectId || taskIds.has(a.entity_id)
    );
    return activities
      .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
      .map(enrichActivity);
  },

  // Get recent activity for a user
  getByUser(userId: string, limit: number = 50): ActivityLogWithUser[] {
    const activities = database.findMany<ActivityLog>(
      'activity_log',
      a => a.user_id === userId
    );
    return activities
      .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
      .slice(0, limit)
      .map(enrichActivity);
  },

  // Get all recent activity
  getRecent(limit: number = 100): ActivityLogWithUser[] {
    const activities = database.getAll<ActivityLog>('activity_log');
    return activities
      .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
      .slice(0, limit)
      .map(enrichActivity);
  },
};
