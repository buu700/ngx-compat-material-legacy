/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 * Copyright (c) 2026 Ryan Lester.
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {reviewInputHarnessBoundary} from '../scripts/input-harness-boundary-review.mjs';
const report = await reviewInputHarnessBoundary(), source = readFileSync('projects/ngx-material-legacy/legacy-input/testing/input-harness.ts', 'utf8');
const variants = [
  ['parent-disabled-behavior', source.replace("return (await this.host()).getProperty<boolean>('disabled');", 'return super.isDisabled();')],
  ['parent-predicate-constructor', source.replace('new HarnessPredicate(MatLegacyInputHarness, options)', 'new HarnessPredicate(MatInputHarness, options)')],
  ['lost-value-predicate', source.replace(".addOption('value', options.value", ".addOption('value', undefined")],
  ['lost-placeholder-predicate', source.replace(".addOption('placeholder', options.placeholder", ".addOption('placeholder', undefined")],
  ['ignored-label-filter', source.replace(".addOption('label', options.label", ".addOption('label', undefined")],
];
for (const [id, mutation] of variants) {assert.notEqual(mutation, source); await assert.rejects(reviewInputHarnessBoundary({sourceText: mutation, compile: false}), undefined, id);}
console.log(JSON.stringify({...report, mutation_rejections: variants.map(([id]) => id)}, null, 2));
