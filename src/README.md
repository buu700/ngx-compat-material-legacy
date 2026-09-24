# `src/` retired (2026-09-23)

Upstream package trees that previously lived here (`cdk`, `cdk-experimental`,
`google-maps`, `youtube-player`, date adapters, `material-experimental`, and the
hollow `material` facade) were deleted after projects/pack unused-proof showed
**zero** visits under `src/` and the GitHub Actions pack path
(`node scripts/pack-library.mjs` + packed-consumer AOT) does not consume them.

Owned library sources pack from `projects/ngx-material-legacy/`.
See `compatibility/inventories/src-residual-packages-retire-2026-09-23.json`.
