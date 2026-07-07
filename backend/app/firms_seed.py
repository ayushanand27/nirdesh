"""Three fictional AMCs. Profiles are the ONLY firm data the engine reads.

Demo narrative:
  * Bharat Growth AMC   -> still on T-2 NAV + stale liquid-ETF band => BREACH
                           after Sept 1, 2026.
  * Meridian Asset Mgmt -> compliant under the Sept-2026 rules, BUT on T-1 VWAP,
                           so it FLIPS to breach when the Apr-2027 phase-2 rule
                           (T-1 closing NAV) activates. This drives the delta demo.
  * Sentinel Debt Fund  -> offers no ETFs at all => every ETF rule is
                           NOT APPLICABLE (clean grey row).
"""

FIRMS = [
    {
        "name": "Bharat Growth AMC",
        "legal_type": "AMC",
        "profile": {
            "base_price_method": "T-2_NAV",  # non-compliant from Sept 1, 2026
            "offers_etf_types": ["equity_debt_etf", "liquid_etf"],
            "band_config": {
                "equity_debt_etf": "dynamic_10_flex5_max2",  # compliant
                "overnight_liquid_etf": "flat_20",  # stale -> breach (should be fixed_5)
            },
        },
    },
    {
        "name": "Meridian Asset Management",
        "legal_type": "AMC",
        "profile": {
            "base_price_method": "T-1_closing_vwap",  # compliant now, breaches phase-2
            "offers_etf_types": ["equity_debt_etf", "overnight_etf", "gold_silver_etf"],
            "band_config": {
                "equity_debt_etf": "dynamic_10_flex5_max2",
                "overnight_liquid_etf": "fixed_5",
                "gold_silver_etf": "dynamic_6_flex3_trig5.90_uncapped",
            },
        },
    },
    {
        "name": "Sentinel Debt Fund",
        "legal_type": "AMC",
        "profile": {
            "base_price_method": "not_applicable",
            "offers_etf_types": [],  # no ETFs => all ETF rules N/A
            "band_config": {},
        },
    },
]
