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
| Motion MATERIAL_ANIMATIONS paths | **Partial** | Overlays + tooltip helper; recipes retained — see `motion-animations-import-graph.md` |
| W07 / W09 / publish-readiness | **Done (docs/evidence)** | |
| W10 21.x line | **Done (branch)** | Pack + Node 24 + **Node 20.19.6** consumer smoke on `21.x` |
| `src/` mass-delete | **Blocked** | Shared-core / companions |
| Full animation engine / peer removal | **Blocked** | 7 FESM entries + owned trigger metadata |
| CI green | **Done** | https://github.com/buu700/ngx-compat-material-legacy/actions/runs/35934292271 on `5f1a44afd` |

## Left for (honest)

| Item | Owner / note |
| --- | --- |
| npm publish (`next` / later `latest`) | **Owner only** — out of agent scope |
| Full `@angular/animations` peer removal | **Blocked** — need CSS/WAAPI migrations for dialog/menu/select/form-field/snack-bar/tabs; tooltip recipe still exported |
| Split tooltip recipe to opt-in secondary entry | Optional mild API-path break; not done |
| `src/` mass-delete | **Blocked** — shared-core (~578) + ordinary companions |
| Broader 21.x overlay interaction harness | Deferred on `21.x` (menu/snack-bar/tooltip TestBed paths) |
| Node 22.12 edge smoke on 21.x | Optional matrix edge; Node 20.19 floor **Done** |

## Motion

Disable path (0ms) wired for dialog/menu/select/form-field/snack-bar/tabs; tooltip
CSS path honors `legacyAnimationsDisabled()`. Optional `@angular/animations` peer
still required for owned trigger metadata. Precise remaining graph:
`motion-animations-import-graph.md`. Overview: `motion-overlay-trio.md`.

## Escape / `src/`

Unresolved relative edges: **0**. Prefer documenting; **no** `src/` mass-delete
while shared-core and ordinary companions remain blocked.

## 21.x

Branch `21.x` tip documents aged peers, pack, Node 24 and **Node 20.19.6**
packed-consumer Sass/ESM/AOT/harness **green** (`pack-proof-21/` on that branch).
Keep Angular 21 lockfile off `main`. See `support-matrix.md`; `STATUS-21.md` lives on `21.x`.

## Constraints

- Author/committer: Ryan Lester <hacker@linux.com> only (no Co-authored-by)
- Push via `/home/box/.local/bin/ngx-git-push`
- No npm publish from this workstream
- Cyph oracle-only; never commit
