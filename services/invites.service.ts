
import { supabase } from '../lib/supabase';
import { handleSupabaseError } from '../utils/errors';
import {
  OrganizationInvite,
  OrganizationInviteInsert,
  OrganizationInviteWithInviter,
  OrganizationRole,
  InviteStatus
} from '../types/database.types';
import { organizationsService } from './organizations.service';

export class InvitesService {
  /**
   * Create a new invitation and send email via Supabase Auth
   */
  async create(
    organizationId: string,
    email: string,
    role: OrganizationRole = 'member',
    invitedBy?: string
  ): Promise<OrganizationInvite> {
    // Check if invitation already exists
    const existing = await this.getByEmail(organizationId, email);
    if (existing && existing.status === 'pending') {
      throw new Error('An invitation has already been sent to this email');
    }

    // Check if user already exists with this email and is in an org
    const { data: existingUser } = await supabase
      .from('users')
      .select('id, organization_id')
      .eq('email', email)
      .single();

    if (existingUser?.organization_id) {
      throw new Error('This user is already a member of an organization');
    }

    // Create the invitation record
    const { data: invite, error } = await supabase
      .from('organization_invites')
      .insert({
        organization_id: organizationId,
        email,
        role,
        invited_by: invitedBy,
        status: 'pending'
      })
      .select()
      .single();

    if (error) handleSupabaseError(error);

    // Note: Email sending requires either:
    // 1. Supabase Edge Function with service role key (secure, recommended for production)
    // 2. Third-party email service (SendGrid, Resend, etc.)
    //
    // For now, invites work via record-based matching:
    // - Admin creates invite with email
    // - When user signs up with that email, they're automatically added to the org
    // - Admin can share the signup link manually

    return invite;
  }

  /**
   * Get all pending invitations for an organization
   */
  async getByOrganization(organizationId: string): Promise<OrganizationInviteWithInviter[]> {
    const { data, error } = await supabase
      .from('organization_invites')
      .select(`
        *,
        inviter:users!invited_by(*)
      `)
      .eq('organization_id', organizationId)
      .order('created_at', { ascending: false });

    if (error) handleSupabaseError(error);
    return (data || []) as unknown as OrganizationInviteWithInviter[];
  }

  /**
   * Get pending invitations for an organization
   */
  async getPendingByOrganization(organizationId: string): Promise<OrganizationInviteWithInviter[]> {
    const { data, error } = await supabase
      .from('organization_invites')
      .select(`
        *,
        inviter:users!invited_by(*)
      `)
      .eq('organization_id', organizationId)
      .eq('status', 'pending')
      .order('created_at', { ascending: false });

    if (error) handleSupabaseError(error);
    return (data || []) as unknown as OrganizationInviteWithInviter[];
  }

  /**
   * Get invitation by ID
   */
  async getById(id: string): Promise<OrganizationInvite | null> {
    const { data, error } = await supabase
      .from('organization_invites')
      .select('*')
      .eq('id', id)
      .single();

    if (error) {
      if (error.code === 'PGRST116') return null;
      handleSupabaseError(error);
    }
    return data;
  }

  /**
   * Get invitation by email for a specific organization
   */
  async getByEmail(organizationId: string, email: string): Promise<OrganizationInvite | null> {
    const { data, error } = await supabase
      .from('organization_invites')
      .select('*')
      .eq('organization_id', organizationId)
      .eq('email', email)
      .single();

    if (error) {
      if (error.code === 'PGRST116') return null;
      handleSupabaseError(error);
    }
    return data;
  }

  /**
   * Get pending invitation by email (any organization)
   * Used to check if user was invited during signup
   */
  async getPendingByEmail(email: string): Promise<OrganizationInvite | null> {
    const { data, error } = await supabase
      .from('organization_invites')
      .select('*')
      .eq('email', email)
      .eq('status', 'pending')
      .gt('expires_at', new Date().toISOString())
      .single();

    if (error) {
      if (error.code === 'PGRST116') return null;
      handleSupabaseError(error);
    }
    return data;
  }

  /**
   * Accept an invitation
   * Called after user signs up via invite link
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
      // Mark as expired
      await this.updateStatus(inviteId, 'expired');
      throw new Error('Invitation has expired');
    }

    // Add user to organization
    await organizationsService.addMember(
      invite.organization_id,
      userId,
      invite.role
    );

    // Mark invitation as accepted
    await this.updateStatus(inviteId, 'accepted');
  }

  /**
   * Update invitation status
   */
  async updateStatus(id: string, status: InviteStatus): Promise<OrganizationInvite> {
    const { data, error } = await supabase
      .from('organization_invites')
      .update({ status })
      .eq('id', id)
      .select()
      .single();

    if (error) handleSupabaseError(error);
    return data;
  }

  /**
   * Resend invitation email
   */
  async resend(id: string): Promise<OrganizationInvite> {
    const invite = await this.getById(id);

    if (!invite) {
      throw new Error('Invitation not found');
    }

    // Reset expiration
    const newExpiresAt = new Date();
    newExpiresAt.setDate(newExpiresAt.getDate() + 7);

    const { data, error } = await supabase
      .from('organization_invites')
      .update({
        status: 'pending',
        expires_at: newExpiresAt.toISOString()
      })
      .eq('id', id)
      .select()
      .single();

    if (error) handleSupabaseError(error);

    // Invitation expiration has been reset
    // Admin can share the signup link again with the user

    return data;
  }

  /**
   * Revoke/cancel an invitation
   */
  async revoke(id: string): Promise<void> {
    const { error } = await supabase
      .from('organization_invites')
      .delete()
      .eq('id', id);

    if (error) handleSupabaseError(error);
  }

  /**
   * Clean up expired invitations
   */
  async cleanupExpired(): Promise<void> {
    const { error } = await supabase
      .from('organization_invites')
      .update({ status: 'expired' })
      .eq('status', 'pending')
      .lt('expires_at', new Date().toISOString());

    if (error) console.error('Failed to cleanup expired invites:', error);
  }

  /**
   * Generate an invite link that can be shared with the user
   * The link directs to signup with the invite ID pre-filled
   */
  getInviteLink(inviteId: string): string {
    return `${window.location.origin}/signup?invite=${inviteId}`;
  }
}

export const invitesService = new InvitesService();
