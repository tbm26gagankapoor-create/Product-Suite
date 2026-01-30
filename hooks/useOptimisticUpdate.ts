import { useState, useCallback, useRef } from 'react';

interface OptimisticUpdateOptions<T> {
  onError?: (error: Error, previousState: T) => void;
  onSuccess?: (result: any) => void;
  rollbackOnError?: boolean;
}

interface OptimisticUpdateState<T> {
  isPending: boolean;
  error: Error | null;
  previousState: T | null;
}

/**
 * Hook for managing optimistic updates with automatic rollback
 */
export function useOptimisticUpdate<T>(
  initialState: T,
  options: OptimisticUpdateOptions<T> = {}
) {
  const { onError, onSuccess, rollbackOnError = true } = options;
  const [state, setState] = useState<T>(initialState);
  const [updateState, setUpdateState] = useState<OptimisticUpdateState<T>>({
    isPending: false,
    error: null,
    previousState: null,
  });
  const previousStateRef = useRef<T | null>(null);

  /**
   * Perform an optimistic update
   * @param optimisticState - The state to set immediately (optimistic)
   * @param asyncAction - The async function that performs the actual update
   */
  const update = useCallback(
    async <R>(
      optimisticState: T | ((prev: T) => T),
      asyncAction: () => Promise<R>
    ): Promise<R | undefined> => {
      // Store previous state for potential rollback
      const previous = state;
      previousStateRef.current = previous;

      // Apply optimistic update immediately
      const newState =
        typeof optimisticState === 'function'
          ? (optimisticState as (prev: T) => T)(previous)
          : optimisticState;

      setState(newState);
      setUpdateState({ isPending: true, error: null, previousState: previous });

      try {
        const result = await asyncAction();
        setUpdateState({ isPending: false, error: null, previousState: null });
        onSuccess?.(result);
        return result;
      } catch (error) {
        const err = error instanceof Error ? error : new Error(String(error));

        // Rollback to previous state on error
        if (rollbackOnError) {
          setState(previous);
        }

        setUpdateState({ isPending: false, error: err, previousState: null });
        onError?.(err, previous);
        return undefined;
      }
    },
    [state, onError, onSuccess, rollbackOnError]
  );

  /**
   * Manually rollback to previous state
   */
  const rollback = useCallback(() => {
    if (previousStateRef.current !== null) {
      setState(previousStateRef.current);
      previousStateRef.current = null;
    }
  }, []);

  /**
   * Clear any pending error
   */
  const clearError = useCallback(() => {
    setUpdateState((prev) => ({ ...prev, error: null }));
  }, []);

  return {
    state,
    setState,
    update,
    rollback,
    clearError,
    isPending: updateState.isPending,
    error: updateState.error,
  };
}

/**
 * Helper to create an optimistic updater for array items
 */
export function createArrayOptimisticUpdater<T extends { id: string }>(
  setItems: React.Dispatch<React.SetStateAction<T[]>>
) {
  return {
    /**
     * Optimistically add an item
     */
    add: async (item: T, apiCall: () => Promise<T>): Promise<T | null> => {
      const previousItems: T[] = [];

      // Optimistic add
      setItems((prev) => {
        previousItems.push(...prev);
        return [...prev, item];
      });

      try {
        const result = await apiCall();
        // Update with actual server response
        setItems((prev) =>
          prev.map((i) => (i.id === item.id ? result : i))
        );
        return result;
      } catch (error) {
        // Rollback
        setItems(previousItems);
        console.error('Failed to add item:', error);
        return null;
      }
    },

    /**
     * Optimistically update an item
     */
    update: async (
      id: string,
      updates: Partial<T>,
      apiCall: () => Promise<void>
    ): Promise<boolean> => {
      let previousItem: T | null = null;

      // Optimistic update
      setItems((prev) =>
        prev.map((item) => {
          if (item.id === id) {
            previousItem = item;
            return { ...item, ...updates };
          }
          return item;
        })
      );

      try {
        await apiCall();
        return true;
      } catch (error) {
        // Rollback
        if (previousItem) {
          setItems((prev) =>
            prev.map((item) => (item.id === id ? previousItem! : item))
          );
        }
        console.error('Failed to update item:', error);
        return false;
      }
    },

    /**
     * Optimistically delete an item
     */
    delete: async (id: string, apiCall: () => Promise<void>): Promise<boolean> => {
      let deletedItem: T | null = null;
      let deletedIndex: number = -1;

      // Optimistic delete
      setItems((prev) => {
        const index = prev.findIndex((item) => item.id === id);
        if (index !== -1) {
          deletedItem = prev[index];
          deletedIndex = index;
        }
        return prev.filter((item) => item.id !== id);
      });

      try {
        await apiCall();
        return true;
      } catch (error) {
        // Rollback
        if (deletedItem && deletedIndex !== -1) {
          setItems((prev) => {
            const newItems = [...prev];
            newItems.splice(deletedIndex, 0, deletedItem!);
            return newItems;
          });
        }
        console.error('Failed to delete item:', error);
        return false;
      }
    },

    /**
     * Optimistically move an item to a new position
     */
    move: async (
      id: string,
      newIndex: number,
      apiCall: () => Promise<void>
    ): Promise<boolean> => {
      let previousItems: T[] = [];

      // Optimistic move
      setItems((prev) => {
        previousItems = [...prev];
        const itemIndex = prev.findIndex((item) => item.id === id);
        if (itemIndex === -1) return prev;

        const newItems = [...prev];
        const [movedItem] = newItems.splice(itemIndex, 1);
        newItems.splice(newIndex, 0, movedItem);
        return newItems;
      });

      try {
        await apiCall();
        return true;
      } catch (error) {
        // Rollback
        setItems(previousItems);
        console.error('Failed to move item:', error);
        return false;
      }
    },
  };
}

/**
 * Custom hook for optimistic list operations
 */
export function useOptimisticList<T extends { id: string }>(initialItems: T[]) {
  const [items, setItems] = useState<T[]>(initialItems);
  const [pendingIds, setPendingIds] = useState<Set<string>>(new Set());

  const updater = createArrayOptimisticUpdater<T>(setItems);

  const add = useCallback(
    async (item: T, apiCall: () => Promise<T>) => {
      setPendingIds((prev) => new Set(prev).add(item.id));
      const result = await updater.add(item, apiCall);
      setPendingIds((prev) => {
        const newSet = new Set(prev);
        newSet.delete(item.id);
        return newSet;
      });
      return result;
    },
    [updater]
  );

  const update = useCallback(
    async (id: string, updates: Partial<T>, apiCall: () => Promise<void>) => {
      setPendingIds((prev) => new Set(prev).add(id));
      const result = await updater.update(id, updates, apiCall);
      setPendingIds((prev) => {
        const newSet = new Set(prev);
        newSet.delete(id);
        return newSet;
      });
      return result;
    },
    [updater]
  );

  const remove = useCallback(
    async (id: string, apiCall: () => Promise<void>) => {
      setPendingIds((prev) => new Set(prev).add(id));
      const result = await updater.delete(id, apiCall);
      setPendingIds((prev) => {
        const newSet = new Set(prev);
        newSet.delete(id);
        return newSet;
      });
      return result;
    },
    [updater]
  );

  const isPending = useCallback(
    (id: string) => pendingIds.has(id),
    [pendingIds]
  );

  return {
    items,
    setItems,
    add,
    update,
    remove,
    isPending,
    hasPendingOperations: pendingIds.size > 0,
  };
}

export default useOptimisticUpdate;
