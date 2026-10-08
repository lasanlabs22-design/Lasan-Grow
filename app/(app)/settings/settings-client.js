"use client";

import { useActionState, useRef, useState, useSyncExternalStore, useTransition } from "react";
import { useRouter } from "next/navigation";
import { useTheme } from "next-themes";
import { AlertCircle, ArrowDown, ArrowUp, Camera, CheckCircle2, Loader2, Monitor, Moon, Sun, Trash2 } from "lucide-react";
import { Avatar, Badge, Button, Card, Field, Input, Select, cx } from "@/components/ui";
import { Modal, SubmitButton } from "@/components/client";
import { PhotoCropper, toPhotoDataUrl } from "@/components/photo-cropper";
import {
  changePassword,
  clearWorkspaceData,
  deleteStage,
  moveStage,
  saveProfilePhoto,
  saveStage,
  updateProfile,
  updateWorkspace,
} from "./actions";

export function SettingsSection({ id, title, description, danger, children }) {
  return (
    <Card id={id} className={cx("grid scroll-mt-16 gap-5 p-6 md:grid-cols-[240px_1fr]", danger && "border-bad/30")}>
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

export function PhotoUploader({ name, photo }) {
  const input = useRef(null);
  const router = useRouter();
  const [pending, start] = useTransition();
  const [error, setError] = useState(null);
  const [preview, setPreview] = useState(null);
  // The photo just picked, waiting to be positioned in the cropper.
  const [picked, setPicked] = useState(null);

  const choose = (file) => {
    setError(null);
    if (input.current) input.current.value = ""; // so picking the same file again still opens the cropper
    if (!file) return;
    if (!/^image\/(png|jpe?g|webp)$/.test(file.type)) return setError("Use a PNG, JPG or WEBP image.");
    if (file.size > 10 * 1024 * 1024) return setError("Pick an image under 10 MB.");
    setPicked(file);
  };

  const save = (bitmap, rect) => {
    let dataUrl;
    try {
      dataUrl = toPhotoDataUrl(bitmap, rect);
    } catch (e) {
      setPicked(null);
      return setError(e.message);
    }
    start(async () => {
      setPreview(dataUrl);
      const res = await saveProfilePhoto(dataUrl);
      setPicked(null);
      if (res.error) {
        setPreview(null);
        setError(res.error);
      } else router.refresh(); // the suite bar and Team page pick up the new photo
    });
  };

  const remove = () =>
    start(async () => {
      const res = await saveProfilePhoto(null);
      if (res.error) return setError(res.error);
      setPreview(null);
      router.refresh();
    });

  const shown = preview ?? photo;
  return (
    <div className="mb-5 flex items-center gap-4 border-b border-line pb-5">
      <div className="group relative">
        <Avatar src={shown} name={name} size={72} />
        <button
          type="button"
          onClick={() => input.current?.click()}
          disabled={pending}
          className="absolute inset-0 grid place-items-center rounded-full bg-black/55 text-white opacity-0 transition-opacity group-hover:opacity-100 focus-visible:opacity-100"
          aria-label="Change photo"
        >
          {pending ? <Loader2 size={20} className="animate-spin" /> : <Camera size={20} />}
        </button>
        <input ref={input} type="file" accept="image/png,image/jpeg,image/webp" className="sr-only" onChange={(e) => choose(e.target.files?.[0])} />
      </div>
      <div className="min-w-0">
        <p className="text-sm font-semibold">Profile photo</p>
        <p className="text-xs text-ink-3">Shown to your team. PNG, JPG or WEBP.</p>
        <div className="mt-2 flex gap-2">
          <Button type="button" variant="secondary" size="sm" onClick={() => input.current?.click()} disabled={pending}>
            <Camera size={13} /> {shown ? "Change photo" : "Upload photo"}
          </Button>
          {shown && (
            <Button type="button" variant="ghost" size="sm" className="hover:text-bad" onClick={remove} disabled={pending}>
              <Trash2 size={13} /> Remove
            </Button>
          )}
        </div>
        {error && (
          <p role="alert" className="mt-2 flex items-center gap-1.5 text-xs text-bad">
            <AlertCircle size={13} /> {error}
          </p>
        )}
      </div>
      <Modal
        open={Boolean(picked)}
        onClose={() => !pending && setPicked(null)}
        title="Position your photo"
        description="Only what's inside the circle is saved."
      >
        {picked && <PhotoCropper file={picked} busy={pending} onCancel={() => setPicked(null)} onCrop={save} />}
      </Modal>
    </div>
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
    ["light", "White", Sun],
    ["dark", "Black", Moon],
    ["system", "Match my device", Monitor],
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
              "flex flex-col items-center gap-2 rounded-md border p-3 text-sm transition-colors",
              active ? "border-brand bg-brand-soft font-semibold text-brand-ink shadow-[0_0_0_1px_var(--brand)]" : "border-line hover:border-line-strong"
            )}
          >
            <span
              className={cx(
                "flex h-14 w-full items-end gap-1 rounded-sm border border-line p-2",
                value === "dark" ? "bg-[#111214]" : value === "light" ? "bg-[#f3f4f6]" : "bg-gradient-to-r from-[#f3f4f6] from-50% to-[#111214] to-50%"
              )}
              aria-hidden
            >
              <span className="h-4 w-1/3 rounded-sm bg-[#0f6cbd]" />
              <span className="h-7 w-1/3 rounded-sm bg-[#86b6ef]" />
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
      {/* Keyed by the saved values: React resets a form's fields after its action, which used to put
          the old currency back next to "Workspace saved". Re-mounting with the new values avoids that. */}
      <fieldset key={`${name}|${currency}`} disabled={disabled} className="grid gap-4 sm:grid-cols-[1fr_160px]">
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
