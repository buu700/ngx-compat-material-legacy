# Cross-machine closeout transfer

This package is a continuation checkpoint, not a completion or release claim. The user requested this commit followed immediately by a deletion commit. The deletion tip intentionally has no transfer directory; its project tree must equal the work tip `c3d2c29d8fc59ba56aef123d7194e40f5949fa33`.

Read [PROGRESS-AND-NEXT-STEPS.md](PROGRESS-AND-NEXT-STEPS.md) first, then [PORTABILITY-RESEARCH.md](PORTABILITY-RESEARCH.md), the current repository `AGENTS.md`, and the original plan under `compatibility/handoff/codex-closeout/`. The original plan remains the scope: C00–C05, A01–A10, R01–R03, both supported lines and all applicable G01–G13. Main is unfinished. The old goal was paused for transfer, not completed.

## Recover the deleted handoff

The external transfer kit contains a standalone project Git bundle (not a complete offline external-upstream mirror), `closeout-evidence.zip`, checksums, and START-HERE instructions with the exact add/delete commit IDs. No remote push or Actions run is needed to consume it. Clone the bundle on the destination, using the continuation branch:

```sh
git clone --branch codex/main-closeout-20261114 /path/to/ngx-material-legacy.bundle ngx-compat-material-legacy
cd ngx-compat-material-legacy
git fetch /path/to/ngx-material-legacy.bundle '+refs/transfer/*:refs/transfer/*'
git status --short
```

Use the protected transfer ref and require its full ID to match external START-HERE.md. Do not rely on HEAD ancestry after further commits:

```sh
HANDOFF_ADD="$(git rev-parse refs/transfer/handoff-add)"
# Check HANDOFF_ADD against the exact full ID in external START-HERE.md.
mkdir /chosen/private/recovered-handoff
git archive "$HANDOFF_ADD" compatibility/handoff/transfer-2026-11-15 | tar -x -C /chosen/private/recovered-handoff
```

Use a new destination directory. Do not reset or checkout an older source tree merely to read the deleted documents, and do not recreate the old host's copied `.git` pointer files.

## Authenticate and restore private evidence

The evidence archive is a companion transfer artifact, deliberately outside public Git history. Its identity and scope are in [EVIDENCE-SUMMARY.json](EVIDENCE-SUMMARY.json). It contains content-addressed regular files plus an index, bounded pending patches, raw receipts, and task checkpoints. It excludes credential stores, browser profiles and Git metadata, and prunes routine installed/generated caches. Bounded diagnostic and mutant package afterimages are intentionally retained in some checkpoint snapshots; they are unapproved test inputs, not installables. Do not publish it incidentally.

```sh
python3 /path/to/recovered/compatibility/handoff/transfer-2026-11-15/restore_transfer.py /path/to/closeout-evidence.zip
python3 /path/to/recovered/compatibility/handoff/transfer-2026-11-15/restore_transfer.py /path/to/closeout-evidence.zip --dest /chosen/private/restored-evidence
```

The first command verifies the archive hash, index, every object and every logical path. The second repeats verification and restores data into an exclusively created directory; it applies no patches and executes no payload programs. `BASE=/chosen/private/restored-evidence/base`. The restored `snapshots/` are explicitly unapproved checkpoints, including old and interrupted work. Prefer the bounded reviewed packets listed in the progress document, always checking exact predecessor rows. The index records two registered checkout paths already missing on the source machine; no evidence is invented for them. Fetching `refs/transfer/*` also preserves aliases of every original source ref and the extra available referenced commit histories, including the otherwise unreferenced datepicker checkpoint.

Keep old source/test/run JSON, dirty flags and absolute paths unchanged as historical provenance. Record relocation separately. Recreate actual new-machine dependencies and fresh qualification through pinned tooling. Old logs are not acceptance for the new machine, and neither a source review nor transport verification grants runtime, security, G02/G11 or release approval.

## Immediate continuation priorities

1. Inspect the actual c3 source and original full plan. Preserve the transferred branch/ref history; local main and 21.x tips differ from the continuation branch.
2. Finish the paired matrix callback-comparison fix and independently review it. Complete the retained-two Bidi wrapper/physical-owner transition using actual committed afterimages, preserving original 111-member pins and historical programs. Final inventory/Sass bindings depend on the actual resulting commits.
3. Correct and re-review the autocomplete wording defect. Distinguish ready named-use source packets from incomplete motion, Bidi and packed-CVA work. Keep the four tooltip behavior rows pending: the owner's answer was not received. Do not use the table approval to grant other exceptions.
4. Reconcile C04 without false source/runtime/security passes; then complete C05 clean artifact and matrix work, the parked 21.x reconstruction/qualification, independent A01–A10 audit, and R01–R03. No publication is authorized.

No application implementation was resumed for the transfer. The canonical work stopped cleanly at c3 after the full inventory regression passed. The add/delete commits record only this temporary package.

Consumer-floor executable archives are not included. Reacquire the exact platform-specific archives named by the committed `compatibility/rc/consumer-floor-plan.json`, verify the recorded identities and hashes, and keep prior arm64 results historical. The transferred docs, results and locks are not a portable runtime installation.
