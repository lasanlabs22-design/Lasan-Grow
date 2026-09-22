import Link from "next/link";
import { money, shortDate } from "@/lib/format";
import { Badge } from "@/components/ui";

// Compact deal list used on contact and company pages.
export function RelatedDeals({ deals, currency }) {
  if (!deals.length) return <p className="px-5 py-8 text-center text-sm text-ink-3">No deals yet.</p>;
  return (
    <ul className="divide-y divide-line">
      {deals.map((d) => (
        <li key={d.id}>
          <Link href={`/deals/${d.id}`} className="flex items-center gap-3 px-5 py-3 transition-colors hover:bg-surface-2">
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-medium">{d.title}</p>
              <p className="text-xs text-ink-3">
                {d.status === "open" ? `${d.stageName} · closes ${shortDate(d.expectedClose)}` : `Closed ${shortDate(d.closedAt)}`}
              </p>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-sm font-semibold tabular">{money(d.value, currency, { compact: true })}</span>
              {d.status !== "open" && <Badge tone={d.status === "won" ? "good" : "bad"}>{d.status === "won" ? "Won" : "Lost"}</Badge>}
            </div>
          </Link>
        </li>
      ))}
    </ul>
  );
}
