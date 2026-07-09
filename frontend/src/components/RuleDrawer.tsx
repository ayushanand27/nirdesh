import { useEffect } from "react";
import type { Cell, Firm, Rule } from "../types";
import { ConfidenceBar } from "./ConfidenceBar";
import { StatusBadge } from "./StatusBadge";
import { formatClause, formatDate, formatEntity } from "../lib/status";

interface Props {
  rule: Rule | null;
  firms: Firm[];
  cells: Cell[];
  onClose: () => void;
}

export function RuleDrawer({ rule, firms, cells, onClose }: Props) {
  const open = rule !== null;

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  return (
    <>
      <div
        onClick={onClose}
        className={`fixed inset-0 z-30 bg-black/60 transition-opacity duration-300 ease-precise ${
          open ? "opacity-100" : "pointer-events-none opacity-0"
        }`}
      />
      <aside
        className={`fixed right-0 top-0 z-40 flex h-full w-full max-w-[480px] flex-col bg-surface shadow-drawer transition-transform duration-300 ease-precise ${
          open ? "translate-x-0" : "translate-x-full"
        }`}
      >
        {rule && (
          <RuleDetail rule={rule} firms={firms} cells={cells} onClose={onClose} />
        )}
      </aside>
    </>
  );
}

function RuleDetail({
  rule,
  firms,
  cells,
  onClose,
}: {
  rule: Rule;
  firms: Firm[];
  cells: Cell[];
  onClose: () => void;
}) {
  const firmById = new Map(firms.map((f) => [f.id, f]));
  const related = cells.filter((c) => c.rule_id === rule.rule_id);
  const title = formatEntity(rule.applicable_entity_type);

  return (
    <>
      <header className="flex items-start justify-between border-b border-hair px-6 py-5">
        <div>
          <div className="flex items-center gap-2">
            <span className="font-mono text-sm font-semibold text-gold tnum">
              {formatClause(rule.clause_id)}
            </span>
            {rule.status === "superseded" && (
              <span className="rounded bg-na-bg px-1.5 py-0.5 text-[10px] font-medium uppercase tracking-wide text-na-text">
                Superseded
              </span>
            )}
          </div>
          <h2 className="mt-1 font-serif text-xl leading-snug text-ink">
            {title}
          </h2>
        </div>
        <button
          onClick={onClose}
          className="rounded p-1 text-muted transition-colors hover:bg-canvas hover:text-ink"
          aria-label="Close"
        >
          <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
            <path d="M4 4l10 10M14 4L4 14" stroke="currentColor" strokeWidth="1.5" />
          </svg>
        </button>
      </header>

      <div className="flex-1 overflow-y-auto px-6 py-5">
        <Section label="Obligation">
          <p className="text-sm text-ink">{rule.plain_description}</p>
        </Section>

        <Section label="Condition">
          {rule.condition ? (
            <div className="rounded border border-hair bg-canvas px-3 py-2.5 font-mono text-xs text-ink">
              <span className="text-muted">{rule.condition.field}</span>{" "}
              <span className="text-gold">{rule.condition.operator}</span>{" "}
              <span className="text-compliant-text">
                {JSON.stringify(rule.condition.value)}
              </span>
            </div>
          ) : (
            <div className="rounded border border-gold/30 bg-gold/10 px-3 py-2.5 text-xs text-ink">
              Not machine-checkable
            </div>
          )}
        </Section>

        {rule.threshold && <ThresholdBlock threshold={rule.threshold} />}

        {rule.source_text_span && (
          <SourceCallout
            text={rule.source_text_span}
            clause={formatClause(rule.clause_id)}
            circular={rule.source_circular_id}
          />
        )}

        <div className="grid grid-cols-2 gap-4">
          <Section label="Confidence">
            <ConfidenceBar value={rule.confidence} />
          </Section>
          <Section label="Effective from">
            <span className="font-mono text-sm text-ink tnum">
              {formatDate(rule.effective_from)}
            </span>
          </Section>
        </div>

        {rule.needs_human_review && (
          <div className="mb-5 rounded border border-gold/30 bg-gold/10 px-3 py-2.5">
            <div className="label-caps mb-1 text-gold">Review required</div>
            <p className="text-xs text-ink">{rule.review_reason ?? "Officer verification required."}</p>
          </div>
        )}

        <Section label="Required action">
          <p className="text-sm text-ink">{rule.required_action}</p>
        </Section>

        <Section label={`Firms (${related.length})`}>
          <div className="space-y-1.5">
            {related.map((c) => {
              const firm = firmById.get(c.firm_id);
              if (!firm) return null;
              return (
                <div
                  key={c.firm_id}
                  className="flex items-center justify-between rounded border border-hair bg-canvas px-3 py-2"
                >
                  <span className="text-sm text-ink">{firm.name}</span>
                  <StatusBadge status={c.status} />
                </div>
              );
            })}
          </div>
        </Section>
      </div>
    </>
  );
}

