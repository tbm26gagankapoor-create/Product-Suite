
import { supabase } from '../lib/supabase';
import { 
  Sprint, 
  SprintInsert, 
  SprintUpdate, 
  SprintWithStats, 
  Task, 
  TaskType,
  PaginationParams,
  Project
} from '../types/database.types';
import { activityService } from './activity.service';

export interface SprintFilters {
  projectId?: string;
  status?: string | string[];
  search?: string;
}

export class SprintsService {
  // Get all sprints with optional filters and pagination
  async getAll(filters?: SprintFilters, pagination?: PaginationParams): Promise<{ data: Sprint[]; count: number }> {
    let query = supabase.from('sprints').select('*', { count: 'exact' });

    if (filters?.projectId) {
      query = query.eq('project_id', filters.projectId);
    }

    if (filters?.status) {
      if (Array.isArray(filters.status)) {
        query = query.in('status', filters.status);
      } else {
        query = query.eq('status', filters.status);
      }
    }

    if (filters?.search) {
      query = query.ilike('name', `%${filters.search}%`);
    }

    if (pagination?.page && pagination?.limit) {
      const from = (pagination.page - 1) * pagination.limit;
      const to = from + pagination.limit - 1;
      query = query.range(from, to);
    }

    // Default order: Active first, then Planned by start date, then Completed desc
    query = query.order('status', { ascending: true }).order('start_date', { ascending: true });

    const { data, error, count } = await query;
    
    if (error) throw error;
    return { data: data || [], count: count || 0 };
  }

  // Get sprints for a specific project
  async getByProject(projectId: string): Promise<Sprint[]> {
    const { data, error } = await supabase
      .from('sprints')
      .select('*')
      .eq('project_id', projectId)
      .order('start_date', { ascending: false });
      
    if (error) throw error;
    return data || [];
  }

  // Get sprint by ID with full stats (aggregated on client side since no simple RPC)
  async getById(id: string): Promise<SprintWithStats | null> {
    const { data: sprint, error } = await supabase
      .from('sprints')
      .select(`
        *,
        project:projects (*)
      `)
      .eq('id', id)
      .single();

    if (error) return null;

    // Fetch tasks to calculate stats
    const stats = await this.getStats(id);

    return {
      ...sprint,
      project: sprint.project as Project, // Cast join result
      ...stats
    };
  }

  // Get active sprint for a project
  async getActiveSprint(projectId: string): Promise<Sprint | null> {
    const { data, error } = await supabase
      .from('sprints')
      .select('*')
      .eq('project_id', projectId)
      .eq('status', 'active')
      .single();
      
    if (error) return null;
    return data;
  }

  // Create new sprint
  async create(data: SprintInsert): Promise<Sprint> {
    const { data: sprint, error } = await supabase
      .from('sprints')
      .insert(data)
      .select()
      .single();
      
    if (error) throw error;

    await activityService.log({
        entityType: 'sprint',
        entityId: sprint.id,
        action: 'created'
    });

    return sprint;
  }

  // Update sprint
  async update(id: string, data: SprintUpdate): Promise<Sprint> {
    const { data: sprint, error } = await supabase
      .from('sprints')
      .update(data)
      .eq('id', id)
      .select()
      .single();
      
    if (error) throw error;

    await activityService.log({
        entityType: 'sprint',
        entityId: id,
        action: 'updated'
    });

    return sprint;
  }

  // Delete sprint
  async delete(id: string, moveTasksToBacklog: boolean = true): Promise<void> {
    if (moveTasksToBacklog) {
      // Move tasks to backlog (null sprint_id)
      const { error: taskError } = await supabase
        .from('tasks')
        .update({ sprint_id: null })
        .eq('sprint_id', id);
        
      if (taskError) throw taskError;
    }

    const { error } = await supabase.from('sprints').delete().eq('id', id);
    if (error) throw error;
  }

  // Start sprint
  async startSprint(id: string): Promise<Sprint> {
    const sprint = await this.getById(id);
    if (!sprint) throw new Error("Sprint not found");

    // Check if there's already an active sprint for this project
    const active = await this.getActiveSprint(sprint.project_id);
    if (active && active.id !== id) {
      throw new Error("Another sprint is already active for this project. Complete it first.");
    }

    return this.update(id, { status: 'active' });
  }

  // Complete sprint
  async completeSprint(id: string, moveIncompleteTo: string | 'backlog' = 'backlog'): Promise<Sprint> {
    // 1. Find incomplete tasks
    const { data: incompleteTasks } = await supabase
      .from('tasks')
      .select('id')
      .eq('sprint_id', id)
      .neq('column_id', 'done');

    if (incompleteTasks && incompleteTasks.length > 0) {
      const ids = incompleteTasks.map(t => t.id);
      const targetSprintId = moveIncompleteTo === 'backlog' ? null : moveIncompleteTo;
      
      // 2. Move them
      const { error: moveError } = await supabase
        .from('tasks')
        .update({ sprint_id: targetSprintId })
        .in('id', ids);
        
      if (moveError) throw moveError;
    }

    // 3. Mark sprint as completed
    return this.update(id, { status: 'completed' });
  }

