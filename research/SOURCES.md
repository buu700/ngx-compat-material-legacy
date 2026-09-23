# Primary research sources

Checked **September 23, 2026**. Sources are official documentation, tagged upstream code, and primary upstream changes. Technical assessments are static research, not a completed port or audit. GitHub release evidence does not establish npm publication. Research tags/PRs are not release dependency pins; selected aged published baselines and API availability are verified separately for each supported branch. See `docs/07-upstream-security-release.md`.

## Baseline, platform and publication

### B01 — Historical release baseline

https://github.com/angular/components/releases/tag/16.2.14

Tag 16.2.14 belongs to the historical baseline; resolve full ancestry locally.

### B02 — Historical legacy theme aggregation

https://raw.githubusercontent.com/angular/components/16.2.14/src/material/legacy-core/theming/_all-theme.scss

Names all legacy themed families and also ordinary companions. The aggregate is not legacy-only.

### B03 — Historical public Sass exports

https://raw.githubusercontent.com/angular/components/16.2.14/src/material/_index.scss

Use to inventory genuine legacy Sass exports and distinguish private/current helpers.

### B04 — Historical legacy core Sass

https://raw.githubusercontent.com/angular/components/16.2.14/src/material/legacy-core/_core.scss

Contains ripple/CDK structural setup as well as focus styling; duplicate emission must be assessed.

### B05 — Historical legacy form field

https://raw.githubusercontent.com/angular/components/16.2.14/src/material/legacy-form-field/form-field.ts

Shared MAT_FORM_FIELD, distinct legacy defaults, old animation import and public control integration are visible.

### B06 — Historical select public API

https://raw.githubusercontent.com/angular/components/16.2.14/src/material/legacy-select/public-api.ts

Includes the animation recipe export; removal requires a migration classification.

### B07 — Historical legacy-core public API

https://raw.githubusercontent.com/angular/components/16.2.14/src/material/legacy-core/public-api.ts

Contains many aliases to core exports; inventory their actual semantics instead of deleting wholesale.

### L01 — Baseline MIT license

https://raw.githubusercontent.com/angular/components/16.2.14/LICENSE

Google notice is Copyright (c) 2023 Google LLC.; preserve the license and add Ryan after that notice.

### A01 — Angular version compatibility

https://angular.dev/reference/versions

Verify exact framework/compiler/Node/RxJS compatibility before building or setting peer ranges.

### A02 — Angular Package Format

https://angular.dev/tools/libraries/angular-package-format

Reference for partial compilation, entry points and published package structure.

### A03 — Creating Angular libraries

https://angular.dev/tools/libraries/creating-libraries

Reference for Angular peers, supported build tooling, assets and consumer compatibility.

### A04 — Legacy animation API deprecation

https://angular.dev/api/animations/animate

The API is deprecated with an intent to remove it; this is not a guaranteed removal schedule.

### A05 — Schematics for libraries

https://angular.dev/tools/cli/schematics-for-libraries

Reference for ng-add/ng-generate/ng-update collections and distribution.

### A06 — Current enter/leave animation guidance

https://angular.dev/guide/animations

Native/browser or Angular enter/leave primitives may be selected according to supported versions and preservation needs.

### A07 — Current NgModule declaration requirements

https://angular.dev/guide/ngmodules/overview

Current Angular documents explicit `standalone: false` for NgModule declarations. Preserve the historical module contract when adjusting compiler metadata.

### U01 — Current upstream release observation

https://github.com/angular/components/releases

GitHub lists v22.2.0 on September 23, 2026. Npm publication is separately unverified.

### U02 — Current source package manifest

https://raw.githubusercontent.com/angular/components/v22.2.0/src/material/package.json

Shows export/peer/schematic structure, but build placeholders cannot determine installed versions.

### U03 — Current core public entry point

https://raw.githubusercontent.com/angular/components/v22.2.0/src/material/core/public-api.ts

Potential shared APIs exist; the entry point also exports private code, so export presence alone is not approval.

