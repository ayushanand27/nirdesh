# HackCulture form — copy-paste fields (Idea Submission)

**Program:** Securities Market TechSprint @ GFF 2026  
**Deadline:** Jul 12, 2026, 11:59 PM  
**Live app:** https://nirdesh-frontend.onrender.com  
**GitHub:** https://github.com/ayushanand27/nirdesh  

---

## Theme *(pre-filled)*

SEBI Securities Market TechSprint

## Problem Statement *(pre-filled)*

Agentic Compliance From Regulatory Text to Operational Action

---

## Project Title

```
Nirdesh — Compliance Impact System for SEBI Regulatory Change
```

## Team Members — Name & Organization

```
Ayush Anand — Manipal University Jaipur
```

---

## Brief description of the idea

```
SEBI keeps issuing circulars. Compliance teams at AMCs and brokers must determine what changed, who owns the fix, and whether they remain compliant before the next CTR or HYTR is due. Nirdesh closes that gap between "circular published" and "obligation actioned."

Nirdesh (निर्देश) is a compliance impact / decision-support system. Demo corpus: SEBI circular HO/47/11/11(1)2026-MRD-POD3/I/13804/2026 (15 Jun 2026) on ETF base price and price bands — with hard deadlines (1 Sep 2026 and 1 Apr 2027) and numeric, machine-checkable rules.

The system compiles obligations into structured rules (clause, condition, threshold, deadline). Clauses that cannot be objectively checked are flagged for human review — never guessed. A deterministic engine evaluates firm profiles as compliant / breach / not applicable with no LLM at decision time. When a rule is superseded, Nirdesh shows the regulatory delta: old vs new obligation and which firms flip compliant → breach.

Motivation: a late-2024 SEBI enforcement matter where an AMC and its CEO were personally fined after a focused fund breached a 30-stock limit across 88 trading days. Threshold rules are machine-checkable; waiting weeks to interpret a circular is operational liability.

Demo firms (fictional): Bharat Growth AMC breaches on Phase 1 (T-2 NAV); Meridian Asset Management is compliant on 1 Sep 2026 (T-1 VWAP) then flips to breach when §4.4 (T-1 closing NAV, 1 Apr 2027) is applied; Sentinel Debt Fund is N/A (no ETF schemes). Compliance officers review and sign off. Nothing auto-files to SEBI. Full append-only audit trail and exportable evidence pack (PDF).
```

---

## Proposed solution / Business model / commercial potential

```
How it works (live prototype at https://nirdesh-frontend.onrender.com):

1. Ingest — Upload SEBI circular PDF or paste text. Groq (llama-3.3-70b) extracts structured rule objects; non-checkable clauses flagged needs_human_review. Officer QA preview in UI (demo matrix uses human-reviewed canonical ruleset).
2. Evaluate — Deterministic Python compares firm profiles to active rules as-of a date → compliant / breach / not applicable. Firm case files, matrix CSV export, simple/technical views.
3. Regulatory delta — On amendment (demo: §4.1 → §4.4), show superseded obligation and firms that flip compliant → breach.
4. Act — Generate review tasks for the Compliance Officer; named human sign-off required before an obligation is considered actioned. Idempotent state changes → clean audit trail.
5. Report — Evidence pack: in-app preview + compliance summary PDF (matrix, source citations, delta, sign-off log). Decision-support disclaimer in UI.

Demo scenario: Bharat Growth AMC still on T-2 NAV → breach after 1 Sep 2026. Meridian compliant on Phase 1, flips to breach on Phase 2. Sentinel N/A. One circular, two compliance clocks.

Business model: B2B SaaS for AMCs, brokers, and RIAs — subscription tiered by AUM or entity count after a pilot with one intermediary. Longer term: regulation packs (MF Regs, LODR, CSCRF), API for RegTech vendors, white-label for consultancies.

Why now: SEBI framed "agentic compliance" as regulatory text → operational action. Many teams will build a chatbot over PDFs. Nirdesh is the obligation ledger plus the "what changed when the rule changed" view — what people signing CTRs actually need.

GitHub: https://github.com/ayushanand27/nirdesh
```

