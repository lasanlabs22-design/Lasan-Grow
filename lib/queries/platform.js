import "server-only";
import { alias } from "drizzle-orm/pg-core";
import { asc, desc, eq, sql } from "drizzle-orm";
import { getDb, schema } from "@/lib/db";

// Cross-workspace reads for the platform console only. Nothing else may call these: every other
// query in the app is scoped to one org.

const { organizations, users, deals, platformAdmins } = schema;
const toDate = (v) => (v ? new Date(v) : null);

export async function listWorkspaces() {
  const db = await getDb();
  const [rows, dealCounts] = await Promise.all([
    db
      .select({
        id: organizations.id,
        name: organizations.name,
        currency: organizations.currency,
        status: organizations.status,
        createdAt: organizations.createdAt,
        createdByName: platformAdmins.name,
        people: sql`count(${users.id})`.mapWith(Number),
        lastLoginAt: sql`max(${users.lastLoginAt})`.mapWith(toDate),
        ownerId: sql`(array_agg(${users.id} order by ${users.createdAt}) filter (where ${users.role} = 'owner'))[1]`,
        ownerName: sql`(array_agg(${users.name} order by ${users.createdAt}) filter (where ${users.role} = 'owner'))[1]`,
        ownerEmail: sql`(array_agg(${users.email} order by ${users.createdAt}) filter (where ${users.role} = 'owner'))[1]`,
        ownerPending: sql`bool_or(${users.role} = 'owner' and ${users.mustChangePassword})`.mapWith(Boolean),
      })
      .from(organizations)
      .leftJoin(users, eq(users.orgId, organizations.id))
      .leftJoin(platformAdmins, eq(platformAdmins.id, organizations.createdBy))
      .groupBy(organizations.id, platformAdmins.name)
      .orderBy(desc(organizations.createdAt)),
    db
      .select({ orgId: deals.orgId, n: sql`count(*)`.mapWith(Number) })
      .from(deals)
      .groupBy(deals.orgId),
  ]);
  const byOrg = new Map(dealCounts.map((d) => [d.orgId, d.n]));
  return rows.map((r) => ({ ...r, deals: byOrg.get(r.id) ?? 0 }));
}

export async function listPlatformTeam() {
  const db = await getDb();
  const creator = alias(platformAdmins, "creator");
  return db
    .select({
      id: platformAdmins.id,
      name: platformAdmins.name,
      email: platformAdmins.email,
      role: platformAdmins.role,
      isActive: platformAdmins.isActive,
      mustChangePassword: platformAdmins.mustChangePassword,
      lockedUntil: platformAdmins.lockedUntil,
      lastLoginAt: platformAdmins.lastLoginAt,
      createdAt: platformAdmins.createdAt,
      createdByName: creator.name,
    })
    .from(platformAdmins)
    .leftJoin(creator, eq(creator.id, platformAdmins.createdBy))
    .orderBy(asc(platformAdmins.role), asc(platformAdmins.createdAt));
}
