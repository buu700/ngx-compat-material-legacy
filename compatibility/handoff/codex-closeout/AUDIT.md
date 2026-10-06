# Phase two — complete audit of all maintained work

## C05-to-audit context transition

At C05, freeze an actual committed review checkpoint for each source line. Prepare a factual handoff using the existing repository/evidence records: this package, repository access, both C05 commits/trees, the source-change index and complete scoped inventory, exact run/artifact/report identities with retrieval instructions, and factual open findings and owner-only blockers. These inputs must be sufficient without any earlier conversation.

If the environment supports a fresh Codex context or independent review subagent, use it to conduct A01–A10 on those checkpoints. Do not preload the closeout conversation or implementation reasoning, and do not ask the reviewer to agree with a completion narrative. The reviewer should form initial observations from source, independent oracles and raw execution evidence before consulting implementation rationales where practical. Keep those rationales and known defects available in their original records for audit; the context boundary is not permission to suppress contrary evidence or safety-critical facts.

A fresh audit-phase launch verifies the supplied C05 identity and begins the complete A01–A10 scope, not another C00–C05 pass. Findings can reopen repairs; every repair requires regression tests and affected re-review. Record `separate-context` or `separate-reviewer` only when that separation actually occurred, using the existing audit-coverage schema. If no fresh reviewer can be started, record `same-agent-explicit`, explain the capability limit, and continue the complete audit with independent oracles, mutation/negative probes and explicit assurance limitations. The absence of a subagent is neither permission to omit review nor a reason to claim external certification.

## Coverage contract: complete means accounted for, not sampled

Audit the entire candidate at the closeout checkpoints on both lines, including Codex's own repairs and decisions. The current 18/20 and 17/20 labels, Grok's review queue and even a later 20/20 result are inputs to challenge. They are not the audit boundary. Sampling is useful to find weak patterns early; it is not a sufficient stopping rule.

Build a compact coverage inventory from tracked files and actual package/build/test dependency graphs. Include every maintained production TS/template/style file, primary/testing/schematic entry point, runtime helper, copied or adapted test, reference generator/fixture/golden, migration source/bundle, verifier/scanner/report writer, package/toolchain/CI/release configuration, dependency/vendor inventory, exception/decision record and public/maintainer document. Account for removed upstream code and source mapping where retirement affects the product. The repository contains old research/status evidence: classify its applicability and ensure active tools do not consume it as fresh proof; do not mechanically re-review each obsolete note as if it were shipping code.

For each path or exact justified homogeneous batch, record source hash/line, origin, audited baseline/delta, review depth/method, reviewer, findings, regressions and closure. `templates/audit-coverage.schema.json` is a field guide, not a new runtime subsystem. Review all changed semantics against the original 16.2.14 or applicable current-peer source and relevant history, not only the final diff from this handoff. Cross-line identical bytes may share a content review record, but branch context, installed peers, packaging and execution evidence are still independently checked.

Immutable authenticated upstream/reference bytes can be covered by identity/provenance plus contextual compatibility/security review. Generated files can be covered by generator/input review and reproducible output verification; independently inspect representative outputs and any anomalies. These are justified methods, not blanket exclusions. Every 1697-SHA/1736-use audit entry needs a final defensible disposition; individual inspection is mandatory where risk or uniqueness requires it. Inventory omissions, unavailable source and incomplete review stay visible.

A domain is complete only when its full scoped set is covered, findings have fixes or legitimate nonblocking dispositions, and required tests/decisions are recorded. Stop-the-line vulnerabilities should be repaired promptly, but review resumes across all remaining domains. Avoid broad stylistic rewrites: they obscure review and create fresh unreviewed changes.

## A01 — Product surface, component semantics and ownership

Review every owned legacy family, shared/core primitive and internal replacement in `projects/ngx-material-legacy/`, not only the latest failing components. Trace each upstream-to-owned boundary and the original behavior it preserves. Inspect TypeScript, templates, host bindings and styles together. Confirm conventional package consumers and the frozen API/feature set; remove accidental unrequested modern features only with a compatibility-safe repair and explicit tests.

