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
        health={health}
        mode={mode}
        onModeChange={setMode}
      />

      <CircularBar />

      <Stepper view={view} onSelect={setView} onDeltaClick={handlePreviewDelta} />

      <main className="mx-auto max-w-[1440px] px-6 py-6">
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

            <div className="mt-5 flex items-center justify-between">
              <DateToggle asOf={asOf} onChange={setAsOf} />
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
              <div className="mt-5 grid grid-cols-1 gap-5 xl:grid-cols-[1fr_340px]">
                <MatrixView
                  matrix={matrix}
                  recalcKey={recalcKey}
                  mode={mode}
                  selectedRuleId={selectedRule?.rule_id ?? null}
                  onSelectRule={setSelectedRule}
                />
                <AuditPanel entries={audit} />
              </div>
            ) : null}
          </>
        )}

        {view === "delta" && (
          <div className="mt-2 grid grid-cols-1 gap-5 xl:grid-cols-[1fr_340px]">
            <DeltaView
              delta={delta}
              applying={applying}
              applied={amendmentApplied}
              onApply={handleApplyAmendment}
            />
            <AuditPanel entries={audit} />
          </div>
        )}

        {view === "signoff" && (
          <div className="mt-2 grid grid-cols-1 gap-5 xl:grid-cols-[1fr_340px]">
            <SignoffView
              tasks={tasks}
              officer={officer}
              onOfficerChange={setOfficer}
              onGenerate={handleGenerateTasks}
              onReview={handleReviewTask}
              generating={generating}
            />
            <AuditPanel entries={audit} />
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

      <footer className="border-t border-hair bg-surface px-6 py-3">
        <p className="mx-auto max-w-[1440px] text-center text-[11px] text-muted">
          Nirdesh is a decision-support system. All compliance determinations are computed
          deterministically and require Compliance Officer sign-off before any operational
          action.
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
  health,
  mode,
  onModeChange,
}: {
  asOf: string;
  view: View;
  onViewChange: (v: View) => void;
  onDeltaClick: () => void;
  pendingTasks: number;
  health: Health | null;
  mode: ViewMode;
  onModeChange: (m: ViewMode) => void;
}) {
  const tabs: { id: View; label: string }[] = [
    { id: "dashboard", label: "Compliance matrix" },
    { id: "delta", label: "Regulatory delta" },
    { id: "signoff", label: "Officer sign-off" },
  ];

  return (
    <header className="border-b border-hair bg-surface">
      <div className="mx-auto flex max-w-[1440px] items-center justify-between px-6 py-4">
        <div className="flex items-center gap-4">
          <div className="flex h-9 w-9 items-center justify-center rounded bg-navy font-serif text-lg font-semibold text-white">
            N
          </div>
          <div>
            <h1 className="font-serif text-xl font-medium text-ink">Nirdesh</h1>
            <p className="text-xs text-muted">
              Regulatory compliance intelligence · SEBI ETF circular
            </p>
          </div>
        </div>

        <nav className="flex items-center gap-1 rounded border border-hair bg-canvas p-0.5">
          {tabs.map((t) => (
            <button
              key={t.id}
              onClick={() => (t.id === "delta" ? onDeltaClick() : onViewChange(t.id))}
              className={`flex items-center gap-1.5 rounded px-3 py-1.5 text-xs font-medium transition-colors ${
                view === t.id
                  ? "bg-elevated text-ink shadow-sm"
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

        <div className="flex items-center gap-5">
          <ModeToggle mode={mode} onChange={onModeChange} />
          <div className="h-8 w-px bg-hair" />
          <ExtractionStatus health={health} />
          <div className="h-8 w-px bg-hair" />
          <div className="text-right">
            <div className="label-caps">Evaluation date</div>
            <div className="font-mono text-sm font-medium text-ink tnum">
              {formatDate(asOf)}
            </div>
          </div>
        </div>
      </div>
    </header>
  );
}

function CircularBar() {
  return (
    <div className="border-b border-hair bg-navy">
      <div className="mx-auto flex max-w-[1440px] flex-wrap items-center gap-x-6 gap-y-1 px-6 py-2.5 text-white">
        <span className="rounded-sm bg-white/10 px-2 py-0.5 text-[10px] font-medium uppercase tracking-[0.12em] text-white/70">
          Active circular
        </span>
        <span className="font-mono text-xs tnum">HO/47/11/11(1)2026-MRD-POD3/I/13804/2026</span>
        <span className="hidden text-sm text-white/90 md:inline">
          Norms for ETF base price and price bands
        </span>
        <div className="ml-auto flex items-center gap-5 text-[11px] text-white/70">
          <span>
            Issued <span className="font-mono text-white tnum">15 Jun 2026</span>
          </span>
          <span>
            Phase 1 <span className="font-mono text-white tnum">01 Sep 2026</span>
          </span>
          <span>
            Phase 2 <span className="font-mono text-white tnum">01 Apr 2027</span>
          </span>
        </div>
      </div>
    </div>
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
      <div className="flex items-center rounded border border-hair bg-canvas p-0.5">
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
    <div className="border-b border-hair bg-surface/60">
      <div className="mx-auto flex max-w-[1440px] items-center gap-1 px-6 py-2.5">
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
    <div className="mb-5">
      <h2 className="max-w-4xl font-serif text-2xl leading-snug text-ink md:text-[28px]">
        See exactly what SEBI&rsquo;s new ETF pricing rules mean for each fund
        <span className="text-accent"> — checked automatically, the moment the rules change.</span>
      </h2>
    </div>
  );
}

function ExtractionStatus({ health }: { health: Health | null }) {
  const live = health?.llm_configured === true;
  return (
    <div className="flex items-center gap-2">
      <span className="relative flex h-2 w-2">
        {live && (
          <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-compliant opacity-60" />
        )}
        <span
          className={`relative inline-flex h-2 w-2 rounded-full ${
            live ? "bg-compliant" : "bg-na"
          }`}
        />
      </span>
      <div>
        <div className="label-caps leading-none">Extraction engine</div>
        <div className="mt-0.5 font-mono text-[11px] text-ink">
          {live ? "Groq · llama-3.3-70b" : "Cached extraction"}
        </div>
      </div>
    </div>
  );
}

function DateToggle({ asOf, onChange }: { asOf: string; onChange: (v: string) => void }) {
  const options = [
    { value: PHASE1, label: "Sept 1, 2026", sub: "Phase 1 effective" },
    { value: PHASE2, label: "Apr 1, 2027", sub: "Phase 2 amendment" },
  ];
  return (
    <div className="flex items-center gap-3">
      {options.map((opt) => (
        <button
          key={opt.value}
          onClick={() => onChange(opt.value)}
          className={`rounded border px-3 py-1.5 text-left transition-colors ${
            asOf === opt.value
              ? "border-accent bg-accent/10 text-ink"
              : "border-hair bg-surface text-ink hover:bg-elevated"
          }`}
        >
          <div className="font-mono text-xs font-medium tnum">{opt.label}</div>
          <div
            className={`text-[10px] ${asOf === opt.value ? "text-accent" : "text-muted"}`}
          >
            {opt.sub}
          </div>
        </button>
      ))}
    </div>
  );
}

function StatsBar({ matrix }: { matrix: Matrix }) {
  const items: CellStatus[] = ["compliant", "breach", "not_applicable"];
  return (
    <div className="grid grid-cols-3 gap-4">
      {items.map((s) => (
        <div key={s} className="card flex items-center gap-4 px-5 py-3.5">
          <span className={`h-3 w-3 rounded-sm ${STATUS_META[s].dot}`} />
          <div>
            <div className="font-mono text-2xl font-semibold text-ink tnum">
              {matrix.counts[s] ?? 0}
            </div>
            <div className="text-xs text-muted">{STATUS_META[s].label}</div>
          </div>
        </div>
      ))}
    </div>
  );
}
