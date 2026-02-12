import { users, jobApplications, clientProfiles, resumeProfiles, employeeAssignments, paymentTransactions, type User, type InsertUser, type UpdateUser, type JobApplication, type InsertJobApplication, type UpdateJobApplication, type JobApplicationWithUsers, type ClientProfile, type InsertClientProfile, type UpdateClientProfile, type ClientProfileWithUser, type ResumeProfile, type InsertResumeProfile, type UpdateResumeProfile, type EmployeeAssignment, type InsertEmployeeAssignment, type PaymentTransaction, type InsertPaymentTransaction } from "../shared/schema";
import { db } from "./db";
import { eq, and, like, ilike, desc, asc, count, sql, gte, lt, lte, or, inArray, type SQL } from "drizzle-orm";
import { alias } from "drizzle-orm/pg-core";
import { hashPassword } from "./auth";
import { cache } from "./cache";

// Retry configuration - increased for better resilience
const RETRY_ATTEMPTS = 5; // Increased from 3 to 5
const RETRY_DELAY = 1000; // 1 second base delay

// Helper function to retry database operations with exponential backoff
async function retryOperation<T>(
  operation: () => Promise<T>,
  attempts: number = RETRY_ATTEMPTS
): Promise<T> {
  for (let attempt = 1; attempt <= attempts; attempt++) {
    try {
      return await operation();
    } catch (error: any) {
      console.error(`Database operation failed (attempt ${attempt}/${attempts}):`, error);
      console.error('Error code:', error.code, 'Message:', error.message);

      // Check if it's a connection error that we should retry
      const isConnectionError =
        error.message?.includes('Connection terminated unexpectedly') ||
        error.message?.includes('connection') ||
        error.message?.includes('ECONNREFUSED') ||
        error.code === 'ECONNRESET' ||
        error.code === 'ECONNREFUSED' || // Added for Supabase Session Pooler
        error.code === 'ENOTFOUND' ||
        error.code === 'ETIMEDOUT' ||
        error.code === 'ECONNABORTED';

      if (isConnectionError) {
        if (attempt === attempts) {
          throw new Error(`Database operation failed after ${attempts} attempts: ${error.message}`);
        }

        // Wait before retrying with exponential backoff: 1s, 2s, 4s, 8s, 16s
        const delay = RETRY_DELAY * Math.pow(2, attempt - 1);
        console.log(`Connection error detected. Retrying in ${delay}ms...`);
        await new Promise(resolve => setTimeout(resolve, delay));
        continue;
      }

      // For non-connection errors, don't retry
      throw error;
    }
  }
  throw new Error(`Database operation failed after ${attempts} attempts`);
}

export interface IStorage {
  // User operations
  getUser(id: string): Promise<User | undefined>;
  getUserByEmail(email: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  updateUser(id: string, user: UpdateUser): Promise<User | undefined>;
  disableUser(id: string): Promise<void>;
  enableUser(id: string): Promise<void>;
  deleteUser(id: string): Promise<void>;
  listUsers(filters?: { role?: string; search?: string }): Promise<User[]>;

  // Job application operations
  getJobApplication(id: string): Promise<JobApplicationWithUsers | undefined>;
  createJobApplication(application: InsertJobApplication): Promise<JobApplication>;
  updateJobApplication(id: string, application: UpdateJobApplication): Promise<JobApplication | undefined>;
  deleteJobApplication(id: string): Promise<void>;
  listJobApplications(filters?: {
    clientId?: string;
    employeeId?: string;
    status?: string;
    search?: string;
    dateFrom?: string;
    dateTo?: string;
    page?: number;
    limit?: number;
    sortBy?: string;
    sortOrder?: "asc" | "desc";
  }): Promise<{ applications: JobApplicationWithUsers[]; total: number }>;

  // Dashboard stats
  getDashboardStats(): Promise<{
    totalApplications: number;
    activeEmployees: number;
    hiredThisMonth: number;
    pendingReview: number;
  }>;

  getEmployeeStats(employeeId: string): Promise<{
    myApplications: number;
    inProgress: number;
    successRate: number;
  }>;

  getClientStats(clientId: string): Promise<{
    totalApplications: number;
    inProgress: number;
    interviews: number;
    hired: number;
    amountPaid?: number;
    amountDue?: number;
  }>;

  getEmployeePerformanceAnalytics(): Promise<{
    totalPayout: number;
    employees: Array<{
      id: string;
      name: string;
      applicationsSubmitted: number;
      successRate: number;
      earnings: number;
      interviews: number;
      totalApplications: number;
      assignedClients: string[];
      applicationsToday: number;
      applicationsThisMonth: number;
      interviewsThisMonth: number;
      earningsThisMonth: number;
      activeClientsCount: number;
      totalApplicationsRemaining: number;
      effectiveWorkload: number;
      rejectedCount: number;
      rejectionRate: number;
    }>;
    weeklyPerformance: Array<{
      week: string;
      applications: number;
      employees: number;
    }>;
    dailyPerformance: Array<{
      date: string;
      applications: number;
      employees: number;
    }>;
  }>;

  getDailyEmployeeApplicationAnalytics(): Promise<{
    totalApplicationsToday: number;
    totalApplicationsYesterday: number;
    totalApplicationsLast3Days: number;
    totalApplicationsLast7Days: number;
    employees: Array<{
      id: string;
      name: string;
      applicationsToday: number;
      applicationsYesterday: number;
      applicationsLast3Days: number;
      applicationsLast7Days: number;
      totalApplications: number;
      successRate: number;
      earnings: number;
      interviews: number;
    }>;
  }>;

  // Client profile operations
  getClientProfile(userId: string): Promise<ClientProfileWithUser | undefined>;
  upsertClientProfile(userId: string, profile: InsertClientProfile | UpdateClientProfile): Promise<ClientProfile>;
  listClientProfiles(): Promise<ClientProfileWithUser[]>;

  // Resume profile operations (multiple base resumes per client)
  listResumeProfiles(clientId: string): Promise<ResumeProfile[]>;
  getResumeProfile(clientId: string, profileId: string): Promise<ResumeProfile | undefined>;
  getDefaultResumeProfile(clientId: string): Promise<ResumeProfile | undefined>;
  createResumeProfile(clientId: string, profile: Omit<InsertResumeProfile, "clientId">): Promise<ResumeProfile>;
  updateResumeProfile(clientId: string, profileId: string, profile: UpdateResumeProfile): Promise<ResumeProfile | undefined>;
  deleteResumeProfile(clientId: string, profileId: string): Promise<boolean>;
  setDefaultResumeProfile(clientId: string, profileId: string): Promise<ResumeProfile | undefined>;

  // Employee Assignment operations
  assignEmployee(clientId: string, employeeId: string): Promise<EmployeeAssignment>;
  unassignEmployee(clientId: string, employeeId: string): Promise<void>;
  getEmployeeAssignments(employeeId: string): Promise<User[]>;
  getClientAssignments(clientId: string): Promise<User[]>;

  getRejectionRateStats(ownerId: string, role: "client" | "employee"): Promise<{
    totalApplications: number;
    rejectedCount: number;
    rejectionRate: number;
    rejectedApplications: JobApplicationWithUsers[];
  }>;

  getApplicationStatusByClient(clientId: string, opts?: { limit?: number; status?: string }): Promise<{
    countsByStatus: Record<string, number>;
    applications: JobApplicationWithUsers[];
    pendingReviewCount: number;
  }>;
}

export class DatabaseStorage implements IStorage {
  async getUser(id: string): Promise<User | undefined> {
    // Check cache first (5 minute TTL)
    const cacheKey = `user:${id}`;
    const cached = cache.get<User>(cacheKey);
    if (cached) {
      return cached;
    }

    return retryOperation(async () => {
      const [user] = await db.select().from(users).where(eq(users.id, id));
      // Cache the result
      if (user) {
        cache.set(cacheKey, user, 300); // 5 minutes
      }
      return user;
    });
  }

  async getUserByEmail(email: string): Promise<User | undefined> {
    return retryOperation(async () => {
      const [user] = await db.select().from(users).where(eq(users.email, email));
      return user;
    });
  }

