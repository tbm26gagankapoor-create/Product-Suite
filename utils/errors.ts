/**
 * Error Utilities - Generic error handling
 */

// Custom error classes
export class ApiError extends Error {
  code: string;
  status: number;
  details?: any;

  constructor(message: string, code: string = 'INTERNAL_ERROR', status: number = 500, details?: any) {
    super(message);
    this.name = 'ApiError';
    this.code = code;
    this.status = status;
    this.details = details;
  }
}

export class NotFoundError extends ApiError {
  constructor(entity: string, id: string) {
    super(`${entity} with ID ${id} not found`, 'NOT_FOUND', 404);
  }
}

export class UnauthorizedError extends ApiError {
  constructor(message: string = 'Unauthorized access') {
    super(message, 'UNAUTHORIZED', 401);
  }
}

export class ForbiddenError extends ApiError {
  constructor(message: string = 'Access forbidden') {
    super(message, 'FORBIDDEN', 403);
  }
}

export class ValidationError extends ApiError {
  constructor(message: string, details?: any) {
    super(message, 'VALIDATION_ERROR', 400, details);
  }
}

// Generic error handler function
export function handleApiError(error: any): never {
  console.error('API Error:', error);

  if (error.code === 'PGRST116' || error.status === 404) {
    throw new NotFoundError('Resource', 'requested');
  }

  // Authorization errors
  if (error.code === '42501' || error.status === 403) {
    throw new ForbiddenError(error.message);
  }

  // Unique violation
  if (error.code === '23505') {
    throw new ValidationError('Duplicate entry', error.details);
  }

  // Foreign key violation
  if (error.code === '23503') {
    throw new ValidationError('Invalid reference', error.details);
  }

  throw new ApiError(error.message || 'An error occurred', error.code || 'UNKNOWN', error.status || 500, error.details);
}

// Legacy alias for backwards compatibility
export const handleSupabaseError = handleApiError;

// Result wrapper type
export type Result<T> = { data: T; error: null } | { data: null; error: ApiError };

// Async wrapper with error handling
export async function withErrorHandling<T>(fn: () => Promise<T>): Promise<Result<T>> {
  try {
    const data = await fn();
    return { data, error: null };
  } catch (err: any) {
    if (err instanceof ApiError) {
      return { data: null, error: err };
    }
    // Fallback for unknown errors
    const unknownError = new ApiError(err.message || 'An unexpected error occurred', 'UNKNOWN', 500, err);
    return { data: null, error: unknownError };
  }
}
