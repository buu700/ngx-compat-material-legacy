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
| `src/` mass-delete | **Blocked** (narrow OK) | Legacy→core escape **0**; prebuilt themes mirror deleted; core/companions retained |
| CI green | **Done** | https://github.com/buu700/ngx-compat-material-legacy/actions/runs/35937180527 on `67c3a9a44` |

## Left for (honest)

| Item | Note |
| --- | --- |
| npm publish | **Owner only** |
| `src/` mass-delete | **Blocked** — core/companions retained (projects/pack unused; historical src/ still refs); legacy mirrors + `legacy-prebuilt-themes` deleted |
| Consumers of primary-path `matLegacy*Animations` | Migrate imports to `…/animations` |
| Library-surface `src/` escape/closure | **Closed** — projects/pack unused for core/companions; mass-delete still deferred for historical Bazel/demo graphs |

## Motion summary

All targeted overlay primary FESMs cleared of `@angular/animations`.
Autocomplete uses owned `LegacyAutocompleteAnimationEvent` (no peer type import).
`blockers.md` refreshed to match (escape 0; motion primary cleared; src/ blocked).
Recipes available under `legacy-*/animations` secondary entries.
See `motion-animations-import-graph.md`, `motion-overlay-trio.md`.

## Constraints

- Author/committer: Ryan Lester <hacker@linux.com> only (no Co-authored-by)
- Push via `/home/box/.local/bin/ngx-git-push`
- No npm publish; Cyph oracle-only
