import { ObjectId, Collection } from 'mongodb';
import { getCollection, Collections, generateId } from '../client.js';

export interface Task {
  _id: ObjectId;
  id: string;
  project_id: string;
  column_id: string | null;
  sprint_id: string | null;
  assignee_id: string | null;
  reporter_id: string | null;
  task_number: number;
  task_key: string;
  title: string;
  description: string | null;
  type: 'epic' | 'feature' | 'task' | 'bug' | 'story';
  priority: 'highest' | 'high' | 'medium' | 'low' | 'lowest';
  status: string;
  points: number | null;
  estimate: string | null;
  time_spent: string | null;
  start_date: Date | null;
  due_date: Date | null;
  completed_at: Date | null;
  impact_score: number | null;
  product_theme: string | null;
  image_url: string | null;
  parent_epic_id: string | null;
  tag_ids: string[];
  metadata: Record<string, any>;
  created_at: Date;
  updated_at: Date;
}

export interface CreateTaskInput {
  project_id: string;
  column_id?: string;
  sprint_id?: string;
  assignee_id?: string;
  reporter_id?: string;
  title: string;
  description?: string;
  type?: Task['type'];
  priority?: Task['priority'];
  points?: number;
  estimate?: string;
  start_date?: Date;
  due_date?: Date;
  impact_score?: number;
  product_theme?: string;
  image_url?: string;
  parent_epic_id?: string;
  tag_ids?: string[];
}

export interface UpdateTaskInput {
  column_id?: string | null;
  sprint_id?: string | null;
  assignee_id?: string | null;
  title?: string;
  description?: string | null;
  type?: Task['type'];
  priority?: Task['priority'];
  status?: string;
  points?: number | null;
  estimate?: string | null;
  time_spent?: string | null;
  start_date?: Date | null;
  due_date?: Date | null;
  completed_at?: Date | null;
  impact_score?: number | null;
  product_theme?: string | null;
  image_url?: string | null;
  parent_epic_id?: string | null;
  tag_ids?: string[];
  metadata?: Record<string, any>;
}

export interface TaskFilters {
  project_id?: string;
  sprint_id?: string;
  column_id?: string;
  assignee_id?: string;
  reporter_id?: string;
  type?: Task['type'];
  priority?: Task['priority'];
  status?: string;
  parent_epic_id?: string;
  search?: string;
}

function getTasksCollection(): Collection<Task> {
  return getCollection<Task>(Collections.TASKS);
}

