"use client";

import { useActionState } from "react";
import { AlertCircle } from "lucide-react";
import { Field, Input } from "@/components/ui";
import { SubmitButton } from "@/components/client";
import { login, setOwnPassword } from "./actions";

// The Terms and Privacy Policy live on the public website.
const LEGAL_SITE = "https://lasangrow.com";

function FormError({ message }) {
  if (!message) return null;
  return (
    <div role="alert" className="flex items-center gap-2 rounded-md border border-bad/30 bg-bad-bg px-3 py-2.5 text-sm text-bad">
      <AlertCircle size={15} className="shrink-0" /> {message}
    </div>
  );
}

export function LoginForm() {
  const [state, action] = useActionState(login, null);
  return (
    <form action={action} className="space-y-4">
      <FormError message={state?.error} />
      <Field label="Work email">
        <Input name="email" type="email" autoComplete="email" required defaultValue={state?.values?.email} placeholder="you@company.com" />
      </Field>
      <Field label="Password">
        <Input name="password" type="password" autoComplete="current-password" required />
      </Field>
      <SubmitButton size="lg" className="w-full" pendingText="Signing in…">
        Sign in
      </SubmitButton>
      <p className="text-center text-xs leading-relaxed text-ink-3">
        By signing in, you agree to the{" "}
        <a href={`${LEGAL_SITE}/terms`} className="font-semibold text-brand-ink underline-offset-2 hover:underline">
          Terms of Service
        </a>{" "}
        and{" "}
        <a href={`${LEGAL_SITE}/privacy`} className="font-semibold text-brand-ink underline-offset-2 hover:underline">
          Privacy Policy
        </a>
        .
      </p>
      <p className="border-t border-line pt-4 text-center text-xs leading-relaxed text-ink-3">
        Accounts are set up by your workspace administrator. Forgot your password or need access? Ask your
        administrator.
      </p>
    </form>
  );
}

export function ChangePasswordForm() {
  const [state, action] = useActionState(setOwnPassword, null);
  return (
    <form action={action} className="space-y-4">
      <FormError message={state?.error} />
      <Field label="Temporary password" hint="The one you just signed in with.">
        <Input name="current" type="password" autoComplete="current-password" required />
      </Field>
      <Field label="New password" hint="At least 8 characters, with a letter and a number.">
        <Input name="next" type="password" autoComplete="new-password" required minLength={8} />
      </Field>
      <Field label="Confirm new password">
        <Input name="confirm" type="password" autoComplete="new-password" required minLength={8} />
      </Field>
      <SubmitButton size="lg" className="w-full" pendingText="Saving…">
        Save and continue
      </SubmitButton>
    </form>
  );
}
