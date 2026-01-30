
import { supabase } from '../lib/supabase';
import { User, UserUpdate, PaginationParams } from '../types/database.types';
import { organizationsService } from './organizations.service';

export class UsersService {
  // Get all users with optional search and pagination (filtered by organization)
  async getAll(params?: { search?: string; organizationId?: string } & PaginationParams): Promise<{ data: User[]; count: number }> {
    let query = supabase.from('users').select('*', { count: 'exact' });

    // Filter by organization if provided
    if (params?.organizationId) {
      query = query.eq('organization_id', params.organizationId);
    }

    if (params?.search) {
      query = query.or(`name.ilike.%${params.search}%,email.ilike.%${params.search}%`);
    }

    if (params?.page && params?.limit) {
      const from = (params.page - 1) * params.limit;
      const to = from + params.limit - 1;
      query = query.range(from, to);
    }

    // Default order
    query = query.order('name', { ascending: true });

    const { data, error, count } = await query;

    if (error) {
      console.error('Error fetching users:', error);
      throw error;
    }

    return { data: data || [], count: count || 0 };
  }

  // Get all users for the current user's organization
  async getAllForCurrentOrg(params?: { search?: string } & PaginationParams): Promise<{ data: User[]; count: number }> {
    const org = await organizationsService.getCurrentOrganization();
    if (!org) {
      return { data: [], count: 0 };
    }
    return this.getAll({ ...params, organizationId: org.id });
  }

  // Get organization members via organization_members table
  async getOrganizationMembers(organizationId: string): Promise<User[]> {
    const { data, error } = await supabase
      .from('organization_members')
      .select('user:users(*)')
      .eq('organization_id', organizationId);

    if (error) throw error;
    return (data || []).map((d: any) => d.user).filter(Boolean) as User[];
  }

  // Get user by ID
  async getById(id: string): Promise<User | null> {
    const { data, error } = await supabase
      .from('users')
      .select('*')
      .eq('id', id)
      .single();
    
    if (error) return null;
    return data;
  }

  // Get user by auth_user_id
  async getByAuthId(authUserId: string): Promise<User | null> {
    const { data, error } = await supabase
      .from('users')
      .select('*')
      .eq('auth_user_id', authUserId)
      .single();
    
    if (error) return null;
    return data;
  }

  // Get current user's profile
  async getCurrentProfile(): Promise<User | null> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return null;
    return this.getByAuthId(user.id);
  }

  // Update user profile
  async update(id: string, data: UserUpdate): Promise<User> {
    const { data: updated, error } = await supabase
      .from('users')
      .update(data)
      .eq('id', id)
      .select()
      .single();
    
    if (error) throw error;
    return updated;
  }

  // Update current user's profile
  async updateCurrentProfile(data: UserUpdate): Promise<User> {
    const profile = await this.getCurrentProfile();
    if (!profile) throw new Error('No active user profile found');
    return this.update(profile.id, data);
  }

  // Check if user is admin
  async isAdmin(userId: string): Promise<boolean> {
    const user = await this.getById(userId);
    return !!user?.is_admin;
  }

  // Get users by IDs (batch fetch)
  async getByIds(ids: string[]): Promise<User[]> {
    if (ids.length === 0) return [];
    const { data, error } = await supabase
      .from('users')
      .select('*')
      .in('id', ids);
    
    if (error) throw error;
    return data || [];
  }

  // Search users by name/email
  async search(query: string, limit: number = 10): Promise<User[]> {
    if (!query) return [];
    const { data, error } = await supabase
      .from('users')
      .select('*')
      .or(`name.ilike.%${query}%,email.ilike.%${query}%`)
      .limit(limit);
    
    if (error) throw error;
    return data || [];
  }
}

export const usersService = new UsersService();
