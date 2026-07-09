import { useEffect, useMemo, useState } from "react";
import type { ExtractionResponse, Rule } from "../types";
import { ConfidenceBar } from "./ConfidenceBar";
import { SourceCallout } from "./RuleDrawer";
import { formatClause, formatEntity } from "../lib/status";

type ReviewDecision = "pending" | "approved" | "rejected";

interface Props {
  extraction: ExtractionResponse | null;
  extracting: boolean;
  ingestMessage?: string | null;
  onExtractText: (sourceCircularId: string, circularText: string) => Promise<void>;
  onExtractUpload: (sourceCircularId: string, file: File) => Promise<void>;
  onSelectRule: (rule: Rule) => void;
}

export function IngestView({
  extraction,
  extracting,
  ingestMessage,
  onExtractText,
  onExtractUpload,
  onSelectRule,
}: Props) {
  const [sourceCircularId, setSourceCircularId] = useState(
    "HO/47/11/11(1)2026-MRD-POD3/I/13804/2026"
  );
  const [circularText, setCircularText] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [mode, setMode] = useState<"upload" | "paste">("upload");
  const [reviewDecisions, setReviewDecisions] = useState<Record<string, ReviewDecision>>({});

  useEffect(() => {
    if (!extraction) {
      setReviewDecisions({});
      return;
    }
    const next: Record<string, ReviewDecision> = {};
    for (const rule of extraction.rules) {
      next[rule.rule_id] = rule.needs_human_review ? "pending" : "approved";
    }
    setReviewDecisions(next);
  }, [extraction]);

  const reviewStats = useMemo(() => {
    const values = Object.values(reviewDecisions);
    return {
      approved: values.filter((v) => v === "approved").length,
      rejected: values.filter((v) => v === "rejected").length,
      pending: values.filter((v) => v === "pending").length,
    };
  }, [reviewDecisions]);

  const setDecision = (ruleId: string, decision: ReviewDecision) => {
    setReviewDecisions((prev) => ({ ...prev, [ruleId]: decision }));
  };

  const { flagged, machineCheckable } = useMemo(() => {
    const rules = extraction?.rules ?? [];
    return {
      flagged: rules.filter((r) => r.needs_human_review),
      machineCheckable: rules.filter((r) => !r.needs_human_review),
    };
  }, [extraction]);

  const handleSubmit = async () => {
    if (!sourceCircularId.trim()) return;
    if (mode === "upload") {
      if (!file) return;
      await onExtractUpload(sourceCircularId.trim(), file);
      return;
    }
    if (!circularText.trim()) return;
    await onExtractText(sourceCircularId.trim(), circularText.trim());
  };

  return (
    <div className="space-y-4">
      <div className="card flex items-start justify-between gap-4 px-5 py-3.5">
        <div>
          <h2 className="font-serif text-lg text-ink">Circular ingest</h2>
          <p className="mt-0.5 text-xs text-muted">
            PDF or text → structured rules · matrix uses seeded canonical ruleset
          </p>
        </div>
          {extraction && (
            <div className="shrink-0 rounded border border-hair bg-canvas px-4 py-3 text-right">
              <div className="font-mono text-xl font-semibold text-ink tnum">
                {extraction.rules.length}
              </div>
              <div className="text-[11px] text-muted">rules extracted</div>
              <div className="mt-1 text-[11px] text-gold">
                {extraction.flagged_for_review} flagged for review
              </div>
              <div className="mt-2 space-y-0.5 border-t border-hair pt-2 text-[10px] text-muted">
                <div>
                  <span className="text-compliant-text">{reviewStats.approved}</span> approved
                </div>
                <div>
                  <span className="text-breach">{reviewStats.rejected}</span> rejected
                </div>
                <div>
                  <span className="text-gold">{reviewStats.pending}</span> pending QA
                </div>
              </div>
            </div>
          )}
      </div>

      <div className="card px-5 py-4">
        <div className="flex flex-wrap items-center gap-2">
          <ModeButton active={mode === "upload"} onClick={() => setMode("upload")}>
            PDF upload
          </ModeButton>
          <ModeButton active={mode === "paste"} onClick={() => setMode("paste")}>
            Paste circular text
          </ModeButton>
        </div>

        <div className="mt-4 space-y-4">
          <div className="space-y-4">
            <div>
              <label className="label-caps mb-1.5 block">Source circular ID</label>
              <input
                value={sourceCircularId}
                onChange={(e) => setSourceCircularId(e.target.value)}
                className="w-full rounded border border-hair bg-canvas px-3 py-2 text-sm text-ink outline-none transition-colors focus:border-gold"
                placeholder="HO/..../2026"
              />
            </div>

            {mode === "upload" ? (
              <div>
                <label className="label-caps mb-1.5 block">Circular PDF</label>
                <label className="flex min-h-40 cursor-pointer flex-col items-center justify-center rounded-card border border-dashed border-gold/30 bg-canvas px-4 py-6 text-center transition-colors hover:border-gold/50">
                  <input
                    type="file"
                    accept="application/pdf"
                    className="hidden"
                    onChange={(e) => setFile(e.target.files?.[0] ?? null)}
                  />
                  <div className="text-sm font-medium text-ink">
                    {file ? file.name : "Drop PDF or click to browse"}
                  </div>
                </label>
              </div>
            ) : (
              <div>
                <label className="label-caps mb-1.5 block">Circular text</label>
                <textarea
                  value={circularText}
                  onChange={(e) => setCircularText(e.target.value)}
                  placeholder="Paste the circular text here..."
                  className="min-h-56 w-full rounded border border-hair bg-canvas px-3 py-2 text-sm leading-relaxed text-ink outline-none transition-colors focus:border-gold"
                />
              </div>
            )}
          </div>
          {ingestMessage && <p className="text-xs text-gold">{ingestMessage}</p>}
          <div className="flex justify-end">
            <button
              onClick={handleSubmit}
              disabled={
                extracting ||
                !sourceCircularId.trim() ||
                (mode === "upload" ? !file : !circularText.trim())
              }
              className="rounded border border-gold bg-gold px-5 py-2 text-sm font-semibold text-canvas transition-colors hover:bg-gold-400 disabled:opacity-50"
            >
              {extracting ? "Extracting…" : "Extract rules"}
            </button>
          </div>
        </div>
      </div>

      {extraction && (
        <>
          <div className="card px-5 py-4">
            <div className="label-caps mb-3">Extraction QA workflow</div>
            <div className="flex flex-wrap items-center gap-2">
              <WorkflowStep n={1} label="Draft extracted" active />
              <Arrow />
              <WorkflowStep
                n={2}
                label="Officer review"
                active={reviewStats.pending > 0}
                done={reviewStats.pending === 0 && extraction.flagged_for_review > 0}
              />
              <Arrow />
              <WorkflowStep
                n={3}
                label="Active ruleset"
                active={reviewStats.pending === 0}
                done={reviewStats.rejected === 0 && reviewStats.pending === 0}
              />
            </div>
          </div>

          <div className="grid gap-4 lg:grid-cols-2">
            <RulesSection
              title="Checkable"
              rules={machineCheckable}
              onSelectRule={onSelectRule}
            />
            <RulesSection
              title="Needs review"
              rules={flagged}
              onSelectRule={onSelectRule}
              highlighted
            />
          </div>

          <div className="card px-5 py-4">
            <div className="mb-3 flex items-center justify-between gap-3">
              <h3 className="font-serif text-lg text-ink">Extracted rules</h3>
              <span className="font-mono text-[10px] text-muted">
                {extraction.model} · {extraction.used_cache ? "cached" : "live"}
              </span>
            </div>
            <div className="space-y-3">
              {extraction.rules.map((rule) => (
                <RuleCard
                  key={rule.rule_id}
                  rule={rule}
                  decision={reviewDecisions[rule.rule_id] ?? "pending"}
                  onDecisionChange={setDecision}
                  onSelectRule={onSelectRule}
                />
              ))}
            </div>
          </div>
        </>
      )}
    </div>
  );
}

