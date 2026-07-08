"""Render a compliance summary report dict to a branded PDF (reportlab).

Print-friendly: white page, gold accent headers, status colors matching the UI.
"""

from __future__ import annotations

import io
from typing import Any

from reportlab.lib import colors
from reportlab.lib.enums import TA_CENTER, TA_LEFT
from reportlab.lib.pagesizes import A4, landscape
from reportlab.lib.styles import ParagraphStyle, getSampleStyleSheet
from reportlab.lib.units import mm
from reportlab.platypus import (
    PageBreak,
    Paragraph,
    SimpleDocTemplate,
    Spacer,
    Table,
    TableStyle,
)

# Brand palette (print-friendly light theme + gold)
GOLD = colors.HexColor("#C9A227")
GOLD_DARK = colors.HexColor("#8A6D1F")
INK = colors.HexColor("#1A1A1A")
MUTED = colors.HexColor("#5A5A5A")
HAIR = colors.HexColor("#D8D8D8")
SURFACE = colors.HexColor("#F7F7F5")
COMPLIANT = colors.HexColor("#1A7A4C")
COMPLIANT_BG = colors.HexColor("#E6F7EF")
BREACH = colors.HexColor("#C43C22")
BREACH_BG = colors.HexColor("#FDECE8")
NA = colors.HexColor("#6B6B6B")
NA_BG = colors.HexColor("#F0F0F0")

DISCLAIMER_FALLBACK = (
    "Nirdesh is a decision-support system. This report reflects deterministic "
    "evaluation as of the stated date and requires human verification before "
    "regulatory submission."
)


def _styles() -> dict[str, ParagraphStyle]:
    base = getSampleStyleSheet()
    return {
        "brand": ParagraphStyle(
            "Brand",
            parent=base["Normal"],
            fontName="Helvetica-Bold",
            fontSize=18,
            textColor=GOLD_DARK,
            leading=22,
        ),
        "title": ParagraphStyle(
            "Title",
            parent=base["Normal"],
            fontName="Helvetica-Bold",
            fontSize=14,
            textColor=INK,
            leading=18,
            spaceAfter=4,
        ),
        "h2": ParagraphStyle(
            "H2",
            parent=base["Normal"],
            fontName="Helvetica-Bold",
            fontSize=11,
            textColor=GOLD_DARK,
            leading=14,
            spaceBefore=10,
            spaceAfter=6,
        ),
        "body": ParagraphStyle(
            "Body",
            parent=base["Normal"],
            fontName="Helvetica",
            fontSize=8,
            textColor=INK,
            leading=11,
        ),
        "muted": ParagraphStyle(
            "Muted",
            parent=base["Normal"],
            fontName="Helvetica",
            fontSize=7.5,
            textColor=MUTED,
            leading=10,
        ),
        "mono": ParagraphStyle(
            "Mono",
            parent=base["Normal"],
            fontName="Courier",
            fontSize=7,
            textColor=INK,
            leading=9,
        ),
        "cite": ParagraphStyle(
            "Cite",
            parent=base["Normal"],
            fontName="Helvetica-Oblique",
            fontSize=7,
            textColor=MUTED,
            leading=9,
            leftIndent=6,
            borderPadding=3,
        ),
        "cell": ParagraphStyle(
            "Cell",
            parent=base["Normal"],
            fontName="Helvetica",
            fontSize=6.5,
            textColor=INK,
            leading=8,
            alignment=TA_CENTER,
        ),
        "cell_left": ParagraphStyle(
            "CellLeft",
            parent=base["Normal"],
            fontName="Helvetica",
            fontSize=7,
            textColor=INK,
            leading=9,
            alignment=TA_LEFT,
        ),
        "stat": ParagraphStyle(
            "Stat",
            parent=base["Normal"],
            fontName="Helvetica-Bold",
            fontSize=16,
            textColor=INK,
            alignment=TA_CENTER,
            leading=18,
        ),
        "stat_label": ParagraphStyle(
            "StatLabel",
            parent=base["Normal"],
            fontName="Helvetica",
            fontSize=7,
            textColor=MUTED,
            alignment=TA_CENTER,
            leading=9,
        ),
        "footer": ParagraphStyle(
            "Footer",
            parent=base["Normal"],
            fontName="Helvetica",
            fontSize=6.5,
            textColor=MUTED,
            alignment=TA_CENTER,
            leading=8,
        ),
        "status_ok": ParagraphStyle(
            "StatusOk",
            parent=base["Normal"],
            fontName="Helvetica-Bold",
            fontSize=6.5,
            textColor=COMPLIANT,
            alignment=TA_CENTER,
        ),
        "status_breach": ParagraphStyle(
            "StatusBreach",
            parent=base["Normal"],
            fontName="Helvetica-Bold",
            fontSize=6.5,
            textColor=BREACH,
            alignment=TA_CENTER,
        ),
        "status_na": ParagraphStyle(
            "StatusNa",
            parent=base["Normal"],
            fontName="Helvetica",
            fontSize=6.5,
            textColor=NA,
            alignment=TA_CENTER,
        ),
    }


