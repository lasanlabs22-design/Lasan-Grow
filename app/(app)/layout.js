import { requireUser } from "@/lib/auth";
import { Shell } from "./shell";

export default async function AppLayout({ children }) {
  const { user, org } = await requireUser();
  return (
    <Shell user={{ name: user.name, email: user.email, role: user.role }} orgName={org.name}>
      {children}
    </Shell>
  );
}
