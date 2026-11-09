# Reuse the checker owner's actual browser comparison subject

On V10, the fresh checker source-metadata subprocess passes 26 exclusions in
38.785s. Its profile places 87.7% of readSync samples in the tool physical frame,
principally strict constructor consumption. Preserve those constructor checks.

checkerOwnerSourceSubject already privately constructs browserOwnerSourceSubject
with the same root/read supplied by each caller. The checker source probe and
proposal producer construct a second sibling browser subject solely for one
historical checker comparison. Own that finite operation on the existing actual
checker subject and delegate to its actual already-captured browser subject.
There is no caller-supplied context, equivalence argument, reader grant, shared
subject registry, or current-data/result/verdict cache.

The accepted image is exactly the checker reference in the owner's pinned packet
source_members. Admit only its path/hash and optional exact byte length. Snapshot
plain data descriptors without invoking accessors. Preserve genuine full guards;
close the entire owner frame physically before callbacks and after the last one.
Each consumed member must compare physical/provided/physical bytes using captured
Buffer comparison, not a method supplied by the caller. Return fresh comparison
Buffers; reject and poison caught same-operation recursion, then recover cleanly.
Do not execute historical checker code or remove the fresh checker subprocess.

Prove complete comparison-byte and source-metadata identity against the former
sibling construction, allowing only exact authenticated source-binding updates.
Exercise cold/late physical drift, forged/non-Buffer/caller-owned-equals values,
metadata/accessors/proxies/descriptors, reentry, exception identity, public-copy
isolation and recovery on genuine subjects. Every bound change requires a new
Git-anchored V11 continuation from 4dd0eb3f2; keep V10 and earlier packets/reports
immutable. Requalify affected frames, fresh producers, and original deadlines.
Product, CSS, SCSS, HTML, consumer and golden bytes remain outside this worksheet.
No audit, root, artifact, browser, floor, Actions, publication or G01-G13 pass.
