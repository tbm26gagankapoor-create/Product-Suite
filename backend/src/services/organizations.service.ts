import database, { now, PaginationOptions, PaginatedResult, DEFAULT_PAGE_SIZE } from '../lib/database.js';

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
    // Use batch enrichment instead of N+1
    return this.enrichOrganizationsBatch(organizations);
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
    return this.enrichOrganizationsBatch(organizations);
  },

  async enrichOrganization(org: Organization): Promise<OrganizationWithStats> {
    const [memberCount, projectCount] = await Promise.all([
      database.count('organization_members', { organization_id: org.id }),
      database.count('projects', { organization_id: org.id }),
    ]);

    return {
      ...org,
      memberCount,
      projectCount,
    };
  },

  // Batch enrich organizations (fixes N+1)
  async enrichOrganizationsBatch(orgs: Organization[]): Promise<OrganizationWithStats[]> {
    if (orgs.length === 0) return [];

    const orgIds = orgs.map(o => o.id);

    // Batch count members and projects
    const [memberCountsMap, projectCountsMap] = await Promise.all([
      database.countByField('organization_members', 'organization_id', orgIds),
      database.countByField('projects', 'organization_id', orgIds),
    ]);

    return orgs.map(org => ({
      ...org,
      memberCount: memberCountsMap.get(org.id) || 0,
      projectCount: projectCountsMap.get(org.id) || 0,
    }));
  },

  async create(input: CreateOrganizationInput): Promise<OrganizationWithStats> {
    const baseSlug = input.slug || generateSlug(input.name);
    const slug = await ensureUniqueSlug(baseSlug);

    const organizationData = {
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

    // Use the returned document which has the correct MongoDB-generated _id
    const organization = await database.insert<Organization>('organizations', organizationData);

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
    // Clean up projects belonging to this organization
    const projects = await database.findMany<any>('projects', { organization_id: id });
    for (const project of projects) {
      // Delete project tasks and their dependencies
      const tasks = await database.findMany<any>('tasks', { project_id: project.id });
      for (const task of tasks) {
        await database.deleteMany('comments', { task_id: task.id });
        await database.deleteMany('subtasks', { task_id: task.id });
        await database.deleteMany('task_tags', { task_id: task.id });
        await database.deleteMany('attachments', { task_id: task.id });
        await database.deleteMany('task_links', { blocking_task_id: task.id });
        await database.deleteMany('task_links', { blocked_task_id: task.id });
      }
      await database.deleteMany('tasks', { project_id: project.id });
      await database.deleteMany('sprints', { project_id: project.id });
      await database.deleteMany('columns_status', { project_id: project.id });
      await database.deleteMany('tags', { project_id: project.id });
      await database.deleteMany('project_members', { project_id: project.id });
      await database.deleteMany('document_comments', { project_id: project.id });
      await database.delete('projects', project.id);
    }
    // Clean up teams belonging to this organization
    const teams = await database.findMany<any>('teams', { organization_id: id });
    for (const team of teams) {
      await database.deleteMany('team_members', { team_id: team.id });
      await database.deleteMany('team_projects', { team_id: team.id });
      await database.delete('teams', team.id);
    }
    // Delete all organization members
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

    const memberData = {
      organization_id: organizationId,
      user_id: userId,
      role,
      joined_at: now(),
    };

    // Use the returned document which has the correct MongoDB-generated _id
    const member = await database.insert<OrganizationMember>('organization_members', memberData);

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

    const requestData = {
      organization_id: organizationId,
      user_id: userId,
      status: 'pending',
      requested_at: now(),
      resolved_at: null,
      resolved_by: null,
    };

    // Use the returned document which has the correct MongoDB-generated _id
    return database.insert<OrganizationJoinRequest>('organization_join_requests', requestData);
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

  // Get organizations for a user (optimized with batch loading)
  async getUserOrganizations(userId: string): Promise<OrganizationWithStats[]> {
    const memberships = await database.findMany<OrganizationMember>('organization_members', { user_id: userId });
    if (memberships.length === 0) return [];

    const orgIds = memberships.map(m => m.organization_id);

    // Batch load all organizations at once
    const orgsMap = await database.findByIds<Organization>('organizations', orgIds);
    const orgs = [...orgsMap.values()];

    // Batch enrich
    return this.enrichOrganizationsBatch(orgs);
  },

  // Get user's organizations with membership details (optimized - single method instead of N+1)
  async getUserOrganizationsWithMembership(userId: string): Promise<Array<{
    organization: {
      id: string;
      name: string;
      slug: string;
      domain: string | null;
      logoUrl: string | null;
      ownerId: string | null;
      memberCount: number;
      projectCount: number;
    };
    role: string;
    joinedAt: string;
  }>> {
    const memberships = await database.findMany<OrganizationMember>('organization_members', { user_id: userId });
    if (memberships.length === 0) return [];

    const orgIds = memberships.map(m => m.organization_id);

    // Batch load all organizations at once
    const orgsMap = await database.findByIds<Organization>('organizations', orgIds);

    // Batch get stats
    const [memberCountsMap, projectCountsMap] = await Promise.all([
      database.countByField('organization_members', 'organization_id', orgIds),
      database.countByField('projects', 'organization_id', orgIds),
    ]);

    // Build membership map for quick lookup
    const membershipMap = new Map(memberships.map(m => [m.organization_id, m]));

    return orgIds
      .map(orgId => {
        const org = orgsMap.get(orgId);
        const membership = membershipMap.get(orgId);
        if (!org || !membership) return null;

        return {
          organization: {
            id: org.id,
            name: org.name,
            slug: org.slug,
            domain: org.domain,
            logoUrl: org.logo_url,
            ownerId: org.owner_id,
            memberCount: memberCountsMap.get(org.id) || 0,
            projectCount: projectCountsMap.get(org.id) || 0,
          },
          role: membership.role,
          joinedAt: membership.joined_at,
        };
      })
      .filter((item): item is NonNullable<typeof item> => item !== null);
  },

  // Get members with user data (optimized with batch loading)
  async getMembersWithUsers(organizationId: string): Promise<(OrganizationMember & { user: any })[]> {
    const members = await database.findMany<OrganizationMember>('organization_members', { organization_id: organizationId });
    if (members.length === 0) return [];

    // Batch load all users at once
    const userIds = members.map(m => m.user_id);
    const usersMap = await database.findByIds<any>('users', userIds);

    return members.map(member => {
      const u = usersMap.get(member.user_id);
      return {
        ...member,
        user: u ? {
          id: u.id,
          name: u.name,
          email: u.email,
          avatar_url: u.avatar_url,
          designation: u.designation,
          organization_id: u.organization_id,
          location: u.location,
          bio: u.bio,
          website: u.website,
          job_title: u.job_title,
          social_links: u.social_links,
          status: u.status,
          created_at: u.created_at,
          last_active_at: u.last_active_at,
        } : null,
      };
    });
  },

  // Get statistics (optimized)
  async getStats(organizationId: string): Promise<{ memberCount: number; projectCount: number; taskCount: number; adminCount: number } | null> {
    const org = await database.findById<Organization>('organizations', organizationId);
    if (!org) return null;

    // Run all count queries in parallel
    const [memberCount, members, projectCount, projects] = await Promise.all([
      database.count('organization_members', { organization_id: organizationId }),
      database.findMany<OrganizationMember>('organization_members', { organization_id: organizationId }),
      database.count('projects', { organization_id: organizationId }),
      database.findMany<any>('projects', { organization_id: organizationId }),
    ]);

    const adminCount = members.filter(m => m.role === 'admin' || m.role === 'owner').length;

    // Count tasks efficiently using aggregation instead of N queries
    let taskCount = 0;
    if (projects.length > 0) {
      const projectIds = projects.map(p => p.id);
      const taskCounts = await database.countByField('tasks', 'project_id', projectIds);
      taskCount = [...taskCounts.values()].reduce((sum, count) => sum + count, 0);
    }

    return { memberCount, projectCount, taskCount, adminCount };
  },
};
