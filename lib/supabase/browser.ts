import { createBrowserClient } from '@supabase/ssr';
import { supabasePublishableKey, supabaseUrl } from './env';

export const browserSupabase = () =>
  createBrowserClient(supabaseUrl(), supabasePublishableKey());
