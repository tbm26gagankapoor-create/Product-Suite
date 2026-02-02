/**
 * Organizations Service - Uses Local Backend
 * Supports multi-organization membership and domain-based organization matching
 */

import { GENERIC_EMAIL_DOMAINS, OrganizationRole } from '../types';

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
    const response = await fetch(`${API_BASE}/organizations`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify(data),
    });
    const result = await response.json();
    if (!result.success) throw new Error(result.error || 'Failed to create organization');
    return result.data;
  }

  /**
   * Get organization by ID
   */
  async getById(id: string): Promise<Organization | null> {
    const response = await fetch(`${API_BASE}/organizations/${id}`, {
      headers: getAuthHeaders(),
    });
    const data = await response.json();
    return data.success ? data.data : null;
  }

  /**
   * Get organization by slug
   */
  async getBySlug(slug: string): Promise<Organization | null> {
    const response = await fetch(`${API_BASE}/organizations?slug=${slug}`, {
      headers: getAuthHeaders(),
    });
    const data = await response.json();
    if (data.success && data.data?.length > 0) {
      return data.data[0];
    }
    return null;
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
    const response = await fetch(`${API_BASE}/organizations/${id}`, {
      method: 'PATCH',
      headers: getAuthHeaders(),
      body: JSON.stringify(data),
    });
    const result = await response.json();
    if (!result.success) throw new Error(result.error || 'Failed to update organization');
    return result.data;
  }

  /**
   * Delete organization
   */
  async delete(id: string): Promise<void> {
    const response = await fetch(`${API_BASE}/organizations/${id}`, {
      method: 'DELETE',
      headers: getAuthHeaders(),
    });
    const result = await response.json();
    if (!result.success) throw new Error(result.error || 'Failed to delete organization');
  }

  /**
   * Get all members of an organization
   */
  async getMembers(organizationId: string): Promise<any[]> {
    const response = await fetch(`${API_BASE}/organizations/${organizationId}/members`, {
      headers: getAuthHeaders(),
    });
    const data = await response.json();
    return data.success ? data.data || [] : [];
  }

  /**
   * Add a member to an organization
   */
  async addMember(organizationId: string, userId: string, role: OrganizationRole = 'member'): Promise<any> {
    const response = await fetch(`${API_BASE}/organizations/${organizationId}/members`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify({ user_id: userId, role }),
    });
    const result = await response.json();
    if (!result.success) throw new Error(result.error || 'Failed to add member');
    return result.data;
  }

  /**
   * Remove a member from an organization
   */
  async removeMember(organizationId: string, userId: string): Promise<void> {
    await fetch(`${API_BASE}/organizations/${organizationId}/members/${userId}`, {
      method: 'DELETE',
      headers: getAuthHeaders(),
    });
  }

  /**
   * Update a member's role
   */
  async updateMemberRole(organizationId: string, userId: string, role: OrganizationRole): Promise<any> {
    const response = await fetch(`${API_BASE}/organizations/${organizationId}/members/${userId}`, {
      method: 'PATCH',
      headers: getAuthHeaders(),
      body: JSON.stringify({ role }),
    });
    const result = await response.json();
    return result.data;
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
    const response = await fetch(`${API_BASE}/auth/me`, {
      headers: getAuthHeaders(),
    });
    const data = await response.json();
    if (data.success && data.data?.organization_id) {
      return this.getById(data.data.organization_id);
    }
    return null;
  }

  /**
   * Get the organization for a specific user
   */
  async getUserOrganization(userId: string): Promise<Organization | null> {
    const response = await fetch(`${API_BASE}/users/${userId}`, {
      headers: getAuthHeaders(),
    });
    const data = await response.json();
    if (data.success && data.data?.organization_id) {
      return this.getById(data.data.organization_id);
    }
    return null;
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
      const response = await fetch(`${API_BASE}/users/${userId}/organizations`, {
        headers: getAuthHeaders(),
      });
      const data = await response.json();
      if (data.success && data.data) {
        return data.data;
      }
      return [];
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

    // Don't match on generic email domains
    if (!domain || GENERIC_EMAIL_DOMAINS.includes(domain)) {
      return [];
    }

    try {
      const response = await fetch(`${API_BASE}/organizations?domain=${encodeURIComponent(domain)}`, {
        headers: getAuthHeaders(),
      });
      const data = await response.json();
      if (data.success && data.data) {
        return data.data;
      }
      return [];
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
   * Updates the user's current organization context
   */
  async switchOrganization(userId: string, organizationId: string): Promise<boolean> {
    try {
      const response = await fetch(`${API_BASE}/users/${userId}/active-organization`, {
        method: 'PATCH',
        headers: getAuthHeaders(),
        body: JSON.stringify({ organization_id: organizationId }),
      });
      const data = await response.json();
      return data.success;
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
      const response = await fetch(`${API_BASE}/organizations/${organizationId}/join-requests`, {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify({ user_id: userId }),
      });
      const data = await response.json();
      return data.success;
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
      const response = await fetch(`${API_BASE}/organizations/${organizationId}/members/${userId}`, {
        method: 'DELETE',
        headers: getAuthHeaders(),
      });
      return response.ok;
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
      const response = await fetch(`${API_BASE}/organizations/${organizationId}/settings`, {
        method: 'PATCH',
        headers: getAuthHeaders(),
        body: JSON.stringify(settings),
      });
      const data = await response.json();
      if (data.success) {
        return data.data;
      }
      return null;
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
      const response = await fetch(`${API_BASE}/organizations/${organizationId}`, {
        method: 'PATCH',
        headers: getAuthHeaders(),
        body: JSON.stringify({ domain }),
      });
      const data = await response.json();
      if (data.success) {
        return data.data;
      }
      return null;
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
      const response = await fetch(`${API_BASE}/organizations/${organizationId}/stats`, {
        headers: getAuthHeaders(),
      });
      const data = await response.json();
      if (data.success) {
        return data.data;
      }
      return null;
    } catch (e) {
      console.error('Error fetching organization stats:', e);
      return null;
    }
  }
}

export const organizationsService = new OrganizationsService();
