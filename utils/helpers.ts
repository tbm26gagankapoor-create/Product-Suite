/**
 * Helper Utilities
 */

export interface ApiResponse<T> {
  data: T | null;
  error: string | null;
}

export const handleResponse = <T>(
  data: T | null,
  error: any | null
): ApiResponse<T> => {
  if (error) {
    console.error('API Error:', error.message || error, error.details);
    return { data: null, error: error.message || String(error) };
  }
  return { data, error: null };
};

export const generateUUID = () => {
  return crypto.randomUUID();
};
