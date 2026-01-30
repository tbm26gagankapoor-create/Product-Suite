
import { useEffect, useRef } from 'react';
import { supabase } from '../lib/supabase';
import { Task, Comment, Sprint, Project } from '../types/database.types';

// Payload types for INSERT, UPDATE, DELETE events
export interface RealtimePayload<T> {
  eventType: 'INSERT' | 'UPDATE' | 'DELETE';
  new: T | null;
  old: T | null;
}

// General realtime subscription hook
export function useSupabaseSubscription<T>(
  table: string,
  filter: { column: string; value: string } | undefined,
  callback: (payload: RealtimePayload<T>) => void
): () => void {
  const callbackRef = useRef(callback);
  const channelRef = useRef<ReturnType<typeof supabase.channel> | null>(null);

  // Keep callback ref fresh
  useEffect(() => {
    callbackRef.current = callback;
  }, [callback]);

  useEffect(() => {
    const channelName = `public:${table}:${filter ? `${filter.column}=${filter.value}` : 'all'}`;
    
    const channel = supabase
      .channel(channelName)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: table,
          filter: filter ? `${filter.column}=eq.${filter.value}` : undefined,
        },
        (payload) => {
          const formattedPayload: RealtimePayload<T> = {
            eventType: payload.eventType as 'INSERT' | 'UPDATE' | 'DELETE',
            new: payload.new as T | null,
            old: payload.old as T | null,
          };
          callbackRef.current(formattedPayload);
        }
      )
      .subscribe();

    channelRef.current = channel;

    return () => {
      supabase.removeChannel(channel);
      channelRef.current = null;
    };
  }, [table, filter?.column, filter?.value]);

  // Return a cleanup function that specifically unsubscribes this channel
  return () => {
    if (channelRef.current) {
      supabase.removeChannel(channelRef.current);
      channelRef.current = null;
    }
  };
}

// Subscribe to task changes in a project
export function useTasksRealtime(projectId: string, onUpdate: (payload: RealtimePayload<Task>) => void): void {
  useSupabaseSubscription<Task>(
    'tasks',
    { column: 'project_id', value: projectId },
    onUpdate
  );
}

// Subscribe to comments on a task
export function useCommentsRealtime(taskId: string, onUpdate: (payload: RealtimePayload<Comment>) => void): void {
  useSupabaseSubscription<Comment>(
    'comments',
    { column: 'task_id', value: taskId },
    onUpdate
  );
}

// Subscribe to sprint changes
export function useSprintsRealtime(projectId: string, onUpdate: (payload: RealtimePayload<Sprint>) => void): void {
  useSupabaseSubscription<Sprint>(
    'sprints',
    { column: 'project_id', value: projectId },
    onUpdate
  );
}

// Subscribe to project changes
export function useProjectRealtime(projectId: string, onUpdate: (payload: RealtimePayload<Project>) => void): void {
  useSupabaseSubscription<Project>(
    'projects',
    { column: 'id', value: projectId },
    onUpdate
  );
}
