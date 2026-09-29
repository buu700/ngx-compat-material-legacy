#!/usr/bin/env node
/** The security-deep review must cover exactly the heuristic bucket. */
import {readFileSync} from 'node:fs';
import {dirname, join} from 'node:path';
import {fileURLToPath} from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const seed = JSON.parse(readFileSync(join(root, 'compatibility/f10/upstream-sha-risk-bootstrap.json'), 'utf8'));
const review = JSON.parse(readFileSync(join(root, 'compatibility/rc/reports/security-deep-review.json'), 'utf8'));
const expected = seed.commits.filter(commit => commit.risk_bucket === 'security-deep').map(commit => commit.sha).sort();
const actual = review.reviews.map(item => item.sha).sort();
const errors = [];
if (review.g11_claim !== 'not-passed') errors.push('review claims G11');
if (expected.length !== 6 || expected.join() !== actual.join()) errors.push('security-deep review does not match the seed bucket');
for (const item of review.reviews) {
  if (!item.disposition || !item.evidence) errors.push(`incomplete review ${item.sha}`);
}
if (errors.length) {
  console.error(errors.join('\n'));
  process.exit(1);
}
console.log(JSON.stringify({reviewed: actual.length, g11_claim: review.g11_claim}, null, 2));
