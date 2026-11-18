export interface DatabaseConfig {
  host: string;
  port: number;
  database: string;
  username: string;
  password: string;
  ssl: boolean;
  maxConnections: number;
  connectionTimeout: number;
  queryTimeout: number;
  retryAttempts: number;
  retryDelay: number;
}

export interface SupabaseConfig {
  url: string;
  anonKey: string;
  serviceRoleKey: string;
  jwtSecret: string;
  maxConnections: number;
  enableRealtime: boolean;
  realtimeConfig: {
    heartbeatInterval: number;
    reconnectInterval: number;
    maxReconnectAttempts: number;
  };
}

export interface PrismaConfig {
  databaseUrl: string;
  shadowDatabaseUrl?: string;
  logLevel: 'info' | 'query' | 'warn' | 'error';
  errorFormat: 'pretty' | 'colorless' | 'minimal';
  datasourceProvider: 'postgresql' | 'mysql' | 'sqlite';
}

export interface MigrationConfig {
  migrationsPath: string;
  seedPath: string;
  autoMigrate: boolean;
  backupBeforeMigration: boolean;
  maxMigrationTime: number;
}