import { createClient } from '@supabase/supabase-js';
import { logger } from '../utils/logger.js';

let supabase: any = null;

export const connectDatabase = async () => {
  try {
    const supabaseUrl = process.env.SUPABASE_URL;
    const supabaseKey = process.env.SUPABASE_ANON_KEY;

    if (!supabaseUrl || !supabaseKey) {
      throw new Error('Missing Supabase configuration');
    }

    supabase = createClient(supabaseUrl, supabaseKey);

    // Test the connection
    const { data, error } = await supabase.from('users').select('count').limit(1);
    
    if (error && error.code !== 'PGRST116') { // PGRST116 is "table not found" which is ok for initial setup
      throw error;
    }

    logger.info('Database connected successfully');
    return supabase;
  } catch (error) {
    logger.error('Database connection failed:', error);
    throw error;
  }
};

export const getDatabase = () => {
  if (!supabase) {
    throw new Error('Database not connected. Call connectDatabase() first.');
  }
  return supabase;
};