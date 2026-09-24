# Animation engine import graph (F04)

Captured after F04 recipe-secondary removal.

## Primary FESM

No primary overlay FESM imports `@angular/animations` or
`@angular/platform-browser/animations`. Motion is CSS / timers / Web Animations
coordinated through the public `MATERIAL_ANIMATIONS` token.

## Recipe secondary entries

**Removed from the shipping tree (F04).** Historical symbols
(`matDialogAnimations`, `matFormFieldAnimations`, `matMenuAnimations`,
`matLegacySelectAnimations`, `matSnackBarAnimations`, `matTabsAnimations`,
`matLegacyTooltipAnimations`, …) are recorded in
`compatibility/compatibility-exceptions.json` with native migrations.

## Testing

`legacy-dialog/testing` uses `{provide: MATERIAL_ANIMATIONS, useValue: {animationsDisabled: true}}`
instead of `NoopAnimationsModule`.

## Peer status

`@angular/animations` is **not** a peer of `@ngx-compat/material-legacy`.
