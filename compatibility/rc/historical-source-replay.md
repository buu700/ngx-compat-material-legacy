<!--
Copyright Google LLC All Rights Reserved.
Copyright (c) 2026 Ryan Lester.
Use of this source code is governed by the MIT-style license in LICENSE.
-->

The finite source-review probes below describe specific historical source populations and receipt rosters. Later reviewed changes can invalidate their original source hashes or move a receipt into a newer review. Their Python tests use a registered immutable Git graph so the complete original JavaScript programs and rejection assertions remain unchanged.

| Registered probe | Original program |
| --- | --- |
| `historical-menu-import` | `tests/historical_menu_import_requalification_probe.mjs` |
| `historical-menu-import-admission` | `tests/historical_menu_import_admission_probe.mjs` |
| `menu-exit-context` | `tests/menu_exit_context_requalification_probe.mjs` |
| `selection-comparator-source` | `tests/selection_comparator_source_judgments_probe.mjs` |
| `native-admission-source` | `tests/remaining_native_source_context_probe.mjs` |

Run one with the already prepared workspace dependencies:

```sh
node scripts/run-historical-source-probe.mjs historical-menu-import \
  --report /tmp/historical-menu-import-unique.json
```

The registry in `compatibility/rc/historical-source-replay-inputs.json` pins each line's historical commit, Git tree, complete tree listing and original program SHA256. Before execution, the runner checks the current registered source graph. It accepts exactly the recorded Python command substitutions and leaves the worksheet and session-handoff progress documents mutable. Altered current subjects, authentic older review/caller bytes, changed wrapper assertions and added product files fail this guard. The original read helpers retain their before-hash and unrelated-path behavior.

The runner extracts every historical file into a fresh temporary directory, checks every Git blob and the complete file population, and creates private Git metadata with a detached historical HEAD and index. The object store is borrowed for reads. It runs only the selected original probe, using the existing workspace dependency runtime. It checks the historical graph remains clean and checks the current graph again after execution. Temporary files are removed. No installer, library build, remote operation, package publication or current worktree rewrite is performed.

Standard output is the original probe output, preserving the existing Python assertions. Standard error identifies the historical context. An optional new report retains the original result, program and producer hashes, verified file counts, before/after current coherence, runtime versions and cleanup outcome.

These are historical source-model results. Current source admission, packed/native behavior, actual Angular applications, the canonical private toolchain and supported compiler/Node/RxJS/peer floors require their own current evidence. The registry and reports explicitly retain `g11_claim: not-passed`; no SHA disposition or authored-use status is closed by replaying a historical model.

When the current source phase changes, requalify its source and receipt graph before advancing the registered current context. Keep the historical frames, original programs and assertions intact. A historical result must never replace current admission evidence.
