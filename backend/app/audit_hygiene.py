"""Startup helpers: schema extras + audit-trail hygiene for demo integrity."""

from __future__ import annotations

from sqlalchemy import text
from sqlalchemy.orm import Session

from .db import engine
from .models import AmendmentState, AuditLog


def ensure_schema_extras() -> None:
    """Create tables/indexes that may be missing on a warm pre-existing SQLite file.

    create_all alone does not add new indexes onto already-existing tables.
    """
    with engine.begin() as conn:
        conn.execute(
            text(
                """
                CREATE UNIQUE INDEX IF NOT EXISTS uq_review_pending_firm_rule_asof
                ON review_tasks (firm_id, rule_id, as_of_date)
                WHERE status = 'pending'
                """
            )
        )


def cleanup_duplicate_audits(session: Session) -> dict:
    """Collapse repeated identical evaluation / amendment audit noise.

    Keeps the earliest row for each duplicate key so the trail reads as a real
    sequence of events rather than re-click residue.
    """
    removed = 0

    # Identical evaluation messages for the same as_of (legacy re-clicks).
    seen_eval: set[tuple[str, str]] = set()
    for row in (
        session.query(AuditLog)
        .filter_by(event_type="evaluation")
        .order_by(AuditLog.id.asc())
        .all()
    ):
        key = (row.entity_ref, row.message)
        if key in seen_eval:
            session.delete(row)
            removed += 1
        else:
            seen_eval.add(key)

    # Identical amendment applies for the same window.
    seen_amd: set[tuple[str, str]] = set()
    for row in (
        session.query(AuditLog)
        .filter_by(event_type="amendment")
        .order_by(AuditLog.id.asc())
        .all()
    ):
        key = (row.entity_ref, row.message)
        if key in seen_amd:
            session.delete(row)
            removed += 1
        else:
            seen_amd.add(key)

    # Reconcile amendment_state from remaining trail: if an amendment audit
    # exists for a window, mark that window APPLIED (without writing a new audit).
    for row in (
        session.query(AuditLog)
        .filter_by(event_type="amendment")
        .order_by(AuditLog.id.asc())
        .all()
    ):
        ref = row.entity_ref or ""
        if " -> " not in ref:
            continue
        from_as_of, to_as_of = [p.strip() for p in ref.split(" -> ", 1)]
        state = (
            session.query(AmendmentState)
            .filter_by(from_as_of=from_as_of, to_as_of=to_as_of)
            .first()
        )
        if state is None:
            state = AmendmentState(
                from_as_of=from_as_of,
                to_as_of=to_as_of,
                status="APPLIED",
                applied_at=row.created_at,
                summary=row.meta,
            )
            session.add(state)
        elif state.status != "APPLIED":
            state.status = "APPLIED"
            state.applied_at = state.applied_at or row.created_at
            state.summary = state.summary or row.meta

    session.commit()
    return {"removed": removed}
