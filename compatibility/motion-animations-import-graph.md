# Remaining `@angular/animations` import graph (honest)

Captured **2026-09-23** after CSS-motion wave for dialog / snack-bar / tooltip.

## Primary FESM — real `from '@angular/animations'` imports

| FESM entry | Status |
| --- | --- |
| `legacy-dialog` | **Removed** (CSS + timers; Material 22-style) |
| `legacy-snack-bar` | **Removed** (CSS keyframes + fallbacks) |
| `legacy-tooltip` | **Removed** (runtime was already CSS; recipe moved) |
| `legacy-menu` | **Still required** — component `animations:` + recipe |
| `legacy-select` | **Still required** |
| `legacy-form-field` | **Still required** |
| `legacy-tabs` | **Still required** |

## Opt-in recipe secondary entries (peer only if imported)

| Entry | Export |
| --- | --- |
| `legacy-dialog/animations` | `matDialogAnimations` / `matLegacyDialogAnimations` |
| `legacy-snack-bar/animations` | `matSnackBarAnimations` / `matLegacySnackBarAnimations` |
| `legacy-tooltip/animations` | `matLegacyTooltipAnimations` |

These still import `@angular/animations` (real `AnimationTriggerMetadata`). Historical
primary-path recipe re-exports were **removed** so primary FESMs stay peer-free.

## Source files still importing the engine (primary path)

| File | Kind |
| --- | --- |
| `legacy-menu/menu-animations.ts` | value recipes |
| `legacy-menu/internal/menu-base.ts` | `import type {AnimationEvent}` |
| `legacy-select/select-animations.ts` | value recipes |
| `legacy-form-field/form-field-animations.ts` | value recipes |
| `legacy-tabs/tabs-animations.ts` | value recipes |
| `legacy-tabs/internal/tab-body-base.ts` | `import type {AnimationEvent}` |
| `legacy-autocomplete/internal/autocomplete-base.ts` | `import type {AnimationEvent}` (erased; no FESM import) |

## Peer status

- `peerDependenciesMeta["@angular/animations"].optional = true` (unchanged)
- **Truly optional for consumers** who only use dialog / snack-bar / tooltip / non-animated entries
- **Still required at runtime** if importing menu / select / form-field / tabs primary entries, or any `/animations` recipe entry

## Pack note

Always build with `node scripts/pack-library.mjs` (passes `-c tsconfig.lib.json`).
Bare `ng-packagr -p …` without `-c` uses ng-packagr's default tsconfig and fails TS2564.
