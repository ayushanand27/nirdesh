import { useEffect } from "react";
import type { Firm, Matrix, ReviewTask, Rule } from "../types";
import { formatComparison, firmProfileRows } from "../lib/displayValue";
import { formatClause, formatEntity } from "../lib/status";
import { StatusBadge } from "./StatusBadge";

interface Props {
  firm: Firm | null;
  matrix: Matrix | null;
  tasks: ReviewTask[];
  asOf: string;
  onClose: () => void;
  onOpenRule: (rule: Rule) => void;
}

export function FirmCaseDrawer({ firm, matrix, tasks, asOf, onClose, onOpenRule }: Props) {
  const open = firm !== null && matrix !== null;

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
        {firm && matrix && (
          <FirmCaseDetail
            firm={firm}
            matrix={matrix}
            tasks={tasks.filter((t) => t.firm_id === firm.id && t.as_of_date === asOf)}
            onClose={onClose}
            onOpenRule={onOpenRule}
          />
        )}
      </aside>
    </>
  );
}

function FirmCaseDetail({
  firm,
  matrix,
  tasks,
  onClose,
  onOpenRule,
}: {
  firm: Firm;
  matrix: Matrix;
  tasks: ReviewTask[];
  onClose: () => void;
  onOpenRule: (rule: Rule) => void;
}) {
  const rulesById = new Map(matrix.rules.map((r) => [r.rule_id, r]));
  const cells = matrix.cells.filter((c) => c.firm_id === firm.id);
  const breaches = cells.filter((c) => c.status === "breach");
  const compliant = cells.filter((c) => c.status === "compliant");

  return (
    <>
      <header className="flex items-start justify-between border-b border-hair px-6 py-4">
        <div>
          <h2 className="font-serif text-xl text-ink">{firm.name}</h2>
          <p className="mt-0.5 text-xs text-muted">
            {formatEntity(firm.profile.offers_etf_types ?? []) || "No ETFs"} · {firm.legal_type}
          </p>
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

      <div className="flex-1 overflow-y-auto px-6 py-4">
        <dl className="mb-5 space-y-1.5 rounded border border-hair bg-canvas px-3 py-2.5">
          {firmProfileRows(firm.profile).map((row) => (
            <div
              key={row.label}
              className="grid grid-cols-[minmax(7rem,auto)_1fr] gap-x-3 text-xs"
            >
              <dt className="text-muted">{row.label}</dt>
              <dd className="text-ink">{row.value}</dd>
            </div>
          ))}
        </dl>

        {breaches.length > 0 && (
          <Section label={`Breaches (${breaches.length})`}>
            <div className="space-y-2">
              {breaches.map((cell) => {
                const rule = rulesById.get(cell.rule_id);
                if (!rule) return null;
                return (
                  <div
                    key={cell.rule_id}
                    className="rounded border border-breach/25 bg-breach-bg/20 px-3 py-2.5"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <StatusBadge status="breach" />
                          <span className="font-mono text-xs text-muted">
                            {formatClause(rule.clause_id)}
                          </span>
                        </div>
                        {cell.detail?.actual != null && (
                          <p className="mt-1 text-xs text-ink">
                            {formatComparison(cell.detail.actual, cell.detail.expected)}
                          </p>
                        )}
                      </div>
                      <button
                        type="button"
                        onClick={() => onOpenRule(rule)}
                        className="shrink-0 text-[10px] font-medium text-gold hover:underline"
                      >
                        Obligation
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </Section>
        )}

        {compliant.length > 0 && (
          <Section label={`Compliant (${compliant.length})`}>
            <div className="space-y-1">
              {compliant.map((cell) => {
                const rule = rulesById.get(cell.rule_id);
                if (!rule) return null;
                return (
                  <div
                    key={cell.rule_id}
                    className="flex items-center justify-between rounded border border-hair bg-canvas px-3 py-1.5"
                  >
                    <span className="truncate text-xs text-ink">
                      {formatClause(rule.clause_id)} · {rule.plain_label ?? rule.plain_description}
                    </span>
                    <StatusBadge status="compliant" />
                  </div>
                );
              })}
            </div>
          </Section>
        )}

        {tasks.length > 0 && (
          <Section label="Sign-off">
            {tasks.map((t) => (
              <div key={t.id} className="mb-1.5 text-xs text-muted">
                {t.status === "reviewed" ? (
                  <span className="text-compliant-text">Signed off</span>
                ) : (
                  <span className="text-breach">Pending</span>
                )}{" "}
                · {formatClause(t.clause_id)}
              </div>
            ))}
          </Section>
        )}
      </div>
    </>
  );
}

function Section({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="mb-4">
      <div className="label-caps mb-1.5">{label}</div>
      {children}
    </div>
  );
}
