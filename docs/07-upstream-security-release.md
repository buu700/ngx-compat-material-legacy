# 7. Upstream adaptation, security and release policy

## Selective upstream ownership

Retain upstream remotes for evidence/source comparison. Do not regularly merge current Angular Components into this deliberately divergent tree. Each candidate in `research/upstream-candidates.json` is a lead: verify full diff/commit, find the equivalent owned path, reproduce the issue, adapt the smallest compatible fix or record why it is inherited/not applicable. Review follow-up fixes, not only the first conversion commit.

Current CDK/Material peers automatically maintain only delegated code. A copied legacy implementation does not receive a modern equivalent's fix merely because package.json is current. No package-version freshness claim is a security audit.

## Research head is not a release baseline

Keep two explicit records per supported line: **research head** (upstream source/full SHA examined for fixes and design references) and **release baseline** (exact published packages, integrity, peer manifests, lockfile hash and executed compatibility tests). `research/version-observations.json` keeps those roles separate; the release baselines are deliberately unresolved until bootstrap.

The research head may be newer than the seven-day dependency-age window, and may include a prerelease. That is permission to read and compare source, **not** to install it in a release lockfile or advertise support. References to `v22.2.0`, `main`, a PR or a newer API in a worksheet are research leads, not dependency pins. The dated `v22.2.0` source observation is not proof of npm publication, sufficient age or compatibility with either branch.

Resolve a compatible, aged, security-patched **published** framework/compiler/CLI/Material/CDK set independently for 22.x and 21.x; exact minor/patch equality across projects is not a substitute for checking their real peer manifests. For every upstream API used by the implementation, verify its presence and semantics in the exact packed baseline **and the advertised minimum peer version**, not just research-head source. Record API availability by branch in the delegated-API ledger. A newer helper must not leak into the 21.x build simply because it exists in the research reference.

If a relevant fix is newer than the baseline, record it immediately. Adapt the fix to owned code using supported APIs, or document an exact-version urgent exception for a fixed peer and test the resulting graph. If neither is safe, block the affected release. Do not weaken security floors to meet the age rule, silently widen age exclusions, or mark a fix "inherited" until the selected peer actually contains it. Disposable fresh/next canaries remain separate from release locks, credentials and artifacts.

## Initial exhaustive delta audit, then incremental monitoring

Before the first RC, enumerate all relevant changes from 16.2.14 through the explicitly recorded research head. Expand the path set with source closure, modern equivalents, Material core, CDK primitives, accessibility/overlay/focus/table/forms infrastructure, and theming/token code. This is **complete classification with risk-weighted review**, not equally deep manual inspection of every commit.

`research/upstream-audit-policy.json` defines the review contract. Every enumerated full commit SHA must receive an individual disposition or membership in a named, evidence-backed batch. There must be no missing SHAs, blanket wildcard coverage, unresolved sensitive entries hidden in batches, or invented applicability claims.

| Change class after inspecting affected paths/diff | Minimum treatment |
|---|---|
| Documentation, tests or demonstrably behavior-neutral refactors | May be batch-dispositioned after checking that the diff introduces no runtime, contract, build/security or regression-test signal |
| Build/tooling-only work | Batch only when it has no relevant dependency, code-generation, publishing, supply-chain or emitted-artifact effect; otherwise escalate |
| Features unrelated to preserved or delegated behavior | May be batched with an applicability rationale and explicit SHA list |
| Runtime bugfixes; accessibility, focus, overlay, motion or teardown changes | Individual semantic review against the preserved/delegated path, with a reproducer or regression test where applicable |
| Security fixes, hardening, sanitization, CSP/Trusted Types, URL/HTML/style sinks, dependency/publishing integrity | Individual deep review: affected path/version, reachability, impact, selected-baseline applicability, and fix/test or evidenced non-applicability |
| Public API/deprecation/removal, Sass/token/DOM contract changes | Individual compatibility review for both supported branches; check the future-breakage and exception ledgers |
| Mixed or uncertain changes | Escalate to the highest relevant depth; uncertainty never qualifies a change for cheap dismissal |

Titles and paths are initial signals, not final classification. A test-only fix may disclose a real legacy defect; a build change may be a supply-chain fix. Batches must list exact SHAs, shared rationale, evidence, classifier/reviewer identity and any sampling/escalation performed. Reopen/split a batch when those assumptions fail.

Final dispositions remain `inherited`, `not-applicable`, `already-baseline`, `adapt`, `test-only`, and `do-not-adopt`. `security-review` is a **pending** disposition, never a completed security finding. An `adapt` or `test-only` entry closes only when the corresponding change and required tests have evidence; an `inherited` entry names the exact selected peer and the commit/fix it contains. Classify each supported branch separately when inherited status differs.

Before claiming completion, reconcile the raw inventory with individual records and batches, report coverage and unresolved items, and resolve sensitive blockers. The inventory helper does not perform that semantic audit and its output cannot prove security clearance. After the initial pass, retain dispositions and review incremental releases/advisories rather than re-reading the same history.

Security-oriented searches include DOM/HTML/style sinks, Trusted Types, CSP nonces, dynamic stylesheet construction, URL/attribute assignment, focus traps, keyboard escape paths, overlay disposal, ARIA relationships, event-target assumptions, SSR/hydration DOM, teardown/subscription leaks and any current fix whose equivalent code was copied into this project.

AI-reported findings remain leads until a reproducer, affected code path/version, reachability and impact are established. Coordinate nonpublic findings through the project/upstream security channels. No automatic patch publication based only on an AI report.

## Known current security floors are inputs, not eternal constants

