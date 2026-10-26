/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 * Copyright (c) 2026 Ryan Lester.
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */
/** Untouched SDK public calls, with synthetic DOM/renderer and strategy payloads disclosed. */
import assert from 'node:assert/strict';
import {readFileSync, writeFileSync, symlinkSync, realpathSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {createRequire} from 'node:module';
import {dirname, join} from 'node:path';
import {spawnSync} from 'node:child_process';
import {prepareDialogCallerPublicSubjects} from '../scripts/dialog-caller-public-subjects.mjs';
import {dialogPublicTypeContracts} from './dialog_caller_public_type_contracts.mjs';
const root = process.cwd(), read = path => readFileSync(join(root, path));
const hash = bytes => createHash('sha256').update(bytes).digest('hex');
const require = createRequire(import.meta.url), ts = require('typescript');
const loaded = prepareDialogCallerPublicSubjects(root), prototype = process.argv[3] === '--prototype';
const result = {schema_version: 1, prototype_only: prototype, sdk_capsule: loaded.dialog_caller_capsule,
  node: process.version, typescript: ts.version, runtime_subjects: [], type_contracts: [],
  tagged_differences_retained: [], inputs: [], SDK_source_rewrites: false, source_closures: 0,
  actual_native_packed_AOT_or_full_floor_qualified: false, g11_claim: 'not-passed'};
try {
  const sf = ts.createSourceFile('render-protocol', read('scripts/api-public-node-context.mjs').toString(), ts.ScriptTarget.Latest, true);
  const nodes = sf.statements.filter(node => ts.isFunctionDeclaration(node) && ['leaf', 'node', 'renderer'].includes(node.name?.text));
  assert.equal(nodes.length, 3);
  for (const model of loaded.models.filter(model => !prototype || model.line === 'main')) {
    result.type_contracts.push(dialogPublicTypeContracts(model));
    writeFileSync(join(model.root, 'render-protocol.mjs'), nodes.map(node => 'export ' + node.getText(sf)).join('\n'));
    writeFileSync(join(model.root, 'a11y-node-protocol.mjs'), read('tests/a11y_caller_node_protocol.mjs'));
    writeFileSync(join(model.root, 'dialog-public-worker.mjs'), read('tests/dialog_caller_public_runtime_subject.mjs'));
    const zone = realpathSync(dirname(require.resolve('zone.js/package.json')));
    symlinkSync(zone, join(model.root, 'node_modules/zone.js'), 'dir');
    const borrowed = {...model.borrowed, 'zone.js': {root: zone, version: JSON.parse(readFileSync(join(zone, 'package.json'))).version}};
    for (const mode of prototype ? ['development'] : ['development', 'production']) {
      const child = spawnSync(process.execPath, [join(model.root, 'dialog-public-worker.mjs'), model.line, mode],
        {cwd: model.root, encoding: 'utf8', timeout: 30000, maxBuffer: 2 * 1024 * 1024});
      assert.equal(child.status, 0, model.line + ':' + mode + ':' + child.error?.code + '\n' +
        (child.stdout + '\n' + child.stderr).slice(-12000));
      const parsed = JSON.parse(child.stdout.trim().split('\n').at(-1));
      result.runtime_subjects.push({...parsed, Core: model.packages.get('@angular/core').version,
        Material: model.packages.get('@angular/material').version, borrowed});
    }
  }
  if (!prototype) {
    assert.equal(result.runtime_subjects.length, 6); assert.equal(result.type_contracts.length, 3);
    assert.equal(result.runtime_subjects.reduce((count, subject) => count + subject.cases.length, 0), 100);
    const reference = result.runtime_subjects.find(subject => subject.line === 'original' && subject.mode === 'development');
    for (const subject of result.runtime_subjects) {
      const development = result.runtime_subjects.find(row => row.line === subject.line && row.mode === 'development');
      assert.deepEqual(subject.observations, development.observations, 'development/production public contract drift');
      for (const boundary of Object.keys(reference.observations)) if (
        JSON.stringify(reference.observations[boundary]) !== JSON.stringify(subject.observations[boundary])) {
        result.tagged_differences_retained.push({line: subject.line, mode: subject.mode, boundary,
          tagged: reference.observations[boundary], current: subject.observations[boundary]});
      }
    }
  }
  const inputs = new Set(['scripts/dialog-caller-public-subjects.mjs',
    'scripts/component-config-caller-public-subjects.mjs', 'scripts/tabs-caller-public-subjects.mjs',
    'scripts/overlay-caller-contracts.mjs', 'scripts/overlay-caller-public-subjects.mjs',
    'scripts/cdk-module-type-public-subjects.mjs', 'scripts/material-public-subjects.mjs',
    'scripts/api-public-node-context.mjs', 'tests/a11y_caller_node_protocol.mjs',
    'tests/dialog_caller_public_runtime_probe.mjs', 'tests/dialog_caller_public_runtime_subject.mjs',
    'tests/dialog_caller_public_type_contracts.mjs']);
  for (const name of ['material-public-subjects', 'element-ref-public-subjects', 'cdk-module-type-public-subjects',
    'overlay-caller-public-subjects', 'overlay-caller-contract-sdk', 'tabs-caller-public-subjects',
    'component-config-caller-public-subjects', 'dialog-caller-public-subjects']) {
    const path = 'compatibility/rc/' + name + '.json', capsule = JSON.parse(read(path)); inputs.add(path);
    for (const subject of capsule.subjects) for (const member of subject.members ?? subject.additions ?? []) inputs.add(member.path);
    if (capsule.tagged_original_mixin) inputs.add(capsule.tagged_original_mixin.path);
  }
  result.inputs = [...inputs].sort().map(path => ({path, sha256: hash(read(path))}));
  result.scope = 'Genuine public DialogModule/injectors,Dialog.open and DialogRef on the untouched tagged16 and both advertised current SDKs. Actual Angular factories/queries for custom test containers/content and real component/template portals execute. DOM/Renderer2,positions,scroll strategies and isolated manual-ref overlay owners are explicit protocols;no SDK source or factory rewrite. Optional current DialogContainer hooks are checked through public declarations and typed witnesses. Tagged const-enum erasure and current runtime exports,default changes,template-nullability and backdrop recapture differences stay visible. No actual current owned source,legacy leaf template/style/native geometry,packed/AOT,SSR,consumer or full Node/compiler/peer/RxJS floor qualification. No source closures or G01-G13 pass.';
  assert.ok(process.argv[2]); writeFileSync(process.argv[2], JSON.stringify(result, null, 2) + '\n', {flag: 'wx'});
  console.log(JSON.stringify({prototype_only: prototype, contexts: result.runtime_subjects.length,
    cases: result.runtime_subjects.reduce((count, subject) => count + subject.cases.length, 0), source_closures: 0}));
} finally {loaded.dispose();}
