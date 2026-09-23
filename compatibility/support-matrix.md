# Support matrix and 21.x maintenance prep (no publish)

Checked **2026-09-23** (America/New_York). Seeded from `research/support-policy.json`.

## Advertised lines

| Package line | Branch | Angular | Node (consumer) | TypeScript | RxJS | Dist-tags |
| --- | --- | --- | --- | --- | --- | --- |
| 22.x | `main` | 22 active | `^22.22.3 \|\| ^24.15.0 \|\| ^26.0.0` | `>=6.0 <6.1` | `^6.5.3 \|\| ^7.4.0` | `next` / `latest` |
| 21.x | `21.x` | 21 LTS | `^20.19.0 \|\| ^22.12.0 \|\| ^24.0.0` | `>=5.9 <6.0` | `^6.5.3 \|\| ^7.4.0` | `lts-21-next` / `lts-21` |

Peer floor on **22.x** library manifest: Angular/Material/CDK **`^22.1.7`**.
Peer floor on **21.x** branch metadata: framework **`^21.2.23`**, Material/CDK **`^21.2.14`**.

## 22.x packed-consumer evidence

| Smoke | Status | Evidence |
| --- | --- | --- |
| ESM import (44 entries) | Done | `compatibility/pack-proof/consumer-smoke.json` |
| Sass deep-purple theme | Done | `consumer-smoke-theme.css` |
| AOT + harness | Done | `aot-harness-smoke.json` |
| Theme coexistence | Done | `theme-coexistence.css` |
| Motion MATERIAL_ANIMATIONS wiring | Partial (max safe) | `motion-lifecycle-smoke.json` — engine metadata retained |

## 21.x maintenance branch — real results (2026-09-23)

Branch **`origin/21.x`** — library rebuild + packed-consumer smoke **green** (see `pack-proof-21/`).

| Gate | Result | Evidence |
| --- | --- | --- |
| Branch created | **Done** | `21.x` on GitHub |
| Aged peer selection | **Done** | `compatibility/peers-21.proposed.json` on `21.x` |
| Aged peer `npm install` | **Done** | `compatibility/pack-proof-21/peer-install-smoke.json` — core `21.2.23`, Material `21.2.14` |
| Same-day `21.2.24` | **Rejected** | Fails 7-day age window as of triage |
| Library rebuild / pack on 21 peers | **Done** | `ng-packagr` 21.2.7 + TS 5.9; tarball in `pack-proof-21/` |
| Packed-consumer Sass/ESM/AOT | **Done** | `pack-proof-21/consumer-smoke.json` (Node 24 host) |
| Node 20.19 packed-consumer + harness | **Done** | `pack-proof-21/node20-consumer-smoke.json` (Node 20.19.6; button/select/checkbox harness) |
| npm publish | **Not done** | Out of agent scope |

See also `compatibility/STATUS-21.md` on branch `21.x`.

## Smoke Node matrix (intended)

| Line | Full CI Node | Extra packed-consumer Node |
| --- | --- | --- |
| 22.x | 24.21.0 | 22.22.3 |
| 21.x | 24.21.0 | 20.19.0 (+ 22.12.0 edge) |
