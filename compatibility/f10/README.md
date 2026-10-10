# F10 — Upstream / security audit (in progress)

**G11 is not passed.** This directory holds bootstrap evidence only.

## Inventories started

| Artifact | Role |
| --- | --- |
| `../inventories/upstream-delta-inventory-16.2.14-to-v22.2.0.json` | Raw SHA list (1697 commits) `16.2.14` → `v22.2.0` research head |
| `upstream-sha-risk-bootstrap.json` | Heuristic risk buckets (not dispositions): {"behavior-semantic": 1040, "needs-triage": 407, "security-deep": 6, "docs-build-batch-candidate": 62, "test-only-batch-candidate": 182} |
| `authored-dependency-inventory-seed.json` | Static import/symbol seed |
| `authored-dependency-current-dispositions.json` | Separate dispositions for current peer uses absent from the frozen seed; open inventory records are not review evidence |
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
3. Review the current parser-discovered peer routes, including named reexports and type imports. Preserve every frozen use, including removed or historical comment-only mentions, until its own disposition is supported.
4. Complete advisory/OSV refresh with query timestamps for exact transitive closure including retained `@material/*`.
5. Harden workflow (dependency-review, CodeQL) — F01 coordination; no secrets on fork PRs.
6. Do not mark `future-breakages` Animations as designed-out until F04 proves it.

## Current-source authored coverage

`scripts/authored-current-use-inventory.mjs` scans the actual legacy TypeScript source, including production testing harnesses and hidden files. It discovers named, default, namespace and side-effect imports, named/namespace reexports, import types and literal dynamic imports. A computed dynamic import is recorded as unresolved. Historical `.spec.ts` execution has its separate gate. Comment text does not become an executable import route.

The current snapshots on main and 21.x each enumerate 1,938 current peer uses in 526 source files: 196 named imports plus 88 public reexports are outside the frozen import roster. Their 284 dispositions remain open. The 82 frozen uses no longer present as current peer routes remain in the original 1,736-use ledger; this census grants no removal judgment.

The shipped G11 checker independently rediscovers current source and requires an exact branch/source snapshot, complete additional-use membership and source-bound individual review evidence. Both disposition admission and the existing `complete-use-dispositions` acceptance case require that result. A diagnostic can supply `--current-symbols <file>`; it still must match the actual source population. These structural controls do not establish peer API behavior, packed execution or a semantic audit pass.

## Non-claims

- Six-row `delegated-upstream-apis.json` is a seed, not coverage.
- `security-review` pending ≠ pass.
- Research head ≠ release baseline.
- Automatic risk buckets are **not** dispositions.
