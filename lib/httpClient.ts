/**
 * Centralized HTTP Client
 * Single source of truth for all API requests with automatic auth, error handling, and logging
 */

// Error classification for consistent error handling across the app
export type ErrorType = 'NETWORK' | 'AUTH' | 'VALIDATION' | 'NOT_FOUND' | 'SERVER' | 'UNKNOWN';

export class ApiError extends Error {
  type: ErrorType;
  status: number;
  details?: Record<string, any>;

  constructor(message: string, type: ErrorType, status: number, details?: Record<string, any>) {
    super(message);
    this.name = 'ApiError';
    this.type = type;
    this.status = status;
    this.details = details;
  }

  static fromResponse(status: number, data: any): ApiError {
    const message = data?.error || data?.message || 'An error occurred';

    if (status === 401 || status === 403) {
      return new ApiError(message, 'AUTH', status, data);
    }
    if (status === 404) {
      return new ApiError(message, 'NOT_FOUND', status, data);
    }
    if (status === 400 || status === 422) {
      return new ApiError(message, 'VALIDATION', status, data);
    }
    if (status >= 500) {
      return new ApiError(message, 'SERVER', status, data);
    }
    return new ApiError(message, 'UNKNOWN', status, data);
  }

  static networkError(originalError: Error): ApiError {
    return new ApiError(
      'Network error. Please check your connection.',
      'NETWORK',
      0,
      { originalError: originalError.message }
    );
  }
}

// Token storage key
const TOKEN_KEY = 'vulcan_token';

// API base URL
const API_BASE = import.meta.env.VITE_API_URL || '/api/v1';

// Logger for development
const isDev = import.meta.env.DEV;

function logRequest(method: string, url: string, body?: any) {
  if (isDev) {
    console.log(`%c[API] ${method} ${url}`, 'color: #3b82f6', body ? { body } : '');
  }
}

function logResponse(method: string, url: string, status: number, data: any, duration: number) {
  if (isDev) {
    const color = status >= 200 && status < 300 ? '#22c55e' : '#ef4444';
    console.log(`%c[API] ${method} ${url} → ${status} (${duration}ms)`, `color: ${color}`, data);
  }
}

function logError(method: string, url: string, error: ApiError) {
  if (isDev) {
    console.error(`%c[API] ${method} ${url} → ERROR`, 'color: #ef4444', error);
  }
}

// Get current auth token
export function getToken(): string | null {
  return localStorage.getItem(TOKEN_KEY);
}

// Set auth token
export function setToken(token: string): void {
  localStorage.setItem(TOKEN_KEY, token);
}

// Clear auth token
export function clearToken(): void {
  localStorage.removeItem(TOKEN_KEY);
}

// Check if user is authenticated
export function isAuthenticated(): boolean {
  return !!getToken();
}

// Get auth headers - single source of truth
export function getAuthHeaders(): HeadersInit {
  const token = getToken();
  const headers: HeadersInit = {
    'Content-Type': 'application/json',
  };
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }
  return headers;
}

// Standard API response wrapper
export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

// Request options
export interface RequestOptions extends Omit<RequestInit, 'body'> {
  body?: any;
  skipAuth?: boolean;
  rawResponse?: boolean;
}

/**
 * Make an HTTP request to the API
 */
async function request<T>(
  endpoint: string,
  options: RequestOptions = {}
): Promise<T> {
  const { body, skipAuth, rawResponse, ...fetchOptions } = options;
  const url = endpoint.startsWith('http') ? endpoint : `${API_BASE}${endpoint}`;
  const method = fetchOptions.method || 'GET';

  const headers: HeadersInit = {
    ...(!skipAuth ? getAuthHeaders() : { 'Content-Type': 'application/json' }),
    ...fetchOptions.headers,
  };

  const config: RequestInit = {
    ...fetchOptions,
    method,
    headers,
    ...(body && { body: JSON.stringify(body) }),
  };

  logRequest(method, url, body);
  const startTime = performance.now();

  try {
    const response = await fetch(url, config);
    const duration = Math.round(performance.now() - startTime);

    // Handle raw response (for things like file downloads)
    if (rawResponse) {
      logResponse(method, url, response.status, '[raw response]', duration);
      return response as unknown as T;
    }

    const data = await response.json();
    logResponse(method, url, response.status, data, duration);

    // Handle error responses
    if (!response.ok) {
      const error = ApiError.fromResponse(response.status, data);
      logError(method, url, error);
      throw error;
    }

    // Handle API-level error responses (success: false)
    if (data.success === false) {
      const error = ApiError.fromResponse(response.status, data);
      logError(method, url, error);
      throw error;
    }

    // Return data.data if it exists (standard API response), otherwise return data
    return (data.data !== undefined ? data.data : data) as T;
  } catch (error) {
    if (error instanceof ApiError) {
      throw error;
    }
    // Network errors
    const apiError = ApiError.networkError(error as Error);
    logError(method, url, apiError);
    throw apiError;
  }
}

/**
 * HTTP client with convenience methods
 */
export const httpClient = {
  /**
   * GET request
   */
  get<T>(endpoint: string, options?: RequestOptions): Promise<T> {
    return request<T>(endpoint, { ...options, method: 'GET' });
  },

  /**
   * POST request
   */
  post<T>(endpoint: string, body?: any, options?: RequestOptions): Promise<T> {
    return request<T>(endpoint, { ...options, method: 'POST', body });
  },

  /**
   * PATCH request
   */
  patch<T>(endpoint: string, body?: any, options?: RequestOptions): Promise<T> {
    return request<T>(endpoint, { ...options, method: 'PATCH', body });
  },

  /**
   * PUT request
   */
  put<T>(endpoint: string, body?: any, options?: RequestOptions): Promise<T> {
    return request<T>(endpoint, { ...options, method: 'PUT', body });
  },

  /**
   * DELETE request
   */
  delete<T = void>(endpoint: string, options?: RequestOptions): Promise<T> {
    return request<T>(endpoint, { ...options, method: 'DELETE' });
  },
};

/**
 * Build query string from params object
 */
export function buildQueryString(params: Record<string, any>): string {
  const searchParams = new URLSearchParams();
  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== '') {
      searchParams.append(key, String(value));
    }
  });
  const queryString = searchParams.toString();
  return queryString ? `?${queryString}` : '';
}

export default httpClient;
