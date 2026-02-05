/**
 * Organizations Service - Uses Centralized HTTP Client
 * Supports multi-organization membership and domain-based organization matching
 */

import { GENERIC_EMAIL_DOMAINS, OrganizationRole } from '../types';
import { httpClient } from '../lib/httpClient';
import { mapOrganization } from '../lib/mappers';

export interface Organization {
  id: string;
  name: string;
  slug: string;
  domain?: string;
  logoUrl?: string;
  owner_id?: string;
  memberCount?: number;
  projectCount?: number;
  settings?: {
    allowDomainJoin: boolean;
    requireApproval: boolean;
    defaultRole: OrganizationRole;
  };
  createdAt?: string;
}

export interface UserOrganizationMembership {
  organizationId: string;
  organization: Organization;
  role: OrganizationRole;
  joinedAt: string;
  isActive: boolean;
}

export class OrganizationsService {
  /**
   * Create a new organization
   */
  async create(data: { name: string; slug?: string; owner_id?: string }): Promise<Organization> {
    const response = await httpClient.post<any>('/organizations', data);
    return mapOrganization(response);
  }

  /**
   * Get organization by ID
   */
  async getById(id: string): Promise<Organization | null> {
    try {
      const response = await httpClient.get<any>(`/organizations/${id}`);
      return mapOrganization(response);
    } catch {
      return null;
    }
  }

  /**
   * Get organization by slug
   */
  async getBySlug(slug: string): Promise<Organization | null> {
    try {
      const response = await httpClient.get<any[]>(`/organizations?slug=${slug}`);
      if (response && response.length > 0) {
        return mapOrganization(response[0]);
      }
      return null;
    } catch {
      return null;
    }
  }

  /**
   * Get organization with all members
   */
  async getWithMembers(id: string): Promise<any | null> {
    const org = await this.getById(id);
    if (!org) return null;
    const members = await this.getMembers(id);
    return { ...org, members };
  }

  /**
   * Update organization
   */
  async update(id: string, data: Partial<Organization>): Promise<Organization> {
    const response = await httpClient.patch<any>(`/organizations/${id}`, data);
    return mapOrganization(response);
  }

  /**
   * Delete organization
   */
  async delete(id: string): Promise<void> {
    await httpClient.delete(`/organizations/${id}`);
  }

  /**
   * Get all members of an organization
   */
  async getMembers(organizationId: string): Promise<any[]> {
    try {
      const response = await httpClient.get<any[]>(`/organizations/${organizationId}/members`);
      return response || [];
    } catch {
      return [];
    }
  }

  /**
   * Add a member to an organization
   */
  async addMember(
    organizationId: string,
    userId: string,
    role: OrganizationRole = 'member'
  ): Promise<any> {
    return httpClient.post(`/organizations/${organizationId}/members`, { user_id: userId, role });
  }

  /**
   * Remove a member from an organization
   */
  async removeMember(organizationId: string, userId: string): Promise<void> {
    await httpClient.delete(`/organizations/${organizationId}/members/${userId}`);
  }

  /**
   * Update a member's role
   */
  async updateMemberRole(
    organizationId: string,
    userId: string,
    role: OrganizationRole
  ): Promise<any> {
    return httpClient.patch(`/organizations/${organizationId}/members/${userId}`, { role });
  }

  /**
   * Check if a user is an admin of an organization
   */
  async isAdmin(organizationId: string, userId: string): Promise<boolean> {
    const members = await this.getMembers(organizationId);
    const member = members.find((m: any) => m.user_id === userId);
    return member?.role === 'admin';
  }

  /**
   * Get the organization for the current user
   */
  async getCurrentOrganization(): Promise<Organization | null> {
    try {
      const data = await httpClient.get<any>('/auth/me');
      if (data?.organization_id) {
        return this.getById(data.organization_id);
      }
      return null;
    } catch {
      return null;
    }
  }