### U04 — Current datepicker input integration

https://raw.githubusercontent.com/angular/components/v22.2.0/src/material/datepicker/datepicker-input.ts

Consumes shared form-field and input-accessor tokens; provides a concrete mixed-version integration test target.

### U05 — Current Sass entry point

https://raw.githubusercontent.com/angular/components/v22.2.0/src/material/_index.scss

Inspect current public M2 helpers and component mixins rather than private source imports.

### U06 — Historical v17 update entry point

https://raw.githubusercontent.com/angular/components/17.0.0/src/material/schematics/ng-update/index.ts

Reference for testing the interaction between legacy import preparation and official Material update tooling.

### P01 — GitHub fork creation

https://docs.github.com/en/rest/repos/forks#create-a-fork

Fork settings include name and branch options; access must be established before remote changes.

### P02 — Npm trusted publishing

https://docs.npmjs.com/trusted-publishers/

Use configured supported OIDC publishing with owner-controlled permissions; setup is not assumed.

## Upstream adaptation candidates

These IDs also identify the machine-readable candidate ledger. Full diffs, exact SHAs, applicability and follow-up fixes must be verified during implementation. No earlier advisory or release is assumed to cover all selected peer versions.

### ANIM-01 — Material core drops the animation-module dependency

https://github.com/angular/components/pull/30459

Disposition to evaluate: **adapt checklist and dependency-boundary technique**. See the ledger for proposed regressions.

### ANIM-02 — Autocomplete CSS animation conversion

https://github.com/angular/components/pull/30356

Disposition to evaluate: **adapt to legacy DOM and historical lifecycle**. See the ledger for proposed regressions.

### ANIM-03 — Tabs animation conversion

https://github.com/angular/components/pull/30281

Disposition to evaluate: **adapt algorithm and tests**. See the ledger for proposed regressions.

### ANIM-04 — Form-field subscript motion conversion

https://github.com/angular/components/pull/30354

Disposition to evaluate: **adapt legacy-specific subscript implementation**. See the ledger for proposed regressions.

### ANIM-05 — Snack-bar animation conversion

https://github.com/angular/components/pull/30381

Disposition to evaluate: **adapt lifecycle/controller**. See the ledger for proposed regressions.

### ANIM-06 — Select animation conversion

https://github.com/angular/components/commit/a44b34794b129ba127206f7cf74c7c0a8a54be88

Disposition to evaluate: **adapt relevant lifecycle and motion**. See the ledger for proposed regressions.

### ANIM-07 — Menu lifecycle decoupled from animations

https://github.com/angular/components/pull/30148

Disposition to evaluate: **adapt owned lifecycle**. See the ledger for proposed regressions.

### ANIM-08 — Current dialog native-motion implementation

https://raw.githubusercontent.com/angular/components/v22.2.0/src/material/dialog/dialog-container.ts

Disposition to evaluate: **reference implementation; no private inheritance**. See the ledger for proposed regressions.

### ANIM-09 — Current tooltip implementation

https://raw.githubusercontent.com/angular/components/v22.2.0/src/material/tooltip/tooltip.ts

Disposition to evaluate: **reference public behavior and internal algorithm**. See the ledger for proposed regressions.

### SEC-01 — CDK media-matcher CSS injection hardening

https://github.com/angular/components/commit/e8f34190606a706e27b594ad84543fad62dd24e8

Disposition to evaluate: **inherit from verified patched current CDK**. See the ledger for proposed regressions.

### SEC-02 — Trusted Types createPolicy clobbering guard

https://github.com/angular/components/pull/33410

Disposition to evaluate: **inherit through CDK; inspect owned equivalents**. See the ledger for proposed regressions.

### SEC-03 — CSP nonce setAttribute correction

https://github.com/angular/components/pull/28800

Disposition to evaluate: **inherit or adapt only where a copied code path remains**. See the ledger for proposed regressions.

### CDK-01 — Deprecated portal symbol removal

