# Compatibility delivery status (completion-plan mode)

Package `@ngx-compat/material-legacy` on repo `buu700/ngx-compat-material-legacy`.
**No npm publish.** Agent prepares non-publication gates only.

This file tracks **completion-plan** progress (F00–F12 / G01–G13). Prior “Done”
checklist rows below are **historical claims under investigation**, not release
acceptance. Authoritative task/gate state: `compatibility/completion-status.json`.
Bootstrap (both lines): `compatibility/support-line-bootstrap.json`.

## F00 bootstrap (2026-09-23)

| Line | Commit | Worktree | Bootstrap-ready | Release-validated |
| --- | --- | --- | --- | --- |
| `main` / 22.x | `49792a0ca09cd425a26ef9eaeddc115fe3f302a6` | `/workspace/ngx-compat/material` | **yes** | **no** |
| `21.x` | `39194d4f171df0cf69948e4e66cd84cfbb17b1e0` | `/workspace/ngx-compat/material-21` | **yes** | **no** |

Evidence: `compatibility/completion-baseline/f00-main-2026-09-23/`,
`compatibility/completion-baseline/f00-l21-2026-09-23/`.

Known baseline failures (captured, not passed): packed inspector exit 1 (21 findings);
upstream policy exit 1 (17 findings) on both lines. Historical pack-proof `.tgz` moved
to `compatibility/pack-proof/historical-unbound/` and unbound from smoke defaults.

## Completion-plan queue

| Task | Status |
| --- | --- |
| F00 baselines + both-line bootstrap | **passed** (bootstrap only) |
| F01 fresh-artifact CI | not-started |
| F02 public API recovery | **in-progress** (48 aliases restored; full audit open) |
| F03 public upstream boundary | **in-progress** (private deps owned; scanner extended) |
| F04 engine-free motion | **in-progress** (recipes/peer removed; consumer proof open) |
| F05 migration safety | not-started |
| F06 theme bridges/coexistence | not-started |
| F07 archived Sass dependencies | not-started |
| F08 historical behavior tests | **in-progress** (runner proven; ports open) |
| F09 real-browser contracts | not-started |
| F10 security/upstream audit | **in-progress** (inventories; G11 not passed) |
| F11 final support-line validation | not-started |
| F12 readiness/handoff | not-started |

Release gates G01/G05–G11/G13: **not-started**. G02–G04: **in-progress** (F02–F04).
G12: **in-progress** (F00 bootstrap receipts only; F11 final artifacts outstanding).

## Historical RC checklist (pre-completion-plan; not acceptance)

| Gate | Prior claim | Note |
| --- | --- | --- |
| 22 legacy + 22 testing entries | claimed Done | Re-prove under F01/F02 |
| Sass facade + theme | claimed Done | Re-prove under F06/G06/G07 |
| migrate-legacy + CLI | claimed Done | Re-prove under F05/G05 |
| Peer floor `^22.1.7` | claimed Done | Observed; F10/F11 re-check |
| Pack via `scripts/pack-library.mjs` | claimed Done | F01 must fresh-pack in CI |
| Packed-consumer AOT + harness | claimed Done | Receipts unbound-stale |
| Motion / animations optional | claimed Done | Inspector still finds engine refs (F04) |
| W10 21.x line | claimed Done (branch) | F00 worktree established; F11 validates |
| CI green | claimed Done | Pre-F01; defaults no longer use committed `.tgz` |

## Left for (honest)

| Item | Note |
| --- | --- |
| F01–F12 implementation | See completion plan packets |
| npm publish | **Owner only** |
| Angular 21 lockfile | Stays on `21.x` only — never merge onto `main` |

## Constraints

- Author/committer: Ryan Lester <hacker@linux.com> only (no Co-authored-by)
- Push via `/home/box/.local/bin/ngx-git-push`
- No npm publish; Cyph oracle-only

## F08/F10 bootstrap (2026-09-23 evening ET)

- F08: `pnpm run test:legacy` executes button + harness (35 cases). Fail-proof OK. See `compatibility/f08/`.
- F10: 1697-SHA inventory + risk/symbol/material seeds under `compatibility/f10/`. **G11 not passed.**
