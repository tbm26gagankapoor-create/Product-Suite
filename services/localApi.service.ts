/**
 * Local Backend API Service
 * Calls the local Express backend with JWT authentication
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

async function handleResponse<T>(response: Response): Promise<T> {
  const data = await response.json();
  if (!response.ok || !data.success) {
    throw new Error(data.error || 'API request failed');
  }
  return data.data as T;
}

export const localApi = {
  // Projects
  async getProjects() {
    const response = await fetch(`${API_BASE}/projects`, {
      headers: getAuthHeaders(),
    });
    return handleResponse<any[]>(response);
  },

  async getProject(id: string) {
    const response = await fetch(`${API_BASE}/projects/${id}`, {
      headers: getAuthHeaders(),
    });
    return handleResponse<any>(response);
  },

  async createProject(project: any) {
    const response = await fetch(`${API_BASE}/projects`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify({
        name: project.name,
        code: project.key || project.code,
        description: project.description,
        owner_id: project.ownerId,
      }),
    });
    return handleResponse<any>(response);
  },

  async updateProject(id: string, updates: any) {
    const response = await fetch(`${API_BASE}/projects/${id}`, {
      method: 'PATCH',
      headers: getAuthHeaders(),
      body: JSON.stringify(updates),
    });
    return handleResponse<any>(response);
  },

  async deleteProject(id: string) {
    const response = await fetch(`${API_BASE}/projects/${id}`, {
      method: 'DELETE',
      headers: getAuthHeaders(),
    });
    return handleResponse<any>(response);
  },

  // Tasks
  async getTasks(filters?: Record<string, string>) {
    const params = new URLSearchParams(filters);
    const response = await fetch(`${API_BASE}/tasks?${params}`, {
      headers: getAuthHeaders(),
    });
    return handleResponse<any[]>(response);
  },

  async getTask(id: string) {
    const response = await fetch(`${API_BASE}/tasks/${id}`, {
      headers: getAuthHeaders(),
    });
    return handleResponse<any>(response);
  },

  async createTask(task: any) {
    const response = await fetch(`${API_BASE}/tasks`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify(task),
    });
    return handleResponse<any>(response);
  },

  async updateTask(id: string, updates: any) {
    const response = await fetch(`${API_BASE}/tasks/${id}`, {
      method: 'PATCH',
      headers: getAuthHeaders(),
      body: JSON.stringify(updates),
    });
    return handleResponse<any>(response);
  },

  async deleteTask(id: string) {
    const response = await fetch(`${API_BASE}/tasks/${id}`, {
      method: 'DELETE',
      headers: getAuthHeaders(),
    });
    return handleResponse<any>(response);
  },

  // Sprints
  async getSprints(projectId?: string) {
    const params = projectId ? `?project_id=${projectId}` : '';
    const response = await fetch(`${API_BASE}/sprints${params}`, {
      headers: getAuthHeaders(),
    });
    return handleResponse<any[]>(response);
  },

  async createSprint(sprint: any) {
    const response = await fetch(`${API_BASE}/sprints`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify(sprint),
    });
    return handleResponse<any>(response);
  },

  // Users
  async getUsers() {
    const response = await fetch(`${API_BASE}/users`, {
      headers: getAuthHeaders(),
    });
    return handleResponse<any[]>(response);
  },

  async getCurrentUser() {
    const response = await fetch(`${API_BASE}/auth/me`, {
      headers: getAuthHeaders(),
    });
    return handleResponse<any>(response);
  },
};
