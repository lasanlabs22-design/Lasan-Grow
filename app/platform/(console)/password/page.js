import { requirePlatformAdmin } from "@/lib/platform";
import { Card, PageHeader } from "@/components/ui";
import { PlatformPasswordForm } from "../../client";

export const metadata = { title: "Password · Platform console" };

export default async function PlatformPasswordPage() {
  const admin = await requirePlatformAdmin({ allowPasswordChange: true });
  const forced = admin.mustChangePassword;
  return (
    <>
      <PageHeader
        title={forced ? "Choose your password" : "Change password"}
        description={forced ? `Welcome, ${admin.name.split(" ")[0]}. Replace the temporary password you were given before you continue.` : "For your console account."}
      />
      <Card className="max-w-md p-5">
        <PlatformPasswordForm forced={forced} />
      </Card>
    </>
  );
}
