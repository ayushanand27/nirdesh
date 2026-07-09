import type {
  AuditEntry,
  ComplianceReport,
  Delta,
  ExtractionResponse,
  Firm,
  Matrix,
  ReviewTask,
  Rule,
} from "./types";

// In production (Render), set VITE_API_BASE_URL to the deployed backend URL,
// e.g. https://nirdesh-backend.onrender.com. Locally it defaults to the Vite
// dev proxy at "/api" (see vite.config.ts). Trailing slashes are trimmed.
const RAW_BASE = import.meta.env.VITE_API_BASE_URL ?? "/api";
const BASE = RAW_BASE.replace(/\/+$/, "");

async function readError(res: Response, fallback: string): Promise<string> {
  try {
    const data = (await res.json()) as { detail?: string | { msg?: string }[] };
    if (typeof data.detail === "string") return data.detail;
    if (Array.isArray(data.detail) && data.detail[0]?.msg) return data.detail[0].msg;
  } catch {
    /* ignore non-JSON bodies */
  }
  return `${fallback}: ${res.status}`;
}

async function get<T>(path: string): Promise<T> {
  const res = await fetch(`${BASE}${path}`);
  if (!res.ok) throw new Error(await readError(res, `GET ${path} failed`));
  return res.json() as Promise<T>;
}

async function post<T>(path: string, body?: unknown): Promise<T> {
  const res = await fetch(`${BASE}${path}`, {
    method: "POST",
    headers: body ? { "Content-Type": "application/json" } : undefined,
    body: body ? JSON.stringify(body) : undefined,
  });
  if (!res.ok) throw new Error(await readError(res, `POST ${path} failed`));
  return res.json() as Promise<T>;
}

async function postForm<T>(path: string, body: FormData): Promise<T> {
  const res = await fetch(`${BASE}${path}`, {
    method: "POST",
    body,
  });
  if (!res.ok) throw new Error(await readError(res, `POST ${path} failed`));
  return res.json() as Promise<T>;
}

export interface Health {
  status: string;
  llm_configured: boolean;
}

export const api = {
  health: () => get<Health>("/health"),
  firms: () => get<Firm[]>("/firms"),
  rules: () => get<Rule[]>("/rules"),
  extractRules: (sourceCircularId: string, circularText: string, useCache = true) =>
    post<ExtractionResponse>("/extract", {
      source_circular_id: sourceCircularId,
      circular_text: circularText,
      use_cache: useCache,
    }),
  extractRulesFromUpload: async (sourceCircularId: string, file: File, useCache = true) => {
    const body = new FormData();
    body.set("source_circular_id", sourceCircularId);
    body.set("use_cache", String(useCache));
    body.set("file", file);
    return postForm<ExtractionResponse>("/extract-upload", body);
  },
  matrix: (asOf: string) => get<Matrix>(`/matrix?as_of=${encodeURIComponent(asOf)}`),
  evaluate: (asOf: string) => post<Matrix>(`/evaluate?as_of=${encodeURIComponent(asOf)}`),
  delta: (fromAsOf: string, toAsOf: string, persist = false) =>
    get<Delta>(
      `/delta?from_as_of=${encodeURIComponent(fromAsOf)}&to_as_of=${encodeURIComponent(
        toAsOf
      )}&persist=${persist}`
    ),
  reviewTasks: () => get<ReviewTask[]>("/review-tasks"),
  generateReviewTasks: (asOf: string) =>
    post<{
      as_of: string;
      created: number;
      already_pending: number;
      noop: boolean;
      message: string;
    }>(`/review-tasks/generate?as_of=${encodeURIComponent(asOf)}`),
  markReviewed: (taskId: number, reviewedBy: string) =>
    post<ReviewTask & { noop?: boolean }>(`/review-tasks/${taskId}/review`, {
      reviewed_by: reviewedBy,
    }),
  resetDelta: (fromAsOf: string, toAsOf: string) =>
    post<Delta>(
      `/delta/reset?from_as_of=${encodeURIComponent(fromAsOf)}&to_as_of=${encodeURIComponent(
        toAsOf
      )}`
    ),
  downloadComplianceReport: async (asOf: string, actor: string): Promise<string> => {
    const q = new URLSearchParams({
      as_of: asOf,
      format: "pdf",
      actor: actor.trim() || "Compliance Officer",
    });
    const res = await fetch(`${BASE}/reports/compliance-summary?${q}`);
    if (!res.ok) throw new Error(`Report download failed: ${res.status}`);
    const blob = await res.blob();
    if (blob.size < 500) {
      throw new Error("Report download returned an empty or invalid file");
    }
    const filename =
      res.headers.get("Content-Disposition")?.match(/filename="?([^";]+)"?/)?.[1] ??
      `nirdesh-compliance-report-${asOf}.pdf`;
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
    return filename;
  },
  complianceReport: (asOf: string, actor: string, persistAudit = false) =>
    get<ComplianceReport>(
      `/reports/compliance-summary?as_of=${encodeURIComponent(asOf)}&format=json&actor=${encodeURIComponent(
        actor.trim() || "Compliance Officer"
      )}&persist_audit=${persistAudit}`
    ),
  audit: () => get<AuditEntry[]>("/audit"),
};
