import type { CellStatus } from "../types";
import { STATUS_META } from "../lib/status";

export function StatusBadge({ status, className = "" }: { status: CellStatus; className?: string }) {
  const m = STATUS_META[status];
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full border px-2 py-0.5 text-[11px] font-medium ${m.badge} ${className}`}
    >
      <span className={`h-1.5 w-1.5 rounded-full ${m.dot}`} />
      {m.label}
    </span>
  );
}
