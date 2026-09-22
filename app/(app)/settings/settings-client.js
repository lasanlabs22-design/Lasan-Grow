"use client";

import { useActionState, useState, useSyncExternalStore, useTransition } from "react";
import { useRouter } from "next/navigation";
import { useTheme } from "next-themes";
import { AlertCircle, ArrowDown, ArrowUp, CheckCircle2, Monitor, Moon, Sun, Trash2, UserPlus } from "lucide-react";
import { Avatar, Badge, Button, Card, Field, Input, Select, cx } from "@/components/ui";
import { Modal, SubmitButton } from "@/components/client";
import {
  addTeammate,
  changePassword,
  clearWorkspaceData,
  deleteStage,
  moveStage,
  removeTeammate,
  saveStage,
  updateProfile,
  updateWorkspace,
} from "./actions";

export function SettingsSection({ title, description, danger, children }) {
  return (
    <Card className={cx("grid gap-5 p-6 md:grid-cols-[240px_1fr]", danger && "border-bad/30")}>
      <div>
        <h2 className={cx("font-semibold", danger && "text-bad")}>{title}</h2>
        <p className="mt-1 text-sm text-ink-3">{description}</p>
      </div>
      <div className="min-w-0">{children}</div>
    </Card>
  );
}

function Status({ state }) {
  if (!state) return null;
  return state.error ? (
    <p role="alert" className="flex items-center gap-1.5 text-sm text-bad">
      <AlertCircle size={14} /> {state.error}
    </p>
  ) : (
    <p role="status" className="flex items-center gap-1.5 text-sm text-good">
      <CheckCircle2 size={14} /> {state.message}
    </p>
  );
}

export function ProfileForm({ name, email }) {
  const [state, action] = useActionState(updateProfile, null);
  return (
    <form action={action} className="space-y-4">
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Name">
          <Input name="name" defaultValue={name} required />
        </Field>
        <Field label="Email" hint="Used to sign in. Contact an owner to change it.">
          <Input value={email} disabled className="opacity-70" readOnly />
        </Field>
      </div>
      <div className="flex items-center justify-between gap-3">
        <Status state={state} />
        <SubmitButton size="sm" className="ml-auto" pendingText="Saving…">
          Save profile
        </SubmitButton>
      </div>
    </form>
  );
}

export function PasswordForm() {
  const [state, action] = useActionState(changePassword, null);
  return (
    <form action={action} className="space-y-4" key={state?.ok ? state.at : "pw"}>
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Current password">
          <Input name="current" type="password" autoComplete="current-password" required />
        </Field>
        <Field label="New password">
          <Input name="next" type="password" autoComplete="new-password" minLength={8} required />
        </Field>
      </div>
      <div className="flex items-center justify-between gap-3">
        <Status state={state} />
        <SubmitButton size="sm" className="ml-auto" pendingText="Updating…">
          Change password
        </SubmitButton>
      </div>
    </form>
  );
}

const noop = () => () => {};

export function AppearancePicker() {
  const { theme, setTheme } = useTheme();
  const mounted = useSyncExternalStore(noop, () => true, () => false);
  const options = [
    ["light", "Light", Sun],
    ["dark", "Dark", Moon],
    ["system", "System", Monitor],
  ];
  return (
    <div className="grid grid-cols-3 gap-3">
      {options.map(([value, label, Icon]) => {
        const active = mounted && theme === value;
        return (
          <button
            key={value}
            type="button"
            onClick={() => setTheme(value)}
            aria-pressed={active}
            className={cx(
              "flex flex-col items-center gap-2 rounded-xl border p-4 text-sm transition-all",
              active ? "border-ink bg-surface-2 font-medium" : "border-line hover:border-line-strong"
            )}
          >
            <span
              className={cx(
                "flex h-14 w-full items-end gap-1 rounded-lg border border-line p-2",
                value === "dark" ? "bg-[#0a0a0a]" : value === "light" ? "bg-[#f7f7f5]" : "bg-gradient-to-r from-[#f7f7f5] from-50% to-[#0a0a0a] to-50%"
              )}
              aria-hidden
            >
              <span className="h-4 w-1/3 rounded bg-[#3987e5]" />
              <span className="h-7 w-1/3 rounded bg-[#86b6ef]" />
            </span>
            <span className="flex items-center gap-1.5">
              <Icon size={14} /> {label}
            </span>
          </button>
        );
      })}
    </div>
  );
}

