import { drizzle } from 'drizzle-orm/neon-serverless';
import { neonConfig, Pool } from '@neondatabase/serverless';
import * as schema from '../shared/schema';

if (!process.env.DATABASE_URL) {
  throw new Error('DATABASE_URL environment variable is not set');
}

// Configure neon for serverless environment
neonConfig.fetchConnectionCache = true;

// Create connection pool with proper configuration for serverless
const pool = new Pool({ 
  connectionString: process.env.DATABASE_URL,
  max: 1, // Single connection for serverless
  idleTimeoutMillis: 0,
  connectionTimeoutMillis: 10000,
  ssl: process.env.NODE_ENV === "production" ? {
    rejectUnauthorized: false
  } : {
    rejectUnauthorized: true
  }
});

// Export the drizzle instance
export const db = drizzle(pool, { schema });

// Export a function to test the connection
export async function testConnection() {
  try {
    const client = await pool.connect();
    try {
      await client.query('SELECT 1');
      console.log('Database connection test successful');
      return true;
    } catch (error) {
      console.error('Database test connection failed:', error);
      return false;
    } finally {
      client.release();
    }
  } catch (error) {
    console.error('Failed to connect to database:', error);
    return false;
  }
}

// Test connection on startup
if (process.env.NODE_ENV === "production") {
  testConnection().then(success => {
    if (success) {
      console.log('Database connection established successfully');
    } else {
      console.error('Failed to establish database connection');
    }
  });
}