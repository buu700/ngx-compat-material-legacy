/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 * Copyright (c) 2026 Ryan Lester.
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */
/** Sixteen individual source/API decisions; canonical writes keep their existing owner. */
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {join} from 'node:path';
import {a11yCallerPrior, A11Y_CALLER_PRIOR} from './a11y-caller-contracts.mjs';
import {qualifiedA11yCallerRuntime} from './a11y-caller-runtime-evidence.mjs';

const hash = bytes => createHash('sha256').update(bytes).digest('hex');
const raw = root => path => readFileSync(join(root, path));
const decisionsPath = 'compatibility/rc/a11y-caller-decisions.json';
const decisionsPin = '3a12e863aa818b7ab2036b71d1d9eda9cf7f9a279656156da6bee99286a11cac';
export const A11Y_CALLER_REVIEW = 'compatibility/f10/authored-use-reviews/a11y-callers.json';
export {a11yCallerPrior};

export function prepareA11yCallerReview({root = process.cwd(), read = raw(root)} = {}) {
  const qualified = qualifiedA11yCallerRuntime({root, read}), bytes = read(decisionsPath);
  assert.equal(hash(bytes), decisionsPin, 'changed individual accessibility decisions');
  const decisions = JSON.parse(bytes).decisions;
  assert.equal(Object.keys(decisions).length, 16);
  const ref = path => ({path, sha256: hash(read(path))});
  const evidence = [ref(A11Y_CALLER_PRIOR), qualified.types.ref, qualified.ref,
    ...['compatibility/rc/a11y-caller-public-subjects.json', decisionsPath,
      'scripts/a11y-caller-contracts.mjs', 'scripts/a11y-caller-public-subjects.mjs',
      'scripts/a11y-caller-type-evidence.mjs', 'scripts/a11y-caller-runtime-evidence.mjs',
      'scripts/a11y-caller-reviews.mjs'].map(ref)];
  return {
    schema_version: 1, line: qualified.source.prior.line, status: 'reviewed',
    criteria: 'Sixteen individual public module, service, constructor/context and member roles. Genuine untouched tagged/minimum declarations, strict complete current caller graph and bounded genuine service/owned common-module/initial-focus runtime. Generated/native/packed/floor and independent audits remain separate.',
    reviews: qualified.source.facts.map(fact => {
      const decision = decisions[fact.file + ':' + fact.symbol];
      assert.ok(decision && decision.length > 300);
      assert.equal(fact.unused_import, false);
      return {...fact, conclusion: 'stable-public-peer', decision,
        reviewer: 'Codex primary implementer; individual current accessibility source/API review',
        independent_evidence: evidence,
        scope_limit: 'Named source/API role only. All118 raw current sources are strictly typed against this line\'s exact minimum. Genuine SDK services/modules use explicit DOM/visibility/color/Renderer2/Reflect protocols;real Node timers and NgZone plus borrowed Zone/RxJS are recorded. Complete owned common-module and initial-focus sources execute only on the selected current line,not on tagged16 or the other current line. Tagged FocusTrap/Factory deprecations are historical;current classes and consumed members are unmarked. No complete owned tooltip/snack/select or dialog-container runtime,generated factory/template/query,native focus/visibility/geometry/CSS/OS contrast/motion/paint,CSP,SSR,packed/AOT,full compiler/toolchain/consumer/peer floor or G01-G13 pass.'};
    }),
    source_closures_prepared: 16, frozen_prepared: 7, additional_prepared: 9,
    source_closures_integrated: 0, new_SHA_or_native_semantic_closures: 0,
    actual_native_packed_or_full_floor_qualified: false, g11_claim: 'not-passed',
  };
}

export function inspectA11yCallerReview({root = process.cwd(), read = raw(root)} = {}) {
  const body = prepareA11yCallerReview({root, read});
  assert.equal(hash(read(A11Y_CALLER_REVIEW)), hash(JSON.stringify(body, null, 2) + '\n'),
    'changed prepared individual accessibility review');
  return body;
}
