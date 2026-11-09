# C04 six selector metadata candidate: current main integration V2

Status: external proposal for independent review. This packet contains six row edits and evidence records. It does not edit the canonical ledger or claim complete C04/G11/security/release completion. The `do-not-adopt` conclusions apply only to porting the six peer selector changes into the package's owned Material 16 legacy CSS. Current peer CSS behavior remains separately unqualified where stated.

## Revalidation and Sass role correction

- Canonical candidate: `c2c58388e0777e580fd76234b57c271de0cb4115`, read-only worktree, clean at inspection. Current checker SHA-256: `179e3bae4e253ab354b33e5759802e8f88aa3bd038a6009e10412710fb29885b`; current ledger SHA-256: `a68b0f204ce42e475162f629d85e728436d6a2300920d47f2641fb75b3804e21`.
- The current companion contract in `reference/companion-contract.csv` enumerates thirteen families: badge, bottom-sheet, button-toggle, datepicker, divider, expansion, grid-list, icon, sidenav, stepper, sort, toolbar, and tree. The current companion aggregator invokes those families. Table, radio, list, and slide-toggle are not in that contract and are not current companion bridges.
- The exported `table-theme`, `radio-theme`, `list-theme`, and `slide-toggle-theme` Sass modules are historical M2 modules. Their implementations respectively emit owned M2 table tokens or use owned/vendored historical theming; they do not call `mat.table-overrides`, `mat.radio-overrides`, `mat.list-overrides`, or `mat.slide-toggle-overrides`. Separate `legacy-*-theme` exports are the owned legacy theme entry points. The sampled coexistence fixture uses those `legacy-*` exports plus independent peer M3; it does not qualify any hypothetical current-M2 bridge for these four modules. No package behavior obligation for unsupported historical theme use on peer 22 is inferred here.
- Checkbox has a distinct, real appended public bridge: exported `checkbox-theme` calls `mat.checkbox-overrides`. It is outside the thirteen-family companion roster. This API remains accurately recorded in the row decisions; the coexistence sample used `legacy-checkbox-theme`, so it does not qualify the appended bridge's peer output. Do not infer that all six selectors are covered by current companion bridges.
- Source role and export evidence is in `sass-role-evidence.json`; exact member hashes are also listed in the individual proof evidence. The row decisions preserve unqualified current peer CSS scope without promising bridges that do not exist.

## Six candidate row decisions

| SHA | Corrected source/API role and bounded conclusion | Remaining peer behavior scope |
|---|---|---|
| `5142268c7d2ef3d09f2cf9349a0b8ad25bf466d9` | Historical owned `.mat-table` CSS; exported `table-theme` is an M2 token emitter, not a current table bridge. Do not port the peer MDC selector into owned legacy CSS. | Current peer table CSS behavior remains unqualified; no current table bridge is claimed. |
| `e4388c6f2594d81c3a95543482a2edeaa34bccff` | Historical owned legacy checkbox CSS. Separate appended public `checkbox-theme` via `mat.checkbox-overrides` is real and outside the thirteen-family roster. Do not port the peer selectors into legacy CSS. | Appended checkbox bridge output is not qualified by the legacy-theme coexistence sample. |
| `1b3c42e074988dc953198ac071fad1d90298efae` | Historical owned checkbox/list CSS. The checkbox bridge remains separate and unqualified; exported `list-theme` is historical M2, with no `mat.list-overrides` bridge. Do not port peer selector/helper changes into legacy CSS. | Checkbox bridge output is unqualified. No current-M2 list bridge or obligation is claimed. |
| `6bd31f978613bfdf49ca4f811708dd9893de6585` | Historical owned legacy radio CSS. Exported `radio-theme` is historical M2, absent the thirteen-family roster and without `mat.radio-overrides`; `legacy-radio-theme` is separate. Do not port peer MDC selectors into legacy CSS. | No current radio bridge or supported current-peer M2 radio theme behavior is claimed. |
| `6ff9c9f3d6410a9d04c6f93635c4d2fe3101b334` | Historical owned slide-toggle CSS. Exported `slide-toggle-theme` is historical M2, not a current bridge; the intermediate direct-handle selector experiment is absent at peer 22.1.7 after the later revert. Do not port it into legacy CSS. | No behavior claim for the absent intermediate selector or current slide-toggle bridge. |
| `283f11039203ae23016d1ed52313025489b2a7cf` | Historical owned slide-toggle CSS. Exported `slide-toggle-theme` is historical M2, not a current bridge. Do not port the peer selector revert into legacy CSS. | Current peer slide-toggle CSS behavior remains unqualified; no current bridge is claimed. |

All six complete before-images and candidate after-images are in `row-edits.json`. Full-index patches, authenticated parents/path censuses, evidence records, and prior ledger identities are retained in their respective packet files. Original patch and source provenance is not treated as proof of runtime behavior.

## Other revalidation evidence

- All six current ledger entries matched the prior proposal's complete before-images. Owned source member hashes were re-read at c2; nine Material 16.2.14 source blobs in the prior review were rehashed against the original tag. The three source changes from review head `a796c018da3023e916b37088917f6adca56fbc9d` to c2 are in legacy form-field files and do not touch the reviewed selector/theme members.
- The minimum peer is Material 22.1.7 at `e950f29dcfbda93c13bff0d1a632465364488249`. Current peer source relation is mixed: `5142268`, `e4388c6`, `1b3c42e`, `6bd31f9`, and `283f110` are represented in the current source; `6ff9c9f`'s direct-handle experiment is absent after the revert. This source comparison alone does not establish behavior.
- The sampled coexistence packet `c04-owned-selectors-coexistence-v2` was revalidated against its manifest. It has artifact SHA-256 `877c8b62e1ea9b134d838043dda436abb4ccf9515041640fdb05dc6113727b0b`, peer 22.1.7, and narrow legacy M2/current M3 both-style-order samples. It is not full G07. The exact sampled owned style paths have no relevant changes between sample source head `7e9ecb0a8fe31d44c1f37b8a509fc58c6ab705ad` and c2.

## Production individual-proof probe

The pinned Node 24.21.0 executable ran the current production `individualProofOk` implementation against an isolated external frame for all six candidates. Each positive was accepted, classified as file evidence, and `requiresOwnedStyle` returned false. Seven negative controls per row were rejected: changed patch digest, source-member digest, decision, branch, unsupported inherited status, evidence decision, and patch text. Exact results and harness are `production-probe.log` and `run-probe.mjs`; checker frame and imported validators are retained under `frame/`.

This probes only the production individual-proof function and listed validators. It is not coordinator/full ledger admission, a complete audit, peer CSS behavior qualification, G07, G11, security, or release clearance. No browser, Sass, product, package, or full-audit job was run.

## Packet contents and integrity

- `row-edits.json`: six full before/after candidate rows and census.
- `evidence/`: six source-only decisions with complete patch text, source member hashes, Sass roles, provenance and bounded peer scope.
- `patches/`: six authenticated full-index diffs.
- `sass-role-evidence.json`: export, module, contract, and fixture role facts and source fingerprints.
- `c04-policy-inputs.json`: task/policy identities, source/member checks, patch/parent/census, role reconciliation, and coexistence packet validation.
- `frame/`, `run-probe.mjs`, `production-probe.log`: isolated production checker harness and results.
- `MANIFEST.json`: SHA-256 and byte count for every packet file other than the manifest itself.

No canonical code, ledger, selector/CSS source, golden, remote, or credentials were changed. V1 remains immutable.
