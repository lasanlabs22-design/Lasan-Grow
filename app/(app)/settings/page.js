import { asc, eq, sql } from "drizzle-orm";
import { requireUser } from "@/lib/auth";
import { getDb, schema } from "@/lib/db";
import { PageHeader } from "@/components/ui";
import {
  AppearancePicker,
  ClearDataForm,
  PasswordForm,
  ProfileForm,
  SettingsSection,
  StageEditor,
  TeamManager,
  WorkspaceForm,
} from "./settings-client";

export const metadata = { title: "Settings" };

const { stages, deals, users } = schema;

export default async function SettingsPage() {
  const { user, org } = await requireUser();
  const db = await getDb();
  const isAdmin = ["owner", "admin"].includes(user.role);

  const [stageRows, team] = await Promise.all([
    db
      .select({
        id: stages.id,
        name: stages.name,
        probability: stages.probability,
        kind: stages.kind,
        position: stages.position,
        // Outer row referenced explicitly: Drizzle drops table prefixes on single-table selects.
        deals: sql`(select count(*) from ${deals} where ${deals.stageId} = ${sql.raw(`"stages"."id"`)})`.mapWith(Number),
      })
      .from(stages)
      .where(eq(stages.orgId, org.id))
      .orderBy(asc(stages.position)),
    db
      .select({ id: users.id, name: users.name, email: users.email, role: users.role, createdAt: users.createdAt })
      .from(users)
      .where(eq(users.orgId, org.id))
      .orderBy(asc(users.createdAt)),
  ]);

  return (
    <div className="mx-auto max-w-4xl">
      <PageHeader title="Settings" description="Your profile, workspace, pipeline and team." />
      <div className="space-y-5">
        <SettingsSection title="Profile" description="How you appear to your team.">
          <ProfileForm name={user.name} email={user.email} />
        </SettingsSection>
        <SettingsSection title="Password" description="Use 8 or more characters.">
          <PasswordForm />
        </SettingsSection>
        <SettingsSection title="Appearance" description="Light, dark, or follow your system.">
          <AppearancePicker />
        </SettingsSection>
        <SettingsSection title="Workspace" description="Name and the currency used for every deal and chart.">
          <WorkspaceForm name={org.name} currency={org.currency} disabled={!isAdmin} />
        </SettingsSection>
        <SettingsSection
          title="Pipeline stages"
          description="Rename stages, set win probability (drives the weighted forecast), reorder or add new ones."
        >
          <StageEditor stages={stageRows} disabled={!isAdmin} />
        </SettingsSection>
        <SettingsSection title="Team" description="Everyone here shares this workspace's data.">
          <TeamManager team={team} currentUserId={user.id} canManage={isAdmin} />
        </SettingsSection>
        {user.role === "owner" && (
          <SettingsSection title="Danger zone" description="Remove every lead, contact, company, deal and activity. Stages and team stay." danger>
            <ClearDataForm orgName={org.name} />
          </SettingsSection>
        )}
      </div>
    </div>
  );
}
