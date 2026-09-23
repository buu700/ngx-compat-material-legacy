# 21.x maintenance status (no publish)

Branch `21.x`. Package `@ngx-compat/material-legacy@21.0.0-rc.0`.

| Gate | Status | Evidence |
| --- | --- | --- |
| Aged peer selection | **Done** | `peers-21.proposed.json` (framework 21.2.23, Material/CDK 21.2.14) |
| Workspace install on 21 peers | **Done** | pnpm lock on branch |
| `ng-packagr` rebuild + pack | **Done** | `pack-proof-21/*.tgz` |
| Packed-consumer Sass/ESM | **Done** | `pack-proof-21/consumer-smoke.json` |
| Packed-consumer AOT (button/dialog) | **Done** | same |
| Broader harness / Node 20.19 matrix | **Partial / TODO** | Not required to claim rebuild unblocked |
| npm publish | **Out of scope** | Owner-run later with `lts-21-next` |

Do not merge this branch's Angular 21 lockfile into `main` (22.x).
