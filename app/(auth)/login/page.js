import { LoginForm } from "../forms";

export const metadata = { title: "Sign in" };

export default function LoginPage() {
  return (
    <>
      <h1 className="font-display text-3xl font-semibold tracking-tight">Welcome back</h1>
      <p className="mb-8 mt-2 text-sm text-ink-3">Sign in to pick up where your pipeline left off.</p>
      <LoginForm />
    </>
  );
}
