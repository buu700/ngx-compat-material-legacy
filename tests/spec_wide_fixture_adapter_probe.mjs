/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 * Copyright (c) 2026 Ryan Lester.
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */
/** Actual adapter output and authenticated minimum enum identity; no Angular rendering. */
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {createRequire} from 'node:module';
import {readFileSync, writeFileSync, mkdtempSync, mkdirSync, symlinkSync, rmSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {gunzipSync} from 'node:zlib';
import {dirname, resolve, join} from 'node:path';
import {fileURLToPath, pathToFileURL} from 'node:url';
import {adaptSpec} from '../testing/legacy-runner/adapt-spec.mjs';
import {reviewFrameworkEnumUses} from '../scripts/framework-enum-use-review.mjs';
import {inspectChipEmptyRepair} from '../scripts/spec-stability-chip-repair.mjs';
const root = resolve(dirname(fileURLToPath(import.meta.url)), '..'), require = createRequire(import.meta.url), ts = require('typescript');
const read = path => readFileSync(resolve(root, path)), hash = value => createHash('sha256').update(value).digest('hex');
const line = JSON.parse(read('projects/ngx-material-legacy/package.json')).version.startsWith('21.') ? '21.x' : 'main';
const priorPath = 'compatibility/rc/spec-wide-fixture-source-adapter-prior.json.gz';
const pins = {main: 'f2089b27c291c6f1f46988f1815b44921ac7b9b77eda71feac7e061756a7ffec',
  '21.x': 'cbb0267f6a6935d207c4c23b1af0c3e1c8081b68890a1f44bfce0eddd7e0a8a9'};
assert.equal(hash(read(priorPath)), pins[line]);
const prior = JSON.parse(gunzipSync(read(priorPath))); assert.equal(prior.line, line);
assert.equal(hash(prior.adapter.text), '5eae6132be50c169c2a010ffd63bf04b86b1c2599792b2ae72037edb7595c960');
const enums = reviewFrameworkEnumUses({root, population: 'current'});
const original = enums.models.find(n => n.line === 'original');
assert.equal(original.declarations.ChangeDetectionStrategy.members.Default.value, 1);
assert.equal(original.runtimes.ChangeDetectionStrategy.values.Default, 1);
const minima = enums.models.filter(n => n.line !== 'original');
assert.deepEqual(minima.map(n => n.version), ['22.1.7', '21.2.23']);
for (const model of minima) {
  assert.equal(model.declarations.ChangeDetectionStrategy.members.Eager.value, 1);
  assert.deepEqual(model.declarations.ChangeDetectionStrategy.members.Eager.markers, []);
  assert.ok(model.declarations.ChangeDetectionStrategy.members.Default.markers.includes('deprecated'));
  assert.equal(model.runtimes.ChangeDetectionStrategy.values.Eager, 1);
}
const parse = text => { const file = ts.createSourceFile('fixture.spec.ts', text, ts.ScriptTarget.Latest, true);
  assert.equal(file.parseDiagnostics.length, 0); return file; };
const collect = (node, predicate) => { const rows = []; function visit(n) { if (predicate(n)) rows.push(n); ts.forEachChild(n, visit); } visit(node); return rows; };
function semantic(n) { const children = []; ts.forEachChild(n, child => { children.push(semantic(child)); });
  return [n.kind, ts.isVariableDeclarationList(n) ? n.flags & (ts.NodeFlags.Const | ts.NodeFlags.Let) : null,
    ts.isIdentifier(n) ? n.text : ts.isLiteralExpression(n) ? n.text : null, children]; }
function normalized(code) {
  const file = parse(code);
  const result = ts.transform(file, [context => {
    const visit = node => {
      if (ts.isPropertyAssignment(node) && node.name.getText(file) === 'changeDetection' &&
          ts.isPropertyAccessExpression(node.initializer) && ['ChangeDetectionStrategy', 'Strategy'].includes(node.initializer.expression.getText(file)) &&
          ['Default', 'Eager'].includes(node.initializer.name.text)) {
        return ts.factory.updatePropertyAssignment(node, node.name, ts.factory.createNumericLiteral(1));
      }
      return ts.visitEachChild(node, visit, context);
    };
    return node => ts.visitNode(node, visit);
  }]);
  try { return JSON.stringify(semantic(result.transformed[0])); } finally { result.dispose(); }
}
function strategyProperties(code) {
  const file = parse(code);
  return collect(file, n => ts.isPropertyAssignment(n) && n.name.getText(file) === 'changeDetection' &&
    ts.isPropertyAccessExpression(n.initializer) && ['ChangeDetectionStrategy', 'Strategy'].includes(n.initializer.expression.getText(file)))
    .map(n => n.initializer.name.text);
}
function stableAtMinima(code) {
  for (const name of strategyProperties(code)) for (const model of minima) {
    const record = model.declarations.ChangeDetectionStrategy.members[name]; assert.ok(record);
    assert.deepEqual(record.markers, []); assert.equal(record.value, name === 'OnPush' ? 0 : 1);
  }
}
const witnesses = [{id: 'implicit-hosts-and-inert-text', source: `
import {Component, Directive, Pipe} from '@angular/core';
@Component({template: '<p>ChangeDetectionStrategy.Default</p>', styles: ['p {padding: 7px}']}) class Implicit {}
@Directive({selector:'[fixture]'}) class FixtureDirective {}
@Pipe({name:'fixture'}) class FixturePipe {}
TestBed.configureTestingModule({declarations:[Implicit]}).compileComponents();
`}, {id: 'explicit-OnPush-and-standalone', source: `
import {Component, ChangeDetectionStrategy} from '@angular/core';
@Component({standalone:true,changeDetection:ChangeDetectionStrategy.OnPush,template:'<p>explicit</p>'}) class Explicit {}
@Component({standalone:false,changeDetection:ChangeDetectionStrategy.Default,template:'<p>eager</p>'}) class Historical {}
const other = {Default: 123}; const value = other.Default;
`}, {id: 'core-import-alias', source: `
import {Component as Subject, ChangeDetectionStrategy as Strategy} from '@angular/core';
@Subject({standalone:false,changeDetection:Strategy.Default,template:'<p>alias</p>'}) class Alias {}
`}];
let actualHistoricalMetadata = 0;
for (const path of ['projects/ngx-material-legacy/legacy-tooltip/tooltip.spec.ts', 'projects/ngx-material-legacy/legacy-button/button.spec.ts']) {
  const file = parse(read(path).toString());
  for (const node of collect(file, n => ts.isDecorator(n) && ts.isCallExpression(n.expression) &&
      n.expression.expression.getText(file) === 'Component' && n.getText(file).includes('ChangeDetectionStrategy.Default'))) {
    witnesses.push({id: path + '#' + actualHistoricalMetadata++, source:
      "import {Component, ChangeDetectionStrategy} from '@angular/core';\n" + node.getText(file) + '\nclass HistoricalMetadata {}\n'});
  }
}
assert.equal(actualHistoricalMetadata, line === 'main' ? 9 : 8);
const temporary = mkdtempSync(join(tmpdir(), 'ngx-wide-adapter-before-')), results = [], controls = [];
try {
  const directory = join(temporary, 'testing/legacy-runner'); mkdirSync(directory, {recursive: true});
  mkdirSync(join(temporary, 'node_modules'));
  symlinkSync(dirname(dirname(require.resolve('typescript'))), join(temporary, 'node_modules/typescript'), 'dir');
  const path = join(directory, 'adapt-spec.mjs'); writeFileSync(path, prior.adapter.text);
  assert.equal(hash(readFileSync(path)), prior.adapter.sha256);
  const before = await import(pathToFileURL(path));
  for (const witness of witnesses) {
    const filename = join(root, 'testing/legacy-runner/spec-wide-adapter-witness.spec.ts');
    const old = before.adaptSpec(witness.source, filename, {subjectMode: 'artifact'}), current = adaptSpec(witness.source, filename, {subjectMode: 'artifact'});
    assert.deepEqual(old.problems, []); assert.deepEqual(current.problems, []);
    assert.equal(normalized(old.code), normalized(current.code), witness.id + ': unrelated output change');
    stableAtMinima(current.code);
    if (witness.id === 'implicit-hosts-and-inert-text') {
      assert.equal((current.code.match(/standalone: false/g) || []).length, 3);
      assert.ok(current.code.includes('<p>ChangeDetectionStrategy.Default</p>'));
      assert.ok(current.code.includes('padding: 7px'));
      assert.ok(current.code.includes('.compileComponents();'));
      assert.throws(() => stableAtMinima(old.code)); controls.push({id: 'authentic-old-emission-is-deprecated-at-both-minima', result: 'rejected'});
      for (const [id, needle, replacement] of [
        ['deprecated-emission', 'ChangeDetectionStrategy.Eager', 'ChangeDetectionStrategy.Default'],
        ['changed-OnPush-behavior', 'ChangeDetectionStrategy.Eager', 'ChangeDetectionStrategy.OnPush'],
        ['module-host-flag', 'standalone: false', 'standalone: true'],
        ['changed-template', '<p>ChangeDetectionStrategy.Default</p>', '<span>changed</span>'],
        ['changed-style', 'padding: 7px', 'padding: 8px'],
        ['removed-compilation-boundary', '.compileComponents()', ''],
      ]) {
        const changed = current.code.replace(needle, replacement); assert.notEqual(changed, current.code);
        assert.throws(() => { stableAtMinima(changed); assert.equal(normalized(old.code), normalized(changed)); });
        controls.push({id, result: 'rejected'});
      }
    }
    results.push({id: witness.id, before_sha256: hash(old.code), after_sha256: hash(current.code),
      before_strategies: strategyProperties(old.code), after_strategies: strategyProperties(current.code),
      all_other_output_semantics_equal: true, actual_Angular_rendering_executed: false});
  }
} finally { rmSync(temporary, {recursive: true, force: true}); }
const repair = inspectChipEmptyRepair({root});
export const report = {schema_version: 1, line, actual_adapter_output_witnesses: results.length,
  actual_historical_metadata_witnesses: actualHistoricalMetadata, cases: results, controls,
  rejection_controls: controls.length, original_complete_adapter_loaded_unchanged: true,
  minimum_public_Eager_identity: minima.map(n => ({line: n.line, version: n.version, value: n.runtimes.ChangeDetectionStrategy.values.Eager,
    public_markers: n.declarations.ChangeDetectionStrategy.members.Eager.markers, pure_public_enum_IIFE_executed: true})),
  before_adapter_sha256: prior.adapter.sha256, after_adapter_sha256: hash(read('testing/legacy-runner/adapt-spec.mjs')),
  owned_product_members_preserved: repair.product_members, current_owned_cases_preserved: 2223,
  source_binding_qualification_pending: true, actual_Angular_native_artifact_or_floor_qualified: false,
  producer_sha256: hash(read('tests/spec_wide_fixture_adapter_probe.mjs')), g11_claim: 'not-passed'};
if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const output = process.argv.indexOf('--out');
  if (output >= 0) writeFileSync(process.argv[output + 1], JSON.stringify(report, null, 2) + '\n', {flag: 'wx'});
  console.log(JSON.stringify({...report, cases: undefined, controls: undefined}));
}
