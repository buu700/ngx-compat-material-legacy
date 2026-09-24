# F02–F04 pack proof (main)

Fresh local pack after F02/F03/F04 source changes. Tarball is **not** committed
(F01: no committed `.tgz` fallback). Rebuild with:

```bash
export PATH="/home/box/.local/bin:/home/box/.local/node-v24.21.0/bin:$PATH"
pnpm exec ng-packagr -p projects/ngx-material-legacy/ng-package.json -c projects/ngx-material-legacy/tsconfig.lib.json
npm pack ./dist/ngx-material-legacy --pack-destination /tmp/f02-f04-pack
```

Receipts in this directory bind the observed digest at capture time.
