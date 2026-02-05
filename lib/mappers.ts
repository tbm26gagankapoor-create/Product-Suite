/**
 * Consolidated Mappers
 * Single source of truth for all backend-to-frontend data transformations
 */

import { Project, Task, Sprint, User, Team, Comment, Organization, OrganizationMember } from '../types';

/**
 * Map column title from backend to frontend column ID
 */
export function mapColumnTitleToId(columnTitle: string | null): string {
  if (!columnTitle) return 'todo';
  const titleMap: Record<string, string> = {
    'IDEA': 'idea',
    'TO DO': 'todo',
    'IN PROGRESS': 'inprogress',
    'BLOCKED': 'blocked',
    'TESTING': 'testing',
    'DONE': 'done',
  };
  return titleMap[columnTitle.toUpperCase()] || 'todo';
}

/**
 * Map frontend column ID to backend column title
 */
export function mapColumnIdToTitle(columnId: string): string {
  const idMap: Record<string, string> = {
    'idea': 'IDEA',
    'todo': 'TO DO',
    'inprogress': 'IN PROGRESS',
    'blocked': 'BLOCKED',
    'testing': 'TESTING',
    'done': 'DONE',
  };
  return idMap[columnId] || 'TO DO';
}

/**
 * Map backend user data to frontend User type
 */
export function mapUser(data: any): User {
  if (!data) return data;
  return {
    id: data.id,
    name: data.name || 'User',
    email: data.email,
    avatarUrl: data.avatar_url || `https://avatar.iran.liara.run/public`,
    designation: data.designation || 'Member',
    isAdmin: data.designation === 'Admin',
    organizationId: data.organization_id,
    location: data.location,
    bio: data.bio,
    website: data.website,
    jobTitle: data.job_title,
    socialLinks: data.social_links,
    status: data.status || 'active',
    createdAt: data.created_at,
    lastActiveAt: data.last_active_at,
  };
}

/**
 * Map frontend user to backend format for API requests
 */
export function mapUserToBackend(user: Partial<User>): Record<string, any> {
  const data: Record<string, any> = {};
  if (user.name !== undefined) data.name = user.name;
  if (user.designation !== undefined) data.designation = user.designation;
  if (user.avatarUrl !== undefined) data.avatar_url = user.avatarUrl;
  if (user.location !== undefined) data.location = user.location;
  if (user.bio !== undefined) data.bio = user.bio;
  if (user.website !== undefined) data.website = user.website;
  if (user.jobTitle !== undefined) data.job_title = user.jobTitle;
  if (user.organizationId !== undefined) data.organization_id = user.organizationId;
  if (user.status !== undefined) data.status = user.status;
  if (user.isAdmin !== undefined) data.designation = user.isAdmin ? 'Admin' : (user.designation || 'Member');
  return data;
}

/**
 * Map backend project data to frontend Project type
 */
export function mapProject(data: any): Project {
  if (!data) return data;
  return {
    id: data.id,
    name: data.name,
    key: data.code || data.key,
    description: data.description,
    status: data.status,
    progress: data.progress_percentage || data.progress || 0,
    members: [],
    ownerId: data.owner_id,
    organizationId: data.organization_id,
    startDate: data.start_date,
    dueDate: data.due_date,
    createdAt: data.created_at,
    tags: data.tags || [],
    color: data.color,
    imageUrl: data.image_url,
    icon: data.icon,
    iconColor: data.icon_color,
    vision: data.vision,
    prd: data.prd,
    docs: data.docs || {},
    targetReleaseDate: data.target_release_date,
    budget: data.budget,
    spentBudget: data.spent_budget,
    category: data.category,
    lifecycleStage: data.lifecycle_stage,
    okrs: data.okrs || [],
    successMetrics: data.success_metrics || [],
    targetAudience: data.target_audience,
    competitors: data.competitors || [],
    risks: data.risks || [],
    dependencies: data.dependencies || [],
    healthStatus: data.health_status,
    priorityRank: data.priority_rank,
    customerCount: data.customer_count,
    revenueImpact: data.revenue_impact,
    // Draft fields for saving incomplete product wizard state
    draftStep: data.draft_step,
    draftData: data.draft_data,
  };
}

