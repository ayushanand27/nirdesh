"""Rule extraction: raw circular text -> validated RuleObject list.

Pipeline:
  1. Prompt Groq in JSON mode with a strict schema + "no guessing" instruction.
  2. Validate every object against the Pydantic schema.
  3. Apply deterministic guardrails that FORCE needs_human_review when the LLM
     output is not objectively checkable (missing condition, low confidence).
  4. Cache the validated result so the live demo never hard-depends on network.

The LLM proposes structure; it never gets the final word on whether something
is checkable. That decision is code.
"""

from __future__ import annotations

import json
from pathlib import Path

from pydantic import ValidationError

from .config import CACHE_DIR, settings
from .llm_client import LLMUnavailable, complete_json, is_configured
from .schemas import ExtractionResponse, RuleObject

SYSTEM_PROMPT = """You are a SEBI regulatory-compliance extraction engine for a decision-support tool.
You convert the text of an Indian securities-market circular into structured, machine-checkable rule objects.

HARD RULES:
- You do NOT decide whether any firm is compliant. You only extract rules.
- Emit ONLY objectively checkable conditions. A condition must reduce to a single
  comparison: firm_data[field] <operator> value.
- If a clause is ambiguous, subjective, or cannot be reduced to a checkable
  condition, DO NOT invent one. Instead set "condition" to null, set
  "needs_human_review" to true, and explain why in "review_reason".
- Never fabricate numeric thresholds. If a number is not stated in the text, leave it null.
- confidence is your honest 0.0-1.0 self-assessment that the extraction faithfully
  reflects the source clause.

OUTPUT: a JSON object with a single key "rules" whose value is an array of rule objects.
Each rule object has EXACTLY these keys:
{
  "rule_id": string (stable slug: "<CIRCULAR_SLUG>__<short_topic>"),
  "clause_id": string (verbatim clause reference from the text, e.g. "3.2"),
  "source_circular_id": string (echo the circular id provided),
  "plain_description": string (one plain-English line),
  "applicable_entity_type": one of ["equity_debt_etf","overnight_etf","liquid_etf","gold_silver_etf","all_etf"],
  "condition": null OR {
      "field": string,
      "operator": one of ["equals","not_equals","lt","lte","gt","gte","in"],
      "value": any
  },
  "threshold": null OR {
      "static_band_pct": number|null,
      "dynamic_band_pct": number|null,
      "flex_pct": number|null,
      "max_flexes": integer|null,
      "trigger_pct": number|null,
      "uncapped": boolean
  },
  "required_action": string,
  "deadline": "YYYY-MM-DD" or null,
  "effective_from": "YYYY-MM-DD" or null,
  "confidence": number 0.0-1.0,
  "needs_human_review": boolean,
  "review_reason": string or null
}

Recommended firm-data field names to use in conditions (use these when applicable):
- "base_price_method"  (values like "T-2_NAV", "T-1_closing_vwap", "T-1_closing_nav")
- "price_band_pct"     (numeric current band)
- "offers_etf_types"   (list, use with "in")
Return ONLY the JSON object, nothing else."""


def _cache_path(source_circular_id: str) -> Path:
    safe = "".join(c if c.isalnum() else "_" for c in source_circular_id)
    return CACHE_DIR / f"{safe}.json"


def _apply_guardrails(rules: list[RuleObject]) -> list[RuleObject]:
    """Deterministically force human review where extraction isn't trustworthy."""
    threshold = settings.confidence_review_threshold
    for rule in rules:
        reasons: list[str] = []
        if rule.condition is None:
            reasons.append("no objectively checkable condition could be extracted")
        if rule.confidence < threshold:
            reasons.append(
                f"confidence {rule.confidence:.2f} below review threshold {threshold:.2f}"
            )
        if reasons:
            rule.needs_human_review = True
            existing = f"{rule.review_reason}; " if rule.review_reason else ""
            rule.review_reason = existing + "; ".join(reasons)
    return rules


def _validate(raw: dict, source_circular_id: str) -> list[RuleObject]:
    items = raw.get("rules", [])
    if not isinstance(items, list):
        raise ValueError("LLM output missing 'rules' array")
    rules: list[RuleObject] = []
    for item in items:
        item.setdefault("source_circular_id", source_circular_id)
        try:
            rules.append(RuleObject.model_validate(item))
        except ValidationError:
            # A malformed object is itself a review signal, not a hard failure.
            rules.append(
                RuleObject(
                    rule_id=item.get("rule_id", "unparsed_rule"),
                    clause_id=item.get("clause_id", "?"),
                    source_circular_id=source_circular_id,
                    plain_description=item.get("plain_description", "Unparseable rule object"),
                    applicable_entity_type="all_etf",
                    condition=None,
                    threshold=None,
                    required_action=item.get("required_action", "Manual review required"),
                    confidence=0.0,
                    needs_human_review=True,
                    review_reason="LLM emitted a rule object that failed schema validation",
                )
            )
    return rules


def extract_rules(
    circular_text: str, source_circular_id: str, use_cache: bool = True
) -> ExtractionResponse:
    cache_file = _cache_path(source_circular_id)

    # Live path: call Groq when a key is present and cache isn't forced.
    used_cache = False
    if is_configured() and not (use_cache and cache_file.exists()):
        try:
            raw = complete_json(
                SYSTEM_PROMPT,
                f"CIRCULAR ID: {source_circular_id}\n\nCIRCULAR TEXT:\n{circular_text}",
            )
            rules = _apply_guardrails(_validate(raw, source_circular_id))
            cache_file.write_text(
                json.dumps({"rules": [r.model_dump() for r in rules]}, indent=2),
                encoding="utf-8",
            )
        except LLMUnavailable:
            rules, used_cache = _load_cache(cache_file, source_circular_id)
    else:
        rules, used_cache = _load_cache(cache_file, source_circular_id)

    return ExtractionResponse(
        source_circular_id=source_circular_id,
        rules=rules,
        used_cache=used_cache,
        model=settings.groq_model,
        flagged_for_review=sum(1 for r in rules if r.needs_human_review),
    )


def _load_cache(cache_file: Path, source_circular_id: str) -> tuple[list[RuleObject], bool]:
    if not cache_file.exists():
        raise LLMUnavailable(
            "No GROQ_API_KEY and no cached extraction available for "
            f"'{source_circular_id}'. Run once with a key, or seed the cache."
        )
    raw = json.loads(cache_file.read_text(encoding="utf-8"))
    rules = _apply_guardrails(_validate(raw, source_circular_id))
    return rules, True
