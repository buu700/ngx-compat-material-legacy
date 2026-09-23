# Current-component bridge: expansion

## Historical responsibility

Material 16 `all-legacy-component-themes` included the ordinary `expansion` theme alongside the legacy families. The compatibility facade must preserve the historical call/aggregate responsibility while the actual component remains the current official `@angular/material/expansion` implementation.

## Implementation boundary

- Do **not** copy/fork the ordinary v16 component merely for theming.
- Do **not** call current deprecated/backcompat M2 theming APIs.
- Inspect current public nondeprecated theming surfaces (`*-overrides`, system tokens, or another documented stable API).
- Reimplement locally the M2→current-token/value calculation needed for the historical theme input. Current Material's M2 token-generation source may be used as a reference/oracle only.
- If no stable public current theming surface can express the required values, record a blocker/explicit limitation rather than using private Sass.

## Evidence

1. Historical mixin/source signature accepts the same Material-16 input.
2. While current upstream M2 support still exists, compare calculated token/computed-style intent against it as a secondary oracle.
3. Render the current `expansion` component and capture color/typography/density states relevant to the old aggregate.
4. Record ordinary-component DOM/visual drift separately; do not claim v16 rendering parity.
5. Add M3 coexistence coverage if the component participates in legacy role classes or nested legacy content.
