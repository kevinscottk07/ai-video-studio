import { SupabaseConfig, PrismaConfig } from '@ai-video-studio/types';

export const getSupabaseConfig = (): SupabaseConfig => {
  return {
    url: process.env.SUPABASE_URL || 'http://localhost:54321',
    anonKey: process.env.SUPABASE_ANON_KEY || '',
    serviceRoleKey: process.env.SUPABASE_SERVICE_ROLE_KEY || '',
    jwtSecret: process.env.SUPABASE_JWT_SECRET || '',
    maxConnections: parseInt(process.env.SUPABASE_MAX_CONNECTIONS || '10'),
    enableRealtime: process.env.SUPABASE_ENABLE_REALTIME === 'true',
    realtimeConfig: {
      heartbeatInterval: parseInt(process.env.SUPABASE_HEARTBEAT_INTERVAL || '30000'),
      reconnectInterval: parseInt(process.env.SUPABASE_RECONNECT_INTERVAL || '5000'),
      maxReconnectAttempts: parseInt(process.env.SUPABASE_MAX_RECONNECT_ATTEMPTS || '10'),
    },
  };
};

export const getPrismaConfig = (): PrismaConfig => {
  return {
    databaseUrl: process.env.DATABASE_URL || '',
    shadowDatabaseUrl: process.env.SHADOW_DATABASE_URL,
    logLevel: (process.env.PRISMA_LOG_LEVEL as 'info' | 'query' | 'warn' | 'error') || 'info',
    errorFormat: (process.env.PRISMA_ERROR_FORMAT as 'pretty' | 'colorless' | 'minimal') || 'pretty',
    datasourceProvider: (process.env.PRISMA_PROVIDER as 'postgresql' | 'mysql' | 'sqlite') || 'postgresql',
  };
};

export const getDatabaseUrl = (): string => {
  if (process.env.DATABASE_URL) {
    return process.env.DATABASE_URL;
  }
  
  // Fallback to Supabase URL construction
  const supabaseConfig = getSupabaseConfig();
  return `postgresql://postgres:${process.env.SUPABASE_DB_PASSWORD}@${supabaseConfig.url.replace('http://', '').replace('https://', '')}:5432/postgres`;
};