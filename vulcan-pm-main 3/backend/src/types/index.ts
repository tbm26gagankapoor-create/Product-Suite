import { Request } from 'express';

// User types
export interface User {
  id: string;
  email: string;
  name: string;
  avatar_url?: string;
  auth_user_id: string;
  created_at: string;
  updated_at: string;
}

// Task types
export type TaskType = 'epic' | 'story' | 'task' | 'bug' | 'subtask';
export type Priority = 'lowest' | 'low' | 'medium' | 'high' | 'highest';

export interface Task {
  id: string;
  task_key: string;
  title: string;
  description?: string;
  type: TaskType;
  priority: Priority;
  status: string;
  column_id: string;
  project_id: string;
  sprint_id?: string;
  reporter_id: string;
  assignee_id?: string;
  parent_epic_id?: string;
  story_points?: number;
  due_date?: string;
  created_at: string;
  updated_at: string;
}

export interface TaskCreate {
  title: string;
  description?: string;
  type: TaskType;
  priority: Priority;
  column_id: string;
  project_id: string;
  sprint_id?: string;
  assignee_id?: string;
  parent_epic_id?: string;
  story_points?: number;
  due_date?: string;
}

export interface TaskUpdate {
  title?: string;
  description?: string;
  type?: TaskType;
  priority?: Priority;
  column_id?: string;
  sprint_id?: string;
  assignee_id?: string;
  parent_epic_id?: string;
  story_points?: number;
  due_date?: string;
}

// Comment types
export interface Comment {
  id: string;
  task_id: string;
  user_id: string;
  content: string;
  created_at: string;
  updated_at: string;
}

// Workspace/Project types
export interface Workspace {
  id: string;
  name: string;
  key: string;
  description?: string;
  tenant_id: string;
  created_at: string;
  updated_at: string;
}

// Tenant types
export interface Tenant {
  id: string;
  name: string;
  slug: string;
  created_at: string;
  updated_at: string;
}

// Permission types
export interface TaskPermissions {
  canRead: boolean;
  canComment: boolean;
  canManageStages: boolean;
  canManageFields: boolean;
  canDelete: boolean;
  canAssign: boolean;
}

export interface WorkspacePermissions {
  canRead: boolean;
  canWrite: boolean;
  canManage: boolean;
}

// Request with user
export interface AuthenticatedRequest extends Request {
  user?: User;
  userId?: string;
}

// API Response types
export interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: {
    code: string;
    message: string;
    details?: unknown;
  };
  meta?: {
    page?: number;
    limit?: number;
    total?: number;
  };
}

// Pagination
export interface PaginationParams {
  page: number;
  limit: number;
}
