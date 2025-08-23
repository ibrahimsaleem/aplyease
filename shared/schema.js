"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.updateJobApplicationSchema = exports.insertJobApplicationSchema = exports.updateUserSchema = exports.insertUserSchema = exports.jobApplicationsRelations = exports.usersRelations = exports.jobApplications = exports.users = exports.sessions = exports.statusEnum = exports.roleEnum = void 0;
const drizzle_orm_1 = require("drizzle-orm");
const pg_core_1 = require("drizzle-orm/pg-core");
const drizzle_orm_2 = require("drizzle-orm");
const drizzle_zod_1 = require("drizzle-zod");
const zod_1 = require("zod");
// Enums
exports.roleEnum = (0, pg_core_1.pgEnum)("role", ["ADMIN", "CLIENT", "EMPLOYEE"]);
exports.statusEnum = (0, pg_core_1.pgEnum)("status", [
    "Applied",
    "Screening",
    "Interview",
    "Offer",
    "Hired",
    "Rejected",
    "On Hold"
]);
// Session storage table for express-session
exports.sessions = (0, pg_core_1.pgTable)("sessions", {
    sid: (0, pg_core_1.varchar)("sid").primaryKey(),
    sess: (0, pg_core_1.text)("sess").notNull(),
    expire: (0, pg_core_1.timestamp)("expire").notNull(),
}, (table) => [(0, pg_core_1.index)("IDX_session_expire").on(table.expire)]);
// Users table
exports.users = (0, pg_core_1.pgTable)("users", {
    id: (0, pg_core_1.uuid)("id").primaryKey().default((0, drizzle_orm_1.sql) `gen_random_uuid()`),
    name: (0, pg_core_1.text)("name").notNull(),
    email: (0, pg_core_1.text)("email").notNull().unique(),
    role: (0, exports.roleEnum)("role").notNull(),
    company: (0, pg_core_1.text)("company"),
    isActive: (0, pg_core_1.boolean)("is_active").default((0, drizzle_orm_1.sql) `true`).notNull(),
    passwordHash: (0, pg_core_1.text)("password_hash").notNull(),
    createdAt: (0, pg_core_1.timestamp)("created_at").defaultNow().notNull(),
    updatedAt: (0, pg_core_1.timestamp)("updated_at").defaultNow().notNull(),
}, (table) => [
    (0, pg_core_1.index)("idx_users_email").on(table.email),
    (0, pg_core_1.index)("idx_users_role_active").on(table.role, table.isActive),
]);
// Job applications table
exports.jobApplications = (0, pg_core_1.pgTable)("job_applications", {
    id: (0, pg_core_1.uuid)("id").primaryKey().default((0, drizzle_orm_1.sql) `gen_random_uuid()`),
    clientId: (0, pg_core_1.uuid)("client_id").notNull().references(() => exports.users.id),
    employeeId: (0, pg_core_1.uuid)("employee_id").notNull().references(() => exports.users.id),
    dateApplied: (0, pg_core_1.date)("date_applied").notNull(),
    appliedByName: (0, pg_core_1.text)("applied_by_name").notNull(),
    jobTitle: (0, pg_core_1.text)("job_title").notNull(),
    companyName: (0, pg_core_1.text)("company_name").notNull(),
    location: (0, pg_core_1.text)("location"),
    portalName: (0, pg_core_1.text)("portal_name"),
    jobLink: (0, pg_core_1.text)("job_link"),
    jobPage: (0, pg_core_1.text)("job_page"),
    resumeUrl: (0, pg_core_1.text)("resume_url"),
    status: (0, exports.statusEnum)("status").default("Applied").notNull(),
    mailSent: (0, pg_core_1.boolean)("mail_sent").default((0, drizzle_orm_1.sql) `false`).notNull(),
    notes: (0, pg_core_1.text)("notes"),
    createdAt: (0, pg_core_1.timestamp)("created_at").defaultNow().notNull(),
    updatedAt: (0, pg_core_1.timestamp)("updated_at").defaultNow().notNull(),
}, (table) => [
    (0, pg_core_1.index)("idx_job_applications_client").on(table.clientId),
    (0, pg_core_1.index)("idx_job_applications_employee").on(table.employeeId),
    (0, pg_core_1.index)("idx_job_applications_status").on(table.status),
    (0, pg_core_1.index)("idx_job_applications_date").on(table.dateApplied),
]);
// Relations
exports.usersRelations = (0, drizzle_orm_2.relations)(exports.users, ({ many }) => ({
    clientApplications: many(exports.jobApplications, { relationName: "client" }),
    employeeApplications: many(exports.jobApplications, { relationName: "employee" }),
}));
exports.jobApplicationsRelations = (0, drizzle_orm_2.relations)(exports.jobApplications, ({ one }) => ({
    client: one(exports.users, {
        fields: [exports.jobApplications.clientId],
        references: [exports.users.id],
        relationName: "client",
    }),
    employee: one(exports.users, {
        fields: [exports.jobApplications.employeeId],
        references: [exports.users.id],
        relationName: "employee",
    }),
}));
// Schemas for validation
exports.insertUserSchema = (0, drizzle_zod_1.createInsertSchema)(exports.users)
    .omit({
    id: true,
    createdAt: true,
    updatedAt: true,
    passwordHash: true, // Exclude passwordHash since we'll handle it in the backend
})
    .extend({
    password: zod_1.z.string().min(6, "Password must be at least 6 characters"),
});
exports.updateUserSchema = (0, drizzle_zod_1.createInsertSchema)(exports.users)
    .omit({
    id: true,
    createdAt: true,
    updatedAt: true,
    passwordHash: true,
})
    .partial();
exports.insertJobApplicationSchema = (0, drizzle_zod_1.createInsertSchema)(exports.jobApplications)
    .omit({
    id: true,
    createdAt: true,
    updatedAt: true,
    appliedByName: true, // Will be set automatically on server
})
    .extend({
    employeeId: zod_1.z.string().optional(), // Optional for employees, required for admin submissions
    jobLink: zod_1.z.string().url().optional().or(zod_1.z.literal("")),
    jobPage: zod_1.z.string().url().optional().or(zod_1.z.literal("")),
    resumeUrl: zod_1.z.string().url().optional().or(zod_1.z.literal("")),
});
exports.updateJobApplicationSchema = exports.insertJobApplicationSchema.partial();
