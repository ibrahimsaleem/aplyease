import { sql } from "drizzle-orm";
import { pgTable, uuid, text, varchar, timestamp, date, boolean, pgEnum, index, integer } from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";
import { createInsertSchema, createSelectSchema } from "drizzle-zod";
import { z } from "zod";

// Enums
export const roleEnum = pgEnum("role", ["ADMIN", "CLIENT", "EMPLOYEE"]);
export const statusEnum = pgEnum("status", [
  "Applied",
  "Screening", 
  "Interview",
  "Offer",
  "Hired",
  "Rejected",
  "On Hold"
]);

// Session storage table for express-session
export const sessions = pgTable(
  "sessions",
  {
    sid: varchar("sid").primaryKey(),
    sess: text("sess").notNull(),
    expire: timestamp("expire").notNull(),
  },
  (table) => [index("IDX_session_expire").on(table.expire)]
);

// Users table
export const users = pgTable(
  "users",
  {
    id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
    name: text("name").notNull(),
    email: text("email").notNull().unique(),
    role: roleEnum("role").notNull(),
    company: text("company"),
    applicationsRemaining: integer("applications_remaining").notNull().default(sql`0`),
    isActive: boolean("is_active").default(sql`true`).notNull(),
    passwordHash: text("password_hash").notNull(),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
  },
  (table) => [
    index("idx_users_email").on(table.email),
    index("idx_users_role_active").on(table.role, table.isActive),
  ]
);

// Job applications table
export const jobApplications = pgTable(
  "job_applications",
  {
    id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
    clientId: uuid("client_id").notNull().references(() => users.id),
    employeeId: uuid("employee_id").notNull().references(() => users.id),
    dateApplied: date("date_applied").notNull(),
    appliedByName: text("applied_by_name").notNull(),
    jobTitle: text("job_title").notNull(),
    companyName: text("company_name").notNull(),
    location: text("location"),
    portalName: text("portal_name"),
    jobLink: text("job_link"),
    jobPage: text("job_page"),
    resumeUrl: text("resume_url"),
    additionalLink: text("additional_link"),
    status: statusEnum("status").default("Applied").notNull(),
    mailSent: boolean("mail_sent").default(sql`false`).notNull(),
    notes: text("notes"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
  },
  (table) => [
    index("idx_job_applications_client").on(table.clientId),
    index("idx_job_applications_employee").on(table.employeeId),
    index("idx_job_applications_status").on(table.status),
    index("idx_job_applications_date").on(table.dateApplied),
  ]
);

// Relations
export const usersRelations = relations(users, ({ many }) => ({
  clientApplications: many(jobApplications, { relationName: "client" }),
  employeeApplications: many(jobApplications, { relationName: "employee" }),
}));

export const jobApplicationsRelations = relations(jobApplications, ({ one }) => ({
  client: one(users, {
    fields: [jobApplications.clientId],
    references: [users.id],
    relationName: "client",
  }),
  employee: one(users, {
    fields: [jobApplications.employeeId],
    references: [users.id],
    relationName: "employee",
  }),
}));

// Schemas for validation
export const insertUserSchema = createInsertSchema(users)
  .omit({
    id: true,
    createdAt: true,
    updatedAt: true,
    passwordHash: true, // Exclude passwordHash since we'll handle it in the backend
  } as any)
  .extend({
  password: z.string().min(6, "Password must be at least 6 characters"),
  applicationsRemaining: z.number().int().min(0).optional(),
});

export const updateUserSchema = createInsertSchema(users)
  .omit({
    id: true,
    createdAt: true,
    updatedAt: true,
    passwordHash: true,
  } as any)
  .partial();

export const insertJobApplicationSchema = createInsertSchema(jobApplications)
  .omit({
    id: true,
    createdAt: true,
    updatedAt: true,
    appliedByName: true, // Will be set automatically on server
  } as any)
  .extend({
  employeeId: z.string().optional(), // Optional for employees, required for admin submissions
  jobLink: z.string().url().optional().or(z.literal("")),
  jobPage: z.string().url().optional().or(z.literal("")),
  resumeUrl: z.string().url().optional().or(z.literal("")),
  additionalLink: z.string().url().optional().or(z.literal("")),
});

export const updateJobApplicationSchema = insertJobApplicationSchema.partial();

// Types
export type User = typeof users.$inferSelect;
export type InsertUser = z.infer<typeof insertUserSchema>;
export type UpdateUser = z.infer<typeof updateUserSchema>;
export type JobApplication = typeof jobApplications.$inferSelect;
export type InsertJobApplication = z.infer<typeof insertJobApplicationSchema>;
export type UpdateJobApplication = z.infer<typeof updateJobApplicationSchema>;

// Types with relations
export type UserWithApplications = User & {
  clientApplications?: JobApplication[];
  employeeApplications?: JobApplication[];
};

export type JobApplicationWithUsers = JobApplication & {
  client: User;
  employee: User;
};
