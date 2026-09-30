import { Building2, KeyRound, Pause, Play } from "lucide-react";
import { requirePlatformAdmin } from "@/lib/platform";
import { listWorkspaces } from "@/lib/queries/platform";
import { number, relativeTime, shortDate } from "@/lib/format";
import { Badge, Card, EmptyState, PageHeader, Table, Td, Th } from "@/components/ui";
import { resetOwnerPassword, setWorkspaceStatus } from "../actions";
import { ActionButton, CreateWorkspace } from "../client";

export const metadata = { title: "Workspaces · Platform console" };

function Stat({ label, value }) {
  return (
    <div className="top-rule rounded-md border border-line bg-surface px-4 py-3">
      <p className="text-[13px] font-semibold text-ink-2">{label}</p>
      <p className="mt-0.5 text-2xl font-semibold tabular">{number(value)}</p>
    </div>
  );
}

function WorkspaceActions({ w }) {
  const active = w.status === "active";
  return (
    <div className="flex flex-wrap justify-end gap-1.5">
      {w.ownerId && (
        <ActionButton
          action={resetOwnerPassword.bind(null, w.ownerId)}
          confirm={`Give ${w.ownerName} (${w.ownerEmail}) a new temporary password? Their current password stops working.`}
          resultTitle="New temporary password"
        >
          <KeyRound size={13} /> Reset owner password
        </ActionButton>
      )}
      {active ? (
        <ActionButton
          variant="danger"
          action={setWorkspaceStatus.bind(null, w.id, "suspended")}
          confirm={`Suspend ${w.name}? Everyone in it is signed out and can't sign in until you reactivate it. Their data is kept.`}
        >
          <Pause size={13} /> Suspend
        </ActionButton>
      ) : (
        <ActionButton action={setWorkspaceStatus.bind(null, w.id, "active")} confirm={`Reactivate ${w.name}? Everyone in it can sign in again.`}>
          <Play size={13} /> Reactivate
        </ActionButton>
      )}
    </div>
  );
}

export default async function WorkspacesPage({ searchParams }) {
  const [me, workspaces, params] = await Promise.all([requirePlatformAdmin(), listWorkspaces(), searchParams]);
  const isAdmin = me.role === "admin";
  const active = workspaces.filter((w) => w.status === "active").length;

  return (
    <>
      {params?.password === "changed" && (
        <p role="status" className="mb-4 rounded-md border border-good/30 bg-good-bg px-3 py-2.5 text-sm text-good">
          Your password is changed. Other devices you were signed in on have been signed out.
        </p>
      )}
      <PageHeader title="Workspaces" description="Every company on Lasan Grow. Create a workspace, then send its owner the sign-in details.">
        <CreateWorkspace />
      </PageHeader>

      <div className="mb-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <Stat label="Workspaces" value={workspaces.length} />
        <Stat label="Active" value={active} />
        <Stat label="Suspended" value={workspaces.length - active} />
        <Stat label="People" value={workspaces.reduce((a, w) => a + w.people, 0)} />
      </div>

      <Card>
        {workspaces.length === 0 ? (
          <EmptyState icon={Building2} title="No workspaces yet" description="Create the first one with New workspace." />
        ) : (
          <>
            {/* Phones: one block per workspace so the actions aren't pushed off-screen. */}
            <ul className="divide-y divide-line md:hidden">
              {workspaces.map((w) => (
                <li key={w.id} className="space-y-2 px-4 py-3.5">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-semibold">{w.name}</span>
                    <Badge tone={w.status === "active" ? "good" : "bad"}>{w.status === "active" ? "Active" : "Suspended"}</Badge>
                  </div>
                  <p className="text-xs text-ink-3">
                    {w.ownerEmail ?? "No owner"} · {w.people} {w.people === 1 ? "person" : "people"} · {w.deals} deals
                  </p>
                  {isAdmin && <WorkspaceActions w={w} />}
                </li>
              ))}
            </ul>
            <div className="hidden md:block">
              <Table>
                <thead>
                  <tr>
                    <Th>Company</Th>
                    <Th>Owner</Th>
                    <Th>Status</Th>
                    <Th className="text-right">People</Th>
                    <Th className="text-right">Deals</Th>
                    <Th>Created</Th>
                    <Th>Last sign-in</Th>
                    {isAdmin && <Th className="text-right">Actions</Th>}
                  </tr>
                </thead>
                <tbody>
                  {workspaces.map((w) => (
                    <tr key={w.id} className="hover:bg-surface-2">
                      <Td>
                        <p className="font-semibold">{w.name}</p>
                        <p className="text-xs text-ink-3">{w.currency}</p>
                      </Td>
                      <Td>
                        {w.ownerEmail ? (
                          <>
                            <p>{w.ownerName}</p>
                            <p className="text-xs text-ink-3">{w.ownerEmail}</p>
                            {w.ownerPending && (
                              <Badge tone="warn" className="mt-1">
                                Temporary password
                              </Badge>
                            )}
                          </>
                        ) : (
                          <span className="text-ink-3">None</span>
                        )}
                      </Td>
                      <Td>
                        <Badge tone={w.status === "active" ? "good" : "bad"}>{w.status === "active" ? "Active" : "Suspended"}</Badge>
                      </Td>
                      <Td className="text-right tabular">{w.people}</Td>
                      <Td className="text-right tabular">{w.deals}</Td>
                      <Td>
                        <p>{shortDate(w.createdAt)}</p>
                        <p className="text-xs text-ink-3">{w.createdByName ? `by ${w.createdByName}` : "Self sign-up"}</p>
                      </Td>
                      <Td className="text-ink-2">{w.lastLoginAt ? relativeTime(w.lastLoginAt) : "Never"}</Td>
                      {isAdmin && (
                        <Td>
                          <WorkspaceActions w={w} />
                        </Td>
                      )}
                    </tr>
                  ))}
                </tbody>
              </Table>
            </div>
          </>
        )}
      </Card>
      {!isAdmin && <p className="mt-3 text-xs text-ink-3">Suspending workspaces and resetting owners&apos; passwords is for console admins.</p>}
    </>
  );
}
