# Codex closeout and complete audit plan

## Goal and interpretation

Deliver an unpublished engineering-ready RC for **both** supported package lines, subject to the retained product contract and G01–G13. The owner has chosen Codex to finish the remaining work and then challenge the whole result. There is no further handoff back to Grok as a prerequisite. FIN-01–FIN-08 are historical traceability labels only; no prior FIN packet is required. All task instructions are in the Cxx/Axx/Rxx sections of CLOSEOUT.md, AUDIT.md and FINALIZATION.md, with CHECKLIST.md and the included product/gate references. Required owner decisions and publication remain separate.

“Complete audit” means complete accountable coverage of all relevant maintained work. It does not mean reading only the newest commits, trusting the set of already-green checks, or sampling three gates and stopping. It also does not mean blindly rereading every immutable external dependency line: prove identities and inherited scope, review all fork modifications contextually, and perform risk-weighted dependency/upstream analysis with complete inventory disposition. [AUDIT.md](AUDIT.md) defines the exact coverage rule.

## Execution order

| Phase | Work | Exit condition |
|---|---|---|
| Preflight | C00: source/evidence/safety and acceptance-scope triage | Real subjects, preserved working state, identified tools and immediate false-green risks |
| Closeout 1 | C01: 21.x dependency and G11 invocation/roster parity | Real branch-local execution; no null-placeholder protection; genuine deficiencies remain explicit |
| Closeout 2 | C02: Sass decisions; C03: known accepted-check gaps | Compatibility repaired or exact reviewed/owner-pending decisions; real floor, migration and rendered evidence |
| Closeout 3 | C04: substantive upstream/security and symbol review | All original entries accounted for with grounded decisions; required authority blockers explicit |
| Closeout checkpoint | C05: reconcile and rerun both lines | Reviewable committed checkpoint, no hidden implementation gaps; current full evidence |
| Complete audit | A01–A10: every domain in AUDIT.md | Entire scope covered; findings repaired/retested/reviewed or recorded as genuine readiness blockers |
| Finalization | R01–R03 | Final complete reruns/seals, audit reconciliation, truthful engineering-readiness report and owner release instructions |

C02/C03 and C04 may proceed in isolated parallel work after C00, but do not defer G11 until the last day or postpone actual consumer-floor execution until after claiming implementation is done. Resolve dangerous execution-boundary findings before running affected programs. Otherwise, preserve the user's requested closeout-then-complete-audit structure. Audit findings can reopen implementation and must be followed by focused re-review and reruns.

A required owner-only decision need not freeze the entire workflow: close all independent engineering, carry the exact pending scope into the complete audit, and do not mark engineering readiness passed until the decision and its verification are complete. Likewise, a blocked runtime acquisition is an explicit unexecuted obligation, not an excuse to abandon other tests.

## Baseline versus acceptance

The bundled main run accepts 18/20 current checker contracts, and 21.x 17/20. Those labels are preserved as observations, not endorsed as complete release proof. The baseline archives show specific gaps: installed-version arithmetic instead of runtime-floor execution, source CLI execution in the old-workspace lane, and workspace-only M3 assertions on 21.x. These are closeout work even though their parent checks were accepted.

The 651 Sass inventory and blocked CSS cases now exist on both lines. Use the existing oracles, scripts and decision diffs. Do not reconstruct them from prose or restart a golden-generation effort. Main and 21.x legitimately differ in exact peers and candidate CSS digests; do not borrow the main verdict for the maintenance branch.

The prepared audit data eliminates many broken pointers, but it does not establish security clearance. The full 1697-SHA seed and 1736-use inventory remain the denominators. Review queues and groups must be recomputed at the actual checkpoint; reported queue counts from intermediate commits are not authoritative scope.

## Maintainer model

This is a frozen-feature compatibility library intended for AI-assisted maintenance and fixes, not continuing feature development. Evaluate complexity by whether it improves or harms reliable, reproducible maintenance of this repository. Do not remove useful Chainman investment or weaken reproducibility to optimize for hypothetical outside contributors. A separately maintained Node-only workflow is not a requirement merely because it would be more familiar to them. Conventional package consumers remain independent of Chainman.

This preference does not protect unsafe, redundant or unreliable infrastructure from review. Fix demonstrated defects and remove superseded glue when its callers, outputs and regression coverage support that change. Keep the current pinned Chainman path canonical, and leave future-only maintenance automation in its separate tranche.

## Preserve the product and workflow architecture

Keep the frozen Material 16.2.14 owned API/behavior/M2 contracts, engine-free consumer boundary, stable public current peers, conventional published package, isolated historical oracles and both source lines. Current companions/current CDK are not promised v16 internals, but their public M2 semantics, actual styles, scope/overlay behavior and M3 coexistence are required.

Keep canonical pinned Chainman execution and shared tasks. The RC includes infrastructure needed for deterministic builds/tests, runtime floors, security or reduced repeated work. A general future updater, canary system, Chainman self-update project or wholesale secondary-platform adoption is a maintenance tranche, not a condition invented during this audit. Audit the current integration fully; repair real defects without redesign for style.

Keep the completed history consolidation and recovery archive. Do not force-push/rebase/squash. Reconstruct original upstream-to-current mappings for audit, verify recovery/provenance invariants where needed, and review the net work plus meaning-changing history. Do not treat hundreds of status-only commits as a substitute for examining the resulting source.

## Authority and review independence

Codex may make supported technical judgments within the existing contract and implement repairs. A technical review does not confer the owner's authority to change a frozen public guarantee, accept residual security risk, relax admission policy, publish packages or deploy Cyph. [FINALIZATION.md](FINALIZATION.md) separates these operations.

Phase-two review must include phase-one changes. At C05 freeze both committed source checkpoints and prepare the factual review handoff defined in [AUDIT.md](AUDIT.md). If a fresh Codex context or independent review subagent is available, use it for A01–A10 without preloading the closeout conversation or implementation reasoning. Otherwise record `same-agent-explicit`, continue the complete audit with independent oracles and mutation/negative tests, and disclose the assurance limitation. A fresh audit-phase launch validates C05 rather than restarting C00–C05. No tool or persona label is proof of independence, and a context reset does not reduce the audit scope.

## Completion definition

The assignment is not done at 20/20. It is done when every applicable release gate has validated evidence, the complete audit coverage inventory reconciles, no mandatory defect or unreviewed decision remains, final exact artifacts match tested sources, and the readiness report states actual authority and limitations. If any of those are unavailable, deliver a precise remaining-blockers report plus all completed work; do not substitute a confidence percentage or “looks good” for the contract.
