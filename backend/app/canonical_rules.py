"""Canonical, human-reviewed rule set for the demo circular.

Clause IDs and mechanics are verified against the real SEBI circular
(see backend/data/circular_MRD-POD3-2026_VERIFIED.txt, extracted from the
official PDF). Structure:

  Base price
    ¶2      Pre-2026 regime (T-2 NAV, flat +20%) — superseded by §4.1
    §4.1    T-1 closing price (last 30-min VWAP) — eff 01 Sep 2026
    §4.4    T-1 closing NAV transition — eff 01 Apr 2027, supersedes §4.1
  Price bands
    §5.1.1  Equity/Debt ETFs: dynamic +/-10%, flex +5%, max 2, cap +/-20%
            (cooling-off trigger 9.90% per §5.1.2, flex increment §5.1.3)
    §5.2.1  Overnight + Liquid ETFs (single obligation): fixed +/-5%
    §5.3.1  Commodity (Gold/Silver) ETFs: dynamic +/-6%, flex +3%
            (DPL +/-9% relaxation §5.3.2, cooling-off 5.90% §5.3.3, uncapped §5.3.7)
  Flagged for human review (not machine-evaluated)
    §6.1    Close-out procedure for Overnight/Liquid ETFs
    §7.1    Call auction in pre-open session for Commodity ETFs

The two review rules carry needs_human_review=true and no checkable condition:
they represent obligations the analyst has not yet reduced to a deterministic
test, which is exactly the "we don't let the system guess" posture.
"""

from __future__ import annotations

from .schemas import RuleObject

CIRCULAR_ID = "HO/47/11/11(1)2026-MRD-POD3/I/13804/2026"

