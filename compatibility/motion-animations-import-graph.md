# Remaining `@angular/animations` import graph (honest)

Captured **2026-09-23** on library source under `projects/ngx-material-legacy/`.
Full peer / recipe removal is **still blocked**. Do not fake empty trigger metadata.

## Source files (12)

| File | Import kind | Why retained |
| --- | --- | --- |
| `legacy-dialog/dialog-animations.ts` | value (`trigger`/`animate`/…) | Owned `[@dialogContainer]` recipe |
| `legacy-dialog/dialog-container.ts` | `AnimationEvent` (handler params) | Bound to recipe `@.done` / `@.start` |
| `legacy-menu/menu-animations.ts` | value | Owned menu panel / fade recipes |
| `legacy-menu/internal/menu-base.ts` | `AnimationEvent` | Panel animation subjects / handlers |
| `legacy-select/select-animations.ts` | value | Owned panel transform recipes |
| `legacy-form-field/form-field-animations.ts` | value | Owned subscript message recipe |
| `legacy-snack-bar/snack-bar-animations.ts` | value | Owned enter/exit recipe |
| `legacy-snack-bar/internal/snack-bar-container-base.ts` | `AnimationEvent` | `onAnimationEnd` |
| `legacy-tabs/tabs-animations.ts` | value | Owned translate-tab recipe |
| `legacy-tabs/internal/tab-body-base.ts` | `AnimationEvent` | `_translateTabComplete` stream |
| `legacy-tooltip/tooltip-animations.ts` | value | **Exported API** `matLegacyTooltipAnimations` only — runtime tooltip uses CSS |
| `legacy-autocomplete/internal/autocomplete-base.ts` | `AnimationEvent` (type shape) | Abstract `_animationDone`; legacy sets `null` (no runtime engine) |

## Packed FESM entries that still import `@angular/animations` (21.0.0-rc.0)

- `fesm2022/ngx-compat-material-legacy-legacy-dialog.mjs`
- `fesm2022/ngx-compat-material-legacy-legacy-form-field.mjs`
- `fesm2022/ngx-compat-material-legacy-legacy-menu.mjs`
- `fesm2022/ngx-compat-material-legacy-legacy-select.mjs`
- `fesm2022/ngx-compat-material-legacy-legacy-snack-bar.mjs`
- `fesm2022/ngx-compat-material-legacy-legacy-tabs.mjs`
- `fesm2022/ngx-compat-material-legacy-legacy-tooltip.mjs` (via exported recipe re-export)

`legacy-autocomplete` does **not** appear in the packed animations importer list (type usage erased).

## What is already reduced

- Disable helper: `legacyAnimationsDisabled()` / `MATERIAL_ANIMATIONS` → 0ms params on dialog, menu, select, form-field, snack-bar, tabs.
- Tooltip **runtime** path is CSS classes; `_animationsDisabled` honors the same helper.
- Optional peer `@angular/animations` remains advertised because the seven recipe entries above ship real `AnimationTriggerMetadata`.

## What would unblock full peer removal

1. Replace each owned recipe with CSS or Web Animations API equivalents **and** keep public trigger names or ship a documented breaking migration.
2. Stop re-exporting `matLegacyTooltipAnimations` from `legacy-tooltip` **or** move it to a secondary entry consumers opt into (mild API path break).
3. Replace `AnimationEvent` handler contracts with local event shapes where still needed after (1).

Until then: optional peer stays; inspector flags expected. See `motion-overlay-trio.md`.
