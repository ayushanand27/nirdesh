# Nirdesh

**Compliance impact system for SEBI regulatory change.**

When SEBI issues a circular, compliance teams need to know what changed, who must act, and whether they are still compliant before the next CTR or HYTR is due. Nirdesh turns regulatory text into checkable obligations, evaluates them with deterministic code, surfaces amendments as a live delta, requires human sign-off, and exports an auditable compliance report.

> **The LLM extracts. The code decides.**

Built for **Securities Market TechSprint @ GFF 2026** — *Agentic Compliance: From Regulatory Text to Operational Action.*

---

## Live demo

| | URL |
|---|---|
| **Application** | https://nirdesh-frontend.onrender.com |
| **API** | https://nirdesh-backend.onrender.com |
| **Health** | https://nirdesh-backend.onrender.com/health |

The hosted backend may take 30–60 seconds to wake from sleep on the free tier. Refresh once if the first load fails.

Interactive API docs: https://nirdesh-backend.onrender.com/docs

---

## What it does

| Capability | Description |
|---|---|
| **Rule compilation** | Circular text → structured rules (clause, condition, threshold, deadline). Uncheckable clauses are flagged `needs_human_review` — never guessed. |
| **Compliance matrix** | Firms × obligations → **compliant**, **breach**, or **not applicable**, as of any effective date. |
| **Regulatory delta** | When a rule supersedes another, see old vs new and which firms flip **compliant → breach**. |
| **Officer sign-off** | Breaches become review tasks. A named Compliance Officer must sign off before an obligation is considered actioned. |
| **Audit trail** | Append-only log of extractions, evaluations, amendments, reviews, and report exports. |
| **Compliance report** | Download a PDF with matrix, source citations, delta (if applicable), and sign-off log. |

**Governance:** decision-support only. No autonomous filing to SEBI.

---

## How it works

```
Circular text  →  LLM extraction (ingest only)  →  Reviewed rule ledger
                                                        ↓
Firm profiles  →  Deterministic evaluator  →  Matrix / Delta / Tasks / PDF
                                                        ↓
                                              Officer sign-off + audit log
```

1. **Ingest** — LLM (Groq) proposes rule objects, or the demo uses a human-reviewed canonical ruleset verified against the official circular PDF.
2. **Evaluate** — Python compares firm data to active rules. No LLM at compliance-check time.
3. **Delta** — Superseded obligations and firm status transitions are computed when an amendment window is applied.
4. **Sign-off** — Review tasks are generated for breaches; officer approval is recorded in the audit trail.
5. **Report** — A compliance summary PDF is generated and logged.

State-changing actions (apply amendment, mark reviewed, etc.) are **idempotent** — duplicate clicks do not create duplicate audit noise.

---

## Demo corpus

**Circular:** `HO/47/11/11(1)2026-MRD-POD3/I/13804/2026` (15 Jun 2026) — ETF base price and price bands.

| Deadline | Key change |
|---|---|
| **1 Sep 2026** (§4.1) | Base price moves from T-2 NAV to T-1 closing price (30-min VWAP) |
| **1 Apr 2027** (§4.4) | Base price moves to T-1 closing NAV — supersedes §4.1 |

**Mock AMCs** (fictional demo data):

- **Bharat Growth AMC** — breach on Phase 1 (still on T-2 NAV)
- **Meridian Asset Management** — compliant on Phase 1, **flips to breach** when §4.4 is applied
- **Sentinel Debt Fund** — not applicable (no ETF schemes)

---

## Tech stack

| Layer | Technology |
|---|---|
| Backend | Python 3.11+, FastAPI, SQLAlchemy, SQLite |
| AI (ingest only) | Groq `llama-3.3-70b` — JSON-mode rule extraction |
| Evaluation | Deterministic Python (`evaluate.py`) |
| Frontend | React, TypeScript, Tailwind, Vite |
| Reports | reportlab (PDF) |
| Deploy | Render (static site + web service) |

**Roadmap** (not in current build): PostgreSQL + pgvector, async ingestion workers, live SEBI RSS/PDF upload UI, multi-user auth.

---

## Quick start (local)

**Requirements:** Python 3.11+, Node 18+

```bash
# Clone and run (macOS / Linux / Git-Bash)
git clone https://github.com/ayushanand27/nirdesh.git
cd nirdesh
./run.sh
```

Open http://127.0.0.1:5173

**Environment:** copy `backend/.env.example` → `backend/.env`. A Groq API key is optional; the demo runs with a cached extraction and seeded canonical rules.

**Reset database:** `cd backend && python seed_db.py`

---

## API overview

| Endpoint | Purpose |
|---|---|
| `GET /health` | Service status |
| `GET /matrix?as_of=` | Compliance matrix (read-only) |
| `POST /evaluate?as_of=` | Record evaluation when outcome changes |
| `GET /delta?from_as_of=&to_as_of=` | Regulatory delta preview or apply |
| `POST /review-tasks/generate` | Create officer review tasks |
| `POST /review-tasks/{id}/review` | Officer sign-off |
| `GET /reports/compliance-summary?format=pdf` | Compliance report PDF |
| `GET /audit` | Audit trail |

Full reference: `/docs` on the running backend.

---

## Project structure

```
backend/app/     API, evaluation engine, delta, sign-off, report PDF
frontend/src/    Matrix, regulatory delta, officer sign-off, audit panel
render.yaml      Render deployment blueprint
```

---

## Author

**Ayush Anand** — Manipal University Jaipur

---

## Disclaimer

Nirdesh is a **decision-support system**. Compliance results are computed deterministically but require **Compliance Officer verification** before any operational or regulatory action. This software does not file, submit, or remediate anything on behalf of a regulated entity.
