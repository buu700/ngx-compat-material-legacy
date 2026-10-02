# RC acceptance evidence

`just verify --out <fresh-directory>` executes the existing automatic checks and evaluates their **complete evidence contract** separately from their process exit codes. A successful browser/API/Sass/migration slice remains useful diagnostic evidence; it does not satisfy a full gate merely because its process exited zero.

This command does not publish, authenticate a human reviewer, or grant engineering/production admission. The automatic result, independent review and publication authorization are separate states.

## Required sets

`compatibility/rc/matrices/full-verify.json` declares required checks, their G01–G13 routing, source/artifact subjects and named case groups for `main` and `21.x`. `scripts/rc_acceptance.py` checks that the matrix still contains the mandatory crosswalk. Renaming a check, making it optional, deleting it or changing its subject is not a way to make an incomplete run pass.

A `null` case group is an unresolved roster. It is valid configuration while work proceeds but fails full acceptance. Replace it with the reviewed finite case IDs derived from the relevant product contract and source inventory, not with IDs inferred from whatever happened to execute. Nonempty, unique case IDs are required; empty groups and duplicate case identities fail.

These case-group placeholders do **not** claim that browser, API, historical, migration, Sass, audit, security or consumer-floor coverage is complete. Existing partial runners are retained. Completing those case rosters and teaching the corresponding domain runners to emit genuine full reports is remaining implementation work.

The matrix's `implemented` flags describe runner availability. A structurally valid matrix can have every runner implemented: no guard requires a permanent unfinished cell. Completion still requires invoked, passing, correctly bound case-level evidence for every required check.

## Execution identity and report ownership

The coordinator freezes the reviewed matrix hash, real source commit/tree, tracked input fingerprint and environment/oracle metadata before packing. It binds the resulting library/CLI identities before consumer checks. It validates the actual library major against the selected line. It gives each invoked check a unique invocation ID and passes these values to children:

| Environment variable | Meaning |
|---|---|
| `RC_CHECK_ID` | The check that owns this invocation |
| `RC_ASSERTION_OUTPUT_DIR` | Absolute run-local `evidence/<check_id>/<invocation_id>/` directory for assertion products |
| `RC_RUN_ID` | The selected run manifest's ID |
| `RC_INVOCATION_ID` | This check's coordinator-generated invocation ID |
| `RC_EVIDENCE_BINDING` | JSON encoding of the frozen source/environment/oracle/matrix/artifact binding |

Ordinary consumer checks copy the received full binding, not manufacture new identities from a passing stored report. Packing has the input/output distinction below. The coordinator records actual child exit codes; a failed child cannot be rescued by a surviving or newly written passing JSON report. For a check composed of multiple subprocesses, an earlier nonzero exit remains a failure.

`source` subjects identify source-level checks. `artifact` subjects identify the exact required `library` and/or `migrate-cli` bytes. The current migration diagnostic slice identifies only its CLI subject; it does not claim to have exercised the library's packaged schematic. Full migration requires both subjects and all required case groups.

The writer copies the separately identified committed CLI into `inputs/migrate-cli.tgz` under the run directory. This makes artifact transport self-contained without falsely claiming the CLI was rebuilt or qualified with the library. That qualification remains a separate obligation. Direct host execution without `CHAINMAN_MODE` is recorded as `unqualified-host`, not silently labeled as host-Nix. Full acceptance requires the declared host-Nix mode and the other evidence checks; an environment variable alone is not proof of a qualified toolchain.

## Packing: input identity first, output identity afterward

The coordinator allocates the run and pack invocation IDs and writes `pack-execution.json` with `status: "running"` before launching `pack-draft-run.mjs`. The subprocess receives an input-only `RC_EVIDENCE_BINDING` with `phase: "prepack"`: source commit/tree/fingerprint, line, clean state, environment/oracle hashes, matrix hash and run ID. It cannot receive output artifact hashes before producing them. The unchanged pack wrapper preserves this record and passes the environment through to the library builder and manifest writer.

The writer preserves this assigned run ID after checking its source/line identity. The coordinator records the actual pack exit, including failures or interruption, and refuses source/environment/oracle drift before consumers run. `run.json` hashes the completed pack record and `pack-meta.json`; the full consumer binding also binds that record's identity. Missing pack output is a failure, never a reason to allocate a replacement success invocation.

`pack-library` evidence is explicitly **coordinator-owned**. Its report includes `evidence_origin: "coordinator"`, the actual `prepack_binding`, the same `invocation_id`, and the full post-build `binding` and artifact subjects. The post-build binding describes the output being verified; it does not claim that the earlier subprocess received those output hashes. The coordinator's automatic wrapper remains a slice until genuine build/probe assertion evidence satisfies the full expected case set. A record of a zero process exit alone is not build completeness.

## Complete child report

A domain runner can write `reports/<check_id>.json`. The evaluator requires:

