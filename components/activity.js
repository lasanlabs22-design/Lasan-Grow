"use client";

import { useActionState, useEffect, useOptimistic, useRef, useState, useTransition } from "react";
import { AlertCircle, CheckSquare, Mail, MessageSquareText, Phone, Users, Check, Trash2 } from "lucide-react";
import { Input, Textarea, cx } from "@/components/ui";
import { SubmitButton } from "@/components/client";
import { createActivity, toggleActivity, deleteActivity } from "@/app/(app)/tasks/actions";
import { relativeTime } from "@/lib/format";

export const ACTIVITY_META = {
  note: { icon: MessageSquareText, label: "Note" },
  call: { icon: Phone, label: "Call" },
  email: { icon: Mail, label: "Email" },
  meeting: { icon: Users, label: "Meeting" },
  task: { icon: CheckSquare, label: "Task" },
};

const TABS = ["note", "call", "meeting", "task"];

// links: { dealId?, contactId?, companyId?, leadId? }
export function ActivityComposer({ links }) {
  const [type, setType] = useState("note");
  const [state, action] = useActionState(createActivity, null);
  const formRef = useRef(null);

  useEffect(() => {
    if (state?.ok) formRef.current?.reset();
  }, [state]);

  const placeholder = {
    note: "What happened? Decisions, objections, next steps…",
    call: "Call summary",
    meeting: "Meeting agenda or outcome",
    task: "What needs doing?",
  }[type];

  return (
    <form ref={formRef} action={action} className="rounded-xl border border-line bg-surface p-3">
      {Object.entries(links).map(([k, v]) => v && <input key={k} type="hidden" name={k} value={v} />)}
      <input type="hidden" name="type" value={type} />
      <div className="mb-3 flex gap-1">
        {TABS.map((t) => {
          const Icon = ACTIVITY_META[t].icon;
          return (
            <button
              key={t}
              type="button"
              onClick={() => setType(t)}
              className={cx(
                "flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-[13px] transition-colors",
                type === t ? "bg-ink text-inverse" : "text-ink-2 hover:bg-surface-2"
              )}
            >
              <Icon size={14} /> {ACTIVITY_META[t].label}
            </button>
          );
        })}
      </div>
      {state?.error && (
        <p role="alert" className="mb-2 flex items-center gap-1.5 text-sm text-bad">
          <AlertCircle size={14} /> {state.error}
        </p>
      )}
      <Input name="subject" required placeholder={type === "note" ? "Title" : placeholder} className="mb-2" />
      {type === "note" && <Textarea name="notes" placeholder={placeholder} className="mb-2 min-h-20" />}
      <div className="flex flex-wrap items-center justify-between gap-2">
        {type !== "note" ? (
          <div className="flex items-center gap-2 text-[13px] text-ink-3">
            <span>{type === "task" ? "Due" : "When"}</span>
            <Input name="dueAt" type="datetime-local" className="h-8 w-auto text-[13px]" required={type === "task"} />
          </div>
        ) : (
          <span />
        )}
        <SubmitButton size="sm" pendingText="Saving…">
          {type === "task" ? "Add task" : "Log it"}
        </SubmitButton>
      </div>
    </form>
  );
}

export function ActivityTimeline({ items, emptyText = "No activity yet." }) {
  const [optimistic, setOptimistic] = useOptimistic(items, (state, { id, done, remove }) =>
    remove ? state.filter((i) => i.id !== id) : state.map((i) => (i.id === id ? { ...i, done } : i))
  );
  const [, startTransition] = useTransition();

  if (!optimistic.length) return <p className="py-8 text-center text-sm text-ink-3">{emptyText}</p>;

  return (
    <ol className="relative space-y-1">
      <span aria-hidden className="absolute bottom-3 left-[15px] top-3 w-px bg-line" />
      {optimistic.map((a) => {
        const meta = ACTIVITY_META[a.type] ?? ACTIVITY_META.task;
        const Icon = meta.icon;
        const overdue = !a.done && a.dueAt && new Date(a.dueAt) < new Date();
        return (
          <li key={a.id} className="group relative flex gap-3 rounded-lg py-2 pr-2">
            <span
              className={cx(
                "relative z-10 flex h-8 w-8 shrink-0 items-center justify-center rounded-full border",
                a.done ? "border-line bg-surface-2 text-ink-3" : "border-ink bg-surface text-ink"
              )}
            >
              <Icon size={14} />
            </span>
            <div className="min-w-0 flex-1 pt-1">
              <div className="flex items-start justify-between gap-2">
                <p className={cx("text-sm font-medium", a.done && a.type !== "note" && "text-ink-3 line-through decoration-line-strong")}>
                  {a.subject}
                </p>
                <div className="flex shrink-0 items-center gap-1">
                  {a.type !== "note" && (
                    <button
                      type="button"
                      aria-label={a.done ? "Mark as not done" : "Mark as done"}
                      onClick={() =>
                        startTransition(async () => {
                          setOptimistic({ id: a.id, done: !a.done });
                          await toggleActivity(a.id, !a.done);
                        })
                      }
                      className={cx(
                        "flex h-6 w-6 items-center justify-center rounded-md border transition-colors",
                        a.done ? "border-ink bg-ink text-inverse" : "border-line-strong hover:border-ink"
                      )}
                    >
                      {a.done && <Check size={13} />}
                    </button>
                  )}
                  <button
                    type="button"
                    aria-label="Delete"
                    onClick={() =>
                      startTransition(async () => {
                        setOptimistic({ id: a.id, remove: true });
                        await deleteActivity(a.id);
                      })
                    }
                    className="flex h-6 w-6 items-center justify-center rounded-md text-ink-3 opacity-0 transition-opacity hover:text-bad group-hover:opacity-100 focus:opacity-100"
                  >
                    <Trash2 size={13} />
                  </button>
                </div>
              </div>
              {a.notes && <p className="mt-1 whitespace-pre-wrap text-[13px] leading-relaxed text-ink-2">{a.notes}</p>}
              <p suppressHydrationWarning className={cx("mt-1 text-xs", overdue ? "text-bad" : "text-ink-3")}>
                {meta.label} · {a.done ? (a.type === "note" ? relativeTime(a.createdAt) : `done ${relativeTime(a.completedAt ?? a.dueAt)}`) : `${overdue ? "overdue, " : ""}due ${relativeTime(a.dueAt)}`}
                {a.context && <span> · {a.context}</span>}
              </p>
            </div>
          </li>
        );
      })}
    </ol>
  );
}
