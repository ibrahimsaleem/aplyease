import { drizzle } from 'drizzle-orm/neon-serverless';
import { neonConfig, Pool } from '@neondatabase/serverless';
import * as schema from '../shared/schema';

if (!process.env.DATABASE_URL) {
  throw new Error('DATABASE_URL environment variable is not set');
}

// Configure neon for serverless environment
neonConfig.fetchConnectionCache = true;

// Configure WebSocket constructor for serverless environments
if (typeof globalThis.WebSocket === 'undefined') {
  // For Node.js environments where WebSocket is not available globally
  try {
    const ws = require('ws');
    neonConfig.webSocketConstructor = ws;
  } catch (error) {
    console.warn('WebSocket library not available, some features may not work');
  }
}

// Create connection pool with improved configuration
const pool = new Pool({ 
  connectionString: process.env.DATABASE_URL,
  max: 5, // Increased from 1 to handle more concurrent requests
  min: 1, // Keep at least one connection alive
  idleTimeoutMillis: 30000, // 30 seconds idle timeout
  connectionTimeoutMillis: 10000,
  maxUses: 7500, // Recycle connections after 7500 uses
  allowExitOnIdle: false, // Don't exit when idle
  ssl: process.env.NODE_ENV === "production" ? {
    rejectUnauthorized: false
  } : {
    rejectUnauthorized: true
  }
});

// Add connection error handling
pool.on('error', (err) => {
  console.error('Unexpected error on idle client', err);
  process.exit(-1);
});

// Add connection acquire error handling
pool.on('acquire', (client) => {
  console.log('Client acquired from pool');
});

pool.on('connect', (client) => {
  console.log('New client connected to database');
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