# Active blockers

## B-CI-01 — Push-triggered Actions initially produced zero runs
Mitigated: push-triggered CI is now producing runs (e.g. success on
`5f7740be`). Keep `workflow_dispatch` as a backup.

## B-CI-02 — CLI `--verify` hash drift (mitigated)
Committed CLI tarball bytes drifted from `compatibility/migrate-legacy-cli-artifact.json`
after repository metadata updates inside the packaged files, so CI `--verify` failed.
Mitigated by rebuilding the artifact + hash record and refreshing pack-proof
consumer-smoke sha256. Keep watching Actions on follow-up pushes.

## B-ADV-01 — Aged peer advisory triage (mitigated; peer floor applied)
Triage recorded in `compatibility/advisory-triage.md` (2026-09-23). Exact pins
`@angular/*@22.1.7` / Material+CDK `22.1.7` are OSV-clean and include known
Angular 22 GHSA patches (floors through 22.1.1 framework / 22.1.4 platform-server).
Same-day `22.1.8` / `22.2.0` fail the 7-day age window — **not** adopted.
Advertised library peers tightened to **`^22.1.7`** (applied on unpublished RC tip).
Re-check advisories immediately before npm publish.

## B-PKG-03 — Schematics / remaining legacy entries incomplete
**Mitigated for component scope + full historical testing + migrate-legacy + bundled CLI**:
all `research/scope.json` `preserved_entry_points` pack (including `legacy-tabs`).
LICENSE (Google + Ryan) ships. **All 22 historical testing secondary entries pack**
(see `compatibility/inventories/testing-public-apis.json` and pack-proof).
`migrate-legacy` performs the default Sass `@use '@angular/material'` →
`@use '@ngx-compat/material-legacy'` rewrite (and common variants) plus safe
TypeScript `legacy-*` module specifier updates; companion/aggregate/current-component
cases require explicit acknowledgement (fixture suite **25/25**). Peer-light
**bundled** CLI artifact under `migration/dist/` (sha256 in
`compatibility/migrate-legacy-cli-artifact.json`; Node `>=18`; no Angular peers)
plus repo stub `scripts/migrate-legacy-cli.mjs`; see `migration/README.md`.
Escape edges classified in `compatibility/inventories/escape-edge-classification.json`
(no `src/` mass-delete).
Inspector still flags `@angular/animations` peer and historical animation-engine
references in dialog/menu/select/form-field/snack-bar/tooltip/tabs (+ dialog/testing)
— owned metadata retained per `compatibility/motion-overlay-trio.md` until tested
migrations remove the deprecated engine from published runtime.

### Remaining non-component work
- Motion: MATERIAL_ANIMATIONS zero-duration wired for dialog/menu/select/form-field/
  snack-bar/tabs; **full** `@angular/animations` recipe removal still deferred.
- `src/` cleanup: unresolved relative edges **68→1**; shared-core/companions still
  blocked — prefer documenting; no mass-delete.
- Maintainer-authorized npm publish after packed-artifact and metadata checks.
- `21.x` branch packs + consumer smoke green on branch; keep lockfile off `main`
  (`compatibility/support-matrix.md`).

## Resolved / mitigated
- **Full historical testing ports (22/22)**: radio, slide-toggle, card, chips, list,
  slider, progress-bar, progress-spinner, snack-bar, table, tabs, tooltip,
  autocomplete, paginator (+ prior high-value set). Owned Material-16 bases where
  M22 removed `_Mat*HarnessBase`; consumer ESM smoke 44/44 green (with
  `@angular/compiler` preload for testing re-exports).
- **Peer-light CLI (bundled + stub)**: `migration/dist/*.tgz` + hash record;
  `scripts/migrate-legacy-cli.mjs` shares schematic `sass-rewrite.js` /
  `ts-rewrite.js`; acknowledgement flags; documented under `migration/README.md`.
- **Escape-edge classification**: W01 ordinary/core/unresolved edges classified;
  `src-cleanup-plan.md` updated; no mass-delete.
- **High-value testing ports**: form-field/input/select/checkbox/menu (+ core
  option/optgroup) harnesses pack; owned Material-16 bases where M22 removed
  `_Mat*HarnessBase` / legacy selectors.
- **migrate-legacy (real)**: Sass default rewrite + safe TS legacy path updates;
  fixture runner green against `fixtures/migration/cases.json`.
- **legacy-tabs**: secondary entry builds and packs; owned Material-16 tab bases +
  `matTabsAnimations`; consumer ESM + Sass theme smoke green (`#4527a0`, `.mat-tab`).
