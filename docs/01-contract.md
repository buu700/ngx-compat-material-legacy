# 1. Project contract and preservation boundary

## Mission

Continue the **removed legacy Material contracts**, not a competing implementation of today's Material. Preserve the complete historical legacy entry-point surface. Do not trim components merely because one consumer does not use them. Reuse current public infrastructure only when it actually satisfies the old contract.

The baseline is Material 16.2.14 [B01]. `research/scope.json` lists 21 component families plus legacy-core. Generate exact export, harness, template/style, source dependency and Sass inventories from the tagged checkout; worksheets are bounded starting decisions, not a fabricated exhaustive TypeScript signature audit.

> Compatibility takes precedence at the public boundary; modern supported implementation replaces obsolete internals only when the preserved observable contract still passes.

Native M3 theming for the legacy components themselves is optional future scope. M2 legacy styling coexisting with current Material/M3 is a first-stable requirement.

## Observable contract

Preserve component selectors, public symbols/types/inputs/outputs, documented defaults, form/CVA behavior, meaningful DOM hierarchy, classes, focus/keyboard behavior, overlay classes, sizing, density, typography and stable animation end states. Tests must cover state changes, not just initial render. Do not add wrappers or migrate to MDC solely to simplify implementation.

Dialog initial focus has a bounded scheduling exception: in a browser application with a document, application and render injector, while initial `first-tabbable` focus is pending, `afterOpened` waits for that focus to settle; close or destroy cancels the pending work and may complete it without an opening event, as described in [the recorded decision](../compatibility/rc/dialog-render-readiness-decision-v5.json). With a stable `NgZone`, two render callbacks accommodate the tested initial `NgModel` update. An unstable zone uses its public stability notification. Stable manual construction and the other auto-focus modes keep their direct paths. This does not wait for arbitrary future asynchronous model changes, and the timing differs from Material 16. When choosing focus inside a closed shadow root, make that choice after `afterOpened`; an internal focus change before it can be hidden from the document and overwritten. Close and destroy cancellation remain required.

Preserve actual historical shared DI identities. Keep historically separate legacy tokens separate even if names look similar. Examples: re-export a current date token only when it was a true alias; keep distinct legacy form-field defaults. A class that has the same methods but is a different injection token is not an interchangeable alias [B05, B07, U04].

Classify API dispositions as `upstream-alias`, `owned-compatible`, `owned-adapter`, `documented-exception`, or `blocked`. Remove engine-bound recipe exports only with a working alternative and targeted migration diagnostic. Security/accessibility corrections can justify changed behavior; they require a reproducer and explicit release note, not an unreviewed visual redesign.

## Sass is a public contract

Public Material-16 Sass names retain their historical meaning at the compatibility package root. Include palettes, old theme constructors/accessors, typography, core setup, legacy component mixins, historical aggregates and classified ordinary mixin bridges. No automatic semantic consumer Sass rewrites. Private historical Sass exports are inventoried but do not silently become a supported API. See the full policy and deliberate limitations in `03-sass-contract.md`.

## Explicit limits

Ordinary/current components are still imported directly from official Material. This package cannot guarantee their v16 DOM or styling. Shared upstream infrastructure can also affect owned components despite preserved local code. Declare these dependencies and test actual combinations. A Sass facade is not proof of total visual fidelity.

No framework/compiler/renderer patching, CDK fork, animation-engine fork, copied modern MDC suite, broad modern API facade, consumer application work, or indefinite all-Angular-major promise. Initial targets are Angular 22 and Angular 21 on separate major-aligned package lines; establish evidence on one line at a time and advertise only completed, tested support.

## Identity and governance

The requested canonical organization/repository is an assumption pending authorization. README starts at **development / not yet released**. No fictitious badges, installations, test-pass statements or audit certification. Add Ryan's copyright after Google's; preserve other applicable third-party notices. Supply no service-level guarantee or support promise on behalf of another person.
