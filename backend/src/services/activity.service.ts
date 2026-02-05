import database, { generateUUID, now } from '../lib/database.js';

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
  entity_name: string | null;
}

async function getEntityName(entityType: string, entityId: string): Promise<string | null> {
  try {
    switch (entityType) {
      case 'task': {
        const task = await database.findById<any>('tasks', entityId);
        return task?.title || null;
      }
      case 'project': {
        const project = await database.findById<any>('projects', entityId);
        return project?.name || null;
      }
      case 'sprint': {
        const sprint = await database.findById<any>('sprints', entityId);
        return sprint?.name || null;
      }
      case 'comment': {
        const comment = await database.findById<any>('comments', entityId);
        if (comment?.task_id) {
          const task = await database.findById<any>('tasks', comment.task_id);
          return task?.title || 'a comment';
        }
        return 'a comment';
      }
      case 'document': {
        // For document comments, try to get the PRD/document title from the project
        return 'PRD Document';
      }
      default:
        return null;
    }
  } catch {
    return null;
  }
}

async function enrichActivity(activity: ActivityLog): Promise<ActivityLogWithUser> {
  const user = activity.user_id ? await database.findById<any>('users', activity.user_id) : null;
  const entityName = await getEntityName(activity.entity_type, activity.entity_id);
  return {
    ...activity,
    user_name: user?.name || null,
    user_avatar: user?.avatar_url || null,
    entity_name: entityName,
  };
}

export const activityService = {
  // Log an activity
  async log(data: {
    entity_type: 'task' | 'project' | 'sprint' | 'comment';
    entity_id: string;
    action: string;
    user_id?: string | null;
    field_changed?: string;
    old_value?: string;
    new_value?: string;
  }): Promise<ActivityLog> {
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

    await database.insert('activity_log', activity);
    return activity;
  },

  // Get activity for a specific entity
  async getByEntity(entityType: string, entityId: string): Promise<ActivityLogWithUser[]> {
    const activities = await database.findMany<ActivityLog>(
      'activity_log',
      { entity_type: entityType, entity_id: entityId }
    );
    const sorted = activities.sort((a: ActivityLog, b: ActivityLog) =>
      new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
    );
    return Promise.all(sorted.map(enrichActivity));
  },

  // Get activity for a task (including comments on that task)
  async getByTask(taskId: string): Promise<ActivityLogWithUser[]> {
    const allActivities = await database.getAll<ActivityLog>('activity_log');
    const activities: ActivityLog[] = [];

    for (const a of allActivities) {
      if (a.entity_id === taskId) {
        activities.push(a);
      } else if (a.entity_type === 'comment') {
        const isOnTask = await this.isCommentOnTask(a.entity_id, taskId);
        if (isOnTask) {
          activities.push(a);
        }
      }
    }

    const sorted = activities.sort((a: ActivityLog, b: ActivityLog) =>
      new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
    );
    return Promise.all(sorted.map(enrichActivity));
  },

  // Helper to check if a comment belongs to a task
  async isCommentOnTask(commentId: string, taskId: string): Promise<boolean> {
    const comment = await database.findById<any>('comments', commentId);
    return comment?.task_id === taskId;
  },

  // Get activity for a project (all tasks in that project)
  async getByProject(projectId: string): Promise<ActivityLogWithUser[]> {
    // Get all task IDs for the project
    const tasks = await database.findMany<any>('tasks', { project_id: projectId });
    const taskIds = new Set(tasks.map((t: any) => t.id));

    const allActivities = await database.getAll<ActivityLog>('activity_log');
    const activities = allActivities.filter(
      (a: ActivityLog) => a.entity_id === projectId || taskIds.has(a.entity_id)
    );

    const sorted = activities.sort((a: ActivityLog, b: ActivityLog) =>
      new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
    );
    return Promise.all(sorted.map(enrichActivity));
  },

  // Get recent activity for a user
  async getByUser(userId: string, limit: number = 50): Promise<ActivityLogWithUser[]> {
    const activities = await database.findMany<ActivityLog>(
      'activity_log',
      { user_id: userId }
    );
    const sorted = activities
      .sort((a: ActivityLog, b: ActivityLog) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
      .slice(0, limit);
    return Promise.all(sorted.map(enrichActivity));
  },

  // Get all recent activity
  async getRecent(limit: number = 100): Promise<ActivityLogWithUser[]> {
    const activities = await database.getAll<ActivityLog>('activity_log');
    const sorted = activities
      .sort((a: ActivityLog, b: ActivityLog) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
      .slice(0, limit);
    return Promise.all(sorted.map(enrichActivity));
  },
};
