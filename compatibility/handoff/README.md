# Vendored implementation handoff

This directory holds the planning/entry documents from the ngx-material-legacy
handoff package. Executable contract data used by helper tests and scripts lives
at the repository root for stable relative paths:

| Path | Contents |
| --- | --- |
| `docs/` | Numbered contract documents (01–11) |
| `research/` | Scope, Sass symbols, upstream ledgers, CI/support policy |
| `fixtures/` | Historical Sass and migration fixtures |
| `work-items/` | Shared contracts and per-entry-point worksheets |
| `reference/` | Instructions for sealing Material-16.2.14 reference evidence |
| `templates/` | Scaffolding copies of LICENSE/README/toolchain pins |
| `scripts/` | Helper tools (see `scripts/HANDOFF-SCRIPTS.md`) |
| `tests/` | Unit tests of helpers (not the Angular library) |

Do not depend on `/workspace/ngx-plan` at runtime. Cyph trees are never vendored here.
