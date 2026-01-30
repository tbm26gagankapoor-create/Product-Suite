// ============================================
// DATABASE TYPES FOR INFINIA PRODUCTS
// TypeScript interfaces matching the SQL schema
// ============================================

// ============================================
// BASE TYPES
// ============================================

export type UUID = string;
export type Timestamp = string | Date;

// ============================================
// ENUMS
// ============================================

export type TagColor = 'purple' | 'blue' | 'yellow' | 'green' | 'red' | 'gray';
export type TaskType = 'feature' | 'task' | 'bug' | 'story';
export type SubtaskType = 'task' | 'bug';
export type Priority = 'HIGH' | 'MEDIUM' | 'LOW';
export type SprintStatus = 'planned' | 'active' | 'completed';
export type ProjectMemberRole = 'owner' | 'admin' | 'member' | 'viewer';
export type Theme = 'light' | 'dark' | 'system';
export type ActivityAction = 'created' | 'updated' | 'deleted' | 'moved' | 'assigned' | 'commented';
export type EntityType = 'task' | 'subtask' | 'comment' | 'sprint' | 'project' | 'user';

// ============================================
// DATABASE ENTITIES
// ============================================

export interface User {
  id: UUID;
  name: string;
  email: string;
  avatar_url: string | null;
  role: string | null;
  created_at: Timestamp;
  updated_at: Timestamp;
}

export interface Project {
  id: UUID;
  name: string;
  description: string | null;
  code: string;
  status: string;
  progress_percentage: number;
  is_favorite: boolean;
  owner_id: UUID | null;
  created_at: Timestamp;
  updated_at: Timestamp;
}

export interface ProjectMember {
  id: UUID;
  project_id: UUID;
  user_id: UUID;
  role: ProjectMemberRole;
  joined_at: Timestamp;
}

export interface ColumnStatus {
  id: UUID;
  project_id: UUID | null;
  title: string;
  display_order: number;
  color: string | null;
  is_default: boolean;
  created_at: Timestamp;
}

export interface Sprint {
  id: UUID;
  project_id: UUID;
  name: string;
  goal: string | null;
  start_date: string; // DATE
  end_date: string; // DATE
  status: SprintStatus;
  velocity: number | null;
  created_at: Timestamp;
  updated_at: Timestamp;
}

export interface Tag {
  id: UUID;
  project_id: UUID | null;
  label: string;
  color: TagColor;
  created_at: Timestamp;
}

export interface Task {
  id: UUID;
  project_id: UUID;
  column_id: UUID | null;
  sprint_id: UUID | null;
  assignee_id: UUID | null;
  reporter_id: UUID | null;
  task_number: number;
  title: string;
  description: string | null;
  type: TaskType;
  priority: Priority;
  points: number | null;
  estimate: string | null;
  time_spent: string | null;
  start_date: string | null; // DATE
  due_date: string | null; // DATE
  completed_at: Timestamp | null;
  impact_score: number | null;
  product_theme: string | null;
  image_url: string | null;
  has_description: boolean;
  created_at: Timestamp;
  updated_at: Timestamp;
}

export interface Subtask {
  id: UUID;
  parent_task_id: UUID;
  sprint_id: UUID | null;
  assignee_id: UUID | null;
  title: string;
  description: string | null;
  type: SubtaskType;
  status: string;
  is_completed: boolean;
  display_order: number;
  created_at: Timestamp;
  updated_at: Timestamp;
}

export interface TaskTag {
  id: UUID;
  task_id: UUID;
  tag_id: UUID;
  created_at: Timestamp;
}

export interface Comment {
  id: UUID;
  task_id: UUID;
  user_id: UUID;
  parent_comment_id: UUID | null;
  content: string;
  is_edited: boolean;
  created_at: Timestamp;
  updated_at: Timestamp;
}

export interface Attachment {
  id: UUID;
  task_id: UUID;
  uploaded_by: UUID;
  filename: string;
  file_url: string;
  file_type: string | null;
  file_size: number | null;
  created_at: Timestamp;
}

export interface ActivityLog {
  id: UUID;
  project_id: UUID | null;
  task_id: UUID | null;
  user_id: UUID | null;
  action: ActivityAction;
  entity_type: EntityType;
  entity_id: UUID | null;
  old_value: string | null;
  new_value: string | null;
  description: string | null;
  created_at: Timestamp;
}