https://github.com/angular/components/pull/30584

Disposition to evaluate: **adapt callers to current public API**. See the ledger for proposed regressions.

### CDK-02 — CDK a11y v22 breaking changes

https://github.com/angular/components/commit/7426334c5efb76ac3f359e26a7f6e48e29d4ec78

Disposition to evaluate: **inspect and adapt current public usages**. See the ledger for proposed regressions.

### CDK-03 — Table rows update when row definitions change

https://github.com/angular/components/pull/33670

Disposition to evaluate: **inherit through verified current CDK; add legacy regression**. See the ledger for proposed regressions.

### ROB-01 — Bottom-sheet animation event ownership

https://github.com/angular/components/commit/fb4478bff31976f6179fde21f800f1326395f707

Disposition to evaluate: **reference technique in owned motion controllers**. See the ledger for proposed regressions.

### ROB-02 — Stepper validates animation durations

https://github.com/angular/components/commit/30942bcd3640efd7f3980044144dd1fc8b10e8f3

Disposition to evaluate: **reference validation for owned duration APIs**. See the ledger for proposed regressions.

### ROB-03 — Preserve externally supplied aria-describedby

https://github.com/angular/components/pull/30699

Disposition to evaluate: **reproduce and adapt in owned form control layer**. See the ledger for proposed regressions.

### ROB-04 — Select closes on overlay detach

https://github.com/angular/components/pull/30634

Disposition to evaluate: **adapt if equivalent owned state bug exists**. See the ledger for proposed regressions.

### ROB-05 — Dialog focus consistency zoneful/zoneless

https://github.com/angular/components/pull/29192

Disposition to evaluate: **adapt owned scheduling; inherit CDK pieces**. See the ledger for proposed regressions.

### ROB-06 — Dialog close ignores aria-disabled activation

https://github.com/angular/components/pull/33373

Disposition to evaluate: **reproduce and adapt where the same contract applies**. See the ledger for proposed regressions.

### SASS-01 — Core Sass compiler-warning modernization

https://github.com/angular/components/pull/33040

Disposition to evaluate: **adapt equivalent public Sass syntax**. See the ledger for proposed regressions.

### API-01 — Current public form-field control protocol

https://raw.githubusercontent.com/angular/components/v22.2.0/src/material/form-field/form-field-control.ts

Disposition to evaluate: **evaluate and implement compatible owned protocol**. See the ledger for proposed regressions.

### API-02 — Current ripple directive and public configuration

https://raw.githubusercontent.com/angular/components/v22.2.0/src/material/core/ripple/ripple.ts

Disposition to evaluate: **delegate only after visual and identity proof**. See the ledger for proposed regressions.

### THEME-01 — Current M2 public Sass API

https://raw.githubusercontent.com/angular/components/v22.2.0/src/material/_index.scss

Disposition to evaluate: **adapt through owned small theme-input bridge**. See the ledger for proposed regressions.


## Sass facade, motion and verification sources

### SASS-02 — Historical core responsibilities

https://raw.githubusercontent.com/angular/components/16.2.14/src/material/core/_core.scss

The old mixin includes ripple, CDK a11y/overlay/text-field setup and focus styles. Preserve responsibilities with current infrastructure checks; do not overwrite new CDK behavior with stale CSS merely to force a diff to pass.

### SASS-03 — Current core mixin is empty

https://raw.githubusercontent.com/angular/components/v22.2.0/src/material/core/_core.scss

The inspected `core()` body is a no-op. Do not forward it under the historical facade and claim structural equivalence.

### SASS-04 — Current palette namespace and M2 exports

https://raw.githubusercontent.com/angular/components/v22.2.0/src/material/_index.scss

Historical M2 exports are prefixed; overlapping unprefixed palette names expose the newer palette family. The facade must preserve old meaning rather than wholesale-forward current exports.

### SASS-05 — Historical typography aggregate

https://raw.githubusercontent.com/angular/components/16.2.14/src/material/legacy-core/typography/_all-typography.scss

