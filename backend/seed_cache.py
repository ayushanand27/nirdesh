"""Write the offline extraction-cache fallback for the /extract endpoint.

Run: `python seed_cache.py`. When no GROQ_API_KEY is set, /extract serves this
cached extraction so the endpoint still works offline. When a key IS set,
/extract calls Groq live and overwrites this file with genuine model output.

Note: the DEMO dashboard does not depend on this file — `seed_db.py` seeds the
database from the canonical, human-reviewed rule set directly (see
app/canonical_rules.py), so the matrix/delta are deterministic no matter what a
live model returns.
"""

from __future__ import annotations

import json

from app.canonical_rules import CANONICAL_RULES, CIRCULAR_ID
from app.extraction import _cache_path


def main() -> None:
    path = _cache_path(CIRCULAR_ID)
    path.write_text(
        json.dumps({"rules": [r.model_dump() for r in CANONICAL_RULES]}, indent=2),
        encoding="utf-8",
    )
    print(f"Wrote offline extraction cache: {len(CANONICAL_RULES)} rules -> {path}")


if __name__ == "__main__":
    main()
