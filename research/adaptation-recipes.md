# Targeted adaptation recipes

These are source-informed work instructions, not approved patches. Resolve source IDs through [SOURCES.md](SOURCES.md) and `upstream-candidates.json`. Inspect the full upstream diff and follow-up changes before implementing; record the exact commit and applicability. Never force an inapplicable source change into a legacy component.

## Public infrastructure before copies

Start with `legacy-core-delegation.json` and the entry-point worksheet. For each exported alias, prove current upstream identity, supported visibility, provider semantics and consumer behavior. Dates/error-state configuration are promising shared identities; option/optgroup DOM is owned. Removed behavior mixins are small local helpers. Current exported underscore/docs-private code is not an approved dependency. No inheritance from current `MatSelect`, `MatFormField`, `MatDialog` implementation internals.

## Native motion: one small owned lifecycle model, component-specific presentation

Sources: MOTION-01, ANIM-01 through ANIM-09; ROB-01/02/04/05/06. For each component, first enumerate its historical triggers, events, duration inputs, focus ordering, lazy views and detach/destruction behavior. The required output is that behavior graph, not a transcription of current CSS.

Share carefully tested utilities for cancellation, owned-element event filtering, disabled/reduced motion, duration validation and teardown if useful. Do not create a general animation-engine clone. Use explicit completion guards and a race-safe fallback where browser events can be absent; derive timing rather than relying on a single hardcoded timeout. Filter descendant events and multiple properties. A disabled animation still completes the logical operation with the historical observable ordering.

| Work | What to adapt | What not to copy | Critical proof |
|---|---|---|---|
| Autocomplete (ANIM-02) | Native enter/close coordination | Upstream's deliberately removed exit behavior without baseline review | selection, focus, interrupted close, actual historical exit semantics |
| Select (ANIM-06, ROB-04) | Native panel lifecycle and overlay detach synchronization | MDC classes, modern internal inheritance | open/close events exactly once, scroll/position, detach/reopen race |
| Tabs (ANIM-03) | Body transition scheduling and completion handling | Modern wrapper DOM or silently changed active/inactive layout | dynamic height, rapid reversal, RTL, lazy content and animationDone |
| Form field (ANIM-04, ROB-03) | Subscript motion and accessibility correction technique | MDC subscript markup or changed baseline/error spacing | hint/error switching, font metrics, external descriptions, no leaked heights |
| Snack bar (ANIM-05) | Native container completion and service handoff | Modern DOM/token output | dismissal by timer/action, queued replacement, announce/focus/disposal |
| Menu (ANIM-07) | Decouple semantic open/close from engine callbacks | Dropping historical lazy-content timing | nested menus, focus restoration, backdrop/detach/cancellation |
| Dialog (ANIM-08, ROB-05/06) | Native lifecycle, focus scheduling and disabled-close behavior | Private upstream container inheritance | zoneful/zoneless, focus trap, duration options, ARIA-disabled triggers |
| Tooltip (ANIM-09) | Visibility/delay/teardown algorithms | MDC tooltip markup | touch/hover/focus interaction, repeated show/hide, disposal |

Recipe exports consumed through `@Component({animations: [...]})` cannot be replaced with CSS objects and called source-compatible. Check whether a meaningful independent equivalent is useful; otherwise document a working CSS/Web Animations migration, with metadata-import diagnostics. Component consumers should not need to recreate the component's internal motion.

## Sass facade and value contracts

Sources: B03/B04/B07, SASS-02–10, U05 and THEME-01. Begin with `sass-symbols.json`, not a wildcard forward. Confirm member kind, signature, return structure and configured-default behavior in the tagged source. **Own the Material-16 M2 palette/theme/typography model locally from the first stable release.** Current Material's `m2-*` source and output are temporary reference oracles only; they are not delegation candidates and must not appear in shipped Sass. Consumer source is not rewritten to current `m2-*` names.

For ordinary current components historically included by the old aggregate, derive the required historical M2 values locally and feed them through only stable public current component override/system-token APIs. If that public surface cannot express a required contract, record/block the bridge instead of reaching into private/deprecated Sass. Use `aggregate-composition.json` for explicit order. Theme, typography and color aggregates are not interchangeable. `core()` is a responsibilities coordinator: copy neither today's empty mixin nor stale old CDK globals uncritically. Run separate owned-output, structural-value and shared/current-bridge reports. A modern-compiler syntax fix such as SASS-01 is allowed only with generated-output evidence; no broad normalization may hide CSS changes.

## Security/accessibility and current CDK

Sources: SEC-01–03, CDK-01–03, ROB-03–06. First locate equivalent reachable code. CDK media-matcher/Trusted Types/nonce changes ordinarily belong in the chosen patched upstream dependency, not a local reimplementation. Record the first verified containing release or exact artifact and test the legacy interaction. An imported shared service can inherit a fix; copied old logic cannot.

For an owned vulnerability candidate, create a minimal reproducer and regression before adapting. Validate data/control flow, attacker capabilities and actual runtime surface; a dev dependency audit finding is not automatically a production vulnerability. Use private disclosure for confirmed sensitive issues. Do not describe this ledger as a security audit or declare a candidate exploitable without evidence.

For portals/a11y/table updates, compare signatures and semantics of the exact supported CDK. Preserve legacy presentation while using public current primitives. Don't fix a compilation error by importing a private underscored alias. A compile-only fix is incomplete when subscriptions, dynamic row definitions or keyboard behavior changed.

## Completion record for every recipe

Record the historical path/contract, upstream full commit, disposition (adapted/inherited/not applicable/blocked), smallest owned diff, tests and exact output changes. Keep not-applicable decisions: they prevent repeated agent archaeology. Unexplained generated CSS/DOM drift blocks completion even when all code typechecks.
