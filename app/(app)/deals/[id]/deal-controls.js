"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Check, Pencil, RotateCcw, Trash2, Trophy, XCircle } from "lucide-react";
import { Button, Field, Input, cx } from "@/components/ui";
import { Modal, SubmitButton } from "@/components/client";
import { DealForm } from "../deal-form";
import { moveDeal, deleteDeal } from "../actions";

export function StageStepper({ deal, stages }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [optimisticStage, setOptimisticStage] = useState(deal.stageId);
  const open = stages.filter((s) => s.kind === "open");
  const currentIndex = open.findIndex((s) => s.id === optimisticStage);
  const closed = deal.status !== "open";

  const go = (stage) => {
    if (stage.id === optimisticStage) return;
    setOptimisticStage(stage.id);
    startTransition(async () => {
      await moveDeal(deal.id, stage.id);
      router.refresh();
    });
  };

  return (
    <div className={cx("flex overflow-x-auto rounded-xl border border-line bg-surface p-1 shadow-card", pending && "opacity-80")}>
      {open.map((s, i) => {
        const reached = !closed && i <= currentIndex;
        const current = !closed && i === currentIndex;
        return (
          <button
            key={s.id}
            type="button"
            onClick={() => go(s)}
            title={`Move to ${s.name}`}
            className={cx(
              "flex min-w-[120px] flex-1 items-center justify-center gap-1.5 rounded-lg px-3 py-2 text-[13px] transition-colors",
              current ? "bg-ink font-medium text-inverse" : reached ? "bg-surface-2 text-ink" : "text-ink-3 hover:bg-surface-2 hover:text-ink"
            )}
          >
            {reached && !current && <Check size={13} />}
            {s.name}
          </button>
        );
      })}
    </div>
  );
}

export function DealActions({ deal, options }) {
  const router = useRouter();
  const [edit, setEdit] = useState(false);
  const [lost, setLost] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [pending, startTransition] = useTransition();
  const won = options.stages.find((s) => s.kind === "won");
  const lostStage = options.stages.find((s) => s.kind === "lost");
  const firstOpen = options.stages.find((s) => s.kind === "open");

  const move = (stage, reason) =>
    startTransition(async () => {
      await moveDeal(deal.id, stage.id, reason);
      router.refresh();
    });

  return (
    <div className="flex flex-wrap items-center gap-2">
      {deal.status === "open" ? (
        <>
          <Button variant="secondary" onClick={() => setLost(true)} disabled={pending}>
            <XCircle size={15} /> Lost
          </Button>
          <Button variant="success" onClick={() => move(won)} disabled={pending}>
            <Trophy size={15} /> Mark won
          </Button>
        </>
      ) : (
        <Button variant="secondary" onClick={() => move(firstOpen)} disabled={pending}>
          <RotateCcw size={15} /> Reopen
        </Button>
      )}
      <Button variant="secondary" size="icon" className="h-9 w-9" onClick={() => setEdit(true)} aria-label="Edit deal">
        <Pencil size={15} />
      </Button>
      <Button variant="secondary" size="icon" className="h-9 w-9 hover:text-bad" onClick={() => setConfirmDelete(true)} aria-label="Delete deal">
        <Trash2 size={15} />
      </Button>

      <Modal open={edit} onClose={() => setEdit(false)} title="Edit deal">
        {(close) => (
          <DealForm
            options={options}
            deal={deal}
            onDone={() => {
              close();
              router.refresh();
            }}
          />
        )}
      </Modal>

      <Modal open={lost} onClose={() => setLost(false)} title="Mark as lost" description="A reason helps the team learn — it shows up on the dashboard.">
        {(close) => (
          <form
            onSubmit={(e) => {
              e.preventDefault();
              move(lostStage, new FormData(e.currentTarget).get("reason"));
              close();
            }}
            className="space-y-4"
          >
            <Field label="Reason">
              <Input name="reason" list="lost-reasons" placeholder="e.g. Chose competitor" />
              <datalist id="lost-reasons">
                {["Price too high", "Chose competitor", "No budget", "Timing", "No response"].map((r) => (
                  <option key={r} value={r} />
                ))}
              </datalist>
            </Field>
            <div className="flex justify-end gap-2">
              <Button type="button" variant="ghost" onClick={close}>
                Cancel
              </Button>
              <Button type="submit" variant="danger">
                Mark lost
              </Button>
            </div>
          </form>
        )}
      </Modal>

      <Modal open={confirmDelete} onClose={() => setConfirmDelete(false)} title="Delete this deal?" description="Its activity history is deleted too. This can't be undone.">
        {(close) => (
          <form action={deleteDeal} className="flex justify-end gap-2">
            <input type="hidden" name="id" value={deal.id} />
            <Button type="button" variant="ghost" onClick={close}>
              Cancel
            </Button>
            <SubmitButton variant="danger" pendingText="Deleting…">
              Delete deal
            </SubmitButton>
          </form>
        )}
      </Modal>
    </div>
  );
}
