# Inventory-gated `src/` cleanup plan (no mass-delete)

Status: **narrow deletes advanced (2026-09-23).** Legacy→ordinary relative escape
edges from `src/material/legacy-*` roots are **0** after deleting 22 superseded
mirrors. Do **not** mass-delete remaining `src/` (core, ordinary companions,
`legacy-prebuilt-themes`) without further provenance.

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
| `shared-core` | `src/material/core` (legacy→core edges **0**; was 353 HEAD-before / 578 W01) | **Tree retained** — escape edges cleared; keep as provenance until separate unused proof |
| `ordinary-current-companion` | datepicker, expansion, icon, sidenav, … | **No** — not owned legacy; keep as historical reference until unused |
| `owned-overlap-ordinary` | ordinary `table` vs owned `legacy-table` | **No** — needs human review of harness/base edges |
| `unresolved-relative` | **0** (was 68 `.import` false-negatives + 1 comment placeholder) | **No `src/` delete yet** — shared-core/companions still block; relative edges closed |
| Package leads (`@angular/*`, CDK, sass:) | peers / builtins | N/A — dependency policy, not `src/` delete |

## Candidates for later deletion (after closure)

| Area | Condition before delete |
| --- | --- |
| `src/material/legacy-*` component sources mirrored in `projects/` | **DONE 2026-09-23** — 22 dirs deleted; see `src-legacy-mirror-delete-2026-09-23.json` |
| `src/material/legacy-*/testing` for ports already packing | Same closure + packed testing entry smoke |
| Bazel `BUILD.bazel` / tools unused by ng-packagr path | Confirm CI workflows no longer invoke Bazel for the library build |
| Demo/docs apps under `src/` not used as fixtures | Keep until public fixture apps replace them |

## Must keep for now (blocked)

- Entire `src/material/core` tree retained as provenance (legacy→core relative edges now **0**).
- Ordinary companion directories listed in `escape-edge-classification.json`.
- `src/material/{checkbox,menu,form-field,select,input,...}/testing` bases used as
  provenance for owned harness bases (or seal copies under `reference/`).
- Inventories, goldens, and research packets under `compatibility/` / `research/`.
- Relative unresolved count is **0** after resolver/comment fixes; shared-core and
  ordinary companions still block `src/` deletion.

## Next concrete steps

1. Keep `escape-edge-classification.json` updated when ports land.
2. Optionally re-run `python3 scripts/source-closure.py` against
   `projects/ngx-material-legacy` and attach unresolved edges.
3. Next narrow candidates: `src/material/legacy-prebuilt-themes`, then unused
   ordinary companions / `src/material/core` only with fresh unused proof.
4. Prefer documenting over deleting if unsure.

## Status check (2026-09-23 tip)

Relative unresolved edges closed (**0**). **no** `src/` deletion authorized:
shared-core and ordinary companions remain blocked. Prefer documenting over deleting.

## Status check (2026-09-23 peer-floor / motion wave)


`.import` resolution + comment/placeholder filtering: unresolved **0**.
**no** `src/` deletion. See `escape-edge-classification.json`.

## Status check (2026-09-23 motion / escape-edge wave)

`scripts/source-closure.py` now resolves historical `.import` Sass module names to
`_*.import.scss` partials. Unresolved relative edges dropped **68 → 1**. Remaining
edge(s) are inventory placeholders (e.g. `<legacy-component>` density template), not
missing owned library files.

**Still no `src/` mass-delete.** Shared-core (578) and ordinary companions remain
blocked. Prefer documenting; only narrowly scoped deletes with provenance are allowed.

## Status check (2026-09-23 zero-unresolved relative)

`scripts/source-closure.py` now:
1. Resolves historical `.import` modules to `_*.import.scss`
2. Strips `//` and `/* */` comments before Sass edge scan
3. Ignores documentation placeholders containing `<...>`

**Unresolved relative edges: 0.** Shared-core (578) and ordinary companions remain
`blocked-from-src-delete`. No mass-delete of `src/`.

## Status check (2026-09-23 shared-core escape batch)

**Extraction:** prebuilt themes + `option`/`optgroup` + `pseudo-checkbox` SCSS owned
under `projects/ngx-material-legacy/styles/{core,legacy-core}/`.

**Narrow deletes:** 22 `src/material/legacy-*` mirrors removed
(`src-legacy-mirror-delete-2026-09-23.json`).

| Metric | Before | After |
| --- | --- | --- |
| Legacy→ordinary relative edges (closure) | 391 (core 353) | **0** |
| W01 worksheet shared-core (historical) | 578 | n/a (superseded by HEAD recount) |
| Unresolved relative | 0 | **0** |
| Projects-rooted visits under `src/` | 0 | **0** |
| Default src-legacy roots remaining | 22 dirs | `legacy-prebuilt-themes/BUILD.bazel` only |

**Still no mass-delete of `src/`.** Retained: `src/material/core`, ordinary companions,
`legacy-prebuilt-themes`. Pack via `node scripts/pack-library.mjs`.
