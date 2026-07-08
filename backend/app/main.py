"""Nirdesh backend API.

Step 1: rule extraction (/extract).
Step 2: firms + deterministic evaluation (/firms, /rules, /evaluate, /matrix, /audit).
"""

from __future__ import annotations

import os

from fastapi import Depends, FastAPI, HTTPException, Query
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import Response
from sqlalchemy.orm import Session

from pydantic import BaseModel

from .audit_hygiene import cleanup_duplicate_audits, ensure_schema_extras
from .db import get_session, init_db
from .delta import compute_delta, reset_amendment
from .evaluate import run_evaluation
from .extraction import extract_rules
from .llm_client import LLMUnavailable, is_configured
from .models import AuditLog, Firm, Rule
from .report import assemble_compliance_summary
from .report_pdf import render_compliance_pdf
from .review import generate_review_tasks, list_tasks, mark_reviewed
from .schemas import ExtractionRequest, ExtractionResponse


class ReviewSignoff(BaseModel):
    reviewed_by: str = "Compliance Officer"

DEFAULT_AS_OF = "2026-09-01"

app = FastAPI(title="Nirdesh — Agentic Compliance", version="0.3.0")

# CORS: set ALLOWED_ORIGINS to a comma-separated list of frontend URLs in prod.
# Defaults to "*" for local dev; lock this down to the real frontend URL on Render.
_origins_env = os.getenv("ALLOWED_ORIGINS", "*").strip()
ALLOWED_ORIGINS = ["*"] if _origins_env in ("", "*") else [
    o.strip() for o in _origins_env.split(",") if o.strip()
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=ALLOWED_ORIGINS,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.on_event("startup")
def _startup() -> None:
    """Ensure schema + demo data exist.

    Render's free tier disk is ephemeral, so on every cold start (deploy,
    restart, wake-from-sleep) the SQLite file is gone. We rebuild the canonical
    8-rule / 3-firm demo state automatically when the DB is empty, so the live
    site always boots into the correct, deterministic demo posture. An existing
    populated DB (e.g. a warm worker restart mid-demo) is left untouched aside
    from idempotency schema extras and duplicate-audit cleanup.
    """
    init_db()
    ensure_schema_extras()
    from .db import SessionLocal
    from .models import Rule as _Rule

    session = SessionLocal()
    try:
        if session.query(_Rule).count() == 0:
            import seed_db

            seed_db.seed_rules(session)
            seed_db.seed_firms(session)
            # One baseline evaluation so the trail opens with a real state snapshot
            # (subsequent identical /evaluate calls are no-ops and do not re-log).
            run_evaluation(session, as_of=DEFAULT_AS_OF, actor="seed", persist=True)
        else:
            cleanup_duplicate_audits(session)
    finally:
        session.close()


@app.get("/health")
def health() -> dict:
    return {"status": "ok", "llm_configured": is_configured()}


@app.post("/extract", response_model=ExtractionResponse)
def extract(req: ExtractionRequest) -> ExtractionResponse:
    try:
        return extract_rules(
            circular_text=req.circular_text,
            source_circular_id=req.source_circular_id,
            use_cache=req.use_cache,
        )
    except LLMUnavailable as exc:
        raise HTTPException(status_code=503, detail=str(exc)) from exc


@app.get("/firms")
def list_firms(db: Session = Depends(get_session)) -> list[dict]:
    return [
        {"id": f.id, "name": f.name, "legal_type": f.legal_type, "profile": f.profile}
        for f in db.query(Firm).order_by(Firm.id).all()
    ]


@app.get("/rules")
def list_rules(db: Session = Depends(get_session)) -> list[dict]:
    rows = db.query(Rule).order_by(Rule.effective_from, Rule.clause_id).all()
    return [
        {
            "rule_id": r.rule_id,
            "clause_id": r.clause_id,
            "source_circular_id": r.source_circular_id,
            "plain_description": r.plain_description,
            "applicable_entity_type": r.applicable_entity_type,
            "condition": r.condition,
            "threshold": r.threshold,
            "required_action": r.required_action,
            "deadline": r.deadline,
            "effective_from": r.effective_from,
            "plain_label": r.plain_label,
            "source_text_span": r.source_text_span,
            "confidence": r.confidence,
            "needs_human_review": r.needs_human_review,
            "review_reason": r.review_reason,
            "status": r.status,
            "supersedes_id": r.supersedes_id,
        }
        for r in rows
    ]


@app.post("/evaluate")
def evaluate(
    as_of: str = Query(DEFAULT_AS_OF), db: Session = Depends(get_session)
) -> dict:
    """Record an evaluation only when the outcome differs from the last one.

    Identical re-runs return the matrix with noop=true and do not append audit.
    """
    return run_evaluation(db, as_of=as_of, persist=True)


@app.get("/matrix")
def matrix(as_of: str = Query(DEFAULT_AS_OF), db: Session = Depends(get_session)) -> dict:
    # Read-only view: compute without writing to the audit trail.
    return run_evaluation(db, as_of=as_of, persist=False)


@app.get("/delta")
def delta(
    from_as_of: str = Query("2026-09-01"),
    to_as_of: str = Query("2027-04-01"),
    persist: bool = Query(False),
    db: Session = Depends(get_session),
) -> dict:
    """Regulatory delta between two dates: superseded obligations + firm flips.

    persist=False (default) is a read-only preview. persist=True applies the
    amendment once; already-APPLIED windows return 200 noop with no new audit.
    """
    return compute_delta(db, from_as_of=from_as_of, to_as_of=to_as_of, persist=persist)


@app.post("/delta/reset")
def delta_reset(
    from_as_of: str = Query("2026-09-01"),
    to_as_of: str = Query("2027-04-01"),
    db: Session = Depends(get_session),
) -> dict:
    """Dev/demo only: reset amendment window to NOT_APPLIED (distinct audit event)."""
    return reset_amendment(db, from_as_of=from_as_of, to_as_of=to_as_of)


@app.get("/review-tasks")
def get_review_tasks(db: Session = Depends(get_session)) -> list[dict]:
    return list_tasks(db)


@app.post("/review-tasks/generate")
def post_generate_review_tasks(
    as_of: str = Query(DEFAULT_AS_OF), db: Session = Depends(get_session)
) -> dict:
    """Create pending sign-off tasks for current breaches. No automated action."""
    return generate_review_tasks(db, as_of=as_of)


@app.post("/review-tasks/{task_id}/review")
def post_mark_reviewed(
    task_id: int, payload: ReviewSignoff, db: Session = Depends(get_session)
) -> dict:
    """Record a Compliance Officer's explicit sign-off on a task."""
    try:
        return mark_reviewed(db, task_id=task_id, reviewed_by=payload.reviewed_by)
    except ValueError as exc:
        raise HTTPException(status_code=404, detail=str(exc)) from exc


@app.get("/audit")
def audit(db: Session = Depends(get_session)) -> list[dict]:
    rows = db.query(AuditLog).order_by(AuditLog.created_at.desc(), AuditLog.id.desc()).all()
    return [
        {
            "id": a.id,
            "event_type": a.event_type,
            "entity_ref": a.entity_ref,
            "message": a.message,
            "meta": a.meta,
            "actor": a.actor,
            "created_at": a.created_at.isoformat() if a.created_at else None,
        }
        for a in rows
    ]


@app.get("/reports/compliance-summary")
def compliance_summary_report(
    as_of: str = Query(DEFAULT_AS_OF),
    format: str = Query("json"),
    actor: str = Query("system"),
    db: Session = Depends(get_session),
):
    """Assemble a compliance summary from current state (JSON or PDF).

    Each generation writes one audit entry ("Compliance report generated").
    Repeated downloads are intentional trail events (export accountability),
    not state mutations — each call is independently recorded.
    """
    if format not in ("json", "pdf"):
        raise HTTPException(status_code=400, detail="format must be json or pdf")
    report = assemble_compliance_summary(
        db, as_of=as_of, actor=actor, persist_audit=True
    )
    if format == "pdf":
        # Mark audit meta with format after render path (rewrite last meta lightly)
        pdf_bytes = render_compliance_pdf(report)
        filename = f"nirdesh-compliance-report-{as_of}.pdf"
        return Response(
            content=pdf_bytes,
            media_type="application/pdf",
            headers={"Content-Disposition": f'attachment; filename="{filename}"'},
        )
    return report
