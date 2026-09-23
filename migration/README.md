# Migration: schematic + peer-light CLI

One transformation engine, two front-ends (handoff W08 / `docs/05-migration.md`).

## Shared engine

| Module | Role |
| --- | --- |
| `projects/ngx-material-legacy/schematics/migrate-legacy/sass-rewrite.js` | Default Sass `@use '@angular/material'` → `@use '@ngx-compat/material-legacy'` (namespace/bindings preserved; ambiguous/mixed/current-generation cases diagnose and refuse) |
| `projects/ngx-material-legacy/schematics/migrate-legacy/ts-rewrite.js` | Safe TypeScript `@angular/material/legacy-*` module specifier updates (including `/testing`) |

Both the Angular schematic and the filesystem CLI `require()` these modules. Do not fork the rewrite rules.

## Angular schematic (modern workspaces)

After installing `@ngx-compat/material-legacy` into an Angular ≥22 workspace:

```bash
ng generate @ngx-compat/material-legacy:migrate-legacy --dry-run
ng generate @ngx-compat/material-legacy:migrate-legacy
```

Collection: `schematics/collection.json` → `migrate-legacy`.

## Peer-light pre-upgrade CLI (old workspaces)

Old Angular-16 workspaces may not install current Angular peers. Use the
**repository CLI stub** (no `@angular/*` runtime required to execute):

```bash
# From this repository checkout (development / maintainer path)
node scripts/migrate-legacy-cli.mjs /path/to/old-workspace          # dry-run
node scripts/migrate-legacy-cli.mjs /path/to/old-workspace --apply   # write safe edits
node scripts/migrate-legacy-cli.mjs /path/to/file.scss --json
```

- Default is **dry-run**; `--apply` is required to write.
- Scans `.scss` / `.sass` / `.ts` / `.tsx`; skips `node_modules`, `dist`, `.git`, etc.
- Exit `0` when only safe edits / nothing to do; exit `1` when any file has blocking diagnostics; exit `2` on bad usage.
- **Not** advertised as `npx @ngx-compat/material-legacy` — npm may resolve library peers. A separately downloadable bundled CLI artifact (hash + Node engine) remains a release-packaging follow-up.

Fixture coverage for the shared engine: `node scripts/schematics/test-migrate-legacy-fixtures.mjs` (22/22).

## Motion note (`MATERIAL_ANIMATIONS`)

Overlay contracts (`legacy-dialog` / `legacy-menu` / `legacy-select` / …) still
own historical `@angular/animations` trigger metadata. Consumers who need to
disable Material animations should prefer the public
`MATERIAL_ANIMATIONS` token from `@angular/material/core` (e.g. provide
`{animationsDisabled: true}`) rather than deleting legacy animation recipes.
See `compatibility/motion-overlay-trio.md`. No engine-bound trigger removals in
this wave.
