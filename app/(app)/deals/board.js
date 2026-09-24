"use client";

import Link from "next/link";
import { useEffect, useMemo, useState, useTransition } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import {
  DndContext,
  DragOverlay,
  PointerSensor,
  KeyboardSensor,
  useDraggable,
  useDroppable,
  useSensor,
  useSensors,
} from "@dnd-kit/core";
import { AnimatePresence, motion } from "motion/react";
import { CalendarDays, Plus, Trophy, XCircle, Building2 } from "lucide-react";
import { Avatar, Button, Field, Input, cx } from "@/components/ui";
import { Modal } from "@/components/client";
import { money, shortDate } from "@/lib/format";
import { DealForm } from "./deal-form";
import { moveDeal } from "./actions";

function DealCard({ deal, currency, overlay }) {
  const overdue = deal.expectedClose && new Date(deal.expectedClose) < new Date(new Date().toDateString());
  return (
    <div
      className={cx(
        "rounded-xl border border-line bg-surface p-3.5 text-left shadow-card transition-shadow",
        overlay ? "rotate-[2deg] shadow-pop ring-1 ring-ink/10" : "hover:border-line-strong"
      )}
    >
      <p className="line-clamp-2 text-[13.5px] font-medium leading-snug">{deal.title}</p>
      {deal.companyName && (
        <p className="mt-1 flex items-center gap-1.5 truncate text-xs text-ink-3">
          <Building2 size={12} /> {deal.companyName}
        </p>
      )}
      <div className="mt-3 flex items-center justify-between gap-2">
        <span className="font-mono text-[13px] font-semibold tabular">{money(deal.value, currency, { compact: true })}</span>
        <div className="flex items-center gap-2">
          {deal.expectedClose && (
            <span className={cx("flex items-center gap-1 text-[11.5px]", overdue ? "text-bad" : "text-ink-3")}>
              <CalendarDays size={12} /> {shortDate(deal.expectedClose)}
            </span>
          )}
          {deal.contactName && <Avatar name={deal.contactName} size={20} />}
        </div>
      </div>
    </div>
  );
}

function DraggableDeal({ deal, currency }) {
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({ id: deal.id, data: { deal } });
  return (
    <div ref={setNodeRef} {...listeners} {...attributes} className={cx("touch-none", isDragging && "opacity-30")}>
      <Link href={`/deals/${deal.id}`} draggable={false} onClick={(e) => isDragging && e.preventDefault()}>
        <DealCard deal={deal} currency={currency} />
      </Link>
    </div>
  );
}

function Column({ stage, deals, currency, onAdd }) {
  const { setNodeRef, isOver } = useDroppable({ id: stage.id });
  const total = deals.reduce((a, d) => a + d.value, 0);
  return (
    <section
      ref={setNodeRef}
      className={cx(
        "flex w-[280px] shrink-0 flex-col rounded-2xl border bg-surface-2/70 transition-colors",
        isOver ? "border-ink/40 bg-surface-3" : "border-transparent"
      )}
    >
      <header className="px-3.5 pb-2 pt-3.5">
        <div className="flex items-center justify-between">
          <h2 className="text-[13px] font-semibold">
            {stage.name} <span className="ml-1 font-normal text-ink-3">{deals.length}</span>
          </h2>
          <button
            onClick={() => onAdd(stage.id)}
            aria-label={`Add deal to ${stage.name}`}
            className="rounded-md p-1 text-ink-3 hover:bg-surface hover:text-ink"
          >
            <Plus size={15} />
          </button>
        </div>
        <p className="mt-0.5 text-xs text-ink-3 tabular">
          {money(total, currency, { compact: true })}
          <span className="mx-1">·</span>
          {stage.probability}% → {money((total * stage.probability) / 100, currency, { compact: true })}
        </p>
        <div className="mt-2.5 h-1 overflow-hidden rounded-full bg-surface-3">
          <div className="h-full rounded-full bg-s1" style={{ width: `${stage.probability}%` }} />
        </div>
      </header>
      <div className="flex min-h-24 flex-1 flex-col gap-2 overflow-y-auto px-2.5 pb-3 pt-1">
        {deals.map((d) => (
          <DraggableDeal key={d.id} deal={d} currency={currency} />
        ))}
        {deals.length === 0 && (
          <div className="flex h-20 items-center justify-center rounded-xl border border-dashed border-line-strong text-xs text-ink-3">
            Drop deals here
          </div>
        )}
      </div>
    </section>
  );
}

