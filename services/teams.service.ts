/**
 * Teams Service - Uses Centralized HTTP Client
 */

import { Team } from '../types';
import { httpClient } from '../lib/httpClient';
import { mapTeam, mapTeams, mapTeamToBackend } from '../lib/mappers';

export class TeamsService {
  // Get all teams
  async getAll(params?: {
    page?: number;
    limit?: number;
  }): Promise<{ data: Team[]; count: number }> {
    try {
      const response = await httpClient.get<any[]>('/teams');
      const teams = mapTeams(response);
      return { data: teams, count: teams.length };
    } catch {
      return { data: [], count: 0 };
    }
  }

  // Get all teams for current organization
  async getAllForCurrentOrg(params?: {
    page?: number;
    limit?: number;
  }): Promise<{ data: Team[]; count: number }> {
    return this.getAll(params);
  }

  // Get all teams with details
  async getAllWithDetails(): Promise<Team[]> {
    const { data } = await this.getAll();
    return data;
  }

  // Get team by ID
  async getById(id: string): Promise<Team | null> {
    try {
      const response = await httpClient.get<any>(`/teams/${id}`);
      return mapTeam(response);
    } catch {
      return null;
    }
  }

  // Create new team
  async create(team: Partial<Team>, memberIds?: string[]): Promise<Team> {
    const backendData = {
      ...mapTeamToBackend(team),
      member_ids: memberIds,
    };
    const response = await httpClient.post<any>('/teams', backendData);
    return mapTeam(response);
  }

  // Update team
  async update(id: string, updates: Partial<Team>): Promise<Team> {
    const backendUpdates = mapTeamToBackend(updates);
    const response = await httpClient.patch<any>(`/teams/${id}`, backendUpdates);
    return mapTeam(response);
  }

  // Delete team
  async delete(id: string): Promise<void> {
    await httpClient.delete(`/teams/${id}`);
  }

  // Add member to team
  async addMember(teamId: string, userId: string): Promise<void> {
    await httpClient.post(`/teams/${teamId}/members`, { user_id: userId });
  }

  // Remove member from team
  async removeMember(teamId: string, userId: string): Promise<void> {
    await httpClient.delete(`/teams/${teamId}/members/${userId}`);
  }

  // Get team members
  async getMembers(teamId: string): Promise<any[]> {
    try {
      const response = await httpClient.get<any[]>(`/teams/${teamId}/members`);
      return response;
    } catch {
      return [];
    }
  }

  // Set team members (replace all)
  async setMembers(teamId: string, userIds: string[]): Promise<void> {
    await httpClient.put(`/teams/${teamId}/members`, { user_ids: userIds });
  }

  // Add project to team
  async addProject(teamId: string, projectId: string): Promise<void> {
    await httpClient.post(`/teams/${teamId}/projects`, { project_id: projectId });
  }

  // Remove project from team
  async removeProject(teamId: string, projectId: string): Promise<void> {
    await httpClient.delete(`/teams/${teamId}/projects/${projectId}`);
  }

  // Get teams for a specific user
  async getTeamsForUser(userId: string): Promise<Team[]> {
    try {
      const response = await httpClient.get<any[]>(`/users/${userId}/teams`);
      return mapTeams(response);
    } catch {
      return [];
    }
  }

  // Get teams for a specific project
  async getTeamsForProject(projectId: string): Promise<Team[]> {
    try {
      const response = await httpClient.get<any[]>(`/projects/${projectId}/teams`);
      return mapTeams(response);
    } catch {
      return [];
    }
  }
}

export const teamsService = new TeamsService();
