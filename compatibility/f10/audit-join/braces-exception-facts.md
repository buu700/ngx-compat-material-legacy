# braces@3.0.3 temporary exception: facts for Codex review (FIN-02-C05)

Prepared by Grok for Codex on 2026-10-06. This note is **not** a grant and does not
change anything. It does not broaden, extend, or relabel the exception, and it
does not mark the advisory fixed. The record
`compatibility/rc/dependency-dispositions/braces-3.0.3.json` is unchanged
(sha256 `1b540987bbf01d9bafe612b6692ec9d8b2a44aef23b041ac75175efec6945182`).

## Authority

| Fact | Value | Where it comes from |
| --- | --- | --- |
| Grantor | Ryan Lester | record `granted_by` |
| Grant day | 2026-10-04 | record `granted_on` |
| Medium | "the project group chat" | record `authority` (free text) |
| Commit that recorded it | `958dccc471fb35a7314b90720fee1cd202b092cd`, 2026-10-04 15:54:06 -04:00 (ET) | `git log` |
| Original message reference | **Not in the repository.** There is no message id, link, or quote. | — |

Open question for Codex: verify the original group-chat grant out of band. The
repository can only show that a commit says a grant exists. The checker requires
the authority string to be at least 40 characters long. It cannot check where
the grant came from.

## Scope

- Package and version: exactly `braces@3.0.3`. Advisory: exactly
  `GHSA-vfj7-8cjw-p6xm` (alias CVE-2026-93687).
- Classification: `temporary-exception`. `direct: false`.
  `runtime_of_packed_library: false`. `fixed_version: null`.
- The record's `dependency_path` is `devDependency karma@6.4.4 -> chokidar@3.6.0 -> braces@3.0.3`.
- **Discrepancy found in the current `pnpm-lock.yaml` (at main HEAD when this
  note was written):** braces 3.0.3 is reached through **two** edges, not one:
  - `karma@6.4.4(debug@4.4.3)` depends on `braces: 3.0.3` **directly**
    (lock line ~4091).
  - `chokidar@3.6.0` depends on `braces: 3.0.3` (lock line ~3529), and only
    `karma@6.4.4` pulls in that chokidar (lock line ~4092).

  Both edges are under the karma devDependency, so the claim that this is a
  dev-only path that is not packed still matches the lock. However, the record's
  `reason` text says braces is reached "only through karma@6.4.4 ->
  chokidar@3.6.0", and that is incomplete. `scripts/check-dependency-eligibility.py`
  (`_record_shape`) only checks that `dependency_path` is a non-empty list of
  strings. It does not check the path against the lock. Codex decides whether
  this mismatch matters for the grant's scope. Grok did not edit the record.
- Other resolvers: `chokidar@5.0.0` (Angular devkit, ng-packagr, sass) has no
  braces dependency. Packed-library tarball a90c020d… does not contain braces.

## Expiry and revocation

- `expires_on`: 2026-11-04. The checker rejects the exception when today is
  after `expires_on`, before `granted_on`, or when the span is longer than 90
  days.
- The record says the exception ends with "a patched release or the expiry
  date". The checker enforces the date but not the patched-release trigger.
  When a fixed version appears, a human has to act (bump the lock and remove the
  record).

## Latest applicability (live checks, 2026-10-06, from the box)

- npm registry: `braces` dist-tag `latest` = `3.0.3`. Package `time.modified` =
  2024-09-18T05:27:12Z. No newer release exists.
- OSV `POST /v1/query` for npm braces 3.0.3 returns `GHSA-vfj7-8cjw-p6xm`
  (aliases CVE-2026-93687). Published 2026-09-18T18:31:41Z, modified
  2026-10-02T22:45:04Z. Range: introduced 0, last_affected 3.0.3. No `fixed`
  event.
- The advisory's last modification (2026-10-02 18:45 ET) is **before** the
  record's dist-tag check (2026-10-03) and review (2026-10-04). The applicability
  facts have not changed since the grant.

## What this note does not decide

Whether the grant is authentic, whether the dual-edge path is still in scope,
and G11 readiness are all decisions for Codex (FIN-02-C05).
