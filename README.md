# Nirdesh — Agentic Compliance

**From regulatory text to operational action.** Nirdesh converts a SEBI circular into
structured, machine-checkable obligations, evaluates them **deterministically**
(no LLM in the decision path), surfaces a **regulatory delta** when rules change,
requires **human sign-off**, and exports an auditable **compliance report**.

Built for the Securities Market TechSprint @ GFF 2026 —
_"Agentic Compliance: From Regulatory Text to Operational Action."_

**Live demo**

| | |
|---|---|
| App | https://nirdesh-frontend.onrender.com |
| API | https://nirdesh-backend.onrender.com |
| Health | https://nirdesh-backend.onrender.com/health |

> Render free tier sleeps after inactivity — wait ~30–60s on first load after a cold start.

---

## The core idea

> **The LLM extracts. The code decides.**

1. **Compile (ingest)** — an LLM proposes structured rule objects from circular text
   (strict JSON). Clauses that cannot be reduced to an objective check are flagged
   `needs_human_review` instead of guessed. The demo ships a **human-reviewed canonical
   ruleset** verified against the official circular PDF.
2. **Evaluate** — plain Python compares each firm’s structured profile to each active
   rule as of a given date. Same inputs → same outputs. Fully auditable.
3. **Delta** — when a later obligation supersedes an earlier one, Nirdesh shows what
   changed and which firms flip **compliant → breach**.
4. **Act (human-in-the-loop)** — breaches become review tasks. Nothing is “actioned”
   until a named Compliance Officer signs off. No autonomous filing.
5. **Report** — export a branded PDF (matrix, citations, delta, sign-off log) and record
   the generation in the audit trail.

---

## Demo scenario

**SEBI Circular** `HO/47/11/11(1)2026-MRD-POD3/I/13804/2026` (15 Jun 2026) —
norms for ETF base price and price bands.

| Area | Old | New (eff. 1 Sep 2026) |
|---|---|---|
| Base price | T-2 day NAV | T-1 closing price (last 30-min VWAP) — **§4.1** |
| Equity/Debt ETFs | Flat ±20% | Dynamic ±10%, flex +5%, max 2 → ±20% — **§5.1.1** |
| Overnight / Liquid | Mixed | Fixed ±5% (liquid newly tightened) — **§5.2.1** |
| Gold/Silver ETFs | Flat ±20% | Dynamic ±6%, flex +3%, trigger 5.90%, uncapped — **§5.3.1** |

**Phase 2 (§4.4, eff. 1 Apr 2027):** base price migrates to **T-1 closing NAV**.
One circular, two deadlines — that second date is the **regulatory delta** punchline.

**Three fictional AMCs (demo data only):**

| Firm | Phase 1 (1 Sep 2026) | After Phase 2 apply (1 Apr 2027) |
|---|---|---|
| **Bharat Growth AMC** | Breach (still on T-2 NAV + stale liquid band) | Still breach (+ §4.4) |
| **Meridian Asset Management** | Compliant (on T-1 VWAP) | **Flips to breach** on §4.4 |
| **Sentinel Debt Fund** | N/A (no ETF schemes) | N/A |

---

## 3-minute demo script

1. **Compliance matrix** — as of **01 Sept 2026**: Bharat red, Meridian green,
   Sentinel grey. Toggle Simple / Technical; open a rule for source citation.
2. **Regulatory delta** — **Apply amendment**. §4.1 → §4.4, Meridian flips
   compliant → breach; button becomes **Applied** (idempotent — no duplicate audit).
3. **Officer sign-off** — Generate tasks → Mark reviewed (named officer).
   Double-generate / double-review are safe no-ops.
4. **Generate Report** — download `nirdesh-compliance-report-<as_of>.pdf`.
   Footer disclaimer + audit entry: “Compliance report generated.”

---

## Run locally

Your Groq API key goes in `backend/.env` (copy from `backend/.env.example`).
The demo works **without** a key — extraction falls back to a cached JSON result.
The UI uses the **canonical reviewed ruleset** seeded into SQLite.

### One command

```bash
# macOS / Linux / Git-Bash
./run.sh
```

```bat
:: Windows
run.bat
```

Open **http://127.0.0.1:5173**.

