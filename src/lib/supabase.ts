import { createClient, SupabaseClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || '';
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || '';

export const isSupabaseConfigured = (): boolean => {
  return Boolean(
    supabaseUrl &&
    supabaseUrl.startsWith('https://') &&
    !supabaseUrl.includes('placeholder.supabase.co') &&
    !supabaseUrl.includes('your-project.supabase.co') &&
    supabaseUrl !== 'MY_SUPABASE_URL' &&
    supabaseAnonKey &&
    supabaseAnonKey !== 'MY_SUPABASE_ANON_KEY' &&
    supabaseAnonKey !== 'placeholder-anon-key'
  );
};

// Create Supabase Client instance
export const supabase: SupabaseClient = createClient(
  isSupabaseConfigured() ? supabaseUrl : 'https://placeholder.supabase.co',
  isSupabaseConfigured() ? supabaseAnonKey : 'placeholder-anon-key',
  {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
    },
  }
);
