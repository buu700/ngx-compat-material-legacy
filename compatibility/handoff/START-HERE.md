# ngx-material-legacy — implementation handoff

Build `@ngx-compat/material-legacy`: the removed Angular Material legacy APIs on a supported current Angular/Material/CDK stack, with a deliberately conservative Material-16 Sass compatibility boundary.

| Decision | Value |
|---|---|
| Canonical repository | `https://github.com/buu700/ngx-compat-material-legacy` |
| Package | `@ngx-compat/material-legacy` |
| Local implementation checkout | `~/ngx-compat/material` |
| Historical source | `angular/components`, tag `16.2.14` on `16.2.x`; preserve Git ancestry |
| Branch policy | bootstrap on `compat-main`; public `main` tracks the active Angular major; numbered maintenance branch tracks the immediately preceding supported/LTS major |
| Primary repository tools | Node **24.21.0**, pnpm **12.4.2**; exact pins and evidence in `templates/toolchain-lock.json` |
| Release CLI | npm **11.19.0** selected; staging requires >=11.15.0; checked independently of pnpm |
| Initial release lines | `22.x` for active Angular 22 and `21.x` for Angular 21 LTS; package major follows Angular major; RCs precede stable releases |
| Runtime scope | 21 historical legacy component entry points plus `legacy-core` and their testing/support closure |
| Sass scope | Explicit historical public root namespace; preserve old meanings and legacy output; expose documented current-component bridges |
| Upstream relationship | Current Material/CDK are peers; selective adaptations, not routine source merges |
| License | Google notice retained; `Copyright (c) 2026 Ryan Lester.` immediately after it |

The canonical destination is a planning assumption, not confirmation of organization access, repository existence, publication, or another person's maintenance commitment. No remote creation/push/publish without actual authorization. Work locally when remote permissions are absent. Do not add Duncan or another person to copyright or claim their acceptance.

## Give the implementation agent

Provide [IMPLEMENTATION-PROMPT.md](IMPLEMENTATION-PROMPT.md) and this entire directory. This handoff is harness/model-neutral. Numbered documents organize concerns, **not compulsory implementation phases**. Motion removal is one adaptation item and may be interleaved naturally.

Read `docs/01-contract.md`, `docs/03-sass-contract.md`, `docs/05-migration.md`, `docs/06-verification.md`, `docs/10-support-ci-publication.md`, and `docs/11-upstream-api-policy.md` first. Then use the research tables, shared work items, and 22 entry-point worksheets to execute bounded tasks. `docs/08-task-graph.md` records dependencies and acceptance evidence. Never interpret a green helper test as a tested Angular port.

## The most important invariant

For a supported historical stylesheet, the default Sass migration may change only the module source:

```scss
// Before
@use '@angular/material' as mat;
// After
@use '@ngx-compat/material-legacy' as mat;
```

The namespace, palettes, theme expressions, mixin calls, selectors, declarations, inclusion order and configuration remain unchanged. Unknown/ambiguous syntax or an unsupported semantic contract must stop with a useful diagnostic, not trigger a guessed rewrite. A file using an implicit namespace needs an explicit preservation rule; see the schematic specification.

The facade is **not** a wholesale forward of current Material. Old M2 palette names must not bind to newer M3 values. `core()` must not silently become an empty mixin. Historical aggregate membership must not shrink. The implementation must be independent of upstream Material's deprecated/backcompat M2 theming: own the Material-16 M2 theme model locally and bridge ordinary current components only through stable public current theming/override surfaces.

The first-stable scope requires M2 legacy theming to coexist safely with current Material/M3. Direct M3/system-token theming of legacy controls is optional future work, not a release gate.

## Two separate compatibility claims

1. **Owned legacy layer:** preserve API, significant DOM/classes, theme values/output and interaction contracts; narrowly review motion/security exceptions with tests.
2. **Current upstream layer:** ordinary components and shared CDK/Material infrastructure remain current. Historical Sass spellings can be bridged, but that does not promise v16 rendering. The migration report must identify these boundaries and require explicit acknowledgement before declaring readiness.

**Research head is not a release baseline:** newer source/PR references guide adaptation only. Choose and test aged published peers separately for each supported branch; prove every consumed API exists at its advertised peer floor. The upstream audit requires complete commit coverage with risk-weighted depth, including evidenced batches for genuinely low-risk changes. See `docs/07-upstream-security-release.md` and `research/upstream-audit-policy.json`.

No Cyph checkout, CSS edits, deployment, or application migration belongs to this project. The included synthetic fixtures cover common historical patterns without depending on a private consumer. No Flex Layout work is included.

## Contents

- `docs/`: contract, package/build skeleton, Sass design, motion, schematic, tests, release/security, task graph and consumer-risk boundary.
- `work-items/`: shared tasks and one worksheet per legacy entry point.
- `research/`: source register, finite Sass symbol matrix, legacy-core delegation decisions, interop cases, upstream adaptation/future-breakage ledgers, support policy and upstream-audit path seed.
- `fixtures/`: historical Sass inputs, rejection cases and migration cases.
- `scripts/`: safe history bootstrap, local/cross-tree source closure, upstream-delta inventory, packaged-artifact precheck, Sass/CSS reference runners, immutable-reference sealing, upstream-API/workflow policy checks.
- `templates/`: repository README/AGENTS/LICENSE/security, pnpm policy, compatibility evidence and delegated-upstream-API records.
- `reference/`: instructions for generating and sealing genuine immutable Material-16.2.14 API/Sass/DOM reference evidence; no fabricated baseline output is included.
- `tests/`: executable tests of the handoff helpers, not of the unimplemented Angular library.

See [VALIDATION.md](VALIDATION.md) for actual checks performed and remaining implementation gates.
