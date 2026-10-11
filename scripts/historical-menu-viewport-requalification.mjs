/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 * Copyright (c) 2026 Ryan Lester.
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */
/** Unchanged viewport source/contracts; packed producer execution remains open. */
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {gunzipSync} from 'node:zlib';
import {createHash} from 'node:crypto';
import {dirname, resolve} from 'node:path';
import {fileURLToPath} from 'node:url';
import {reviewLegacyViewportUses} from './legacy-viewport-use-review.mjs';
const rootDefault = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const hash = bytes => createHash('sha256').update(bytes).digest('hex');
export const VIEWPORT_INPUTS = 'compatibility/rc/historical-menu-viewport-requalification-inputs.json';
const inputSha = '0352a4e1bb492b1ae457d5697ba90e52544a4b4fd758259a8861a188333994ef';

export function inspectHistoricalMenuViewportRequalification({root = rootDefault, readMember} = {}) {
  const read = path => readMember ? readMember(path) : readFileSync(resolve(root, path));
  const bytes = read(VIEWPORT_INPUTS);
  assert.equal(hash(bytes), inputSha, 'viewport inputs changed');
  const inputs = JSON.parse(bytes), manifest = JSON.parse(read('projects/ngx-material-legacy/package.json'));
  const line = manifest.version.startsWith('21.') ? '21.x' : 'main', docs = new Map();
  const branch = inputs.lines[line];
  for (const [path, sha] of Object.entries(branch.members)) {
    const member = read(path);
    assert.equal(hash(member), sha, 'viewport prior proof changed');
    docs.set(path, JSON.parse(member));
  }
  const archive = read(branch.archive.path);
  assert.equal(hash(archive), branch.archive.sha256, 'prior viewport producer archive changed');
  const prior = gunzipSync(archive);
  assert.equal(hash(prior), branch.prior_raw_sha256);
  const before = prior.toString('utf8'), after = read(inputs.producer_path).toString('utf8');
  assert.equal(before.split(branch.before_block).length, 2, 'ambiguous original menu assertion block');
  assert.equal(after, before.replace(branch.before_block, branch.after_block),
    'packed producer changed outside the approved exact menu-construction assertions');
  const reviewPath = 'compatibility/f10/authored-use-reviews/owned-legacy-viewport-boundary.json';
  const reviewed = docs.get(reviewPath), changed = new Set();
  assert.equal(reviewed.line, line); assert.equal(reviewed.reviews.length, 8);
  for (const row of reviewed.reviews) {
    assert.equal(hash(read('projects/ngx-material-legacy/' + row.file)), row.candidate_source_sha256,
      'viewport caller source changed');
    for (const evidence of row.independent_evidence) {
      if (hash(read(evidence.path)) !== evidence.sha256) changed.add(evidence.path);
    }
  }
  assert.deepEqual([...changed], [inputs.producer_path], 'unexpected viewport evidence change');
  const oldRuntime = JSON.parse(read('compatibility/rc/legacy-viewport-public-source-diagnostic.json'));
  const current = reviewLegacyViewportUses({root, readSource: path => read(path).toString('utf8')});
  assert.deepEqual(current, oldRuntime.source_review, 'viewport alias/constructor/caller contract changed');
  const observer = docs.get('compatibility/rc/viewport-cva-producer-source-refresh.json').unchanged_viewport_observation;
  for (const source of [observer.source, observer.public_import, ...observer.collector_mappings]) {
    assert.equal(before.split(source).length, 2);
    assert.equal(after.split(source).length, 2);
  }
  assert.equal(docs.get('compatibility/rc/owned-menu-item-implementation-decision.json').authority.kind,
    'explicit-owner-approved-historical-implementation');
  return {schema_version: 1, line, input_capsule_sha256: inputSha,
    viewport_uses: current.cases.length, unchanged_call_sites: current.calls.length,
    unchanged_prior_evidence_except_packed_producer: true, exact_menu_only_producer_change: true,
    prior_producer_sha256: hash(prior), current_producer_sha256: hash(after),
    prior_runtime_contexts: oldRuntime.results.length,
    historical_executions_rebound: false,
    limits: 'Source and unchanged dependency closure only. Prior runtime observations retain their original subjects; they were not rerun. Whole source outside the exact approved menu assertion replacement, viewport import/measurement/singleton and collector predicates are byte-identical. No new packed/AOT/native/consumer or advertised full-floor execution and no G11 clearance.',
    g11_claim: 'not-passed'};
}
