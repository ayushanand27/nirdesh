# Documentation

| Document | Description |
|---|---|
| [ARCHITECTURE.md](./ARCHITECTURE.md) | System diagrams (Mermaid), component map, idempotency, deployment |
| [DEMO_CORPUS.md](./DEMO_CORPUS.md) | Why this circular, 2026 vs 2027 phases, firms, rules, source PDF |
| [assets/screenshots/](./assets/screenshots/) | UI screenshots for README (12 workflow captures) |

## Screenshots

| File | View |
|---|---|
| `01-matrix-simple-phase1.png` | Compliance matrix — Phase 1 |
| `06-ingest-extracted.png` | Circular ingest |
| `07-delta-before-apply.png` / `08-delta-after-apply.png` | Regulatory delta |
| `09-officer-signoff-pending.png` / `10-officer-signoff-reviewed.png` | Officer sign-off |
| `11-evidence-pack.png` | Evidence pack |

Full set: [`assets/screenshots/`](./assets/screenshots/)

## Primary source files

- **Official circular PDF:** [backend/data/circular_MRD-POD3-2026_ORIGINAL.pdf](../backend/data/circular_MRD-POD3-2026_ORIGINAL.pdf)
- **Verified text extract:** [backend/data/circular_MRD-POD3-2026_VERIFIED.txt](../backend/data/circular_MRD-POD3-2026_VERIFIED.txt)
