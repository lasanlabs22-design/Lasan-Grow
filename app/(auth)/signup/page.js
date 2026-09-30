import { SignupForm } from "../forms";

export const metadata = { title: "Create your workspace" };

export default function SignupPage() {
  return (
    <>
      <h1 className="text-2xl font-semibold">Start growing</h1>
      <p className="mb-6 mt-1.5 text-sm text-ink-3">Your workspace is ready in under a minute.</p>
      <SignupForm />
    </>
  );
}
