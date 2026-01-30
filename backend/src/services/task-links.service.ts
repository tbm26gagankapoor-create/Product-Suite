import { supabaseAdmin } from '../lib/supabase.js';
import { NotFoundError, BadRequestError } from '../utils/errors.js';

export type LinkType = 'blocks' | 'relates_to' | 'duplicates';

export interface TaskLink {
  id: string;
  blocking_task_id: string;
  blocked_task_id: string;
  link_type: LinkType;
  created_by: string | null;
  created_at: string;
}

export interface TaskLinkWithDetails extends TaskLink {
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

class TaskLinksService {
  /**
   * Get all tasks that block a given task (tasks in blockedBy)
   */
  async getBlockingTasks(taskId: string): Promise<TaskLinkWithDetails[]> {
    const { data, error } = await supabaseAdmin
      .from('task_links')
      .select(`
        *,
        blocking_task:tasks!blocking_task_id(id, task_key, title, type, priority, column_id)
      `)
      .eq('blocked_task_id', taskId)
      .eq('link_type', 'blocks');

    if (error) {
      throw new BadRequestError(error.message);
    }

    return (data || []) as TaskLinkWithDetails[];
  }

  /**
   * Get all tasks that a given task blocks
   */
  async getBlockedTasks(taskId: string): Promise<TaskLinkWithDetails[]> {
    const { data, error } = await supabaseAdmin
      .from('task_links')
      .select(`
        *,
        blocked_task:tasks!blocked_task_id(id, task_key, title, type, priority, column_id)
      `)
      .eq('blocking_task_id', taskId)
      .eq('link_type', 'blocks');

    if (error) {
      throw new BadRequestError(error.message);
    }

    return (data || []) as TaskLinkWithDetails[];
  }

  /**
   * Get all links for a task (both directions)
   */
  async getAllLinks(taskId: string): Promise<{
    blockedBy: TaskLinkWithDetails[];
    blocks: TaskLinkWithDetails[];
  }> {
    const [blockedBy, blocks] = await Promise.all([
      this.getBlockingTasks(taskId),
      this.getBlockedTasks(taskId),
    ]);

    return { blockedBy, blocks };
  }

  /**
   * Create a task link
   */
  async createLink(
    blockingTaskId: string,
    blockedTaskId: string,
    linkType: LinkType,
    userId: string
  ): Promise<TaskLink> {
    // Validate: can't link to self
    if (blockingTaskId === blockedTaskId) {
      throw new BadRequestError('A task cannot block itself');
    }

    // Validate: both tasks exist
    const { data: tasks, error: taskError } = await supabaseAdmin
      .from('tasks')
      .select('id')
      .in('id', [blockingTaskId, blockedTaskId]);

    if (taskError) {
      throw new BadRequestError(taskError.message);
    }

    if (!tasks || tasks.length !== 2) {
      throw new NotFoundError('One or both tasks not found');
    }

    // Check for circular dependency (A blocks B, B blocks C, C blocks A)
    const wouldCreateCycle = await this.wouldCreateCycle(blockingTaskId, blockedTaskId);
    if (wouldCreateCycle) {
      throw new BadRequestError('This link would create a circular dependency');
    }

    // Create the link
    const { data: link, error } = await supabaseAdmin
      .from('task_links')
      .insert({
        blocking_task_id: blockingTaskId,
        blocked_task_id: blockedTaskId,
        link_type: linkType,
        created_by: userId,
      })
      .select()
      .single();

    if (error) {
      if (error.code === '23505') { // Unique violation
        throw new BadRequestError('This link already exists');
      }
      throw new BadRequestError(error.message);
    }

    // Log activity
    await this.logActivity(blockedTaskId, userId, 'link_added', {
      field: 'blocked_by',
      newValue: blockingTaskId,
    });

    return link as TaskLink;
  }

  /**
   * Delete a task link
   */
  async deleteLink(linkId: string, userId: string): Promise<void> {
    // Get link details first for activity logging
    const { data: link, error: fetchError } = await supabaseAdmin
      .from('task_links')
      .select('*')
      .eq('id', linkId)
      .single();

    if (fetchError || !link) {
      throw new NotFoundError('Link not found');
    }

    const { error } = await supabaseAdmin
      .from('task_links')
      .delete()
      .eq('id', linkId);

    if (error) {
      throw new BadRequestError(error.message);
    }

    // Log activity
    await this.logActivity(link.blocked_task_id, userId, 'link_removed', {
      field: 'blocked_by',
      oldValue: link.blocking_task_id,
    });
  }

  /**
   * Get tasks available for linking (same project, not self, not already linked)
   */
  async getAvailableTasks(
    taskId: string,
    projectId: string
  ): Promise<{ id: string; task_key: string; title: string; type: string; priority: string }[]> {
    if (!projectId) {
      console.error('getAvailableTasks: projectId is required');
      return [];
    }

    // Get already linked task IDs
    const { data: existingLinks } = await supabaseAdmin
      .from('task_links')
      .select('blocking_task_id')
      .eq('blocked_task_id', taskId)
      .eq('link_type', 'blocks');

    const linkedTaskIds = (existingLinks || []).map(l => l.blocking_task_id);

    // Get available tasks from the same project
    // Use neq for single exclusion and filter for multiple to avoid PostgREST syntax issues
    let query = supabaseAdmin
      .from('tasks')
      .select('id, task_key, title, type, priority')
      .eq('project_id', projectId)
      .neq('id', taskId) // Always exclude self
      .order('created_at', { ascending: false })
      .limit(100); // Get more initially, then filter

    const { data: tasks, error } = await query;

    if (error) {
      throw new BadRequestError(error.message);
    }

    // Filter out already linked tasks in memory (more reliable than PostgREST IN clause)
    const linkedSet = new Set(linkedTaskIds);
    const filteredTasks = (tasks || []).filter(t => !linkedSet.has(t.id));

    return filteredTasks.slice(0, 50);
  }

  /**
   * Check if creating a link would result in a circular dependency
   */
  private async wouldCreateCycle(
    blockingTaskId: string,
    blockedTaskId: string
  ): Promise<boolean> {
    // If we're saying "blockingTaskId blocks blockedTaskId",
    // we need to check if blockedTaskId already transitively blocks blockingTaskId
    // i.e., is there a path from blockedTaskId to blockingTaskId?

    const visited = new Set<string>();
    const queue = [blockedTaskId];

    while (queue.length > 0) {
      const current = queue.shift()!;

      if (current === blockingTaskId) {
        return true; // Found a cycle
      }

      if (visited.has(current)) {
        continue;
      }
      visited.add(current);

      // Get all tasks that this task blocks
      const { data: links } = await supabaseAdmin
        .from('task_links')
        .select('blocked_task_id')
        .eq('blocking_task_id', current)
        .eq('link_type', 'blocks');

      if (links) {
        for (const link of links) {
          if (!visited.has(link.blocked_task_id)) {
            queue.push(link.blocked_task_id);
          }
        }
      }
    }

    return false;
  }

  /**
   * Activity logging helper
   */
  private async logActivity(
    taskId: string,
    userId: string,
    action: string,
    changes?: { field: string; oldValue?: string; newValue?: string }
  ): Promise<void> {
    try {
      await supabaseAdmin.from('activity_logs').insert({
        entity_type: 'task',
        entity_id: taskId,
        action,
        user_id: userId,
        field_changed: changes?.field,
        old_value: changes?.oldValue || null,
        new_value: changes?.newValue || null,
      });
    } catch (error) {
      console.error('Failed to log activity:', error);
    }
  }
}

export const taskLinksService = new TaskLinksService();
