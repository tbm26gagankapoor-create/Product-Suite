/**
 * Project and Task Test Fixtures
 */

import { faker } from '@faker-js/faker';
import database, { now } from '../../src/lib/database.js';

export const taskTypes = ['epic', 'feature', 'story', 'task', 'bug', 'improvement'] as const;
export const priorities = ['CRITICAL', 'HIGH', 'MEDIUM', 'LOW', 'TRIVIAL'] as const;
export const columnIds = ['idea', 'todo', 'inprogress', 'blocked', 'testing', 'done'] as const;

/**
 * Create a project document and insert it into the database
 * Returns the inserted document with the MongoDB-generated _id as 'id'
 */
export async function createProjectDocument(
  overrides: Record<string, any> = {}
) {
  const name = overrides.name || faker.commerce.productName();
  const code = overrides.code || 'TST';

  const project = {
    name,
    code,
    description: overrides.description || faker.commerce.productDescription(),
    status: overrides.status || 'active',
    progress_percentage: overrides.progress_percentage || 0,
    is_favorite: overrides.is_favorite || false,
    owner_id: overrides.owner_id || null,
    organization_id: overrides.organization_id || null,
    image_url: overrides.image_url || null,
    icon: overrides.icon || null,
    icon_color: overrides.icon_color || null,
    created_at: now(),
    updated_at: now(),
  };

  return database.insert<typeof project & { id: string }>('projects', project);
}

/**
 * Create a column document and insert it into the database
 * Returns the inserted document with the MongoDB-generated _id as 'id'
 */
export async function createColumnDocument(
  overrides: Record<string, any> = {}
) {
  const column = {
    project_id: overrides.project_id,
    title: overrides.title || 'TO DO',
    position: overrides.position || 0,
    color: overrides.color || '#3B82F6',
    is_default: overrides.is_default || false,
    created_at: now(),
    updated_at: now(),
  };

  return database.insert<typeof column & { id: string }>('columns_status', column);
}

/**
 * Create a task document and insert it into the database
 * Returns the inserted document with the MongoDB-generated _id as 'id'
 */
export async function createTaskDocument(
  projectId: string,
  overrides: Record<string, any> = {}
) {
  const task = {
    task_key: overrides.task_key || `TSK-${faker.number.int({ min: 1, max: 9999 })}`,
    project_id: projectId,
    column_id: overrides.column_id || 'todo',
    sprint_id: overrides.sprint_id || null,
    parent_epic_id: overrides.parent_epic_id || null,
    title: overrides.title || faker.lorem.sentence({ min: 3, max: 8 }),
    description: overrides.description || faker.lorem.paragraph(),
    type: overrides.type || 'task',
    priority: overrides.priority || 'MEDIUM',
    status: overrides.status || null,
    points: overrides.points || faker.number.int({ min: 1, max: 13 }),
    assignee_id: overrides.assignee_id || null,
    reporter_id: overrides.reporter_id || null,
    due_date: overrides.due_date || null,
    start_date: overrides.start_date || null,
    actual_start_date: null,
    completed_date: null,
    time_spent: null,
    estimate: null,
    impact_score: null,
    product_theme: null,
    acceptance_criteria: null,
    customer_value: null,
    technical_debt: null,
    environment: null,
    labels: null,
    resolution: null,
    external_links: null,
    blocked_by: null,
    blocks: null,
    image_url: null,
    created_at: now(),
    updated_at: now(),
  };

  return database.insert<typeof task & { id: string }>('tasks', task);
}

/**
 * Create a sprint document and insert it into the database
 * Returns the inserted document with the MongoDB-generated _id as 'id'
 */
export async function createSprintDocument(
  projectId: string,
  overrides: Record<string, any> = {}
) {
  const startDate = new Date();
  const endDate = new Date(startDate.getTime() + 14 * 24 * 60 * 60 * 1000); // 2 weeks

  const sprint = {
    project_id: projectId,
    name: overrides.name || `Sprint ${faker.number.int({ min: 1, max: 100 })}`,
    goal: overrides.goal || faker.lorem.sentence(),
    start_date: overrides.start_date || startDate.toISOString(),
    end_date: overrides.end_date || endDate.toISOString(),
    status: overrides.status || 'planned',
    velocity: overrides.velocity || null,
    created_at: now(),
    updated_at: now(),
  };

  return database.insert<typeof sprint & { id: string }>('sprints', sprint);
}

/**
 * Create a project member document and insert it into the database
 * Returns the inserted document with the MongoDB-generated _id as 'id'
 */
export async function createProjectMemberDocument(
  projectId: string,
  userId: string,
  role: 'owner' | 'admin' | 'member' | 'viewer' = 'member'
) {
  const member = {
    project_id: projectId,
    user_id: userId,
    role,
    joined_at: now(),
    created_at: now(),
    updated_at: now(),
  };

  return database.insert<typeof member & { id: string }>('project_members', member);
}

/**
 * Create test data set with project, tasks, and sprint
 */
export async function createProjectTestData(ownerId: string, organizationId: string) {
  const project = await createProjectDocument({ owner_id: ownerId, organization_id: organizationId });
  const sprint = await createSprintDocument(project.id);
  const tasks = await Promise.all([
    createTaskDocument(project.id, { title: 'Task 1', type: 'feature', assignee_id: ownerId }),
    createTaskDocument(project.id, { title: 'Task 2', type: 'bug', priority: 'HIGH' }),
    createTaskDocument(project.id, { title: 'Task 3', type: 'story', sprint_id: sprint.id }),
    createTaskDocument(project.id, { title: 'Epic 1', type: 'epic' }),
    createTaskDocument(project.id, { title: 'Task 4', column_id: 'done' }),
  ]);

  return { project, sprint, tasks };
}
