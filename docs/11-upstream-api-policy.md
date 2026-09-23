# 11. Stable-upstream-only implementation policy

## Principle

This library intentionally exposes historical APIs. Its **implementation dependencies must not be deprecated by accident**.

A stable release must not depend on an upstream Angular/Material/CDK/TypeScript/Sass/RxJS API that is:

- private/internal (`_...`, `ɵ...`, private/deep source path);
- annotated deprecated for our usage;
- documented as compatibility-only with planned removal;
- marked with a future `@breaking-change` removal that would delete the dependency;
- an obsolete engine/subsystem already superseded for this use (notably Angular Animations and Material's M2/backcompat Sass implementation).

Exceptions require an explicit maintainer-approved record with a removal plan and should normally block stable release. An RC may carry a short-lived exception only when the issue is documented and there is no misleading compatibility claim.

## Explicit initial forbidden surfaces

- `@angular/animations` and `@angular/platform-browser/animations` in shipped code/declarations/tests required by consumers;
- current Material `m2-*` theming functions/variables as implementation dependencies;
- Material color-variant/M2 compatibility mixins scheduled to disappear;
- `_Mat*Base`, underscore/ɵ Material/CDK imports, private Sass paths;
- direct use of TypeScript 6 compiler API throughout migration logic rather than behind an adapter.

Historical source copied into this project may retain implementation concepts from old private code after it becomes **owned local code** with provenance. The prohibition concerns dependency on volatile upstream internals, not possession of our own compatibility implementation.

## Delegation rule

Delegate only when a current stable public API truthfully satisfies the historical contract and delegation reduces maintenance. When a delegated API becomes deprecated:

1. canary/deprecation scan records the planned removal;
2. before the upstream removal reaches a supported line, switch to its stable replacement or own the small behavior locally;
3. add/retain behavior and identity tests so the transition is invisible to consumers where possible.

Do not wait for the removal to break the build.

## Known examples

- `LEGACY_VERSION`: historically aliases Material core `VERSION`; preserve that stable public identity. Add a separately named project version constant if needed.
- `LegacyThemePalette`: own the tiny historical union locally instead of coupling it to upstream M2 semantics.
- `MatLegacyRecycleRows`: v16 used private CDK repeater providers. Current `CdkTable` has a public `recycleRows` input while current `CdkRecycleRows`/`MatRecycleRows` are deprecated no-op directives scheduled for v23 removal. Preserve the historical directive symbol/selector locally and make it drive the stable current table behavior where possible; do not delegate to the doomed current directive or private repeater strategies.
- Material M2 Sass: own the old theme model and use current stable override/system-token APIs only at the current-component boundary.

## Mechanical enforcement

`research/upstream-api-policy.json` is the machine-readable baseline. `scripts/check-upstream-api-policy.py` scans shipped source for forbidden module paths/symbol patterns and explicit forbidden tokens. It is a guardrail, not a proof: code review and generated `upstream-dependencies.json` must also track each delegated public symbol with package, usage sites, current status and source documentation.

At every Angular-major port, regenerate/check the delegated API inventory against current sources/docs for `@deprecated`, `@breaking-change`, removal notices and compatibility-only documentation. Keep `research/future-breakages.json` updated with resolution state.

## Machine-owned inventories

Generate and commit the real delegated upstream dependency inventory using `templates/delegated-upstream-apis.json` as the schema seed; the example entry must be removed. Each entry records the stable public symbol/module, consumers, evidence, minimum supported upstream version, and current deprecation/breaking-change status. This inventory is release evidence, not hand-wavy documentation.

Run `scripts/check-upstream-api-policy.py` over shipped TypeScript/Sass on every PR. The checker catches obvious forbidden surfaces; the delegated inventory/deprecation scan catches semantic status changes that cannot be inferred from an import string alone. Run `scripts/check-workflow-pins.py` against repository workflows as a separate supply-chain gate.
