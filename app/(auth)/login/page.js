import { LoginForm } from "../forms";

export const metadata = { title: "Sign in" };

export default async function LoginPage({ searchParams }) {
  const { ended } = await searchParams;
  return (
    <>
      <h1 className="text-2xl font-semibold">Sign in</h1>
      <p className="mb-6 mt-1.5 text-sm text-ink-3">Use your work email and password.</p>
      {ended && (
        <p role="status" className="mb-4 rounded-md border border-line bg-surface-2 px-3 py-2.5 text-sm text-ink-2">
          You&apos;ve been signed out. If your workspace was suspended, contact your administrator.
        </p>
      )}
      <LoginForm />
    </>
  );
}
