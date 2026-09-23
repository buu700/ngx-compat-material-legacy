# 3. Conservative Sass, owned M2 model and emitted-style contract

## Default migration: source location only

Supported historical consumers should keep the same Sass expressions. Change the root module source from `@angular/material` to `@ngx-compat/material-legacy`, preserving the existing namespace. Do not rename variables, prefix helpers with `m2-`, replace theme constructors, alter maps, insert `all-component-themes`, reorder includes or change CSS selectors. Unknown cases produce diagnostics and no guessed edits.

This contract is stronger than “the stylesheet builds.” Material 16 unprefixed palettes are M2; newer unprefixed overlapping names can be M3 [B03, SASS-04]. Historical `core()` emits structural setup while the inspected current mixin is empty [SASS-02, SASS-03]. Both can fail semantically without an undefined-symbol error.

## Own the historical M2 model now

Do **not** implement the facade by calling current Material's `m2-*` functions, variables, M2 theme mixins, color-backcompat mixins, or other APIs documented as compatibility-only/planned for removal. Those sources are valuable reference implementations and test oracles while they exist, but they are not runtime/build dependencies of this package.

Own the Material-16-compatible representation locally:

- palette maps and contrast maps;
- `define-palette`, hue/color/contrast accessors;
- light/dark foreground and background maps;
- theme constructors/accessors and the historical theme-map shape;
- typography levels/configurations/hierarchy behavior;
- density configuration semantics;
- configurable module variables such as duplication warnings;
- legacy component theme/color/typography/density mixins;
- aggregate membership/order and old `core()` responsibilities.

Preserve values **and structure**. A consumer may call `map.get`, `map.merge`, `map.deep-merge`, `meta.inspect`, or custom functions against the returned theme/palette/config maps. Equivalent final CSS is not enough if those Sass values differ. Capture Material 16.2.14 reference values using actual Sass execution and compare `meta.inspect()`/debug output in addition to CSS.

Current Material's M2 implementation can be used during development as a secondary cross-check, never as the long-term implementation boundary. If our independently owned result intentionally differs from current Material's M2 compatibility output, the historical 16.2.14 oracle wins for the legacy facade.

## Finite export map, not a wildcard forward

`research/sass-symbols.json` classifies explicitly listed historical root exports. `scripts/inventory-source.py` independently checks tagged root directives; implementation must reconcile wildcard forwards/configurable variables using a real Sass module inventory. Do not claim the seed inventory resolves every indirect/private export.

Use an explicit finite export surface or owned wrappers. Never `@forward '@angular/material'` unfiltered. New upstream exports must not leak into this namespace. Preserve old argument names, positional/keyword forms, defaults, warnings/errors when meaningful, map contents (including contrast entries), and `!default` configuration semantics.

| Symbol class | Implementation rule | Verification |
|---|---|---|
| Historical M2 palettes/maps | Own v16-compatible values locally | Whole-map/value snapshots against 16.2.14 |
| Theme construction/accessors | Own historical functions/map shape | Positional/config forms, direct maps, custom foreground/background, invalid input |
| Typography | Own historical definitions/conversion behavior | Every level/default/font family/hierarchy/custom value |
| `core()` / `legacy-core()` | Own coordinator retaining historical responsibilities while using only stable current infrastructure where appropriate | Nonempty output, structural responsibilities, coexistence/cascade tests |
| Legacy component themes | Own historical CSS, allowing precise reviewed motion/security corrections | Reference CSS, component styles, DOM/computed styles |
| Historical ordinary/current component mixins | Translate the owned M2 theme into stable **current public** component override/token APIs; never current deprecated M2 theming | Source-call compatibility, current component integration, bridge report |
| Historical private exports/deep paths | Inventory; reject unless deliberately supported | Migration diagnostics |

**Source compatibility and output compatibility are different.** Ordinary `expansion-theme` can preserve its old call syntax while producing CSS for today's expansion panel. Do not label that exact v16 ordinary-component CSS. Conversely, keep owned legacy mixin output strict rather than exempting all `.mat-*` selectors.

## Current-component bridge without upstream M2 dependencies

`all-legacy-component-themes` historically themed 13 ordinary companion families in addition to legacy-owned components [B02]. The facade must continue to accept the historical M2 theme input and apply compatible styling to the **current** official versions of those companions without using upstream deprecated M2/backcompat APIs.

For each ordinary companion worksheet:

1. derive the historical M2 role/value semantics from 16.2.14;
2. inspect current Material's M2 token generator only as a reference while available;
3. independently compute the needed current token values locally;
4. emit them through the current component's stable public `*-overrides`, system-token, or other nondeprecated documented theming API;
5. if a current component lacks a sufficient stable public theming boundary, stop and record a blocker/explicit limitation rather than deep-importing private Sass or falling back to deprecated M2 APIs.

This bridge preserves old **source/theming intent**, not old ordinary-component DOM. Its output gets separate current-component browser evidence rather than false whole-v16 CSS parity.

## M3 coexistence is required; native M3 legacy theming is optional

