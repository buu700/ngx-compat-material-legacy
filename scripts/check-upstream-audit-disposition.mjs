#!/usr/bin/env node
/**
 * Verify the disposition ledger against the seed SHA set.
 * Passes only when every seed SHA has a non-open final disposition.
 * Does not claim G11 by itself.
 *
 *   node scripts/check-upstream-audit-disposition.mjs
 */
import {createHash} from 'node:crypto';
import {existsSync, mkdirSync, readFileSync, writeFileSync} from 'node:fs';
import {dirname, join} from 'node:path';
import {fileURLToPath} from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');

function arg(name, fallback) {
  const index = process.argv.indexOf(name);
  return index === -1 ? fallback : process.argv[index + 1];
}

const seedPath = arg('--seed', join(root, 'compatibility/f10/upstream-sha-risk-bootstrap.json'));
const ledgerPath = arg('--ledger', join(root, 'compatibility/f10/disposition-ledger/ledger.json'));
const reportPath = arg('--report', join(root, 'compatibility/rc/reports/upstream-audit-disposition.json'));
const patchesDir = arg('--patches', '');

const SECURITY_LINE = /bypassSecurityTrust|DomSanitizer|\.innerHTML|securityContext|javascript:|eval\(|new Function\(|document\.write/;

function patchText(entry) {
  if (typeof entry.patch === 'string' && entry.patch) return entry.patch;
  if (!patchesDir || !entry.sha) return '';
  const file = join(patchesDir, `${entry.sha}.diff`);
  return existsSync(file) ? readFileSync(file, 'utf8') : '';
}

function securityHunkLabeledDocsOnly(entry) {
  const label = `${entry.final_disposition || ''} ${entry.read_note_disposition || ''} ${entry.reason || ''}`;
  if (!/docs-only/i.test(label)) return false;
  const patch = patchText(entry);
  if (!patch) return false;
  let file = '';
  for (const line of patch.split('\n')) {
    if (line.startsWith('diff --git ')) file = line.split(' b/').pop();
    if (!line.startsWith('+') || line.startsWith('+++')) continue;
    if (file.endsWith('.md')) continue;
    if (SECURITY_LINE.test(line)) return true;
  }
  return false;
}

function fail(code, message) {
  console.error(message);
  process.exit(code);
}

if (!existsSync(seedPath)) fail(2, `Missing seed: ${seedPath}`);
if (!existsSync(ledgerPath)) fail(1, `Missing disposition ledger: ${ledgerPath}`);

const seed = JSON.parse(readFileSync(seedPath, 'utf8'));
const ledger = JSON.parse(readFileSync(ledgerPath, 'utf8'));
const seedShas = new Set(seed.commits.map(c => c.sha));
const ledgerBySha = new Map();
const conflicts = [];
for (const entry of ledger.entries || []) {
  if (ledgerBySha.has(entry.sha)) conflicts.push(entry.sha);
  ledgerBySha.set(entry.sha, entry);
}
const missing = [...seedShas].filter(sha => !ledgerBySha.has(sha));
const unresolved = [...ledgerBySha.values()].filter(e =>
  !e.final_disposition || e.final_disposition === 'open' || e.final_disposition === 'needs-individual-review');
const outside = [...ledgerBySha.keys()].filter(sha => !seedShas.has(sha));
const securityDocsOnly = [...ledgerBySha.values()].filter(securityHunkLabeledDocsOnly).map(e => e.sha);
const ok = missing.length === 0 && unresolved.length === 0 && conflicts.length === 0 && outside.length === 0
  && securityDocsOnly.length === 0
  && ledger.g11_claim === 'not-passed'; // still require explicit separate G11 ceremony

const report = {
  schema_version: 1,
  role: 'upstream audit disposition coverage',
  check_id: 'upstream-audit-disposition',
  seed_rows: seedShas.size,
  ledger_rows: ledgerBySha.size,
  missing_from_ledger: missing.length,
  unresolved_in_ledger: unresolved.length,
  conflicting_sha_rows: conflicts.length,
  outside_seed: outside.length,
  security_hunk_labeled_docs_only: securityDocsOnly.length,
  ledger_sha256: createHash('sha256').update(readFileSync(ledgerPath)).digest('hex'),
  result: ok ? 'pass' : 'fail',
  g11_claim: 'not-passed',
  limitations: [
    'Coverage equality is necessary but not sufficient for G11.',
    'Inherited rows name the installed peer and the exercised delegation. Row equality does not pass G11.',
    'Does not claim G11.',
  ],
};
mkdirSync(dirname(reportPath), {recursive: true});
writeFileSync(reportPath, JSON.stringify(report, null, 2) + '\n');
console.log(JSON.stringify({
  ok,
  missing: missing.length,
  unresolved: unresolved.length,
  conflicting_sha_rows: conflicts.length,
  outside_seed: outside.length,
  security_hunk_labeled_docs_only: securityDocsOnly.length,
  ledger_rows: ledgerBySha.size,
  seed_rows: seedShas.size,
  g11_claim: 'not-passed',
}, null, 2));
if (!ok) {
  fail(1, `upstream-audit-disposition incomplete: missing=${missing.length} unresolved=${unresolved.length} conflicting=${conflicts.length} outside=${outside.length} security_docs_only=${securityDocsOnly.length}`);
}
