# Helper commands and limitations

Run from the extracted handoff root. Python helpers use the standard library (Python 3.10+). The Sass runner uses Node.js and Dart Sass installed in a separately prepared environment; its wiring is tested with Node 22.16.0, **not** an Angular-22 build. Pick the actual application/library Node version from the selected Angular compatibility matrix [A01].

These helpers are usable starting tools, not an implementation of the package, schematic or standalone migration CLI. They neither publish nor install dependencies automatically. The schema files and fixture inputs are specifications/data, not captured baseline results.

## 1. Safe source bootstrap

```bash
python scripts/bootstrap-material.py
# Review the displayed destination, upstream, origin, tag and branch.
python scripts/bootstrap-material.py --apply
```

The default prints a plan and writes nothing. `--apply` performs the local full-history clone and branch/remote setup only. Use `--expected-commit` with an independently verified full 40-character baseline commit to enforce provenance. Destination defaults to `~/ngx-compat/material`; an existing checkout is refused. There is no install, push, remote-repository creation or publication. GitHub organization access is not established by adding an origin URL. Never enable inherited upstream publishing workflows unchanged.

For repeatable implementation inventory:

```bash
python scripts/inventory-source.py ~/ngx-compat/material \
  --ref 16.2.14 --output /absolute/new-evidence/source-inventory.json
```

This reads the tagged Git objects without checking out or modifying the working tree. It hashes files, discovers actual source/test locations and parses explicit root Sass `@forward ... show` declarations. TypeScript imports are **lexical leads**, not a resolved symbol graph. TypeScript export-star/inheritance closure and Sass configurable/forwarded members require real compiler-aware inventory. Do not treat an empty lexical match as proof of no dependency.

## 2. Real Sass reference and candidate compilation

Prepare two isolated directories, each with `package.json`, a lockfile and installed dependencies. The reference must contain genuine `@angular/material@16.2.14` and its resolved Sass dependency closure. The candidate must contain the **packed** implementation plus tested current Material/CDK. Both environments must use the **same exact pinned Dart Sass version** for the first comparison. Verify registry integrity and baseline full source SHA separately. No hand-edited historical source.

The commands below work only after those environments and the candidate implementation exist:

```bash
node scripts/run-sass-fixtures.mjs \
  --environment /absolute/reference-env \
  --module @angular/material \
  --output /absolute/new-evidence/reference-owned

node scripts/run-sass-fixtures.mjs \
  --environment /absolute/candidate-env \
  --module @ngx-compat/material-legacy \
  --output /absolute/new-evidence/candidate-owned

python scripts/compare-css.py \
  /absolute/new-evidence/reference-owned \
  /absolute/new-evidence/candidate-owned \
  --report /absolute/new-evidence/owned-comparison.json
```

Do not run the comparator as a substitute for checking both compiler exit codes and reports. The runner writes warnings, compiler identity, fixture hashes, package-manifest hashes, lockfile hashes and output hashes. A fixture compilation failure exits nonzero. Missing Dart Sass is an error, not a reason to substitute a mock compiler for reference evidence. Output directories must be new. It only substitutes the single literal root module URL in each original fixture.

The runner defaults to strict owned/value fixtures. Run again into different fresh directories with `--include-bridge` to include core and whole-aggregate/current-companion cases. These are review cases: do not expect or advertise whole-Material16 equality. Record exact differences and runtime composition tests.

If a precise output difference has already been approved, the optional arguments are:

```bash
python scripts/compare-css.py /absolute/reference /absolute/candidate \
  --approvals /absolute/reviewed-css-exceptions.json \
  --fixture-hashes /absolute/candidate/fixture-hashes.json \
  --report /absolute/new-evidence/reviewed-comparison.json
```

Start with `templates/css-exceptions.json`, not a blanket whitelist. Each approval requires exact input/output hashes, an identified reviewer, reason, category and related test evidence. An approved difference is classified separately from exact equality. The comparator normalizes line endings only; it never sorts selectors/declarations, minifies, ignores numerics or drops duplicate rules. It is **not** a CSS parser or visual-equivalence proof.

The fixture runner uses Sass load paths to installed packages. That does **not** validate Angular CLI/package `exports` resolution. Separate real packed-consumer builds must test those importers, all supported entry points and assets. Add modern-compiler, browser, component-style and DOM tests as specified in `docs/06-verification.md`.

## 3. Published-package static precheck

```bash
python scripts/inspect-packed-package.py /absolute/library.tgz
# Or point at a previously extracted npm package directory.
```

Run on the actual `npm pack` result. Checks include required entry points, Sass root, collection wiring, obvious dependency/import violations, license order, RxJS/tslib declaration and suspicious package placeholders. This is not a compiler, dependency resolver or vulnerability scan. Resolve public/private semantic ambiguities by source/API review. A green result cannot replace clean consumer installation, AOT compilation or security triage.

## 4. Tests of these helpers

```bash
python -m unittest discover -s tests -v
node --check scripts/run-sass-fixtures.mjs
```

The Sass-runner unit test uses an explicitly **fake test compiler** to check argument/path/report wiring. It does not parse Sass and is not included as a usable Sass implementation. No golden CSS or Angular pass is inferred from those tests. Read `VALIDATION.md` for the executed evidence boundary.

## 5. Cross-tree historical dependency closure

