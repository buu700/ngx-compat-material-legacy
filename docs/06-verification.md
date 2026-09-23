# 6. Verification and release gates

## Evidence, not a green compiler alone

Use isolated historical 16.2.14 reference consumers and a current public compatibility laboratory. Candidate tests consume the packed library; reference tests use genuine published baseline packages and compiler versions, not rewritten candidate code. Record source tag/full SHA, tarball integrity, fixture hash, toolchain, viewport, browser and operating system. Never mix duplicate Angular versions in one page to simulate a comparison.

Port upstream tests/harnesses and map each original test file to retained, adapted or justified replaced coverage. An old test needing obsolete test infrastructure is a porting task, not permission to drop the behavior. One synthetic application covers every family, custom themes, overlays, forms, RTL, focus, disabled/read-only/error states and dynamic content. No private application is required.

## Independent gates

| Gate | Required evidence before RC |
|---|---|
| Toolchain/release safety | Exact private-workspace Node/pnpm/release-npm pins, frozen lock, runtime version assertions, seven-day evidence and scoped-public publication checks |
| History/provenance | Baseline ancestor, exact SHAs, extracted source closure, preserved notices |
| API scope | Every historical public entry point/export/harness classified; sealed declaration/API reference snapshot; zero unresolved silent removals |
| Dependencies | Verified peers/runtime closure; no engine/private/deprecated/compatibility-only/planned-removal upstream dependency; direct RxJS/tslib audited; upstream API policy checker clean |
| Package | Packed install, AOT/types, testing/Sass/assets/CLI entry points, no source aliases |
| Sass values | Whole historical palette/theme/typography **values and map structure** via debug/meta.inspect reference captures; unsupported input errors |
| Owned CSS | Same-input reference comparison; exact ordered output or precise approved exception |
| Core/shared/aggregates | Explicit responsibility membership and current-drift reports, cascade/coexistence tests |
| Rendered compatibility | DOM/classes, component stylesheet output, computed styles, overlay states, event/lifecycle checks |
| Motion | Real enabled, disabled and reduced-motion tests; cancellation, timing, disposal and event ordering |
| Interop | Current datepicker/forms, sort/table, icons, shared tokens, required mixed M2/M3 coexistence and owned-only aggregate isolation; native M3 legacy theming is not a release gate |
| Migration | AST/token-aware, idempotent, source-only Sass, fail-closed diagnostics; old-workspace route verified |
| Security | Every inventoried SHA dispositioned individually or in an evidenced low-risk batch; risk-weighted reviews complete and sensitive blockers resolved; inherited fixes proven in exact selected peers; delegated APIs checked for removals; confirmed relevant severe defects addressed |

Chromium gets comprehensive interaction/visual coverage. Firefox/WebKit get high-risk overlay/form/motion smoke before RC; expand full screenshot matrices as hardening. Test zoneful and zoneless when support is claimed. SSR gets an import/render smoke and explicit limitations; hydration is a gate only if advertised. Lack of an exhaustive browser matrix does not authorize an untested critical behavior claim.

## CSS comparison details

For direct comparisons choose one **common pinned Dart Sass version** that can compile both untouched Material 16.2.14 fixtures and the candidate, with identical options. Keep the historical application/compiler environment as a separate reference leg and test the candidate on its target modern Sass leg too. Verify that common-compiler output still agrees with historical semantics. If there is no usable compiler overlap, record that blocker rather than claiming cross-compiler byte parity or changing the old source to force it. The supplied comparator only normalizes line endings and preserves selectors, ordering, repeated declarations, custom properties, `!important`, layers and numerical values. That is intentionally strict. No selector/property sorting or broad masking.

Separate three outcomes: exact pass; explicit reviewed divergence; blocked. An approved divergence record includes fixture/input hash, exact old/new CSS hashes, owner/category, reason, related regression tests and reviewer. Approval invalidates when inputs/outputs change. No wildcard allowlist or agent self-approval of unexplained drift. Store full diff artifacts, not only a pass/fail count.

Include component-level styles and runtime inline state, not only theme mixins. Preserve font metrics and supply deterministic fonts in the fixture environment; use licensed project/browser fonts, not an unlicensed font bundle. Capture delayed/lazy style injection and ordinary component token CSS. Verify focus rings and reduced-motion/forced-color visibility.

## Migration readiness report

List preserved legacy guarantees separately from upstream ordinary/shared risks. Never say “safe to deploy” because imports/Sass build. The downstream consumer chooses its visual acceptance. Do not mutate a consumer's CSS to compensate for a library contract regression.

## Tool boundaries

The included Python tests exercise helper behavior on synthetic files/repos; they are not Angular compatibility tests. The JS Sass runner needs an installed pinned Sass implementation and installed baseline/candidate packages. This handoff does not include pre-generated CSS falsely labeled as a historical capture. `VALIDATION.md` records which checks were actually executed.


## Initial branch/release matrix

Before the first stable release, run the package from the packed tarball on both supported lines. `main`/22.x is the active development line; `21.x` is a maintenance/LTS line. Each branch owns its exact dev toolchain and lockfile. Do not make a cross-major source merge mandatory when a small branch-specific adapter is clearer.

Test TypeScript 6.0.x on Angular 22 and TypeScript 5.9.x on Angular 21 according to Angular's published compatibility table; TypeScript is build tooling, not a consumer peer. Use current RxJS 7.x in primary CI and add an RxJS 6.x smoke only if the advertised peer range retains it. Security-patched Angular minimums must be re-evaluated immediately before release rather than copied blindly from this handoff.

## Immutable reference seal

Historical reference outputs live under `reference/` with a generated SHA-256 manifest. `scripts/seal-reference.py --verify` must pass in CI. Updating a historical reference requires an explicit maintainer operation with provenance and review; candidate implementation jobs must never regenerate/reference-update automatically. Current-browser screenshots may be regeneratable separately, but Material-16 API/Sass/CSS reference evidence is not.

## Reference evidence sealing

Historical Material-16 evidence is immutable after capture/review. Store it under `reference/material-16.2.14/`, seal it with `scripts/seal-reference.py --create`, and use only `--verify` in candidate/future CI. A changed or regenerated seal is a review event requiring proof that the original reference capture was wrong; it is never an ordinary golden-update operation. See `reference/README.md`.
