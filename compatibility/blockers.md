# Active blockers

## B-TOOL-01 — Aged Angular/Material peer baseline unresolved
`research/version-observations.json` release baselines remain `unresolved-unverified`.
Cannot yet `pnpm install` a frozen Angular 22 / Material / CDK set under the
7-day age policy with integrity evidence. Sass facade and TS ports need those
peers for compile/pack proof.

## B-SASS-01 — Facade compile not yet verified against 16.2.14 goldens
Owned Sass sources are imported, but Dart Sass + `@angular/cdk` / `@material/*`
load-path compile and W02 immutable CSS/value seals are pending peer install.

## B-CI-01 — Push-triggered Actions initially produced zero runs
`workflow_dispatch` successfully ran green CI. Prefer keeping that trigger;
investigate whether first-time Actions enablement delayed push events.

## Non-blockers / constraints
- Cyph tree at `/workspace/ngx-compat/reference/cyph-dev-prod` is oracle-only; never commit it.
- No npm publish.
- Do not delete `src/` Material/CDK until escape edges/unresolved relatives are classified and extraction is complete.