CANONICAL_RULES: list[RuleObject] = [
    # --- Base price lineage -------------------------------------------------
    RuleObject(
        rule_id="MRD-POD3-2026__base_price_legacy",
        clause_id="Pre-2026 regime (¶2 context)",
        source_circular_id=CIRCULAR_ID,
        plain_description="Legacy regime: base price is T-2 day NAV with a fixed +20% band (superseded from 01 Sep 2026).",
        applicable_entity_type="all_etf",
        condition={"field": "base_price_method", "operator": "equals", "value": "T-2_NAV"},
        threshold={"static_band_pct": 20},
        required_action="Historic baseline retained for audit lineage; superseded by clause 4.1.",
        deadline=None,
        effective_from="2020-01-01",
        source_text_span=(
            "Currently, for Exchange Traded Funds (ETFs) (based on Equity, Debt and "
            "Commodities), a fixed price band of +20% (except for Overnight ETFs, for which "
            "the price band is +5%) is applicable on the base price, which is T-2 day Net "
            "Asset Value (NAV) of the ETFs."
        ),
        confidence=0.97,
    ),
    RuleObject(
        rule_id="MRD-POD3-2026__base_price",
        clause_id="4.1",
        source_circular_id=CIRCULAR_ID,
        plain_description="Base price for ETF price bands is the T-1 day closing price, i.e. last 30-minute VWAP of the ETF.",
        applicable_entity_type="all_etf",
        condition={"field": "base_price_method", "operator": "equals", "value": "T-1_closing_vwap"},
        threshold=None,
        required_action="Adopt T-1 day closing price (last 30-min VWAP) as the base price; discontinue T-2 day NAV.",
        deadline="2026-09-01",
        effective_from="2026-09-01",
        source_text_span=(
            "Considering the operational challenges in usage of T-1 day closing NAV of the "
            "ETFs as base price, to start with, the base price for determination of price "
            "bands of ETFs shall be T-1 day Closing Price i.e. last 30 minutes of Volume "
            "Weighted Average Price (VWAP) of the ETF."
        ),
        confidence=0.96,
    ),
    RuleObject(
        rule_id="MRD-POD3-2026__base_price_phase2",
        clause_id="4.4",
        source_circular_id=CIRCULAR_ID,
        plain_description="Second phase: Stock Exchanges and AMCs shall jointly address the operational challenges to implement T-1 day closing NAV as the base price w.e.f. 01 Apr 2027.",
        applicable_entity_type="all_etf",
        condition={"field": "base_price_method", "operator": "equals", "value": "T-1_closing_nav"},
        threshold=None,
        required_action="Jointly work towards using T-1 day closing NAV as the ETF base price by 01 Apr 2027.",
        deadline="2027-04-01",
        effective_from="2027-04-01",
        source_text_span=(
            "However, the Stock Exchanges and Asset Management Companies of Mutual Funds "
            "shall jointly address the operational challenges to implement the use of T-1 "
            "day closing NAV of the ETFs as the base price w.e.f. April 01, 2027."
        ),
        confidence=0.90,
    ),
    # --- Price bands --------------------------------------------------------
    RuleObject(
        rule_id="MRD-POD3-2026__equity_debt_band",
        clause_id="5.1.1",
        source_circular_id=CIRCULAR_ID,
        plain_description="Equity/Debt ETFs (excl. Overnight/Liquid): dynamic band +/-10%, flexed by +5% after cooling-off, max 2 instances per direction (cap +/-20%).",
        applicable_entity_type="equity_debt_etf",
        condition={"field": "band_config.equity_debt_etf", "operator": "equals", "value": "dynamic_10_flex5_max2"},
        threshold={
            "dynamic_band_pct": 10,
            "flex_pct": 5,
            "max_flexes": 2,
            "uncapped": False,
            "cooling_off_trigger_pct": 9.90,
            "cooling_off_minutes": 15,
            "cooling_off_minutes_last_30": 5,
        },
        required_action="Configure dynamic +/-10% band with +5% flexing (cooling-off trigger 9.90%), capped at 2 flexes per direction.",
        deadline="2026-09-01",
        effective_from="2026-09-01",
        source_text_span=(
            "For Equity ETFs and Debt ETFs (other than Overnight ETFs and Liquid ETFs), "
            "there shall be dynamic price bands, with an initial price band of +10%, which "
            "can be flexed upto +20% after a cooling off period."
        ),
        confidence=0.90,
    ),
    RuleObject(
        rule_id="MRD-POD3-2026__overnight_liquid_band",
        clause_id="5.2.1",
        source_circular_id=CIRCULAR_ID,
        plain_description="Overnight and Liquid ETFs: fixed price band of +/-5%.",
        applicable_entity_type=["overnight_etf", "liquid_etf"],
        condition={"field": "band_config.overnight_liquid_etf", "operator": "equals", "value": "fixed_5"},
        threshold={"static_band_pct": 5, "uncapped": False},
        required_action="Maintain a fixed +/-5% price band for Overnight and Liquid ETFs.",
        deadline="2026-09-01",
        effective_from="2026-09-01",
        source_text_span="Overnight ETFs and Liquid ETFs shall have a fixed price band of +5%.",
        confidence=0.93,
    ),
    RuleObject(
        rule_id="MRD-POD3-2026__commodity_band",
        clause_id="5.3.1",
        source_circular_id=CIRCULAR_ID,
        plain_description="Commodity (Gold/Silver) ETFs: dynamic band +/-6%, flexed by +3% after cooling-off; DPL +/-9% relaxation in 3% steps; cooling-off trigger 5.90%; no cap on number of flexes.",
        applicable_entity_type="gold_silver_etf",
        condition={"field": "band_config.gold_silver_etf", "operator": "equals", "value": "dynamic_6_flex3_trig5.90_uncapped"},
        threshold={
            "dynamic_band_pct": 6,
            "flex_pct": 3,
            "uncapped": True,
            "cooling_off_trigger_pct": 5.90,
            "cooling_off_minutes": 15,
            "cooling_off_minutes_last_30": 5,
            "dpl_pct": 9,
            "dpl_relaxation_step_pct": 3,
        },
        required_action="Configure dynamic +/-6% band with +3% uncapped flexing (cooling-off 5.90%); apply DPL +/-9% relaxation in 3% steps.",
        deadline="2026-09-01",
        effective_from="2026-09-01",
        source_text_span=(
            "For Commodity ETFs, there shall be dynamic price bands, with an initial price "
            "band of +6%. The price band would be flexed by 3% of the base price, after a "
            "cooling off period."
        ),
        confidence=0.88,
    ),
    # --- Flagged for human review (no deterministic condition) --------------
    RuleObject(
        rule_id="MRD-POD3-2026__closeout",
        clause_id="6.1",
        source_circular_id=CIRCULAR_ID,
        plain_description="Close-out for Overnight/Liquid ETFs: higher of (a) highest price recorded in the settlement, or (b) 5% above latest available closing price. Other ETFs follow existing Master Circular provisions.",
        applicable_entity_type=["overnight_etf", "liquid_etf"],
        condition=None,
        threshold={"static_band_pct": 5},
        required_action="Compliance officer to confirm close-out mark-up handling against Master Circular Chapter 3.",
        deadline="2026-09-01",
        effective_from="2026-09-01",
        source_text_span=(
            "The close-out price will be the highest price recorded in that ETF on the "
            "exchange in the settlement in which the concerned contract was entered into "
            "and up to the date of auction or close out\" OR \"5% above the latest available "
            "closing price at the exchange on the day on which auction offers are called "
            "for\" whichever is higher."
        ),
        confidence=0.55,
        needs_human_review=True,
        review_reason="Close-out mark-up is a conditional 'whichever is higher' rule requiring settlement-level data; not reducible to a single firm-config check.",
    ),
    RuleObject(
        rule_id="MRD-POD3-2026__call_auction",
        clause_id="7.1",
        source_circular_id=CIRCULAR_ID,
        plain_description="A call auction in the pre-open session shall be conducted for Commodity (Gold/Silver) ETFs to aid equilibrium price discovery.",
        applicable_entity_type="gold_silver_etf",
        condition=None,
        threshold=None,
        required_action="Compliance officer to confirm pre-open call-auction participation for Gold/Silver ETFs.",
        deadline="2026-09-01",
        effective_from="2026-09-01",
        source_text_span=(
            "To enable efficient price discovery, similar to scrips, it has been decided "
            "that a call auction in the pre-open session shall be conducted for Commodity "
            "ETFs to facilitate discovery of the equilibrium price for trading in units of "
            "such ETFs."
        ),
        confidence=0.60,
        needs_human_review=True,
        review_reason="New pre-open call-auction mechanism references Master Circular para 17.1; operational readiness is a process check, not a firm-config comparison.",
    ),
]
