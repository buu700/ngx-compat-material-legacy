/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 * Copyright (c) 2026 Ryan Lester.
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */
import assert from 'node:assert/strict';
import {readFileSync, writeFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {resolve, dirname, join} from 'node:path';
import {fileURLToPath} from 'node:url';
import {valueAccessorPackedFixture} from '../scripts/value-accessor-packed-fixture.mjs';
import {radioFixtureHandlers, radioFixtureSubjects, compileRadioFixture, fixtureRadioHarness, exerciseRadioFixture} from '../scripts/value-accessor-radio-fixture-review.mjs';
const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const source = valueAccessorPackedFixture(), fixture = radioFixtureHandlers(source), subjects = await radioFixtureSubjects(root);
const report = {schema_version: 1, role: 'Actual fixture radio callbacks, complete owned harness source and authenticated public peer namespaces; not packed Angular CVA execution',
  line: JSON.parse(readFileSync(join(root, 'projects/ngx-material-legacy/package.json'))).version.startsWith('21.') ? '21.x' : 'main',
  fixture_sha256: createHash('sha256').update(source).digest('hex'), type_subjects: [], protocol_cases: [],
  protocol_faults_rejected: [], source_controls_rejected: [], borrowed_rxjs: subjects.borrowed_rxjs,
  actual_packed_control_instances_executed: false, Angular_AOT_executed: false, native_browser_executed: false,
  actual_Node_compiler_RxJS_floor_execution: false, authored_uses_admitted: 0, g11_claim: 'not-passed'};
try {
  for (const model of subjects.models) {
    report.type_subjects.push(compileRadioFixture({root, model, fixture}));
    const types = fixtureRadioHarness(root, model);
    for (const reverse of [false, true]) report.protocol_cases.push(await exerciseRadioFixture({model, types, fixture, reverse}));
    const mutations = [
      ['original-unsupported-value-filter', s => s.replaceAll("label:'Two'", "value:'two'")],
      ['wrong-selection-label', s => s.replace("radio.checkRadioButton({label:'Two'})", "radio.checkRadioButton({label:'One'})")],
      ['wrong-touch-label', s => s.replace("radio.getRadioButtons({label:'Two'})", "radio.getRadioButtons({label:'One'})")],
      ['absent-selection-label', s => s.replace("radio.checkRadioButton({label:'Two'})", "radio.checkRadioButton({label:'Missing'})")],
      ['missing-check-callback', s => s.replace("()=>radio.checkRadioButton({label:'Two'})", 'async()=>{}')],
      ['missing-touch-blur', s => s.replace('await buttons[0].blur();', '')],
      ['inverted-disabled-check', s => s.replace('button.isDisabled()', '!await button.isDisabled()')],
      ['some-disabled-instead-of-all', s => s.replace('.every(Boolean)', '.some(Boolean)')],
    ];
    for (const [id, mutate] of mutations) {
      const changed = mutate(source); assert.notEqual(changed, source, 'unbound mutation: ' + id);
      await assert.rejects(exerciseRadioFixture({model, types, fixture: radioFixtureHandlers(changed)}), undefined, id);
      report.protocol_faults_rejected.push({line: model.line, id});
    }
  }
  for (const [id, mutate] of [
    ['wrong-radio-harness-selector', s => s.replace("selector:'#cva-radio'", "selector:'#foreign'")],
    ['wrong-radio-harness-receiver', s => s.replace("harness:radio,read:()=>radio", "harness:foreign,read:()=>radio")],
    ['template-selection-does-not-match-label', s => s.replace('<mat-radio-button value="two">Two', '<mat-radio-button value="two">Other')],
  ]) {
    const changed = mutate(source); assert.notEqual(changed, source); assert.throws(() => radioFixtureHandlers(changed)); report.source_controls_rejected.push(id);
  }
  assert.equal(report.type_subjects.length, 3); assert.equal(report.protocol_cases.length, 6);
  assert.equal(report.protocol_faults_rejected.length, 24); assert.equal(report.source_controls_rejected.length, 3);
  if (process.argv[2]) writeFileSync(process.argv[2], JSON.stringify(report, null, 2) + '\n', {flag: 'wx'});
  console.log(JSON.stringify({line: report.line, subjects: 3, protocol_cases: 6, protocol_faults_rejected: 24,
    source_controls_rejected: 3, strict_negative_type_checks: 12, original_bug_diagnostics: 6,
    actual_packed_control_instances_executed: false, native_browser_executed: false}));
} finally {subjects.dispose();}
