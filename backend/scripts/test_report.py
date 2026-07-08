"""Generate Phase 1 / Phase 2 compliance report PDFs and verify audit behaviour."""

from __future__ import annotations

from pathlib import Path

import seed_db
from app.db import SessionLocal
from app.delta import compute_delta
from app.evaluate import run_evaluation
from app.models import AuditLog
from app.report import assemble_compliance_summary
from app.report_pdf import render_compliance_pdf
from app.review import generate_review_tasks


OUT = Path(__file__).resolve().parent / "out"


def main() -> None:
    OUT.mkdir(exist_ok=True)
    seed_db.reset_schema()
    session = SessionLocal()
    try:
        seed_db.seed_rules(session)
        seed_db.seed_firms(session)
        run_evaluation(session, as_of="2026-09-01", actor="seed", persist=True)

        # Phase 1 report
        r1 = assemble_compliance_summary(
            session, "2026-09-01", actor="A. Sharma", persist_audit=True
        )
        assert r1["summary"]["breach"] >= 1
        assert r1["circular"]["id"]
        pdf1 = render_compliance_pdf(r1)
        assert pdf1[:4] == b"%PDF"
        p1 = OUT / "nirdesh-compliance-report-2026-09-01.pdf"
        p1.write_bytes(pdf1)
        print(f"Wrote {p1} ({len(pdf1)} bytes) breach={r1['summary']['breach']}")

        # Apply amendment + tasks for Phase 2
        compute_delta(session, "2026-09-01", "2027-04-01", persist=True)
        generate_review_tasks(session, as_of="2027-04-01")

        r2 = assemble_compliance_summary(
            session, "2027-04-01", actor="A. Sharma", persist_audit=True
        )
        assert r2["regulatory_delta"] is not None
        assert r2["regulatory_delta"]["rule_changes"]
        assert any(b.get("source_text_span") for b in r2["breaches"]) or r2["summary"]["breach"] == 0
        pdf2 = render_compliance_pdf(r2)
        assert pdf2[:4] == b"%PDF"
        p2 = OUT / "nirdesh-compliance-report-2027-04-01.pdf"
        p2.write_bytes(pdf2)
        print(
            f"Wrote {p2} ({len(pdf2)} bytes) breach={r2['summary']['breach']} "
            f"delta_changes={len(r2['regulatory_delta']['rule_changes'])}"
        )

        # Multiple report generations: each adds one clean audit entry (export trail)
        n_before = session.query(AuditLog).filter_by(event_type="report").count()
        assemble_compliance_summary(
            session, "2027-04-01", actor="A. Sharma", persist_audit=True
        )
        assemble_compliance_summary(
            session, "2027-04-01", actor="A. Sharma", persist_audit=True
        )
        n_after = session.query(AuditLog).filter_by(event_type="report").count()
        assert n_after == n_before + 2
        msgs = [
            a.message
            for a in session.query(AuditLog).filter_by(event_type="report").all()
        ]
        assert all("Compliance report generated" in m for m in msgs)
        print(f"OK report audit entries: {n_after} (each gen = one entry)")
        print("All report checks passed.")
    finally:
        session.close()


if __name__ == "__main__":
    main()
