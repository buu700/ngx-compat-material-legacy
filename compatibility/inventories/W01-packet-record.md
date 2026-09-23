# W01 historical inventories — packet record

**Status:** initial lexical inventories captured (not compiler-complete).  
**Baseline:** `baseline/angular-components-16.2.x` = `df60e733c60e572ba538f6ad0ceff3e63e527b53` (16.2.14).  
**Date:** 2026-09-23 (America/New_York).

## Outputs
| File | Role |
| --- | --- |
| `source-inventory-16.2.14.json` | Per-legacy-directory file hashes, import leads, private symbol leads, root Sass named forwards |
| `source-closure-16.2.14.json` | Cross-tree relative TS/Sass/template/style closure from legacy roots |
| `scope-reconciliation.json` | `research/scope.json` vs discovered `legacy-*` directories |
| `style-seams.json` | `styleUrl(s)` references; all 34 legacy component style refs need build-generated `.css` from `.scss` |
| `public-api-files.json` | public-api.ts paths and export-star leads |
| `testing-public-apis.json` | testing public-api paths |
| `legacy-escape-summary.json` | Edges from `legacy-*` into ordinary Material dirs / package imports |

## Findings
- All 22 scoped preserved entry points are present; extra directory `legacy-prebuilt-themes` exists (theme CSS assets).
- Root Sass explicit named export count from inventory: 331 symbols (seed matrix remains authoritative for classification).
- Every inventoried legacy `styleUrls` target is a `.css` path whose `.scss` source exists at the tag — modern library build must compile/package those styles or fail closed.
- Source closure is lexical and pulls CDK testing private trees via relative edges; deletion gating must use the escape summary plus human review, not raw visited_file_count alone.
- Unresolved relative edges remain; do not delete until those are classified.

## Not done (follow-ups)
- Compiler-aware TypeScript export/inheritance inventory
- Full Sass member evaluation / `@forward` wildcard expansion
- Immutable Material-16 reference CSS/DOM seals (W02)
- No source deletions performed

## Tests run
- Local: `python3 -m unittest discover -s tests -v` (81 OK) prior to this packet
- CI: https://github.com/buu700/ngx-compat-material-legacy/actions/runs/35920248851 (success)