  async createUser(userData: InsertUser & { passwordHash?: string, packageTier?: string }): Promise<User> {
    return retryOperation(async () => {
      const passwordHash = userData.passwordHash || await hashPassword(userData.password);
      const [user] = await db
        .insert(users)
        .values({
          // Cast due to drizzle insert type narrowness vs Zod-derived type
          name: (userData as any).name,
          email: (userData as any).email,
          role: (userData as any).role,
          company: (userData as any).company,
          packageTier: userData.packageTier,
          applicationsRemaining: (userData as any).applicationsRemaining ?? 0,
          amountPaid: (userData as any).amountPaid ?? 0,
          amountDue: (userData as any).amountDue ?? 0,
          passwordHash,
          isActive: (userData as any).isActive ?? true,
          whatsappNumber: (userData as any).whatsappNumber,
        } as any)
        .returning();
      return user;
    });
  }

  async updateUser(id: string, userData: UpdateUser): Promise<User | undefined> {
    return retryOperation(async () => {
      const [user] = await db
        .update(users)
        .set({
          ...((userData as any).name !== undefined ? { name: (userData as any).name } : {}),
          ...((userData as any).email !== undefined ? { email: (userData as any).email } : {}),
          ...((userData as any).role !== undefined ? { role: (userData as any).role } : {}),
          ...((userData as any).company !== undefined ? { company: (userData as any).company } : {}),
          ...((userData as any).applicationsRemaining !== undefined ? { applicationsRemaining: (userData as any).applicationsRemaining } : {}),
          ...((userData as any).amountPaid !== undefined ? { amountPaid: (userData as any).amountPaid } : {}),
          ...((userData as any).amountDue !== undefined ? { amountDue: (userData as any).amountDue } : {}),
          ...((userData as any).isActive !== undefined ? { isActive: (userData as any).isActive } : {}),
          ...((userData as any).geminiApiKey !== undefined ? { geminiApiKey: (userData as any).geminiApiKey } : {}),
          ...((userData as any).preferredGeminiModel !== undefined ? { preferredGeminiModel: (userData as any).preferredGeminiModel } : {}),
          ...((userData as any).fallbackGeminiApiKey !== undefined ? { fallbackGeminiApiKey: (userData as any).fallbackGeminiApiKey } : {}),
          ...((userData as any).passwordHash !== undefined ? { passwordHash: (userData as any).passwordHash } : {}),
          ...((userData as any).resumeCredits !== undefined ? { resumeCredits: (userData as any).resumeCredits } : {}),
          updatedAt: new Date(),
        } as any)
        .where(eq(users.id, id))
        .returning();

      // Invalidate cache after update
      if (user) {
        cache.delete(`user:${id}`);
      }

      return user;
    });
  }

  async disableUser(id: string): Promise<void> {
    return retryOperation(async () => {
      await db
        .update(users)
        .set({ isActive: false, updatedAt: new Date() } as any)
        .where(eq(users.id, id));

      // Invalidate cache after update
      cache.delete(`user:${id}`);
    });
  }

  async enableUser(id: string): Promise<void> {
    return retryOperation(async () => {
      await db
        .update(users)
        .set({ isActive: true, updatedAt: new Date() } as any)
        .where(eq(users.id, id));

      // Invalidate cache after update
      cache.delete(`user:${id}`);
    });
  }

  async deleteUser(id: string): Promise<void> {
    return retryOperation(async () => {
      // Manual cascade delete since foreign keys might not have ON DELETE CASCADE
      // 1. Delete client profile
      await db.delete(clientProfiles).where(eq(clientProfiles.userId, id));

      // 2. Delete job applications where user is client or employee
      await db.delete(jobApplications).where(or(
        eq(jobApplications.clientId, id),
        eq(jobApplications.employeeId, id)
      ));

      // 3. Delete the user
      await db.delete(users).where(eq(users.id, id));

      // Invalidate cache
      cache.delete(`user:${id}`);
    });
  }

  async listUsers(filters?: { role?: string; search?: string }): Promise<User[]> {
    const conditions: SQL[] = [];

    if (filters?.role) {
      conditions.push(eq(users.role, filters.role as any));
    }

    if (filters?.search) {
      conditions.push(
        sql`${users.name} ILIKE ${`%${filters.search}%`} OR ${users.email} ILIKE ${`%${filters.search}%`}`
      );
    }

    return retryOperation(async () => {
      return await db
        .select()
        .from(users)
        .where(conditions.length > 0 ? and(...conditions) : undefined)
        .orderBy(desc(users.isActive), desc(users.applicationsRemaining));
    });
  }

  async getJobApplication(id: string): Promise<JobApplicationWithUsers | undefined> {
    const clientUsers = alias(users, 'client_users_single');
    const employeeUsers = alias(users, 'employee_users_single');

    return retryOperation(async () => {
      const [result] = await db
        .select({
          application: jobApplications,
          client: clientUsers,
          employee: employeeUsers,
        })
        .from(jobApplications)
        .leftJoin(clientUsers, eq(jobApplications.clientId, clientUsers.id))
        .leftJoin(employeeUsers, eq(jobApplications.employeeId, employeeUsers.id))
        .where(eq(jobApplications.id, id));

      if (!result || !result.client || !result.employee) return undefined;

      return {
        ...result.application,
        client: result.client,
        employee: result.employee,
      };
    });
  }

  async createJobApplication(applicationData: InsertJobApplication & { appliedByName: string }): Promise<JobApplication> {
    return retryOperation(async () => {
      const [application] = await db
        .insert(jobApplications)
        .values({
          clientId: (applicationData as any).clientId,
          employeeId: (applicationData as any).employeeId!,
          dateApplied: (applicationData as any).dateApplied,
          appliedByName: (applicationData as any).appliedByName,
          jobTitle: (applicationData as any).jobTitle,
          companyName: (applicationData as any).companyName,
          location: (applicationData as any).location,
          portalName: (applicationData as any).portalName,
          jobLink: (applicationData as any).jobLink,
          jobPage: (applicationData as any).jobPage,
          resumeUrl: (applicationData as any).resumeUrl,
          additionalLink: (applicationData as any).additionalLink,
          status: (applicationData as any).status || "Applied",
          mailSent: (applicationData as any).mailSent || false,
          notes: (applicationData as any).notes,
        } as any)
        .returning();
      return application;
    });
  }

  async updateJobApplication(id: string, applicationData: UpdateJobApplication): Promise<JobApplication | undefined> {
    return retryOperation(async () => {
      const [application] = await db
        .update(jobApplications)
        .set({
          ...((applicationData as any).clientId !== undefined ? { clientId: (applicationData as any).clientId } : {}),
          ...((applicationData as any).employeeId !== undefined ? { employeeId: (applicationData as any).employeeId } : {}),
          ...((applicationData as any).dateApplied !== undefined ? { dateApplied: (applicationData as any).dateApplied } : {}),
          ...((applicationData as any).jobTitle !== undefined ? { jobTitle: (applicationData as any).jobTitle } : {}),
          ...((applicationData as any).companyName !== undefined ? { companyName: (applicationData as any).companyName } : {}),
          ...((applicationData as any).location !== undefined ? { location: (applicationData as any).location } : {}),
          ...((applicationData as any).portalName !== undefined ? { portalName: (applicationData as any).portalName } : {}),
          ...((applicationData as any).jobLink !== undefined ? { jobLink: (applicationData as any).jobLink } : {}),
          ...((applicationData as any).jobPage !== undefined ? { jobPage: (applicationData as any).jobPage } : {}),
          ...((applicationData as any).resumeUrl !== undefined ? { resumeUrl: (applicationData as any).resumeUrl } : {}),
          ...((applicationData as any).additionalLink !== undefined ? { additionalLink: (applicationData as any).additionalLink } : {}),
          ...((applicationData as any).status !== undefined ? { status: (applicationData as any).status } : {}),
          ...((applicationData as any).mailSent !== undefined ? { mailSent: (applicationData as any).mailSent } : {}),
          ...((applicationData as any).notes !== undefined ? { notes: (applicationData as any).notes } : {}),
        } as any)
        .where(eq(jobApplications.id, id))
        .returning();
      return application;
    });
  }

