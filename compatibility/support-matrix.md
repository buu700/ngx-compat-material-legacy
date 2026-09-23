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
| Motion MATERIAL_ANIMATIONS wiring | Partial (max safe) | dialog/menu/select/form-field/snack-bar/tabs/tooltip helper; engine metadata retained |
| Escape relative unresolved | **0** | source-closure comment + `.import` fixes |

## 21.x evidence (`origin/21.x`)

Tip includes pack + consumer smoke (`db5d8840c` family).

| Gate | Result | Evidence on `21.x` |
| --- | --- | --- |
| Aged peer install | **Done** | framework 21.2.23, Material/CDK 21.2.14 |
| `ng-packagr` rebuild + pack | **Done** | `compatibility/pack-proof-21/*.tgz` |
| Packed-consumer Sass/ESM/AOT | **Done** | `pack-proof-21/consumer-smoke.json` |
| Node 20.19 consumer matrix | **Done** | `pack-proof-21/node20-consumer-smoke.json` on `21.x` (Node 20.19.6; Sass/ESM/AOT + button/select/checkbox harness) |
| npm publish | **Not done** | Owner later → `lts-21-next` only |

Angular 21 lockfile stays on `21.x` only — do not merge into `main`.
