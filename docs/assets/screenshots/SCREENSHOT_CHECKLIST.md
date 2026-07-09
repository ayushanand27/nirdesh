# Screenshot checklist — current UI (Jul 2026)

**Live app:** https://nirdesh-frontend.onrender.com  
**Save all files here:** `docs/assets/screenshots/`  
**Format:** PNG, width ~1400–1600px, compress to **&lt;400 KB** each for PPT.

> **UI refresh (commit `8d0353e`):** Human-readable audit details, firm profiles, rule conditions, breach lines — **no raw JSON**. Old screenshots in this folder are **outdated** until you replace them.

---

## Required (send all 12)

| # | Filename | Tab / action | Must be visible in frame |
|---|----------|--------------|---------------------------|
| 1 | `01-matrix-simple-phase1.png` | Compliance matrix | **01 Sept 2026** · Simple view · KPI row (5 Compliant / 2 Breach / 5 N/A) · Bharat **Breach** · Meridian **Compliant** · Sentinel **N/A** · context bar `MRD-POD3/2026 · 3 firms × 4 rules` |
| 2 | `02-matrix-technical-phase1.png` | Compliance matrix | Same date · **Technical** toggle on · human-readable cell lines (not JSON) |
| 3 | `03-matrix-phase2.png` | Compliance matrix | Switch to **01 Apr 2027** · Meridian shows **Breach** on base price rule |
| 4 | `04-firm-casefile-bharat.png` | Matrix → click firm | **Bharat Growth AMC** drawer · Profile as labeled rows (Base price method, ETF offerings, bands) · Active breaches with `T-2 NAV · required T-1 closing VWAP` style text |
| 5 | `05-rule-drawer.png` | Matrix → click rule header | Rule drawer · **Condition** as Field / Check / Required · Source citation block |
| 6 | `06-ingest-extracted.png` | Circular ingest | PDF uploaded + extracted rules visible · **Draft — not persisted** badge · Checkable / Needs review sections |
| 7 | `07-delta-before-apply.png` | Regulatory delta | Before **Apply amendment** · §4.1 → §4.4 preview · Meridian transition shown |
| 8 | `08-delta-after-apply.png` | Regulatory delta | After **Apply** (or applied state) · firms newly flagged / Meridian flip |
| 9 | `09-officer-signoff-pending.png` | Officer sign-off | **Awaiting sign-off** with ≥1 pending task · breach line in plain English |
| 10 | `10-officer-signoff-reviewed.png` | Officer sign-off | Same tasks **Reviewed** by **A. Sharma** |
| 11 | `11-evidence-pack.png` | Evidence pack | Preview loaded · metric tiles · breach citations · **Download PDF** button |
| 12 | `12-audit-trail-details.png` | Matrix (audit panel right) | Audit trail · click **Details** on an **Eval** event · labeled rows (As of, Outcome) — **not** a JSON block |

---

## Optional (nice for PPT / README hero)

| # | Filename | What |
|---|----------|------|
| 13 | `13-full-dashboard.png` | Wide crop: header tabs + matrix + audit panel (shows institutional density) |
| 14 | `14-ingest-qa.png` | Ingest with a flagged rule expanded · Approve/Reject if visible |
| 15 | `15-evidence-pdf.png` | Downloaded PDF open (proves export) — crop first page only |

---

## Capture tips

1. **Cold start:** wait 30–60s after first load on Render, then refresh once.
2. **Record evaluation** on matrix if audit panel is empty (button on matrix context bar).
3. **Delta:** if already applied, use **Reset** (dev control on delta tab) then re-capture before/after.
4. **Sign-off:** run **Generate tasks** on Phase 1 or Phase 2 with breaches first.
5. **Browser:** 100% zoom, dark theme as shipped, hide bookmarks bar.
6. **Naming:** use exact filenames above so README and PPT docs auto-match.

---

## After you send screenshots

1. Drop files into `docs/assets/screenshots/`
2. Recreate PPT using [PPT_IMPROVEMENT.md](../../PPT_IMPROVEMENT.md)
3. Record Loom (short script will be provided on request)
4. Paste Loom URL in HackCulture form → **Save**
