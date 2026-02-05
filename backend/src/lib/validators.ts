/**
 * Centralized Validation Schemas
 * Zod schemas for all entities - use before database operations
 */

import { z } from 'zod';

// ===================
// Common Schemas
// ===================

// MongoDB ObjectId or legacy UUID string
export const objectIdSchema = z.string().refine(
  (val) => /^[0-9a-f]{24}$/i.test(val) || /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(val),
  { message: 'Invalid ID format' }
);

// Optional ObjectId
export const optionalObjectIdSchema = objectIdSchema.optional().nullable();

// Date string (ISO 8601)
export const dateStringSchema = z.string().datetime().or(z.string().regex(/^\d{4}-\d{2}-\d{2}$/));

// ===================
// User Schemas
// ===================

export const createUserSchema = z.object({
  name: z.string().min(1, 'Name is required').max(100),
  email: z.string().email('Invalid email address'),
  password: z.string().min(6, 'Password must be at least 6 characters').optional(),
  avatar_url: z.string().url().optional(),
  designation: z.string().optional(),
  organization_id: optionalObjectIdSchema,
});

export const updateUserSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  email: z.string().email().optional(),
  avatar_url: z.string().url().optional().nullable(),
  designation: z.string().optional(),
  organization_id: optionalObjectIdSchema,
  location: z.string().max(100).optional().nullable(),
  bio: z.string().max(500).optional().nullable(),
  website: z.string().url().optional().nullable(),
  job_title: z.string().max(100).optional().nullable(),
  social_links: z.record(z.string()).optional().nullable(),
  status: z.enum(['active', 'inactive', 'away']).optional(),
});

export const loginSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z.string().min(1, 'Password is required'),
});

export const registerSchema = z.object({
  name: z.string().min(1, 'Name is required').max(100),
  email: z.string().email('Invalid email address'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
});

// ===================
// Organization Schemas
// ===================

export const createOrganizationSchema = z.object({
  name: z.string().min(1, 'Organization name is required').max(100),
  slug: z.string().min(1).max(50).regex(/^[a-z0-9-]+$/, 'Slug must be lowercase alphanumeric with dashes'),
  domain: z.string().optional(),
  logo_url: z.string().url().optional(),
  owner_id: optionalObjectIdSchema,
  settings: z.object({
    allowDomainJoin: z.boolean().optional(),
    requireApproval: z.boolean().optional(),
    defaultRole: z.enum(['admin', 'member']).optional(),
  }).optional(),
});

export const updateOrganizationSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  domain: z.string().optional().nullable(),
  logo_url: z.string().url().optional().nullable(),
  settings: z.object({
    allowDomainJoin: z.boolean().optional(),
    requireApproval: z.boolean().optional(),
    defaultRole: z.enum(['admin', 'member']).optional(),
  }).optional(),
});

export const addOrganizationMemberSchema = z.object({
  user_id: objectIdSchema,
  role: z.enum(['admin', 'member']).default('member'),
});

export const updateOrganizationMemberSchema = z.object({
  role: z.enum(['admin', 'member']),
});

export const createInviteSchema = z.object({
  email: z.string().email('Invalid email address'),
  role: z.enum(['admin', 'member']).default('member'),
  organizationId: objectIdSchema,
});

// ===================
// Project Schemas
// ===================

export const createProjectSchema = z.object({
  name: z.string().min(1, 'Project name is required').max(100),
  code: z.string().min(1, 'Project code is required').max(10).regex(/^[A-Z0-9]+$/, 'Code must be uppercase alphanumeric'),
  description: z.string().max(1000).optional(),
  owner_id: optionalObjectIdSchema,
  organization_id: optionalObjectIdSchema,
  image_url: z.string().url().optional(),
  icon: z.string().optional(),
  icon_color: z.string().optional(),
});

export const updateProjectSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  description: z.string().max(1000).optional().nullable(),
  status: z.enum(['active', 'completed', 'archived', 'on-hold']).optional(),
  progress_percentage: z.number().min(0).max(100).optional(),
  image_url: z.string().url().optional().nullable(),
  icon: z.string().optional().nullable(),
  icon_color: z.string().optional().nullable(),
  vision: z.string().optional().nullable(),
  prd: z.string().optional().nullable(),
  docs: z.record(z.string()).optional(),
  draft_step: z.number().optional().nullable(),
  draft_data: z.any().optional().nullable(),
});

export const addProjectMemberSchema = z.object({
  user_id: objectIdSchema,
  role: z.enum(['owner', 'admin', 'member', 'viewer']).default('member'),
});

// ===================
// Sprint Schemas
// ===================

export const createSprintSchema = z.object({
  project_id: objectIdSchema,
  name: z.string().min(1, 'Sprint name is required').max(100),
  goal: z.string().max(500).optional(),
  start_date: dateStringSchema,
  end_date: dateStringSchema,
}).refine((data) => new Date(data.end_date) > new Date(data.start_date), {
  message: 'End date must be after start date',
  path: ['end_date'],
});

