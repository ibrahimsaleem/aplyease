# Firebase Frontend Deployment Guide

This guide explains how to deploy the AplyEase frontend separately on Firebase Hosting while keeping the backend on your current platform.

## 🚀 Prerequisites

1. **Firebase CLI** installed:
   ```bash
   npm install -g firebase-tools
   ```

2. **Firebase Account** and project created

3. **Backend API** deployed and accessible

## 📋 Step-by-Step Deployment

### 1. Initialize Firebase Project

```bash
# Login to Firebase
firebase login

# Initialize Firebase in your project
firebase init hosting

# Select your Firebase project
# Set public directory to: dist
# Configure as single-page app: Yes
# Don't overwrite index.html: No
```

### 2. Configure Environment Variables

```bash
# Copy the example environment file
cp client/env.production.example client/.env.production

# Edit the file and set your backend API URL
# VITE_API_BASE_URL=https://your-backend-url.com
```

### 3. Build Frontend for Production

```bash
# Build only the frontend
npm run build:frontend
```

### 4. Deploy to Firebase

```bash
# Deploy to Firebase Hosting
firebase deploy --only hosting
```

## 🔧 Configuration Files

### Firebase Configuration (`firebase.json`)
- Serves static files from `dist` directory
- Handles SPA routing with fallback to `index.html`
- Optimizes caching for JS/CSS files

### Environment Variables
- `VITE_API_BASE_URL`: Your backend API URL
- Set in `client/.env.production` for production builds

## 🌐 CORS Configuration

Update your backend CORS settings to allow your Firebase domain:

```typescript
// In server/main.ts
app.use(cors({
  origin: (origin, callback) => {
    if (!origin) return callback(null, true);
    if (
      origin.endsWith('.firebaseapp.com') ||  // Add this
      origin.endsWith('.web.app') ||          // Add this
      origin.endsWith('.vercel.app') ||
      origin.endsWith('.onrender.com') ||
      origin === 'http://localhost:5173' ||
      origin === 'http://localhost:5000' ||
      process.env.NODE_ENV === 'development'
    ) {
      return callback(null, origin);
    }
    callback(new Error('Not allowed by CORS'));
  },
  credentials: true,
  methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization"]
}));
```

## 🔄 Deployment Workflow

### Development
```bash
# Start both frontend and backend
npm run dev
```

### Production Deployment
```bash
# 1. Deploy backend (your current process)
# 2. Build frontend
npm run build:frontend

# 3. Deploy frontend to Firebase
firebase deploy --only hosting
```

## 📱 Benefits of Separate Deployment

### Frontend Benefits
- **Global CDN**: Firebase provides fast global content delivery
- **Automatic HTTPS**: SSL certificates handled automatically
- **Easy Rollbacks**: Quick deployment rollbacks
- **Custom Domains**: Easy custom domain setup
- **Analytics**: Built-in Firebase Analytics

### Backend Benefits
- **Independent Scaling**: Scale frontend and backend separately
- **Cost Optimization**: Pay only for what you use
- **Technology Flexibility**: Use different platforms for each
- **Maintenance**: Update frontend without affecting backend

## 🔍 Troubleshooting

### Common Issues

1. **CORS Errors**
   - Ensure backend CORS includes Firebase domains
   - Check `VITE_API_BASE_URL` is correct

2. **404 on Refresh**
   - Firebase hosting should handle SPA routing
   - Verify `firebase.json` rewrite rules

3. **Environment Variables**
   - Ensure `.env.production` exists and is configured
   - Variables must start with `VITE_` to be included in build

### Debug Commands

```bash
# Test build locally
npm run build:frontend
npx serve dist

# Check Firebase configuration
firebase projects:list
firebase hosting:channel:list

# View deployment logs
firebase hosting:releases:list
```

## 🎯 Next Steps

1. **Custom Domain**: Set up custom domain in Firebase Console
2. **CI/CD**: Integrate with GitHub Actions for automatic deployment
3. **Analytics**: Enable Firebase Analytics for user insights
4. **Performance**: Monitor Core Web Vitals in Firebase Console

## 📞 Support

For Firebase-specific issues:
- [Firebase Documentation](https://firebase.google.com/docs/hosting)
- [Firebase Community](https://firebase.google.com/community)

For AplyEase-specific issues:
- Check the main README.md
- Review server logs for backend issues
