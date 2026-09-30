"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useActionState, useEffect, useRef, useState, useTransition } from "react";
import { AlertCircle, Building2, Check, ChevronDown, Copy, KeyRound, LogOut, Plus, UsersRound } from "lucide-react";
import { Button, Field, Input, Select, cx } from "@/components/ui";
import { Modal, SubmitButton } from "@/components/client";
import {
  addPlatformMember,
  changePlatformPassword,
  createWorkspace,
  platformLogin,
  platformLogout,
} from "./actions";

export function FormError({ message }) {
  if (!message) return null;
  return (
    <div role="alert" className="flex items-center gap-2 rounded-md border border-bad/30 bg-bad-bg px-3 py-2.5 text-sm text-bad">
      <AlertCircle size={15} className="shrink-0" /> {message}
    </div>
  );
}

// ---------- Chrome ----------

const TABS = [
  { href: "/platform", label: "Workspaces", icon: Building2 },
  { href: "/platform/team", label: "Lasan team", icon: UsersRound, adminOnly: true },
];

export function ConsoleNav({ isAdmin }) {
  const pathname = usePathname();
  return (
    <nav className="flex gap-1 border-b border-line">
      {TABS.filter((t) => isAdmin || !t.adminOnly).map(({ href, label, icon: Icon }) => {
        const active = pathname === href;
        return (
          <Link
            key={href}
            href={href}
            aria-current={active ? "page" : undefined}
            className={cx(
              "-mb-px inline-flex items-center gap-2 border-b-2 px-3 py-2.5 text-sm transition-colors",
              active ? "border-brand font-semibold text-brand-ink" : "border-transparent text-ink-2 hover:text-ink"
            )}
          >
            <Icon size={15} /> {label}
          </Link>
        );
      })}
    </nav>
  );
}

export function AccountMenu({ name, email, role }) {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);
  useEffect(() => {
    if (!open) return;
    const close = (e) => !ref.current?.contains(e.target) && setOpen(false);
    document.addEventListener("pointerdown", close);
    return () => document.removeEventListener("pointerdown", close);
  }, [open]);

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        aria-label={`Account: ${name}`}
        className="flex h-9 items-center gap-2 rounded-md px-2 text-sm text-suite-ink hover:bg-white/10"
      >
        <span className="hidden sm:inline">{name}</span>
        <ChevronDown size={14} className={cx("opacity-80 transition-transform", open && "rotate-180")} />
      </button>
      {open && (
        <div className="absolute right-0 z-50 mt-1.5 w-60 overflow-hidden rounded-md border border-line bg-surface text-ink shadow-pop">
          <div className="border-b border-line px-4 py-3">
            <p className="truncate text-sm font-semibold">{name}</p>
            <p className="truncate text-xs text-ink-3">{email}</p>
            <p className="mt-0.5 text-xs text-ink-3">Console {role === "admin" ? "admin" : "staff"}</p>
          </div>
          <Link href="/platform/password" onClick={() => setOpen(false)} className="flex items-center gap-2.5 px-4 py-2.5 text-sm hover:bg-surface-2">
            <KeyRound size={15} className="text-ink-3" /> Change password
          </Link>
          <form action={platformLogout} className="border-t border-line">
            <button type="submit" className="flex w-full items-center gap-2.5 px-4 py-2.5 text-left text-sm hover:bg-surface-2 hover:text-bad">
              <LogOut size={15} className="text-ink-3" /> Sign out
            </button>
          </form>
        </div>
      )}
    </div>
  );
}

// ---------- Credentials ----------

function CopyButton({ text, label = "Copy" }) {
  const [copied, setCopied] = useState(false);
  return (
    <Button
      type="button"
      variant="secondary"
      size="sm"
      onClick={async () => {
        try {
          await navigator.clipboard.writeText(text);
          setCopied(true);
          setTimeout(() => setCopied(false), 1500);
        } catch {
          // Clipboard blocked: the text is on screen to copy by hand.
        }
      }}
    >
      {copied ? <Check size={14} /> : <Copy size={14} />} {copied ? "Copied" : label}
    </Button>
  );
}

