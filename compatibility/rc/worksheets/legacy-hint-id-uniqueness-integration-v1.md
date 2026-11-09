# Shared generated legacy hint IDs

Base: `11767b00a96caa175a206388551c9f014c7513fb` on main.

Fix the demonstrated duplicate ID between a form-field hintLabel element and a
projected MatLegacyHint. Use one independently owned internal allocator for the
existing mat-hint- prefix, preserving the separate form-field label counter
advance, authored IDs, manual construction and public declarations. Generated
hint suffix ordering changes; numeric suffix order is not the documented unique
ID guarantee. No template, role, selector, CSS/SCSS, public export, peer or current
private/deprecated upstream ID API changes are permitted.

The external V4 actual patched-source build and staged same-fixture Chromium
comparison establish the targeted red/green case, authored/manual IDs, label
sequence and removal/recreation. V5 repacks identical executable bytes without
two generated cache files. Both are scoped diagnostic evidence, not a final
canonical source/artifact run. Material16 counters were authenticated in source
only;16 runtime, SSR/hydration and duplicate library copies are unqualified.
Read-only Cyph source search found no fixed numeric hint/field-label ID uses;
this is not a Cyph build or deployment.

Add a small maintained regression in existing test tooling, build/pack from the
canonical patched source with pinned commands, and verify exact source maps and
the complete archive delta. All public declarations and styles must be checked,
including declaration maps; do not assume only two members changed. Extend API
artifact profiles only for exact authenticated changes with retained negatives.
No blind source/hash restamp, old bytes as live source, wildcard artifact grant,
golden rewrite, missing-case exclusion or broadened audit pass is permitted.

The parent owns product integration/packing/sealing; the external API-profile
worker owns its finite candidate and the ID-regression worker owns its test
candidate. Preserve old packets, failures and reference oracles. Final full
API/DI/browser/Sass/floor/Actions and complete plan audit remain separate.
No push, publication, private application change or G01/G11 pass is implied.

Precommit verification: the current maintained probe exited 0 against the V5
diagnostic artifact and exited 1 against the original V8 artifact at the intended
uniqueness assertion (32 distinct IDs out of 41). Probe/helper hashes were equal
before and after both runs, and all three current TypeScript sources matched the
candidate source map. Retained results are under
`~/.codex/closeout-state/2026-11-07-recovery/legacy-hint-id-canonical-integration-v1/`.
The independent bounded source/regression review found no material defect;
its report is in the adjacent `legacy-hint-id-canonical-review-v1/` directory.
These observations do not qualify a future canonical packed artifact.