Angular has published 2026 security advisories affecting framework/core/SSR patch levels. Re-evaluate all current Angular advisories immediately before choosing branch minimums. As dated examples, the August 2026 directive-host sanitization advisory was patched in Angular 21.2.20 and 22.1.0, and the September 2026 malformed-DOCTYPE SSR DoS was patched in platform-server 21.2.23 and 22.1.6. Do not advertise an older floor merely because it compiles. The package should avoid pinning `@angular/platform-server` unless it actually imports it, but SSR fixture/test environments must also be on patched releases.

Reference leads already include CDK media-query CSS injection, Trusted Types policy guards, CSP nonce handling, form description preservation, overlay/dialog lifecycle fixes and table row-definition fixes. `research/future-breakages.json` records known planned removals and resolved cliffs.

## Upstream dependency policy

The public API of this project is intentionally historical; its implementation dependencies must not be historical by accident. Stable releases must not depend on upstream private, underscore/ɵ, deep-internal, deprecated, compatibility-only, or documented-for-future-removal APIs. `docs/11-upstream-api-policy.md` defines enforcement.

If a delegated stable upstream API later becomes deprecated, stop delegating before its removal: switch to its stable replacement or absorb the small behavior locally. The scheduled canary job checks Angular `next` and the future-breakage ledger so maintainers see the cliff before a supported major requires action.

## Version/support policy

Package major follows Angular major. Initial release lines:

- `22.x`: Angular/Material/CDK 22 active line, developed on public `main`; first publication `22.0.0-rc.N`, then `22.0.0` once gates pass.
- `21.x`: Angular/Material/CDK 21 LTS maintenance line on branch `21.x`; first publication `21.0.0-rc.N`, then `21.0.0` once gates pass.

Do not initially add Angular 20 solely because it is still briefly in LTS; add older lines only for demonstrated demand and maintainers who accept the cost. When Angular 23 becomes active, move `main` to 23.x and cut/retain 22.x as the immediately preceding supported/LTS line; retire 21.x with Angular's support window unless explicitly extended.

Patch numbers belong to this project and do not mirror upstream Material patch numbers. Each major branch pins its own dev toolchain/lockfile and advertises only tested peer ranges. Tighten a peer floor for required bug/security fixes instead of claiming every version in the major works.

## Supply-chain policy

Use pnpm's project configuration with a 7-day (`10080` minute) `minimumReleaseAge`, strict resolution and `minimumReleaseAgeIgnoreMissingTime: false`. This applies to transitives too. Exceptions must name exact package versions and be justified by a documented urgent security/compatibility fix; never exempt an entire broad namespace merely for convenience. Canary CI may intentionally resolve fresh Angular releases in a separate disposable environment without committing them to the release lockfile.

Evaluate pnpm `trustPolicy: no-downgrade` after the baseline dependency graph is known; enable it if it does not require a fragile pile of permanent exceptions. Pin the package-manager version through root `packageManager` and an explicitly verified bootstrap, then use frozen lockfile installs in release jobs. Do not assume the image-provided Corepack/installer supports pnpm12 or bypasses the tool age policy; see `docs/10-support-ci-publication.md`.

## GitHub Actions CI

Use GitHub Actions on standard GitHub-hosted runners; standard runners are free/unlimited for public repositories according to current GitHub documentation. Avoid larger runners unless a maintainer explicitly accepts billing.

Required workflow roles:

1. **PR CI:** dependency review against PR base/head, toolchain-pin/runtime checks, format/lint/static policy checks, build/types/API reference, unit/harness tests, Sass value/CSS references, schematic/CLI tests, `npm pack` and clean-consumer install.
2. **Browser CI:** comprehensive Chromium PR coverage; Firefox/WebKit high-risk PR smoke and fuller main/nightly coverage.
3. **Supported-major CI:** exact 21.x/22.x branch matrices, zoneful+zoneless, SSR smoke, primary RxJS plus any advertised compatibility smoke.
4. **Canary:** scheduled current-latest plus Angular/Material/CDK `next`; nonblocking but opens/updates a maintenance issue when a meaningful incompatibility appears.
5. **Security:** CodeQL and scheduled package-manager audit/scans; PR dependency review belongs to PR CI, not a context-free nightly job.
6. **Release:** exact tarball gates followed by authorized staged publication.

Pin third-party actions to immutable commit SHAs, not floating tags. `scripts/check-workflow-pins.py` enforces this. Dependabot/pnpm update tooling can propose SHA updates for review.

## npm publishing

Use npm Trusted Publishing/OIDC from a GitHub-hosted release workflow once the package/repository are authorized. For a public repository/public package, npm automatically creates provenance attestations under trusted publishing.

After the package exists on npm, prefer **staged publishing**: configure the trusted publisher for `npm stage publish` only; CI stages the exact tested artifact and a maintainer reviews/approves it with 2FA before it becomes live. npm staged publishing cannot bootstrap a brand-new package, so the first publication requires an authorized `npm publish --access public` of the tested RC under a prerelease dist-tag. Verify exact `repository.url`, install the explicitly pinned npm CLI (staging needs >=11.15.0), and switch to stage-only trust immediately afterward. Follow the exact-artifact and dist-tag checks in `docs/10-support-ci-publication.md`. Never keep a long-lived CI token with bypass-2FA publishing permission merely for convenience.

Release notes list API exceptions, ordinary/shared rendering boundary, exact peer support, security fixes, known current-component drift and migration instructions.

Use `research/adaptation-recipes.md`, `research/support-policy.json`, `research/future-breakages.json`, `research/upstream-api-policy.json` and `research/version-observations.json` as dated inputs. Publication/toolchain metadata must be revalidated at release time.
