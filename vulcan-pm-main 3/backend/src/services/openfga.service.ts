import { config } from '../config/index.js';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

interface FGAStore {
  id: string;
  name: string;
  created_at: string;
  updated_at: string;
}

interface FGAAuthorizationModel {
  id: string;
  schema_version: string;
  type_definitions: unknown[];
}

interface FGATuple {
  user: string;
  relation: string;
  object: string;
}

interface FGACheckResponse {
  allowed: boolean;
  resolution?: string;
}

interface FGAListObjectsResponse {
  objects: string[];
}

// Cache for store and model IDs
let cachedStoreId: string | null = null;
let cachedModelId: string | null = null;

export const openfgaService = {
  /**
   * Get the API base URL
   */
  getApiUrl(): string {
    return config.openfga.apiUrl;
  },

  /**
   * Create or get existing store
   */
  async getOrCreateStore(): Promise<string> {
    if (cachedStoreId) return cachedStoreId;
    if (config.openfga.storeId) {
      cachedStoreId = config.openfga.storeId;
      return cachedStoreId;
    }

    try {
      // List existing stores
      const listResponse = await fetch(`${this.getApiUrl()}/stores`);
      if (listResponse.ok) {
        const stores = await listResponse.json() as { stores?: FGAStore[] };
        const existingStore = stores.stores?.find(s => s.name === 'infinia');
        if (existingStore) {
          cachedStoreId = existingStore.id;
          console.log('[OpenFGA] Using existing store:', cachedStoreId);
          return cachedStoreId;
        }
      }

      // Create new store
      const createResponse = await fetch(`${this.getApiUrl()}/stores`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: 'infinia' }),
      });

      if (!createResponse.ok) {
        const error = await createResponse.text();
        throw new Error(`Failed to create store: ${error}`);
      }

      const store = await createResponse.json() as FGAStore;
      cachedStoreId = store.id;
      console.log('[OpenFGA] Created new store:', cachedStoreId);
      return cachedStoreId;
    } catch (error) {
      console.error('[OpenFGA] Error getting/creating store:', error);
      throw error;
    }
  },

  /**
   * Get or create authorization model
   */
  async getOrCreateModel(storeId: string): Promise<string> {
    if (cachedModelId) return cachedModelId;
    if (config.openfga.modelId) {
      cachedModelId = config.openfga.modelId;
      return cachedModelId;
    }

    try {
      // List existing models
      const listResponse = await fetch(`${this.getApiUrl()}/stores/${storeId}/authorization-models`);
      if (listResponse.ok) {
        const models = await listResponse.json() as { authorization_models?: FGAAuthorizationModel[] };
        if (models.authorization_models?.length) {
          // Use the latest model
          cachedModelId = models.authorization_models[0].id;
          console.log('[OpenFGA] Using existing model:', cachedModelId);
          return cachedModelId;
        }
      }

      // Load model from file
      const modelPath = path.join(__dirname, '../../fga/model.json');
      const modelJson = JSON.parse(fs.readFileSync(modelPath, 'utf-8'));

      // Create new model
      const createResponse = await fetch(`${this.getApiUrl()}/stores/${storeId}/authorization-models`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(modelJson),
      });

      if (!createResponse.ok) {
        const error = await createResponse.text();
        throw new Error(`Failed to create model: ${error}`);
      }

      const model = await createResponse.json() as { authorization_model_id: string };
      cachedModelId = model.authorization_model_id;
      console.log('[OpenFGA] Created new model:', cachedModelId);
      return cachedModelId;
    } catch (error) {
      console.error('[OpenFGA] Error getting/creating model:', error);
      throw error;
    }
  },

  /**
   * Initialize OpenFGA (create store and model if needed)
   */
  async initialize(): Promise<{ storeId: string; modelId: string }> {
    const storeId = await this.getOrCreateStore();
    const modelId = await this.getOrCreateModel(storeId);
    return { storeId, modelId };
  },

  /**
   * Write a relationship tuple
   */
  async writeTuple(tuple: FGATuple): Promise<void> {
    const storeId = await this.getOrCreateStore();
    const modelId = await this.getOrCreateModel(storeId);

    const response = await fetch(`${this.getApiUrl()}/stores/${storeId}/write`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        authorization_model_id: modelId,
        writes: {
          tuple_keys: [tuple],
        },
      }),
    });

    if (!response.ok) {
      const error = await response.text();
      // Check if it's a duplicate tuple error (which is fine)
      if (error.includes('cannot write a tuple which already exists')) {
        console.log('[OpenFGA] Tuple already exists:', tuple);
        return;
      }
      throw new Error(`Failed to write tuple: ${error}`);
    }

    console.log('[OpenFGA] Written tuple:', tuple);
  },

  /**
   * Write multiple relationship tuples
   */
  async writeTuples(tuples: FGATuple[]): Promise<void> {
    const storeId = await this.getOrCreateStore();
    const modelId = await this.getOrCreateModel(storeId);

    const response = await fetch(`${this.getApiUrl()}/stores/${storeId}/write`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        authorization_model_id: modelId,
        writes: {
          tuple_keys: tuples,
        },
      }),
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Failed to write tuples: ${error}`);
    }

    console.log('[OpenFGA] Written tuples:', tuples.length);
  },

  /**
   * Delete a relationship tuple
   */
  async deleteTuple(tuple: FGATuple): Promise<void> {
    const storeId = await this.getOrCreateStore();
    const modelId = await this.getOrCreateModel(storeId);

    const response = await fetch(`${this.getApiUrl()}/stores/${storeId}/write`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        authorization_model_id: modelId,
        deletes: {
          tuple_keys: [tuple],
        },
      }),
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Failed to delete tuple: ${error}`);
    }

    console.log('[OpenFGA] Deleted tuple:', tuple);
  },

  /**
   * Check if a user has a relation to an object
   */
  async check(user: string, relation: string, object: string): Promise<boolean> {
    const storeId = await this.getOrCreateStore();
    const modelId = await this.getOrCreateModel(storeId);

    const response = await fetch(`${this.getApiUrl()}/stores/${storeId}/check`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        authorization_model_id: modelId,
        tuple_key: { user, relation, object },
      }),
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Failed to check permission: ${error}`);
    }

    const result = await response.json() as FGACheckResponse;
    return result.allowed;
  },

  /**
   * List all objects of a type that a user has a specific relation to
   */
  async listObjects(user: string, relation: string, type: string): Promise<string[]> {
    const storeId = await this.getOrCreateStore();
    const modelId = await this.getOrCreateModel(storeId);

    const response = await fetch(`${this.getApiUrl()}/stores/${storeId}/list-objects`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        authorization_model_id: modelId,
        user,
        relation,
        type,
      }),
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Failed to list objects: ${error}`);
    }

    const result = await response.json() as FGAListObjectsResponse;
    return result.objects;
  },

  // =====================================================
  // HIGH-LEVEL AUTHORIZATION METHODS
  // =====================================================

  /**
   * Add user as organization admin
   */
  async addOrgAdmin(userId: string, orgId: string): Promise<void> {
    await this.writeTuple({
      user: `user:${userId}`,
      relation: 'admin',
      object: `organization:${orgId}`,
    });
  },

  /**
   * Add user as organization member
   */
  async addOrgMember(userId: string, orgId: string): Promise<void> {
    await this.writeTuple({
      user: `user:${userId}`,
      relation: 'member',
      object: `organization:${orgId}`,
    });
  },

  /**
   * Check if user is organization admin
   */
  async isOrgAdmin(userId: string, orgId: string): Promise<boolean> {
    return this.check(`user:${userId}`, 'admin', `organization:${orgId}`);
  },

  /**
   * Check if user is organization member
   */
  async isOrgMember(userId: string, orgId: string): Promise<boolean> {
    return this.check(`user:${userId}`, 'member', `organization:${orgId}`);
  },

  /**
   * Create a project and link it to organization
   */
  async createProject(projectId: string, orgId: string, creatorUserId: string): Promise<void> {
    await this.writeTuples([
      // Link project to organization
      {
        user: `organization:${orgId}`,
        relation: 'organization',
        object: `project:${projectId}`,
      },
      // Make creator a project admin
      {
        user: `user:${creatorUserId}`,
        relation: 'admin',
        object: `project:${projectId}`,
      },
    ]);
  },

  /**
   * Add user as project admin
   */
  async addProjectAdmin(userId: string, projectId: string): Promise<void> {
    await this.writeTuple({
      user: `user:${userId}`,
      relation: 'admin',
      object: `project:${projectId}`,
    });
  },

  /**
   * Add user as project member
   */
  async addProjectMember(userId: string, projectId: string): Promise<void> {
    await this.writeTuple({
      user: `user:${userId}`,
      relation: 'member',
      object: `project:${projectId}`,
    });
  },

  /**
   * Add user as project viewer
   */
  async addProjectViewer(userId: string, projectId: string): Promise<void> {
    await this.writeTuple({
      user: `user:${userId}`,
      relation: 'viewer',
      object: `project:${projectId}`,
    });
  },

  /**
   * Check if user is project admin
   */
  async isProjectAdmin(userId: string, projectId: string): Promise<boolean> {
    return this.check(`user:${userId}`, 'admin', `project:${projectId}`);
  },

  /**
   * Check if user is project member
   */
  async isProjectMember(userId: string, projectId: string): Promise<boolean> {
    return this.check(`user:${userId}`, 'member', `project:${projectId}`);
  },

  /**
   * Check if user can view project
   */
  async canViewProject(userId: string, projectId: string): Promise<boolean> {
    return this.check(`user:${userId}`, 'viewer', `project:${projectId}`);
  },

  /**
   * Create a team and link it to project
   */
  async createTeam(teamId: string, projectId: string, leadUserId: string): Promise<void> {
    await this.writeTuples([
      // Link team to project
      {
        user: `project:${projectId}`,
        relation: 'project',
        object: `team:${teamId}`,
      },
      // Make creator team lead
      {
        user: `user:${leadUserId}`,
        relation: 'lead',
        object: `team:${teamId}`,
      },
    ]);
  },

  /**
   * Add user as team member
   */
  async addTeamMember(userId: string, teamId: string): Promise<void> {
    await this.writeTuple({
      user: `user:${userId}`,
      relation: 'member',
      object: `team:${teamId}`,
    });
  },

  /**
   * Create a task and link it to project
   */
  async createTask(taskId: string, projectId: string): Promise<void> {
    await this.writeTuple({
      user: `project:${projectId}`,
      relation: 'project',
      object: `task:${taskId}`,
    });
  },

  /**
   * Assign user to task
   */
  async assignTask(taskId: string, userId: string): Promise<void> {
    await this.writeTuple({
      user: `user:${userId}`,
      relation: 'assignee',
      object: `task:${taskId}`,
    });
  },

  /**
   * Check if user can edit task
   */
  async canEditTask(userId: string, taskId: string): Promise<boolean> {
    return this.check(`user:${userId}`, 'can_edit', `task:${taskId}`);
  },

  /**
   * Check if user can view task
   */
  async canViewTask(userId: string, taskId: string): Promise<boolean> {
    return this.check(`user:${userId}`, 'can_view', `task:${taskId}`);
  },

  /**
   * Create a sprint and link it to project
   */
  async createSprint(sprintId: string, projectId: string): Promise<void> {
    await this.writeTuple({
      user: `project:${projectId}`,
      relation: 'project',
      object: `sprint:${sprintId}`,
    });
  },

  /**
   * Check if user can manage sprint
   */
  async canManageSprint(userId: string, sprintId: string): Promise<boolean> {
    return this.check(`user:${userId}`, 'can_manage', `sprint:${sprintId}`);
  },

  /**
   * Get all organizations where user is admin
   */
  async getAdminOrganizations(userId: string): Promise<string[]> {
    const objects = await this.listObjects(`user:${userId}`, 'admin', 'organization');
    return objects.map(obj => obj.replace('organization:', ''));
  },

  /**
   * Get all projects where user has access
   */
  async getAccessibleProjects(userId: string): Promise<string[]> {
    const objects = await this.listObjects(`user:${userId}`, 'viewer', 'project');
    return objects.map(obj => obj.replace('project:', ''));
  },
};
