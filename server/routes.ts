import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { setupAuth, requireAuth, requireRole, authenticateUser, generateJWT, hashPassword } from "./auth";
import { insertUserSchema, registerUserSchema, updateUserSchema, insertJobApplicationSchema, updateJobApplicationSchema, insertClientProfileSchema, updateClientProfileSchema, clientProfiles, type UpdateClientProfile } from "../shared/schema";
import { ZodError } from "zod";
import rateLimit from "express-rate-limit";
import { db } from "./db";
import { eq } from "drizzle-orm";
import { writeFile, unlink } from "fs/promises";
import { exec } from "child_process";
import { promisify } from "util";
import path from "path";
import os from "os";
import { randomUUID } from "crypto";

export async function registerRoutes(app: Express): Promise<Server> {
  setupAuth(app);

  function parseSignupCouponsEnv(envValue: string | undefined): Record<string, number> {
    const map: Record<string, number> = {};
    if (!envValue) return map;
    for (const rawEntry of envValue.split(",")) {
      const entry = rawEntry.trim();
      if (!entry) continue;
      const [rawCode, rawPct] = entry.split(":");
      const code = rawCode?.trim()?.toUpperCase();
      const pct = rawPct !== undefined ? Number(String(rawPct).trim()) : NaN;
      if (!code || !Number.isFinite(pct)) continue;
      // Clamp to sane range; invalid ranges are treated as unusable.
      if (pct <= 0 || pct >= 100) continue;
      map[code] = pct;
    }
    return map;
  }

  // Rate limiter for registration
  const registerLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 5, // Limit each IP to 5 create account requests per windowMs
    message: "Too many registration attempts, please try again after 15 minutes",
    standardHeaders: true, // Return rate limit info in the `RateLimit-*` headers
    legacyHeaders: false, // Disable the `X-RateLimit-*` headers
  });

  // Health check endpoint - doesn't require authentication
  app.get("/api/health", async (req, res) => {
    try {
      // Test database connection
      const dbHealthy = await storage.getUser("health-check-test")
        .then(() => true)
        .catch(() => false);

      const health = {
        status: dbHealthy ? "healthy" : "degraded",
        timestamp: new Date().toISOString(),
        uptime: process.uptime(),
        database: dbHealthy ? "connected" : "disconnected",
        memory: {
          used: Math.round(process.memoryUsage().heapUsed / 1024 / 1024),
          total: Math.round(process.memoryUsage().heapTotal / 1024 / 1024),
          unit: "MB"
        }
      };

      const statusCode = dbHealthy ? 200 : 503;
      res.status(statusCode).json(health);
    } catch (error) {
      console.error("Health check error:", error);
      res.status(503).json({
        status: "unhealthy",
        timestamp: new Date().toISOString(),
        error: "Health check failed"
      });
    }
  });

  // Auth routes
  app.post("/api/auth/login", async (req, res) => {
    try {
      // Login attempt for user: ${email}
      const { email, password } = req.body;

      if (!email || !password) {
        // Missing credentials for login attempt
        return res.status(400).json({ message: "Email and password are required" });
      }

      let user;
      try {
        user = await authenticateUser(email, password);
      } catch (authError: any) {
        // Handle database connection errors during authentication
        console.error("Database error during authentication:", authError);
        return res.status(503).json({
          message: "Database temporarily unavailable. Please try again in a moment.",
          retryAfter: 30
        });
      }

      if (!user) {
        console.log("Authentication failed for:", email);
        return res.status(401).json({ message: "Invalid credentials" });
      }

      // Generate JWT token (primary auth method)
      const token = generateJWT(user);
      console.log("Generated JWT token for:", email);

      // Try to save session, but don't block login if it fails
      // JWT is the primary authentication method, session is optional
      console.log("Attempting to save session for user:", email);
      req.session.user = user;

      try {
        await new Promise<void>((resolve, reject) => {
          req.session.save((err) => {
            if (err) {
              reject(err);
            } else {
              resolve();
            }
          });
        });
        console.log("Session saved successfully for:", email);
      } catch (sessionError) {
        // Log warning but don't block login - JWT authentication will work
        console.warn("Session save failed for:", email, "Error:", sessionError);
        console.warn("Login proceeding with JWT authentication only");
      }

      console.log("Login successful for:", email);
      res.json({ user, token });
    } catch (error) {
      console.error("Login error:", error);
      if (error instanceof Error) {
        console.error("Error details:", error.message, error.stack);
      }
      res.status(500).json({
        message: "Internal server error",
        details: process.env.NODE_ENV === "development" ? (error instanceof Error ? error.message : String(error)) : undefined
      });
    }
  });


  app.post("/api/register", registerLimiter, async (req, res) => {
    try {
      const userData = registerUserSchema.parse(req.body);
      const userRole = userData.role || "CLIENT";

      // Check if user already exists
      const existingUser = await storage.getUserByEmail(userData.email);
      if (existingUser) {
        return res.status(400).json({ message: "User already exists" });
      }

      // Determine applications quota based on package (only for clients)
      let applicationsRemaining = 0;
      let amountDue = 0; // in cents (pending amount, before coupon)
      if (userRole === "CLIENT") {
        switch (userData.packageTier) {
          case "basic":
            applicationsRemaining = 250;
            amountDue = 12500;
            break;
          case "standard":
            applicationsRemaining = 500;
            amountDue = 29900;
            break;
          case "premium":
            applicationsRemaining = 1000;
            amountDue = 35000;
            break;
          case "ultimate":
            applicationsRemaining = 1000;
            amountDue = 59900;
            break;
          default:
            applicationsRemaining = 0;
            amountDue = 0;
        }

        // Optional add-on services (Portfolio Website / LinkedIn Optimization)
        const includePortfolioWebsite = Boolean((req.body as any)?.includePortfolioWebsite);
        const includeLinkedInOptimization = Boolean((req.body as any)?.includeLinkedInOptimization);
        if (includePortfolioWebsite) {
          amountDue += 14900; // $149 in cents
        }
        if (includeLinkedInOptimization) {
          amountDue += 14900; // $149 in cents
        }
      }

      // Optional coupon discounts (CLIENT only) – applied to full amount (package + add-ons)
      const rawCouponCode = (req.body as any)?.couponCode;
      const couponCode = typeof rawCouponCode === "string" ? rawCouponCode.trim().toUpperCase() : "";
      if (userRole === "CLIENT" && couponCode) {
        const coupons = parseSignupCouponsEnv(process.env.SIGNUP_COUPONS);
        const discountPct = coupons[couponCode];
        if (!discountPct) {
          return res.status(400).json({ message: "Invalid coupon code" });
        }
        // discounted = round(baseCents * (1 - discountPct/100))
        amountDue = Math.max(0, Math.round(amountDue * (1 - discountPct / 100)));
      }

      const hashedPassword = await hashPassword(userData.password);

      // Employees start as inactive (pending verification), clients are active
      const isActiveByDefault = userRole === "CLIENT";

      // Cast to any to avoid strict type checking issues with inferred schema
      const user = await storage.createUser({
        ...userData,
        role: userRole,
        passwordHash: hashedPassword,
        applicationsRemaining,
        // For CLIENT signups, set pending amount due based on selected package
        ...(userRole === "CLIENT" ? { amountDue, amountPaid: 0 } : {}),
        isActive: isActiveByDefault
      } as any);

      // Safety: ensure amountDue persisted for CLIENT signups (older create paths may omit these fields)
      if (userRole === "CLIENT" && amountDue > 0) {
        await storage.updateUser(user.id, { amountDue, amountPaid: 0 } as any);
      }

      // Create empty client profile only for clients
      if (userRole === "CLIENT") {
        await storage.upsertClientProfile(user.id, {
          fullName: user.name,
          phoneNumber: "",
          mailingAddress: "",
          situation: "",
          desiredTitles: "",
          workAuthorization: "",
          sponsorshipAnswer: "",
        } as any);
      }

      res.status(201).json({
        userId: user.id,
        message: "Registration successful"
      });
    } catch (error) {
      console.error("Registration error:", error);
      if (error instanceof ZodError) {
        res.status(400).json({ message: "Validation failed", errors: error.errors });
      } else {
        res.status(500).json({ message: "Internal server error" });
      }
    }
  });

  // Public preview endpoint to calculate total signup price with add-ons & coupon
  app.post("/api/register/preview-total", async (req, res) => {
    try {
      const {
        packageTier,
        couponCode: rawCouponCode,
        includePortfolioWebsite: rawIncludePortfolioWebsite,
        includeLinkedInOptimization: rawIncludeLinkedInOptimization,
      } = req.body as {
        packageTier?: string;
        couponCode?: string;
        includePortfolioWebsite?: boolean;
        includeLinkedInOptimization?: boolean;
      };

      const includePortfolioWebsite = Boolean(rawIncludePortfolioWebsite);
      const includeLinkedInOptimization = Boolean(rawIncludeLinkedInOptimization);

      let baseCents = 0;
      switch (packageTier) {
        case "basic":
          baseCents = 12500;
          break;
        case "standard":
          baseCents = 29900;
          break;
        case "premium":
          baseCents = 35000;
          break;
        case "ultimate":
          baseCents = 59900;
          break;
        default:
          baseCents = 0;
      }

      const addonsCents =
        (includePortfolioWebsite ? 14900 : 0) +
        (includeLinkedInOptimization ? 14900 : 0);

      let totalCents = baseCents + addonsCents;
      let discountPct = 0;

      const couponCode = typeof rawCouponCode === "string" ? rawCouponCode.trim().toUpperCase() : "";
      if (couponCode && totalCents > 0) {
        const coupons = parseSignupCouponsEnv(process.env.SIGNUP_COUPONS);
        const pct = coupons[couponCode];
        if (!pct) {
          return res.status(400).json({ message: "Invalid coupon code" });
        }
        discountPct = pct;
        totalCents = Math.max(0, Math.round(totalCents * (1 - pct / 100)));
      }

      res.json({
        baseCents,
        addonsCents,
        totalCents,
        discountPct,
      });
    } catch (error) {
      console.error("Preview total error:", error);
      res.status(500).json({ message: "Failed to calculate total" });
    }
  });

  app.post("/api/auth/logout", (req, res) => {
    // Handle case where session doesn't exist or is already destroyed
    if (!req.session) {
      res.clearCookie("connect.sid");
      return res.status(200).json({ message: "Logged out successfully" });
    }

    req.session.destroy((err) => {
      // Always clear the cookie, even if session destruction fails
      res.clearCookie("connect.sid");

      if (err) {
        // Log error but still return success to prevent users from being stuck
        console.warn("Session destruction error during logout:", err);
        return res.status(200).json({ message: "Logged out successfully" });
      }

      res.status(200).json({ message: "Logged out successfully" });
    });
  });

  app.get("/api/auth/user", requireAuth, async (req, res) => {
    try {
      const sessionUser = (req.user ?? req.session.user);
      if (!sessionUser) {
        return res.status(401).json({ message: "Not authenticated" });
      }

      // Fetch fresh user data from database to get latest fields like geminiApiKey
      const freshUser = await storage.getUser(sessionUser.id);
      if (!freshUser) {
        return res.status(404).json({ message: "User not found" });
      }

      res.json({ user: freshUser });
    } catch (error) {
      console.error("Error fetching user:", error);
      res.status(500).json({ message: "Failed to fetch user" });
    }
  });

  // User management routes (Admin only)
  app.get("/api/users", requireAuth, requireRole(["ADMIN"]), async (req, res) => {
    try {
      const { role, search } = req.query;
      const users = await storage.listUsers({
        role: role as string,
        search: search as string,
      });
      res.json(users);
    } catch (error) {
      console.error("Error fetching users:", error);
      res.status(500).json({ message: "Failed to fetch users" });
    }
  });

  // Restricted section unlock (Admin only) - verifies secret code server-side
  app.post("/api/admin/unlock-financial", requireAuth, requireRole(["ADMIN"]), async (req, res) => {
    try {
      const code = typeof (req.body as any)?.code === "string" ? (req.body as any).code.trim() : "";
      if (!code) {
        return res.status(400).json({ ok: false, message: "Code is required" });
      }

      const expected = (process.env.FINANCIAL_ACCESS_CODE || "").trim();
      if (!expected) {
        console.warn("[unlock-financial] FINANCIAL_ACCESS_CODE is not set on server process");
        return res.status(500).json({ ok: false, message: "Unlock code is not configured" });
      }

      if (code !== expected) {
        console.warn("[unlock-financial] Invalid code attempt (code length:", code.length, ", expected length:", expected.length, ")");
        return res.status(401).json({ ok: false, message: "Invalid code" });
      }

      return res.json({ ok: true });
    } catch (error) {
      console.error("Error verifying unlock code:", error);
      return res.status(500).json({ ok: false, message: "Failed to verify code" });
    }
  });

  app.post("/api/users", requireAuth, requireRole(["ADMIN"]), async (req, res) => {
    try {
      const userData = insertUserSchema.parse(req.body);
      const user = await storage.createUser(userData);
      res.status(201).json(user);
    } catch (error) {
      if (error instanceof ZodError) {
        return res.status(400).json({ message: "Validation error", errors: error.errors });
      }
      console.error("Error creating user:", error);
      res.status(500).json({ message: "Failed to create user" });
    }
  });

  app.patch("/api/users/:id", requireAuth, requireRole(["ADMIN"]), async (req, res) => {
    try {
      const { id } = req.params;
      const currentUser = (req.user ?? req.session.user)!;
      const userData = updateUserSchema.parse(req.body);

      // Get current user data to check for payment changes
      const existingUser = await storage.getUser(id);

      // If password is provided, hash it before updating
      const updateData: any = { ...userData };
      if (updateData.password) {
        updateData.passwordHash = await hashPassword(updateData.password);
        delete updateData.password; // Remove plain password
      }

      const user = await storage.updateUser(id, updateData);

      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }

      // Record payment transaction if amountPaid changed
      if (updateData.amountPaid !== undefined && existingUser) {
        const previousAmount = (existingUser as any).amountPaid || 0;
        const newAmount = updateData.amountPaid;
        const paymentDifference = newAmount - previousAmount;

        if (paymentDifference > 0) {
          // Only record positive payments (increases)
          await storage.recordPayment(
            id,
            paymentDifference,
            currentUser.id,
            `Payment recorded by admin`
          );
        }
      }

      res.json(user);
    } catch (error) {
      if (error instanceof ZodError) {
        return res.status(400).json({ message: "Validation error", errors: error.errors });
      }
      console.error("Error updating user:", error);
      res.status(500).json({ message: "Failed to update user" });
    }
  });

  app.patch("/api/users/:id/disable", requireAuth, requireRole(["ADMIN"]), async (req, res) => {
    try {
      const { id } = req.params;
      await storage.disableUser(id);
      res.json({ message: "User disabled successfully" });
    } catch (error) {
      console.error("Error disabling user:", error);
      res.status(500).json({ message: "Failed to disable user" });
    }
  });

  app.patch("/api/users/:id/enable", requireAuth, requireRole(["ADMIN"]), async (req, res) => {
    try {
      const { id } = req.params;
      await storage.enableUser(id);
      res.json({ message: "User enabled successfully" });
    } catch (error) {
      console.error("Error enabling user:", error);
      res.status(500).json({ message: "Failed to enable user" });
    }
  });

  app.delete("/api/users/:id", requireAuth, requireRole(["ADMIN"]), async (req, res) => {
    try {
      const { id } = req.params;
      const currentUser = (req.user ?? req.session.user)!;

      // Prevent self-deletion
      if (id === currentUser.id) {
        return res.status(403).json({ message: "You cannot delete your own account" });
      }

      // Get user details before deletion for audit log
      const userToDelete = await storage.getUser(id);

      await storage.deleteUser(id);

      // Audit log
      console.log(`[AUDIT] User deletion: Admin ${currentUser.email} (${currentUser.id}) deleted user ${userToDelete?.email || 'Unknown'} (${id}) at ${new Date().toISOString()}`);

      res.json({ message: "User deleted successfully" });
    } catch (error) {
      console.error("Error deleting user:", error);
      res.status(500).json({ message: "Failed to delete user" });
    }
  });

  // Employee Assignment Routes (Admin only)
  app.get("/api/clients/:clientId/assignments", requireAuth, requireRole(["ADMIN"]), async (req, res) => {
    try {
      const { clientId } = req.params;
      const assignments = await storage.getClientAssignments(clientId);
      res.json(assignments);
    } catch (error) {
      console.error("Error fetching assignments:", error);
      res.status(500).json({ message: "Failed to fetch assignments" });
    }
  });

  app.post("/api/clients/:clientId/assignments", requireAuth, requireRole(["ADMIN"]), async (req, res) => {
    try {
      const { clientId } = req.params;
      const { employeeId } = req.body;

      if (!employeeId) {
        return res.status(400).json({ message: "Employee ID is required" });
      }

      const assignment = await storage.assignEmployee(clientId, employeeId);
      res.status(201).json(assignment);
    } catch (error) {
      console.error("Error assigning employee:", error);
      res.status(500).json({ message: "Failed to assign employee" });
    }
  });

  app.delete("/api/clients/:clientId/assignments/:employeeId", requireAuth, requireRole(["ADMIN"]), async (req, res) => {
    try {
      const { clientId, employeeId } = req.params;
      await storage.unassignEmployee(clientId, employeeId);
      res.json({ message: "Employee unassigned successfully" });
    } catch (error) {
      console.error("Error unassigning employee:", error);
      res.status(500).json({ message: "Failed to unassign employee" });
    }
  });

  // Gemini API Key management
  app.put("/api/users/:userId/gemini-key", requireAuth, async (req, res) => {
    try {
      const { userId } = req.params;
      const { apiKey, preferredModel, fallbackApiKey } = req.body;
      const currentUser = (req.user ?? req.session.user)!;

      // Users can only update their own settings
      if (currentUser.id !== userId) {
        return res.status(403).json({ message: "You can only update your own settings" });
      }

      const updateData: any = {};
      if (apiKey !== undefined) updateData.geminiApiKey = apiKey;
      if (preferredModel !== undefined) updateData.preferredGeminiModel = preferredModel;
      if (fallbackApiKey !== undefined) updateData.fallbackGeminiApiKey = fallbackApiKey;

      if (Object.keys(updateData).length === 0) {
        return res.status(400).json({ message: "No settings provided to update" });
      }

      await storage.updateUser(userId, updateData);
      res.json({ message: "Gemini settings saved successfully" });
    } catch (error) {
      console.error("Error saving Gemini settings:", error);
      res.status(500).json({ message: "Failed to save settings" });
    }
  });

  // Resume credits endpoints
  app.get("/api/resume-credits", requireAuth, async (req, res) => {
    try {
      const currentUser = (req.user ?? req.session.user)!;
      const user = await storage.getUser(currentUser.id);

      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }

      const resumeCredits = (user as any).resumeCredits ?? 0;
      res.json({ resumeCredits });
    } catch (error) {
      console.error("Error fetching resume credits:", error);
      res.status(500).json({ message: "Failed to fetch resume credits" });
    }
  });

  app.post("/api/users/:id/resume-credits", requireAuth, requireRole(["ADMIN"]), async (req, res) => {
    try {
      const { id } = req.params;
      const { credits, plan } = req.body;

      if (!credits || typeof credits !== 'number' || credits <= 0) {
        return res.status(400).json({ message: "Valid credits amount is required" });
      }

      const user = await storage.getUser(id);
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }

      const currentCredits = (user as any).resumeCredits ?? 0;
      const newCredits = currentCredits + credits;

      await storage.updateUser(id, { resumeCredits: newCredits } as any);

      res.json({
        message: `Added ${credits} resume credits`,
        resumeCredits: newCredits,
        plan: plan || 'Custom'
      });
    } catch (error) {
      console.error("Error adding resume credits:", error);
      res.status(500).json({ message: "Failed to add resume credits" });
    }
  });

  // Helper function to retry Gemini operations with exponential backoff and fallback key support
  async function retryGemini<T>(
    operation: (apiKey: string) => Promise<T>,
    primaryApiKey: string,
    fallbackApiKey?: string | null,
    maxAttempts = 3
  ): Promise<T> {
    let currentApiKey = primaryApiKey;
    let usingFallback = false;

    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
      try {
        return await operation(currentApiKey);
      } catch (error: any) {
        const isQuotaError = error.message?.includes('quota') || error.status === 429;
        const isOverloadedError =
          error.message?.includes('overloaded') ||
          error.message?.includes('UNAVAILABLE') ||
          error.status === 503;

        // If it's a quota error or we've tried a few times with overload, try the fallback key if available
        if ((isQuotaError || (isOverloadedError && attempt >= 2)) && fallbackApiKey && !usingFallback) {
          console.log(`Switching to fallback Gemini API key due to ${isQuotaError ? 'quota' : 'overload'}...`);
          currentApiKey = fallbackApiKey;
          usingFallback = true;
          // Don't increment attempt counter when switching to fallback for the first time
          // but do a small delay
          await new Promise(resolve => setTimeout(resolve, 1000));
          continue;
        }

        if (isOverloadedError && attempt < maxAttempts) {
          const delay = Math.pow(2, attempt) * 1000;
          console.log(`Gemini overloaded/unavailable. Retrying in ${delay}ms (attempt ${attempt}/${maxAttempts})...`);
          await new Promise(resolve => setTimeout(resolve, delay));
          continue;
        }
        throw error;
      }
    }
    throw new Error("Max retry attempts reached");
  }

  // Resume generation with Gemini AI
  app.post("/api/generate-resume/:clientId", requireAuth, async (req, res) => {
    try {
      const { clientId } = req.params;
      const { jobDescription, resumeProfileId } = req.body;
      const currentUser = (req.user ?? req.session.user)!;

      if (!jobDescription || typeof jobDescription !== 'string') {
        return res.status(400).json({ message: "Job description is required" });
      }

      // Check permissions: ADMIN, EMPLOYEE, or CLIENT (only for their own profile)
      if (currentUser.role === "CLIENT" && currentUser.id !== clientId) {
        return res.status(403).json({ message: "Access denied" });
      }

      if (currentUser.role !== "ADMIN" && currentUser.role !== "EMPLOYEE" && currentUser.role !== "CLIENT") {
        return res.status(403).json({ message: "Access denied" });
      }

      // Get current user's Gemini settings
      const user = await storage.getUser(currentUser.id);
      if (!user || !user.geminiApiKey) {
        return res.status(400).json({ message: "Please configure your Gemini API key in settings" });
      }

      // Check resume credits for CLIENT users (use database user's role as source of truth)
      if (user.role === "CLIENT") {
        const resumeCredits = (user as any).resumeCredits ?? 0;
        console.log(`[Credit Check] User ${user.id} (${user.email}) has ${resumeCredits} credits`);
        if (resumeCredits <= 0) {
          console.log(`[Credit Check] Insufficient credits for user ${user.id}`);
          return res.status(402).json({
            message: "Insufficient resume credits",
            resumeCredits: 0,
            plans: [
              { name: "Starter", credits: 25, price: 25, perCredit: 1.00 },
              { name: "Basic", credits: 50, price: 40, perCredit: 0.80 },
              { name: "Standard", credits: 100, price: 70, perCredit: 0.70 },
              { name: "Pro", credits: 250, price: 150, perCredit: 0.60 },
              { name: "Unlimited", credits: 500, price: 250, perCredit: 0.50 }
            ]
          });
        }
      }

      // Resolve base resume LaTeX from (1) selected resume profile, (2) default resume profile, (3) legacy client profile field
      let baseResumeLatex: string | undefined;

      if (resumeProfileId && typeof resumeProfileId === "string") {
        const selected = await storage.getResumeProfile(clientId, resumeProfileId);
        if (!selected) {
          return res.status(400).json({ message: "Selected resume profile not found for this client" });
        }
        baseResumeLatex = selected.baseResumeLatex;
      } else {
        const defaultProfile = await storage.getDefaultResumeProfile(clientId);
        if (defaultProfile?.baseResumeLatex) {
          baseResumeLatex = defaultProfile.baseResumeLatex;
        }
      }

      if (!baseResumeLatex) {
        const clientProfile = await storage.getClientProfile(clientId);
        if (clientProfile?.baseResumeLatex) {
          baseResumeLatex = clientProfile.baseResumeLatex;
        }
      }

      if (!baseResumeLatex) {
        return res.status(400).json({ message: "Client hasn't uploaded a LaTeX resume template" });
      }

      // Initialize Gemini AI
      const { GoogleGenAI } = await import("@google/genai");

      // Construct prompt
      const prompt = `Resume Tailoring Prompt
You are an expert LaTeX resume optimizer with extensive experience in professional resume tailoring. Your task is to transform the provided LaTeX resume to precisely match the job requirements while maintaining perfect LaTeX formatting.

If a job description is included, use it to strategically tailor the resume, ensuring that relevant skills and experiences align with the position’s requirements.

OPTIMIZATION REQUIREMENTS

ONE-PAGE MAXIMUM: Ensure the resume remains within a single page while retaining all user-provided content, including experience and projects.

JOB-SPECIFIC ALIGNMENT:
Integrate key terms and phrases from the job description naturally throughout the resume.
Reorder and prioritize experiences/skills to match job requirements.
Replace generic statements with job-relevant accomplishments.
Adjust section ordering if necessary to emphasize the most relevant qualifications first.

QUANTIFIABLE ACHIEVEMENTS:
Convert general statements into specific, measurable outcomes (e.g., “Increased efficiency by 35%”).
Add metrics and specific results wherever possible.
Emphasize achievements that directly relate to the job requirements.

SPACE OPTIMIZATION (Without Removing Content):
Utilize line space efficiently (avoid lines with just one or two words).
Balance content density while maintaining readability.
Eliminate redundancies and non-essential information.
Use full lines of text rather than leaving white space.
Adjust formatting elements like font size, margin adjustments, and section spacing to fit within one page.

COURSEWORK RELEVANCE:
Adjust coursework listings to showcase an academic background relevant to the position.
Replace less relevant courses with more applicable ones based on the job description.

LANGUAGE ENHANCEMENT:
Use action verbs and impactful language that mirrors job description terminology.
Replace passive voice with active, accomplishment-focused statements.
Eliminate filler words and redundancies for maximum impact.

PERFECT LATEX FORMATTING:
Maintain proper LaTeX syntax and correct escaping of special characters.
Preserve document structure while optimizing content.
Ensure formatting consistency throughout the document.

Output Instructions
Return only the complete, optimized LaTeX code.
Do not include explanations, comments, markdown syntax, or code block markers.

Base Resume:
${baseResumeLatex}

Job Description:
${jobDescription}

Generate the tailored LaTeX resume:`;

      // Generate content
      const response = await retryGemini(
        async (apiKey) => {
          const genAI = new GoogleGenAI({ apiKey });
          return await genAI.models.generateContent({
            model: user.preferredGeminiModel || "gemini-1.5-flash",
            contents: prompt,
          });
        },
        user.geminiApiKey,
        user.fallbackGeminiApiKey
      );

      let generatedLatex = response.text;

      // Clean up any markdown code blocks if present
      generatedLatex = generatedLatex.replace(/```latex\n?/g, '').replace(/```\n?/g, '').trim();

      // Decrement resume credits for CLIENT users
      // Use database user's role as source of truth
      if (user.role === "CLIENT") {
        const currentCredits = (user as any).resumeCredits ?? 0;
        const newCredits = Math.max(0, currentCredits - 1);
        console.log(`[Credit Deduction] User ${user.id} (${user.email}): ${currentCredits} -> ${newCredits}`);
        await storage.updateUser(user.id, { resumeCredits: newCredits } as any);
        console.log(`[Credit Deduction] Successfully updated credits for user ${user.id}`);
      } else {
        console.log(`[Credit Deduction] Skipping - User ${user.id} has role: ${user.role}`);
      }

      res.json({ latex: generatedLatex });
    } catch (error: any) {
      console.error("Error generating resume:", error);

      // Handle specific Gemini API errors
      if (error.message?.includes('API key')) {
        return res.status(400).json({ message: "Invalid Gemini API key" });
      }
      if (error.message?.includes('quota')) {
        return res.status(429).json({ message: "Gemini API quota exceeded, check your API key" });
      }
      if (error.message?.includes('overloaded') || error.message?.includes('UNAVAILABLE')) {
        return res.status(503).json({ message: "The AI model is currently overloaded. Please try again in a few seconds." });
      }

      res.status(500).json({
        message: "Failed to generate resume",
        details: error.message || "Unknown error"
      });
    }
  });

  // Resume evaluation with Gemini AI (Agent 2)
  app.post("/api/evaluate-resume/:clientId", requireAuth, async (req, res) => {
    try {
      const { clientId } = req.params;
      const { latex, jobDescription } = req.body;
      const currentUser = (req.user ?? req.session.user)!;

      if (!latex || typeof latex !== 'string') {
        return res.status(400).json({ message: "LaTeX resume is required" });
      }

      if (!jobDescription || typeof jobDescription !== 'string') {
        return res.status(400).json({ message: "Job description is required" });
      }

      // Check permissions: ADMIN, EMPLOYEE, or CLIENT (only for their own profile)
      if (currentUser.role === "CLIENT" && currentUser.id !== clientId) {
        return res.status(403).json({ message: "Access denied" });
      }

      if (currentUser.role !== "ADMIN" && currentUser.role !== "EMPLOYEE" && currentUser.role !== "CLIENT") {
        return res.status(403).json({ message: "Access denied" });
      }

      // Get current user's Gemini settings
      const user = await storage.getUser(currentUser.id);
      if (!user || !user.geminiApiKey) {
        return res.status(400).json({ message: "Please configure your Gemini API key in settings" });
      }

      // Initialize Gemini AI
      const { GoogleGenAI } = await import("@google/genai");

      // Construct evaluation prompt
      const prompt = `You are an expert ATS (Applicant Tracking System) resume evaluator with 15+ years of experience. Analyze this LaTeX resume against the job description.

EVALUATION CRITERIA:
1. Keyword Matching: Extract 10-15 critical requirements from job description and check if resume addresses them
2. ATS Formatting: Proper structure, clear sections, no graphics/tables that break ATS
3. Quantifiable Achievements: Metrics, percentages, numbers showing impact
4. Job-Specific Terminology: Use of exact terms from job description
5. Content Prioritization: Most relevant qualifications prominently placed

SCORING (0-100):
- 90-100: Excellent match (90%+ requirements met, ATS-optimized, strong quantification)
- 75-89: Good match (75-89% requirements met, minor improvements needed)
- 60-74: Average match (60-74% requirements met, several gaps)
- Below 60: Poor match (significant gaps)

OUTPUT FORMAT (JSON):
{
  "score": [number 0-100],
  "overallAssessment": "[2-3 sentences]",
  "strengths": ["strength 1", "strength 2", "strength 3"],
  "improvements": ["improvement 1 with actionable advice", "improvement 2", "improvement 3"],
  "missingElements": ["missing keyword/skill 1", "missing keyword/skill 2"]
}

Job Description:
${jobDescription}

LaTeX Resume:
${latex}

Provide your evaluation in valid JSON format only, no other text:`;

      // Generate evaluation
      const response = await retryGemini(
        async (apiKey) => {
          const genAI = new GoogleGenAI({ apiKey });
          return await genAI.models.generateContent({
            model: user.preferredGeminiModel || "gemini-1.5-flash",
            contents: prompt,
          });
        },
        user.geminiApiKey,
        user.fallbackGeminiApiKey
      );

      let evaluationText = response.text.trim();

      // Clean up any markdown code blocks if present
      evaluationText = evaluationText.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();

      // Parse JSON response
      const evaluation = JSON.parse(evaluationText);

      res.json(evaluation);
    } catch (error: any) {
      console.error("Error evaluating resume:", error);

      // Handle specific Gemini API errors
      if (error.message?.includes('API key')) {
        return res.status(400).json({ message: "Invalid Gemini API key" });
      }
      if (error.message?.includes('quota')) {
        return res.status(429).json({ message: "Gemini API quota exceeded, check your API key" });
      }
      if (error.message?.includes('overloaded') || error.message?.includes('UNAVAILABLE')) {
        return res.status(503).json({ message: "The AI model is currently overloaded. Please try again in a few seconds." });
      }
      if (error instanceof SyntaxError) {
        return res.status(500).json({
          message: "Failed to parse evaluation response",
          details: "AI returned invalid JSON format"
        });
      }

      res.status(500).json({
        message: "Failed to evaluate resume",
        details: error.message || "Unknown error"
      });
    }
  });

  // Resume profile CRUD (multiple base resume templates per client)
  app.get("/api/resume-profiles/:clientId", requireAuth, async (req, res) => {
    try {
      const { clientId } = req.params;
      const currentUser = (req.user ?? req.session.user)!;

      if (currentUser.role === "CLIENT" && currentUser.id !== clientId) {
        return res.status(403).json({ message: "Access denied" });
      }
      if (currentUser.role !== "ADMIN" && currentUser.role !== "EMPLOYEE" && currentUser.role !== "CLIENT") {
        return res.status(403).json({ message: "Access denied" });
      }

      const profiles = await storage.listResumeProfiles(clientId);
      res.json(profiles);
    } catch (error: any) {
      console.error("Error listing resume profiles:", error);
      res.status(500).json({ message: "Failed to list resume profiles" });
    }
  });

  app.post("/api/resume-profiles/:clientId", requireAuth, async (req, res) => {
    try {
      const { clientId } = req.params;
      const { name, baseResumeLatex, isDefault } = req.body;
      const currentUser = (req.user ?? req.session.user)!;

      if (currentUser.role === "CLIENT" && currentUser.id !== clientId) {
        return res.status(403).json({ message: "Access denied" });
      }
      if (currentUser.role !== "ADMIN" && currentUser.role !== "EMPLOYEE" && currentUser.role !== "CLIENT") {
        return res.status(403).json({ message: "Access denied" });
      }

      if (!name || typeof name !== "string") {
        return res.status(400).json({ message: "name is required" });
      }
      if (!baseResumeLatex || typeof baseResumeLatex !== "string") {
        return res.status(400).json({ message: "baseResumeLatex is required" });
      }

      const created = await storage.createResumeProfile(clientId, {
        name,
        baseResumeLatex,
        isDefault: !!isDefault,
      } as any);

      res.json(created);
    } catch (error: any) {
      console.error("Error creating resume profile:", error);
      res.status(500).json({ message: "Failed to create resume profile" });
    }
  });

  app.put("/api/resume-profiles/:clientId/:profileId", requireAuth, async (req, res) => {
    try {
      const { clientId, profileId } = req.params;
      const { name, baseResumeLatex } = req.body;
      const currentUser = (req.user ?? req.session.user)!;

      if (currentUser.role === "CLIENT" && currentUser.id !== clientId) {
        return res.status(403).json({ message: "Access denied" });
      }
      if (currentUser.role !== "ADMIN" && currentUser.role !== "EMPLOYEE" && currentUser.role !== "CLIENT") {
        return res.status(403).json({ message: "Access denied" });
      }

      const updated = await storage.updateResumeProfile(clientId, profileId, {
        ...(name !== undefined ? { name } : {}),
        ...(baseResumeLatex !== undefined ? { baseResumeLatex } : {}),
      } as any);

      if (!updated) {
        return res.status(404).json({ message: "Resume profile not found" });
      }

      res.json(updated);
    } catch (error: any) {
      console.error("Error updating resume profile:", error);
      res.status(500).json({ message: "Failed to update resume profile" });
    }
  });

  app.post("/api/resume-profiles/:clientId/:profileId/default", requireAuth, async (req, res) => {
    try {
      const { clientId, profileId } = req.params;
      const currentUser = (req.user ?? req.session.user)!;

      if (currentUser.role === "CLIENT" && currentUser.id !== clientId) {
        return res.status(403).json({ message: "Access denied" });
      }
      if (currentUser.role !== "ADMIN" && currentUser.role !== "EMPLOYEE" && currentUser.role !== "CLIENT") {
        return res.status(403).json({ message: "Access denied" });
      }

      const updated = await storage.setDefaultResumeProfile(clientId, profileId);
      if (!updated) {
        return res.status(404).json({ message: "Resume profile not found" });
      }

      res.json(updated);
    } catch (error: any) {
      console.error("Error setting default resume profile:", error);
      res.status(500).json({ message: "Failed to set default resume profile" });
    }
  });

  app.delete("/api/resume-profiles/:clientId/:profileId", requireAuth, async (req, res) => {
    try {
      const { clientId, profileId } = req.params;
      const currentUser = (req.user ?? req.session.user)!;

      if (currentUser.role === "CLIENT" && currentUser.id !== clientId) {
        return res.status(403).json({ message: "Access denied" });
      }
      if (currentUser.role !== "ADMIN" && currentUser.role !== "EMPLOYEE" && currentUser.role !== "CLIENT") {
        return res.status(403).json({ message: "Access denied" });
      }

      const ok = await storage.deleteResumeProfile(clientId, profileId);
      if (!ok) {
        return res.status(404).json({ message: "Resume profile not found" });
      }

      res.json({ ok: true });
    } catch (error: any) {
      console.error("Error deleting resume profile:", error);
      res.status(500).json({ message: "Failed to delete resume profile" });
    }
  });

  // Resume optimization with Gemini AI (Agent 3)
  app.post("/api/optimize-resume/:clientId", requireAuth, async (req, res) => {
    try {
      const { clientId } = req.params;
      const { latex, jobDescription, previousFeedback } = req.body;
      const currentUser = (req.user ?? req.session.user)!;

      if (!latex || typeof latex !== 'string') {
        return res.status(400).json({ message: "LaTeX resume is required" });
      }

      if (!jobDescription || typeof jobDescription !== 'string') {
        return res.status(400).json({ message: "Job description is required" });
      }

      if (!previousFeedback || typeof previousFeedback !== 'object') {
        return res.status(400).json({ message: "Previous feedback is required" });
      }

      // Check permissions: ADMIN, EMPLOYEE, or CLIENT (only for their own profile)
      if (currentUser.role === "CLIENT" && currentUser.id !== clientId) {
        return res.status(403).json({ message: "Access denied" });
      }

      if (currentUser.role !== "ADMIN" && currentUser.role !== "EMPLOYEE" && currentUser.role !== "CLIENT") {
        return res.status(403).json({ message: "Access denied" });
      }

      // Get current user's Gemini settings
      const user = await storage.getUser(currentUser.id);
      if (!user || !user.geminiApiKey) {
        return res.status(400).json({ message: "Please configure your Gemini API key in settings" });
      }

      // Initialize Gemini AI
      const { GoogleGenAI } = await import("@google/genai");

      const { score, strengths, improvements, missingElements } = previousFeedback;

      // Construct optimization prompt
      const prompt = `You are an expert LaTeX resume optimizer. Your task is to improve this resume based on specific feedback from an ATS evaluation.

PREVIOUS EVALUATION FEEDBACK:
Score: ${score}/100
Strengths: ${strengths?.join(', ') || 'None identified'}
Areas for Improvement: ${improvements?.join(', ') || 'None identified'}
Missing Elements: ${missingElements?.join(', ') || 'None identified'}

OPTIMIZATION STRATEGY:
1. Address every improvement point mentioned in the feedback
2. Integrate all missing elements naturally into relevant sections
3. Enhance keyword density for job-specific terms
4. Add more quantifiable achievements where possible
5. Improve ATS formatting (simple structure, clear headers, no complex formatting)
6. Keep resume to ONE PAGE maximum
7. Preserve all existing accomplishments while making them more relevant

CRITICAL REQUIREMENTS:
- Integrate missing keywords: ${missingElements?.join(', ') || 'None'}
- Focus on improvements: ${improvements?.join('; ') || 'None'}
- Maintain perfect LaTeX syntax
- Keep one-page format
- DO NOT fabricate experiences - only reframe and optimize existing content

Job Description:
${jobDescription}

Current LaTeX Resume:
${latex}

Return ONLY the optimized LaTeX code without explanations, comments, or markdown:`;

      // Generate optimized resume
      const response = await retryGemini(
        async (apiKey) => {
          const genAI = new GoogleGenAI({ apiKey });
          return await genAI.models.generateContent({
            model: user.preferredGeminiModel || "gemini-1.5-flash",
            contents: prompt,
          });
        },
        user.geminiApiKey,
        user.fallbackGeminiApiKey
      );

      let optimizedLatex = response.text;

      // Clean up any markdown code blocks if present
      optimizedLatex = optimizedLatex.replace(/```latex\n?/g, '').replace(/```\n?/g, '').trim();

      res.json({ latex: optimizedLatex });
    } catch (error: any) {
      console.error("Error optimizing resume:", error);

      // Handle specific Gemini API errors
      if (error.message?.includes('API key')) {
        return res.status(400).json({ message: "Invalid Gemini API key" });
      }
      if (error.message?.includes('quota')) {
        return res.status(429).json({ message: "Gemini API quota exceeded, check your API key" });
      }
      if (error.message?.includes('overloaded') || error.message?.includes('UNAVAILABLE')) {
        return res.status(503).json({ message: "The AI model is currently overloaded. Please try again in a few seconds." });
      }

      res.status(500).json({
        message: "Failed to optimize resume",
        details: error.message || "Unknown error"
      });
    }
  });

  // Base LaTeX Generator - Convert plain text resume to LaTeX (EMPLOYEE/ADMIN only)
  // Step 1: Only generates LaTeX from plain text, no custom instructions
  app.post("/api/generate-base-latex/:clientId", requireAuth, async (req, res) => {
    try {
      const { clientId } = req.params;
      const { plainTextResume } = req.body;
      const currentUser = (req.user ?? req.session.user)!;

      // Log received data for debugging
      console.log("[Base LaTeX Generator] Received request:");
      console.log("  - plainTextResume length:", plainTextResume?.length || 0);

      if (!plainTextResume || typeof plainTextResume !== 'string') {
        return res.status(400).json({ message: "Plain text resume is required" });
      }

      // Only EMPLOYEE and ADMIN can use this feature
      if (currentUser.role !== "ADMIN" && currentUser.role !== "EMPLOYEE") {
        return res.status(403).json({ message: "Access denied. Only employees and admins can generate base LaTeX resumes." });
      }

      // Get current user's Gemini settings
      const user = await storage.getUser(currentUser.id);
      if (!user || !user.geminiApiKey) {
        return res.status(400).json({ message: "Please configure your Gemini API key in settings" });
      }

      // Initialize Gemini AI
      const { GoogleGenAI } = await import("@google/genai");

      // LaTeX template structure - OPTIMIZED VERSION with balanced spacing (no overlaps)
      // Key improvements:
      // - Use tabularx (X column) so long left-side headings wrap instead of colliding with right-side dates/locations
      // - Use \\flushbottom to reduce large unused bottom space on a one-page resume
      const latexTemplate = `\\documentclass[letterpaper,10pt]{article}

\\usepackage{latexsym}
\\usepackage[empty]{fullpage}
\\usepackage{titlesec}
\\usepackage[usenames,dvipsnames]{color}
\\usepackage{enumitem}
\\usepackage[hidelinks]{hyperref}
\\usepackage{fancyhdr}
\\usepackage{tabularx, multicol}
\\usepackage{array}

\\pagestyle{fancy}
\\fancyhf{}
\\renewcommand{\\headrulewidth}{0pt}
\\renewcommand{\\footrulewidth}{0pt}

% Optimized margins - tight but no overlap
\\addtolength{\\oddsidemargin}{-0.5in}
\\addtolength{\\evensidemargin}{-0.5in}
\\addtolength{\\textwidth}{1in}
\\addtolength{\\topmargin}{-0.6in}
\\addtolength{\\textheight}{1.2in}

\\urlstyle{same}
\\raggedright
\\flushbottom
\\setlength{\\tabcolsep}{0in}
\\setlength{\\emergencystretch}{2em}

% Tabularx helper column for wrapping long headings
\\newcolumntype{L}{>{\\raggedright\\arraybackslash}X}

% Section formatting - balanced spacing
\\titleformat{\\section}{
  \\vspace{-8pt}\\scshape\\raggedright\\large
}{}{0em}{}[\\color{black}\\titlerule \\vspace{-6pt}]

% Custom commands with proper spacing
\\newcommand{\\resumeItem}[1]{
  \\item\\small{
    {#1 \\vspace{-2pt}}
  }
}

\\newcommand{\\resumeSubheading}[4]{
  \\vspace{-2pt}\\item
    \\begin{tabularx}{0.97\\textwidth}[t]{@{}Lr@{}}
      \\textbf{#1} & #2 \\\\
      \\textit{\\small#3} & \\textit{\\small #4} \\\\
    \\end{tabularx}\\vspace{-5pt}
}

\\newcommand{\\resumeProjectHeading}[2]{
    \\item
    \\begin{tabularx}{0.97\\textwidth}{@{}Lr@{}}
      \\small#1 & #2 \\\\
    \\end{tabularx}\\vspace{-5pt}
}

\\newcommand{\\resumeSubHeadingListStart}{\\begin{itemize}[leftmargin=0.1in, label={}]}
\\newcommand{\\resumeSubHeadingListEnd}{\\end{itemize}}
\\newcommand{\\resumeItemListStart}{\\begin{itemize}[leftmargin=0.15in, topsep=0pt, parsep=0pt, itemsep=0pt]}
\\newcommand{\\resumeItemListEnd}{\\end{itemize}\\vspace{-4pt}}

\\begin{document}

% HEADER - Name and Contact Info
\\begin{center}
    \\textbf{\\Huge \\scshape [FULL NAME]} \\\\ \\vspace{2pt}
    \\small [PHONE] $|$ \\href{mailto:[EMAIL]}{\\underline{[EMAIL]}} $|$ [LOCATION] $|$ 
    \\href{[LINKEDIN_URL]}{\\underline{linkedin.com/in/[USERNAME]}} $|$
    \\href{[GITHUB_URL]}{\\underline{github.com/[USERNAME]}}
\\end{center}

% EDUCATION SECTION
\\section{Education}
  \\resumeSubHeadingListStart
    \\resumeSubheading
      {[UNIVERSITY NAME]}{[LOCATION]}
      {[DEGREE]}{[DATES]}
      \\resumeItemListStart
        \\resumeItem{Relevant Coursework: [COURSES]}
        \\resumeItem{GPA: [GPA] | [HONORS/AWARDS]}
      \\resumeItemListEnd
  \\resumeSubHeadingListEnd

% EXPERIENCE SECTION
\\section{Work Experience}
\\resumeSubHeadingListStart
    \\resumeSubheading
      {[COMPANY NAME]}{[LOCATION]}
      {[JOB TITLE]}{[DATES]}
    \\resumeItemListStart
        \\resumeItem{[ACHIEVEMENT with specific metrics, numbers, and measurable impact]}
        \\resumeItem{[ACHIEVEMENT with specific metrics, numbers, and measurable impact]}
        \\resumeItem{[ACHIEVEMENT with specific metrics, numbers, and measurable impact]}
    \\resumeItemListEnd
\\resumeSubHeadingListEnd

% PROJECTS SECTION
\\section{Projects}
\\resumeSubHeadingListStart
    \\resumeProjectHeading
        {\\textbf{[PROJECT NAME]} $|$ \\emph{[TECHNOLOGIES]}}{[DATES]}
    \\resumeItemListStart
        \\resumeItem{[PROJECT DESCRIPTION with scope, scale, and impact]}
        \\resumeItem{[TECHNICAL IMPLEMENTATION details and quantifiable results]}
    \\resumeItemListEnd
\\resumeSubHeadingListEnd

% TECHNICAL SKILLS SECTION
\\section{Technical Skills}
\\begin{itemize}[leftmargin=0.1in, label={}, itemsep=-2pt]
    \\small{\\item{
     \\textbf{Languages:} [LANGUAGES] \\\\
     \\textbf{Frameworks:} [FRAMEWORKS] \\\\
     \\textbf{Databases:} [DATABASES] \\\\
     \\textbf{Developer Tools:} [TOOLS] \\\\
     \\textbf{Libraries:} [LIBRARIES]
    }}
\\end{itemize}

\\end{document}`;

      console.log("[Base LaTeX Generator] Building prompt for initial LaTeX generation...");

      // Construct the prompt (no custom instructions - those come in Step 2)
      const prompt = `You are an expert LaTeX resume formatter. Convert the following plain text resume into a professionally formatted LaTeX resume using EXACTLY the template structure provided below.

CRITICAL REQUIREMENTS:
1. **ONE PAGE MAXIMUM - THIS IS MANDATORY**: The resume MUST fit on exactly ONE page. This is non-negotiable.
2. Use the EXACT LaTeX template structure provided - do not modify the preamble, custom commands, or formatting
3. Extract ALL information from the plain text resume and organize it into the correct sections
4. Maintain perfect LaTeX syntax with proper escaping of special characters (%, &, $, #, _, {, }, ~, ^)
5. Use action verbs and quantify achievements where possible
6. Organize sections in this order: Header (name/contact), Education, Experience, Projects, Technical Skills
7. If certain sections are missing from the input, include them with placeholder comments or omit if truly not applicable
8. Ensure ATS (Applicant Tracking System) compatibility by using simple formatting

ONE-PAGE OPTIMIZATION & CONTENT QUALITY:
- Limit each job/experience to 3-4 bullet points maximum
- Each bullet point should be 1.5-2 lines long - detailed but not overflowing
- Include SPECIFIC METRICS and NUMBERS in every bullet point (e.g., "improved efficiency by 40%", "processed 10K+ records", "reduced time from 2s to 0.5s")
- Use the compact spacing already built into the template - DO NOT add extra \\vspace commands
- Include only the most relevant and recent experiences
- For projects section, include 2-3 most impressive projects with technical depth
- Technical Skills section should be comprehensive - list ALL relevant skills from the input
- Fill available space with valuable content - add context, scale, and impact to achievements
- AVOID lines that are too short or too long - aim for balanced line lengths
- Remove filler words but ADD meaningful details (team size, user count, performance gains)

LATEX TEMPLATE TO FOLLOW EXACTLY:
${latexTemplate}

PLAIN TEXT RESUME TO CONVERT:
${plainTextResume}

OUTPUT INSTRUCTIONS:
- Return ONLY the complete LaTeX code
- Do NOT include any explanations, comments outside the LaTeX, or markdown code blocks
- Ensure all special characters are properly escaped
- The output should compile without errors in any standard LaTeX environment
- VERIFY the content will fit on ONE PAGE before outputting`;

      // Generate LaTeX
      const response = await retryGemini(
        async (apiKey) => {
          const genAI = new GoogleGenAI({ apiKey });
          return await genAI.models.generateContent({
            model: user.preferredGeminiModel || "gemini-1.5-flash",
            contents: prompt,
          });
        },
        user.geminiApiKey,
        user.fallbackGeminiApiKey
      );

      let generatedLatex = response.text;

      // Clean up any markdown code blocks if present
      generatedLatex = generatedLatex.replace(/```latex\n?/g, '').replace(/```\n?/g, '').trim();

      res.json({ latex: generatedLatex });
    } catch (error: any) {
      console.error("Error generating base LaTeX:", error);

      // Handle specific Gemini API errors
      if (error.message?.includes('API key')) {
        return res.status(400).json({ message: "Invalid Gemini API key" });
      }
      if (error.message?.includes('quota')) {
        return res.status(429).json({ message: "Gemini API quota exceeded, check your API key" });
      }
      if (error.message?.includes('overloaded') || error.message?.includes('UNAVAILABLE')) {
        return res.status(503).json({ message: "The AI model is currently overloaded. Please try again in a few seconds." });
      }

      res.status(500).json({
        message: "Failed to generate base LaTeX",
        details: error.message || "Unknown error"
      });
    }
  });

  // Update/Refine Base LaTeX with custom instructions (EMPLOYEE/ADMIN only)
  app.post("/api/update-base-latex/:clientId", requireAuth, async (req, res) => {
    try {
      const { clientId } = req.params;
      const { baseLatex, customInstructions } = req.body;
      const currentUser = (req.user ?? req.session.user)!;

      // Log received data for debugging
      console.log("[Update Base LaTeX] Received request:");
      console.log("  - baseLatex length:", baseLatex?.length || 0);
      console.log("  - customInstructions:", customInstructions ? `"${customInstructions.substring(0, 100)}..."` : "(none)");

      if (!baseLatex || typeof baseLatex !== 'string') {
        return res.status(400).json({ message: "Base LaTeX code is required" });
      }

      if (!customInstructions || typeof customInstructions !== 'string' || !customInstructions.trim()) {
        return res.status(400).json({ message: "Custom instructions are required to update the resume" });
      }

      // Only EMPLOYEE and ADMIN can use this feature
      if (currentUser.role !== "ADMIN" && currentUser.role !== "EMPLOYEE") {
        return res.status(403).json({ message: "Access denied. Only employees and admins can update base LaTeX resumes." });
      }

      // Get current user's Gemini settings
      const user = await storage.getUser(currentUser.id);
      if (!user || !user.geminiApiKey) {
        return res.status(400).json({ message: "Please configure your Gemini API key in settings" });
      }

      // Initialize Gemini AI
      const { GoogleGenAI } = await import("@google/genai");

      // Construct the update prompt
      const prompt = `You are an expert LaTeX resume editor. Your task is to update and refine the following LaTeX resume based on the employee's specific instructions.

CURRENT LATEX RESUME:
${baseLatex}

=== EMPLOYEE INSTRUCTIONS (FOLLOW THESE CAREFULLY) ===
${customInstructions.trim()}
=== END OF INSTRUCTIONS ===

REQUIREMENTS:
1. **ONE PAGE MAXIMUM**: The resume MUST still fit on exactly ONE page after modifications
2. Follow the employee's instructions precisely - they know what the client needs
3. Maintain perfect LaTeX syntax - ensure the code compiles without errors
4. Properly escape all special characters (%, &, $, #, _, {, }, ~, ^)
5. Keep the same template structure and formatting commands
6. Do NOT remove any sections unless explicitly instructed
7. Enhance content quality while following instructions

COMMON INSTRUCTION TYPES TO HANDLE:
- Emphasize/highlight specific skills or experiences
- Add or modify keywords for ATS optimization
- Adjust section ordering or prominence
- Expand or condense certain sections
- Change tone or language style
- Add specific technical terms or certifications

OUTPUT:
- Return ONLY the complete updated LaTeX code
- Do NOT include any explanations, comments, or markdown code blocks
- Ensure the output compiles without errors`;

      console.log("[Update Base LaTeX] Building prompt, sending to AI...");

      // Generate updated LaTeX
      const response = await retryGemini(
        async (apiKey) => {
          const genAI = new GoogleGenAI({ apiKey });
          return await genAI.models.generateContent({
            model: user.preferredGeminiModel || "gemini-1.5-flash",
            contents: prompt,
          });
        },
        user.geminiApiKey,
        user.fallbackGeminiApiKey
      );

      let updatedLatex = response.text;

      // Clean up any markdown code blocks if present
      updatedLatex = updatedLatex.replace(/```latex\n?/g, '').replace(/```\n?/g, '').trim();

      console.log("[Update Base LaTeX] Successfully generated updated LaTeX");
      res.json({ latex: updatedLatex });
    } catch (error: any) {
      console.error("Error updating base LaTeX:", error);

      // Handle specific Gemini API errors
      if (error.message?.includes('API key')) {
        return res.status(400).json({ message: "Invalid Gemini API key" });
      }
      if (error.message?.includes('quota')) {
        return res.status(429).json({ message: "Gemini API quota exceeded, check your API key" });
      }
      if (error.message?.includes('overloaded') || error.message?.includes('UNAVAILABLE')) {
        return res.status(503).json({ message: "The AI model is currently overloaded. Please try again in a few seconds." });
      }

      res.status(500).json({
        message: "Failed to update base LaTeX",
        details: error.message || "Unknown error"
      });
    }
  });

  // Job application routes
  app.get("/api/applications", requireAuth, async (req, res) => {
    try {
      const {
        clientId,
        employeeId,
        status,
        search,
        dateFrom,
        dateTo,
        page = "1",
        limit = "10",
        sortBy = "dateApplied",
        sortOrder = "desc"
      } = req.query;

      const user = (req.user ?? req.session.user)!;
      let filters: any = {
        status: status as string,
        search: search as string,
        dateFrom: dateFrom as string,
        dateTo: dateTo as string,
        page: parseInt(page as string),
        limit: parseInt(limit as string),
        sortBy: sortBy as string,
        sortOrder: sortOrder as "asc" | "desc",
      };

      // Apply role-based filtering
      if (user.role === "CLIENT") {
        filters.clientId = user.id;
      } else if (user.role === "EMPLOYEE") {
        // Employees can see all applications to prevent duplicates
        // They can still filter by specific clientId or employeeId if provided
        if (clientId) filters.clientId = clientId as string;
        if (employeeId) filters.employeeId = employeeId as string;
      } else if (user.role === "ADMIN") {
        // Admin can specify filters
        if (clientId) filters.clientId = clientId as string;
        if (employeeId) filters.employeeId = employeeId as string;
      }

      const result = await storage.listJobApplications(filters);
      res.json(result);
    } catch (error) {
      console.error("Error fetching applications:", error);
      res.status(500).json({ message: "Failed to fetch applications" });
    }
  });

  app.post("/api/applications", requireAuth, requireRole(["ADMIN", "EMPLOYEE"]), async (req, res) => {
    try {
      const applicationData = insertJobApplicationSchema.parse(req.body);
      const user = (req.user ?? req.session.user)!;

      // Set appliedByName and employeeId based on user role
      let finalApplicationData: any = { ...applicationData };

      if (user.role === "EMPLOYEE") {
        finalApplicationData.employeeId = user.id;
        finalApplicationData.appliedByName = user.name;
      } else if (user.role === "ADMIN") {
        // Admin needs to specify employeeId, get employee name from storage
        if (!applicationData.employeeId) {
          return res.status(400).json({ message: "Employee ID is required for admin submissions" });
        }
        const employee = await storage.getUser(applicationData.employeeId);
        if (!employee) {
          return res.status(400).json({ message: "Invalid employee ID" });
        }
        finalApplicationData.appliedByName = employee.name;
      }

      const application = await storage.createJobApplication(finalApplicationData);
      // Decrement client's applicationsRemaining (min 0) - only for CLIENT users
      try {
        const client = await storage.getUser(application.clientId);
        if (client && client.role === "CLIENT") {
          const currentLeft = (client as any).applicationsRemaining ?? 0;
          const newLeft = Math.max(0, currentLeft - 1);
          if (newLeft !== currentLeft) {
            await storage.updateUser(client.id, { applicationsRemaining: newLeft } as any);
          }
        }
      } catch (e) {
        console.error("Failed to decrement applicationsRemaining:", e);
      }
      res.status(201).json(application);
    } catch (error) {
      if (error instanceof ZodError) {
        return res.status(400).json({ message: "Validation error", errors: error.errors });
      }
      console.error("Error creating application:", error);
      res.status(500).json({ message: "Failed to create application" });
    }
  });

  app.patch("/api/applications/:id", requireAuth, async (req, res) => {
    try {
      const { id } = req.params;
      const applicationData = updateJobApplicationSchema.parse(req.body);
      const user = (req.user ?? req.session.user)!;

      const existing = await storage.getJobApplication(id);
      if (!existing) {
        return res.status(404).json({ message: "Application not found" });
      }

      // Permission checks and field restrictions
      if (user.role === "EMPLOYEE") {
        if (existing.employeeId !== user.id) {
          return res.status(403).json({ message: "You can only edit your own applications" });
        }
        // Employees can update any allowed fields from schema
      } else if (user.role === "CLIENT") {
        if (existing.clientId !== user.id) {
          return res.status(403).json({ message: "You can only update your own applications" });
        }
        // Clients can only update status
        if (!("status" in applicationData) || !applicationData.status) {
          return res.status(400).json({ message: "Clients can only update application status" });
        }
        // Reduce payload to status only
        (Object.keys(applicationData) as Array<keyof typeof applicationData>).forEach((k) => {
          if (k !== "status") {
            delete (applicationData as any)[k];
          }
        });
      } else if (user.role !== "ADMIN") {
        return res.status(403).json({ message: "Insufficient permissions" });
      }

      const application = await storage.updateJobApplication(id, applicationData);
      if (!application) {
        return res.status(404).json({ message: "Application not found" });
      }

      res.json(application);
    } catch (error) {
      if (error instanceof ZodError) {
        return res.status(400).json({ message: "Validation error", errors: error.errors });
      }
      console.error("Error updating application:", error);
      res.status(500).json({ message: "Failed to update application" });
    }
  });

  app.delete("/api/applications/:id", requireAuth, async (req, res) => {
    try {
      const { id } = req.params;
      const user = (req.user ?? req.session.user)!;

      // Get the application to check permissions
      const application = await storage.getJobApplication(id);
      if (!application) {
        return res.status(404).json({ message: "Application not found" });
      }

      // Check if user can delete this application
      const canDelete =
        user.role === "ADMIN" ||
        (user.role === "CLIENT" && application.clientId === user.id);

      if (!canDelete) {
        return res.status(403).json({ message: "Access denied" });
      }

      await storage.deleteJobApplication(id);
      res.json({ message: "Application deleted successfully" });
    } catch (error) {
      console.error("Error deleting application:", error);
      res.status(500).json({ message: "Failed to delete application" });
    }
  });

  // Bulk delete applications endpoint
  app.delete("/api/applications/bulk", requireAuth, async (req, res) => {
    try {
      const { ids } = req.body;
      const user = (req.user ?? req.session.user)!;

      if (!Array.isArray(ids) || ids.length === 0) {
        return res.status(400).json({ message: "Invalid or empty ids array" });
      }

      // Get all applications to check permissions
      const applications = [];
      for (const id of ids) {
        const application = await storage.getJobApplication(id);
        if (!application) {
          return res.status(404).json({ message: `Application ${id} not found` });
        }
        applications.push(application);
      }

      // Check if user can delete all applications
      const canDeleteAll = applications.every(application =>
        user.role === "ADMIN" ||
        (user.role === "CLIENT" && application.clientId === user.id)
      );

      if (!canDeleteAll) {
        return res.status(403).json({ message: "Access denied for one or more applications" });
      }

      // Delete all applications (this will automatically update client quotas)
      for (const id of ids) {
        await storage.deleteJobApplication(id);
      }

      res.json({ message: `${ids.length} application${ids.length > 1 ? 's' : ''} deleted successfully` });
    } catch (error) {
      console.error("Error bulk deleting applications:", error);
      res.status(500).json({ message: "Failed to delete applications" });
    }
  });

  // Dashboard stats routes
  app.get("/api/stats/dashboard", requireAuth, requireRole(["ADMIN"]), async (req, res) => {
    try {
      const stats = await storage.getDashboardStats();
      res.json(stats);
    } catch (error) {
      console.error("Error fetching dashboard stats:", error);
      res.status(500).json({ message: "Failed to fetch dashboard stats" });
    }
  });

  app.get("/api/stats/employee/:id", requireAuth, async (req, res) => {
    try {
      const { id } = req.params;
      const user = (req.user ?? req.session.user)!;

      // Employees can only see their own stats
      if (user.role === "EMPLOYEE" && user.id !== id) {
        return res.status(403).json({ message: "Access denied" });
      }

      const stats = await storage.getEmployeeStats(id);
      const earningsUsd = Number(((stats.myApplications || 0) * 0.2).toFixed(2));
      res.json({ ...stats, earningsUsd });
    } catch (error) {
      console.error("Error fetching employee stats:", error);
      res.status(500).json({ message: "Failed to fetch employee stats" });
    }
  });

  app.get("/api/stats/client/:id", requireAuth, async (req, res) => {
    try {
      const { id } = req.params;
      const user = (req.user ?? req.session.user)!;

      // Clients can only see their own stats
      if (user.role === "CLIENT" && user.id !== id) {
        return res.status(403).json({ message: "Access denied" });
      }

      const stats = await storage.getClientStats(id);
      const client = await storage.getUser(id);
      res.json({ ...stats, applicationsRemaining: client ? (client as any).applicationsRemaining ?? 0 : 0 });
    } catch (error) {
      console.error("Error fetching client stats:", error);
      res.status(500).json({ message: "Failed to fetch client stats" });
    }
  });

  // CSV export route
  app.get("/api/applications/export", requireAuth, async (req, res) => {
    try {
      const {
        clientId,
        employeeId,
        status,
        search,
        dateFrom,
        dateTo,
      } = req.query;

      const user = (req.user ?? req.session.user)!;
      let filters: any = {
        status: status as string,
        search: search as string,
        dateFrom: dateFrom as string,
        dateTo: dateTo as string,
        limit: 10000, // Export all matching records
      };

      // Apply role-based filtering
      if (user.role === "CLIENT") {
        filters.clientId = user.id;
      } else if (user.role === "EMPLOYEE") {
        filters.employeeId = user.id;
      } else if (user.role === "ADMIN") {
        if (clientId) filters.clientId = clientId as string;
        if (employeeId) filters.employeeId = employeeId as string;
      }

      const { applications } = await storage.listJobApplications(filters);

      // Convert to CSV format
      const csvHeaders = [
        "Date Applied",
        "Applied By",
        "Client",
        "Job Title",
        "Company",
        "Location",
        "Portal",
        "Link",
        "Job Page",
        "Resume",
        "Status",
        "Mail Sent",
        "Notes"
      ];

      const csvRows = applications.map(app => [
        app.dateApplied,
        app.appliedByName,
        app.client.name,
        app.jobTitle,
        app.companyName,
        app.location || "",
        app.portalName || "",
        app.jobLink || "",
        app.jobPage || "",
        app.resumeUrl || "",
        app.status,
        app.mailSent ? "Yes" : "No",
        app.notes || ""
      ]);

      const csvContent = [csvHeaders, ...csvRows]
        .map(row => row.map(field => `"${field}"`).join(","))
        .join("\n");

      res.setHeader("Content-Type", "text/csv");
      res.setHeader("Content-Disposition", "attachment; filename=job_applications.csv");
      res.send(csvContent);
    } catch (error) {
      console.error("Error exporting applications:", error);
      res.status(500).json({ message: "Failed to export applications" });
    }
  });

  // Get clients for employee dropdown
  app.get("/api/clients", requireAuth, requireRole(["ADMIN", "EMPLOYEE"]), async (req, res) => {
    try {
      const user = (req.user ?? req.session.user)!;

      if (user.role === "EMPLOYEE") {
        // Return only assigned clients for employees
        const assignedClients = await storage.getEmployeeAssignments(user.id);
        return res.json(assignedClients.filter(u => u.isActive));
      }

      // Admin sees all clients
      const clients = await storage.listUsers({ role: "CLIENT" });
      res.json(clients.filter(user => user.isActive));
    } catch (error) {
      console.error("Error fetching clients:", error);
      res.status(500).json({ message: "Failed to fetch clients" });
    }
  });

  // Employee performance analytics (Admin only)
  app.get("/api/analytics/employee-performance", requireAuth, requireRole(["ADMIN"]), async (req, res) => {
    try {
      const analytics = await storage.getEmployeePerformanceAnalytics();
      res.json(analytics);
    } catch (error) {
      console.error("Error fetching employee performance analytics:", error);
      res.status(500).json({ message: "Failed to fetch employee performance analytics" });
    }
  });

  // Daily employee application analytics (Admin only)
  app.get("/api/analytics/daily-employee-applications", requireAuth, requireRole(["ADMIN"]), async (req, res) => {
    try {
      const analytics = await storage.getDailyEmployeeApplicationAnalytics();
      res.json(analytics);
    } catch (error) {
      console.error("Error fetching daily employee application analytics:", error);
      res.status(500).json({ message: "Failed to fetch daily employee application analytics" });
    }
  });

  // Client analytics (Admin and Employee)
  app.get("/api/analytics/client-performance", requireAuth, requireRole(["ADMIN", "EMPLOYEE"]), async (req, res) => {
    try {
      const user = (req.user ?? req.session.user)!;
      const analytics = await storage.getClientPerformanceAnalytics();

      // Filter and modify data for employees
      if (user.role === "EMPLOYEE") {
        // Get assigned clients
        const assignedClients = await storage.getEmployeeAssignments(user.id);
        const assignedClientIds = new Set(assignedClients.map(c => c.id));

        // Filter to only show assigned clients and strip payment data
        analytics.clients = analytics.clients
          .filter(client => assignedClientIds.has(client.id))
          .map(client => ({
            ...client,
            amountPaid: undefined,
            amountDue: undefined,
          }));

        // Update total count to reflect filtered results
        analytics.totalClients = analytics.clients.length;
      }

      res.json(analytics);
    } catch (error) {
      console.error("Error fetching client performance analytics:", error);
      res.status(500).json({ message: "Failed to fetch client performance analytics" });
    }
  });

  // Monthly payout analytics (Admin only)
  app.get("/api/analytics/monthly-payout", requireAuth, requireRole(["ADMIN"]), async (req, res) => {
    try {
      const month = req.query.month as string;
      const year = req.query.year as string;
      const analytics = await storage.getMonthlyPayoutAnalytics(month, year);
      res.json(analytics);
    } catch (error) {
      console.error("Error fetching monthly payout analytics:", error);
      res.status(500).json({ message: "Failed to fetch monthly payout analytics" });
    }
  });

  // Employee daily payout breakdown
  app.get("/api/analytics/employee-daily-payout/:employeeId", requireAuth, async (req, res) => {
    try {
      const { employeeId } = req.params;
      const month = req.query.month as string;
      const year = req.query.year as string;

      // Check if user is admin or the employee themselves
      if (req.user?.role !== "ADMIN" && req.user?.id !== employeeId) {
        return res.status(403).json({ message: "Access denied" });
      }

      const analytics = await storage.getEmployeeDailyPayoutBreakdown(employeeId, month, year);
      res.json(analytics);
    } catch (error) {
      console.error("Error fetching employee daily payout breakdown:", error);
      res.status(500).json({ message: "Failed to fetch employee daily payout breakdown" });
    }
  });

  // Client profile routes
  app.get("/api/client-profiles", requireAuth, requireRole(["ADMIN", "EMPLOYEE"]), async (req, res) => {
    try {
      const user = (req.user ?? req.session.user)!;
      let profiles = await storage.listClientProfiles();

      // Filter profiles for employees to only show assigned clients
      if (user.role === "EMPLOYEE") {
        const assignedClients = await storage.getEmployeeAssignments(user.id);
        const assignedClientIds = new Set(assignedClients.map(c => c.id));
        profiles = profiles.filter(p => assignedClientIds.has(p.userId));
      }

      // Parse JSON strings back to arrays for frontend
      const parsedProfiles = profiles.map(p => ({
        ...p,
        servicesRequested: JSON.parse(p.servicesRequested || '[]'),
        searchScope: JSON.parse(p.searchScope || '[]'),
        states: JSON.parse(p.states || '[]'),
        cities: JSON.parse(p.cities || '[]'),
      }));
      res.json(parsedProfiles);
    } catch (error) {
      console.error("Error fetching client profiles:", error);
      res.status(500).json({ message: "Failed to fetch client profiles" });
    }
  });

  app.get("/api/client-profiles/:userId", requireAuth, async (req, res) => {
    try {
      const { userId } = req.params;
      const user = (req.user ?? req.session.user)!;

      // Clients can only see their own profile
      if (user.role === "CLIENT" && user.id !== userId) {
        return res.status(403).json({ message: "Access denied" });
      }

      // Employees can only see profiles of assigned clients
      if (user.role === "EMPLOYEE") {
        const isAssigned = await storage.isEmployeeAssignedToClient(user.id, userId);
        if (!isAssigned) {
          return res.status(403).json({ message: "Access denied" });
        }
      }

      const profile = await storage.getClientProfile(userId);
      if (!profile) {
        return res.status(404).json({ message: "Profile not found" });
      }

      // Parse JSON strings back to arrays for frontend
      const parsedProfile = {
        ...profile,
        servicesRequested: JSON.parse(profile.servicesRequested || '[]'),
        searchScope: JSON.parse(profile.searchScope || '[]'),
        states: JSON.parse(profile.states || '[]'),
        cities: JSON.parse(profile.cities || '[]'),
      };

      res.json(parsedProfile);
    } catch (error) {
      console.error("Error fetching client profile:", error);
      res.status(500).json({ message: "Failed to fetch client profile" });
    }
  });

  app.put("/api/client-profiles/:userId", requireAuth, async (req, res) => {
    try {
      const { userId } = req.params;
      const user = (req.user ?? req.session.user)!;

      // Clients can only update their own profile, employees and admins can update any
      if (user.role === "CLIENT" && user.id !== userId) {
        return res.status(403).json({ message: "Access denied" });
      }

      const profileData = updateClientProfileSchema.parse(req.body);
      const profile = await storage.upsertClientProfile(userId, profileData);

      // Parse JSON strings back to arrays for frontend
      const parsedProfile = {
        ...profile,
        servicesRequested: JSON.parse(profile.servicesRequested || '[]'),
        searchScope: JSON.parse(profile.searchScope || '[]'),
        states: JSON.parse(profile.states || '[]'),
        cities: JSON.parse(profile.cities || '[]'),
      };

      res.json(parsedProfile);
    } catch (error) {
      if (error instanceof ZodError) {
        return res.status(400).json({ message: "Validation error", errors: error.errors });
      }
      console.error("Error updating client profile:", error);
      res.status(500).json({ message: "Failed to update client profile" });
    }
  });

  // Update only baseResumeLatex field (EMPLOYEE/ADMIN only)
  app.put("/api/client-profiles/:userId/base-latex", requireAuth, async (req, res) => {
    try {
      const { userId } = req.params;
      const { baseResumeLatex } = req.body;
      const user = (req.user ?? req.session.user)!;

      console.log("[Save Base LaTeX] Request from user:", user.id, "role:", user.role);
      console.log("[Save Base LaTeX] Target userId:", userId);
      console.log("[Save Base LaTeX] LaTeX length:", baseResumeLatex?.length || 0);

      // Only EMPLOYEE and ADMIN can use this endpoint
      if (user.role !== "ADMIN" && user.role !== "EMPLOYEE") {
        return res.status(403).json({ message: "Access denied. Only employees and admins can save base LaTeX." });
      }

      if (!baseResumeLatex || typeof baseResumeLatex !== 'string') {
        return res.status(400).json({ message: "baseResumeLatex is required" });
      }

      // Check if profile exists
      const existingProfile = await storage.getClientProfile(userId);
      if (!existingProfile) {
        return res.status(404).json({ message: "Client profile not found" });
      }

      // Update only the baseResumeLatex field using storage method
      const updated = await storage.upsertClientProfile(userId, {
        baseResumeLatex,
      } as UpdateClientProfile);

      console.log("[Save Base LaTeX] Successfully updated profile for userId:", userId);
      res.json(updated);
    } catch (error) {
      console.error("Error saving base LaTeX:", error);
      res.status(500).json({ message: "Failed to save base LaTeX" });
    }
  });

  // Payment Transaction Routes (Admin only)
  app.get("/api/payments", requireAuth, requireRole(["ADMIN"]), async (req, res) => {
    try {
      const { clientId } = req.query;
      const payments = await storage.getPaymentHistory(clientId as string | undefined);
      res.json(payments);
    } catch (error) {
      console.error("Error fetching payment history:", error);
      res.status(500).json({ message: "Failed to fetch payment history" });
    }
  });

  app.get("/api/payments/monthly-stats", requireAuth, requireRole(["ADMIN"]), async (req, res) => {
    try {
      const year = parseInt(req.query.year as string) || new Date().getFullYear();
      const stats = await storage.getMonthlyPaymentStats(year);
      res.json(stats);
    } catch (error) {
      console.error("Error fetching monthly payment stats:", error);
      res.status(500).json({ message: "Failed to fetch monthly payment stats" });
    }
  });

  // Manual payment recording endpoint (for recording past payments)
  app.post("/api/payments", requireAuth, requireRole(["ADMIN"]), async (req, res) => {
    try {
      const currentUser = (req.user ?? req.session.user)!;
      const { clientId, amount, notes } = req.body;

      if (!clientId || amount === undefined) {
        return res.status(400).json({ message: "clientId and amount are required" });
      }

      const payment = await storage.recordPayment(
        clientId,
        amount,
        currentUser.id,
        notes || "Manual payment record"
      );

      // Also update the user's amountPaid
      const client = await storage.getUser(clientId);
      if (client) {
        const currentAmountPaid = (client as any).amountPaid || 0;
        await storage.updateUser(clientId, {
          amountPaid: currentAmountPaid + amount,
        } as any);
      }

      res.json(payment);
    } catch (error) {
      console.error("Error recording payment:", error);
      res.status(500).json({ message: "Failed to record payment" });
    }
  });

  // LaTeX auto-fix: patch common AI-generated errors before compilation
  function autoFixLatex(src: string): string {
    let tex = src;

    // ── 0. Split preamble from body ──
    const docBeginIdx = tex.indexOf('\\begin{document}');
    let preamble = '';
    let body = tex;
    if (docBeginIdx !== -1) {
      preamble = tex.slice(0, docBeginIdx);
      body = tex.slice(docBeginIdx);
    }

    // ── 0a. Replace \usepackage[...dvipsnames...]{color} → {xcolor} ──
    // The 'dvipsnames' and 'usenames' options belong to xcolor, not color.
    // Tectonic (and strict LaTeX) rejects them on the color package.
    preamble = preamble.replace(
      /\\usepackage\s*\[([^\]]*)\]\s*\{color\}/g,
      (match, opts: string) => {
        if (/dvipsnames|usenames|svgnames|x11names/i.test(opts)) {
          return `\\usepackage[${opts}]{xcolor}`;
        }
        return match;
      }
    );

    // Also handle bare \usepackage{color} → \usepackage{xcolor} for consistency
    // (xcolor is a superset and avoids conflicts if both are loaded)
    preamble = preamble.replace(/\\usepackage\s*\{color\}/g, '\\usepackage{xcolor}');

    // ── 1. Inject missing custom resume command definitions ──
    // The AI often uses these macros in the body but forgets to define them.
    // Map: command name → default definition (matching common resume templates)
    const missingDefs: Record<string, string> = {};

    const customCmds: Array<{ name: string; usage: RegExp; def: string }> = [
      {
        name: 'resumeSubHeadingListStart',
        usage: /\\resumeSubHeadingListStart/,
        def: '\\newcommand{\\resumeSubHeadingListStart}{\\begin{itemize}[leftmargin=0.1in, label={}]}',
      },
      {
        name: 'resumeSubHeadingListEnd',
        usage: /\\resumeSubHeadingListEnd/,
        def: '\\newcommand{\\resumeSubHeadingListEnd}{\\end{itemize}}',
      },
      {
        name: 'resumeItemListStart',
        usage: /\\resumeItemListStart/,
        def: '\\newcommand{\\resumeItemListStart}{\\begin{itemize}[leftmargin=0.15in, topsep=0pt, parsep=0pt, itemsep=0pt]}',
      },
      {
        name: 'resumeItemListEnd',
        usage: /\\resumeItemListEnd/,
        def: '\\newcommand{\\resumeItemListEnd}{\\end{itemize}\\vspace{-4pt}}',
      },
      {
        name: 'resumeItem',
        usage: /\\resumeItem\b/,
        def: '\\newcommand{\\resumeItem}[1]{\\item\\small{{#1 \\vspace{-2pt}}}}',
      },
      {
        name: 'resumeSubheading',
        usage: /\\resumeSubheading\b/,
        def: [
          '\\newcommand{\\resumeSubheading}[4]{',
          '  \\vspace{-2pt}\\item',
          '    \\begin{tabular*}{0.97\\textwidth}[t]{l@{\\extracolsep{\\fill}}r}',
          '      \\textbf{#1} & #2 \\\\',
          '      \\textit{\\small#3} & \\textit{\\small #4} \\\\',
          '    \\end{tabular*}\\vspace{-5pt}',
          '}',
        ].join('\n'),
      },
      {
        name: 'resumeSubheadingOneLine',
        usage: /\\resumeSubheadingOneLine\b/,
        def: [
          '\\newcommand{\\resumeSubheadingOneLine}[2]{',
          '  \\vspace{-2pt}\\item',
          '    \\begin{tabular*}{0.97\\textwidth}[t]{l@{\\extracolsep{\\fill}}r}',
          '      \\textbf{#1} & #2 \\\\',
          '    \\end{tabular*}\\vspace{-5pt}',
          '}',
        ].join('\n'),
      },
      {
        name: 'resumeProjectHeading',
        usage: /\\resumeProjectHeading\b/,
        def: [
          '\\newcommand{\\resumeProjectHeading}[2]{',
          '    \\item',
          '    \\begin{tabular*}{0.97\\textwidth}{l@{\\extracolsep{\\fill}}r}',
          '      \\small#1 & #2 \\\\',
          '    \\end{tabular*}\\vspace{-5pt}',
          '}',
        ].join('\n'),
      },
    ];

    for (const cmd of customCmds) {
      // Check if the command is used in the full document
      const isUsed = cmd.usage.test(body);
      // Check if it's already defined in the preamble
      const isDefined = preamble.includes(`\\newcommand{\\${cmd.name}}`)
        || preamble.includes(`\\renewcommand{\\${cmd.name}}`)
        || preamble.includes(`\\providecommand{\\${cmd.name}}`);
      if (isUsed && !isDefined) {
        missingDefs[cmd.name] = cmd.def;
        console.log(`[AutoFix] Injecting missing definition: \\${cmd.name}`);
      }
    }

    // Insert missing definitions right before \begin{document}
    if (Object.keys(missingDefs).length > 0) {
      const defsBlock = '\n% --- Auto-injected missing command definitions ---\n'
        + Object.values(missingDefs).join('\n')
        + '\n% --- End auto-injected definitions ---\n';
      preamble = preamble.trimEnd() + '\n' + defsBlock + '\n';
    }

    // ── 2. Fix lonely \item outside list environments (body only) ──
    const lines = body.split('\n');
    const fixed: string[] = [];
    let insideList = 0;
    let insideNewcommand = 0;

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      const trimmed = line.trim();

      // Track \newcommand brace depth (skip entirely)
      if (/\\newcommand/.test(trimmed)) {
        insideNewcommand++;
      }
      if (insideNewcommand > 0) {
        fixed.push(line);
        const opens = (line.match(/\{/g) || []).length;
        const closes = (line.match(/\}/g) || []).length;
        insideNewcommand += opens - closes;
        if (insideNewcommand <= 0) insideNewcommand = 0;
        continue;
      }

      // Track list environment depth (standard + custom macros)
      if (/\\begin\{(itemize|enumerate|description)\}/.test(trimmed)) {
        insideList++;
      }
      if (/\\resumeSubHeadingListStart|\\resumeItemListStart/.test(trimmed)) {
        insideList++;
      }
      if (/\\end\{(itemize|enumerate|description)\}/.test(trimmed)) {
        insideList = Math.max(0, insideList - 1);
      }
      if (/\\resumeSubHeadingListEnd|\\resumeItemListEnd/.test(trimmed)) {
        insideList = Math.max(0, insideList - 1);
      }

      // Check for lonely \item OR commands that expand to \item (e.g. \resumeSubheading)
      // outside any list environment
      const isLonelyItem = /^\\item\b/.test(trimmed);
      const isCommandWithItem = /^\\resumeSubheading\b|^\\resumeSubheadingOneLine\b|^\\resumeProjectHeading\b/.test(trimmed);

      if (insideList === 0 && (isLonelyItem || isCommandWithItem)) {
        // Wrap the orphan block in a list (use label={} so no bullets for subheadings)
        fixed.push('\\begin{itemize}[leftmargin=0.1in, label={}]');
        fixed.push(line);
        insideList++;
        let j = i + 1;
        while (j < lines.length) {
          const next = lines[j].trim();
          // Stop at section boundaries or document end
          if (/^\\section\b|^\\end\{document\}/.test(next)) {
            break;
          }
          // Stop at another \resumeSubHeadingListStart (already a proper list)
          if (/^\\resumeSubHeadingListStart/.test(next)) {
            break;
          }
          if (/\\end\{(itemize|enumerate|description)\}/.test(next) && !/\\resumeItemListEnd/.test(next)) {
            fixed.push(lines[j]);
            insideList = Math.max(0, insideList - 1);
            j++;
            break;
          }
          // Track nested lists from resumeItemListStart/End within the block
          if (/\\resumeItemListStart/.test(next)) insideList++;
          if (/\\resumeItemListEnd/.test(next)) insideList = Math.max(1, insideList - 1); // keep at least 1 for our wrapper

          fixed.push(lines[j]);
          j++;
        }
        // Close our wrapper if still open
        if (insideList > 0) {
          fixed.push('\\end{itemize}');
          insideList = Math.max(0, insideList - 1);
        }
        i = j - 1;
        continue;
      }

      fixed.push(line);
    }
    body = fixed.join('\n');

    // Rejoin preamble + body
    tex = preamble + body;

    // ── 3. Fix unmatched \begin{itemize} / \end{itemize} ──
    const beginCount = (tex.match(/\\begin\{itemize\}/g) || []).length;
    const endCount = (tex.match(/\\end\{itemize\}/g) || []).length;
    if (beginCount > endCount) {
      for (let k = 0; k < beginCount - endCount; k++) {
        tex = tex.replace(/\\end\{document\}/, '\\end{itemize}\n\\end{document}');
      }
    } else if (endCount > beginCount) {
      let surplus = endCount - beginCount;
      tex = tex.replace(/\\end\{itemize\}/g, (match) => {
        if (surplus > 0) { surplus--; return ''; }
        return match;
      });
    }

    // ── 4. Fix unclosed braces on common commands ──
    tex = tex.replace(/\\(textbf|textit|underline|emph)\{([^{}]*?)(?=\\(?:textbf|textit|underline|emph|section|item|begin|end)\{|\n\n)/g,
      '\\$1{$2}');

    // ── 5. Escape bare & outside tabular environments ──
    // The & character is a column separator in tabular/tabularx/tabular*/array.
    // Outside those environments, bare & crashes LaTeX. The AI often writes
    // "Security & Architecture" instead of "Security \& Architecture".
    {
      const bodyLines = tex.split('\n');
      let inTabular = 0;
      for (let li = 0; li < bodyLines.length; li++) {
        const ln = bodyLines[li];
        // Track tabular-like environment depth
        if (/\\begin\{(tabular\*?|tabularx|array|align|matrix)\}/.test(ln)) inTabular++;
        if (/\\end\{(tabular\*?|tabularx|array|align|matrix)\}/.test(ln)) inTabular = Math.max(0, inTabular - 1);

        // Only fix lines outside tabular environments and not in the preamble
        if (inTabular === 0 && !ln.trimStart().startsWith('%')) {
          // Replace bare & (not already escaped as \&) with \&
          // Also skip lines that contain \begin{tabular or \end{tabular (inline tabular)
          if (!/\\begin\{tabular|\\end\{tabular|\\begin\{tabularx|\\end\{tabularx/.test(ln)) {
            bodyLines[li] = ln.replace(/(?<!\\)&/g, '\\&');
          }
        }
      }
      tex = bodyLines.join('\n');
    }

    // ── 6. Remove duplicate \documentclass declarations ──
    const dcMatches = tex.match(/\\documentclass/g);
    if (dcMatches && dcMatches.length > 1) {
      let found = false;
      tex = tex.replace(/\\documentclass[^\n]*\n/g, (match) => {
        if (!found) { found = true; return match; }
        return '';
      });
    }

    // ── 6. Ensure \begin{document} and \end{document} exist ──
    if (!tex.includes('\\begin{document}')) {
      const lastPreamble = tex.lastIndexOf('\\usepackage');
      if (lastPreamble !== -1) {
        const insertPos = tex.indexOf('\n', lastPreamble);
        if (insertPos !== -1) {
          tex = tex.slice(0, insertPos + 1) + '\n\\begin{document}\n' + tex.slice(insertPos + 1);
        }
      }
    }
    if (!tex.includes('\\end{document}')) {
      tex = tex.trimEnd() + '\n\\end{document}\n';
    }

    return tex;
  }

  // PDF Generation Route: Convert LaTeX to PDF using Tectonic
  const execAsync = promisify(exec);
  app.post("/api/generate-pdf", async (req, res) => {
    try {
      const { latex } = req.body;
      if (!latex) {
        return res.status(400).json({ message: "LaTeX code is required" });
      }

      // Auto-fix common LaTeX errors before compilation
      const fixedLatex = autoFixLatex(latex);

      const fileId = randomUUID();
      const tempDir = os.tmpdir();
      const inputPath = path.join(tempDir, `${fileId}.tex`);
      const outputPdfPath = path.join(tempDir, `${fileId}.pdf`);

      // Write fixed LaTeX to temp file
      await writeFile(inputPath, fixedLatex);

      try {
        // Windows vs Linux check for Tectonic executable
        const tectonicPath = process.platform === 'win32' 
          ? path.resolve(process.cwd(), 'tectonic.exe')
          : 'tectonic';
        
        await execAsync(`"${tectonicPath}" "${inputPath}" --outdir "${tempDir}"`);
      } catch (e: any) {
        console.error("Tectonic Error:", e.stderr || e.message);
        // Clean up temp file on error
        await unlink(inputPath).catch(() => {});
        return res.status(400).json({ 
          message: "Compilation Failed", 
          details: e.stderr || e.message 
        });
      }

      // Set content type and send PDF
      res.contentType("application/pdf");
      res.sendFile(outputPdfPath, async (err) => {
        // Clean up temp files after sending
        await unlink(inputPath).catch(() => {});
        await unlink(outputPdfPath).catch(() => {});
        if (err) {
          console.error("Error sending PDF file:", err);
        }
      });

    } catch (error: any) {
      console.error("PDF Route Error:", error);
      res.status(500).json({ 
        message: "Internal Server Error",
        error: error.message 
      });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}
