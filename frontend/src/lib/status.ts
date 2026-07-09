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

/** Absolute timestamp for audit / compliance logs. */
export function formatAuditTime(iso: string | null): string {
  if (!iso) return "—";
  const d = new Date(iso.length <= 10 ? `${iso}T00:00:00` : iso);
  return d.toLocaleString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  });
}

/** Human-readable relative time — no seconds. */
export function formatTimestamp(iso: string | null): string {
  if (!iso) return "—";
  const d = new Date(iso);
  const now = new Date();
  const diffMs = now.getTime() - d.getTime();
  const diffMin = Math.floor(diffMs / 60_000);
  const diffHr = Math.floor(diffMs / 3_600_000);

  if (diffMin < 1) return "Just now";
  if (diffMin < 60) return `${diffMin} min ago`;

  const isToday = d.toDateString() === now.toDateString();
  const yesterday = new Date(now);
  yesterday.setDate(yesterday.getDate() - 1);
  const isYesterday = d.toDateString() === yesterday.toDateString();

  const time = d.toLocaleTimeString("en-IN", {
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  });

  if (isToday) return `Today, ${time}`;
  if (isYesterday) return `Yesterday, ${time}`;
  if (diffHr < 48) return `${diffHr} hr ago`;

  return d.toLocaleDateString("en-IN", {
    day: "numeric",
    month: "short",
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  });
}

const ACTOR_LABELS: Record<string, string> = {
  system: "System",
  "compliance-analyst": "Compliance Analyst",
};

export function formatActor(actor: string): string {
  return ACTOR_LABELS[actor] ?? actor;
}