The first stable release must support **legacy-owned M2 styling alongside official current Material styled with M3**, without changing either side accidentally. It does not need to provide a second full M3 rendering path for the 21 legacy families.

Two intentional stylesheet compositions are supported:

```scss
// Historical compatibility mode: preserve the historical aggregate's membership.
@use '@ngx-compat/material-legacy' as mat;
$theme: mat.define-light-theme(/* historical Material-16 input */);
@include mat.core();
@include mat.all-legacy-component-themes($theme);
```

```scss
// Conceptual mixed-generation composition; replace the comment arguments
// with valid theme definitions in the runnable integration fixture.
@use '@angular/material' as current;
@use '@ngx-compat/material-legacy' as legacy;

$legacy-theme: legacy.define-light-theme(/* historical M2 input */);
@include legacy.core(); // coordinator must be coexistence-tested, not a blanket v16 reset
html {
  @include current.theme(/* current M3 configuration */);
  @include legacy.all-owned-component-themes($legacy-theme);
}
```

`all-owned-component-themes` is a **new, required owned-only aggregate**. Define its precise membership and exclude all ordinary-current-component bridges. Do not rename or shrink `all-legacy-component-themes`: that historical aggregate intentionally also themes ordinary companions and can override their M3 settings. Mixed-generation applications must opt into an aggregate with the intended scope; the migration must never guess this choice.

Test both include orders, nested themes, lazy-loaded components, shared ripple/focus/overlay structure, and overlays attached outside a themed subtree. No false guarantee that two theme calls coexist merely because Sass compiles. Do not automatically retheme current controls or inject global M2 overrides in owned-only mode.

A future optional `system-theme()` could style legacy components directly from current public M3 system variables. It is **not required for RC or first stable**, is not a published/exported API until implemented and tested, and must not be a dependency of historical mode. The reference mapping `primary → primary`, `accent → tertiary`, `warn → error` is a starting point for that separate feature, not permission to map the historical M2 facade onto M3 values.

## Structural CSS: do not accidentally fork CDK in Sass

The old `core()` included ripple, visually-hidden, overlay, text-field autosize/autofill, and focus-indicator setup [SASS-02]. Recreate the historical responsibilities, not an empty forward. Evaluate each responsibility against the selected current CDK/Material. Use stable public current structural APIs where one exists and behavior matches; otherwise own only the minimal legacy-specific structure. Copying all v16 `.cdk-*` declarations over current overlays merely to pass a text comparison is prohibited.

Classify baseline differences by selector/property and infrastructure owner. Test existing/current component-injected styles, global inclusion order, one-time setup, theme nesting, repeated `core()` includes, lazy overlays and ripple creation. No duplicate style loader, blanket reset or globally overriding old CDK stylesheet. Review unavoidable current-infrastructure changes explicitly; no broad golden-ignore patterns.

## Aggregates and ordinary companions

Preserve historical aggregate responsibility membership and relative include order using locally owned legacy mixins plus the independent current-component bridges described above. Do not substitute today's `all-component-themes`; it styles modern replacements and has changing membership.

Use `research/aggregate-composition.json` for the inspected historical include order. Inventory color/typography aggregates separately. Expose one additional clearly documented **owned-only** aggregate for consumers intentionally managing current Material theming separately; it must not silently replace the historical name.

Prebuilt CSS is optional implementation scope only with an explicit historical file-to-artifact map and composition tests. The schematic reports unhandled prebuilt assets instead of silently swapping paths.

## Evidence sets

**A. Sass values/maps:** compile the same historical fixture under Material 16.2.14 and the candidate. Capture debug/`meta.inspect()` output using a common pinned Dart Sass version/options that compile both untouched 16.2.14 and the candidate first. Compare maps, nested keys, defaults and error behavior.

**B. Owned mixin CSS:** compare ordered CSS from identical fixture source where only the module source changes. No property sorting, selector sorting, duplicate-rule elimination, color rounding, specificity normalization or cascade-layer normalization.

**C. Component styles and DOM:** render actual owned templates with compiled component SCSS, dynamic classes, motion and overlays. Check selector matching, computed dimensions, custom properties, pseudo-elements, focus states and runtime styles.

**D. Ordinary current bridges:** compare our independently calculated token values against current Material's M2 compatibility output while it exists, then validate the actual current component. This is a development oracle, not a runtime dependency. Preserve the captured bridge tests so upstream M2 removal does not remove our specification.

Baseline evidence is generated from actual 16.2.14 packages and immutable inputs; record package integrity, source SHA, compiler version/options and fixture hash. Golden changes require exact before/after hashes, reason, regression test and reviewer approval.

## Fail-closed consumer experience

Every migration reports symbol classifications and current-component/shared-infrastructure risks. A passing Sass build is not a visual certification. No silent fallback, empty mixin, swallowed Sass error, missing density variant, null palette substitution, or automatic rewrite to modern `m2-*` names. Preserve application selectors wherever they target the owned legacy contract; consumer-level selector surgery is not a repair strategy.
