# Toolchain bootstrap notes

Recorded 2026-09-23 (America/New_York).

## Machine before bootstrap
- System Node: v20.19.2 (`/usr/bin/node`)
- System npm: 9.2.0
- pnpm: not installed
- xz unavailable (used Node `.tar.gz` instead of `.tar.xz`)

## Pins installed (checksum-verified)
| Tool | Version | Evidence |
| --- | --- | --- |
| Node | 24.21.0 | Official `SHASUMS256.txt` match for `node-v24.21.0-linux-x64.tar.gz` |
| pnpm | 12.4.2 | npm registry integrity `sha512-CK3G…HyQ==`; published_at 2026-09-15T10:48:29.923Z |
| npm | 11.19.0 | Bundled with Node 24.21.0; registry tarball integrity also verified |

Install prefix: `/home/box/.local/node-v24.21.0`. Wrappers in `/home/box/.local/bin/{node,npm,pnpm}`.

## Remaining blockers
- No frozen workspace lockfile / dependency install yet (Angular library scaffold comes later).
- CI runners must install the same pins via `actions/setup-node` + packageManager; do not trust the box PATH.
- Advisory review for these exact tool versions is still open (age alone is not a security certification).
- Native pnpm postinstall binary download occurs on first `pnpm` invocation via `bin/pnpm.mjs`; CI should prefer a verified path.

## Not done
- No `pnpm install` of workspace packages
- No npm publish
