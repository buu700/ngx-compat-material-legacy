# 10. Supported lines, exact tooling and publication

## Release and support policy

Maintain `main` for the active Angular major and a numbered maintenance branch for the immediately preceding supported/LTS major. Initially these are Angular 22 / package `22.x` and Angular 21 / package `21.x`. Bootstrap history on `compat-main`; only establish canonical public branches after owner authorization. Keep package/repository identity configurable before authorization; the intended destination is `buu700/ngx-compat-material-legacy` and `@ngx-compat/material-legacy`.

First candidates: `22.0.0-rc.0` and `21.0.0-rc.0`; first stable versions: `22.0.0` and `21.0.0`. Project minor/patch numbers are independent of upstream Material. Use `next` / `latest` for the active line and `lts-21-next` / `lts-21` for the maintenance line. Never let publishing 21.x accidentally move `latest` backwards. Verify the exact approved dist-tag before every publication.

`research/support-policy.json` describes the initial matrix. At a new Angular major, reconcile actual upstream support dates with already advertised commitments; do not withdraw support early merely because a branch changed names. No indefinite obligation to every Angular LTS release. Dates are dated upstream observations, not permanent promises [REL-01].

## Private repository tools versus public consumer engines

Copy the following templates to the implementation root and treat them as one checked contract:

| File | Required value / purpose |
|---|---|
| `toolchain-lock.json` | Exact tool identities, update rules, bootstrap-evidence requirements |
| `package.json` | Private build workspace; `packageManager: pnpm@12.4.2` |
| `.node-version` | `24.21.0` |
| `.npm-version` | `11.19.0` for packing/release CLI operations |
| `pnpm-workspace.yaml` | Seven-day resolution policy; fail on manager mismatch |

Node24 and pnpm12 are the chosen development/primary-CI lines. The exact pins above are selected from official release pages dated September 8, September 15 and July 29 respectively [TOOL-01, TOOL-02, TOOL-05]. Registry publication timestamps, tarball integrity, platform binaries and actual execution are **not verified by merely reading those pages**. Record them during bootstrap. Tool upgrades are reviewed exact changes, never `latest` resolution during a release. A newly discovered applicable security fix can justify an exact-version, expiring exception rather than waiting seven days.

npm is a separate release CLI, not the workspace package manager. Its selected version satisfies the staged-publishing minimum (npm11.15.0, Node22.14.0) [PUB-02]. Do not rely on the npm bundled with a Node image or conflate npm12 with pnpm12. Advance npm independently after testing stage/pack output and publication behavior.

The private root's exact Node engine must **not** leak into published library metadata. Advertised consumer ranges follow the tested Angular line [REL-02]:

| Package line | Node range | TypeScript build line | Angular-compatible RxJS range |
|---|---|---|---|
| 22.x | `^22.22.3 || ^24.15.0 || ^26.0.0` | `>=6.0 <6.1` | `^6.5.3 || ^7.4.0` |
| 21.x | `^20.19.0 || ^22.12.0 || ^24.0.0` | `>=5.9 <6.0` | `^6.5.3 || ^7.4.0` |

Resolve exact security-patched Angular/framework/CLI/compiler/Material/CDK, TypeScript, RxJS, Sass and build-tool versions into each branch's lockfile. The table is not a tested peer matrix: validate the selected releases' actual manifests. **Research-head references are not release pins**: record the source reviewed separately from the aged published package set, and verify every delegated API against that set and its advertised minimum. See `docs/07-upstream-security-release.md`. Material/CDK may publish at different times from framework. Do not claim every later minor uses an unchanged TypeScript range merely from a docs row.

Full CI runs on Node24. Add clean **packed-consumer** smoke tests on the advertised lower Node bounds; those jobs do not need the entire repository build toolchain. For 21.x, isolate Node20.19.x and Node22.12.x checks; for 22.x use Node22.22.3 or an explicitly documented patched floor. Historical Material16 references use their own supported isolated environment, not Node24 by assumption. No old-runtime fixture job gets publication credentials.

pnpm12's npm-based installer requires Node22.13+; the installed native binary does not [TOOL-03]. Bootstrap it under Node24 before switching to an older consumer runtime, or select a separately pinned compatible consumer installer. Do not solve a test-runner bootstrap problem by narrowing library engines or disabling engine checks. Record installer/binary identity and run `node --version`, `pnpm --version`, and release `npm --version` assertions.

The pre-upgrade CLI has its own documented/tested Node requirement, independent of both the library peers and private workspace. It can be launched under a newer Node against old source without installing modern Angular in that workspace. Keep its TypeScript parser behind an adapter [TS-01].

## Supply-chain enforcement

`minimumReleaseAge: 10080`, strict age behavior and fail-closed missing timestamps apply to normal dependencies including transitives [SUPPLY-01]. Set `trustLockfile: false`: a frozen contributor-authored lockfile is not proof of acceptable publish age. Keep version-specific, reasoned exceptions only; no scope-wide bypasses. Retain the original reason/evidence in the exception ledger even if pnpm prunes a no-longer-resolved config entry.

Set `pmOnFail: error` [TOOL-04]. Provision the exact manager explicitly rather than silently allowing a mismatched manager to download another one. The workspace age rule does not by itself secure Node/pnpm/npm bootstrap: verify their release evidence and checksums before execution. Pin any installer action/package and verify its dependencies/binary too. Do not run floating `npx`, remote `curl | sh`, global npm updates, or unreviewed install scripts in a release job.

