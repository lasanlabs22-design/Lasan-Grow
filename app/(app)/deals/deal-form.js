"use client";

import { useActionState, useEffect, useState } from "react";
import { AlertCircle } from "lucide-react";
import { Field, Input, Select, Button } from "@/components/ui";
import { SubmitButton } from "@/components/client";
import { saveDeal } from "./actions";

const SOURCES = ["Website", "Referral", "LinkedIn", "Cold outreach", "Event", "Google Ads", "Partner"];

export function DealForm({ options, deal, defaultStageId, onDone }) {
  const [state, action] = useActionState(saveDeal, null);
  const [contactId, setContactId] = useState(deal?.contactId ?? "");
  const [companyId, setCompanyId] = useState(deal?.companyId ?? "");

  useEffect(() => {
    if (state?.ok) onDone?.();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state]);

  const openStages = options.stages;
  const onContact = (id) => {
    setContactId(id);
    const c = options.contacts.find((x) => x.id === id);
    if (c?.companyId && !companyId) setCompanyId(c.companyId);
  };

  return (
    <form action={action} className="space-y-4">
      {deal && <input type="hidden" name="id" value={deal.id} />}
      {state?.error && (
        <div role="alert" className="flex items-center gap-2 rounded-lg bg-bad-bg px-3 py-2.5 text-sm text-bad">
          <AlertCircle size={15} /> {state.error}
        </div>
      )}
      <Field label="Deal name">
        <Input name="title" required defaultValue={deal?.title} placeholder="e.g. Annual license — Acme" />
      </Field>
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Value">
          <Input name="value" type="number" min={0} step={1} inputMode="numeric" defaultValue={deal?.value ?? ""} placeholder="0" />
        </Field>
        <Field label="Stage">
          <Select name="stageId" required defaultValue={deal?.stageId ?? defaultStageId ?? openStages[0]?.id}>
            {openStages.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name} {s.kind === "open" ? `· ${s.probability}%` : ""}
              </option>
            ))}
          </Select>
        </Field>
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Contact">
          <Select name="contactId" value={contactId} onChange={(e) => onContact(e.target.value)}>
            <option value="">— None —</option>
            {options.contacts.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </Select>
        </Field>
        <Field label="Company">
          <Select name="companyId" value={companyId} onChange={(e) => setCompanyId(e.target.value)}>
            <option value="">— None —</option>
            {options.companies.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </Select>
        </Field>
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Expected close">
          <Input name="expectedClose" type="date" defaultValue={deal?.expectedClose ?? ""} />
        </Field>
        <Field label="Source">
          <Select name="source" defaultValue={deal?.source ?? ""}>
            <option value="">— Unknown —</option>
            {SOURCES.map((s) => (
              <option key={s}>{s}</option>
            ))}
          </Select>
        </Field>
      </div>
      <div className="flex justify-end gap-2 pt-2">
        <Button type="button" variant="ghost" onClick={onDone}>
          Cancel
        </Button>
        <SubmitButton pendingText="Saving…">{deal ? "Save changes" : "Create deal"}</SubmitButton>
      </div>
    </form>
  );
}