Review form-control value/accessor/touched/dirty/disabled semantics, selection/value equality, keyboard interaction, focus order/restoration, accessible roles/names/states, overlay placement/scroll/stacking, lifecycle/cancellation, subscriptions and teardown, race conditions and detached views. Inspect defaults for dialog/snack/menu/select/tabs and legacy input/form-field error/placeholder/label behavior. Review list/table/data-source ownership and change propagation, virtualized/dynamic data where actually promised, slider/chips interactions, progress motion, ripple/pseudo-checkbox/option behavior and all copied legacy helper code.

Compare each changed historical assertion with the guarantee it used to exercise. A component test succeeding after a behavior change is not sufficient evidence that the old contract survived. Review constants, event order, defaults, ARIA and disabled/invalid branches as well as the happy path. Engine-removal internals may change; observable geometry/focus/completion cannot silently disappear.

**Required result:** every owned family and shared primitive has contextual review coverage, meaningful regressions for repairs, and no unjustified API/behavior addition or loss.

## A02 — Public API, declarations, DI and stable dependency boundaries

Independently derive primary/testing export and declaration obligations from authenticated original sources/packages. Review aliases, type/value namespaces, runtime enums versus erased const enums, overloads, generic defaults/constraints, inheritance/public/protected members, accessors, providers/tokens, injection identities, declaration metadata and subclass usage. Verify `LEGACY_VERSION`'s intended peer identity and separate package version semantics. Review every accepted extra/removal/exception and stale deprecation/doc notice.

Audit `api-completeness.mjs`, `api-surface.mjs`, DI observers, allowlists and their expected input derivation. A member-name list, successful import, source-text needle or a blanket skipped shape is not a signature/identity proof. Test broken type/overload/runtime-token/subclass and hidden entry-point cases. TypeScript compilation must use the candidate declarations with `skipLibCheck:false`; strict AOT templates and testing consumers must exercise the promised usage.

Audit source and packed dependency-policy scanners semantically. Direct private/docs-private/deprecated imports/members are not acceptable merely because a barrel exposes them. Distinguish Angular-generated private metadata or a public service's own internal implementation from authored use. Inspect lazy imports, reexports, inherited members, testing paths, Sass references and dynamic code that a scanner might miss. Verify exact installed public-peer member availability at each floor.

**Required result:** complete declaration/runtime-identity and authored-boundary audit, robust negatives, narrow justified differences and no classification loophole concealing a shipped dependency.

## A03 — Historical tests, shared cases and oracle integrity

Reconcile all 57 original spec paths and their authenticated hashes, transitive shared suites and actual cases. The 2152 executed count includes different kinds of observations; recover the exact registry's product/control/shared identities rather than using an arbitrary total as the contract. Account for every removal, rewrite, renamed assertion, disabled suite and obsolete engine-specific expectation. Do not count a shared case twice or let its absence disappear in a total.

Read all adapter/shim/build/entry/reporter logic in `testing/legacy-runner/` and related scripts. Inspect transformation before versus after bundling, event helpers, fake timers, async scheduling, application reset, material/CDK shared-test copies and mock providers. Prove artifact-mode runtime dependencies resolve to the extracted candidate rather than workspace dist/source, an upstream current component or an undecorated local implementation helper. Test plain-helper leakage, missing export, excluded original case, zero discovery, duplicate test ID, unknown family and false runner success. Control failures belong to controller evidence, not product coverage.

Authentic original oracles remain immutable; generator changes need independent input and content review. Look for candidate-derived goldens, normalizers that erase order/selector differences, assertion narrowing, marker-only probes, swallowed exceptions, test-time API manipulation that substitutes for real behavior and result writers that invent success. Investigate flaky tests with deterministic environment/event reasoning; do not add blind retries or reduce required assertions. The separate instrumented inherited-coverage run's two failures must remain explainable, not be erased because ordinary CI passed.

**Required result:** complete original-to-executed reconciliation, reviewed test/fixture changes and proof that weakening or bypassing a representative real contract is detected.

## A04 — Sass, public theme API, peer bridges and rendered coexistence

