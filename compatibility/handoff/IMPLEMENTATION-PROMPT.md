# Implement the legacy compatibility library

Implement a working repository and verifiable release candidate in `~/ngx-compat/material` using this entire handoff. Do not stop at a new proposal. Canonical identity: `buu700/ngx-compat-material-legacy`, package `@ngx-compat/material-legacy`.

## Decisions you must not reopen to make a test pass

- Preserve complete baseline ancestry from `angular/components` tag `16.2.14`; start a normal `compat-main` descendant. Never squash-import, orphan, force-reset another branch or rewrite upstream history.
- Preserve all 21 historical legacy component entry points, `legacy-core`, actual historical testing entry points, and compatibility-specific public support. Implementation ownership is conditional: re-export genuinely identical current public APIs; own legacy presentation and removed internals.
- Use current Angular Material/CDK as shared peers, not nested runtime copies. Keep ordinary TypeScript imports under `@angular/material/*`; no current-API mirror or copied ordinary component suite.
- Establish the finite Material-16 Sass facade in `docs/03-sass-contract.md`. Own the historical M2 palette/theme/typography model locally from day one; upstream Material M2/backcompat APIs are reference oracles, not implementation dependencies. Do not tell consumers to rename palette variables, add `m2-` prefixes, reshape theme maps or rewrite their selectors. Never bulk `@forward` current Material. Source-only Sass migration is the default.
- Separate strict owned CSS parity from explicitly reported current-component/shared-infrastructure drift. Do not silently forward a historical mixin with changed semantics, suppress missing CSS with an empty mixin, or regenerate goldens to make failures disappear.
- Reuse public APIs only after checking behavior and identity. The implementation must not depend on upstream private, deprecated, compatibility-only, or announced-for-removal APIs. Current underscore/ɵ internals, deep imports, deprecated Material M2 Sass, compatibility color backfills, `any` casts concealing protocol mismatches and private Sass helpers are forbidden dependencies. Locally maintained historical implementation is allowed with provenance.
- Remove the deprecated animation engine from published runtime, declarations and harnesses. Preserve meaningful APIs and provide concrete, tested migrations for unavoidable engine-bound recipe exceptions. No fake metadata. Use current public `MATERIAL_ANIMATIONS` when present in the selected supported peer set; never call private `_getAnimationsState`.
- Use exact repository Node 24/pnpm 12 pins and an independently pinned release npm CLI from `templates/toolchain-lock.json`; preserve broader branch-specific consumer Node engines. Runtime/configuration checks are required, not floating CI versions.
- Keep research head separate from release baseline. Newer upstream sources are leads, not install pins; every consumed public API must exist at the tested branch baseline and advertised peer floor. Fresh canary code cannot enter release artifacts implicitly.
- Complete the upstream inventory with risk-weighted depth: evidence-backed batches are allowed for demonstrably low-risk changes; bugfix, security, lifecycle, accessibility, API and uncertain changes receive the semantic/deep review in `research/upstream-audit-policy.json`. Do not confuse complete classification with equal effort per commit.
- Require M2 legacy + current-Material/M3 coexistence using the owned-only aggregate; native M3/system-token theming of legacy controls is optional future scope. Do not add it to first-stable gates.
- Use a modern standalone Angular library build with partial compilation and explicit secondary/Sass exports. Preserve source/test history, not the old Bazel toolchain as a maintenance obligation. Explicitly account for v16 source files that referenced generated `.css` from `.scss`; the new build owns and tests that SCSS→CSS seam.
- Implement explicit `migrate-legacy`, package-owned future update migrations, and a peer-light distributable pre-upgrade CLI using one transformation engine. `ng-add` is optional. No application-level animation-provider removal, MDC migration or framework upgrade on the consumer's behalf.
- Retain Google's MIT notice/body and add `Copyright (c) 2026 Ryan Lester.` immediately after Google's notice. Do not add another person's notice, unconfirmed stewardship, release, audit or support claim.
- Consumer projects, Cyph and Flex Layout are out of scope. Public synthetic fixture applications are in scope. Remote writes/releases require verified authorization.

## Working method for reliable execution

Read the contract and task graph. Resolve exact tags, full SHAs and published package metadata. Seed design decisions are not evidence of compiled compatibility. Record a lockfile and actual source provenance. Complete generated inventories from the checkout before deleting any source; expand export-star/barrel chains using TypeScript tooling.

Use one component worksheet per task and small reviewable commits. Shared contracts (Sass values, token identity, motion policy, interop) have a single implementation owner; do not let parallel tasks invent conflicting helpers. When stuck, record the minimal failing reproducer and missing public capability. Do not broaden peer ranges or weaken tests to hide a blocker.

Build immutable historical reference evidence in isolated tooling, including source/API/declaration snapshots, Sass value/map snapshots, CSS output, and representative DOM. Seal reference artifacts with hashes so candidate work cannot silently regenerate the historical oracle. Test the candidate installed from an npm tarball. A source-only stylesheet change is not visual proof; run CSS comparisons plus stateful DOM/computed-style/browser tests. Report all current-component bridges. Production deployment remains a downstream decision.

Before claiming completion, reconcile every historical API/export, every worksheet, every golden difference, every relevant upstream candidate, and every delegated upstream API with explicit evidence. The static upstream API policy check must be clean, and known upstream deprecations/removal deadlines must be recorded in `future-breakages.json`. Record exact commands and results. Do not label unexecuted tests passed or scan leads confirmed vulnerabilities.

## Delivery

Deliver the actual repository, reproducible development lockfile, packed RC, public fixture application, migrated upstream tests, tested schematic/CLI, API/delegation/Sass inventories, exception migrations, before/after CSS/DOM reports, support matrix, and release-readiness report. Publication is separate. `docs/06-verification.md` defines release blockers; broader hardening may remain documented work only where it does not weaken a claimed capability.
