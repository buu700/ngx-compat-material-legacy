# Compatibility delivery status (RC without publish)

Snapshot for handoff gates. Package `@ngx-compat/material-legacy@22.0.0-rc.0`
(repo `buu700/ngx-compat-material-legacy`). **No npm publish.**
`migrate-legacy` rewrites `@angular/material` → `@ngx-compat/material-legacy` only.

## RC candidate (unpublished) checklist

| Gate | Status | Evidence |
| --- | --- | --- |
| Scoped legacy component secondary entries | **Done** | All 22 `research/scope.json` preserved entries pack |
| Historical `*/testing` secondary entries | **Done** | **22/22** pack; ESM smoke 44 imports OK |
| Sass root facade + theme smoke | **Done** | `#4527a0` deep-purple 800; `color.opacity` Sass 1.104 fixes |
| `migrate-legacy` schematic (real rewrites) | **Done** | Fixtures **25/25**; Sass `@use` + safe TS `legacy-*` + acknowledgement paths |
| Peer-light pre-upgrade CLI (bundled artifact) | **Done** | `migration/dist/*.tgz`; `--verify` green |
| Companion/aggregate/current acknowledgement flows | **Done** | Shared engine flags; CLI + schematic; fixtures cover acked + unacked paths |
| Escape-edge classification (no mass-delete) | **Done (docs)** | Advanced per-specifier dispositions; still **68** stubs; no `src/` delete |
| Pack + inspect | **Done (expected flags)** | `compatibility/pack-proof/`; inspector still flags animation peer/refs |
| License / provenance | **Done** | Google MIT notice + Copyright (c) 2026 Ryan Lester |
| Peer-floor tighten (`^22.1.7`) | **Done** | Advertised Angular/Material/CDK peers = security/tested floor |
| Packed-consumer AOT + harness runtime | **Done** | `aot-harness-smoke.json` — AOT button/dialog/form-field/select; harness button+select |
| Motion incremental (MATERIAL_ANIMATIONS) | **Partial** | Dialog zero-duration disable path; engine metadata retained |
| W07 theme coexistence | **Done (evidence)** | `fixtures/interop/` + `theme-coexistence.css` |
| W09 upstream triage ledger | **Done (starter)** | `compatibility/upstream-triage-ledger.json` |
| W10 support matrix / 21.x prep | **Partial** | `compatibility/support-matrix.md` checklist; no `21.x` branch yet |
| Publish readiness (no publish) | **Done (docs)** | `compatibility/publish-readiness.md` |
| CI green on push | **Done** | Tip run https://github.com/buu700/ngx-compat-material-legacy/actions/runs/35932193898 success on `fb722b982` (helper + packed-consumer AOT) |

## Testing matrix (`*/testing`)

All **22/22** historical testing secondary entries pack (unchanged). See prior matrix
in git history / `consumer-smoke.json` `testing_matrix`.

## CLI / schematic status

- **Schematic:** `ng generate @ngx-compat/material-legacy:migrate-legacy`
- **Bundled artifact:** `migration/dist/ngx-compat-material-legacy-migrate-cli-22.0.0-rc.0.tgz`
- Rebuild/verify: `node scripts/build-migrate-legacy-cli.mjs[--verify]`

## Motion

- Overlay trio still owns `@angular/animations` trigger metadata
- **New:** `getLegacyAnimationsState()` / `legacyAnimationsDisabled()` in `legacy-core`
  (public `MATERIAL_ANIMATIONS` only; no private Material helpers)
- **New:** `MatLegacyDialogContainer` uses zero-duration params when disabled
- Full engine removal still **deferred** (`compatibility/motion-overlay-trio.md`)

## This tip

- CI green on `fb722b982` (run 35932193898): Helper tests + Packed-consumer AOT and harness.
- Peer floor applied: advertised `^22.1.7` (was `^22.0.0`)
- Sass `opacity()` → `color.opacity()` for Dart Sass 1.104 theme smoke
- Packed-consumer AOT + harness runtime evidence committed
- W07 coexistence CSS evidence; W09 ledger; W10 matrix checklist; publish-readiness doc
- Escape edges: dispositions advanced; **68** unresolved; no mass-delete

## Left for maintainer publish (out of this RC-without-publish stream)

1. Maintainer-authorized **npm publish** of `@ngx-compat/material-legacy@22.0.0-rc.0`
2. Motion follow-up: remove deprecated animation engine from menu/select/form-field/etc.
   without breaking contracts
3. `src/` cleanup only after unresolved escape edges close
4. Optional: create `21.x` maintenance branch per `compatibility/support-matrix.md`
5. Re-run GHSA/OSV + lockfile audit immediately before publish

## Constraints (unchanged)

- No Cyph in repo; Cyph-safe CSS/SCSS only.
- Author/committer: Ryan Lester <hacker@linux.com> only (no Co-authored-by).
- Auth for push: `GH_TOKEN` from token file + `/home/box/.local/bin/ngx-git-push`.
- No npm publish from this workstream.
