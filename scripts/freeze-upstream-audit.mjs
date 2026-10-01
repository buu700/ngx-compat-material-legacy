#!/usr/bin/env node
/**
 * Freeze the existing upstream audit inventories. Every SHA stays open.
 *
 *   node scripts/freeze-upstream-audit.mjs
 */
import {createHash} from 'node:crypto';
import {readFileSync, writeFileSync} from 'node:fs';
import {dirname, join} from 'node:path';
import {fileURLToPath} from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const shas = JSON.parse(readFileSync(join(root, 'compatibility/f10/upstream-sha-risk-bootstrap.json'), 'utf8'));
const symbols = JSON.parse(readFileSync(join(root, 'compatibility/f10/authored-dependency-inventory-seed.json'), 'utf8'));
const peers = JSON.parse(readFileSync(join(root, 'projects/ngx-material-legacy/package.json'), 'utf8')).peerDependencies;
const lockPath = join(root, 'pnpm-lock.yaml');
const buckets = {};
let open = 0;
for (const commit of shas.commits) {
  buckets[commit.risk_bucket] = (buckets[commit.risk_bucket] || 0) + 1;
  if (commit.disposition === 'open') open += 1;
}
const bucketTotal = Object.values(buckets).reduce((sum, count) => sum + count, 0);
const errors = [];
if (shas.g11_claim !== 'not-passed') errors.push('bootstrap claims G11');
if (shas.commits.length !== 1697 || open !== 1697 || bucketTotal !== 1697) {
  errors.push(`sha freeze drifted: rows=${shas.commits.length} open=${open} buckets=${bucketTotal}`);
}
if (symbols.symbol_use_count !== symbols.symbol_uses.length || symbols.truncated !== false) {
  errors.push('symbol inventory is truncated or its count drifted');
}
const report = {
  schema_version: 1,
  role: 'frozen upstream audit inventories',
  g11_claim: 'not-passed',
  sha_inventory: {
    from: shas.from_commit,
    to: shas.to_commit,
    rows: shas.commits.length,
    open,
    buckets,
    security_deep: shas.commits.filter(commit => commit.risk_bucket === 'security-deep').map(commit => commit.sha),
  },
  symbol_inventory: {
    modules: symbols.module_count,
    symbol_uses: symbols.symbol_uses.length,
    truncated: symbols.truncated,
  },
  dependency_inventory: {
    lock_sha256: createHash('sha256').update(readFileSync(lockPath)).digest('hex'),
    peers,
  },
  limitations: [
    'All 1697 SHA dispositions are still open. Buckets are heuristics.',
    'This is not RC-08-A01.',
  ],
};
const outPath = join(root, 'compatibility/rc/reports/upstream-audit-freeze.json');
const text = JSON.stringify(report, null, 2) + '\n';
if (process.argv.includes('--check')) {
  if (readFileSync(outPath, 'utf8') !== text) errors.push('upstream audit freeze drifted');
} else {
  writeFileSync(outPath, text);
}
if (errors.length) {
  console.error(errors.join('\n'));
  process.exit(1);
}
console.log(JSON.stringify({
  shas: open,
  symbols: symbols.symbol_uses.length,
  security_deep: report.sha_inventory.security_deep.length,
}, null, 2));
