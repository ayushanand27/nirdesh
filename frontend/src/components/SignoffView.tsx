import { useState } from "react";
import type { Matrix, ReviewTask, Rule } from "../types";
import { formatTimestamp } from "../lib/status";

interface Props {
  tasks: ReviewTask[];
  matrix: Matrix | null;
  rules: Rule[];
  officer: string;
  asOf: string;
  onOfficerChange: (v: string) => void;
  onGenerate: () => void;
  onReview: (taskId: number) => Promise<void>;
  onGenerateReport: () => void;
  onOpenRule: (rule: Rule) => void;
  generating: boolean;
  reportGenerating?: boolean;
  generateMessage?: string | null;
  reportMessage?: string | null;
}

export function SignoffView({
  tasks,
  matrix,
  rules,
  officer,
  asOf,
  onOfficerChange,
  onGenerate,
  onReview,
  onGenerateReport,
  onOpenRule,
  generating,
  reportGenerating = false,
  generateMessage,
  reportMessage,
}: Props) {
  const tasksForAsOf = tasks.filter((t) => t.as_of_date === asOf);
  const pending = tasksForAsOf.filter((t) => t.status === "pending");
  const reviewed = tasksForAsOf.filter((t) => t.status === "reviewed");

  return (
    <div className="space-y-5">
      <div className="card flex flex-wrap items-end justify-between gap-4 px-5 py-4">
        <div>
          <label className="label-caps mb-1.5 block">Compliance officer</label>
          <input
            value={officer}
            onChange={(e) => onOfficerChange(e.target.value)}
            placeholder="Full name"
            className="w-64 rounded border border-hair bg-canvas px-3 py-2 text-sm text-ink outline-none transition-colors focus:border-gold"
          />
          {generateMessage && (
            <p className="mt-2 max-w-md text-xs text-gold">{generateMessage}</p>
          )}
          {reportMessage && (
            <p className="mt-2 max-w-md text-xs text-compliant-text">{reportMessage}</p>
          )}
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={onGenerate}
            disabled={generating || reportGenerating}
            className="rounded border border-gold/40 bg-transparent px-4 py-2 text-sm font-medium text-gold transition-colors hover:bg-gold/10 disabled:opacity-50"
          >
            {generating ? "Scanning…" : "Generate tasks"}
          </button>
          <button
            onClick={onGenerateReport}
            disabled={reportGenerating || generating}
            className="rounded border border-gold bg-gold px-4 py-2 text-sm font-semibold text-canvas transition-colors hover:bg-gold-400 disabled:opacity-50"
            title={`Download PDF compliance report for as-of ${asOf}`}
          >
            {reportGenerating ? "Generating…" : "Download PDF"}
          </button>
        </div>
      </div>

      {/* Pending queue */}
      <div>
        <div className="mb-2 flex items-center gap-2">
          <h3 className="font-serif text-lg text-ink">Awaiting sign-off</h3>
          <span className="rounded-full bg-breach/15 px-2 py-0.5 font-mono text-xs font-semibold text-breach tnum">
            {pending.length}
          </span>
        </div>
        {pending.length === 0 ? (
          <div className="card px-5 py-8 text-center text-sm text-muted">
            No pending tasks.
          </div>
        ) : (
          <div className="space-y-3">
            {pending.map((t) => (
              <TaskCard
                key={t.id}
                task={t}
                matrix={matrix}
                rules={rules}
                onReview={onReview}
                onOpenRule={onOpenRule}
              />
            ))}
          </div>
        )}
      </div>

      {/* Reviewed */}
      {reviewed.length > 0 && (
        <div>
          <div className="mb-2 flex items-center gap-2">
            <h3 className="font-serif text-lg text-ink">Signed off</h3>
            <span className="rounded-full bg-compliant/15 px-2 py-0.5 font-mono text-xs font-semibold text-compliant-text tnum">
              {reviewed.length}
            </span>
          </div>
          <div className="space-y-2">
            {reviewed.map((t) => (
              <ReviewedRow key={t.id} task={t} />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function TaskCard({
  task,
  matrix,
  rules,
  onReview,
  onOpenRule,
}: {
  task: ReviewTask;
  matrix: Matrix | null;
  rules: Rule[];
  onReview: (taskId: number) => Promise<void>;
  onOpenRule: (rule: Rule) => void;
}) {
  const [busy, setBusy] = useState(false);
  const rule = rules.find((r) => r.rule_id === task.rule_id) ?? null;
  const cell =
    matrix?.cells.find((c) => c.firm_id === task.firm_id && c.rule_id === task.rule_id) ?? null;

  const handle = async () => {
    setBusy(true);
    try {
      await onReview(task.id);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="card px-5 py-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <span className="font-mono text-xs text-gold">§ {task.clause_id}</span>
            <span className="text-[10px] uppercase text-breach">{task.severity}</span>
          </div>
          <h4 className="mt-1 text-sm font-medium text-ink">{task.title}</h4>
          {cell && (
            <p className="mt-1.5 font-mono text-[11px] text-muted">
              {stringify(cell.detail.actual)} → {stringify(cell.detail.expected)}
            </p>
          )}
        </div>
        <div className="flex shrink-0 items-center gap-2">
          {rule && (
            <button
              onClick={() => onOpenRule(rule)}
              className="rounded border border-hair px-2 py-1 text-[10px] text-muted hover:text-ink"
            >
              Rule
            </button>
          )}
          <button
            onClick={handle}
            disabled={busy}
            className="rounded border border-compliant bg-compliant px-3 py-1.5 text-xs font-semibold text-canvas disabled:opacity-50"
          >
            {busy ? "…" : "Review"}
          </button>
        </div>
      </div>
    </div>
  );
}

function ReviewedRow({ task }: { task: ReviewTask }) {
  return (
    <div className="flex items-center justify-between rounded border border-hair bg-surface px-5 py-3">
      <div className="flex items-center gap-3">
        <CheckIcon />
        <div>
          <div className="text-sm text-ink">{task.title}</div>
          <div className="text-[11px] text-muted">
            {task.reviewed_by} · <span className="font-mono tnum">{formatTimestamp(task.reviewed_at)}</span>
          </div>
        </div>
      </div>
      <span className="rounded-full border border-compliant/30 bg-compliant-bg px-2 py-0.5 text-[11px] font-medium text-compliant-text">
        Reviewed
      </span>
    </div>
  );
}

function CheckIcon() {
  return (
    <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-compliant-bg">
      <svg className="h-3.5 w-3.5 text-compliant-text" viewBox="0 0 16 16" fill="none">
        <path d="M3 8.5l3 3 7-7" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    </span>
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
