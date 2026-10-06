# First session: qualify the subject, then finish 21.x admission plumbing

For an initial implementation launch, follow the steps below. For a fresh audit-phase launch accompanied by the exact C05 checkpoints and evidence, authenticate those subjects and the supplied phase, then follow the [C05-to-audit context transition](AUDIT.md#c05-to-audit-context-transition) and A01–A10. Do not repeat C01 merely because prior context is absent. Actual new findings may reopen implementation. The C/A/R sections in this package are complete; no earlier FIN packet is needed.

## 1. Establish the real checkout

Inspect `git status --short`, `git rev-parse HEAD`, `git rev-parse 'HEAD^{tree}'`, `git branch --show-current`, `git worktree list --porcelain`, and the remote identity without printing credentials. Compare with [BASELINE.md](BASELINE.md). The plan anchors are not reset targets. Preserve local changes and unpushed descendants. Do not reuse an old dirty 21.x worktree without understanding every change.

Check capabilities: Git metadata, Nix/just, declared Node/pnpm/browser binaries, network and existing commit/push/CI authority. Read branch-native `justfile`, `chainman.toml`, environment pins and workflow configuration before executing setup. An absent local tool or `gh` does not prove the GitHub connection is unavailable; use available authorized connectors. Never extract embedded Git credentials or grant new remote permissions to compensate.

A narrow safety inspection of setup/process/download/archive/report code is required before executing it. This preflight is not the complete audit and must not consume a new infrastructure tranche.

## 2. Read the captured results, not stale status

Validate the bundled archives and read `run.json`, `verify-summary.json`, `source-inputs.json`, the six selected report details in the summaries, and the actual exception records in the source checkout. The archives are already packaged under `evidence/`; signed transport URLs are not a dependency.

Main's incomplete checks are Sass and upstream/security admission. 21.x adds dependency eligibility and has six unexpanded audit/dependency groups. Both full runs have no source-input changes. Do not restart the resolved drift repair. Keep 18/20 and 17/20 as baseline labels, not proof of all contract scope.

Open a compact known-gap list from the report details: runtime-floor arithmetic, 21.x M3 source-only evidence, old-workspace CLI `tarball_used:false`, Sass pending cases and G11 review/authority gaps. Map each to C01–C04. This prevents a quick 20/20 metadata change from ending the assignment.

## 3. C01: derive and execute the six missing 21.x groups

Inspect `scripts/check-dependency-eligibility.py`, `scripts/check-upstream-audit-disposition.mjs`, `scripts/rc-verify.py`, their helper imports/tests, the branch's own dependency closure and `compatibility/rc/matrices/full-verify.json`.

For dependency eligibility, replace the two null groups (`locks-tools-maturity`, `vendor-provenance-license`) with the expected cases derived before execution. Main has nine named cases to guide implementation; do not copy its observations or lock/package counts. Resolve the actual child failures as well as the null groups. Requery the actual branch lock and retained Sass/advisory closure with exact source/lookup identities.

For audit, expand `upstream-shas`, `authored-symbols`, `installed-peer-fixes`, and `current-advisories` to the actual branch-scoped contract. Check that the invoked checker and evidence dependencies exist on 21.x. A true positive fixture should be admissible; missing evidence, wrong-line attribution, unresolved material rows, expired/missing approvals and bad source hashes must remain nonzero. Do not add a permanent synthetic failure case merely to keep G11 red. It must become capable of passing when the real contract is satisfied.

Start ordinary canonical setup and verification only after inspection. On the actual 21.x checkout, the existing interface is `just chainman setup javascript`, then `just verify-lite` where that branch exposes it, and `just verify --out <fresh-owned-directory> --line 21.x`. Verify actual recipes before invocation; a proposed command is not magically installed. Use a unique absolute output directory under the configured artifact/temp roots and avoid simultaneous standalone scripts sharing outputs/ports.

## 4. First checkpoint evidence

Record a clean source checkpoint and a new branch-local full run. The useful result is no remaining null audit/dependency configuration and a real dependency result, with G11 failing for substantive evidence/authority reasons if unresolved. Preserve the entire run archive, including failures. Do not declare audit success because its structural report has `result: pass`.

Add/reuse negatives for missing roster IDs, stale output, wrong-line data, missing lookup coverage and unsupported exception grants. Keep real secrets outside logs. Verify the code and tests in CI under actual authority rather than creating a commit solely to announce CI success.

Then move immediately to C02/C03 and C04. The Sass decisions and authority questions may be investigated alongside C01; completing C01 is not the overall goal. At the end of any context window record one next action, the exact incomplete scopes, artifact/source identities and findings in the existing durable handoff.
