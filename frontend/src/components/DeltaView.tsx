import { useEffect, useState } from "react";
import type { Delta, DeltaRuleChange, DeltaTransition } from "../types";
import { StatusBadge } from "./StatusBadge";
import { formatDate, formatTimestamp } from "../lib/status";

interface Props {
  delta: Delta | null;
  applying: boolean;
  applied: boolean;
  appliedAt: string | null;
  resetting?: boolean;
  onApply: () => void;
  onReset?: () => void;
}

export function DeltaView({
  delta,
  applying,
  applied,
  appliedAt,
  resetting = false,
  onApply,
  onReset,
}: Props) {
  const [revealed, setRevealed] = useState(false);

  useEffect(() => {
    if (delta) setRevealed(true);
  }, [delta]);

  const handleApply = async () => {
    if (applied || applying) return;
    setRevealed(false);
    await onApply();
    // Stagger the reveal so the animation reads as "system recalculated".
    requestAnimationFrame(() => {
      setTimeout(() => setRevealed(true), 80);
    });
  };

  return (
    <div className="space-y-4">
      {/* Amendment trigger card */}
      <div className="card-primary px-6 py-5">
        <div className="flex items-start justify-between gap-6">
          <div>
            <div className="flex items-center gap-2">
              <span className="label-caps">Amendment</span>
              {applied && (
                <span className="rounded bg-gold/15 px-2 py-0.5 text-[10px] font-medium uppercase tracking-wide text-gold">
                  Applied
                </span>
              )}
            </div>
            <h2 className="mt-1 font-serif text-xl text-ink">
              Phase 2 — T-1 closing NAV
            </h2>
            <p className="mt-1 text-sm text-muted">
              §4.4 supersedes §4.1 · effective{" "}
              <span className="font-mono text-ink tnum">01 Apr 2027</span>
            </p>
            {applied && appliedAt && (
              <p className="mt-2 font-mono text-[11px] text-muted tnum">
                Applied at {formatTimestamp(appliedAt)}
              </p>
            )}
          </div>
          <div className="flex shrink-0 flex-col items-end gap-2">
            {applied ? (
              <button
                type="button"
                disabled
                className="cursor-not-allowed rounded border border-hair bg-elevated px-5 py-2.5 text-sm font-medium text-muted opacity-70"
              >
                Applied
              </button>
            ) : (
              <button
                onClick={handleApply}
                disabled={applying}
                className="rounded border border-gold bg-gold px-5 py-2.5 text-sm font-medium text-canvas transition-all duration-300 ease-precise hover:bg-gold-400 disabled:opacity-50"
              >
                {applying ? "Recalculating…" : "Apply amendment"}
              </button>
            )}
            {applied && onReset && import.meta.env.DEV && (
              <button
                type="button"
                onClick={onReset}
                disabled={resetting}
                className="rounded border border-dashed border-muted/50 px-3 py-1.5 text-[11px] font-medium text-muted transition-colors hover:border-muted hover:text-ink disabled:opacity-50"
                title="Dev only — resets amendment state so the demo can be re-run"
              >
                {resetting ? "Resetting…" : "Reset to Phase 1 (dev only)"}
              </button>
            )}
          </div>
        </div>
      </div>

      {delta && (
        <>
          {/* Summary strip */}
          <div
            className={`grid grid-cols-3 gap-4 transition-all duration-500 ease-precise ${
              revealed ? "opacity-100 translate-y-0" : "opacity-0 translate-y-2"
            }`}
          >
            <SummaryCard label="Superseded" value={delta.summary.obligations_superseded} accent />
            <SummaryCard
              label="Newly flagged"
              value={delta.summary.firms_newly_flagged}
              warn={delta.summary.firms_newly_flagged > 0}
            />
            <SummaryCard label="Transitions" value={delta.summary.total_transitions} />
          </div>

          {/* Rule changes — the visual heart of the delta */}
          {delta.rule_changes.map((change, i) => (
            <RuleChangeCard
              key={change.old.rule_id}
              change={change}
              revealed={revealed}
              delay={i * 120}
            />
          ))}

          {/* Firm transitions */}
          {delta.firm_transitions.length > 0 && (
            <div
              className={`card overflow-hidden transition-all duration-500 ease-precise ${
                revealed ? "opacity-100 translate-y-0" : "opacity-0 translate-y-3"
              }`}
              style={{ transitionDelay: revealed ? "240ms" : "0ms" }}
            >
              <div className="border-b border-hair px-5 py-3.5">
                <h3 className="font-serif text-lg text-ink">Firm transitions</h3>
              </div>
              <div className="divide-y divide-hair">
                {delta.firm_transitions.map((t) => (
                  <TransitionRow key={`${t.firm_id}-${t.rule_id}`} transition={t} />
                ))}
              </div>
            </div>
          )}

          {delta.firm_transitions.length === 0 && revealed && (
            <div className="card px-5 py-8 text-center text-sm text-muted">
              No firm status transitions for this amendment window.
            </div>
          )}
        </>
      )}

      {!delta && !applying && (
        <div className="card px-5 py-8 text-center text-sm text-muted">
          Apply amendment to compute delta.
        </div>
      )}
    </div>
  );
}

