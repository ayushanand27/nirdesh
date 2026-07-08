# Demo corpus & regulatory timeline

This document explains **why** Nirdesh uses the June 2026 ETF circular, the **2026 vs 2027** dates, and how every demo component maps to real regulatory text.

---

## Source circular (official PDF in repo)

| Asset | Path | Purpose |
|---|---|---|
| **Official SEBI PDF** | [`backend/data/circular_MRD-POD3-2026_ORIGINAL.pdf`](../backend/data/circular_MRD-POD3-2026_ORIGINAL.pdf) | Primary source document — all rules trace back here |
| **Verified text extract** | [`backend/data/circular_MRD-POD3-2026_VERIFIED.txt`](../backend/data/circular_MRD-POD3-2026_VERIFIED.txt) | Page-by-page text used to validate clause IDs and `source_text_span` citations |
| **Canonical rules (code)** | [`backend/app/canonical_rules.py`](../backend/app/canonical_rules.py) | Human-reviewed structured obligations loaded into the demo DB |
| **LLM extraction cache** | [`backend/data/cache/`](../backend/data/cache/) | Cached JSON from Groq extraction (optional ingest path) |

**Circular ID:** `HO/47/11/11(1)2026-MRD-POD3/I/13804/2026`  
**Issued:** 15 June 2026  
**Subject:** Norms for base price, price bands, call auction, and close-out for ETFs

We use this circular because it has **numeric, checkable rules** (base price method, band percentages) and **two phased effective dates** — ideal for showing regulatory delta, not just a static matrix.

---

## Why 2026 and 2027?

The circular does not have a single “compliance date.” It phases changes:

### Phase 1 — **1 September 2026** (§4.1 and §5.x)

| Topic | What changes |
|---|---|
| **Base price (§4.1)** | From T-2 day NAV → **T-1 day closing price** (last 30-minute VWAP) |
| **Equity/Debt ETFs (§5.1.1)** | From flat ±20% → **dynamic ±10%**, flex +5%, max 2 flexes, cap ±20% |
| **Overnight/Liquid (§5.2.1)** | **Fixed ±5%** (liquid ETFs newly tightened from flat ±20%) |
| **Gold/Silver (§5.3.1)** | **Dynamic ±6%**, flex +3%, trigger 5.90%, uncapped flexing |

In the UI, select **“As of 01 Sept 2026”** to evaluate obligations active on this date.

### Phase 2 — **1 April 2027** (§4.4)

| Topic | What changes |
|---|---|
| **Base price (§4.4)** | Joint transition to **T-1 day closing NAV** as base price — **supersedes §4.1** |

In the UI:

1. Open **Regulatory delta** and **Apply amendment** (window `2026-09-01 → 2027-04-01`).
2. Switch matrix to **“As of 01 Apr 2027”** to see post-amendment posture.

**Demo punchline:** Meridian Asset Management is compliant under Phase 1 (T-1 VWAP) but **flips to breach** under Phase 2 because it has not moved to T-1 closing NAV. One circular, two clocks — most teams only track the headline date.

---

## Rule set (8 obligations)

| # | Clause | Evaluable? | Role |
|---|---|---|---|
| 1 | Pre-2026 (¶2 context) | Yes | Legacy lineage — superseded by §4.1 |
| 2 | **§4.1** | Yes | Phase 1 base price |
| 3 | **§4.4** | Yes | Phase 2 base price — supersedes §4.1 |
| 4 | **§5.1.1** | Yes | Equity/Debt ETF bands |
| 5 | **§5.2.1** | Yes | Overnight + Liquid ETF bands |
| 6 | **§5.3.1** | Yes | Gold/Silver ETF bands |
| 7 | **§6.1** | **No** — `needs_human_review` | Close-out procedure — not reduced to a machine check |
| 8 | **§7.1** | **No** — `needs_human_review` | Call auction in pre-open — not reduced to a machine check |

Evaluable rules appear in the **compliance matrix**. Review-flagged rules are surfaced separately — the system does not guess compliance for them.

---

## Mock firms (fictional — demo only)

Profiles live in [`backend/app/firms_seed.py`](../backend/app/firms_seed.py).

### Bharat Growth AMC — **breach** (Phase 1)

| Field | Value | Why breach |
|---|---|---|
| `base_price_method` | `T-2_NAV` | Still on legacy method after §4.1 effective |
| `band_config.overnight_liquid_etf` | `flat_20` | Should be `fixed_5` per §5.2.1 |

### Meridian Asset Management — **compliant → breach**

| Phase | Posture | Reason |
|---|---|---|
| **1 Sep 2026** | Compliant | `T-1_closing_vwap` + correct band configs |
| **1 Apr 2027** (after apply) | **Breach** | Still on VWAP, not T-1 closing NAV per §4.4 |

### Sentinel Debt Fund — **not applicable**

| Field | Value |
|---|---|
| `offers_etf_types` | `[]` (no ETF schemes) |

All ETF-specific rules return **not applicable**.

---

## UI components ↔ backend

| UI tab | Backend | What it shows |
|---|---|---|
| Compliance matrix | `GET /matrix`, `GET /rules` | Firm × rule grid; Simple/Technical toggle |
| Regulatory delta | `GET /delta` | §4.1→§4.4 supersession + firm transitions |
| Officer sign-off | `/review-tasks*` | Pending tasks, named officer, sign-off |
| Audit trail | `GET /audit` | Append-only event log |
| Generate Report | `GET /reports/compliance-summary?format=pdf` | Downloadable evidence pack |

---

## How dates are used in code

| Constant / field | Value | Where |
|---|---|---|
| Phase 1 `as_of` | `2026-09-01` | Matrix default, seed evaluation |
| Phase 2 `as_of` | `2027-04-01` | Post-amendment matrix + report |
| Delta window | `2026-09-01` → `2027-04-01` | `delta.py`, `AmendmentState` |
| `effective_from` on rules | Per clause | `evaluate.active_rules()` filters by date |
| `supersedes_id` | Rule lineage | Later rule drops earlier from active set |

---

## Governance

- **Decision-support only** — no filing to SEBI, no autonomous remediation.
- **Source citations** — every breach in the report includes `source_text_span` from the verified circular text.
- **Human sign-off** — tasks require a named Compliance Officer before an obligation is considered actioned.
