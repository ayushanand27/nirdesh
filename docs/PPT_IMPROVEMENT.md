# PPT improvement guide — slide-by-slide (Jul 2026, UI refresh)

Match the **live prototype**: https://nirdesh-frontend.onrender.com

**UI refresh (Jul 2026):** Institutional formatting — human-readable audit details, firm profiles, rule conditions, breach summaries. **No raw JSON** in the UI. Recreate screenshots before updating slides.

**Screenshot capture list:** [docs/assets/screenshots/SCREENSHOT_CHECKLIST.md](../assets/screenshots/SCREENSHOT_CHECKLIST.md)

**Global fix:** Remove the repeated footer `Decision-support only — not a regulatory filing` from **every** slide. Use it **once** on the title slide (small) and **once** on the Technology or Ask slide.

---

## Screenshot inventory (replace all old images)

### Required — 12 files in `docs/assets/screenshots/`

| File | Use on slide | Must show |
|------|--------------|-----------|
| `01-matrix-simple-phase1.png` | Live Demo — Matrix | 01 Sep 2026 · Simple · 2 breach · Bharat/Meridian/Sentinel |
| `02-matrix-technical-phase1.png` | Optional appendix | Technical toggle · plain breach lines |
| `03-matrix-phase2.png` | Demo Scenario or Matrix | 01 Apr 2027 · Meridian **Breach** |
| `04-firm-casefile-bharat.png` | Live Demo — Matrix | Bharat drawer · labeled profile · breach detail |
| `05-rule-drawer.png` | Solution / deep-dive | Field / Check / Required · source citation |
| `06-ingest-extracted.png` | Circular Ingest | PDF extracted · **Draft — not persisted** |
| `07-delta-before-apply.png` | Regulatory Delta | Before Apply · §4.1 → §4.4 |
| `08-delta-after-apply.png` | Regulatory Delta | After Apply · Meridian flip |
| `09-officer-signoff-pending.png` | Sign-off | Pending queue |
| `10-officer-signoff-reviewed.png` | Sign-off + Evidence | Reviewed by A. Sharma |
| `11-evidence-pack.png` | Evidence Pack | Preview metrics · Download PDF |
| `12-audit-trail-details.png` | Technology / Governance | Review or Amendment **Details** expanded — labeled rows, not JSON |

### Deprecated (delete from PPT if still embedded)

| Old file | Reason |
|----------|--------|
| `03-delta-before-apply.png` (old numbering) | Renamed → `07-delta-before-apply.png` |
| `04-delta-meridian-flip.png` | Renamed → `08-delta-after-apply.png` |
| `05-officer-signoff.png` | Split → `09` + `10` |
| Any screenshot showing JSON audit block | UI no longer shows this |

Compress before insert: **&lt;400 KB** each, ~1400px wide.

---

## Recommended deck structure (12 slides)

| # | Slide | Screenshot |
|---|--------|------------|
| 1 | Title | — |
| 2 | Problem | — |
| 3 | Real Stakes | — |
| 4 | Solution (5 steps) | — |
| 5 | Demo Scenario | — (table) |
| 6 | **Circular Ingest** | `06-ingest-extracted.png` |
| 7 | **Compliance Matrix** | `01-matrix-simple-phase1.png` + inset `04-firm-casefile-bharat.png` |
| 8 | **Regulatory Delta** | `07-delta-before-apply.png` + `08-delta-after-apply.png` |
| 9 | **Officer Sign-off** | `09-officer-signoff-pending.png` → `10-officer-signoff-reviewed.png` |
| 10 | **Evidence + Audit** | `11-evidence-pack.png` + small `12-audit-trail-details.png` |
| 11 | Why Not a Chatbot | — |
| 12 | Technology + Business + Ask | — |

---

## Slide 1 — Title

**Keep:**
- Nirdesh
- The LLM extracts. The code decides.
- Compliance Impact System for SEBI Regulatory Change
- Agentic Compliance: From Regulatory Text to Operational Action
- Ayush Anand · Manipal University Jaipur
- SECURITIES MARKET TECHSPRINT @ GFF 2026
- nirdesh-frontend.onrender.com

**Change:**
- Subtitle: `LIVE PROTOTYPE · DECISION-SUPPORT ONLY` (one line)
- **Remove** duplicate disclaimer blocks

**Optional:** github.com/ayushanand27/nirdesh

---

## Slide 2 — The Problem

**Keep** — copy is strong. **Remove** footer disclaimer.

---

