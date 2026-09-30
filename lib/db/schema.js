import {
  pgTable,
  uuid,
  text,
  integer,
  boolean,
  timestamp,
  date,
  pgEnum,
  index,
  uniqueIndex,
} from "drizzle-orm/pg-core";

export const roleEnum = pgEnum("role", ["owner", "admin", "member"]);
export const leadStatusEnum = pgEnum("lead_status", [
  "new",
  "contacted",
  "qualified",
  "unqualified",
  "converted",
]);
export const stageKindEnum = pgEnum("stage_kind", ["open", "won", "lost"]);
export const dealStatusEnum = pgEnum("deal_status", ["open", "won", "lost"]);
export const workspaceStatusEnum = pgEnum("workspace_status", ["active", "suspended"]);
export const platformRoleEnum = pgEnum("platform_role", ["admin", "staff"]);
export const activityTypeEnum = pgEnum("activity_type", [
  "call",
  "email",
  "meeting",
  "task",
  "note",
]);

const id = () => uuid("id").primaryKey().defaultRandom();
const createdAt = () =>
  timestamp("created_at", { withTimezone: true }).notNull().defaultNow();

// Lasan staff who run the platform console (ops): they create customer workspaces and manage them.
// They belong to no workspace. The first one is created from the terminal (npm run platform:admin).
//   admin: everything, including suspending workspaces and managing the Lasan team
//   staff: creates and views workspaces
export const platformAdmins = pgTable(
  "platform_admins",
  {
    id: id(),
    email: text("email").notNull(),
    name: text("name").notNull(),
    passwordHash: text("password_hash").notNull(),
    role: platformRoleEnum("role").notNull().default("staff"),
    isActive: boolean("is_active").notNull().default(true),
    mustChangePassword: boolean("must_change_password").notNull().default(false),
    // Bumped on password change, role change or deactivation; signs the person out everywhere.
    tokenVersion: integer("token_version").notNull().default(0),
    failedLogins: integer("failed_logins").notNull().default(0),
    lockedUntil: timestamp("locked_until", { withTimezone: true }),
    lastLoginAt: timestamp("last_login_at", { withTimezone: true }),
    createdBy: uuid("created_by").references(() => platformAdmins.id, { onDelete: "set null" }),
    createdAt: createdAt(),
  },
  (t) => [uniqueIndex("platform_admins_email_idx").on(t.email)]
);

export const organizations = pgTable("organizations", {
  id: id(),
  name: text("name").notNull(),
  currency: text("currency").notNull().default("INR"),
  // Suspended workspaces keep their data, but nobody in them can sign in.
  status: workspaceStatusEnum("status").notNull().default("active"),
  createdBy: uuid("created_by").references(() => platformAdmins.id, { onDelete: "set null" }),
  createdAt: createdAt(),
});