Audit the full Sass facade/export/configuration and reachable dependency closure, all values/maps/function/mixin behavior, typography generations, aggregate membership/order and historical owned CSS/DOM. Review the 651-case inventory's completeness, argument tables and equality logic. A variable or mixin's existence is not behavior; one default theme is not all supported configuration. Empty CSS from a debug fixture may still carry essential values. Inspect the six C02 decisions and every branch-specific difference anew, including Codex's own approved technical classifications.

Audit all thirteen companion bridges and their public current-peer override calls, token allowlists, defaults and absence/N/A rationale for base/color/typography/density. Trace the independent oracle source: it must not import candidate mapping or use both subjects' contaminated shared state to derive agreement. Check light/dark, arbitrary supplied palette/configuration, typography, density, RTL, state, nesting and real bottom-sheet/date-picker/body overlays. Compare actual component-consumed computed properties, not only root custom properties. Confirm candidate/oracle matching does not hide a missing render or selector.

Audit packed M2/M3 inclusion in both orders, lazy/nested scopes and shared global styles. Preserve the owned-only aggregate. Current infrastructure may legitimately differ from v16, but review accessibility, disabled/focus/ripple/pseudo-checkbox and layering interference. Validate negative wrong value, extra/missing token, incorrect host/scope, missing oracle, identical borrowed oracle, hidden load path and tampered expected CSS. Private helpers may be used only in isolated authentic oracle research if justified, never as a shipped consumer obligation.

**Required result:** complete owned and current-companion scope, independently justified exceptions, actual rendered peer-aware behavior on both lines and no leaked archived/undeclared Sass dependency.

## A05 — Real browsers, native motion, zoneless updates, CSP and SSR

Reconcile the actual declared browser matrix with the product contract and applicability rules. Run every required engine/runtime/state identity; do not fan one observation across uninstantiated labels. Review all families and high-risk overlays, real pointer/keyboard/focus/form state changes, LTR/RTL, themes/densities and geometry. Chromium broad coverage and targeted Firefox/WebKit must meet the actual release matrix. WebKitGTK is not automatic Safari certification; hydration is not implied by SSR. Do not widen or shrink advertised support without a decision.

Inspect browser installers/drivers/profile/cache keys, actual binary/version detection, server lifecycle/ports, completion detection, hidden dependencies and test-fixture compiler settings. Direct component API calls are legitimate API tests but not substitutes for user-interaction tests. Verify genuine zoneless notification-driven updates without a hidden Zone import, forced driver-side change detection, application tick or stabilization crutch. Historical test adapters and UI interaction tests have distinct valid roles; do not outlaw useful low-level tests indiscriminately.

Audit enabled/provider-disabled/zero/reduced motion, preference changes, interruptions/reversal/reopen/destroy, missing/descendant/wrong-element events, reduced-motion late updates, timeout fallback and exactly-once notifications. Review native layout responsibilities originally supplied by animation-state styles. Inspect event listeners/timers and subscriptions for cross-instance leaks and shutdown behavior.

Test CSP dynamic styles with correct, missing and wrong nonce using actual enforcement; distinguish per-surface dynamic style requirements from a shared probe. Inspect SSR with no ambient browser globals, fresh platform/request lifetimes, no leaked timers/state and safe error paths. Audit DOM insertion/sanitization, icon/HTML/URL content and Trusted Types boundaries where applicable. Avoid importing unrelated product features into the required scope.

**Required result:** complete browser contract plus reviewed execution/fixture integrity, robust motion/lifecycle/CSP/SSR negatives and honest platform limitations.

## A06 — Migration, CLI/schematic, transaction and filesystem safety

Audit the pure transformation engine, both packaged frontends, bundling and supported Node/runtime closure. Compare TS parser/traversal and Sass rewriting against comments, strings/template strings, type-only and literal dynamic imports, aliases/reexports/testing, configured namespaces and mixed generation. Unsupported/nonliteral/private/recipe cases must produce accurate file/line guidance and whole-workspace refusal when promised. Preserve unrelated selectors/palettes/providers and user data.

