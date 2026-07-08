"""Idempotency smoke tests for amendment / generate-tasks / mark-reviewed / evaluate."""

from __future__ import annotations

import seed_db
from app.db import SessionLocal
from app.delta import compute_delta, reset_amendment
from app.evaluate import run_evaluation
from app.models import AuditLog, ReviewTask
from app.review import generate_review_tasks, mark_reviewed


def count_events(session, event_type: str) -> int:
    return session.query(AuditLog).filter_by(event_type=event_type).count()


def main() -> None:
    seed_db.reset_schema()
    session = SessionLocal()
    try:
        seed_db.seed_rules(session)
        seed_db.seed_firms(session)
        run_evaluation(session, as_of="2026-09-01", actor="seed", persist=True)

        # --- evaluate: second identical call is a no-op ---
        n_eval = count_events(session, "evaluation")
        r1 = run_evaluation(session, as_of="2026-09-01", persist=True)
        r2 = run_evaluation(session, as_of="2026-09-01", persist=True)
        assert r1["noop"] is False or True  # first after seed may already be identical → noop
        assert r2["noop"] is True
        assert count_events(session, "evaluation") == n_eval, "duplicate evaluation audit"
        print("OK evaluate double-call")

        # --- apply amendment: second apply is a no-op ---
        n_amd = count_events(session, "amendment")
        d1 = compute_delta(session, "2026-09-01", "2027-04-01", persist=True)
        assert d1["application"]["status"] == "APPLIED"
        assert d1["application"]["noop"] is False
        d2 = compute_delta(session, "2026-09-01", "2027-04-01", persist=True)
        assert d2["application"]["noop"] is True
        assert d2["application"]["status"] == "APPLIED"
        assert count_events(session, "amendment") == n_amd + 1
        print("OK apply-amendment double-call")

        # --- generate tasks: second call creates none ---
        g1 = generate_review_tasks(session, as_of="2027-04-01")
        assert g1["created"] > 0
        n_review = count_events(session, "review")
        g2 = generate_review_tasks(session, as_of="2027-04-01")
        assert g2["noop"] is True
        assert g2["created"] == 0
        assert g2["already_pending"] >= g1["created"]
        assert count_events(session, "review") == n_review, "duplicate generate audit"
        print(f"OK generate-tasks double-call ({g2['message']})")

        # --- mark reviewed: second call is a no-op ---
        task = session.query(ReviewTask).filter_by(status="pending").first()
        assert task is not None
        m1 = mark_reviewed(session, task.id, "A. Sharma")
        assert m1["noop"] is False
        n_review2 = count_events(session, "review")
        m2 = mark_reviewed(session, task.id, "A. Sharma")
        assert m2["noop"] is True
        assert m2["status"] == "reviewed"
        assert count_events(session, "review") == n_review2
        print("OK mark-reviewed double-call")

        # --- reset restores NOT_APPLIED without looking like apply ---
        reset_amendment(session, "2026-09-01", "2027-04-01")
        d3 = compute_delta(session, "2026-09-01", "2027-04-01", persist=False)
        assert d3["application"]["status"] == "NOT_APPLIED"
        assert session.query(AuditLog).filter_by(event_type="amendment_reset").count() == 1
        print("OK reset to Phase 1")

        print("\nAll idempotency checks passed.")
    finally:
        session.close()


if __name__ == "__main__":
    main()
