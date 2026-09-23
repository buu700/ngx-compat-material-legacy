# Active blockers

## B-CI-01 — Push-triggered Actions initially produced zero runs
Mitigated: push-triggered CI is now producing runs (e.g. success on
`5f7740be`). Keep `workflow_dispatch` as a backup.

## B-PKG-03 — Schematics / remaining legacy entries incomplete
LICENSE (Google + Ryan) now ships in the packed tarball. Inspector still flags
missing schematic collection and remaining legacy entry points (and optional
`@angular/animations` peer advisory).

### Remaining entry points (scope)
- Overlay: `legacy-dialog`, `legacy-menu`, `legacy-autocomplete` (need owned
  Material-16 bases: `_MatDialogBase` / `_MatDialogContainerBase` /
  `_MatMenuBase` / `_MatMenuTriggerBase` / `_MatAutocompleteBase` /
  `_MatAutocompleteTriggerBase`, plus owned animation metadata where removed
  from Angular Material 22).
- Also: `legacy-chips`, `legacy-table`,
  `legacy-paginator`, `legacy-tabs`, `legacy-snack-bar`, `legacy-tooltip`.
- Testing secondary entries beyond `legacy-button/testing`.

## Resolved / mitigated
- **Selection + chrome ports**: `legacy-card`, `legacy-checkbox`,
  `legacy-radio`, `legacy-slide-toggle`, `legacy-progress-bar`,
  `legacy-progress-spinner` secondary entries build and pack; consumer ESM +
  Sass theme smoke green (`#4527a0`). Owned Material-16 bases for
  checkbox/radio/slide-toggle; shared tokens stay on `@angular/material/*`.
- **Testing pattern**: `legacy-button/testing` secondary entry packs with owned
  `LegacyButtonVariant` / `LegacyButtonHarnessFilters`.
- **Overlay ports**: `legacy-form-field`, `legacy-input`, `legacy-core` (option),
  `legacy-select` secondary entries build and pack.
- **B-PKG-02**: Live SCSS→CSS for component `styleUrls` via `styleIncludePaths`
  + transitive `@material/focus-ring|tokens|progress-indicator` direct deps.
- **B-SASS-02**: Bridge-review fixtures dispositioned as intentional current-bridge
  (shared CDK). See `compatibility/bridge-disposition/`.
- **B-PKG-01**: ng-packagr primary + secondary entries; pack-proof under
  `compatibility/pack-proof/`.
- **B-SASS-01**: Material-16.2.14 seals + strict CSS parity evidence.
- **B-TOOL-01**: Aged Angular 22.1.7 peer set installed; advisory review still open.

## Constraints
- Cyph tree at `/workspace/ngx-compat/reference/cyph-dev-prod` is oracle-only; never commit it.
- Isolated Material-16 env at `/workspace/ngx-compat/reference/material-16.2.14-env` is
  local-only; never commit `node_modules`.
- No npm publish.
- Do not delete `src/` until escape edges are classified and extraction completes.
