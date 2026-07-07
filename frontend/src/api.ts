import type { AuditEntry, Delta, Firm, Matrix, ReviewTask, Rule } from "./types";

const BASE = "/api";

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
    post<{ as_of: string; created: number }>(
      `/review-tasks/generate?as_of=${encodeURIComponent(asOf)}`
    ),
  markReviewed: (taskId: number, reviewedBy: string) =>
    post<ReviewTask>(`/review-tasks/${taskId}/review`, { reviewed_by: reviewedBy }),
  audit: () => get<AuditEntry[]>("/audit"),
};
