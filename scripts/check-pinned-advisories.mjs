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
const nowArg = arg('--now', '');
const maxAgeDays = Number(arg('--max-age-days', '7'));
if (!existsSync(reportPath)) fail(2, `Missing advisory report: ${reportPath}`);
if (!existsSync(peersPath)) fail(2, `Missing peers file: ${peersPath}`);

const report = JSON.parse(readFileSync(reportPath, 'utf8'));
const peers = JSON.parse(readFileSync(peersPath, 'utf8'));
const pins = peers.exact_packages || {};
const errors = [];

if (!report.cutoff || !report.endpoint) errors.push('query cutoff or endpoint is missing');
const knownResults = new Set(['queried']);
const unknownResults = new Set(['unknown', 'failed', 'stale', 'truncated', 'error']);
if (report.result == null || unknownResults.has(report.result)) {
  errors.push(`advisory query is unknown (${report.result ?? 'missing'})`);
} else if (!knownResults.has(report.result)) {
  errors.push(`advisory query result is ${report.result}`);
}
if (report.truncated === true) errors.push('advisory query is truncated');
if (report.http_status !== 200) {
  errors.push(`advisory network result is unknown (http_status=${report.http_status ?? 'missing'})`);
}
const cutoff = Date.parse(report.cutoff || '');
const now = nowArg ? Date.parse(nowArg) : Date.now();
if (!Number.isFinite(cutoff) || !Number.isFinite(now)) {
  errors.push('advisory cutoff is unknown');
} else if (cutoff > now + 5 * 60 * 1000) {
  errors.push('advisory cutoff is in the future');
} else if (now - cutoff > maxAgeDays * 24 * 60 * 60 * 1000) {
  errors.push('advisory cutoff is stale');
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
  if (Array.isArray(row.vulns) && row.vulns.length > 0) {
    const unresolved = row.vulns.filter(vuln => !vuln || typeof vuln.disposition !== 'string' || !vuln.disposition.trim());
    if (unresolved.length) errors.push(`unresolved advisory finding for ${name}@${version}`);
  }
}

const summary = {
  ok: errors.length === 0 && report.result === 'queried' && report.http_status === 200,
  result: errors.some(error => /unknown|stale|future|truncated/.test(error))
    ? 'unknown'
    : errors.some(error => error.includes('unresolved'))
      ? 'blocked'
      : (report.result ?? 'unknown'),
  cutoff: report.cutoff ?? null,
  http_status: report.http_status ?? null,
  packages: Object.keys(pins).length,
  g11_claim: 'not-passed',
  security_clearance: 'not-passed',
};
console.log(JSON.stringify(summary, null, 2));
if (errors.length || report.result !== 'queried') {
  fail(1, errors.join('\n') || 'advisory query is unknown');
}
