import "dotenv/config";
import "module-alias/register";
import express, { type Request, Response, NextFunction } from "express";
import { registerRoutes } from "./routes";
import { setupVite, serveStatic, log } from "./vite";
import path from "path";
import cors from "cors";
import fs from "fs";
import rateLimit from "express-rate-limit";

// Log environment variables for debugging (remove sensitive info)
console.log('Environment check:');
console.log('- NODE_ENV:', process.env.NODE_ENV);
console.log('- DATABASE_URL exists:', !!process.env.DATABASE_URL);
console.log('- SESSION_SECRET exists:', !!process.env.SESSION_SECRET);
console.log('- PORT:', process.env.PORT);

const app = express();

// Enable CORS for all environments
app.use(cors({
  origin: (origin, callback) => {
    if (!origin) return callback(null, true);
    if (
      origin.endsWith('.vercel.app') ||
      origin.endsWith('.onrender.com') ||
      origin.endsWith('.web.app') ||
      origin.endsWith('.firebaseapp.com') ||
      origin === 'http://localhost:5173' ||
      origin === 'http://localhost:5000' ||
      process.env.NODE_ENV === 'development'
    ) {
      return callback(null, origin);
    }
    callback(new Error('Not allowed by CORS'));
  },
  credentials: true,
  methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization"]
}));

app.use(express.json());
app.use(express.urlencoded({ extended: false }));

// Rate limiting middleware to prevent abuse and protect database
const limiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 100, // Limit each IP to 100 requests per windowMs
  message: 'Too many requests from this IP, please try again later.',
  standardHeaders: true, // Return rate limit info in the `RateLimit-*` headers
  legacyHeaders: false, // Disable the `X-RateLimit-*` headers
  // Skip rate limiting for health checks
  skip: (req) => req.path === '/api/health',
  handler: (req, res) => {
    console.warn('Rate limit exceeded for IP:', req.ip);
    res.status(429).json({
      message: 'Too many requests, please try again later.',
      retryAfter: Math.ceil(req.rateLimit?.resetTime ? (req.rateLimit.resetTime.getTime() - Date.now()) / 1000 : 60)
    });
  }
});

// Apply rate limiting to all routes
app.use(limiter);

// Stricter rate limiting for authentication endpoints
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 10, // Limit each IP to 10 login attempts per 15 minutes
  message: 'Too many login attempts, please try again later.',
  skipSuccessfulRequests: true, // Don't count successful requests
});

// Apply stricter rate limiting to auth routes
app.use('/api/auth/login', authLimiter);

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
  // Don't exit the process, just log the error
});

// Global error handler for uncaught exceptions
process.on('uncaughtException', (error) => {
  console.error('Uncaught Exception:', error);
  // Only exit if it's a critical error
  if (error.message.includes('Connection terminated unexpectedly')) {
    console.error('Database connection error detected, attempting to restart...');
    // Don't exit immediately, let the application try to recover
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
          code: '503',
          message: 'Database temporarily unavailable. Please try again in a moment.',
          retryAfter: 30
        }
      });
    }

    // Handle validation errors
    if (err.name === 'ZodError') {
      return res.status(400).json({
        error: {
          code: '400',
          message: 'Validation error',
          details: err.errors
        }
      });
    }

    // Handle authentication errors
    if (err.status === 401 || err.status === 403) {
      return res.status(err.status).json({
        error: {
          code: String(err.status),
          message: err.message || 'Authentication required'
        }
      });
    }

    const status = err.status || err.statusCode || 500;
    const message = err.message || "Internal Server Error";
    const error = {
      code: String(status),
      message: process.env.NODE_ENV === 'production' ? 'A server error has occurred' : message,
      details: process.env.NODE_ENV === 'development' ? err.stack : undefined
    };
    res.status(status).json({ error });
  });

  if (process.env.NODE_ENV === "development") {
    await setupVite(app, server);
  } else {
    const distIndex = path.join(process.cwd(), "dist", "index.html");
    if (fs.existsSync(distIndex)) {
      serveStatic(app);
    } else {
      log("Skipping static file serving: dist/index.html not found", "server");
    }
  }

  app.use((req, res) => {
    if (req.path.startsWith('/api/')) {
      res.status(404).json({ message: "API endpoint not found" });
    } else {
      const indexPath = process.env.NODE_ENV === "production"
        ? path.join(process.cwd(), "dist", "index.html")
        : path.join(process.cwd(), "client", "index.html");
      res.sendFile(indexPath);
    }
  });

  const port = process.env.PORT || 5000;
  server.listen(port, () => {
    console.log(`🚀 Server running on port ${port}`);
    console.log(`📊 Environment: ${process.env.NODE_ENV || 'development'}`);
  });
})().catch((error) => {
  console.error('Failed to start server:', error);
  process.exit(1);
});

