# Active blockers

## B-SASS-01 — Full facade CSS goldens (W02) not yet sealed
Owned M2 `define-palette` / `define-light-theme` smoke-compiles with sass@1.104.1
against local styles (Cyph deep-purple 800 → `#4527a0`). Immutable Material-16.2.14
reference CSS/value seals and `all-legacy-component-themes` / `core()` compile still
need a reference environment plus `@material/*` load-path coverage for companion themes.

## B-PKG-01 — Packed library / ng-packagr proof pending
Peers installed for development; `ng-packagr` build, secondary entry points, and
packed-consumer install are not done. `esbuild`/`@parcel/watcher` build scripts were
ignored by pnpm (approve-builds required before some tooling works).

## B-CI-01 — Push-triggered Actions initially produced zero runs
`workflow_dispatch` runs succeed. Keep that trigger; push delivery may need repo
Actions permission confirmation in GitHub UI.

## Resolved / mitigated
- **B-TOOL-01**: Proposed aged Angular 22.1.7 / Material 22.1.7 / CDK 22.1.7 /
  TypeScript 6.0.3 / sass 1.104.1 selection recorded and installed into the private
  workspace lockfile (see `compatibility/peers-22.proposed.json`). Still needs
  packed-consumer and advisory review before calling it a release baseline.

## Constraints
- Cyph tree at `/workspace/ngx-compat/reference/cyph-dev-prod` is oracle-only; never commit it.
- No npm publish.
- Do not delete `src/` until escape edges are classified and extraction completes.
