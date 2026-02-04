import database, { generateUUID, now } from '../lib/database.js';

export interface Organization {
  id: string;
  name: string;
  slug: string;
  domain: string | null;
  logo_url: string | null;
  owner_id: string | null;
  settings: {
    allowDomainJoin: boolean;
    requireApproval: boolean;
    defaultRole: string;
  };
  created_at: string;
  updated_at: string;
}

export interface OrganizationMember {
  id: string;
  organization_id: string;
  user_id: string;
  role: 'owner' | 'admin' | 'member' | 'viewer';
  joined_at: string;
}

export interface OrganizationJoinRequest {
  id: string;
  organization_id: string;
  user_id: string;
  status: 'pending' | 'approved' | 'rejected';
  requested_at: string;
  resolved_at: string | null;
  resolved_by: string | null;
}

export interface CreateOrganizationInput {
  name: string;
  slug?: string;
  domain?: string;
  logo_url?: string;
  owner_id?: string;
}

export interface OrganizationWithStats extends Organization {
  memberCount: number;
  projectCount: number;
}

// Helper to generate slug from name
function generateSlug(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
    .substring(0, 50);
}

// Helper to ensure unique slug
async function ensureUniqueSlug(baseSlug: string): Promise<string> {
  let slug = baseSlug;
  let counter = 1;

  while (await database.findOne<Organization>('organizations', { slug })) {
    slug = `${baseSlug}-${counter}`;
    counter++;
  }

  return slug;
}

