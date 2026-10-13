/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 * Copyright (c) 2026 Ryan Lester.
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */
import assert from 'node:assert/strict';
import {readFileSync, writeFileSync} from 'node:fs';
import {resolve} from 'node:path';
import {keyManagerPublicSubjects} from '../scripts/key-manager-public-subjects.mjs';
import {reviewAriaReferenceUses} from '../scripts/aria-reference-use-review.mjs';

const root = resolve('.'), read = p => readFileSync(resolve(root, p), 'utf8');
const subjects = await keyManagerPublicSubjects(root);
try {
  const baseline = await reviewAriaReferenceUses({root, subjects});
  assert.equal(baseline.cases.length, 4); assert.equal(baseline.contracts.length, 3);
  assert.equal(baseline.behaviors.length, 2); assert.equal(baseline.delegations.length, 6);
  assert.ok(baseline.behaviors.every(r => r.primitive_string_cases === 192 && r.trim_once_checks === 2));
  assert.ok(baseline.delegations.every(r => r.ownership_transitions === 8 && !r.whole_component_or_native_DOM_executed));
  let negatives = 0; const model = subjects.models.find(m => m.subject.line === baseline.line);
  for (const name of ['addAriaReferencedId', 'removeAriaReferencedId']) {
    await assert.rejects(() => reviewAriaReferenceUses({root, subjects,
      runtimeOverrides: {[baseline.line]: {...model.runtime, [name]: () => {}}}})); negatives++;
  }
  const files = ['projects/ngx-material-legacy/legacy-select/internal/select-base.ts',
    'projects/ngx-material-legacy/legacy-autocomplete/internal/autocomplete-trigger-base.ts'];
  for (const file of files) {
    const original = read(file);
    const edits = [original.replace("'aria-owns'", "'aria-labelledby'"),
      original.replace('this._trackedModal = null;', 'this._trackedModal = modal;'),
      original.replace('body > .cdk-overlay-container [aria-modal="true"]', '[aria-modal="false"]')];
    for (const text of edits) {
      assert.notEqual(text, original);
      await assert.rejects(() => reviewAriaReferenceUses({root, subjects, readSource: p => p === file ? text : read(p)})); negatives++;
    }
  }
  const source = read(files[1]);
  const renamed = source.replace('import {addAriaReferencedId, removeAriaReferencedId}',
    'import {addAriaReferencedId as addReference, removeAriaReferencedId as removeReference}')
    .replaceAll('addAriaReferencedId(', 'addReference(').replaceAll('removeAriaReferencedId(', 'removeReference(');
  const alias = await reviewAriaReferenceUses({root, subjects, readSource: p => p === files[1] ? renamed : read(p)});
  assert.equal(alias.cases.length, 4); assert.equal(negatives, 8);
  if (process.argv[2]) writeFileSync(process.argv[2], JSON.stringify({...baseline,
    negative_controls_rejected: negatives, alias_positive: true}, null, 2) + '\n', {flag: 'wx'});
  console.log(JSON.stringify({line: baseline.line, frozen_uses: 4, public_subjects: 3,
    primitive_string_cases_per_peer: 192, optimization_checks_per_peer: 2,
    exact_owned_method_replays: 6, ownership_transitions_per_replay: 8, negative_controls: negatives,
    alias_positive: true, native_or_packed_qualified: false, g11_claim: baseline.g11_claim}));
} finally {subjects.dispose();}
