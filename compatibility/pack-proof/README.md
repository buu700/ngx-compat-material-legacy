# Pack proof

Evidence that `ng-packagr` can build and `npm pack` the compatibility library with
secondary entries plus the Sass root facade.

## Packed secondary entries (this tip)

**Components:** `legacy-button`, `legacy-form-field`, `legacy-input`, `legacy-core`,
`legacy-select`, `legacy-card`, `legacy-checkbox`, `legacy-radio`, `legacy-slide-toggle`,
`legacy-progress-bar`, `legacy-progress-spinner`, `legacy-slider`, `legacy-list`,
`legacy-dialog`, `legacy-menu`, `legacy-autocomplete`, `legacy-chips`, `legacy-tooltip`,
`legacy-paginator`, `legacy-table`, `legacy-snack-bar`, `legacy-tabs`.

**Testing (22/22 historical):** every inventory entry under
`compatibility/inventories/testing-public-apis.json` packs.

Schematics: `schematics/collection.json` → `migrate-legacy` (fixture runner **25/25**).

Peer-light CLI: `migration/dist/ngx-compat-material-legacy-migrate-cli-22.0.0-rc.0.tgz`
(sha256 in `compatibility/migrate-legacy-cli-artifact.json`).

| Artifact | Role |
| --- | --- |
| `ngx-compat-material-legacy-22.0.0-rc.0.tgz` | Packed tarball (peers `^22.1.7`) |
| `consumer-smoke.json` | Clean-temp consumer install + Sass/ESM results |
| `consumer-smoke-theme.css` | Cyph-like deep-purple 800 + theme mixins |
| `theme-coexistence.css` | W07 legacy M2 + current Material theme CSS |
| `aot-harness-smoke.json` | Packed-consumer AOT + button/select harness runtime |
| `motion-lifecycle-smoke.json` | MATERIAL_ANIMATIONS helper + dialog wiring checks |
| `inspect-packed-package.json` | Static inspector (animation peer/refs still flagged) |

Rebuild: `pnpm exec ng-packagr -p projects/ngx-material-legacy/ng-package.json -c projects/ngx-material-legacy/tsconfig.lib.json`, then `npm pack` in `dist/ngx-material-legacy`.

AOT/harness: `node scripts/packed-consumer-aot-smoke.mjs`
Motion: `node scripts/motion-lifecycle-smoke.mjs`