  async deleteJobApplication(id: string): Promise<void> {
    await retryOperation(async () => {
      // First, get the application to find the client
      const [application] = await db.select().from(jobApplications).where(eq(jobApplications.id, id));

      if (!application) {
        throw new Error('Application not found');
      }

      // Delete the application
      await db.delete(jobApplications).where(eq(jobApplications.id, id));

      // Increase the client's applications remaining count
      await db
        .update(users)
        .set({
          applicationsRemaining: sql`${users.applicationsRemaining} + 1`,
          updatedAt: new Date()
        } as any)
        .where(eq(users.id, application.clientId));
    });
  }

  async listJobApplications(filters?: {
    clientId?: string;
    employeeId?: string;
    status?: string;
    search?: string;
    dateFrom?: string;
    dateTo?: string;
    page?: number;
    limit?: number;
    sortBy?: string;
    sortOrder?: "asc" | "desc";
  }): Promise<{ applications: JobApplicationWithUsers[]; total: number }> {
    const page = filters?.page || 1;
    const limit = filters?.limit || 10;
    const offset = (page - 1) * limit;

    const clientUsers = alias(users, 'client_users');
    const employeeUsers = alias(users, 'employee_users');

    return retryOperation(async () => {
      const baseQuery = db
        .select({
          application: jobApplications,
          client: clientUsers,
          employee: employeeUsers,
        })
        .from(jobApplications)
        .leftJoin(clientUsers, eq(jobApplications.clientId, clientUsers.id))
        .leftJoin(employeeUsers, eq(jobApplications.employeeId, employeeUsers.id));

      const conditions = [];

      if (filters?.clientId) {
        conditions.push(eq(jobApplications.clientId, filters.clientId));
      }

      if (filters?.employeeId) {
        conditions.push(eq(jobApplications.employeeId, filters.employeeId));
      }

      if (filters?.status) {
        conditions.push(eq(jobApplications.status, filters.status as any));
      }

      if (filters?.search) {
        const pattern = `%${filters.search}%`;
        conditions.push(
          or(
            ilike(jobApplications.jobTitle, pattern),
            ilike(jobApplications.companyName, pattern)
          )
        );
      }

      if (filters?.dateFrom) {
        conditions.push(sql`${jobApplications.dateApplied} >= ${filters.dateFrom}`);
      }

      if (filters?.dateTo) {
        conditions.push(sql`${jobApplications.dateApplied} <= ${filters.dateTo}`);
      }

      // Build the final query
      const finalQuery = baseQuery
        .where(conditions.length > 0 ? and(...conditions) : undefined)
        .orderBy(filters?.sortOrder === "asc"
          ? asc(filters?.sortBy === "dateApplied" ? jobApplications.dateApplied : jobApplications.createdAt)
          : desc(filters?.sortBy === "dateApplied" ? jobApplications.dateApplied : jobApplications.createdAt)
        );

      // Get total count - use same query structure as main query
      const countQuery = db
        .select({ count: count() })
        .from(jobApplications)
        .leftJoin(clientUsers, eq(jobApplications.clientId, clientUsers.id))
        .leftJoin(employeeUsers, eq(jobApplications.employeeId, employeeUsers.id))
        .where(conditions.length > 0 ? and(...conditions) : undefined);

      const [{ count: total }] = await countQuery;

      // Get paginated results
      const results = await finalQuery.limit(limit).offset(offset);

      const applications: JobApplicationWithUsers[] = results
        .filter((result): result is typeof result & { client: User; employee: User } =>
          result.client !== null && result.employee !== null
        )
        .map(result => ({
          ...result.application,
          client: result.client,
          employee: result.employee,
        }));

      return { applications, total };
    });
  }

  async getDashboardStats(): Promise<{
    totalApplications: number;
    activeEmployees: number;
    hiredThisMonth: number;
    pendingReview: number;
  }> {
    return retryOperation(async () => {
      const [totalApps] = await db.select({ count: count() }).from(jobApplications);

      const [activeEmps] = await db
        .select({ count: count() })
        .from(users)
        .where(and(eq(users.role, "EMPLOYEE"), eq(users.isActive, true)));

      const currentMonth = new Date().toISOString().slice(0, 7);
      const [hiredThisMonth] = await db
        .select({ count: count() })
        .from(jobApplications)
        .where(
          and(
            eq(jobApplications.status, "Hired"),
            sql`${jobApplications.updatedAt} >= ${currentMonth + '-01'}`
          )
        );

      const [pendingReview] = await db
        .select({ count: count() })
        .from(jobApplications)
        .where(sql`${jobApplications.status} IN ('Applied', 'Screening')`);

      return {
        totalApplications: totalApps.count,
        activeEmployees: activeEmps.count,
        hiredThisMonth: hiredThisMonth.count,
        pendingReview: pendingReview.count,
      };
    });
  }

  async getEmployeeStats(employeeId: string): Promise<{
    myApplications: number;
    inProgress: number;
    successRate: number;
    totalAppsRemaining?: number;
    assignedClients?: { name: string; appsRemaining: number }[];
  }> {
    return retryOperation(async () => {
      const [myApps] = await db
        .select({ count: count() })
        .from(jobApplications)
        .where(eq(jobApplications.employeeId, employeeId));

      const [inProgress] = await db
        .select({ count: count() })
        .from(jobApplications)
        .where(
          and(
            eq(jobApplications.employeeId, employeeId),
            sql`${jobApplications.status} IN ('Applied', 'Screening', 'Interview')`
          )
        );

      const [hired] = await db
        .select({ count: count() })
        .from(jobApplications)
        .where(
          and(
            eq(jobApplications.employeeId, employeeId),
            eq(jobApplications.status, "Hired")
          )
        );

      const successRate = myApps.count > 0 ? (hired.count / myApps.count) * 100 : 0;

      // Get assigned clients and their remaining applications
      const assignedClientsData = await this.getEmployeeAssignments(employeeId);
      const totalAppsRemaining = assignedClientsData.reduce((sum, client) => sum + ((client as any).applicationsRemaining || 0), 0);

      const assignedClients = assignedClientsData.map(client => ({
        name: client.name,
        appsRemaining: (client as any).applicationsRemaining || 0
      }));

      return {
        myApplications: myApps.count,
        inProgress: inProgress.count,
        successRate: Math.round(successRate),
        totalAppsRemaining,
        assignedClients,
      };
    });
  }

  async getClientStats(clientId: string): Promise<{
    totalApplications: number;
    inProgress: number;
    interviews: number;
    hired: number;
    amountPaid?: number;
    amountDue?: number;
    assignedEmployees?: { name: string; email: string; whatsappNumber?: string }[];
  }> {
    return retryOperation(async () => {
      const [totalApps] = await db
        .select({ count: count() })
        .from(jobApplications)
        .where(eq(jobApplications.clientId, clientId));

      const [inProgress] = await db
        .select({ count: count() })
        .from(jobApplications)
        .where(
          and(
            eq(jobApplications.clientId, clientId),
            sql`${jobApplications.status} IN ('Applied', 'Screening')`
          )
        );

      const [interviews] = await db
        .select({ count: count() })
        .from(jobApplications)
        .where(
          and(
            eq(jobApplications.clientId, clientId),
            eq(jobApplications.status, "Interview")
          )
        );

      const [hired] = await db
        .select({ count: count() })
        .from(jobApplications)
        .where(
          and(
            eq(jobApplications.clientId, clientId),
            eq(jobApplications.status, "Hired")
          )
        );

      const assignedEmployees = await this.getClientAssignments(clientId);

      // Get user payment info
      const [client] = await db.select().from(users).where(eq(users.id, clientId));

      return {
        totalApplications: totalApps.count,
        inProgress: inProgress.count,
        interviews: interviews.count,
        hired: hired.count,
        amountPaid: (client as any)?.amountPaid ?? 0,
        amountDue: (client as any)?.amountDue ?? 0,
        assignedEmployees: assignedEmployees.map(emp => ({
          name: emp.name,
          email: emp.email,
          whatsappNumber: (emp as any).whatsappNumber || undefined
        })),
      };
    });
  }

