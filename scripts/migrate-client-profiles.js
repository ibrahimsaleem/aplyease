const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: false
});

async function migrateClientProfiles() {
  const client = await pool.connect();
  
  try {
    console.log('🔄 Starting client profile migration...');
    
    // First, check if client_profiles table exists, if not create it
    const tableExists = await client.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_name = 'client_profiles'
      );
    `);
    
    if (!tableExists.rows[0].exists) {
      console.log('📋 Creating client_profiles table...');
      await client.query(`
        CREATE TABLE client_profiles (
          user_id UUID PRIMARY KEY REFERENCES users(id),
          full_name TEXT NOT NULL,
          contact_email TEXT,
          contact_password TEXT,
          phone_number TEXT NOT NULL,
          mailing_address TEXT NOT NULL,
          situation TEXT NOT NULL,
          services_requested TEXT NOT NULL DEFAULT '[]',
          application_quota INTEGER NOT NULL DEFAULT 0,
          start_date DATE,
          search_scope TEXT NOT NULL DEFAULT '[]',
          states TEXT NOT NULL DEFAULT '[]',
          cities TEXT NOT NULL DEFAULT '[]',
          desired_titles TEXT NOT NULL,
          target_companies TEXT,
          resume_url TEXT,
          linkedin_url TEXT,
          work_authorization TEXT NOT NULL,
          sponsorship_answer TEXT NOT NULL,
          additional_notes TEXT,
          base_resume_latex TEXT,
          created_at TIMESTAMP DEFAULT NOW() NOT NULL,
          updated_at TIMESTAMP DEFAULT NOW() NOT NULL
        );
      `);
      
      await client.query(`
        CREATE INDEX idx_client_profiles_user ON client_profiles(user_id);
      `);
    }
    
    // Get all users with client profile data
    console.log('📊 Fetching users with profile data...');
    const users = await client.query(`
      SELECT 
        id, name, email,
        contact_email, preferred_job_title, preferred_location, phone, mailing_address,
        situation, services, applications_desired, preferred_start_date,
        search_anywhere_us, search_remote_only, specific_states, specific_cities,
        desired_job_titles, target_industries, resume_url, linkedin_url,
        work_authorization, sponsorship_required, additional_notes,
        job_email, job_email_password
      FROM users 
      WHERE role = 'CLIENT' 
      AND (
        phone IS NOT NULL OR 
        mailing_address IS NOT NULL OR 
        situation IS NOT NULL OR 
        desired_job_titles IS NOT NULL
      )
    `);
    
    console.log(`📋 Found ${users.rows.length} clients with profile data`);
    
    let migrated = 0;
    let skipped = 0;
    
    for (const user of users.rows) {
      try {
        // Check if profile already exists
        const existing = await client.query(
          'SELECT user_id FROM client_profiles WHERE user_id = $1',
          [user.id]
        );
        
        if (existing.rows.length > 0) {
          console.log(`⏭️  Skipping ${user.name} - profile already exists`);
          skipped++;
          continue;
        }
        
        // Map old fields to new structure
        const searchScope = [];
        if (user.search_anywhere_us) searchScope.push('Anywhere in the U.S.');
        if (user.search_remote_only) searchScope.push('Remote-only');
        if (user.specific_states) searchScope.push('Specific states');
        if (user.specific_cities) searchScope.push('Specific cities');
        
        const servicesRequested = user.services ? user.services.split(',').map(s => s.trim()) : [];
        
        const states = user.specific_states ? user.specific_states.split(',').map(s => s.trim()) : [];
        const cities = user.specific_cities ? user.specific_cities.split(',').map(s => s.trim()) : [];
        
        // Insert into client_profiles
        await client.query(`
          INSERT INTO client_profiles (
            user_id, full_name, contact_email, contact_password, phone_number,
            mailing_address, situation, services_requested, application_quota,
            start_date, search_scope, states, cities, desired_titles,
            target_companies, resume_url, linkedin_url, work_authorization,
            sponsorship_answer, additional_notes, base_resume_latex
          ) VALUES (
            $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21
          )
        `, [
          user.id,
          user.name,
          user.contact_email || user.job_email,
          user.job_email_password,
          user.phone || '',
          user.mailing_address || '',
          user.situation || '',
          JSON.stringify(servicesRequested),
          user.applications_desired || 0,
          user.preferred_start_date,
          JSON.stringify(searchScope),
          JSON.stringify(states),
          JSON.stringify(cities),
          user.desired_job_titles || user.preferred_job_title || '',
          user.target_industries,
          user.resume_url,
          user.linkedin_url,
          user.work_authorization || '',
          user.sponsorship_required || '',
          user.additional_notes,
          null // base_resume_latex - will be filled by users later
        ]);
        
        console.log(`✅ Migrated profile for ${user.name}`);
        migrated++;
        
      } catch (error) {
        console.error(`❌ Error migrating ${user.name}:`, error.message);
      }
    }
    
    console.log(`\n🎉 Migration complete!`);
    console.log(`✅ Migrated: ${migrated} profiles`);
    console.log(`⏭️  Skipped: ${skipped} profiles (already existed)`);
    console.log(`📊 Total processed: ${users.rows.length} users`);
    
  } catch (error) {
    console.error('❌ Migration failed:', error);
    throw error;
  } finally {
    client.release();
    await pool.end();
  }
}

// Run migration
migrateClientProfiles()
  .then(() => {
    console.log('🚀 Migration script completed successfully');
    process.exit(0);
  })
  .catch((error) => {
    console.error('💥 Migration script failed:', error);
    process.exit(1);
  });
