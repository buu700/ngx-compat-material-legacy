# @ngx-compat/material-legacy-migrate-cli

Peer-light pre-upgrade CLI for migrating Sass `@use '@angular/material'` and
historical TypeScript `@angular/material/legacy-*` module specifiers to
`@ngx-compat/material-legacy`.

**No Angular runtime peers.** Node `>=18.0.0`.

## Run from the packed tarball

```bash
# Verify identity before extracting/executing (use the published sha256)
sha256sum ngx-material-legacy-migrate-cli-*.tgz

mkdir -p /tmp/migrate-cli
tar -xzf ngx-compat-material-legacy-migrate-cli-22.0.0-rc.0.tgz -C /tmp/migrate-cli
node /tmp/migrate-cli/package/bin/migrate-legacy.js /path/to/old-workspace          # dry-run
node /tmp/migrate-cli/package/bin/migrate-legacy.js /path/to/old-workspace --apply
```

Optional: `npm install ./ngx-compat-material-legacy-migrate-cli-22.0.0-rc.0.tgz`
then use the `ngx-material-legacy-migrate` bin.

Do **not** use `npx @ngx-compat/material-legacy` for peer-light pre-upgrade —
npm may resolve library Angular peers. Do not pipe downloads to a shell.

Acknowledgement flags (`--acknowledge-companion-bridges`,
`--acknowledge-aggregates`, `--acknowledge-current-components`) match the
Angular schematic options. See repository `migration/README.md`.
