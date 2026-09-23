# Source provenance (library tree)

Sass under `styles/` and root `_index.scss` were copied from
`angular/components` tag `16.2.14`
(`baseline/angular-components-16.2.x` /
`df60e733c60e572ba538f6ad0ceff3e63e527b53`) as an owned Material-16 M2
compatibility facade. Google copyright headers in individual files are
retained. This package does not `@forward` current `@angular/material`.

TypeScript entry points are stubs until component worksheets are ported.
Historical sources under repository `src/` remain until inventory-gated
deletion.

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
