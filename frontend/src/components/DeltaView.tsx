import { useState } from "react";
import type { Delta, DeltaRuleChange, DeltaTransition } from "../types";
import { StatusBadge } from "./StatusBadge";
import { SourceCallout } from "./RuleDrawer";
import { formatDate } from "../lib/status";

interface Props {
  delta: Delta | null;
  applying: boolean;
  applied: boolean;
  onApply: () => void;
}

export function DeltaView({ delta, applying, applied, onApply }: Props) {
  const [revealed, setRevealed] = useState(false);

  const handleApply = async () => {
    setRevealed(false);
    await onApply();
    // Stagger the reveal so the animation reads as "system recalculated".
    requestAnimationFrame(() => {
      setTimeout(() => setRevealed(true), 80);
    });
  };

  return (
    <div className="space-y-4">
      <DeltaTimeline />

      {/* Amendment trigger card */}
      <div className="card-primary px-6 py-5">
        <div className="flex items-start justify-between gap-6">
          <div>
            <div className="flex items-center gap-2">
              <span className="label-caps">Regulatory amendment detected</span>
              {applied && (
                <span className="rounded bg-gold/15 px-2 py-0.5 text-[10px] font-medium uppercase tracking-wide text-gold">
                  Applied
                </span>
              )}
            </div>
            <h2 className="mt-1 font-serif text-xl text-ink">
              Phase 2 — Joint transition to T-1 closing NAV
            </h2>
            <p className="mt-1 max-w-xl text-sm text-muted">
              Clause 4.4 requires Stock Exchanges and AMCs to jointly address the
              operational challenges to implement T-1 day closing NAV as the base price
              w.e.f.{" "}
              <span className="font-mono text-ink tnum">01 Apr 2027</span>, superseding
              clause 4.1. The system will recalculate all firm obligations
              deterministically.
            </p>
          </div>
          <button
            onClick={handleApply}
            disabled={applying}
            className={`shrink-0 rounded border px-5 py-2.5 text-sm font-medium transition-all duration-300 ease-precise ${
            applied
              ? "border-gold bg-gold/10 text-gold hover:bg-gold/20"
              : "border-gold bg-gold text-canvas hover:bg-gold-400"
          } disabled:opacity-50`}
          >
            {applying ? "Recalculating…" : applied ? "Re-apply amendment" : "Apply amendment"}
          </button>
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
            <SummaryCard
              label="Obligations superseded"
              value={delta.summary.obligations_superseded}
              accent
            />
            <SummaryCard
              label="Firms newly flagged"
              value={delta.summary.firms_newly_flagged}
              warn={delta.summary.firms_newly_flagged > 0}
            />
            <SummaryCard
              label="Total status transitions"
              value={delta.summary.total_transitions}
            />
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
                <h3 className="font-serif text-lg text-ink">Firm status transitions</h3>
                <p className="text-xs text-muted">
                  Firms whose compliance posture changed due to the amendment
                </p>
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
        <div className="card px-5 py-12 text-center">
          <p className="text-sm text-muted">
            Click <strong className="text-gold">Apply amendment</strong> to compute the
            regulatory delta and see which obligations and firms are affected.
          </p>
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
          <div className="label-caps mb-2">Previous obligation</div>
          <p className="text-sm text-muted">{change.old.plain_description}</p>
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
          <div className="label-caps mb-2 text-gold">New obligation</div>
          <p className="text-sm text-ink">{change.new.plain_description}</p>
          <div
            className={`mt-3 font-mono text-base font-semibold transition-all duration-700 ease-precise ${
              revealed ? "text-gold opacity-100" : "text-ink opacity-40"
            }`}
            style={{ transitionDelay: revealed ? "300ms" : "0ms" }}
          >
            {change.new.value_summary}
          </div>
          {change.new.source_text_span && (
            <div
              className={`mt-3 transition-all duration-700 ease-precise ${
                revealed ? "opacity-100 translate-y-0" : "opacity-0 translate-y-1"
              }`}
              style={{ transitionDelay: revealed ? "450ms" : "0ms" }}
            >
              <SourceCallout
                text={change.new.source_text_span}
                clause={`§ ${change.new.clause_id}`}
              />
            </div>
          )}
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
            <span className="rounded bg-breach/15 px-1.5 py-0.5 text-[9px] font-semibold uppercase tracking-wide text-breach">
              Newly flagged
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

function DeltaTimeline() {
  return (
    <div className="card-muted flex flex-wrap items-center gap-x-5 gap-y-1 px-4 py-2.5 text-[11px] text-muted">
      <span className="font-mono text-xs text-ink/80 tnum">
        HO/47/11/11(1)2026-MRD-POD3/I/13804/2026
      </span>
      <span className="hidden md:inline">Norms for ETF base price and price bands</span>
      <div className="ml-auto flex flex-wrap items-center gap-4">
        <span>
          Issued <span className="text-ink/80">{formatDate("2026-06-15")}</span>
        </span>
        <span>
          Phase 1 <span className="text-ink/80">{formatDate("2026-09-01")}</span>
        </span>
        <span>
          Phase 2 <span className="text-ink/80">{formatDate("2027-04-01")}</span>
        </span>
      </div>
    </div>
  );
}