  async getEmployeePerformanceAnalytics(): Promise<{
    totalPayout: number;
    employees: Array<{
      id: string;
      name: string;
      applicationsSubmitted: number;
      successRate: number;
      earnings: number;
      interviews: number;
      totalApplications: number;
      assignedClients: string[];
      applicationsToday: number;
      applicationsThisMonth: number;
      interviewsThisMonth: number;
      earningsThisMonth: number;
      activeClientsCount: number;
      totalApplicationsRemaining: number;
      effectiveWorkload: number;
      rejectedCount: number;
      rejectionRate: number;
    }>;
    weeklyPerformance: Array<{
      week: string;
      applications: number;
      employees: number;
    }>;
    dailyPerformance: Array<{
      date: string;
      applications: number;
      employees: number;
    }>;
  }> {
    return retryOperation(async () => {
      // Get all active employees
      const activeEmployees = await db
        .select({
          id: users.id,
          name: users.name,
        })
        .from(users)
        .where(
          and(
            eq(users.role, "EMPLOYEE"),
            eq(users.isActive, true)
          )
        );

      if (activeEmployees.length === 0) {
        return {
          totalPayout: 0,
          employees: [],
          weeklyPerformance: await this.getWeeklyPerformance(),
          dailyPerformance: await this.getDailyPerformance()
        };
      }

      const employeeIds = activeEmployees.map(e => e.id);

      // Fetch all applications for these employees
      const allApplications = await db
        .select({
          employeeId: jobApplications.employeeId,
          status: jobApplications.status,
          dateApplied: jobApplications.dateApplied,
        })
        .from(jobApplications)
        .where(inArray(jobApplications.employeeId, employeeIds));

      // Fetch all assignments
      const allAssignments = await db
        .select({
          employeeId: employeeAssignments.employeeId,
          clientId: employeeAssignments.clientId,
          clientName: users.name,
          clientAppsRemaining: users.applicationsRemaining,
        })
        .from(employeeAssignments)
        .innerJoin(users, eq(employeeAssignments.clientId, users.id))
        .where(inArray(employeeAssignments.employeeId, employeeIds));

      // Get all assignments to calculate client load distribution
      const globalAssignments = await db.select().from(employeeAssignments);
      const clientEmployeeCounts = new Map<string, number>();
      globalAssignments.forEach(assignment => {
        const currentCount = clientEmployeeCounts.get(assignment.clientId) || 0;
        clientEmployeeCounts.set(assignment.clientId, currentCount + 1);
      });

      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const todayStr = today.toISOString().split('T')[0];

      const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);
      const startOfMonthStr = startOfMonth.toISOString().split('T')[0];

      const employeeStats = activeEmployees.map(employee => {
        const empApps = allApplications.filter(app => app.employeeId === employee.id);

        const totalAppsCount = empApps.length;
        const interviewsCount = empApps.filter(app => app.status === "Interview").length;
        const rejectedCount = empApps.filter(app => app.status === "Rejected").length;
        const successRate = totalAppsCount > 0 ? (interviewsCount / totalAppsCount) * 100 : 0;
        const rejectionRate = totalAppsCount > 0 ? (rejectedCount / totalAppsCount) * 100 : 0;
        const earnings = totalAppsCount * 0.2;

        const todayAppsCount = empApps.filter(app => app.dateApplied >= todayStr).length;

        const monthApps = empApps.filter(app => app.dateApplied >= startOfMonthStr);
        const monthAppsCount = monthApps.length;
        const monthInterviewsCount = monthApps.filter(app => app.status === "Interview").length;
        const monthEarnings = monthAppsCount * 0.2;

        const assignedClientsData = allAssignments.filter(a => a.employeeId === employee.id);
        const activeClientsCount = assignedClientsData.length;
        const totalApplicationsRemaining = assignedClientsData.reduce((sum, client) => sum + (client.clientAppsRemaining || 0), 0);

        const effectiveWorkload = assignedClientsData.reduce((sum, client) => {
          const employeeCount = clientEmployeeCounts.get(client.clientId) || 1;
          return sum + ((client.clientAppsRemaining || 0) / employeeCount);
        }, 0);

        return {
          id: employee.id,
          name: employee.name,
          applicationsSubmitted: totalAppsCount,
          successRate: Math.round(successRate * 100) / 100,
          earnings: Math.round(earnings * 100) / 100,
          interviews: interviewsCount,
          totalApplications: totalAppsCount,
          assignedClients: assignedClientsData.map(c => c.clientName),
          applicationsToday: todayAppsCount,
          applicationsThisMonth: monthAppsCount,
          interviewsThisMonth: monthInterviewsCount,
          earningsThisMonth: Math.round(monthEarnings * 100) / 100,
          activeClientsCount,
          totalApplicationsRemaining,
          effectiveWorkload: Math.round(effectiveWorkload),
          rejectedCount,
          rejectionRate: Math.round(rejectionRate * 100) / 100,
        };
      });

      // Calculate total payout
      const totalPayout = employeeStats.reduce((sum, employee) => sum + employee.earnings, 0);

      // Sort employees by applications submitted (descending)
      const sortedEmployees = employeeStats.sort((a, b) => b.applicationsSubmitted - a.applicationsSubmitted);

      // Calculate weekly performance (last 8 weeks)
      const weeklyPerformance = await this.getWeeklyPerformance();

      // Calculate daily performance (last 30 days)
      const dailyPerformance = await this.getDailyPerformance();

      return {
        totalPayout: Math.round(totalPayout * 100) / 100,
        employees: sortedEmployees,
        weeklyPerformance,
        dailyPerformance,
      };
    });
  }

  async getClientPerformanceAnalytics(): Promise<{
    totalClients: number;
    clients: Array<{
      id: string;
      name: string;
      company?: string;
      applicationsRemaining: number;
      amountPaid: number;
      amountDue: number;
      totalApplications: number;
      inProgress: number;
      interviews: number;
      hired: number;
      rejected: number;
      successRate: number;
      rejectionRate: number;
      priority: "High" | "Medium" | "Low";
      assignedEmployees: { id: string; name: string }[];
    }>;
  }> {
    return retryOperation(async () => {
      // Get all active clients
      const activeClients = await db
        .select({
          id: users.id,
          name: users.name,
          company: users.company,
          applicationsRemaining: users.applicationsRemaining,
          amountPaid: users.amountPaid,
          amountDue: users.amountDue,
        })
        .from(users)
        .where(
          and(
            eq(users.role, "CLIENT"),
            eq(users.isActive, true)
          )
        );

      if (activeClients.length === 0) {
        return { totalClients: 0, clients: [] };
      }

      const clientIds = activeClients.map(c => c.id);

      // Fetch all applications for these clients
      const allApplications = await db
        .select({
          clientId: jobApplications.clientId,
          status: jobApplications.status,
        })
        .from(jobApplications)
        .where(inArray(jobApplications.clientId, clientIds));

      // Fetch all assignments for these clients
      const allAssignments = await db
        .select({
          clientId: employeeAssignments.clientId,
          employeeId: employeeAssignments.employeeId,
          employeeName: users.name,
        })
        .from(employeeAssignments)
        .innerJoin(users, eq(employeeAssignments.employeeId, users.id))
        .where(inArray(employeeAssignments.clientId, clientIds));

      const clientStats = activeClients.map((client) => {
        // Filter applications for this client in memory
        const clientApps = allApplications.filter(app => app.clientId === client.id);

        const totalApplications = clientApps.length;

        const inProgress = clientApps.filter(app =>
          ['Applied', 'Screening'].includes(app.status)
        ).length;

        const interviews = clientApps.filter(app =>
          app.status === "Interview"
        ).length;

        const hired = clientApps.filter(app =>
          app.status === "Hired"
        ).length;

        const rejected = clientApps.filter(app =>
          app.status === "Rejected"
        ).length;

        // Calculate success rate (hired/total)
        const successRate = totalApplications > 0 ? (hired / totalApplications) * 100 : 0;
        const rejectionRate = totalApplications > 0 ? (rejected / totalApplications) * 100 : 0;

        // Get assigned employees for this client
        const assignedEmployees = allAssignments
          .filter(a => a.clientId === client.id)
          .map(a => ({ id: a.employeeId, name: a.employeeName }));

        // Determine priority based on applications remaining and activity
        let priority: "High" | "Medium" | "Low";
        const appsRemaining = (client as any).applicationsRemaining ?? 0;

        if (appsRemaining <= 2 || (totalApplications === 0 && appsRemaining <= 5)) {
          priority = "High";
        } else if (appsRemaining <= 5 || totalApplications === 0) {
          priority = "Medium";
        } else {
          priority = "Low";
        }

        return {
          id: client.id,
          name: client.name,
          company: client.company || undefined,
          applicationsRemaining: appsRemaining,
          amountPaid: (client as any).amountPaid ?? 0,
          amountDue: (client as any).amountDue ?? 0,
          totalApplications,
          inProgress,
          interviews,
          hired,
          rejected,
          successRate: Math.round(successRate * 100) / 100,
          rejectionRate: Math.round(rejectionRate * 100) / 100,
          priority,
          assignedEmployees,
        };
      });

      // Sort clients by applications remaining (descending)
      const sortedClients = clientStats.sort((a, b) => {
        return b.applicationsRemaining - a.applicationsRemaining;
      });

      return {
        totalClients: sortedClients.length,
        clients: sortedClients,
      };
    });
  }


