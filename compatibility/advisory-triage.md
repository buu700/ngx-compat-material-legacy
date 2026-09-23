# Advisory triage — aged Angular 22.1.7 peer set

Recorded **2026-09-23** (America/New_York). Scope: unpublished RC
`@ngx-compat/material-legacy@22.0.0-rc.0` against the aged selection in
`compatibility/peers-22.proposed.json` and workspace `package.json`
devDependencies. **No npm publish. No silent peer bumps.**

Sources consulted: GitHub Security Advisory API (`ecosystem=npm`), OSV
`query` / `querybatch` for exact versions, npm registry publish times.
Workspace `npm audit` / `pnpm audit` were unavailable without a frozen
lockfile path in this environment; OSV + GHSA are the primary evidence.

## Peer inventory

### Advertised library peers (`projects/ngx-material-legacy/package.json`)

| Peer | Range | Meta |
| --- | --- | --- |
| `@angular/core` | `^22.1.7` | required |
| `@angular/common` | `^22.1.7` | required |
| `@angular/platform-browser` | `^22.1.7` | required |
| `@angular/cdk` | `^22.1.7` | required |
| `@angular/material` | `^22.1.7` | required |
| `@angular/forms` | `^22.1.7` | optional |
| `@angular/animations` | `^22.1.7` | optional (motion metadata) |
| `rxjs` | `^6.5.3 \|\| ^7.4.0` | required |

`@angular/platform-server` is **not** a peer and is not imported by the
library. SSR fixture environments remain consumer-owned.

### Aged install / test baseline (`peers-22.proposed.json`)

Exact pins used for RC work (7-day `minimumReleaseAge` policy):

| Package | Version | Observed publish (UTC) | Age vs 2026-09-23 ~23:00Z |
| --- | --- | --- | --- |
| `@angular/{core,common,compiler,compiler-cli,forms,platform-browser,platform-browser-dynamic,animations}` | `22.1.7` | 2026-09-16 | ~7.2d — **meets** age |
| `@angular/cdk` | `22.1.7` | 2026-09-16 | ~7.6d — **meets** |
| `@angular/material` | `22.1.7` | 2026-09-16 | ~7.6d — **meets** |
| `@angular/cli` | `22.1.8` | 2026-09-10 | ~13.3d — **meets** |
| `ng-packagr` | `22.1.1` | (see peers file) | aged |
| `typescript` | `6.0.3` | | |
| `rxjs` | `7.8.2` | | |
| `zone.js` | `0.16.3` | | |
| `sass` | `1.104.1` | | |
| `tslib` | `2.8.1` | | |

Newer published lines **not** adopted (fail age window as of this triage):

| Package | Version | Publish (UTC) | Notes |
| --- | --- | --- | --- |
| `@angular/core` (and framework siblings) | `22.1.8` | 2026-09-23T17:36Z | ~0.2d old |
| `@angular/core` | `22.2.0` | 2026-09-23T17:55Z | ~0.2d old; research/canary only |
| `@angular/material` / `@angular/cdk` | `22.1.8` / `22.2.0` | 2026-09-23 | same-day; not aged |

## OSV exact-version results

`POST https://api.osv.dev/v1/querybatch` for every exact pin above returned
**no vulnerabilities** for those versions (clean).

## GitHub advisory disposition (Angular 22 line)

Relevant public advisories whose vulnerable ranges intersect Angular 22.
Disposition relative to **baseline `22.1.7`** (and Material/CDK `22.1.7`):

| GHSA | Severity | Package focus | 22.x patched at | Baseline 22.1.7 |
| --- | --- | --- | --- | --- |
| GHSA-hh8m-fm6v-7cvg | Moderate | core / compiler host sanitization | `22.1.0` | **Patched** |
| GHSA-p297-fm68-3q8c | Moderate | common `HttpTransferCache` | `22.1.1` | **Patched** |
| GHSA-f6mr-pjwc-34m4 | High | platform-server SSRF | `22.1.4` | N/A peer; patched if consumers use ≥22.1.4 platform-server |
| GHSA-v3p8-whq6-r5jg | High | platform-server SSR XSS | `22.1.4` | N/A peer; same |
| GHSA-jj27-h5hq-8x99 | High | i18n XSS | `22.0.1` | **Patched** |
| GHSA-rgjc-h3x7-9mwg | High | hydration / cache poisoning | `22.0.1` | **Patched** |
| GHSA-jhpw-976m-542j | High | common transfer-cache | `22.0.2` | **Patched** |
| GHSA-58w9-8g37-x9v5 | Moderate | compiler two-way binding | `22.0.1` | **Patched** |
| Earlier 22.0.0-rc / next XSS / SSRF family | High/Mod | core/compiler/common/platform-server | ≤ `22.0.7` / rc.2 | **Patched** in 22.1.7 |

No GitHub Security Advisories were returned for `@angular/material` or
`@angular/cdk` at query time. No advisories were returned for `rxjs@7.8.2`,
`zone.js@0.16.3`, `sass@1.104.1`, `typescript@6.0.3`, or `tslib@2.8.1`.
Historical `ng-packagr` GHSA-qm28-7hqv-wg5j affects `<10.1.1` only (not 22.1.1).

### Docs-cited SSR floor

`docs/07-upstream-security-release.md` cites a September 2026 malformed-DOCTYPE
SSR DoS patched in `platform-server` **21.2.23 / 22.1.6**. That package is not
a library peer. **Accepted consumer guidance:** SSR fixture/test stacks should
pin `@angular/platform-server` ≥ `22.1.6` (aligned with the aged framework
minor). No library code change required.

## Accepted risk vs actionable patches

| Finding | Action this RC (no publish) |
| --- | --- |
| Exact aged baseline `22.1.7` includes known framework 22.x GHSA patches through the 22.1.1 / 22.1.4 floors | **Accepted** — keep aged pins; do not bump to same-day `22.1.8` / `22.2.0` |
| Advertised peer range previously `^22.0.0` was wider than the security-patched floor | **Applied 2026-09-23**: advertised peers tightened to `^22.1.7` for framework + Material/CDK (+ optional animations/forms) to match the aged security/tested floor. Re-check before publish. |
| Optional `@angular/animations` peer retained for overlay trigger metadata | **Accepted** until motion migration (see `compatibility/motion-overlay-trio.md`); optional, not a known GHSA |
| Historical `@material/*` 15.0.0-canary direct deps (compile/theme) | Outside this Angular/Material/CDK advisory pass; leave for supply-chain follow-up if needed |
| No frozen lockfile audit in this environment | Re-run `pnpm audit` / dependency review on the release lockfile before publish |

## Decision

- **Do not bump** the aged Angular/Material/CDK **22.1.7** selection for this
  unpublished RC.
- **Do not** treat research-head / same-day `22.2.0` as a release baseline.
- Advertised peer floor **tightened to `^22.1.7`** (applied on unpublished RC tip).
- Advisory review for the aged peer set remains **closed for this RC wave**;
  re-check GHSA/OSV immediately before any npm publish.
