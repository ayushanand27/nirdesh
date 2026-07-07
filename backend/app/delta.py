"""Regulatory delta computation.

Compares the compliance posture at two points in time (before / after an
amendment becomes effective) and produces a structured diff:

  * rule_changes  — obligations that were superseded, with a human-readable
                    old-value -> new-value summary drawn from the structured
                    condition/threshold (NOT prose, so it stays auditable).
  * firm_transitions — per (firm, obligation) status changes, highlighting the
                    firms that FLIP from compliant to breach purely because the
                    regulation changed.

All of this is derived from the same deterministic engine used elsewhere; the
delta itself performs no independent judgement.
"""

from __future__ import annotations

from sqlalchemy.orm import Session

from .evaluate import BREACH, COMPLIANT, active_rules, evaluate_rule
from .models import AuditLog, Firm, Rule


def _rule_value_summary(rule: Rule) -> str:
    """Render a rule's operative value as a compact, human-readable string.

    Reads only the structured fields so the summary is a faithful projection of
    what the engine actually checks.
    """
    cond = rule.condition or {}
    field = cond.get("field", "")
    value = cond.get("value")

    if field == "base_price_method":
        labels = {
            "T-2_NAV": "T-2 day NAV",
            "T-1_closing_vwap": "T-1 closing price (last 30-min VWAP)",
            "T-1_closing_nav": "T-1 closing NAV",
        }
        return labels.get(str(value), str(value))

    t = rule.threshold or {}
    parts: list[str] = []
    if t.get("dynamic_band_pct") is not None:
        parts.append(f"dynamic ±{t['dynamic_band_pct']}%")
    if t.get("static_band_pct") is not None:
        parts.append(f"fixed ±{t['static_band_pct']}%")
    if t.get("flex_pct") is not None:
        parts.append(f"flex +{t['flex_pct']}%")
    if t.get("max_flexes") is not None:
        parts.append(f"max {t['max_flexes']} flexes")
    if t.get("trigger_pct") is not None:
        parts.append(f"trigger {t['trigger_pct']}%")
    if t.get("cooling_off_trigger_pct") is not None:
        parts.append(f"cooling-off {t['cooling_off_trigger_pct']}%")
    if t.get("dpl_pct") is not None:
        parts.append(f"DPL ±{t['dpl_pct']}%")
    if t.get("dpl_relaxation_step_pct") is not None:
        parts.append(f"relax +{t['dpl_relaxation_step_pct']}% steps")
    if t.get("uncapped"):
        parts.append("uncapped")
    return ", ".join(parts) if parts else (str(value) if value is not None else "—")


def _find_superseded_pairs(
    session: Session, from_as_of: str, to_as_of: str
) -> list[tuple[Rule, Rule]]:
    """Return (old_rule, new_rule) pairs whose effective date falls in the
    amendment window (from_as_of, to_as_of].

    This ensures the Sept-2026 → Apr-2027 delta shows only clause 4.1 → 4.4,
    not the earlier legacy → 4.1 transition that already happened at Sept 2026.
    """
    from datetime import date

    def to_d(v: str | None):
        try:
            return date.fromisoformat(v) if v else None
        except ValueError:
            return None

    from_d = to_d(from_as_of)
    to_d_val = to_d(to_as_of)
    all_rules = {r.id: r for r in session.query(Rule).all()}
    pairs: list[tuple[Rule, Rule]] = []
    for new_rule in all_rules.values():
        if new_rule.supersedes_id is None:
            continue
        eff = to_d(new_rule.effective_from)
        if from_d and to_d_val and eff and eff > from_d and eff <= to_d_val:
            old_rule = all_rules.get(new_rule.supersedes_id)
            if old_rule:
                pairs.append((old_rule, new_rule))
    return pairs


