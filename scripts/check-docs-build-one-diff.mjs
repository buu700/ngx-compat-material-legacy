#!/usr/bin/env node
/** Docs-build SHAs that were read. The rest of that batch stays unreviewed. */
import {readFileSync} from 'node:fs';
import {dirname, join} from 'node:path';
import {fileURLToPath} from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const batch = JSON.parse(readFileSync(join(root, 'compatibility/rc/reports/docs-build-batch.json'), 'utf8'));
const review = JSON.parse(readFileSync(join(root, 'compatibility/rc/reports/docs-build-one-diff.json'), 'utf8'));
const listed = new Set(batch.shas.map(item => item.sha));
const errors = [];
if (batch.reviewed !== false || review.batch_reviewed !== false || review.g11_claim !== 'not-passed') {
  errors.push('docs-build batch was marked reviewed');
}
if (!Array.isArray(review.reviews) || review.reviews.length < 1) errors.push('no docs diffs were read');
for (const item of review.reviews) {
  if (!listed.has(item.sha)) errors.push(`reviewed SHA is not in the docs-build batch: ${item.sha}`);
  if (!item.files?.length || !item.evidence || !item.disposition) errors.push(`incomplete review ${item.sha}`);
}
if (errors.length) {
  console.error(errors.join('\n'));
  process.exit(1);
}
console.log(JSON.stringify({read: review.reviews.length, unread_in_batch: batch.count - review.reviews.length, batch_reviewed: false}, null, 2));
