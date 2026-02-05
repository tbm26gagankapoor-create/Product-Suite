/**
 * Activity Service - Uses Centralized HTTP Client
 */

import { httpClient, buildQueryString } from '../lib/httpClient';

export class ActivityService {
  // Log an activity
  async log(data: {
    entityType: 'task' | 'project' | 'sprint' | 'comment' | 'document';
    entityId: string;
    action: 'created' | 'updated' | 'deleted' | 'moved' | 'assigned' | 'commented';
    fieldChanged?: string;
    oldValue?: any;
    newValue?: any;
  }): Promise<any> {
    try {
      const response = await httpClient.post<any>('/activity', {
        entity_type: data.entityType,
        entity_id: data.entityId,
        action: data.action,
        field_changed: data.fieldChanged,
        old_value: data.oldValue ? String(data.oldValue) : null,
        new_value: data.newValue ? String(data.newValue) : null,
      });
      return response;
    } catch {
      return null;
    }
  }

  // Get activity for a specific entity
  async getForEntity(
    entityType: string,
    entityId: string,
    pagination?: { page?: number; limit?: number }
  ): Promise<{ data: any[]; count: number }> {
    try {
      const query = buildQueryString({
        entity_type: entityType,
        entity_id: entityId,
        page: pagination?.page,
        limit: pagination?.limit,
      });

      const response = await httpClient.get<any>(`/activity${query}`);
      return {
        data: Array.isArray(response) ? response : response?.data || [],
        count: response?.count || 0,
      };
    } catch {
      return { data: [], count: 0 };
    }
  }

  // Get activity for a specific task
  async getForTask(taskId: string): Promise<any[]> {
    try {
      const response = await httpClient.get<any[]>(`/activity/task/${taskId}`);
      return response || [];
    } catch {
      return [];
    }
  }

  // Get activity for a project
  async getForProject(
    projectId: string,
    pagination?: { page?: number; limit?: number }
  ): Promise<{ data: any[]; count: number }> {
    try {
      const query = buildQueryString({
        project_id: projectId,
        page: pagination?.page,
        limit: pagination?.limit,
      });

      const response = await httpClient.get<any>(`/activity${query}`);
      return {
        data: Array.isArray(response) ? response : response?.data || [],
        count: response?.count || 0,
      };
    } catch {
      return { data: [], count: 0 };
    }
  }

  // Get activity for a user
  async getForUser(
    userId: string,
    pagination?: { page?: number; limit?: number }
  ): Promise<{ data: any[]; count: number }> {
    try {
      const query = buildQueryString({
        user_id: userId,
        page: pagination?.page,
        limit: pagination?.limit,
      });

      const response = await httpClient.get<any>(`/activity${query}`);
      return {
        data: Array.isArray(response) ? response : response?.data || [],
        count: response?.count || 0,
      };
    } catch {
      return { data: [], count: 0 };
    }
  }

  // Get activity feed
  async getFeed(pagination?: { page?: number; limit?: number }): Promise<{ data: any[]; count: number }> {
    try {
      const query = buildQueryString({
        page: pagination?.page,
        limit: pagination?.limit,
      });

      const response = await httpClient.get<any>(`/activity${query}`);
      return {
        data: Array.isArray(response) ? response : response?.data || [],
        count: response?.count || 0,
      };
    } catch {
      return { data: [], count: 0 };
    }
  }

  // Get activity summary
  async getSummary(
    projectId: string,
    days: number = 30
  ): Promise<{ date: string; counts: Record<string, number> }[]> {
    try {
      const response = await httpClient.get<{ date: string; counts: Record<string, number> }[]>(
        `/activity/summary?project_id=${projectId}&days=${days}`
      );
      return response || [];
    } catch {
      return [];
    }
  }

  // Subscribe to real-time activity (stub - not implemented in local backend)
  subscribeToProject(projectId: string, callback: (activity: any) => void): () => void {
    console.log('Real-time activity subscriptions not available in local backend');
    return () => {};
  }
}

export const activityService = new ActivityService();
