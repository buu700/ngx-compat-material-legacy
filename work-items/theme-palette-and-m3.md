# ThemePalette and M3 coexistence

## Historical TypeScript contract

Own `LegacyThemePalette` locally as the historical structural type:

```ts
export type LegacyThemePalette = 'primary' | 'accent' | 'warn' | undefined;
```

Do not use current Material's M2 behavior as the implementation dependency. Runtime compatibility is intentionally broader than the nominal union: the v16 color mixin interpolated arbitrary truthy strings into `mat-${color}`. Tests must include an arbitrary value such as `none` and verify `.mat-none` behavior rather than rejecting it.

## Historical M2 mode

The role name chooses `primary`/`accent`/`warn` from the package-owned historical theme map. Legacy components emit historical classes and owned CSS. Current companion components receive equivalent values through their stable public current override/token bridge.

## Required mixed-generation coexistence

Official current Material is themed normally by the consumer using M3. Legacy-owned controls use the independent historical M2 theme. Implement and test the owned-only aggregate `all-owned-component-themes` so this composition does not emit ordinary-current-component M2 bridges or unintentionally overwrite M3 tokens. Keep historical aggregate behavior unchanged.

Cover include order, nested scope, shared structural styles and overlay containers. See `docs/03-sass-contract.md` for the two different aggregate contracts. The public fixture must distinguish default historical theming from opt-in mixed-generation composition.

## Optional native M3 legacy theme

A future `system-theme()` may source legacy component colors from public Material system tokens, with primary/accent/warn mapping to primary/tertiary/error. It is not an RC or first-stable requirement and must not be exported or advertised before implementation. It may not alter the historical M2 theme contract or its map shapes. Preserve the existing public color input/classes and runtime permissiveness in either future mode.