function SummaryCard({
  label,
  value,
  accent,
  warn,
}: {
  label: string;
  value: number;
  accent?: boolean;
  warn?: boolean;
}) {
  return (
    <div className="card-muted px-5 py-3.5">
      <div
        className={`font-mono text-2xl font-semibold tnum ${
          warn ? "text-breach" : accent ? "text-gold" : "text-ink"
        }`}
      >
        {value}
      </div>
      <div className="text-xs text-muted">{label}</div>
    </div>
  );
}

function RuleChangeCard({
  change,
  revealed,
  delay,
}: {
  change: DeltaRuleChange;
  revealed: boolean;
  delay: number;
}) {
  return (
    <div
      className={`card overflow-hidden transition-all duration-500 ease-precise ${
        revealed ? "opacity-100 translate-y-0" : "opacity-0 translate-y-3"
      }`}
      style={{ transitionDelay: revealed ? `${delay}ms` : "0ms" }}
    >
      <div className="flex items-center gap-3 border-b border-hair bg-canvas px-5 py-3">
        <span className="rounded border border-gold/40 bg-gold/10 px-2 py-0.5 text-[10px] font-medium uppercase tracking-wide text-gold">
          Obligation superseded
        </span>
        <span className="font-mono text-xs text-muted">
          § {change.old.clause_id} → § {change.new.clause_id}
        </span>
        <span className="ml-auto font-mono text-[10px] text-muted tnum">
          effective {formatDate(change.new.effective_from)}
        </span>
      </div>

      <div className="grid grid-cols-1 gap-0 md:grid-cols-[1fr_auto_1fr]">
        {/* Old value */}
        <div className="border-b border-hair px-5 py-4 md:border-b-0 md:border-r">
          <div className="label-caps mb-2">Previous</div>
          <div
            className={`mt-3 font-mono text-base font-medium text-muted transition-all duration-700 ease-precise ${
              revealed ? "line-through opacity-60" : ""
            }`}
          >
            {change.old.value_summary}
          </div>
        </div>

        {/* Arrow */}
        <div className="flex items-center justify-center px-4 py-3 md:py-0">
          <svg
            className={`h-5 w-5 text-gold transition-all duration-500 ease-precise ${
              revealed ? "opacity-100 scale-100" : "opacity-0 scale-75"
            }`}
            style={{ transitionDelay: revealed ? "200ms" : "0ms" }}
            viewBox="0 0 20 20"
            fill="none"
          >
            <path
              d="M4 10h12m0 0l-4-4m4 4l-4 4"
              stroke="currentColor"
              strokeWidth="1.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </div>

        {/* New value */}
        <div className="px-5 py-4">
          <div className="label-caps mb-2 text-gold">New</div>
          <div
            className={`mt-3 font-mono text-base font-semibold transition-all duration-700 ease-precise ${
              revealed ? "text-gold opacity-100" : "text-ink opacity-40"
            }`}
            style={{ transitionDelay: revealed ? "300ms" : "0ms" }}
          >
            {change.new.value_summary}
          </div>
        </div>
      </div>
    </div>
  );
}

function TransitionRow({ transition }: { transition: DeltaTransition }) {
  return (
    <div
      className={`flex items-center gap-4 px-5 py-3.5 ${
        transition.newly_flagged ? "bg-breach-bg/40" : ""
      }`}
    >
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <span className="font-medium text-ink">{transition.firm_name}</span>
          {transition.newly_flagged && (
            <span className="rounded bg-breach/15 px-1.5 py-0.5 text-[9px] font-semibold uppercase text-breach">
              New
            </span>
          )}
        </div>
        <div className="font-mono text-[11px] text-muted">§ {transition.clause_id}</div>
      </div>

      <div className="flex items-center gap-2">
        <StatusBadge status={transition.from_status} />
        <svg className="h-4 w-4 text-muted" viewBox="0 0 16 16" fill="none">
          <path
            d="M3 8h10m0 0l-3-3m3 3l-3 3"
            stroke="currentColor"
            strokeWidth="1.5"
            strokeLinecap="round"
          />
        </svg>
        <StatusBadge status={transition.to_status} />
      </div>
    </div>
  );
}

