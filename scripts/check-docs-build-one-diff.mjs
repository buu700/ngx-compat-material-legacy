#!/usr/bin/env node
/** One docs-build SHA was read. The rest of that batch stays unreviewed. */
import {readFileSync} from 'node:fs';
import {dirname, join} from 'node:path';
import {fileURLToPath} from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const batch = JSON.parse(readFileSync(join(root, 'compatibility/rc/reports/docs-build-batch.json'), 'utf8'));
const review = JSON.parse(readFileSync(join(root, 'compatibility/rc/reports/docs-build-one-diff.json'), 'utf8'));
const listed = batch.shas.some(item => item.sha === review.sha);
const errors = [];
if (batch.reviewed !== false) errors.push('docs-build batch was marked reviewed');
if (!listed) errors.push('reviewed SHA is not in the docs-build batch');
if (review.files.join() !== 'src/material/snack-bar/snack-bar.md') errors.push('unexpected files');
if (review.disposition !== 'not-owned' || review.g11_claim !== 'not-passed') errors.push('unexpected disposition');
if (errors.length) {
  console.error(errors.join('\n'));
  process.exit(1);
}
console.log(JSON.stringify({sha: review.sha, disposition: review.disposition, batch_reviewed: false}, null, 2));
