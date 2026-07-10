# Submission notes — Securities Market TechSprint @ GFF 2026

**Live app:** https://nirdesh-frontend.onrender.com  
**GitHub:** https://github.com/ayushanand27/nirdesh  
**PPT brief:** [PPT_IMPROVEMENT.md](PPT_IMPROVEMENT.md) (copy into Kimi K2 + insert screenshots)  
**Form fields:** [SUBMISSION_FORM.md](SUBMISSION_FORM.md)

---

## Demo click path (2–3 min)

1. **Circular ingest** — upload `backend/data/circular_MRD-POD3-2026_ORIGINAL.pdf` (Circular ID pre-filled)
2. **Compliance matrix** — 01 Sep 2026 · Bharat breach · Meridian compliant · open firm case file
3. **Regulatory delta** — Apply amendment → Meridian flips (§4.4 supersedes §4.1)
4. **Officer sign-off** — Generate tasks → Sign off as **A. Anand**
5. **Evidence pack** — Preview → Download PDF

**Honesty line for ingest:** extraction is live (PDF parse + cache/LLM); matrix uses human-reviewed canonical ruleset (*Draft — not persisted* in UI).

**Run evaluation:** idempotent — repeat clicks do not change matrix if outcome is unchanged. Seed eval runs on app boot ("By Seed data" in audit).

---

## Safe claims for judges

- LLM extracts at ingest; deterministic Python decides compliant / breach / N/A
- Human Compliance Officer sign-off; no autonomous filing to SEBI
- Firm case files, matrix CSV export, regulatory delta with supersession redline UI
- Idempotent apply / generate-tasks / mark-reviewed; append-only audit trail
- Verbatim source citations on breaches and in PDF export
- Live URLs on Render (free tier may cold-start ~30–60s)

## Do not claim as built today

- Celery/Redis job queue
- pgvector / live RAG retrieval
- Live SEBI RSS auto-ingestion
- Multi-user auth / SSO
- Ingest → ledger promotion (ingest is QA preview only in this build)
- Filing into CTR/HYTR systems

---

## Screenshots (in repo — complete)

All 12 files: [`docs/assets/screenshots/`](assets/screenshots/)

| PPT topic | Files |
|---|---|
| Ingest | `06-ingest-extracted.png` |
| Matrix | `01-matrix-simple-phase1.png`, `04-firm-casefile-bharat.png` |
| Delta | `07-delta-before-apply.png`, `08-delta-after-apply.png` |
| Sign-off | `09-officer-signoff-pending.png`, `10-officer-signoff-reviewed.png` |
| Evidence + audit | `11-evidence-pack.png`, `12-audit-trail-details.png` |

---

## PPT deck — update checklist

Use old deck only as structure. Replace content per [PPT_IMPROVEMENT.md](PPT_IMPROVEMENT.md).

| Fix in deck | Correct value |
|---|---|
| Firm names | Bharat Growth AMC · Meridian Asset Management · Sentinel Debt Fund |
| Clause IDs | §4.1 · §4.4 · §5.1.1 · §5.2.1 · §5.3.1 |
| Officer in demo | A. Anand |
| Tech "shipped" | FastAPI · SQLite · Groq (ingest) · React · reportlab · Render |
| Tech "roadmap" | PostgreSQL · pgvector · Celery · SEBI RSS · SSO |
| Footer disclaimer | Title slide + last slide only |
| Screenshots | Insert all 12 from `docs/assets/screenshots/` |

---

## Remaining before deadline (Jul 12, 2026)

- [ ] Final PPT from [PPT_IMPROVEMENT.md](PPT_IMPROVEMENT.md) → upload to HackCulture
- [ ] Loom video (under 3 min) → paste URL in form
- [ ] Re-save HackCulture form