export const updateSprintSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  goal: z.string().max(500).optional().nullable(),
  start_date: dateStringSchema.optional(),
  end_date: dateStringSchema.optional(),
  status: z.enum(['planned', 'active', 'completed']).optional(),
});

// ===================
// Task Schemas
// ===================

export const taskTypeSchema = z.enum(['epic', 'feature', 'story', 'task', 'bug', 'improvement', 'subtask']);
export const prioritySchema = z.enum(['CRITICAL', 'HIGH', 'MEDIUM', 'LOW', 'TRIVIAL']);
export const columnIdSchema = z.enum(['idea', 'todo', 'inprogress', 'blocked', 'testing', 'done']);

export const createTaskSchema = z.object({
  project_id: objectIdSchema,
  title: z.string().min(1, 'Task title is required').max(200),
  description: z.string().max(10000).optional(),
  type: taskTypeSchema.default('task'),
  priority: prioritySchema.default('MEDIUM'),
  column_id: columnIdSchema.default('todo'),
  sprint_id: optionalObjectIdSchema,
  parent_epic_id: optionalObjectIdSchema,
  assignee_id: optionalObjectIdSchema,
  reporter_id: optionalObjectIdSchema,
  points: z.number().min(0).max(100).optional(),
  estimate: z.string().optional(),
  due_date: dateStringSchema.optional(),
  start_date: dateStringSchema.optional(),
  impact_score: z.number().min(1).max(10).optional(),
  product_theme: z.string().optional(),
  tag_ids: z.array(objectIdSchema).optional(),
});

export const updateTaskSchema = z.object({
  title: z.string().min(1).max(200).optional(),
  description: z.string().max(10000).optional().nullable(),
  type: taskTypeSchema.optional(),
  priority: prioritySchema.optional(),
  column_id: columnIdSchema.optional(),
  sprint_id: optionalObjectIdSchema,
  parent_epic_id: optionalObjectIdSchema,
  assignee_id: optionalObjectIdSchema,
  reporter_id: optionalObjectIdSchema,
  points: z.number().min(0).max(100).optional().nullable(),
  estimate: z.string().optional().nullable(),
  due_date: dateStringSchema.optional().nullable(),
  start_date: dateStringSchema.optional().nullable(),
  completed_date: dateStringSchema.optional().nullable(),
  impact_score: z.number().min(1).max(10).optional().nullable(),
  product_theme: z.string().optional().nullable(),
  acceptance_criteria: z.array(z.string()).optional(),
  customer_value: z.string().optional().nullable(),
  technical_debt: z.boolean().optional(),
  resolution: z.string().optional().nullable(),
});

export const moveTaskSchema = z.object({
  column_id: columnIdSchema,
});

export const assignToSprintSchema = z.object({
  sprint_id: optionalObjectIdSchema,
});

// ===================
// Subtask Schemas
// ===================

export const createSubtaskSchema = z.object({
  title: z.string().min(1, 'Subtask title is required').max(200),
  type: taskTypeSchema.default('subtask'),
  assignee_id: optionalObjectIdSchema,
  sprint_id: optionalObjectIdSchema,
  due_date: dateStringSchema.optional(),
});

export const updateSubtaskSchema = z.object({
  title: z.string().min(1).max(200).optional(),
  type: taskTypeSchema.optional(),
  status: z.enum(['pending', 'in_progress', 'completed']).optional(),
  is_completed: z.boolean().optional(),
  assignee_id: optionalObjectIdSchema,
  sprint_id: optionalObjectIdSchema,
  due_date: dateStringSchema.optional().nullable(),
});

// ===================
// Comment Schemas
// ===================

export const createCommentSchema = z.object({
  task_id: objectIdSchema,
  content: z.string().min(1, 'Comment cannot be empty').max(5000),
  parent_comment_id: optionalObjectIdSchema,
});

export const updateCommentSchema = z.object({
  content: z.string().min(1).max(5000),
});

// ===================
// Document Comment Schemas
// ===================

export const createDocumentCommentSchema = z.object({
  section_id: z.string().min(1, 'Section ID is required'),
  text: z.string().min(1, 'Comment text is required').max(5000),
  mentions: z.array(objectIdSchema).optional(),
  parent_comment_id: optionalObjectIdSchema,
  selected_text: z.string().optional(),
  selection_id: z.string().optional(),
});

export const updateDocumentCommentSchema = z.object({
  text: z.string().min(1).max(5000),
  mentions: z.array(objectIdSchema).optional(),
});

// ===================
// Team Schemas
// ===================

export const createTeamSchema = z.object({
  name: z.string().min(1, 'Team name is required').max(100),
  description: z.string().max(500).optional(),
  organization_id: objectIdSchema,
  avatar_url: z.string().url().optional(),
  member_ids: z.array(objectIdSchema).optional(),
});

