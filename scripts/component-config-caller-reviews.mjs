/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 * Copyright (c) 2026 Ryan Lester.
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */
/** Individual finite configuration source decisions; canonical writes retain one owner. */
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {join} from 'node:path';
import {componentConfigPrior, COMPONENT_CONFIG_PRIOR} from './component-config-caller-contracts.mjs';
import {qualifiedComponentConfigOwned} from './component-config-caller-owned-evidence.mjs';
import {inspectComponentConfigOwnedHelpers} from './component-config-caller-owned-helpers.mjs';

const hash = bytes => createHash('sha256').update(bytes).digest('hex');
const raw = root => path => readFileSync(join(root, path));
const decisionsPath = 'compatibility/rc/component-config-caller-decisions.json';
const decisionsPin = '5e6bff4ef0937b34ed6450e5bf8b651c9fd64ca0ee964f0bbf1091a6140a4553';
export const COMPONENT_CONFIG_REVIEW = 'compatibility/f10/authored-use-reviews/component-config-callers.json';
export {componentConfigPrior};

export function prepareComponentConfigReview({root = process.cwd(), read = raw(root)} = {}) {
  const qualified = qualifiedComponentConfigOwned({root, read}), bytes = read(decisionsPath);
  assert.equal(hash(bytes), decisionsPin, 'changed individual configuration decisions');
  const decisions = JSON.parse(bytes), helpers = inspectComponentConfigOwnedHelpers({qualified, read});
  assert.equal(Object.keys(decisions.contexts).length, 73);
  assert.equal(Object.keys(decisions.contracts).length, 32);
  const keys = qualified.source.facts.map(fact => fact.file + ':' + fact.symbol);
  assert.deepEqual(Object.keys(decisions.contexts).sort(), [...keys].sort());
  const ref = path => ({path, sha256: hash(read(path))});
  const evidence = [ref(COMPONENT_CONFIG_PRIOR), qualified.publicBoundary.types.ref,
    qualified.publicBoundary.ref, qualified.ref, ...helpers.evidence,
    ...['compatibility/rc/component-config-caller-public-subjects.json', decisionsPath,
      'scripts/component-config-caller-contracts.mjs', 'scripts/component-config-caller-public-subjects.mjs',
      'scripts/component-config-caller-type-evidence.mjs', 'scripts/component-config-caller-public-runtime-evidence.mjs',
      'scripts/component-config-caller-owned-evidence.mjs', 'scripts/component-config-caller-owned-helpers.mjs',
      'scripts/component-config-caller-reviews.mjs'].map(ref)];
  const reviews = qualified.source.facts.map(fact => {
    const context = decisions.contexts[fact.file + ':' + fact.symbol], contract = decisions.contracts[fact.symbol];
    assert.ok(context.length > 120 && contract.length > 300);
    const decision = context + '\n\n' + contract;
    return {...fact, conclusion: fact.current_peer_use ? 'stable-public-peer' : 'owned-replacement', decision,
      unused_header_binding: !fact.public_reexport && fact.occurrences.length === 0,
      reviewer: 'Codex primary implementer; individual complete current configuration source/API review',
      independent_evidence: evidence,
      scope_limit: 'Named source/API role only. Genuine32-symbol tagged/minimum declarations and complete current200-file types support73 contexts. Public SDK snapshots retain all upstream differences. Actual owned/tagged constructors and evaluated provider/factory expressions use explicit node,decorator-metadata and owner/service payload protocols;generated Angular module/factory/template/query execution is not inferred. Tagged/current source oracles are independent and no current owned implementation runs on tagged16 or the other current peer line. No whole-family/HTML/CSS/geometry/focus/scroll timing/motion,CSP,SSR,packed/AOT,full consumer/toolchain/peer floor or G01-G13 pass.'};
  });
  assert.equal(reviews.filter(review => review.conclusion === 'owned-replacement').length, 5);
  assert.equal(reviews.filter(review => review.unused_header_binding).length, 3);
  assert.equal(reviews.filter(review => review.public_reexport).length, 25);
  return {schema_version: 1, line: qualified.source.prior.line, status: 'reviewed',
    criteria: 'Seventy-three individual finite token,configuration,event/service type,provider and owned-helper contexts. Thirty-two reused API/helper judgments have one owner;five original obligations now resolve locally and remain in the denominator. This source layer does not replace original/native/packed or independent full-audit obligations.',
    reviews, historical_owned_helpers: helpers.report, source_closures_prepared: 73,
    frozen_prepared: 44, additional_prepared: 29, source_closures_integrated: 0,
    new_SHA_or_native_semantic_closures: 0, actual_native_packed_or_full_floor_qualified: false,
    g11_claim: 'not-passed'};
}

export function inspectComponentConfigReview({root = process.cwd(), read = raw(root)} = {}) {
  const body = prepareComponentConfigReview({root, read});
  assert.equal(hash(read(COMPONENT_CONFIG_REVIEW)), hash(JSON.stringify(body, null, 2) + '\n'),
    'changed prepared individual configuration review');
  return body;
}
