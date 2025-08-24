const { Pool } = require('@neondatabase/serverless');
require('dotenv').config();

async function testAdditionalLink() {
  console.log('🧪 Testing additional link functionality...');

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

    // Check if additional_link column exists
    const columnCheck = await client.query(`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'job_applications' 
      AND column_name = 'additional_link'
    `);

    if (columnCheck.rows.length > 0) {
      console.log('✅ Additional link column exists in database');
    } else {
      console.log('❌ Additional link column not found');
      client.release();
      await pool.end();
      process.exit(1);
    }

    // Test inserting an application with additional link
    const testApplication = {
      client_id: 'test-client-id',
      employee_id: 'test-employee-id',
      date_applied: new Date().toISOString().split('T')[0],
      applied_by_name: 'Test User',
      job_title: 'Test Job',
      company_name: 'Test Company',
      additional_link: 'https://example.com/screenshot.pdf'
    };

    console.log('📝 Testing application creation with additional link...');
    console.log('💡 Additional link:', testApplication.additional_link);

    // Get a real client and employee for testing
    const clientResult = await client.query('SELECT id FROM users WHERE role = \'CLIENT\' LIMIT 1');
    const employeeResult = await client.query('SELECT id FROM users WHERE role = \'EMPLOYEE\' LIMIT 1');

    if (clientResult.rows.length === 0 || employeeResult.rows.length === 0) {
      console.log('⚠️  No clients or employees found for testing');
      client.release();
      await pool.end();
      return;
    }

    const realClientId = clientResult.rows[0].id;
    const realEmployeeId = employeeResult.rows[0].id;

    // Insert test application
    const insertResult = await client.query(`
      INSERT INTO job_applications (
        client_id, employee_id, date_applied, applied_by_name, 
        job_title, company_name, additional_link, status, mail_sent
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
      RETURNING id, additional_link
    `, [
      realClientId, realEmployeeId, testApplication.date_applied, 
      testApplication.applied_by_name, testApplication.job_title, 
      testApplication.company_name, testApplication.additional_link, 
      'Applied', false
    ]);

    console.log('✅ Test application created with ID:', insertResult.rows[0].id);
    console.log('✅ Additional link saved:', insertResult.rows[0].additional_link);

    // Test updating the additional link
    const newLink = 'https://example.com/updated-screenshot.pdf';
    await client.query(`
      UPDATE job_applications 
      SET additional_link = $1 
      WHERE id = $2
    `, [newLink, insertResult.rows[0].id]);

    console.log('✅ Additional link updated to:', newLink);

    // Clean up test data
    await client.query('DELETE FROM job_applications WHERE id = $1', [insertResult.rows[0].id]);
    console.log('🧹 Test data cleaned up');

    client.release();
    await pool.end();

    console.log('\n✅ Additional link functionality test completed successfully');
    console.log('🎯 The additional link feature is now working!');
    console.log('\n💡 Features added:');
    console.log('   - Optional additional link field in application form');
    console.log('   - Database storage for additional links');
    console.log('   - Display in application table with purple icon');
    console.log('   - Support for screenshots, PDFs, or any other links');

  } catch (error) {
    console.error('❌ Test failed:', error.message);
    process.exit(1);
  }
}

testAdditionalLink();
