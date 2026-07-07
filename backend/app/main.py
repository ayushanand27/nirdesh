"""Nirdesh backend API.

Step 1: rule extraction (/extract).
Step 2: firms + deterministic evaluation (/firms, /rules, /evaluate, /matrix, /audit).
"""

from __future__ import annotations

from fastapi import Depends, FastAPI, HTTPException, Query
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.orm import Session

from pydantic import BaseModel

from .db import get_session, init_db
from .delta import compute_delta
from .evaluate import run_evaluation
from .extraction import extract_rules
from .llm_client import LLMUnavailable, is_configured
from .models import AuditLog, Firm, Rule
from .review import generate_review_tasks, list_tasks, mark_reviewed
from .schemas import ExtractionRequest, ExtractionResponse


class ReviewSignoff(BaseModel):
    reviewed_by: str = "Compliance Officer"

DEFAULT_AS_OF = "2026-09-01"

app = FastAPI(title="Nirdesh — Agentic Compliance", version="0.2.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.on_event("startup")
def _startup() -> None:
    init_db()


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
    """Run the deterministic engine for a given date and persist the results."""
    return run_evaluation(db, as_of=as_of)


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

    persist=False (default) is a read-only preview. persist=True records the
    amendment as an audit event — used when the officer actually applies it.
    """
    return compute_delta(db, from_as_of=from_as_of, to_as_of=to_as_of, persist=persist)


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