### Manual (two terminals)

```bash
# Terminal 1 — backend
cd backend
python -m venv .venv && source .venv/Scripts/activate   # or .venv/bin/activate
pip install -r requirements.txt
python seed_cache.py && python seed_db.py
uvicorn app.main:app --port 8000
```

```bash
# Terminal 2 — frontend
cd frontend
npm install
npm run dev
```

**Reset demo DB:** `cd backend && python seed_db.py`.

---

## Architecture (prototype as shipped)

```
INGEST TIME                         COMPLIANCE-CHECK TIME
─────────────────                   ─────────────────────
Circular text / PDF                 Firm profile (structured)
        │                                    │
        ▼                                    ▼
 LLM extract (Groq) ──► human-reviewed       Deterministic Python
   or cache/canonical ruleset                evaluate.py  (NO LLM)
        │                                    │
        ▼                                    ▼
   SQLite rule ledger                 compliant | breach | N/A
                                             │
                              ┌──────────────┼──────────────┐
                              ▼              ▼              ▼
                           Delta          Sign-off        PDF report
                        (supersession)   (HITL)         + audit log
```

| Layer | Choice in this prototype | Production direction (roadmap) |
|---|---|---|
| API | FastAPI | Same |
| Store | SQLite + SQLAlchemy | Postgres (+ pgvector for multi-circular RAG) |
| AI | Groq JSON extraction at ingest only | Same boundary; optional RAG at ingest |
| Eval | Pure Python | Same — never put LLM in the decision path |
| UI | React + TypeScript + Tailwind | Same |
| PDF | reportlab | Same / WeasyPrint at scale |
| Deploy | Render (static + web) | Docker / cloud with persistent volume |

**Not in this prototype (intentionally):** Celery/Redis workers, live SEBI RSS,
pgvector/Cohere rerank, auth/SSO. Those are roadmap items for sandbox/pilot — not
false claims about the current demo.

---

### API surface

| Method | Path | Purpose |
|---|---|---|
| `GET` | `/health` | Status + whether Groq is configured |
| `POST` | `/extract` | LLM/cached extraction from raw circular text |
| `GET` | `/firms` · `/rules` | Seeded firms and rules |
| `GET` | `/matrix?as_of=` | Matrix (read-only, no audit write) |
| `POST` | `/evaluate?as_of=` | Persist evaluation **only if outcome changed** |
| `GET` | `/delta?from_as_of=&to_as_of=&persist=` | Preview or apply amendment (idempotent apply) |
| `POST` | `/delta/reset` | Dev-only reset to Phase 1 |
| `GET`/`POST` | `/review-tasks*` | List / generate / mark reviewed (idempotent) |
| `GET` | `/reports/compliance-summary?as_of=&format=json\|pdf&actor=` | Structured report or PDF |
| `GET` | `/audit` | Append-only audit trail |

---

## Design notes

- **Append-only where it matters.** Evaluations and audit events append; amendments
  insert new rules linked by `supersedes_id` and as-of filtering — history is preserved.
- **Idempotent actions.** Re-apply amendment, re-generate open tasks, re-mark reviewed,
  and identical re-evaluate do not spam the audit trail with duplicate state events.
  Report downloads intentionally each leave an export accountability entry.
- **Decision-support only.** Disclaimer on UI and on every PDF page: human verification
  before any regulatory submission.

### Storage: SQLite (deliberate)

Zero-setup and resettable for a hackathon demo. ORM ports to Postgres with a URL change.
Render free disk is **ephemeral** — the backend reseeds the demo DB on cold start when empty.

---

## Repo layout

```
backend/
  app/
    canonical_rules.py   Human-reviewed control vocabulary
    evaluate.py          Deterministic engine
    delta.py             Regulatory delta + amendment state
    review.py            Officer sign-off
    report.py / report_pdf.py   Compliance summary JSON → PDF
    main.py              FastAPI routes
  seed_db.py             Clean demo seed
frontend/
  src/                   Matrix · Delta · Sign-off · Audit · Report download
render.yaml              Render Blueprint
```

---

_Nirdesh is a decision-support system. All compliance determinations are computed
deterministically and require Compliance Officer sign-off before any operational action._
