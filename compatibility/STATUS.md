# Compatibility delivery status (RC without publish)

Snapshot for handoff gates. Package `@ngx-compat/material-legacy@22.0.0-rc.0`
(repo `buu700/ngx-compat-material-legacy`). **No npm publish.**

## RC candidate (unpublished) checklist

| Gate | Status | Evidence |
| --- | --- | --- |
| Scoped legacy component secondary entries | **Done** | All 22 `research/scope.json` preserved entries pack |
| Historical `*/testing` secondary entries | **Done** | **22/22** pack; ESM smoke 44 imports OK |
| Sass root facade + theme smoke | **Done** | `#4527a0` deep-purple 800; component class markers present |
| `migrate-legacy` schematic (real rewrites) | **Done** | Fixtures **25/25**; Sass `@use` + safe TS `legacy-*` + acknowledgement paths |
| Peer-light pre-upgrade CLI (bundled artifact) | **Done** | `migration/dist/*.tgz`; sha256 in `compatibility/migrate-legacy-cli-artifact.json`; Node `>=18`; no Angular peers |
| Companion/aggregate/current acknowledgement flows | **Done** | Shared engine flags; CLI + schematic; fixtures cover acked + unacked paths |
| Escape-edge classification (no mass-delete) | **Done (docs)** | `compatibility/inventories/escape-edge-classification.json` + `src-cleanup-plan.md` |
| Pack + inspect | **Done (expected flags)** | `compatibility/pack-proof/`; inspector still flags animation peer/refs |
| License / provenance | **Done** | Google MIT notice + Copyright (c) 2026 Ryan Lester |
| CI green on push | **Watch** | Fixtures + CLI `--verify` in workflow; keep watching Actions |

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

## CLI / schematic status

- **Schematic:** `ng generate @ngx-compat/material-legacy:migrate-legacy`
  - Options: `acknowledgeCompanionBridges`, `acknowledgeAggregates`,
    `acknowledgeCurrentComponents`
- **Repo CLI stub:** `node scripts/migrate-legacy-cli.mjs <path> [--apply] [--json] [--acknowledge-*]`
- **Bundled artifact:** `migration/dist/ngx-compat-material-legacy-migrate-cli-22.0.0-rc.0.tgz`
  - Hash: see `compatibility/migrate-legacy-cli-artifact.json`
  - Engines: Node `>=18.0.0`; Angular peers: none
  - Rebuild/verify: `node scripts/build-migrate-legacy-cli.mjs[--verify]`

## Motion

- Overlay trio keeps owned `@angular/animations` trigger metadata
  (`compatibility/motion-overlay-trio.md`)
- Documented consumer path: public `MATERIAL_ANIMATIONS` / `animationsDisabled`
  (`migration/README.md`) — **no** breaking recipe removals this wave

## Left for maintainer publish (out of this RC-without-publish stream)

1. Maintainer-authorized **npm publish** of `@ngx-compat/material-legacy@22.0.0-rc.0`
   (and optionally the separate migrate-cli package) after packed-artifact and
   metadata checks / org access.
2. Motion follow-up: tested migrations off deprecated animation engine **without**
   breaking dialog/menu/select contracts.
3. Advisory / security triage for aged peer set.
4. Optional: expand consumer AOT/harness runtime tests beyond ESM import smoke.
5. `src/` cleanup only after unresolved escape edges are closed (prefer docs over delete).

## Constraints (unchanged)

- No Cyph in repo; Cyph-safe CSS/SCSS only.
- Author/committer: Ryan Lester \<hacker@linux.com\>.
- Auth for push: `GH_TOKEN` file + `ngx-git-push`.
- No npm publish from this workstream.
