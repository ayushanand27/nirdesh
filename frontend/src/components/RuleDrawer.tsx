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

  return (
    <>
      <div
        onClick={onClose}
        className={`fixed inset-0 z-30 bg-navy/20 transition-opacity duration-300 ease-precise ${
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

function RuleDetail({ rule, firms, cells, onClose }: { rule: Rule; firms: Firm[]; cells: Cell[]; onClose: () => void }) {
  const firmById = new Map(firms.map((f) => [f.id, f]));
  const related = cells.filter((c) => c.rule_id === rule.rule_id);

  return (
    <>
      <header className="flex items-start justify-between border-b border-hair px-6 py-5">
        <div>
          <div className="flex items-center gap-2">
            <span className="font-mono text-sm font-semibold text-navy tnum">
              {formatClause(rule.clause_id)}
            </span>
            {rule.status === "superseded" && (
              <span className="rounded bg-na-bg px-1.5 py-0.5 text-[10px] font-medium uppercase tracking-wide text-na-text">
                Superseded
              </span>
            )}
          </div>
          <h2 className="mt-1 font-serif text-xl leading-snug text-navy">
            {formatEntity(rule.applicable_entity_type)}
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
        <Section label="Plain-language obligation">
          <p className="text-sm leading-relaxed text-ink">{rule.plain_description}</p>
        </Section>

        <Section label="Extracted condition — machine-checkable">
          {rule.condition ? (
            <div className="rounded border border-hair bg-canvas px-3 py-2.5 font-mono text-xs text-ink">
              <span className="text-navy-400">{rule.condition.field}</span>{" "}
              <span className="text-accent">{rule.condition.operator}</span>{" "}
              <span className="text-compliant-text">
                {JSON.stringify(rule.condition.value)}
              </span>
            </div>
          ) : (
            <div className="rounded border border-accent/40 bg-accent/10 px-3 py-2.5 text-xs text-ink">
              No objectively checkable condition — routed to human review.
            </div>
          )}
        </Section>

        {rule.threshold && <ThresholdBlock threshold={rule.threshold} />}

        {rule.source_text_span && (
          <Section label="Source text — verbatim from circular">
            <blockquote className="border-l-2 border-navy bg-canvas px-3 py-2.5 font-mono text-[12px] leading-relaxed text-ink">
              “{rule.source_text_span}”
            </blockquote>
            <div className="mt-1.5 font-mono text-[10px] text-muted">
              {formatClause(rule.clause_id)} · {rule.source_circular_id}
            </div>
          </Section>
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
          <div className="mb-5 rounded border border-accent/40 bg-accent/10 px-3 py-2.5">
            <div className="label-caps mb-1 text-accent">Flagged for human review</div>
            <p className="text-xs text-ink">{rule.review_reason ?? "Requires officer verification."}</p>
          </div>
        )}

        <Section label="Required action">
          <p className="text-sm leading-relaxed text-ink">{rule.required_action}</p>
        </Section>

        <Section label={`Affected firms (${related.length})`}>
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

        <Section label="Source">
          <div className="font-mono text-[11px] leading-relaxed text-muted">
            {rule.source_circular_id}
          </div>
        </Section>
      </div>

      <footer className="border-t border-hair px-6 py-3">
        <p className="text-[11px] leading-relaxed text-muted">
          Decision-support only. All determinations are computed deterministically and
          require Compliance Officer sign-off before any action.
        </p>
      </footer>
    </>
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
