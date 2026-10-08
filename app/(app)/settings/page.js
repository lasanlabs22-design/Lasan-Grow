import Link from "next/link";
import { asc, eq, sql } from "drizzle-orm";
import { ArrowRight } from "lucide-react";
import { requireUser } from "@/lib/auth";
import { tenantDb, schema } from "@/lib/db";
import { PageHeader } from "@/components/ui";
import {
  AppearancePicker,
  ClearDataForm,
  PasswordForm,
  PhotoUploader,
  ProfileForm,
  SettingsSection,
  StageEditor,
  WorkspaceForm,
} from "./settings-client";

export const metadata = { title: "Settings" };

const { stages, deals } = schema;

export default async function SettingsPage() {
  const { user, org } = await requireUser();
  const db = await tenantDb(org.id);
  const isAdmin = ["owner", "admin"].includes(user.role);

  const stageRows = await db
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
    .orderBy(asc(stages.position));

  return (
    <div className="mx-auto max-w-4xl">
      <PageHeader title="Settings" description="Your profile, workspace and pipeline.">
        <Link href="/team" className="inline-flex items-center gap-1.5 text-sm font-semibold text-brand hover:underline">
          Manage your team <ArrowRight size={14} />
        </Link>
      </PageHeader>
      <div className="space-y-5">
        <SettingsSection id="profile" title="Profile" description="Your photo and name, as your team sees them.">
          <PhotoUploader name={user.name} photo={user.photo} />
          <ProfileForm name={user.name} email={user.email} />
        </SettingsSection>
        <SettingsSection title="Password" description="At least 8 characters, with a letter and a number. Changing it signs out your other devices.">
          <PasswordForm />
        </SettingsSection>
        <SettingsSection title="Appearance" description="White, black, or match your device. Remembered on this browser.">
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
        {user.role === "owner" && (
          <SettingsSection title="Danger zone" description="Remove every lead, contact, company, deal and activity. Stages and team stay." danger>
            <ClearDataForm orgName={org.name} />
          </SettingsSection>
        )}
      </div>
    </div>
  );
}