## Slide 3 — Real Stakes

**Keep** — 88 trading days story. **Remove** footer disclaimer.

---

## Slide 4 — Solution

**Title:**
```
Solution: Ingest → Evaluate → Act → Report
```

**Body (5 steps):**

```
0 Ingest     PDF → LLM rule extraction · review flags · officer QA preview
1 Compile    Clause · condition · threshold · deadline (never guessed)
2 Evaluate   Deterministic Python · compliant / breach / N/A · firm case files
3 Act        Breach → review tasks · named CCO sign-off
4 Report     Evidence pack preview + PDF · append-only audit trail
```

**Optional small image:** `05-rule-drawer.png` (shows structured condition, not code dump)

---

## Slide 5 — Demo Scenario

**Keep table.** Add:

```
Phase 1: 01 Sep 2026 (§4.1 · T-1 VWAP)
Phase 2: 01 Apr 2027 (§4.4 · T-1 NAV — supersedes §4.1)
```

**Screenshot (small corner):** `03-matrix-phase2.png`

---

## Slide 6 — Circular Ingest

**Title:** `Live Demo — Circular Ingest`

**Screenshot:** `06-ingest-extracted.png` (large)

**Bullets:**
- Upload `circular_MRD-POD3-2026_ORIGINAL.pdf`
- Rules extracted · flagged for review
- **Draft — not persisted** — matrix uses human-reviewed canonical ruleset

---

## Slide 7 — Compliance Matrix

**Title:** `Live Demo — Compliance Matrix`

**Screenshot:** `01-matrix-simple-phase1.png` (main) + `04-firm-casefile-bharat.png` (inset or second panel)

**Caption:**
```
01 Sep 2026 · Bharat breach · Meridian compliant · Sentinel N/A
Click firm → case file with profile + breach evidence
```

**Mention:** Export CSV · Simple / Technical views

---

## Slide 8 — Regulatory Delta

**Screenshots:** `07-delta-before-apply.png` and `08-delta-after-apply.png` (side by side)

**Subtitle:**
```
One circular · two deadlines · Meridian flips when §4.4 supersedes §4.1
```

---

## Slide 9 — Officer Sign-off

**Screenshots:** `09-officer-signoff-pending.png` → `10-officer-signoff-reviewed.png`

**Bullets:**
- Generate tasks from breaches
- Mark reviewed (A. Sharma)
- Idempotent — no duplicate audit noise

---

## Slide 10 — Evidence Pack + Audit

**Screenshots:**
- Main: `11-evidence-pack.png`
- Inset: `12-audit-trail-details.png`

**Bullets:**
- In-app preview + Download PDF
- Audit trail: human-readable event details (Review/Amendment Details; Eval outcome in message line)
- Governance: decision-support only

---

## Slide 11 — Why Not a Chatbot

**Keep table.** Optional row:

| Capability | Generic RAG | Nirdesh |
|------------|-------------|---------|
| Audit / evidence | Chat log | Append-only trail + exportable PDF |

---

## Slide 12 — Technology + Ask

**SHIPPED (update from old deck):**

```
Backend     Python · FastAPI · SQLAlchemy · SQLite
AI (ingest) Groq llama-3.3-70b — extraction only
Evaluation  Deterministic Python — no LLM at check time
Frontend    React · TypeScript · Tailwind
              5 tabs: Ingest · Matrix · Delta · Sign-off · Evidence
              Institutional UI: labeled profiles, audit details, breach summaries
Export      reportlab PDF + matrix CSV
Deploy      Render · GitHub public repo
```

**ROADMAP:** PostgreSQL + pgvector · Celery/Redis · SEBI RSS · ingest→ledger promotion · auth/SSO

**Ask:** Sandbox · Mentorship · Pilot AMC

**Links:** nirdesh-frontend.onrender.com · github.com/ayushanand27/nirdesh · [Loom URL]

**Closing line (once):** Decision-support only — no autonomous filing to SEBI

---

## Quick wins (30 min)

1. Replace **all** screenshots with the 12 new files
2. Delete duplicate disclaimers
3. Fix ingest badge text: **Draft — not persisted** (not "Preview only")
4. Add audit Details screenshot on governance slide
5. Compress images &lt;400 KB

---

## What NOT to change

- Firm names: Bharat / Meridian / Sentinel ✓
- Clause IDs: §4.1, §4.4, §5.x ✓
- Tagline: The LLM extracts. The code decides. ✓
- 88 trading days enforcement story ✓
