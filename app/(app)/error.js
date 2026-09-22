"use client";

import { AlertTriangle, RotateCcw } from "lucide-react";
import { Button, Card } from "@/components/ui";

export default function AppError({ error, reset }) {
  return (
    <Card className="mx-auto mt-10 max-w-lg p-8 text-center">
      <span className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-bad-bg">
        <AlertTriangle size={20} className="text-bad" />
      </span>
      <h1 className="mt-4 font-display text-xl font-semibold">Something went wrong</h1>
      <p className="mt-2 text-sm text-ink-3">
        We couldn&apos;t load this page. Your data is safe — try again, and if it keeps happening, check the database connection.
      </p>
      {error?.digest && <p className="mt-3 font-mono text-xs text-ink-3">Ref: {error.digest}</p>}
      <Button onClick={reset} className="mt-6">
        <RotateCcw size={15} /> Try again
      </Button>
    </Card>
  );
}
