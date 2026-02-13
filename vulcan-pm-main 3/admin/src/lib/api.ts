const API_BASE = '/api/v1/admin';

function getToken(): string | null {
  return localStorage.getItem('admin_token');
}

async function request<T>(
  endpoint: string,
  options: RequestInit = {}
): Promise<{ success: boolean; data?: T; error?: string }> {
  const token = getToken();

  const headers: HeadersInit = {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...options.headers,
  };

  try {
    const response = await fetch(`${API_BASE}${endpoint}`, {
      ...options,
      headers,
    });

    const json = await response.json();
    return json;
  } catch (error) {
    return { success: false, error: 'Network error' };
  }
}

export const adminApi = {
  // Auth
  login: (email: string, password: string) =>
    request<{ token: string; admin: any }>('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    }),

  getMe: () => request<any>('/auth/me'),

  // Stats
  getStats: () => request<{ tenants: number; users: number; activeProviders: number }>('/stats'),

  // Tenants
  getTenants: (limit = 100, offset = 0) =>
    request<any[]>(`/tenants?limit=${limit}&offset=${offset}`),

  getTenant: (id: string) => request<any>(`/tenants/${id}`),

  updateTenant: (id: string, data: any) =>
    request<any>(`/tenants/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(data),
    }),

  // AI Providers
  getProviders: () => request<any[]>('/ai-providers'),

  getProvider: (id: string) => request<any>(`/ai-providers/${id}`),

  createProvider: (data: {
    name: string;
    display_name: string;
    provider_type?: string;
    api_endpoint?: string;
    api_key?: string;
    config?: Record<string, any>;
  }) =>
    request<any>('/ai-providers', {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  updateProvider: (id: string, data: any) =>
    request<any>(`/ai-providers/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(data),
    }),

  deleteProvider: (id: string) =>
    request<any>(`/ai-providers/${id}`, { method: 'DELETE' }),

  testProviderConnection: (providerId: string) =>
    request<{ success: boolean; message: string; latencyMs?: number }>(
      `/ai-providers/${providerId}/test`,
      { method: 'POST' }
    ),

  getProviderModels: (id: string) => request<any[]>(`/ai-providers/${id}/models`),

  addModel: (providerId: string, data: any) =>
    request<any>(`/ai-providers/${providerId}/models`, {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  updateModel: (id: string, data: any) =>
    request<any>(`/ai-models/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(data),
    }),

  deleteModel: (id: string) =>
    request<any>(`/ai-models/${id}`, { method: 'DELETE' }),

  // Settings
  getSettings: () => request<Record<string, any>>('/settings'),

  updateSettings: (data: Record<string, any>) =>
    request<any>('/settings', {
      method: 'PATCH',
      body: JSON.stringify(data),
    }),

  // Audit Log
  getAuditLog: (limit = 100, offset = 0) =>
    request<any[]>(`/audit-log?limit=${limit}&offset=${offset}`),

  // Admins
  getAdmins: () => request<any[]>('/admins'),

  createAdmin: (data: { email: string; password: string; name: string; role?: string }) =>
    request<any>('/admins', {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  // Domain Whitelist
  getWhitelist: (includeInactive = false) =>
    request<{ enabled: boolean; entries: any[]; count: number }>(
      `/whitelist?includeInactive=${includeInactive}`
    ),

  addWhitelistEntry: (data: { domain: string; domain_type?: string; tenant_id?: string; notes?: string }) =>
    request<any>('/whitelist', {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  updateWhitelistEntry: (id: string, data: any) =>
    request<any>(`/whitelist/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(data),
    }),

  deleteWhitelistEntry: (id: string) =>
    request<any>(`/whitelist/${id}`, { method: 'DELETE' }),

  toggleWhitelist: (enabled: boolean) =>
    request<any>('/whitelist/toggle', {
      method: 'POST',
      body: JSON.stringify({ enabled }),
    }),

  // SSO Providers
  getSsoProviders: () => request<any[]>('/sso/providers'),

  getSsoProvider: (id: string) => request<any>(`/sso/providers/${id}`),

  updateSsoProvider: (id: string, data: any) =>
    request<any>(`/sso/providers/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(data),
    }),

  updateSsoEntra: (data: { is_enabled?: boolean; client_id?: string }) =>
    request<any>('/sso/entra', {
      method: 'PATCH',
      body: JSON.stringify(data),
    }),

  // Git Providers
  getGitProviders: () => request<any[]>('/git-providers'),

  getGitProvider: (id: string) => request<any>(`/git-providers/${id}`),

  updateGitProvider: (id: string, data: {
    oauth_client_id?: string;
    oauth_client_secret?: string;
    oauth_scopes?: string;
    is_enabled?: boolean;
  }) =>
    request<any>(`/git-providers/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(data),
    }),

  enableGitProvider: (id: string) =>
    request<any>(`/git-providers/${id}/enable`, { method: 'POST' }),

  disableGitProvider: (id: string) =>
    request<any>(`/git-providers/${id}/disable`, { method: 'POST' }),

  clearGitProviderOAuth: (id: string) =>
    request<any>(`/git-providers/${id}/oauth`, { method: 'DELETE' }),

  // Search Providers
  getSearchProviders: () => request<any[]>('/search-providers'),

  getSearchProvider: (id: string) => request<any>(`/search-providers/${id}`),

  updateSearchProvider: (id: string, data: any) =>
    request<any>(`/search-providers/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(data),
    }),

  testSearchProvider: (id: string) =>
    request<{ success: boolean; message: string; latencyMs?: number }>(
      `/search-providers/${id}/test`,
      { method: 'POST' }
    ),

  // Prompt Templates
  getPromptTemplates: (category?: string) =>
    request<any[]>(`/prompt-templates${category ? `?category=${category}` : ''}`),

  getPromptTemplate: (id: string) => request<any>(`/prompt-templates/${id}`),

  updatePromptTemplate: (id: string, data: {
    template_body?: string;
    description?: string;
    variables?: any[];
    metadata?: Record<string, any>;
    change_note?: string;
  }) =>
    request<any>(`/prompt-templates/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(data),
    }),

  togglePromptTemplate: (id: string, isActive: boolean) =>
    request<any>(`/prompt-templates/${id}/toggle`, {
      method: 'POST',
      body: JSON.stringify({ is_active: isActive }),
    }),

  getPromptTemplateVersions: (id: string) =>
    request<any[]>(`/prompt-templates/${id}/versions`),

  getPromptTemplateVersion: (id: string, version: number) =>
    request<any>(`/prompt-templates/${id}/versions/${version}`),

  rollbackPromptTemplate: (id: string, version: number) =>
    request<any>(`/prompt-templates/${id}/rollback/${version}`, { method: 'POST' }),

  previewPromptTemplate: (id: string, variables: Record<string, string>) =>
    request<{ resolvedText: string; charCount: number }>(
      `/prompt-templates/${id}/preview`,
      { method: 'POST', body: JSON.stringify({ variables }) }
    ),

  // Epic Categories
  getEpicCategories: () => request<any[]>('/epic-categories'),

  getEpicCategory: (id: string) => request<any>(`/epic-categories/${id}`),

  updateEpicCategory: (id: string, data: any) =>
    request<any>(`/epic-categories/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(data),
    }),

  createEpicCategory: (data: {
    name: string;
    display_name: string;
    description?: string;
    minimum_tasks?: number;
    order_index: number;
    prompt_guidance?: string;
  }) =>
    request<any>('/epic-categories', {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  deleteEpicCategory: (id: string) =>
    request<any>(`/epic-categories/${id}`, { method: 'DELETE' }),
};

export function setToken(token: string) {
  localStorage.setItem('admin_token', token);
}

export function clearToken() {
  localStorage.removeItem('admin_token');
}

export function isAuthenticated(): boolean {
  return !!getToken();
}