// Shown once, right after a workspace or account is created or a password reset: the password is
// never stored in readable form, so this is the only time anyone sees it.
export function CredentialsCard({ credentials, audience = "workspace" }) {
  const c = credentials;
  const lines = [
    c.workspace && `Workspace: ${c.workspace}`,
    c.signInUrl && `Sign in at: ${c.signInUrl}`,
    `Email: ${c.email}`,
    `Temporary password: ${c.password}`,
    "You'll be asked to choose your own password when you first sign in.",
  ].filter(Boolean);
  const rows = [
    c.workspace && ["Workspace", c.workspace],
    c.signInUrl && ["Sign-in page", c.signInUrl],
    ["Email", c.email],
    ["Temporary password", c.password],
  ].filter(Boolean);

  return (
    <div className="space-y-4">
      <dl className="divide-y divide-line overflow-hidden rounded-md border border-line">
        {rows.map(([k, v]) => (
          <div key={k} className="grid grid-cols-[9rem_1fr] gap-3 px-3.5 py-2.5 text-sm">
            <dt className="text-ink-3">{k}</dt>
            <dd className={cx("min-w-0 break-all", k === "Temporary password" && "font-mono font-semibold")}>{v}</dd>
          </div>
        ))}
      </dl>
      <p className="text-xs text-ink-3">
        Send these to {c.name} privately. This password is shown only now; {audience === "workspace" ? "they" : "the person"} must
        replace it at first sign-in.
      </p>
      <CopyButton text={lines.join("\n")} label="Copy all" />
    </div>
  );
}

// ---------- Workspaces ----------

export function CreateWorkspace() {
  const [open, setOpen] = useState(false);
  const [session, setSession] = useState(0);
  return (
    <>
      <Button
        onClick={() => {
          setSession((n) => n + 1);
          setOpen(true);
        }}
      >
        <Plus size={15} /> New workspace
      </Button>
      <Modal open={open} onClose={() => setOpen(false)} title="New workspace" description="For a company that has signed up with Lasan." wide>
        <CreateWorkspaceForm key={session} onDone={() => setOpen(false)} />
      </Modal>
    </>
  );
}

function CreateWorkspaceForm({ onDone }) {
  const [state, action] = useActionState(createWorkspace, null);
  if (state?.credentials) {
    return (
      <div className="space-y-5">
        <p className="rounded-md border border-good/30 bg-good-bg px-3 py-2.5 text-sm text-good">
          {state.credentials.workspace} is ready with {state.credentials.name} as its owner.
        </p>
        <CredentialsCard credentials={state.credentials} />
        <div className="flex justify-end border-t border-line pt-4">
          <Button onClick={onDone}>Done</Button>
        </div>
      </div>
    );
  }
  const v = state?.fields ?? {};
  return (
    <form action={action} className="space-y-4" autoComplete="off">
      <FormError message={state?.error} />
      <div className="grid gap-4 sm:grid-cols-[1fr_8rem]">
        <Field label="Company name">
          <Input name="company" required defaultValue={v.company} placeholder="Acme Industries Pvt. Ltd." />
        </Field>
        <Field label="Currency">
          <Select name="currency" defaultValue={v.currency ?? "INR"}>
            {["INR", "USD", "EUR", "GBP", "AED"].map((c) => (
              <option key={c}>{c}</option>
            ))}
          </Select>
        </Field>
      </div>
      <p className="border-t border-line pt-4 text-[13px] font-semibold">Workspace owner</p>
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Full name">
          <Input name="ownerName" required defaultValue={v.ownerName} />
        </Field>
        <Field label="Work email" hint="They sign in with this.">
          <Input name="ownerEmail" type="email" required defaultValue={v.ownerEmail} />
        </Field>
      </div>
      <Field label="Temporary password" hint="Leave blank to generate one. They replace it when they first sign in.">
        <Input name="password" type="text" autoComplete="off" spellCheck={false} className="font-mono" />
      </Field>
      <label className="flex cursor-pointer items-start gap-3 rounded-md border border-line bg-surface-2 p-3">
        <input type="checkbox" name="demo" defaultChecked={v.demo} className="mt-0.5 h-4 w-4 accent-[var(--brand)]" />
        <span>
          <span className="block text-sm font-semibold">Add sample data</span>
          <span className="block text-xs text-ink-3">For demos and trials. The owner can clear it from Settings before going live.</span>
        </span>
      </label>
      <div className="flex justify-end gap-2 border-t border-line pt-4">
        <Button type="button" variant="secondary" onClick={onDone}>
          Cancel
        </Button>
        <SubmitButton pendingText="Creating…">Create workspace</SubmitButton>
      </div>
    </form>
  );
}

/**
 * A button that runs a server action after an optional confirmation, and shows any error or
 * returned credentials in a dialog.
 */
