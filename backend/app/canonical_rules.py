"""Canonical, human-reviewed rule set for the demo circular.

These are the obligations AFTER a compliance analyst has reviewed the raw LLM
extraction and normalized each into the firm's control vocabulary (the field/
value encoding the deterministic engine and firm profiles share, e.g.
`band_config.equity_debt_etf == "dynamic_10_flex5_max2"`).

This separation is deliberate and is itself part of the pitch:
  raw LLM extraction  ->  human review / normalization  ->  deterministic eval
The live /extract endpoint demonstrates the first stage (and its guardrail: the
model flags anything it cannot reduce to a checkable condition). This module is
the reviewed output that the evaluation engine and delta run against, so the
demo is deterministic regardless of any live-model variance.
"""

from __future__ import annotations

from .schemas import RuleObject

CIRCULAR_ID = "HO/47/11/11(1)2026-MRD-POD3/I/13804/2026"

CANONICAL_RULES: list[RuleObject] = [
    RuleObject(
        rule_id="MRD-POD3-2026__base_price",
        clause_id="2.1",
        source_circular_id=CIRCULAR_ID,
        plain_description="Base price of ETF units must be the T-1 closing price (last 30-min VWAP).",
        applicable_entity_type="all_etf",
        condition={"field": "base_price_method", "operator": "equals", "value": "T-1_closing_vwap"},
        threshold=None,
        required_action="Adopt T-1 closing VWAP (last 30 minutes) as the ETF base price; discontinue T-2 day NAV.",
        deadline="2026-09-01",
        effective_from="2026-09-01",
        confidence=0.96,
    ),
    RuleObject(
        rule_id="MRD-POD3-2026__equity_debt_band",
        clause_id="3.1",
        source_circular_id=CIRCULAR_ID,
        plain_description="Equity/Debt ETFs: dynamic +/-10% band, flex +5%, max 2 flexes (cap +/-20%).",
        applicable_entity_type="equity_debt_etf",
        condition={"field": "band_config.equity_debt_etf", "operator": "equals", "value": "dynamic_10_flex5_max2"},
        threshold={"dynamic_band_pct": 10, "flex_pct": 5, "max_flexes": 2, "uncapped": False},
        required_action="Configure dynamic +/-10% price band with +5% flexing, capped at 2 flexes.",
        deadline="2026-09-01",
        effective_from="2026-09-01",
        confidence=0.90,
    ),
    RuleObject(
        rule_id="MRD-POD3-2026__overnight_band",
        clause_id="3.2",
        source_circular_id=CIRCULAR_ID,
        plain_description="Overnight ETFs: fixed +/-5% band (unchanged).",
        applicable_entity_type="overnight_etf",
        condition={"field": "band_config.overnight_etf", "operator": "equals", "value": "fixed_5"},
        threshold={"static_band_pct": 5, "uncapped": False},
        required_action="Maintain fixed +/-5% price band.",
        deadline="2026-09-01",
        effective_from="2026-09-01",
        confidence=0.94,
    ),
    RuleObject(
        rule_id="MRD-POD3-2026__liquid_band",
        clause_id="3.3",
        source_circular_id=CIRCULAR_ID,
        plain_description="Liquid ETFs: fixed +/-5% band (newly tightened from flat +/-20%).",
        applicable_entity_type="liquid_etf",
        condition={"field": "band_config.liquid_etf", "operator": "equals", "value": "fixed_5"},
        threshold={"static_band_pct": 5, "uncapped": False},
        required_action="Tighten liquid ETF price band to fixed +/-5%.",
        deadline="2026-09-01",
        effective_from="2026-09-01",
        confidence=0.92,
    ),
    RuleObject(
        rule_id="MRD-POD3-2026__gold_silver_band",
        clause_id="3.4",
        source_circular_id=CIRCULAR_ID,
        plain_description="Gold/Silver ETFs: dynamic +/-6% band, flex +3% at 5.90% trigger, uncapped flexing.",
        applicable_entity_type="gold_silver_etf",
        condition={"field": "band_config.gold_silver_etf", "operator": "equals", "value": "dynamic_6_flex3_trig5.90_uncapped"},
        threshold={"dynamic_band_pct": 6, "flex_pct": 3, "trigger_pct": 5.90, "uncapped": True},
        required_action="Configure dynamic +/-6% band with +3% uncapped flexing triggered at 5.90%.",
        deadline="2026-09-01",
        effective_from="2026-09-01",
        confidence=0.88,
    ),
    RuleObject(
        rule_id="MRD-POD3-2026__base_price_phase2",
        clause_id="4.4",
        source_circular_id=CIRCULAR_ID,
        plain_description="Phase 2: migrate base price to T-1 closing NAV, superseding the T-1 VWAP method in clause 2.1.",
        applicable_entity_type="all_etf",
        condition={"field": "base_price_method", "operator": "equals", "value": "T-1_closing_nav"},
        threshold=None,
        required_action="Migrate ETF base price computation to T-1 closing NAV.",
        deadline="2027-04-01",
        effective_from="2027-04-01",
        confidence=0.90,
    ),
]
