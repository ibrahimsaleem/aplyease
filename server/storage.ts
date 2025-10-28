import { users, jobApplications, clientProfiles, type User, type InsertUser, type UpdateUser, type JobApplication, type InsertJobApplication, type UpdateJobApplication, type JobApplicationWithUsers, type ClientProfile, type InsertClientProfile, type UpdateClientProfile, type ClientProfileWithUser } from "../shared/schema";
import { db } from "./db";
import { eq, and, like, ilike, desc, asc, count, sql, gte, lt, lte, or, type SQL } from "drizzle-orm";
import { alias } from "drizzle-orm/pg-core";
import { hashPassword } from "./auth";

// Retry configuration
const RETRY_ATTEMPTS = 3;
const RETRY_DELAY = 1000; // 1 second

// Helper function to retry database operations
async function retryOperation<T>(
  operation: () => Promise<T>,
  attempts: number = RETRY_ATTEMPTS
): Promise<T> {
  for (let attempt = 1; attempt <= attempts; attempt++) {
    try {
      return await operation();
    } catch (error: any) {
      console.error(`Database operation failed (attempt ${attempt}/${attempts}):`, error);
      
      // Check if it's a connection error that we should retry
      if (error.message?.includes('Connection terminated unexpectedly') ||
          error.message?.includes('connection') ||
          error.code === 'ECONNRESET' ||
          error.code === 'ENOTFOUND') {
        
        if (attempt === attempts) {
          throw new Error(`Database operation failed after ${attempts} attempts: ${error.message}`);
        }
        
        // Wait before retrying (exponential backoff)
        const delay = RETRY_DELAY * Math.pow(2, attempt - 1);
        console.log(`Retrying in ${delay}ms...`);
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
}

export class DatabaseStorage implements IStorage {
  async getUser(id: string): Promise<User | undefined> {
    return retryOperation(async () => {
      const [user] = await db.select().from(users).where(eq(users.id, id));
      return user;
    });
  }

  async getUserByEmail(email: string): Promise<User | undefined> {
    return retryOperation(async () => {
      const [user] = await db.select().from(users).where(eq(users.email, email));
      return user;
    });
  }

  async createUser(userData: InsertUser): Promise<User> {
    return retryOperation(async () => {
      const passwordHash = await hashPassword(userData.password);
      const [user] = await db
        .insert(users)
        .values({
          // Cast due to drizzle insert type narrowness vs Zod-derived type
          name: (userData as any).name,
          email: (userData as any).email,
          role: (userData as any).role,
          company: (userData as any).company,
          applicationsRemaining: (userData as any).applicationsRemaining ?? 0,
          passwordHash,
          isActive: (userData as any).isActive ?? true,
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
          ...((userData as any).isActive !== undefined ? { isActive: (userData as any).isActive } : {}),
          ...((userData as any).geminiApiKey !== undefined ? { geminiApiKey: (userData as any).geminiApiKey } : {}),
        } as any)
        .where(eq(users.id, id))
        .returning();
      return user;
    });
  }

  async disableUser(id: string): Promise<void> {
    await retryOperation(async () => {
      await db
        .update(users)
        .set({ isActive: false, updatedAt: new Date() } as any)
        .where(eq(users.id, id));
    });
  }

  async enableUser(id: string): Promise<void> {
    await retryOperation(async () => {
      await db
        .update(users)
        .set({ isActive: true, updatedAt: new Date() } as any)
        .where(eq(users.id, id));
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
        .orderBy(desc(users.createdAt));
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

      return {
        myApplications: myApps.count,
        inProgress: inProgress.count,
        successRate: Math.round(successRate),
      };
    });
  }

  async getClientStats(clientId: string): Promise<{
    totalApplications: number;
    inProgress: number;
    interviews: number;
    hired: number;
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

      return {
        totalApplications: totalApps.count,
        inProgress: inProgress.count,
        interviews: interviews.count,
        hired: hired.count,
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

      const employeeStats = await Promise.all(
        activeEmployees.map(async (employee) => {
          // Get total applications for this employee
          const [totalApps] = await db
            .select({ count: count() })
            .from(jobApplications)
            .where(eq(jobApplications.employeeId, employee.id));

          // Get interviews for this employee
          const [interviews] = await db
            .select({ count: count() })
            .from(jobApplications)
            .where(
              and(
                eq(jobApplications.employeeId, employee.id),
                eq(jobApplications.status, "Interview")
              )
            );

          // Calculate success rate (interviews/total)
          const successRate = totalApps.count > 0 ? (interviews.count / totalApps.count) * 100 : 0;
          
          // Calculate earnings ($0.20 per application)
          const earnings = totalApps.count * 0.2;

          return {
            id: employee.id,
            name: employee.name,
            applicationsSubmitted: totalApps.count,
            successRate: Math.round(successRate * 100) / 100, // Round to 2 decimal places
            earnings: Math.round(earnings * 100) / 100, // Round to 2 decimal places
            interviews: interviews.count,
            totalApplications: totalApps.count,
          };
        })
      );

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
      totalApplications: number;
      inProgress: number;
      interviews: number;
      hired: number;
      successRate: number;
      priority: "High" | "Medium" | "Low";
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
        })
        .from(users)
        .where(
          and(
            eq(users.role, "CLIENT"),
            eq(users.isActive, true)
          )
        );

      const clientStats = await Promise.all(
        activeClients.map(async (client) => {
          // Get total applications for this client
          const [totalApps] = await db
            .select({ count: count() })
            .from(jobApplications)
            .where(eq(jobApplications.clientId, client.id));

          // Get in progress applications
          const [inProgress] = await db
            .select({ count: count() })
            .from(jobApplications)
            .where(
              and(
                eq(jobApplications.clientId, client.id),
                sql`${jobApplications.status} IN ('Applied', 'Screening')`
              )
            );

          // Get interviews for this client
          const [interviews] = await db
            .select({ count: count() })
            .from(jobApplications)
            .where(
              and(
                eq(jobApplications.clientId, client.id),
                eq(jobApplications.status, "Interview")
              )
            );

          // Get hired applications
          const [hired] = await db
            .select({ count: count() })
            .from(jobApplications)
            .where(
              and(
                eq(jobApplications.clientId, client.id),
                eq(jobApplications.status, "Hired")
              )
            );

          // Calculate success rate (hired/total)
          const successRate = totalApps.count > 0 ? (hired.count / totalApps.count) * 100 : 0;
          
          // Determine priority based on applications remaining and activity
          let priority: "High" | "Medium" | "Low";
          const appsRemaining = (client as any).applicationsRemaining ?? 0;
          
          if (appsRemaining <= 2 || (totalApps.count === 0 && appsRemaining <= 5)) {
            priority = "High";
          } else if (appsRemaining <= 5 || totalApps.count === 0) {
            priority = "Medium";
          } else {
            priority = "Low";
          }

          return {
            id: client.id,
            name: client.name,
            company: client.company || undefined,
            applicationsRemaining: appsRemaining,
            totalApplications: totalApps.count,
            inProgress: inProgress.count,
            interviews: interviews.count,
            hired: hired.count,
            successRate: Math.round(successRate * 100) / 100,
            priority,
          };
        })
      );

      // Sort clients by priority (High first) then by applications remaining (ascending)
      const sortedClients = clientStats.sort((a, b) => {
        const priorityOrder = { High: 0, Medium: 1, Low: 2 };
        if (priorityOrder[a.priority] !== priorityOrder[b.priority]) {
          return priorityOrder[a.priority] - priorityOrder[b.priority];
        }
        return a.applicationsRemaining - b.applicationsRemaining;
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

      // Calculate date ranges
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      
      const yesterday = new Date(today);
      yesterday.setDate(yesterday.getDate() - 1);
      
      const threeDaysAgo = new Date(today);
      threeDaysAgo.setDate(threeDaysAgo.getDate() - 3);
      
      const sevenDaysAgo = new Date(today);
      sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

      const employeeStats = await Promise.all(
        activeEmployees.map(async (employee) => {
          // Get applications for today
          const [todayApps] = await db
            .select({ count: count() })
            .from(jobApplications)
            .where(
              and(
                eq(jobApplications.employeeId, employee.id),
                gte(jobApplications.dateApplied, today.toISOString().split('T')[0])
              )
            );

          // Get applications for yesterday
          const [yesterdayApps] = await db
            .select({ count: count() })
            .from(jobApplications)
            .where(
              and(
                eq(jobApplications.employeeId, employee.id),
                gte(jobApplications.dateApplied, yesterday.toISOString().split('T')[0]),
                lt(jobApplications.dateApplied, today.toISOString().split('T')[0])
              )
            );

          // Get applications for last 3 days
          const [last3DaysApps] = await db
            .select({ count: count() })
            .from(jobApplications)
            .where(
              and(
                eq(jobApplications.employeeId, employee.id),
                gte(jobApplications.dateApplied, threeDaysAgo.toISOString().split('T')[0])
              )
            );

          // Get applications for last 7 days
          const [last7DaysApps] = await db
            .select({ count: count() })
            .from(jobApplications)
            .where(
              and(
                eq(jobApplications.employeeId, employee.id),
                gte(jobApplications.dateApplied, sevenDaysAgo.toISOString().split('T')[0])
              )
            );

          // Get total applications for this employee
          const [totalApps] = await db
            .select({ count: count() })
            .from(jobApplications)
            .where(eq(jobApplications.employeeId, employee.id));

          // Get interviews for this employee
          const [interviews] = await db
            .select({ count: count() })
            .from(jobApplications)
            .where(
              and(
                eq(jobApplications.employeeId, employee.id),
                eq(jobApplications.status, "Interview")
              )
            );

          // Calculate success rate (interviews/total)
          const successRate = totalApps.count > 0 ? (interviews.count / totalApps.count) * 100 : 0;
          
          // Calculate earnings ($0.20 per application)
          const earnings = totalApps.count * 0.2;

          return {
            id: employee.id,
            name: employee.name,
            applicationsToday: todayApps.count,
            applicationsYesterday: yesterdayApps.count,
            applicationsLast3Days: last3DaysApps.count,
            applicationsLast7Days: last7DaysApps.count,
            totalApplications: totalApps.count,
            successRate: Math.round(successRate * 100) / 100,
            earnings: Math.round(earnings * 100) / 100,
            interviews: interviews.count,
          };
        })
      );

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

      // Get rates from environment variables
      const baseRate = parseFloat(process.env.BASE_RATE_PER_APPLICATION_USD || '0.2');
      const belowTargetRate = parseFloat(process.env.BELOW_TARGET_RATE_USD || '0.15');
      const dailyTarget = parseInt(process.env.DAILY_TARGET_APPLICATIONS || '15');
      const monthlyTarget = dailyTarget * 30; // Approximate monthly target

      // Calculate daily payouts for each employee this month
      const employeeStats = await Promise.all(
        allEmployees.map(async (employee) => {
          let totalApplications = 0;
          let totalPayout = 0;
          let daysMetTarget = 0;

          // Get all days in the month and calculate daily payouts
          for (let day = 1; day <= endOfMonth.getDate(); day++) {
            const currentDate = new Date(targetYear, targetMonth, day);
            const dateString = currentDate.toISOString().split('T')[0];

            // Get applications for this specific day
            const [dailyApplicationCount] = await db
              .select({ count: count() })
              .from(jobApplications)
              .where(
                and(
                  eq(jobApplications.employeeId, employee.id),
                  eq(jobApplications.dateApplied, dateString)
                )
              );

            const dailyApplications = dailyApplicationCount.count;
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
        })
      );

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

        const dailyBreakdown = [];
        let totalApplications = 0;
        let totalPayout = 0;
        let daysMetTarget = 0;

        // Get all days in the month
        for (let day = 1; day <= endOfMonth.getDate(); day++) {
          const currentDate = new Date(targetYear, targetMonth, day);
          const dateString = currentDate.toISOString().split('T')[0];
          const dayOfWeek = currentDate.toLocaleDateString('en-US', { weekday: 'long' });

          // Get applications for this day
          const [applicationCount] = await db
            .select({ count: count() })
            .from(jobApplications)
            .where(
              and(
                eq(jobApplications.employeeId, employeeId),
                eq(jobApplications.dateApplied, dateString)
              )
            );

          const applicationsCount = applicationCount.count;
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
}

export const storage = new DatabaseStorage();
