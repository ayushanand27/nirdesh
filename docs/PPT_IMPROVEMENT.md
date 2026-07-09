# PPT improvement guide — slide-by-slide (Jul 2026)

Match the **live prototype**: https://nirdesh-frontend.onrender.com

**Global fix:** Remove the repeated footer `Decision-support only — not a regulatory filing` from **every** slide. Use it **once** on the title slide (small) and **once** on the Technology or Ask slide. Judges read it the first time.

---

## Screenshot inventory

### Already in repo (`docs/assets/screenshots/`)

| File | Use on slide |
|------|----------------|
| `01-matrix-simple-phase1.png` | Live Demo — Matrix (Phase 1) |
| `02-matrix-technical-phase1.png` | Optional backup / appendix |
| `03-delta-before-apply.png` | Optional — if you show before/after |
| `04-delta-meridian-flip.png` | Regulatory Delta / Live Demo Delta |
| `05-officer-signoff.png` | Optional — Officer sign-off |

### Capture and add (for a complete deck)

| File to save | Tab | What must be visible |
|--------------|-----|----------------------|
| `06-ingest.png` | Circular ingest | PDF uploaded, rules count, **Review status** + **Preview only** |
| `07-firm-casefile.png` | Matrix | **Bharat Growth AMC** case file drawer open |
| `08-matrix-phase2.png` | Matrix | **01 Apr 2027**, Meridian **Breach** |
| `09-evidence-pack.png` | Evidence pack | Preview + **Download PDF** |
| `10-signoff-reviewed.png` | Officer sign-off | Task **Mark reviewed** by A. Sharma |

Compress images before inserting (target **&lt;400 KB** each for PPT): export width ~1400px, PNG or high-quality JPEG.

---

## Recommended deck structure (11 slides)

| # | Slide | Screenshot? |
|---|--------|-------------|
| 1 | Title | No |
| 2 | Problem | No |
| 3 | Real Stakes | No |
| 4 | Solution (5 steps) | No |
| 5 | Demo Scenario | No (table) |
| 6 | **Circular Ingest** | `06-ingest.png` |
| 7 | **Compliance Matrix** | `01-matrix-simple-phase1.png` or `07-firm-casefile.png` |
| 8 | **Regulatory Delta** | `04-delta-meridian-flip.png` |
| 9 | **Officer Sign-off + Evidence** | `09-evidence-pack.png` or split 10 + 09 |
| 10 | Why Not a Chatbot | No |
| 11 | Technology + Business + Ask | No (dense — OK for hackathon) |

You can keep **Business Model** and **The Ask** as separate slides (13 total) if your template has room.

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
- Subtitle line: `LIVE PROTOTYPE · DECISION-SUPPORT ONLY` (one line only)
- **Remove** second duplicate disclaimer block on this slide

**Optional add (small):**
- github.com/ayushanand27/nirdesh

---

## Slide 2 — The Problem

**Keep** — copy is strong.

**Trim:** Remove footer disclaimer.

**Optional one-line add at bottom:**
- *CTR and HYTR rows grow with every circular amendment.*

---

## Slide 3 — Real Stakes

**Keep** — 88 trading days story is your best hook.

**Fix:** Ensure "30-stock limit" reads as *example enforcement* not ETF demo (ETF demo is separate circular).

**Remove** footer disclaimer.

---

## Slide 4 — Solution

**REPLACE title:**
```
Solution: Ingest → Evaluate → Act → Report
```

**REPLACE body (5 steps):**

```
Nirdesh turns regulatory text into a living obligation ledger.

0 Ingest
Upload SEBI circular PDF → LLM extracts rule objects
Flag non-checkable clauses · officer QA preview
(Demo matrix uses human-reviewed canonical ruleset)

1 Compile
Structured rules: clause · condition · threshold · deadline
needs_human_review when not objectively checkable

2 Evaluate
Deterministic Python · firm profile → compliant / breach / N/A
No LLM at check time · firm case files · CSV export

3 Act
Breach → officer review tasks
Named CCO sign-off before obligation is actioned

4 Report
Evidence pack: in-app preview + auditable PDF
Append-only audit log
```

**Remove:** old "Compile → Evaluate → Act + Report" without Ingest.

**Remove** footer disclaimer (or single line: *Decision-support only · no autonomous filing*).

---

## Slide 5 — Demo Scenario

**Keep table** — it's accurate.

**ADD below table (bold):**

```
Phase 1 deadline: 01 Sep 2026 (§4.1 · T-1 VWAP)
Phase 2 deadline: 01 Apr 2027 (§4.4 · T-1 NAV — supersedes §4.1)
```

**Fix mock evaluation line:**

```
BREACH · Bharat Growth AMC — T-2 NAV after 01 Sep 2026
COMPLIANT · Meridian Asset Management — T-1 VWAP (Phase 1)
FLIPS TO BREACH · Meridian — when §4.4 applied (01 Apr 2027)
N/A · Sentinel Debt Fund — no ETF schemes
```