export function WorkspaceForm({ name, currency, disabled }) {
  const [state, action] = useActionState(updateWorkspace, null);
  return (
    <form action={action} className="space-y-4">
      <fieldset disabled={disabled} className="grid gap-4 sm:grid-cols-[1fr_160px]">
        <Field label="Workspace name">
          <Input name="name" defaultValue={name} required />
        </Field>
        <Field label="Currency">
          <Select name="currency" defaultValue={currency}>
            {["INR", "USD", "EUR", "GBP", "AED"].map((c) => (
              <option key={c}>{c}</option>
            ))}
          </Select>
        </Field>
      </fieldset>
      <div className="flex items-center justify-between gap-3">
        {disabled ? <p className="text-sm text-ink-3">Only admins can change workspace settings.</p> : <Status state={state} />}
        {!disabled && (
          <SubmitButton size="sm" className="ml-auto" pendingText="Saving…">
            Save workspace
          </SubmitButton>
        )}
      </div>
    </form>
  );
}

function StageRow({ stage, first, last, disabled, onMove, onDelete }) {
  const [state, action] = useActionState(saveStage, null);
  const [dirty, setDirty] = useState(false);
  const closed = stage.kind !== "open";
  return (
    <li className="flex flex-wrap items-center gap-2 py-2.5">
      {closed ? (
        <div className="flex flex-1 items-center gap-2 px-1 text-sm">
          <Badge tone={stage.kind === "won" ? "good" : "bad"}>{stage.name}</Badge>
          <span className="text-xs text-ink-3">{stage.deals} deals · fixed stage</span>
        </div>
      ) : (
        <form action={action} onChange={() => setDirty(true)} onSubmit={() => setDirty(false)} className="flex flex-1 flex-wrap items-center gap-2">
          <input type="hidden" name="id" value={stage.id} />
          <Input name="name" defaultValue={stage.name} disabled={disabled} className="h-9 min-w-40 flex-1" aria-label="Stage name" />
          <div className="relative w-24">
            <Input
              name="probability"
              type="number"
              min={0}
              max={100}
              defaultValue={stage.probability}
              disabled={disabled}
              className="h-9 pr-7"
              aria-label="Win probability"
            />
            <span className="absolute right-3 top-1/2 -translate-y-1/2 text-sm text-ink-3">%</span>
          </div>
          <span className="w-16 text-xs text-ink-3">
            {stage.deals} {stage.deals === 1 ? "deal" : "deals"}
          </span>
          {dirty && !disabled && (
            <SubmitButton size="sm" pendingText="…">
              Save
            </SubmitButton>
          )}
          {state?.error && <span className="text-xs text-bad">{state.error}</span>}
        </form>
      )}
      {!closed && !disabled && (
        <div className="flex items-center gap-0.5">
          <Button type="button" variant="ghost" size="icon" disabled={first} onClick={() => onMove(stage.id, "up")} aria-label={`Move ${stage.name} up`}>
            <ArrowUp size={14} />
          </Button>
          <Button type="button" variant="ghost" size="icon" disabled={last} onClick={() => onMove(stage.id, "down")} aria-label={`Move ${stage.name} down`}>
            <ArrowDown size={14} />
          </Button>
          <Button type="button" variant="ghost" size="icon" className="hover:text-bad" onClick={() => onDelete(stage)} aria-label={`Delete ${stage.name}`}>
            <Trash2 size={14} />
          </Button>
        </div>
      )}
    </li>
  );
}

export function StageEditor({ stages, disabled }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState(null);
  const [addState, addAction] = useActionState(saveStage, null);
  const open = stages.filter((s) => s.kind === "open");

  const onMove = (id, dir) =>
    startTransition(async () => {
      await moveStage(id, dir);
      router.refresh();
    });
  const onDelete = (stage) =>
    startTransition(async () => {
      const res = await deleteStage(stage.id);
      setError(res?.error ?? null);
      router.refresh();
    });

  return (
    <div className={cx(pending && "opacity-70")}>
      <ul className="divide-y divide-line">
        {stages.map((s) => {
          const i = open.findIndex((o) => o.id === s.id);
          return (
            <StageRow
              key={`${s.id}-${s.position}-${s.name}-${s.probability}`}
              stage={s}
              first={i === 0}
              last={i === open.length - 1}
              disabled={disabled}
              onMove={onMove}
              onDelete={onDelete}
            />
          );
        })}
      </ul>
      {error && (
        <p role="alert" className="mt-2 flex items-center gap-1.5 text-sm text-bad">
          <AlertCircle size={14} /> {error}
        </p>
      )}
      {!disabled && (
        <form action={addAction} key={addState?.at ?? "add"} className="mt-3 flex flex-wrap items-center gap-2 border-t border-line pt-4">
          <Input name="name" placeholder="New stage name" className="h-9 min-w-40 flex-1" required />
          <div className="relative w-24">
            <Input name="probability" type="number" min={0} max={100} defaultValue={50} className="h-9 pr-7" aria-label="Win probability" />
            <span className="absolute right-3 top-1/2 -translate-y-1/2 text-sm text-ink-3">%</span>
          </div>
          <SubmitButton size="sm" variant="secondary" pendingText="Adding…">
            Add stage
          </SubmitButton>
          {addState?.error && <span className="w-full text-xs text-bad">{addState.error}</span>}
        </form>
      )}
    </div>
  );
}