Audit staged planning/apply semantics, dry-run equivalence, idempotence, concurrent edits, atomicity/recoverability, partial write failure, rename/permission errors, symlink/path traversal, workspace bounds, excluded files, encodings/line endings, error reporting and CLI exit status. A rollback must not overwrite a user's intervening modification. Large files/unsupported syntax require bounded safe behavior; do not add generic destructive cleanup. Exercise actual disposable old-workspace and post-upgrade compiled consumer routes, not only unit fixtures or `--help`.

Confirm final migration artifacts and support-file hashes match their source, exact library schematic bytes are used by real `ng generate`, and frontend parity compares correct outputs rather than two paths through the same flawed mock. Review executable flags/shebangs/CommonJS/ESM packaging and package scope/version mapping. Two library lines may use shared CLI code, but incompatible bytes must not claim the same immutable registry version.

**Required result:** supported transformations and all required failure modes proven on the exact shipped frontend artifacts and their promised runtime floors.

## A07 — Upstream changes, security decisions and supply-chain closure

Re-audit C04 and all existing material decisions, not just its final unanswered questions. Cover the full SHA/symbol/dependency inventories and the reference-to-fork ownership map. Individually inspect security/a11y/lifecycle/behavior/inherited differences; content-backed low-risk batching must enumerate membership and cover every predicate. Review the join/classifier/evidence-generation code and source-map-based execution observations; line presence or V8 function coverage does not prove replacement semantics or a regression assertion.

Resolve contradictory, unavailable, wrong-SHA/wrong-file and stale source notes with actual sources. Audit both installed floors, branch differences and original removed/replaced code. Check current advisories using primary sources and record cutoff/freshness/lookup gaps. Inspect npm package scripts/transitive build/test closure, tool acquisition/hashes, bundled CLI, retained 119-file MDC Sass provenance/licenses/advisories and the reachable exported/configurable closure. Prove any unshipped/non-reachable disposition at the artifact/dependency boundary; dev-only is not automatically non-exploitable.

Independently verify authority and effect for each risk/age exception, including source-map-js and braces. Test expiration, revocation, tampered inputs, future clock, wrong package/advisory/version, blanket scope and missing original grant. A report must distinguish fixed, not applicable, temporarily risk-accepted and unresolved. No statement from an implementation agent becomes an original owner authorization.

**Required result:** defensible security disposition and coverage-complete G11 audit, no unresolved release-relevant security issue represented as cleared, and explicit owner blockers where applicable.

## A08 — Acceptance coordinator, provenance, packaging and evidence trust

Audit the entire evidence chain, including ChatGPT-authored FIN-01 code and Codex modifications: expected matrices, case producers, source-input classifier, packing/writing/sealing, archive transport and validators. Review commands and actual children rather than trusting synthetic controller tests alone. All required checks must be invoked under correct source/library/CLI subjects; a successful slice cannot certify larger scope.

Test roster omission/duplication/unknown IDs, candidate-dependent expectations, null groups, vacuous all-pass/zero-case logic, skipped required tool, swallowed failed subprocess, stale fixed-path output, dishonest source/artifact labeling and self-generated approval. Inspect prepack versus post-artifact identity timing, actual exit and cancellation, immutable reviewed source/tool/oracle context, strict report schemas and the preservation of mandatory findings.

Review artifact/test resolution: no repack/fallback, cross-line substitution, symlink/hardlink/path escape, shared-cache contamination or input file masquerading as an assertion product. Test renamed copies of artifacts/control files, report ownership, changes during evaluation and the evaluator-to-sealer handoff. Reconstruct and rehash the entire consulted file inventory, not only wrapper reports. Document trusted/quiescent-writer assumptions; do not claim transactional protection against a privileged continuously racing process.

Audit npm package contents, exports, declarations, Sass/schematics/testing distribution, dependency/peer metadata, source maps, license/notices, unwanted development/private data and reproducibility. Baseline same tarball bytes across commits must not collapse distinct source/tool evidence. Keep final report/seal hashes noncircular and transport relocatable. Verify a moved archive against trusted source/matrix, not an archive that gets to redefine its own expected contract.

