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
import {reviewOwnedErrorHelperUses} from '../scripts/owned-error-helper-use-review.mjs';

const root = resolve('.'), read = path => readFileSync(resolve(root, path), 'utf8');
const baseline = await reviewOwnedErrorHelperUses({root});
assert.equal(baseline.factories.length, 6); assert.equal(baseline.cases.length, 5);
assert.equal(baseline.cases.reduce((n, c) => n + c.references.length, 0), 7);
let negatives = 0;
for (const family of ['legacy-form-field', 'legacy-tooltip', 'legacy-input', 'legacy-autocomplete']) {
  const path = 'projects/ngx-material-legacy/' + family + '/owned-errors.ts', source = read(path);
  for (const text of [source.replace('return Error(', 'return TypeError('), source + '\nexport const extraSideEffect = true;\n']) {
    assert.notEqual(text, source);
    await assert.rejects(() => reviewOwnedErrorHelperUses({root, readSource: p => p === path ? text : read(p)})); negatives++;
  }
}
for (const family of ['legacy-form-field', 'legacy-tooltip', 'legacy-autocomplete']) {
  const caller = baseline.cases.find(c => c.file.startsWith(family + '/'));
  const path = 'projects/ngx-material-legacy/' + caller.file, text = read(path), wrong = text.replace(caller.replacement_route, caller.module);
  assert.notEqual(wrong, text);
  await assert.rejects(() => reviewOwnedErrorHelperUses({root, readSource: p => p === path ? wrong : read(p)})); negatives++;
}
const exported = baseline.factories[0], path = exported.public_path, source = read(path);
const wrong = source.replace(exported.historical_alias, 'removedHistoricalAlias'); assert.notEqual(wrong, source);
await assert.rejects(() => reviewOwnedErrorHelperUses({root, readSource: p => p === path ? wrong : read(p)})); negatives++;
const selected = baseline.cases.find(c => c.file.startsWith('legacy-autocomplete/'));
const callerPath = 'projects/ngx-material-legacy/' + selected.file, callerSource = read(callerPath);
const renamed = callerSource.replace('{' + selected.symbol + '}', '{' + selected.symbol + ' as aliasedError}')
  .replaceAll(selected.symbol + '()', 'aliasedError()');
const alias = await reviewOwnedErrorHelperUses({root, readSource: p => p === callerPath ? renamed : read(p)});
assert.equal(alias.cases.length, 5); assert.equal(negatives, 12);
if (process.argv[2]) writeFileSync(process.argv[2], JSON.stringify({...baseline,
  negative_controls_rejected: negatives, alias_positive: true}, null, 2) + '\n', {flag: 'wx'});
console.log(JSON.stringify({line: baseline.line, original_factories: 6, frozen_uses: 5,
  local_throw_calls: 7, historical_export_aliases: 6, negative_controls: negatives,
  alias_positive: true, native_or_packed_qualified: false, g11_claim: baseline.g11_claim}));