def compute_delta(
    session: Session, from_as_of: str, to_as_of: str, persist: bool = False
) -> dict:
    firms = session.query(Firm).order_by(Firm.id).all()

    before_all = active_rules(session, from_as_of)
    after_all = active_rules(session, to_as_of)
    before_rules = [r for r in before_all if not r.needs_human_review]
    after_rules = [r for r in after_all if not r.needs_human_review]
    before_ids = {r.rule_id for r in before_rules}
    after_ids = {r.rule_id for r in after_rules}

    # --- Rule-level changes (superseded obligations in this window) ---
    rule_changes = []
    window_pairs = _find_superseded_pairs(session, from_as_of, to_as_of)
    for old_rule, new_rule in window_pairs:
        rule_changes.append(
            {
                "change_type": "superseded",
                "old": {
                    "rule_id": old_rule.rule_id,
                    "clause_id": old_rule.clause_id,
                    "plain_description": old_rule.plain_description,
                    "value_summary": _rule_value_summary(old_rule),
                    "effective_from": old_rule.effective_from,
                },
                "new": {
                    "rule_id": new_rule.rule_id,
                    "clause_id": new_rule.clause_id,
                    "plain_description": new_rule.plain_description,
                    "value_summary": _rule_value_summary(new_rule),
                    "effective_from": new_rule.effective_from,
                    "deadline": new_rule.deadline,
                    "source_text_span": new_rule.source_text_span,
                },
            }
        )

    newly_effective = [
        {"rule_id": r.rule_id, "clause_id": r.clause_id, "value_summary": _rule_value_summary(r)}
        for r in after_rules
        if r.rule_id not in before_ids
        and r.rule_id not in {c["new"]["rule_id"] for c in rule_changes}
    ]

    # --- Firm status transitions across the full posture ---
    # Map each superseded old rule to its replacement so a firm's obligation is
    # tracked continuously across the amendment.
    supersede_map = {c["old"]["rule_id"]: c["new"]["rule_id"] for c in rule_changes}

    before_status: dict[tuple[int, str], str] = {}
    for firm in firms:
        for rule in before_rules:
            status, _ = evaluate_rule(rule, firm.profile)
            key_rule = supersede_map.get(rule.rule_id, rule.rule_id)
            before_status[(firm.id, key_rule)] = status

    firm_transitions = []
    newly_flagged_count = 0
    for firm in firms:
        for rule in after_rules:
            after, _ = evaluate_rule(rule, firm.profile)
            before = before_status.get((firm.id, rule.rule_id))
            if before is not None and before != after:
                is_new_breach = before == COMPLIANT and after == BREACH
                if is_new_breach:
                    newly_flagged_count += 1
                firm_transitions.append(
                    {
                        "firm_id": firm.id,
                        "firm_name": firm.name,
                        "rule_id": rule.rule_id,
                        "clause_id": rule.clause_id,
                        "from_status": before,
                        "to_status": after,
                        "newly_flagged": is_new_breach,
                    }
                )

    result = {
        "from_as_of": from_as_of,
        "to_as_of": to_as_of,
        "rule_changes": rule_changes,
        "newly_effective": newly_effective,
        "firm_transitions": firm_transitions,
        "summary": {
            "obligations_superseded": len(rule_changes),
            "obligations_newly_effective": len(newly_effective),
            "firms_newly_flagged": newly_flagged_count,
            "total_transitions": len(firm_transitions),
            "rules_before": len(before_ids),
            "rules_after": len(after_ids),
        },
    }

    if persist:
        superseded_clauses = ", ".join(f"§{c['old']['clause_id']}" for c in rule_changes) or "none"
        session.add(
            AuditLog(
                event_type="amendment",
                entity_ref=f"{from_as_of} -> {to_as_of}",
                message=(
                    f"Regulatory delta applied: {len(rule_changes)} obligation(s) superseded "
                    f"({superseded_clauses}); {newly_flagged_count} firm(s) newly flagged."
                ),
                meta=result["summary"],
                actor="delta-engine",
            )
        )
        session.commit()

    return result
