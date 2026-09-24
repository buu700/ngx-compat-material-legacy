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
| `consumer-smoke.json` | Sass + ESM + AOT **ok** (Node 24 host) |
| `consumer-smoke-theme.css` | deep-purple `#4527a0` |
| `node20-consumer-smoke.json` | Sass + ESM + AOT + harness **ok** on Node **20.19.6** |
| `node20-consumer-smoke-theme.css` | same theme CSS from Node 20.19 run |
| `peer-install-smoke.json` | aged peer install record |
| `post-merge-src-cleanup-smoke.json` | Re-pack after main src/ cleanup merge; 0 src/material; primary FESM animations-import-free |

### Node 20.19 matrix (2026-09-23)

- Host binary: `/home/box/.local/node-v20.19.6/bin/node` (`v20.19.6`)
- Advertised engines floor: `^20.19.0`
- ESM: 19 secondary entries ok (includes testing)
- AOT: legacy-button, legacy-dialog, legacy-form-field, legacy-select
- Harness: `MatLegacyButtonHarness`, `MatLegacySelectHarness`, `MatLegacyCheckboxHarness`; dialog module loaded

## Adaptation notes

- Workspace lockfile on this branch pins Angular 21 / TS 5.9.
- `tsconfig.lib.json` omits TS6-only `ignoreDeprecations: "6.0"`.
- Library source mostly compatible with Material 21.2.14 for this RC smoke (MATERIAL_ANIMATIONS present).
- Broader overlay interaction harness (menu open/close, snack-bar, tooltip CSS path under TestBed) deferred to avoid destabilizing the RC pack.
- **No npm publish** from agent workstreams.

## Post-merge motion wave (2026-09-23)

Merged CSS motion from `main`. Re-packed on Angular **21.2.23** / Material **21.2.14**.

| Artifact | Result |
| --- | --- |
| `post-merge-motion-pack.json` | Re-pack metadata; primary FESM animations imports **[]** |
| `post-merge-esm-smoke.json` | Overlay entry ESM imports **ok** against aged 21 peers |
| `post-merge-no-animations-peer-smoke.json` | menu/select/dialog/autocomplete import **ok** with `@angular/animations` **not installed** |

