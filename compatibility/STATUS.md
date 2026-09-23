# Compatibility delivery status (RC without publish)

Package `@ngx-compat/material-legacy@22.0.0-rc.0` on `main`
(repo `buu700/ngx-compat-material-legacy`). **No npm publish.**

## RC checklist (`main` / 22.x)

| Gate | Status | Evidence |
| --- | --- | --- |
| 22 legacy + 22 testing entries | **Done** | Pack + ESM |
| Sass facade + theme | **Done** | `#4527a0` |
| migrate-legacy + CLI | **Done** | 25/25; `--verify` |
| Escape-edge relative unresolved | **Done (0)** | |
| Peer floor `^22.1.7` | **Done** | |
| Pack via `scripts/pack-library.mjs` (`-c` tsconfig) | **Done** | Fixes bare ng-packagr TS2564 |
| Packed-consumer AOT + overlay harness | **Done** | `aot-harness-smoke.json` (dialog/menu/snack/tooltip + button/select) |
| Motion CSS wave (dialog/snack/tooltip) | **Done** | Primary FESM free of `@angular/animations` imports |
| Motion menu/select/form-field/tabs | **Partial** | Disable path wired; engine recipes still on primary |
| W10 21.x line | **Done (branch)** | Node 20.19.6 smoke on `21.x` |
| `src/` mass-delete | **Blocked** | Shared-core (~578) + companions; unresolved relative already 0 |
| Full animation peer removal (all entries) | **Blocked** | menu/select/form-field/tabs (+ opt-in `/animations`) |
| CI green | **Done** | https://github.com/buu700/ngx-compat-material-legacy/actions/runs/35935179066 on `69173edcd` |

## Left for (honest)

| Item | Note |
| --- | --- |
| npm publish | **Owner only** |
| CSS/WAAPI migrate menu, select, form-field, tabs | Remaining primary engine imports |
| `src/` mass-delete | **Blocked** until shared-core escape inventory supports narrow deletes with evidence |
| Broader 21.x Node 22.12 edge | Optional |

## Motion summary

- **Removed from primary runtime FESM:** dialog, snack-bar, tooltip
- **Still required on primary FESM:** menu, select, form-field, tabs
- **Opt-in recipes:** `legacy-*/animations` secondary entries
- Peer already `optional: true`; now truly optional for dialog/snack/tooltip-only consumers
- See `motion-animations-import-graph.md`, `motion-overlay-trio.md`

## Escape / `src/`

Unresolved relative edges: **0**. **No** `src/` mass-delete this wave (shared-core still blocked).

## Constraints

- Author/committer: Ryan Lester <hacker@linux.com> only (no Co-authored-by)
- Push via `/home/box/.local/bin/ngx-git-push`
- No npm publish from this workstream
- Cyph oracle-only; never commit
