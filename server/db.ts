import { drizzle } from 'drizzle-orm/node-postgres';
import { Pool } from 'pg';
import * as schema from '../shared/schema';

if (!process.env.DATABASE_URL) {
  throw new Error('DATABASE_URL environment variable is not set');
}

// Using node-postgres Pool for Supabase/Postgres with SSL

// Create connection pool with improved configuration
const isSupabase = process.env.DATABASE_URL && process.env.DATABASE_URL.includes('supabase.com');
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  max: 2, // Reduced for Supabase Session Pooler limits (free tier: 1-2 connections)
  min: 1,
  idleTimeoutMillis: 60000, // Increased to 60s to keep connections alive longer
  connectionTimeoutMillis: 20000, // Increased to 20s for pooler connections
  allowExitOnIdle: false,
  statement_timeout: 10000, // 10s timeout to prevent hung queries
  ssl: isSupabase ? { rejectUnauthorized: false } : false // Enable SSL for Supabase
});

// Add connection error handling with recovery
pool.on('error', (err: any) => {
  console.error('Unexpected error on idle client:', err.message);
  console.error('Error code:', err.code);
  // Don't exit immediately - allow app to recover and retry
  // Only exit on critical errors
  if (err.code === 'PROTOCOL_CONNECTION_LOST' || err.code === '57P01') {
    console.error('Critical database error detected, initiating graceful shutdown...');
    setTimeout(() => process.exit(1), 5000); // Give 5s for cleanup
  }
});

// Add connection acquire error handling
pool.on('acquire', (client) => {
  console.log('Client acquired from pool');
  // Log pool stats for monitoring
  console.log('Pool stats:', {
    total: pool.totalCount,
    idle: pool.idleCount,
    waiting: pool.waitingCount
  });
});

pool.on('connect', (client) => {
  console.log('New client connected to database');
});

pool.on('remove', (client) => {
  console.log('Client removed from pool');
});

// Export the drizzle instance
export const db = drizzle(pool, { schema });

// Enhanced connection test with retry logic
export async function testConnection(retries = 3): Promise<boolean> {
  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      const client = await pool.connect();
      try {
        await client.query('SELECT 1');
        console.log(`Database connection test successful (attempt ${attempt}/${retries})`);
        return true;
      } catch (error) {
        console.error(`Database test connection failed (attempt ${attempt}/${retries}):`, error);
        if (attempt === retries) return false;
      } finally {
        client.release();
      }
    } catch (error) {
      console.error(`Failed to connect to database (attempt ${attempt}/${retries}):`, error);
      if (attempt === retries) return false;
      
      // Wait before retrying (exponential backoff)
      await new Promise(resolve => setTimeout(resolve, Math.pow(2, attempt) * 1000));
    }
  }
  return false;
}

// Graceful shutdown function
export async function closeDatabase() {
  try {
    await pool.end();
    console.log('Database pool closed successfully');
  } catch (error) {
    console.error('Error closing database pool:', error);
  }
}

// Test connection on startup
if (process.env.NODE_ENV === "production") {
  testConnection().then(success => {
    if (success) {
      console.log('Database connection established successfully');
    } else {
      console.error('Failed to establish database connection after retries');
    }
  });
}

// Handle process termination gracefully
process.on('SIGINT', async () => {
  console.log('Received SIGINT, closing database connections...');
  await closeDatabase();
  process.exit(0);
});

process.on('SIGTERM', async () => {
  console.log('Received SIGTERM, closing database connections...');
  await closeDatabase();
  process.exit(0);
});