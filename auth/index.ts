/**
 * Authorization Module
 *
 * Re-exports all authorization-related functionality.
 */

// Client
export { fgaClient, fgaConfig } from './openfga-client';
export {
  formatUser,
  formatPlatform,
  formatTenant,
  formatWorkspace,
  formatTask,
} from './openfga-client';

// Service
export { authorizationService, AuthorizationService } from './authorization.service';

// Types
export type {
  EntityType,
  PlatformRelation,
  TenantRelation,
  WorkspaceRelation,
  TaskRelation,
  PlatformPermission,
  TenantPermission,
  WorkspacePermission,
  TaskPermission,
  Relation,
  Permission,
  AuthorizationTuple,
  CheckRequest,
  CheckResponse,
  TaskPermissions,
  WorkspacePermissions,
  UserPermissionContext,
} from './types';
