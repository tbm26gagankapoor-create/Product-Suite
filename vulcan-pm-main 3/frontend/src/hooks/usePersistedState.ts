import { useState, useEffect, useCallback } from 'react';

type StorageType = 'localStorage' | 'sessionStorage' | 'url';

interface UsePersistedStateOptions<T> {
  key: string;
  storage?: StorageType;
  serialize?: (value: T) => string;
  deserialize?: (value: string) => T;
  syncAcrossTabs?: boolean;
}

/**
 * Hook for persisting state to localStorage, sessionStorage, or URL params
 */
export function usePersistedState<T>(
  initialValue: T,
  options: UsePersistedStateOptions<T>
): [T, (value: T | ((prev: T) => T)) => void, () => void] {
  const {
    key,
    storage = 'localStorage',
    serialize = JSON.stringify,
    deserialize = JSON.parse,
    syncAcrossTabs = true,
  } = options;

  // Initialize state from storage
  const getStoredValue = useCallback((): T => {
    try {
      if (storage === 'url') {
        const params = new URLSearchParams(window.location.search);
        const urlValue = params.get(key);
        return urlValue !== null ? deserialize(urlValue) : initialValue;
      }

      const storageApi = storage === 'localStorage' ? localStorage : sessionStorage;
      const item = storageApi.getItem(key);
      return item !== null ? deserialize(item) : initialValue;
    } catch (error) {
      console.warn(`Error reading persisted state for key "${key}":`, error);
      return initialValue;
    }
  }, [key, storage, deserialize, initialValue]);

  const [state, setState] = useState<T>(getStoredValue);

  // Update storage when state changes
  const setPersistedState = useCallback(
    (value: T | ((prev: T) => T)) => {
      setState((prevState) => {
        const newValue = typeof value === 'function'
          ? (value as (prev: T) => T)(prevState)
          : value;

        try {
          if (storage === 'url') {
            const params = new URLSearchParams(window.location.search);

            // Remove param if value equals initial value
            if (JSON.stringify(newValue) === JSON.stringify(initialValue)) {
              params.delete(key);
            } else {
              params.set(key, serialize(newValue));
            }

            // Update URL without page reload
            const newUrl = params.toString()
              ? `${window.location.pathname}?${params.toString()}`
              : window.location.pathname;
            window.history.replaceState({}, '', newUrl);
          } else {
            const storageApi = storage === 'localStorage' ? localStorage : sessionStorage;

            // Remove from storage if value equals initial value
            if (JSON.stringify(newValue) === JSON.stringify(initialValue)) {
              storageApi.removeItem(key);
            } else {
              storageApi.setItem(key, serialize(newValue));
            }
          }
        } catch (error) {
          console.warn(`Error persisting state for key "${key}":`, error);
        }

        return newValue;
      });
    },
    [key, storage, serialize, initialValue]
  );

  // Clear persisted state
  const clearPersistedState = useCallback(() => {
    try {
      if (storage === 'url') {
        const params = new URLSearchParams(window.location.search);
        params.delete(key);
        const newUrl = params.toString()
          ? `${window.location.pathname}?${params.toString()}`
          : window.location.pathname;
        window.history.replaceState({}, '', newUrl);
      } else {
        const storageApi = storage === 'localStorage' ? localStorage : sessionStorage;
        storageApi.removeItem(key);
      }
      setState(initialValue);
    } catch (error) {
      console.warn(`Error clearing persisted state for key "${key}":`, error);
    }
  }, [key, storage, initialValue]);

  // Sync across tabs (localStorage only)
  useEffect(() => {
    if (storage !== 'localStorage' || !syncAcrossTabs) return;

    const handleStorageChange = (event: StorageEvent) => {
      if (event.key === key && event.newValue !== null) {
        try {
          setState(deserialize(event.newValue));
        } catch (error) {
          console.warn(`Error syncing persisted state for key "${key}":`, error);
        }
      } else if (event.key === key && event.newValue === null) {
        setState(initialValue);
      }
    };

    window.addEventListener('storage', handleStorageChange);
    return () => window.removeEventListener('storage', handleStorageChange);
  }, [key, storage, syncAcrossTabs, deserialize, initialValue]);

  // Handle URL changes (for browser back/forward)
  useEffect(() => {
    if (storage !== 'url') return;

    const handlePopState = () => {
      setState(getStoredValue());
    };

    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, [storage, getStoredValue]);

  return [state, setPersistedState, clearPersistedState];
}

/**
 * Hook for persisting filter state to URL params
 */
export function useUrlFilters<T extends Record<string, any>>(
  initialFilters: T
): [T, (filters: Partial<T>) => void, () => void] {
  const [filters, setFilters, clearFilters] = usePersistedState<T>(initialFilters, {
    key: 'filters',
    storage: 'url',
    serialize: (value) => {
      // Only include non-default values
      const filtered: Record<string, any> = {};
      for (const [k, v] of Object.entries(value)) {
        if (v !== initialFilters[k] && v !== '' && v !== undefined && v !== null) {
          filtered[k] = v;
        }
      }
      return JSON.stringify(filtered);
    },
    deserialize: (value) => {
      try {
        return { ...initialFilters, ...JSON.parse(value) };
      } catch {
        return initialFilters;
      }
    },
  });

  const updateFilters = useCallback(
    (newFilters: Partial<T>) => {
      setFilters((prev) => ({ ...prev, ...newFilters }));
    },
    [setFilters]
  );

  return [filters, updateFilters, clearFilters];
}

/**
 * Hook for persisting search query
 */
export function useSearchQuery(
  initialQuery = '',
  options?: { persist?: boolean; urlKey?: string }
): [string, (query: string) => void, () => void] {
  const { persist = false, urlKey = 'q' } = options || {};

  if (persist) {
    return usePersistedState(initialQuery, {
      key: urlKey,
      storage: 'url',
    });
  }

  const [query, setQuery] = useState(initialQuery);
  const clearQuery = useCallback(() => setQuery(''), []);

  return [query, setQuery, clearQuery];
}

/**
 * Hook for persisting sort state
 */
export function useSortState<T extends string>(
  initialField: T,
  initialDirection: 'asc' | 'desc' = 'asc',
  options?: { persist?: boolean }
): {
  sortField: T;
  sortDirection: 'asc' | 'desc';
  setSortField: (field: T) => void;
  setSortDirection: (direction: 'asc' | 'desc') => void;
  toggleSort: (field: T) => void;
  resetSort: () => void;
} {
  const { persist = false } = options || {};

  const [sortState, setSortState, resetSort] = usePersistedState(
    { field: initialField, direction: initialDirection },
    {
      key: 'sort',
      storage: persist ? 'url' : 'sessionStorage',
    }
  );

  const setSortField = useCallback(
    (field: T) => {
      setSortState((prev) => ({ ...prev, field }));
    },
    [setSortState]
  );

  const setSortDirection = useCallback(
    (direction: 'asc' | 'desc') => {
      setSortState((prev) => ({ ...prev, direction }));
    },
    [setSortState]
  );

  const toggleSort = useCallback(
    (field: T) => {
      setSortState((prev) => {
        if (prev.field === field) {
          return { ...prev, direction: prev.direction === 'asc' ? 'desc' : 'asc' };
        }
        return { field, direction: 'asc' };
      });
    },
    [setSortState]
  );

  return {
    sortField: sortState.field,
    sortDirection: sortState.direction,
    setSortField,
    setSortDirection,
    toggleSort,
    resetSort: () => resetSort(),
  };
}

export default usePersistedState;
