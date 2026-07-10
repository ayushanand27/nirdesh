import { useEffect, useState } from "react";
import type { ExtractionResponse, Rule } from "../types";
import { formatClause } from "../lib/status";

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
    "HO/47/11/11(1)2026-MRD-POD3/I/13804/2026",
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

  const setDecision = (ruleId: string, decision: ReviewDecision) => {
    setReviewDecisions((prev) => ({ ...prev, [ruleId]: decision }));
  };

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
      <div className="card flex items-center justify-between gap-4 px-5 py-3.5">
        <h2 className="font-serif text-lg text-ink">Circular ingest</h2>
        {extraction && (
          <p className="font-mono text-xs text-muted tnum">
            {extraction.rules.length} rules · {extraction.flagged_for_review} review ·{" "}
            {extraction.used_cache ? "cached" : "live"}
          </p>
        )}
      </div>

      <div className="card px-5 py-4">
        <div className="flex flex-wrap items-center gap-2">
          <ModeButton active={mode === "upload"} onClick={() => setMode("upload")}>
            PDF
          </ModeButton>
          <ModeButton active={mode === "paste"} onClick={() => setMode("paste")}>
            Paste text
          </ModeButton>
          <span className="ml-auto rounded border border-hair px-2 py-0.5 text-[10px] text-muted">
            Draft — not persisted
          </span>
        </div>

        <div className="mt-4 space-y-4">
          <input
            value={sourceCircularId}
            onChange={(e) => setSourceCircularId(e.target.value)}
            className="w-full rounded border border-hair bg-canvas px-3 py-2 text-sm text-ink outline-none transition-colors focus:border-gold"
            placeholder="Circular ID"
          />

          {mode === "upload" ? (
            <label className="flex min-h-32 cursor-pointer flex-col items-center justify-center rounded-card border border-dashed border-gold/30 bg-canvas px-4 py-6 text-center transition-colors hover:border-gold/50">
              <input
                type="file"
                accept="application/pdf"
                className="hidden"
                onChange={(e) => setFile(e.target.files?.[0] ?? null)}
              />
              <div className="text-sm text-ink">{file ? file.name : "Drop PDF or browse"}</div>
            </label>
          ) : (
            <textarea
              value={circularText}
              onChange={(e) => setCircularText(e.target.value)}
              placeholder="Paste circular text…"
              className="min-h-40 w-full rounded border border-hair bg-canvas px-3 py-2 text-sm leading-relaxed text-ink outline-none transition-colors focus:border-gold"
            />
          )}

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
        <div className="card px-5 py-4">
          <div className="space-y-2">
            {extraction.rules.map((rule) => (
              <RuleRow
                key={rule.rule_id}
                rule={rule}
                decision={reviewDecisions[rule.rule_id] ?? "pending"}
                onDecisionChange={setDecision}
                onSelectRule={onSelectRule}
              />
            ))}
          </div>
        </div>
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

function RuleRow({
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
      className={`flex flex-wrap items-center justify-between gap-3 rounded border bg-canvas px-3 py-2.5 ${
        decision === "approved"
          ? "border-compliant/25"
          : decision === "rejected"
            ? "border-breach/25"
            : "border-hair"
      }`}
    >
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-2">
          <span className="font-mono text-xs text-gold">{formatClause(rule.clause_id)}</span>
          {rule.needs_human_review && (
            <span className="text-[10px] text-gold">Review</span>
          )}
          {decision === "approved" && (
            <span className="text-[10px] text-compliant-text">Approved</span>
          )}
          {decision === "rejected" && <span className="text-[10px] text-breach">Rejected</span>}
        </div>
        <p className="mt-0.5 truncate text-sm text-ink">
          {rule.plain_label ?? rule.plain_description}
        </p>
      </div>
      <div className="flex shrink-0 items-center gap-2">
        {rule.needs_human_review && (
          <>
            <button
              type="button"
              onClick={() => onDecisionChange(rule.rule_id, "approved")}
              className="rounded border border-hair px-2 py-0.5 text-[10px] text-muted hover:border-compliant/40 hover:text-compliant-text"
            >
              Approve
            </button>
            <button
              type="button"
              onClick={() => onDecisionChange(rule.rule_id, "rejected")}
              className="rounded border border-hair px-2 py-0.5 text-[10px] text-muted hover:border-breach/40 hover:text-breach"
            >
              Reject
            </button>
          </>
        )}
        <button
          type="button"
          onClick={() => onSelectRule(rule)}
          className="rounded border border-gold/30 px-2 py-0.5 text-[10px] font-medium text-gold hover:bg-gold/10"
        >
          Detail
        </button>
      </div>
    </div>
  );
}
