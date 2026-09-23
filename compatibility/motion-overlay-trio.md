# Motion / animation decisions — overlay trio and related entries

Handoff policy: remove the deprecated animation engine from published runtime
where required; preserve meaningful APIs with tested migrations; no fake
metadata; use public `MATERIAL_ANIMATIONS` when present; never call private
`_getAnimationsState`.

## Decision for this port wave

Full motion removal would block shipping `legacy-dialog` / `legacy-menu` /
`legacy-select` / `legacy-form-field` panel contracts that historically bind
Angular animation triggers (`[@dialogContainer]`, `transformMenu`,
`fadeInItems`, select panel transforms, form-field message transitions).

Therefore this project **owns historical animation metadata locally** rather than
depending on removed upstream Material 22 exports, and progressively wires the
public disable path:

| Entry | Owned metadata | MATERIAL_ANIMATIONS / disable path |
| --- | --- | --- |
| `legacy-dialog` | `matDialogAnimations` | Zero-duration `enter`/`exit` params when disabled |
| `legacy-menu` | `matMenuAnimations` | Parameterized `enterDuration`/`exitDuration`; `_getPanelAnimationState()` |
| `legacy-select` | `matLegacySelectAnimations` | Parameterized panel durations; `_getTransformPanelState()` |
| `legacy-form-field` | `matFormFieldAnimations` | Parameterized `transitionDuration`; `_getSubscriptAnimationState()`; `_animationsEnabled` also respects helper |
| `legacy-snack-bar` | `matSnackBarAnimations` | Parameterized enter/exit; `_getAnimationState()` |
| `legacy-tabs` | `matTabsAnimations` | `animationDuration` getter forces `0ms` when disabled |
| `legacy-autocomplete` | `_animationDone = null` (historical) | Skips panel exit animation stream |
| `legacy-tooltip` | Exported recipe file only (API compat) | **Runtime uses CSS** show/hide classes; `_animationsDisabled` also honors `legacyAnimationsDisabled()` / MATERIAL_ANIMATIONS |

Inspector flags for `@angular/animations` references are **expected** until a
follow-up migration removes engine-bound recipes with tested CSS/`animate`
alternatives. Do not delete trigger APIs without a consumer migration path.

## Incremental progress (2026-09-23)

| Change | Detail |
| --- | --- |
| Owned helper | `getLegacyAnimationsState()`, `legacyAnimationsDisabled()`, `legacyAnimationTriggerState()` |
| Public APIs only | `MATERIAL_ANIMATIONS` + `ANIMATION_MODULE_TYPE` + `MediaMatcher` |
| Evidence | `compatibility/pack-proof/motion-lifecycle-smoke.json` |
| Still deferred | Full removal of `@angular/animations` trigger metadata from published runtime |

Honest status: **not done** for engine removal. Optional `@angular/animations`
peer remains required for dialog/menu/select/form-field/snack-bar/tabs recipes.
Consumer disable path: provide `MATERIAL_ANIMATIONS` with `{animationsDisabled: true}`
or `NoopAnimations` / reduced-motion — durations become `0ms` on wired entries.

## Tooltip note

`LegacyTooltipComponent` does not register Angular `animations:` metadata. Show/hide
uses CSS classes. The exported `matLegacyTooltipAnimations` recipe remains for
historical public API compatibility and still imports `@angular/animations` types —
inspector flags on that export are expected until a tested migration removes the
symbol or replaces it with an honest non-engine type.

## Import graph (2026-09-23 follow-up)

See `motion-animations-import-graph.md` for the precise 12-file source list and
7 packed FESM importers. Another pass confirmed: type-only `AnimationEvent` usage
can use `import type` (hygiene); **value** recipe imports cannot be removed without
CSS/WAAPI replacements. Tooltip remaining coupling is the **exported** recipe
re-export into `legacy-tooltip` FESM — not the runtime CSS show/hide path.

## CSS-motion wave (2026-09-23)

| Entry | Runtime motion | Recipe location |
| --- | --- | --- |
| `legacy-dialog` | CSS + timers (`mat-legacy-dialog-container-*`) | `legacy-dialog/animations` (opt-in) |
| `legacy-snack-bar` | CSS keyframes + timeout fallbacks | `legacy-snack-bar/animations` (opt-in) |
| `legacy-tooltip` | CSS classes (unchanged) | `legacy-tooltip/animations` (opt-in) |
| `legacy-menu` / `select` / `form-field` / `tabs` | Still Angular trigger metadata on primary | Same primary entry |

Primary-path recipe re-exports removed for dialog/snack-bar/tooltip (mild import-path
break for the rare consumer of `matLegacy*Animations` from the primary entry).
Disable path: `provideNoopAnimations()` / `MATERIAL_ANIMATIONS` still honored.
Evidence: `pack-proof/motion-lifecycle-smoke.json`, expanded `aot-harness-smoke.json`.

