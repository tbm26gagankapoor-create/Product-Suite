/**
 * Users Service - Uses Local Backend
 * All Supabase calls have been replaced with local backend API calls
 */

import { User } from '../types';

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

export class UsersService {
  // Get all users with optional search and pagination
  async getAll(params?: { search?: string; organizationId?: string; page?: number; limit?: number }): Promise<{ data: any[]; count: number }> {
    const queryParams = new URLSearchParams();
    if (params?.search) queryParams.append('search', params.search);
    if (params?.organizationId) queryParams.append('organization_id', params.organizationId);
    if (params?.page) queryParams.append('page', String(params.page));
    if (params?.limit) queryParams.append('limit', String(params.limit));

    const response = await fetch(`${API_BASE}/users?${queryParams}`, {
      headers: getAuthHeaders(),
    });
    const data = await response.json();
    if (!data.success) return { data: [], count: 0 };
    return { data: data.data || [], count: data.count || data.data?.length || 0 };
  }

  // Get all users for the current organization
  async getAllForCurrentOrg(params?: { search?: string; page?: number; limit?: number }): Promise<{ data: any[]; count: number }> {
    return this.getAll(params);
  }

  // Get organization members
  async getOrganizationMembers(organizationId: string): Promise<any[]> {
    const response = await fetch(`${API_BASE}/users?organization_id=${organizationId}`, {
      headers: getAuthHeaders(),
    });
    const data = await response.json();
    return data.success ? data.data || [] : [];
  }

  // Get user by ID
  async getById(id: string): Promise<any | null> {
    const response = await fetch(`${API_BASE}/users/${id}`, {
      headers: getAuthHeaders(),
    });
    const data = await response.json();
    return data.success ? data.data : null;
  }

  // Get user by auth ID (not needed in local backend - auth ID is same as user ID)
  async getByAuthId(authUserId: string): Promise<any | null> {
    return this.getById(authUserId);
  }

  // Get current user's profile
  async getCurrentProfile(): Promise<any | null> {
    const response = await fetch(`${API_BASE}/auth/me`, {
      headers: getAuthHeaders(),
    });
    const data = await response.json();
    return data.success ? data.data : null;
  }

  // Update user profile
  async update(id: string, updates: Partial<User>): Promise<any> {
    const response = await fetch(`${API_BASE}/users/${id}`, {
      method: 'PATCH',
      headers: getAuthHeaders(),
      body: JSON.stringify(updates),
    });
    const data = await response.json();
    if (!data.success) throw new Error(data.error || 'Failed to update user');
    return data.data;
  }

  // Update current user's profile
  async updateCurrentProfile(updates: Partial<User>): Promise<any> {
    const profile = await this.getCurrentProfile();
    if (!profile) throw new Error('No active user profile found');
    return this.update(profile.id, updates);
  }

  // Check if user is admin
  async isAdmin(userId: string): Promise<boolean> {
    const user = await this.getById(userId);
    return user?.is_admin || user?.role === 'Admin';
  }

  // Get users by IDs (batch fetch)
  async getByIds(ids: string[]): Promise<any[]> {
    if (ids.length === 0) return [];
    // Fetch all and filter
    const { data } = await this.getAll();
    return data.filter(u => ids.includes(u.id));
  }

  // Search users by name/email
  async search(query: string, limit: number = 10): Promise<any[]> {
    if (!query) return [];
    const { data } = await this.getAll({ search: query, limit });
    return data;
  }
}

export const usersService = new UsersService();
