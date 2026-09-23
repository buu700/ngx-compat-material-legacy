# Compatibility delivery status (RC without publish)

Snapshot for handoff gates. Package `@ngx-compat/material-legacy@22.0.0-rc.0`
(repo `buu700/ngx-compat-material-legacy`). **No npm publish.**

## Done this line

| Gate | Status | Evidence |
| --- | --- | --- |
| Scoped legacy component secondary entries | Done | All `research/scope.json` preserved entries pack |
| Historical `*/testing` secondary entries | Done | **22/22** pack; ESM smoke 44 imports OK |
| Sass root facade + theme smoke | Done | `#4527a0` deep-purple 800; component class markers present |
| `migrate-legacy` schematic (real rewrites) | Done | Fixtures 22/22; Sass `@use` + safe TS `legacy-*` |
| Peer-light pre-upgrade CLI stub (W08) | Done (stub) | `scripts/migrate-legacy-cli.mjs` shares schematic engine; `migration/README.md` |
| Pack + inspect | Done (expected flags) | `compatibility/pack-proof/`; inspector still flags animation peer/refs |
| License / provenance | Done | Google MIT notice + Copyright (c) 2026 Ryan Lester |
| CI green on push | Mitigated | Keep watching Actions; `workflow_dispatch` backup |

## Testing matrix (`*/testing`)

| Entry | Packs | Notes |
| --- | --- | --- |
| `legacy-button/testing` | yes | Owned variant filters |
| `legacy-core/testing` | yes | option / optgroup |
| `legacy-form-field/testing` | yes | Owned base |
| `legacy-input/testing` | yes | |
| `legacy-select/testing` | yes | Owned base; uses core/testing |
| `legacy-checkbox/testing` | yes | Owned base |
| `legacy-menu/testing` | yes | Owned base |
| `legacy-dialog/testing` | yes | Harness + opener |
| `legacy-radio/testing` | yes | Owned radio group/button bases |
| `legacy-slide-toggle/testing` | yes | Owned base |
| `legacy-card/testing` | yes | Self-contained |
| `legacy-chips/testing` | yes | Self-contained |
| `legacy-list/testing` | yes | Local list bases; divider from Material |
| `legacy-slider/testing` | yes | Self-contained |
| `legacy-progress-bar/testing` | yes | Filters from Material |
| `legacy-progress-spinner/testing` | yes | |
| `legacy-snack-bar/testing` | yes | Owned base |
| `legacy-table/testing` | yes | Owned table base; cell/row bases from Material 22 |
| `legacy-tabs/testing` | yes | Self-contained |
| `legacy-tooltip/testing` | yes | Owned base |
| `legacy-autocomplete/testing` | yes | Owned base; uses core/testing |
| `legacy-paginator/testing` | yes | Owned base; uses select/testing |

Skipped: none — every historical inventory testing entry exists and packs.

## CLI status

- **Schematic:** `ng generate @ngx-compat/material-legacy:migrate-legacy`
- **Peer-light CLI stub:** `node scripts/migrate-legacy-cli.mjs <path> [--apply] [--json]`
  - No Angular runtime peers required to run the CLI process
  - Shares `sass-rewrite.js` / `ts-rewrite.js` with the schematic
  - Default dry-run; blocking diagnostics → exit 1
- **Still for RC packaging:** separately downloadable **bundled** CLI artifact
  (parser included, published hash + Node engine) — not required for stub handoff

## Motion

- Overlay trio keeps owned `@angular/animations` trigger metadata
  (`compatibility/motion-overlay-trio.md`)
- Documented consumer path: public `MATERIAL_ANIMATIONS` / `animationsDisabled`
  (`migration/README.md`) — **no** breaking recipe removals this wave

## Left for RC (without publish)

1. Broader migrate-legacy acknowledgement flows (companion/aggregate bridges).
2. Bundled peer-light CLI release artifact (hash + engines) when packaging RC.
3. Motion follow-up: tested migrations off deprecated animation engine **without**
   breaking dialog/menu/select contracts.
4. Escape-edge classification before any `src/` cleanup (do **not** mass-delete).
5. Advisory / security triage for aged peer set; maintainer-authorized publish
   after packed-artifact and metadata checks.
6. Optional: expand consumer AOT/harness runtime tests beyond ESM import smoke.

## Constraints (unchanged)

- No Cyph in repo; Cyph-safe CSS/SCSS only.
- Author/committer: Ryan Lester \<hacker@linux.com\>.
- Auth for push: `GH_TOKEN` file + `ngx-git-push`.
- No npm publish from this workstream.
