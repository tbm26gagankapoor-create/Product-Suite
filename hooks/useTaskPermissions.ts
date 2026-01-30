/**
 * useTaskPermissions Hook
 *
 * React hook for checking task permissions in the UI.
 * Fetches and caches permissions for efficient UI rendering.
 */

import { useState, useEffect, useCallback } from 'react';
import { authorizationService } from '../auth/authorization.service';
import type { TaskPermissions } from '../auth/types';

interface UseTaskPermissionsOptions {
  userId: string;
  taskId: string;
  enabled?: boolean;
}

interface UseTaskPermissionsResult {
  permissions: TaskPermissions | null;
  isLoading: boolean;
  error: Error | null;
  refetch: () => Promise<void>;
}

const defaultPermissions: TaskPermissions = {
  canRead: false,
  canComment: false,
  canManageStages: false,
  canManageFields: false,
  canDelete: false,
  canAssign: false,
};

// Simple in-memory cache
const permissionsCache = new Map<string, { permissions: TaskPermissions; timestamp: number }>();
const CACHE_TTL = 60000; // 1 minute

function getCacheKey(userId: string, taskId: string): string {
  return `${userId}:${taskId}`;
}

export function useTaskPermissions({
  userId,
  taskId,
  enabled = true,
}: UseTaskPermissionsOptions): UseTaskPermissionsResult {
  const [permissions, setPermissions] = useState<TaskPermissions | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const fetchPermissions = useCallback(async () => {
    if (!enabled || !userId || !taskId) {
      setPermissions(defaultPermissions);
      setIsLoading(false);
      return;
    }

    const cacheKey = getCacheKey(userId, taskId);
    const cached = permissionsCache.get(cacheKey);

    // Return cached value if still valid
    if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
      setPermissions(cached.permissions);
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const perms = await authorizationService.getTaskPermissions(userId, taskId);
      permissionsCache.set(cacheKey, { permissions: perms, timestamp: Date.now() });
      setPermissions(perms);
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Failed to fetch permissions'));
      setPermissions(defaultPermissions);
    } finally {
      setIsLoading(false);
    }
  }, [userId, taskId, enabled]);

  useEffect(() => {
    fetchPermissions();
  }, [fetchPermissions]);

  return {
    permissions,
    isLoading,
    error,
    refetch: fetchPermissions,
  };
}

/**
 * Hook for checking a single permission
 */
export function useCanPerformAction(
  userId: string,
  taskId: string,
  action: keyof TaskPermissions
): { allowed: boolean; isLoading: boolean } {
  const { permissions, isLoading } = useTaskPermissions({ userId, taskId });

  return {
    allowed: permissions?.[action] ?? false,
    isLoading,
  };
}

/**
 * Clear permissions cache (useful after role changes)
 */
export function clearPermissionsCache(): void {
  permissionsCache.clear();
}

/**
 * Invalidate cache for a specific task
 */
export function invalidateTaskPermissions(taskId: string): void {
  for (const key of permissionsCache.keys()) {
    if (key.endsWith(`:${taskId}`)) {
      permissionsCache.delete(key);
    }
  }
}
