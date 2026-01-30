/**
 * OpenFGA Client Configuration
 *
 * This module initializes the OpenFGA client for authorization checks.
 * Configure via environment variables:
 * - VITE_OPENFGA_API_URL: OpenFGA server URL
 * - VITE_OPENFGA_STORE_ID: Store ID
 * - VITE_OPENFGA_MODEL_ID: Authorization model ID
 */

import { OpenFgaClient, CredentialsMethod } from '@openfga/sdk';

// Environment configuration
const config = {
  apiUrl: import.meta.env.VITE_OPENFGA_API_URL || 'http://localhost:8080',
  storeId: import.meta.env.VITE_OPENFGA_STORE_ID || '',
  authorizationModelId: import.meta.env.VITE_OPENFGA_MODEL_ID || '',
};

// Initialize OpenFGA client
export const fgaClient = new OpenFgaClient({
  apiUrl: config.apiUrl,
  storeId: config.storeId,
  authorizationModelId: config.authorizationModelId,
  credentials: {
    method: CredentialsMethod.None,
  },
});

// Helper to format entity IDs
export const formatUser = (userId: string) => `user:${userId}`;
export const formatPlatform = (platformId: string) => `platform:${platformId}`;
export const formatTenant = (tenantId: string) => `tenant:${tenantId}`;
export const formatWorkspace = (workspaceId: string) => `workspace:${workspaceId}`;
export const formatTask = (taskId: string) => `task:${taskId}`;

export { config as fgaConfig };