export const organizationsService = {
  async getAll(): Promise<OrganizationWithStats[]> {
    const organizations = await database.getAll<Organization>('organizations');
    const enrichedOrgs = await Promise.all(organizations.map(org => this.enrichOrganization(org)));
    return enrichedOrgs;
  },

  async getById(id: string): Promise<OrganizationWithStats | null> {
    const organization = await database.findById<Organization>('organizations', id);
    if (!organization) return null;
    return this.enrichOrganization(organization);
  },

  async getBySlug(slug: string): Promise<OrganizationWithStats | null> {
    const organization = await database.findOne<Organization>('organizations', { slug });
    if (!organization) return null;
    return this.enrichOrganization(organization);
  },

  async getByDomain(domain: string): Promise<OrganizationWithStats[]> {
    const organizations = await database.findMany<Organization>('organizations', { domain });
    const enrichedOrgs = await Promise.all(organizations.map(org => this.enrichOrganization(org)));
    return enrichedOrgs;
  },

  async enrichOrganization(org: Organization): Promise<OrganizationWithStats> {
    const memberCount = await database.count('organization_members', { organization_id: org.id });
    const projectCount = await database.count('projects', { organization_id: org.id });

    return {
      ...org,
      memberCount,
      projectCount,
    };
  },

  async create(input: CreateOrganizationInput): Promise<OrganizationWithStats> {
    const baseSlug = input.slug || generateSlug(input.name);
    const slug = await ensureUniqueSlug(baseSlug);

    const organization: Organization = {
      id: generateUUID(),
      name: input.name,
      slug,
      domain: input.domain || null,
      logo_url: input.logo_url || null,
      owner_id: input.owner_id || null,
      settings: {
        allowDomainJoin: true,
        requireApproval: true,
        defaultRole: 'member',
      },
      created_at: now(),
      updated_at: now(),
    };

    await database.insert('organizations', organization);

    // If owner_id is provided, add them as an admin member
    if (input.owner_id) {
      await this.addMember(organization.id, input.owner_id, 'admin');

      // Update user's organization_id
      await database.update('users', input.owner_id, {
        organization_id: organization.id,
        updated_at: now(),
      });
    }

    return this.enrichOrganization(organization);
  },

  async update(id: string, input: Partial<CreateOrganizationInput> & { settings?: Organization['settings'] }): Promise<OrganizationWithStats | null> {
    const existing = await database.findById<Organization>('organizations', id);
    if (!existing) return null;

    const updates: Partial<Organization> = {
      updated_at: now(),
    };

    if (input.name !== undefined) updates.name = input.name;
    if (input.domain !== undefined) updates.domain = input.domain;
    if (input.logo_url !== undefined) updates.logo_url = input.logo_url;
    if (input.settings !== undefined) updates.settings = input.settings;

    // Handle slug update carefully
    if (input.slug !== undefined && input.slug !== existing.slug) {
      updates.slug = await ensureUniqueSlug(input.slug);
    }

    const updated = await database.update<Organization>('organizations', id, updates);
    if (!updated) return null;

    return this.enrichOrganization(updated);
  },

  async delete(id: string): Promise<boolean> {
    // Delete all organization members first
    await database.deleteMany('organization_members', { organization_id: id });
    // Delete all join requests
    await database.deleteMany('organization_join_requests', { organization_id: id });
    // Delete all invites
    await database.deleteMany('organization_invites', { organization_id: id });
    // Delete the organization
    return database.delete('organizations', id);
  },

  // Member management
  async getMembers(organizationId: string): Promise<OrganizationMember[]> {
    return database.findMany<OrganizationMember>('organization_members', { organization_id: organizationId });
  },

  async getMember(organizationId: string, userId: string): Promise<OrganizationMember | null> {
    return database.findOne<OrganizationMember>('organization_members', {
      organization_id: organizationId,
      user_id: userId
    });
  },

  async addMember(organizationId: string, userId: string, role: OrganizationMember['role'] = 'member'): Promise<OrganizationMember | null> {
    const org = await database.findById<Organization>('organizations', organizationId);
    if (!org) return null;

    // Check if already a member
    const existing = await this.getMember(organizationId, userId);
    if (existing) return existing;

    const member: OrganizationMember = {
      id: generateUUID(),
      organization_id: organizationId,
      user_id: userId,
      role,
      joined_at: now(),
    };

    await database.insert('organization_members', member);

    // Only set user's organization_id if they don't have one (first org they join)
    // For multi-org support, users can switch their active org from the UI
    const user = await database.findById<any>('users', userId);
    if (user && !user.organization_id) {
      await database.update('users', userId, {
        organization_id: organizationId,
        updated_at: now(),
      });
    }

    return member;
  },

  async updateMemberRole(organizationId: string, userId: string, role: OrganizationMember['role']): Promise<OrganizationMember | null> {
    const member = await this.getMember(organizationId, userId);
    if (!member) return null;

    return database.update<OrganizationMember>('organization_members', member.id, { role });
  },

  async removeMember(organizationId: string, userId: string): Promise<boolean> {
    const deleted = await database.deleteMany('organization_members', {
      organization_id: organizationId,
      user_id: userId
    });

    if (deleted > 0) {
      // Clear user's organization_id
      await database.update('users', userId, {
        organization_id: null,
        updated_at: now(),
      });
    }

    return deleted > 0;
  },

  // Join request management
  async createJoinRequest(organizationId: string, userId: string): Promise<OrganizationJoinRequest | null> {
    const org = await database.findById<Organization>('organizations', organizationId);
    if (!org) return null;

    // Check if already a member
    const existingMember = await this.getMember(organizationId, userId);
    if (existingMember) return null;

    // Check for existing pending request
    const existingRequest = await database.findOne<OrganizationJoinRequest>('organization_join_requests', {
      organization_id: organizationId,
      user_id: userId,
      status: 'pending'
    });
    if (existingRequest) return existingRequest;

    const request: OrganizationJoinRequest = {
      id: generateUUID(),
      organization_id: organizationId,
      user_id: userId,
      status: 'pending',
      requested_at: now(),
      resolved_at: null,
      resolved_by: null,
    };

    await database.insert('organization_join_requests', request);
    return request;
  },

  async getJoinRequests(organizationId: string, status?: OrganizationJoinRequest['status']): Promise<OrganizationJoinRequest[]> {
    if (status) {
      return database.findMany<OrganizationJoinRequest>('organization_join_requests', {
        organization_id: organizationId,
        status
      });
    }
    return database.findMany<OrganizationJoinRequest>('organization_join_requests', {
      organization_id: organizationId
    });
  },

  async resolveJoinRequest(requestId: string, approved: boolean, resolvedBy: string): Promise<OrganizationJoinRequest | null> {
    const request = await database.findById<OrganizationJoinRequest>('organization_join_requests', requestId);
    if (!request || request.status !== 'pending') return null;

    const updated = await database.update<OrganizationJoinRequest>('organization_join_requests', requestId, {
      status: approved ? 'approved' : 'rejected',
      resolved_at: now(),
      resolved_by: resolvedBy,
    });

    // If approved, add as member
    if (approved && updated) {
      const org = await database.findById<Organization>('organizations', request.organization_id);
      const defaultRole = org?.settings?.defaultRole as OrganizationMember['role'] || 'member';
      await this.addMember(request.organization_id, request.user_id, defaultRole);
    }

    return updated || null;
  },

  // Get organizations for a user
  async getUserOrganizations(userId: string): Promise<OrganizationWithStats[]> {
    const memberships = await database.findMany<OrganizationMember>('organization_members', { user_id: userId });
    const orgIds = memberships.map(m => m.organization_id);

    const orgs = await Promise.all(orgIds.map(id => this.getById(id)));
    return orgs.filter((org): org is OrganizationWithStats => org !== null);
  },

  // Get statistics
  async getStats(organizationId: string): Promise<{ memberCount: number; projectCount: number; taskCount: number; adminCount: number } | null> {
    const org = await database.findById<Organization>('organizations', organizationId);
    if (!org) return null;

    const memberCount = await database.count('organization_members', { organization_id: organizationId });
    const members = await database.findMany<OrganizationMember>('organization_members', { organization_id: organizationId });
    const adminCount = members.filter(m => m.role === 'admin' || m.role === 'owner').length;
    const projectCount = await database.count('projects', { organization_id: organizationId });

    // Task count needs to be calculated via projects
    const projects = await database.findMany<any>('projects', { organization_id: organizationId });
    let taskCount = 0;
    for (const project of projects) {
      const count = await database.count('tasks', { project_id: project.id });
      taskCount += count;
    }

    return { memberCount, projectCount, taskCount, adminCount };
  },
};
