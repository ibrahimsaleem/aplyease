# Client Profile System - Deployment Guide

## Overview
This guide provides instructions for deploying the new client profile feature to your AplyEase application.

## What's Been Implemented

### 1. Database Changes
- **New Table**: `client_profiles` with 22 fields including:
  - Basic contact information (name, email, phone, address)
  - Job preferences (desired titles, target companies, locations)
  - Services and quota configuration
  - Work authorization details
  - Base resume LaTeX code storage
  - Arrays stored as JSON text (services, search scope, states, cities)

### 2. Backend API
- **GET** `/api/client-profiles` - List all client profiles (Employee/Admin only)
- **GET** `/api/client-profiles/:userId` - Get specific client profile
- **PUT** `/api/client-profiles/:userId` - Create/update client profile

### 3. Frontend Pages
- **`/profile`** - Client profile editor (Clients only)
- **`/clients`** - Client directory (Employee/Admin only)
- **`/clients/:clientId`** - Client detail view with LaTeX code display (Employee/Admin only)

### 4. Integrations
- Navigation header updated with Profile and Clients links
- Application form can load and use client profile data
- Copy-to-clipboard functionality for LaTeX code and credentials

## Deployment Steps

### Step 1: Push Database Schema
The new `client_profiles` table needs to be created in your database.

```bash
npm run db:push
```

This will use Drizzle Kit to synchronize your database schema with the updated schema definition.

### Step 2: Build the Application
```bash
npm run build
```

### Step 3: Deploy
Deploy using your preferred method (Render, Railway, Vercel, etc.)

The schema changes are backward compatible - existing functionality will continue to work even if clients haven't filled out their profiles yet.

## Testing Checklist

### As a Client User:
1. ✅ Login and navigate to "Profile" link in header
2. ✅ Fill out all profile fields including LaTeX code
3. ✅ Save profile successfully
4. ✅ Reload page and verify data persists
5. ✅ Update profile fields and verify changes save

### As an Employee User:
1. ✅ Login and navigate to "Clients" link in header
2. ✅ View list of all clients with their profile status
3. ✅ Search for clients by name, email, phone, or job title
4. ✅ Click on a client to view their detail page
5. ✅ View client's base resume LaTeX code
6. ✅ Copy LaTeX code to clipboard
7. ✅ Copy client credentials (email, password) if available
8. ✅ Click "Apply for This Client" button
9. ✅ In application form, select a client
10. ✅ Click "Use Profile Data" to auto-fill resume URL
11. ✅ Click "View Profile" to navigate to client detail

### As an Admin User:
- Same as Employee testing, plus:
1. ✅ Edit any client's profile from their detail page
2. ✅ View all client profiles in directory

## Database Migration Notes

The system uses Drizzle ORM which handles schema synchronization. The `client_profiles` table will be created with the following structure:

- **Primary Key**: `userId` (references `users.id`)
- **Indexes**: Single index on `userId`
- **JSON Fields**: `servicesRequested`, `searchScope`, `states`, `cities` (stored as text)
- **Timestamps**: `createdAt`, `updatedAt` (auto-managed)

## Data Flow

### Client Profile Creation/Update:
```
Client → /profile → Form Submission → PUT /api/client-profiles/:userId
→ Storage.upsertClientProfile() → Database (INSERT ON CONFLICT UPDATE)
```

### Employee Viewing Client Profile:
```
Employee → /clients/:clientId → GET /api/client-profiles/:userId
→ Storage.getClientProfile() → Returns profile with user data
```

### Using Profile in Application:
```
Employee → Select Client → Fetch Profile → Click "Use Profile Data"
→ Auto-fills resume URL field
```

## Security Features

1. **Authorization Checks**:
   - Clients can only view/edit their own profile
   - Employees/Admins can view all profiles
   - Employees/Admins can edit any profile

2. **Data Validation**:
   - Zod schemas validate all input
   - Required fields enforced
   - URL validation for links
   - Email validation

## Optional Enhancements

Consider these future improvements:

1. **File Upload**: Allow clients to upload resume PDF instead of just URL
2. **LaTeX Preview**: Add live preview of LaTeX resume rendering
3. **Profile Completeness**: Show progress bar for profile completion
4. **Notifications**: Alert employees when clients complete profiles
5. **Bulk Import**: Import client profiles from CSV
6. **Version History**: Track changes to client profiles over time

## Troubleshooting

### Profile Not Saving
- Check browser console for validation errors
- Verify DATABASE_URL is set correctly
- Check server logs for database connection issues

### LaTeX Code Not Displaying
- Ensure the code is saved in the `baseResumeLatex` field
- Check that special characters are properly escaped
- Verify the field has sufficient storage capacity

### "Use Profile Data" Button Not Working
- Ensure client has completed their profile
- Check that resume URL field is populated in profile
- Verify the client is selected before clicking button

## API Response Examples

### GET /api/client-profiles/:userId
```json
{
  "userId": "abc-123",
  "fullName": "John Doe",
  "phoneNumber": "+1234567890",
  "mailingAddress": "123 Main St, City, State 12345",
  "situation": "Employed (full-time)",
  "servicesRequested": ["Apply for jobs on my behalf", "Resume/CV optimization"],
  "applicationQuota": 500,
  "searchScope": ["Remote-only", "Specific states"],
  "states": ["California", "New York"],
  "cities": [],
  "desiredTitles": "Data Analyst, Business Analyst",
  "workAuthorization": "U.S. Citizen",
  "sponsorshipAnswer": "No",
  "baseResumeLatex": "\\documentclass{article}...",
  "createdAt": "2025-01-01T00:00:00Z",
  "updatedAt": "2025-01-02T00:00:00Z"
}
```

## Support

If you encounter issues:
1. Check the server logs for error messages
2. Verify all environment variables are set
3. Ensure database migrations completed successfully
4. Review the API endpoint responses in browser DevTools

