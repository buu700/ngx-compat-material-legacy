# Inventory-gated `src/` cleanup plan (no mass-delete)

Status: planning only. Do **not** delete the historical `src/` monorepo tree until
escape edges are closed with evidence (`scripts/source-closure.py` + worksheets).

## What already lives under `projects/ngx-material-legacy/`

All 22 scope component entry points are extracted and packing. High-value testing
entries listed in `compatibility/pack-proof/README.md` are also owned there.
Schematics live under `projects/ngx-material-legacy/schematics/`.

## Candidates for later deletion (after closure)

| Area | Condition before delete |
| --- | --- |
| `src/material/legacy-*` component sources mirrored in `projects/` | Source-closure report shows no unresolved relative imports into remaining `src/`; packed tarball does not reference them |
| `src/material/legacy-*/testing` for ports already packing | Same closure + consumer ESM smoke of the packed testing entry |
| Bazel `BUILD.bazel` / tools unused by ng-packagr path | Confirm CI workflows no longer invoke Bazel for the library build |
| Demo/docs apps under `src/` not used as fixtures | Keep until public fixture apps replace them |

## Must keep for now

- `src/material/{checkbox,menu,form-field,select,input,...}/testing` bases used as
  provenance for owned harness bases (or seal copies under `reference/`).
- Inventories, goldens, and research packets under `compatibility/` / `research/`.
- Anything still imported by incomplete testing ports (chips, tabs, table, …).

## Next concrete step

Run `python3 scripts/source-closure.py` against `projects/ngx-material-legacy` and
record unresolved edges into `compatibility/inventories/` before any `git rm`.
