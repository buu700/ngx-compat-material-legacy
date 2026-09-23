# Inventory-gated `src/` cleanup plan (no mass-delete)

Status: **classification advanced; still planning only.** Do **not** delete the
historical `src/` monorepo tree until escape edges are closed with evidence
(`scripts/source-closure.py` + worksheets + packed-artifact proof).

Classification worksheet:
`compatibility/inventories/escape-edge-classification.json`
(from W01 `legacy-escape-summary.json`).

## What already lives under `projects/ngx-material-legacy/`

All 22 scope component entry points are extracted and packing. All 22 historical
testing secondary entries pack. Schematics + bundled peer-light CLI live under
`projects/.../schematics/` and `migration/dist/`.

## Escape-edge classes (W01)

| Class | Examples | Safe to delete `src/`? |
| --- | --- | --- |
| `shared-core` | `src/material/core` (578 edges) | **No** — provenance / relative Sass+TS still referenced by historical trees |
| `ordinary-current-companion` | datepicker, expansion, icon, sidenav, … | **No** — not owned legacy; keep as historical reference until unused |
| `owned-overlap-ordinary` | ordinary `table` vs owned `legacy-table` | **No** — needs human review of harness/base edges |
| `unresolved-relative` | 68 `.import` Sass forward stubs | **No** — lexical closure cannot resolve; blocked for delete |
| Package leads (`@angular/*`, CDK, sass:) | peers / builtins | N/A — dependency policy, not `src/` delete |

## Candidates for later deletion (after closure)

| Area | Condition before delete |
| --- | --- |
| `src/material/legacy-*` component sources mirrored in `projects/` | Source-closure report shows no unresolved relative imports into remaining `src/`; packed tarball does not reference them; consumer ESM smoke green |
| `src/material/legacy-*/testing` for ports already packing | Same closure + packed testing entry smoke |
| Bazel `BUILD.bazel` / tools unused by ng-packagr path | Confirm CI workflows no longer invoke Bazel for the library build |
| Demo/docs apps under `src/` not used as fixtures | Keep until public fixture apps replace them |

## Must keep for now (blocked)

- Entire `src/material/core` tree referenced by legacy escape edges.
- Ordinary companion directories listed in `escape-edge-classification.json`.
- `src/material/{checkbox,menu,form-field,select,input,...}/testing` bases used as
  provenance for owned harness bases (or seal copies under `reference/`).
- Inventories, goldens, and research packets under `compatibility/` / `research/`.
- Unresolved relative `.import` forward stubs (68) until reclassified with a
  compiler-aware or seal-based disposition.

## Next concrete steps (still no `git rm`)

1. Keep `escape-edge-classification.json` updated when ports land.
2. Optionally re-run `python3 scripts/source-closure.py` against
   `projects/ngx-material-legacy` and attach unresolved edges.
3. Only then propose a narrowly scoped deletion PR with recorded provenance —
   prefer documenting over deleting if unsure.

## Status check (2026-09-23 tip)

Reconfirmed after advisory triage: classification still stands; **no** `src/`
deletion authorized. Unresolved relative stubs remain **68**; shared-core and
ordinary companions remain blocked. Advisory work did not produce escape-edge
closure evidence. Prefer documenting over deleting.

## Status check (2026-09-23 peer-floor / motion wave)


Escape-edge classification JSON advanced with per-specifier dispositions for the
common `.import` forward stubs (private/theming/typography/button-common). Still
**68** unresolved; **no** `src/` deletion. See
`escape-edge-classification.json` → `unresolved_relative.target_dispositions`.
