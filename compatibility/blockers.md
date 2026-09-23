# Active blockers

## B-CI-01 — Push-triggered Actions initially produced zero runs
Mitigated: push-triggered CI is now producing runs (e.g. success on
`5f7740be`). Keep `workflow_dispatch` as a backup.

## B-PKG-03 — Schematics / remaining legacy entries incomplete
**Mitigated for component scope + high-value testing + default migrate-legacy**:
all `research/scope.json` `preserved_entry_points` pack (including `legacy-tabs`).
LICENSE (Google + Ryan) ships. High-value testing secondary entries pack:
`legacy-button/testing`, `legacy-dialog/testing`, `legacy-form-field/testing`,
`legacy-input/testing`, `legacy-select/testing`, `legacy-checkbox/testing`,
`legacy-menu/testing`, plus supporting `legacy-core/testing` (option/optgroup).
`migrate-legacy` performs the default Sass `@use '@angular/material'` →
`@use '@ngx-compat/material-legacy'` rewrite (and common variants) plus safe
TypeScript `legacy-*` module specifier updates; ambiguous/mixed/current-generation
cases stop with diagnostics (fixture suite 22/22).
Inspector still flags `@angular/animations` peer and historical animation-engine
references in dialog/menu/select/form-field/snack-bar/tooltip/tabs (+ dialog/testing)
— owned metadata retained per `compatibility/motion-overlay-trio.md` until tested
migrations remove the deprecated engine from published runtime.

### Remaining non-component work
- Broader remaining testing harnesses (chips/radio/slide-toggle/list/tabs/table/
  paginator/snack-bar/tooltip/autocomplete/progress-*, etc.).
- Motion migration off `@angular/animations` engine where feasible (do not break
  dialog/menu/select contracts; prefer documenting `MATERIAL_ANIMATIONS` usage).
- Inventories / escape-edge classification; `src/` monorepo tree cleanup (do not
  mass-delete yet — see `compatibility/inventories/src-cleanup-plan.md`).
- Broader migrate-legacy acknowledgement flows for companion/aggregate bridges;
  peer-light pre-upgrade CLI still TBD.

## Resolved / mitigated
- **High-value testing ports**: form-field/input/select/checkbox/menu (+ core
  option/optgroup) harnesses pack; owned Material-16 bases where M22 removed
  `_Mat*HarnessBase` / legacy selectors; consumer ESM smoke green (with
  `@angular/compiler` preload for testing re-exports).
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
- **B-TOOL-01**: Aged Angular 22.1.7 peer set installed; advisory review still open.

## Constraints
- Cyph tree at `/workspace/ngx-compat/reference/cyph-dev-prod` is oracle-only; never commit it.
- Isolated Material-16 env at `/workspace/ngx-compat/reference/material-16.2.14-env` is
  local-only; never commit `node_modules`.
- No npm publish.
- Do not delete `src/` until escape edges are classified and extraction completes.
