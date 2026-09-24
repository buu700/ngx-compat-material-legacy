# F08 — Historical behavior TestBed runner (bootstrap)

**Status:** in progress (runner proven; full 57-spec port incomplete)  
**G09:** not claimed passed

## Runner

Public Angular TestBed + Jasmine + Karma ChromeHeadless + esbuild bundle.
No Bazel.

| Item | Value |
| --- | --- |
| Script | `pnpm run test:legacy` → `scripts/run-legacy-tests.mjs` |
| Fail-proof | `pnpm run test:legacy:fail-proof` (`LEGACY_TESTS_EXPECT_FAIL=1`) |
| Bundle | `testing/legacy-runner/build.mjs` → `testing/legacy-runner/out/` (gitignored) |
| Results | `compatibility/f08/legacy-test-results.json` |

## Proof (this bootstrap)

| Mode | Executed | Passed | Failed | Notes |
| --- | --- | --- | --- | --- |
| normal | 35 | 29 | 6 | Button unit + harness + discovery; exit 1 |
| fail-proof | 35 | 28 | 7 | Deliberate assertion observed; exit 0 |

Evidence files: `legacy-test-results.normal.json`, `legacy-test-results.fail-proof.json`.

Harness suite **Non-MDC-based MatLegacyButtonHarness**: 12/12 passed.
Discovery suite: loaded mapped button specs.

## Adaptations (test-only)

- `@angular/cdk/testing/private` → `testing/legacy-runner/shims/cdk-testing-private.ts` (adapted from Components 16.2.14 fake-events, MIT)
- Button harness shared tests → `testing/legacy-runner/shims/button-shared.spec.ts`
- Specs import `@ngx-compat/material-legacy/...` from ng-packagr `dist/`

## Button failure themes (not runner bugs)

1. Color class application / class retention (`mat-primary` / `mat-accent`)
2. Anchor `aria-disabled` / tabindex when disabled
3. Ripple disabled when `disableRipple` or button disabled

These need component/behavior follow-up (coordinate with F02–F04; do not rewrite motion/core barrels here).

## Port inventory

See `port-manifest.json` and `blockers.md`. Priority families still largely unported into the runner.
