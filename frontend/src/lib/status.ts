import type { CellStatus } from "../types";

export const STATUS_META: Record<
  CellStatus,
  { label: string; short: string; cell: string; dot: string; badge: string }
> = {
  compliant: {
    label: "Compliant",
    short: "OK",
    cell: "bg-compliant-bg text-compliant-text",
    dot: "bg-compliant",
    badge: "bg-compliant-bg text-compliant-text border-compliant/30",
  },
  breach: {
    label: "Breach",
    short: "BREACH",
    cell: "bg-breach-bg text-breach-text",
    dot: "bg-breach",
    badge: "bg-breach-bg text-breach-text border-breach/30",
  },
  not_applicable: {
    label: "Not applicable",
    short: "N/A",
    cell: "bg-na-bg text-na-text",
    dot: "bg-na",
    badge: "bg-na-bg text-na-text border-na/30",
  },
};

export function formatEntity(entity: string | string[]): string {
  if (Array.isArray(entity)) {
    return entity.map((e) => formatEntity(e)).join(" / ");
  }
  return entity
    .replace(/_etf$/, " ETF")
    .replace(/_/g, " ")
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

// Renders a clause reference. Numeric clauses (e.g. "4.1") get a "§" prefix;
// descriptive labels (e.g. "Pre-2026 regime (¶2 context)") are shown verbatim.
export function formatClause(clauseId: string): string {
  return /^[0-9]/.test(clauseId) ? `§ ${clauseId}` : clauseId;
}

export function formatDate(iso: string | null): string {
  if (!iso) return "—";
  const d = new Date(iso.length <= 10 ? `${iso}T00:00:00` : iso);
  return d.toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

export function formatTimestamp(iso: string | null): string {
  if (!iso) return "—";
  const d = new Date(iso);
  return d.toLocaleString("en-IN", {
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
  });
}
