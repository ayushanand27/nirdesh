"""Rule-object schema for Nirdesh.

This is the contract between the LLM extraction layer and the deterministic
evaluation engine. The engine ONLY ever reads the structured `condition` and
`threshold` fields — never the prose — so compliance decisions stay auditable
and the LLM is never trusted to "decide" breach vs compliant.
"""

from __future__ import annotations

from enum import Enum
from typing import Any, Optional

from pydantic import BaseModel, Field


class EntityType(str, Enum):
    equity_debt_etf = "equity_debt_etf"
    overnight_etf = "overnight_etf"
    liquid_etf = "liquid_etf"
    gold_silver_etf = "gold_silver_etf"
    all_etf = "all_etf"


class Operator(str, Enum):
    equals = "equals"
    not_equals = "not_equals"
    lt = "lt"
    lte = "lte"
    gt = "gt"
    gte = "gte"
    in_ = "in"


class Condition(BaseModel):
    """A single machine-checkable predicate against one firm-data field.

    The evaluation engine computes: firm_data[field] <operator> value.
    If the LLM cannot reduce a clause to this shape, the parent rule must be
    marked needs_human_review instead of emitting a guessed condition.
    """

    field: str = Field(..., description="Firm-data field the engine reads, e.g. 'base_price_method'")
    operator: Operator
    value: Any = Field(..., description="Expected/required value for a compliant firm")


class Threshold(BaseModel):
    """Numeric price-band components. Any unused component is null."""

    static_band_pct: Optional[float] = None
    dynamic_band_pct: Optional[float] = None
    flex_pct: Optional[float] = None
    max_flexes: Optional[int] = None
    trigger_pct: Optional[float] = None
    uncapped: bool = False


class RuleObject(BaseModel):
    rule_id: str = Field(..., description="Stable slug, e.g. 'MRD-POD3-2026__equity_debt_price_band'")
    clause_id: str = Field(..., description="Verbatim clause reference, e.g. '3.2'")
    source_circular_id: str
    plain_description: str

    applicable_entity_type: EntityType

    condition: Optional[Condition] = None
    threshold: Optional[Threshold] = None

    required_action: str
    deadline: Optional[str] = Field(None, description="ISO date YYYY-MM-DD or null")
    effective_from: Optional[str] = Field(None, description="ISO date the rule takes effect")

    confidence: float = Field(..., ge=0.0, le=1.0)
    needs_human_review: bool = False
    review_reason: Optional[str] = None


class ExtractionRequest(BaseModel):
    source_circular_id: str
    circular_text: str
    use_cache: bool = True


class ExtractionResponse(BaseModel):
    source_circular_id: str
    rules: list[RuleObject]
    used_cache: bool
    model: str
    flagged_for_review: int
