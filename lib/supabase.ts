
import { createClient } from '@supabase/supabase-js';
import { Database } from '../types/database.types';

// Read Supabase credentials from environment variables only
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY;
const serviceRoleKey = import.meta.env.VITE_SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
  throw new Error(
    'Missing Supabase environment variables. Please set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY in .env.local'
  );
}

// 1. Client-side Supabase client (Respects RLS)
export const supabase = createClient<Database>(supabaseUrl, supabaseKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
    storage: window.localStorage,
  },
});

// 2. Server-side / Admin Supabase client (Bypasses RLS)
export const supabaseAdmin = serviceRoleKey 
  ? createClient<Database>(supabaseUrl, serviceRoleKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false
      }
    }) 
  : null;