---

## Technology stack details

```
SHIPPED (working prototype):
• Backend: Python 3.11+, FastAPI, SQLAlchemy, SQLite (obligation ledger + append-only audit log)
• AI: Groq llama-3.3-70b — JSON-mode extraction at ingest time only; demo matrix uses human-reviewed canonical ruleset verified against official circular PDF
• Evaluation: Deterministic Python rule engine — breach logic is code, not LLM output
• Frontend: React + TypeScript + Tailwind — circular ingest (PDF upload), compliance matrix (simple/technical, firm case files, CSV export), regulatory delta, officer sign-off, evidence pack preview, human-readable audit trail (no raw JSON in UI)
• Export: reportlab PDF compliance summary + matrix CSV
• Deploy: Render (static frontend + FastAPI); GitHub: https://github.com/ayushanand27/nirdesh

ROADMAP (not claimed as production today):
• PostgreSQL + pgvector for multi-circular retrieval
• Celery/Redis for async ingestion jobs
• Live SEBI RSS monitoring
• Persistent ingest QA → active ruleset promotion
• Multi-user auth / SSO for officer attribution
• Docker / deployment hardening
```

---

## Process flow / architecture

```
FLOW:
SEBI circular (demo: MRD-POD3 ETF circular PDF in repo)
  → Ingest: LLM extraction + review flags (canonical ruleset for evaluation)
  → Obligation ledger (supersession: legacy → §4.1 → §4.4)
  → Deterministic evaluator vs firm profiles as-of date
  → Compliance matrix: compliant / breach / N/A per firm per rule
  → On amendment: regulatory delta + re-evaluation (Meridian flip)
  → Officer review tasks + named sign-off
  → Evidence pack (preview + PDF) + append-only audit log

ARCHITECTURE:
React dashboard (5 tabs: Ingest → Matrix → Delta → Sign-off → Evidence)
  → FastAPI
  → Rule evaluator (Python, deterministic) + amendment state + review tasks
  → SQLite ledger / audit log  →  [roadmap] PostgreSQL + pgvector

Governance: decision-support only; no autonomous filing; source citations on breaches and in PDF; human verification before any regulatory submission.

Principle: The LLM extracts. The code decides.
```

---

## Upload your idea deck

Already uploaded: `submission_kuu6ze3k2vj.pptx` — update slides to match live prototype (see docs/SUBMISSION_NOTES.md).

## Demo video link (max 3 minutes)

```
[PASTE YOUR LOOM URL HERE after recording]
```

Suggested flow: Ingest → Matrix (firm case file) → Delta (Apply) → Sign-off → Evidence pack → Download PDF.

## GitHub repository link

```
https://github.com/ayushanand27/nirdesh
```

---

## Before you click Save

- [ ] **12 new screenshots** captured per [SCREENSHOT_CHECKLIST.md](assets/screenshots/SCREENSHOT_CHECKLIST.md) (old repo images are outdated)
- [ ] PPT recreated with new screenshots (see [PPT_IMPROVEMENT.md](../PPT_IMPROVEMENT.md)) and re-uploaded if slides changed
- [ ] Demo video URL filled (Loom, unlisted or public, under 3 min)
- [ ] PPT uses Meridian / Sentinel / Bharat (not Alpha / Pinnacle)
- [ ] Live app opens after cold start (~30s refresh)
- [ ] Run demo once end-to-end on production URL

### Form text — Jul 2026 UI refresh

**No major form changes needed.** Features are unchanged; only presentation improved (human-readable audit details, firm profiles, rule conditions, breach lines).

Optional micro-edits already reflected above:
- "Decision-support disclaimer **in UI**" (footer removed from every view)
- Frontend bullet mentions **human-readable audit trail**

Re-save the form only after you add the **Loom URL** and optionally re-upload the updated PPT.
