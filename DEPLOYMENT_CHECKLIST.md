# Deployment Checklist - Database Connection Fix

## ✅ Pre-Deployment Steps

### 1. Install Dependencies (if not already installed)
```bash
npm install
```

### 2. Test Database Connection
```bash
npm run db:test-connection
```

This will:
- Test your current DATABASE_URL
- Try alternate ports (5432 ↔ 6543)
- Check DNS resolution
- Provide specific recommendations

### 3. Update Environment Variables

**Priority 1: Fix DATABASE_URL**

Current (broken with port 6543):
```bash
DATABASE_URL="postgresql://user:pass@host:6543/db"
```

**Recommended Fix - Use Direct Connection (Port 5432):**
```bash
DATABASE_URL="postgresql://user:pass@host:5432/db?sslmode=require"
```

**Priority 2: Remove Insecure SSL Setting**

If you have this environment variable, **REMOVE IT**:
```bash
NODE_TLS_REJECT_UNAUTHORIZED=0  # ❌ DELETE THIS
```

Our code now handles SSL properly without needing this insecure workaround.

**Priority 3: Verify Other Variables**
```bash
SESSION_SECRET="your-secure-random-string-here"
JWT_SECRET="your-secure-random-string-here"
NODE_ENV="production"
PORT="10000"  # or your preferred port
```

### 4. Build the Application
```bash
npm run build
```

### 5. Test Locally (Optional)
```bash
npm start
```

Then test login:
```bash
curl -X POST http://localhost:10000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"your-email","password":"your-password"}'
```

## 🚀 Deployment Steps

### For Render

1. Go to your Render dashboard
2. Navigate to your web service
3. Click "Environment" tab
4. Update these variables:
   - `DATABASE_URL`: Change port from 6543 to 5432, add `?sslmode=require`
   - Delete: `NODE_TLS_REJECT_UNAUTHORIZED` (if it exists)
5. Click "Save Changes"
6. Deploy latest commit (or it will auto-deploy)

### For Railway

1. Go to your Railway dashboard
2. Select your project
3. Go to Variables
4. Update:
   - `DATABASE_URL`: Change to port 5432 with SSL
   - Remove: `NODE_TLS_REJECT_UNAUTHORIZED`
5. Redeploy

### For Vercel/Netlify (Serverless)

If you're using serverless, you may need the pooler. Update:
```bash
DATABASE_URL="postgresql://user:pass@host:6543/db?sslmode=require&pgbouncer=true&connection_limit=1"
```

But verify port 6543 is accessible first with the test script.

### For Docker/Custom

Update your `.env` or environment configuration:
```bash
DATABASE_URL="postgresql://user:pass@host:5432/db?sslmode=require"
SESSION_SECRET="your-secret"
JWT_SECRET="your-secret"
NODE_ENV="production"
```

Then rebuild and restart:
```bash
docker-compose down
docker-compose build
docker-compose up -d
```

## ✅ Post-Deployment Verification

### 1. Check Server Logs

Look for these success messages:
```
✅ PostgreSQL session store initialized successfully with shared pool
✅ New client connected to database
✅ Database connection established successfully
🚀 Server running on port 10000
📊 Environment: production
```

**NO MORE** of these errors:
```
❌ Error: connect ECONNREFUSED <IP>:6543
❌ Session save error
❌ Login error
```

### 2. Test Login

**Via Browser:**
1. Go to your app's login page
2. Enter valid credentials
3. Click "Login"
4. Should redirect to dashboard ✅

**Via curl:**
```bash
curl -X POST https://your-app.com/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@aplyease.com","password":"your-password"}' \
  -v
```

Look for:
- HTTP 200 status code ✅
- `Set-Cookie: connect.sid=...` header ✅
- User object in response ✅
- JWT token in response ✅

### 3. Test Authenticated Request

```bash
curl -X GET https://your-app.com/api/auth/user \
  -H "Authorization: Bearer YOUR_JWT_TOKEN_HERE"
```

Should return user object, not "Authentication required" ✅

### 4. Monitor for a Few Minutes

Watch logs for:
- No more ECONNREFUSED errors ✅
- Successful database queries ✅
- Users able to log in ✅

## 🔧 Troubleshooting

### Issue: Still Getting ECONNREFUSED

**Quick Fix:**
```bash
# If on port 6543, switch to 5432
DATABASE_URL="postgresql://user:pass@host:5432/db?sslmode=require"
```

**Diagnostic:**
```bash
npm run db:test-connection
```

### Issue: SSL Certificate Error

**Fix:**
Add or update SSL mode in DATABASE_URL:
```bash
?sslmode=require
```

Or for some providers:
```bash
?sslmode=no-verify
```

### Issue: Can't Access Port 5432

**Check:**
1. Is port 5432 open in your database firewall?
2. Is your server's IP allowlisted?
3. Try port 6543 as fallback (if it's working)

**Get your server's IP:**
```bash
curl ifconfig.me
```

Then add this IP to your database's allowlist.

### Issue: Login Works But Then Expires Immediately

This was the original bug. If you still see this:
1. Verify DATABASE_URL is correct
2. Check that session store is using shared pool (check logs)
3. Ensure cookies are being set (check browser dev tools)

### Issue: Build Fails

**Missing dependencies:**
```bash
npm install
```

**TypeScript errors:**
```bash
npm run check
```

Fix any type errors before deploying.

## 📊 What Changed

### Files Modified:
1. ✅ `server/db.ts` - Unified connection pool, proper SSL
2. ✅ `server/auth.ts` - Uses shared pool for sessions
3. ✅ `scripts/test-db-connection.js` - New diagnostic tool
4. ✅ `package.json` - Added test script

### Key Improvements:
1. ✅ Single shared pool (no more dual pools)
2. ✅ Proper SSL/TLS validation
3. ✅ Automatic pooler detection (port 6543)
4. ✅ Better error messages
5. ✅ Connection keep-alive enabled
6. ✅ Diagnostic tooling

## 📞 Support

If you continue to have issues:

1. **Run diagnostics:**
   ```bash
   npm run db:test-connection
   ```

2. **Check logs** for specific errors

3. **Verify environment variables:**
   ```bash
   echo $DATABASE_URL | sed 's/:.*@/:****@/'  # Mask password
   ```

4. **Test network connectivity:**
   ```bash
   nc -vz your-db-host.com 5432
   nc -vz your-db-host.com 6543
   ```

5. **Review the full documentation:**
   - See `DATABASE_CONNECTION_FIX.md` for detailed explanation
   - See provider-specific guides in that file

## 🎉 Success Indicators

You'll know everything is working when:

✅ Login returns HTTP 200 with user and token
✅ Set-Cookie header is present in login response
✅ Subsequent requests work with JWT or session
✅ No ECONNREFUSED errors in logs
✅ "Session saved successfully" appears in logs
✅ Users can navigate the app after login

---

**Remember:** The issue was NOT with passwords or authentication logic. It was a database connectivity problem that prevented sessions from being saved, which made logins appear to fail.

**The fix:** Use a shared connection pool, proper SSL, and the right port (5432 for most cases).