export const users = pgTable(
  "users",
  {
    id: id(),
    orgId: uuid("org_id")
      .notNull()
      .references(() => organizations.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    email: text("email").notNull(),
    passwordHash: text("password_hash").notNull(),
    role: roleEnum("role").notNull().default("member"),
    // Set for passwords someone else chose (the console, or a workspace admin adding a teammate).
    mustChangePassword: boolean("must_change_password").notNull().default(false),
    lastLoginAt: timestamp("last_login_at", { withTimezone: true }),
    createdAt: createdAt(),
  },
  (t) => [uniqueIndex("users_email_idx").on(t.email)]
);

export const companies = pgTable(
  "companies",
  {
    id: id(),
    orgId: uuid("org_id")
      .notNull()
      .references(() => organizations.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    domain: text("domain"),
    industry: text("industry"),
    size: text("size"),
    city: text("city"),
    ownerId: uuid("owner_id").references(() => users.id, { onDelete: "set null" }),
    createdAt: createdAt(),
  },
  (t) => [index("companies_org_idx").on(t.orgId)]
);

export const contacts = pgTable(
  "contacts",
  {
    id: id(),
    orgId: uuid("org_id")
      .notNull()
      .references(() => organizations.id, { onDelete: "cascade" }),
    companyId: uuid("company_id").references(() => companies.id, {
      onDelete: "set null",
    }),
    firstName: text("first_name").notNull(),
    lastName: text("last_name"),
    email: text("email"),
    phone: text("phone"),
    title: text("title"),
    source: text("source"),
    ownerId: uuid("owner_id").references(() => users.id, { onDelete: "set null" }),
    createdAt: createdAt(),
  },
  (t) => [index("contacts_org_idx").on(t.orgId)]
);

export const leads = pgTable(
  "leads",
  {
    id: id(),
    orgId: uuid("org_id")
      .notNull()
      .references(() => organizations.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    email: text("email"),
    phone: text("phone"),
    companyName: text("company_name"),
    source: text("source"),
    status: leadStatusEnum("status").notNull().default("new"),
    score: integer("score").notNull().default(0),
    estimatedValue: integer("estimated_value").notNull().default(0),
    ownerId: uuid("owner_id").references(() => users.id, { onDelete: "set null" }),
    createdAt: createdAt(),
  },
  (t) => [index("leads_org_idx").on(t.orgId)]
);

export const stages = pgTable(
  "stages",
  {
    id: id(),
    orgId: uuid("org_id")
      .notNull()
      .references(() => organizations.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    position: integer("position").notNull(),
    probability: integer("probability").notNull().default(0),
    kind: stageKindEnum("kind").notNull().default("open"),
  },
  (t) => [index("stages_org_idx").on(t.orgId)]
);

export const deals = pgTable(
  "deals",
  {
    id: id(),
    orgId: uuid("org_id")
      .notNull()
      .references(() => organizations.id, { onDelete: "cascade" }),
    title: text("title").notNull(),
    value: integer("value").notNull().default(0),
    stageId: uuid("stage_id")
      .notNull()
      .references(() => stages.id, { onDelete: "restrict" }),
    status: dealStatusEnum("status").notNull().default("open"),
    contactId: uuid("contact_id").references(() => contacts.id, {
      onDelete: "set null",
    }),
    companyId: uuid("company_id").references(() => companies.id, {
      onDelete: "set null",
    }),
    ownerId: uuid("owner_id").references(() => users.id, { onDelete: "set null" }),
    source: text("source"),
    expectedClose: date("expected_close"),
    closedAt: timestamp("closed_at", { withTimezone: true }),
    lostReason: text("lost_reason"),
    createdAt: createdAt(),
  },
  (t) => [
    index("deals_org_idx").on(t.orgId),
    index("deals_stage_idx").on(t.stageId),
  ]
);

export const activities = pgTable(
  "activities",
  {
    id: id(),
    orgId: uuid("org_id")
      .notNull()
      .references(() => organizations.id, { onDelete: "cascade" }),
    type: activityTypeEnum("type").notNull().default("task"),
    subject: text("subject").notNull(),
    notes: text("notes"),
    dueAt: timestamp("due_at", { withTimezone: true }),
    done: boolean("done").notNull().default(false),
    completedAt: timestamp("completed_at", { withTimezone: true }),
    dealId: uuid("deal_id").references(() => deals.id, { onDelete: "cascade" }),
    contactId: uuid("contact_id").references(() => contacts.id, {
      onDelete: "cascade",
    }),
    companyId: uuid("company_id").references(() => companies.id, {
      onDelete: "cascade",
    }),
    leadId: uuid("lead_id").references(() => leads.id, { onDelete: "cascade" }),
    ownerId: uuid("owner_id").references(() => users.id, { onDelete: "set null" }),
    createdAt: createdAt(),
  },
  (t) => [
    index("activities_org_idx").on(t.orgId),
    index("activities_due_idx").on(t.orgId, t.done, t.dueAt),
  ]
);
