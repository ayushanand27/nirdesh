import { useCallback, useEffect, useState } from "react";
import { api, type Health } from "./api";
import { AuditPanel } from "./components/AuditPanel";
import { DeltaView } from "./components/DeltaView";
import { IngestView } from "./components/IngestView";
import { MatrixView } from "./components/MatrixView";
import { ReportPreview } from "./components/ReportPreview";
import { FirmCaseDrawer } from "./components/FirmCaseDrawer";
import { RuleDrawer } from "./components/RuleDrawer";
import { SignoffView } from "./components/SignoffView";
import { STATUS_META, formatAuditTime, formatDate } from "./lib/status";
import type {
  AuditEntry,
  CellStatus,
  ComplianceReport,
  Delta,
  ExtractionResponse,
  Matrix,
  Firm,
  ReviewTask,
  Rule,
} from "./types";

const PHASE1 = "2026-09-01";
const PHASE2 = "2027-04-01";

type View = "ingest" | "dashboard" | "delta" | "signoff" | "report";
export default function App() {
  const [view, setView] = useState<View>("dashboard");
  const [asOf, setAsOf] = useState(PHASE1);
  const [matrix, setMatrix] = useState<Matrix | null>(null);
  const [flaggedRules, setFlaggedRules] = useState<Rule[]>([]);
  const [audit, setAudit] = useState<AuditEntry[]>([]);
  const [delta, setDelta] = useState<Delta | null>(null);
  const [tasks, setTasks] = useState<ReviewTask[]>([]);
  const [officer, setOfficer] = useState("A. Sharma");
  const [generating, setGenerating] = useState(false);
  const [selectedRule, setSelectedRule] = useState<Rule | null>(null);
  const [selectedFirm, setSelectedFirm] = useState<Firm | null>(null);
  const [recalcKey, setRecalcKey] = useState(0);
  const [loading, setLoading] = useState(true);
  const [evaluating, setEvaluating] = useState(false);
  const [applying, setApplying] = useState(false);
  const [resetting, setResetting] = useState(false);
  const [amendmentApplied, setAmendmentApplied] = useState(false);
  const [amendmentAppliedAt, setAmendmentAppliedAt] = useState<string | null>(null);
  const [generateMsg, setGenerateMsg] = useState<string | null>(null);
  const [reportMsg, setReportMsg] = useState<string | null>(null);
  const [reportGenerating, setReportGenerating] = useState(false);
  const [reportPreviewLoading, setReportPreviewLoading] = useState(false);
  const [reportPreview, setReportPreview] = useState<ComplianceReport | null>(null);
  const [extraction, setExtraction] = useState<ExtractionResponse | null>(null);
  const [extracting, setExtracting] = useState(false);
  const [ingestMessage, setIngestMessage] = useState<string | null>(null);
  const [health, setHealth] = useState<Health | null>(null);
  const [error, setError] = useState<string | null>(null);

  const pendingTasks = tasks.filter(
    (t) => t.status === "pending" && t.as_of_date === asOf
  ).length;

  const lastEvaluationAt =
    audit.find((e) => e.event_type === "evaluation")?.created_at ?? null;

  const load = useCallback(async (date: string) => {
    setLoading(true);
    setError(null);
    try {
      const [m, a, t, rules] = await Promise.all([
        api.matrix(date),
        api.audit(),
        api.reviewTasks(),
        api.rules(),
      ]);
      setMatrix(m);
      setFlaggedRules(rules.filter((r) => r.needs_human_review));
      setAudit(a);
      setTasks(t);
      setRecalcKey((k) => k + 1);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load data");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load(asOf);
  }, [asOf, load]);

  useEffect(() => {
    api.health().then(setHealth).catch(() => setHealth(null));
  }, []);

  // Sync amendment application state on load / refresh so a warm session
  // does not show "Apply amendment" when the window is already APPLIED.
  useEffect(() => {
    api
      .delta(PHASE1, PHASE2, false)
      .then((d) => {
        setDelta(d);
        if (d.application?.status === "APPLIED") {
          setAmendmentApplied(true);
          setAmendmentAppliedAt(d.application.applied_at ?? null);
        } else {
          setAmendmentApplied(false);
          setAmendmentAppliedAt(null);
        }
      })
      .catch(() => {
        /* non-blocking — delta tab will retry on open */
      });
  }, []);

  useEffect(() => {
    setReportPreview(null);
    setReportMsg(null);
    setGenerateMsg(null);
  }, [asOf, officer]);

  const refreshReportPreview = useCallback(
    async (persistAudit = false) => {
      setReportPreviewLoading(true);
      try {
        const report = await api.complianceReport(asOf, officer, persistAudit);
        setReportPreview(report);
        if (persistAudit) {
          const a = await api.audit();
          setAudit(a);
        }
      } catch (e) {
        setError(e instanceof Error ? e.message : "Failed to load report preview");
      } finally {
        setReportPreviewLoading(false);
      }
    },
    [asOf, officer]
  );

  const handleRecalculate = async () => {
    setEvaluating(true);
    try {
      const m = await api.evaluate(asOf);
      const a = await api.audit();
      setMatrix(m);
      setAudit(a);
      setRecalcKey((k) => k + 1);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Evaluation failed");
    } finally {
      setEvaluating(false);
    }
  };

  const handleApplyAmendment = async () => {
    if (amendmentApplied || applying) return;
    setApplying(true);
    setError(null);
    try {
      const d = await api.delta(PHASE1, PHASE2, true);
      setDelta(d);
      const applied = d.application?.status === "APPLIED";
      setAmendmentApplied(applied);
      setAmendmentAppliedAt(d.application?.applied_at ?? null);
      setAsOf(PHASE2);
      const [m, a] = await Promise.all([api.matrix(PHASE2), api.audit()]);
      setMatrix(m);
      setAudit(a);
      setRecalcKey((k) => k + 1);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Amendment failed");
    } finally {
      setApplying(false);
    }
  };

  const handleResetAmendment = async () => {
    setResetting(true);
    setError(null);
    try {
      const d = await api.resetDelta(PHASE1, PHASE2);
      setDelta(d);
      setAmendmentApplied(false);
      setAmendmentAppliedAt(null);
      setAsOf(PHASE1);
      const [m, a] = await Promise.all([api.matrix(PHASE1), api.audit()]);
      setMatrix(m);
      setAudit(a);
      setRecalcKey((k) => k + 1);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Reset failed");
    } finally {
      setResetting(false);
    }
  };

  const handleGenerateTasks = async () => {
    setGenerating(true);
    setError(null);
    setGenerateMsg(null);
    try {
      const result = await api.generateReviewTasks(asOf);
      setGenerateMsg(result.created ? `${result.created} task(s)` : "No new tasks");
      const [t, a] = await Promise.all([api.reviewTasks(), api.audit()]);
      setTasks(t);
      setAudit(a);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to generate tasks");
    } finally {
      setGenerating(false);
    }
  };

  const handleReviewTask = async (taskId: number) => {
    try {
      await api.markReviewed(taskId, officer);
      const [t, a] = await Promise.all([api.reviewTasks(), api.audit()]);
      setTasks(t);
      setAudit(a);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to record sign-off");
    }
  };

  const handleGenerateReport = async () => {
    if (reportGenerating) return;
    setReportGenerating(true);
    setError(null);
    setReportMsg(null);
    try {
      const filename = await api.downloadComplianceReport(asOf, officer);
      const a = await api.audit();
      setAudit(a);
      setReportMsg(`Downloaded ${filename}`);
      await refreshReportPreview(false);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to generate report");
    } finally {
      setReportGenerating(false);
    }
  };

  const handleExtractText = async (sourceCircularId: string, circularText: string) => {
    setExtracting(true);
    setError(null);
    setIngestMessage(null);
    try {
      const result = await api.extractRules(sourceCircularId, circularText, true);
      setExtraction(result);
      setSelectedRule(result.rules[0] ?? null);
      setIngestMessage(`${result.rules.length} rules · ${result.flagged_for_review} review`);
      const a = await api.audit();
      setAudit(a);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Extraction failed");
    } finally {
      setExtracting(false);
    }
  };

  const handleExtractUpload = async (sourceCircularId: string, file: File) => {
    setExtracting(true);
    setError(null);
    setIngestMessage(null);
    try {
      const result = await api.extractRulesFromUpload(sourceCircularId, file, true);
      setExtraction(result);
      setSelectedRule(result.rules[0] ?? null);
      setIngestMessage(`${result.rules.length} rules · ${result.flagged_for_review} review`);
      const a = await api.audit();
      setAudit(a);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Upload extraction failed");
    } finally {
      setExtracting(false);
    }
  };

  const handlePreviewDelta = async () => {
    setView("delta");
    try {
      const d = await api.delta(PHASE1, PHASE2, false);
      setDelta(d);
      if (d.application?.status === "APPLIED") {
        setAmendmentApplied(true);
        setAmendmentAppliedAt(d.application.applied_at ?? null);
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load delta");
    }
  };

  const openReportView = async () => {
    setView("report");
    if (
      !reportPreview ||
      reportPreview.as_of !== asOf ||
      reportPreview.generated_by !== (officer.trim() || "Compliance Officer")
    ) {
      await refreshReportPreview(false);
    }
  };

  const drawerFirms = matrix?.firms ?? [];
  const drawerCells = matrix?.cells ?? [];

  return (
    <div className="min-h-screen">
      <Header
        asOf={asOf}
        view={view}
        onViewChange={setView}
        onDeltaClick={handlePreviewDelta}
        onReportClick={openReportView}
        pendingTasks={pendingTasks}
      />

      <main className="mx-auto max-w-[1440px] px-6 py-4">
        {error && (
          <div className="mb-4 rounded border border-breach/30 bg-breach-bg px-4 py-3 text-sm text-breach-text">
            {error}
          </div>
        )}

        {view === "ingest" && (
          <div className="grid grid-cols-1 gap-4 xl:grid-cols-[1fr_300px]">
            <IngestView
              extraction={extraction}
              extracting={extracting}
              ingestMessage={ingestMessage}
              onExtractText={handleExtractText}
              onExtractUpload={handleExtractUpload}
              onSelectRule={setSelectedRule}
            />
            <AuditPanel entries={audit} health={health} />
          </div>
        )}

        {view === "dashboard" && (
          <>
            {matrix && (
              <ContextBar matrix={matrix} lastEvaluationAt={lastEvaluationAt} />
            )}

            {matrix && <StatsBar matrix={matrix} />}

            <div className="mt-3 flex items-center justify-between">
              <PhaseToggle asOf={asOf} onChange={setAsOf} />
              <button
                onClick={handleRecalculate}
                disabled={evaluating || loading}
                className="rounded border border-gold bg-gold px-4 py-2 text-sm font-semibold text-canvas transition-colors hover:bg-gold-400 disabled:opacity-50"
              >
                {evaluating ? "Recalculating…" : "Record evaluation"}
              </button>
            </div>

            {loading && !matrix ? (
              <MatrixSkeleton />
            ) : matrix ? (
              <div className="mt-4 grid grid-cols-1 gap-4 xl:grid-cols-[1fr_300px]">
                <div className="space-y-2">
                  <MatrixView
                    matrix={matrix}
                    recalcKey={recalcKey}
                    flaggedRules={flaggedRules}
                    asOf={asOf}
                    phase2Date={PHASE2}
                    selectedRuleId={selectedRule?.rule_id ?? null}
                    selectedFirmId={selectedFirm?.id ?? null}
                    onSelectRule={setSelectedRule}
                    onSelectFirm={setSelectedFirm}
                  />
                </div>
                <AuditPanel entries={audit} health={health} />
              </div>
            ) : null}
          </>
        )}

        {view === "delta" && (
          <div className="grid grid-cols-1 gap-4 xl:grid-cols-[1fr_300px]">
            <DeltaView
              delta={delta}
              applying={applying}
              applied={amendmentApplied}
              appliedAt={amendmentAppliedAt}
              resetting={resetting}
              onApply={handleApplyAmendment}
              onReset={handleResetAmendment}
            />
            <AuditPanel entries={audit} health={health} />
          </div>
        )}

        {view === "signoff" && (
          <div className="grid grid-cols-1 gap-4 xl:grid-cols-[1fr_300px]">
            <SignoffView
              tasks={tasks}
              matrix={matrix}
              rules={matrix?.rules ?? []}
              officer={officer}
              asOf={asOf}
              onOfficerChange={setOfficer}
              onGenerate={handleGenerateTasks}
              onReview={handleReviewTask}
              onGenerateReport={handleGenerateReport}
              onOpenRule={setSelectedRule}
              generating={generating}
              reportGenerating={reportGenerating}
              generateMessage={generateMsg}
              reportMessage={reportMsg}
            />
            <AuditPanel entries={audit} health={health} />
          </div>
        )}

        {view === "report" && (
          <div className="grid grid-cols-1 gap-4 xl:grid-cols-[1fr_300px]">
            <ReportPreview
              report={reportPreview}
              loading={reportPreviewLoading}
              asOf={asOf}
              onRefresh={() => refreshReportPreview(false)}
              onDownload={handleGenerateReport}
              downloadBusy={reportGenerating}
            />
            <AuditPanel entries={audit} health={health} />
          </div>
        )}
      </main>

      <RuleDrawer
        rule={selectedRule}
        firms={drawerFirms}
        cells={drawerCells}
        onClose={() => setSelectedRule(null)}
      />

      <FirmCaseDrawer
        firm={selectedFirm}
        matrix={matrix}
        tasks={tasks}
        asOf={asOf}
        onClose={() => setSelectedFirm(null)}
        onOpenRule={(rule) => {
          setSelectedFirm(null);
          setSelectedRule(rule);
        }}
      />

    </div>
  );
}

function Header({
  asOf,
  view,
  onViewChange,
  onDeltaClick,
  onReportClick,
  pendingTasks,
}: {
  asOf: string;
  view: View;
  onViewChange: (v: View) => void;
  onDeltaClick: () => void;
  onReportClick: () => void;
  pendingTasks: number;
}) {
  const tabs: { id: View; label: string }[] = [
    { id: "ingest", label: "Circular ingest" },
    { id: "dashboard", label: "Compliance matrix" },
    { id: "delta", label: "Regulatory delta" },
    { id: "signoff", label: "Officer sign-off" },
    { id: "report", label: "Evidence pack" },
  ];

  return (
    <header className="border-b border-hair/40 bg-surface/80">
      <div className="mx-auto flex max-w-[1440px] items-center justify-between px-6 py-3.5">
        <div className="flex items-center gap-4">
          <div className="flex h-9 w-9 items-center justify-center rounded bg-gold font-serif text-lg font-semibold text-canvas">
            N
          </div>
          <div>
            <h1 className="font-serif text-xl font-medium text-ink">Nirdesh</h1>
            <p className="text-xs text-muted">
              SEBI ETF · {formatDate(asOf)}
            </p>
          </div>
        </div>

        <nav className="flex items-center gap-1 rounded bg-canvas/80 p-0.5">
          {tabs.map((t) => (
            <button
              key={t.id}
              onClick={() =>
                t.id === "delta"
                  ? onDeltaClick()
                  : t.id === "report"
                    ? onReportClick()
                    : onViewChange(t.id)
              }
              className={`flex items-center gap-1.5 rounded border-b-2 px-3 py-1.5 text-xs font-medium transition-colors ${
                view === t.id ? "border-gold text-gold" : "border-transparent text-muted hover:text-ink"
              }`}
            >
              {t.label}
              {t.id === "signoff" && pendingTasks > 0 && (
                <span
                  className={`rounded-full px-1.5 py-0.5 font-mono text-[10px] tnum ${
                    view === t.id ? "bg-gold/15 text-gold" : "bg-breach/20 text-breach"
                  }`}
                >
                  {pendingTasks}
                </span>
              )}
            </button>
          ))}
        </nav>

      </div>
    </header>
  );
}

function ContextBar({
  matrix,
  lastEvaluationAt,
}: {
  matrix: Matrix;
  lastEvaluationAt: string | null;
}) {
  return (
    <div className="mb-3 flex flex-wrap items-center justify-between gap-2 font-mono text-[11px] text-muted">
      <span className="tnum">
        MRD-POD3/2026 · {matrix.firms.length} firms × {matrix.rules.length} rules · as of{" "}
        {formatDate(matrix.as_of)}
      </span>
      {lastEvaluationAt && (
        <span className="tnum">Last evaluation {formatAuditTime(lastEvaluationAt)}</span>
      )}
    </div>
  );
}

function MatrixSkeleton() {
  return (
    <div className="mt-4 animate-pulse space-y-3">
      <div className="h-10 rounded border border-hair bg-surface" />
      <div className="h-64 rounded border border-hair bg-surface" />
    </div>
  );
}

function PhaseToggle({ asOf, onChange }: { asOf: string; onChange: (v: string) => void }) {
  // Dates bound to the circular's real phase effective dates (same constants used by delta).
  const options = [
    { value: PHASE1, label: `As of ${formatDate(PHASE1)}` },
    { value: PHASE2, label: `As of ${formatDate(PHASE2)}` },
  ];
  return (
    <div className="flex items-center gap-2">
      {options.map((opt) => (
        <button
          key={opt.value}
          onClick={() => onChange(opt.value)}
          className={`rounded px-3 py-1.5 text-xs font-medium transition-colors ${
            asOf === opt.value
              ? "bg-gold/15 text-gold"
              : "bg-canvas/60 text-muted hover:text-ink"
          }`}
        >
          {opt.label}
        </button>
      ))}
    </div>
  );
}

function StatsBar({ matrix }: { matrix: Matrix }) {
  const items: CellStatus[] = ["compliant", "breach", "not_applicable"];
  return (
    <div className="mb-3 grid grid-cols-3 gap-3">
      {items.map((s) => (
        <div key={s} className="card-muted flex items-center gap-3 px-4 py-2.5">
          <span className={`h-2.5 w-2.5 rounded-sm ${STATUS_META[s].dot}`} />
          <div>
            <div className="font-mono text-xl font-semibold text-ink/90 tnum">
              {matrix.counts[s] ?? 0}
            </div>
            <div className="text-[11px] text-muted/80">{STATUS_META[s].label}</div>
          </div>
        </div>
      ))}
    </div>
  );
}
