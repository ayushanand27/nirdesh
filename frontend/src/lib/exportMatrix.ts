import type { Matrix } from "../types";
import { STATUS_META } from "./status";

export function exportMatrixCsv(matrix: Matrix): void {
  const { firms, rules, cells } = matrix;
  const lookup = new Map<string, (typeof cells)[0]>();
  for (const c of cells) lookup.set(`${c.firm_id}:${c.rule_id}`, c);

  const header = [
    "firm",
    "rule_id",
    "clause_id",
    "status",
    "actual",
    "expected",
  ];
  const rows = firms.flatMap((firm) =>
    rules.map((rule) => {
      const cell = lookup.get(`${firm.id}:${rule.rule_id}`);
      const status = cell?.status ?? "not_applicable";
      return [
        firm.name,
        rule.rule_id,
        rule.clause_id,
        STATUS_META[status].label,
        stringify(cell?.detail?.actual),
        stringify(cell?.detail?.expected),
      ];
    })
  );

  const csv = [header, ...rows]
    .map((row) => row.map(escapeCsv).join(","))
    .join("\n");

  const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `nirdesh-matrix-${matrix.as_of}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}

function stringify(value: unknown): string {
  if (value == null) return "";
  if (typeof value === "string") return value;
  try {
    return JSON.stringify(value);
  } catch {
    return String(value);
  }
}

function escapeCsv(value: string): string {
  if (/[",\n]/.test(value)) return `"${value.replace(/"/g, '""')}"`;
  return value;
}
