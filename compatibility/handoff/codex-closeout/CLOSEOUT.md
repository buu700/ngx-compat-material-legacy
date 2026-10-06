# Phase one — close the remaining implementation and decisions

C00–C05 below contain the complete closeout instructions. FIN-01–FIN-08 labels are historical traceability only; no prior FIN packet is required. The retained product/G01–G13 references remain normative. Each result below needs actual code/test/review evidence. Do not close a work item by adding an `implemented` flag or a plausible rationale string.

## C00 — Subject, acceptance-scope triage and safe execution

Follow FIRST-SESSION. Authenticate the genuine Material 16.2.14 source/package and retained reference hashes; inspect source-to-package mapping instead of assuming today's directories correspond one-to-one to upstream. Record both current commits/trees, branch-specific framework versus CDK/Material versions, CLI identities, lock/policy/tool/oracle hashes and any dirty state.

Inspect the coordinator/sealer and representative accepted report producers before relying on their results. Check the path from expected contract → discovered cases → actual assertion → report → admission. A well-formed evidence file may still describe a weaker task. Record any immediately obvious mismatch as a closeout finding. Do not attempt a complete audit yet; fix execution hazards before running their affected commands.

Use current exact branch inputs. Repeated bytes across source commits are possible: the main library tarball matches a prior audit-observation artifact by digest, but that does not make the source, toolchain, peer bundle, test run or approval identities interchangeable.

**Exit:** authenticated subjects and safe command path; baseline scopes/limitations recorded; no source reset or silent evidence reattribution.

## C01 — 21.x dependency/audit coverage and branch-correct admission

All twenty runners exist. The six remaining null groups belong to two checks, not a missing branch architecture. Port only necessary checker/helper/report/test closure; preserve framework 21.x and its distinct CDK/Material floor. Derive complete case sets from the actual branch before execution and reconcile identity with its own installed dependencies and retained vendor files.

Dependency admission includes exact direct/transitive versions, frozen lock coverage, known release-age observations, tools, retained source hashes/licenses and current advisories. Unknown HTTP results, uncovered entries or missing original approval must not become pass. The baseline 21.x child itself failed: populating the roster alone does not fix it.

Audit admission must reflect actual G11 conditions rather than a `seed-not-closed` sentinel or blanket forever-red logic. A complete fixture should pass the real validator; a structurally full ledger with missing semantic evidence should fail. Keep source/API-policy success distinct from installed-fix semantics.

The source-map-js age exception is recorded to expire at `2026-10-07T14:08:09.382000+00:00`. At execution, inspect original authority and release timestamp, compare the actual clock, and remove the age exclusion when the ordinary seven-day condition is met. Do not wait unnecessarily or extend the exception. Query advisories separately: eligibility by age is not vulnerability clearance. The braces risk exception has a different purpose and expiry; do not combine them.

**Exit:** six formerly null groups are actual finite invocations, the branch's dependency closure is qualified or precisely authority-blocked, and real G11 deficiencies—not scaffolding—control the audit result.

## C02 — Resolve the complete Sass contract, case by case

Read `compatibility/rc/sass-pending-decisions.json`, its exact `.diff` files, `compatibility/rc/oracles/material-16.2.14-sass-api.json`, `reference/material-16.2.14/`, `scripts/sass-api-inventory.mjs`, `scripts/sass-ordered-css.mjs`, `scripts/sass-seal.mjs` and the peer/rendered companion producers. These already enumerate 651 cases on each line. Main reports 588 pass/63 pending; 21.x 585/66. Both report zero unexplained API cases but seven blocked ordered-CSS fixtures. “Explained” is not “approved.”

Recompute exact expected/candidate digest pairs at the reviewed source. The pending-decision subject may name an older source with identical library bytes; preserve that provenance and explicitly bind fresh observations. Do not append new hashes to a waiver just because an implementation changed. Explain the branch-only pending cases as well as shared cases.

| Decision family | Required analysis before disposition |
|---|---|
| `aggregates-composite` | Separate owned historical membership/order and CSS from the deliberate current-companion contribution. Prove default/color/typography/density inclusion and repeated/inverse order behavior, plus owned-only aggregate behavior. A composite mismatch cannot exempt owned components wholesale. |
| `companion-bridge-appended` | Verify each added public override matches independent current-peer M2 semantics and real component-consumed properties on each line. Scope legitimate additions precisely; an appended token does not justify unrelated historical selector/value changes. |
| `cdk-forced-colors-and-overlay` | Inspect current public infrastructure versus owned guarantees; test forced colors/high contrast, focus/ripple, overlays and body scope. Avoid promising v16 pixels for current CDK, but retain actual accessibility/interaction guarantees. |
| `button-line-height-inherit` | Compare authentic v16 Sass and rendered button geometry/typography in inheritance and custom-theme contexts. Restore behavior unless a necessary and narrowly approved change is substantiated. Test more than a single default appearance. |
| `upstream-29870-select-disabled-placeholder` | Read the real upstream hunk and original/current disabled-placeholder contracts. Cross-link to G11 and test disabled/invalid/custom-map behavior; an upstream issue number alone authorizes no owned regression. |
| `upstream-27511-snack-bar-action` | Read the upstream hunk and validate action color/state/contrast, custom themes and overlays. Preserve lifecycle/behavior while deciding exact styling compatibility. |

