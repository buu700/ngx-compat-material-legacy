# Compatibility delivery status (RC without publish)

Snapshot for handoff gates. Package `@ngx-compat/material-legacy@22.0.0-rc.0`
(repo `buu700/ngx-compat-material-legacy`). **No npm publish.**
`migrate-legacy` rewrites `@angular/material` → `@ngx-compat/material-legacy` only.

## RC candidate (unpublished) checklist

| Gate | Status | Evidence |
| --- | --- | --- |
| Scoped legacy component secondary entries | **Done** | All 22 preserved entries pack |
| Historical `*/testing` secondary entries | **Done** | **22/22** pack; ESM smoke 44 imports OK |
| Sass root facade + theme smoke | **Done** | `#4527a0`; `color.opacity` Sass 1.104 fixes |
| `migrate-legacy` + peer-light CLI | **Done** | Fixtures **25/25**; CLI `--verify` green |
| Escape-edge classification | **Done (advanced)** | Unresolved relative **68→1** via `.import` resolver fix; no `src/` mass-delete |
| Pack + inspect | **Done (expected flags)** | Animation peer/refs still flagged |
| License / provenance | **Done** | Google MIT + Copyright (c) 2026 Ryan Lester |
| Peer-floor tighten (`^22.1.7`) | **Done** | Security/tested floor |
| Packed-consumer AOT + harness | **Done** | `aot-harness-smoke.json` |
| Motion MATERIAL_ANIMATIONS wiring | **Partial** | dialog/menu/select/form-field/snack-bar/tabs; engine metadata retained |
| W07 theme coexistence | **Done** | `theme-coexistence.css` |
| W09 upstream triage ledger | **Done (starter)** | `upstream-triage-ledger.json` |
| W10 21.x line | **Partial** | Branch `21.x` + aged peer install; library rebuild blocked |
| Publish readiness (no publish) | **Done (docs)** | `publish-readiness.md` |
| CI green on push | **Pending tip** | Prior green: https://github.com/buu700/ngx-compat-material-legacy/actions/runs/35932274661 |

## Motion

- Owned helper: `legacyAnimationsDisabled` / `legacyAnimationTriggerState`
- Wired zero-duration paths: dialog, menu, select, form-field, snack-bar, tabs
- Tooltip runtime already CSS-based (engine recipe export-only)
- **Still deferred:** remove `@angular/animations` trigger metadata from published runtime
- Evidence: `compatibility/pack-proof/motion-lifecycle-smoke.json`

## Escape edges / `src/`

- Resolver fix: `.import` → `_*.import.scss` in `scripts/source-closure.py`
- Unresolved relative count: **1** (density `<legacy-component>` placeholder)
- Shared-core + ordinary companions: still **blocked** from delete
- Prefer documenting; no mass-delete

## 21.x

Branch `origin/21.x` (`e7e6d9bec`): metadata `21.0.0-rc.0`, aged peers install OK,
library rebuild against Material 21 **blocked** pending adaptation. Details:
`compatibility/support-matrix.md`, `STATUS-21.md` on `21.x`.

## Left for maintainer / later waves

1. Owner-authorized npm publish of 22.x RC
2. CSS/WAAPI migration to drop `@angular/animations` peer
3. Narrow `src/` deletes only with provenance after shared-core closure
4. 21.x library adaptation + pack + Node 20.19 consumer smoke
5. Re-run GHSA/OSV before publish

## Constraints

- No Cyph in repo; Cyph-safe CSS/SCSS only.
- Author/committer: Ryan Lester <hacker@linux.com> only (no Co-authored-by).
- Push via `/home/box/.local/bin/ngx-git-push`.
- No npm publish from this workstream.
