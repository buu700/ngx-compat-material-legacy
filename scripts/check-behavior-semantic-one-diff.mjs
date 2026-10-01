#!/usr/bin/env node
/** Behavior-semantic SHAs that were read. The rest of that bucket stays open. */
import {readFileSync} from 'node:fs';
import {dirname, join} from 'node:path';
import {fileURLToPath} from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const seed = JSON.parse(readFileSync(join(root, 'compatibility/f10/upstream-sha-risk-bootstrap.json'), 'utf8'));
const review = JSON.parse(readFileSync(join(root, 'compatibility/rc/reports/behavior-semantic-one-diff.json'), 'utf8'));
const bucket = new Map(seed.commits.filter(commit => commit.risk_bucket === 'behavior-semantic').map(commit => [commit.sha, commit]));
const errors = [];
if (review.g11_claim !== 'not-passed' || review.bucket_reviewed !== false) errors.push('behavior-semantic bucket was marked reviewed');
if (seed.g11_claim !== 'not-passed') errors.push('seed claims G11');
if (!Array.isArray(review.reviews) || review.reviews.length < 1) errors.push('no behavior diffs were read');
const seen = new Set();
for (const item of review.reviews ?? []) {
  const row = bucket.get(item.sha);
  if (!row) errors.push(`reviewed SHA is not behavior-semantic: ${item.sha}`);
  else if (row.disposition !== 'open') errors.push(`seed disposition was closed: ${item.sha}`);
  if (!item.files?.length || !item.evidence || !item.disposition) errors.push(`incomplete review ${item.sha}`);
  if (seen.has(item.sha)) errors.push(`duplicate review ${item.sha}`);
  seen.add(item.sha);
}
if (errors.length) {
  console.error(errors.join('\n'));
  process.exit(1);
}
console.log(JSON.stringify({read: review.reviews.length, unread_in_bucket: bucket.size - review.reviews.length, bucket_reviewed: false}, null, 2));
