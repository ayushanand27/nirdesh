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

try:
    from pypdf import PdfReader
except ImportError:  # pragma: no cover
    PdfReader = None  # type: ignore


OUT = Path(__file__).resolve().parent / "out"


def _pdf_text(path: Path) -> str:
    if PdfReader is None:
        return ""
    reader = PdfReader(str(path))
    return "\n".join(page.extract_text() or "" for page in reader.pages)


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
        assert r1["regulatory_delta"] is None, "Phase 1 report must not include Phase 2 delta"
        assert r1["engine"]["llm_at_evaluation"] is False
        pdf1 = render_compliance_pdf(r1)
        assert pdf1[:4] == b"%PDF"
        p1 = OUT / "nirdesh-compliance-report-2026-09-01.pdf"
        p1.write_bytes(pdf1)
        text1 = _pdf_text(p1)
        if text1:
            assert "nirdesh-deterministic-v1" in text1
            assert "What Changed" not in text1
            assert "fi 2027" not in text1
            assert "Sec. 4.1" in text1
            assert "Bharat Growth AMC" in text1 and "Meridian" in text1
        print(f"Wrote {p1} ({len(pdf1)} bytes) breach={r1['summary']['breach']} delta=none")

        # Phase 2 as-of without amendment applied must not include delta in report
        r2_preview = assemble_compliance_summary(
            session, "2027-04-01", actor="A. Sharma", persist_audit=False
        )
        assert r2_preview["regulatory_delta"] is None

        # Apply amendment + tasks for Phase 2
        compute_delta(session, "2026-09-01", "2027-04-01", persist=True)
        generate_review_tasks(session, as_of="2027-04-01")

        r2 = assemble_compliance_summary(
            session, "2027-04-01", actor="A. Sharma", persist_audit=True
        )
        assert r2["regulatory_delta"] is not None
        assert r2["regulatory_delta"]["rule_changes"]
        # Phase 1 again after apply still must omit delta
        r1b = assemble_compliance_summary(
            session, "2026-09-01", actor="A. Sharma", persist_audit=False
        )
        assert r1b["regulatory_delta"] is None
        assert any(b.get("source_text_span") for b in r2["breaches"]) or r2["summary"]["breach"] == 0
        pdf2 = render_compliance_pdf(r2)
        assert pdf2[:4] == b"%PDF"
        p2 = OUT / "nirdesh-compliance-report-2027-04-01.pdf"
        p2.write_bytes(pdf2)
        text2 = _pdf_text(p2)
        if text2:
            assert "What Changed" in text2
            assert "->" in text2
            assert "fi Sec." not in text2 and "4.1 fi" not in text2
            assert "Officer Sign-off Log" in text2
            assert "Meridian" in text2
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
