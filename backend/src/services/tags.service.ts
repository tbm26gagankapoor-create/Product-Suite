import database, { generateUUID, now } from '../lib/database.js';

export interface Tag {
  id: string;
  project_id: string | null;
  label: string;
  color: 'purple' | 'blue' | 'yellow' | 'green' | 'red' | 'gray';
  created_at: string;
}

export interface CreateTagInput {
  project_id: string;
  label: string;
  color: 'purple' | 'blue' | 'yellow' | 'green' | 'red' | 'gray';
}

export const tagsService = {
  async getAll(projectId?: string): Promise<Tag[]> {
    let tags: Tag[];
    if (projectId) {
      tags = await database.findMany<Tag>('tags', { project_id: projectId });
    } else {
      tags = await database.getAll<Tag>('tags');
    }
    return tags.sort((a, b) => a.label.localeCompare(b.label));
  },

  async getById(id: string): Promise<Tag | null> {
    return database.findById<Tag>('tags', id);
  },

  async create(input: CreateTagInput): Promise<Tag> {
    const existing = await database.findOne<Tag>('tags', {
      project_id: input.project_id,
      label: input.label
    });
    if (existing) {
      throw new Error('UNIQUE constraint failed: tag already exists');
    }

    const tag: Tag = {
      id: generateUUID(),
      project_id: input.project_id,
      label: input.label,
      color: input.color,
      created_at: now(),
    };

    await database.insert('tags', tag);
    return tag;
  },

  async update(id: string, input: Partial<CreateTagInput>): Promise<Tag | null> {
    const existing = await database.findById<Tag>('tags', id);
    if (!existing) return null;

    return database.update<Tag>('tags', id, { ...input, updated_at: now() });
  },

  async delete(id: string): Promise<boolean> {
    await database.deleteMany('task_tags', { tag_id: id });
    return database.delete('tags', id);
  },
};
