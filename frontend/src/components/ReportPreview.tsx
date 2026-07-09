import type { ComplianceReport } from "../types";
import { formatClause, formatDate, formatTimestamp } from "../lib/status";
import { SourceCallout } from "./RuleDrawer";
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
            <Metric label="Pending review" value={report.summary.signoff_pending} />
          </div>

          <div className="card px-5 py-4">
            <div className="flex flex-wrap items-center justify-between gap-3 text-xs text-muted">
              <span>
                As of {formatDate(report.as_of)} · {report.generated_by} ·{" "}
                {formatTimestamp(report.generated_at)}
              </span>
              <span className="font-mono text-ink">
                {report.engine.name} · {report.engine.ruleset}
              </span>
            </div>
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
                      <p className="mt-2 text-sm text-ink">
                        {breach.plain_label ?? breach.plain_description}
                      </p>
                      {breach.detail?.actual !== undefined && (
                        <div className="mt-2 text-xs text-muted">
                          Actual: <span className="font-mono text-ink">{stringify(breach.detail.actual)}</span>
                          {" · "}
                          Expected: <span className="font-mono text-ink">{stringify(breach.detail.expected)}</span>
                        </div>
                      )}
                      {breach.required_action && (
                        <div className="mt-2 rounded border border-hair bg-surface px-3 py-2 text-xs text-ink">
                          Recommended action: {breach.required_action}
                        </div>
                      )}
                      {breach.source_text_span && (
                        <div className="mt-3">
                          <SourceCallout
                            text={breach.source_text_span}
                            clause={formatClause(breach.clause_id)}
                            circular={report.circular.id}
                          />
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
                <p className="mt-0.5 text-xs text-muted">
                  {report.officer_signoff.reviewed_count} reviewed ·{" "}
                  {report.officer_signoff.pending_count} pending
                </p>
                <div className="mt-3 space-y-3">
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
                        <div className="mt-1 text-xs text-muted">
                          {item.firm_name} · {formatClause(item.clause_id)}
                        </div>
                        <div className="mt-2 text-xs text-ink">
                          Recommended action: {item.recommended_action}
                        </div>
                        {item.reviewed_by && (
                          <div className="mt-2 text-[11px] text-muted">
                            Signed off by {item.reviewed_by} · {formatTimestamp(item.reviewed_at)}
                          </div>
                        )}
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

function stringify(value: unknown): string {
  if (value == null) return "—";
  if (typeof value === "string") return value;
  try {
    return JSON.stringify(value);
  } catch {
    return String(value);
  }
}
