"use client";

import Link from "next/link";
import { useActionState, useEffect, useOptimistic, useState, useSyncExternalStore, useTransition } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "motion/react";
import { AlertCircle, Check, CheckSquare, Columns3, Plus, User, PartyPopper } from "lucide-react";
import { Button, Card, Field, Input, Select, Textarea, cx } from "@/components/ui";
import { Modal, SubmitButton } from "@/components/client";
import { ACTIVITY_META } from "@/components/activity";
import { createActivity, toggleActivity } from "./actions";

const noop = () => () => {};

function startOfDay(offsetDays = 0) {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  d.setDate(d.getDate() + offsetDays);
  return d;
}

function whenLabel(date) {
  const d = new Date(date);
  const today = startOfDay();
  const tomorrow = startOfDay(1);
  const time = d.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" });
  if (d >= today && d < tomorrow) return `Today, ${time}`;
  if (d >= tomorrow && d < startOfDay(2)) return `Tomorrow, ${time}`;
  return d.toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" }) + `, ${time}`;
}

function TaskRow({ task, onToggle }) {
  const meta = ACTIVITY_META[task.type] ?? ACTIVITY_META.task;
  const Icon = meta.icon;
  const overdue = !task.done && new Date(task.dueAt) < new Date();
  return (
    <motion.li
      layout
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, x: 24 }}
      className="group flex items-start gap-3 px-5 py-3.5"
    >
      <button
        type="button"
        onClick={() => onToggle(task)}
        aria-label={task.done ? `Mark "${task.subject}" as not done` : `Complete "${task.subject}"`}
        className={cx(
          "mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-md border-[1.5px] transition-all",
          task.done ? "border-ink bg-ink text-inverse" : "border-line-strong hover:scale-110 hover:border-ink"
        )}
      >
        {task.done && <Check size={12} strokeWidth={3} />}
      </button>
      <div className="min-w-0 flex-1">
        <p className={cx("text-sm font-medium", task.done && "text-ink-3 line-through decoration-line-strong")}>{task.subject}</p>
        {task.notes && <p className="mt-0.5 line-clamp-1 text-[13px] text-ink-3">{task.notes}</p>}
        <div className="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-ink-3">
          <span className="flex items-center gap-1">
            <Icon size={12} /> {meta.label}
          </span>
          {task.dealId && (
            <Link href={`/deals/${task.dealId}`} className="flex items-center gap-1 hover:text-ink hover:underline">
              <Columns3 size={12} /> {task.dealTitle}
            </Link>
          )}
          {task.contactId && (
            <Link href={`/contacts/${task.contactId}`} className="flex items-center gap-1 hover:text-ink hover:underline">
              <User size={12} /> {task.contactName}
            </Link>
          )}
        </div>
      </div>
      <span className={cx("shrink-0 text-xs tabular", overdue ? "font-medium text-bad" : "text-ink-3")}>
        {task.done ? "Done" : whenLabel(task.dueAt)}
      </span>
    </motion.li>
  );
}

function Section({ title, count, tone, children, empty }) {
  return (
    <Card>
      <div className="flex items-center gap-2 border-b border-line px-5 py-3.5">
        <h2 className={cx("text-sm font-semibold", tone === "bad" && "text-bad")}>{title}</h2>
        <span className={cx("rounded-full px-2 py-0.5 text-[11px] font-medium", tone === "bad" ? "bg-bad-bg text-bad" : "bg-surface-2 text-ink-3")}>
          {count}
        </span>
      </div>
      {count === 0 ? <p className="px-5 py-6 text-center text-sm text-ink-3">{empty}</p> : <ul className="divide-y divide-line">{children}</ul>}
    </Card>
  );
}

