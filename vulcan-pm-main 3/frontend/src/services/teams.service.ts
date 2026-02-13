/**
 * Teams Service - Uses Local Backend
 * All Supabase calls have been replaced with local backend API calls
 */

import { api } from '../lib/api';
import { Team } from '../types';

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

export class TeamsService {
  // Get all teams
  async getAll(params?: { page?: number; limit?: number }, organizationId?: string): Promise<{ data: any[]; count: number }> {
    const response = await fetch(`${API_BASE}/teams`, {
      headers: getAuthHeaders(),
    });
    const data = await response.json();
    const teams = data.success ? data.data || [] : [];
    return { data: teams, count: teams.length };
  }

  // Get all teams for current organization
  async getAllForCurrentOrg(params?: { page?: number; limit?: number }): Promise<{ data: any[]; count: number }> {
    return this.getAll(params);
  }

  // Get all teams with details
  async getAllWithDetails(): Promise<any[]> {
    const { data } = await this.getAll();
    return data;
  }

  // Get team by ID
  async getById(id: string): Promise<any | null> {
    const response = await fetch(`${API_BASE}/teams/${id}`, {
      headers: getAuthHeaders(),
    });
    const data = await response.json();
    return data.success ? data.data : null;
  }

  // Create new team
  async create(team: Partial<Team>, memberIds?: string[]): Promise<Team> {
    const response = await fetch(`${API_BASE}/teams`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify({ ...team, member_ids: memberIds }),
    });
    const data = await response.json();
    if (!data.success) throw new Error(data.error || 'Failed to create team');
    return data.data;
  }

  // Update team
  async update(id: string, updates: Partial<Team>): Promise<Team> {
    const response = await fetch(`${API_BASE}/teams/${id}`, {
      method: 'PATCH',
      headers: getAuthHeaders(),
      body: JSON.stringify(updates),
    });
    const data = await response.json();
    if (!data.success) throw new Error(data.error || 'Failed to update team');
    return data.data;
  }

  // Delete team
  async delete(id: string): Promise<void> {
    await fetch(`${API_BASE}/teams/${id}`, {
      method: 'DELETE',
      headers: getAuthHeaders(),
    });
  }

  // Add member to team
  async addMember(teamId: string, userId: string): Promise<void> {
    await fetch(`${API_BASE}/teams/${teamId}/members`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify({ user_id: userId }),
    });
  }

  // Remove member from team
  async removeMember(teamId: string, userId: string): Promise<void> {
    await fetch(`${API_BASE}/teams/${teamId}/members/${userId}`, {
      method: 'DELETE',
      headers: getAuthHeaders(),
    });
  }

  // Get team members
  async getMembers(teamId: string): Promise<any[]> {
    const response = await fetch(`${API_BASE}/teams/${teamId}/members`, {
      headers: getAuthHeaders(),
    });
    const data = await response.json();
    return data.success ? data.data || [] : [];
  }

  // Set team members (replace all)
  async setMembers(teamId: string, userIds: string[]): Promise<void> {
    await fetch(`${API_BASE}/teams/${teamId}/members`, {
      method: 'PUT',
      headers: getAuthHeaders(),
      body: JSON.stringify({ user_ids: userIds }),
    });
  }

  // Add project to team
  async addProject(teamId: string, projectId: string): Promise<void> {
    await fetch(`${API_BASE}/teams/${teamId}/projects`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify({ project_id: projectId }),
    });
  }

  // Remove project from team
  async removeProject(teamId: string, projectId: string): Promise<void> {
    await fetch(`${API_BASE}/teams/${teamId}/projects/${projectId}`, {
      method: 'DELETE',
      headers: getAuthHeaders(),
    });
  }

  // Get teams for a specific user
  async getTeamsForUser(userId: string): Promise<any[]> {
    const response = await fetch(`${API_BASE}/users/${userId}/teams`, {
      headers: getAuthHeaders(),
    });
    const data = await response.json();
    return data.success ? data.data || [] : [];
  }

  // Get teams for a specific project
  async getTeamsForProject(projectId: string): Promise<any[]> {
    const response = await fetch(`${API_BASE}/projects/${projectId}/teams`, {
      headers: getAuthHeaders(),
    });
    const data = await response.json();
    return data.success ? data.data || [] : [];
  }
}

export const teamsService = new TeamsService();