function ModeButton({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      className={`rounded border px-3 py-1.5 text-xs font-medium transition-colors ${
        active
          ? "border-gold bg-gold text-canvas"
          : "border-gold/25 bg-canvas text-muted hover:text-ink"
      }`}
    >
      {children}
    </button>
  );
}

function RulesSection({
  title,
  rules,
  onSelectRule,
  highlighted = false,
}: {
  title: string;
  rules: Rule[];
  onSelectRule: (rule: Rule) => void;
  highlighted?: boolean;
}) {
  return (
    <div
      className={`rounded-card border px-5 py-4 ${
        highlighted ? "border-gold/25 bg-gold/[0.04]" : "border-hair bg-surface"
      }`}
    >
      <h3 className="font-serif text-base text-ink">{title}</h3>
      <div className="mt-2 space-y-2">
        {rules.length === 0 ? (
          <div className="rounded border border-hair bg-canvas px-3 py-3 text-sm text-muted">
            No rules in this category.
          </div>
        ) : (
          rules.map((rule) => (
            <button
              key={rule.rule_id}
              onClick={() => onSelectRule(rule)}
              className="block w-full rounded border border-hair bg-canvas px-3 py-3 text-left transition-colors hover:border-gold/40"
            >
              <div className="flex items-center justify-between gap-3">
                <div>
                  <div className="text-sm font-medium text-ink">
                    {rule.plain_label ?? rule.plain_description}
                  </div>
                  <div className="mt-1 text-[11px] text-muted">
                    {formatClause(rule.clause_id)} · {formatEntity(rule.applicable_entity_type)}
                  </div>
                </div>
                <div className="w-24 shrink-0">
                  <ConfidenceBar value={rule.confidence} />
                </div>
              </div>
            </button>
          ))
        )}
      </div>
    </div>
  );
}

