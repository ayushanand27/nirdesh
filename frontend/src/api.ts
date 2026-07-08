import type { AuditEntry, Delta, Firm, Matrix, ReviewTask, Rule } from "./types";

// In production (Render), set VITE_API_BASE_URL to the deployed backend URL,
// e.g. https://nirdesh-backend.onrender.com. Locally it defaults to the Vite
// dev proxy at "/api" (see vite.config.ts). Trailing slashes are trimmed.
const RAW_BASE = import.meta.env.VITE_API_BASE_URL ?? "/api";
const BASE = RAW_BASE.replace(/\/+$/, "");

async function get<T>(path: string): Promise<T> {
  const res = await fetch(`${BASE}${path}`);
  if (!res.ok) throw new Error(`GET ${path} failed: ${res.status}`);
  return res.json() as Promise<T>;
}

async function post<T>(path: string, body?: unknown): Promise<T> {
  const res = await fetch(`${BASE}${path}`, {
    method: "POST",
    headers: body ? { "Content-Type": "application/json" } : undefined,
    body: body ? JSON.stringify(body) : undefined,
  });
  if (!res.ok) throw new Error(`POST ${path} failed: ${res.status}`);
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
  audit: () => get<AuditEntry[]>("/audit"),
};