Its membership/order differs from the theme aggregate and it supplies historical default typography. Use the explicit composition inventory rather than assuming all aggregates are interchangeable.

### SASS-06 — Historical color aggregate

https://raw.githubusercontent.com/angular/components/16.2.14/src/material/legacy-core/color/_all-color.scss

Extracts color configuration, rejects missing color and delegates to the historical theme aggregate with typography/density null. Preserve that behavior and composition responsibility.

### SASS-07 — Historical typography helper signatures

https://raw.githubusercontent.com/angular/components/16.2.14/src/material/core/typography/_typography-utils.scss

Distinguishes helper functions from the `font-shorthand` and `typography-level` mixins. Resolve exact signatures from source when implementing the facade.

### SASS-08 — Historical specialized token helper

https://raw.githubusercontent.com/angular/components/16.2.14/src/material/core/tokens/m2/_index.scss

`m2-tokens-from-theme` is a function tied to the historical token representation. Its source visibility is not a license to substitute an unrelated modern map; treat it as an explicit specialized-helper review.

### SASS-09 — Sass module introspection

https://sass-lang.com/documentation/modules/meta/

Use real module-variable/function/mixin metadata to reconcile the finite source inventory. Choose an introspection compiler supporting the APIs; do not assume all were available in the historical project's original Sass version. Introspection is a separate leg from behavior capture.

### SASS-10 — Dart Sass compileString API

https://sass-lang.com/documentation/js-api/functions/compilestring/

Reference for the local JS fixture runner. Actual installed Sass compilation remains required; mocked runner tests provide no Sass correctness evidence.

### MOTION-01 — Current shared public motion configuration

https://raw.githubusercontent.com/angular/components/v22.2.0/src/material/core/animation/animation.ts

Public `MATERIAL_ANIMATIONS` and `AnimationsConfig` describe current shared motion settings. The inspected private helper also reads core `ANIMATION_MODULE_TYPE` and reduced-motion preference. Reuse public identities; implement owned state/lifecycle behavior without importing the private helper or copying process-global state without SSR analysis.

### CORE-01 — Current common behaviors

https://raw.githubusercontent.com/angular/components/v22.2.0/src/material/core/common-behaviors/index.ts

Inspect actual publicly supported replacements. An exported underscore helper is not a supported dependency; old mixins may need small owned implementations.

### CORE-02 — Current date identities

https://raw.githubusercontent.com/angular/components/v22.2.0/src/material/core/datetime/index.ts

Shared date adapters, tokens, modules and providers are candidates for genuine legacy aliases, with identity and form-field interop tests.

### CORE-03 — Current line helper visibility

https://raw.githubusercontent.com/angular/components/v22.2.0/src/material/core/line/line.ts

The directive and utility visibility must be distinguished. `setLines` is marked docs-private in the inspected source; do not depend on it simply because it is exported.


## Final support / maintenance policy sources

### REL-01 — Angular release/support schedule

https://angular.dev/reference/releases

As checked 2026-09-23: Angular 22 active through June 2027/LTS through June 2028; Angular 21 LTS through June 2027; Angular 20 LTS through November 28, 2026.

### REL-02 — Angular Node/TypeScript/RxJS compatibility

https://angular.dev/reference/versions

Angular 22 requires TypeScript >=6.0 <6.1 and newer Node; Angular 21 requires TypeScript >=5.9 <6.0. Both list RxJS ^6.5.3 || ^7.4.0. Reverify exact selected releases.

### SUPPLY-01 — pnpm minimumReleaseAge / trust settings

https://pnpm.io/settings/dependency-resolution

`minimumReleaseAge` is measured in minutes and applies to transitive dependencies. Current pnpm supports strict behavior, exact-version exclusions, missing-time fail-closed behavior and optional trust no-downgrade checks.

### CI-01 — GitHub-hosted public runners

https://docs.github.com/en/actions/reference/runners/github-hosted-runners

