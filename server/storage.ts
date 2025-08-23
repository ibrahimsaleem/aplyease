import { users, jobApplications, type User, type InsertUser, type UpdateUser, type JobApplication, type InsertJobApplication, type UpdateJobApplication, type JobApplicationWithUsers } from "../shared/schema";
import { db } from "./db";
import { eq, and, like, ilike, desc, asc, count, sql, type SQL } from "drizzle-orm";
import { alias } from "drizzle-orm/pg-core";
import { hashPassword } from "./auth";

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
}

export class DatabaseStorage implements IStorage {
  async getUser(id: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user;
  }

  async getUserByEmail(email: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.email, email));
    return user;
  }

  async createUser(userData: InsertUser): Promise<User> {
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
  }

  async updateUser(id: string, userData: UpdateUser): Promise<User | undefined> {
    const [user] = await db
      .update(users)
      .set({
        ...((userData as any).name !== undefined ? { name: (userData as any).name } : {}),
        ...((userData as any).email !== undefined ? { email: (userData as any).email } : {}),
        ...((userData as any).role !== undefined ? { role: (userData as any).role } : {}),
        ...((userData as any).company !== undefined ? { company: (userData as any).company } : {}),
        ...((userData as any).applicationsRemaining !== undefined ? { applicationsRemaining: (userData as any).applicationsRemaining } : {}),
        ...((userData as any).isActive !== undefined ? { isActive: (userData as any).isActive } : {}),
      } as any)
      .where(eq(users.id, id))
      .returning();
    return user;
  }

  async disableUser(id: string): Promise<void> {
    await db
      .update(users)
      .set({ isActive: false, updatedAt: new Date() } as any)
      .where(eq(users.id, id));
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

    return await db
      .select()
      .from(users)
      .where(conditions.length > 0 ? and(...conditions) : undefined)
      .orderBy(desc(users.createdAt));
  }

  async getJobApplication(id: string): Promise<JobApplicationWithUsers | undefined> {
    const clientUsers = alias(users, 'client_users_single');
    const employeeUsers = alias(users, 'employee_users_single');

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
  }

  async createJobApplication(applicationData: InsertJobApplication & { appliedByName: string }): Promise<JobApplication> {
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
        status: (applicationData as any).status || "Applied",
        mailSent: (applicationData as any).mailSent || false,
        notes: (applicationData as any).notes,
      } as any)
      .returning();
    return application;
  }

  async updateJobApplication(id: string, applicationData: UpdateJobApplication): Promise<JobApplication | undefined> {
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
        ...((applicationData as any).status !== undefined ? { status: (applicationData as any).status } : {}),
        ...((applicationData as any).mailSent !== undefined ? { mailSent: (applicationData as any).mailSent } : {}),
        ...((applicationData as any).notes !== undefined ? { notes: (applicationData as any).notes } : {}),
      } as any)
      .where(eq(jobApplications.id, id))
      .returning();
    return application;
  }

  async deleteJobApplication(id: string): Promise<void> {
    await db.delete(jobApplications).where(eq(jobApplications.id, id));
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
      conditions.push(
        sql`${jobApplications.jobTitle} ILIKE ${`%${filters.search}%`} OR ${jobApplications.companyName} ILIKE ${`%${filters.search}%`}`
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

    // Get total count
    const [{ count: total }] = await db
      .select({ count: count() })
      .from(jobApplications)
      .where(conditions.length > 0 ? and(...conditions) : undefined);

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
  }

  async getDashboardStats(): Promise<{
    totalApplications: number;
    activeEmployees: number;
    hiredThisMonth: number;
    pendingReview: number;
  }> {
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
  }

  async getEmployeeStats(employeeId: string): Promise<{
    myApplications: number;
    inProgress: number;
    successRate: number;
  }> {
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
  }

  async getClientStats(clientId: string): Promise<{
    totalApplications: number;
    inProgress: number;
    interviews: number;
    hired: number;
  }> {
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
  }
}

export const storage = new DatabaseStorage();
