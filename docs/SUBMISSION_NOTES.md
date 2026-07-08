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
| Solution | Compile → Evaluate → Act | Add **Report** as closing step (PDF export + audit entry) — already in the app |
| Delta | Only Sept 1 headline | Keep the **Apr 1 2027** second deadline — it is the demo's strongest point |

## Safe claims for judges

- LLM extracts; code decides; human signs off; no autonomous filing.
- Idempotent apply / generate-tasks / mark-reviewed; audit is a trail of state changes.
- Verbatim source citations on breaches and in the PDF.
- Live URLs in README (Render may cold-start).

## Do not claim as built today

- Celery/Redis job queue as current infra
- pgvector + Cohere rerank in production path
- Live SEBI RSS ingestion UI
- Filing into CTR/HYTR systems
