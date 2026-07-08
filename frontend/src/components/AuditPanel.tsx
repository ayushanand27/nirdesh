import { useState } from "react";
import type { Health } from "../api";
import type { AuditEntry } from "../types";
import { formatActor, formatTimestamp } from "../lib/status";

interface Props {
  entries: AuditEntry[];
  health?: Health | null;
}

const EVENT_LABELS: Record<string, string> = {
  extraction: "Rule extraction",
  evaluation: "Compliance evaluation",
  amendment: "Regulatory amendment",
  amendment_reset: "Demo reset",
  review: "Officer review",
  report: "Compliance report generated",
};

export function AuditPanel({ entries, health }: Props) {
  const [showEngineInfo, setShowEngineInfo] = useState(false);
  const [filter, setFilter] = useState<string>("all");
  const [expanded, setExpanded] = useState<number | null>(null);
  const live = health?.llm_configured === true;
  const eventTypes = Array.from(new Set(entries.map((e) => e.event_type)));
  const visible = filter === "all" ? entries : entries.filter((e) => e.event_type === filter);

  return (
    <div className="card-muted flex h-full flex-col">
      <div className="border-b border-hair/30 px-5 py-3">
        <div className="flex items-center gap-2">
          <h2 className="font-serif text-base text-ink/90">Audit Trail</h2>
          <button
            type="button"
            onClick={() => setShowEngineInfo((v) => !v)}
            className="flex h-4 w-4 items-center justify-center rounded-full border border-gold/30 text-[10px] text-gold transition-colors hover:border-gold/50 hover:text-gold-400"
            aria-label="Extraction engine info"
            title="Extraction engine info"
          >
            i
          </button>
        </div>
        <p className="text-[11px] text-muted/80">Append-only event log</p>
        {showEngineInfo && (
          <p className="mt-2 rounded bg-canvas/80 px-2.5 py-1.5 text-[10px] leading-relaxed text-muted">
            Extraction engine: {live ? "Groq · llama-3.3-70b (live)" : "Cached extraction (demo)"}
          </p>
        )}
        <div className="mt-3 flex flex-wrap gap-1.5">
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
            {visible.map((e, i) => (
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
                    <time className="shrink-0 text-[10px] text-muted">
                      {formatTimestamp(e.created_at)}
                    </time>
                  </div>
                  <p className="mt-0.5 text-xs leading-relaxed text-ink/80">{e.message}</p>
                  <div className="mt-1 flex items-center gap-2 text-[10px] text-muted/70">
                    <span>{formatActor(e.actor)}</span>
                    <span>·</span>
                    <span className="font-mono">{e.entity_ref}</span>
                  </div>
                  {e.meta && Object.keys(e.meta).length > 0 && (
                    <div className="mt-2">
                      <button
                        type="button"
                        onClick={() => setExpanded((id) => (id === e.id ? null : e.id))}
                        className="text-[11px] font-medium text-gold hover:text-gold-400"
                      >
                        {expanded === e.id ? "Hide metadata" : "Inspect metadata"}
                      </button>
                      {expanded === e.id && (
                        <pre className="mt-2 overflow-x-auto rounded border border-hair bg-canvas px-3 py-2 text-[10px] leading-relaxed text-muted">
                          {JSON.stringify(e.meta, null, 2)}
                        </pre>
                      )}
                    </div>
                  )}
                </div>
              </li>
            ))}
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
