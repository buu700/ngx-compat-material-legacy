# Bridge disposition (B-SASS-02)

Recorded 2026-09-23 (America/New_York). Reviewer: Ryan Lester \<hacker@linux.com\>.

## Verdict

| Fixture | Disposition | Category |
| --- | --- | --- |
| `02-core` | **intentional current-bridge** | shared-infrastructure (current CDK) |
| `03-legacy-core` | **intentional current-bridge** | shared-infrastructure (current CDK) |
| `06-aggregate-and-companions` | **intentional current-bridge** | shared-infrastructure (current CDK) |
| `08-core-theme` | **equal** (no action) | owned-legacy |

No must-fix owned-parity items. Nothing blocked.

Machine-readable: `B-SASS-02.json`. Unified diffs: `*.unified.diff`.

## Why not byte-equal?

`mat.core()` / `mat.legacy-core()` deliberately `@include` current `@angular/cdk` mixins
(`overlay`, `a11y-visually-hidden`, `text-field-*`) plus owned ripple/focus structural
styling. Current CDK emits:

- `@media (forced-colors: active)` instead of `.cdk-high-contrast-active …`
- `prefers-reduced-motion` shortening for overlay backdrop transitions
- `.cdk-overlay-popover` rules
- minor declaration-order / selector simplification on backdrops

Owned badge theme still spells `@include cdk.high-contrast(active, off)`; under the
current CDK peer that compiles to `forced-colors` (same class of bridge). Aggregate
membership and companions are intact; output **grew** vs the Material-16.2.14 seal
(+653 bytes), did not shrink. `core()` is non-empty.

Palette / theme constructor meanings are unchanged: all strict owned fixtures and
`08-core-theme` remain byte-equal to the seal (including Cyph deep-purple 800 →
`#4527a0`).

## Must not

- Empty `core()` / `legacy-core()` to chase historical CDK CSS.
- Vendor historical CDK overlay CSS into the owned facade solely for golden equality.
- Drop aggregate theme members or companions to silence bridge diffs.
- Rewrite goldens / seals to hide the bridge.

See also `compatibility/migration-report-seed.md`.
