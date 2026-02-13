/**
 * Admin Portal API Client
 * Handles all API requests to admin endpoints
 */

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:3001/api/v1';

interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: string;
}

class AdminApiClient {
  private token: string | null = null;

  constructor() {
    // Load token from localStorage on initialization
    this.token = localStorage.getItem('admin_token');
  }

  setToken(token: string) {
    this.token = token;
    localStorage.setItem('admin_token', token);
  }

  clearToken() {
    this.token = null;
    localStorage.removeItem('admin_token');
  }

  getToken() {
    return this.token;
  }

  private async request<T = any>(
    method: string,
    endpoint: string,
    body?: any
  ): Promise<ApiResponse<T>> {
    const headers: HeadersInit = {
      'Content-Type': 'application/json',
    };

    if (this.token) {
      headers['Authorization'] = `Bearer ${this.token}`;
    }

    try {
      const response = await fetch(`${API_BASE}${endpoint}`, {
        method,
        headers,
        body: body ? JSON.stringify(body) : undefined,
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Request failed');
      }

      return data;
    } catch (error: any) {
      console.error('API Error:', error);
      return {
        success: false,
        error: error.message || 'Network error',
      };
    }
  }

  // ==========================================
  // Authentication
  // ==========================================

  async login(email: string, password: string) {
    const response = await this.request<{ token: string; admin: any }>(
      'POST',
      '/admin/auth/login',
      { email, password }
    );

    if (response.success && response.data?.token) {
      this.setToken(response.data.token);
    }

    return response;
  }

  async getCurrentAdmin() {
    return this.request<{ admin: any }>('GET', '/admin/auth/me');
  }

  logout() {
    this.clearToken();
  }

  // ==========================================
  // AI Providers
  // ==========================================

  async getAiProviders() {
    return this.request('GET', '/admin/ai-providers');
  }

  async getAiProvider(id: string) {
    return this.request('GET', `/admin/ai-providers/${id}`);
  }

  async createAiProvider(data: any) {
    return this.request('POST', '/admin/ai-providers', data);
  }

  async updateAiProvider(id: string, data: any) {
    return this.request('PATCH', `/admin/ai-providers/${id}`, data);
  }

  async deleteAiProvider(id: string) {
    return this.request('DELETE', `/admin/ai-providers/${id}`);
  }

  async testAiProvider(id: string) {
    return this.request('POST', `/admin/ai-providers/${id}/test`);
  }

  // ==========================================
  // Dashboard
  // ==========================================

  async getDashboardStats() {
    return this.request('GET', '/admin/dashboard/stats');
  }

  async getSystemHealth() {
    return this.request('GET', '/admin/dashboard/health');
  }

  // ==========================================
  // Tenants
  // ==========================================

  async getTenants() {
    return this.request('GET', '/admin/tenants');
  }

  async getTenant(id: string) {
    return this.request('GET', `/admin/tenants/${id}`);
  }

  async updateTenant(id: string, data: any) {
    return this.request('PATCH', `/admin/tenants/${id}`, data);
  }

  // ==========================================
  // Git Providers
  // ==========================================

  async getGitProviders() {
    return this.request('GET', '/admin/git-providers');
  }

  async getGitProvider(id: string) {
    return this.request('GET', `/admin/git-providers/${id}`);
  }

  async createGitProvider(data: any) {
    return this.request('POST', '/admin/git-providers', data);
  }

  async updateGitProvider(id: string, data: any) {
    return this.request('PATCH', `/admin/git-providers/${id}`, data);
  }

  async deleteGitProvider(id: string) {
    return this.request('DELETE', `/admin/git-providers/${id}`);
  }

  // ==========================================
  // Audit Log
  // ==========================================

  async getAuditLog(limit = 100, offset = 0) {
    return this.request('GET', `/admin/audit-log?limit=${limit}&offset=${offset}`);
  }
}

// Export singleton instance
export const adminApi = new AdminApiClient();
export default adminApi;
