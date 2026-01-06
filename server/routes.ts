import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { setupAuth, requireAuth, requireRole, authenticateUser, generateJWT, hashPassword } from "./auth";
import { insertUserSchema, registerUserSchema, updateUserSchema, insertJobApplicationSchema, updateJobApplicationSchema, insertClientProfileSchema, updateClientProfileSchema } from "../shared/schema";
import { ZodError } from "zod";
import rateLimit from "express-rate-limit";

export async function registerRoutes(app: Express): Promise<Server> {
  setupAuth(app);

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

      // Check if user already exists
      const existingUser = await storage.getUserByEmail(userData.email);
      if (existingUser) {
        return res.status(400).json({ message: "User already exists" });
      }

      // Determine applications quota based on package
      let applicationsRemaining = 0;
      switch (userData.packageTier) {
        case "basic":
          applicationsRemaining = 250;
          break;
        case "standard":
          applicationsRemaining = 500;
          break;
        case "premium":
          applicationsRemaining = 1000;
          break;
        case "ultimate":
          applicationsRemaining = 1000;
          break;
        default:
          applicationsRemaining = 0;
      }

      const hashedPassword = await hashPassword(userData.password);
      // Cast to any to avoid strict type checking issues with inferred schema
      const user = await storage.createUser({
        ...userData,
        role: "CLIENT",
        passwordHash: hashedPassword,
        applicationsRemaining,
        isActive: true
      } as any);

      // Create empty client profile
      await storage.upsertClientProfile(user.id, {
        fullName: user.name,
        phoneNumber: "",
        mailingAddress: "",
        situation: "",
        desiredTitles: "",
        workAuthorization: "",
        sponsorshipAnswer: "",
      } as any);
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
      const userData = updateUserSchema.parse(req.body);

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
  app.post("/api/generate-resume/:clientId", requireAuth, requireRole(["ADMIN", "EMPLOYEE"]), async (req, res) => {
    try {
      const { clientId } = req.params;
      const { jobDescription } = req.body;
      const currentUser = (req.user ?? req.session.user)!;

      if (!jobDescription || typeof jobDescription !== 'string') {
        return res.status(400).json({ message: "Job description is required" });
      }

      // Get current user's Gemini settings
      const user = await storage.getUser(currentUser.id);
      if (!user || !user.geminiApiKey) {
        return res.status(400).json({ message: "Please configure your Gemini API key in settings" });
      }

      // Get client's base resume LaTeX
      const clientProfile = await storage.getClientProfile(clientId);
      if (!clientProfile || !clientProfile.baseResumeLatex) {
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
${clientProfile.baseResumeLatex}

Job Description:
${jobDescription}

Generate the tailored LaTeX resume:`;

      // Generate content
      const response = await retryGemini(
        async (apiKey) => {
          const genAI = new GoogleGenAI({ apiKey });
          return await genAI.models.generateContent({
            model: user.preferredGeminiModel || "gemini-2.5-flash",
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
  app.post("/api/evaluate-resume/:clientId", requireAuth, requireRole(["ADMIN", "EMPLOYEE"]), async (req, res) => {
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
            model: user.preferredGeminiModel || "gemini-2.5-flash",
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

  // Resume optimization with Gemini AI (Agent 3)
  app.post("/api/optimize-resume/:clientId", requireAuth, requireRole(["ADMIN", "EMPLOYEE"]), async (req, res) => {
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
            model: user.preferredGeminiModel || "gemini-2.5-flash",
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
      const analytics = await storage.getClientPerformanceAnalytics();
      
      // Strip payment data for employees
      if (req.user?.role === "EMPLOYEE") {
        analytics.clients = analytics.clients.map(client => ({
          ...client,
          amountPaid: undefined,
          amountDue: undefined,
        }));
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
      const profiles = await storage.listClientProfiles();
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

      // Clients can only see their own profile, employees and admins can see any
      if (user.role === "CLIENT" && user.id !== userId) {
        return res.status(403).json({ message: "Access denied" });
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

  const httpServer = createServer(app);
  return httpServer;
}