export function TaskBoard({ open, done }) {
  const router = useRouter();
  const mounted = useSyncExternalStore(noop, () => true, () => false);
  const [items, update] = useOptimistic([...open, ...done], (state, { id, done }) =>
    state.map((t) => (t.id === id ? { ...t, done, completedAt: done ? new Date().toISOString() : null } : t))
  );
  const [, startTransition] = useTransition();

  const toggle = (task) =>
    startTransition(async () => {
      update({ id: task.id, done: !task.done });
      await toggleActivity(task.id, !task.done);
      router.refresh();
    });

  const pending = items.filter((t) => !t.done);
  const completed = items.filter((t) => t.done);
  const today = startOfDay();
  const tomorrow = startOfDay(1);

  // Day buckets depend on the viewer's timezone, so they're computed after mount.
  const buckets = mounted
    ? [
        { key: "overdue", title: "Overdue", tone: "bad", items: pending.filter((t) => new Date(t.dueAt) < today), empty: "Nothing overdue." },
        { key: "today", title: "Today", items: pending.filter((t) => new Date(t.dueAt) >= today && new Date(t.dueAt) < tomorrow), empty: "Nothing else due today." },
        { key: "upcoming", title: "Upcoming", items: pending.filter((t) => new Date(t.dueAt) >= tomorrow), empty: "Nothing scheduled ahead." },
      ]
    : [{ key: "open", title: "Open", items: pending, empty: "" }];

  return (
    <div className="grid gap-5 xl:grid-cols-[1fr_380px]">
      <div className="space-y-5">
        {pending.length === 0 && mounted ? (
          <Card className="flex flex-col items-center px-6 py-14 text-center">
            <PartyPopper size={28} className="text-ink-2" />
            <h3 className="mt-3 font-display text-xl font-semibold">All clear</h3>
            <p className="mt-1 text-sm text-ink-3">Every follow-up is done. Go close something.</p>
          </Card>
        ) : (
          buckets.map((b) => (
            <Section key={b.key} title={b.title} count={b.items.length} tone={b.tone} empty={b.empty}>
              <AnimatePresence initial={false}>
                {b.items.map((t) => (
                  <TaskRow key={t.id} task={t} onToggle={toggle} />
                ))}
              </AnimatePresence>
            </Section>
          ))
        )}
      </div>
      <div>
        <Section title="Done this week" count={completed.length} empty="Completed tasks show up here.">
          <AnimatePresence initial={false}>
            {completed.slice(0, 25).map((t) => (
              <TaskRow key={t.id} task={t} onToggle={toggle} />
            ))}
          </AnimatePresence>
        </Section>
      </div>
    </div>
  );
}

function defaultDue() {
  const d = new Date(Date.now() + 86400000);
  d.setHours(10, 0, 0, 0);
  const pad = (n) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

function TaskForm({ deals, contacts, onDone }) {
  const [state, action] = useActionState(createActivity, null);
  useEffect(() => {
    if (state?.ok) onDone();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state]);
  return (
    <form action={action} className="space-y-4">
      {state?.error && (
        <div role="alert" className="flex items-center gap-2 rounded-lg bg-bad-bg px-3 py-2.5 text-sm text-bad">
          <AlertCircle size={15} /> {state.error}
        </div>
      )}
      <Field label="What needs doing?">
        <Input name="subject" required placeholder="e.g. Send the revised proposal" />
      </Field>
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Type">
          <Select name="type" defaultValue="task">
            {["task", "call", "meeting", "email"].map((t) => (
              <option key={t} value={t}>
                {ACTIVITY_META[t].label}
              </option>
            ))}
          </Select>
        </Field>
        <Field label="Due">
          <Input name="dueAt" type="datetime-local" required defaultValue={defaultDue()} />
        </Field>
        <Field label="Deal (optional)">
          <Select name="dealId" defaultValue="">
            <option value="">— None —</option>
            {deals.map((d) => (
              <option key={d.id} value={d.id}>
                {d.title}
              </option>
            ))}
          </Select>
        </Field>
        <Field label="Contact (optional)">
          <Select name="contactId" defaultValue="">
            <option value="">— None —</option>
            {contacts.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </Select>
        </Field>
      </div>
      <Field label="Notes">
        <Textarea name="notes" placeholder="Optional context" className="min-h-20" />
      </Field>
      <div className="flex justify-end gap-2">
        <Button type="button" variant="ghost" onClick={onDone}>
          Cancel
        </Button>
        <SubmitButton pendingText="Adding…">
          <CheckSquare size={14} /> Add task
        </SubmitButton>
      </div>
    </form>
  );
}

export function NewTaskButton({ autoOpen, deals, contacts }) {
  const router = useRouter();
  const [open, setOpen] = useState(!!autoOpen);
  const close = () => {
    setOpen(false);
    if (autoOpen) router.replace("/tasks");
  };
  return (
    <>
      <Button onClick={() => setOpen(true)}>
        <Plus size={15} /> New task
      </Button>
      <Modal open={open} onClose={close} title="New task" wide>
        {() => <TaskForm deals={deals} contacts={contacts} onDone={close} />}
      </Modal>
    </>
  );
}
