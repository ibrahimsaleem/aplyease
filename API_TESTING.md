# API Testing & Endpoints Guide

This guide shows you how to test and view your AplyEase API endpoints.

## 🔍 **How to See Your API Endpoints**

### **1. API Documentation Endpoint**
Once deployed, visit your backend URL + `/api`:
```
https://aplyease-backend.onrender.com/api
```

This will show you all available endpoints with descriptions.

### **2. Health Check**
Test if your backend is running:
```
https://aplyease-backend.onrender.com/api/health
```

## 📋 **Available API Endpoints**

### **Authentication**
- `POST /api/auth/login` - User login
- `POST /api/auth/logout` - User logout  
- `GET /api/auth/user` - Get current user
- `POST /api/auth/register` - Register new user (Admin only)

### **Users (Admin Only)**
- `GET /api/users` - Get all users
- `POST /api/users` - Create new user
- `PUT /api/users/:id` - Update user
- `DELETE /api/users/:id` - Delete user

### **Applications**
- `GET /api/applications` - Get applications (filtered by role)
- `POST /api/applications` - Create new application (Employee only)
- `PUT /api/applications/:id` - Update application
- `DELETE /api/applications/:id` - Delete application

### **Analytics**
- `GET /api/analytics/dashboard` - Get dashboard analytics
- `GET /api/analytics/export` - Export data as CSV
- `GET /api/analytics/employee-performance` - Employee performance (Admin only)
- `GET /api/analytics/client-performance` - Client performance analytics

### **System**
- `GET /api/health` - Health check
- `GET /api` - API documentation

## 🧪 **Testing API Endpoints**

### **Using cURL**

#### **1. Health Check**
```bash
curl https://aplyease-backend.onrender.com/api/health
```

#### **2. API Documentation**
```bash
curl https://aplyease-backend.onrender.com/api
```

#### **3. Login**
```bash
curl -X POST https://aplyease-backend.onrender.com/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@example.com","password":"password123"}'
```

#### **4. Get Users (with auth)**
```bash
curl -X GET https://aplyease-backend.onrender.com/api/users \
  -H "Cookie: connect.sid=YOUR_SESSION_ID"
```

### **Using Postman**

1. **Import Collection**: Create a new collection
2. **Set Base URL**: `https://aplyease-backend.onrender.com`
3. **Add Requests**:
   - GET `/api/health`
   - GET `/api`
   - POST `/api/auth/login`
   - GET `/api/users`

### **Using Browser**

1. **Health Check**: Visit `https://aplyease-backend.onrender.com/api/health`
2. **API Docs**: Visit `https://aplyease-backend.onrender.com/api`

## 🔧 **Environment Variables**

Make sure these are set in Render:
```bash
NODE_ENV=production
DATABASE_URL=your_postgresql_connection_string
SESSION_SECRET=your_session_secret
PORT=10000
```

## 📊 **Monitoring Your API**

### **Render Dashboard**
1. Go to [Render Dashboard](https://dashboard.render.com)
2. Select your `aplyease-backend` service
3. Check:
   - **Logs**: View real-time logs
   - **Metrics**: CPU, memory usage
   - **Deployments**: Build status

### **Health Check Monitoring**
```bash
# Check if service is responding
curl -I https://aplyease-backend.onrender.com/api/health

# Expected response:
# HTTP/1.1 200 OK
# Content-Type: application/json
```

## 🚨 **Troubleshooting**

### **Common Issues**

#### **1. 404 Not Found**
- Check if the endpoint exists in `/api` documentation
- Verify the URL is correct
- Ensure the service is deployed

#### **2. 401 Unauthorized**
- Login first to get session
- Check if endpoint requires authentication
- Verify user role permissions

#### **3. 500 Internal Server Error**
- Check Render logs
- Verify environment variables
- Check database connection

### **Debug Commands**

```bash
# Test basic connectivity
curl -v https://aplyease-backend.onrender.com/api/health

# Test with verbose output
curl -X POST https://aplyease-backend.onrender.com/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"test"}' \
  -v

# Check response headers
curl -I https://aplyease-backend.onrender.com/api
```

## 📱 **Frontend Integration**

Your frontend on Firebase will connect to these endpoints:

```javascript
// Example API call from frontend
const response = await fetch('https://aplyease-backend.onrender.com/api/auth/login', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
  },
  credentials: 'include', // Important for sessions
  body: JSON.stringify({
    email: 'user@example.com',
    password: 'password'
  })
});
```

## 🎯 **Next Steps**

1. **Test all endpoints** using the methods above
2. **Monitor performance** in Render dashboard
3. **Set up alerts** for downtime
4. **Document custom endpoints** if you add any

---

**💡 Tip**: Bookmark `https://aplyease-backend.onrender.com/api` for quick access to your API documentation!
