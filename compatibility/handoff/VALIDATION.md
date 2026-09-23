# Handoff validation and evidence boundary

Checked September 23, 2026. This directory contains the implementation specification, source references, fixture inputs, templates and executable helper checks. It is **not an implemented Angular library**.

## Checks executed

**All 81 helper unit tests passed.** Coverage includes safe Git bootstrap, packed-file inspection, ordered CSS comparison, source/dependency closure, upstream-delta inventory, static upstream-API policy, workflow SHA/container digest pins, reference sealing, Sass runner/value-capture wiring, toolchain configuration, publication metadata, and strict age/evidence checks. Research/release separation and complete-but-risk-weighted audit policy have explicit consistency tests. Synthetic compiler/runtime fixtures test helper behavior, not real Sass, Angular, or selected toolchain correctness.

Python syntax parsing (15 files) and separate `node --check` invocations for each JavaScript helper (2 files) passed. All JSON parses, both JSON/CSV inventories agree field-by-field, local Markdown file targets resolve, and license order is Google then Ryan Lester. The private-workspace toolchain templates and publishable metadata fragment pass their static checks. Deliberately incomplete bootstrap evidence is correctly rejected.

The inventory contains **22** legacy-entry-point worksheets, **13** current-component bridge worksheets, **299** named historical Sass export seeds, **48** legacy-core alias dispositions, **29** upstream adaptation candidates, **32** Sass input fixtures and **22** migration cases. The source register has **78** indexed entries; it is an evidence index, not proof that every linked change was audited or applies. The handoff contains **140 files**.

The manifest covers every delivered file except itself. ZIP CRC and per-file hashes were checked after packaging. Checksums prove artifact integrity, not source authenticity, compatibility or security.

## Actual helper environment

Helper execution used Python 3.13.5, Node 22.16.0 and npm 10.9.2. That is separate from the planned **Node 24.21.0 / pnpm 12.4.2 / release npm 11.19.0** toolchain. The selected toolchain was not installed or executed here.

The official pnpm 12.4.2 release page was rechecked on September 23 and identifies a September 15 release with security/install fixes; `research/SOURCES.md` records the primary source and limits. A release-page date does not authenticate registry packages or platform executables. `templates/tooling-release-evidence.json` intentionally retains null timestamps/hashes and false verification flags. Genuine registry metadata, artifact checksums/signatures and runtime version checks remain bootstrap requirements.

## Implementation release gates not executed

No actual Material-16 reference CSS/API/DOM capture, candidate Sass compile, Angular build, packed-consumer build, browser/computed-style test, SSR/zoneless test or old-workspace migration chain was executed. No selected npm stage command was executed. Real dependency resolution must test the pnpm12 YAML settings and selected installer, including platform-specific binaries. Git ancestry/full SHAs, selected per-branch peer baselines/API availability and the complete upstream/security applicability audit remain implementation work.

The upstream inventory labels source as research-only and entries as unreviewed. Its policy permits evidence-backed batches for demonstrably low-risk changes and requires individual review of sensitive/behavioral/contract changes. These checks do not classify the real upstream history, close pending security findings, or select release dependencies.

Static helpers are intentionally limited. The toolchain guard checks consistency of recorded evidence; it does not authenticate downloads. The policy scanner is not a full TypeScript/Sass semantic analyzer, and the workflow checker is not a full YAML security audit. Supplement these guards with the semantic inventories, reviewed evidence and real build/browser/release gates in the implementation documents.

## Scope and ownership

No Cyph application files are included or changed. No repository was created/pushed, no package was published, and no other person's ownership or maintenance commitment is asserted. Canonical ngx-compat identity remains subject to authorization. Flex Layout is not in scope.

Read [validation-results.json](validation-results.json) for machine-readable checks, [scripts/README.md](scripts/README.md) for commands, and [docs/06-verification.md](docs/06-verification.md) for required implementation evidence.
