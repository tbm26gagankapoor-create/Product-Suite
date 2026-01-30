import { supabaseAdmin } from '../lib/supabase.js';
import { NotFoundError, BadRequestError, ConflictError } from '../utils/errors.js';
import { authorizationService } from './authorization.service.js';
import type { Tenant, PaginationParams } from '../types/index.js';

interface TenantCreate {
  name: string;
  slug: string;
}

interface TenantUpdate {
  name?: string;
}

class TenantsService {
  async getAll(pagination?: PaginationParams): Promise<{ data: Tenant[]; total: number }> {
    let query = supabaseAdmin
      .from('tenants')
      .select('*', { count: 'exact' });

    if (pagination) {
      const from = (pagination.page - 1) * pagination.limit;
      const to = from + pagination.limit - 1;
      query = query.range(from, to);
    }

    query = query.order('created_at', { ascending: false });

    const { data, error, count } = await query;

    if (error) {
      throw new BadRequestError(error.message);
    }

    return { data: (data || []) as Tenant[], total: count || 0 };
  }

  async getById(tenantId: string): Promise<Tenant> {
    const { data, error } = await supabaseAdmin
      .from('tenants')
      .select('*')
      .eq('id', tenantId)
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        throw new NotFoundError('Tenant');
      }
      throw new BadRequestError(error.message);
    }

    return data as Tenant;
  }

  async getBySlug(slug: string): Promise<Tenant> {
    const { data, error } = await supabaseAdmin
      .from('tenants')
      .select('*')
      .eq('slug', slug)
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        throw new NotFoundError('Tenant');
      }
      throw new BadRequestError(error.message);
    }

    return data as Tenant;
  }

  async create(data: TenantCreate, creatorId: string, platformId: string = 'main'): Promise<Tenant> {
    // Check if slug is unique
    const { data: existing } = await supabaseAdmin
      .from('tenants')
      .select('id')
      .eq('slug', data.slug.toLowerCase())
      .single();

    if (existing) {
      throw new ConflictError('Tenant slug already exists');
    }

    const { data: tenant, error } = await supabaseAdmin
      .from('tenants')
      .insert({
        ...data,
        slug: data.slug.toLowerCase(),
      })
      .select()
      .single();

    if (error) {
      throw new BadRequestError(error.message);
    }

    // Set up authorization
    await authorizationService.linkTenantToPlatform(tenant.id, platformId);
    await authorizationService.addUserToTenant(creatorId, tenant.id, 'admin');

    return tenant as Tenant;
  }

  async update(tenantId: string, data: TenantUpdate): Promise<Tenant> {
    const { data: tenant, error } = await supabaseAdmin
      .from('tenants')
      .update(data)
      .eq('id', tenantId)
      .select()
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        throw new NotFoundError('Tenant');
      }
      throw new BadRequestError(error.message);
    }

    return tenant as Tenant;
  }

  async delete(tenantId: string): Promise<void> {
    const { error } = await supabaseAdmin
      .from('tenants')
      .delete()
      .eq('id', tenantId);

    if (error) {
      throw new BadRequestError(error.message);
    }
  }

  // Member management
  async addMember(
    tenantId: string,
    userId: string,
    role: 'admin' | 'member'
  ): Promise<void> {
    await authorizationService.addUserToTenant(userId, tenantId, role);

    await supabaseAdmin.from('tenant_members').upsert({
      tenant_id: tenantId,
      user_id: userId,
      role,
    });
  }

  async removeMember(
    tenantId: string,
    userId: string,
    role: 'admin' | 'member'
  ): Promise<void> {
    await authorizationService.removeUserFromTenant(userId, tenantId, role);

    await supabaseAdmin
      .from('tenant_members')
      .delete()
      .eq('tenant_id', tenantId)
      .eq('user_id', userId);
  }

  async getMembers(tenantId: string): Promise<any[]> {
    const { data, error } = await supabaseAdmin
      .from('tenant_members')
      .select('*, user:users(*)')
      .eq('tenant_id', tenantId);

    if (error) {
      throw new BadRequestError(error.message);
    }

    return data || [];
  }
}

export const tenantsService = new TenantsService();
