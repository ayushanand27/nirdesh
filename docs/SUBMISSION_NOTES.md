# PPT / submission alignment notes (not part of the runtime app).
# Keep the slide deck OUT of git unless judges explicitly ask for a repo upload —
# submit the .pptx/.pdf via the TechSprint form separately.

## Must-fix on slides (match the live prototype)

| Slide | Current copy | Change to |
|---|---|---|
| Demo Scenario | Alpha Mutual Fund / Pinnacle Broking | **Meridian Asset Management** (compliant → breach on Phase 2) / **Sentinel Debt Fund** (N/A) |
| Demo / Delta | clause_3.2, §2.1 | Real IDs: **§4.1** (Phase 1 VWAP) → **§4.4** (Phase 2 T-1 NAV); bands **§5.1.1 / §5.2.1 / §5.3.1** |
| Tech stack | Celery + Redis, pgvector + Cohere, SEBI RSS, Docker as shipped | Label those as **Roadmap**. Shipped stack: **FastAPI · SQLite · Groq (ingest) · React · reportlab · Render** |
| Architecture | Implies live Postgres/RAG now | Draw **ingest-time LLM** vs **check-time deterministic Python** (matches product reality) |
| Solution | Compile → Evaluate → Act | Add **Report / Evidence pack** as closing step (preview + PDF + audit entry) |
| Delta | Only Sept 1 headline | Keep the **Apr 1 2027** second deadline — it is the demo's strongest point |
| Ingest | Missing | Show **Circular ingest** screenshot: PDF upload → extracted rules + human-review flags |
| Evidence | Missing | Show **Evidence pack** screenshot: in-app preview before PDF download |

## Demo click path (2–3 min)

1. Circular ingest — upload `backend/data/circular_MRD-POD3-2026_ORIGINAL.pdf`
2. Compliance matrix — Phase 1 Simple + Technical
3. Regulatory delta — Apply amendment → Meridian flip
4. Officer sign-off — Generate tasks → Mark reviewed
5. Evidence pack — Preview → Download PDF

**Honesty line for ingest:** extraction is a live preview; the matrix uses the human-reviewed canonical ruleset for this demo circular.

## Safe claims for judges

- LLM extracts; code decides; human signs off; no autonomous filing.
- Firm case files (click firm in matrix), matrix CSV export, extraction QA preview (UI-only in demo build)
- Idempotent apply / generate-tasks / mark-reviewed; audit is a trail of state changes.
- Verbatim source citations on breaches and in the PDF.
- Live URLs in README (Render may cold-start).

## Do not claim as built today

- Celery/Redis job queue as current infra
- pgvector + Cohere rerank in production path
- Live SEBI RSS auto-ingestion
- Multi-user auth / SSO
- Filing into CTR/HYTR systems
- Extraction overwrite of the live evaluation ledger (preview only in this build)
