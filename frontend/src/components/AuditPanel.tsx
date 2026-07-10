import { useState } from "react";
import type { Health } from "../api";
import type { AuditEntry } from "../types";
import { auditMetaRows } from "../lib/auditMeta";
import { formatActor, formatAuditTime } from "../lib/status";

interface Props {
  entries: AuditEntry[];
  health?: Health | null;
}

const EVENT_LABELS: Record<string, string> = {
  extraction: "Extract",
  evaluation: "Eval",
  amendment: "Amendment",
  amendment_reset: "Reset",
  review: "Review",
  report: "Report",
};

export function AuditPanel({ entries, health: _health }: Props) {
  const [filter, setFilter] = useState<string>("all");
  const [expanded, setExpanded] = useState<number | null>(null);
  const eventTypes = Array.from(new Set(entries.map((e) => e.event_type)));
  const visible = filter === "all" ? entries : entries.filter((e) => e.event_type === filter);

  return (
    <div className="card-muted flex h-full flex-col">
      <div className="border-b border-hair/30 px-5 py-3">
        <h2 className="font-serif text-base text-ink/90">Audit trail</h2>
        <div className="mt-2 flex flex-wrap gap-1.5">
          <FilterChip active={filter === "all"} onClick={() => setFilter("all")}>
            All
          </FilterChip>
          {eventTypes.map((type) => (
            <FilterChip
              key={type}
              active={filter === type}
              onClick={() => setFilter(type)}
            >
              {EVENT_LABELS[type] ?? type}
            </FilterChip>
          ))}
        </div>
      </div>

      <div className="flex-1 overflow-y-auto px-5 py-3">
        {visible.length === 0 ? (
          <p className="py-8 text-center text-sm text-muted">No events recorded yet.</p>
        ) : (
          <ol className="relative space-y-0">
            {visible.map((e, i) => {
              const detailRows = auditMetaRows(e.event_type, e.meta);
              const showDetails =
                detailRows.length > 0 &&
                !["evaluation", "extraction"].includes(e.event_type);

              return (
                <li key={e.id} className="relative flex gap-3 pb-4">
                  {i < visible.length - 1 && (
                    <span className="absolute left-[5px] top-3 h-full w-px bg-hair/40" />
                  )}
                  <span className="relative z-10 mt-1.5 h-2.5 w-2.5 shrink-0 rounded-full border-2 border-gold/60 bg-surface" />
                  <div className="min-w-0 flex-1">
                    <div className="flex items-baseline justify-between gap-2">
                      <span className="text-xs font-medium text-ink/90">
                        {EVENT_LABELS[e.event_type] ?? e.event_type}
                      </span>
                      <time className="shrink-0 font-mono text-[10px] text-muted tnum">
                        {formatAuditTime(e.created_at)}
                      </time>
                    </div>
                    <p className="mt-0.5 text-xs leading-snug text-ink/80">{e.message}</p>
                    {e.actor && e.event_type !== "extraction" && (
                      <p className="mt-0.5 text-[10px] text-muted">By {formatActor(e.actor)}</p>
                    )}
                    {showDetails && (
                      <div className="mt-1.5">
                        <button
                          type="button"
                          onClick={() => setExpanded((id) => (id === e.id ? null : e.id))}
                          className="text-[10px] font-medium text-gold hover:text-gold-400"
                        >
                          {expanded === e.id ? "Close" : "Details"}
                        </button>
                        {expanded === e.id && (
                          <dl className="mt-1.5 space-y-1 rounded border border-hair/60 bg-canvas/80 px-2.5 py-2">
                            {detailRows.map((row) => (
                              <div
                                key={`${row.label}-${row.value}`}
                                className="grid grid-cols-[minmax(5rem,auto)_1fr] gap-x-3 gap-y-0.5 text-[10px]"
                              >
                                <dt className="text-muted">{row.label}</dt>
                                <dd className="text-ink/85 tnum">{row.value}</dd>
                              </div>
                            ))}
                          </dl>
                        )}
                      </div>
                    )}
                  </div>
                </li>
              );
            })}
          </ol>
        )}
      </div>
    </div>
  );
}

function FilterChip({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`rounded border px-2 py-1 text-[10px] font-medium transition-colors ${
        active
          ? "border-gold bg-gold/15 text-gold"
          : "border-hair bg-canvas text-muted hover:text-ink"
      }`}
    >
      {children}
    </button>
  );
}
