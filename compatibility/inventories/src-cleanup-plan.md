# Inventory-gated `src/` cleanup plan (no mass-delete)

Status: **residual non-Material src retire landed (2026-09-23).** Legacy→ordinary
relative escape edges **0**. Deleted: scaffolding/core/companions, e2e/universal,
owned-overlap ordinary, hollow schematics/testing/prebuilt-themes, then residual
`src/cdk*` / maps / youtube / adapters / experimental / hollow material + supporting
integration Bazel leftovers. **`src/` = README only.**
See `src-residual-packages-retire-2026-09-23.json`.

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
| `shared-core` | `src/material/core` (legacy→core edges **0**; was 353 HEAD-before / 578 W01) | **DELETED 2026-09-23** — see scaffolding retire inventory |
| `ordinary-current-companion` | datepicker, expansion, icon, sidenav, … | **DELETED 2026-09-23** after demos/examples retirement |
| `owned-overlap-ordinary` | ordinary `button`/`card`/… vs owned `legacy-*` | **DELETED 2026-09-23** after e2e/universal retire |
| `unresolved-relative` | **0** (was 68 `.import` false-negatives + 1 comment placeholder) | **No `src/` delete yet** — shared-core/companions still block; relative edges closed |
| Package leads (`@angular/*`, CDK, sass:) | peers / builtins | N/A — dependency policy, not `src/` delete |

## Candidates for later deletion (after closure)

| Area | Condition before delete |
| --- | --- |
| `src/material/legacy-*` component sources mirrored in `projects/` | **DONE 2026-09-23** — 22 dirs deleted; see `src-legacy-mirror-delete-2026-09-23.json` |
| `src/material/legacy-*/testing` for ports already packing | Same closure + packed testing entry smoke |
| Bazel `BUILD.bazel` / tools unused by ng-packagr path | Confirm CI workflows no longer invoke Bazel for the library build |
| Demo/docs apps under `src/` not used as fixtures | Keep until public fixture apps replace them |

## Must keep for now

- Inventories, goldens, and research packets under `compatibility/` / `research/`.
- Historical `tools/public_api_guard/{cdk,material,google-maps,youtube-player}`
  golden files (reference only; no Bazel targets).
- Relative unresolved **0**; projects-rooted visits under `src/` **0**; pack tarball
  `src/material` members **0**. `src/` = retirement README only.

## Next concrete steps

1. Keep `escape-edge-classification.json` updated when ports land.
2. Optionally re-run `python3 scripts/source-closure.py` against
   `projects/ngx-material-legacy` and attach unresolved edges.
3. `src/material/legacy-prebuilt-themes` **DONE** — see
   `src-legacy-prebuilt-themes-delete-2026-09-23.json`.
4. Ordinary companions / `src/material/core`: **DELETED** after demos/examples retire
   (`src-scaffolding-retire-2026-09-23.json`).
5. Owned-overlap ordinary + e2e/universal: **DELETED**
   (`src-e2e-universal-ordinary-retire-2026-09-23.json`).
6. Residual non-Material packages + hollow material: **DELETED**
   (`src-residual-packages-retire-2026-09-23.json`).

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

## Status check (2026-09-23 legacy-prebuilt-themes delete)

**Owned:** `projects/.../styles/{core,legacy-core}/theming/prebuilt/*.scss` (already
extracted in shared-core batch; packing via ng-packagr `styles/**/*.scss` assets).

**Narrow delete:** `src/material/legacy-prebuilt-themes` (Bazel CSS genrule stub only).
Provenance: `src-legacy-prebuilt-themes-delete-2026-09-23.json`.

| Metric | After prebuilt delete |
| --- | --- |
| Legacy→ordinary relative edges | **0** |
| Unresolved relative | **0** |
| Projects-rooted visits under `src/` | **0** |
| Default src-legacy roots | **0** (empty) |
| Pack tarball `src/material` members | **0** |

**Ordinary companions + `src/material/core`:** unused from projects/ + pack
(`ordinary-companions-unused-proof-2026-09-23.json`) but **retained** — historical
`src/dev-app`, `src/components-examples`, and Bazel BUILD graphs still reference them.
Prefer docs over deletes. Pack via `node scripts/pack-library.mjs`.


## Status check (2026-09-23 scaffolding retire)

Retired `src/dev-app` + `src/components-examples` and deleted `src/material/core` plus
ordinary companions listed in `ordinary-companions-unused-proof-2026-09-23.json`.
Projects-rooted closure: **450** visited, **0** under `src/`, **0** unresolved.
Pack tarball: **0** `src/material` members; AOT harness + motion smokes OK.
Remaining `src/material/*` are owned-overlap ordinary + schematics/testing/prebuilt-themes.
Provenance: `src-scaffolding-retire-2026-09-23.json`. No npm publish.


## Status check (2026-09-23 e2e/universal + owned-overlap retire)

Retired `src/e2e-app` + `src/universal-app` (+ `integration/size-test/material`), then
deleted owned-overlap ordinary dirs and hollow schematics/testing/prebuilt-themes.
Projects-rooted closure: **450** visited, **0** under `src/`, **0** unresolved.
Provenance: `src-e2e-universal-ordinary-retire-2026-09-23.json` and
`owned-overlap-unused-proof-2026-09-23.json`. Residual cdk*/maps/youtube/adapters/
experimental **retained-documented**. No npm publish.


## Status check (2026-09-23 residual non-Material packages retire)

User-confirmed delete of remaining non-Material `src/` trees after ordinary cleanup.
Deleted: `src/cdk`, `src/cdk-experimental`, `src/google-maps`, `src/youtube-player`,
date adapters, `src/material-experimental`, hollow `src/material`, plus solely-
supporting integration Bazel leftovers. Scrubbed root Bazel / CODEOWNERS /
tsconfig / ng-dev / tslint / prettier / tsec. `src/` now = `README.md` only.
Projects-rooted closure: **450** visited, **0** under `src/`, **0** unresolved.
Provenance: `src-residual-packages-retire-2026-09-23.json` and
`residual-packages-unused-proof-2026-09-23.json`. No npm publish.
