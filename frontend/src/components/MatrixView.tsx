import { useCallback, useEffect, useRef, useState } from "react";
import type { Cell, CellDetail, CellStatus, Firm, Matrix, Rule } from "../types";
import { STATUS_META, formatClause, formatDate, formatEntity } from "../lib/status";
import { SourcePopover } from "./SourcePopover";

type ViewMode = "simple" | "technical";

interface Props {
  matrix: Matrix;
  recalcKey: number;
  flaggedRules: Rule[];
  asOf: string;
  phase2Date: string;
  selectedRuleId: string | null;
  selectedFirmId: number | null;
  onSelectRule: (rule: Rule) => void;
  onSelectFirm: (firm: Firm) => void;
}

export function MatrixView({
  matrix,
  recalcKey,
  flaggedRules,
  asOf,
  phase2Date,
  selectedRuleId,
  selectedFirmId,
  onSelectRule,
  onSelectFirm,
}: Props) {
  const { firms, rules, cells } = matrix;
  const [mode, setMode] = useState<ViewMode>("simple");
  const [showFlags, setShowFlags] = useState(false);
  const flagRef = useRef<HTMLDivElement>(null);
  const [popover, setPopover] = useState<{ key: string; anchor: HTMLElement } | null>(null);
  const hideTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const lookup = new Map<string, Cell>();
  for (const c of cells) lookup.set(`${c.firm_id}:${c.rule_id}`, c);

  const clearHideTimer = () => {
    if (hideTimer.current) {
      clearTimeout(hideTimer.current);
      hideTimer.current = null;
    }
  };

  const showPopover = (key: string, anchor: HTMLElement) => {
    clearHideTimer();
    setPopover({ key, anchor });
  };

  const scheduleHide = () => {
    clearHideTimer();
    hideTimer.current = setTimeout(() => setPopover(null), 120);
  };

  const closePopover = useCallback(() => {
    clearHideTimer();
    setPopover(null);
  }, []);

  useEffect(() => {
    const onDocClick = () => closePopover();
    document.addEventListener("click", onDocClick);
    return () => document.removeEventListener("click", onDocClick);
  }, [closePopover]);

  useEffect(() => {
    if (!showFlags) return;
    const onDoc = (e: MouseEvent) => {
      if (flagRef.current && !flagRef.current.contains(e.target as Node)) {
        setShowFlags(false);
      }
    };
    document.addEventListener("click", onDoc);
    return () => document.removeEventListener("click", onDoc);
  }, [showFlags]);

  const activeRule = popover
    ? rules.find((r) => popover.key.endsWith(`:${r.rule_id}`))
    : null;

  return (
    <div className="card-primary overflow-hidden">
      <div className="flex items-center justify-between border-b border-hair/40 px-5 py-4">
        <div>
          <h2 className="font-serif text-lg text-ink">Compliance Matrix</h2>
          <div className="mt-1 flex flex-wrap items-center gap-2">
            <p className="text-[11px] text-muted">
              {mode === "simple"
                ? "Plain-English posture across funds · click a firm for its case file"
                : "Machine fields · thresholds · actual vs expected · click a firm for case file"}
            </p>
            {flaggedRules.length > 0 && (
              <div className="relative" ref={flagRef}>
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    setShowFlags((v) => !v);
                  }}
                  className="inline-flex items-center gap-1 rounded border border-gold-700/40 bg-gold-700/20 px-2 py-0.5 text-[11px] font-medium text-gold transition-colors hover:bg-gold-700/30"
                >
                  <span aria-hidden>⚠</span>
                  {flaggedRules.length} flagged for review
                </button>
                {showFlags && (
                  <div className="absolute left-0 top-full z-20 mt-1.5 w-[340px] overflow-hidden rounded-card border border-gold/25 bg-elevated shadow-drawer">
                    <div className="border-b border-gold/15 px-3 py-2">
                      <div className="text-[10px] font-semibold uppercase tracking-[0.1em] text-gold">
                        Flagged for human review
                      </div>
                      <p className="mt-0.5 text-[10px] text-muted">
                        Extraction stayed honest — these couldn&apos;t be auto-checked.
                      </p>
                    </div>
                    <ul className="divide-y divide-hair/40">
                      {flaggedRules.map((r) => (
                        <li key={r.rule_id} className="px-3 py-2.5">
                          <div className="flex items-center gap-2">
                            <span className="text-xs font-medium text-ink">
                              {r.plain_label ?? formatEntity(r.applicable_entity_type)}
                            </span>
                            <span className="font-mono text-[9px] text-muted">
                              {formatClause(r.clause_id)}
                            </span>
                          </div>
                          <p className="mt-1 text-[11px] leading-relaxed text-muted">
                            {r.review_reason ?? "Requires Compliance Officer verification."}
                          </p>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
        <div className="flex items-center gap-4">
          <Legend />
          <ModeToggle mode={mode} onChange={setMode} />
        </div>
      </div>

      {asOf === phase2Date && (
        <div className="border-b border-gold/20 bg-gold/5 px-5 py-2">
          <span className="inline-flex items-center gap-1.5 rounded border border-gold/30 bg-gold-700/20 px-2.5 py-1 text-[11px] font-medium text-gold">
            Viewing future rules — effective {formatDate(phase2Date)}
          </span>
        </div>
      )}

      <div className="overflow-x-auto">
        <table
          className={`w-full border-collapse ${
            mode === "technical" ? "font-mono" : "font-sans"
          }`}
        >
          <thead>
            <tr>
              <th
                className={`sticky left-0 z-10 min-w-[220px] border-b border-r bg-elevated/40 text-left ${
                  mode === "technical"
                    ? "border-hair/60 px-3 py-2"
                    : "border-hair/30 px-5 py-4"
                }`}
              >
                <span className="label-caps">Firm</span>
              </th>
              {rules.map((r) => (
                <th
                  key={r.rule_id}
                  onClick={() => onSelectRule(r)}
                  className={`min-w-[140px] cursor-pointer border-b text-left align-bottom transition-colors hover:bg-elevated/50 ${
                    selectedRuleId === r.rule_id ? "bg-elevated/50" : ""
                  } ${
                    mode === "technical"
                      ? "border-hair/60 px-2 py-2"
                      : "border-hair/30 px-3 py-4"
                  }`}
                >
                  {mode === "simple" ? (
                    <div className="relative pr-10">
                      <div className="text-sm font-semibold leading-tight text-ink">
                        {r.plain_label ?? formatEntity(r.applicable_entity_type)}
                      </div>
                      <div className="mt-1 text-[11px] leading-tight text-muted">
                        Applies to {formatEntity(r.applicable_entity_type)}
                      </div>
                      <div className="absolute right-0 top-0 inline-flex rounded-full bg-gold/12 px-2 py-0.5 font-mono text-[9px] text-gold">
                        {formatClause(r.clause_id)}
                      </div>
                    </div>
                  ) : (
                    <div>
                      <div className="text-[11px] font-semibold uppercase tracking-[0.08em] text-gold">
                        {formatClause(r.clause_id)}
                      </div>
                      <div className="mt-1 text-[10px] leading-tight text-ink/80">
                        {technicalField(r)}
                      </div>
                      <div className="mt-0.5 text-[9px] text-muted">
                        {thresholdSummary(r)}
                      </div>
                    </div>
                  )}
                  {r.needs_human_review && (
                    <div className="mt-1 inline-block rounded bg-gold/12 px-1 py-0.5 text-[9px] font-medium uppercase tracking-wide text-gold-700">
                      Review
                    </div>
                  )}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {firms.map((firm) => (
              <FirmRow
                key={firm.id}
                firm={firm}
                rules={rules}
                lookup={lookup}
                recalcKey={recalcKey}
                mode={mode}
                popoverKey={popover?.key ?? null}
                selected={selectedFirmId === firm.id}
                onSelectRule={onSelectRule}
                onSelectFirm={onSelectFirm}
                onShowPopover={showPopover}
                onScheduleHide={scheduleHide}
              />
            ))}
          </tbody>
        </table>
      </div>

      {activeRule?.source_text_span && popover && (
        <SourcePopover
          anchorEl={popover.anchor}
          open
          text={activeRule.source_text_span}
          clause={formatClause(activeRule.clause_id)}
          onClose={closePopover}
          onViewFull={() => onSelectRule(activeRule)}
        />
      )}
    </div>
  );
}

function FirmRow({
  firm,
  rules,
  lookup,
  recalcKey,
  mode,
  popoverKey,
  selected,
  onSelectRule,
  onSelectFirm,
  onShowPopover,
  onScheduleHide,
}: {
  firm: Firm;
  rules: Rule[];
  lookup: Map<string, Cell>;
  recalcKey: number;
  mode: ViewMode;
  popoverKey: string | null;
  selected: boolean;
  onSelectRule: (rule: Rule) => void;
  onSelectFirm: (firm: Firm) => void;
  onShowPopover: (key: string, anchor: HTMLElement) => void;
  onScheduleHide: () => void;
}) {
  return (
    <tr className="group">
      <td
        className={`sticky left-0 z-10 border-b border-r group-hover:bg-elevated/40 ${
          selected ? "bg-gold/10" : "bg-elevated/20"
        } ${mode === "technical" ? "border-hair/60 px-3 py-2" : "border-hair/30 px-5 py-4"}`}
      >
        <button
          type="button"
          onClick={() => onSelectFirm(firm)}
          className="text-left transition-colors hover:text-gold"
        >
          <div className="font-medium text-ink">{firm.name}</div>
        {mode === "simple" ? (
          <div className="mt-0.5 text-[11px] text-muted">{friendlyFirmType(firm)}</div>
        ) : (
          <div className="mt-1 space-y-0.5 font-mono text-[10px] text-muted">
            <div>base={firm.profile.base_price_method ?? "—"}</div>
            <div>type={firm.legal_type}</div>
          </div>
        )}
        </button>
      </td>
      {rules.map((rule) => {
        const cellKey = `${firm.id}:${rule.rule_id}`;
        const cell = lookup.get(cellKey);
        const status: CellStatus = cell?.status ?? "not_applicable";
        const m = STATUS_META[status];
        const isTouch = () =>
          typeof window !== "undefined" && window.matchMedia("(hover: none)").matches;

        return (
          <MatrixCell
            key={rule.rule_id}
            status={status}
            meta={m}
            mode={mode}
            detail={cell?.detail}
            recalcKey={recalcKey}
            isPopoverOpen={popoverKey === cellKey}
            hasSource={Boolean(rule.source_text_span)}
            onSelect={() => onSelectRule(rule)}
            onHover={(el) => {
              if (!rule.source_text_span || isTouch()) return;
              onShowPopover(cellKey, el);
            }}
            onHoverEnd={() => {
              if (!isTouch()) onScheduleHide();
            }}
            onTouchTap={(el) => {
              if (!rule.source_text_span) {
                onSelectRule(rule);
                return;
              }
              if (popoverKey === cellKey) onScheduleHide();
              else onShowPopover(cellKey, el);
            }}
          />
        );
      })}
    </tr>
  );
}

function MatrixCell({
  status,
  meta,
  mode,
  detail,
  recalcKey,
  isPopoverOpen,
  hasSource,
  onSelect,
  onHover,
  onHoverEnd,
  onTouchTap,
}: {
  status: CellStatus;
  meta: (typeof STATUS_META)[CellStatus];
  mode: ViewMode;
  detail?: CellDetail;
  recalcKey: number;
  isPopoverOpen: boolean;
  hasSource: boolean;
  onSelect: () => void;
  onHover: (el: HTMLElement) => void;
  onHoverEnd: () => void;
  onTouchTap: (el: HTMLElement) => void;
}) {
  const ref = useRef<HTMLDivElement>(null);

  return (
    <td
      className={`border-b align-middle ${
        mode === "technical" ? "border-hair/60 p-1" : "border-hair/30 p-1.5"
      }`}
    >
      <div
        ref={ref}
        onClick={(e) => {
          e.stopPropagation();
          if (window.matchMedia("(hover: none)").matches) {
            if (ref.current) onTouchTap(ref.current);
          } else {
            onSelect();
          }
        }}
        onMouseEnter={() => {
          if (ref.current) onHover(ref.current);
        }}
        onMouseLeave={onHoverEnd}
        className={`cell-recalc flex cursor-pointer flex-col items-center justify-center rounded text-center transition-colors ${meta.cell} ${
          isPopoverOpen ? "ring-1 ring-gold/40" : ""
        } ${hasSource ? "hover:brightness-110" : ""} ${
          mode === "technical" ? "min-h-[52px] px-1.5 py-1.5" : "h-16 px-2"
        }`}
        key={`${status}-${recalcKey}`}
      >
        {mode === "simple" ? (
          <div className="flex items-center gap-1.5 text-[11px] font-semibold">
            <StatusIcon status={status} />
            <span>{meta.label}</span>
          </div>
        ) : (
          <>
            <span className="text-[11px] font-semibold uppercase tracking-[0.08em]">
              {meta.short}
            </span>
            <span className="mt-0.5 max-w-[120px] truncate text-[9px] leading-tight opacity-80">
              {technicalCellLine(detail, status)}
            </span>
          </>
        )}
      </div>
    </td>
  );
}

function ModeToggle({ mode, onChange }: { mode: ViewMode; onChange: (mode: ViewMode) => void }) {
  return (
    <div className="flex items-center rounded border border-gold/25 bg-canvas p-0.5">
      {(["simple", "technical"] as const).map((option) => (
        <button
          key={option}
          onClick={() => onChange(option)}
          className={`rounded px-2.5 py-1 text-xs font-medium transition-colors ${
            mode === option
              ? "bg-gold text-canvas hover:bg-gold-400"
              : "text-muted hover:text-ink"
          }`}
        >
          {option === "simple" ? "Simple" : "Technical"}
        </button>
      ))}
    </div>
  );
}

function StatusIcon({ status }: { status: CellStatus }) {
  if (status === "compliant") {
    return (
      <svg className="h-3.5 w-3.5" viewBox="0 0 16 16" fill="none">
        <path
          d="M3 8.5l3 3 7-7"
          stroke="currentColor"
          strokeWidth="1.8"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    );
  }
  if (status === "breach") {
    return (
      <svg className="h-3.5 w-3.5" viewBox="0 0 16 16" fill="none">
        <path
          d="M8 2.5L14 13H2L8 2.5z"
          stroke="currentColor"
          strokeWidth="1.4"
          strokeLinejoin="round"
        />
        <path d="M8 6v3.2" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
        <circle cx="8" cy="11.4" r="0.8" fill="currentColor" />
      </svg>
    );
  }
  return <span className="text-sm leading-none">-</span>;
}

function Legend() {
  const items: CellStatus[] = ["compliant", "breach", "not_applicable"];
  return (
    <div className="flex items-center gap-4">
      {items.map((s) => (
        <div key={s} className="flex items-center gap-1.5">
          <span className={`h-2.5 w-2.5 rounded-sm ${STATUS_META[s].dot}`} />
          <span className="text-[11px] text-muted">{STATUS_META[s].label}</span>
        </div>
      ))}
    </div>
  );
}

function friendlyFirmType(firm: Firm): string {
  const types = firm.profile.offers_etf_types ?? [];
  if (types.length === 0) return "No ETF offerings";
  return types.map((t) => formatEntity(t)).join(", ");
}

function technicalField(rule: Rule): string {
  if (rule.condition?.field) return rule.condition.field;
  return "needs_human_review";
}

function thresholdSummary(rule: Rule): string {
  const t = rule.threshold;
  if (!t) return rule.condition ? `op=${rule.condition.operator}` : "no threshold";
  const parts: string[] = [];
  if (t.static_band_pct != null) parts.push(`±${t.static_band_pct}%`);
  if (t.dynamic_band_pct != null) parts.push(`dyn±${t.dynamic_band_pct}%`);
  if (t.flex_pct != null) parts.push(`flex+${t.flex_pct}%`);
  if (t.max_flexes != null) parts.push(`max${t.max_flexes}`);
  if (t.cooling_off_trigger_pct != null) parts.push(`cool@${t.cooling_off_trigger_pct}%`);
  if (t.dpl_pct != null) parts.push(`dpl±${t.dpl_pct}%`);
  if (t.uncapped) parts.push("uncapped");
  return parts.length ? parts.join(" · ") : "threshold set";
}

function technicalCellLine(detail: CellDetail | undefined, status: CellStatus): string {
  if (status === "not_applicable") return "out of scope";
  if (!detail) return "—";
  if (detail.actual != null && detail.expected != null) {
    const a = stringify(detail.actual);
    const e = stringify(detail.expected);
    if (a === e) return `actual=${a}`;
    return `${a} ≠ ${e}`;
  }
  if (detail.actual != null) return `actual=${stringify(detail.actual)}`;
  if (detail.reason) return detail.reason.slice(0, 28);
  return "checked";
}

function stringify(v: unknown): string {
  if (typeof v === "string") return v.length > 22 ? `${v.slice(0, 20)}…` : v;
  try {
    const s = JSON.stringify(v);
    return s.length > 22 ? `${s.slice(0, 20)}…` : s;
  } catch {
    return String(v);
  }
}
