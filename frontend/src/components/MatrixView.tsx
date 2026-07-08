import { useCallback, useEffect, useRef, useState } from "react";
import type { Cell, CellStatus, Firm, Matrix, Rule } from "../types";
import { STATUS_META, formatClause, formatEntity } from "../lib/status";
import { SourcePopover } from "./SourcePopover";

type ViewMode = "simple" | "technical";

interface Props {
  matrix: Matrix;
  recalcKey: number;
  mode: ViewMode;
  selectedRuleId: string | null;
  onSelectRule: (rule: Rule) => void;
}

export function MatrixView({ matrix, recalcKey, mode, selectedRuleId, onSelectRule }: Props) {
  const { firms, rules, cells } = matrix;
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
        <Legend />
      </div>

      <div className="overflow-x-auto">
        <table className="w-full border-collapse">
          <thead>
            <tr>
              <th className="sticky left-0 z-10 min-w-[220px] border-b border-r border-hair/30 bg-elevated/30 px-5 py-3 text-left">
                <span className="label-caps">Firm</span>
              </th>
              {rules.map((r) => (
                <th
                  key={r.rule_id}
                  onClick={() => onSelectRule(r)}
                  className={`min-w-[130px] cursor-pointer border-b border-hair/30 px-3 py-3 text-left align-bottom transition-colors hover:bg-elevated/50 ${
                    selectedRuleId === r.rule_id ? "bg-elevated/50" : ""
                  }`}
                >
                  {mode === "simple" ? (
                    <>
                      <div className="text-xs font-semibold leading-tight text-ink">
                        {r.plain_label ?? formatEntity(r.applicable_entity_type)}
                      </div>
                      <div className="mt-1 inline-block rounded bg-canvas/80 px-1.5 py-0.5 font-mono text-[10px] text-muted tnum">
                        {formatClause(r.clause_id)}
                      </div>
                    </>
                  ) : (
                    <>
                      <div className="font-mono text-xs font-semibold text-ink tnum">
                        {formatClause(r.clause_id)}
                      </div>
                      <div className="mt-0.5 text-[11px] leading-tight text-muted">
                        {formatEntity(r.applicable_entity_type)}
                      </div>
                    </>
                  )}
                  {r.needs_human_review && (
                    <div className="mt-1 inline-block rounded bg-accent/15 px-1 py-0.5 text-[9px] font-medium uppercase tracking-wide text-accent">
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
      <td className="sticky left-0 z-10 border-b border-r border-hair/30 bg-elevated/20 px-5 py-3 group-hover:bg-elevated/40">
        <div className="font-medium text-ink">{firm.name}</div>
        <div className="font-mono text-[11px] text-muted/70">
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
    <td className="border-b border-hair/30 p-1.5 align-middle">
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
        className={`cell-recalc flex h-14 cursor-pointer flex-col items-center justify-center rounded px-1 text-center transition-colors ${meta.cell} ${
          isPopoverOpen ? "ring-1 ring-accent/40" : ""
        } ${hasSource ? "hover:brightness-110" : ""}`}
        key={`${status}-${recalcKey}`}
      >
        <span
          className={`font-semibold tracking-wide ${
            mode === "simple" ? "text-[11px]" : "font-mono text-xs"
          }`}
        >
          {mode === "simple" ? meta.label : meta.short}
        </span>
      </div>
    </td>
  );
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