function OutcomeZone({ stage, tone }) {
  const { setNodeRef, isOver } = useDroppable({ id: stage.id });
  const won = tone === "won";
  const Icon = won ? Trophy : XCircle;
  return (
    <div
      ref={setNodeRef}
      className={cx(
        "flex h-16 flex-1 items-center justify-center gap-2 rounded-2xl border-2 border-dashed text-sm font-medium transition-all",
        won ? "border-good/40 text-good" : "border-bad/40 text-bad",
        isOver && (won ? "scale-[1.02] bg-good-bg" : "scale-[1.02] bg-bad-bg")
      )}
    >
      <Icon size={18} /> {won ? "Drop to mark won" : "Drop to mark lost"}
    </div>
  );
}

export function DealsBoard({ stages, deals: initialDeals, currency, options }) {
  const router = useRouter();
  const params = useSearchParams();
  const [deals, setDeals] = useState(initialDeals);
  const [dragging, setDragging] = useState(null);
  const [lostPrompt, setLostPrompt] = useState(null);
  const [toast, setToast] = useState(null);
  const wantsNew = params.get("new") === "1";
  const [createStage, setCreateStage] = useState(wantsNew ? "" : null);
  const [, startTransition] = useTransition();

  // "New deal" links to /deals?new=1; on the board itself that's a same-route navigation that doesn't remount, so open on change.
  const [prevWantsNew, setPrevWantsNew] = useState(wantsNew);
  if (wantsNew !== prevWantsNew) {
    setPrevWantsNew(wantsNew);
    if (wantsNew) setCreateStage("");
  }

  // Resync local (optimistic) state when the server sends fresh deals.
  const [syncedFrom, setSyncedFrom] = useState(initialDeals);
  if (syncedFrom !== initialDeals) {
    setSyncedFrom(initialDeals);
    setDeals(initialDeals);
  }
  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(null), 3200);
    return () => clearTimeout(t);
  }, [toast]);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    useSensor(KeyboardSensor)
  );

  const openStages = stages.filter((s) => s.kind === "open");
  const wonStage = stages.find((s) => s.kind === "won");
  const lostStage = stages.find((s) => s.kind === "lost");
  const byStage = useMemo(() => {
    const m = Object.fromEntries(openStages.map((s) => [s.id, []]));
    for (const d of deals) m[d.stageId]?.push(d);
    return m;
  }, [deals, openStages]);

  const commitMove = (deal, stage, reason) => {
    const previous = deals;
    // Optimistic: closed deals leave the board, open ones hop columns.
    setDeals((ds) => (stage.kind === "open" ? ds.map((d) => (d.id === deal.id ? { ...d, stageId: stage.id } : d)) : ds.filter((d) => d.id !== deal.id)));
    if (stage.kind === "won") setToast({ tone: "won", text: `Won ${money(deal.value, currency)} — ${deal.title}` });
    if (stage.kind === "lost") setToast({ tone: "lost", text: `Marked lost — ${deal.title}` });
    startTransition(async () => {
      try {
        await moveDeal(deal.id, stage.id, reason);
        router.refresh();
      } catch {
        setDeals(previous);
        setToast({ tone: "lost", text: "Couldn't move that deal. Try again." });
      }
    });
  };

  const onDragEnd = ({ active, over }) => {
    setDragging(null);
    if (!over) return;
    const deal = active.data.current.deal;
    const stage = stages.find((s) => s.id === over.id);
    if (!stage || stage.id === deal.stageId) return;
    if (stage.kind === "lost") return setLostPrompt({ deal, stage });
    commitMove(deal, stage);
  };

  return (
    <>
      <DndContext
        id="deals-board"
        sensors={sensors}
        onDragStart={({ active }) => setDragging(active.data.current.deal)}
        onDragCancel={() => setDragging(null)}
        onDragEnd={onDragEnd}
      >
        <div className="-mx-4 overflow-x-auto px-4 pb-4 sm:-mx-6 sm:px-6">
          <div className="flex min-h-[60vh] gap-3">
            {openStages.map((s) => (
              <Column key={s.id} stage={s} deals={byStage[s.id] ?? []} currency={currency} onAdd={setCreateStage} />
            ))}
          </div>
        </div>

        <AnimatePresence>
          {dragging && wonStage && lostStage && (
            <motion.div
              initial={{ y: 80, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: 80, opacity: 0 }}
              className="fixed inset-x-4 bottom-4 z-40 flex gap-3 rounded-3xl border border-line bg-surface/90 p-3 shadow-pop backdrop-blur lg:left-[272px]"
            >
              <OutcomeZone stage={lostStage} tone="lost" />
              <OutcomeZone stage={wonStage} tone="won" />
            </motion.div>
          )}
        </AnimatePresence>

        <DragOverlay dropAnimation={{ duration: 180 }}>
          {dragging ? <DealCard deal={dragging} currency={currency} overlay /> : null}
        </DragOverlay>
      </DndContext>

      <Modal
        open={createStage !== null}
        onClose={() => {
          setCreateStage(null);
          if (params.get("new")) router.replace("/deals");
        }}
        title="New deal"
        description="Add it to the pipeline — you can drag it between stages later."
      >
        {(close) => <DealForm options={{ ...options, stages: openStages }} defaultStageId={createStage || undefined} onDone={close} />}
      </Modal>

      <Modal open={!!lostPrompt} onClose={() => setLostPrompt(null)} title="Why was it lost?" description={lostPrompt?.deal.title}>
        {(close) => (
          <form
            onSubmit={(e) => {
              e.preventDefault();
              commitMove(lostPrompt.deal, lostPrompt.stage, new FormData(e.currentTarget).get("reason"));
              close();
            }}
            className="space-y-4"
          >
            <div className="flex flex-wrap gap-2">
              {["Price too high", "Chose competitor", "No budget", "Timing", "No response"].map((r) => (
                <label key={r} className="cursor-pointer">
                  <input type="radio" name="reason" value={r} className="peer sr-only" />
                  <span className="inline-block rounded-full border border-line px-3 py-1.5 text-sm transition-colors peer-checked:border-ink peer-checked:bg-ink peer-checked:text-inverse hover:border-line-strong">
                    {r}
                  </span>
                </label>
              ))}
            </div>
            <Field label="Or describe it">
              <Input name="reason" placeholder="Optional" />
            </Field>
            <div className="flex justify-end gap-2">
              <Button type="button" variant="ghost" onClick={close}>
                Cancel
              </Button>
              <Button type="submit" variant="danger">
                Mark as lost
              </Button>
            </div>
          </form>
        )}
      </Modal>

      <div className="pointer-events-none fixed inset-x-0 bottom-6 z-50 flex justify-center px-4" role="status">
        <AnimatePresence>
          {toast && (
            <motion.div
              initial={{ y: 30, opacity: 0, scale: 0.95 }}
              animate={{ y: 0, opacity: 1, scale: 1 }}
              exit={{ y: 30, opacity: 0 }}
              className="flex items-center gap-2.5 rounded-full bg-ink px-5 py-3 text-sm font-medium text-inverse shadow-pop"
            >
              {toast.tone === "won" ? <Trophy size={16} /> : <XCircle size={16} />}
              {toast.text}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </>
  );
}
