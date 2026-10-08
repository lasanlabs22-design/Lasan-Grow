"use client";

import { useActionState, useEffect, useState, useSyncExternalStore, useTransition } from "react";
import { useRouter } from "next/navigation";
import { AlertCircle, CheckCircle2, ShieldCheck, Trash2, UserPlus, UserRound } from "lucide-react";
import { Button, Field, Input, Select } from "@/components/ui";
import { Modal, SubmitButton } from "@/components/client";
import { addTeammate, removeTeammate, setTeammateRole } from "./actions";

// One status line above the table, shared by the add button and every row's actions.
let notice = null;
const listeners = new Set();
const setNotice = (next) => {
  notice = next;
  listeners.forEach((l) => l());
};
const subscribe = (l) => (listeners.add(l), () => listeners.delete(l));

export function TeamNotice() {
  const current = useSyncExternalStore(subscribe, () => notice, () => null);
  // Don't greet the next visit to the page with an old message.
  useEffect(() => () => void (notice = null), []);
  if (!current) return null;
  return (
    <p role={current.error ? "alert" : "status"} className={`mb-3 flex items-center gap-1.5 text-sm ${current.error ? "text-bad" : "text-good"}`}>
      {current.error ? <AlertCircle size={14} /> : <CheckCircle2 size={14} />} {current.error ?? current.message}
    </p>
  );
}

function TeammateForm({ onDone, onCancel }) {
  const [state, action] = useActionState(async (prev, fd) => {
    const res = await addTeammate(prev, fd);
    if (res.ok) onDone(res.message);
    return res;
  }, null);
  return (
    <form action={action} className="space-y-4">
      {state?.error && (
        <p role="alert" className="flex items-center gap-1.5 text-sm text-bad">
          <AlertCircle size={14} /> {state.error}
        </p>
      )}
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Name">
          <Input name="name" required />
        </Field>
        <Field label="Email">
          <Input name="email" type="email" required />
        </Field>
        <Field label="Temporary password" hint="8+ characters with a letter and a number. Share it privately; they choose their own when they first sign in.">
          <Input name="password" type="text" minLength={8} required />
        </Field>
        <Field label="Role" hint="Admins can manage the team, pipeline and workspace settings.">
          <Select name="role" defaultValue="member">
            <option value="member">Member</option>
            <option value="admin">Admin</option>
          </Select>
        </Field>
      </div>
      <div className="flex justify-end gap-2">
        <Button type="button" variant="ghost" onClick={onCancel}>
          Cancel
        </Button>
        <SubmitButton pendingText="Adding…">Add teammate</SubmitButton>
      </div>
    </form>
  );
}

export function AddTeammate() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  return (
    <>
      <Button onClick={() => setOpen(true)}>
        <UserPlus size={15} /> Add teammate
      </Button>
      <Modal open={open} onClose={() => setOpen(false)} title="Add a teammate" description="They'll share this workspace's leads, deals and contacts." wide>
        {() => (
          <TeammateForm
            onCancel={() => setOpen(false)}
            onDone={(message) => {
              setOpen(false);
              setNotice({ message });
              router.refresh();
            }}
          />
        )}
      </Modal>
    </>
  );
}

export function MemberActions({ id, name, role }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const run = (confirmText, action, message) => {
    if (!window.confirm(confirmText)) return;
    start(async () => {
      const res = await action();
      setNotice(res?.error ? { error: res.error } : { message });
      router.refresh();
    });
  };
  const nextRole = role === "admin" ? "member" : "admin";
  return (
    <div className="flex flex-wrap justify-end gap-1.5">
      <Button
        variant="secondary"
        size="sm"
        disabled={pending}
        onClick={() =>
          run(
            role === "admin" ? `Make ${name} a member? They can no longer manage the team or settings.` : `Make ${name} an admin? They can manage the team, pipeline and settings.`,
            () => setTeammateRole(id, nextRole),
            `${name} is now ${nextRole === "admin" ? "an admin" : "a member"}.`
          )
        }
      >
        {role === "admin" ? <UserRound size={13} /> : <ShieldCheck size={13} />}
        {role === "admin" ? "Make member" : "Make admin"}
      </Button>
      <Button
        variant="ghost"
        size="icon"
        className="hover:text-bad"
        aria-label={`Remove ${name}`}
        disabled={pending}
        onClick={() => run(`Remove ${name}? They lose access to this workspace straight away.`, () => removeTeammate(id), `${name} was removed.`)}
      >
        <Trash2 size={14} />
      </Button>
    </div>
  );
}