function RuleCard({
  rule,
  decision,
  onDecisionChange,
  onSelectRule,
}: {
  rule: Rule;
  decision: ReviewDecision;
  onDecisionChange: (ruleId: string, decision: ReviewDecision) => void;
  onSelectRule: (rule: Rule) => void;
}) {
  return (
    <div
      className={`rounded-card border bg-canvas px-4 py-4 ${
        decision === "approved"
          ? "border-compliant/30"
          : decision === "rejected"
            ? "border-breach/30 opacity-80"
            : "border-hair"
      }`}
    >
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <span className="font-mono text-xs font-semibold text-gold">
              {formatClause(rule.clause_id)}
            </span>
            <span className="rounded bg-surface px-1.5 py-0.5 text-[10px] text-muted">
              {formatEntity(rule.applicable_entity_type)}
            </span>
            {rule.needs_human_review && (
              <span className="rounded bg-gold/15 px-1.5 py-0.5 text-[10px] font-medium text-gold">
                Human review required
              </span>
            )}
            {decision === "approved" && (
              <span className="rounded bg-compliant-bg px-1.5 py-0.5 text-[10px] font-medium text-compliant-text">
                Approved
              </span>
            )}
            {decision === "rejected" && (
              <span className="rounded bg-breach-bg px-1.5 py-0.5 text-[10px] font-medium text-breach-text">
                Rejected
              </span>
            )}
          </div>
          <h4 className="mt-1 text-sm font-medium text-ink">
            {rule.plain_label ?? rule.plain_description}
          </h4>
        </div>
        <button
          onClick={() => onSelectRule(rule)}
          className="rounded border border-gold/30 px-3 py-1.5 text-xs font-medium text-gold transition-colors hover:bg-gold/10"
        >
          Detail
        </button>
      </div>

      {rule.needs_human_review && (
        <div className="mt-3 flex flex-wrap gap-2">
          <button
            onClick={() => onDecisionChange(rule.rule_id, "approved")}
            className={`rounded border px-2.5 py-1 text-[11px] font-medium transition-colors ${
              decision === "approved"
                ? "border-compliant bg-compliant-bg text-compliant-text"
                : "border-hair text-muted hover:border-compliant/40 hover:text-compliant-text"
            }`}
          >
            Approve
          </button>
          <button
            onClick={() => onDecisionChange(rule.rule_id, "rejected")}
            className={`rounded border px-2.5 py-1 text-[11px] font-medium transition-colors ${
              decision === "rejected"
                ? "border-breach bg-breach-bg text-breach-text"
                : "border-hair text-muted hover:border-breach/40 hover:text-breach"
            }`}
          >
            Reject
          </button>
          {decision !== "pending" && (
            <button
              onClick={() => onDecisionChange(rule.rule_id, "pending")}
              className="rounded border border-hair px-2.5 py-1 text-[11px] text-muted hover:text-ink"
            >
              Reset
            </button>
          )}
        </div>
      )}

      <div className="mt-3 grid gap-3 lg:grid-cols-[140px_1fr]">
        <div>
          <div className="label-caps mb-1">Confidence</div>
          <ConfidenceBar value={rule.confidence} />
        </div>
        <div>
          <div className="label-caps mb-1">Required action</div>
          <p className="text-sm text-ink">{rule.required_action}</p>
        </div>
      </div>

      {rule.review_reason && (
        <div className="mt-3 rounded border border-gold/20 bg-gold/[0.05] px-3 py-2 text-xs text-ink">
          <span className="font-medium text-gold">Review reason:</span> {rule.review_reason}
        </div>
      )}

      {rule.source_text_span && (
        <div className="mt-3">
          <SourceCallout
            text={rule.source_text_span}
            clause={formatClause(rule.clause_id)}
            circular={rule.source_circular_id}
          />
        </div>
      )}
    </div>
  );
}

function WorkflowStep({
  n,
  label,
  active,
  done,
}: {
  n: number;
  label: string;
  active?: boolean;
  done?: boolean;
}) {
  return (
    <div
      className={`flex items-center gap-2 rounded border px-3 py-2 ${
        done
          ? "border-compliant/30 bg-compliant-bg/40"
          : active
            ? "border-gold/30 bg-gold/10"
            : "border-hair bg-canvas"
      }`}
    >
      <span
        className={`flex h-5 w-5 items-center justify-center rounded-full font-mono text-[10px] font-semibold ${
          done ? "bg-compliant text-canvas" : active ? "bg-gold text-canvas" : "bg-surface text-muted"
        }`}
      >
        {n}
      </span>
      <span className="text-xs font-medium text-ink">{label}</span>
    </div>
  );
}

function Arrow() {
  return (
    <svg className="h-3.5 w-3.5 text-muted/50" viewBox="0 0 16 16" fill="none">
      <path d="M6 3l5 5-5 5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  );
}
