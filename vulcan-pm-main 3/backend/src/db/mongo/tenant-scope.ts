import { Collection, Document, Filter, OptionalUnlessRequiredId, UpdateFilter, FindOptions, InsertOneResult, UpdateResult, DeleteResult } from 'mongodb';
import { getCollection, Collections } from './client.js';

/**
 * TenantScope - Automatically scopes MongoDB queries by tenant_id
 *
 * Usage:
 *   const scope = new TenantScope(tenantId);
 *   const projects = await scope.projects().find({}).toArray();
 *   await scope.projects().insertOne({ name: 'New Project', ... });
 */
export class TenantScope {
  constructor(private tenantId: string) {
    if (!tenantId) {
      throw new Error('TenantScope requires a valid tenantId');
    }
  }

  /**
   * Get tenant ID
   */
  getTenantId(): string {
    return this.tenantId;
  }

  /**
   * Create a scoped collection wrapper
   */
  private scopedCollection<T extends Document>(name: string): ScopedCollection<T> {
    return new ScopedCollection<T>(getCollection<T>(name), this.tenantId);
  }

  // =====================================================
  // Scoped Collection Accessors
  // =====================================================

  projects() {
    return this.scopedCollection<any>(Collections.PROJECTS);
  }

  tasks() {
    // Tasks are scoped via project_id, not directly by tenant_id
    // Use projectTasks() for tenant-scoped task queries
    return getCollection<any>(Collections.TASKS);
  }

  /**
   * Get tasks for all projects belonging to this tenant
   */
  async tenantTasks(filter: Filter<any> = {}): Promise<any[]> {
    // First get all project IDs for this tenant
    const projects = await this.projects().find({}, { projection: { id: 1 } }).toArray();
    const projectIds = projects.map(p => p.id);

    // Then query tasks with those project IDs
    return getCollection<any>(Collections.TASKS)
      .find({ ...filter, project_id: { $in: projectIds } })
      .toArray();
  }

  sprints() {
    // Sprints are scoped via project_id
    return getCollection<any>(Collections.SPRINTS);
  }

  /**
   * Get sprints for all projects belonging to this tenant
   */
  async tenantSprints(filter: Filter<any> = {}): Promise<any[]> {
    const projects = await this.projects().find({}, { projection: { id: 1 } }).toArray();
    const projectIds = projects.map(p => p.id);

    return getCollection<any>(Collections.SPRINTS)
      .find({ ...filter, project_id: { $in: projectIds } })
      .toArray();
  }

  columns() {
    return getCollection<any>(Collections.COLUMNS);
  }

  tags() {
    return getCollection<any>(Collections.TAGS);
  }

  comments() {
    return getCollection<any>(Collections.COMMENTS);
  }

  activityLog() {
    return getCollection<any>(Collections.ACTIVITY_LOG);
  }

  documents() {
    return getCollection<any>(Collections.DOCUMENTS);
  }

  projectMembers() {
    return getCollection<any>(Collections.PROJECT_MEMBERS);
  }
}

/**
 * ScopedCollection - Wraps a MongoDB collection to automatically inject tenant_id
 */
class ScopedCollection<T extends Document> {
  constructor(
    private collection: Collection<T>,
    private tenantId: string
  ) {}

  /**
   * Add tenant_id to filter
   */
  private scopeFilter(filter: Filter<T>): Filter<T> {
    return { ...filter, tenant_id: this.tenantId } as Filter<T>;
  }

  /**
   * Add tenant_id to document
   */
  private scopeDocument(doc: OptionalUnlessRequiredId<T>): OptionalUnlessRequiredId<T> {
    return { ...doc, tenant_id: this.tenantId } as OptionalUnlessRequiredId<T>;
  }

  // =====================================================
  // Read Operations (scoped by tenant_id)
  // =====================================================

  find(filter: Filter<T> = {}, options?: FindOptions) {
    return this.collection.find(this.scopeFilter(filter), options);
  }

  findOne(filter: Filter<T> = {}, options?: FindOptions) {
    return this.collection.findOne(this.scopeFilter(filter), options);
  }

  countDocuments(filter: Filter<T> = {}): Promise<number> {
    return this.collection.countDocuments(this.scopeFilter(filter));
  }

  // =====================================================
  // Write Operations (scoped by tenant_id)
  // =====================================================

  insertOne(doc: OptionalUnlessRequiredId<T>): Promise<InsertOneResult<T>> {
    return this.collection.insertOne(this.scopeDocument(doc));
  }

  insertMany(docs: OptionalUnlessRequiredId<T>[]) {
    return this.collection.insertMany(docs.map(doc => this.scopeDocument(doc)));
  }

  updateOne(filter: Filter<T>, update: UpdateFilter<T>): Promise<UpdateResult> {
    return this.collection.updateOne(this.scopeFilter(filter), update);
  }

  updateMany(filter: Filter<T>, update: UpdateFilter<T>): Promise<UpdateResult> {
    return this.collection.updateMany(this.scopeFilter(filter), update);
  }

  deleteOne(filter: Filter<T>): Promise<DeleteResult> {
    return this.collection.deleteOne(this.scopeFilter(filter));
  }

  deleteMany(filter: Filter<T>): Promise<DeleteResult> {
    return this.collection.deleteMany(this.scopeFilter(filter));
  }

  // =====================================================
  // Aggregation (scoped by tenant_id)
  // =====================================================

  aggregate(pipeline: Document[]) {
    // Prepend $match stage with tenant_id
    const scopedPipeline = [
      { $match: { tenant_id: this.tenantId } },
      ...pipeline,
    ];
    return this.collection.aggregate(scopedPipeline);
  }
}

/**
 * Factory function to create TenantScope from request
 */
export function createTenantScope(tenantId: string): TenantScope {
  return new TenantScope(tenantId);
}

export default { TenantScope, createTenantScope };