export function SourceCallout({
  text,
  clause,
  circular,
}: {
  text: string;
  clause: string;
  circular?: string;
}) {
  return (
    <div className="mb-5 overflow-hidden rounded-card border border-gold/20 border-l-[3px] border-l-gold bg-gold/[0.06]">
      <div className="flex items-center gap-2 border-b border-gold/15 px-4 py-2">
        <svg className="h-3.5 w-3.5 text-gold-700" viewBox="0 0 16 16" fill="currentColor">
          <path d="M5.5 3C3.6 3 2 4.6 2 6.5c0 1.7 1.2 3.1 2.8 3.4-.1 1.3-.7 2.2-1.8 2.8l.6 1.3c2.1-1 3.4-2.8 3.4-5.6V6.5C7 4.6 5.4 3 5.5 3zm7 0C10.6 3 9 4.6 9 6.5c0 1.7 1.2 3.1 2.8 3.4-.1 1.3-.7 2.2-1.8 2.8l.6 1.3c2.1-1 3.4-2.8 3.4-5.6V6.5C14 4.6 12.4 3 12.5 3z" />
        </svg>
        <span className="text-[11px] font-semibold uppercase tracking-[0.12em] text-gold">
          Source citation
        </span>
      </div>
      <div className="px-4 py-3">
        <blockquote className="font-mono text-[12.5px] leading-relaxed text-ink">
          {text}
        </blockquote>
        <div className="mt-2 flex items-center gap-2 font-mono text-[10px] text-muted">
          <span className="rounded bg-canvas px-1.5 py-0.5 tnum">{clause}</span>
          {circular && <span className="truncate tnum">{circular}</span>}
        </div>
      </div>
    </div>
  );
}

function ThresholdBlock({ threshold }: { threshold: NonNullable<Rule["threshold"]> }) {
  const rows: [string, string][] = [];
  if (threshold.static_band_pct != null) rows.push(["Fixed band", `±${threshold.static_band_pct}%`]);
  if (threshold.dynamic_band_pct != null) rows.push(["Dynamic band", `±${threshold.dynamic_band_pct}%`]);
  if (threshold.flex_pct != null) rows.push(["Flex", `+${threshold.flex_pct}%`]);
  if (threshold.max_flexes != null) rows.push(["Max flexes", String(threshold.max_flexes)]);
  if (threshold.trigger_pct != null) rows.push(["Trigger", `${threshold.trigger_pct}%`]);
  if (threshold.cooling_off_trigger_pct != null)
    rows.push(["Cooling-off trigger", `${threshold.cooling_off_trigger_pct}%`]);
  if (threshold.cooling_off_minutes != null)
    rows.push(["Cooling-off period", `${threshold.cooling_off_minutes} min`]);
  if (threshold.cooling_off_minutes_last_30 != null)
    rows.push(["Cooling-off (last 30 min)", `${threshold.cooling_off_minutes_last_30} min`]);
  if (threshold.dpl_pct != null) rows.push(["DPL limit", `±${threshold.dpl_pct}%`]);
  if (threshold.dpl_relaxation_step_pct != null)
    rows.push(["DPL relaxation step", `+${threshold.dpl_relaxation_step_pct}%`]);
  rows.push(["Uncapped", threshold.uncapped ? "Yes" : "No"]);

  return (
    <Section label="Thresholds">
      <div className="grid grid-cols-2 gap-x-6 gap-y-1.5 rounded border border-hair bg-canvas px-3 py-2.5">
        {rows.map(([k, v]) => (
          <div key={k} className="flex items-center justify-between">
            <span className="text-xs text-muted">{k}</span>
            <span className="font-mono text-xs font-medium text-ink tnum">{v}</span>
          </div>
        ))}
      </div>
    </Section>
  );
}

function Section({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="mb-5">
      <div className="label-caps mb-2">{label}</div>
      {children}
    </div>
  );
}
