/**
 * Authorization Types
 *
 * Type definitions for the RBAC authorization model.
 */

// Entity types in the authorization model
export type EntityType = 'user' | 'platform' | 'tenant' | 'workspace' | 'task';

// Relations for each entity type
export type PlatformRelation = 'admin';
export type TenantRelation = 'platform' | 'admin' | 'member';
export type WorkspaceRelation = 'tenant' | 'admin' | 'member' | 'viewer';
export type TaskRelation = 'workspace' | 'reporter' | 'assignee';

// Permissions
export type PlatformPermission = 'can_read' | 'can_write' | 'can_manage';
export type TenantPermission = 'can_read' | 'can_write' | 'can_manage';
export type WorkspacePermission = 'can_read' | 'can_write' | 'can_manage';
export type TaskPermission =
  | 'can_read'
  | 'can_comment'
  | 'can_manage_stages'
  | 'can_manage_fields'
  | 'can_delete'
  | 'can_assign';

// Union types
export type Relation = PlatformRelation | TenantRelation | WorkspaceRelation | TaskRelation;
export type Permission =
  | PlatformPermission
  | TenantPermission
  | WorkspacePermission
  | TaskPermission;

// Tuple for relationship writes
export interface AuthorizationTuple {
  user: string;
  relation: Relation;
  object: string;
}

// Check request
export interface CheckRequest {
  user: string;
  relation: Permission;
  object: string;
}

// Check response
export interface CheckResponse {
  allowed: boolean;
}

// Batch check request
export interface BatchCheckRequest {
  checks: CheckRequest[];
}

// Batch check response
export interface BatchCheckResponse {
  results: { allowed: boolean; request: CheckRequest }[];
}

// Task permissions object (for UI)
export interface TaskPermissions {
  canRead: boolean;
  canComment: boolean;
  canManageStages: boolean;
  canManageFields: boolean;
  canDelete: boolean;
  canAssign: boolean;
}

// Workspace permissions object (for UI)
export interface WorkspacePermissions {
  canRead: boolean;
  canWrite: boolean;
  canManage: boolean;
}

// Permission context for a user
export interface UserPermissionContext {
  userId: string;
  taskPermissions: Map<string, TaskPermissions>;
  workspacePermissions: Map<string, WorkspacePermissions>;
}
