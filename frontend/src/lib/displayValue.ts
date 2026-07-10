import { formatEntity } from "./status";

const BASE_PRICE_LABELS: Record<string, string> = {
  "T-2_NAV": "T-2 NAV",
  "T-1_closing_vwap": "T-1 closing VWAP",
  "T-1_closing_nav": "T-1 closing NAV",
  not_applicable: "Not applicable",
};

const BAND_LABELS: Record<string, string> = {
  dynamic_10_flex5_max2: "Dynamic ±10%, flex +5%, max 2",
  fixed_5: "Fixed ±5%",
  flat_20: "Flat ±20%",
  "dynamic_6_flex3_trig5.90_uncapped": "Dynamic ±6%, flex +3%, trigger 5.90%, uncapped",
};

const OPERATOR_LABELS: Record<string, string> = {
  equals: "=",
  in: "includes",
  not_equals: "≠",
};

const FIELD_LABELS: Record<string, string> = {
  base_price_method: "Base price method",
  offers_etf_types: "ETF offerings",
  "band_config.equity_debt_etf": "Equity & debt band",
  "band_config.overnight_liquid_etf": "Overnight & liquid band",
  "band_config.gold_silver_etf": "Gold & silver band",
};

function humanizeToken(value: string): string {
  if (BASE_PRICE_LABELS[value]) return BASE_PRICE_LABELS[value];
  if (BAND_LABELS[value]) return BAND_LABELS[value];
  if (value === "not_applicable") return "Not applicable";
  return value
    .replace(/_/g, " ")
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

/** Scalar or list value for UI — never raw JSON. */
export function formatDisplayValue(value: unknown): string {
  if (value == null) return "—";
  if (typeof value === "boolean") return value ? "Yes" : "No";
  if (typeof value === "number") return String(value);
  if (typeof value === "string") return humanizeToken(value);
  if (Array.isArray(value)) {
    if (value.length === 0) return "None";
    return value.map((v) => formatDisplayValue(v)).join(", ");
  }
  if (typeof value === "object") {
    const entries = Object.entries(value as Record<string, unknown>);
    if (entries.length === 0) return "None";
    return entries
      .map(([k, v]) => `${formatFieldLabel(k)}: ${formatDisplayValue(v)}`)
      .join(" · ");
  }
  return String(value);
}

export function formatFieldLabel(field: string): string {
  return FIELD_LABELS[field] ?? field.replace(/_/g, " ").replace(/\./g, " · ");
}

export function formatOperator(operator: string): string {
  return OPERATOR_LABELS[operator] ?? operator;
}

/** Plain-English rule check — no Field / Check / Required grid. */
export function formatRuleCheck(rule: {
  condition?: { field: string; operator: string; value: unknown } | null;
}): string | null {
  const c = rule.condition;
  if (!c) return null;
  const field = formatFieldLabel(c.field);
  const value = formatConditionValue(c.value);
  switch (c.operator) {
    case "equals":
      return `${field} must be ${value}`;
    case "not_equals":
      return `${field} must not be ${value}`;
    case "in":
      return `${field} must include ${value}`;
    default:
      return `${field} ${formatOperator(c.operator)} ${value}`;
  }
}

export function formatConditionValue(value: unknown): string {
  return formatDisplayValue(value);
}

/** Breach detail line: actual vs required. */
export function formatComparison(actual: unknown, expected: unknown): string {
  const a = formatDisplayValue(actual);
  const e = formatDisplayValue(expected);
  if (a === e) return a;
  return `${a} · required ${e}`;
}

export interface ProfileRow {
  label: string;
  value: string;
}

export function firmProfileRows(profile: {
  base_price_method?: string;
  offers_etf_types?: string[];
  band_config?: Record<string, string>;
}): ProfileRow[] {
  const rows: ProfileRow[] = [];

  if (profile.base_price_method) {
    rows.push({
      label: "Base price method",
      value: formatDisplayValue(profile.base_price_method),
    });
  }

  const offerings = profile.offers_etf_types ?? [];
  rows.push({
    label: "ETF offerings",
    value: offerings.length ? offerings.map((t) => formatEntity(t)).join(", ") : "None",
  });

  const bands = profile.band_config ?? {};
  for (const [key, val] of Object.entries(bands)) {
    rows.push({
      label: formatFieldLabel(`band_config.${key}`),
      value: formatDisplayValue(val),
    });
  }

  return rows;
}
