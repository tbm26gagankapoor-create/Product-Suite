
import { PostgrestError } from '@supabase/supabase-js';

export interface ApiResponse<T> {
  data: T | null;
  error: string | null;
}

export const handleResponse = <T>(
  data: T | null, 
  error: PostgrestError | null
): ApiResponse<T> => {
  if (error) {
    console.error('Supabase API Error:', error.message, error.details);
    return { data: null, error: error.message };
  }
  return { data, error: null };
};

export const generateUUID = () => {
  return crypto.randomUUID();
};
