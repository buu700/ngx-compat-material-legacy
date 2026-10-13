# npm brace-expansion validation artifacts

This directory contains a bounded standalone validation of five brace-expansion advisories in the repository's pinned npm 11.19.0 private-tooling archive.

## Subjects

- Original npm archive SHA-256: `31e9770f7dc71119a58509353b27917557aaf0ac9b5ef1a0465ee7d8ec67ae75`
- Original bundled module: `brace-expansion@5.0.7`
- Fixed countercontrol archive SHA-256: `ef8448ec78f20b692f04fa6d01f39b5ab34c66404bea3429f5a39c6c9e0be8b4`
- Fixed countercontrol integrity: `sha512-YovQ3rzhaLMIrDjNDMkNS01tea93qhEhG5xy8f6+R0l+dw3Ki+5sCoIoI942iuLZTHWogWktgwVDhU09iNEimQ==`
- Fixed countercontrol module: `brace-expansion@5.0.12`

`prepare-subjects.py` records the exact acquisition paths used for this run, verifies the npm archive SHA-256 and the fixed archive SRI, extracts regular files without following links, copies npm, and replaces only its bundled brace-expansion directory. The extracted subjects are deliberately omitted from persistent storage; `subjects-summary.json` retains their authenticated file identities.

## Execution

The runs used Node 22.23.3, core dumps disabled, fresh private npm cache/config directories, lifecycle scripts disabled, and no inherited npm or token environment variables.

- `run-mechanisms.py` invokes npm's actual bundled `minimatch.braceExpand` with default options, a 64 MiB heap, and a 2 second timeout.
- `run-cli.py` proves that a `file:` directory install does not parse the dependency's `.npmignore`; this is retained as counterevidence against that proposed route.
- `run-pack.py` invokes the actual npm CLI `pack` command with a 64 MiB heap and 2 second timeout.
- `run-pack-high-memory.py` reruns the memory-sensitive/CPU cases with a 512 MiB heap and 10 second timeout to distinguish a bounded fixed result from a low artificial heap limit.

Each runner rewrites its own JSON result file. Timed-out npm processes were terminated, and a post-run process check found no surviving worker or npm CLI process.

## Interpretation

The original module reproduced all five mechanisms. The fixed module either completed the same bounded input or failed quickly; at 512 MiB, fixed npm pack completed the total-length and intermediate-array cases while the original timed out or exhausted the heap. The 64 MiB pack runs show that the upstream expansion bound can still exceed a deliberately tiny downstream regex budget; they are not used to claim that 5.0.12 guarantees successful packing at 64 MiB.

Dynamic mechanism validity does not establish a repository security boundary. `source-boundary-evidence.json` binds the current main and 21.x caller census and explains why the maintained callers do not select a lower-trust Git/local-directory package, arbitrary workspace/ignore pattern, or user glob.
