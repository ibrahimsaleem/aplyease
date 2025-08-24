# AplyEase - Quick Commands Reference

## 🚀 **Essential Commands**

### **Development**
```bash
# Install dependencies
npm install

# Start development server (both client & server)
npm run dev

# Start only the production server
npm start

# Type checking
npm run check
```

### **Building**
```bash
# Build for production
npm run build

# Build server only
npm run build:server

# Copy shared files
npm run copy-shared
```

### **Database Operations**
```bash
# Apply schema changes to database
npx drizzle-kit push

# Seed demo data
npx tsx scripts/seed.ts

# Generate migration files (if needed)
npx drizzle-kit generate
```

## 🔧 **Environment Setup**

### **Local Development**
```bash
# Set environment variables (PowerShell)
$env:DATABASE_URL='your-neon-database-url'
$env:SESSION_SECRET='your-secret-key'
$env:NODE_ENV='development'

# Start development
npm run dev
```

### **Production Environment**
```bash
# Set production environment
export NODE_ENV=production
export DATABASE_URL=your-neon-database-url
export SESSION_SECRET=your-secret-key

# Start production server
npm start
```

## 📦 **Deployment Commands**

### **Render.com (Recommended)**
```bash
# Push to GitHub (auto-deploys to Render)
git add .
git commit -m "your commit message"
git push origin main
```

### **Manual Deployment**
```bash
# Build the application
npm run build

# Start production server
npm start
```

## 🗄️ **Database Commands**

### **Neon PostgreSQL**
```bash
# Connect to database
psql 'your-neon-connection-string'

# Apply schema
npx drizzle-kit push

# Seed data
npx tsx scripts/seed.ts
```

### **Database Reset**
```bash
# Drop and recreate tables (careful!)
npx drizzle-kit drop
npx drizzle-kit push
npx tsx scripts/seed.ts
```

## 🔍 **Debugging Commands**

### **Check Build Output**
```bash
# Check if build was successful
ls dist/
ls dist/server/

# Check for TypeScript errors
npm run check
```

### **Check Dependencies**
```bash
# Check for outdated packages
npm outdated

# Update packages
npm update

# Check for security vulnerabilities
npm audit
```

## 📁 **File Management**

### **Clean Project**
```bash
# Remove build files
rm -rf dist/
rm -rf node_modules/

# Reinstall dependencies
npm install

# Rebuild
npm run build
```

### **Git Operations**
```bash
# Check status
git status

# Add all changes
git add .

# Commit changes
git commit -m "your message"

# Push to GitHub
git push origin main

# Check remote
git remote -v
```

## 🛠️ **Development Workflow**

### **Typical Development Session**
```bash
# 1. Start development
npm run dev

# 2. Make changes to code

# 3. Check for errors
npm run check

# 4. Test locally
# Open http://localhost:5000

# 5. Commit changes
git add .
git commit -m "feature: description"

# 6. Push to deploy
git push origin main
```

### **Adding New Features**
```bash
# 1. Update schema (if needed)
# Edit shared/schema.ts
npx drizzle-kit push

# 2. Update server routes
# Edit server/routes.ts

# 3. Update client components
# Edit client/src/components/

# 4. Test and deploy
npm run build
git add .
git commit -m "feat: new feature"
git push origin main
```

## 🔒 **Security Commands**

### **Generate Secrets**
```bash
# Generate session secret
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"

# Generate JWT secret
node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"
```

## 📊 **Monitoring Commands**

### **Check Application Status**
```bash
# Check if server is running
curl http://localhost:5000/api/auth/user

# Check database connection
# Look for connection errors in logs

# Check build output
ls -la dist/
```

## 🚨 **Troubleshooting**

### **Common Issues**
```bash
# Port already in use
netstat -ano | findstr :5000
taskkill /PID <PID> /F

# Database connection issues
# Check DATABASE_URL environment variable

# Build errors
rm -rf dist/
npm run build

# Dependency issues
rm -rf node_modules/
npm install
```

### **Reset Everything**
```bash
# Complete reset (use carefully!)
rm -rf dist/ node_modules/
npm install
npx drizzle-kit push
npx tsx scripts/seed.ts
npm run build
npm start
```

## 📝 **Quick Reference**

| Command | Purpose |
|---------|---------|
| `npm run dev` | Start development server |
| `npm run build` | Build for production |
| `npm start` | Start production server |
| `npx drizzle-kit push` | Apply database schema |
| `git push origin main` | Deploy to production |
| `npm run check` | Type checking |

## 🎯 **Best Practices**

1. **Always run `npm run check`** before committing
2. **Test locally** before pushing to production
3. **Use meaningful commit messages**
4. **Keep dependencies updated**
5. **Monitor application logs** for errors
6. **Backup database** before major changes
