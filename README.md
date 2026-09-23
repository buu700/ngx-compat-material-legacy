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

Support only version combinations published in the tested matrix once that matrix exists. Build success alone is not visual parity. Contributions require preserved tests, provenance and explicit API/CSS exception review. No guaranteed response time or enterprise support is implied. See `CONTRIBUTING.md`, `SECURITY.md`, and `AGENTS.md`.

## Origin and license

Derived from `angular/components` tag `16.2.14`, with history preserved (baseline tag `baseline/angular-components-16.2.x`). MIT licensed. Google copyright is retained, followed by Copyright (c) 2026 Ryan Lester. See `LICENSE`. This community continuation is not an official Angular/Google release or endorsement.

## Planned release/support model

Package major follows Angular major. `main` tracks the active Angular line; a numbered maintenance branch tracks the immediately preceding supported/LTS major. Initial intended lines are 22.x (active) and 21.x (LTS), with RCs before stable releases. Exact peer minimums are published from the tested matrix and may be raised for security fixes.

Historical M2 source-compatible consumers keep their old Sass expressions under this package's namespace. Mixed-generation applications theme current Material with M3 and use the owned-only M2 aggregate for legacy controls, without emitting M2 bridges for current controls. A native M3/system-token theme for legacy controls is optional future scope, not part of the first-stable promise.
