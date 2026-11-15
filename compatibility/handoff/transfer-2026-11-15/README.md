# Cross-machine closeout transfer

This directory is a continuation checkpoint, not a completion or release claim. A normal clone contains this handoff and its curated payload. Read the repository `AGENTS.md`, then [PROGRESS-AND-NEXT-STEPS.md](PROGRESS-AND-NEXT-STEPS.md), [PORTABILITY-RESEARCH.md](PORTABILITY-RESEARCH.md), and the original plan under `compatibility/handoff/codex-closeout/`. The scope remains C00–C05, A01–A10, R01–R03, both supported lines and all applicable G01–G13. Main is unfinished; the prior goal was paused for transfer.

## Preserve and verify before removing the handoff

Clone the repository normally and locate `compatibility/handoff/transfer-2026-11-15`. Continue from the cloned `main`, which contains the published handoff checkpoint `9bd4d92940ad4d5aaab6e84e58b6d017abb8635e` and any later revisions. Use a full history; if the clone is shallow, unshallow it and fetch any historical refs needed for a specific proof. Check the actual clone, branch, commit and status before continuing. The product source subject at the pause was `c3d2c29d8fc59ba56aef123d7194e40f5949fa33`. Inspect it as historical evidence; do not reset to it or try to recreate the old machine's local `codex/main-closeout-20261114` branch. Later handoff commits do not qualify product work.

Copy the entire handoff into a newly created durable directory **outside the checkout**, then verify and restore its payload. Choose a persistent location and replace the example below; `mkdir` and the restore destination must be new, so existing evidence is not overwritten.

```sh
HANDOFF=compatibility/handoff/transfer-2026-11-15
PARENT=/chosen/durable/closeout-transfer
mkdir "$PARENT"
cp -a "$HANDOFF" "$PARENT/handoff"
python3 "$PARENT/handoff/restore_transfer.py"
python3 "$PARENT/handoff/restore_transfer.py" --dest "$PARENT/evidence"
```

The first invocation verifies the copied `payload/` against [EVIDENCE-SUMMARY.json](EVIDENCE-SUMMARY.json). The second repeats verification and copies the verified files to an exclusively created destination; it does not apply patches or execute payload programs. Set `BASE="$PARENT/evidence/base"` for the paths in the progress document. Keep that durable copy and the restored evidence accessible throughout continuation.

The normal clone supplies the main, parked-line and archived public histories. The small **repository-contained** supplemental bundle preserves 17 otherwise missing referenced commits, including an unmerged datepicker checkpoint. Fetch all public branches and tags, then import these diagnostic histories without applying their changes:

```sh
# Only if git rev-parse --is-shallow-repository prints true:
# git fetch --unshallow origin
git fetch origin '+refs/heads/*:refs/remotes/origin/*' --tags
git bundle verify "$PARENT/handoff/payload/history/supplemental.bundle"
git fetch "$PARENT/handoff/payload/history/supplemental.bundle" 'refs/handoff-history/*:refs/handoff-history/*'
python3 "$PARENT/handoff/verify_history.py" --repo .
```

Only after the durable copy, payload restore and history verification succeed, remove the tracked directory:

```sh
git rm -r compatibility/handoff/transfer-2026-11-15
git commit -m 'Remove transferred closeout handoff [skip ci]' -- compatibility/handoff/transfer-2026-11-15
```

Inspect the status and commit before further work. Do not blindly apply pending patches: authenticate them, inspect the exact preimages and predecessor rows, and review their scope. The payload contains curated project pending work and evidence, not all original workspaces. The manifest is authoritative for delivered paths and hashes. Private Cyph reports, credentials and browser profiles are omitted; fresh consumer checks require authorized access. Public diagnostic logs can retain historical paths and observations, which are not new qualification. Source-host archives may remain there but are not prerequisites for consuming this handoff.

## Continue the work

1. Inspect c3 and the original full plan, then independently check source, toolchain, evidence and relevant history.
2. Repair and independently review the matrix callback comparison. Finish the retained-two Bidi wrapper and physical-owner transition using actual committed afterimages; preserve the 111-member pins and historical programs. Final inventory and Sass bindings depend on actual resulting commits.
3. Correct and re-review the autocomplete rationale: it describes hint-ID allocation, while the actual source change switches animation-token import and injection. Distinguish ready named-use source packets from incomplete motion, Bidi and packed-CVA work. The four tooltip behavior rows remain pending; the owner's answer was not received. The finite table approval grants no other exception.
4. Reconcile C04 without false source, runtime or security passes; complete C05 clean artifact and matrix work, the parked 21.x reconstruction and qualification, independent A01–A10 audit, and R01–R03. Publication is not authorized.

Consumer-floor executable archives are not included. Reacquire exact platform archives named by `compatibility/rc/consumer-floor-plan.json`, verify recorded identities and hashes, and keep prior arm64 results historical. Recreate dependencies with pinned tooling. Transport verification does not grant runtime, security, G02, G11 or release approval.
