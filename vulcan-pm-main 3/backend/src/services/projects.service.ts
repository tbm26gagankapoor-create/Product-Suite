import { Collection, Document } from 'mongodb';
import { getTenantCollection, Collections } from '../db/mongo/tenant-router.js';
import { generateId } from '../db/mongo/client.js';

// Fallback tenant for users without a tenant (local dev / email-password auth)
const DEFAULT_TENANT = 'default';

function resolveTenantId(tenantId: string | null | undefined): string {
  return tenantId || DEFAULT_TENANT;
}

// --- Collection accessors (tenant-scoped) ---

function projects(tenantId: string): Collection<ProjectDoc> {
  return getTenantCollection<ProjectDoc>(resolveTenantId(tenantId), Collections.PROJECTS);
}

function columns(tenantId: string): Collection<any> {
  return getTenantCollection<any>(resolveTenantId(tenantId), Collections.COLUMNS);
}

function tasks(tenantId: string): Collection<any> {
  return getTenantCollection<any>(resolveTenantId(tenantId), Collections.TASKS);
}

function sprints(tenantId: string): Collection<any> {
  return getTenantCollection<any>(resolveTenantId(tenantId), Collections.SPRINTS);
}

function projectMembers(tenantId: string): Collection<any> {
  return getTenantCollection<any>(resolveTenantId(tenantId), Collections.PROJECT_MEMBERS);
}

function tags(tenantId: string): Collection<any> {
  return getTenantCollection<any>(resolveTenantId(tenantId), Collections.TAGS);
}

// --- Types ---

export interface ProjectGitSettings {
  enabled: boolean;
  provider_id: string;
  repository: {
    owner: string;
    name: string;
    full_name: string;
    url: string;
    default_branch: string;
  };
  docs_path: string;
  branch_strategy: 'direct' | 'pr';
  repo_mode?: 'shared' | 'dedicated' | 'code';
  linked_by_user_id: string;
  last_sync_at?: string;
}

export interface ProjectSettings {
  git?: ProjectGitSettings;
  [key: string]: any;
}

export interface ProjectDoc {
  id: string;
  name: string;
  description: string | null;
  code: string;
  status: string;
  progress_percentage: number;
  is_favorite: boolean;
  owner_id: string | null;
  settings: ProjectSettings;
  created_at: string;
  updated_at: string;
}

export type Project = ProjectDoc;

export interface ProjectWithStats extends Project {
  total_tasks: number;
  completed_tasks: number;
  active_sprints: number;
  team_size: number;
}

export interface CreateProjectInput {
  name: string;
  description?: string;
  code: string;
  owner_id?: string;
}

// --- Helpers ---

async function getProjectStats(tenantId: string, projectId: string) {
  const allTasks = await tasks(tenantId).find({ project_id: projectId }).toArray();
  const doneColumn = await columns(tenantId).findOne({ project_id: projectId, title: 'DONE' });
  const completedTasks = doneColumn
    ? allTasks.filter(t => t.column_id === doneColumn.id).length
    : 0;
  const activeSprints = await sprints(tenantId).countDocuments({ project_id: projectId, status: 'active' });
  const members = await projectMembers(tenantId).find({ project_id: projectId }).toArray();
  const teamSize = new Set(members.map(pm => pm.user_id)).size;

  return {
    total_tasks: allTasks.length,
    completed_tasks: completedTasks,
    active_sprints: activeSprints,
    team_size: teamSize,
  };
}

function now(): string {
  return new Date().toISOString();
}

// --- Service ---

