# Exact baseline execution archives

These are incomplete diagnostic runs packaged for offline review, not shipping candidates. The baseline summaries derive from their actual JSON contents. The archives also contain extracted package files; none should be executed blindly or treated as trusted source solely because it was in a CI upload.

| Line | Workflow / artifact name | Archive SHA-256 |
|---|---|---|
| main | `37440658390` / `closure-46bfa96fd4a323f4cf87e498a733b337dfa6ed84-37440658390` | `c02046c457a67c5003ccd8c0a6e28595493068148561f7e8057f304369817fb4` |
| 21.x | `37440050683` / `closure-04d869c0834eb90331510a6d87942cea6e112259-37440050683` | `baac0c46f8395b8326bb86774da6e705740ffb3c54f66501f13f5f73369b7360` |

Primary live locator: repository + workflow run/attempt + exact artifact name. Numeric IDs 11401218946 and 11400699940 are convenience locators, not content identity. GitHub reported expiration on October 20, 2026; the included exact copies avoid dependence on continued Actions retention. Do not store temporary signed download URLs in the handoff.

The validator checks the archive digest, confined regular paths, no duplicate members, CRC, every `closure-index.json` entry, source/run/summary identity and each library/CLI artifact hash/length. It reads the archives without executing or extracting their code. There are 1724 indexed files for main and 1763 for 21.x; the index file itself is outside its own inventory.

For manual inspection, use a new confined directory after path/link/size checks. Begin with `run.json`, `verify-summary.json`, `source-inputs.json`, `reports/details/sass-seal.json`, `consumer-floors-workspace.json`, `old-workspace-cli.json`, M3 assertion files and dependency/audit observations. Preserve exact bytes and separate source/line directories. Do not reuse the original runner's absolute paths as current paths.

The expected matrix is named and hashed in the archives but remains repository input. Independently authenticate it at the recorded source when rechecking with project tools. Archive integrity is not semantic correctness or original authorization. Fresh final release evidence must be generated after Codex's closeout and complete audit.
