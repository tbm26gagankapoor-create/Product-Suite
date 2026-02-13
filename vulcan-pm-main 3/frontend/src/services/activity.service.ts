/**
 * Activity Service - Uses Local Backend
 * All Supabase calls have been replaced with local backend API calls
 */

const API_BASE = '/api/v1';

function getAuthHeaders(): HeadersInit {
  const token = localStorage.getItem('infinia_token');
  const headers: HeadersInit = {
    'Content-Type': 'application/json',
  };
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }
  return headers;
}

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
    const response = await fetch(`${API_BASE}/activity`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify({
        entity_type: data.entityType,
        entity_id: data.entityId,
        action: data.action,
        field_changed: data.fieldChanged,
        old_value: data.oldValue ? String(data.oldValue) : null,
        new_value: data.newValue ? String(data.newValue) : null,
      }),
    });
    const result = await response.json();
    return result.success ? result.data : null;
  }

  // Get activity for a specific entity
  async getForEntity(entityType: string, entityId: string, pagination?: { page?: number; limit?: number }): Promise<{ data: any[]; count: number }> {
    const params = new URLSearchParams();
    params.append('entity_type', entityType);
    params.append('entity_id', entityId);
    if (pagination?.page) params.append('page', String(pagination.page));
    if (pagination?.limit) params.append('limit', String(pagination.limit));

    const response = await fetch(`${API_BASE}/activity?${params}`, {
      headers: getAuthHeaders(),
    });
    const data = await response.json();
    return { data: data.success ? data.data || [] : [], count: data.count || 0 };
  }

  // Get activity for a specific task
  async getForTask(taskId: string): Promise<any[]> {
    const response = await fetch(`${API_BASE}/activity/task/${taskId}`, {
      headers: getAuthHeaders(),
    });
    const data = await response.json();
    return data.success ? data.data || [] : [];
  }

  // Get activity for a project
  async getForProject(projectId: string, pagination?: { page?: number; limit?: number }): Promise<{ data: any[]; count: number }> {
    const params = new URLSearchParams();
    params.append('project_id', projectId);
    if (pagination?.page) params.append('page', String(pagination.page));
    if (pagination?.limit) params.append('limit', String(pagination.limit));

    const response = await fetch(`${API_BASE}/activity?${params}`, {
      headers: getAuthHeaders(),
    });
    const data = await response.json();
    return { data: data.success ? data.data || [] : [], count: data.count || 0 };
  }

  // Get activity for a user
  async getForUser(userId: string, pagination?: { page?: number; limit?: number }): Promise<{ data: any[]; count: number }> {
    const params = new URLSearchParams();
    params.append('user_id', userId);
    if (pagination?.page) params.append('page', String(pagination.page));
    if (pagination?.limit) params.append('limit', String(pagination.limit));

    const response = await fetch(`${API_BASE}/activity?${params}`, {
      headers: getAuthHeaders(),
    });
    const data = await response.json();
    return { data: data.success ? data.data || [] : [], count: data.count || 0 };
  }

  // Get activity feed
  async getFeed(pagination?: { page?: number; limit?: number }): Promise<{ data: any[]; count: number }> {
    const params = new URLSearchParams();
    if (pagination?.page) params.append('page', String(pagination.page));
    if (pagination?.limit) params.append('limit', String(pagination.limit));

    const response = await fetch(`${API_BASE}/activity?${params}`, {
      headers: getAuthHeaders(),
    });
    const data = await response.json();
    return { data: data.success ? data.data || [] : [], count: data.count || 0 };
  }

  // Get activity summary
  async getSummary(projectId: string, days: number = 30): Promise<{ date: string; counts: Record<string, number> }[]> {
    const response = await fetch(`${API_BASE}/activity/summary?project_id=${projectId}&days=${days}`, {
      headers: getAuthHeaders(),
    });
    const data = await response.json();
    return data.success ? data.data || [] : [];
  }

  // Subscribe to real-time activity (stub - not implemented in local backend)
  subscribeToProject(projectId: string, callback: (activity: any) => void): () => void {
    // Real-time subscriptions not supported in local backend
    console.log('Real-time activity subscriptions not available in local backend');
    return () => {};
  }
}

export const activityService = new ActivityService();