def _esc(text: str | None) -> str:
    if not text:
        return ""
    # Helvetica cannot draw Unicode arrows / section marks / fancy dashes.
    cleaned = (
        str(text)
        .replace("→", "->")
        .replace("←", "<-")
        .replace("§", "Sec. ")
        .replace("×", "x")
        .replace("–", "-")
        .replace("—", "-")
        .replace("·", "|")
        .replace("“", '"')
        .replace("”", '"')
        .replace("‘", "'")
        .replace("’", "'")
    )
    return cleaned.replace("&", "&amp;").replace("<", "&lt;").replace(">", "&gt;")


def _arrow() -> str:
    return "-&gt;"


def _clause(clause_id: str | None) -> str:
    return f"Sec. {_esc(clause_id)}"


def _clause_sort_key(rule: dict) -> tuple:
    cid = str(rule.get("clause_id") or "").replace("§", "").strip()
    nums: list[int] = []
    for part in cid.split("."):
        try:
            nums.append(int(part))
        except ValueError:
            nums.append(999)
    while len(nums) < 4:
        nums.append(0)
    return tuple(nums)


def _status_para(status: str, styles: dict) -> Paragraph:
    label = {"compliant": "Compliant", "breach": "Breach", "not_applicable": "N/A"}.get(
        status, status
    )
    style = {
        "compliant": styles["status_ok"],
        "breach": styles["status_breach"],
        "not_applicable": styles["status_na"],
    }.get(status, styles["cell"])
    return Paragraph(_esc(label), style)


def _status_bg(status: str) -> colors.Color:
    return {
        "compliant": COMPLIANT_BG,
        "breach": BREACH_BG,
        "not_applicable": NA_BG,
    }.get(status, colors.white)


