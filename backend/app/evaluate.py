"""Deterministic compliance evaluation engine.

CRITICAL POSITIONING: no LLM is involved here. Every compliant/breach/N/A
decision is plain Python comparing a firm's structured profile against a rule's
structured `condition`. Same inputs -> same outputs, every time, auditable.

The engine also owns two time-dependent concepts needed for the delta demo:
  * effective dates  -> a rule is only in force once effective_from <= as_of.
  * supersession      -> a rule is dropped from the active set once a later rule
                         that supersedes it becomes effective.
"""

from __future__ import annotations

from datetime import date

from sqlalchemy.orm import Session

from .models import AuditLog, Evaluation, Firm, Rule

COMPLIANT = "compliant"
BREACH = "breach"
NOT_APPLICABLE = "not_applicable"

_MISSING = object()


def _to_date(value: str | None) -> date | None:
    if not value:
        return None
    try:
        return date.fromisoformat(value)
    except ValueError:
        return None


def resolve_field(profile: dict, dotted: str):
    """Resolve a possibly-dotted field path (e.g. 'band_config.liquid_etf')."""
    node = profile
    for part in dotted.split("."):
        if isinstance(node, dict) and part in node:
            node = node[part]
        else:
            return _MISSING
    return node


def check_condition(condition: dict, profile: dict) -> tuple[bool, dict]:
    """Return (is_met, detail). Pure comparison, no interpretation."""
    field = condition["field"]
    operator = condition["operator"]
    expected = condition.get("value")
    actual = resolve_field(profile, field)

    detail = {"field": field, "operator": operator, "expected": expected, "actual":
              (None if actual is _MISSING else actual)}

    if actual is _MISSING:
        detail["note"] = "firm has no value for this field"
        return False, detail

    ops = {
        "equals": lambda a, b: a == b,
        "not_equals": lambda a, b: a != b,
        "lt": lambda a, b: a < b,
        "lte": lambda a, b: a <= b,
        "gt": lambda a, b: a > b,
        "gte": lambda a, b: a >= b,
        "in": lambda a, b: a in b,
    }
    fn = ops.get(operator)
    if fn is None:
        detail["note"] = f"unknown operator '{operator}'"
        return False, detail
    try:
        return bool(fn(actual, expected)), detail
    except TypeError as exc:
        detail["note"] = f"type mismatch: {exc}"
        return False, detail


def is_applicable(rule: Rule, profile: dict) -> bool:
    offered = profile.get("offers_etf_types") or []
    aet = rule.applicable_entity_type
    if aet == "all_etf":
        return len(offered) > 0
    if isinstance(aet, list):
        # Obligation covers several entity types (e.g. Overnight + Liquid);
        # applies if the firm offers any of them.
        return any(t in offered for t in aet)
    return aet in offered


def evaluate_rule(rule: Rule, profile: dict) -> tuple[str, dict]:
    if not is_applicable(rule, profile):
        return NOT_APPLICABLE, {
            "reason": "rule entity type not offered by firm",
            "applicable_entity_type": rule.applicable_entity_type,
            "offers_etf_types": profile.get("offers_etf_types", []),
        }
    if not rule.condition:
        # No checkable condition => the engine refuses to guess.
        return NOT_APPLICABLE, {"reason": "rule has no checkable condition (needs human review)"}

    met, detail = check_condition(rule.condition, profile)
    detail["reason"] = "condition satisfied" if met else "condition not satisfied"
    return (COMPLIANT if met else BREACH), detail


def active_rules(session: Session, as_of: str) -> list[Rule]:
    """Rules in force at `as_of`: effective and not yet superseded."""
    as_of_d = _to_date(as_of)
    all_rules = session.query(Rule).all()

    # A rule is superseded at as_of if a rule that supersedes it is effective.
    superseded_ids: set[int] = set()
    for r in all_rules:
        if r.supersedes_id is not None:
            eff = _to_date(r.effective_from)
            if as_of_d and eff and eff <= as_of_d:
                superseded_ids.add(r.supersedes_id)

    result = []
    for r in all_rules:
        eff = _to_date(r.effective_from)
        if as_of_d and eff and eff > as_of_d:
            continue  # not yet in force
        if r.id in superseded_ids:
            continue  # replaced by a later effective rule
        result.append(r)
    return result


def run_evaluation(
    session: Session, as_of: str, actor: str = "system", persist: bool = True
) -> dict:
    """Evaluate every firm against every active rule and return a matrix payload.

    When `persist` is True (the /evaluate action), append Evaluation + AuditLog
    rows — this is a recorded 'recalculation' event. When False (the /matrix read
    view), compute without writing, so polling the view never pollutes the audit
    trail. Either way the engine never mutates existing rows.
    """
    firms = session.query(Firm).order_by(Firm.id).all()
    all_active = sorted(active_rules(session, as_of), key=lambda r: (r.effective_from or "", r.clause_id))
    # Matrix shows only machine-evaluable obligations; review-flagged rules are
    # surfaced in Officer Sign-off, not as matrix columns.
    rules = [r for r in all_active if not r.needs_human_review]

    cells = []
    counts = {COMPLIANT: 0, BREACH: 0, NOT_APPLICABLE: 0}
    for firm in firms:
        for rule in rules:
            status, detail = evaluate_rule(rule, firm.profile)
            counts[status] += 1
            if persist:
                session.add(
                    Evaluation(
                        firm_id=firm.id,
                        rule_id=rule.rule_id,
                        as_of_date=as_of,
                        status=status,
                        detail=detail,
                    )
                )
            cells.append(
                {"firm_id": firm.id, "rule_id": rule.rule_id, "status": status, "detail": detail}
            )

    if persist:
        session.add(
            AuditLog(
                event_type="evaluation",
                entity_ref=f"as_of={as_of}",
                message=(
                    f"Evaluated {len(firms)} firms x {len(rules)} active rules "
                    f"({counts[BREACH]} breach, {counts[COMPLIANT]} compliant, "
                    f"{counts[NOT_APPLICABLE]} N/A)."
                ),
                meta={"as_of": as_of, "counts": counts},
                actor=actor,
            )
        )
        session.commit()

    return {
        "as_of": as_of,
        "counts": counts,
        "firms": [
            {"id": f.id, "name": f.name, "legal_type": f.legal_type, "profile": f.profile}
            for f in firms
        ],
        "rules": [
            {
                "rule_id": r.rule_id,
                "clause_id": r.clause_id,
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
            for r in rules
        ],
        "cells": cells,
    }