function TeammateForm({ onDone }) {
  const [state, action] = useActionState(async (prev, fd) => {
    const res = await addTeammate(prev, fd);
    if (res.ok) onDone();
    return res;
  }, null);
  return (
    <form action={action} className="space-y-4">
      {state?.error && <Status state={state} />}
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Name">
          <Input name="name" required />
        </Field>
        <Field label="Email">
          <Input name="email" type="email" required />
        </Field>
        <Field label="Temporary password" hint="Share it with them privately; they can change it in Settings.">
          <Input name="password" type="text" minLength={8} required />
        </Field>
        <Field label="Role">
          <Select name="role" defaultValue="member">
            <option value="member">Member</option>
            <option value="admin">Admin</option>
          </Select>
        </Field>
      </div>
      <div className="flex justify-end gap-2">
        <Button type="button" variant="ghost" onClick={onDone}>
          Cancel
        </Button>
        <SubmitButton pendingText="Adding…">Add teammate</SubmitButton>
      </div>
    </form>
  );
}

export function TeamManager({ team, currentUserId, canManage }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [, startTransition] = useTransition();
  return (
    <div>
      <ul className="divide-y divide-line">
        {team.map((m) => (
          <li key={m.id} className="flex items-center gap-3 py-3">
            <Avatar name={m.name} size={34} />
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-medium">
                {m.name} {m.id === currentUserId && <span className="font-normal text-ink-3">(you)</span>}
              </p>
              <p className="truncate text-xs text-ink-3">{m.email}</p>
            </div>
            <Badge tone={m.role === "owner" ? "ink" : "outline"} className="capitalize">
              {m.role}
            </Badge>
            {canManage && m.role !== "owner" && m.id !== currentUserId && (
              <Button
                variant="ghost"
                size="icon"
                className="hover:text-bad"
                aria-label={`Remove ${m.name}`}
                onClick={() =>
                  startTransition(async () => {
                    await removeTeammate(m.id);
                    router.refresh();
                  })
                }
              >
                <Trash2 size={14} />
              </Button>
            )}
          </li>
        ))}
      </ul>
      {canManage && (
        <>
          <Button variant="secondary" size="sm" className="mt-3" onClick={() => setOpen(true)}>
            <UserPlus size={14} /> Add teammate
          </Button>
          <Modal open={open} onClose={() => setOpen(false)} title="Add a teammate" description="They'll share this workspace's leads, deals and contacts." wide>
            {() => (
              <TeammateForm
                onDone={() => {
                  setOpen(false);
                  router.refresh();
                }}
              />
            )}
          </Modal>
        </>
      )}
    </div>
  );
}

export function ClearDataForm({ orgName }) {
  const [open, setOpen] = useState(false);
  const [state, action] = useActionState(clearWorkspaceData, null);
  return (
    <div className="space-y-3">
      {state?.ok && <Status state={state} />}
      <Button variant="danger" onClick={() => setOpen(true)}>
        <Trash2 size={15} /> Clear all records
      </Button>
      <Modal open={open && !state?.ok} onClose={() => setOpen(false)} title="Clear every record?" description="This permanently deletes all leads, contacts, companies, deals and activities in this workspace.">
        {(close) => (
          <form action={action} className="space-y-4">
            <Field label={`Type "${orgName}" to confirm`}>
              <Input name="confirm" autoComplete="off" required />
            </Field>
            {state?.error && <Status state={state} />}
            <div className="flex justify-end gap-2">
              <Button type="button" variant="ghost" onClick={close}>
                Cancel
              </Button>
              <SubmitButton variant="danger" pendingText="Clearing…">
                Delete everything
              </SubmitButton>
            </div>
          </form>
        )}
      </Modal>
    </div>
  );
}