- Executed schema/version/template fields; the exact run, line, check, invocation and binding; `coverage: "complete"`; actual exit zero and result pass.
- Correct subject IDs and exact artifact hash/length identities (an empty artifact map for a source subject).
- `expected_case_ids`, `discovered_case_ids`, `executed_case_ids` and `passed_case_ids`, each matching the reviewed expected set exactly.
- Integer case totals, zero failures/skips, and empty failed/skipped/unresolved IDs. Boolean values are not accepted as integer counts.
- A `case_results` entry per expected ID, with `kind: "assertion"`, result pass and references to hash-validated assertion output files. Name-only checks, skipped shapes and runner-control probes do not become behavioral coverage by naming them as such.
- Nonempty output records with run-relative paths, byte lengths and SHA-256 hashes. Full assertion files must be below `evidence/<check_id>/<invocation_id>/`; another check or invocation cannot supply them. Traversal, symlinks, multiply linked files, missing files, duplicate paths and digest sidecars are rejected.
- Input artifacts, run/matrix/pack/execution control files and reports are not assertion outputs. Relocated hardlinks and byte-identical copies of those validated inputs/reports are also rejected. `reports/details/` holds supplemental diagnostic reports, not full assertion evidence. A trusted domain runner must create actual assertion products; copying inputs is not execution.

Automatic wrappers emit `coverage: "slice"`; they do not upgrade process success to full acceptance. An actual full child report is preserved and validated rather than overwritten by the wrapper.

The evaluator accepts no report-local `exceptions` entries. An agent-written waiver or reviewer name does not establish authorization. Genuine historical exceptions must retain their separately reviewed authority and contract treatment; final exception admission is not implemented by this evaluator and is not inferred from its automatic pass result.

## Fixed-path diagnostic runners

The coordinator temporarily preserves an existing fixed-path detail report, runs the child with that old file absent, captures only a newly created regular JSON report into `reports/details/`, and restores the original in `finally`. File timestamps alone are never used as freshness evidence. Missing, malformed or symlinked child output fails. Unexpected directories are not recursively deleted; the recovery backup is retained for inspection.

An advisory file lock serializes full verifiers in the same checkout. It does not coordinate independently launched legacy scripts: do not run those concurrently while they still share fixed report names or CDP ports. Domain scripts can still have secondary fixed output paths; only the explicit captured detail files are authoritative here. Moving each domain runner completely to run-local output remains part of integrating its full report.

## Rechecking and sealing

For matrix structure only, without running any product checks:

```sh
python3 scripts/rc-verify.py --check-matrix
```

A full run records actual check exits/invocation IDs in `execution-record.json`, hashes that journal from `run.json`, and writes `verify-summary.json`. The journal and hashes bind trusted execution; they do not authenticate a compromised runner or arbitrary self-written records.

Before sealing, use the matrix digest captured from the **reviewed execution** (do not derive a new digest from changed configuration merely to get a match):

```sh
python3 scripts/rc-verify.py --check-run \
  --run "$RUN/run.json" \
  --expected-matrix-sha256 "$REVIEWED_MATRIX_SHA256"

node scripts/seal-draft-run.mjs --run "$RUN/run.json" \
  --expected-matrix-sha256 "$REVIEWED_MATRIX_SHA256"
```

The evaluator parses the same bytes it hashes and returns `validated_files`, an exact rooted path/hash/length inventory of the manifest, reviewed matrix, pack metadata, pack and coordinator execution records, library/CLI artifacts, required reports and every assertion output. It revalidates the complete inventory before returning.

The sealer reconstructs the required file set independently from the manifest and reports, rejects missing/duplicate/unexpected inventory entries, then rehashes **the entire validated set immediately before replacing `run.json`**. An assertion output, record, matrix or report changed after evaluation prevents sealing; replacing an output with a symlink to identical bytes also fails. The sealed manifest retains the non-self-referential inventory and `preseal_manifest_sha256`, not a digest of itself. A caller-pinned full run cannot be downgraded to a draft slice. The manifest digest is written outside the manifest. The existing `pack-draft` slice can still be sealed for its own declared subset without claiming full acceptance.

Rechecking and sealing require exclusively owned run files and trusted source/tools. Rehashing detects changes across the evaluation/finalization boundary; it is not a transactional filesystem snapshot or protection against a privileged hostile process continuously racing file replacements. Keep other producers and standalone scripts stopped while sealing. The advisory coordinator lock does not lock arbitrary outside processes.

The recheck must run with the same real source/checker inputs. Source changes, tarball changes, a different line, an altered matrix or mismatching journal invalidate the evidence. Source/report identity is not proof of semantic correctness: domain assertions and independent review remain necessary.

Even when automatic completeness passes and a run seals, `required_review_state` stays `pending`, `engineering_admission` stays `not-decided`, and no G gate or publication permission is automatically granted. The independently qualified line pair, current security/exception decisions, final release set and Cyph rollout remain separate.

## Focused regression suite

The tests below use synthetic evidence and disposable Git/child-process fixtures. They do not build Angular or qualify a real package:

```sh
python3 -m unittest discover -s tests -p 'test_rc_*.py' -v
python3 -m unittest discover -s tests -p 'test_legacy_suite_selection.py' -v
```

The normal canonical `just verify-lite`, full build/pack, real historical/browser execution and both-line CI must still run on the integrated source. A synthetic complete fixture passing the evaluator is a positive test of the evaluator, not release evidence.
