/**
 * Realtime Hooks - Stub for Local Backend
 *
 * Real-time subscriptions are not supported in the local backend.
 * These hooks are stubs that maintain the API but don't actually subscribe.
 */

import { useEffect } from 'react';

// Payload types for INSERT, UPDATE, DELETE events
export interface RealtimePayload<T> {
  eventType: 'INSERT' | 'UPDATE' | 'DELETE';
  new: T | null;
  old: T | null;
}

// General realtime subscription hook (stub)
export function useSupabaseSubscription<T>(
  table: string,
  filter: { column: string; value: string } | undefined,
  callback: (payload: RealtimePayload<T>) => void
): () => void {
  useEffect(() => {
    // Real-time subscriptions not available in local backend
    console.log(`[Realtime] Subscription to ${table} not available in local backend`);
    return () => {};
  }, [table, filter?.column, filter?.value]);

  return () => {};
}

// Subscribe to task changes in a project (stub)
export function useTasksRealtime(projectId: string, onUpdate: (payload: RealtimePayload<any>) => void): void {
  useSupabaseSubscription<any>(
    'tasks',
    { column: 'project_id', value: projectId },
    onUpdate
  );
}

// Subscribe to comments on a task (stub)
export function useCommentsRealtime(taskId: string, onUpdate: (payload: RealtimePayload<any>) => void): void {
  useSupabaseSubscription<any>(
    'comments',
    { column: 'task_id', value: taskId },
    onUpdate
  );
}

// Subscribe to sprint changes (stub)
export function useSprintsRealtime(projectId: string, onUpdate: (payload: RealtimePayload<any>) => void): void {
  useSupabaseSubscription<any>(
    'sprints',
    { column: 'project_id', value: projectId },
    onUpdate
  );
}

// Subscribe to project changes (stub)
export function useProjectRealtime(projectId: string, onUpdate: (payload: RealtimePayload<any>) => void): void {
  useSupabaseSubscription<any>(
    'projects',
    { column: 'id', value: projectId },
    onUpdate
  );
}
