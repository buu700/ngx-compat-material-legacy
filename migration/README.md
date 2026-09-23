# Migration: schematic + peer-light CLI

One transformation engine, two front-ends (handoff W08 / `docs/05-migration.md`).

## Shared engine

| Module | Role |
| --- | --- |
| `projects/ngx-material-legacy/schematics/migrate-legacy/sass-rewrite.js` | Default Sass `@use '@angular/material'` → `@use '@ngx-compat/material-legacy'` (namespace/bindings preserved; ambiguous/mixed/current-generation cases diagnose and refuse) |
| `projects/ngx-material-legacy/schematics/migrate-legacy/ts-rewrite.js` | Safe TypeScript `@angular/material/legacy-*` module specifier updates (including `/testing`) |

Both the Angular schematic and the filesystem CLI `require()` these modules. Do not fork the rewrite rules.

### Acknowledgement (companion / aggregate / current-component)

When a stylesheet uses ordinary-current companions (e.g. `expansion-theme`) or the
historical `all-legacy-component-themes` aggregate, or when TypeScript still imports
ordinary (non-legacy) `@angular/material/...` modules, the engine emits **explicit
diagnostics requiring acknowledgement**. There is no silent rewrite and no silent skip
without a report.

| Flag (CLI) | Schematic option | Effect when set |
| --- | --- | --- |
| `--acknowledge-companion-bridges` | `acknowledgeCompanionBridges` | Record acknowledgement; allow **safe `@use` module-source edit only**. Does **not** rewrite companion mixin calls. |
| `--acknowledge-aggregates` | `acknowledgeAggregates` | Record acknowledgement; allow safe `@use` edit only. Does **not** substitute an owned-only aggregate. |
| `--acknowledge-current-components` | `acknowledgeCurrentComponents` | Record acknowledgement for readiness. Does **not** rewrite ordinary Material imports or waive parity tests. |

Unacknowledged companion/aggregate/current-component hits are blocking (exit `1`).
Generation mismatches (`current-m3`, `mixed-generation`) and unsupported syntax remain
blocking even with acknowledgement flags.

Fixture coverage: `node scripts/schematics/test-migrate-legacy-fixtures.mjs` (25/25).

## Angular schematic (modern workspaces)

After installing `@ngx-compat/material-legacy` into an Angular ≥22 workspace:

```bash
ng generate @ngx-compat/material-legacy:migrate-legacy --dry-run
ng generate @ngx-compat/material-legacy:migrate-legacy
ng generate @ngx-compat/material-legacy:migrate-legacy \
  --acknowledge-companion-bridges \
  --acknowledge-aggregates \
  --acknowledge-current-components
```

Collection: `schematics/collection.json` → `migrate-legacy`.

## Peer-light pre-upgrade CLI (old workspaces)

Old Angular-16 workspaces may not install current Angular peers. Prefer the
**bundled CLI artifact** (no `@angular/*` runtime required):

### Bundled artifact (recommended for download)

| Field | Value |
| --- | --- |
| Tarball | `migration/dist/ngx-compat-material-legacy-migrate-cli-22.0.0-rc.0.tgz` |
| Hash record | `compatibility/migrate-legacy-cli-artifact.json` |
| Node engines | `>=18.0.0` |
| Angular peers | **none** |
| Build | `node scripts/build-migrate-legacy-cli.mjs` |
| Verify | `node scripts/build-migrate-legacy-cli.mjs --verify` |

```bash
# Review published sha256 in compatibility/migrate-legacy-cli-artifact.json first
sha256sum migration/dist/ngx-compat-material-legacy-migrate-cli-22.0.0-rc.0.tgz

mkdir -p /tmp/migrate-cli
tar -xzf migration/dist/ngx-compat-material-legacy-migrate-cli-22.0.0-rc.0.tgz -C /tmp/migrate-cli
node /tmp/migrate-cli/package/bin/migrate-legacy.js /path/to/old-workspace
node /tmp/migrate-cli/package/bin/migrate-legacy.js /path/to/old-workspace --apply
```

Do **not** advertise `npx @ngx-compat/material-legacy` as peer-light — npm may
resolve library peers. Do not pipe downloads to a shell.

### Repository CLI stub (maintainer / checkout path)

```bash
node scripts/migrate-legacy-cli.mjs /path/to/old-workspace          # dry-run
node scripts/migrate-legacy-cli.mjs /path/to/old-workspace --apply
node scripts/migrate-legacy-cli.mjs /path/to/file.scss --json \
  --acknowledge-companion-bridges
```

- Default is **dry-run**; `--apply` is required to write.
- Scans `.scss` / `.sass` / `.ts` / `.tsx`; skips `node_modules`, `dist`, `.git`, etc.
- Exit `0` when only safe edits / nothing to do; exit `1` when any file has blocking
  diagnostics or unacknowledged risks; exit `2` on bad usage.

## Motion note (`MATERIAL_ANIMATIONS`)

Overlay contracts (`legacy-dialog` / `legacy-menu` / `legacy-select` / …) still
own historical `@angular/animations` trigger metadata. Consumers who need to
disable Material animations should prefer the public
`MATERIAL_ANIMATIONS` token from `@angular/material/core` (e.g. provide
`{animationsDisabled: true}`) rather than deleting legacy animation recipes.
See `compatibility/motion-overlay-trio.md`. No engine-bound trigger removals in
this wave.
