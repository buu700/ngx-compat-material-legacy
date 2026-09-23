# Active blockers

## B-SASS-02 — Candidate CSS parity vs sealed Material-16 reference still open
Immutable Material-16.2.14 Sass CSS/value seals exist under `reference/material-16.2.14/`
(including Cyph deep-purple 800 → `#4527a0`). Candidate compile + `compare-css.py` against
the owned facade is not yet sealed as a passing W02 verification leg. Full
`all-legacy-component-themes` / `core()` composition still needs deeper companion-theme
coverage and review of bridge-review fixtures.

## B-PKG-02 — Component SCSS→CSS seam is precompiled for legacy-button
`legacy-button` packs with checked-in `button.css` (compiled with Material-16 `@material/*`
load paths). Live `styleUrls: ['button.scss']` inside ng-packagr still fails without
wiring those load paths into the library build. Extend a real SCSS compile step before
porting more components that need generated CSS.

## B-CI-01 — Push-triggered Actions initially produced zero runs
`workflow_dispatch` runs succeed. Keep that trigger; push delivery may need repo
Actions permission confirmation in GitHub UI.

## Resolved / mitigated
- **B-PKG-01**: `pnpm approve-builds` for `esbuild` / `@parcel/watcher` done. ng-packagr
  produces `@ngx-compat/material-legacy` + `legacy-button` secondary entry; packed
  consumer smoke (Sass Cyph palette + ESM button symbols) recorded under
  `compatibility/pack-proof/`.
- **B-SASS-01** (reference seals portion): Material-16.2.14 reference CSS/value seals
  created and sealed (`reference/material-16.2.14/.reference-seal.json`). Candidate
  parity remains as B-SASS-02.
- **B-TOOL-01**: Proposed aged Angular 22.1.7 / Material 22.1.7 / CDK 22.1.7 /
  TypeScript 6.0.3 / sass 1.104.1 selection recorded and installed into the private
  workspace lockfile (see `compatibility/peers-22.proposed.json`). Still needs
  advisory review before calling it a release baseline.

## Constraints
- Cyph tree at `/workspace/ngx-compat/reference/cyph-dev-prod` is oracle-only; never commit it.
- Isolated Material-16 env at `/workspace/ngx-compat/reference/material-16.2.14-env` is
  local-only; never commit `node_modules`.
- No npm publish.
- Do not delete `src/` until escape edges are classified and extraction completes.
