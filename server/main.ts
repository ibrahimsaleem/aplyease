import "dotenv/config";
import "module-alias/register";
import express, { type Request, Response, NextFunction } from "express";
import { registerRoutes } from "./routes";
import { setupVite, serveStatic, log } from "./vite";
import path from "path";
import cors from "cors";

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

(async () => {
  const server = await registerRoutes(app);

  app.use((err: any, _req: Request, res: Response, _next: NextFunction) => {
    console.error('Error:', err);
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
    serveStatic(app);
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

  const port = parseInt(process.env.PORT || '5000', 10);
  server.listen({
    port,
    host: "0.0.0.0",
    reusePort: true,
  }, () => {
    log(`serving on port ${port}`);
  });
})();

