import { users, jobApplications, type User, type InsertUser, type UpdateUser, type JobApplication, type InsertJobApplication, type UpdateJobApplication, type JobApplicationWithUsers } from "@shared/schema";
import { db } from "./db.js";
import { eq, and, like, ilike, desc, asc, count, sql, type SQL } from "drizzle-orm";
import { alias } from "drizzle-orm/pg-core";
import { hashPassword } from "./auth.js";

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
        name: userData.name,
        email: userData.email,
        role: userData.role as any,
        company: userData.company,
        passwordHash,
        isActive: userData.isActive ?? true,
      })
      .returning();
    return user;
  }

  async updateUser(id: string, userData: UpdateUser): Promise<User | undefined> {
    const [user] = await db
      .update(users)
      .set({
        ...(userData.name !== undefined ? { name: userData.name } : {}),
        ...(userData.email !== undefined ? { email: userData.email } : {}),
        ...(userData.role !== undefined ? { role: userData.role as any } : {}),
        ...(userData.company !== undefined ? { company: userData.company } : {}),
        ...(userData.isActive !== undefined ? { isActive: userData.isActive } : {}),
      })
      .where(eq(users.id, id))
      .returning();
    return user;
  }

  async disableUser(id: string): Promise<void> {
    await db
      .update(users)
      .set({ isActive: false, updatedAt: new Date() })
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
        clientId: applicationData.clientId,
        employeeId: applicationData.employeeId!,
        dateApplied: applicationData.dateApplied,
        appliedByName: applicationData.appliedByName,
        jobTitle: applicationData.jobTitle,
        companyName: applicationData.companyName,
        location: applicationData.location,
        portalName: applicationData.portalName,
        jobLink: applicationData.jobLink,
        jobPage: applicationData.jobPage,
        resumeUrl: applicationData.resumeUrl,
        status: applicationData.status || "Applied",
        mailSent: applicationData.mailSent || false,
        notes: applicationData.notes,
      })
      .returning();
    return application;
  }

  async updateJobApplication(id: string, applicationData: UpdateJobApplication): Promise<JobApplication | undefined> {
    const [application] = await db
      .update(jobApplications)
      .set({
        ...(applicationData.clientId !== undefined ? { clientId: applicationData.clientId } : {}),
        ...(applicationData.employeeId !== undefined ? { employeeId: applicationData.employeeId } : {}),
        ...(applicationData.dateApplied !== undefined ? { dateApplied: applicationData.dateApplied } : {}),
        ...(applicationData.jobTitle !== undefined ? { jobTitle: applicationData.jobTitle } : {}),
        ...(applicationData.companyName !== undefined ? { companyName: applicationData.companyName } : {}),
        ...(applicationData.location !== undefined ? { location: applicationData.location } : {}),
        ...(applicationData.portalName !== undefined ? { portalName: applicationData.portalName } : {}),
        ...(applicationData.jobLink !== undefined ? { jobLink: applicationData.jobLink } : {}),
        ...(applicationData.jobPage !== undefined ? { jobPage: applicationData.jobPage } : {}),
        ...(applicationData.resumeUrl !== undefined ? { resumeUrl: applicationData.resumeUrl } : {}),
        ...(applicationData.status !== undefined ? { status: applicationData.status as any } : {}),
        ...(applicationData.mailSent !== undefined ? { mailSent: applicationData.mailSent } : {}),
        ...(applicationData.notes !== undefined ? { notes: applicationData.notes } : {}),
      })
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