/**
 * Map frontend project to backend format for API requests
 */
export function mapProjectToBackend(project: Partial<Project>): Record<string, any> {
  const data: Record<string, any> = {};
  if (project.name !== undefined) data.name = project.name;
  if (project.key !== undefined) data.code = project.key;
  if (project.description !== undefined) data.description = project.description;
  if (project.status !== undefined) data.status = project.status;
  if (project.ownerId !== undefined) data.owner_id = project.ownerId;
  if (project.organizationId !== undefined) data.organization_id = project.organizationId;
  if (project.imageUrl !== undefined) data.image_url = project.imageUrl;
  if (project.icon !== undefined) data.icon = project.icon;
  if (project.iconColor !== undefined) data.icon_color = project.iconColor;
  if (project.vision !== undefined) data.vision = project.vision;
  if (project.prd !== undefined) data.prd = project.prd;
  return data;
}

/**
 * Map backend task data to frontend Task type
 */
export function mapTask(data: any, users: User[] = []): Task {
  if (!data) return data;

  const unknownUser: User = {
    id: 'unknown',
    name: 'Unknown User',
    avatarUrl: 'https://ui-avatars.com/api/?name=Unknown',
    email: ''
  };

  const assignee = users.find(u => u.id === data.assignee_id) || {
    id: data.assignee_id || 'unknown',
    name: data.assignee_name || 'Unassigned',
    avatarUrl: data.assignee_avatar || '',
    email: ''
  };
  const reporter = users.find(u => u.id === data.reporter_id) || unknownUser;

  // Map the column_title from backend to frontend column ID format
  const frontendColumnId = mapColumnTitleToId(data.column_title);

  return {
    id: data.task_key || `${data.project_code || 'TSK'}-${data.task_number}`,
    uuid: data.id,
    projectId: data.project_id,
    title: data.title,
    description: data.description,
    columnId: frontendColumnId,
    type: data.type || 'task',
    priority: data.priority || 'MEDIUM',
    points: data.points,
    assignee,
    reporter,
    sprintId: data.sprint_id,
    parentEpicId: data.parent_epic_id,
    tags: (data.tags || []).map((t: any) => ({ label: t.label, color: t.color || 'blue' })),
    commentsCount: data.comments_count || 0,
    comments: data.comments ? data.comments.map(mapComment) : [],
    startDate: data.start_date,
    dueDate: data.due_date,
    hasDescription: data.has_description || !!data.description,
    imageUrl: data.image_url,
    actualStartDate: data.actual_start_date,
    completedDate: data.completed_date,
    acceptanceCriteria: data.acceptance_criteria || [],
    customerValue: data.customer_value,
    technicalDebt: data.technical_debt || false,
    environment: data.environment || [],
    labels: data.labels || [],
    resolution: data.resolution,
    externalLinks: data.external_links || []
  };
}

/**
 * Map frontend task to backend format for API requests
 */
export function mapTaskToBackend(task: Partial<Task>): Record<string, any> {
  const data: Record<string, any> = {};
  if (task.projectId !== undefined) data.project_id = task.projectId;
  if (task.title !== undefined) data.title = task.title;
  if (task.description !== undefined) data.description = task.description;
  if (task.columnId !== undefined) data.column_id = task.columnId;
  if (task.type !== undefined) data.type = task.type;
  if (task.priority !== undefined) data.priority = task.priority;
  if (task.points !== undefined) data.points = task.points;
  if (task.assignee?.id !== undefined) data.assignee_id = task.assignee.id !== 'unknown' ? task.assignee.id : null;
  if (task.reporter?.id !== undefined) data.reporter_id = task.reporter.id !== 'unknown' ? task.reporter.id : null;
  if (task.sprintId !== undefined) data.sprint_id = task.sprintId;
  if (task.parentEpicId !== undefined) data.parent_epic_id = task.parentEpicId;
  if (task.dueDate !== undefined) data.due_date = task.dueDate;
  if (task.startDate !== undefined) data.start_date = task.startDate;
  return data;
}

/**
 * Map backend sprint data to frontend Sprint type
 */
