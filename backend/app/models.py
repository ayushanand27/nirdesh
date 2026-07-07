"""ORM models — designed to be append-only where history matters.

Auditability principles (part of the product pitch):
  * Rules are NEVER edited or deleted. An amendment inserts a NEW rule that
    points at the one it replaces via `supersedes_id`, and the old rule's
    `status` flips to 'superseded'. The full lineage stays queryable.
  * `evaluations` and `audit_log` are strictly append-only: every run inserts
    fresh timestamped rows. Nothing is mutated in place.
"""

from __future__ import annotations

from datetime import datetime, timezone

from sqlalchemy import JSON, Boolean, DateTime, Float, ForeignKey, Integer, String, Text
from sqlalchemy.orm import Mapped, mapped_column, relationship

from .db import Base


def _utcnow() -> datetime:
    return datetime.now(timezone.utc)


class Firm(Base):
    __tablename__ = "firms"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    name: Mapped[str] = mapped_column(String(200), unique=True)
    legal_type: Mapped[str] = mapped_column(String(80), default="AMC")
    # profile holds the checkable firm data the engine reads:
    #   base_price_method: str, offers_etf_types: list[str], band_config: dict
    profile: Mapped[dict] = mapped_column(JSON)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=_utcnow)
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=_utcnow, onupdate=_utcnow
    )


class Rule(Base):
    __tablename__ = "rules"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    rule_id: Mapped[str] = mapped_column(String(120), unique=True)
    clause_id: Mapped[str] = mapped_column(String(40))
    source_circular_id: Mapped[str] = mapped_column(String(120))
    plain_description: Mapped[str] = mapped_column(Text)

    applicable_entity_type: Mapped[str] = mapped_column(String(40))

    condition: Mapped[dict | None] = mapped_column(JSON, nullable=True)
    threshold: Mapped[dict | None] = mapped_column(JSON, nullable=True)

    required_action: Mapped[str] = mapped_column(Text)
    deadline: Mapped[str | None] = mapped_column(String(20), nullable=True)
    effective_from: Mapped[str | None] = mapped_column(String(20), nullable=True)

    confidence: Mapped[float] = mapped_column(Float)
    needs_human_review: Mapped[bool] = mapped_column(Boolean, default=False)
    review_reason: Mapped[str | None] = mapped_column(Text, nullable=True)

    # Append-only lineage.
    status: Mapped[str] = mapped_column(String(20), default="active")  # active | superseded
    supersedes_id: Mapped[int | None] = mapped_column(
        ForeignKey("rules.id"), nullable=True
    )
    superseded_by: Mapped[list["Rule"]] = relationship(remote_side=[supersedes_id])

    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=_utcnow)
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=_utcnow, onupdate=_utcnow
    )


class Evaluation(Base):
    """Append-only record of one (firm, rule) decision at a point in time."""

    __tablename__ = "evaluations"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    firm_id: Mapped[int] = mapped_column(ForeignKey("firms.id"))
    rule_id: Mapped[str] = mapped_column(String(120))  # the rule slug, for stable joins
    as_of_date: Mapped[str] = mapped_column(String(20))
    status: Mapped[str] = mapped_column(String(20))  # compliant | breach | not_applicable
    detail: Mapped[dict] = mapped_column(JSON)  # expected vs actual, reason
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=_utcnow)


class AuditLog(Base):
    """Append-only event log: every extraction, evaluation, amendment, review."""

    __tablename__ = "audit_log"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    event_type: Mapped[str] = mapped_column(String(40))  # extraction|evaluation|amendment|review
    entity_ref: Mapped[str] = mapped_column(String(200))
    message: Mapped[str] = mapped_column(Text)
    meta: Mapped[dict | None] = mapped_column(JSON, nullable=True)
    actor: Mapped[str] = mapped_column(String(120), default="system")
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=_utcnow)


class ReviewTask(Base):
    """Human sign-off gate. A generated obligation is NOT 'actioned' until a
    Compliance Officer marks it reviewed. Nirdesh is decision-support only.
    """

    __tablename__ = "review_tasks"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    firm_id: Mapped[int] = mapped_column(ForeignKey("firms.id"))
    firm_name: Mapped[str] = mapped_column(String(200))
    rule_id: Mapped[str] = mapped_column(String(120))
    clause_id: Mapped[str] = mapped_column(String(40))
    as_of_date: Mapped[str] = mapped_column(String(20))
    title: Mapped[str] = mapped_column(Text)
    recommended_action: Mapped[str] = mapped_column(Text)
    severity: Mapped[str] = mapped_column(String(20), default="high")  # high | medium | info

    status: Mapped[str] = mapped_column(String(20), default="pending")  # pending | reviewed
    reviewed_by: Mapped[str | None] = mapped_column(String(120), nullable=True)
    reviewed_at: Mapped[datetime | None] = mapped_column(
        DateTime(timezone=True), nullable=True
    )
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=_utcnow)