export const projectsService = {
  async getAll(tenantId: string): Promise<ProjectWithStats[]> {
    const allProjects = await projects(tenantId).find({}).sort({ created_at: -1 }).toArray();
    const results: ProjectWithStats[] = [];
    for (const p of allProjects) {
      results.push({ ...p, ...(await getProjectStats(tenantId, p.id)) });
    }
    return results;
  },

  async getAllForUser(tenantId: string, userId: string, isAdmin: boolean): Promise<ProjectWithStats[]> {
    if (isAdmin) {
      return this.getAll(tenantId);
    }

    const allProjects = await projects(tenantId).find({}).sort({ created_at: -1 }).toArray();

    const membershipDocs = await projectMembers(tenantId).find({ user_id: userId }).toArray();
    const membershipProjectIds = new Set(membershipDocs.map(pm => pm.project_id));

    const accessible = allProjects.filter(p =>
      p.owner_id === userId || membershipProjectIds.has(p.id)
    );

    const results: ProjectWithStats[] = [];
    for (const p of accessible) {
      results.push({ ...p, ...(await getProjectStats(tenantId, p.id)) });
    }
    return results;
  },

  async userHasAccess(tenantId: string, projectId: string, userId: string, isAdmin: boolean): Promise<boolean> {
    if (isAdmin) return true;

    const project = await projects(tenantId).findOne({ id: projectId });
    if (!project) return false;
    if (project.owner_id === userId) return true;

    const membership = await projectMembers(tenantId).findOne({ project_id: projectId, user_id: userId });
    return Boolean(membership);
  },

  async getById(tenantId: string, id: string): Promise<ProjectWithStats | null> {
    const project = await projects(tenantId).findOne({ id });
    if (!project) return null;
    return { ...project, ...(await getProjectStats(tenantId, id)) };
  },

  async getByCode(tenantId: string, code: string): Promise<Project | null> {
    return projects(tenantId).findOne({ code: code.toUpperCase() });
  },

  async create(tenantId: string, input: CreateProjectInput): Promise<ProjectWithStats> {
    const existing = await this.getByCode(tenantId, input.code);
    if (existing) {
      throw new Error('UNIQUE constraint failed: code already exists');
    }

    const id = generateId();
    const project: ProjectDoc = {
      id,
      name: input.name,
      description: input.description || null,
      code: input.code.toUpperCase(),
      status: 'active',
      progress_percentage: 0,
      is_favorite: false,
      owner_id: input.owner_id || null,
      settings: {},
      created_at: now(),
      updated_at: now(),
    };

    await projects(tenantId).insertOne(project as any);

    // Create default columns
    const columnDefs = ['IDEA', 'TO DO', 'IN PROGRESS', 'TESTING', 'DONE'];
    const colors = ['gray', 'blue', 'yellow', 'purple', 'green'];
    for (let i = 0; i < columnDefs.length; i++) {
      await columns(tenantId).insertOne({
        id: generateId(),
        project_id: id,
        title: columnDefs[i],
        display_order: i,
        color: colors[i],
        is_default: i === 1,
        created_at: now(),
      });
    }

    return (await this.getById(tenantId, id))!;
  },

  async update(
    tenantId: string,
    id: string,
    input: Partial<CreateProjectInput & { status?: string; progress_percentage?: number; is_favorite?: boolean; settings?: ProjectSettings }>
  ): Promise<ProjectWithStats | null> {
    const existing = await projects(tenantId).findOne({ id });
    if (!existing) return null;

    // Merge settings deeply if provided
    const updateFields: Record<string, any> = { ...input, updated_at: now() };
    if (input.settings && existing.settings) {
      updateFields.settings = { ...existing.settings, ...input.settings };
    }

    await projects(tenantId).updateOne({ id }, { $set: updateFields });
    return this.getById(tenantId, id);
  },

  async delete(tenantId: string, id: string): Promise<boolean> {
    await tasks(tenantId).deleteMany({ project_id: id });
    await sprints(tenantId).deleteMany({ project_id: id });
    await columns(tenantId).deleteMany({ project_id: id });
    await tags(tenantId).deleteMany({ project_id: id });
    await projectMembers(tenantId).deleteMany({ project_id: id });
    const result = await projects(tenantId).deleteOne({ id });
    return result.deletedCount > 0;
  },

  async getMembers(tenantId: string, projectId: string) {
    const members = await projectMembers(tenantId).find({ project_id: projectId }).toArray();
    // Note: user details come from PostgreSQL — return member records with user_id for route to enrich
    return members.map(pm => ({
      id: pm.user_id,
      user_id: pm.user_id,
      project_role: pm.role,
      joined_at: pm.joined_at,
    }));
  },

  async addMember(tenantId: string, projectId: string, userId: string, role: string = 'member') {
    const existing = await projectMembers(tenantId).findOne({ project_id: projectId, user_id: userId });
    if (existing) {
      throw new Error('UNIQUE constraint failed: user is already a member');
    }

    const member = {
      id: generateId(),
      project_id: projectId,
      user_id: userId,
      role,
      joined_at: now(),
    };
    await projectMembers(tenantId).insertOne(member);
    return member;
  },

  async removeMember(tenantId: string, projectId: string, userId: string): Promise<boolean> {
    const result = await projectMembers(tenantId).deleteMany({ project_id: projectId, user_id: userId });
    return result.deletedCount > 0;
  },
};
