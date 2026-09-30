import { redirect } from "next/navigation";
import { KeyRound, Pause, Play, ShieldCheck, UserRound } from "lucide-react";
import { requirePlatformAdmin } from "@/lib/platform";
import { listPlatformTeam } from "@/lib/queries/platform";
import { relativeTime, shortDate } from "@/lib/format";
import { Avatar, Badge, Card, PageHeader, Table, Td, Th } from "@/components/ui";
import { resetPlatformMemberPassword, setPlatformMemberActive, setPlatformMemberRole } from "../../actions";
import { ActionButton, AddMember } from "../../client";

export const metadata = { title: "Lasan team · Platform console" };

export default async function TeamPage() {
  // Only admins see or manage the team; staff are sent back to the workspaces.
  const me = await requirePlatformAdmin();
  if (me.role !== "admin") redirect("/platform");
  const team = await listPlatformTeam();

  return (
    <>
      <PageHeader title="Lasan team" description="Who can use this console. Everyone gets a temporary password to replace at first sign-in.">
        <AddMember />
      </PageHeader>
      <Card>
        <Table>
          <thead>
            <tr>
              <Th>Person</Th>
              <Th>Role</Th>
              <Th>Status</Th>
              <Th>Last sign-in</Th>
              <Th>Added</Th>
              <Th className="text-right">Actions</Th>
            </tr>
          </thead>
          <tbody>
            {team.map((m) => {
              const self = m.id === me.id;
              const locked = m.lockedUntil && m.lockedUntil > new Date();
              return (
                <tr key={m.id} className="hover:bg-surface-2">
                  <Td>
                    <div className="flex items-center gap-3">
                      <Avatar name={m.name} size={30} />
                      <div className="min-w-0">
                        <p className="font-semibold">
                          {m.name} {self && <span className="font-normal text-ink-3">(you)</span>}
                        </p>
                        <p className="text-xs text-ink-3">{m.email}</p>
                      </div>
                    </div>
                  </Td>
                  <Td>
                    <Badge tone={m.role === "admin" ? "brand" : "neutral"}>{m.role === "admin" ? "Admin" : "Staff"}</Badge>
                  </Td>
                  <Td>
                    <div className="flex flex-wrap gap-1">
                      <Badge tone={m.isActive ? "good" : "bad"}>{m.isActive ? "Active" : "Deactivated"}</Badge>
                      {m.mustChangePassword && <Badge tone="warn">Temporary password</Badge>}
                      {locked && <Badge tone="bad">Locked out</Badge>}
                    </div>
                  </Td>
                  <Td className="text-ink-2">{m.lastLoginAt ? relativeTime(m.lastLoginAt) : "Never"}</Td>
                  <Td>
                    <p>{shortDate(m.createdAt)}</p>
                    <p className="text-xs text-ink-3">{m.createdByName ? `by ${m.createdByName}` : "From the terminal"}</p>
                  </Td>
                  <Td>
                    {!self && (
                      <div className="flex flex-wrap justify-end gap-1.5">
                        <ActionButton
                          action={resetPlatformMemberPassword.bind(null, m.id)}
                          confirm={`Give ${m.name} a new temporary password? They're signed out everywhere.`}
                          resultTitle="New temporary password"
                        >
                          <KeyRound size={13} /> Reset password
                        </ActionButton>
                        <ActionButton
                          action={setPlatformMemberRole.bind(null, m.id, m.role === "admin" ? "staff" : "admin")}
                          confirm={`Make ${m.name} ${m.role === "admin" ? "staff" : "an admin"}?`}
                        >
                          {m.role === "admin" ? <UserRound size={13} /> : <ShieldCheck size={13} />}
                          {m.role === "admin" ? "Make staff" : "Make admin"}
                        </ActionButton>
                        {m.isActive ? (
                          <ActionButton
                            variant="danger"
                            action={setPlatformMemberActive.bind(null, m.id, false)}
                            confirm={`Deactivate ${m.name}? They're signed out and can't sign in.`}
                          >
                            <Pause size={13} /> Deactivate
                          </ActionButton>
                        ) : (
                          <ActionButton action={setPlatformMemberActive.bind(null, m.id, true)} confirm={`Reactivate ${m.name}?`}>
                            <Play size={13} /> Reactivate
                          </ActionButton>
                        )}
                      </div>
                    )}
                  </Td>
                </tr>
              );
            })}
          </tbody>
        </Table>
      </Card>
    </>
  );
}