export interface SprintRetrospective {
  id: UUID;
  sprint_id: UUID;
  what_went_well: string | null;
  what_to_improve: string | null;
  action_items: string | null;
  created_at: Timestamp;
  updated_at: Timestamp;
}

export interface UserPreference {
  id: UUID;
  user_id: UUID;
  theme: Theme;
  default_project_id: UUID | null;
  notification_email: boolean;
  notification_push: boolean;
  created_at: Timestamp;
  updated_at: Timestamp;
}

// ============================================
// VIEW TYPES (Denormalized for queries)
// ============================================

export interface TaskDetailed {
  id: UUID;
  task_number: number;
  task_key: string; // e.g., 'INF-101'
  title: string;
  description: string | null;
  type: TaskType;
  priority: Priority;
  points: number | null;
  estimate: string | null;
  time_spent: string | null;
  start_date: string | null;
  due_date: string | null;
  impact_score: number | null;
  product_theme: string | null;
  image_url: string | null;
  created_at: Timestamp;
  updated_at: Timestamp;
  project_id: UUID;
  project_name: string;
  project_code: string;
  column_id: UUID | null;
  column_title: string | null;
  sprint_id: UUID | null;
  sprint_name: string | null;
  assignee_id: UUID | null;
  assignee_name: string | null;
  assignee_avatar: string | null;
  comments_count: number;
  subtasks_count: number;
  subtasks_completed: number;
}

export interface SprintSummary {
  id: UUID;
  name: string;
  goal: string | null;
  start_date: string;
  end_date: string;
  status: SprintStatus;
  velocity: number | null;
  project_id: UUID;
  project_name: string;
  total_tasks: number;
  completed_tasks: number;
  total_points: number;
  completed_points: number;
}

export interface ProjectStats {
  id: UUID;
  name: string;
  code: string;
  status: string;
  progress_percentage: number;
  total_tasks: number;
  completed_tasks: number;
  active_sprints: number;
  team_size: number;
  high_priority_tasks: number;
}

// ============================================
// QUERY INPUT TYPES
// ============================================

export interface CreateUserInput {
  name: string;
  email: string;
  avatar_url?: string;
  role?: string;
}

export interface CreateProjectInput {
  name: string;
  description?: string;
  code: string;
  owner_id?: UUID;
}

export interface CreateSprintInput {
  project_id: UUID;
  name: string;
  goal?: string;
  start_date: string;
  end_date: string;
}

export interface CreateTaskInput {
  project_id: UUID;
  column_id?: UUID;
  sprint_id?: UUID;
  assignee_id?: UUID;
  reporter_id?: UUID;
  title: string;
  description?: string;
  type?: TaskType;
  priority?: Priority;
  points?: number;
  estimate?: string;
  start_date?: string;
  due_date?: string;
  impact_score?: number;
  product_theme?: string;
  image_url?: string;
}

export interface UpdateTaskInput {
  column_id?: UUID | null;
  sprint_id?: UUID | null;
  assignee_id?: UUID | null;
  title?: string;
  description?: string;
  type?: TaskType;
  priority?: Priority;
  points?: number;
  estimate?: string;
  time_spent?: string;
  start_date?: string;
  due_date?: string;
  impact_score?: number;
  product_theme?: string;
  image_url?: string;
}

export interface CreateSubtaskInput {
  parent_task_id: UUID;
  sprint_id?: UUID;
  assignee_id?: UUID;
  title: string;
  description?: string;
  type?: SubtaskType;
}

export interface CreateCommentInput {
  task_id: UUID;
  user_id: UUID;
  parent_comment_id?: UUID;
  content: string;
}

// ============================================
// FILTER & PAGINATION TYPES
// ============================================

export interface TaskFilters {
  project_id?: UUID;
  column_id?: UUID;
  sprint_id?: UUID;
  assignee_id?: UUID;
  type?: TaskType;
  priority?: Priority;
  search?: string;
  has_due_date?: boolean;
  overdue?: boolean;
}

export interface PaginationInput {
  page?: number;
  limit?: number;
  sort_by?: string;
  sort_order?: 'asc' | 'desc';
}

export interface PaginatedResult<T> {
  data: T[];
  total: number;
  page: number;
  limit: number;
  total_pages: number;
}
