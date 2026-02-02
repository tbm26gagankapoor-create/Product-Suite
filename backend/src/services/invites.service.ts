import database, { generateUUID, now } from '../lib/database.js';
import { config } from '../config/index.js';

export interface OrganizationInvite {
  id: string;
  organization_id: string;
  email: string;
  role: 'admin' | 'member';
  invited_by: string;
  status: 'pending' | 'accepted' | 'expired' | 'revoked';
  created_at: string;
  expires_at: string;
  accepted_at: string | null;
}

export interface CreateInviteInput {
  organizationId: string;
  email: string;
  role: 'admin' | 'member';
  invitedBy: string;
}

export const invitesService = {
  /**
   * Create a new invite
   */
  async create(input: CreateInviteInput): Promise<OrganizationInvite> {
    // Check for existing pending invite
    const existingInvite = await database.findOne<OrganizationInvite>('organization_invites', {
      organization_id: input.organizationId,
      email: input.email.toLowerCase(),
      status: 'pending'
    });

    if (existingInvite) {
      // Update the existing invite to refresh expiration
      const updated = await database.update<OrganizationInvite>('organization_invites', existingInvite.id, {
        expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
        invited_by: input.invitedBy,
        role: input.role,
      });
      return updated || existingInvite;
    }

    const invite: OrganizationInvite = {
      id: generateUUID(),
      organization_id: input.organizationId,
      email: input.email.toLowerCase(),
      role: input.role,
      invited_by: input.invitedBy,
      status: 'pending',
      created_at: now(),
      expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(), // 7 days
      accepted_at: null,
    };

    await database.insert('organization_invites', invite);
    return invite;
  },

  /**
   * Get invite by ID
   */
  async getById(id: string): Promise<OrganizationInvite | null> {
    return database.findById<OrganizationInvite>('organization_invites', id);
  },

  /**
   * Get invite by email and organization
   */
  async getByEmail(email: string, organizationId: string): Promise<OrganizationInvite | null> {
    return database.findOne<OrganizationInvite>('organization_invites', {
      email: email.toLowerCase(),
      organization_id: organizationId,
      status: 'pending'
    });
  },

  /**
   * Get all invites for an organization
   */
  async getByOrganization(organizationId: string): Promise<OrganizationInvite[]> {
    return database.findMany<OrganizationInvite>('organization_invites', {
      organization_id: organizationId
    });
  },

  /**
   * Check if invite is valid (not expired and still pending)
   */
  isValid(invite: OrganizationInvite): boolean {
    if (invite.status !== 'pending') return false;
    const expiresAt = new Date(invite.expires_at);
    return expiresAt > new Date();
  },

  /**
   * Accept an invite
   */
  async accept(inviteId: string): Promise<OrganizationInvite | null> {
    const invite = await this.getById(inviteId);
    if (!invite) return null;
    if (!this.isValid(invite)) return null;

    const updated = await database.update<OrganizationInvite>('organization_invites', inviteId, {
      status: 'accepted',
      accepted_at: now(),
    });

    return updated || null;
  },

  /**
   * Revoke an invite
   */
  async revoke(inviteId: string): Promise<boolean> {
    const invite = await this.getById(inviteId);
    if (!invite || invite.status !== 'pending') return false;

    await database.update<OrganizationInvite>('organization_invites', inviteId, {
      status: 'revoked',
    });

    return true;
  },

  /**
   * Generate invite link
   */
  getInviteLink(inviteId: string): string {
    const frontendUrl = config.frontend.url;
    return `${frontendUrl}/invite/${inviteId}`;
  },

  /**
   * Mark expired invites
   */
  async cleanupExpired(): Promise<number> {
    const pendingInvites = await database.findMany<OrganizationInvite>('organization_invites', {
      status: 'pending'
    });

    const expiredInvites = pendingInvites.filter(inv => new Date(inv.expires_at) < new Date());

    for (const inv of expiredInvites) {
      await database.update('organization_invites', inv.id, { status: 'expired' });
    }

    return expiredInvites.length;
  },
};
