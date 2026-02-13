/**
 * Invites Service - Uses Local Backend
 * All Supabase calls have been replaced with local backend API calls
 */

import { organizationsService } from './organizations.service';

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

export type OrganizationRole = 'admin' | 'member';
export type InviteStatus = 'pending' | 'accepted' | 'expired' | 'revoked';

export interface OrganizationInvite {
  id: string;
  organization_id: string;
  email: string;
  role: OrganizationRole;
  status: InviteStatus;
  invited_by?: string;
  expires_at: string;
  created_at: string;
}

export class InvitesService {
  /**
   * Create a new invitation
   */
  async create(
    organizationId: string,
    email: string,
    role: OrganizationRole = 'member',
    invitedBy?: string
  ): Promise<OrganizationInvite> {
    const response = await fetch(`${API_BASE}/invites`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify({
        organization_id: organizationId,
        email,
        role,
        invited_by: invitedBy,
      }),
    });
    const data = await response.json();
    if (!data.success) throw new Error(data.error || 'Failed to create invitation');
    return data.data;
  }

  /**
   * Get all invitations for an organization
   */
  async getByOrganization(organizationId: string): Promise<any[]> {
    const response = await fetch(`${API_BASE}/invites?organization_id=${organizationId}`, {
      headers: getAuthHeaders(),
    });
    const data = await response.json();
    return data.success ? data.data || [] : [];
  }

  /**
   * Get pending invitations for an organization
   */
  async getPendingByOrganization(organizationId: string): Promise<any[]> {
    const response = await fetch(`${API_BASE}/invites?organization_id=${organizationId}&status=pending`, {
      headers: getAuthHeaders(),
    });
    const data = await response.json();
    return data.success ? data.data || [] : [];
  }

  /**
   * Get invitation by ID
   */
  async getById(id: string): Promise<OrganizationInvite | null> {
    const response = await fetch(`${API_BASE}/invites/${id}`, {
      headers: getAuthHeaders(),
    });
    const data = await response.json();
    return data.success ? data.data : null;
  }

  /**
   * Get invitation by email for a specific organization
   */
  async getByEmail(organizationId: string, email: string): Promise<OrganizationInvite | null> {
    const response = await fetch(`${API_BASE}/invites?organization_id=${organizationId}&email=${encodeURIComponent(email)}`, {
      headers: getAuthHeaders(),
    });
    const data = await response.json();
    return data.success && data.data?.length > 0 ? data.data[0] : null;
  }

  /**
   * Get pending invitation by email (any organization)
   */
  async getPendingByEmail(email: string): Promise<OrganizationInvite | null> {
    const response = await fetch(`${API_BASE}/invites?email=${encodeURIComponent(email)}&status=pending`, {
      headers: getAuthHeaders(),
    });
    const data = await response.json();
    return data.success && data.data?.length > 0 ? data.data[0] : null;
  }

  /**
   * Accept an invitation
   */
  async accept(inviteId: string, userId: string): Promise<void> {
    const invite = await this.getById(inviteId);

    if (!invite) {
      throw new Error('Invitation not found');
    }

    if (invite.status !== 'pending') {
      throw new Error('Invitation is no longer valid');
    }

    if (new Date(invite.expires_at) < new Date()) {
      await this.updateStatus(inviteId, 'expired');
      throw new Error('Invitation has expired');
    }

    // Add user to organization
    await organizationsService.addMember(invite.organization_id, userId, invite.role);

    // Mark invitation as accepted
    await this.updateStatus(inviteId, 'accepted');
  }

  /**
   * Update invitation status
   */
  async updateStatus(id: string, status: InviteStatus): Promise<OrganizationInvite> {
    const response = await fetch(`${API_BASE}/invites/${id}`, {
      method: 'PATCH',
      headers: getAuthHeaders(),
      body: JSON.stringify({ status }),
    });
    const data = await response.json();
    if (!data.success) throw new Error(data.error || 'Failed to update invitation');
    return data.data;
  }

  /**
   * Resend invitation
   */
  async resend(id: string): Promise<OrganizationInvite> {
    const newExpiresAt = new Date();
    newExpiresAt.setDate(newExpiresAt.getDate() + 7);

    const response = await fetch(`${API_BASE}/invites/${id}`, {
      method: 'PATCH',
      headers: getAuthHeaders(),
      body: JSON.stringify({
        status: 'pending',
        expires_at: newExpiresAt.toISOString(),
      }),
    });
    const data = await response.json();
    if (!data.success) throw new Error(data.error || 'Failed to resend invitation');
    return data.data;
  }

  /**
   * Revoke/cancel an invitation
   */
  async revoke(id: string): Promise<void> {
    await fetch(`${API_BASE}/invites/${id}`, {
      method: 'DELETE',
      headers: getAuthHeaders(),
    });
  }

  /**
   * Clean up expired invitations
   */
  async cleanupExpired(): Promise<void> {
    await fetch(`${API_BASE}/invites/cleanup`, {
      method: 'POST',
      headers: getAuthHeaders(),
    });
  }

  /**
   * Generate an invite link
   */
  getInviteLink(inviteId: string): string {
    return `${window.location.origin}/signup?invite=${inviteId}`;
  }
}

export const invitesService = new InvitesService();
