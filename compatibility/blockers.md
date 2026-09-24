# Active blockers (completion-plan mode)

Authoritative task/gate status: `compatibility/completion-status.json`.
Bootstrap: `compatibility/support-line-bootstrap.json`.

## B-F00 — Baseline established (not a release claim)

F00 passed as **bootstrap**: both `main` and `21.x` worktrees, peer floors, command
profiles, and immutable failure receipts exist. This does **not** close G01–G13.

## B-CI-F01 — Fresh-artifact CI required (open)

Packed-consumer smoke no longer defaults to a committed `.tgz` (moved to
`compatibility/pack-proof/historical-unbound/`). CI job `packed-consumer-aot` still
invokes `node scripts/packed-consumer-aot-smoke.mjs` without `--tarball` and will
fail-closed until F01 wires build→pack→digest→smoke. Prior smoke receipts are
`unbound-stale` (consumer digest `257e7f36…` ≠ aot/committed `308dbd4b…`).

## B-SCAN-01 — Packed inspector failures (open; F03/F04)

`python3 scripts/inspect-packed-package.py` exit **1**, **21** findings on both lines
(engine/recipe/testing references including comment-only and real imports). Receipts:
`compatibility/completion-baseline/f00-main-2026-09-23/inspect-packed-package.json`,
`…/f00-l21-2026-09-23/inspect-packed-package.json`.

## B-SCAN-02 — Upstream API policy failures (open; F03)

`python3 scripts/check-upstream-api-policy.py` exit **1**, **17** violations (private
symbol prefixes, `@angular/animations` recipe modules, etc.). Receipts under
`compatibility/completion-baseline/`.

## B-API-01 — Missing legacy-core historical aliases (open; F02)

Plan baseline: packed/core declarations omit historical aliases such as
`MatLegacyNativeDateModule`, `LegacyDateAdapter`, `MAT_LEGACY_DATE_FORMATS`,
`LegacyThemePalette`, `LEGACY_VERSION`, `MatLegacyRippleModule`.

## B-THEME-01 — Current-component theme bridges (open; F06)

No proof of current Material `*-overrides` bridges + owned-only aggregate for M3
coexistence. Historical Sass seals must not be overwritten.

## B-MDC-01 — External archived `@material/*` dependencies (open; F07)

Published metadata still lists many `@material/*` dependencies; eliminate via
remove → local replace → vendor-only-if-required.

## B-TEST-01 — Historical behavior suite not executed (open; F08)

Runner proven (`test:legacy`) with button/harness (35 executed, 6 button failures). Full 57-spec port + reconciliation still open — see `compatibility/f08/blockers.md`.

## B-F10-01 — Upstream/security audit incomplete (open; F10)

1697-SHA inventory and heuristic risk buckets exist under `compatibility/f10/`. Dispositions,
symbol completeness, advisory refresh, and peer-inherited fix proofs remain open. **G11 not passed.**

## B-PUB-01 — npm publish (owner-only)

Out of scope for agents. No credential.

## B-21-LOCK — Do not merge 21 lockfile into main

`21.x` lockfile (`d847f46e…`) and Angular 21 peers stay on the maintenance branch /
`/workspace/ngx-compat/material-21` worktree only.

## Mitigated / historical (pre-completion-plan)

Push-triggered CI runs, CLI hash drift rebuilds, aged peer floor `^22.1.7`, narrow
`src/` retires, escape-edge 0, primary FESM motion clears — treat as prior work to
re-verify under F01–F04, not as gate passes.

## Constraints

- Cyph tree at `/workspace/ngx-compat/reference/cyph-dev-prod` is oracle-only; never commit it.
- Isolated Material-16 env is local-only; never commit `node_modules`.
- No npm publish from agent workstreams.
