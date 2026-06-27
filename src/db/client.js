import { createClient } from '@supabase/supabase-js';
import config from '../config/index.js';

if (!config.supabase.url || !config.supabase.anonKey) {
  throw new Error('Missing SUPABASE_URL or SUPABASE_ANON_KEY in environment');
}

const supabase = createClient(config.supabase.url, config.supabase.anonKey);

export default supabase;
