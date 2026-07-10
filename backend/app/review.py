"""Human sign-off workflow.

Nirdesh is decision-support only. When the deterministic engine finds a breach,
it does NOT act — it generates a review task that a named Compliance Officer must
explicitly sign off before the obligation is considered actioned.

Idempotency:
  * generate_review_tasks never creates a second pending task for the same
    (firm, rule, as_of); duplicates are blocked in app logic and by a unique
    partial index on pending rows.
  * mark_reviewed is a no-op if the task is already reviewed — no second audit.
"""

from __future__ import annotations

from datetime import datetime, timezone

from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from .evaluate import BREACH, active_rules, evaluate_rule
from .models import AuditLog, Firm, ReviewTask


def generate_review_tasks(session: Session, as_of: str, actor: str = "system") -> dict:
    """Create a pending review task for every current breach that lacks one."""
    firms = session.query(Firm).order_by(Firm.id).all()
    rules = {r.rule_id: r for r in active_rules(session, as_of) if not r.needs_human_review}

    created = 0
    already_pending = 0
    for firm in firms:
        for rule in rules.values():
            status, _ = evaluate_rule(rule, firm.profile)
            if status != BREACH:
                continue
            exists = (
                session.query(ReviewTask)
                .filter_by(
                    firm_id=firm.id,
                    rule_id=rule.rule_id,
                    as_of_date=as_of,
                    status="pending",
                )
                .first()
            )
            if exists:
                already_pending += 1
                continue
            # Also skip if a reviewed task already exists for the same triple —
            # officer already signed off this breach; don't resurface it.
            reviewed = (
                session.query(ReviewTask)
                .filter_by(
                    firm_id=firm.id,
                    rule_id=rule.rule_id,
                    as_of_date=as_of,
                    status="reviewed",
                )
                .first()
            )
            if reviewed:
                already_pending += 1
                continue
            try:
                with session.begin_nested():
                    session.add(
                        ReviewTask(
                            firm_id=firm.id,
                            firm_name=firm.name,
                            rule_id=rule.rule_id,
                            clause_id=rule.clause_id,
                            as_of_date=as_of,
                            title=f"{firm.name} · §{rule.clause_id}",
                            recommended_action=rule.required_action,
                            severity="high",
                        )
                    )
                    session.flush()
                created += 1
            except IntegrityError:
                # Concurrent create of the same pending (firm, rule, as_of):
                # savepoint rolls back only this insert.
                already_pending += 1
                continue

    if created:
        message = f"{created} task(s) created"
        if already_pending:
            message += f" · {already_pending} existing"
        session.add(
            AuditLog(
                event_type="review",
                entity_ref=f"as_of={as_of}",
                message=message,
                meta={
                    "as_of": as_of,
                    "created": created,
                    "already_pending": already_pending,
                    "noop": False,
                },
                actor=actor,
            )
        )
        session.commit()
    elif already_pending:
        # Idempotent no-op: clear response, no second audit write.
        message = f"No new tasks · {already_pending} open"
    else:
        message = f"No breaches as of {as_of}"

    return {
        "as_of": as_of,
        "created": created,
        "already_pending": already_pending,
        "noop": created == 0,
        "message": message,
    }


def list_tasks(session: Session) -> list[dict]:
    rows = (
        session.query(ReviewTask)
        .order_by(ReviewTask.status.asc(), ReviewTask.created_at.desc(), ReviewTask.id.desc())
        .all()
    )
    return [_serialize(t) for t in rows]


def mark_reviewed(session: Session, task_id: int, reviewed_by: str) -> dict:
    task = session.query(ReviewTask).filter_by(id=task_id).first()
    if task is None:
        raise ValueError(f"review task {task_id} not found")

    # Idempotent: second click on an already-reviewed task is a safe no-op.
    if task.status == "reviewed":
        out = _serialize(task)
        out["noop"] = True
        return out

    officer = reviewed_by.strip() or "Compliance Officer"
    task.status = "reviewed"
    task.reviewed_by = officer
    task.reviewed_at = datetime.now(timezone.utc)

    session.add(
        AuditLog(
            event_type="review",
            entity_ref=f"task={task_id}",
            message=f"Reviewed §{task.clause_id} · {task.firm_name}",
            meta={"task_id": task_id, "clause_id": task.clause_id, "firm": task.firm_name},
            actor=officer,
        )
    )
    session.commit()
    out = _serialize(task)
    out["noop"] = False
    return out


def _serialize(t: ReviewTask) -> dict:
    return {
        "id": t.id,
        "firm_id": t.firm_id,
        "firm_name": t.firm_name,
        "rule_id": t.rule_id,
        "clause_id": t.clause_id,
        "as_of_date": t.as_of_date,
        "title": t.title,
        "recommended_action": t.recommended_action,
        "severity": t.severity,
        "status": t.status,
        "reviewed_by": t.reviewed_by,
        "reviewed_at": t.reviewed_at.isoformat() if t.reviewed_at else None,
        "created_at": t.created_at.isoformat() if t.created_at else None,
    }