**Required result:** no known false-green, stale-evidence or subject-identity path; realistic negatives, correct threat model and safe self-contained tested artifacts.

## A09 — Chainman, CI, supported environments and branch parity

Apply the maintainer model in PLAN.md: this frozen-feature library is designed for reliable AI-assisted maintenance. Useful Chainman investment and one canonical reproducible workflow are not defects merely because hypothetical outside contributors might find them unfamiliar. Consumers remain independent of Chainman. Review and fix actual safety, duplication and reliability problems without inventing future-platform requirements.

Audit current pinned Chainman/just/bootstrap/Nix and Actions configuration completely: Git revision/hash validation, environment/readiness fingerprints, command argument forwarding, inherited environment, caching, hooks, modes, workflow/job permissions, PR versus trusted release execution, secrets/log redaction, artifacts, cancellation/timeouts, browser/server cleanup and branch filters. Verify task behavior on clean source with no accidental global tool or preexisting install. Do not read shell profiles or leak remote tokens to resolve access.

Inspect frozen install/age policy, exception integration and exact browser/system-tool availability. Review source/output classification so generated receipts do not mutate consumed inputs and real inputs cannot disappear from drift detection. Inspect temp/output confinement and safe cleanup; killing an arbitrary process by port is not acceptable ownership. Check branch-native tasks are the same authoritative operations local and CI, without drifting parallel environment definitions.

Audit actual consumer floors separately from private maintainer tooling. Review all claimed Node ranges, both RxJS families, Angular/compiler/Material/CDK compatibility and CLI minimum. Reexecute the C03 floor set, including peer/version ceilings or representative variants justified by declared ranges. Validate line isolation and package version identity under both real source branches. Identical scripts do not imply equal outcomes. No source-only/workspace run can certify a foreign tarball.

**Required result:** reproducible safe maintainer/CI behavior and true supported-line/range evidence. Future maintenance-system redesign remains out of scope, but current defects cannot be deferred merely by calling them infrastructure.

## A10 — Documentation, maintainability, releases and audit reconciliation

Audit README, migration instructions, compatibility limits, provenance/licensing, status/handoff, support ranges, changelog/release notes and maintainer commands against executable reality. Remove false upstream deprecation claims that misdescribe the maintained API without erasing provenance. Check examples compile/migrate where promised. Do not leave documentation implying Safari/hydration, stable release, owner approval or Cyph production qualification that was not proven.

Review all introduced complexity and dead/duplicate glue at a semantic level, using reliable AI-assisted maintenance of the frozen surface—not hypothetical contributor familiarity—as the design objective. Remove unused or superseded active code only with proof of its callers/outputs and regression coverage; preserve useful audit inputs. Do not churn files solely for style or erase historical evidence. Check generated files are reproducible and private/internal data, credentials, inaccessible local paths or temporary authority statements do not ship.

Reconcile the complete file/contract inventory, all G01–G13, all findings/decisions and both branches. Re-review Codex-authored closures and every audit-driven repair. No open high/critical defect or mandatory compatibility/security/test/evidence gap is nonblocking by default; severity is not permission to waive a contract. Any nonblocking finding requires scoped rationale and follow-up owner/date, and any actual exception needs its legitimate authority.

**Required result:** a complete, source-bound audit record and readiness assessment, not a collection of positive samples. R01–R03 produce the final fresh release evidence after this audit.

## Audit findings and repair loop

For each issue record exact source/line/artifact/case, expected versus actual behavior, severity/impact, reproduction or evidence, violated gate/contract, repair/decision, affected scopes and retest/reviewer. No fabricated `reviewed` row; use pending/blocked until the work exists. Group duplicates by root cause without losing affected cases.

Fix confirmed defects within the assignment, add the negative or regression that exposes them, and review the change independently where possible. Rerun targeted tests during iteration; rerun the complete two-line final set after all fixes. Reopen any stale review/approval when its relevant source/oracle/subject changes. At final reconciliation, every scope item and finding must point at the final source or an explicitly validated unchanged content identity.
