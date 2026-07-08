import type { AuditEntry } from "../types";
import { formatTimestamp } from "../lib/status";

interface Props {
  entries: AuditEntry[];
}

const EVENT_LABELS: Record<string, string> = {
  extraction: "Rule extraction",
  evaluation: "Compliance evaluation",
  amendment: "Regulatory amendment",
  review: "Officer review",
};

export function AuditPanel({ entries }: Props) {
  return (
    <div className="card flex h-full flex-col">
      <div className="border-b border-hair px-5 py-3.5">
        <h2 className="font-serif text-lg text-ink">Audit Trail</h2>
        <p className="text-xs text-muted">Append-only event log — history is never overwritten</p>
      </div>

      <div className="flex-1 overflow-y-auto px-5 py-3">
        {entries.length === 0 ? (
          <p className="py-8 text-center text-sm text-muted">No events recorded yet.</p>
        ) : (
          <ol className="relative space-y-0">
            {entries.map((e, i) => (
              <li key={e.id} className="relative flex gap-3 pb-4">
                {i < entries.length - 1 && (
                  <span className="absolute left-[5px] top-3 h-full w-px bg-hair" />
                )}
                <span className="relative z-10 mt-1.5 h-2.5 w-2.5 shrink-0 rounded-full border-2 border-accent bg-surface" />
                <div className="min-w-0 flex-1">
                  <div className="flex items-baseline justify-between gap-2">
                    <span className="text-xs font-medium text-ink">
                      {EVENT_LABELS[e.event_type] ?? e.event_type}
                    </span>
                    <time className="shrink-0 font-mono text-[10px] text-muted tnum">
                      {formatTimestamp(e.created_at)}
                    </time>
                  </div>
                  <p className="mt-0.5 text-xs leading-relaxed text-ink">{e.message}</p>
                  <div className="mt-1 flex items-center gap-2 text-[10px] text-muted">
                    <span className="font-mono">{e.actor}</span>
                    {e.entity_ref && (
                      <>
                        <span>·</span>
                        <span className="truncate font-mono">{e.entity_ref}</span>
                      </>
                    )}
                  </div>
                </div>
              </li>
            ))}
          </ol>
        )}
      </div>
    </div>
  );
}
