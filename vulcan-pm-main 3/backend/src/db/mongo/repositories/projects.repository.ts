import { ObjectId, Collection } from 'mongodb';
import { getCollection, Collections, generateId } from '../client.js';

export interface Project {
  _id: ObjectId;
  id: string;
  tenant_id: string;
  owner_id: string;
  name: string;
  code: string;
  description: string | null;
  color: string;
  icon: string | null;
  status: 'active' | 'archived' | 'completed';
  visibility: 'private' | 'team' | 'public';
  settings: Record<string, any>;
  metadata: Record<string, any>;
  created_at: Date;
  updated_at: Date;
}

export interface CreateProjectInput {
  tenant_id: string;
  owner_id: string;
  name: string;
  code: string;
  description?: string;
  color?: string;
  icon?: string;
  visibility?: Project['visibility'];
}

export interface UpdateProjectInput {
  name?: string;
  description?: string;
  color?: string;
  icon?: string;
  status?: Project['status'];
  visibility?: Project['visibility'];
  settings?: Record<string, any>;
  metadata?: Record<string, any>;
}

function getProjectsCollection(): Collection<Project> {
  return getCollection<Project>(Collections.PROJECTS);
}

export const projectsRepository = {
  async findById(id: string): Promise<Project | null> {
    return getProjectsCollection().findOne({ id });
  },

  async findByCode(code: string): Promise<Project | null> {
    return getProjectsCollection().findOne({ code: code.toUpperCase() });
  },

  async findByTenant(tenantId: string): Promise<Project[]> {
    return getProjectsCollection()
      .find({ tenant_id: tenantId, status: { $ne: 'archived' } })
      .sort({ created_at: -1 })
      .toArray();
  },

  async findByOwner(ownerId: string): Promise<Project[]> {
    return getProjectsCollection()
      .find({ owner_id: ownerId, status: { $ne: 'archived' } })
      .sort({ created_at: -1 })
      .toArray();
  },

  async findAll(limit = 100, skip = 0): Promise<Project[]> {
    return getProjectsCollection()
      .find({ status: { $ne: 'archived' } })
      .sort({ created_at: -1 })
      .skip(skip)
      .limit(limit)
      .toArray();
  },

  async create(input: CreateProjectInput): Promise<Project> {
    const now = new Date();
    const id = generateId();
    const project: Project = {
      _id: new ObjectId(id),
      id,
      tenant_id: input.tenant_id,
      owner_id: input.owner_id,
      name: input.name,
      code: input.code.toUpperCase(),
      description: input.description || null,
      color: input.color || '#3B82F6',
      icon: input.icon || null,
      status: 'active',
      visibility: input.visibility || 'team',
      settings: {},
      metadata: {},
      created_at: now,
      updated_at: now,
    };

    await getProjectsCollection().insertOne(project);
    return project;
  },

  async update(id: string, input: UpdateProjectInput): Promise<Project | null> {
    const updateFields: Record<string, any> = { updated_at: new Date() };

    if (input.name !== undefined) updateFields.name = input.name;
    if (input.description !== undefined) updateFields.description = input.description;
    if (input.color !== undefined) updateFields.color = input.color;
    if (input.icon !== undefined) updateFields.icon = input.icon;
    if (input.status !== undefined) updateFields.status = input.status;
    if (input.visibility !== undefined) updateFields.visibility = input.visibility;
    if (input.settings !== undefined) updateFields.settings = input.settings;
    if (input.metadata !== undefined) updateFields.metadata = input.metadata;

    const result = await getProjectsCollection().findOneAndUpdate(
      { id },
      { $set: updateFields },
      { returnDocument: 'after' }
    );
    return result;
  },

  async delete(id: string): Promise<boolean> {
    const result = await getProjectsCollection().deleteOne({ id });
    return result.deletedCount > 0;
  },

  async archive(id: string): Promise<Project | null> {
    return this.update(id, { status: 'archived' });
  },

  async count(tenantId?: string): Promise<number> {
    const filter: Record<string, any> = { status: { $ne: 'archived' } };
    if (tenantId) filter.tenant_id = tenantId;
    return getProjectsCollection().countDocuments(filter);
  },
};

export default projectsRepository;
