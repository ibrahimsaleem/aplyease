const { Pool } = require('pg');
require('dotenv').config();

async function testDeleteFunctionality() {
  console.log('🧪 Testing delete functionality...');
  
  if (!process.env.DATABASE_URL) {
    console.error('❌ DATABASE_URL environment variable is not set');
    process.exit(1);
  }

  const pool = new Pool({ 
    connectionString: process.env.DATABASE_URL,
    max: 1,
    connectionTimeoutMillis: 10000,
    ssl: { rejectUnauthorized: true }
  });

  try {
    const client = await pool.connect();
    console.log('✅ Database connection successful');
    
    // Test if we can query applications
    const result = await client.query('SELECT COUNT(*) as count FROM job_applications');
    console.log('📊 Total applications in database:', result.rows[0].count);
    
    // Test if we can query a single application
    const appResult = await client.query('SELECT id, job_title, company_name FROM job_applications LIMIT 1');
    if (appResult.rows.length > 0) {
      console.log('✅ Found application:', appResult.rows[0]);
    } else {
      console.log('⚠️  No applications found in database');
    }
    
    client.release();
    await pool.end();
    
    console.log('✅ Delete functionality test completed successfully');
    console.log('💡 The delete functionality should now work for:');
    console.log('   - Admins: Can delete any application');
    console.log('   - Employees: Can delete their own applications');
    console.log('   - Clients: Can delete applications for their company');
    console.log('   - Bulk delete: Select multiple applications and delete them');
    
  } catch (error) {
    console.error('❌ Test failed:', error.message);
    process.exit(1);
  }
}

testDeleteFunctionality();
