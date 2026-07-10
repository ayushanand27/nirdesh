import { useEffect } from "react";
import type { Cell, Firm, Rule } from "../types";
import { ConfidenceBar } from "./ConfidenceBar";
import { StatusBadge } from "./StatusBadge";
import { formatRuleCheck } from "../lib/displayValue";
import { isDuplicateText } from "../lib/textSimilarity";
import { formatClause, formatDate, formatEntity } from "../lib/status";

interface Props {
  rule: Rule | null;
  firms: Firm[];
  cells: Cell[];
  focusFirmId?: number | null;
  onClose: () => void;
}

export function RuleDrawer({ rule, firms, cells, focusFirmId, onClose }: Props) {
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
        className={`fixed right-0 top-0 z-40 flex h-full w-full max-w-[440px] flex-col bg-surface shadow-drawer transition-transform duration-300 ease-precise ${
          open ? "translate-x-0" : "translate-x-full"
        }`}
      >
        {rule && (
          <RuleDetail
            rule={rule}
            firms={firms}
            cells={cells}
            focusFirmId={focusFirmId}
            onClose={onClose}
          />
        )}
      </aside>
    </>
  );
}

function RuleDetail({
  rule,
  firms,
  cells,
  focusFirmId,
  onClose,
}: {
  rule: Rule;
  firms: Firm[];
  cells: Cell[];
  focusFirmId?: number | null;
  onClose: () => void;
}) {
  const firmById = new Map(firms.map((f) => [f.id, f]));
  const related = cells.filter((c) => c.rule_id === rule.rule_id);
  const title = formatEntity(rule.applicable_entity_type);
  const summary = rule.plain_label ?? rule.plain_description;
  const showSummary =
    summary && !isDuplicateText(summary, rule.source_text_span) && !isDuplicateText(summary, rule.required_action);
  const showRemediation =
    rule.required_action &&
    !isDuplicateText(rule.required_action, rule.plain_description) &&
    !isDuplicateText(rule.required_action, rule.source_text_span);

  const firmRows = focusFirmId
    ? related.filter((c) => c.firm_id === focusFirmId)
    : related;

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
          <h2 className="mt-1 font-serif text-xl leading-snug text-ink">{title}</h2>
          {showSummary && <p className="mt-1.5 text-xs leading-relaxed text-muted">{summary}</p>}
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
        {rule.source_text_span && (
          <SourceCallout
            text={rule.source_text_span}
            clause={formatClause(rule.clause_id)}
            circular={rule.source_circular_id}
            compact
          />
        )}

        <div className="mb-5 grid grid-cols-2 gap-4">
          <MetaItem label="Effective from" value={formatDate(rule.effective_from)} />
          <div>
            <div className="label-caps mb-1.5">Confidence</div>
            <ConfidenceBar value={rule.confidence} />
          </div>
        </div>

        {(rule.condition || (rule.threshold && !rule.condition)) && (
          <Section label="Evaluates as">
            {rule.condition && formatRuleCheck(rule) && (
              <p className="rounded border border-hair bg-canvas px-3 py-2.5 text-sm text-ink">
                {formatRuleCheck(rule)}
              </p>
            )}
            {rule.threshold && !rule.condition && (
              <ThresholdGrid threshold={rule.threshold} />
            )}
          </Section>
        )}

        {!rule.condition && !rule.threshold && (
          <div className="mb-5 rounded border border-gold/30 bg-gold/10 px-3 py-2.5 text-xs text-ink">
            Not machine-checkable — officer verification required.
          </div>
        )}

        {showRemediation && (
          <Section label="Remediation">
            <p className="text-sm text-ink">{rule.required_action}</p>
          </Section>
        )}

        {rule.needs_human_review && (
          <div className="mb-5 rounded border border-gold/30 bg-gold/10 px-3 py-2.5">
            <div className="label-caps mb-1 text-gold">Extraction review</div>
            <p className="text-xs text-ink">{rule.review_reason ?? "Officer verification required."}</p>
          </div>
        )}

        {firmRows.length > 0 && (
          <Section label={focusFirmId ? "Firm status" : `Applicability (${firmRows.length})`}>
            <div className="space-y-1.5">
              {firmRows.map((c) => {
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
        )}
      </div>
    </>
  );
}

export function SourceCallout({
  text,
  clause,
  circular,
  compact = false,
}: {
  text: string;
  clause: string;
  circular?: string;
  compact?: boolean;
}) {
  return (
    <div
      className={`mb-5 overflow-hidden rounded-card border border-gold/20 border-l-[3px] border-l-gold bg-gold/[0.06] ${
        compact ? "" : ""
      }`}
    >
      <div className="flex items-center gap-2 border-b border-gold/15 px-4 py-2">
        <span className="text-[11px] font-semibold uppercase tracking-[0.12em] text-gold">
          Regulatory text
        </span>
        <span className="ml-auto font-mono text-[10px] text-muted tnum">{clause}</span>
      </div>
      <div className="px-4 py-3">
        <blockquote className="text-[13px] leading-relaxed text-ink">{text}</blockquote>
        {circular && !compact && (
          <div className="mt-2 truncate font-mono text-[10px] text-muted tnum">{circular}</div>
        )}
      </div>
    </div>
  );
}

function ThresholdGrid({ threshold }: { threshold: NonNullable<Rule["threshold"]> }) {
  const rows: [string, string][] = [];
  if (threshold.static_band_pct != null) rows.push(["Fixed band", `±${threshold.static_band_pct}%`]);
  if (threshold.dynamic_band_pct != null) rows.push(["Dynamic band", `±${threshold.dynamic_band_pct}%`]);
  if (threshold.flex_pct != null) rows.push(["Flex", `+${threshold.flex_pct}%`]);
  if (threshold.max_flexes != null) rows.push(["Max flexes", String(threshold.max_flexes)]);
  if (threshold.cooling_off_trigger_pct != null)
    rows.push(["Cooling-off trigger", `${threshold.cooling_off_trigger_pct}%`]);
  if (threshold.cooling_off_minutes != null)
    rows.push(["Cooling-off period", `${threshold.cooling_off_minutes} min`]);
  if (threshold.cooling_off_minutes_last_30 != null)
    rows.push(["Cooling-off (last 30 min)", `${threshold.cooling_off_minutes_last_30} min`]);
  if (threshold.dpl_pct != null) rows.push(["DPL limit", `±${threshold.dpl_pct}%`]);
  if (threshold.dpl_relaxation_step_pct != null)
    rows.push(["DPL relaxation step", `+${threshold.dpl_relaxation_step_pct}%`]);
  if (threshold.uncapped) rows.push(["Uncapped", "Yes"]);

  if (rows.length === 0) return null;

  return (
    <div className="grid grid-cols-2 gap-x-6 gap-y-1.5 rounded border border-hair bg-canvas px-3 py-2.5">
      {rows.map(([k, v]) => (
        <div key={k} className="flex items-center justify-between gap-2">
          <span className="text-xs text-muted">{k}</span>
          <span className="font-mono text-xs font-medium text-ink tnum">{v}</span>
        </div>
      ))}
    </div>
  );
}

function MetaItem({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <div className="label-caps mb-1">{label}</div>
      <span className="font-mono text-sm text-ink tnum">{value}</span>
    </div>
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
