import { drizzle } from 'drizzle-orm/neon-serverless';
import { Pool } from '@neondatabase/serverless';
import * as schema from '../shared/schema';

if (!process.env.DATABASE_URL) {
  throw new Error('DATABASE_URL environment variable is not set');
}

// Create connection pool with proper SSL configuration for production
const pool = new Pool({ 
  connectionString: process.env.DATABASE_URL,
  connectionTimeoutMillis: 10000,
  maxUses: 1,  // Create new connection for each request
  idleTimeoutMillis: 0, // Disable connection pooling for serverless
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