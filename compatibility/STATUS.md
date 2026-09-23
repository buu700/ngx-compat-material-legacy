# Compatibility delivery status (RC without publish)

Package `@ngx-compat/material-legacy@22.0.0-rc.0` on `main`
(repo `buu700/ngx-compat-material-legacy`). **No npm publish.**

## RC checklist (`main` / 22.x)

| Gate | Status | Evidence |
| --- | --- | --- |
| 22 legacy + 22 testing entries | **Done** | Pack + ESM 44 |
| Sass facade + theme | **Done** | `#4527a0` |
| migrate-legacy + CLI | **Done** | 25/25; `--verify` |
| Escape-edge relative unresolved | **Done (0)** | Was 68; resolver + comment/placeholder filters |
| Peer floor `^22.1.7` | **Done** | |
| Packed-consumer AOT/harness | **Done** | `aot-harness-smoke.json` |
| Motion MATERIAL_ANIMATIONS paths | **Partial** | Overlays + tooltip helper; `@angular/animations` recipes retained |
| W07 / W09 / publish-readiness | **Done (docs/evidence)** | |
| W10 21.x line | **Done (bootstrap+pack on branch)** | See `21.x` / `pack-proof-21/` — not merged to main |
| `src/` mass-delete | **Blocked** | Shared-core / companions |
| Full animation engine removal | **Blocked** | Needs CSS/WAAPI migrations |
| CI green | **Pending tip** | |

## Motion

Disable path (0ms) wired for dialog/menu/select/form-field/snack-bar/tabs; tooltip
CSS path honors `legacyAnimationsDisabled()`. Optional `@angular/animations` peer
still required for owned trigger metadata. See `motion-overlay-trio.md`.

## Escape / `src/`

Unresolved relative edges: **0**. Prefer documenting; **no** `src/` mass-delete
while shared-core (578) and ordinary companions remain blocked.

## 21.x

Branch `21.x`: aged peers, `ng-packagr` pack, Sass/ESM/AOT consumer smoke **green**.
Keep Angular 21 lockfile off `main`. Details: `support-matrix.md`, `STATUS-21.md` on branch.

## Constraints

- Author/committer: Ryan Lester <hacker@linux.com> only (no Co-authored-by)
- Push via `/home/box/.local/bin/ngx-git-push`
- No npm publish from this workstream
- Cyph oracle-only; never commit
