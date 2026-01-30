// API Client for Infinia Products Backend
const API_BASE = '/api/v1';

interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

async function request<T>(
  endpoint: string,
  options: RequestInit = {}
): Promise<T> {
  const url = `${API_BASE}${endpoint}`;

  const config: RequestInit = {
    headers: {
      'Content-Type': 'application/json',
      ...options.headers,
    },
    ...options,
  };

  const response = await fetch(url, config);
  const data: ApiResponse<T> = await response.json();

  if (!response.ok || !data.success) {
    throw new Error(data.error || 'API request failed');
  }

  return data.data as T;
}

// ============================================
// USERS API
// ============================================
export const usersApi = {
  getAll: () => request<any[]>('/users'),
  getById: (id: string) => request<any>(`/users/${id}`),
  create: (data: { name: string; email: string; password: string; avatar_url?: string; role?: string }) =>
    request<any>('/users', { method: 'POST', body: JSON.stringify(data) }),
  update: (id: string, data: Partial<any>) =>
    request<any>(`/users/${id}`, { method: 'PATCH', body: JSON.stringify(data) }),
  delete: (id: string) =>
    request<void>(`/users/${id}`, { method: 'DELETE' }),
};

// ============================================
// PROJECTS API
// ============================================
export const projectsApi = {
  getAll: () => request<any[]>('/projects'),
  getById: (id: string) => request<any>(`/projects/${id}`),
  getByCode: (code: string) => request<any>(`/projects/code/${code}`),
  create: (data: { name: string; code: string; description?: string; owner_id?: string }) =>
    request<any>('/projects', { method: 'POST', body: JSON.stringify(data) }),
  update: (id: string, data: Partial<any>) =>
    request<any>(`/projects/${id}`, { method: 'PATCH', body: JSON.stringify(data) }),
  delete: (id: string) =>
    request<void>(`/projects/${id}`, { method: 'DELETE' }),
  getMembers: (projectId: string) => request<any[]>(`/projects/${projectId}/members`),
  addMember: (projectId: string, userId: string, role?: string) =>
    request<any>(`/projects/${projectId}/members`, {
      method: 'POST',
      body: JSON.stringify({ user_id: userId, role }),
    }),
  removeMember: (projectId: string, userId: string) =>
    request<void>(`/projects/${projectId}/members/${userId}`, { method: 'DELETE' }),
};

// ============================================
// SPRINTS API
// ============================================
export const sprintsApi = {
  getAll: (projectId?: string) =>
    request<any[]>(`/sprints${projectId ? `?project_id=${projectId}` : ''}`),
  getById: (id: string) => request<any>(`/sprints/${id}`),
  getActive: (projectId: string) => request<any>(`/sprints/project/${projectId}/active`),
  create: (data: { project_id: string; name: string; goal?: string; start_date: string; end_date: string }) =>
    request<any>('/sprints', { method: 'POST', body: JSON.stringify(data) }),
  update: (id: string, data: Partial<any>) =>
    request<any>(`/sprints/${id}`, { method: 'PATCH', body: JSON.stringify(data) }),
  start: (id: string) =>
    request<any>(`/sprints/${id}/start`, { method: 'POST' }),
  complete: (id: string) =>
    request<any>(`/sprints/${id}/complete`, { method: 'POST' }),
  delete: (id: string) =>
    request<void>(`/sprints/${id}`, { method: 'DELETE' }),
};

// ============================================
// TASKS API
// ============================================
export interface TaskFilters {
  project_id?: string;
  column_id?: string;
  sprint_id?: string;
  assignee_id?: string;
  type?: string;
  priority?: string;
  search?: string;
}

