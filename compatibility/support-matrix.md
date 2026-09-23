# Support matrix and 21.x maintenance (no publish)

Checked **2026-09-23** (America/New_York). Seeded from `research/support-policy.json`.

## Advertised lines

| Package line | Branch | Angular | Node (consumer) | TypeScript | RxJS | Dist-tags |
| --- | --- | --- | --- | --- | --- | --- |
| 22.x | `main` | 22 active | `^22.22.3 \|\| ^24.15.0 \|\| ^26.0.0` | `>=6.0 <6.1` | `^6.5.3 \|\| ^7.4.0` | `next` / `latest` |
| 21.x | `21.x` | 21 LTS | `^20.19.0 \|\| ^22.12.0 \|\| ^24.0.0` | `>=5.9 <6.0` | `^6.5.3 \|\| ^7.4.0` | `lts-21-next` / `lts-21` |

Peer floors: **22.x** `^22.1.7`; **21.x** framework `^21.2.23`, Material/CDK `^21.2.14`.

## 22.x evidence (`main`)

| Smoke | Status | Evidence |
| --- | --- | --- |
| ESM / Sass / AOT / harness | Done | `compatibility/pack-proof/` |
| Theme coexistence | Done | `theme-coexistence.css` |
| Motion primary FESM `@angular/animations` | **Cleared** | CSS/timer motion; recipes under `legacy-*/animations` only |
| Escape relative unresolved | **0** | source-closure comment + `.import` fixes |

## 21.x evidence (`origin/21.x`)

Branch **`21.x`** — library rebuild + packed-consumer smoke **green** (see `pack-proof-21/`).
Motion CSS-wave from `main` merged onto this line (re-pack evidence refreshed when feasible).

| Gate | Result | Evidence on `21.x` |
| --- | --- | --- |
| Branch created | **Done** | `21.x` on GitHub |
| Aged peer selection | **Done** | `compatibility/peers-21.proposed.json` on `21.x` |
| Aged peer `npm install` | **Done** | `compatibility/pack-proof-21/peer-install-smoke.json` — core `21.2.23`, Material `21.2.14` |
| Same-day `21.2.24` | **Rejected** | Fails 7-day age window as of triage |
| Library rebuild / pack on 21 peers | **Done** | `ng-packagr` 21.2.7 + TS 5.9; tarball in `pack-proof-21/` |
| Packed-consumer Sass/ESM/AOT | **Done** | `pack-proof-21/consumer-smoke.json` (Node 24 host) |
| Node 20.19 packed-consumer + harness | **Done** | `pack-proof-21/node20-consumer-smoke.json` (Node 20.19.6) |
| Motion CSS wave (from main) | **Merged** | Re-pack/smoke after merge |
| npm publish | **Not done** | Owner later → `lts-21-next` only |

Angular 21 lockfile stays on `21.x` only — do not merge into `main`.
