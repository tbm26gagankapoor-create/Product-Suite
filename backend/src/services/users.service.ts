import database, { generateUUID, now, PaginationOptions, PaginatedResult, DEFAULT_PAGE_SIZE, MAX_PAGE_SIZE } from '../lib/database.js';
import bcrypt from 'bcryptjs';

export interface User {
  id: string;
  name: string;
  email: string;
  password_hash?: string;
  avatar_url: string | null;
  designation: string | null;
  organization_id?: string;
  location?: string;
  bio?: string;
  website?: string;
  job_title?: string;
  social_links?: Record<string, string>;
  status?: string;
  last_active_at?: string;
  created_at: string;
  updated_at: string;
}

export interface CreateUserInput {
  name: string;
  email: string;
  password: string;
  avatar_url?: string;
  designation?: string;
  location?: string;
  bio?: string;
  website?: string;
  job_title?: string;
  organization_id?: string;
  status?: string;
}

export const usersService = {
  async getAll(): Promise<Omit<User, 'password_hash'>[]> {
    const users = await database.getAll<User>('users');
    return users.map(({ password_hash, ...user }) => user);
  },

  async getById(id: string): Promise<Omit<User, 'password_hash'> | null> {
    const user = await database.findById<User>('users', id);
    if (!user) return null;
    const { password_hash, ...rest } = user;
    return rest;
  },

  async getByEmail(email: string): Promise<User | null> {
    return database.findOne<User>('users', { email: email.toLowerCase() });
  },

  async create(input: CreateUserInput): Promise<Omit<User, 'password_hash'>> {
    const existing = await this.getByEmail(input.email);
    if (existing) {
      throw new Error('UNIQUE constraint failed: email already exists');
    }

    const user: User = {
      id: generateUUID(),
      name: input.name,
      email: input.email.toLowerCase(),
      password_hash: await bcrypt.hash(input.password, 10),
      avatar_url: input.avatar_url || null,
      designation: input.designation || null,
      organization_id: input.organization_id,
      location: input.location,
      bio: input.bio,
      website: input.website,
      job_title: input.job_title,
      status: input.status || 'active',
      created_at: now(),
      updated_at: now(),
    };

    await database.insert('users', user);
    const { password_hash, ...rest } = user;
    return rest;
  },

  async update(id: string, input: Partial<Omit<CreateUserInput, 'password'>>): Promise<Omit<User, 'password_hash'> | null> {
    const existing = await database.findById<User>('users', id);
    if (!existing) return null;

    const updated = await database.update<User>('users', id, {
      ...input,
      updated_at: now(),
    });

    if (!updated) return null;
    const { password_hash, ...rest } = updated;
    return rest;
  },

  async delete(id: string): Promise<boolean> {
    // Cascade: clean up all user-related data
    await database.deleteMany('organization_members', { user_id: id });
    await database.deleteMany('project_members', { user_id: id });
    await database.deleteMany('team_members', { user_id: id });
    await database.deleteMany('comments', { user_id: id });
    await database.deleteMany('notifications', { user_id: id });
    return database.delete('users', id);
  },

  async validatePassword(user: User, password: string): Promise<boolean> {
    return bcrypt.compare(password, user.password_hash || '');
  },

  // Get users by team membership (optimized with batch loading)
  async getByTeamId(teamId: string): Promise<Omit<User, 'password_hash'>[]> {
    const teamMembers = await database.findMany<any>('team_members', { team_id: teamId });
    if (teamMembers.length === 0) return [];

    const userIds = teamMembers.map(tm => tm.user_id);
    // Batch load all users at once instead of N queries
    const usersMap = await database.findByIds<User>('users', userIds);

    return [...usersMap.values()].map(({ password_hash, ...user }) => user);
  },

  // Get users who share organization membership with the current user (optimized)
  async getUsersByOrganizationMembership(
    userId: string,
    pagination?: { page?: number; limit?: number }
  ): Promise<PaginatedResult<Omit<User, 'password_hash'>>> {
    const page = Math.max(1, pagination?.page || 1);
    const limit = Math.min(MAX_PAGE_SIZE, Math.max(1, pagination?.limit || DEFAULT_PAGE_SIZE));

    // Get user's organizations
    const userMemberships = await database.findMany<any>('organization_members', { user_id: userId });
    const orgIds = userMemberships.map(m => m.organization_id);

    if (orgIds.length === 0) {
      return {
        data: [],
        pagination: { page, limit, total: 0, totalPages: 0, hasMore: false }
      };
    }

    // Get all member user IDs from those organizations in a single query
    const orgMembers = await database.findMany<any>('organization_members', {
      organization_id: { $in: orgIds }
    } as any);

    const memberUserIds = [...new Set(orgMembers.map(m => m.user_id))];

    if (memberUserIds.length === 0) {
      return {
        data: [],
        pagination: { page, limit, total: 0, totalPages: 0, hasMore: false }
      };
    }

    // Query users directly with $in filter and pagination
    const result = await database.findManyPaginated<User>('users', {
      id: { $in: memberUserIds }
    }, {
      page,
      limit,
      sortBy: 'name',
      sortOrder: 'asc',
    });

    return {
      data: result.data.map(({ password_hash, ...user }) => user),
      pagination: result.pagination,
    };
  },
};
