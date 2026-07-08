"""Compliance summary report — assemble structured JSON from existing state.

No new evaluation logic: reads matrix, delta application state, and review tasks.
"""

from __future__ import annotations

from datetime import datetime, timezone

from sqlalchemy.orm import Session

from .canonical_rules import CIRCULAR_ID
from .delta import compute_delta
from .evaluate import BREACH, run_evaluation
from .models import AmendmentState, AuditLog, Rule
from .review import list_tasks

PHASE1 = "2026-09-01"
PHASE2 = "2027-04-01"

DISCLAIMER = (
    "Nirdesh is a decision-support system. This report reflects deterministic "
    "evaluation as of the stated date and requires human verification before "
    "regulatory submission."
)


def assemble_compliance_summary(
    session: Session,
    as_of: str,
    *,
    actor: str = "system",
    persist_audit: bool = False,
) -> dict:
    """Build a self-contained compliance summary from currently computed state."""
    matrix = run_evaluation(session, as_of=as_of, persist=False)
    rules_by_id = {r["rule_id"]: r for r in matrix["rules"]}
    # Breach citations: pull verbatim spans from full rule rows if missing on matrix.
    db_rules = {r.rule_id: r for r in session.query(Rule).all()}

    breaches: list[dict] = []
    matrix_rows: list[dict] = []
    for firm in matrix["firms"]:
        row_cells: dict[str, dict] = {}
        for rule in matrix["rules"]:
            cell = next(
                (
                    c
                    for c in matrix["cells"]
                    if c["firm_id"] == firm["id"] and c["rule_id"] == rule["rule_id"]
                ),
                None,
            )
            status = cell["status"] if cell else "not_applicable"
            detail = cell["detail"] if cell else {}
            entry = {
                "rule_id": rule["rule_id"],
                "clause_id": rule["clause_id"],
                "plain_label": rule.get("plain_label"),
                "status": status,
                "detail": detail,
            }
            row_cells[rule["rule_id"]] = entry
            if status == BREACH:
                src = rule.get("source_text_span") or (
                    db_rules[rule["rule_id"]].source_text_span
                    if rule["rule_id"] in db_rules
                    else None
                )
                breaches.append(
                    {
                        "firm_id": firm["id"],
                        "firm_name": firm["name"],
                        "rule_id": rule["rule_id"],
                        "clause_id": rule["clause_id"],
                        "plain_label": rule.get("plain_label"),
                        "plain_description": rule.get("plain_description"),
                        "required_action": rule.get("required_action"),
                        "source_text_span": src,
                        "detail": detail,
                    }
                )
        matrix_rows.append(
            {
                "firm_id": firm["id"],
                "firm_name": firm["name"],
                "legal_type": firm["legal_type"],
                "cells": row_cells,
            }
        )

    # Regulatory delta: only when this report's as-of date is at/after Phase 2.
    # A Phase 1 as-of report must not include Phase 2 "What Changed" noise even if
    # the amendment was applied earlier in the same demo session.
    state = (
        session.query(AmendmentState)
        .filter_by(from_as_of=PHASE1, to_as_of=PHASE2)
        .first()
    )
    amendment_applied = bool(state and state.status == "APPLIED")
    delta_section = None
    if as_of >= PHASE2:
        delta = compute_delta(session, PHASE1, PHASE2, persist=False)
        delta_section = {
            "from_as_of": PHASE1,
            "to_as_of": PHASE2,
            "application": delta.get("application"),
            "rule_changes": delta.get("rule_changes", []),
            "firm_transitions": delta.get("firm_transitions", []),
            "summary": delta.get("summary"),
            "included_because": (
                "amendment_applied" if amendment_applied else "as_of_includes_phase2"
            ),
        }

    all_tasks = list_tasks(session)
    # Sign-off relevant to this as_of (and any older open work still pending).
    tasks_for_as_of = [t for t in all_tasks if t["as_of_date"] == as_of]
    reviewed = [t for t in tasks_for_as_of if t["status"] == "reviewed"]
    pending = [t for t in tasks_for_as_of if t["status"] == "pending"]

    signoff_log = []
    for t in reviewed + pending:
        rule = rules_by_id.get(t["rule_id"]) or db_rules.get(t["rule_id"])
        span = None
        if isinstance(rule, dict):
            span = rule.get("source_text_span")
        elif rule is not None:
            span = rule.source_text_span
        signoff_log.append(
            {
                "task_id": t["id"],
                "firm_name": t["firm_name"],
                "clause_id": t["clause_id"],
                "rule_id": t["rule_id"],
                "title": t["title"],
                "status": t["status"],
                "recommended_action": t["recommended_action"],
                "reviewed_by": t["reviewed_by"],
                "reviewed_at": t["reviewed_at"],
                "created_at": t["created_at"],
                "source_text_span": span,
            }
        )

    generated_at = datetime.now(timezone.utc).isoformat()
    officer = (actor or "").strip() or "system"

    report = {
        "report_type": "compliance_summary",
        "generated_at": generated_at,
        "generated_by": officer,
        "disclaimer": DISCLAIMER,
        "engine": {
            "name": "nirdesh-deterministic-v1",
            "ruleset": "canonical_MRD-POD3-2026",
            "llm_at_evaluation": False,
            "note": "LLM used only at rule-extraction ingest; evaluation is deterministic.",
        },
        "circular": {
            "id": CIRCULAR_ID,
            "title": "Norms for ETF base price and price bands",
            "issued": "2026-06-15",
        },
        "as_of": as_of,
        "summary": {
            "compliant": matrix["counts"].get("compliant", 0),
            "breach": matrix["counts"].get("breach", 0),
            "not_applicable": matrix["counts"].get("not_applicable", 0),
            "firms": len(matrix["firms"]),
            "rules": len(matrix["rules"]),
            "breaches_detail_count": len(breaches),
            "signoff_reviewed": len(reviewed),
            "signoff_pending": len(pending),
            "amendment_applied": amendment_applied,
        },
        "matrix": {
            "firms": matrix["firms"],
            "rules": [
                {
                    "rule_id": r["rule_id"],
                    "clause_id": r["clause_id"],
                    "plain_label": r.get("plain_label"),
                    "plain_description": r.get("plain_description"),
                    "effective_from": r.get("effective_from"),
                    "source_text_span": r.get("source_text_span")
                    or (
                        db_rules[r["rule_id"]].source_text_span
                        if r["rule_id"] in db_rules
                        else None
                    ),
                }
                for r in matrix["rules"]
            ],
            "rows": matrix_rows,
            "cells": matrix["cells"],
        },
        "breaches": breaches,
        "regulatory_delta": delta_section,
        "officer_signoff": {
            "as_of": as_of,
            "reviewed_count": len(reviewed),
            "pending_count": len(pending),
            "log": signoff_log,
        },
    }

    if persist_audit:
        session.add(
            AuditLog(
                event_type="report",
                entity_ref=f"as_of={as_of}",
                message=(
                    f"Compliance report generated (as of {as_of}; "
                    f"{report['summary']['breach']} breach, "
                    f"{report['summary']['compliant']} compliant, "
                    f"{report['summary']['not_applicable']} N/A; "
                    f"{len(reviewed)} signed off)."
                ),
                meta={
                    "as_of": as_of,
                    "generated_at": generated_at,
                    "summary": report["summary"],
                    "engine": report["engine"],
                    "format": "requested",
                },
                actor=officer,
            )
        )
        session.commit()

    return report
