"use client";

import Link from "next/link";
import { useActionState } from "react";
import { AlertCircle } from "lucide-react";
import { Field, Input, Select } from "@/components/ui";
import { SubmitButton } from "@/components/client";
import { login, signup } from "./actions";

function FormError({ message }) {
  if (!message) return null;
  return (
    <div role="alert" className="flex items-center gap-2 rounded-lg bg-bad-bg px-3 py-2.5 text-sm text-bad">
      <AlertCircle size={15} /> {message}
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
        <Input name="password" type="password" autoComplete="current-password" required placeholder="••••••••" />
      </Field>
      <SubmitButton size="lg" className="w-full" pendingText="Signing in…">
        Sign in
      </SubmitButton>
      <p className="text-center text-sm text-ink-3">
        New to Lasan Grow?{" "}
        <Link href="/signup" className="font-medium text-ink underline-offset-4 hover:underline">
          Create a workspace
        </Link>
      </p>
    </form>
  );
}

export function SignupForm() {
  const [state, action] = useActionState(signup, null);
  const v = state?.values ?? {};
  return (
    <form action={action} className="space-y-4">
      <FormError message={state?.error} />
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Your name">
          <Input name="name" required autoComplete="name" defaultValue={v.name} placeholder="Aaron Amit" />
        </Field>
        <Field label="Workspace">
          <Input name="company" required autoComplete="organization" defaultValue={v.company} placeholder="Acme Inc." />
        </Field>
      </div>
      <Field label="Work email">
        <Input name="email" type="email" required autoComplete="email" defaultValue={v.email} placeholder="you@company.com" />
      </Field>
      <div className="grid gap-4 sm:grid-cols-[1fr_120px]">
        <Field label="Password">
          <Input name="password" type="password" required minLength={8} autoComplete="new-password" placeholder="8+ characters" />
        </Field>
        <Field label="Currency">
          <Select name="currency" defaultValue={v.currency ?? "INR"}>
            {["INR", "USD", "EUR", "GBP", "AED"].map((c) => (
              <option key={c}>{c}</option>
            ))}
          </Select>
        </Field>
      </div>
      <label className="flex cursor-pointer items-start gap-3 rounded-xl border border-line bg-surface-2 p-3.5">
        <input type="checkbox" name="demo" defaultChecked className="mt-0.5 h-4 w-4 accent-[var(--ink)]" />
        <span>
          <span className="block text-sm font-medium">Fill my workspace with sample data</span>
          <span className="block text-xs text-ink-3">See charts and the pipeline come alive. You can clear it later.</span>
        </span>
      </label>
      <SubmitButton size="lg" className="w-full" pendingText="Building your workspace…">
        Create workspace
      </SubmitButton>
      <p className="text-center text-sm text-ink-3">
        Already have an account?{" "}
        <Link href="/login" className="font-medium text-ink underline-offset-4 hover:underline">
          Sign in
        </Link>
      </p>
    </form>
  );
}
