# Migration report seed (Sass / current-bridge)

Status: seed only — expand when schematics land. Recorded 2026-09-23 (America/New_York).

## Default Sass migration

```scss
// Before
@use '@angular/material' as mat;
// After
@use '@ngx-compat/material-legacy' as mat;
```

Namespace, palettes, theme expressions, mixin calls, selectors, declarations, inclusion
order, and configuration stay the same for the **owned legacy** layer.

## Symbol classes (from B-SASS-02)

| Symbol / fixture class | Classification | Consumer acknowledgement |
| --- | --- | --- |
| `define-palette`, `define-light-theme`, `define-dark-theme`, `define-legacy-typography-config`, owned `*-theme` mixins, `all-legacy-component-themes` membership | **owned-legacy** — Material-16.2.14 CSS parity required | None beyond module URL change |
| `core()`, `legacy-core()` structural output | **current-bridge / shared-infrastructure** — includes current `@angular/cdk` overlay & a11y CSS | Expect `forced-colors`, `prefers-reduced-motion`, and current overlay popover rules instead of Material-16 `.cdk-high-contrast-active` / historical overlay CSS. Not a visual certification of v16 CDK chrome. |
| Ordinary current companions invoked from historical spellings (e.g. `expansion-theme` in aggregate fixture) | **ordinary-current bridge** | Renders via current Material theming surfaces; owned legacy tokens feed the bridge where documented |

## Risks called out for readiness

1. Apps that asserted on Material-16 CDK overlay/high-contrast selector strings in CSS
   snapshots will see diffs under `core()` even when legacy component themes match.
2. High-contrast automation that only toggles `.cdk-high-contrast-active` may miss
   `forced-colors` media behavior from current CDK.
3. Aggregate size/membership must be monitored so future ports do not silently drop
   legacy theme members.

Evidence: `compatibility/bridge-disposition/`, 
`compatibility/pack-proof/candidate-vs-reference-css.json`.
