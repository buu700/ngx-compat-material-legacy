# Source provenance (library tree)

Sass under `styles/` and root `_index.scss` were copied from
`angular/components` tag `16.2.14`
(`baseline/angular-components-16.2.x` /
`df60e733c60e572ba538f6ad0ceff3e63e527b53`) as an owned Material-16 M2
compatibility facade. Google copyright headers in individual files are
retained. This package does not `@forward` current `@angular/material`.

TypeScript entry points are stubs until component worksheets are ported.
Historical `src/material/legacy-*` component mirrors that are fully owned under
`projects/ngx-material-legacy/legacy-*` were narrow-deleted 2026-09-23
(see `compatibility/inventories/src-legacy-mirror-delete-2026-09-23.json`).
`src/material/legacy-prebuilt-themes` (Bazel CSS stub) deleted after owned SCSS
landed under `styles/{core,legacy-core}/theming/prebuilt/`
(`src-legacy-prebuilt-themes-delete-2026-09-23.json`).
`src/dev-app` / `src/components-examples`, `src/material/core`, and ordinary
companions were retired 2026-09-23 (`src-scaffolding-retire-2026-09-23.json`).
`src/e2e-app` / `src/universal-app`, owned-overlap ordinary dirs, and hollow
schematics/testing/prebuilt-themes were retired 2026-09-23
(`src-e2e-universal-ordinary-retire-2026-09-23.json`). Residual `src/cdk*`,
maps, youtube, adapters, material-experimental, and the hollow `src/material`
facade were retired 2026-09-23
(`src-residual-packages-retire-2026-09-23.json`); `src/` now holds only a
retirement README.

See `compatibility/inventories/sass-facade-copy-manifest.json`.

## Pack adaptations (2026-09-23)

- Owned Material-16 common-behavior mixins under `legacy-button/internal/` (Material 22
  no longer exports `mixinColor` / `mixinDisabled` / `mixinDisableRipple`).
- Slim `MatCommonModule` re-exports CDK `BidiModule`.
- `standalone: false` on legacy button/anchor; `ANIMATION_MODULE_TYPE` from `@angular/core`.
- Component `styleUrls` point at `button.scss`; ng-packagr compiles with `styleIncludePaths` covering library + workspace `node_modules` (Material-16 `@material/*` load paths).
- Direct deps include transitive Sass packages (`focus-ring`, `tokens`, `progress-indicator`) so pnpm consumers resolve `@use '@material/…'` without relying on hoist.
- Library `dependencies` include Material-16-aligned `@material/*@15.0.0-canary.bc9ae6c9c.0`
  set so Sass consumers resolve the facade without a separate MDC install.

## Overlay ports (2026-09-23)

- `legacy-form-field` and `legacy-input` secondary entries adapted for Angular 22
  (`standalone: false`, owned `MatCommonModule` / `mixinColor`, owned
  `matFormFieldAnimations`, `ANIMATION_MODULE_TYPE` from `@angular/core`, live SCSS
  `styleUrls`). Shared tokens remain imported from `@angular/material/form-field` and
  `@angular/material/input` per upstream API policy.

- `legacy-core` (option/optgroup) and `legacy-select` secondary entries: owned
  Material-16 `_MatOptionBase` / `_MatOptgroupBase` / `_MatSelectBase` because those
  abstract bases were removed from Angular Material 22; presentation SCSS from
  historical legacy sources; `MAT_SELECT_*` tokens that still exist remain on
  `@angular/material/select`.

## Selection / chrome ports (2026-09-23)

- `legacy-card`, `legacy-progress-bar`, `legacy-progress-spinner`: adapted with owned
  `mixinColor` / `MatCommonModule`, `standalone: false`, live SCSS `styleUrls`.
- `legacy-checkbox`, `legacy-radio`, `legacy-slide-toggle`: owned Material-16 bases and
  required validators removed from Angular Material 22; shared `MAT_*` tokens remain
  on `@angular/material/*` peers.
- `legacy-button/testing`: secondary harness entry with owned historical
  `LegacyButtonVariant` / `LegacyButtonHarnessFilters`.

## Overlay trio ports (2026-09-23)

- `legacy-dialog`: owned `_MatDialogBase` / `_MatDialogContainerBase` adapted to
  inject()-based CDK `CdkDialogContainer`; owned `matDialogAnimations` /
  `_defaultParams`; owned `MatLegacyDialogRef` + `_closeDialogVia` (Material 22
  `MatDialogRef` is MDC-shaped). Shared `MatDialogConfig` / `MatDialogState` /
  position/role types remain on `@angular/material/dialog`.
- `legacy-menu`: owned `_MatMenuBase` / `_MatMenuTriggerBase` /
  `_MatMenuContentBase` (DomPortalOutlet without `ComponentFactoryResolver`);
  owned `matMenuAnimations`; `MatLegacyMenuItem` still extends current
  `MatMenuItem` with legacy host classes. Shared `MAT_MENU_*` tokens remain on
  `@angular/material/menu`.
- `legacy-autocomplete`: owned `_MatAutocompleteBase` /
  `_MatAutocompleteTriggerBase` / `_MatAutocompleteOriginBase`; options via
  package `legacy-core`; shared default/scroll tokens on
  `@angular/material/autocomplete`. Legacy panel keeps `_animationDone = null`.

## Table / paginator / tooltip / snack-bar ports (2026-09-23)

- `legacy-tooltip`: owned `_MatTooltipBase` / `_TooltipComponentBase` and
  scroll-strategy factory provider; shared position/default tokens on
  `@angular/material/tooltip`. CSS show/hide animations retained.
- `legacy-paginator`: owned `_MatPaginatorBase` and intl provider factory;
  `MatPaginatorIntl` / `PageEvent` / select config from `@angular/material/paginator`.
- `legacy-table`: owned `_MatTableDataSource` + paginator interfaces; table host
  adapted to current CDK outlet/`CdkTable` template (no removed
  `CDK_TABLE_TEMPLATE` / coalesced scheduler tokens).
- `legacy-snack-bar`: owned `_MatSnackBarBase` / `_MatSnackBarContainerBase` /
  `MatSnackBarRef` / `matSnackBarAnimations` / `LegacyTextOnlySnackBar`; shared
  config/data tokens on `@angular/material/snack-bar`.
