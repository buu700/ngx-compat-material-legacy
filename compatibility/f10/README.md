# F10 — 21.x upstream and authored-use audit

G11 remains incomplete. The frozen 1,697-SHA and 1,736-authored-use populations remain mandatory; source inventory or public-import presence does not establish semantic or security clearance. The advertised 21.x framework and CDK/Material baselines retain their separate versions.

## Current-source authored coverage

`authored-dependency-current-dispositions.json` contains separate dispositions for current peer uses absent from the frozen seed. Its open records are inventory, not review evidence.

`scripts/authored-current-use-inventory.mjs` scans actual legacy TypeScript source, including production testing harnesses and hidden files. It discovers named, default, namespace and side-effect imports, named/namespace reexports, import types and literal dynamic imports. A computed dynamic import is recorded as unresolved. Historical `.spec.ts` execution has its separate gate. Comment text does not become an executable import route.

This branch's snapshot enumerates 1,941 current peer uses in 526 source files. The additional population contains 199 named imports and 88 public reexports: individual dispositions and supporting review evidence for all 287 uses are recorded in the current ledger. The 82 frozen uses no longer present as current peer routes remain in the original ledger; this census grants no removal judgment.

The shipped G11 checker independently rediscovers current source and requires an exact branch/source snapshot, complete additional-use membership and source-bound individual review evidence. Both disposition admission and the existing `complete-use-dispositions` acceptance case require that result. A diagnostic can supply `--current-symbols <file>`; it still must match actual source. These structural controls do not establish peer API behavior, packed execution, complete runtime floors or a semantic audit pass.
