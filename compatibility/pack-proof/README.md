# Pack proof (partial)

Evidence that `ng-packagr` can build and `npm pack` the compatibility library with
secondary entries plus the Sass root facade.

## Packed secondary entries (this tip)

`legacy-button`, `legacy-button/testing`, `legacy-form-field`, `legacy-input`,
`legacy-core` (option), `legacy-select`, `legacy-card`, `legacy-checkbox`,
`legacy-radio`, `legacy-slide-toggle`, `legacy-progress-bar`,
`legacy-progress-spinner`, `legacy-slider`, `legacy-list`, `legacy-dialog`,
`legacy-dialog/testing`, `legacy-menu`, `legacy-autocomplete`, `legacy-chips`,
`legacy-tooltip`, `legacy-paginator`, `legacy-table`, `legacy-snack-bar`,
`legacy-tabs`.

Schematics stub: `schematics/collection.json` → `migrate-legacy` (no-op Rule).

| Artifact | Role |
| --- | --- |
| `ngx-compat-material-legacy-22.0.0-rc.0.tgz` | Packed tarball |
| `consumer-smoke.json` | Clean-temp consumer install + Sass/ESM results |
| `consumer-smoke-theme.css` | Cyph-like deep-purple 800 + theme mixins |
| `inspect-packed-package.json` | Static inspector (animation peer/refs still flagged per motion policy) |

Rebuild: `pnpm exec ng-packagr -p projects/ngx-material-legacy/ng-package.json -c projects/ngx-material-legacy/tsconfig.lib.json`, then `npm pack` in `dist/ngx-material-legacy`.
