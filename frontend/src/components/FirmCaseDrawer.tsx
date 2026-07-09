import type { Firm, Matrix, ReviewTask, Rule } from "../types";
import { formatClause, formatDate, formatEntity } from "../lib/status";
import { SourceCallout } from "./RuleDrawer";
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

  return (
    <>
      <div
        onClick={onClose}
        className={`fixed inset-0 z-30 bg-black/60 transition-opacity duration-300 ease-precise ${
          open ? "opacity-100" : "pointer-events-none opacity-0"
        }`}
      />
      <aside
        className={`fixed right-0 top-0 z-40 flex h-full w-full max-w-[520px] flex-col bg-surface shadow-drawer transition-transform duration-300 ease-precise ${
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
  const na = cells.filter((c) => c.status === "not_applicable");

  const pendingTasks = tasks.filter((t) => t.status === "pending");
  const reviewedTasks = tasks.filter((t) => t.status === "reviewed");

  return (
    <>
      <header className="flex items-start justify-between border-b border-hair px-6 py-5">
        <div>
          <div className="label-caps">Firm case file</div>
          <h2 className="mt-1 font-serif text-xl text-ink">{firm.name}</h2>
          <p className="mt-1 text-xs text-muted">
            {formatEntity(firm.profile.offers_etf_types ?? []) || "No ETF offerings"} ·{" "}
            {firm.legal_type}
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

      <div className="flex-1 overflow-y-auto px-6 py-5">
        <Section label="Firm profile (deterministic inputs)">
          <div className="rounded border border-hair bg-canvas px-3 py-2.5 font-mono text-xs text-ink">
            <div>base_price_method = {firm.profile.base_price_method ?? "—"}</div>
            <div className="mt-1">
              offers_etf_types = {JSON.stringify(firm.profile.offers_etf_types ?? [])}
            </div>
            {firm.profile.band_config && (
              <div className="mt-1">
                band_config = {JSON.stringify(firm.profile.band_config)}
              </div>
            )}
          </div>
        </Section>

        <div className="mb-5 grid grid-cols-3 gap-2">
          <StatPill label="Breach" value={breaches.length} tone="breach" />
          <StatPill label="Compliant" value={compliant.length} tone="ok" />
          <StatPill label="N/A" value={na.length} />
        </div>

        {breaches.length > 0 && (
          <Section label={`Active breaches (${breaches.length})`}>
            <div className="space-y-3">
              {breaches.map((cell) => {
                const rule = rulesById.get(cell.rule_id);
                if (!rule) return null;
                return (
                  <div
                    key={cell.rule_id}
                    className="rounded-card border border-breach/25 bg-breach-bg/30 px-4 py-3"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <div className="flex items-center gap-2">
                          <StatusBadge status="breach" />
                          <span className="font-mono text-xs text-muted">
                            {formatClause(rule.clause_id)}
                          </span>
                        </div>
                        <p className="mt-1 text-sm font-medium text-ink">
                          {rule.plain_label ?? rule.plain_description}
                        </p>
                      </div>
                      <button
                        onClick={() => onOpenRule(rule)}
                        className="shrink-0 rounded border border-gold/30 px-2 py-1 text-[10px] font-medium text-gold hover:bg-gold/10"
                      >
                        Rule
                      </button>
                    </div>
                    {cell.detail?.actual != null && (
                      <p className="mt-2 text-xs text-muted">
                        Actual <span className="font-mono text-ink">{stringify(cell.detail.actual)}</span>
                        {" · "}
                        Expected{" "}
                        <span className="font-mono text-ink">{stringify(cell.detail.expected)}</span>
                      </p>
                    )}
                    {rule.required_action && (
                      <p className="mt-2 text-xs text-ink">
                        Recommended: {rule.required_action}
                      </p>
                    )}
                    {rule.source_text_span && (
                      <div className="mt-2">
                        <SourceCallout
                          text={rule.source_text_span}
                          clause={formatClause(rule.clause_id)}
                        />
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </Section>
        )}

        {compliant.length > 0 && (
          <Section label={`Compliant obligations (${compliant.length})`}>
            <div className="space-y-1.5">
              {compliant.map((cell) => {
                const rule = rulesById.get(cell.rule_id);
                if (!rule) return null;
                return (
                  <button
                    key={cell.rule_id}
                    onClick={() => onOpenRule(rule)}
                    className="flex w-full items-center justify-between rounded border border-hair bg-canvas px-3 py-2 text-left transition-colors hover:border-gold/30"
                  >
                    <span className="text-sm text-ink">
                      {rule.plain_label ?? rule.plain_description}
                    </span>
                    <StatusBadge status="compliant" />
                  </button>
                );
              })}
            </div>
          </Section>
        )}

        {(pendingTasks.length > 0 || reviewedTasks.length > 0) && (
          <Section label="Officer sign-off">
            {pendingTasks.map((t) => (
              <div key={t.id} className="mb-2 rounded border border-hair bg-canvas px-3 py-2 text-xs">
                <span className="font-medium text-breach">Pending</span> — {t.title}
              </div>
            ))}
            {reviewedTasks.map((t) => (
              <div key={t.id} className="mb-2 rounded border border-hair bg-canvas px-3 py-2 text-xs">
                <span className="font-medium text-compliant-text">Reviewed</span> by {t.reviewed_by}
              </div>
            ))}
          </Section>
        )}
      </div>

      <footer className="border-t border-hair px-6 py-3">
        <p className="text-[11px] text-muted">
          Case file as of {formatDate(matrix.as_of)}. Decision-support only — officer sign-off
          required before action.
        </p>
      </footer>
    </>
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

function StatPill({
  label,
  value,
  tone,
}: {
  label: string;
  value: number;
  tone?: "breach" | "ok";
}) {
  return (
    <div className="rounded border border-hair bg-canvas px-3 py-2 text-center">
      <div
        className={`font-mono text-lg font-semibold tnum ${
          tone === "breach" ? "text-breach" : tone === "ok" ? "text-compliant-text" : "text-ink"
        }`}
      >
        {value}
      </div>
      <div className="text-[10px] text-muted">{label}</div>
    </div>
  );
}

function stringify(value: unknown): string {
  if (value == null) return "—";
  if (typeof value === "string") return value;
  try {
    return JSON.stringify(value);
  } catch {
    return String(value);
  }
}
