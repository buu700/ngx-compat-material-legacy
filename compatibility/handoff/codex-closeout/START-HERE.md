# Codex: finish the RC, then audit the entire result

**Repository:** `buu700/ngx-compat-material-legacy`  
**Main:** `46bfa96fd4a323f4cf87e498a733b337dfa6ed84`  
**21.x:** `04d869c0834eb90331510a6d87942cea6e112259`

This is an executable handoff for a fresh Codex context. The assignment is **implementation closeout followed by a complete audit of all work**, including work performed during closeout. A successful first task or a green automatic verifier does not end the assignment.

## Self-contained task map

This package plus repository access is the complete starting context. C00–C05 are the sections in [CLOSEOUT.md](CLOSEOUT.md), A01–A10 in [AUDIT.md](AUDIT.md), and R01–R03 in [FINALIZATION.md](FINALIZATION.md). FIN-01–FIN-08 labels are historical traceability only; no prior FIN packet or external plan needs to be located. The included product/gate references and CHECKLIST.md contain the requirements.

A fresh audit-phase reviewer receives the authenticated C05 checkpoints, source-change index, resulting evidence and factual unresolved findings/owner blockers along with this package and repository access. Verify that supplied phase and subject, then enter A01–A10; do not restart implementation merely because the context is new. The C05 transition and honest same-agent fallback are defined in AUDIT.md.

## Entry sequence

Read [AGENT-PROMPT.md](AGENT-PROMPT.md), [FIRST-SESSION.md](FIRST-SESSION.md), [PLAN.md](PLAN.md), [BASELINE.md](BASELINE.md), then the retained [product contract](reference/PRODUCT-CONTRACT.md) and [G01–G13](reference/RELEASE-GATES.md). Use [CLOSEOUT.md](CLOSEOUT.md) during implementation, [AUDIT.md](AUDIT.md) during the complete audit, and [FINALIZATION.md](FINALIZATION.md) for the audited release candidate. [OPERATING-RULES.md](OPERATING-RULES.md) governs execution, authority and context handoff throughout.

The first deliverable is a trustworthy 21.x dependency/audit-coverage invocation, with its remaining failures correctly classified. In parallel, inspect the six named Sass decisions and preserve all failing cases. Do not start another branch port, history rewrite, or verifier architecture project.

## What the captured evidence says

Main's full run accepts 18 of 20 checker contracts; 21.x accepts 17 of 20. Both are **incomplete**. Both now execute the broad historical/browser pipeline without the earlier source-drift failure. These are observations of current checker scopes, not independent proof of every product requirement. Known gaps behind accepted labels remain explicit assignments.

The two exact baseline run archives are in `evidence/`. Start with their compact [main](evidence/main-summary.json) and [21.x](evidence/21x-summary.json) summaries. Read [evidence/README.md](evidence/README.md) before extracting or rerunning anything. These are failing diagnostic snapshots, not shipping candidates.

## Deliverables and stopping condition

Produce repaired code/tests on both lines, a coverage-complete audit with reproducible findings and dispositions, and a final source/artifact-bound engineering-readiness judgment. Preserve genuine owner-only decisions as blockers while continuing independent engineering and review. Publication, registry changes and private Cyph operations are not authorized by this document.

`plan-index.json` and [CHECKLIST.md](CHECKLIST.md) map the self-contained C/A/R sections to historical FIN labels and all release gates. The FIN mappings are traceability metadata, not references to required external packets. These are handoff indexes, not a replacement task engine. Templates under `templates/` are empty field guides, never evidence of reviewed work.

The bundle validator checks document integrity and the archived identities, not the library. Run `python3 tools/validate_handoff.py` from the bundle directory; its tests are `python3 -m unittest discover -s tools -p 'test_*.py'`.