export const updateTeamSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  description: z.string().max(500).optional().nullable(),
  avatar_url: z.string().url().optional().nullable(),
});

export const addTeamMemberSchema = z.object({
  user_id: objectIdSchema,
  role: z.enum(['lead', 'member']).default('member'),
});

// ===================
// Tag Schemas
// ===================

export const createTagSchema = z.object({
  project_id: objectIdSchema,
  label: z.string().min(1, 'Tag label is required').max(50),
  color: z.string().regex(/^#[0-9A-Fa-f]{6}$/, 'Invalid color format').or(z.string()),
});

export const updateTagSchema = z.object({
  label: z.string().min(1).max(50).optional(),
  color: z.string().optional(),
});

// ===================
// Column Schemas
// ===================

export const createColumnSchema = z.object({
  project_id: objectIdSchema,
  title: z.string().min(1, 'Column title is required').max(50),
  color: z.string().optional(),
  is_default: z.boolean().optional(),
  display_order: z.number().optional(),
});

export const updateColumnSchema = z.object({
  title: z.string().min(1).max(50).optional(),
  color: z.string().optional(),
  is_default: z.boolean().optional(),
  display_order: z.number().optional(),
});

export const reorderColumnsSchema = z.object({
  project_id: objectIdSchema,
  column_ids: z.array(objectIdSchema).min(1),
});

// ===================
// Notification Schemas
// ===================

export const notificationTypeSchema = z.enum([
  'task_assigned',
  'task_mentioned',
  'comment_added',
  'comment_reply',
  'sprint_reminder',
  'project_update',
  'status_change',
  'due_date_reminder',
  'document_mentioned',
  'system'
]);

export const updateNotificationPreferencesSchema = z.object({
  email_enabled: z.boolean().optional(),
  email_digest_frequency: z.enum(['instant', 'daily', 'weekly', 'none']).optional(),
  email_task_assigned: z.boolean().optional(),
  email_task_mentioned: z.boolean().optional(),
  email_comment_added: z.boolean().optional(),
  email_comment_reply: z.boolean().optional(),
  email_sprint_reminder: z.boolean().optional(),
  email_project_updates: z.boolean().optional(),
  email_due_date_reminder: z.boolean().optional(),
  inapp_enabled: z.boolean().optional(),
  inapp_task_assigned: z.boolean().optional(),
  inapp_task_mentioned: z.boolean().optional(),
  inapp_comment_added: z.boolean().optional(),
  inapp_comment_reply: z.boolean().optional(),
  inapp_sprint_reminder: z.boolean().optional(),
  inapp_project_updates: z.boolean().optional(),
  inapp_status_change: z.boolean().optional(),
  quiet_hours_enabled: z.boolean().optional(),
  quiet_hours_start: z.string().regex(/^([01]\d|2[0-3]):([0-5]\d)$/).optional(),
  quiet_hours_end: z.string().regex(/^([01]\d|2[0-3]):([0-5]\d)$/).optional(),
  quiet_hours_timezone: z.string().optional(),
});

// ===================
// Query Schemas
// ===================

export const paginationSchema = z.object({
  page: z.coerce.number().min(1).default(1),
  limit: z.coerce.number().min(1).max(200).default(50),
  sortBy: z.string().optional(),
  sortOrder: z.enum(['asc', 'desc']).optional(),
});

export const taskFiltersSchema = z.object({
  project_id: optionalObjectIdSchema,
  sprint_id: optionalObjectIdSchema,
  assignee_id: optionalObjectIdSchema,
  reporter_id: optionalObjectIdSchema,
  user_id: optionalObjectIdSchema, // For "my tasks" - either assignee or reporter
  type: taskTypeSchema.optional(),
  priority: prioritySchema.optional(),
  column_id: columnIdSchema.optional(),
  search: z.string().optional(),
});

// ===================
// Validation Helper
// ===================

export type ValidationResult<T> = {
  success: true;
  data: T;
} | {
  success: false;
  error: string;
  details?: z.ZodError['errors'];
};

/**
 * Validate data against a Zod schema
 */
export function validate<T>(schema: z.ZodSchema<T>, data: unknown): ValidationResult<T> {
  const result = schema.safeParse(data);
  if (result.success) {
    return { success: true, data: result.data };
  }
  return {
    success: false,
    error: result.error.errors[0]?.message || 'Validation failed',
    details: result.error.errors,
  };
}

/**
 * Validate and throw on failure (for use in routes with error middleware)
 */
export function validateOrThrow<T>(schema: z.ZodSchema<T>, data: unknown): T {
  const result = schema.safeParse(data);
  if (!result.success) {
    const error = new Error(result.error.errors[0]?.message || 'Validation failed');
    (error as any).status = 400;
    (error as any).details = result.error.errors;
    throw error;
  }
  return result.data;
}
