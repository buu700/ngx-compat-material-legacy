# Pinned npm brace-expansion total expansion length exhaustion

- Candidate id: `triage-012`
- Advisory: `GHSA-mh99-v99m-4gvg`
- Component: npm 11.19.0 bundled `brace-expansion@5.0.7`
- Root control: `scripts/npm-tooling-options.mjs:31-73`
- Maintained pack callers: `scripts/pack-library.mjs:62-67`, `scripts/build-migrate-legacy-cli.mjs:153-158`
- Affected sink: authenticated npm archive `node_modules/brace-expansion/dist/commonjs/index.js`
- Confidence: high
- Disposition: `not_applicable`
- Survives validation: no

## Validation method

Authenticated immutable-source comparison, bounded direct mechanism execution through npm's bundled `minimatch.braceExpand`, end-to-end execution through the pinned npm CLI `pack` command, fixed-version differential control, and current static caller/source-boundary review on main and 21.x.

## Rubric

- [x] Original and fixed subjects are hash/integrity authenticated.
- [x] The test uses the actual npm-bundled minimatch/brace-expansion interface.
- [x] The candidate's distinct mechanism is observed within the 64 KiB caller limit.
- [x] A fixed 5.0.12 differential control is observed.
- [x] The current main and 21.x caller census and lower-trust source precondition are resolved.

## Evidence

The 500 byte `{a,b}` repeated input exhausted a 64 MiB heap in brace-expansion 5.0.7. With a 512 MiB heap, actual npm pack still failed to finish in 10 seconds and emitted an out-of-memory trace.

brace-expansion 5.0.12 bounded the result at 40,000 expansions and 4,000,000 characters. Fixed npm pack completed in 4.885 seconds with a 512 MiB heap. Its 64 MiB run did not complete, so the countercontrol proves an upstream bound under a realistic heap rather than success under every artificial cap.

The current caller probes pass at main `8039b6dce1165a974c8122f7fe25f7baf2f4288d` (21 calls) and 21.x `1b510d5d7b2cc1cdc6f262bdaa910a5aac144072` (19 calls), with four negative controls on each line. Since the prior immutable source review, the only relevant-tree change is `scripts/check-dependency-eligibility.py`; the npm helper and callers are unchanged.

The maintained install/ci manifests contain registry packages plus an owned packed library `.tgz`. They contain no Git dependency or local directory dependency whose workspace or ignore patterns npm would repack. The only two maintained `npm pack` inputs are the owned ng-packagr output and the owned migration package assembled by the repository script. Installing a synthetic `file:` directory dependency also completed without parsing its malicious `.npmignore`, eliminating that proposed route.

Pull-request jobs have a read-only token and concurrency scoped by ref and SHA. A contributor already controls code executed in that isolated job, so making their own job fail through an ignore pattern does not cross an additional security boundary.

## Decision

The vulnerable mechanisms are real in the pinned tool, but this repository finding requires a supported lower-trust glob source. No maintained caller selects one. This candidate is therefore not applicable to the exact current private profile rather than an upstream false positive.

Revalidate if a caller begins accepting an arbitrary package directory, Git dependency, workspace glob, ignore pattern, or user glob; if npm becomes a shared or privileged service; or if the npm pin, caller population, profile, CI permissions, or concurrency boundary changes.

## Remaining uncertainty

Dynamic runs used borrowed Node 22.23.3 and TypeScript 6.0.3 for the static caller probe. No canonical Node 24 run, current library build, packed artifact suite, or Actions execution occurred in this validation phase. These gaps can change exact timing thresholds, but they do not supply the missing lower-trust source.

## Artifacts

- `artifacts/05_findings/npm-brace-validation/validation_artifacts/README.md`
- `artifacts/05_findings/npm-brace-validation/validation_artifacts/subjects-summary.json`
- `artifacts/05_findings/npm-brace-validation/validation_artifacts/mechanism-results.json`
- `artifacts/05_findings/npm-brace-validation/validation_artifacts/cli-results.json`
- `artifacts/05_findings/npm-brace-validation/validation_artifacts/pack-results.json`
- `artifacts/05_findings/npm-brace-validation/validation_artifacts/pack-high-memory-results.json`
- `artifacts/05_findings/npm-brace-validation/source-boundary-evidence.json`
- `artifacts/05_findings/npm-brace-validation/rubric.json`
