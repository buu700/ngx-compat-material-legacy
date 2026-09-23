# 21.x maintenance status (no publish)

Branch `21.x`. Package `@ngx-compat/material-legacy@21.0.0-rc.0`.

| Gate | Status | Evidence |
| --- | --- | --- |
| Aged peer selection | **Done** | `peers-21.proposed.json` (framework 21.2.23, Material/CDK 21.2.14) |
| Workspace install on 21 peers | **Done** | pnpm lock on branch |
| `ng-packagr` rebuild + pack | **Done** | `pack-proof-21/*.tgz` |
| Packed-consumer Sass/ESM (Node 24) | **Done** | `pack-proof-21/consumer-smoke.json` |
| Packed-consumer AOT (button/dialog) | **Done** | same |
| Node 20.19.x packed-consumer matrix | **Done** | `pack-proof-21/node20-consumer-smoke.json` (Node **20.19.6**) |
| Broader harness (button/select/checkbox) | **Done** | same — dialog module load + three harnesses |
| Further overlay interaction harness | **Deferred** | Avoid destabilizing RC; menu/snack-bar/tooltip interaction TBD |
| npm publish | **Out of scope** | Owner-run later with `lts-21-next` |

Do not merge this branch's Angular 21 lockfile into `main` (22.x).
