#!/usr/bin/env node
/**
 * List the docs-build heuristic bucket. Nothing in it is marked reviewed.
 *
 *   node scripts/group-docs-build-batch.mjs
 *   node scripts/group-docs-build-batch.mjs --check
 */
import {readFileSync, writeFileSync} from 'node:fs';
import {dirname, join} from 'node:path';
import {fileURLToPath} from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const seed = JSON.parse(readFileSync(join(root, 'compatibility/f10/upstream-sha-risk-bootstrap.json'), 'utf8'));
const rows = seed.commits.filter(commit => commit.risk_bucket === 'docs-build-batch-candidate');
const report = {
  schema_version: 1,
  role: 'docs-build SHA batch',
  g11_claim: 'not-passed',
  reviewed: false,
  seed_dispositions_changed: false,
  count: rows.length,
  docs_subjects: rows.filter(commit => commit.subject.startsWith('docs')).length,
  other_subjects: rows.filter(commit => !commit.subject.startsWith('docs')).length,
  shas: rows.map(commit => ({sha: commit.sha, subject: commit.subject, disposition: 'open'})),
  limitations: [
    'Subjects were not used as a review. No diff in this batch was read.',
    'This is not RC-08-A02.',
  ],
};
const outPath = join(root, 'compatibility/rc/reports/docs-build-batch.json');
const text = JSON.stringify(report, null, 2) + '\n';
const errors = [];
if (report.count !== 62 || report.docs_subjects + report.other_subjects !== report.count) {
  errors.push(`docs-build batch count drifted: ${report.count}`);
}
if (rows.some(commit => commit.disposition !== 'open')) errors.push('a docs-build seed row is not open');
if (process.argv.includes('--check')) {
  if (readFileSync(outPath, 'utf8') !== text) errors.push('docs-build batch file drifted');
} else if (!errors.length) {
  writeFileSync(outPath, text);
}
if (errors.length) {
  console.error(errors.join('\n'));
  process.exit(1);
}
console.log(JSON.stringify({count: report.count, docs_subjects: report.docs_subjects, other_subjects: report.other_subjects, reviewed: false}, null, 2));
