"use client";

import { useActionState, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { AlertCircle, Pencil, Plus, Trash2 } from "lucide-react";
import { Button, Field, Input, Select } from "@/components/ui";
import { Modal, SubmitButton } from "@/components/client";
import { saveContact, deleteContact } from "@/app/(app)/contacts/actions";
import { saveCompany, deleteCompany } from "@/app/(app)/companies/actions";

const SOURCES = ["Website", "Referral", "LinkedIn", "Cold outreach", "Event", "Google Ads", "Partner"];
const INDUSTRIES = ["SaaS", "Retail", "Logistics", "Healthcare", "Fintech", "Media", "Food & Bev", "Manufacturing", "Real estate", "Travel", "Education", "Security", "Other"];
const SIZES = ["1-10", "11-50", "51-200", "201-1000", "1000+"];

function useSaved(state, onDone) {
  useEffect(() => {
    if (state?.ok) onDone();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state]);
}

function ErrorLine({ message }) {
  if (!message) return null;
  return (
    <div role="alert" className="flex items-center gap-2 rounded-lg bg-bad-bg px-3 py-2.5 text-sm text-bad">
      <AlertCircle size={15} /> {message}
    </div>
  );
}

function Actions({ onCancel, label }) {
  return (
    <div className="flex justify-end gap-2 pt-2">
      <Button type="button" variant="ghost" onClick={onCancel}>
        Cancel
      </Button>
      <SubmitButton pendingText="Saving…">{label}</SubmitButton>
    </div>
  );
}

function ContactForm({ contact, companies, defaultCompanyId, onDone }) {
  const [state, action] = useActionState(saveContact, null);
  useSaved(state, onDone);
  return (
    <form action={action} className="space-y-4">
      {contact && <input type="hidden" name="id" value={contact.id} />}
      <ErrorLine message={state?.error} />
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="First name">
          <Input name="firstName" required defaultValue={contact?.firstName} />
        </Field>
        <Field label="Last name">
          <Input name="lastName" defaultValue={contact?.lastName ?? ""} />
        </Field>
        <Field label="Email">
          <Input name="email" type="email" defaultValue={contact?.email ?? ""} placeholder="name@company.com" />
        </Field>
        <Field label="Phone">
          <Input name="phone" defaultValue={contact?.phone ?? ""} placeholder="+91 …" />
        </Field>
        <Field label="Job title">
          <Input name="title" defaultValue={contact?.title ?? ""} placeholder="e.g. Head of Sales" />
        </Field>
        <Field label="Company">
          <Select name="companyId" defaultValue={contact?.companyId ?? defaultCompanyId ?? ""}>
            <option value="">— None —</option>
            {companies.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </Select>
        </Field>
        <Field label="Source">
          <Select name="source" defaultValue={contact?.source ?? ""}>
            <option value="">— Unknown —</option>
            {SOURCES.map((s) => (
              <option key={s}>{s}</option>
            ))}
          </Select>
        </Field>
      </div>
      <Actions onCancel={onDone} label={contact ? "Save contact" : "Add contact"} />
    </form>
  );
}

function CompanyForm({ company, onDone }) {
  const [state, action] = useActionState(saveCompany, null);
  useSaved(state, onDone);
  return (
    <form action={action} className="space-y-4">
      {company && <input type="hidden" name="id" value={company.id} />}
      <ErrorLine message={state?.error} />
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Company name">
          <Input name="name" required defaultValue={company?.name} />
        </Field>
        <Field label="Website">
          <Input name="domain" defaultValue={company?.domain ?? ""} placeholder="acme.com" />
        </Field>
        <Field label="Industry">
          <Select name="industry" defaultValue={company?.industry ?? ""}>
            <option value="">—</option>
            {INDUSTRIES.map((s) => (
              <option key={s}>{s}</option>
            ))}
          </Select>
        </Field>
        <Field label="Employees">
          <Select name="size" defaultValue={company?.size ?? ""}>
            <option value="">—</option>
            {SIZES.map((s) => (
              <option key={s}>{s}</option>
            ))}
          </Select>
        </Field>
        <Field label="City">
          <Input name="city" defaultValue={company?.city ?? ""} />
        </Field>
      </div>
      <Actions onCancel={onDone} label={company ? "Save company" : "Add company"} />
    </form>
  );
}

// kind: "contact" | "company"; record present => edit mode.
export function RecordFormButton({ kind, record, companies = [], defaultCompanyId, autoOpen, iconOnly }) {
  const router = useRouter();
  const [open, setOpen] = useState(!!autoOpen);
  const editing = !!record;
  const noun = kind === "contact" ? "contact" : "company";
  const close = () => {
    setOpen(false);
    if (autoOpen) router.replace(kind === "contact" ? "/contacts" : "/companies");
    else router.refresh();
  };

  return (
    <>
      {iconOnly ? (
        <Button variant="secondary" size="icon" className="h-9 w-9" onClick={() => setOpen(true)} aria-label={`Edit ${noun}`}>
          <Pencil size={15} />
        </Button>
      ) : (
        <Button variant={editing ? "secondary" : "primary"} onClick={() => setOpen(true)}>
          {editing ? <Pencil size={15} /> : <Plus size={15} />} {editing ? "Edit" : `New ${noun}`}
        </Button>
      )}
      <Modal open={open} onClose={close} title={editing ? `Edit ${noun}` : `New ${noun}`} wide>
        {() =>
          kind === "contact" ? (
            <ContactForm contact={record} companies={companies} defaultCompanyId={defaultCompanyId} onDone={close} />
          ) : (
            <CompanyForm company={record} onDone={close} />
          )
        }
      </Modal>
    </>
  );
}

export function DeleteRecordButton({ kind, id, name }) {
  const [open, setOpen] = useState(false);
  const action = kind === "contact" ? deleteContact : deleteCompany;
  return (
    <>
      <Button variant="secondary" size="icon" className="h-9 w-9 hover:text-bad" onClick={() => setOpen(true)} aria-label={`Delete ${kind}`}>
        <Trash2 size={15} />
      </Button>
      <Modal
        open={open}
        onClose={() => setOpen(false)}
        title={`Delete ${name}?`}
        description={
          kind === "company"
            ? "Contacts and deals stay, but lose their link to this company. This can't be undone."
            : "Deals stay, but lose their link to this contact. Their activity log is deleted. This can't be undone."
        }
      >
        {(close) => (
          <form action={action} className="flex justify-end gap-2">
            <input type="hidden" name="id" value={id} />
            <Button type="button" variant="ghost" onClick={close}>
              Cancel
            </Button>
            <SubmitButton variant="danger" pendingText="Deleting…">
              Delete
            </SubmitButton>
          </form>
        )}
      </Modal>
    </>
  );
}
