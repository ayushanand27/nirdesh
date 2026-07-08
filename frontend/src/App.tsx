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
type ViewMode = "simple" | "technical";

export default function App() {
  const [view, setView] = useState<View>("dashboard");
  const [mode, setMode] = useState<ViewMode>("simple");
  const [asOf, setAsOf] = useState(PHASE1);
  const [matrix, setMatrix] = useState<Matrix | null>(null);
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
  const [amendmentApplied, setAmendmentApplied] = useState(false);
  const [health, setHealth] = useState<Health | null>(null);
  const [error, setError] = useState<string | null>(null);

  const pendingTasks = tasks.filter((t) => t.status === "pending").length;

  const load = useCallback(async (date: string) => {
    setLoading(true);
    setError(null);
    try {
      const [m, a, t] = await Promise.all([api.matrix(date), api.audit(), api.reviewTasks()]);
      setMatrix(m);
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
    setApplying(true);
    setError(null);
    try {
      const d = await api.delta(PHASE1, PHASE2, true);
      setDelta(d);
      setAmendmentApplied(true);
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

  const handleGenerateTasks = async () => {
    setGenerating(true);
    setError(null);
    try {
      await api.generateReviewTasks(asOf);
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

  const handlePreviewDelta = async () => {
    setView("delta");
    if (!delta) {
      try {
        const d = await api.delta(PHASE1, PHASE2, false);
        setDelta(d);
      } catch (e) {
        setError(e instanceof Error ? e.message : "Failed to load delta");
      }
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
        mode={mode}
        onModeChange={setMode}
      />

      <Stepper view={view} onSelect={setView} onDeltaClick={handlePreviewDelta} />

      <main className="mx-auto max-w-[1440px] px-6 py-4">
        {error && (
          <div className="mb-4 rounded border border-breach/30 bg-breach-bg px-4 py-3 text-sm text-breach-text">
            {error}
            <span className="ml-2 text-xs text-muted">
              — Is the backend running on port 8000?
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
                className="rounded border border-accent bg-accent px-4 py-2 text-sm font-semibold text-canvas transition-colors hover:bg-accent-600 disabled:opacity-50"
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
                <MatrixView
                  matrix={matrix}
                  recalcKey={recalcKey}
                  mode={mode}
                  selectedRuleId={selectedRule?.rule_id ?? null}
                  onSelectRule={setSelectedRule}
                />
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
              onApply={handleApplyAmendment}
            />
            <AuditPanel entries={audit} health={health} />
          </div>
        )}

        {view === "signoff" && (
          <div className="grid grid-cols-1 gap-4 xl:grid-cols-[1fr_300px]">
            <SignoffView
              tasks={tasks}
              officer={officer}
              onOfficerChange={setOfficer}
              onGenerate={handleGenerateTasks}
              onReview={handleReviewTask}
              generating={generating}
            />
            <AuditPanel entries={audit} health={health} />
          </div>
        )}
      </main>

      <RuleDrawer
        rule={selectedRule}
        firms={matrix?.firms ?? []}
        cells={matrix?.cells ?? []}
        mode={mode}
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
  mode,
  onModeChange,
}: {
  asOf: string;
  view: View;
  onViewChange: (v: View) => void;
  onDeltaClick: () => void;
  pendingTasks: number;
  mode: ViewMode;
  onModeChange: (m: ViewMode) => void;
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
          <div className="flex h-9 w-9 items-center justify-center rounded bg-navy font-serif text-lg font-semibold text-white">
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
              className={`flex items-center gap-1.5 rounded px-3 py-1.5 text-xs font-medium transition-colors ${
                view === t.id
                  ? "bg-elevated/80 text-ink"
                  : "text-muted hover:text-ink"
              }`}
            >
              {t.label}
              {t.id === "signoff" && pendingTasks > 0 && (
                <span
                  className={`rounded-full px-1.5 py-0.5 font-mono text-[10px] tnum ${
                    view === t.id ? "bg-accent/20 text-accent" : "bg-breach/20 text-breach"
                  }`}
                >
                  {pendingTasks}
                </span>
              )}
            </button>
          ))}
        </nav>

        <ModeToggle mode={mode} onChange={onModeChange} />
      </div>
    </header>
  );
}

function ModeToggle({ mode, onChange }: { mode: ViewMode; onChange: (m: ViewMode) => void }) {
  const options: { id: ViewMode; label: string }[] = [
    { id: "simple", label: "Simple" },
    { id: "technical", label: "Technical" },
  ];
  return (
    <div className="text-right">
      <div className="label-caps mb-1 leading-none">View</div>
      <div className="flex items-center rounded bg-canvas/80 p-0.5">
        {options.map((o) => (
          <button
            key={o.id}
            onClick={() => onChange(o.id)}
            className={`rounded px-2.5 py-1 text-xs font-medium transition-colors ${
              mode === o.id ? "bg-elevated text-ink shadow-sm" : "text-muted hover:text-ink"
            }`}
          >
            {o.label}
          </button>
        ))}
      </div>
    </div>
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
                      ? "bg-accent text-canvas"
                      : "border border-hair bg-canvas text-muted group-hover:text-ink"
                  }`}
                >
                  {s.n}
                </span>
                <span
                  className={`text-xs font-medium transition-colors ${
                    active ? "text-ink" : "text-muted group-hover:text-ink"
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
        <span className="text-accent"> — checked automatically, the moment the rules change.</span>
      </h2>
    </div>
  );
}

function PhaseToggle({ asOf, onChange }: { asOf: string; onChange: (v: string) => void }) {
  const options = [
    { value: PHASE1, label: "Phase 1 rules" },
    { value: PHASE2, label: "Phase 2 amendment" },
  ];
  return (
    <div className="flex items-center gap-2">
      {options.map((opt) => (
        <button
          key={opt.value}
          onClick={() => onChange(opt.value)}
          className={`rounded px-3 py-1.5 text-xs font-medium transition-colors ${
            asOf === opt.value
              ? "bg-accent/15 text-accent"
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
