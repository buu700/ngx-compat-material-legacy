# Definition of an unpublished release-ready candidate

Every required gate below must pass for each supported package line. There is no percent-complete substitute. Publication remains a separate owner action.

| Gate | Evidence |
|---|---|
| G01 — Fresh artifact integrity | clean source SHA + lock/policy hashes + tool versions + tarball SHA; tamper/fallback negative tests |
| G02 — Public API completeness | all primary/testing declarations compared; missing core aliases repaired; identity/usage tests; exceptions explicit |
| G03 — Stable public dependency boundary | semantic source/artifact/member/Sass scan; no authored private/deprecated dependency; exact peer evidence |
| G04 — No animation engine | no engine peer/import/type/testing recipe dependency; engine-free strict consumer; working exception migrations |
| G05 — Migration safety | existing + new regression cases; real packaged schematic and CLI; transaction/idempotence/dry-run/diagnostic proof |
| G06 — Historical owned Sass/API contracts | immutable Sass values/map/CSS/DOM comparisons; symbol/configuration/membership parity; scoped exceptions |
| G07 — Current bridges and M3 coexistence | 13 bridge mapping receipts; actual current component computed styles; owned-only aggregate noninterference |
| G08 — No external archived MDC obligation | complete remove/replace/vendor closure dispositions; zero @material dependency; isolated packed compilation; provenance/license/security evidence for retained code; empty vendor manifest allowed with proof |
| G09 — Historical behavior suite | 57 original spec paths/cases reconciled; all applicable tests execute; no unexplained skips |
| G10 — Real browsers and motion | Chromium all families; targeted Firefox/WebKit plus release matrix; zoneful/zoneless/CSP/SSR scopes tested |
| G11 — Upstream and security disposition | full inventoried SHA/symbol coverage; risk-weighted evidence; advisory cutoff; no unresolved release-relevant security findings |
| G12 — Supported branch and peer floors | F00 bootstrap receipts plus F11 final artifacts; each line separately built/tested; appropriate Node/RxJS/TS floors; no borrowed main evidence |
| G13 — Maintainer readiness | consistent README/status/provenance; real approvals or pending; exact unpublished artifact; no undeclared mandatory work |

## Evidence identity

Every package-level report records or is included in a manifest binding: full source commit, clean/dirty state, source-tree hash, branch/package version, lockfile hash, install policy/tool versions, tarball path/hash, exact command/exit code, environment, test discovery counts, output hashes, and limitations. Test artifacts are transferred and re-hashed, not silently rebuilt by test jobs.

Static source analysis binds the source/lock rather than falsely claiming to execute a tarball. Historical reference evidence binds original package/source/compiler/fixture identities. Current bridge oracles bind the exact peer version. These are different receipts that a final report must relate correctly.

No stale receipt may be reused solely because its filename/package version matches. No `skipped`, `unknown`, `needs-review`, inaccessible branch, missing artifact, or owner-name string is converted to a pass. No self-reported checksum is treated as proof of a GitHub run or human approval.

## Negative gates are part of acceptance

Demonstrate that CI fails when current source doesn't compile, a fresh tarball is missing/tampered with, a public alias is absent, a hidden testing entry imports the engine, an unsupported deep path is used, an original spec is excluded, a migration modifies data text, or an owned CSS golden changes without an approved exception. Remove the deliberate mutations afterward; keep the tests/harness demonstrating the failure mechanisms.

## Risk boundaries

Owned legacy component/Sass contracts remain strict. Ordinary current components and current CDK are not promised v16 pixel identity. However, that limitation cannot excuse a missing bridge, M3 contamination, wrong palette meaning, missing base token, or broken provider identity. Hydration/native M3 legacy theming is not required unless claimed. Browser scope and release support limitations must be explicit and tested accordingly.
