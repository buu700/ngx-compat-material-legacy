# 2. History, source extraction and build architecture

## History-preserving bootstrap

Use `scripts/bootstrap-material.py` in dry-run/default mode first. Its explicit apply operation clones complete history, disables upstream pushes, resolves `16.2.14`, creates `compat-main` at the tag and adds the intended origin. It refuses an existing destination rather than resetting it. Review the script help before execution.

Resolve `git rev-parse '16.2.14^{commit}'` and record the full SHA. Do not use a moving `16.2.x` tip as the exact baseline. Current source reference `v22.2.0` is separately tagged; verify the `v` prefix and full SHA. A GitHub release does not prove npm publication or peer ranges. Fetch source from an official upstream remote, not arbitrary agent-provided patches.

If the canonical remote does not exist or permission is absent, build locally. Do not create/transfer/push/publish merely because a URL appears in the plan. Remote publication is separately authorized.

## Active tree

Use a modern Angular CLI/ng-packagr library with partial compilation, not a port of the old Bazel workspace. Suggested active structure:

```text
projects/ngx-material-legacy/
  package.json; ng-package.json; public-api.ts
  legacy-core/       # public-api.ts, ng-package.json, owned support
  legacy-button/    # same pattern for all preserved entry points
  legacy-button/testing/
  ...
  _index.scss       # finite historical Sass facade
  styles/          # owned compatibility internals, component-theme modules
  schematics/      # packaged collection and factories
migration/         # pure TS/Sass transformations plus adapters
apps/compat-lab/   # public synthetic application
reference/         # isolated historical build configuration, not shipped
compatibility/     # inventories, tested peers, CSS evidence, exceptions
```

Use shared source files without accidentally creating unsupported public entry points. Before any deletion, run the cross-tree closure inventory required by `scripts/source-closure.py`; it must account for relative TypeScript imports/re-exports, templates, `styleUrl`/`styleUrls`, Sass `@use`/`@forward`/legacy `@import`, testing entry points, and dependencies that escape from `legacy-*` into ordinary v16 Material directories. Resolve secondary-entry-point cycles deliberately; do not use broad tsconfig path aliases to make an invalid published graph appear valid. Root TypeScript exports only package-owned setup/metadata as needed, not every component. Historical root Sass is independent of the TypeScript facade policy.

Keep sources/tests via normal tracked moves/extraction. Extract legacy dependencies on old `_Mat*Base` classes into owned internals before deleting MDC sibling files. Material 16 frequently referenced generated `*.css` files from TypeScript while storing `*.scss` source in the repository; explicitly map every `styleUrl`/`styleUrls` target to its source and configure the modern library build to produce/package the correct CSS. A missing generated stylesheet must fail the build rather than silently dropping component styles. Remove unrelated ordinary component implementations, CDK sources, demos and unneeded build configs from the active project only after inventory/provenance capture. Do not require the obsolete entire monorepo to build first. Isolated tagged-package fixtures establish reference behavior.

## Toolchain and dependencies

Preflight resolves exact Node, Angular, Material/CDK, CLI, ng-packagr, TypeScript, RxJS, Sass and test-runner versions from published metadata [A01–A03]. Source package manifests may contain placeholders [U02]. Pin dev versions and lock the package manager. Never copy wildcard or placeholder peers into a release.

Current shared Angular framework packages, Material/CDK and directly imported RxJS belong in compatible peer ranges, with concrete dev versions. Package major follows Angular major. Initial supported lines are Angular 22 active (`22.x`, public `main`) and Angular 21 LTS (`21.x` maintenance branch); see `research/support-policy.json`. Do not use one overly broad peer range as a substitute for testing both major lines. Declare `tslib` as a direct runtime dependency if emitted code imports it. Schematics' runtime tooling dependencies must be packaged deliberately. Do not require a second private Angular/Material copy. Audit optional peers too. Use a bounded supported major and minimums supported by actual tests; current motion-token availability can set that minimum.

Copy the exact private-workspace tooling pins from `templates/toolchain-lock.json`, `templates/package.json`, `templates/.node-version` and `templates/.npm-version`; use Node 24.21.0 / pnpm 12.4.2 in normal CI and development, with npm 11.19.0 for release operations. Verify release metadata/integrity before installing; retain a committed lockfile. Project package resolution uses a 7-day `minimumReleaseAge` with strict/fail-closed timestamp handling; only exact version-specific exceptions for urgent security fixes are acceptable. Canary CI can intentionally test fresh Angular releases without mutating the release lockfile. Research source tags/PRs may be newer than that lockfile; resolve release baselines independently and check API availability against each branch's actual peers and advertised floors (see `docs/07-upstream-security-release.md`). See `templates/pnpm-workspace.yaml` and `docs/10-support-ci-publication.md`.

Make old NgModule declarations explicitly `standalone: false` if the chosen compiler requires it [A07]. Preserve NgModule APIs rather than converting everything to standalone. Test AOT/strict declarations, zoneless notifications and teardown. Avoid opportunistic signals rewrites.

## Package proof

Pack from the actual release directory and install in a separate clean consumer with **no workspace source aliases**. Test all runtime/testing subpaths, Sass exports, assets, production tree-shaking and schematic/CLI distribution. Explicit `exports` must resolve Sass with the chosen CLI/Sass importer. Test both package-root Sass resolution and every supported documented legacy import path. Do not promise deep/private Sass paths merely because a file happened to be shipped historically.

The static inspector is a precheck, not ng-packagr, a typechecker or a dependency security scanner. Runtime/type scans need import-aware follow-up where diagnostic strings create false positives. Tests and historical reference packages are never shipped.

## License and README

Copy `templates/LICENSE`; verify baseline notice against the tag [L01]. Keep Google's notice first and Ryan's next. Preserve applicable file headers; append attribution to changed work where appropriate without rewriting history or claiming authorship of unchanged upstream code. Update README and package metadata for actual project goals/status. Never publish with the upstream release workflows or credentials inherited unchanged.
