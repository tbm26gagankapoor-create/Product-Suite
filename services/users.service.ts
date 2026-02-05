/**
 * Users Service - Uses Centralized HTTP Client
 */

import { User } from '../types';
import { httpClient, buildQueryString } from '../lib/httpClient';
import { mapUser, mapUsers, mapUserToBackend } from '../lib/mappers';

export class UsersService {
  // Get all users with optional search and pagination
  async getAll(params?: {
    search?: string;
    organizationId?: string;
    page?: number;
    limit?: number;
  }): Promise<{ data: User[]; count: number }> {
    const query = buildQueryString({
      search: params?.search,
      organization_id: params?.organizationId,
      page: params?.page,
      limit: params?.limit,
    });

    try {
      const response = await httpClient.get<any[]>(`/users${query}`);
      const users = mapUsers(response);
      return { data: users, count: users.length };
    } catch {
      return { data: [], count: 0 };
    }
  }

  // Get all users for the current organization
  async getAllForCurrentOrg(params?: {
    search?: string;
    page?: number;
    limit?: number;
  }): Promise<{ data: User[]; count: number }> {
    return this.getAll(params);
  }

  // Get organization members
  async getOrganizationMembers(organizationId: string): Promise<User[]> {
    try {
      const response = await httpClient.get<any[]>(`/users?organization_id=${organizationId}`);
      return mapUsers(response);
    } catch {
      return [];
    }
  }

  // Get user by ID
  async getById(id: string): Promise<User | null> {
    try {
      const response = await httpClient.get<any>(`/users/${id}`);
      return mapUser(response);
    } catch {
      return null;
    }
  }

  // Get user by auth ID (auth ID is same as user ID in local backend)
  async getByAuthId(authUserId: string): Promise<User | null> {
    return this.getById(authUserId);
  }

  // Get current user's profile
  async getCurrentProfile(): Promise<User | null> {
    try {
      const response = await httpClient.get<any>('/auth/me');
      return mapUser(response);
    } catch {
      return null;
    }
  }

  // Update user profile
  async update(id: string, updates: Partial<User>): Promise<User> {
    const backendUpdates = mapUserToBackend(updates);
    const response = await httpClient.patch<any>(`/users/${id}`, backendUpdates);
    return mapUser(response);
  }

  // Update current user's profile
  async updateCurrentProfile(updates: Partial<User>): Promise<User> {
    const profile = await this.getCurrentProfile();
    if (!profile) throw new Error('No active user profile found');
    return this.update(profile.id, updates);
  }

  // Check if user is admin
  async isAdmin(userId: string): Promise<boolean> {
    const user = await this.getById(userId);
    return user?.isAdmin || user?.designation === 'Admin';
  }

  // Get users by IDs (batch fetch)
  async getByIds(ids: string[]): Promise<User[]> {
    if (ids.length === 0) return [];
    const { data } = await this.getAll();
    return data.filter((u) => ids.includes(u.id));
  }

  // Search users by name/email
  async search(query: string, limit: number = 10): Promise<User[]> {
    if (!query) return [];
    const { data } = await this.getAll({ search: query, limit });
    return data;
  }
}

export const usersService = new UsersService();
