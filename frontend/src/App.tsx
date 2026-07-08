import { useCallback, useEffect, useState } from "react";
import { api, type Health } from "./api";
import { AuditPanel } from "./components/AuditPanel";
import { DeltaView } from "./components/DeltaView";
import { MatrixView } from "./components/MatrixView";
import { RuleDrawer } from "./components/RuleDrawer";
import { SignoffView } from "./components/SignoffView";
import { STATUS_META, formatDate } from "./lib/status";
import type { AuditEntry, CellStatus, Delta, Matrix, ReviewTask, Rule } from "./types";

const PHASE1 = "2026-09-01";
const PHASE2 = "2027-04-01";

type View = "dashboard" | "delta" | "signoff";
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
  const [recalcKey, setRecalcKey] = useState(0);
  const [loading, setLoading] = useState(true);
  const [evaluating, setEvaluating] = useState(false);
  const [applying, setApplying] = useState(false);
  const [resetting, setResetting] = useState(false);
  const [amendmentApplied, setAmendmentApplied] = useState(false);
  const [amendmentAppliedAt, setAmendmentAppliedAt] = useState<string | null>(null);
  const [generateMsg, setGenerateMsg] = useState<string | null>(null);
  const [reportGenerating, setReportGenerating] = useState(false);
  const [health, setHealth] = useState<Health | null>(null);
  const [error, setError] = useState<string | null>(null);

  const pendingTasks = tasks.filter((t) => t.status === "pending").length;

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
      setGenerateMsg(result.message);
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
    try {
      await api.downloadComplianceReport(asOf, officer);
      const a = await api.audit();
      setAudit(a);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to generate report");
    } finally {
      setReportGenerating(false);
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

  return (
    <div className="min-h-screen">
      <Header
        asOf={asOf}
        view={view}
        onViewChange={setView}
        onDeltaClick={handlePreviewDelta}
        pendingTasks={pendingTasks}
      />

      <Stepper view={view} onSelect={setView} onDeltaClick={handlePreviewDelta} />

      <main className="mx-auto max-w-[1440px] px-6 py-4">
        {error && (
          <div className="mb-4 rounded border border-breach/30 bg-breach-bg px-4 py-3 text-sm text-breach-text">
            {error}
            <span className="ml-2 text-xs text-muted">
              — If the API just woke from sleep, wait ~30s and refresh.
            </span>
          </div>
        )}

        {view === "dashboard" && (
          <>
            <PlainHeadline />

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
              <div className="mt-12 text-center text-sm text-muted">
                Loading compliance data…
              </div>
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
                    onSelectRule={setSelectedRule}
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
              officer={officer}
              asOf={asOf}
              onOfficerChange={setOfficer}
              onGenerate={handleGenerateTasks}
              onReview={handleReviewTask}
              onGenerateReport={handleGenerateReport}
              generating={generating}
              reportGenerating={reportGenerating}
              generateMessage={generateMsg}
            />
            <AuditPanel entries={audit} health={health} />
          </div>
        )}
      </main>

      <RuleDrawer
        rule={selectedRule}
        firms={matrix?.firms ?? []}
        cells={matrix?.cells ?? []}
        onClose={() => setSelectedRule(null)}
      />

      <footer className="border-t border-hair/30 bg-surface/40 px-6 py-3">
        <p className="mx-auto max-w-[1440px] text-center text-[11px] text-muted/80">
          Nirdesh is a decision-support system. All compliance determinations require
          Compliance Officer sign-off before any operational action.
          {health && (
            <span className="mt-1 block text-[10px] text-muted/50">
              Extraction: {health.llm_configured ? "Groq · llama-3.3-70b" : "Cached (demo)"}
            </span>
          )}
        </p>
      </footer>
    </div>
  );
}

function Header({
  asOf,
  view,
  onViewChange,
  onDeltaClick,
  pendingTasks,
}: {
  asOf: string;
  view: View;
  onViewChange: (v: View) => void;
  onDeltaClick: () => void;
  pendingTasks: number;
}) {
  const tabs: { id: View; label: string }[] = [
    { id: "dashboard", label: "Compliance matrix" },
    { id: "delta", label: "Regulatory delta" },
    { id: "signoff", label: "Officer sign-off" },
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
              SEBI ETF circular · Active as of{" "}
              <span className="text-ink/80">{formatDate(asOf)}</span>
            </p>
          </div>
        </div>

        <nav className="flex items-center gap-1 rounded bg-canvas/80 p-0.5">
          {tabs.map((t) => (
            <button
              key={t.id}
              onClick={() => (t.id === "delta" ? onDeltaClick() : onViewChange(t.id))}
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

function Stepper({
  view,
  onSelect,
  onDeltaClick,
}: {
  view: View;
  onSelect: (v: View) => void;
  onDeltaClick: () => void;
}) {
  const steps: { id: View; n: number; label: string }[] = [
    { id: "dashboard", n: 1, label: "Compliance Matrix" },
    { id: "delta", n: 2, label: "What Changed" },
    { id: "signoff", n: 3, label: "Officer Review" },
  ];
  return (
    <div className="border-b border-hair/30 bg-surface/40">
      <div className="mx-auto flex max-w-[1440px] items-center gap-1 px-6 py-2">
        {steps.map((s, i) => {
          const active = view === s.id;
          return (
            <div key={s.id} className="flex items-center">
              <button
                onClick={() => (s.id === "delta" ? onDeltaClick() : onSelect(s.id))}
                className={`group flex items-center gap-2 rounded px-2.5 py-1 transition-colors ${
                  active ? "" : "hover:bg-elevated"
                }`}
              >
                <span
                  className={`flex h-5 w-5 items-center justify-center rounded-full font-mono text-[11px] font-semibold tnum transition-colors ${
                    active
                      ? "bg-gold text-canvas"
                      : "border border-hair bg-canvas text-muted group-hover:text-ink"
                  }`}
                >
                  {s.n}
                </span>
                <span
                  className={`text-xs font-medium transition-colors ${
                    active ? "text-gold" : "text-muted group-hover:text-ink"
                  }`}
                >
                  {s.label}
                </span>
              </button>
              {i < steps.length - 1 && (
                <svg className="mx-1 h-3.5 w-3.5 text-muted/50" viewBox="0 0 16 16" fill="none">
                  <path
                    d="M6 3l5 5-5 5"
                    stroke="currentColor"
                    strokeWidth="1.5"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

function PlainHeadline() {
  return (
    <div className="mb-3">
      <h2 className="max-w-4xl font-serif text-2xl leading-snug text-ink md:text-[26px]">
        See exactly what SEBI&rsquo;s new ETF pricing rules mean for each fund
        <span className="text-gold"> — checked automatically, the moment the rules change.</span>
      </h2>
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
