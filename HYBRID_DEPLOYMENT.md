# Hybrid Deployment Guide: Render (Backend) + Firebase (Frontend)

This guide explains how to deploy AplyEase with the **backend on Render** and **frontend on Firebase** for optimal performance and cost efficiency.

## 🏗️ Architecture Overview

```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   Firebase      │    │     Render      │    │   PostgreSQL    │
│   (Frontend)    │◄──►│   (Backend)     │◄──►│   (Database)    │
│                 │    │                 │    │                 │
│ • React App     │    │ • Express API   │    │ • User Data     │
│ • Global CDN    │    │ • Authentication│    │ • Applications  │
│ • Static Files  │    │ • Business Logic│    │ • Analytics     │
└─────────────────┘    └─────────────────┘    └─────────────────┘
```

## 🚀 Deployment Steps

### **Phase 1: Deploy Backend on Render**

#### 1.1 Prepare Backend for Render
```bash
# Ensure you're in the project root
cd /path/to/AplyEase

# Test backend build locally
npm run build:backend
```

#### 1.2 Deploy to Render
1. **Go to [Render Dashboard](https://dashboard.render.com)**
2. **Create New Web Service**
3. **Connect your GitHub repository**
4. **Configure the service:**
   - **Name**: `aplyease-backend`
   - **Environment**: `Node`
   - **Build Command**: `npm install && npm run build:backend`
   - **Start Command**: `npm run start:backend`
   - **Health Check Path**: `/api/auth/user`

#### 1.3 Set Environment Variables on Render
```bash
NODE_ENV=production
DATABASE_URL=your_postgresql_connection_string
SESSION_SECRET=your_session_secret
PORT=10000
```

#### 1.4 Get Your Backend URL
After deployment, note your Render URL:
```
https://aplyease-backend.onrender.com
```

### **Phase 2: Deploy Frontend on Firebase**

#### 2.1 Install Firebase CLI
```bash
npm install -g firebase-tools
```

#### 2.2 Initialize Firebase Project
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

#### 2.3 Configure Frontend Environment
```bash
# Copy the example environment file
cp client/env.production.example client/.env.production

# Edit the file and set your Render backend URL
# VITE_API_BASE_URL=https://aplyease-backend.onrender.com
```

#### 2.4 Build and Deploy Frontend
```bash
# Build frontend for production
npm run build:frontend

# Deploy to Firebase
firebase deploy --only hosting
```

## 🔧 Configuration Files

### **Backend Configuration (Render)**

#### `render.yaml`
```yaml
services:
  - type: web
    name: aplyease-backend
    env: node
    buildCommand: npm install && npm run build:backend
    startCommand: npm run start:backend
    envVars:
      - key: NODE_ENV
        value: production
      - key: DATABASE_URL
        sync: false
      - key: SESSION_SECRET
        generateValue: true
      - key: PORT
        value: 10000
    healthCheckPath: /api/auth/user
    autoDeploy: true
```

#### `server/main-backend-only.ts`
- Backend-only server without static file serving
- CORS configured for Firebase domains
- API-only endpoints

### **Frontend Configuration (Firebase)**

#### `firebase.json`
```json
{
  "hosting": {
    "public": "dist",
    "ignore": [
      "firebase.json",
      "**/.*",
      "**/node_modules/**"
    ],
    "rewrites": [
      {
        "source": "**",
        "destination": "/index.html"
      }
    ],
    "headers": [
      {
        "source": "**/*.@(js|css)",
        "headers": [
          {
            "key": "Cache-Control",
            "value": "max-age=31536000"
          }
        ]
      }
    ]
  }
}
```

#### `client/.env.production`
```bash
VITE_API_BASE_URL=https://aplyease-backend.onrender.com
```

## 🔄 Development Workflow

### **Local Development**
```bash
# Start both frontend and backend
npm run dev
```

### **Production Deployment**
```bash
# 1. Deploy backend to Render (automatic via Git push)
git push origin main

# 2. Build frontend
npm run build:frontend

# 3. Deploy frontend to Firebase
firebase deploy --only hosting
```

## 🌐 CORS Configuration

The backend is configured to allow requests from:
- `*.firebaseapp.com` (Firebase Hosting)
- `*.web.app` (Firebase Hosting)
- `*.onrender.com` (Render)
- `*.vercel.app` (Vercel)
- `localhost:5173` (Development)

## 📊 Benefits of This Setup

### **Backend on Render**
- **Database Integration**: Easy PostgreSQL setup
- **Environment Variables**: Secure configuration management
- **Auto-deployment**: Git-based deployments
- **Health Checks**: Built-in monitoring
- **Cost Effective**: Pay-per-use pricing

### **Frontend on Firebase**
- **Global CDN**: Fast content delivery worldwide
- **Automatic HTTPS**: SSL certificates included
- **Easy Rollbacks**: Quick deployment reversions
- **Custom Domains**: Simple domain setup
- **Analytics**: Built-in performance monitoring

## 🔍 Troubleshooting

### **Common Issues**

#### 1. CORS Errors
```bash
# Check if backend CORS includes Firebase domains
# Verify VITE_API_BASE_URL is correct
```

#### 2. Build Failures
```bash
# Backend build issues
npm run build:backend

# Frontend build issues
npm run build:frontend
```

#### 3. Environment Variables
```bash
# Check Render environment variables
# Ensure VITE_API_BASE_URL is set correctly
```

### **Debug Commands**

#### Backend Debugging
```bash
# Test backend locally
npm run dev:server

# Check backend logs on Render
# View in Render dashboard
```

#### Frontend Debugging
```bash
# Test frontend locally
npm run dev:client

# Test production build
npm run build:frontend
npx serve dist
```

## 🎯 Next Steps

### **Immediate**
1. **Custom Domain**: Set up custom domain for frontend
2. **SSL**: Ensure HTTPS is working on both services
3. **Monitoring**: Set up error tracking and analytics

### **Advanced**
1. **CI/CD**: Automate deployments with GitHub Actions
2. **Caching**: Implement API response caching
3. **CDN**: Add CDN for API responses
4. **Monitoring**: Set up comprehensive logging

## 📞 Support

### **Render Issues**
- [Render Documentation](https://render.com/docs)
- [Render Community](https://community.render.com)

### **Firebase Issues**
- [Firebase Documentation](https://firebase.google.com/docs)
- [Firebase Community](https://firebase.google.com/community)

### **AplyEase Issues**
- Check the main README.md
- Review server logs in Render dashboard
- Check Firebase hosting logs

## 🔗 Quick Reference

### **URLs**
- **Backend API**: `https://aplyease-backend.onrender.com`
- **Frontend**: `https://your-project.firebaseapp.com`
- **Health Check**: `https://aplyease-backend.onrender.com/api/auth/user`

### **Commands**
```bash
# Backend
npm run build:backend
npm run start:backend

# Frontend
npm run build:frontend
firebase deploy --only hosting

# Development
npm run dev
```

---

**🎉 Congratulations!** You now have a production-ready AplyEase deployment with optimal performance and cost efficiency.
