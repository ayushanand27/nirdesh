import type { ComplianceReport } from "../types";
import { formatComparison } from "../lib/displayValue";
import { formatClause, formatDate } from "../lib/status";
import { StatusBadge } from "./StatusBadge";

interface Props {
  report: ComplianceReport | null;
  loading: boolean;
  asOf: string;
  onRefresh: () => void;
  onDownload: () => void;
  downloadBusy?: boolean;
}

export function ReportPreview({
  report,
  loading,
  asOf,
  onRefresh,
  onDownload,
  downloadBusy = false,
}: Props) {
  return (
    <div className="space-y-4">
      <div className="card flex flex-wrap items-center justify-between gap-4 px-5 py-3.5">
        <h2 className="font-serif text-lg text-ink">Evidence pack</h2>
        <div className="flex items-center gap-2">
            <button
              onClick={onRefresh}
              disabled={loading}
              className="rounded border border-gold/30 px-3 py-2 text-sm font-medium text-gold transition-colors hover:bg-gold/10 disabled:opacity-50"
            >
              {loading ? "Loading…" : "Refresh preview"}
            </button>
            <button
              onClick={onDownload}
              disabled={downloadBusy || loading}
              className="rounded border border-gold bg-gold px-4 py-2 text-sm font-semibold text-canvas transition-colors hover:bg-gold-400 disabled:opacity-50"
            >
              {downloadBusy ? "Generating PDF…" : "Download PDF"}
            </button>
          </div>
      </div>

      {!report ? (
        <div className="card px-5 py-12 text-center text-sm text-muted">
          {loading ? "Loading…" : `Refresh preview for ${formatDate(asOf)}.`}
        </div>
      ) : (
        <>
          <div className="grid gap-4 md:grid-cols-5">
            <Metric label="Compliant" value={report.summary.compliant} tone="ok" />
            <Metric label="Breach" value={report.summary.breach} tone="warn" />
            <Metric label="N/A" value={report.summary.not_applicable} />
            <Metric label="Signed off" value={report.summary.signoff_reviewed} />
            <Metric label="Pending" value={report.summary.signoff_pending} />
          </div>

          {report.regulatory_delta && (
            <div className="card px-5 py-4">
              <h3 className="font-serif text-base text-ink">Amendment impact</h3>
              <p className="mt-1 text-xs text-muted">
                {formatDate(report.regulatory_delta.from_as_of)} →{" "}
                {formatDate(report.regulatory_delta.to_as_of)} ·{" "}
                {report.regulatory_delta.summary.total_transitions} transition(s)
              </p>
              <div className="mt-3 space-y-3">
                {report.regulatory_delta.rule_changes.map((change) => (
                  <div
                    key={change.old.rule_id}
                    className="rounded border border-hair bg-canvas px-4 py-3"
                  >
                    <div className="text-sm font-medium text-ink">
                      {formatClause(change.old.clause_id)} superseded by{" "}
                      {formatClause(change.new.clause_id)}
                    </div>
                    <div className="mt-1 text-xs text-muted">
                      {change.old.value_summary} {"->"} {change.new.value_summary}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="grid gap-4 xl:grid-cols-[1.1fr_0.9fr]">
            <div className="card px-5 py-4">
              <h3 className="font-serif text-lg text-ink">Breach citations</h3>
              <div className="mt-3 space-y-4">
                {report.breaches.length === 0 ? (
                  <div className="rounded border border-hair bg-canvas px-4 py-6 text-sm text-muted">
                    No breaches in the current report.
                  </div>
                ) : (
                  report.breaches.map((breach) => (
                    <div key={`${breach.firm_id}-${breach.rule_id}`} className="rounded border border-hair bg-canvas px-4 py-4">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="text-sm font-medium text-ink">{breach.firm_name}</span>
                        <StatusBadge status="breach" />
                        <span className="font-mono text-[11px] text-muted">
                          {formatClause(breach.clause_id)}
                        </span>
                      </div>
                      {breach.detail?.actual !== undefined && (
                        <div className="mt-1 text-xs text-muted">
                          {formatComparison(breach.detail.actual, breach.detail.expected)}
                        </div>
                      )}
                    </div>
                  ))
                )}
              </div>
            </div>

            <div className="space-y-4">
              <div className="card px-5 py-4">
                <h3 className="font-serif text-base text-ink">Sign-off</h3>
                <div className="mt-3 space-y-2">
                  {report.officer_signoff.log.length === 0 ? (
                    <div className="rounded border border-hair bg-canvas px-4 py-4 text-sm text-muted">
                      None recorded.
                    </div>
                  ) : (
                    report.officer_signoff.log.map((item) => (
                      <div key={item.task_id} className="rounded border border-hair bg-canvas px-4 py-3">
                        <div className="flex items-center justify-between gap-3">
                          <div className="text-sm font-medium text-ink">{item.title}</div>
                          <StatusBadge
                            status={item.status === "reviewed" ? "compliant" : "breach"}
                          />
                        </div>
                        <div className="mt-1 text-[11px] text-muted">
                          {item.reviewed_by && `${item.reviewed_by} · `}
                          {item.firm_name}
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>

              <div className="card px-5 py-4">
                <h3 className="font-serif text-base text-ink">Circular</h3>
                <div className="mt-2 space-y-1 text-xs text-muted">
                  <div className="font-mono text-ink">{report.circular.id}</div>
                  <div className="text-ink">{report.circular.title}</div>
                  <div>Issued {formatDate(report.circular.issued)}</div>
                </div>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}

function Metric({
  label,
  value,
  tone,
}: {
  label: string;
  value: number;
  tone?: "ok" | "warn";
}) {
  return (
    <div className="card-muted px-4 py-3">
      <div
        className={`font-mono text-2xl font-semibold tnum ${
          tone === "ok" ? "text-compliant-text" : tone === "warn" ? "text-breach" : "text-ink"
        }`}
      >
        {value}
      </div>
      <div className="text-xs text-muted">{label}</div>
    </div>
  );
}