export function mapSprint(data: any): Sprint {
  if (!data) return data;
  return {
    id: data.id,
    projectId: data.project_id,
    name: data.name,
    startDate: data.start_date,
    endDate: data.end_date,
    goal: data.goal,
    status: data.status,
  };
}

/**
 * Map frontend sprint to backend format for API requests
 */
export function mapSprintToBackend(sprint: Partial<Sprint>): Record<string, any> {
  const data: Record<string, any> = {};
  if (sprint.projectId !== undefined) data.project_id = sprint.projectId;
  if (sprint.name !== undefined) data.name = sprint.name;
  if (sprint.startDate !== undefined) data.start_date = sprint.startDate;
  if (sprint.endDate !== undefined) data.end_date = sprint.endDate;
  if (sprint.goal !== undefined) data.goal = sprint.goal;
  if (sprint.status !== undefined) data.status = sprint.status;
  return data;
}

/**
 * Map backend team data to frontend Team type
 */
export function mapTeam(data: any): Team {
  if (!data) return data;
  return {
    id: data.id,
    name: data.name,
    description: data.description || '',
    avatarUrl: data.avatar_url,
    organizationId: data.organization_id,
    projectIds: data.project_ids || [],
    members: data.members || []
  };
}

/**
 * Map frontend team to backend format for API requests
 */
export function mapTeamToBackend(team: Partial<Team>): Record<string, any> {
  const data: Record<string, any> = {};
  if (team.name !== undefined) data.name = team.name;
  if (team.description !== undefined) data.description = team.description;
  if (team.organizationId !== undefined) data.organization_id = team.organizationId;
  if (team.members !== undefined) data.member_ids = team.members;
  return data;
}

/**
 * Map backend comment data to frontend Comment type
 */
export function mapComment(data: any): Comment {
  if (!data) return data;
  return {
    id: data.id,
    userId: data.user_id,
    text: data.content || data.text,
    timestamp: data.created_at
  };
}

/**
 * Map frontend comment to backend format for API requests
 */
export function mapCommentToBackend(comment: Partial<Comment>, taskId?: string): Record<string, any> {
  const data: Record<string, any> = {};
  if (taskId !== undefined) data.task_id = taskId;
  if (comment.userId !== undefined) data.user_id = comment.userId;
  if (comment.text !== undefined) data.content = comment.text;
  return data;
}

/**
 * Map backend organization data to frontend Organization type
 */
export function mapOrganization(data: any): Organization {
  if (!data) return data;
  return {
    id: data.id,
    name: data.name,
    slug: data.slug,
    description: data.description,
    logoUrl: data.logo_url,
    domain: data.domain,
    createdAt: data.created_at,
    settings: data.settings,
  };
}

/**
 * Map backend organization member data to frontend OrganizationMember type
 */
export function mapOrganizationMember(data: any): OrganizationMember {
  if (!data) return data;
  return {
    id: data.id,
    userId: data.user_id,
    organizationId: data.organization_id,
    role: data.role,
    joinedAt: data.joined_at,
  };
}

/**
 * Batch map functions for arrays
 */
export const mapUsers = (data: any[]): User[] => (data || []).map(mapUser);
export const mapProjects = (data: any[]): Project[] => (data || []).map(mapProject);
export const mapTasks = (data: any[], users: User[] = []): Task[] => (data || []).map(d => mapTask(d, users));
export const mapSprints = (data: any[]): Sprint[] => (data || []).map(mapSprint);
export const mapTeams = (data: any[]): Team[] => (data || []).map(mapTeam);
export const mapComments = (data: any[]): Comment[] => (data || []).map(mapComment);
export const mapOrganizations = (data: any[]): Organization[] => (data || []).map(mapOrganization);
export const mapOrganizationMembers = (data: any[]): OrganizationMember[] => (data || []).map(mapOrganizationMember);

/**
 * Utility: Check if a string is a valid MongoDB ObjectId or UUID
 */
export function isValidId(id?: string): boolean {
  if (!id) return false;
  // MongoDB ObjectId: 24 hex characters
  if (/^[0-9a-f]{24}$/i.test(id)) return true;
  // UUID: 8-4-4-4-12 hex characters
  if (/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id)) return true;
  return false;
}