export const tasksRepository = {
  async findById(id: string): Promise<Task | null> {
    return getTasksCollection().findOne({ id });
  },

  async findByTaskKey(taskKey: string): Promise<Task | null> {
    return getTasksCollection().findOne({ task_key: taskKey.toUpperCase() });
  },

  async findByProject(projectId: string): Promise<Task[]> {
    return getTasksCollection()
      .find({ project_id: projectId })
      .sort({ created_at: -1 })
      .toArray();
  },

  async findBySprint(sprintId: string): Promise<Task[]> {
    return getTasksCollection()
      .find({ sprint_id: sprintId })
      .sort({ priority: 1, created_at: -1 })
      .toArray();
  },

  async findByAssignee(assigneeId: string): Promise<Task[]> {
    return getTasksCollection()
      .find({ assignee_id: assigneeId })
      .sort({ due_date: 1, priority: 1 })
      .toArray();
  },

  async find(filters: TaskFilters, limit = 100, skip = 0): Promise<Task[]> {
    const query: Record<string, any> = {};

    if (filters.project_id) query.project_id = filters.project_id;
    if (filters.sprint_id) query.sprint_id = filters.sprint_id;
    if (filters.column_id) query.column_id = filters.column_id;
    if (filters.assignee_id) query.assignee_id = filters.assignee_id;
    if (filters.reporter_id) query.reporter_id = filters.reporter_id;
    if (filters.type) query.type = filters.type;
    if (filters.priority) query.priority = filters.priority;
    if (filters.status) query.status = filters.status;
    if (filters.parent_epic_id) query.parent_epic_id = filters.parent_epic_id;
    if (filters.search) {
      query.$or = [
        { title: { $regex: filters.search, $options: 'i' } },
        { description: { $regex: filters.search, $options: 'i' } },
        { task_key: { $regex: filters.search, $options: 'i' } },
      ];
    }

    return getTasksCollection()
      .find(query)
      .sort({ created_at: -1 })
      .skip(skip)
      .limit(limit)
      .toArray();
  },

  async create(input: CreateTaskInput, projectCode: string): Promise<Task> {
    const now = new Date();
    const id = generateId();

    // Get next task number for project
    const lastTask = await getTasksCollection()
      .find({ project_id: input.project_id })
      .sort({ task_number: -1 })
      .limit(1)
      .toArray();
    const taskNumber = lastTask.length > 0 ? lastTask[0].task_number + 1 : 1;

    const task: Task = {
      _id: new ObjectId(id),
      id,
      project_id: input.project_id,
      column_id: input.column_id || null,
      sprint_id: input.sprint_id || null,
      assignee_id: input.assignee_id || null,
      reporter_id: input.reporter_id || null,
      task_number: taskNumber,
      task_key: `${projectCode}-${taskNumber}`,
      title: input.title,
      description: input.description || null,
      type: input.type || 'task',
      priority: input.priority || 'medium',
      status: 'todo',
      points: input.points || null,
      estimate: input.estimate || null,
      time_spent: null,
      start_date: input.start_date || null,
      due_date: input.due_date || null,
      completed_at: null,
      impact_score: input.impact_score || null,
      product_theme: input.product_theme || null,
      image_url: input.image_url || null,
      parent_epic_id: input.parent_epic_id || null,
      tag_ids: input.tag_ids || [],
      metadata: {},
      created_at: now,
      updated_at: now,
    };

    await getTasksCollection().insertOne(task);
    return task;
  },

  async update(id: string, input: UpdateTaskInput): Promise<Task | null> {
    const updateFields: Record<string, any> = { updated_at: new Date() };

    const fields = [
      'column_id', 'sprint_id', 'assignee_id', 'title', 'description',
      'type', 'priority', 'status', 'points', 'estimate', 'time_spent',
      'start_date', 'due_date', 'completed_at', 'impact_score',
      'product_theme', 'image_url', 'parent_epic_id', 'tag_ids', 'metadata'
    ];

    for (const field of fields) {
      if ((input as any)[field] !== undefined) {
        updateFields[field] = (input as any)[field];
      }
    }

    const result = await getTasksCollection().findOneAndUpdate(
      { id },
      { $set: updateFields },
      { returnDocument: 'after' }
    );
    return result;
  },

  async delete(id: string): Promise<boolean> {
    const result = await getTasksCollection().deleteOne({ id });
    return result.deletedCount > 0;
  },

  async moveToColumn(id: string, columnId: string): Promise<Task | null> {
    return this.update(id, { column_id: columnId });
  },

  async assignToSprint(id: string, sprintId: string | null): Promise<Task | null> {
    return this.update(id, { sprint_id: sprintId });
  },

  async complete(id: string): Promise<Task | null> {
    return this.update(id, {
      status: 'done',
      completed_at: new Date(),
    });
  },

  async count(filters?: TaskFilters): Promise<number> {
    const query: Record<string, any> = {};
    if (filters?.project_id) query.project_id = filters.project_id;
    if (filters?.sprint_id) query.sprint_id = filters.sprint_id;
    if (filters?.assignee_id) query.assignee_id = filters.assignee_id;
    return getTasksCollection().countDocuments(query);
  },

  async getBacklog(projectId: string): Promise<Task[]> {
    return getTasksCollection()
      .find({ project_id: projectId, sprint_id: null })
      .sort({ priority: 1, created_at: -1 })
      .toArray();
  },
};

export default tasksRepository;