**Remove** footer disclaimer.

---

## Slide 6 — NEW: Circular Ingest

**Title:**
```
Live Demo — Circular Ingest
```

**Subtitle:**
```
PDF → structured obligations · human review flags · QA preview
```

**Screenshot:** `06-ingest.png` (large, centre or right)

**Bullets (left if screenshot on right):**
- Upload `circular_MRD-POD3-2026_ORIGINAL.pdf`
- ~8 rules extracted · 2 flagged for review
- Preview only — matrix uses seeded canonical ruleset

---

## Slide 7 — Live Demo — Compliance Matrix

**Title:** keep

**Subtitle REPLACE:**
```
As of 01 Sep 2026 · click firm for case file · Export CSV
```

**Screenshot:** `01-matrix-simple-phase1.png` OR `07-firm-casefile.png` (case file is stronger for judges)

**Caption under image:**
```
Bharat Growth AMC — breach on §4.1 · Meridian compliant · Sentinel N/A
```

**Delete** if you have a separate slide only for technical view — one matrix screenshot is enough.

---

## Slide 8 — Regulatory Delta

**Merge** your two delta slides into **one** if time-constrained.

**Keep:**
- OLD §4.1 / NEW §4.4 comparison
- Meridian Compliant → Breach · NEWLY FLAGGED

**Subtitle REPLACE:**
```
One circular · two deadlines · Meridian flips when §4.4 supersedes §4.1
```

**Screenshot:** `04-delta-meridian-flip.png` or live delta tab after Apply

**Optional small callout:**
```
Also available: Phase 2 matrix view (01 Apr 2027) — screenshot 08
```

---

## Slide 9 — Officer Sign-off & Evidence Pack

**Option A — one slide, two screenshots side by side:**
- Left: `10-signoff-reviewed.png`
- Right: `09-evidence-pack.png`

**Title:**
```
Human Sign-off → Evidence Pack
```

**Bullets:**
- Generate tasks from breaches · Mark reviewed (A. Sharma)
- Evidence pack preview · Download PDF for audit file
- Every export logged in append-only audit trail

---

## Slide 10 — Why Not a Chatbot

**Keep table** — strong.

**Add one row (optional):**

| Capability | Generic RAG Chatbot | Nirdesh |
|------------|---------------------|---------|
| Circular ingest | Paste & pray | PDF upload + structured extraction + review flags |

**Remove** footer disclaimer.

---

## Slide 11 — Technology

**CRITICAL FIX — Shipped section REPLACE:**

```
SHIPPED
Backend          Python · FastAPI · SQLAlchemy · SQLite
AI (ingest only) Groq llama-3.3-70b · JSON extraction
Evaluation       Deterministic Python — no LLM at check time
Frontend         React · TypeScript · Tailwind
                 5 tabs: Ingest · Matrix · Delta · Sign-off · Evidence
Features         PDF upload · firm case files · matrix CSV export
Export           reportlab PDF + evidence pack preview
Deploy           Render · GitHub public repo
```

**CRITICAL FIX — Roadmap REPLACE (remove PDF upload):**

```
ROADMAP (not built today)
PostgreSQL + pgvector · multi-circular retrieval
Celery/Redis · async ingestion jobs
Live SEBI RSS feed
Persistent ingest QA → active ruleset promotion
Multi-user auth · deployment hardening
```

**Architecture lines — keep but fix:**

```
INGEST:     Circular PDF → LLM extract → review flags → [canonical ruleset → DB]
CHECK:      Firm profiles → Deterministic evaluator → Matrix / Delta / Tasks / PDF
```

**Remove:** `Live SEBI RSS + PDF uploads` from roadmap.

---

## Slide 12 — Business Model

**Keep** — fine for hackathon.

**Remove** footer disclaimer.

---

## Slide 13 — The Ask

**Keep** Sandbox / Mentorship / Pilot — good.

**Ensure links:**
- nirdesh-frontend.onrender.com
- github.com/ayushanand27/nirdesh

**Add if video ready:**
- Demo video: [Loom URL]

**Single closing line:**
```
Decision-support only — no autonomous filing to SEBI
```

---

## Quick wins (30 min in PowerPoint)

1. Delete duplicate disclaimer from slides 2–12
2. Fix Technology slide (PDF upload → shipped)
3. Add Ingest + Evidence screenshots (slides 6 & 9)
4. Add Phase 2 date on Demo Scenario slide
5. Compress all screenshots (&lt;400 KB each)
6. Renumber solution to 5 steps including Ingest

---

## What NOT to change

- Firm names: Bharat / Meridian / Sentinel ✓
- Clause IDs: §4.1, §4.4, §5.x ✓
- Tagline: The LLM extracts. The code decides. ✓
- 88 trading days enforcement story ✓
