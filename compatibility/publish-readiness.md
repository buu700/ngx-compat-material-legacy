# Publish readiness (owner-run; no automated publish)

Package: `@ngx-compat/material-legacy@22.0.0-rc.0`
Repository: `buu700/ngx-compat-material-legacy`
Policy: **no npm publish from agent workstreams**. This checklist prepares the
owner-authorized release path only.

## Manifest gates

| Check | Expected | Evidence |
| --- | --- | --- |
| Package name | `@ngx-compat/material-legacy` | `projects/ngx-material-legacy/package.json` |
| Version | `22.0.0-rc.0` (first RC) | same |
| License | MIT; Google notice then `Copyright (c) 2026 Ryan Lester.` | packed `LICENSE` |
| `repository.url` | `git+https://github.com/buu700/ngx-compat-material-legacy.git` | package.json |
| `publishConfig.access` | `public` | package.json |
| Engines (Node) | `^22.22.3 \|\| ^24.15.0 \|\| ^26.0.0` | package.json (not private workspace `24.21.0` only) |
| Peer floor | Angular/Material/CDK `^22.1.7` (security/tested) | package.json + `advisory-triage.md` |
| Optional peers | `@angular/forms`, `@angular/animations` | `peerDependenciesMeta` |
| Exports | Finite legacy entries + root Sass | packed exports / inspector |
| Schematics | `schematics/collection.json` → `migrate-legacy` | pack-proof |

## Provenance / trusted publishing (owner)

1. Confirm npm package does **not** yet exist, or confirm intended first RC tag (`next`).
2. Configure npm Trusted Publishing (OIDC) against this repository + release workflow
   with **stage-only** (no direct publish automation).
3. Pin release npm CLI to **11.19.0** (independent of pnpm 12.4.2).
4. Build on the exact approved commit in a clean frozen environment; capture
   tarball sha256, file list, SBOM, and pack-proof evidence.
5. Run packed-consumer AOT/harness + Sass coexistence smoke against **that** tarball.
6. Re-run GHSA/OSV + lockfile audit immediately before stage.
7. Stage tested tarball; human 2FA approval; verify registry metadata + provenance
   attestation; install a registry consumer after approval.

## Dist-tags

| Line | RC tag | Stable tag |
| --- | --- | --- |
| 22.x (`main`) | `next` | `latest` |
| 21.x maintenance | `lts-21-next` | `lts-21` |

Never let a 21.x publish move `latest` backwards.

## Explicitly out of scope for agents

- `npm publish` / OIDC job execution that releases to the registry
- Storing publish tokens in the repository
- Publishing empty placeholders to reserve the name

## Related evidence

- `compatibility/pack-proof/` — packed tarball + consumer smoke + AOT/harness
- `compatibility/advisory-triage.md` — aged peer security floor
- `compatibility/migrate-legacy-cli-artifact.json` — optional separate CLI package
- `docs/10-support-ci-publication.md` — full publication policy
- `research/support-policy.json` — support matrix seed
