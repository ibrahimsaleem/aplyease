import express from "express";
import session from "express-session";
import bcrypt from "bcrypt";
import { db } from "./db";
import { users } from "@shared/schema";
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
  const sessionStore = new PgSession({
    conString: process.env.DATABASE_URL,
    createTableIfMissing: false,
    tableName: "sessions",
  });

  app.use(
    session({
      store: sessionStore,
      secret: process.env.SESSION_SECRET || "dev-secret-change-in-production",
      resave: false,
      saveUninitialized: false,
      cookie: {
        secure: process.env.NODE_ENV === "production",
        httpOnly: true,
        maxAge: 24 * 60 * 60 * 1000, // 24 hours
      },
    })
  );
}

export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, 12);
}

export async function verifyPassword(password: string, hash: string): Promise<boolean> {
  return bcrypt.compare(password, hash);
}

export async function authenticateUser(email: string, password: string): Promise<AuthenticatedUser | null> {
  try {
    const [user] = await db
      .select()
      .from(users)
      .where(eq(users.email, email))
      .limit(1);

    if (!user || !user.isActive) {
      return null;
    }

    const isValid = await verifyPassword(password, user.passwordHash);
    if (!isValid) {
      return null;
    }

    return {
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
      company: user.company || undefined,
    };
  } catch (error) {
    console.error("Authentication error:", error);
    return null;
  }
}

export function requireAuth(req: express.Request, res: express.Response, next: express.NextFunction) {
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