  async getDailyEmployeeApplicationAnalytics(): Promise<{
    totalApplicationsToday: number;
    totalApplicationsYesterday: number;
    totalApplicationsLast3Days: number;
    totalApplicationsLast7Days: number;
    employees: Array<{
      id: string;
      name: string;
      applicationsToday: number;
      applicationsYesterday: number;
      applicationsLast3Days: number;
      applicationsLast7Days: number;
      totalApplications: number;
      successRate: number;
      earnings: number;
      interviews: number;
    }>;
  }> {
    return retryOperation(async () => {
      // Get all active employees
      const activeEmployees = await db
        .select({
          id: users.id,
          name: users.name,
        })
        .from(users)
        .where(
          and(
            eq(users.role, "EMPLOYEE"),
            eq(users.isActive, true)
          )
        );

      if (activeEmployees.length === 0) {
        return {
          totalApplicationsToday: 0,
          totalApplicationsYesterday: 0,
          totalApplicationsLast3Days: 0,
          totalApplicationsLast7Days: 0,
          employees: [],
        };
      }

      const employeeIds = activeEmployees.map(e => e.id);

      // Calculate date ranges
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const todayStr = today.toISOString().split('T')[0];

      const yesterday = new Date(today);
      yesterday.setDate(yesterday.getDate() - 1);
      const yesterdayStr = yesterday.toISOString().split('T')[0];

      const threeDaysAgo = new Date(today);
      threeDaysAgo.setDate(threeDaysAgo.getDate() - 3);
      const threeDaysAgoStr = threeDaysAgo.toISOString().split('T')[0];

      const sevenDaysAgo = new Date(today);
      sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
      const sevenDaysAgoStr = sevenDaysAgo.toISOString().split('T')[0];

      // 1. Recent applications (last 7 days)
      const recentApplications = await db
        .select({
          employeeId: jobApplications.employeeId,
          dateApplied: jobApplications.dateApplied,
        })
        .from(jobApplications)
        .where(
          and(
            inArray(jobApplications.employeeId, employeeIds),
            gte(jobApplications.dateApplied, sevenDaysAgoStr)
          )
        );

      // 2. Total stats (grouped by employee)
      const totalStats = await db
        .select({
          employeeId: jobApplications.employeeId,
          totalCount: count(),
          interviewsCount: sql<number>`count(case when ${jobApplications.status} = 'Interview' then 1 end)`,
        })
        .from(jobApplications)
        .where(inArray(jobApplications.employeeId, employeeIds))
        .groupBy(jobApplications.employeeId);

      const statsMap = new Map(totalStats.map(s => [s.employeeId, s]));

      const employeeStats = activeEmployees.map(employee => {
        const empRecentApps = recentApplications.filter(app => app.employeeId === employee.id);

        const appsToday = empRecentApps.filter(app => app.dateApplied >= todayStr).length;
        const appsYesterday = empRecentApps.filter(app => app.dateApplied >= yesterdayStr && app.dateApplied < todayStr).length;
        const appsLast3Days = empRecentApps.filter(app => app.dateApplied >= threeDaysAgoStr).length;
        const appsLast7Days = empRecentApps.filter(app => app.dateApplied >= sevenDaysAgoStr).length;

        const stats = statsMap.get(employee.id);
        const totalAppsCount = stats ? Number(stats.totalCount) : 0;
        const interviewsCount = stats ? Number(stats.interviewsCount) : 0;

        const successRate = totalAppsCount > 0 ? (interviewsCount / totalAppsCount) * 100 : 0;
        const earnings = totalAppsCount * 0.2;

        return {
          id: employee.id,
          name: employee.name,
          applicationsToday: appsToday,
          applicationsYesterday: appsYesterday,
          applicationsLast3Days: appsLast3Days,
          applicationsLast7Days: appsLast7Days,
          totalApplications: totalAppsCount,
          successRate: Math.round(successRate * 100) / 100,
          earnings: Math.round(earnings * 100) / 100,
          interviews: interviewsCount,
        };
      });

      // Calculate totals
      const totalApplicationsToday = employeeStats.reduce((sum, emp) => sum + emp.applicationsToday, 0);
      const totalApplicationsYesterday = employeeStats.reduce((sum, emp) => sum + emp.applicationsYesterday, 0);
      const totalApplicationsLast3Days = employeeStats.reduce((sum, emp) => sum + emp.applicationsLast3Days, 0);
      const totalApplicationsLast7Days = employeeStats.reduce((sum, emp) => sum + emp.applicationsLast7Days, 0);

      // Sort employees by applications today (descending)
      const sortedEmployees = employeeStats.sort((a, b) => b.applicationsToday - a.applicationsToday);

      return {
        totalApplicationsToday,
        totalApplicationsYesterday,
        totalApplicationsLast3Days,
        totalApplicationsLast7Days,
        employees: sortedEmployees,
      };

    });
  }

  private async getWeeklyPerformance(): Promise<Array<{
    week: string;
    applications: number;
    employees: number;
  }>> {
    return retryOperation(async () => {
      const weeks: Array<{ week: string; applications: number; employees: number }> = [];

      // Get data for last 8 weeks
      for (let i = 7; i >= 0; i--) {
        const startDate = new Date();
        startDate.setDate(startDate.getDate() - (i * 7));
        startDate.setHours(0, 0, 0, 0);

        const endDate = new Date(startDate);
        endDate.setDate(endDate.getDate() + 6);
        endDate.setHours(23, 59, 59, 999);

        // Get applications for this week
        const [applications] = await db
          .select({ count: count() })
          .from(jobApplications)
          .where(
            and(
              gte(jobApplications.dateApplied, startDate.toISOString().split('T')[0]),
              lt(jobApplications.dateApplied, endDate.toISOString().split('T')[0])
            )
          );

        // Get unique employees who submitted applications this week
        const uniqueEmployees = await db
          .select({ employeeId: jobApplications.employeeId })
          .from(jobApplications)
          .where(
            and(
              gte(jobApplications.dateApplied, startDate.toISOString().split('T')[0]),
              lt(jobApplications.dateApplied, endDate.toISOString().split('T')[0])
            )
          );

        // Count unique employee IDs
        const uniqueEmployeeIds = new Set(uniqueEmployees.map(emp => emp.employeeId));

        const weekLabel = `Week ${8 - i}`;
        weeks.push({
          week: weekLabel,
          applications: applications.count,
          employees: uniqueEmployeeIds.size,
        });
      }

      return weeks;
    });
  }

