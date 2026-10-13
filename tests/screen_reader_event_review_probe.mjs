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
import {reviewScreenReaderEventUses} from '../scripts/screen-reader-event-use-review.mjs';

const root = resolve('.'), read = path => readFileSync(resolve(root, path), 'utf8');
const file = 'projects/ngx-material-legacy/legacy-menu/internal/menu-trigger-base.ts';
const names = ['isFakeMousedownFromScreenReader', 'isFakeTouchstartFromScreenReader'];
const subjects = await keyManagerPublicSubjects(root);
try {
  const baseline = await reviewScreenReaderEventUses({root, subjects});
  assert.equal(baseline.cases.length, 4);
  assert.equal(baseline.contracts.length, 3);
  assert.equal(baseline.original_already_has_detail_based_fix, true);
  for (const row of baseline.helpers) {
    assert.equal(row.mouse_cases, 16); assert.equal(row.touch_cases, 153); assert.equal(row.layout_coordinate_reads, 0);
  }
  for (const row of baseline.delegations) {
    assert.equal(row.mouse_cases, 36); assert.equal(row.touch_cases, 8);
    assert.equal(row.whole_angular_class_constructed, false); assert.equal(row.native_focus_or_view_executed, false);
  }
  let negatives = 0;
  for (const name of names) for (const value of [false, true]) {
    const model = subjects.models.find(m => m.subject.line === baseline.line);
    await assert.rejects(() => reviewScreenReaderEventUses({root, subjects,
      runtimeOverrides: {[baseline.line]: {...model.runtime, [name]: () => value}}})); negatives++;
  }
  const model = subjects.models.find(m => m.subject.line === baseline.line);
  await assert.rejects(() => reviewScreenReaderEventUses({root, subjects, runtimeOverrides: {
    [baseline.line]: {...model.runtime, isFakeMousedownFromScreenReader: event => event.buttons === 0 || (event.offsetX === 0 && event.offsetY === 0)},
  }})); negatives++;
  const source = read(file);
  const edits = [
    source.replace('if (!isFakeMousedownFromScreenReader(event))', 'if (isFakeMousedownFromScreenReader(event))'),
    source.replace('if (!isFakeTouchstartFromScreenReader(event))', 'if (isFakeTouchstartFromScreenReader(event))'),
    source.replace("event.button === 0 ? 'mouse'", "event.button !== 0 ? 'mouse'"),
    source.replace('if (this.triggersSubmenu()) {\n        event.preventDefault();', 'if (!this.triggersSubmenu()) {\n        event.preventDefault();'),
    source.replace("this._openedBy = 'touch';", "this._openedBy = 'mouse';"),
    source.replace('  isFakeMousedownFromScreenReader,', '  type isFakeMousedownFromScreenReader,'),
    source.replace('  isFakeTouchstartFromScreenReader,', '  type isFakeTouchstartFromScreenReader,'),
  ];
  for (const text of edits) {
    assert.notEqual(text, source, 'negative edit did not change source');
    await assert.rejects(() => reviewScreenReaderEventUses({root, subjects, readSource: path => path === file ? text : read(path)})); negatives++;
  }
  let alias = source;
  for (const name of names) alias = alias.replace('  ' + name + ',', '  ' + name + ' as aliased' + name + ',')
    .replaceAll(name + '(event)', 'aliased' + name + '(event)');
  const renamed = await reviewScreenReaderEventUses({root, subjects, readSource: path => path === file ? alias : read(path)});
  assert.equal(renamed.cases.length, 4);
  assert.equal(negatives, 12);
  if (process.argv[2]) writeFileSync(process.argv[2], JSON.stringify({...baseline, negative_controls_rejected: negatives,
    alias_positive: true, test_source_overrides_changed_no_files: true}, null, 2) + '\n', {flag: 'wx'});
  console.log(JSON.stringify({line: baseline.line, public_subjects: 3, frozen_uses: 4,
    helper_cases_per_subject: 169, owned_menu_cases_per_subject: 44, negative_controls: negatives,
    alias_positive: true, whole_angular_class_constructed: false, native_or_packed_qualified: false, g11_claim: baseline.g11_claim}));
} finally {subjects.dispose();}
