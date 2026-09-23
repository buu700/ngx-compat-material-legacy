# Remaining `@angular/animations` import graph (honest)

Captured **2026-09-23** after CSS-motion wave for **all** overlay entries.

## Primary FESM — real `from '@angular/animations'` imports

| FESM entry | Status |
| --- | --- |
| `legacy-dialog` | **Cleared** (CSS + timers) |
| `legacy-snack-bar` | **Cleared** (CSS keyframes) |
| `legacy-tooltip` | **Cleared** (CSS classes) |
| `legacy-menu` | **Cleared** (CSS keyframes) |
| `legacy-select` | **Cleared** (CSS keyframes + exit-before-detach) |
| `legacy-form-field` | **Cleared** (CSS subscript transitions) |
| `legacy-tabs` | **Cleared** (CSS transform transitions) |

**No primary overlay FESM requires `@angular/animations` at runtime.**

## Opt-in recipe secondary entries (peer only if imported)

| Entry | Export |
| --- | --- |
| `legacy-dialog/animations` | `matDialogAnimations` / `matLegacyDialogAnimations` |
| `legacy-snack-bar/animations` | `matSnackBarAnimations` / `matLegacySnackBarAnimations` |
| `legacy-tooltip/animations` | `matLegacyTooltipAnimations` |
| `legacy-menu/animations` | `matMenuAnimations` / `matLegacyMenuAnimations`, `fadeInItems`, `transformMenu` |
| `legacy-select/animations` | `matLegacySelectAnimations` |
| `legacy-form-field/animations` | `matFormFieldAnimations` / `matLegacyFormFieldAnimations` |
| `legacy-tabs/animations` | `matTabsAnimations` / `matLegacyTabsAnimations` |

## Source files still importing the engine

Only under `**/animations/**` secondary entry folders (plus erased `import type` on autocomplete if present).

## Peer status

- `peerDependenciesMeta["@angular/animations"].optional = true`
- **Truly optional** for consumers who do not import any `/animations` recipe entry
- Historical primary-path `matLegacy*Animations` re-exports **removed** (mild import-path break)

## Pack note

Always build with `node scripts/pack-library.mjs` (passes `-c tsconfig.lib.json`).

## Autocomplete (2026-09-23 follow-up)

`legacy-autocomplete` uses `_animationDone = null` historically. The abstract field
type is now an owned `LegacyAutocompleteAnimationEvent` — **no**
`@angular/animations` import (type or value) outside `/animations` folders.
