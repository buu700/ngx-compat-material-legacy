# Exact remaining npm tool advisory triage after private-profile isolation

Reviewed main `7778531059fecb559f1e75dd2fec2c874b58e878` and 21.x `cb03e92842cb3fc1a30955396cbe9d2d3af07a16`, both clean. This is a static re-triage of the seven previously unresolved inputs, preserving their original identifiers/order. It is not a full security scan, runtime vulnerability validation, dependency-gate acceptance or release audit.

The npm11.19.0 archive is authenticated by SHA256 `31e9770f7dc71119a58509353b27917557aaf0ac9b5ef1a0465ee7d8ec67ae75`; all1943 regular source members were compared with its extracted source. The evidence retains 28 exact source members/excerpts, the archive-wide selector-call population, current advisory responses, both source/caller identities, prior configuration diagnostics and exact security-policy resolver output.

## Results

| Input | Verdict | Review rank |
| --- | --- | --- |
| GHSA-6j4f-fj2g-mc7p, comma recursion | needs_review | 1 |
| GHSA-mh99-v99m-4gvg, total expansion length | needs_review | 3 |
| GHSA-q2hr-2g5m-vwhr, rewrite CPU complexity | needs_review | 5 |
| GHSA-qhr7-859c-m2p7, nested recursion | needs_review | 2 |
| GHSA-rgw5-rvv9-x895, intermediate arrays | needs_review | 4 |
| GHSA-ch52-4w7c-c8xp, cache disclosure | not_actionable for exact private profile | — |
| GHSA-rj75-hqrm-r3gf, selector complexity | not_actionable for exact private profile | — |

No finding is confirmed. Confidence is medium for the five review items and high for the two static private-profile exclusions.

## Cache request/identity boundary

The reviewed helper gives every parent process a fresh0700 cache, empty user/global configuration, cleaned inherited npm authentication environment and online revalidation flags. The21/main and19/21.x mutating calls use that helper; generated configuration is public fixture configuration, and both tracked root npmrc files contain only engine-strict. No other user's cache is imported or exposed as a request service.

The actual npm-registry-fetch cache-mode selection turns preferOnline=true/preferOffline=false/offline=false into no-cache. make-fetch-happen revalidates on that branch before using max-stale freshness. Its normal cached-response header list omits Set-Cookie. This is stronger than the earlier insufficient shared:false observation and addresses the supplied [cross-user/max-stale advisory](https://github.com/advisories/GHSA-ch52-4w7c-c8xp) within the maintained private profile.

The underlying affected library, URL-only account-insensitive key and stale-on-network-error fallback remain present. This is not an upstream fix or a general cache correctness claim. Arbitrary manually configured shared npm deployments are outside this finite decision.

## Selector command and input provenance

The authenticated archive has only two command consumers of Arborist's querySelectorAll: query and sbom. Query accepts direct arguments/workspace-derived paths; SBOM builds selectors from omit/workspace values. @npmcli/query calls astSync only through the exported parser function.

The private profile admits install,ci, local pack and version observations. Reviewed install/ci/pack paths reify/load/pack; they do not invoke querySelectorAll or dispatch query/SBOM, and lifecycle scripts are disabled. The maintained migration frontend does not invoke npm or ship the selector parser. This establishes absence of the supplied parse path for the reviewed workflows; the [primary advisory](https://github.com/advisories/GHSA-rj75-hqrm-r3gf) also scopes exposure to synchronous untrusted selector parsing. A new command/caller/profile or different tool requires new review.

## Five distinct brace mechanisms remain open

The newly reviewed nested path is Git dependency content -> pacote GitFetcher -> DirFetcher -> Arborist.loadActual/npm-packlist -> workspace/ignore patterns -> minimatch -> brace expansion. Directory packing still occurs after the prepare-script decision; its new Arborist is constructed from the directory path alone. Consequently ignore-scripts and the parent workspaces=false flag do not settle nested pattern reachability.

Correcting earlier shorthand, brace-expansion5.0.7 has a100000 final-output count cap and an iterative rewrite. There is no justification for calling every caller literally unlimited. Individual mechanisms remain:
- parseCommaParts(post) recursion before final-output admission;
- total string bytes despite the output-count cap;
- repeated iterative scanning/rewriting and its CPU cost;
- nested expand_(n[0]) recursion;
- intermediate N accumulation before the final count check.

For each input, establish the selected lower-trust Git/local dependency source and supported availability boundary, then assess the exact effective limits or use authenticated supported tool remediation. No crafted input was executed. The separate workspace braces exception has not been extended to these brace-expansion inputs.

## Storage and next step

The original31-input triage and raw reports remain unchanged. This seven-input result does not reissue the other24 verdicts. The repository producer still retains seven unresolved tool items; integrating these two scoped exclusions needs source/profile/caller/configuration and current-advisory binding, with meaningful stale/changed/foreign/overlap negatives.

Evidence: [private-profile-remaining-evidence.json](private-profile-remaining-evidence.json)  
Structured result: [private-profile-remaining-result.json](private-profile-remaining-result.json)

No tests, installs, builds, dependency imports, applications, PoCs or runtime validation ran during this triage. Earlier C03 configuration/routing/cache tests are supplied counterevidence and retain their borrowed Node22.23.3 limitation. Full canonical Actions, product qualifications and independent A01-A10/R01-R03 remain outstanding.
