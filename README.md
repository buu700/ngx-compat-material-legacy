# ngx-material-legacy

A community continuation of Angular Material's removed legacy component APIs for supported current Angular, Angular Material and CDK releases.

**Status: under development; not yet released. No compatibility guarantee yet.**

| Item | Value |
| --- | --- |
| Package | `@ngx-compat/material-legacy` |
| Repository | [`buu700/ngx-compat-material-legacy`](https://github.com/buu700/ngx-compat-material-legacy) |
| Historical baseline | `angular/components` tag `16.2.14`, preserved as git tag `baseline/angular-components-16.2.x` |

Publication, npm ownership, and long-term stewardship under ngx-compat are not claimed until they are actually authorized. Do not treat this README as a release announcement.

## Purpose

Preserve legacy component APIs, meaningful DOM/classes and historical Sass usage without requiring consumers to redesign a mature interface. Current Material/CDK remain peers and provide public shared infrastructure. Ordinary/current components continue to use official `@angular/material/*` imports. This is not a copy or mirror of current Material and does not preserve every ordinary component's Material-16 visuals.

**Out of scope:** Cyph application work, Flex Layout, consumer app migrations, and inventing fake pass/badge claims.

## Planned migration shape

```ts
import {MatLegacySelectModule}
  from '@ngx-compat/material-legacy/legacy-select';
import {MatDatepickerModule} from '@angular/material/datepicker';
```

```scss
@use '@ngx-compat/material-legacy' as mat;
// Keep supported historical palette/theme/mixin expressions unchanged.
```

The root Sass facade independently preserves the Material-16 M2 palette/theme/typography model and old names; it does not forward today's namespace wholesale or depend on upstream deprecated M2/backcompat Sass. A packaged migration schematic and peer-light pre-upgrade CLI are planned. Do not treat these planned commands as a published release until the support matrix and artifacts exist.

Legacy Angular Animations is not part of the target runtime. Component behavior is migrated internally; direct consumers of removed engine-bound recipe exports receive explicit tested migration examples. No fabricated no-op API replacements.

## Compatibility and contribution

MatLegacyMenuItem preserves the original one-argument and five-argument manual constructors as well as Angular node DI. Its historical behavior is owned locally, so it no longer extends the current Material MatMenuItem class; its public Material provider token remains available for queries and injection. MatLegacyTable uses zero-argument construction through Angular node DI. Its old manual dependency arguments are unsupported and reject at compile time and runtime. In particular, the original table constructor's supplied repeater, viewport and style scheduler are retired; use the supported Angular table inputs and providers. Table data-source and row/column definition constructors are separate APIs. This construction change requires no consumer template or stylesheet edits.

MatLegacyRipple and MatLegacyRippleModule retain the shared public Material identities. Construct MatLegacyRipple with no arguments through Angular DI; the original five manual dependency arguments no longer supply its services. Angular 21 still declares ignored rest arguments, while Angular 22 declares no arguments. Existing ripple inputs and templates remain supported. The owned theme binds the public ripple color token to the historical foreground and opacity at the existing theme scope, requiring no consumer stylesheet edits.

Dialog containers support content attachment during their lifetime. Calling `dispose()` or `ngOnDestroy()` ends that lifetime; attaching content afterward is unsupported. This includes direct typed portal methods that could bypass the generic disposal guard in the historical implementation.

Support only version combinations published in the tested matrix once that matrix exists. Build success alone is not visual parity. Contributions require preserved tests, provenance and explicit API/CSS exception review. No guaranteed response time or enterprise support is implied. See `CONTRIBUTING.md`, `SECURITY.md`, and `AGENTS.md`.

## Origin and license

Derived from `angular/components` tag `16.2.14`, with history preserved (baseline tag `baseline/angular-components-16.2.x`). MIT licensed. Google copyright is retained, followed by Copyright (c) 2026 Ryan Lester. See `LICENSE`. This community continuation is not an official Angular/Google release or endorsement.

Legacy and current radio buttons should be placed in separate groups for their respective generation. A current radio group is not a supported parent for a legacy radio button, or vice versa. The legacy radio group token retains its shared public identity.

## Planned release/support model

Package major follows Angular major. `main` tracks the active Angular line; a numbered maintenance branch tracks the immediately preceding supported/LTS major. Initial intended lines are 22.x (active) and 21.x (LTS), with RCs before stable releases. Exact peer minimums are published from the tested matrix and may be raised for security fixes.

Historical M2 source-compatible consumers keep their old Sass expressions under this package's namespace. Mixed-generation applications theme current Material with M3 and use the owned-only M2 aggregate for legacy controls, without emitting M2 bridges for current controls. A native M3/system-token theme for legacy controls is optional future scope, not part of the first-stable promise.
