# Support matrix and 21.x maintenance prep (no publish)

Checked **2026-09-23** (America/New_York). Seeded from `research/support-policy.json`.

## Advertised lines

| Package line | Branch | Angular | Node (consumer) | TypeScript | RxJS | Dist-tags |
| --- | --- | --- | --- | --- | --- | --- |
| 22.x | `main` | 22 active | `^22.22.3 \|\| ^24.15.0 \|\| ^26.0.0` | `>=6.0 <6.1` | `^6.5.3 \|\| ^7.4.0` | `next` / `latest` |
| 21.x | `21.x` | 21 LTS | `^20.19.0 \|\| ^22.12.0 \|\| ^24.0.0` | `>=5.9 <6.0` | `^6.5.3 \|\| ^7.4.0` | `lts-21-next` / `lts-21` |

Peer floor on **22.x** library manifest: Angular/Material/CDK **`^22.1.7`**
(see `compatibility/advisory-triage.md`). Private workspace Node remains
**24.21.0** / pnpm **12.4.2** and must not leak into published engines.

## 22.x packed-consumer evidence (this tip)

| Smoke | Status | Evidence |
| --- | --- | --- |
| ESM import (44 entries) | Done | `compatibility/pack-proof/consumer-smoke.json` |
| Sass deep-purple theme | Done | `consumer-smoke-theme.css` |
| AOT compile (button/dialog/form-field/select) | In progress / scripted | `scripts/packed-consumer-aot-smoke.mjs` → `aot-harness-smoke.json` |
| Harness runtime (button) | In progress / scripted | same |
| Theme coexistence (legacy M2 + current Material) | Fixture landed | `fixtures/interop/m2-legacy-plus-current-material.scss` |

## 21.x maintenance branch checklist (partial — not complete)

Do **not** pretend the 21.x line is shipping. Concrete remaining work:

1. **Branch**: create `21.x` from an agreed main SHA after 22.x RC gates stabilize
   (owner authorization for public branch names).
2. **Version**: set package to `21.0.0-rc.0`; engines/peers to Angular 21 security
   floor (reconcile with `research/support-policy.json` + current GHSA floors such
   as framework ≥ documented 21.2.x patches).
3. **Lockfile**: separate aged Angular 21 / Material 21 / TypeScript 5.9 pins;
   7-day age policy; never share the 22.x lockfile.
4. **Tooling**: keep private Node 24 CI; add packed-consumer smoke on Node
   **20.19.x** and **22.12.x** without publishing credentials.
5. **Adapter deltas**: expect branch-specific stable adapters (do not distort 22.x
   APIs merely for identical cherry-picks).
6. **Migration CLI**: rebuild peer-light CLI artifact with 21.x version metadata;
   keep Node `>=18` engines.
7. **Dist-tag dry-run docs**: `lts-21-next` only; verify `latest` untouched.
8. **Evidence folder**: `compatibility/pack-proof-21/` (create when branch exists).

### Why not started as a full branch this session

Standing up a faithful 21.x packed-consumer requires a second aged peer graph,
Material 21 API verification for every delegated symbol, and CI matrix jobs. That
would derail 22.x peer-floor / AOT / motion gates. This checklist is the honest
partial deliverable for W10.

## Smoke Node matrix (intended)

| Line | Full CI Node | Extra packed-consumer Node |
| --- | --- | --- |
| 22.x | 24.21.0 | 22.22.3 |
| 21.x | 24.21.0 | 20.19.0 (+ 22.12.0 edge) |
