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

function enrichColumn(column: Column): ColumnWithCount {
  const taskCount = database.count('tasks', t => t.column_id === column.id);
  return { ...column, task_count: taskCount };
}

export const columnsService = {
  getAll(projectId?: string): ColumnWithCount[] {
    let columns = database.getAll<Column>('columns_status');
    if (projectId) {
      columns = columns.filter(c => c.project_id === projectId);
    }
    return columns
      .sort((a, b) => a.display_order - b.display_order)
      .map(enrichColumn);
  },

  getById(id: string): ColumnWithCount | null {
    const column = database.findById<Column>('columns_status', id);
    if (!column) return null;
    return enrichColumn(column);
  },

  create(input: CreateColumnInput): ColumnWithCount {
    const columns = database.findMany<Column>('columns_status', c => c.project_id === input.project_id);
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

    database.insert('columns_status', column);
    return enrichColumn(column);
  },

  update(id: string, input: Partial<CreateColumnInput & { display_order?: number }>): ColumnWithCount | null {
    const existing = database.findById<Column>('columns_status', id);
    if (!existing) return null;

    const updated = database.update<Column>('columns_status', id, input);
    if (!updated) return null;
    return enrichColumn(updated);
  },

  delete(id: string): boolean {
    // Unassign tasks from this column
    const tasks = database.findMany<any>('tasks', t => t.column_id === id);
    tasks.forEach(task => {
      database.update('tasks', task.id, { column_id: null });
    });
    return database.delete('columns_status', id);
  },

  reorder(projectId: string, columnIds: string[]): ColumnWithCount[] {
    columnIds.forEach((id, index) => {
      database.update<Column>('columns_status', id, { display_order: index });
    });
    return this.getAll(projectId);
  },
};
