const { Pool } = require('pg');
require('dotenv').config();

async function testDatabaseConnection() {
  console.log('🔍 Testing database connection...');
  
  if (!process.env.DATABASE_URL) {
    console.error('❌ DATABASE_URL environment variable is not set');
    process.exit(1);
  }

  const isSupabase = process.env.DATABASE_URL.includes('supabase.com');
  const pool = new Pool({ 
    connectionString: process.env.DATABASE_URL,
    max: 1,
    connectionTimeoutMillis: 10000,
    ssl: isSupabase ? { rejectUnauthorized: false } : undefined
  });

  try {
    const client = await pool.connect();
    console.log('✅ Database connection successful');
    
    const result = await client.query('SELECT NOW() as current_time');
    console.log('📅 Current database time:', result.rows[0].current_time);
    
    client.release();
    await pool.end();
    
    console.log('✅ Database test completed successfully');
  } catch (error) {
    console.error('❌ Database connection failed:', error.message);
    process.exit(1);
  }
}

testDatabaseConnection();
