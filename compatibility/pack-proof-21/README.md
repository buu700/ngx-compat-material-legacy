# Pack proof — 21.x maintenance line (no publish)

Branch: `21.x`  
Target package: `@ngx-compat/material-legacy@21.0.0-rc.0`  
Dist-tags (when owner publishes): `lts-21-next` / `lts-21`

## Aged peer selection

See `compatibility/peers-21.proposed.json`:

| Package | Version | Notes |
| --- | --- | --- |
| `@angular/*` framework | `21.2.23` | Aged; includes documented SSR floors |
| `@angular/material` / `@angular/cdk` | `21.2.14` | Latest aged 21.x Material line |
| `@angular/core@21.2.24` | **not adopted** | Same-day vs 2026-09-23 triage |

## Evidence this tip

| Artifact | Result |
| --- | --- |
| `peer-install-smoke.json` | Aged peer `npm install` **ok**; versions resolve |
| Library `ng-packagr` rebuild on 21 peers | **Blocked** — source still adapted to Material/Angular 22 APIs |

## Next on this branch (not claimed done)

1. Replace workspace lockfile pins with aged 21 peer set + TypeScript 5.9
2. Adapt delegated Material 21 API diffs
3. Pack + packed-consumer AOT/harness on Node 20.19 and 22.12
4. Owner-authorized publish to `lts-21-next` only (never move `latest`)
