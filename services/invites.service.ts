/**
 * Invites Service - Uses Centralized HTTP Client
 */

import { httpClient, buildQueryString } from '../lib/httpClient';
import { organizationsService } from './organizations.service';

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
    return httpClient.post<OrganizationInvite>('/invites', {
      organization_id: organizationId,
      email,
      role,
      invited_by: invitedBy,
    });
  }

  /**
   * Get all invitations for an organization
   */
  async getByOrganization(organizationId: string): Promise<OrganizationInvite[]> {
    try {
      const response = await httpClient.get<OrganizationInvite[]>(
        `/invites?organization_id=${organizationId}`
      );
      return response || [];
    } catch {
      return [];
    }
  }

  /**
   * Get pending invitations for an organization
   */
  async getPendingByOrganization(organizationId: string): Promise<OrganizationInvite[]> {
    try {
      const response = await httpClient.get<OrganizationInvite[]>(
        `/invites?organization_id=${organizationId}&status=pending`
      );
      return response || [];
    } catch {
      return [];
    }
  }

  /**
   * Get invitation by ID
   */
  async getById(id: string): Promise<OrganizationInvite | null> {
    try {
      const response = await httpClient.get<OrganizationInvite>(`/invites/${id}`);
      return response;
    } catch {
      return null;
    }
  }

  /**
   * Get invitation by email for a specific organization
   */
  async getByEmail(organizationId: string, email: string): Promise<OrganizationInvite | null> {
    try {
      const response = await httpClient.get<OrganizationInvite[]>(
        `/invites?organization_id=${organizationId}&email=${encodeURIComponent(email)}`
      );
      return response && response.length > 0 ? response[0] : null;
    } catch {
      return null;
    }
  }

  /**
   * Get pending invitation by email (any organization)
   */
  async getPendingByEmail(email: string): Promise<OrganizationInvite | null> {
    try {
      const response = await httpClient.get<OrganizationInvite[]>(
        `/invites?email=${encodeURIComponent(email)}&status=pending`
      );
      return response && response.length > 0 ? response[0] : null;
    } catch {
      return null;
    }
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
    return httpClient.patch<OrganizationInvite>(`/invites/${id}`, { status });
  }

  /**
   * Resend invitation
   */
  async resend(id: string): Promise<OrganizationInvite> {
    const newExpiresAt = new Date();
    newExpiresAt.setDate(newExpiresAt.getDate() + 7);

    return httpClient.patch<OrganizationInvite>(`/invites/${id}`, {
      status: 'pending',
      expires_at: newExpiresAt.toISOString(),
    });
  }

  /**
   * Revoke/cancel an invitation
   */
  async revoke(id: string): Promise<void> {
    await httpClient.delete(`/invites/${id}`);
  }

  /**
   * Clean up expired invitations
   */
  async cleanupExpired(): Promise<void> {
    await httpClient.post('/invites/cleanup');
  }

  /**
   * Generate an invite link
   */
  getInviteLink(inviteId: string): string {
    return `${window.location.origin}/signup?invite=${inviteId}`;
  }
}

export const invitesService = new InvitesService();
