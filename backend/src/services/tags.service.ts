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
  getAll(projectId?: string): Tag[] {
    let tags = database.getAll<Tag>('tags');
    if (projectId) {
      tags = tags.filter(t => t.project_id === projectId);
    }
    return tags.sort((a, b) => a.label.localeCompare(b.label));
  },

  getById(id: string): Tag | null {
    return database.findById<Tag>('tags', id) || null;
  },

  create(input: CreateTagInput): Tag {
    const existing = database.findOne<Tag>('tags', t => t.project_id === input.project_id && t.label === input.label);
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

    database.insert('tags', tag);
    return tag;
  },

  update(id: string, input: Partial<CreateTagInput>): Tag | null {
    const existing = database.findById<Tag>('tags', id);
    if (!existing) return null;

    return database.update<Tag>('tags', id, input) || null;
  },

  delete(id: string): boolean {
    database.deleteMany('task_tags', tt => tt.tag_id === id);
    return database.delete('tags', id);
  },
};