Before deleting or extracting any v16 source, generate a conservative source-closure report directly from the immutable tag:

```bash
python scripts/source-closure.py ~/ngx-compat/material \
  --ref 16.2.14 \
  --output /absolute/new-evidence/source-closure.json
```

It follows resolvable relative TypeScript imports/re-exports, `templateUrl`, `styleUrl`/`styleUrls`, and Sass `@use`/`@forward`/`@import` edges without changing the checkout. It separately records boundaries into ordinary Material, CDK and external packages. Review every ordinary-Material/CDK boundary before source removal or extraction. The helper is lexical and deliberately conservative; unresolved edges and compiler-generated/build-system relationships still require real build/source review.

## 6. Stable-upstream API policy guardrail

Run against the **shipped implementation/Sass roots**, not the historical reference/research fixtures:

```bash
python scripts/check-upstream-api-policy.py projects/ngx-material-legacy/src \
  --report /absolute/new-evidence/upstream-api-policy.json
```

The policy is in `research/upstream-api-policy.json`. It rejects the legacy Angular animation engine, obvious Angular/Material/CDK private/deep imports, underscore/`ɵ` upstream imports, and shipped use of current Material M2/backcompat Sass. This is a guardrail, not a semantic deprecation oracle. The generated delegated-API inventory and major-release review must additionally detect public APIs that become deprecated, compatibility-only or scheduled for removal.

## 7. Immutable historical-reference seal

After genuine Material 16.2.14 API/Sass/DOM reference evidence has been captured and reviewed, seal the directory once:

```bash
python scripts/seal-reference.py --create /absolute/reference/material-16.2.14
python scripts/seal-reference.py --verify /absolute/reference/material-16.2.14
```

Candidate CI and future maintenance use `--verify` only. The seal refuses symlinks and fails on added, removed or changed evidence. Never regenerate the historical reference seal merely to make compatibility tests pass.

## 8. Sass structural/value capture

Fixtures marked `capture_debug: true` use `meta.inspect(...)`/`@debug` to verify historical Sass values and nested map structure, not just emitted CSS:

```bash
node scripts/run-sass-value-fixtures.mjs \
  --environment /absolute/reference-env \
  --module @angular/material \
  --output /absolute/new-evidence/reference-values

node scripts/run-sass-value-fixtures.mjs \
  --environment /absolute/candidate-env \
  --module @ngx-compat/material-legacy \
  --output /absolute/new-evidence/candidate-values
```

Compare ordered debug output only when fixture hash and exact Dart Sass/compiler environment are recorded. This is especially important for theme-map/palette/typography structure that downstream Sass can inspect or mutate directly.

## 9. GitHub Actions pin enforcement

Once workflows exist:

```bash
python scripts/check-workflow-pins.py .
```

Local actions (`./...`) are allowed. External `uses:` references must use a full 40-character commit SHA; tags and mutable branches fail. This should run in PR CI against the workflows themselves.

## 10. Initial exhaustive upstream-delta inventory

After fetching the explicitly recorded research ref/tag, generate the machine list of commits to classify. The source ref may be newer than the seven-day release window; it never selects release dependencies:

```bash
python scripts/list-upstream-deltas.py ~/ngx-compat/material \
  --from-ref 16.2.14 \
  --to-ref <verified-research-components-tag> \
  --output /absolute/new-evidence/upstream-deltas.json
```

The default path seed is `research/upstream-audit-paths.json`. **Expand it with every path discovered by `source-closure.py` and the entry-point worksheets before calling the audit complete.** The tool deliberately does not decide whether a commit applies. Its `inventory_role` is `research-only` and every initial `review_status` is `unreviewed`. Apply `research/upstream-audit-policy.json`: every SHA needs an individual disposition or explicit membership in an evidenced low-risk batch. Review depth is risk-weighted, not equal for every commit; security/hardening, runtime, accessibility/lifecycle, public-contract and uncertain changes require individual review. Titles/paths alone are not evidence that a build or test change is harmless. `security-review` is pending, never a completed clearance. Before an `inherited` disposition, verify the actual selected peer contains the fix for that branch. Reconcile SHA coverage and unresolved sensitive entries before completion. Keep dispositions to avoid repeated archaeology; inventory generation alone is not a security audit.


## Toolchain/configuration and publication checks

Copy the toolchain templates to the implemented repository root. A static self-check of the delivered templates runs without installing Node/pnpm/npm:

```bash
python3 scripts/check-toolchain.py --root templates \
  --published-manifest templates/library-package-metadata.json --angular-major 22
```

Inside the implemented repository:

```bash
python3 scripts/check-toolchain.py --runtime
python3 scripts/check-toolchain.py --runtime --release \
  --require-bootstrap-evidence tooling-release-evidence.json \
  --published-manifest dist/ngx-material-legacy/package.json --angular-major 22
```

`tooling-release-evidence.json` starts deliberately incomplete. The release check must fail until genuine timestamps/checksums/verification are captured. The checker tests consistency of recorded evidence, not cryptographic authenticity or registry availability; fetching/verifying the artifacts remains a bootstrap operation. Its YAML checks cover selected top-level scalar policy fields only. Real pnpm12 installation/config parsing remains required. Synthetic unit tests do not prove the selected Node24/pnpm12/npm toolchain ran here.
