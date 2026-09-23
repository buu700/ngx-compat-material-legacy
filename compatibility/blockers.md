# Active blockers

## B-SASS-02 — Bridge-review / aggregate CSS still needs disposition
Strict owned Sass fixtures from the packed facade match sealed Material-16.2.14 CSS
byte-for-byte (30/30 compiled strict cases; Cyph deep-purple 800 → `#4527a0`), see
`compatibility/pack-proof/candidate-vs-reference-css.json`. Bridge-review fixtures
(`02-core`, `03-legacy-core`, `06-aggregate-and-companions`, `08-core-theme`) still
need explicit drift reports / approvals — not silent equality claims.

## B-PKG-02 — Component SCSS→CSS seam is precompiled for legacy-button
`legacy-button` packs with checked-in `button.css` (compiled with Material-16
`@material/*` load paths). Live `styleUrls: ['button.scss']` inside ng-packagr still
needs those load paths wired into the library build before porting more components.

## B-CI-01 — Push-triggered Actions initially produced zero runs
Mitigated: push-triggered CI is now producing runs (e.g. success on
`5f7740be`). Keep `workflow_dispatch` as a backup.

## Resolved / mitigated
- **B-PKG-01**: `pnpm approve-builds` for `esbuild` / `@parcel/watcher` done.
  ng-packagr produces primary + `legacy-button`; packed consumer smoke recorded under
  `compatibility/pack-proof/`.
- **B-SASS-01**: Material-16.2.14 reference CSS/value seals sealed at
  `reference/material-16.2.14/` (`.reference-seal.json`). Candidate strict CSS parity
  evidenced in pack-proof compare JSON.
- **B-TOOL-01**: Aged Angular 22.1.7 peer set installed (see
  `compatibility/peers-22.proposed.json`); advisory review still open before calling it
  a release baseline.

## Constraints
- Cyph tree at `/workspace/ngx-compat/reference/cyph-dev-prod` is oracle-only; never commit it.
- Isolated Material-16 env at `/workspace/ngx-compat/reference/material-16.2.14-env` is
  local-only; never commit `node_modules`.
- No npm publish.
- Do not delete `src/` until escape edges are classified and extraction completes.
