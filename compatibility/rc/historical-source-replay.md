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
| `tab-lifecycle-source` | `tests/remaining_native_tab_requalification_probe.mjs` |
| `native-individual-source` | `tests/remaining_native_individual_source_probe.mjs` |
| `native-individual-admission` | `tests/upstream/remaining-native-individual-admission.mjs` |
| `spec-fixture-context` | `tests/spec_small_context_probe.mjs` |

Run one with the already prepared workspace dependencies:

```sh
node scripts/run-historical-source-probe.mjs historical-menu-import \
  --report /tmp/historical-menu-import-unique.json
```

The registry in `compatibility/rc/historical-source-replay-inputs.json` pins each line's historical commit, Git tree, complete tree listing and original program SHA256. Before execution, the runner checks the current registered source graph. It accepts exactly the recorded Python command substitutions and leaves the worksheet and session-handoff progress documents mutable. Altered current subjects, authentic older review/caller bytes, changed wrapper assertions and added product files fail this guard. The original read helpers retain their before-hash and unrelated-path behavior.

The current source context includes the complete upstream change census, the private autocomplete fixture data repair, and its requalification of 83 earlier source scopes and 20 native source bindings. All nine original JavaScript programs remain unchanged. The original six historical frames stay fixed; the individual native source/admission programs use their preceding qualified source graphs, and the fixture context program uses the complete committed requalification graph. Seven Python wrappers contain only their registered command substitutions and the argument plumbing needed to dispatch them; all assertions and timeouts remain exact.

The six replay-tool files listed in `current_head_tooling_paths` are checked against the caller's committed HEAD rather than their older versions in the source context. This covers the registry, verifier, CLI, guard test, guard wrapper and this document. All six must match their actual Git bytes; uncommitted changes fail. This avoids requiring the registry and verifier to contain their own hashes. It admits no product file, receipt or original historical program through the tooling route. Their qualified source-frame checks remain mandatory. Wrapper before-bytes come from the fixed original reference commit or an explicitly pinned per-wrapper reference where the program was introduced later, even when the newer source context already contains the registered substitutions.

The runner extracts every historical file into a fresh temporary directory, checks every Git blob and the complete file population, and creates private Git metadata with a detached historical HEAD and index. The object store is borrowed for reads. It runs only the selected original probe, using the existing workspace dependency runtime. It checks the historical graph remains clean and checks the current graph again after execution. Temporary files are removed. No installer, library build, remote operation, package publication or current worktree rewrite is performed.

Standard output is the original probe output, preserving the existing Python assertions. Standard error identifies the historical context. An optional new report retains the original result, program and producer hashes, verified file counts, before/after current coherence, runtime versions and cleanup outcome.

These are historical source-model results. Current source admission, packed/native behavior, actual Angular applications, the canonical private toolchain and supported compiler/Node/RxJS/peer floors require their own current evidence. The registry and reports explicitly retain `g11_claim: not-passed`; no SHA disposition or authored-use status is closed by replaying a historical model.

When the current source phase changes, requalify its source and receipt graph before advancing the registered current context. Keep the historical frames, original programs and assertions intact. A historical result must never replace current admission evidence.
