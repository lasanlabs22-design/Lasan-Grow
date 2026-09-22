import { SignupForm } from "../forms";

export const metadata = { title: "Create your workspace" };

export default function SignupPage() {
  return (
    <>
      <h1 className="font-display text-3xl font-semibold tracking-tight">Start growing</h1>
      <p className="mb-8 mt-2 text-sm text-ink-3">Your workspace is ready in under a minute.</p>
      <SignupForm />
    </>
  );
}
