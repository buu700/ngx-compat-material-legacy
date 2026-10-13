# Validation summary: five npm brace-expansion advisories

## Scope

Standalone validation of the five `needs_review` brace-expansion rows from `compatibility/rc/tool-advisory-triage/private-profile-remaining-result.json`, against current clean heads:

- main: `8039b6dce1165a974c8122f7fe25f7baf2f4288d`
- 21.x: `1b510d5d7b2cc1cdc6f262bdaa910a5aac144072`
- pinned npm archive: `npm@11.19.0`, SHA-256 `31e9770f7dc71119a58509353b27917557aaf0ac9b5ef1a0465ee7d8ec67ae75`
- affected bundled component: `brace-expansion@5.0.7`
- fixed differential control: authenticated `brace-expansion@5.0.12`

This was a validation phase, not a repository-wide scan or release qualification.

## Closure

| Candidate | Advisory | Entrypoint/source | Sink/control | Disposition | Counterevidence | Survives |
| --- | --- | --- | --- | --- | --- | --- |
| triage-011 | GHSA-6j4f-fj2g-mc7p | package/workspace/ignore glob | parseCommaParts recursion | not_applicable | Mechanism reproduced, but no maintained caller selects a lower-trust Git/local-directory/untrusted pack or glob source. | no |
| triage-012 | GHSA-mh99-v99m-4gvg | package/workspace/ignore glob | total expansion length | not_applicable | Mechanism reproduced, but the required lower-trust source is absent from the exact caller set. | no |
| triage-013 | GHSA-q2hr-2g5m-vwhr | package/workspace/ignore glob | iterative rewrite CPU | not_applicable | Mechanism reproduced, but the required lower-trust source is absent from the exact caller set. | no |
| triage-014 | GHSA-qhr7-859c-m2p7 | package/workspace/ignore glob | nested expand recursion | not_applicable | Mechanism reproduced, but no maintained caller selects a lower-trust Git/local-directory/untrusted pack or glob source. | no |
| triage-015 | GHSA-rgw5-rvv9-x895 | package/workspace/ignore glob | intermediate expansion arrays | not_applicable | Mechanism reproduced, but the required lower-trust source is absent from the exact caller set. | no |

## What the runtime evidence proved

All five distinct mechanisms are real in npm's authenticated bundled 5.0.7 bytes within minimatch's 64 KiB pattern limit:

- triage-011: stack exhaustion in `parseCommaParts`.
- triage-012: heap exhaustion from total expansion length.
- triage-013: CPU exhaustion in repeated rewrite/scanning.
- triage-014: stack exhaustion in nested `expand_`.
- triage-015: heap exhaustion in intermediate arrays before the final output-count check.

The actual npm `pack` interface reproduced the corresponding failure, timeout, or crash. The authenticated 5.0.12 control completed or failed quickly. At a 512 MiB heap, fixed pack completed triage-012 and triage-015 while the original timed out or exhausted memory; fixed triage-013 failed closed in 0.279 seconds. Both original and fixed completed the benign control.

A proposed `npm install file:./directory` route did not parse the dependency's malicious `.npmignore`; both variants installed it normally. The evidence therefore does not rely on that incorrect path.

## Why the repository candidates do not survive

The exact current static caller probes pass for all 21 main callers and 19 21.x callers, including four population/ownership negative controls on each line. The helper permits only install, ci, local pack, and version queries and disables lifecycle scripts.

Maintained install/ci manifests use registry artifacts plus an owned library tarball; the authenticated historical locks resolve to the public npm registry. They select no Git dependency or local package directory that npm would repack. Maintained pack calls use only the owned ng-packagr output and the owned migration package assembled by repository code.

The CI pull-request context does not add a distinct boundary for this availability-only mechanism: a contributor already controls code that their isolated read-only job executes, and concurrency is scoped by ref and SHA.

This is a profile-bound `not_applicable` result, not a claim that the upstream advisories are false or that arbitrary uses of npm 11.19.0 are safe. Revalidate on any new arbitrary package directory, Git dependency, workspace/ignore input, user glob, shared npm service, profile/caller change, CI-boundary change, or npm pin change.

## Validation limits

Runtime work used Node 22.23.3. The canonical Node 24 environment, current product build, packed artifact suite, and Actions were not run. Exact timing and heap thresholds can vary by runtime. The source-boundary decision is static and is bound to the two current clean heads.

## Artifacts

- `artifacts/05_findings/npm-brace-validation/source-boundary-evidence.json`
- `artifacts/05_findings/npm-brace-validation/rubric.json`
- `artifacts/05_findings/npm-brace-validation/validation_artifacts/README.md`
- `artifacts/05_findings/npm-brace-validation/validation_artifacts/subjects-summary.json`
- `artifacts/05_findings/npm-brace-validation/validation_artifacts/mechanism-results.json`
- `artifacts/05_findings/npm-brace-validation/validation_artifacts/cli-results.json`
- `artifacts/05_findings/npm-brace-validation/validation_artifacts/pack-results.json`
- `artifacts/05_findings/npm-brace-validation/validation_artifacts/pack-high-memory-results.json`
- `artifacts/05_findings/triage-011/validation_report.md`
- `artifacts/05_findings/triage-012/validation_report.md`
- `artifacts/05_findings/triage-013/validation_report.md`
- `artifacts/05_findings/triage-014/validation_report.md`
- `artifacts/05_findings/triage-015/validation_report.md`

Each candidate directory also contains its append-only discovery and validation receipts in `candidate_ledger.jsonl`.
