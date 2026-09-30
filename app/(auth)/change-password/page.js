import { redirect } from "next/navigation";
import { requireUser } from "@/lib/auth";
import { ChangePasswordForm } from "../forms";

export const metadata = { title: "Choose your password" };

export default async function ChangePasswordPage() {
  const { user, org } = await requireUser({ allowPasswordChange: true });
  if (!user.mustChangePassword) redirect("/dashboard");
  return (
    <>
      <p className="text-sm font-semibold text-brand-ink">{org.name}</p>
      <h1 className="mt-1 text-2xl font-semibold">Choose your password</h1>
      <p className="mb-6 mt-1.5 text-sm text-ink-3">
        Welcome, {user.name.split(" ")[0]}. You signed in with a temporary password; replace it with one only you know.
      </p>
      <ChangePasswordForm />
    </>
  );
}
