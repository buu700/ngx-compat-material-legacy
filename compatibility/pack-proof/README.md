# Pack proof (partial)

Evidence that `ng-packagr` can build and `npm pack` the compatibility library with
secondary entries plus the Sass root facade.

## Packed secondary entries (this tip)

**Components:** `legacy-button`, `legacy-form-field`, `legacy-input`, `legacy-core`,
`legacy-select`, `legacy-card`, `legacy-checkbox`, `legacy-radio`, `legacy-slide-toggle`,
`legacy-progress-bar`, `legacy-progress-spinner`, `legacy-slider`, `legacy-list`,
`legacy-dialog`, `legacy-menu`, `legacy-autocomplete`, `legacy-chips`, `legacy-tooltip`,
`legacy-paginator`, `legacy-table`, `legacy-snack-bar`, `legacy-tabs`.

**Testing (22/22 historical):** every inventory entry under
`compatibility/inventories/testing-public-apis.json` packs, including
`legacy-*/testing` for button, dialog, form-field, input, select, checkbox, menu,
core, radio, slide-toggle, card, chips, list, slider, progress-bar, progress-spinner,
snack-bar, table, tabs, tooltip, autocomplete, paginator.

Schematics: `schematics/collection.json` → `migrate-legacy` (real Sass `@use` rewrite +
safe TypeScript `legacy-*` module specifier updates + acknowledgement options;
fixture runner `scripts/schematics/test-migrate-legacy-fixtures.mjs` = **25/25**).

Peer-light CLI: bundled artifact `migration/dist/ngx-compat-material-legacy-migrate-cli-22.0.0-rc.0.tgz`
(sha256 in `compatibility/migrate-legacy-cli-artifact.json`; Node `>=18`; no Angular peers)
plus repo stub `scripts/migrate-legacy-cli.mjs` (see `migration/README.md`).

| Artifact | Role |
| --- | --- |
| `ngx-compat-material-legacy-22.0.0-rc.0.tgz` | Packed tarball |
| `consumer-smoke.json` | Clean-temp consumer install + Sass/ESM results |
| `consumer-smoke-theme.css` | Cyph-like deep-purple 800 + theme mixins |
| `inspect-packed-package.json` | Static inspector (animation peer/refs still flagged per motion policy) |

Rebuild: `pnpm exec ng-packagr -p projects/ngx-material-legacy/ng-package.json -c projects/ngx-material-legacy/tsconfig.lib.json`, then `npm pack` in `dist/ngx-material-legacy`.
