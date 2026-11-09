# Assemble the checker context inside its actual producer

V11's actual producer passes with a fresh verifier subprocess; the complete root
Sass phase still exceeds its original 180-second deadline. The checker context
constructs another checker owner before calling that same producer, which already
privately owns a genuine checker subject with the identical root/read arguments.

Move context assembly into the producer's private construction scope. Keep the
public source producer and checker context entry points, result shapes, source
derivation, independent verifier subprocess and every existing guard/assertion.
The context must use the actual privately captured owner. Do not accept an owner,
context, subject-equivalence argument or source reader grant from the caller; add
no registry or current-byte/parsed/result/verdict cache. Public calls still create
fresh subjects. Keep distinct constructor guards and all physical/provided/
physical, callback-free preflight/final and caught-reentry policies intact.

Compare genuine context metadata and complete before/after images with V11;
allow only exact authenticated source-binding updates. Exercise late physical and
provided-source drift, current and unknown ledger frames, public-copy isolation,
wrapper before-image validation, prior guard forwarding, fresh returned images,
and recovery. Preserve the existing strict constructor and comparison controls.
An unknown supplied ledger that differs from the physical root is rejected by
the established raw-source policy; that rejection was reproduced on immutable
V11. Preserve the rejection and the current physical ledger's existing applied
or unapplied status, rather than reviving older unknown-reader expectations.
Requalify the source producer and original root Sass deadline. Report a timeout
as unresolved, not as a pass or as authority to raise the deadline.

Bound source changes need a new Git-anchored V12 continuation from ca20a693b.
Authenticate the context module's predecessor against its existing immutable
checker-owner packet if it is newly added to the finite tool frame. V11 and all
earlier packets/reports are immutable. No product, HTML, CSS, SCSS, consumer,
golden, peer, canonical judgment, artifact, browser, floor, Actions, publication
or G01-G13 changes or qualification are granted by this worksheet.
