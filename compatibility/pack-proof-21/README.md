# Pack proof — 21.x maintenance line (no publish)

Branch: `21.x`  
Package: `@ngx-compat/material-legacy@21.0.0-rc.0`  
Dist-tags (owner publish later): `lts-21-next` / `lts-21`

## Aged peers

| Package | Version |
| --- | --- |
| `@angular/*` framework | `21.2.23` |
| `@angular/material` / `@angular/cdk` | `21.2.14` |
| TypeScript | `5.9.2` |
| ng-packagr | `21.2.7` |

`21.2.24` framework rejected (same-day age window as of 2026-09-23).

## Evidence

| Artifact | Result |
| --- | --- |
| `ngx-compat-material-legacy-21.0.0-rc.0.tgz` | Packed on `21.x` |
| `consumer-smoke.json` | Sass + ESM + AOT **ok** against aged 21 peers |
| `consumer-smoke-theme.css` | deep-purple `#4527a0` |

## Adaptation notes

- Workspace lockfile on this branch pins Angular 21 / TS 5.9.
- `tsconfig.lib.json` omits TS6-only `ignoreDeprecations: "6.0"`.
- Library source mostly compatible with Material 21.2.14 for this RC smoke (MATERIAL_ANIMATIONS present).
- Full Node 20.19 packed-consumer matrix and broader harness coverage remain follow-ups.
- **No npm publish** from agent workstreams.
