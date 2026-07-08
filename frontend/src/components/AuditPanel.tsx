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
  review: "Officer review",
};

export function AuditPanel({ entries, health }: Props) {
  const [showEngineInfo, setShowEngineInfo] = useState(false);
  const live = health?.llm_configured === true;

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
      </div>

      <div className="flex-1 overflow-y-auto px-5 py-3">
        {entries.length === 0 ? (
          <p className="py-8 text-center text-sm text-muted">No events recorded yet.</p>
        ) : (
          <ol className="relative space-y-0">
            {entries.map((e, i) => (
              <li key={e.id} className="relative flex gap-3 pb-4">
                {i < entries.length - 1 && (
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
