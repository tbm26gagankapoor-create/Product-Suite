import { ObjectId, Collection } from 'mongodb';
import { getCollection, Collections, generateId } from '../client.js';

export interface Sprint {
  _id: ObjectId;
  id: string;
  project_id: string;
  name: string;
  goal: string | null;
  start_date: Date;
  end_date: Date;
  status: 'planned' | 'active' | 'completed';
  velocity: number | null;
  metadata: Record<string, any>;
  created_at: Date;
  updated_at: Date;
}

export interface CreateSprintInput {
  project_id: string;
  name: string;
  goal?: string;
  start_date: Date;
  end_date: Date;
}

export interface UpdateSprintInput {
  name?: string;
  goal?: string | null;
  start_date?: Date;
  end_date?: Date;
  status?: Sprint['status'];
  velocity?: number | null;
  metadata?: Record<string, any>;
}

function getSprintsCollection(): Collection<Sprint> {
  return getCollection<Sprint>(Collections.SPRINTS);
}

export const sprintsRepository = {
  async findById(id: string): Promise<Sprint | null> {
    return getSprintsCollection().findOne({ id });
  },

  async findByProject(projectId: string): Promise<Sprint[]> {
    return getSprintsCollection()
      .find({ project_id: projectId })
      .sort({ start_date: -1 })
      .toArray();
  },

  async findActive(projectId: string): Promise<Sprint | null> {
    return getSprintsCollection().findOne({
      project_id: projectId,
      status: 'active',
    });
  },

  async findPlanned(projectId: string): Promise<Sprint[]> {
    return getSprintsCollection()
      .find({ project_id: projectId, status: 'planned' })
      .sort({ start_date: 1 })
      .toArray();
  },

  async create(input: CreateSprintInput): Promise<Sprint> {
    const now = new Date();
    const id = generateId();

    const sprint: Sprint = {
      _id: new ObjectId(id),
      id,
      project_id: input.project_id,
      name: input.name,
      goal: input.goal || null,
      start_date: input.start_date,
      end_date: input.end_date,
      status: 'planned',
      velocity: null,
      metadata: {},
      created_at: now,
      updated_at: now,
    };

    await getSprintsCollection().insertOne(sprint);
    return sprint;
  },

  async update(id: string, input: UpdateSprintInput): Promise<Sprint | null> {
    const updateFields: Record<string, any> = { updated_at: new Date() };

    if (input.name !== undefined) updateFields.name = input.name;
    if (input.goal !== undefined) updateFields.goal = input.goal;
    if (input.start_date !== undefined) updateFields.start_date = input.start_date;
    if (input.end_date !== undefined) updateFields.end_date = input.end_date;
    if (input.status !== undefined) updateFields.status = input.status;
    if (input.velocity !== undefined) updateFields.velocity = input.velocity;
    if (input.metadata !== undefined) updateFields.metadata = input.metadata;

    const result = await getSprintsCollection().findOneAndUpdate(
      { id },
      { $set: updateFields },
      { returnDocument: 'after' }
    );
    return result;
  },

  async delete(id: string): Promise<boolean> {
    const result = await getSprintsCollection().deleteOne({ id });
    return result.deletedCount > 0;
  },

  async start(id: string, projectId: string): Promise<Sprint | null> {
    // Complete any active sprint first
    await getSprintsCollection().updateMany(
      { project_id: projectId, status: 'active' },
      { $set: { status: 'completed', updated_at: new Date() } }
    );

    // Start the new sprint
    return this.update(id, { status: 'active' });
  },

  async complete(id: string, velocity?: number): Promise<Sprint | null> {
    return this.update(id, {
      status: 'completed',
      velocity: velocity || null,
    });
  },

  async count(projectId?: string): Promise<number> {
    const filter: Record<string, any> = {};
    if (projectId) filter.project_id = projectId;
    return getSprintsCollection().countDocuments(filter);
  },
};

export default sprintsRepository;