export const tasksApi = {
  getAll: (filters?: TaskFilters) => {
    const params = new URLSearchParams();
    if (filters) {
      Object.entries(filters).forEach(([key, value]) => {
        if (value) params.append(key, value);
      });
    }
    const query = params.toString();
    return request<any[]>(`/tasks${query ? `?${query}` : ''}`);
  },
  getById: (id: string) => request<any>(`/tasks/${id}`),
  create: (data: {
    project_id: string;
    title: string;
    description?: string;
    type?: string;
    priority?: string;
    column_id?: string;
    sprint_id?: string;
    assignee_id?: string;
    points?: number;
    estimate?: string;
    start_date?: string;
    due_date?: string;
    impact_score?: number;
    product_theme?: string;
    tag_ids?: string[];
  }) => request<any>('/tasks', { method: 'POST', body: JSON.stringify(data) }),
  update: (id: string, data: Partial<any>) =>
    request<any>(`/tasks/${id}`, { method: 'PATCH', body: JSON.stringify(data) }),
  moveToColumn: (id: string, columnId: string) =>
    request<any>(`/tasks/${id}/move`, { method: 'POST', body: JSON.stringify({ column_id: columnId }) }),
  assignToSprint: (id: string, sprintId: string | null) =>
    request<any>(`/tasks/${id}/sprint`, { method: 'POST', body: JSON.stringify({ sprint_id: sprintId }) }),
  delete: (id: string) =>
    request<void>(`/tasks/${id}`, { method: 'DELETE' }),

  // Subtasks
  getSubtasks: (taskId: string) => request<any[]>(`/tasks/${taskId}/subtasks`),
  createSubtask: (taskId: string, data: { title: string; type?: string; assignee_id?: string }) =>
    request<any>(`/tasks/${taskId}/subtasks`, { method: 'POST', body: JSON.stringify(data) }),
  updateSubtask: (taskId: string, subtaskId: string, data: Partial<any>) =>
    request<any>(`/tasks/${taskId}/subtasks/${subtaskId}`, { method: 'PATCH', body: JSON.stringify(data) }),
  deleteSubtask: (taskId: string, subtaskId: string) =>
    request<void>(`/tasks/${taskId}/subtasks/${subtaskId}`, { method: 'DELETE' }),
};

// ============================================
// TAGS API
// ============================================
export const tagsApi = {
  getAll: (projectId?: string) =>
    request<any[]>(`/tags${projectId ? `?project_id=${projectId}` : ''}`),
  getById: (id: string) => request<any>(`/tags/${id}`),
  create: (data: { project_id: string; label: string; color: string }) =>
    request<any>('/tags', { method: 'POST', body: JSON.stringify(data) }),
  update: (id: string, data: Partial<any>) =>
    request<any>(`/tags/${id}`, { method: 'PATCH', body: JSON.stringify(data) }),
  delete: (id: string) =>
    request<void>(`/tags/${id}`, { method: 'DELETE' }),
};

// ============================================
// COLUMNS API
// ============================================
export const columnsApi = {
  getAll: (projectId?: string) =>
    request<any[]>(`/columns${projectId ? `?project_id=${projectId}` : ''}`),
  getById: (id: string) => request<any>(`/columns/${id}`),
  create: (data: { project_id: string; title: string; color?: string; is_default?: boolean }) =>
    request<any>('/columns', { method: 'POST', body: JSON.stringify(data) }),
  update: (id: string, data: Partial<any>) =>
    request<any>(`/columns/${id}`, { method: 'PATCH', body: JSON.stringify(data) }),
  reorder: (projectId: string, columnIds: string[]) =>
    request<any[]>('/columns/reorder', { method: 'POST', body: JSON.stringify({ project_id: projectId, column_ids: columnIds }) }),
  delete: (id: string) =>
    request<void>(`/columns/${id}`, { method: 'DELETE' }),
};

// ============================================
// COMMENTS API
// ============================================
export const commentsApi = {
  getByTask: (taskId: string) => request<any[]>(`/comments/task/${taskId}`),
  getById: (id: string) => request<any>(`/comments/${id}`),
  create: (data: { task_id: string; user_id: string; content: string; parent_comment_id?: string }) =>
    request<any>('/comments', { method: 'POST', body: JSON.stringify(data) }),
  update: (id: string, content: string) =>
    request<any>(`/comments/${id}`, { method: 'PATCH', body: JSON.stringify({ content }) }),
  delete: (id: string) =>
    request<void>(`/comments/${id}`, { method: 'DELETE' }),
};

// ============================================
// HEALTH CHECK
// ============================================
export const healthApi = {
  check: () => request<{ status: string; timestamp: string; database: string }>('/health'),
};

// Default export with all APIs
export default {
  users: usersApi,
  projects: projectsApi,
  sprints: sprintsApi,
  tasks: tasksApi,
  tags: tagsApi,
  columns: columnsApi,
  comments: commentsApi,
  health: healthApi,
};
