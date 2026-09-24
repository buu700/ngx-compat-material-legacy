# F10 — Upstream / security audit (in progress)

**G11 is not passed.** This directory holds bootstrap evidence only.

## Inventories started

| Artifact | Role |
| --- | --- |
| `../inventories/upstream-delta-inventory-16.2.14-to-v22.2.0.json` | Raw SHA list (1697 commits) `16.2.14` → `v22.2.0` research head |
| `upstream-sha-risk-bootstrap.json` | Heuristic risk buckets (not dispositions): {"behavior-semantic": 1040, "needs-triage": 407, "security-deep": 6, "docs-build-batch-candidate": 62, "test-only-batch-candidate": 182} |
| `authored-dependency-inventory-seed.json` | Static import/symbol seed |
| `retained-material-deps-inventory.json` | Retained `@material/*` + vendored path scan |
| `../advisory-triage.md` | Existing advisory seed (peers 22.1.7) — refresh still open |

## Research clone

`/workspace/ngx-compat/reference/angular-components` (local only; not committed).
Baseline `16.2.14` = `df60e733c60e572ba538f6ad0ceff3e63e527b53`.
Research head `v22.2.0` = `68d65c247310ba2617dae290baaff2b83669d68e`.
Installed peer baseline remains aged Angular/Material `22.1.7` (see `compatibility/peers-22.proposed.json`).

## Required next steps (blocking G11)

1. Individual deep review for every `security-deep` SHA; prove inherited fixes exist in **installed** peer versions.
2. Individual semantic review for `behavior-semantic` SHAs affecting owned/delegated surfaces.
3. Expand authored symbol inventory beyond regex (re-exports, `import type`, comment-embedded names).
4. Complete advisory/OSV refresh with query timestamps for exact transitive closure including retained `@material/*`.
5. Harden workflow (dependency-review, CodeQL) — F01 coordination; no secrets on fork PRs.
6. Do not mark `future-breakages` Animations as designed-out until F04 proves it.

## Non-claims

- Six-row `delegated-upstream-apis.json` is a seed, not coverage.
- `security-review` pending ≠ pass.
- Research head ≠ release baseline.
- Automatic risk buckets are **not** dispositions.
