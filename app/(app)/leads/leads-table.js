"use client";

import { useActionState, useEffect, useOptimistic, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { AlertCircle, ArrowRightLeft, Magnet, Plus, Trash2 } from "lucide-react";
import { Badge, Button, EmptyState, Field, Input, Select, Table, Td, Th, cx } from "@/components/ui";
import { Modal, SubmitButton } from "@/components/client";
import { money, relativeTime } from "@/lib/format";
import { scoreLead, scoreTone } from "@/lib/lead-score";
import { saveLead, setLeadStatus, convertLead, deleteLead } from "./actions";

const SOURCES = ["Website", "Referral", "LinkedIn", "Cold outreach", "Event", "Google Ads", "Partner"];
const STATUSES = ["new", "contacted", "qualified", "unqualified"];

function ScoreRing({ score }) {
  const r = 14;
  const c = 2 * Math.PI * r;
  const color = score >= 70 ? "var(--s3)" : score >= 40 ? "var(--s4)" : "var(--ink-3)";
  return (
    <div className="relative h-9 w-9 shrink-0" title={`Lead score ${score}/100`}>
      <svg viewBox="0 0 36 36" className="h-9 w-9 -rotate-90">
        <circle cx="18" cy="18" r={r} fill="none" stroke="var(--surface-3)" strokeWidth="3" />
        <circle cx="18" cy="18" r={r} fill="none" stroke={color} strokeWidth="3" strokeLinecap="round" strokeDasharray={`${(score / 100) * c} ${c}`} />
      </svg>
      <span className="absolute inset-0 flex items-center justify-center text-[11px] font-semibold tabular">{score}</span>
    </div>
  );
}

function LeadForm({ lead, onDone }) {
  const [state, action] = useActionState(saveLead, null);
  const [draft, setDraft] = useState({
    email: lead?.email ?? "",
    phone: lead?.phone ?? "",
    companyName: lead?.companyName ?? "",
    source: lead?.source ?? "",
    status: lead?.status && lead.status !== "converted" ? lead.status : "new",
    estimatedValue: lead?.estimatedValue ?? "",
  });
  const preview = scoreLead(draft);
  const set = (k) => (e) => setDraft((d) => ({ ...d, [k]: e.target.value }));

  useEffect(() => {
    if (state?.ok) onDone();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state]);

  return (
    <form action={action} className="space-y-4">
      {lead && <input type="hidden" name="id" value={lead.id} />}
      {state?.error && (
        <div role="alert" className="flex items-center gap-2 rounded-lg bg-bad-bg px-3 py-2.5 text-sm text-bad">
          <AlertCircle size={15} /> {state.error}
        </div>
      )}
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Name">
          <Input name="name" required defaultValue={lead?.name} placeholder="Full name" />
        </Field>
        <Field label="Company">
          <Input name="companyName" value={draft.companyName} onChange={set("companyName")} placeholder="Company name" />
        </Field>
        <Field label="Email">
          <Input name="email" type="email" value={draft.email} onChange={set("email")} placeholder="name@company.com" />
        </Field>
        <Field label="Phone">
          <Input name="phone" value={draft.phone} onChange={set("phone")} placeholder="+91 …" />
        </Field>
        <Field label="Source">
          <Select name="source" value={draft.source} onChange={set("source")}>
            <option value="">— Unknown —</option>
            {SOURCES.map((s) => (
              <option key={s}>{s}</option>
            ))}
          </Select>
        </Field>
        <Field label="Estimated value">
          <Input name="estimatedValue" type="number" min={0} value={draft.estimatedValue} onChange={set("estimatedValue")} placeholder="0" />
        </Field>
        <Field label="Status">
          <Select name="status" value={draft.status} onChange={set("status")}>
            {STATUSES.map((s) => (
              <option key={s} value={s} className="capitalize">
                {s[0].toUpperCase() + s.slice(1)}
              </option>
            ))}
          </Select>
        </Field>
      </div>

      <div className="flex items-center gap-4 rounded-xl border border-line bg-surface-2 p-4">
        <ScoreRing score={preview.score} />
        <div className="min-w-0 flex-1">
          <p className="text-sm font-medium">
            Score {preview.score} · <span className="text-ink-2">{scoreTone(preview.score).label}</span>
          </p>
          <p className="mt-0.5 text-xs text-ink-3">
            {preview.factors.length ? preview.factors.map((f) => `${f.label} +${f.points}`).join(" · ") : "Add details to score this lead"}
          </p>
        </div>
      </div>

      <div className="flex justify-end gap-2">
        <Button type="button" variant="ghost" onClick={onDone}>
          Cancel
        </Button>
        <SubmitButton pendingText="Saving…">{lead ? "Save lead" : "Add lead"}</SubmitButton>
      </div>
    </form>
  );
}

export function NewLeadButton({ autoOpen }) {
  const router = useRouter();
  const [open, setOpen] = useState(autoOpen);
  return (
    <>
      <Button onClick={() => setOpen(true)}>
        <Plus size={15} /> New lead
      </Button>
      <Modal
        open={open}
        onClose={() => {
          setOpen(false);
          if (autoOpen) router.replace("/leads");
        }}
        title="New lead"
        description="The score updates live as you fill it in."
        wide
      >
        {(close) => <LeadForm onDone={close} />}
      </Modal>
    </>
  );
}

const STATUS_TONE = { new: "outline", contacted: "neutral", qualified: "good", unqualified: "bad", converted: "ink" };

export function LeadsTable({ leads, currency, openId }) {
  const router = useRouter();
  const [editing, setEditing] = useState(() => leads.find((l) => l.id === openId) ?? null);
  const [converting, setConverting] = useState(null);
  const [optimistic, patch] = useOptimistic(leads, (state, p) =>
    p.remove ? state.filter((l) => l.id !== p.id) : state.map((l) => (l.id === p.id ? { ...l, ...p } : l))
  );
  const [pending, startTransition] = useTransition();

  if (!optimistic.length) {
    return <EmptyState icon={Magnet} title="No leads here" description="New enquiries land here. Add one, or switch tabs." />;
  }

  return (
    <>
      <Table>
        <thead>
          <tr>
            <Th>Lead</Th>
            <Th>Score</Th>
            <Th>Source</Th>
            <Th className="text-right">Est. value</Th>
            <Th>Status</Th>
            <Th>Added</Th>
            <Th className="text-right">
              <span className="sr-only">Actions</span>
            </Th>
          </tr>
        </thead>
        <tbody>
          {optimistic.map((l) => {
            const tone = scoreTone(l.score);
            return (
              <tr key={l.id} className="group transition-colors hover:bg-surface-2">
                <Td>
                  <button type="button" onClick={() => setEditing(l)} className="text-left">
                    <span className="font-medium group-hover:underline">{l.name}</span>
                    <span className="block text-xs text-ink-3">{[l.companyName, l.email].filter(Boolean).join(" · ") || "—"}</span>
                  </button>
                </Td>
                <Td>
                  <div className="flex items-center gap-2">
                    <ScoreRing score={l.score} />
                    <Badge tone={tone.tone}>{tone.label}</Badge>
                  </div>
                </Td>
                <Td className="text-ink-2">{l.source ?? "—"}</Td>
                <Td className="text-right font-medium tabular">{money(l.estimatedValue, currency, { compact: true })}</Td>
                <Td>
                  {l.status === "converted" ? (
                    <Badge tone="ink">Converted</Badge>
                  ) : (
                    <select
                      aria-label={`Status for ${l.name}`}
                      value={l.status}
                      onChange={(e) => {
                        const status = e.target.value;
                        startTransition(async () => {
                          patch({ id: l.id, status });
                          await setLeadStatus(l.id, status);
                          router.refresh();
                        });
                      }}
                      className={cx(
                        "cursor-pointer rounded-full border px-2.5 py-1 text-xs font-medium capitalize outline-none transition-colors",
                        l.status === "qualified" && "border-transparent bg-good-bg text-good",
                        l.status === "unqualified" && "border-transparent bg-bad-bg text-bad",
                        l.status === "contacted" && "border-line bg-surface-2 text-ink-2",
                        l.status === "new" && "border-line-strong bg-transparent text-ink-2"
                      )}
                    >
                      {STATUSES.map((s) => (
                        <option key={s} value={s}>
                          {s}
                        </option>
                      ))}
                    </select>
                  )}
                </Td>
                <Td className="whitespace-nowrap text-ink-3">
                  <span suppressHydrationWarning>{relativeTime(l.createdAt)}</span>
                </Td>
                <Td className="text-right">
                  <div className="flex items-center justify-end gap-1">
                    {l.status !== "converted" && l.status !== "unqualified" && (
                      <Button size="sm" variant="secondary" onClick={() => setConverting(l)}>
                        <ArrowRightLeft size={13} /> Convert
                      </Button>
                    )}
                    <button
                      type="button"
                      aria-label={`Delete ${l.name}`}
                      disabled={pending}
                      onClick={() =>
                        startTransition(async () => {
                          patch({ id: l.id, remove: true });
                          await deleteLead(l.id);
                          router.refresh();
                        })
                      }
                      className="rounded-md p-1.5 text-ink-3 opacity-0 transition-opacity hover:text-bad group-hover:opacity-100 focus:opacity-100"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                </Td>
              </tr>
            );
          })}
        </tbody>
      </Table>

      <Modal open={!!editing} onClose={() => setEditing(null)} title={editing?.name ?? "Lead"} description="Edit details — the score recalculates as you type." wide>
        {(close) => editing && <LeadForm key={editing.id} lead={editing} onDone={close} />}
      </Modal>

      <Modal
        open={!!converting}
        onClose={() => setConverting(null)}
        title="Convert to a deal?"
        description={converting ? `${converting.name}${converting.companyName ? ` · ${converting.companyName}` : ""}` : ""}
      >
        {(close) =>
          converting && (
            <form action={convertLead.bind(null, converting.id)} className="space-y-5">
              <ul className="space-y-2 text-sm text-ink-2">
                <li>• Creates a contact for {converting.name}</li>
                {converting.companyName && <li>• Links or creates the company {converting.companyName}</li>}
                <li>• Opens a {money(converting.estimatedValue, currency)} deal in your first pipeline stage</li>
              </ul>
              <div className="flex justify-end gap-2">
                <Button type="button" variant="ghost" onClick={close}>
                  Cancel
                </Button>
                <SubmitButton pendingText="Converting…">
                  <ArrowRightLeft size={14} /> Convert lead
                </SubmitButton>
              </div>
            </form>
          )
        }
      </Modal>
    </>
  );
}