export function ActionButton({ action, confirm, variant = "secondary", resultTitle, children }) {
  const [pending, start] = useTransition();
  const [result, setResult] = useState(null);
  return (
    <>
      <Button
        type="button"
        variant={variant}
        size="sm"
        disabled={pending}
        onClick={() => {
          if (confirm && !window.confirm(confirm)) return;
          start(async () => {
            const res = await action();
            if (res?.error || res?.credentials) setResult(res);
          });
        }}
      >
        {children}
      </Button>
      <Modal open={!!result} onClose={() => setResult(null)} title={result?.error ? "Couldn't do that" : resultTitle}>
        {result?.error ? <FormError message={result.error} /> : result?.credentials && <CredentialsCard credentials={result.credentials} />}
        <div className="mt-5 flex justify-end">
          <Button onClick={() => setResult(null)}>Done</Button>
        </div>
      </Modal>
    </>
  );
}

// ---------- Lasan team ----------

export function AddMember() {
  const [open, setOpen] = useState(false);
  const [session, setSession] = useState(0);
  return (
    <>
      <Button
        onClick={() => {
          setSession((n) => n + 1);
          setOpen(true);
        }}
      >
        <Plus size={15} /> Add person
      </Button>
      <Modal open={open} onClose={() => setOpen(false)} title="Add a Lasan team member" description="They get a temporary password to replace at first sign-in.">
        <AddMemberForm key={session} onDone={() => setOpen(false)} />
      </Modal>
    </>
  );
}

function AddMemberForm({ onDone }) {
  const [state, action] = useActionState(addPlatformMember, null);
  if (state?.credentials) {
    return (
      <div className="space-y-5">
        <CredentialsCard credentials={state.credentials} audience="team" />
        <div className="flex justify-end border-t border-line pt-4">
          <Button onClick={onDone}>Done</Button>
        </div>
      </div>
    );
  }
  const v = state?.fields ?? {};
  return (
    <form action={action} className="space-y-4" autoComplete="off">
      <FormError message={state?.error} />
      <Field label="Full name">
        <Input name="name" required defaultValue={v.name} />
      </Field>
      <Field label="Email">
        <Input name="email" type="email" required defaultValue={v.email} />
      </Field>
      <Field label="Role" hint="Staff create and view workspaces. Admins can also suspend workspaces, reset owners' passwords and manage this team.">
        <Select name="role" defaultValue={v.role ?? "staff"}>
          <option value="staff">Staff</option>
          <option value="admin">Admin</option>
        </Select>
      </Field>
      <div className="flex justify-end gap-2 border-t border-line pt-4">
        <Button type="button" variant="secondary" onClick={onDone}>
          Cancel
        </Button>
        <SubmitButton pendingText="Adding…">Add person</SubmitButton>
      </div>
    </form>
  );
}

// ---------- Sign in and password ----------

export function PlatformLoginForm() {
  const [state, action] = useActionState(platformLogin, null);
  return (
    <form action={action} className="space-y-4">
      <FormError message={state?.error} />
      <Field label="Email">
        <Input name="email" type="email" autoComplete="username" required defaultValue={state?.fields?.email} />
      </Field>
      <Field label="Password">
        <Input name="password" type="password" autoComplete="current-password" required />
      </Field>
      <SubmitButton size="lg" className="w-full" pendingText="Signing in…">
        Sign in
      </SubmitButton>
      <p className="border-t border-line pt-4 text-center text-xs text-ink-3">Forgot your password? Ask a console admin to reset it.</p>
    </form>
  );
}

export function PlatformPasswordForm({ forced }) {
  const [state, action] = useActionState(changePlatformPassword, null);
  return (
    <form action={action} className="space-y-4">
      <FormError message={state?.error} />
      <Field label={forced ? "Temporary password" : "Current password"}>
        <Input name="current" type="password" autoComplete="current-password" required />
      </Field>
      <Field label="New password" hint="At least 8 characters, with a letter and a number.">
        <Input name="next" type="password" autoComplete="new-password" required minLength={8} />
      </Field>
      <Field label="Confirm new password">
        <Input name="confirm" type="password" autoComplete="new-password" required minLength={8} />
      </Field>
      <SubmitButton pendingText="Saving…">Save password</SubmitButton>
      {!forced && <p className="text-xs text-ink-3">Other devices you&apos;re signed in on will be signed out.</p>}
    </form>
  );
}
