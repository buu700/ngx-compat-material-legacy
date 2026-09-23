# 5. Safe schematic and pre-upgrade CLI

## One engine; two distribution routes

Implement pure transformations returning edits and structured diagnostics; adapt them to Angular Schematics `Tree` and a standalone filesystem CLI. Share allowlists, symbol inventory and tests. Required modern command:

```bash
ng generate @ngx-compat/material-legacy:migrate-legacy --dry-run
ng generate @ngx-compat/material-legacy:migrate-legacy
```

Ship package-owned `ng-update` registration for this package's future changes. `ng-add` is optional and must not silently configure themes, frameworks or animation providers.

Old workspaces may not install current Angular peers. Build a separately downloadable, versioned **bundled CLI artifact** in the same repository/release, with parser code included and no Angular runtime peers. Publish its hash and Node engine requirement. It must run without cloning this repository or installing the library/Material 22 into an Angular-16 workspace. A separate npm CLI package is optional only after namespace authorization; do not require it as a second project.

Do not advertise `npx` on the main library as peer-light. Npm may resolve its Angular peers. The standalone CLI never loads the target workspace's Angular runtime. Review downloaded artifact identity and checksum before executing; no `curl | sh` instructions.

## TypeScript edits

Rewrite only known historical `@angular/material/legacy-*` public entry points and verified `/testing` paths. Preserve named aliases, default/namespace forms and type-only usage. Ordinary paths stay unchanged. Handle import/export declarations, import-type expressions, literal dynamic imports and unshadowed module `require` calls using a parser. Do not rewrite arbitrary strings, comments, computed paths or private deep paths. Removed symbols get binding-aware diagnostics even through aliases/barrels.

Never automatically change templates, classes or component APIs, execute the official MDC migration, convert NgModules or delete application animation providers. Detect same-scope modern/legacy selector conflicts where statically possible and report unresolved cases honestly.

## Sass edits: token-level module source replacement

For an explicit namespace, replace just the supported historical root module URL token. Preserve quotes, comments, whitespace, namespace, `with` configuration and all expressions exactly. Example:

```scss
@use '@angular/material' as mat;
```

becomes:

```scss
@use '@ngx-compat/material-legacy' as mat;
```

An implicit `@use '@angular/material';` historically binds `material`. A bare URL swap changes that default namespace. Therefore insert `as material` while preserving its old binding; this is a syntactic binding-preservation exception, not a semantic Sass migration. Test collision detection. `as *`, `@forward ... show/hide/as/with`, forwarded variables and local shadows require conservative static analysis; safely diagnosed unsupported syntax counts as success. Never claim every Sass metaprogram can be rewritten automatically.

Before any stylesheet edit, identify its historical API generation, supported symbol set and bridge usage. If it already uses M3/current-only APIs (`define-theme`, current `m2-*` names, new tokens), is mixed-generation, uses unsupported private imports or has dynamic ambiguity, leave that file unchanged and report a precise diagnostic. Do not reinterpret modern palette calls as historical M2. A user may explicitly select/approve a historical migration only with a clean classification report.

Do not split one namespace across two modules by rewriting individual calls. No `m2-` renames, theme reconstruction, property/selector edits, mixin substitution or reordering. Root path checks include Sass compiler canonicalization and package exports; legacy `@import`/deep imports/prebuilt CSS are handled only when a mapped fixture demonstrates correctness, otherwise diagnose. Unsupported syntax is not silently erased.

## Readiness must be fail-closed

The command emits both edits and a report. Report each Sass symbol's owner (`owned-exact`, `shared-current`, `ordinary-current`, `unsupported`), current ordinary TypeScript imports, private selector dependencies when discoverable, declared engine exceptions and unresolved cases. A prefix-only rewrite can be complete while visual review remains required.

Use explicit acknowledgement for current-component drift (e.g. `--acknowledge-current-components`) to distinguish accepting known upstream upgrade scope from authorizing legacy CSS changes. This acknowledgement is **not** an automatic visual approval, cannot waive blocked legacy parity tests, and must be recorded in the report. It does not require application CSS edits.

Stage edits transactionally per file; do not half-migrate a stylesheet with a blocking diagnostic. Default CLI behavior is report/dry-run; an explicit apply option is required. Include line/column, ID, cause, safe next action and documentation/test link. Nonzero exit on blocking/unacknowledged-risk conditions; separate exit status for “safe edits produced, review still required.” Exact exit codes are fixed and tested before release.

## Old-workspace ordering must be tested, not guessed

Official v17 Material update tooling checks for legacy imports [U06]. Build a real synthetic Material-16 consumer to test: baseline capture; source-only preparation; supported major-by-major official upgrades under matching Node versions; install candidate peers/library; final compat checks. Preparatory rewritten imports may temporarily be unresolved because the modern package cannot yet be installed. Treat that as a branch-only migration state, not a runnable release. Confirm how official schematics behave before publishing exact commands.

Do not force npm peer resolution or recommend arbitrary `--force` to hide a broken upgrade path. If the staged path fails, the release cannot claim that upgrade route until repaired/documented. Record actual commands, package metadata and diagnostic outcomes. An alternative temporary source configuration must be narrowly justified, reversible and not shipped as a dependency alias trick.

## Acceptance

Use `fixtures/migration/cases.json`. Tests cover dry-run/no writes, idempotence, local aliases, namespaces, existing compat imports, unsupported/private symbols, quote/comment preservation, mixed old/new theming, implicit namespaces, `with`/`@forward`, ordinary-component acknowledgement, engine metadata diagnostics and old-workspace CLI without peers. Test the **packed schematic and downloadable CLI**, not only internal functions.
