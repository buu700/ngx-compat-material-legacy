# Tool guard phase boundaries and retained reentry probes

At 3dd2288fd, the original root Sass phase still times out at 180 seconds.
The new CPU profile records 85.7% of readSync samples in full tool-frame
sweeps; matrix reads account for 40.7% of their immediate supplied-read caller
samples. This is diagnostic evidence, not a root qualification.

The tool node's preflight and final predicates call the actual matrix guard,
which invokes supplied callbacks. The guard scheduler explicitly requires both
phases to be callback-free. Move those same two genuine matrix checks into the
actual tool subject's consume operation, before and after its member loop.
The complete physical frame already includes the matrix owner's inputs.
Preserve all physical preflight/final sweeps, per-member physical/provided/
physical comparisons, planner authentication, strict constructor activation,
metadata snapshots and sticky same-root reentry poisoning. Add no reader grant,
current-data/result/verdict cache, shared-subject equivalence or deadline change.

The old finite-batch reentry probe fails identically on immutable 3fe0132d7
and 3dd2288fd: it expects selected nested calls and the outer batch to succeed.
Current root transaction tests instead require rejection before nested callbacks
and poisoning of the outer operation even when the callback catches reentry.
Align the two retained probes and their wrappers with that stronger policy.
Retain every physical, supplied-byte, metadata, exception identity, duplicate
read, recovery, alternate scheduler and independent-operation check. Verify
callback-free preflight/final directly. No skipped cases or weaker predicates.

Adopt these four test sources and the outer frame-count wrapper through one new
exact Git-anchored continuation from 3dd2288fd. Keep all earlier source packets
and reports immutable; historical
comparison data must never replace current physical reads. Verify both language
frames, actual guarded fixtures, constructor/transaction controls and the
unchanged original root deadline. Product/style/consumer bytes and all release,
artifact, browser, full-audit and G01-G13 claims remain outside this worksheet.
