# Historical reference evidence (generated during implementation)

This directory is intentionally empty of fabricated Material 16 output in the handoff.

During implementation, capture genuine evidence from untouched `angular/components` tag `16.2.14` in isolated, pinned environments. At minimum include:

- public TypeScript declaration/API snapshots for every preserved entry point and testing entry point;
- Sass public symbol/signature inventory and structural `meta.inspect(...)` evidence;
- compiled strict CSS fixture output and compiler/package provenance;
- representative DOM/class/ARIA snapshots and component lifecycle evidence where the historical test harness can produce them;
- exact source/tag commit, lockfile/package manifest hashes and toolchain identities.

Use a common pinned Dart Sass capable of compiling untouched 16.2.14 and the candidate for direct comparisons. Also keep historical-toolchain behavior and modern-candidate compiler legs distinct. Do not rewrite the historical source merely to enable an equality claim.

Once reviewed, run:

```bash
python scripts/seal-reference.py --create reference/material-16.2.14
```

Commit the evidence and `.reference-seal.json`. Candidate/future CI uses `--verify` only. Never regenerate the seal to make a candidate implementation pass. A legitimate correction to reference capture requires explicit maintainer review, documented reason and reviewable evidence showing the original capture was wrong.