Use immutable/frozen lockfile installs. A disposable canary can intentionally test fresh Angular or `next`, but must not mutate the release lockfile, access publishing credentials, or provide artifacts to release. Evaluate optional trust/no-downgrade enforcement against the actual graph instead of granting broad exemptions.

## GitHub Actions layout

Use standard GitHub-hosted public-repository runners [CI-01]. Larger runners/paid services are not part of the default. The deliverable is working repository workflows, not just workflow descriptions; `research/ci-policy.json` is their required behavior, not an executable workflow.

| Workflow | Trigger and required behavior |
|---|---|
| PR CI | `pull_request`: toolchain/config/static checks, frozen install, API/value/CSS reference gates, build/unit/harness/migration tests, packed consumer, Chromium and high-risk browser interactions |
| Dependency review | `pull_request`: review base/head dependency changes, including runtime, development and unknown scopes [CI-02] |
| Browser/support | Protected branches/nightly: broader Firefox/WebKit, zoneful/zoneless, SSR smoke, supported consumer/toolchain combinations |
| Security | PR/protected push and scheduled CodeQL as appropriate; scheduled advisory/dependency audit and delegated-API deprecation checks |
| Canary | Scheduled: fresh stable and Angular `next` in an isolated workspace; visible issue/check status; nonblocking for ordinary release pins |
| Release | Protected tag or authorized dispatch: exact selected commit, full packed-artifact gates, explicit branch/version/dist-tag validation, environment approval, stage-only OIDC |

Pin external Actions/reusable workflows to full commit SHAs and container images to digests. Keep permissions job-specific. Untrusted PR code must never execute with repository write secrets or publication identity; do not use `pull_request_target` to build fork code. Do not promote PR caches/artifacts into publishing jobs. Cache use in normal CI must include lock/toolchain/platform keys; release builds use a clean trusted environment. SHA-pin scanning is a guardrail, not provenance verification or full YAML security analysis.

Keep action-managed runtime separate from the Node selected for build commands. A Node24-based Action does not set the package build's Node automatically. Protect workflow/config changes and reference-seal updates with review. The owner must configure actual protected environments and branch rules; a YAML file alone does not establish approval controls.

## Package metadata and first publication

`templates/library-package-metadata.json` is a **fragment** for the 22.x library, not an APF implementation or complete manifest. Populate exports/peers/assets normally and use 21.x version/engines on that branch. Do not copy the private root manifest into `dist`.

The packed manifest must have the authorized scope/name, MIT license, `publishConfig.access: public`, correct version and a `repository.url` pointing to the exact repository performing trusted publication. Do not inherit `angular/components` metadata from the fork [PUB-01, PUB-03]. If ownership changes, update URLs, badges, npm access, environment and OIDC trust together before publishing under the new identity.

Staging cannot create a package's first-ever version [PUB-02]. For the first authorized publication, use a real fully tested RC, explicit public access and a prerelease dist-tag. Conceptual invocation after all gates and human authorization:

```bash
npm publish /absolute/path/to/tested-package.tgz --access public --tag next
```

Use `lts-21-next` for an initial 21.x RC instead. The one-time login/2FA or supported bootstrap authorization is an owner operation; do not store credentials in the repository. Do not publish an empty placeholder just to create the package. Configure trusted publishing after the package exists and verify it against the actual repository/workflow/environment.

## Subsequent staged publication

1. Verify canonical identity, release branch, version, dist-tag, exact runtime tools and bootstrap evidence. Re-evaluate advisories.
2. Build on the exact approved commit in a clean frozen environment. Capture the tarball's hash, file list, SBOM and test evidence.
3. Test the packed artifact in clean consumers. Never rebuild different bytes after the tested-artifact gate.
4. Use stage-only npm Trusted Publishing from the authorized GitHub-hosted workflow with `id-token: write`. Do not enable direct publish for this trusted publisher [PUB-01].
5. Verify the pinned npm CLI's exact stage invocation against its documented help. Stage the tested tarball when supported; if stage repacks a directory, prove the staged package file manifest/bytes agree with the tested artifact. Missing tarball-input support is not permission to bypass artifact equivalence.
6. A maintainer authenticates interactively, reviews the stage ID, version, dist-tag, digest/file content and provenance, and approves with 2FA. Stage management/approval is not an OIDC automation action. Never automate the human gate.
7. Confirm registry metadata, intended dist-tag, artifact integrity and provenance after approval; install a registry consumer for post-publication verification.

The public-repository/public-package trusted-publishing path supplies provenance [PUB-01]. Verify the resulting attestation rather than just assuming configuration succeeded. Pin npm explicitly; no long-lived publish token or fallback to direct automatic publication if staging/authentication fails. A rejected or broken release requires a new version and the normal review path, not overwriting registry history.

## Governance and security intake

Enable GitHub private vulnerability reporting and ship `SECURITY.md`; do not require reports to start as public issues. Record maintainers and npm owners only with actual consent, maintain an access-transfer checklist, preserve provenance/license notices, and promise no response SLA. Coordinate relevant upstream reports responsibly. No remote mutation or publication is authorized merely by this plan.
