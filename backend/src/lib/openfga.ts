import { OpenFgaClient, CredentialsMethod } from '@openfga/sdk';
import { config } from '../config/index.js';

// Initialize OpenFGA client
export const fgaClient = new OpenFgaClient({
  apiUrl: config.openfga.apiUrl,
  storeId: config.openfga.storeId,
  authorizationModelId: config.openfga.modelId,
  credentials: {
    method: CredentialsMethod.None,
  },
});

// Entity formatters
export const formatUser = (userId: string) => `user:${userId}`;
export const formatPlatform = (platformId: string) => `platform:${platformId}`;
export const formatTenant = (tenantId: string) => `tenant:${tenantId}`;
export const formatWorkspace = (workspaceId: string) => `workspace:${workspaceId}`;
export const formatTask = (taskId: string) => `task:${taskId}`;

// Types
export interface AuthTuple {
  user: string;
  relation: string;
  object: string;
}

// Write tuples
export async function writeTuples(tuples: AuthTuple[]): Promise<void> {
  await fgaClient.write({
    writes: tuples,
  });
}

// Delete tuples
export async function deleteTuples(tuples: AuthTuple[]): Promise<void> {
  await fgaClient.write({
    deletes: tuples,
  });
}

// Check permission
export async function checkPermission(
  user: string,
  relation: string,
  object: string
): Promise<boolean> {
  try {
    const response = await fgaClient.check({
      user,
      relation,
      object,
    });
    return response.allowed ?? false;
  } catch (error) {
    console.error('OpenFGA check error:', error);
    return false;
  }
}

// Batch check permissions
export async function batchCheck(
  checks: { user: string; relation: string; object: string }[]
): Promise<boolean[]> {
  const results = await Promise.all(
    checks.map((c) => checkPermission(c.user, c.relation, c.object))
  );
  return results;
}
