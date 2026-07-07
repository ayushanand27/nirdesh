"""Human sign-off workflow.

Nirdesh is decision-support only. When the deterministic engine finds a breach,
it does NOT act — it generates a review task that a named Compliance Officer must
explicitly sign off before the obligation is considered actioned. Nothing here
files, submits, or auto-remediates anything.

Task generation is idempotent per (firm, rule, as_of): re-running never creates
duplicates, and existing reviewed tasks are never reset.
"""

from __future__ import annotations

from datetime import datetime, timezone

from sqlalchemy.orm import Session

from .evaluate import BREACH, active_rules, evaluate_rule
from .models import AuditLog, Firm, ReviewTask, Rule


def generate_review_tasks(session: Session, as_of: str, actor: str = "system") -> dict:
    """Create a pending review task for every current breach that lacks one."""
    firms = session.query(Firm).order_by(Firm.id).all()
    rules = {r.rule_id: r for r in active_rules(session, as_of)}

    created = 0
    for firm in firms:
        for rule in rules.values():
            status, _ = evaluate_rule(rule, firm.profile)
            if status != BREACH:
                continue
            exists = (
                session.query(ReviewTask)
                .filter_by(firm_id=firm.id, rule_id=rule.rule_id, as_of_date=as_of)
                .first()
            )
            if exists:
                continue
            session.add(
                ReviewTask(
                    firm_id=firm.id,
                    firm_name=firm.name,
                    rule_id=rule.rule_id,
                    clause_id=rule.clause_id,
                    as_of_date=as_of,
                    title=f"{firm.name} — potential breach of clause §{rule.clause_id}",
                    recommended_action=rule.required_action,
                    severity="high",
                )
            )
            created += 1

    if created:
        session.add(
            AuditLog(
                event_type="review",
                entity_ref=f"as_of={as_of}",
                message=(
                    f"Generated {created} review task(s) for Compliance Officer sign-off. "
                    f"No automated action taken."
                ),
                meta={"as_of": as_of, "created": created},
                actor=actor,
            )
        )
        session.commit()

    return {"as_of": as_of, "created": created}


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

    officer = reviewed_by.strip() or "Compliance Officer"
    task.status = "reviewed"
    task.reviewed_by = officer
    task.reviewed_at = datetime.now(timezone.utc)

    session.add(
        AuditLog(
            event_type="review",
            entity_ref=f"task={task_id}",
            message=(
                f"Task '{task.title}' marked reviewed by {officer}. "
                f"Sign-off recorded; action authorised by human."
            ),
            meta={"task_id": task_id, "clause_id": task.clause_id, "firm": task.firm_name},
            actor=officer,
        )
    )
    session.commit()
    return _serialize(task)


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