Every affected case receives one of: exact-match after repair; conforming current-infrastructure difference proven within the already-agreed ownership contract; or precisely scoped proposed deviation requiring the applicable authority. Technical determinations within the contract belong to Codex. Changing the frozen public/owned contract or accepting residual risk requires the owner's actual decision. A broad request to audit is not blanket deviation approval.

Use a small extension of existing decision/report validation if approved exceptions cannot yet be represented. Keep ordinary assertions, accepted scoped differences and pending/denied decisions distinguishable. Scope by cases, original/candidate inputs, line/peer, rationale, independent reviewer, actual approval reference where required, and expiry/revocation conditions where applicable. Reject missing, forged, wrong-line, broadened, mutated or stale decisions. Do not merely allow any JSON object named `approved`, and do not make current reference files writable goldens.

Seven CSS cases must remain visible until resolved: `05-custom-map-nested`, `owned-legacy-button`, `owned-legacy-select`, `owned-legacy-snack-bar`, `02-core`, `03-legacy-core`, `06-aggregate-and-companions`. Invoke all required argument-bearing mixins with authentic inputs; equality under one canned argument is not proof of every exported configurable behavior. Reconcile public/private/internal scope without silently promising all internal helpers or discarding required public aliases. Pair any oracle/exception change with a negative that would reject an unrelated candidate defect.

**Exit:** both full Sass checks are complete under defensible contracts, or only exact owner-pending deviations remain. No previously missing case disappears, and Codex's judgments enter the later complete audit.

## C03 — Close deterministic gaps behind accepted checker labels

### Runtime and peer floors

The baseline `consumer-floors-workspace.json` on both lines explicitly reports no Node 18 execution and uses installed-version comparisons for library floors. It is currently accepted by the coordinator despite that weaker scope. Replace the gap, not the diagnostic comparison: derive a finite valid matrix from actual advertised library Node ranges, framework/compiler support, distinct CDK/Material versions and both advertised RxJS families. Include the CLI's independently advertised minimum runtime. Invalid combinations need documented applicability, not an arbitrary Cartesian product.

Acquire pinned qualified runtimes through existing Chainman/tool support or a narrow necessary profile. Actually install, compile strict consumer templates/declarations and run representative interaction/harness/CLI probes at the chosen floors and relevant distinct advertised runtime branches. Check both RxJS 6.5.3 and 7.4.0 minima where promised and compatible; verify exact declarations rather than assuming current installed 7.8.2 covers them. A string test that rejects Node 17 is not a Node 18 positive test. Include late supported majors or upper-bound compatibility where the advertised range warrants it. Do not silently raise peer/runtime floors to avoid failures; resolve changes under the product contract.

### Packed rendered coexistence, especially 21.x

Main's current `m3-coexistence` assertion files contain packed and rendered observations. The 21.x counterparts still identify `source_kind: workspace` and marker positions. Preserve the useful compile tests and bring actual packed rendered scope to 21.x. Verify candidate and peer oracle separation, before/after values, both inclusion orders, nested/lazy/body overlays and shared ripple/focus/pseudo-checkbox behavior. A changed CSS byte length or marker is not rendering proof. Inspect all existing main rendered assertions as well; do not assume one good field proves every case.

### Real packaged migration and resulting consumer

Both captured `old-workspace-cli.json` files say `tarball_used: false` and execute the workspace distribution under Node 24. Make that route consume the exact identified CLI tarball, not a similarly named dist tree. Validate all support files, not only the executable hash. Run the peer-light CLI on a genuine disposable old workspace before installing current Angular; then complete the framework/dependency upgrade in the fixture and build/test the migrated consumer under both supported lines. Use an appropriate compatible historical environment for baseline behavior where required.

Retain real `ng generate` packaged-schematic execution, frontend parity and transaction tests. Prove blocked workspace zero writes, dry-run/apply parity, idempotence, concurrent-edit detection, injected mid-write failure/recovery, comments/data preservation, TS aliases/reexports/literal dynamic imports/testing, Sass configuration/mixed-generation aggregates and accurate private/recipe diagnostics. No success-only small fixture silently substitutes for the whole migration contract.

**Exit:** the true subjects and executions satisfy G05/G07/G12; misleading accepted coverage is corrected and regressions guard against relabeling weak evidence.