Standard GitHub-hosted runners are currently free/unlimited for public repositories; larger runners remain billable.

### PUB-01 — npm trusted publishing

https://docs.npmjs.com/trusted-publishers/

GitHub Actions OIDC trusted publishing avoids long-lived tokens and automatically emits provenance for public repo/public package publication. Trust can be configured for stage-only publishing.

### PUB-02 — npm staged publishing

https://docs.npmjs.com/staged-publishing/

`npm stage publish` defers public availability until a maintainer reviews/approves with 2FA. It requires the package already to exist on npm.

### TS-01 — TypeScript 7.0 compiler API transition

https://devblogs.microsoft.com/typescript/announcing-typescript-7-0/

TypeScript 7.0 does not ship the old programmatic API; Microsoft provides `@typescript/typescript6` for tools needing the TypeScript 6 API during the transition.

### SEC-ANG-01 — Directive host-binding sanitization advisory

https://github.com/angular/angular/security/advisories/GHSA-hh8m-fm6v-7cvg

Patched in Angular 21.2.20 and 22.1.0; use as one dated input to minimum peer/toolchain security floors, not as the only advisory review.

### SEC-ANG-02 — Malformed DOCTYPE Angular SSR DoS

https://github.com/angular/angular/security/advisories/GHSA-f67j-2jqw-jpq7

Patched in platform-server 21.2.23 and 22.1.6. The library need not peer-depend on platform-server when unused, but SSR test environments must be security-patched.

### FUT-01 — Current table recycle directive removal

https://raw.githubusercontent.com/angular/components/v22.2.0/src/cdk/table/table.ts

`CdkRecycleRows` is a deprecated no-op scheduled for removal in v23; current `CdkTable` itself exposes a public `recycleRows` input. Preserve the legacy directive locally without delegating to the doomed directive/private repeater strategy.


## Toolchain and publication source register (checked 2026-09-23)

### TOOL-01 — Node 24.21.0 LTS

https://nodejs.org/en/blog/release/v24.21.0

Official release entry is dated September 8, 2026. Selected private-repository Node pin; platform checksum/signature verification still belongs to bootstrap.

### TOOL-02 — pnpm 12.4.2 release

https://github.com/pnpm/pnpm/releases/tag/v12.4.2

Official release page shows September 15, 2026 (rechecked September 23). The notes cover POSIX executable-shim and credential-link hardening plus install/lockfile fixes. Reinstall dependencies so updated shims are generated; Cygwin/MSYS2/WSL still have a documented PATH-based limitation. The release date clears the seven-day selection rule. Registry publication time, artifact integrity, platform binaries and actual execution remain separate bootstrap checks; this page alone is not verified installation evidence.

### TOOL-03 — pnpm12 installation requirements

https://pnpm.io/installation

Native pnpm12 runs independently of Node after installation. npm-based bootstrap requires Node22.13+. Bootstrap under Node24 before testing older consumer runtimes. Pin and verify any additional installer package rather than using floating npx/curl commands.

### TOOL-04 — pnpm CLI mismatch policy

https://pnpm.io/settings/cli

Use `pmOnFail: error` to fail on package-manager mismatch. Older package-manager-management option names have been replaced; do not copy obsolete settings.

### TOOL-05 — Release npm CLI pin

https://github.com/npm/cli/releases/tag/v11.19.0

Select npm11.19.0 for release tooling (official GitHub release July 29, 2026). This satisfies the staged-publishing floor; it is not a claim that npm11 is the newest major. Advance it deliberately after age/security and CLI-output tests.

### PUB-03 — Public scoped first publication

https://docs.npmjs.com/creating-and-publishing-scoped-public-packages/

Require explicit public access for the initial scoped package publication. Retain `publishConfig.access: public` and verify the final package metadata.

### CI-02 — Pull-request dependency review

https://github.com/actions/dependency-review-action

The official action compares dependency changes in PRs. Run it on pull_request with least privileges and SHA-pinned actions, including development and unknown scopes as well as runtime dependencies.
