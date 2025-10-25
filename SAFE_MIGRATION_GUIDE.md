# Safe Client Profile Migration Guide

## 🚨 IMPORTANT: Data Loss Prevention

Your database already has client profile data in the `users` table. We need to migrate this data safely before removing the old columns.

## Option 1: Safe Migration (Recommended)

### Step 1: Run the Migration Script
```bash
node scripts/migrate-client-profiles.js
```

This script will:
- ✅ Create the `client_profiles` table
- ✅ Copy all existing client data from `users` table
- ✅ Preserve all existing data
- ✅ Handle missing fields gracefully

### Step 2: Verify Migration
Check that data was migrated correctly:
```sql
-- Check how many profiles were migrated
SELECT COUNT(*) FROM client_profiles;

-- Check a sample profile
SELECT * FROM client_profiles LIMIT 1;
```

### Step 3: Push Schema Changes
Now it's safe to run:
```bash
npm run db:push
```

The migration script will handle the data preservation, so you can safely remove the old columns.

## Option 2: Manual Migration (If Script Fails)

If the automated script doesn't work, you can manually migrate:

### Step 1: Create client_profiles table manually
```sql
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

CREATE INDEX idx_client_profiles_user ON client_profiles(user_id);
```

### Step 2: Copy data manually
```sql
INSERT INTO client_profiles (
  user_id, full_name, contact_email, contact_password, phone_number,
  mailing_address, situation, services_requested, application_quota,
  start_date, search_scope, states, cities, desired_titles,
  target_companies, resume_url, linkedin_url, work_authorization,
  sponsorship_answer, additional_notes
)
SELECT 
  id,
  name,
  COALESCE(contact_email, job_email),
  job_email_password,
  COALESCE(phone, ''),
  COALESCE(mailing_address, ''),
  COALESCE(situation, ''),
  COALESCE('["' || REPLACE(services, ',', '","') || '"]', '[]'),
  COALESCE(applications_desired, 0),
  preferred_start_date,
  CASE 
    WHEN search_anywhere_us THEN '["Anywhere in the U.S."]'
    WHEN search_remote_only THEN '["Remote-only"]'
    WHEN specific_states IS NOT NULL THEN '["Specific states"]'
    WHEN specific_cities IS NOT NULL THEN '["Specific cities"]'
    ELSE '[]'
  END,
  COALESCE('["' || REPLACE(specific_states, ',', '","') || '"]', '[]'),
  COALESCE('["' || REPLACE(specific_cities, ',', '","') || '"]', '[]'),
  COALESCE(desired_job_titles, preferred_job_title, ''),
  target_industries,
  resume_url,
  linkedin_url,
  COALESCE(work_authorization, ''),
  COALESCE(sponsorship_required, ''),
  additional_notes
FROM users 
WHERE role = 'CLIENT' 
AND (phone IS NOT NULL OR mailing_address IS NOT NULL OR situation IS NOT NULL);
```

### Step 3: Verify and push schema
```bash
npm run db:push
```

## Option 3: Keep Both Tables (Temporary)

If you want to be extra safe, you can:

1. **Don't run `npm run db:push` yet**
2. **Use the new client_profiles table alongside the old columns**
3. **Gradually migrate users to the new system**
4. **Remove old columns later when you're confident**

## What the Migration Script Does

The migration script maps old fields to new ones:

| Old Field (users table) | New Field (client_profiles) |
|-------------------------|----------------------------|
| `name` | `full_name` |
| `contact_email` or `job_email` | `contact_email` |
| `job_email_password` | `contact_password` |
| `phone` | `phone_number` |
| `mailing_address` | `mailing_address` |
| `situation` | `situation` |
| `services` | `services_requested` (JSON array) |
| `applications_desired` | `application_quota` |
| `preferred_start_date` | `start_date` |
| `search_anywhere_us` + `search_remote_only` | `search_scope` (JSON array) |
| `specific_states` | `states` (JSON array) |
| `specific_cities` | `cities` (JSON array) |
| `desired_job_titles` or `preferred_job_title` | `desired_titles` |
| `target_industries` | `target_companies` |
| `resume_url` | `resume_url` |
| `linkedin_url` | `linkedin_url` |
| `work_authorization` | `work_authorization` |
| `sponsorship_required` | `sponsorship_answer` |
| `additional_notes` | `additional_notes` |

## After Migration

Once the migration is complete:

1. ✅ All existing client data is preserved
2. ✅ New client profile system works
3. ✅ Old columns can be safely removed
4. ✅ No data loss occurs

## Troubleshooting

### If migration script fails:
- Check your `DATABASE_URL` environment variable
- Ensure you have write permissions to the database
- Check the console output for specific error messages

### If you lose data:
- The old columns are still there until you run `npm run db:push`
- You can re-run the migration script
- Check your database backups

### If you want to rollback:
- Don't run `npm run db:push`
- The old system will continue to work
- Remove the new client_profiles table if needed

## Next Steps

After successful migration:

1. ✅ Test the new client profile pages
2. ✅ Verify data appears correctly
3. ✅ Test the application form integration
4. ✅ Deploy to production

The new system is backward compatible - existing functionality continues to work even if clients haven't filled their profiles yet.
