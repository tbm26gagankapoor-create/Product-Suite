
import { supabase } from '../lib/supabase';
import { handleSupabaseError } from '../utils/errors';
import {
  Organization,
  OrganizationInsert,
  OrganizationUpdate,
  OrganizationMember,
  OrganizationMemberInsert,
  OrganizationMemberWithUser,
  OrganizationWithMembers,
  OrganizationRole
} from '../types/database.types';

export class OrganizationsService {
  /**
   * Create a new organization
   */
  async create(data: OrganizationInsert): Promise<Organization> {
    const { data: organization, error } = await supabase
      .from('organizations')
      .insert(data)
      .select()
      .single();

    if (error) handleSupabaseError(error);
    return organization;
  }

  /**
   * Get organization by ID
   */
  async getById(id: string): Promise<Organization | null> {
    const { data, error } = await supabase
      .from('organizations')
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
   * Get organization by slug
   */
  async getBySlug(slug: string): Promise<Organization | null> {
    const { data, error } = await supabase
      .from('organizations')
      .select('*')
      .eq('slug', slug)
      .single();

    if (error) {
      if (error.code === 'PGRST116') return null;
      handleSupabaseError(error);
    }
    return data;
  }

  /**
   * Get organization with all members
   */
  async getWithMembers(id: string): Promise<OrganizationWithMembers | null> {
    const { data, error } = await supabase
      .from('organizations')
      .select(`
        *,
        members:organization_members(
          *,
          user:users(*)
        )
      `)
      .eq('id', id)
      .single();

    if (error) {
      if (error.code === 'PGRST116') return null;
      handleSupabaseError(error);
    }

    return data as unknown as OrganizationWithMembers;
  }

  /**
   * Update organization
   */
  async update(id: string, data: OrganizationUpdate): Promise<Organization> {
    const { data: organization, error } = await supabase
      .from('organizations')
      .update(data)
      .eq('id', id)
      .select()
      .single();

    if (error) handleSupabaseError(error);
    return organization;
  }

  /**
   * Delete organization
   */
  async delete(id: string): Promise<void> {
    const { error } = await supabase
      .from('organizations')
      .delete()
      .eq('id', id);

    if (error) handleSupabaseError(error);
  }

  /**
   * Get all members of an organization
   */
  async getMembers(organizationId: string): Promise<OrganizationMemberWithUser[]> {
    const { data, error } = await supabase
      .from('organization_members')
      .select(`
        *,
        user:users(*)
      `)
      .eq('organization_id', organizationId)
      .order('joined_at', { ascending: true });

    if (error) handleSupabaseError(error);
    return (data || []) as unknown as OrganizationMemberWithUser[];
  }

  /**
   * Add a member to an organization
   */
  async addMember(
    organizationId: string,
    userId: string,
    role: OrganizationRole = 'member'
  ): Promise<OrganizationMember> {
    const { data, error } = await supabase
      .from('organization_members')
      .insert({
        organization_id: organizationId,
        user_id: userId,
        role
      })
      .select()
      .single();

    if (error) handleSupabaseError(error);

    // Also update the user's organization_id
    await supabase
      .from('users')
      .update({ organization_id: organizationId })
      .eq('id', userId);

    return data;
  }

  /**
   * Remove a member from an organization
   */
  async removeMember(organizationId: string, userId: string): Promise<void> {
    const { error } = await supabase
      .from('organization_members')
      .delete()
      .eq('organization_id', organizationId)
      .eq('user_id', userId);

    if (error) handleSupabaseError(error);

    // Also clear the user's organization_id
    await supabase
      .from('users')
      .update({ organization_id: null })
      .eq('id', userId);
  }

  /**
   * Update a member's role
   */
  async updateMemberRole(
    organizationId: string,
    userId: string,
    role: OrganizationRole
  ): Promise<OrganizationMember> {
    const { data, error } = await supabase
      .from('organization_members')
      .update({ role })
      .eq('organization_id', organizationId)
      .eq('user_id', userId)
      .select()
      .single();

    if (error) handleSupabaseError(error);
    return data;
  }

  /**
   * Check if a user is an admin of an organization
   */
  async isAdmin(organizationId: string, userId: string): Promise<boolean> {
    const { data, error } = await supabase
      .from('organization_members')
      .select('role')
      .eq('organization_id', organizationId)
      .eq('user_id', userId)
      .single();

    if (error) return false;
    return data?.role === 'admin';
  }

  /**
   * Get the organization for the current user
   */
  async getCurrentOrganization(): Promise<Organization | null> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return null;

    // First get the user's organization_id from their profile
    const { data: profile, error: profileError } = await supabase
      .from('users')
      .select('organization_id')
      .eq('auth_user_id', user.id)
      .single();

    if (profileError || !profile?.organization_id) return null;

    return this.getById(profile.organization_id);
  }

  /**
   * Get the organization for a specific user
   */
  async getUserOrganization(userId: string): Promise<Organization | null> {
    const { data: member, error } = await supabase
      .from('organization_members')
      .select('organization_id')
      .eq('user_id', userId)
      .single();

    if (error || !member) return null;
    return this.getById(member.organization_id);
  }

  /**
   * Generate a unique slug from organization name
   */
  async generateSlug(name: string): Promise<string> {
    const baseSlug = name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '')
      .substring(0, 50);

    // Check if slug exists
    let slug = baseSlug;
    let counter = 1;

    while (true) {
      const existing = await this.getBySlug(slug);
      if (!existing) break;
      slug = `${baseSlug}-${counter}`;
      counter++;
    }

    return slug;
  }

  /**
   * Create organization with the creator as admin
   * This is the main method used during user signup
   */
  async createWithAdmin(name: string, userId: string): Promise<Organization> {
    const slug = await this.generateSlug(name);

    // Create the organization with owner_id set to the creator
    const organization = await this.create({ name, slug, owner_id: userId });

    // Add the creator as admin
    await this.addMember(organization.id, userId, 'admin');

    return organization;
  }

  /**
   * Setup organization for an existing user (one-time utility)
   * Creates org, adds user as admin, updates user's organization_id
   * Handles edge cases where org_id is set but org/membership doesn't exist
   */
  async setupForExistingUser(userId: string, orgName: string): Promise<Organization> {
    // Check if user already has an organization
    const { data: user } = await supabase
      .from('users')
      .select('organization_id, name')
      .eq('id', userId)
      .single();

    if (user?.organization_id) {
      // Check if the organization actually exists
      const existingOrg = await this.getById(user.organization_id);

      if (existingOrg) {
        // Check if user is actually a member
        const { data: membership } = await supabase
          .from('organization_members')
          .select('id')
          .eq('organization_id', user.organization_id)
          .eq('user_id', userId)
          .single();

        if (membership) {
          throw new Error('User already belongs to an organization');
        }

        // User has org_id but no membership - add them as admin
        await this.addMember(existingOrg.id, userId, 'admin');
        return existingOrg;
      }

      // Organization doesn't exist - clear the stale organization_id
      await supabase
        .from('users')
        .update({ organization_id: null })
        .eq('id', userId);
    }

    // Create organization with user as owner and admin
    const organization = await this.createWithAdmin(orgName || `${user?.name || 'User'}'s Organization`, userId);

    return organization;
  }
}

export const organizationsService = new OrganizationsService();