  private async getDailyPerformance(): Promise<Array<{
    date: string;
    applications: number;
    employees: number;
  }>> {
    return retryOperation(async () => {
      const days: Array<{ date: string; applications: number; employees: number }> = [];

      // Get data for last 30 days
      for (let i = 29; i >= 0; i--) {
        const targetDate = new Date();
        targetDate.setDate(targetDate.getDate() - i);
        const dateString = targetDate.toISOString().split('T')[0];

        // Get applications for this day
        const [applications] = await db
          .select({ count: count() })
          .from(jobApplications)
          .where(eq(jobApplications.dateApplied, dateString));

        // Get unique employees who submitted applications this day
        const uniqueEmployees = await db
          .select({ employeeId: jobApplications.employeeId })
          .from(jobApplications)
          .where(eq(jobApplications.dateApplied, dateString));

        // Count unique employee IDs
        const uniqueEmployeeIds = new Set(uniqueEmployees.map(emp => emp.employeeId));

        days.push({
          date: dateString,
          applications: applications.count,
          employees: uniqueEmployeeIds.size,
        });
      }

      return days;
    });
  }

  async getMonthlyPayoutAnalytics(month?: string, year?: string): Promise<Array<{
    employeeId: string;
    employeeName: string;
    applicationsThisMonth: number;
    totalPayout: number;
    baseRate: number;
    belowTargetRate: number;
    dailyTarget: number;
    isAboveTarget: boolean;
  }>> {
    return retryOperation(async () => {
      try {
        const now = new Date();
        const targetYear = year ? parseInt(year) : now.getFullYear();
        const targetMonth = month ? parseInt(month) - 1 : now.getMonth(); // month is 0-indexed
        const startOfMonth = new Date(targetYear, targetMonth, 1);
        const endOfMonth = new Date(targetYear, targetMonth + 1, 0);

        const startDate = startOfMonth.toISOString().split('T')[0];
        const endDate = endOfMonth.toISOString().split('T')[0];

        console.log(`Fetching monthly payout data from ${startDate} to ${endDate}`);

        // Get all employees
        const allEmployees = await db
          .select({
            id: users.id,
            name: users.name,
            email: users.email
          })
          .from(users)
          .where(eq(users.role, 'EMPLOYEE'));

        console.log(`Found ${allEmployees.length} employees`);

        if (allEmployees.length === 0) {
          return [];
        }

        // Get rates from environment variables
        const baseRate = parseFloat(process.env.BASE_RATE_PER_APPLICATION_USD || '0.2');
        const belowTargetRate = parseFloat(process.env.BELOW_TARGET_RATE_USD || '0.15');
        const dailyTarget = parseInt(process.env.DAILY_TARGET_APPLICATIONS || '15');

        // Fetch all applications for the month for all employees
        const monthlyApplications = await db
          .select({
            employeeId: jobApplications.employeeId,
            dateApplied: jobApplications.dateApplied,
          })
          .from(jobApplications)
          .where(
            and(
              gte(jobApplications.dateApplied, startDate),
              lte(jobApplications.dateApplied, endDate),
              inArray(jobApplications.employeeId, allEmployees.map(e => e.id))
            )
          );

        // Calculate daily payouts for each employee this month
        const employeeStats = allEmployees.map(employee => {
          const employeeApps = monthlyApplications.filter(app => app.employeeId === employee.id);

          // Group by date
          const appsByDate = new Map<string, number>();
          employeeApps.forEach(app => {
            const date = app.dateApplied; // Assuming dateApplied is YYYY-MM-DD string
            appsByDate.set(date, (appsByDate.get(date) || 0) + 1);
          });

          let totalApplications = 0;
          let totalPayout = 0;
          let daysMetTarget = 0;

          // Get all days in the month and calculate daily payouts
          for (let day = 1; day <= endOfMonth.getDate(); day++) {
            const currentDate = new Date(targetYear, targetMonth, day);
            const dateString = currentDate.toISOString().split('T')[0];

            const dailyApplications = appsByDate.get(dateString) || 0;
            totalApplications += dailyApplications;

            // Calculate daily payout based on daily target
            // If employee applied >= 15 applications on this day: $0.20 per application
            // If employee applied < 15 applications on this day: $0.15 per application
            const dailyMetTarget = dailyApplications >= dailyTarget;
            if (dailyMetTarget) daysMetTarget++;

            const dailyRate = dailyMetTarget ? baseRate : belowTargetRate;
            const dailyPayout = dailyApplications * dailyRate;
            totalPayout += dailyPayout;
          }

          const isAboveTarget = daysMetTarget > (endOfMonth.getDate() / 2); // More than half the days met target

          return {
            employeeId: employee.id,
            employeeName: employee.name,
            applicationsThisMonth: totalApplications,
            totalPayout,
            baseRate,
            belowTargetRate,
            dailyTarget,
            isAboveTarget
          };
        });

        return employeeStats;
      } catch (error) {
        console.error("Error in getMonthlyPayoutAnalytics:", error);
        throw error;
      }
    });
  }

  async getEmployeeDailyPayoutBreakdown(employeeId: string, month?: string, year?: string): Promise<{
    employeeName: string;
    monthYear: string;
    dailyBreakdown: Array<{
      date: string;
      dayOfWeek: string;
      applicationsCount: number;
      metTarget: boolean;
      dailyTarget: number;
      rateApplied: number;
      dailyPayout: number;
    }>;
    monthlyTotal: {
      totalApplications: number;
      totalPayout: number;
      daysMetTarget: number;
      totalWorkingDays: number;
    };
    rates: {
      baseRate: number;
      belowTargetRate: number;
      dailyTarget: number;
    };
  }> {
    return retryOperation(async () => {
      try {
        const now = new Date();
        const targetYear = year ? parseInt(year) : now.getFullYear();
        const targetMonth = month ? parseInt(month) - 1 : now.getMonth(); // month is 0-indexed
        const startOfMonth = new Date(targetYear, targetMonth, 1);
        const endOfMonth = new Date(targetYear, targetMonth + 1, 0);

        const startDate = startOfMonth.toISOString().split('T')[0];
        const endDate = endOfMonth.toISOString().split('T')[0];

        // Get employee info
        const [employee] = await db
          .select({
            id: users.id,
            name: users.name,
          })
          .from(users)
          .where(eq(users.id, employeeId));

        if (!employee) {
          throw new Error("Employee not found");
        }

        // Get rates from environment variables
        const baseRate = parseFloat(process.env.BASE_RATE_PER_APPLICATION_USD || '0.2');
        const belowTargetRate = parseFloat(process.env.BELOW_TARGET_RATE_USD || '0.15');
        const dailyTarget = parseInt(process.env.DAILY_TARGET_APPLICATIONS || '15');

        // Fetch all applications for the month for this employee
        const monthlyApplications = await db
          .select({
            dateApplied: jobApplications.dateApplied,
          })
          .from(jobApplications)
          .where(
            and(
              eq(jobApplications.employeeId, employeeId),
              gte(jobApplications.dateApplied, startDate),
              lte(jobApplications.dateApplied, endDate)
            )
          );

        // Group by date
        const appsByDate = new Map<string, number>();
        monthlyApplications.forEach(app => {
          const date = app.dateApplied;
          appsByDate.set(date, (appsByDate.get(date) || 0) + 1);
        });

        const dailyBreakdown = [];
        let totalApplications = 0;
        let totalPayout = 0;
        let daysMetTarget = 0;

        // Get all days in the month
        for (let day = 1; day <= endOfMonth.getDate(); day++) {
          const currentDate = new Date(targetYear, targetMonth, day);
          const dateString = currentDate.toISOString().split('T')[0];
          const dayOfWeek = currentDate.toLocaleDateString('en-US', { weekday: 'long' });

          const applicationsCount = appsByDate.get(dateString) || 0;

          // Daily payout logic: >= 15 applications = $0.20/app, < 15 applications = $0.15/app
          const metTarget = applicationsCount >= dailyTarget;
          const rateApplied = metTarget ? baseRate : belowTargetRate;
          const dailyPayout = applicationsCount * rateApplied;

          if (metTarget) daysMetTarget++;
          totalApplications += applicationsCount;
          totalPayout += dailyPayout;

          dailyBreakdown.push({
            date: dateString,
            dayOfWeek,
            applicationsCount,
            metTarget,
            dailyTarget,
            rateApplied,
            dailyPayout
          });
        }

        return {
          employeeName: employee.name,
          monthYear: `${targetMonth + 1}/${targetYear}`,
          dailyBreakdown,
          monthlyTotal: {
            totalApplications,
            totalPayout,
            daysMetTarget,
            totalWorkingDays: endOfMonth.getDate()
          },
          rates: {
            baseRate,
            belowTargetRate,
            dailyTarget
          }
        };
      } catch (error) {
        console.error("Error in getEmployeeDailyPayoutBreakdown:", error);
        throw error;
      }
    });
  }