def render_compliance_pdf(report: dict[str, Any]) -> bytes:
    """Return PDF bytes for a compliance_summary report dict."""
    styles = _styles()
    buf = io.BytesIO()
    disclaimer = report.get("disclaimer") or DISCLAIMER_FALLBACK

    def _on_page(canvas, doc):
        canvas.saveState()
        page_w, page_h = landscape(A4)
        # Gold top rule
        canvas.setStrokeColor(GOLD)
        canvas.setLineWidth(2)
        canvas.line(14 * mm, page_h - 10 * mm, page_w - 14 * mm, page_h - 10 * mm)
        # Footer disclaimer on every page (full text, wrapped)
        canvas.setStrokeColor(HAIR)
        canvas.setLineWidth(0.4)
        canvas.line(14 * mm, 18 * mm, page_w - 14 * mm, 18 * mm)
        canvas.setFillColor(MUTED)
        canvas.setFont("Helvetica", 6.5)
        max_chars = 145
        words = disclaimer.split()
        lines: list[str] = []
        cur = ""
        for w in words:
            trial = f"{cur} {w}".strip()
            if len(trial) <= max_chars:
                cur = trial
            else:
                if cur:
                    lines.append(cur)
                cur = w
        if cur:
            lines.append(cur)
        y = 13 * mm
        for line in lines[:3]:
            canvas.drawCentredString(page_w / 2, y, line)
            y -= 3.2 * mm
        canvas.setFont("Helvetica", 6)
        canvas.drawRightString(page_w - 14 * mm, 5 * mm, f"Page {doc.page}")
        canvas.restoreState()

    doc = SimpleDocTemplate(
        buf,
        pagesize=landscape(A4),
        leftMargin=14 * mm,
        rightMargin=14 * mm,
        topMargin=16 * mm,
        bottomMargin=22 * mm,
        title=f"Nirdesh Compliance Report — {report.get('as_of')}",
        author=report.get("generated_by") or "Nirdesh",
    )

    story: list = []
    circular = report.get("circular") or {}
    summary = report.get("summary") or {}
    as_of = report.get("as_of", "")
    generated_at = (report.get("generated_at") or "")[:19].replace("T", " ") + " UTC"
    generated_by = report.get("generated_by") or "system"

    # Header
    header = Table(
        [
            [
                Paragraph("NIRDESH", styles["brand"]),
                Paragraph(
                    f"<b>Compliance Summary Report</b><br/>"
                    f"<font color='#5A5A5A'>As of { _esc(as_of) } · Generated { _esc(generated_at) }"
                    f" · By { _esc(generated_by) }</font>",
                    styles["body"],
                ),
            ]
        ],
        colWidths=[55 * mm, 200 * mm],
    )
    header.setStyle(
        TableStyle(
            [
                ("VALIGN", (0, 0), (-1, -1), "MIDDLE"),
                ("BACKGROUND", (0, 0), (-1, -1), SURFACE),
                ("BOX", (0, 0), (-1, -1), 0.5, GOLD),
                ("LEFTPADDING", (0, 0), (-1, -1), 8),
                ("RIGHTPADDING", (0, 0), (-1, -1), 8),
                ("TOPPADDING", (0, 0), (-1, -1), 8),
                ("BOTTOMPADDING", (0, 0), (-1, -1), 8),
            ]
        )
    )
    story.append(header)
    story.append(Spacer(1, 4 * mm))
    engine = report.get("engine") or {}
    story.append(
        Paragraph(
            f"Circular <font face='Courier'>{_esc(circular.get('id'))}</font>"
            f" - {_esc(circular.get('title'))}"
            f" · Issued {_esc(circular.get('issued'))}",
            styles["muted"],
        )
    )
    story.append(
        Paragraph(
            f"Engine: <font face='Courier'>{_esc(engine.get('name', 'nirdesh-deterministic-v1'))}</font>"
            f" · Ruleset {_esc(engine.get('ruleset', 'canonical'))}"
            f" · LLM at evaluation: no (ingest-only)",
            styles["muted"],
        )
    )
    story.append(Spacer(1, 5 * mm))

    # Summary stats
    story.append(Paragraph("Summary", styles["h2"]))
    stats = Table(
        [
            [
                Paragraph(str(summary.get("compliant", 0)), styles["stat"]),
                Paragraph(str(summary.get("breach", 0)), styles["stat"]),
                Paragraph(str(summary.get("not_applicable", 0)), styles["stat"]),
                Paragraph(str(summary.get("signoff_reviewed", 0)), styles["stat"]),
                Paragraph(str(summary.get("signoff_pending", 0)), styles["stat"]),
            ],
            [
                Paragraph("Compliant", styles["stat_label"]),
                Paragraph("Breach", styles["stat_label"]),
                Paragraph("N/A", styles["stat_label"]),
                Paragraph("Signed off", styles["stat_label"]),
                Paragraph("Pending review", styles["stat_label"]),
            ],
        ],
        colWidths=[50 * mm] * 5,
    )
    stats.setStyle(
        TableStyle(
            [
                ("BACKGROUND", (0, 0), (0, -1), COMPLIANT_BG),
                ("BACKGROUND", (1, 0), (1, -1), BREACH_BG),
                ("BACKGROUND", (2, 0), (2, -1), NA_BG),
                ("BACKGROUND", (3, 0), (3, -1), SURFACE),
                ("BACKGROUND", (4, 0), (4, -1), SURFACE),
                ("BOX", (0, 0), (-1, -1), 0.4, HAIR),
                ("INNERGRID", (0, 0), (-1, -1), 0.3, HAIR),
                ("TOPPADDING", (0, 0), (-1, -1), 6),
                ("BOTTOMPADDING", (0, 0), (-1, -1), 4),
                ("ALIGN", (0, 0), (-1, -1), "CENTER"),
            ]
        )
    )
    story.append(stats)
    story.append(Spacer(1, 6 * mm))

    # Matrix: clauses as rows, firms as columns (readable with 3 firms).
    story.append(Paragraph("Compliance Matrix", styles["h2"]))
    matrix = report.get("matrix") or {}
    rules = sorted(matrix.get("rules") or [], key=_clause_sort_key)
    firms = matrix.get("firms") or []
    rows = matrix.get("rows") or []
    # Map firm_id -> cells_by_rule_id
    by_firm: dict[int, dict] = {}
    for row in rows:
        by_firm[row["firm_id"]] = row.get("cells") or {}

    header_cells = [Paragraph("<b>Clause / Obligation</b>", styles["cell_left"])]
    for f in firms:
        header_cells.append(Paragraph(f"<b>{_esc(f.get('name'))}</b>", styles["cell"]))

    table_data = [header_cells]
    style_cmds: list = [
        ("BACKGROUND", (0, 0), (-1, 0), colors.HexColor("#1A1A1A")),
        ("TEXTCOLOR", (0, 0), (-1, 0), colors.white),
        ("BOX", (0, 0), (-1, -1), 0.5, HAIR),
        ("INNERGRID", (0, 0), (-1, -1), 0.3, HAIR),
        ("VALIGN", (0, 0), (-1, -1), "MIDDLE"),
        ("TOPPADDING", (0, 0), (-1, -1), 5),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 5),
        ("LEFTPADDING", (0, 0), (-1, -1), 4),
        ("RIGHTPADDING", (0, 0), (-1, -1), 4),
    ]

    for ri, rule in enumerate(rules):
        label = rule.get("plain_label") or ""
        clause_cell = Paragraph(
            f"<b>{_clause(rule.get('clause_id'))}</b>  {_esc(label)}",
            styles["cell_left"],
        )
        line = [clause_cell]
        for ci, firm in enumerate(firms):
            cell = (by_firm.get(firm["id"]) or {}).get(rule["rule_id"]) or {}
            status = cell.get("status", "not_applicable")
            line.append(_status_para(status, styles))
            style_cmds.append(
                ("BACKGROUND", (ci + 1, ri + 1), (ci + 1, ri + 1), _status_bg(status))
            )
        table_data.append(line)
        if ri % 2 == 1:
            style_cmds.append(("BACKGROUND", (0, ri + 1), (0, ri + 1), SURFACE))

    clause_w = 70 * mm
    firm_cols = max(len(firms), 1)
    firm_w = (255 * mm - clause_w) / firm_cols
    matrix_table = Table(
        table_data, colWidths=[clause_w] + [firm_w] * firm_cols, repeatRows=1
    )
    matrix_table.setStyle(TableStyle(style_cmds))
    story.append(matrix_table)
    story.append(Spacer(1, 5 * mm))

    # Breach citations — page break so matrix status cells do not bleed into copy/paste
    breaches = report.get("breaches") or []
    if breaches:
        story.append(PageBreak())
        story.append(Paragraph("Breach Detail &amp; Source Citations", styles["h2"]))
        for b in breaches:
            story.append(
                Paragraph(
                    f"<b>{_esc(b.get('firm_name'))}</b> - {_clause(b.get('clause_id'))}"
                    f" · {_esc(b.get('plain_label') or '')}",
                    styles["body"],
                )
            )
            story.append(Paragraph(_esc(b.get("plain_description") or ""), styles["muted"]))
            if b.get("source_text_span"):
                story.append(
                    Paragraph(
                        f'Source: "{_esc(b["source_text_span"])}"',
                        styles["cite"],
                    )
                )
            if b.get("required_action"):
                story.append(
                    Paragraph(
                        f"Recommended action: {_esc(b['required_action'])}",
                        styles["muted"],
                    )
                )
            story.append(Spacer(1, 4 * mm))

    # What Changed — only present when report assembler included delta (Phase 2+)
    delta = report.get("regulatory_delta")
    if delta and delta.get("rule_changes"):
        story.append(Paragraph("What Changed - Regulatory Delta", styles["h2"]))
        app = delta.get("application") or {}
        story.append(
            Paragraph(
                f"Window {_esc(delta.get('from_as_of'))} {_arrow()} {_esc(delta.get('to_as_of'))}"
                f" · Status: <b>{_esc(app.get('status', '-'))}</b>"
                + (
                    f" · Applied {_esc((app.get('applied_at') or '')[:19].replace('T', ' '))} UTC"
                    if app.get("applied_at")
                    else ""
                ),
                styles["muted"],
            )
        )
        story.append(Spacer(1, 2 * mm))
        for change in delta["rule_changes"]:
            old = change.get("old") or {}
            new = change.get("new") or {}
            story.append(
                Paragraph(
                    f"{_clause(old.get('clause_id'))} {_arrow()} {_clause(new.get('clause_id'))}: "
                    f"<font color='#5A5A5A'>{_esc(old.get('value_summary'))}</font>"
                    f"  {_arrow()}  <b>{_esc(new.get('value_summary'))}</b>",
                    styles["body"],
                )
            )
            if new.get("source_text_span"):
                story.append(
                    Paragraph(f'Source: "{_esc(new["source_text_span"])}"', styles["cite"])
                )
            story.append(Spacer(1, 2 * mm))

        transitions = delta.get("firm_transitions") or []
        if transitions:
            story.append(Paragraph("Firm status transitions", styles["muted"]))
            t_header = [
                Paragraph("<b>Firm</b>", styles["cell_left"]),
                Paragraph("<b>Clause</b>", styles["cell"]),
                Paragraph("<b>From</b>", styles["cell"]),
                Paragraph("<b>To</b>", styles["cell"]),
                Paragraph("<b>Flag</b>", styles["cell"]),
            ]
            t_data = [t_header]
            for t in transitions:
                t_data.append(
                    [
                        Paragraph(_esc(t.get("firm_name")), styles["cell_left"]),
                        Paragraph(f"{_clause(t.get('clause_id'))}", styles["cell"]),
                        _status_para(t.get("from_status", ""), styles),
                        _status_para(t.get("to_status", ""), styles),
                        Paragraph(
                            "Newly flagged" if t.get("newly_flagged") else "-",
                            styles["cell"],
                        ),
                    ]
                )
            t_table = Table(
                t_data, colWidths=[70 * mm, 30 * mm, 35 * mm, 35 * mm, 40 * mm]
            )
            t_table.setStyle(
                TableStyle(
                    [
                        ("BACKGROUND", (0, 0), (-1, 0), SURFACE),
                        ("BOX", (0, 0), (-1, -1), 0.4, HAIR),
                        ("INNERGRID", (0, 0), (-1, -1), 0.25, HAIR),
                        ("TOPPADDING", (0, 0), (-1, -1), 3),
                        ("BOTTOMPADDING", (0, 0), (-1, -1), 3),
                    ]
                )
            )
            story.append(Spacer(1, 2 * mm))
            story.append(t_table)

    # Officer Sign-off Log
    story.append(Paragraph("Officer Sign-off Log", styles["h2"]))
    signoff = report.get("officer_signoff") or {}
    log = signoff.get("log") or []
    if not log:
        story.append(
            Paragraph(
                "No review tasks recorded for this as-of date.",
                styles["muted"],
            )
        )
    else:
        s_header = [
            Paragraph("<b>Status</b>", styles["cell"]),
            Paragraph("<b>Firm / Clause</b>", styles["cell_left"]),
            Paragraph("<b>Recommended action</b>", styles["cell_left"]),
            Paragraph("<b>Signed off by</b>", styles["cell_left"]),
            Paragraph("<b>When (UTC)</b>", styles["cell"]),
        ]
        s_data = [s_header]
        for item in log:
            when = (item.get("reviewed_at") or "-")[:19].replace("T", " ")
            s_data.append(
                [
                    Paragraph(
                        "Reviewed" if item.get("status") == "reviewed" else "Pending",
                        styles["status_ok"]
                        if item.get("status") == "reviewed"
                        else styles["status_breach"],
                    ),
                    Paragraph(
                        f"{_esc(item.get('firm_name'))}<br/>{_clause(item.get('clause_id'))}",
                        styles["cell_left"],
                    ),
                    Paragraph(_esc(item.get("recommended_action") or "-"), styles["cell_left"]),
                    Paragraph(_esc(item.get("reviewed_by") or "-"), styles["cell_left"]),
                    Paragraph(_esc(when), styles["cell"]),
                ]
            )
        s_table = Table(
            s_data, colWidths=[22 * mm, 50 * mm, 95 * mm, 40 * mm, 35 * mm], repeatRows=1
        )
        s_table.setStyle(
            TableStyle(
                [
                    ("BACKGROUND", (0, 0), (-1, 0), colors.HexColor("#1A1A1A")),
                    ("TEXTCOLOR", (0, 0), (-1, 0), colors.white),
                    ("BOX", (0, 0), (-1, -1), 0.4, HAIR),
                    ("INNERGRID", (0, 0), (-1, -1), 0.25, HAIR),
                    ("VALIGN", (0, 0), (-1, -1), "TOP"),
                    ("TOPPADDING", (0, 0), (-1, -1), 4),
                    ("BOTTOMPADDING", (0, 0), (-1, -1), 4),
                    ("LEFTPADDING", (0, 0), (-1, -1), 3),
                ]
            )
        )
        story.append(s_table)

    story.append(Spacer(1, 8 * mm))
    story.append(
        Paragraph(
            "<b>Decision-support only.</b> Do not submit this artifact as a regulatory filing "
            "without Compliance Officer verification.",
            styles["muted"],
        )
    )

    doc.build(story, onFirstPage=_on_page, onLaterPages=_on_page)
    return buf.getvalue()
