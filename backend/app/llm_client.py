"""Thin Groq wrapper with strict JSON-mode output.

Isolated here so the extraction logic (prompting, guardrails) stays testable and
the provider can be swapped without touching business rules.
"""

from __future__ import annotations

import json

from groq import Groq

from .config import settings


class LLMUnavailable(RuntimeError):
    """Raised when no API key is configured or the provider call fails."""


def is_configured() -> bool:
    return bool(settings.groq_api_key)


def complete_json(system_prompt: str, user_prompt: str) -> dict:
    """Call Groq in JSON mode and return the parsed object.

    Uses temperature 0 for determinism: the same circular text should extract
    the same rules run-to-run, which matters for an auditable pipeline.
    """
    if not is_configured():
        raise LLMUnavailable("GROQ_API_KEY is not set")

    client = Groq(api_key=settings.groq_api_key)
    try:
        resp = client.chat.completions.create(
            model=settings.groq_model,
            temperature=0,
            response_format={"type": "json_object"},
            messages=[
                {"role": "system", "content": system_prompt},
                {"role": "user", "content": user_prompt},
            ],
        )
    except Exception as exc:  # noqa: BLE001 - surface any provider failure uniformly
        raise LLMUnavailable(str(exc)) from exc

    content = resp.choices[0].message.content or "{}"
    return json.loads(content)
