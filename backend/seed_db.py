"""Initialise and seed the SQLite database.

Run: `python seed_db.py` (safe to re-run; it drops and recreates for a clean
demo state). Flow:
  1. Load the canonical, human-reviewed rule set (app/canonical_rules.py).
  2. Persist rules append-only, wiring supersession chain:
       Pre-2026 regime (¶2 context) -> §4.1 -> §4.4 (phase-2).
  3. Seed the 3 fictional AMCs.
  4. Log the load event to the audit trail (8 rules total).
"""

from __future__ import annotations

from app.canonical_rules import CANONICAL_RULES, CIRCULAR_ID
from app.db import Base, SessionLocal, engine, init_db
from app.firms_seed import FIRMS
from app.models import AuditLog, Firm, Rule


def reset_schema() -> None:
    Base.metadata.drop_all(bind=engine)
    init_db()


def _serialize_entity_type(aet) -> str | list[str]:
    if isinstance(aet, list):
        return [x.value if hasattr(x, "value") else x for x in aet]
    return aet.value if hasattr(aet, "value") else aet


def seed_rules(session) -> None:
    slug_to_row: dict[str, Rule] = {}
    for r in CANONICAL_RULES:
        row = Rule(
            rule_id=r.rule_id,
            clause_id=r.clause_id,
            source_circular_id=r.source_circular_id,
            plain_description=r.plain_description,
            applicable_entity_type=_serialize_entity_type(r.applicable_entity_type),
            condition=(r.condition.model_dump() if r.condition else None),
            threshold=(r.threshold.model_dump() if r.threshold else None),
            required_action=r.required_action,
            deadline=r.deadline,
            effective_from=r.effective_from,
            plain_label=r.plain_label,
            source_text_span=r.source_text_span,
            confidence=r.confidence,
            needs_human_review=r.needs_human_review,
            review_reason=r.review_reason,
            status="active",
        )
        session.add(row)
        slug_to_row[r.rule_id] = row
    session.flush()  # assign ids

    # Supersession chain: Pre-2026 regime (¶2 context) -> §4.1 -> §4.4
    legacy = slug_to_row.get("MRD-POD3-2026__base_price_legacy")
    base = slug_to_row.get("MRD-POD3-2026__base_price")
    phase2 = slug_to_row.get("MRD-POD3-2026__base_price_phase2")
    if base and legacy:
        base.supersedes_id = legacy.id
    if phase2 and base:
        phase2.supersedes_id = base.id

    review_count = sum(1 for r in CANONICAL_RULES if r.needs_human_review)
    evaluable_count = len(CANONICAL_RULES) - review_count

    session.add(
        AuditLog(
            event_type="extraction",
            entity_ref=CIRCULAR_ID,
            message=(
                f"Loaded {len(CANONICAL_RULES)} compliance rules from the verified circular "
                f"({evaluable_count} evaluable, {review_count} flagged for human review)."
            ),
            meta={
                "source": "canonical_reviewed",
                "rule_count": len(CANONICAL_RULES),
                "evaluable_count": evaluable_count,
                "human_review_count": review_count,
            },
            actor="compliance-analyst",
        )
    )
    session.commit()


def seed_firms(session) -> None:
    for f in FIRMS:
        session.add(Firm(name=f["name"], legal_type=f["legal_type"], profile=f["profile"]))
    session.commit()


def main() -> None:
    reset_schema()
    session = SessionLocal()
    try:
        seed_rules(session)
        seed_firms(session)
        n_rules = session.query(Rule).count()
        n_firms = session.query(Firm).count()
        print(f"Seeded DB: {n_rules} rules, {n_firms} firms.")
    finally:
        session.close()


if __name__ == "__main__":
    main()