- **legacy-dialog/testing**: secondary entry packs (harness + test opener).
- **legacy-chips**: secondary entry builds and packs; theme smoke includes `.mat-chip`.
- **legacy-tooltip / legacy-paginator / legacy-table / legacy-snack-bar**: secondary
  entries build and pack; owned Material-16 bases; consumer ESM + Sass theme smoke
  green (`#4527a0`).
- **Overlay trio**: `legacy-dialog`, `legacy-menu`, `legacy-autocomplete`
  secondary entries build and pack; consumer ESM + Sass theme smoke green.
- **Selection + chrome ports**: `legacy-card`, `legacy-checkbox`,
  `legacy-radio`, `legacy-slide-toggle`, `legacy-progress-bar`,
  `legacy-progress-spinner`, `legacy-slider`, `legacy-list` secondary entries
  build and pack.
- **Testing pattern**: `legacy-button/testing` secondary entry packs with owned
  `LegacyButtonVariant` / `LegacyButtonHarnessFilters`.
- **Overlay form ports**: `legacy-form-field`, `legacy-input`, `legacy-core`
  (option), `legacy-select` secondary entries build and pack.
- **B-PKG-02**: Live SCSS→CSS for component `styleUrls` via `styleIncludePaths`
  + transitive `@material/focus-ring|tokens|progress-indicator` direct deps.
- **B-SASS-02**: Bridge-review fixtures dispositioned as intentional current-bridge
  (shared CDK). See `compatibility/bridge-disposition/`.
- **B-PKG-01**: ng-packagr primary + secondary entries; pack-proof under
  `compatibility/pack-proof/`.
- **B-SASS-01**: Material-16.2.14 seals + strict CSS parity evidence (fixture
  compare still healthy this tip: owned palette/constructor/cyph/button CSS equal).
- **B-TOOL-01**: Aged Angular 22.1.7 peer set installed; advisory triage recorded in
  `compatibility/advisory-triage.md` (OSV clean for exact pins; known Angular 22
  GHSAs patched by 22.1.7; same-day 22.1.8/22.2.0 not adopted; advertised peers tightened to `^22.1.7`).

## Constraints
- Cyph tree at `/workspace/ngx-compat/reference/cyph-dev-prod` is oracle-only; never commit it.
- Isolated Material-16 env at `/workspace/ngx-compat/reference/material-16.2.14-env` is
  local-only; never commit `node_modules`.
- No npm publish.
- Do not delete `src/` until escape edges are classified and extraction completes.


## B-MOTION-01 — Full animation-engine removal (active)
Mitigated partially: public `MATERIAL_ANIMATIONS` disable path forces 0ms on
dialog/menu/select/form-field/snack-bar/tabs. Owned trigger metadata and optional
`@angular/animations` peer remain until tested CSS/WAAPI replacements preserve
overlay contracts. See `compatibility/motion-overlay-trio.md`.

## B-ESC-01 — Unresolved relative escape edges (mitigated → 0)
Was 68 lexical `.import` false-negatives + 1 commented placeholder. Resolver maps
`.import` → `_*.import.scss`, strips comments, ignores `<...>` placeholders.
**Unresolved relative count: 0.** `src/` delete still blocked by shared-core /
ordinary companions.

## B-21-01 — 21.x library rebuild (mitigated on branch)
Branch `21.x` packs against aged Angular 21.2.23 / Material 21.2.14 with Sass/ESM/AOT
consumer smoke (`compatibility/pack-proof-21/`). Remaining: Node 20.19 matrix,
broader harness coverage, owner publish to `lts-21-next`. Do not merge 21 lockfile
into `main`.

## Motion engine (updated 2026-09-23)

| Area | Status |
| --- | --- |
| Pack without `-c tsconfig.lib.json` | **Fixed** via `scripts/pack-library.mjs` |
| dialog / snack-bar / tooltip primary FESM | **Unblocked** (CSS motion; recipes opt-in) |
| menu / select / form-field / tabs | **Still blocked** for full peer-free primary FESM |
| `src/` mass-delete | **Still blocked** (shared-core companions) |

## Motion engine (updated 2026-09-23 — full overlay CSS wave)

| Area | Status |
| --- | --- |
| dialog / snack-bar / tooltip / menu / select / form-field / tabs primary FESM | **Unblocked** (CSS motion; recipes opt-in `/animations`) |
| `@angular/animations` peer for primary overlay consumers | **Truly optional** |
| `src/` mass-delete | **Still blocked** (shared-core companions) |

