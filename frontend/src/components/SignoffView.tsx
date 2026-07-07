import { useState } from "react";
import type { ReviewTask } from "../types";
import { formatDate, formatTimestamp } from "../lib/status";

interface Props {
  tasks: ReviewTask[];
  officer: string;
  onOfficerChange: (v: string) => void;
  onGenerate: () => void;
  onReview: (taskId: number) => Promise<void>;
  generating: boolean;
}

export function SignoffView({
  tasks,
  officer,
  onOfficerChange,
  onGenerate,
  onReview,
  generating,
}: Props) {
  const pending = tasks.filter((t) => t.status === "pending");
  const reviewed = tasks.filter((t) => t.status === "reviewed");

  return (
    <div className="space-y-5">
      {/* Decision-support banner — unmissable */}
      <div className="rounded-card border-l-4 border-l-navy bg-navy/[0.04] px-5 py-4">
        <div className="flex items-start gap-3">
          <ShieldIcon />
          <div>
            <h2 className="font-serif text-lg text-navy">
              Decision-support only — human authorisation required
            </h2>
            <p className="mt-1 max-w-3xl text-sm text-muted">
              Nirdesh does not file, submit, or remediate anything autonomously. Every obligation
              surfaced by the deterministic engine is a <strong className="text-ink">recommendation</strong> that
              must be explicitly reviewed and signed off by a named Compliance Officer before it is
              considered actioned.
            </p>
          </div>
        </div>
      </div>

      {/* Officer identity + generate */}
      <div className="card flex flex-wrap items-end justify-between gap-4 px-5 py-4">
        <div>
          <label className="label-caps mb-1.5 block">Acting Compliance Officer</label>
          <input
            value={officer}
            onChange={(e) => onOfficerChange(e.target.value)}
            placeholder="Full name"
            className="w-72 rounded border border-hair bg-surface px-3 py-2 text-sm text-ink outline-none transition-colors focus:border-navy"
          />
          <p className="mt-1 text-[11px] text-muted">
            Sign-offs are attributed to this name in the audit trail.
          </p>
        </div>
        <button
          onClick={onGenerate}
          disabled={generating}
          className="rounded border border-navy bg-navy px-4 py-2 text-sm font-medium text-white transition-opacity hover:bg-navy-700 disabled:opacity-50"
        >
          {generating ? "Scanning…" : "Generate tasks from current breaches"}
        </button>
      </div>

      {/* Pending queue */}
      <div>
        <div className="mb-2 flex items-center gap-2">
          <h3 className="font-serif text-lg text-navy">Awaiting sign-off</h3>
          <span className="rounded-full bg-breach/15 px-2 py-0.5 font-mono text-xs font-semibold text-breach tnum">
            {pending.length}
          </span>
        </div>
        {pending.length === 0 ? (
          <div className="card px-5 py-8 text-center text-sm text-muted">
            No tasks awaiting sign-off. Generate tasks from current breaches to populate the queue.
          </div>
        ) : (
          <div className="space-y-3">
            {pending.map((t) => (
              <TaskCard key={t.id} task={t} onReview={onReview} />
            ))}
          </div>
        )}
      </div>

      {/* Reviewed */}
      {reviewed.length > 0 && (
        <div>
          <div className="mb-2 flex items-center gap-2">
            <h3 className="font-serif text-lg text-navy">Signed off</h3>
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
  onReview,
}: {
  task: ReviewTask;
  onReview: (taskId: number) => Promise<void>;
}) {
  const [busy, setBusy] = useState(false);

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
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <span className="rounded bg-breach/15 px-1.5 py-0.5 text-[9px] font-semibold uppercase tracking-wide text-breach">
              {task.severity} priority
            </span>
            <span className="font-mono text-xs text-muted">§ {task.clause_id}</span>
            <span className="font-mono text-[10px] text-muted tnum">
              as of {formatDate(task.as_of_date)}
            </span>
          </div>
          <h4 className="mt-1.5 text-sm font-medium text-ink">{task.title}</h4>
          <div className="mt-2 rounded border border-hair bg-canvas px-3 py-2">
            <div className="label-caps mb-0.5">Recommended action</div>
            <p className="text-sm text-ink">{task.recommended_action}</p>
          </div>
        </div>
      </div>
      <div className="mt-3 flex items-center justify-between border-t border-hair pt-3">
        <span className="text-[11px] text-muted">
          This recommendation is not actioned until signed off.
        </span>
        <button
          onClick={handle}
          disabled={busy}
          className="rounded border border-compliant bg-compliant px-3.5 py-1.5 text-xs font-medium text-white transition-opacity hover:opacity-90 disabled:opacity-50"
        >
          {busy ? "Recording…" : "Mark reviewed by Compliance Officer"}
        </button>
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
            Signed off by <span className="font-medium text-ink">{task.reviewed_by}</span> ·{" "}
            <span className="font-mono tnum">{formatTimestamp(task.reviewed_at)}</span>
          </div>
        </div>
      </div>
      <span className="rounded-full border border-compliant/30 bg-compliant-bg px-2 py-0.5 text-[11px] font-medium text-compliant-text">
        Reviewed
      </span>
    </div>
  );
}

function ShieldIcon() {
  return (
    <svg className="mt-0.5 h-5 w-5 shrink-0 text-navy" viewBox="0 0 20 20" fill="none">
      <path
        d="M10 2l6 2.5v5c0 3.5-2.5 6.5-6 8-3.5-1.5-6-4.5-6-8v-5L10 2z"
        stroke="currentColor"
        strokeWidth="1.4"
        strokeLinejoin="round"
      />
      <path d="M7.5 10l1.8 1.8L13 8" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
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
