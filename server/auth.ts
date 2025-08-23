import express from "express";
import session from "express-session";
import bcrypt from "bcrypt";
import { db } from "./db";
import { users } from "../shared/schema";
import { eq } from "drizzle-orm";
import connectPg from "connect-pg-simple";

const PgSession = connectPg(session);

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

export function setupAuth(app: express.Express) {
  // Session configuration
  const sessionConfig: session.SessionOptions = {
    secret: process.env.SESSION_SECRET || "fallback-secret",
    resave: false,
    saveUninitialized: false,
    name: 'connect.sid', // Explicitly set the cookie name
    cookie: {
      httpOnly: true,
      maxAge: 24 * 60 * 60 * 1000, // 24 hours
      sameSite: process.env.NODE_ENV === "production" ? "none" : "lax",
      secure: process.env.NODE_ENV === "production", // Must be true for sameSite: none
      path: '/',
      // Remove domain restriction for production
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

export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, 12);
}

export async function verifyPassword(password: string, hash: string): Promise<boolean> {
  return bcrypt.compare(password, hash);
}

export async function authenticateUser(email: string, password: string): Promise<AuthenticatedUser | null> {
  try {
    console.log("Attempting authentication for:", email);
    
    const [user] = await db
      .select()
      .from(users)
      .where(eq(users.email, email))
      .limit(1);

    if (!user) {
      console.log("User not found:", email);
      return null;
    }

    if (!user.isActive) {
      console.log("User is not active:", email);
      return null;
    }

    console.log("Verifying password for:", email);
    const isValid = await verifyPassword(password, user.passwordHash);
    
    if (!isValid) {
      console.log("Invalid password for:", email);
      return null;
    }

    console.log("Authentication successful for:", email);
    return {
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
      company: user.company || undefined,
    };
  } catch (error) {
    console.error("Authentication error:", error);
    if (error instanceof Error) {
      console.error("Error details:", error.message, error.stack);
    }
    throw error; // Let the route handler deal with the error
  }
}

export function requireAuth(req: express.Request, res: express.Response, next: express.NextFunction) {
  console.log('Session check:', {
    hasSession: !!req.session,
    hasUser: !!(req.session && req.session.user),
    sessionId: req.sessionID,
    cookies: req.headers.cookie ? 'present' : 'missing'
  });
  
  // Debug cookie details
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
  next();
}

export function requireRole(roles: string[]) {
  return (req: express.Request, res: express.Response, next: express.NextFunction) => {
    if (!req.session?.user) {
      return res.status(401).json({ message: "Authentication required" });
    }

    if (!roles.includes(req.session.user.role)) {
      return res.status(403).json({ message: "Insufficient permissions" });
    }

    next();
  };
}

declare module "express-session" {
  interface SessionData {
    user?: AuthenticatedUser;
  }
}
