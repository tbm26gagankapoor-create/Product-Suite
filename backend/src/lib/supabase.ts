import { createClient } from '@supabase/supabase-js';
import { config } from '../config/index.js';

// Admin client with service role key (bypasses RLS)
export const supabaseAdmin = createClient(
  config.supabase.url,
  config.supabase.serviceKey,
  {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  }
);

// Public client with anon key (respects RLS)
export const supabase = createClient(
  config.supabase.url,
  config.supabase.anonKey
);

export { config };
