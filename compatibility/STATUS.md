# Compatibility delivery status (RC without publish)

Package `@ngx-compat/material-legacy@22.0.0-rc.0` on `main`
(repo `buu700/ngx-compat-material-legacy`). **No npm publish.**

## RC checklist (`main` / 22.x)

| Gate | Status | Evidence |
| --- | --- | --- |
| 22 legacy + 22 testing entries | **Done** | Pack + ESM |
| Sass facade + theme | **Done** | |
| migrate-legacy + CLI | **Done** | |
| Escape-edge relative unresolved | **Done (0)** | |
| Shared-core legacy→core escape edges | **Done (0)** | was 353 HEAD-before; 22 mirrors deleted |
| Peer floor `^22.1.7` | **Done** | |
| Pack via `scripts/pack-library.mjs` | **Done** | |
| Packed-consumer AOT + overlay harness | **Done** | select open/close + dialog/menu/snack/tooltip/tabs |
| Motion CSS — dialog/snack/tooltip | **Done** | |
| Motion CSS — menu/select/form-field/tabs | **Done** | Primary FESMs cleared |
| `@angular/animations` truly optional (no primary FESM import) | **Done** | Opt-in `/animations` only |
| W10 21.x line | **Done (branch)** | |
| `src/` mass-delete | **Done (narrow)** | residual non-Material packages + hollow facade deleted; `src/README.md` only |
| CI green | **Pending tip** | prior: https://github.com/buu700/ngx-compat-material-legacy/actions/runs/35939891799 on `512569f0d` |

## Left for (honest)

| Item | Note |
| --- | --- |
| npm publish | **Owner only** |
| `src/` mass-delete | **Done (narrow)** — residual cdk*/maps/youtube/adapters/experimental + hollow material retired (`src-residual-packages-retire-2026-09-23.json`). `src/` = README only. |
| Consumers of primary-path `matLegacy*Animations` | Migrate imports to `…/animations` |
| Library-surface `src/` escape/closure | **Closed** — projects closure visits **0** under `src/`; pack tarball **0** `src/material` members |

## Residual non-Material src retire (2026-09-23)

Deleted `src/cdk`, `src/cdk-experimental`, `src/google-maps`, `src/youtube-player`,
date adapters, `src/material-experimental`, hollow `src/material`, plus solely-
supporting integration Bazel leftovers (linker, ts-compat, size-test/cdk, ng-add*,
harness-e2e-cli, yarn-pnp-compat, mdc-migration). Scrubbed root Bazel /
CODEOWNERS / tsconfig / ng-dev / tslint / prettier / tsec refs. Provenance:
`compatibility/inventories/src-residual-packages-retire-2026-09-23.json`.
Projects-rooted closure still **0** visits under `src/`.

## E2E/universal + owned-overlap retire (2026-09-23)

Deleted `src/e2e-app`, `src/universal-app`, `integration/size-test/material`, then all
owned-overlap ordinary dirs under `src/material` plus hollow `schematics` / `testing` /
`prebuilt-themes`. Provenance: `compatibility/inventories/src-e2e-universal-ordinary-retire-2026-09-23.json`.

## Scaffolding retire (2026-09-23)

Deleted historical `src/dev-app` + `src/components-examples`, then `src/material/core`
and ordinary companions (datepicker, button-toggle, expansion, stepper, toolbar, tree,
badge, bottom-sheet, divider, grid-list, icon, sidenav, sort, table). Provenance:
`compatibility/inventories/src-scaffolding-retire-2026-09-23.json`.

## Motion summary

All targeted overlay primary FESMs cleared of `@angular/animations`.
Autocomplete uses owned `LegacyAutocompleteAnimationEvent` (no peer type import).
`blockers.md` refreshed to match (escape 0; motion primary cleared; scaffolding + e2e/universal + ordinary overlap + residual packages retired).
Recipes available under `legacy-*/animations` secondary entries.
See `motion-animations-import-graph.md`, `motion-overlay-trio.md`.

## Constraints

- Author/committer: Ryan Lester <hacker@linux.com> only (no Co-authored-by)
- Push via `/home/box/.local/bin/ngx-git-push`
- No npm publish; Cyph oracle-only
