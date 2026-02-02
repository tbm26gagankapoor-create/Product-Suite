import database, { generateUUID, now } from '../lib/database.js';

export interface Column {
  id: string;
  project_id: string | null;
  title: string;
  display_order: number;
  color: string | null;
  is_default: boolean;
  created_at: string;
}

export interface ColumnWithCount extends Column {
  task_count: number;
}

export interface CreateColumnInput {
  project_id: string;
  title: string;
  color?: string;
  is_default?: boolean;
}

async function enrichColumn(column: Column): Promise<ColumnWithCount> {
  const taskCount = await database.count('tasks', { column_id: column.id });
  return { ...column, task_count: taskCount };
}

export const columnsService = {
  async getAll(projectId?: string): Promise<ColumnWithCount[]> {
    let columns: Column[];
    if (projectId) {
      columns = await database.findMany<Column>('columns_status', { project_id: projectId });
    } else {
      columns = await database.getAll<Column>('columns_status');
    }

    const enrichedColumns = await Promise.all(columns.map(enrichColumn));
    return enrichedColumns.sort((a, b) => a.display_order - b.display_order);
  },

  async getById(id: string): Promise<ColumnWithCount | null> {
    const column = await database.findById<Column>('columns_status', id);
    if (!column) return null;
    return enrichColumn(column);
  },

  async create(input: CreateColumnInput): Promise<ColumnWithCount> {
    const columns = await database.findMany<Column>('columns_status', { project_id: input.project_id });
    const maxOrder = columns.reduce((max, c) => Math.max(max, c.display_order), -1);

    const column: Column = {
      id: generateUUID(),
      project_id: input.project_id,
      title: input.title,
      display_order: maxOrder + 1,
      color: input.color || null,
      is_default: input.is_default || false,
      created_at: now(),
    };

    await database.insert('columns_status', column);
    return enrichColumn(column);
  },

  async update(id: string, input: Partial<CreateColumnInput & { display_order?: number }>): Promise<ColumnWithCount | null> {
    const existing = await database.findById<Column>('columns_status', id);
    if (!existing) return null;

    const updated = await database.update<Column>('columns_status', id, input);
    if (!updated) return null;
    return enrichColumn(updated);
  },

  async delete(id: string): Promise<boolean> {
    // Unassign tasks from this column
    const tasks = await database.findMany<any>('tasks', { column_id: id });
    for (const task of tasks) {
      await database.update<any>('tasks', task.id, { column_id: null });
    }
    return database.delete('columns_status', id);
  },

  async reorder(projectId: string, columnIds: string[]): Promise<ColumnWithCount[]> {
    for (let index = 0; index < columnIds.length; index++) {
      await database.update<any>('columns_status', columnIds[index], { display_order: index });
    }
    return this.getAll(projectId);
  },
};
