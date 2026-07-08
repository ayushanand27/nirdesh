# Architecture

Nirdesh separates **ingest-time AI** from **compliance-check-time deterministic logic**. The LLM may propose rules from circular text; it never decides compliant vs breach.

---

## System overview

```mermaid
flowchart TB
    subgraph INGEST["Ingest time (LLM allowed)"]
        PDF["SEBI circular PDF / text"]
        LLM["Groq JSON extraction"]
        CANON["Human-reviewed canonical rules"]
        CACHE["Extraction cache"]
        PDF --> LLM
        PDF --> CANON
        LLM --> CACHE
        LLM --> LEDGER
        CANON --> LEDGER
    end

    subgraph STORE["Obligation ledger"]
        LEDGER[("SQLite: rules, firms,\nevaluations, audit_log")]
    end

    subgraph CHECK["Compliance-check time (no LLM)"]
        EVAL["evaluate.py\nDeterministic engine"]
        DELTA["delta.py\nRegulatory delta"]
        REVIEW["review.py\nOfficer sign-off"]
        REPORT["report.py + report_pdf.py\nCompliance PDF"]
    end

    subgraph UI["React dashboard"]
        MATRIX["Compliance matrix"]
        DELTAV["Regulatory delta view"]
        SIGN["Officer sign-off"]
        AUDIT["Audit trail"]
    end

    API["FastAPI main.py"]

    LEDGER --> EVAL
    EVAL --> MATRIX
    EVAL --> DELTA
    EVAL --> REVIEW
    EVAL --> REPORT
    DELTA --> DELTAV
    REVIEW --> SIGN
    REPORT --> SIGN
    API --> EVAL
    API --> DELTA
    API --> REVIEW
    API --> REPORT
    MATRIX --> UI
    DELTAV --> UI
    SIGN --> UI
    AUDIT --> UI
```

---

## Request flow (typical demo path)

```mermaid
sequenceDiagram
    participant User
    participant React
    participant API as FastAPI
    participant Eval as evaluate.py
    participant Delta as delta.py
    participant Review as review.py
    participant DB as SQLite

    User->>React: Open matrix (as_of 2026-09-01)
    React->>API: GET /matrix?as_of=2026-09-01
    API->>Eval: run_evaluation(persist=false)
    Eval->>DB: Read firms + active rules
    Eval-->>React: Matrix cells + counts

    User->>React: Apply amendment
    React->>API: GET /delta?persist=true
    API->>Delta: compute_delta (idempotent)
    Delta->>DB: AmendmentState APPLIED + audit
    Delta->>Eval: run_evaluation (Phase 2)
    Delta-->>React: Meridian flip compliant→breach

    User->>React: Generate tasks + sign off
    React->>API: POST /review-tasks/generate
    API->>Review: generate_review_tasks
    Review->>DB: Pending tasks (unique per firm/rule)
    User->>React: Mark reviewed
    React->>API: POST /review-tasks/{id}/review
    Review->>DB: Audit entry (no-op if already reviewed)

    User->>React: Generate Report
    React->>API: GET /reports/compliance-summary?format=pdf
    API->>DB: Assemble + audit export
    API-->>User: PDF download
```

---

## Rule supersession chain

One circular, two effective dates. Rules are **append-only**; amendments link via `supersedes_id`.

```mermaid
flowchart LR
    LEGACY["Pre-2026 regime\nT-2 NAV · flat ±20%"]
    P1["§4.1 · 01 Sep 2026\nT-1 closing VWAP"]
    P2["§4.4 · 01 Apr 2027\nT-1 closing NAV"]

    LEGACY -->|superseded| P1
    P1 -->|superseded| P2

    BANDS["§5.1.1 · §5.2.1 · §5.3.1\nPrice bands by ETF type"]
    P1 --- BANDS
    P2 --- BANDS
```

At **as_of = 2026-09-01**, only rules with `effective_from ≤ date` and not yet superseded by a later-effective rule are active.  
At **as_of = 2027-04-01**, §4.4 replaces §4.1 for base-price checks — this drives the **Meridian flip** in the demo.

---

## Component map

| Module | Role |
|---|---|
| `canonical_rules.py` | Human-verified rule objects (source of truth for demo) |
| `extraction.py` | LLM compile path + cache fallback |
| `evaluate.py` | Deterministic compliant / breach / N/A |
| `delta.py` | Old vs new obligation diff + firm transitions |
| `review.py` | Review tasks + officer sign-off |
| `report.py` / `report_pdf.py` | JSON report assembly + PDF export |
| `models.py` | ORM: rules, firms, evaluations, audit_log, amendment_state |
| `audit_hygiene.py` | Startup dedupe + schema extras |
| `App.tsx` + views | Matrix, Delta, Sign-off, Audit panel |

---

## Idempotency & audit integrity

| Action | Behaviour on repeat |
|---|---|
| Apply amendment | No-op if already `APPLIED` — no second amendment audit |
| Generate tasks | Skips existing pending/reviewed for same firm+rule+as_of |
| Mark reviewed | No-op if already reviewed |
| Record evaluation | No audit if fingerprint unchanged |
| Generate report | Each download logs one export event (intentional accountability) |

---

## Deployment

```mermaid
flowchart LR
    USER["Browser"]
    FE["Render static site\nnirdesh-frontend"]
    BE["Render web service\nnirdesh-backend"]
    DB[("SQLite on ephemeral disk\nauto-reseed on cold start")]

    USER --> FE
    FE -->|VITE_API_BASE_URL| BE
    BE --> DB
```

See `render.yaml` for the blueprint. Production roadmap: Postgres with persistent volume.
