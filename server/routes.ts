import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { setupAuth, requireAuth, requireRole, authenticateUser, generateJWT } from "./auth";
import { insertUserSchema, updateUserSchema, insertJobApplicationSchema, updateJobApplicationSchema } from "../shared/schema";
import { ZodError } from "zod";

export async function registerRoutes(app: Express): Promise<Server> {
  setupAuth(app);

  // Auth routes
  app.post("/api/auth/login", async (req, res) => {
    try {
      // Login attempt for user: ${email}
      const { email, password } = req.body;

      if (!email || !password) {
        // Missing credentials for login attempt
        return res.status(400).json({ message: "Email and password are required" });
      }

      const user = await authenticateUser(email, password);
      if (!user) {
        console.log("Authentication failed for:", email);
        return res.status(401).json({ message: "Invalid credentials" });
      }

      console.log("Setting session for user:", email);
      req.session.user = user;
      
      // Ensure session is saved before responding
      await new Promise<void>((resolve, reject) => {
        req.session.save((err) => {
          if (err) {
            console.error("Session save error:", err);
            reject(err);
          } else {
            console.log("Session saved successfully for:", email);
            resolve();
          }
        });
      });

      // Verify session was saved
      console.log("Session after save:", {
        sessionId: req.sessionID,
        hasUser: !!req.session.user,
        userEmail: req.session.user?.email
      });

      // Generate JWT token
      const token = generateJWT(user);
      console.log("Generated JWT token for:", email);

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

  app.post("/api/auth/logout", (req, res) => {
    req.session.destroy((err) => {
      if (err) {
        return res.status(500).json({ message: "Could not log out" });
      }
      res.json({ message: "Logged out successfully" });
    });
  });

  app.get("/api/auth/user", requireAuth, (req, res) => {
    res.json({ user: (req.user ?? req.session.user) });
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
      const user = await storage.updateUser(id, userData);
      
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
        // Clients can only see jobs applied for them
        filters.applid = user.id;
      } else if (user.role === "EMPLOYEE") {
        // Employees can see all applications to prevent duplicates
        // They can still filter by specific clientId, employeeId, or applid if provided
        if (clientId) filters.clientId = clientId as string;
        if (employeeId) filters.employeeId = employeeId as string;
        if (req.query.applid) filters.applid = req.query.applid as string;
      } else if (user.role === "ADMIN") {
        // Admin can see all applications and specify filters
        if (clientId) filters.clientId = clientId as string;
        if (employeeId) filters.employeeId = employeeId as string;
        if (req.query.applid) filters.applid = req.query.applid as string;
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

      // Set appliedByName, employeeId, and applid based on user role
      let finalApplicationData: any = { ...applicationData };
      
      if (user.role === "EMPLOYEE") {
        finalApplicationData.employeeId = user.id;
        finalApplicationData.appliedByName = user.name;
        finalApplicationData.applid = user.id; // Employee applies for themselves
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
        // For admin submissions, applid should be the employee ID (who the job is applied for)
        finalApplicationData.applid = applicationData.employeeId;
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
        // Clients can only see jobs applied for them
        filters.applid = user.id;
      } else if (user.role === "EMPLOYEE") {
        // Employees can see all applications to prevent duplicates
        if (req.query.applid) filters.applid = req.query.applid as string;
      } else if (user.role === "ADMIN") {
        if (clientId) filters.clientId = clientId as string;
        if (employeeId) filters.employeeId = employeeId as string;
        if (req.query.applid) filters.applid = req.query.applid as string;
      }

      const { applications } = await storage.listJobApplications(filters);

      // Convert to CSV format
      const csvHeaders = [
        "Date Applied",
        "Applied By",
        "Client",
        "Applied For",
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
        app.appliedFor.name,
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


  const httpServer = createServer(app);
  return httpServer;
}