  // Get sprint statistics
  async getStats(sprintId: string): Promise<{
    totalTasks: number;
    completedTasks: number;
    totalPoints: number;
    completedPoints: number;
    tasksByStatus: Record<string, number>;
    tasksByType: Record<TaskType, number>;
    velocity: number;
  }> {
    const { data: tasks, error } = await supabase
      .from('tasks')
      .select('column_id, points, type')
      .eq('sprint_id', sprintId);

    if (error) throw error;

    const stats = {
      totalTasks: 0,
      completedTasks: 0,
      totalPoints: 0,
      completedPoints: 0,
      tasksByStatus: {} as Record<string, number>,
      tasksByType: {} as Record<TaskType, number>,
      velocity: 0
    };

    (tasks || []).forEach((t: any) => {
      stats.totalTasks++;
      stats.totalPoints += (t.points || 0);
      
      // Status Counts
      stats.tasksByStatus[t.column_id] = (stats.tasksByStatus[t.column_id] || 0) + 1;
      
      // Type Counts
      stats.tasksByType[t.type] = (stats.tasksByType[t.type] || 0) + 1;

      // Completion Logic
      if (t.column_id === 'done') {
        stats.completedTasks++;
        stats.completedPoints += (t.points || 0);
      }
    });

    stats.velocity = stats.completedPoints; // For a single sprint, velocity is essentially completed points
    return stats;
  }

  // Get tasks in sprint
  async getTasks(sprintId: string): Promise<Task[]> {
    const { data, error } = await supabase
      .from('tasks')
      .select('*, task_tags(*), assignee:users!assignee_id(*)')
      .eq('sprint_id', sprintId);
      
    if (error) throw error;
    return data as unknown as Task[]; // Casting due to complex join types
  }

  // Add task to sprint
  async addTask(sprintId: string, taskId: string): Promise<void> {
    const { error } = await supabase
      .from('tasks')
      .update({ sprint_id: sprintId })
      .eq('id', taskId);
    if (error) throw error;
  }

  // Remove task from sprint
  async removeTask(sprintId: string, taskId: string): Promise<void> {
    const { error } = await supabase
      .from('tasks')
      .update({ sprint_id: null })
      .eq('id', taskId)
      .eq('sprint_id', sprintId); // Safety check
    if (error) throw error;
  }

  // Bulk add tasks
  async addTasks(sprintId: string, taskIds: string[]): Promise<void> {
    if (taskIds.length === 0) return;
    const { error } = await supabase
      .from('tasks')
      .update({ sprint_id: sprintId })
      .in('id', taskIds);
    if (error) throw error;
  }

  // Get burndown chart data (Approximation using activity logs if available, or static linear for now)
  async getBurndownData(sprintId: string): Promise<{ date: string; remaining: number; ideal: number }[]> {
    const sprint = await this.getById(sprintId);
    if (!sprint) return [];

    const startDate = new Date(sprint.start_date);
    const endDate = new Date(sprint.end_date);
    const totalDays = Math.ceil((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24));
    const totalPoints = sprint.total_points; // From getById stats aggregation

    const data = [];
    
    // Ideal Burndown: Linear from total points to 0
    let currentRemaining = totalPoints;
    const pointsPerDay = totalPoints / totalDays;

    for (let i = 0; i <= totalDays; i++) {
      const d = new Date(startDate);
      d.setDate(d.getDate() + i);
      const dateStr = d.toISOString().split('T')[0];

      // Ideal
      const ideal = Math.max(0, totalPoints - (pointsPerDay * i));

      // Real (Simple approximation: if date is past, use linear or 0, if future use null)
      let remaining = null;
      if (d <= new Date()) {
          remaining = ideal; // Placeholder for actual calculation
      }

      data.push({
        date: dateStr,
        remaining: remaining !== null ? Math.round(remaining) : 0, 
        ideal: Math.round(ideal)
      });
    }

    return data;
  }

  // Get velocity history for project
  async getVelocityHistory(projectId: string, lastN: number = 5): Promise<{ sprintId: string; sprintName: string; completedPoints: number }[]> {
    const { data: sprints, error } = await supabase
      .from('sprints')
      .select('*')
      .eq('project_id', projectId)
      .eq('status', 'completed')
      .order('end_date', { ascending: false })
      .limit(lastN);

    if (error) throw error;

    const history = await Promise.all((sprints || []).map(async (s) => {
        const stats = await this.getStats(s.id);
        return {
            sprintId: s.id,
            sprintName: s.name,
            completedPoints: stats.completedPoints
        };
    }));

    return history.reverse(); // Chronological order
  }
}

export const sprintsService = new SprintsService();
