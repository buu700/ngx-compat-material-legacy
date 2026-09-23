# Motion / animation decisions — overlay trio (2026-09-23)

Handoff policy: remove the deprecated animation engine from published runtime
where required; preserve meaningful APIs with tested migrations; no fake
metadata; use public `MATERIAL_ANIMATIONS` when present; never call private
`_getAnimationsState`.

## Decision for this port wave

Full motion removal would block shipping `legacy-dialog` / `legacy-menu` /
`legacy-select` / `legacy-form-field` panel contracts that historically bind
Angular animation triggers (`[@dialogContainer]`, `transformMenu`,
`fadeInItems`, select panel transforms, form-field message transitions).

Therefore this wave **owns historical animation metadata locally** rather than
depending on removed upstream Material 22 exports:

| Entry | Owned metadata | Notes |
| --- | --- | --- |
| `legacy-dialog` | `matDialogAnimations`, `_defaultParams` / `defaultParams` | Container keeps `@angular/animations` triggers; peer remains optional. |
| `legacy-menu` | `matMenuAnimations`, `fadeInItems`, `transformMenu` | Same approach as dialog. |
| `legacy-autocomplete` | `_animationDone = null` on legacy panel (historical) | Legacy autocomplete intentionally skips panel exit animation stream. |
| `legacy-select` / `legacy-form-field` | already owned earlier | Unchanged this wave. |

Inspector flags for `@angular/animations` references are **expected** until a
follow-up migration removes engine-bound recipes with tested CSS/`animate`
alternatives. Do not delete trigger APIs without a consumer migration path.

## RC note (documentation only)

No breaking animation-recipe removals in this RC-without-publish wave. Consumers
who need to disable animations should use the public `MATERIAL_ANIMATIONS` token
(`animationsDisabled: true`) from `@angular/material/core`. Owned
`@angular/animations` trigger metadata remains until a tested migration proves
dialog/menu/select contracts stay intact. See `migration/README.md`.

## Status after advisory triage (2026-09-23)

Advisory triage (`compatibility/advisory-triage.md`) found no GHSA that requires
removing or replacing owned `@angular/animations` trigger metadata on the aged
22.1.7 peer set. Full engine removal from overlays remains **deferred** until a
tested migration preserves dialog/menu/select contracts. Consumer disable path
remains public `MATERIAL_ANIMATIONS` / `animationsDisabled`.

## Incremental progress (2026-09-23 peer-floor / motion wave)

Landed **maximum safe incremental step** without removing engine-bound recipes:

| Change | Detail |
| --- | --- |
| Owned helper | `getLegacyAnimationsState()` / `legacyAnimationsDisabled()` in `legacy-core` |
| Public APIs only | Reads `MATERIAL_ANIMATIONS` + `ANIMATION_MODULE_TYPE` + `MediaMatcher`; does **not** call `_getAnimationsState` / `_animationsDisabled` |
| Dialog wiring | `MatLegacyDialogContainer` captures disabled state in field init; uses `LEGACY_ZERO_ANIMATION_PARAMS` when disabled |
| Evidence | `compatibility/pack-proof/motion-lifecycle-smoke.json` via `scripts/motion-lifecycle-smoke.mjs` |
| Still deferred | Full removal of `@angular/animations` trigger metadata from dialog/menu/select/form-field/snack-bar/tooltip/tabs |

Honest status: **not done** for engine removal. Overlay contracts still require the optional `@angular/animations` peer for historical trigger metadata. Consumer disable path: provide `MATERIAL_ANIMATIONS` with `{animationsDisabled: true}` (now honored for dialog durations) or `NoopAnimations`.