## C04 — Substantive G11 and exception resolution

Read the frozen upstream seed, disposition ledger, read notes, `compatibility/f10/audit-join/join.json`, `review-queue.json`, `delegated-execution.json`, per-SHA evidence and source-symbol inventory. Verify byte identities and their generation logic first. Recompute current items/groups from the actual source; intermediate queue-size summaries are not the final audit scope. No queue row may be lost just because it is absent from a dashboard.

Reconcile **all 1697 seed SHAs and all 1736 authored uses**, plus any required authenticated cutoff delta. Zero missing/circular pointers only shows mechanical reference cleanup. The main admission still flags 42 sensitive, 437 inherited, 97 behavior and 534 branch-applicability deficiencies, with all symbol uses open. These overlap; use exact identities rather than adding counters.

For each material SHA, inspect original hunk context, candidate ownership, both installed floor implementations, actual caller reachability, earlier disposition/read-note consistency, tests and the proposed conclusion. Every security/lifecycle/accessibility/behavior-sensitive and inherited decision needs individual reasoning. Low-risk equivalent docs/build batches may share a reason only with explicit full membership and proof the predicate covers each member. Audit batch generation too. Do not approve on tag ancestry, public import presence, string matching or boilerplate keywords.

Use the prepared inherited execution observations as leads: 49 all-lines executed, 120 partial, 72 present/unexecuted, 16 not found, 26 unbundled, 124 style/build, 30 without significant added lines. They are **main-only observations** and the instrumented run records two positioning failures. Line/function coverage neither proves a regression assertion nor discharges the 21.x obligation. Reproduce meaningful failures, explain instrumentation/environment differences, inspect removed/replaced lines too, and add targeted regression/mutation evidence when needed. CSS/build changes need their relevant rendered/build observations rather than forced JavaScript coverage.

For authored uses, the readiness partition (665 blocked by component rows, 147 mechanically clear, 922 framework imports, two stale seed uses) is a proposal to review. Establish and document appropriate closure criteria for each class; stable public framework usage can be supported by framework-floor/type/runtime contracts rather than an unrelated components commit, but no class is closed by count alone. Resolve the stale uses with provenance-preserving exact dispositions; do not silently mutate a frozen denominator. Trace provider/identity/member behavior and both floor exports for substantive uses.

Independently resolve contradictions between read notes and candidate source; fictional identifiers or wrong-file citations are findings. Check every existing final disposition, not only the open review queue, at an appropriate depth. The source-map-js patched version and the braces unresolved advisory are distinct issues. Verify current primary advisory data and exact dependency reachability, original owner grant evidence, expiry and scope. No plaintext name/date/rationale threshold proves authority. If the original message is unavailable, ask for the one missing decision with exact risk/scope; continue independent work.

Keep a known, authenticated upstream cutoff and append any relevant new changes without discarding the seed. Cover build/test/CLI/transitive dependencies and retained 119 Sass source files as well as runtime npm dependencies. Check acquisition/integrity, license/provenance and realistic untrusted-input reachability. A retained dev dependency is not automatically harmless. Record failed lookup coverage as unknown. Do not mark an accepted temporary risk fixed or fabricate a security clearance.

**Exit:** complete defensible decisions and exact authority requirements, targeted repairs/tests for applicable fixes, no missing review population, and an honest G11 result. The phase-two audit independently challenges these closeout decisions and tools.

## C05 — Closeout checkpoint, not final certification

Reconcile source changes, tests, authentic oracles, approved decisions and report subjects on both lines. Resolve fresh tool/lock impacts and no-longer-needed narrowly scoped exceptions without broad dependency churn. Run the real complete verifier for each branch and retain every output; investigate new failures. Freeze a committed checkpoint, not a dirty working tree masquerading as current HEAD.

Record unresolved owner-only questions without granting them. No known routine unimplemented case, missing producer, wrong artifact, source drift or hidden compile/lookup skip should be presented as review-only work. Create the input inventory for the complete audit, including all Codex closeout edits and reviewed/changed decisions. Begin Phase two even when only a precise owner-only decision remains; final readiness remains blocked until resolved.

Before launching A01–A10, apply the [C05-to-audit context transition](AUDIT.md#c05-to-audit-context-transition): hand the package, repository, both exact C05 source identities/change index, resulting evidence and factual unresolved findings/owner blockers to a fresh Codex context or independent review subagent when available. Do not preload implementation reasoning or a narrative asking the reviewer to agree. Preserve decision rationales as auditable source records. If no fresh reviewer is available, record `same-agent-explicit` and continue with the required compensating checks and disclosed limits.

**Exit:** exact review subjects, full current evidence, a finite known-findings/decision ledger and an explicit review mode. Begin the complete audit; do not stop here or report the project complete.