  // Client profile operations
  async getClientProfile(userId: string): Promise<ClientProfileWithUser | undefined> {
    return retryOperation(async () => {
      const [profile] = await db
        .select()
        .from(clientProfiles)
        .leftJoin(users, eq(clientProfiles.userId, users.id))
        .where(eq(clientProfiles.userId, userId));

      if (!profile) return undefined;

      return {
        ...profile.client_profiles,
        user: profile.users || undefined,
      };
    });
  }

  async upsertClientProfile(userId: string, profileData: InsertClientProfile | UpdateClientProfile): Promise<ClientProfile> {
    return retryOperation(async () => {
      // Convert arrays to JSON strings for storage and handle empty date strings
      const dataToStore = {
        ...profileData,
        userId,
        servicesRequested: Array.isArray(profileData.servicesRequested)
          ? JSON.stringify(profileData.servicesRequested)
          : profileData.servicesRequested || '[]',
        searchScope: Array.isArray(profileData.searchScope)
          ? JSON.stringify(profileData.searchScope)
          : profileData.searchScope || '[]',
        states: Array.isArray(profileData.states)
          ? JSON.stringify(profileData.states)
          : profileData.states || '[]',
        cities: Array.isArray(profileData.cities)
          ? JSON.stringify(profileData.cities)
          : profileData.cities || '[]',
        // Handle empty string dates - convert to null for PostgreSQL
        startDate: profileData.startDate && profileData.startDate.trim() !== ''
          ? profileData.startDate
          : null,
        dateOfBirth: (profileData as any).dateOfBirth && String((profileData as any).dateOfBirth).trim() !== ""
          ? (profileData as any).dateOfBirth
          : null,
        availabilityDate: (profileData as any).availabilityDate && String((profileData as any).availabilityDate).trim() !== ""
          ? (profileData as any).availabilityDate
          : null,
      };

      const [profile] = await db
        .insert(clientProfiles)
        .values(dataToStore as any)
        .onConflictDoUpdate({
          target: clientProfiles.userId,
          set: dataToStore,
        })
        .returning();

      return profile;
    });
  }

  async listClientProfiles(): Promise<ClientProfileWithUser[]> {
    return retryOperation(async () => {
      const profiles = await db
        .select()
        .from(clientProfiles)
        .leftJoin(users, eq(clientProfiles.userId, users.id))
        .orderBy(desc(clientProfiles.createdAt));

      return profiles.map(p => ({
        ...p.client_profiles,
        user: p.users || undefined,
      }));
    });
  }

  // Resume profile operations
  async listResumeProfiles(clientId: string): Promise<ResumeProfile[]> {
    return retryOperation(async () => {
      return await db
        .select()
        .from(resumeProfiles)
        .where(eq(resumeProfiles.clientId, clientId))
        .orderBy(desc(resumeProfiles.isDefault), asc(resumeProfiles.name), desc(resumeProfiles.createdAt));
    });
  }

  async getResumeProfile(clientId: string, profileId: string): Promise<ResumeProfile | undefined> {
    return retryOperation(async () => {
      const [profile] = await db
        .select()
        .from(resumeProfiles)
        .where(and(eq(resumeProfiles.clientId, clientId), eq(resumeProfiles.id, profileId)));
      return profile;
    });
  }

  async getDefaultResumeProfile(clientId: string): Promise<ResumeProfile | undefined> {
    return retryOperation(async () => {
      const [profile] = await db
        .select()
        .from(resumeProfiles)
        .where(and(eq(resumeProfiles.clientId, clientId), eq(resumeProfiles.isDefault, true)))
        .orderBy(desc(resumeProfiles.updatedAt));
      return profile;
    });
  }

  async createResumeProfile(clientId: string, profile: Omit<InsertResumeProfile, "clientId">): Promise<ResumeProfile> {
    return retryOperation(async () => {
      return await db.transaction(async (tx) => {
        const shouldBeDefault = !!(profile as any).isDefault;
        if (shouldBeDefault) {
          await tx
            .update(resumeProfiles)
            .set({ isDefault: false, updatedAt: sql`now()` } as any)
            .where(eq(resumeProfiles.clientId, clientId));
        }

        const [created] = await tx
          .insert(resumeProfiles)
          .values({
            clientId,
            name: (profile as any).name,
            baseResumeLatex: (profile as any).baseResumeLatex,
            isDefault: shouldBeDefault,
          } as any)
          .returning();

        return created;
      });
    });
  }

  async updateResumeProfile(clientId: string, profileId: string, profile: UpdateResumeProfile): Promise<ResumeProfile | undefined> {
    return retryOperation(async () => {
      const [updated] = await db
        .update(resumeProfiles)
        .set({
          ...((profile as any).name !== undefined ? { name: (profile as any).name } : {}),
          ...((profile as any).baseResumeLatex !== undefined ? { baseResumeLatex: (profile as any).baseResumeLatex } : {}),
          updatedAt: sql`now()`,
        } as any)
        .where(and(eq(resumeProfiles.clientId, clientId), eq(resumeProfiles.id, profileId)))
        .returning();

      return updated;
    });
  }

  async deleteResumeProfile(clientId: string, profileId: string): Promise<boolean> {
    return retryOperation(async () => {
      const deleted = await db
        .delete(resumeProfiles)
        .where(and(eq(resumeProfiles.clientId, clientId), eq(resumeProfiles.id, profileId)))
        .returning({ id: resumeProfiles.id });
      return deleted.length > 0;
    });
  }

  async setDefaultResumeProfile(clientId: string, profileId: string): Promise<ResumeProfile | undefined> {
    return retryOperation(async () => {
      return await db.transaction(async (tx) => {
        // Ensure the profile exists for this client
        const [existing] = await tx
          .select()
          .from(resumeProfiles)
          .where(and(eq(resumeProfiles.clientId, clientId), eq(resumeProfiles.id, profileId)));

        if (!existing) return undefined;

        await tx
          .update(resumeProfiles)
          .set({ isDefault: false, updatedAt: sql`now()` } as any)
          .where(eq(resumeProfiles.clientId, clientId));

        const [updated] = await tx
          .update(resumeProfiles)
          .set({ isDefault: true, updatedAt: sql`now()` } as any)
          .where(and(eq(resumeProfiles.clientId, clientId), eq(resumeProfiles.id, profileId)))
          .returning();

        return updated;
      });
    });
  }

  async assignEmployee(clientId: string, employeeId: string): Promise<EmployeeAssignment> {
    return retryOperation(async () => {
      // Check if already assigned
      const [existing] = await db
        .select()
        .from(employeeAssignments)
        .where(
          and(
            eq(employeeAssignments.clientId, clientId),
            eq(employeeAssignments.employeeId, employeeId)
          )
        );

      if (existing) {
        return existing;
      }

      const [assignment] = await db
        .insert(employeeAssignments)
        .values({
          clientId,
          employeeId,
        })
        .returning();
      return assignment;
    });
  }

