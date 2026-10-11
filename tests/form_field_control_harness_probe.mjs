/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 * Copyright (c) 2026 Ryan Lester.
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {inspectControlMarkerCallers, reviewFormFieldControlHarness} from '../scripts/form-field-control-harness-review.mjs';
const report = await reviewFormFieldControlHarness(), base = 'projects/ngx-material-legacy/';
const select = 'legacy-select/testing/select-harness-base.ts', form = 'legacy-form-field/testing/form-field-harness-base.ts', api = 'legacy-form-field/testing/public-api.ts';
const variants = [
  ['erased-import-used-as-value', form, source => source + '\nconsole.log(MatFormFieldControlHarness);\n'],
  ['type-only-runtime-base', select, source => source.replace('import {MatFormFieldControlHarness}', 'import type {MatFormFieldControlHarness}')],
  ['inherited-constructor-change', select, source => source.replace('protected abstract _prefix: string;', 'constructor(factory: any) {super(factory);}\nprotected abstract _prefix: string;')],
  ['inherited-property-interposition', select, source => source.replace('protected abstract _prefix: string;', 'get locatorFactory(): any {return null;}\nprotected abstract _prefix: string;')],
  ['runtime-base-import-lost', select, source => source.replace('> extends MatFormFieldControlHarness {', '> extends ComponentHarness {')],
  ['public-alias-renamed', api, source => source.replace('as MatLegacyFormFieldControlHarness', 'as DifferentControlHarness')],
  ['public-runtime-alias-erased', api, source => source.replace('export {\n\n  MatFormFieldControlHarness', 'export type {\n\n  MatFormFieldControlHarness')],
];
for (const [id, file, change] of variants) {
  const before = readFileSync(base + file, 'utf8'), after = change(before); assert.notEqual(after, before);
  assert.throws(() => inspectControlMarkerCallers(undefined, path => path === file ? after : readFileSync(base + path, 'utf8')), undefined, id);
}
console.log(JSON.stringify({...report, caller_mutation_rejections: variants.map(([id]) => id)}, null, 2));