  /**
   * Get the organization for a specific user
   */
  async getUserOrganization(userId: string): Promise<Organization | null> {
    try {
      const data = await httpClient.get<any>(`/users/${userId}`);
      if (data?.organization_id) {
        return this.getById(data.organization_id);
      }
      return null;
    } catch {
      return null;
    }
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
   */
  async createWithAdmin(name: string, userId: string): Promise<Organization> {
    const slug = await this.generateSlug(name);
    const organization = await this.create({ name, slug, owner_id: userId });
    await this.addMember(organization.id, userId, 'admin');
    return organization;
  }

  /**
   * Setup organization for an existing user
   */
  async setupForExistingUser(userId: string, orgName: string): Promise<Organization> {
    return this.createWithAdmin(orgName, userId);
  }

  /**
   * Get all organizations a user is a member of
   */
  async getUserOrganizations(userId: string): Promise<UserOrganizationMembership[]> {
    try {
      const response = await httpClient.get<UserOrganizationMembership[]>(
        `/users/${userId}/organizations`
      );
      return response || [];
    } catch (e) {
      console.error('Error fetching user organizations:', e);
      return [];
    }
  }

  /**
   * Get all organizations that match a specific email domain
   * Excludes generic email domains like gmail.com, outlook.com, etc.
   */
  async getOrganizationsByDomain(email: string): Promise<Organization[]> {
    const domain = email.split('@')[1]?.toLowerCase();

    if (!domain || GENERIC_EMAIL_DOMAINS.includes(domain)) {
      return [];
    }

    try {
      const response = await httpClient.get<any[]>(
        `/organizations?domain=${encodeURIComponent(domain)}`
      );
      return (response || []).map(mapOrganization);
    } catch (e) {
      console.error('Error fetching organizations by domain:', e);
      return [];
    }
  }

  /**
   * Check if an email domain is a generic/personal email provider
   */
  isGenericEmailDomain(email: string): boolean {
    const domain = email.split('@')[1]?.toLowerCase();
    return !domain || GENERIC_EMAIL_DOMAINS.includes(domain);
  }

  /**
   * Extract domain from email address
   */
  extractDomain(email: string): string | null {
    const domain = email.split('@')[1]?.toLowerCase();
    return domain || null;
  }

  /**
   * Switch active organization for a user
   */
  async switchOrganization(userId: string, organizationId: string): Promise<boolean> {
    try {
      await httpClient.patch(`/users/${userId}/active-organization`, {
        organization_id: organizationId,
      });
      return true;
    } catch (e) {
      console.error('Error switching organization:', e);
      return false;
    }
  }

  /**
   * Request to join an organization
   */
  async requestToJoin(organizationId: string, userId: string): Promise<boolean> {
    try {
      await httpClient.post(`/organizations/${organizationId}/join-requests`, {
        user_id: userId,
      });
      return true;
    } catch (e) {
      console.error('Error requesting to join organization:', e);
      return false;
    }
  }

  /**
   * Leave an organization
   */
  async leaveOrganization(organizationId: string, userId: string): Promise<boolean> {
    try {
      await httpClient.delete(`/organizations/${organizationId}/members/${userId}`);
      return true;
    } catch (e) {
      console.error('Error leaving organization:', e);
      return false;
    }
  }

  /**
   * Update organization settings
   */
  async updateSettings(
    organizationId: string,
    settings: {
      allowDomainJoin?: boolean;
      requireApproval?: boolean;
      defaultRole?: OrganizationRole;
    }
  ): Promise<Organization | null> {
    try {
      const response = await httpClient.patch<any>(
        `/organizations/${organizationId}/settings`,
        settings
      );
      return mapOrganization(response);
    } catch (e) {
      console.error('Error updating organization settings:', e);
      return null;
    }
  }

  /**
   * Set organization domain for domain-based auto-join
   */
  async setDomain(organizationId: string, domain: string): Promise<Organization | null> {
    try {
      const response = await httpClient.patch<any>(`/organizations/${organizationId}`, { domain });
      return mapOrganization(response);
    } catch (e) {
      console.error('Error setting organization domain:', e);
      return null;
    }
  }

  /**
   * Get organization statistics
   */
  async getStats(organizationId: string): Promise<{
    memberCount: number;
    projectCount: number;
    taskCount: number;
    adminCount: number;
  } | null> {
    try {
      const response = await httpClient.get<any>(`/organizations/${organizationId}/stats`);
      return response;
    } catch (e) {
      console.error('Error fetching organization stats:', e);
      return null;
    }
  }
}

export const organizationsService = new OrganizationsService();
