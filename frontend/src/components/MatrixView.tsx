import { useCallback, useEffect, useRef, useState } from "react";
import type { Cell, CellStatus, Firm, Matrix, Rule } from "../types";
import { STATUS_META, formatClause, formatEntity } from "../lib/status";
import { SourcePopover } from "./SourcePopover";

type ViewMode = "simple" | "technical";

interface Props {
  matrix: Matrix;
  recalcKey: number;
  selectedRuleId: string | null;
  onSelectRule: (rule: Rule) => void;
}

export function MatrixView({ matrix, recalcKey, selectedRuleId, onSelectRule }: Props) {
  const { firms, rules, cells } = matrix;
  const [mode, setMode] = useState<ViewMode>("simple");
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

  const activeRule = popover
    ? rules.find((r) => popover.key.endsWith(`:${r.rule_id}`))
    : null;

  return (
    <div className="card-primary overflow-hidden">
      <div className="flex items-center justify-between border-b border-hair/30 px-5 py-4">
        <div>
          <h2 className="font-serif text-lg text-ink">Compliance Matrix</h2>
          <p className="text-[11px] text-muted/80">
            Firms evaluated against active obligations
          </p>
        </div>
        <div className="flex items-center gap-4">
          <Legend />
          <ModeToggle mode={mode} onChange={setMode} />
        </div>
      </div>

      <div className="overflow-x-auto">
        <table
          className={`w-full border-collapse ${
            mode === "technical"
              ? '[font-family:"Courier_New",ui-monospace,monospace]'
              : "font-sans"
          }`}
        >
          <thead>
            <tr>
              <th
                className={`sticky left-0 z-10 min-w-[220px] border-b border-r bg-elevated/30 text-left ${
                  mode === "technical"
                    ? "border-hair/45 px-4 py-2.5"
                    : "border-hair/25 px-5 py-4"
                }`}
              >
                <span className="label-caps">Firm</span>
              </th>
              {rules.map((r) => (
                <th
                  key={r.rule_id}
                  onClick={() => onSelectRule(r)}
                  className={`min-w-[130px] cursor-pointer border-b text-left align-bottom transition-colors hover:bg-elevated/50 ${
                    selectedRuleId === r.rule_id ? "bg-elevated/50" : ""
                  } ${mode === "technical" ? "border-hair/45 px-2.5 py-2.5" : "border-hair/25 px-3 py-4"} ${
                    mode === "technical"
                      ? '[font-family:"Courier_New",ui-monospace,monospace]'
                      : ""
                  }`}
                >
                  {mode === "simple" ? (
                    <div className="relative pr-10">
                      <div className="text-sm font-semibold leading-tight text-ink">
                        {r.plain_label ?? formatEntity(r.applicable_entity_type)}
                      </div>
                      <div className="mt-1 text-[11px] leading-tight text-muted/80">
                        {formatEntity(r.applicable_entity_type)}
                      </div>
                      <div className="absolute right-0 top-0 inline-flex rounded-full bg-gold/12 px-2 py-0.5 font-mono text-[9px] text-gold">
                        {formatClause(r.clause_id)}
                      </div>
                    </div>
                  ) : (
                    <>
                      <div className='text-xs font-semibold uppercase tracking-[0.08em] text-gold [font-family:"Courier_New",ui-monospace,monospace]'>
                        {formatClause(r.clause_id)}
                      </div>
                      <div className='mt-1 text-[10px] uppercase leading-tight text-muted [font-family:"Courier_New",ui-monospace,monospace]'>
                        {formatEntity(r.applicable_entity_type)}
                      </div>
                    </>
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
                onSelectRule={onSelectRule}
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
  onSelectRule,
  onShowPopover,
  onScheduleHide,
}: {
  firm: Firm;
  rules: Rule[];
  lookup: Map<string, Cell>;
  recalcKey: number;
  mode: ViewMode;
  popoverKey: string | null;
  onSelectRule: (rule: Rule) => void;
  onShowPopover: (key: string, anchor: HTMLElement) => void;
  onScheduleHide: () => void;
}) {
  return (
    <tr className="group">
      <td
        className={`sticky left-0 z-10 border-b border-r bg-elevated/20 group-hover:bg-elevated/40 ${
          mode === "technical"
            ? "border-hair/45 px-4 py-2.5"
            : "border-hair/25 px-5 py-4"
        }`}
      >
        <div className="font-medium text-ink">{firm.name}</div>
        <div
          className={`text-[11px] text-muted/70 ${
            mode === "technical" ? '[font-family:"Courier_New",ui-monospace,monospace]' : "font-mono"
          }`}
        >
          {firm.profile.base_price_method ?? "—"}
        </div>
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
            statusKey={status}
            meta={m}
            mode={mode}
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
              if (popoverKey === cellKey) {
                onScheduleHide();
              } else {
                onShowPopover(cellKey, el);
              }
            }}
          />
        );
      })}
    </tr>
  );
}

function MatrixCell({
  statusKey,
  status,
  meta,
  mode,
  recalcKey,
  isPopoverOpen,
  hasSource,
  onSelect,
  onHover,
  onHoverEnd,
  onTouchTap,
}: {
  statusKey: CellStatus;
  status: CellStatus;
  meta: (typeof STATUS_META)[CellStatus];
  mode: ViewMode;
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
        mode === "technical" ? "border-hair/45 p-1" : "border-hair/25 p-1.5"
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
          mode === "technical" ? "h-12 px-1" : "h-16 px-2"
        }`}
        key={`${status}-${recalcKey}`}
      >
        {mode === "simple" ? (
          <div className="flex items-center gap-1.5 text-[11px] font-semibold">
            <StatusIcon status={statusKey} />
            <span>{meta.label}</span>
          </div>
        ) : (
          <span className='text-xs font-semibold uppercase tracking-[0.08em] [font-family:"Courier_New",ui-monospace,monospace]'>
            {meta.short}
          </span>
        )}
      </div>
    </td>
  );
}

function ModeToggle({ mode, onChange }: { mode: ViewMode; onChange: (mode: ViewMode) => void }) {
  return (
    <div className="flex items-center rounded border border-gold/20 bg-canvas/80 p-0.5">
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
        <path d="M3 8.5l3 3 7-7" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    );
  }
  if (status === "breach") {
    return (
      <svg className="h-3.5 w-3.5" viewBox="0 0 16 16" fill="none">
        <path d="M8 2.5L14 13H2L8 2.5z" stroke="currentColor" strokeWidth="1.4" strokeLinejoin="round" />
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
          <span className="text-[11px] text-muted/80">{STATUS_META[s].label}</span>
        </div>
      ))}
    </div>
  );
}
