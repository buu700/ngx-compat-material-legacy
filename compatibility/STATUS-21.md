# 21.x maintenance status (no publish)

Branch `21.x` bootstrapped from main after 22.x RC motion/escape-edge wave.
Package metadata targets `@ngx-compat/material-legacy@21.0.0-rc.0` with peers
`^21.2.23` (framework) and `^21.2.14` (Material/CDK).

| Gate | Status |
| --- | --- |
| Branch exists | **Done** (`21.x`) |
| Aged peer selection recorded | **Done** (`peers-21.proposed.json`) |
| Aged peer install smoke | **Done** (`pack-proof-21/peer-install-smoke.json`) |
| Library rebuild + pack on 21 peers | **Blocked** — needs Material 21 adaptation |
| Packed-consumer AOT on Node 20.19 | **Blocked** (depends on pack) |
| npm publish | **Out of scope** |

Do not merge silent peer swaps into `main` (22.x).
