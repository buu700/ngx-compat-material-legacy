# Active blockers

## B-CI-01 — Push-triggered Actions initially produced zero runs
Mitigated: push-triggered CI is producing runs. Keep `workflow_dispatch` as a backup.

## B-CI-02 — CLI `--verify` hash drift (mitigated)
Committed CLI tarball bytes drifted from `compatibility/migrate-legacy-cli-artifact.json`
after repository metadata updates inside the packaged files. Mitigated by rebuilding
the artifact + hash record. Keep watching Actions on follow-up pushes.

## B-ADV-01 — Aged peer advisory triage (mitigated; peer floor applied)
Triage in `compatibility/advisory-triage.md` (2026-09-23). Exact pins
`@angular/*@22.1.7` / Material+CDK `22.1.7` are OSV-clean. Advertised library peers
tightened to **`^22.1.7`**. Re-check advisories immediately before npm publish.

## B-PKG-03 — Remaining non-component work
**Mitigated for component scope + full historical testing + migrate-legacy + bundled CLI.**

### Still open
- **`src/` mass-delete** — still blocked for the remaining tree. Unresolved relative
  edges **0**; legacy→ordinary escape edges **0** after narrow delete of 22
  `src/material/legacy-*` mirrors (shared-core was 353 HEAD-before / 578 W01).
  Retained: `src/material/core`, ordinary companions, `legacy-prebuilt-themes`.
  See `compatibility/inventories/src-cleanup-plan.md`.
- **Maintainer-authorized npm publish** — owner-only after packed-artifact checks.
- **`21.x` maintenance line** — packs + Node 20.19 consumer smoke on branch; keep the
  Angular 21 lockfile off `main` (`compatibility/support-matrix.md`).

### Motion (resolved for primary runtime)
Primary overlay FESMs (**dialog / menu / select / form-field / snack-bar / tabs /
tooltip / autocomplete**) have **zero** `@angular/animations` imports. Runtime uses
CSS/timer motion (Material 22-style). Historical `AnimationTriggerMetadata` recipes
live under opt-in `legacy-*/animations` secondary entries only — the peer remains
`optional: true` and is **truly optional** unless a consumer imports those entries.
See `compatibility/motion-animations-import-graph.md` and
`compatibility/motion-overlay-trio.md`.

Pack always via `node scripts/pack-library.mjs` (`-c tsconfig.lib.json`).

## B-MOTION-01 — Full animation-engine removal from primary FESM
**Mitigated (2026-09-23).** Primary overlay entries cleared. Remaining peer surface is
opt-in `/animations` recipe entries only (by design for API compat).

## B-ESC-01 — Unresolved relative escape edges
**Mitigated → 0.** Was 68 lexical `.import` false-negatives + placeholders. Resolver
maps `.import` → `_*.import.scss`, strips comments, ignores `<...>` placeholders.
**Unresolved relative closed.** Legacy→core escape edges cleared by narrow mirror
delete; remaining `src/` tree still not mass-deletable (core/companions/prebuilt).

## B-21-01 — 21.x library rebuild
**Mitigated on branch.** `21.x` packs against aged Angular 21.2.23 / Material 21.2.14
with Sass/ESM/AOT + Node 20.19 consumer smoke (`compatibility/pack-proof-21/`). Owner
publish to `lts-21-next` later. **Do not merge 21 lockfile into `main`.**

## Resolved / mitigated (historical)
- Full historical testing ports (22/22); peer-light migrate CLI; escape-edge
  classification; overlay / selection / chrome ports; pack-proof; Sass seals;
  aged Angular 22.1.7 toolchain.

## Constraints
- Cyph tree at `/workspace/ngx-compat/reference/cyph-dev-prod` is oracle-only; never commit it.
- Isolated Material-16 env is local-only; never commit `node_modules`.
- No npm publish from agent workstreams.
- No mass-delete of `src/`. Narrow deletes require provenance JSON + closure proof
  (2026-09-23 batch: `src-legacy-mirror-delete-2026-09-23.json`).
