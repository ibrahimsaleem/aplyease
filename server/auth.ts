import express from "express";
import session from "express-session";
import connectPg from "connect-pg-simple";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import { db } from "./db";
import { users } from "../shared/schema";
import { eq } from "drizzle-orm";

const PgSession = connectPg(session);
const JWT_SECRET = process.env.JWT_SECRET || process.env.SESSION_SECRET || "fallback-secret";

export interface AuthenticatedUser {
  id: string;
  name: string;
  email: string;
  role: "ADMIN" | "CLIENT" | "EMPLOYEE";
  company?: string;
}

declare global {
  namespace Express {
    interface User extends AuthenticatedUser {}
  }
}

declare module "express-session" {
  interface SessionData {
    user?: AuthenticatedUser;
  }
}

export function setupAuth(app: express.Application) {
  // JWT-based authentication middleware
  app.use(express.json());
  
  // Optional: Keep session for backward compatibility but don't rely on it
  const sessionConfig: session.SessionOptions = {
    secret: process.env.SESSION_SECRET || "fallback-secret",
    resave: false,
    saveUninitialized: false,
    name: 'connect.sid',
    cookie: {
      httpOnly: true,
      maxAge: 24 * 60 * 60 * 1000,
      sameSite: process.env.NODE_ENV === "production" ? "none" : "lax",
      secure: process.env.NODE_ENV === "production",
      path: '/',
      domain: undefined
    }
  };

  // Use PostgreSQL session store in production, MemoryStore in development
  if (process.env.NODE_ENV === "production" && process.env.DATABASE_URL) {
    try {
      console.log("Attempting to initialize PostgreSQL session store...");
      sessionConfig.store = new PgSession({
        conObject: {
          connectionString: process.env.DATABASE_URL,
          ssl: {
            rejectUnauthorized: false
          }
        },
        tableName: 'sessions'
      });
      console.log("PostgreSQL session store initialized successfully");
    } catch (error) {
      console.error("Failed to initialize PostgreSQL session store:", error);
      console.log("Falling back to MemoryStore");
    }
  } else {
    console.log("Using MemoryStore for sessions");
  }

  app.use(session(sessionConfig));
}

export async function authenticateUser(email: string, password: string): Promise<AuthenticatedUser | null> {
  try {
    console.log("Attempting authentication for:", email);
    
    const user = await db.query.users.findFirst({
      where: eq(users.email, email)
    });

    if (!user) {
      console.log("User not found:", email);
      return null;
    }

    console.log("Verifying password for:", email);
    const isValidPassword = await bcrypt.compare(password, user.passwordHash);
    
    if (!isValidPassword) {
      console.log("Invalid password for:", email);
      return null;
    }

    console.log("Authentication successful for:", email);
    return {
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
      company: user.company || undefined
    };
  } catch (error: any) {
    // Differentiate between database errors and authentication failures
    console.error("Authentication error:", error);
    
    // If it's a connection error, throw it so it can be handled by retry logic
    const isConnectionError = 
      error.code === 'ECONNREFUSED' ||
      error.code === 'ECONNRESET' ||
      error.code === 'ETIMEDOUT' ||
      error.message?.includes('connection');
    
    if (isConnectionError) {
      console.error("Database connection error during authentication");
      // Throw connection errors so they can be handled properly
      throw error;
    }
    
    // For other errors (parsing, unexpected errors), log but return null
    console.error("Unexpected authentication error:", error.message);
    return null;
  }
}

export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, 12);
}

export function generateJWT(user: AuthenticatedUser) {
  return jwt.sign(
    { 
      id: user.id, 
      email: user.email, 
      name: user.name, 
      role: user.role 
    },
    JWT_SECRET,
    { expiresIn: '24h' }
  );
}

export function verifyJWT(token: string): AuthenticatedUser | null {
  try {
    return jwt.verify(token, JWT_SECRET) as AuthenticatedUser;
  } catch (error) {
    console.error("JWT verification failed:", error);
    return null;
  }
}

export function requireAuth(req: express.Request, res: express.Response, next: express.NextFunction) {
  // Try JWT first
  const authHeader = req.headers.authorization;
  if (authHeader && authHeader.startsWith('Bearer ')) {
    const token = authHeader.substring(7);
    const user = verifyJWT(token);
    if (user) {
      req.user = user;
      return next();
    }
  }

  // Fallback to session (for backward compatibility)
  console.log('Session check:', {
    hasSession: !!req.session,
    hasUser: !!(req.session && req.session.user),
    sessionId: req.sessionID,
    cookies: req.headers.cookie ? 'present' : 'missing'
  });
  
  if (req.headers.cookie) {
    console.log('Cookie header:', req.headers.cookie);
    const cookieParts = req.headers.cookie.split(';');
    const sessionCookie = cookieParts.find(c => c.trim().startsWith('connect.sid='));
    if (sessionCookie) {
      const cookieSessionId = sessionCookie.trim().split('=')[1];
      console.log('Session cookie found:', sessionCookie.trim());
      console.log('Cookie session ID:', cookieSessionId);
      console.log('Middleware session ID:', req.sessionID);
      console.log('Session ID match:', cookieSessionId === req.sessionID);
    } else {
      console.log('No session cookie found in cookies');
    }
  }
  
  if (!req.session || !req.session.user) {
    return res.status(401).json({ message: "Authentication required" });
  }
  
  req.user = req.session.user;
  next();
}

export function requireRole(roles: string[]) {
  return (req: express.Request, res: express.Response, next: express.NextFunction) => {
    if (!req.user) {
      return res.status(401).json({ message: "Authentication required" });
    }

    if (!roles.includes(req.user.role)) {
      return res.status(403).json({ message: "Insufficient permissions" });
    }

    next();
  };
}
