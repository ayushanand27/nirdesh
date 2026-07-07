export type CellStatus = "compliant" | "breach" | "not_applicable";

export interface Condition {
  field: string;
  operator: string;
  value: unknown;
}

export interface Threshold {
  static_band_pct: number | null;
  dynamic_band_pct: number | null;
  flex_pct: number | null;
  max_flexes: number | null;
  trigger_pct: number | null;
  uncapped: boolean;
  cooling_off_trigger_pct?: number | null;
  cooling_off_minutes?: number | null;
  cooling_off_minutes_last_30?: number | null;
  dpl_pct?: number | null;
  dpl_relaxation_step_pct?: number | null;
}

export interface Rule {
  rule_id: string;
  clause_id: string;
  source_circular_id: string;
  plain_description: string;
  applicable_entity_type: string | string[];
  condition: Condition | null;
  threshold: Threshold | null;
  required_action: string;
  deadline: string | null;
  effective_from: string | null;
  source_text_span?: string | null;
  confidence: number;
  needs_human_review: boolean;
  review_reason: string | null;
  status: string;
  supersedes_id: number | null;
}

export interface FirmProfile {
  base_price_method?: string;
  offers_etf_types?: string[];
  band_config?: Record<string, string>;
}

export interface Firm {
  id: number;
  name: string;
  legal_type: string;
  profile: FirmProfile;
}

export interface CellDetail {
  field?: string;
  operator?: string;
  expected?: unknown;
  actual?: unknown;
  reason?: string;
  note?: string;
  applicable_entity_type?: string;
  offers_etf_types?: string[];
}

export interface Cell {
  firm_id: number;
  rule_id: string;
  status: CellStatus;
  detail: CellDetail;
}

export interface Matrix {
  as_of: string;
  counts: Record<CellStatus, number>;
  firms: Firm[];
  rules: Rule[];
  cells: Cell[];
}

export interface DeltaRuleSide {
  rule_id: string;
  clause_id: string;
  plain_description: string;
  value_summary: string;
  effective_from: string | null;
  deadline?: string | null;
  source_text_span?: string | null;
}

export interface DeltaRuleChange {
  change_type: string;
  old: DeltaRuleSide;
  new: DeltaRuleSide;
}

export interface DeltaTransition {
  firm_id: number;
  firm_name: string;
  rule_id: string;
  clause_id: string;
  from_status: CellStatus;
  to_status: CellStatus;
  newly_flagged: boolean;
}

export interface DeltaSummary {
  obligations_superseded: number;
  obligations_newly_effective: number;
  firms_newly_flagged: number;
  total_transitions: number;
  rules_before: number;
  rules_after: number;
}

export interface Delta {
  from_as_of: string;
  to_as_of: string;
  rule_changes: DeltaRuleChange[];
  newly_effective: { rule_id: string; clause_id: string; value_summary: string }[];
  firm_transitions: DeltaTransition[];
  summary: DeltaSummary;
}

export interface ReviewTask {
  id: number;
  firm_id: number;
  firm_name: string;
  rule_id: string;
  clause_id: string;
  as_of_date: string;
  title: string;
  recommended_action: string;
  severity: string;
  status: "pending" | "reviewed";
  reviewed_by: string | null;
  reviewed_at: string | null;
  created_at: string | null;
}

export interface AuditEntry {
  id: number;
  event_type: string;
  entity_ref: string;
  message: string;
  meta: Record<string, unknown> | null;
  actor: string;
  created_at: string | null;
}
