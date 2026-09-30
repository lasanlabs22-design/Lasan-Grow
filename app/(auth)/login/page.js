import { LoginForm } from "../forms";

export const metadata = { title: "Sign in" };

export default function LoginPage() {
  return (
    <>
      <h1 className="text-2xl font-semibold">Sign in</h1>
      <p className="mb-6 mt-1.5 text-sm text-ink-3">Use your work email and password.</p>
      <LoginForm />
    </>
  );
}
