import type { Cell, CellStatus, Firm, Matrix, Rule } from "../types";
import { STATUS_META, formatClause, formatEntity } from "../lib/status";

interface Props {
  matrix: Matrix;
  recalcKey: number;
  selectedRuleId: string | null;
  onSelectRule: (rule: Rule) => void;
}

export function MatrixView({ matrix, recalcKey, selectedRuleId, onSelectRule }: Props) {
  const { firms, rules, cells } = matrix;

  const lookup = new Map<string, Cell>();
  for (const c of cells) lookup.set(`${c.firm_id}:${c.rule_id}`, c);

  return (
    <div className="card overflow-hidden">
      <div className="flex items-center justify-between border-b border-hair px-5 py-3.5">
        <div>
          <h2 className="font-serif text-lg text-navy">Compliance Matrix</h2>
          <p className="text-xs text-muted">
            Firms evaluated against active obligations · deterministic engine
          </p>
        </div>
        <Legend />
      </div>

      <div className="overflow-x-auto">
        <table className="w-full border-collapse">
          <thead>
            <tr>
              <th className="sticky left-0 z-10 min-w-[220px] border-b border-r border-hair bg-surface px-5 py-3 text-left">
                <span className="label-caps">Firm</span>
              </th>
              {rules.map((r) => (
                <th
                  key={r.rule_id}
                  onClick={() => onSelectRule(r)}
                  className={`min-w-[130px] cursor-pointer border-b border-hair px-3 py-3 text-left align-bottom transition-colors hover:bg-canvas ${
                    selectedRuleId === r.rule_id ? "bg-canvas" : ""
                  }`}
                >
                  <div className="font-mono text-xs font-semibold text-navy tnum">
                    {formatClause(r.clause_id)}
                  </div>
                  <div className="mt-0.5 text-[11px] leading-tight text-muted">
                    {formatEntity(r.applicable_entity_type)}
                  </div>
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
                onSelectRule={onSelectRule}
              />
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function FirmRow({
  firm,
  rules,
  lookup,
  recalcKey,
  onSelectRule,
}: {
  firm: Firm;
  rules: Rule[];
  lookup: Map<string, Cell>;
  recalcKey: number;
  onSelectRule: (rule: Rule) => void;
}) {
  return (
    <tr className="group">
      <td className="sticky left-0 z-10 border-b border-r border-hair bg-surface px-5 py-3 group-hover:bg-canvas">
        <div className="font-medium text-ink">{firm.name}</div>
        <div className="font-mono text-[11px] text-muted">
          {firm.profile.base_price_method ?? "—"}
        </div>
      </td>
      {rules.map((rule) => {
        const cell = lookup.get(`${firm.id}:${rule.rule_id}`);
        const status: CellStatus = cell?.status ?? "not_applicable";
        const m = STATUS_META[status];
        return (
          <td
            key={rule.rule_id}
            onClick={() => onSelectRule(rule)}
            className="border-b border-hair p-1.5 align-middle"
          >
            <div
              key={`${status}-${recalcKey}`}
              className={`cell-recalc flex h-14 cursor-pointer flex-col items-center justify-center rounded ${m.cell} transition-colors`}
            >
              <span className="font-mono text-xs font-semibold tracking-wide">
                {m.short}
              </span>
            </div>
          </td>
        );
      })}
    </tr>
  );
}

function Legend() {
  const items: CellStatus[] = ["compliant", "breach", "not_applicable"];
  return (
    <div className="flex items-center gap-4">
      {items.map((s) => (
        <div key={s} className="flex items-center gap-1.5">
          <span className={`h-2.5 w-2.5 rounded-sm ${STATUS_META[s].dot}`} />
          <span className="text-xs text-muted">{STATUS_META[s].label}</span>
        </div>
      ))}
    </div>
  );
}
