import { drizzle } from 'drizzle-orm/neon-serverless';
import { Pool } from '@neondatabase/serverless';
import * as schema from '../shared/schema.js';

if (!process.env.DATABASE_URL) {
  throw new Error('DATABASE_URL environment variable is not set');
}

// Create connection pool with proper SSL configuration
const pool = new Pool({ 
  connectionString: process.env.DATABASE_URL,
  connectionTimeoutMillis: 10000,
  maxUses: 1,  // Create new connection for each request
  idleTimeoutMillis: 0, // Disable connection pooling for serverless
  ssl: {
    rejectUnauthorized: true
  }
});

// Export the drizzle instance
export const db = drizzle(pool, { schema });

// Export a function to test the connection
export async function testConnection() {
  const client = await pool.connect();
  try {
    await client.query('SELECT 1');
    return true;
  } catch (error) {
    console.error('Database test connection failed:', error);
    return false;
  } finally {
    client.release();
  }
}