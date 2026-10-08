import { asc, eq, sql } from "drizzle-orm";
import { requireUser } from "@/lib/auth";
import { tenantDb, schema } from "@/lib/db";
import { photoUrl } from "@/lib/photos";
import { money, longDate, relativeTime } from "@/lib/format";
import { Avatar, Badge, Card, PageHeader, Table, Td, Th } from "@/components/ui";
import { AddTeammate, MemberActions, TeamNotice } from "./team-client";

export const metadata = { title: "Team" };

const { users, userPhotos, deals, leads, activities } = schema;

// Correlated subqueries name the outer row explicitly: Drizzle drops table prefixes on single-table selects.
const owner = sql.raw(`"users"."id"`);

export default async function TeamPage() {
  const { user, org } = await requireUser();
  const db = await tenantDb(org.id);
  const canManage = ["owner", "admin"].includes(user.role);

  const team = await db
    .select({
      id: users.id,
      name: users.name,
      email: users.email,
      role: users.role,
      mustChangePassword: users.mustChangePassword,
      lastLoginAt: users.lastLoginAt,
      createdAt: users.createdAt,
      photoAt: userPhotos.updatedAt,
      openDeals: sql`(select count(*) from ${deals} where ${deals.ownerId} = ${owner} and ${deals.status} = 'open')`.mapWith(Number),
      openValue: sql`(select coalesce(sum(${deals.value}), 0) from ${deals} where ${deals.ownerId} = ${owner} and ${deals.status} = 'open')`.mapWith(Number),
      wonMonth: sql`(select coalesce(sum(${deals.value}), 0) from ${deals} where ${deals.ownerId} = ${owner} and ${deals.status} = 'won' and ${deals.closedAt} >= date_trunc('month', now()))`.mapWith(Number),
      openLeads: sql`(select count(*) from ${leads} where ${leads.ownerId} = ${owner} and ${leads.status} not in ('converted', 'unqualified'))`.mapWith(Number),
      openTasks: sql`(select count(*) from ${activities} where ${activities.ownerId} = ${owner} and not ${activities.done})`.mapWith(Number),
    })
    .from(users)
    .leftJoin(userPhotos, eq(userPhotos.userId, users.id))
    .where(eq(users.orgId, org.id))
    .orderBy(asc(users.createdAt));

  const admins = team.filter((m) => m.role !== "member").length;

  return (
    <div>
      <PageHeader
        title="Team"
        description={`${team.length} ${team.length === 1 ? "person" : "people"} in ${org.name}${admins ? `, ${admins} with admin rights` : ""}. Everyone shares this workspace's data.`}
      >
        {canManage && <AddTeammate />}
      </PageHeader>
      <TeamNotice />
      <Card>
        <Table>
          <thead>
            <tr>
              <Th>Person</Th>
              <Th>Role</Th>
              <Th className="text-right">Open deals</Th>
              <Th className="text-right">Won this month</Th>
              <Th className="text-right">Open leads</Th>
              <Th className="text-right">Open tasks</Th>
              <Th>Last sign-in</Th>
              {canManage && <Th className="text-right">Actions</Th>}
            </tr>
          </thead>
          <tbody>
            {team.map((m) => {
              const self = m.id === user.id;
              return (
                <tr key={m.id} className="hover:bg-surface-2">
                  <Td>
                    <div className="flex items-center gap-3">
                      <Avatar src={photoUrl(m.id, m.photoAt)} name={m.name} size={36} />
                      <div className="min-w-0">
                        <p className="truncate font-semibold">
                          {m.name} {self && <span className="font-normal text-ink-3">(you)</span>}
                        </p>
                        <p className="truncate text-xs text-ink-3">{m.email}</p>
                      </div>
                    </div>
                  </Td>
                  <Td>
                    <div className="flex flex-wrap gap-1">
                      <Badge tone={m.role === "owner" ? "ink" : m.role === "admin" ? "brand" : "outline"} className="capitalize">
                        {m.role}
                      </Badge>
                      {m.mustChangePassword && <Badge tone="warn">Invited</Badge>}
                    </div>
                  </Td>
                  <Td className="text-right tabular-nums">
                    <p>{m.openDeals}</p>
                    {m.openValue > 0 && <p className="text-xs text-ink-3">{money(m.openValue, org.currency, { compact: true })}</p>}
                  </Td>
                  <Td className="text-right tabular-nums">{m.wonMonth > 0 ? money(m.wonMonth, org.currency, { compact: true }) : "—"}</Td>
                  <Td className="text-right tabular-nums">{m.openLeads}</Td>
                  <Td className="text-right tabular-nums">{m.openTasks}</Td>
                  <Td className="text-ink-2">
                    <p>{m.lastLoginAt ? relativeTime(m.lastLoginAt) : "Never"}</p>
                    <p className="text-xs text-ink-3">Joined {longDate(m.createdAt)}</p>
                  </Td>
                  {canManage && (
                    <Td>
                      {!self && m.role !== "owner" && <MemberActions id={m.id} name={m.name} role={m.role} />}
                    </Td>
                  )}
                </tr>
              );
            })}
          </tbody>
        </Table>
      </Card>
    </div>
  );
}
