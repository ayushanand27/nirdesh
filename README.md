# Nirdesh — Agentic Compliance

**From regulatory text to operational action.** Nirdesh converts SEBI regulatory
circulars into structured, machine-checkable compliance rules, evaluates them
against firm data with a **deterministic engine (no LLM in the decision path)**,
and shows a live **regulatory delta** when a circular is amended — old rule vs
new rule, which obligations changed, and which firms flip from compliant to
breach.

Built for the Securities Market TechSprint @ GFF 2026 —
_"Agentic Compliance: From Regulatory Text to Operational Action."_

---

## The core idea

> **The LLM extracts. It never decides compliance.**

1. **Extract** — an LLM reads a circular and proposes structured rule objects
   with a strict JSON schema. If a clause cannot be reduced to an objectively
   checkable condition, the model **flags it for human review** instead of
   guessing (`needs_human_review: true`).
2. **Review & normalize** — reviewed obligations are encoded into a shared
   *control vocabulary* (the canonical rule set).
3. **Evaluate** — a plain-Python, deterministic engine compares each firm's data
   against each rule. Same inputs → same outputs, every time. Fully auditable.
4. **Sign off** — every surfaced obligation is a *recommendation* until a named
   Compliance Officer explicitly signs off. Nirdesh files nothing autonomously.

This pipeline — _raw AI extraction → human review → deterministic evaluation → human sign-off_ —
is the whole pitch. The UI makes each stage visible.

---

## Demo scenario

**SEBI Circular HO/47/11/11(1)2026-MRD-POD3/I/13804/2026** (15 Jun 2026) —
norms for ETF base price and price bands.

| Area | Old | New (eff. 1 Sep 2026) |
|---|---|---|
| Base price | T-2 day NAV | T-1 closing price (last 30-min VWAP) |
| Equity/Debt ETFs | Flat ±20% | Dynamic ±10%, flex +5%, max 2 flexes → ±20% |
| Overnight ETFs | ±5% | Fixed ±5% (unchanged) |
| Liquid ETFs | ±20% flat | Fixed ±5% (newly tightened) |
| Gold/Silver ETFs | Flat ±20% | Dynamic ±6%, flex +3%, trigger 5.90%, uncapped |

**Phase 2 (clause 4.4, eff. 1 Apr 2027):** base price migrates to T-1 closing
**NAV** — this is the real second deadline used as the *regulatory delta*.

**Three fictional AMCs:**
- **Bharat Growth AMC** — still on T-2 NAV pricing + stale liquid-ETF band → **breach**.
- **Meridian Asset Management** — compliant on 1 Sep 2026, but on T-1 VWAP, so it
  **flips to breach** when the Phase-2 T-1-NAV rule activates. (The delta's punchline.)
- **Sentinel Debt Fund** — offers no ETFs → every ETF rule is **not applicable**.

---

## Run it

Your Groq API key goes in `backend/.env` (copy from `backend/.env.example`).
The demo works **without** a key too — it falls back to a cached extraction.

### One command

```bash
# macOS / Linux / Git-Bash
./run.sh
```

```bat
:: Windows
run.bat
```

Then open **http://127.0.0.1:5173**.

### Manual (two terminals)

```bash
# Terminal 1 — backend
cd backend
python -m venv .venv && source .venv/Scripts/activate   # or .venv/bin/activate
pip install -r requirements.txt
python seed_cache.py && python seed_db.py               # clean demo state
uvicorn app.main:app --port 8000
```

```bash
# Terminal 2 — frontend
cd frontend
npm install
npm run dev
```

**Reset to a pristine demo state anytime:** `cd backend && python seed_db.py`.

---

## 3-minute demo script

1. **Compliance matrix** (Sept 1 2026) — 3 AMCs × obligations, color-coded.
   Bharat Growth is red, Meridian green, Sentinel grey. Click a column → the rule
   drawer shows the machine-checkable condition, source clause, and confidence.
2. **Officer sign-off** — "Generate tasks from current breaches" → each breach
   becomes a review task requiring explicit Compliance Officer sign-off. Nothing
   is actioned autonomously.
3. **Regulatory delta** — "Apply amendment". The system recalculates: clause
   §2.1 → §4.4, ~~T-1 VWAP~~ → **T-1 closing NAV**, and **Meridian flips
   compliant → breach**, flagged in the audit trail.

---

## Architecture

```
backend/                      Python 3.11+ · FastAPI · SQLAlchemy · SQLite
  app/
    schemas.py                Rule-object schema (LLM <-> engine contract)
    llm_client.py             Groq wrapper, JSON mode, temperature 0
    extraction.py             Prompt + guardrails (forces needs_human_review)
    canonical_rules.py        Human-reviewed rule set (control vocabulary)
    evaluate.py               DETERMINISTIC engine — no LLM, as-of dates, supersession
    delta.py                  Old->new diff + firm status transitions
    review.py                 Human sign-off workflow
    models.py                 Append-only ORM (rules never edited; supersedes_id)
    main.py                   API endpoints
  seed_db.py                  Reset + seed clean demo DB
frontend/                     React · TypeScript · Tailwind · Vite
  src/
    App.tsx                   Layout, tabs, data flow
    components/
      MatrixView.tsx          Firm x rule matrix
      RuleDrawer.tsx          Rule drill-down
      DeltaView.tsx           Regulatory delta (the headline feature)
      SignoffView.tsx         Compliance Officer sign-off queue
      AuditPanel.tsx          Append-only event log
```

### API

| Method | Path | Purpose |
|---|---|---|
| `GET` | `/health` | Status + whether Groq is configured (live vs cached) |
| `POST` | `/extract` | Live LLM extraction from raw circular text |
| `GET` | `/firms` · `/rules` | Seeded firms and rules |
| `GET` | `/matrix?as_of=` | Deterministic compliance matrix (read-only) |
| `POST` | `/evaluate?as_of=` | Run + record an evaluation (audit event) |
| `GET` | `/delta?from_as_of=&to_as_of=` | Regulatory delta between two dates |
| `GET`/`POST` | `/review-tasks*` | Generate / list / sign off review tasks |
| `GET` | `/audit` | Append-only audit trail |

---

## Design notes

- **Append-only by design.** Rules are never edited or deleted — an amendment
  inserts a new rule that points at the one it supersedes (`supersedes_id`), and
  supersession is computed by effective date. Evaluations and the audit log only
  ever append. History is never overwritten.
- **Deterministic decisions.** `evaluate.py` contains no model calls. Every
  compliant/breach/N-A result is a plain comparison of structured firm data
  against a structured rule condition.

### Storage: SQLite (deliberate tradeoff)

SQLite + SQLAlchemy keeps the demo zero-setup and instantly resettable. The
ORM means production ports to **Postgres + pgvector** (for multi-circular
retrieval / RAG at scale) by changing only the connection string. SQLite locks
the whole file on write — a non-issue for a single-user demo.

---

_Nirdesh is a decision-support system. All compliance determinations are computed
deterministically and require Compliance Officer sign-off before any operational
action._