  async unassignEmployee(clientId: string, employeeId: string): Promise<void> {
    return retryOperation(async () => {
      await db
        .delete(employeeAssignments)
        .where(
          and(
            eq(employeeAssignments.clientId, clientId),
            eq(employeeAssignments.employeeId, employeeId)
          )
        );
    });
  }

  async getClientAssignments(clientId: string): Promise<User[]> {
    return retryOperation(async () => {
      const result = await db
        .select({
          user: users,
        })
        .from(employeeAssignments)
        .innerJoin(users, eq(employeeAssignments.employeeId, users.id))
        .where(eq(employeeAssignments.clientId, clientId));

      return result.map((r) => r.user);
    });
  }

  async getEmployeeAssignments(employeeId: string): Promise<User[]> {
    return retryOperation(async () => {
      const result = await db
        .select({
          user: users,
        })
        .from(employeeAssignments)
        .innerJoin(users, eq(employeeAssignments.clientId, users.id))
        .where(eq(employeeAssignments.employeeId, employeeId));

      return result.map((r) => r.user);
    });
  }

  async isEmployeeAssignedToClient(employeeId: string, clientId: string): Promise<boolean> {
    return retryOperation(async () => {
      const [result] = await db
        .select()
        .from(employeeAssignments)
        .where(
          and(
            eq(employeeAssignments.employeeId, employeeId),
            eq(employeeAssignments.clientId, clientId)
          )
        )
        .limit(1);

      return !!result;
    });
  }

  async getRejectionRateStats(ownerId: string, role: "client" | "employee"): Promise<{
    totalApplications: number;
    rejectedCount: number;
    rejectionRate: number;
    rejectedApplications: JobApplicationWithUsers[];
  }> {
    return retryOperation(async () => {
      const clientUsers = alias(users, "client_users");
      const employeeUsers = alias(users, "employee_users");

      const idColumn = role === "employee" ? jobApplications.employeeId : jobApplications.clientId;
      const baseCondition = eq(idColumn, ownerId);

      const [totalRow] = await db
        .select({ count: count() })
        .from(jobApplications)
        .where(baseCondition);

      const [rejectedRow] = await db
        .select({ count: count() })
        .from(jobApplications)
        .where(and(baseCondition, eq(jobApplications.status, "Rejected")));

      const totalApplications = Number(totalRow?.count ?? 0);
      const rejectedCount = Number(rejectedRow?.count ?? 0);
      const rejectionRate = totalApplications > 0 ? (rejectedCount / totalApplications) * 100 : 0;

      const rejectedResults = await db
        .select({
          application: jobApplications,
          client: clientUsers,
          employee: employeeUsers,
        })
        .from(jobApplications)
        .leftJoin(clientUsers, eq(jobApplications.clientId, clientUsers.id))
        .leftJoin(employeeUsers, eq(jobApplications.employeeId, employeeUsers.id))
        .where(and(baseCondition, eq(jobApplications.status, "Rejected")))
        .orderBy(desc(jobApplications.dateApplied))
        .limit(500);

      const rejectedApplications: JobApplicationWithUsers[] = rejectedResults
        .filter((r): r is typeof r & { client: User; employee: User } => r.client !== null && r.employee !== null)
        .map((r) => ({
          ...r.application,
          client: r.client,
          employee: r.employee,
        }));

      return {
        totalApplications,
        rejectedCount,
        rejectionRate: Math.round(rejectionRate * 100) / 100,
        rejectedApplications,
      };
    });
  }

  async getApplicationStatusByClient(clientId: string, opts?: { limit?: number; status?: string }): Promise<{
    countsByStatus: Record<string, number>;
    applications: JobApplicationWithUsers[];
    pendingReviewCount: number;
  }> {
    return retryOperation(async () => {
      const clientUsers = alias(users, "client_users");
      const employeeUsers = alias(users, "employee_users");
      const limit = Math.min(opts?.limit ?? 25, 50);

      // Get counts grouped by status (always full counts for summary cards)
      const statusCounts = await db
        .select({
          status: jobApplications.status,
          count: count(),
        })
        .from(jobApplications)
        .where(eq(jobApplications.clientId, clientId))
        .groupBy(jobApplications.status);

      const countsByStatus: Record<string, number> = {
        Applied: 0,
        Screening: 0,
        Interview: 0,
        Offer: 0,
        Hired: 0,
        Rejected: 0,
        "On Hold": 0,
      };

      statusCounts.forEach((row) => {
        if (row.status) {
          countsByStatus[row.status] = Number(row.count);
        }
      });

      const pendingReviewCount = (countsByStatus["Applied"] || 0) + (countsByStatus["Screening"] || 0);

      // Build conditions: filter by status if provided, otherwise default to pending (Applied/Screening)
      const statusFilter = opts?.status;
      const conditions = statusFilter
        ? and(eq(jobApplications.clientId, clientId), eq(jobApplications.status, statusFilter as any))
        : and(eq(jobApplications.clientId, clientId), inArray(jobApplications.status, ["Applied", "Screening"]));

      // Get limited applications only (for performance)
      const results = await db
        .select({
          application: jobApplications,
          client: clientUsers,
          employee: employeeUsers,
        })
        .from(jobApplications)
        .leftJoin(clientUsers, eq(jobApplications.clientId, clientUsers.id))
        .leftJoin(employeeUsers, eq(jobApplications.employeeId, employeeUsers.id))
        .where(conditions)
        .orderBy(desc(jobApplications.dateApplied))
        .limit(limit);

      const applications: JobApplicationWithUsers[] = results
        .filter((r): r is typeof r & { client: User; employee: User } => r.client !== null && r.employee !== null)
        .map((r) => ({
          ...r.application,
          client: r.client,
          employee: r.employee,
        }));

      return { countsByStatus, applications, pendingReviewCount };
    });
  }

  // Payment transaction methods
  async recordPayment(clientId: string, amount: number, recordedBy?: string, notes?: string): Promise<PaymentTransaction> {
    return retryOperation(async () => {
      const values: any = {
        clientId,
        amount,
        paymentDate: new Date(),
      };

      if (recordedBy) values.recordedBy = recordedBy;
      if (notes) values.notes = notes;

      const [transaction] = await db
        .insert(paymentTransactions)
        .values(values)
        .returning();
      return transaction;
    });
  }

  async getPaymentHistory(clientId?: string): Promise<PaymentTransaction[]> {
    return retryOperation(async () => {
      if (clientId) {
        return await db
          .select()
          .from(paymentTransactions)
          .where(eq(paymentTransactions.clientId, clientId))
          .orderBy(desc(paymentTransactions.paymentDate));
      }
      return await db
        .select()
        .from(paymentTransactions)
        .orderBy(desc(paymentTransactions.paymentDate));
    });
  }

  async getMonthlyPaymentStats(year: number): Promise<Array<{ month: number; totalAmount: number; transactionCount: number }>> {
    return retryOperation(async () => {
      const startOfYear = new Date(year, 0, 1);
      const endOfYear = new Date(year + 1, 0, 1);

      const result = await db
        .select({
          month: sql<number>`EXTRACT(MONTH FROM ${paymentTransactions.paymentDate})::int`,
          totalAmount: sql<number>`COALESCE(SUM(${paymentTransactions.amount}), 0)::int`,
          transactionCount: count(),
        })
        .from(paymentTransactions)
        .where(
          and(
            gte(paymentTransactions.paymentDate, startOfYear),
            lt(paymentTransactions.paymentDate, endOfYear)
          )
        )
        .groupBy(sql`EXTRACT(MONTH FROM ${paymentTransactions.paymentDate})`);

      // Fill in missing months with zeros
      const monthlyStats = Array.from({ length: 12 }, (_, i) => ({
        month: i + 1,
        totalAmount: 0,
        transactionCount: 0,
      }));

      for (const row of result) {
        const monthIndex = row.month - 1;
        if (monthIndex >= 0 && monthIndex < 12) {
          monthlyStats[monthIndex] = {
            month: row.month,
            totalAmount: Number(row.totalAmount),
            transactionCount: Number(row.transactionCount),
          };
        }
      }

      return monthlyStats;
    });
  }

}

export const storage = new DatabaseStorage();
