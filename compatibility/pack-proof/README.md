# Pack proof (partial)

Evidence that `ng-packagr` can build and `npm pack` the compatibility library with a
working `legacy-button` secondary entry and Sass root facade. Component styles compile
from SCSS during the library build (`styleIncludePaths` + owned `@material/*` deps).

| Artifact | Role |
| --- | --- |
| `ngx-compat-material-legacy-22.0.0-rc.0.tgz` | Packed tarball |
| `consumer-smoke.json` | Clean-temp consumer install + Sass/ESM results |
| `consumer-smoke-theme.css` | Cyph-like deep-purple 800 output (`#4527a0`) |
| `inspect-packed-package.json` | Static inspector (expected incomplete: other legacy entries, LICENSE, schematics) |

Rebuild: from repo root, `pnpm exec ng-packagr -p projects/ngx-material-legacy/ng-package.json -c projects/ngx-material-legacy/tsconfig.lib.json`, then `npm pack` in `dist/ngx-material-legacy`.
