import "dotenv/config";
import "module-alias/register";
import express, { type Request, Response, NextFunction } from "express";
import { registerRoutes } from "./routes";
import { log } from "./vite";
import cors from "cors";

// Log environment variables for debugging (remove sensitive info)
console.log('Environment check:');
console.log('- NODE_ENV:', process.env.NODE_ENV);
console.log('- DATABASE_URL exists:', !!process.env.DATABASE_URL);
console.log('- SESSION_SECRET exists:', !!process.env.SESSION_SECRET);
console.log('- PORT:', process.env.PORT);

const app = express();

// Enable CORS for Firebase frontend
app.use(cors({
  origin: (origin, callback) => {
    if (!origin) return callback(null, true);
    if (
      origin.endsWith('.firebaseapp.com') ||
      origin.endsWith('.web.app') ||
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

app.use(express.json());
app.use(express.urlencoded({ extended: false }));

// Request logging middleware
app.use((req, res, next) => {
  const start = Date.now();
  const reqPath = req.path;
  let capturedJsonResponse: Record<string, any> | undefined = undefined;

  const originalResJson = res.json;
  res.json = function (bodyJson, ...args) {
    capturedJsonResponse = bodyJson;
    return originalResJson.apply(res, [bodyJson, ...args]);
  } as any;

  res.on("finish", () => {
    const duration = Date.now() - start;
    if (reqPath.startsWith("/api")) {
      let logLine = `${req.method} ${reqPath} ${res.statusCode} in ${duration}ms`;
      if (capturedJsonResponse) {
        logLine += ` :: ${JSON.stringify(capturedJsonResponse)}`;
      }
      if (logLine.length > 80) {
        logLine = logLine.slice(0, 79) + "…";
      }
      log(logLine);
    }
  });

  next();
});

// Global error handler for unhandled promise rejections
process.on('unhandledRejection', (reason, promise) => {
  console.error('Unhandled Rejection at:', promise, 'reason:', reason);
});

// Global error handler for uncaught exceptions
process.on('uncaughtException', (error) => {
  console.error('Uncaught Exception:', error);
  if (error.message.includes('Connection terminated unexpectedly')) {
    console.error('Database connection error detected, attempting to restart...');
  }
});

(async () => {
  const server = await registerRoutes(app);

  // Enhanced error handling middleware
  app.use((err: any, _req: Request, res: Response, _next: NextFunction) => {
    console.error('Error:', err);
    
    // Handle specific database connection errors
    if (err.message?.includes('Connection terminated unexpectedly') || 
        err.message?.includes('connection') ||
        err.code === 'ECONNRESET' ||
        err.code === 'ENOTFOUND') {
      console.error('Database connection error detected');
      return res.status(503).json({ 
        error: {
          message: 'Database connection error',
          code: 'DB_CONNECTION_ERROR'
        }
      });
    }
    
    // Handle CORS errors
    if (err.message?.includes('Not allowed by CORS')) {
      return res.status(403).json({ 
        error: {
          message: 'CORS error: Origin not allowed',
          code: 'CORS_ERROR'
        }
      });
    }
    
    // Default error response
    res.status(500).json({ 
      error: {
        message: 'Internal server error',
        code: 'INTERNAL_ERROR'
      }
    });
  });

  const port = process.env.PORT || 5000;
  
  server.listen(port, () => {
    console.log(`🚀 AplyEase Backend API running on port ${port}`);
    console.log(`📊 Health check: http://localhost:${port}/api/auth/user`);
    console.log(`🔗 API Base URL: http://localhost:${port}/api`);
  });
})();
