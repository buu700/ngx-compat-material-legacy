#!/usr/bin/env node
/**
 * Check a pinned-dependency advisory record.
 * A failed or missing query stays unknown. It is not a clean result.
 *
 *   node scripts/check-pinned-advisories.mjs
 *   node scripts/check-pinned-advisories.mjs --report <file> --peers <file>
 */
import {existsSync, readFileSync} from 'node:fs';
import {dirname, join} from 'node:path';
import {fileURLToPath} from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');

function arg(name, fallback) {
  const index = process.argv.indexOf(name);
  return index === -1 ? fallback : process.argv[index + 1];
}

function fail(code, message) {
  console.error(message);
  process.exit(code);
}

const reportPath = arg('--report', join(root, 'compatibility/rc/reports/pinned-dependency-advisories.json'));
const peersPath = arg('--peers', join(root, 'compatibility/peers-22.proposed.json'));
if (!existsSync(reportPath)) fail(2, `Missing advisory report: ${reportPath}`);
if (!existsSync(peersPath)) fail(2, `Missing peers file: ${peersPath}`);

const report = JSON.parse(readFileSync(reportPath, 'utf8'));
const peers = JSON.parse(readFileSync(peersPath, 'utf8'));
const pins = peers.exact_packages || {};
const errors = [];

if (!report.cutoff || !report.endpoint) errors.push('query cutoff or endpoint is missing');
if (report.result === 'unknown' || report.result == null) {
  errors.push('advisory query is unknown');
} else if (report.result !== 'queried') {
  errors.push(`advisory query result is ${report.result}`);
}

const rows = new Map((report.packages || []).map(row => [`${row.name}@${row.version}`, row]));
for (const [name, version] of Object.entries(pins)) {
  const row = rows.get(`${name}@${version}`);
  if (!row) {
    errors.push(`missing query row for ${name}@${version}`);
    continue;
  }
  if (report.result === 'queried' && !Array.isArray(row.vulns)) {
    errors.push(`queried row ${name}@${version} has no vuln list`);
  }
}

const summary = {
  ok: errors.length === 0 && report.result === 'queried',
  result: report.result ?? 'unknown',
  cutoff: report.cutoff ?? null,
  packages: Object.keys(pins).length,
  g11_claim: 'not-passed',
};
console.log(JSON.stringify(summary, null, 2));
if (errors.length || report.result !== 'queried') {
  fail(1, errors.join('\n') || 'advisory query is unknown');
}
