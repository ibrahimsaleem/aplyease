import { users, jobApplications, type User, type InsertUser, type UpdateUser, type JobApplication, type InsertJobApplication, type UpdateJobApplication, type JobApplicationWithUsers } from "@shared/schema";
import { db } from "./db";
import { eq, and, like, ilike, desc, asc, count, sql } from "drizzle-orm";
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
        ...userData,
        passwordHash,
        updatedAt: new Date(),
      })
      .returning();
    return user;
  }

  async updateUser(id: string, userData: UpdateUser): Promise<User | undefined> {
    const [user] = await db
      .update(users)
      .set({ ...userData, updatedAt: new Date() })
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
    let query = db.select().from(users);

    const conditions = [];
    
    if (filters?.role) {
      conditions.push(eq(users.role, filters.role as any));
    }

    if (filters?.search) {
      conditions.push(
        sql`${users.name} ILIKE ${`%${filters.search}%`} OR ${users.email} ILIKE ${`%${filters.search}%`}`
      );
    }

    if (conditions.length > 0) {
      query = query.where(and(...conditions));
    }

    return await query.orderBy(desc(users.createdAt));
  }

  async getJobApplication(id: string): Promise<JobApplicationWithUsers | undefined> {
    const [application] = await db
      .select()
      .from(jobApplications)
      .leftJoin(users, eq(jobApplications.clientId, users.id))
      .leftJoin(users, eq(jobApplications.employeeId, users.id))
      .where(eq(jobApplications.id, id));

    if (!application) return undefined;

    return {
      ...application.job_applications,
      client: application.users!,
      employee: application.users!,
    };
  }

  async createJobApplication(applicationData: InsertJobApplication): Promise<JobApplication> {
    const [application] = await db
      .insert(jobApplications)
      .values({
        ...applicationData,
        updatedAt: new Date(),
      })
      .returning();
    return application;
  }

  async updateJobApplication(id: string, applicationData: UpdateJobApplication): Promise<JobApplication | undefined> {
    const [application] = await db
      .update(jobApplications)
      .set({ ...applicationData, updatedAt: new Date() })
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

    let query = baseQuery;
    if (conditions.length > 0) {
      query = baseQuery.where(and(...conditions));
    }

    // Sorting
    const sortBy = filters?.sortBy || "dateApplied";
    const sortOrder = filters?.sortOrder || "desc";
    const orderByColumn = sortBy === "dateApplied" ? jobApplications.dateApplied : jobApplications.createdAt;
    
    if (sortOrder === "asc") {
      query = query.orderBy(asc(orderByColumn));
    } else {
      query = query.orderBy(desc(orderByColumn));
    }

    // Get total count
    const baseCountQuery = db.select({ count: count() }).from(jobApplications);
    let countQuery = baseCountQuery;
    if (conditions.length > 0) {
      countQuery = baseCountQuery.where(and(...conditions));
    }
    const [{ count: total }] = await countQuery;

    // Get paginated results
    const results = await query.limit(limit).offset(offset);

    const applications: JobApplicationWithUsers[] = results.map((result) => ({
      ...result.application,
      client: result.client!,
      employee: result.employee!,
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
