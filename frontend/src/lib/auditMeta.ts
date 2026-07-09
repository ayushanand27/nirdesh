/** Human-readable audit metadata — no raw JSON in the UI. */

export interface AuditMetaRow {
  label: string;
  value: string;
}

const SKIP_KEYS = new Set(["fingerprint", "noop", "used_cache"]);

const LABELS: Record<string, string> = {
  as_of: "As of",
  source: "Source",
  source_circular_id: "Circular",
  rules: "Rules extracted",
  rule_count: "Rules loaded",
  evaluable_count: "Evaluable",
  human_review_count: "For review",
  flagged_for_review: "Flagged for review",
  created: "Tasks created",
  already_pending: "Already open",
  task_id: "Task",
  clause_id: "Clause",
  firm: "Firm",
  from_as_of: "From",
  to_as_of: "To",
  previous_status: "Previous status",
  generated_at: "Generated",
  format: "Format",
  obligations_superseded: "Superseded",
  obligations_newly_effective: "Newly effective",
  firms_newly_flagged: "Firms flagged",
  total_transitions: "Transitions",
  rules_before: "Rules before",
  rules_after: "Rules after",
};

function formatCounts(counts: Record<string, unknown>): string {
  const breach = Number(counts.breach ?? 0);
  const compliant = Number(counts.compliant ?? 0);
  const na = Number(counts.not_applicable ?? 0);
  return `${breach} breach · ${compliant} compliant · ${na} N/A`;
}

function formatValue(key: string, value: unknown): string | null {
  if (value == null || SKIP_KEYS.has(key)) return null;

  if (key === "counts" || key === "summary") {
    if (typeof value === "object" && value !== null && !Array.isArray(value)) {
      return formatCounts(value as Record<string, unknown>);
    }
  }

  if (key === "engine" && typeof value === "object" && value !== null) {
    const eng = value as Record<string, unknown>;
    const parts = [eng.name, eng.version].filter(Boolean);
    return parts.length ? String(parts.join(" ")) : null;
  }

  if (typeof value === "boolean") return value ? "Yes" : "No";
  if (typeof value === "number") return String(value);
  if (typeof value === "string") return value;
  if (Array.isArray(value)) {
    if (value.length === 0) return null;
    return value.map((v) => String(v)).join(", ");
  }

  return null;
}

export function auditMetaRows(
  eventType: string,
  meta: Record<string, unknown> | null,
): AuditMetaRow[] {
  if (!meta) return [];

  const rows: AuditMetaRow[] = [];
  const seen = new Set<string>();

  const push = (label: string, value: string) => {
    const key = `${label}:${value}`;
    if (seen.has(key)) return;
    seen.add(key);
    rows.push({ label, value });
  };

  // Event-specific ordering for institutional readability.
  const order: Record<string, string[]> = {
    evaluation: ["as_of", "counts"],
    extraction: ["source_circular_id", "source", "rules", "rule_count", "evaluable_count", "human_review_count", "flagged_for_review"],
    review: ["as_of", "firm", "clause_id", "task_id", "created", "already_pending"],
    amendment: [
      "obligations_superseded",
      "obligations_newly_effective",
      "firms_newly_flagged",
      "total_transitions",
      "rules_before",
      "rules_after",
    ],
    amendment_reset: ["from_as_of", "to_as_of", "previous_status"],
    report: ["as_of", "summary", "generated_at", "format", "engine"],
  };

  const preferred = order[eventType] ?? [];
  for (const key of preferred) {
    if (!(key in meta)) continue;
    const formatted = formatValue(key, meta[key]);
    if (formatted) push(LABELS[key] ?? humanizeKey(key), formatted);
  }

  for (const [key, value] of Object.entries(meta)) {
    if (preferred.includes(key) || SKIP_KEYS.has(key)) continue;
    const formatted = formatValue(key, value);
    if (formatted) push(LABELS[key] ?? humanizeKey(key), formatted);
  }

  return rows;
}

function humanizeKey(key: string): string {
  return key
    .replace(/_/g, " ")
    .replace(/\b\w/g, (c) => c.toUpperCase());
}
