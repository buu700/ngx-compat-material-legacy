/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 * Copyright (c) 2026 Ryan Lester.
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */
/** Current owned caller prototype; no individual or canonical closure credit. */
import assert from 'node:assert/strict';
import {readFileSync, writeFileSync, symlinkSync, realpathSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {createRequire} from 'node:module';
import {join, dirname} from 'node:path';
import {spawnSync} from 'node:child_process';
import {qualifiedComponentConfigPublicRuntime} from '../scripts/component-config-caller-public-runtime-evidence.mjs';
import {prepareComponentConfigPublicSubjects} from '../scripts/component-config-caller-public-subjects.mjs';
import {emitComponentConfigOwned} from './component_config_caller_owned_subjects.mjs';

const root = process.cwd(), read = path => readFileSync(join(root, path));
const hash = bytes => createHash('sha256').update(bytes).digest('hex');
const require = createRequire(import.meta.url), ts = require('typescript');
const q = qualifiedComponentConfigPublicRuntime({root}), loaded = prepareComponentConfigPublicSubjects(root);
const protocolPath = 'scripts/api-public-node-context.mjs';
const prototype = process.argv[3] === '--prototype';
const result = {schema_version: 1, line: q.source.prior.line, node: process.version,
  typescript: ts.version, prototype_only: prototype, public_boundary: q.ref, runtime_subjects: [], source_faults: [],
  source_closures: 0, SDK_source_rewrites: false,
  actual_native_packed_AOT_or_full_floor_qualified: false, g11_claim: 'not-passed'};
try {
  for (const model of loaded.models.filter(model => model.line === 'original' || model.line === q.source.prior.line)) {
  const current = model.line === q.source.prior.line;
  const emitted = current ? emitComponentConfigOwned({model, source: q.source}) : null;
  const sf = ts.createSourceFile(protocolPath, read(protocolPath).toString(), ts.ScriptTarget.Latest, true);
  const nodes = sf.statements.filter(node => ts.isFunctionDeclaration(node) &&
    ['leaf', 'node', 'renderer'].includes(node.name?.text));
  assert.equal(nodes.length, 3);
  writeFileSync(join(model.root, 'render-protocol.mjs'), nodes.map(node => 'export ' + node.getText(sf)).join('\n'));
  writeFileSync(join(model.root, 'a11y-node-protocol.mjs'), read('tests/a11y_caller_node_protocol.mjs'));
  writeFileSync(join(model.root, 'owned-worker.mjs'), read('tests/component_config_caller_owned_runtime_subject.mjs'));
  writeFileSync(join(model.root, 'tagged-worker.mjs'), read('tests/component_config_caller_tagged_runtime_subject.mjs'));
  writeFileSync(join(model.root, 'constructor-cases.mjs'), read('tests/component_config_caller_constructor_cases.mjs'));
  const zone = realpathSync(dirname(require.resolve('zone.js/package.json')));
  symlinkSync(zone, join(model.root, 'node_modules/zone.js'), 'dir');
  const borrowed = {...model.borrowed,
    'zone.js': {root: zone, version: JSON.parse(readFileSync(join(zone, 'package.json'))).version}};
  const execute = mode => spawnSync(process.execPath, current ? [join(model.root, 'owned-worker.mjs'), model.line, mode] : [join(model.root, 'tagged-worker.mjs'), mode],
    {cwd: model.root, encoding: 'utf8', timeout: 30000, maxBuffer: 2 * 1024 * 1024});
  for (const mode of prototype ? ['development'] : ['development', 'production']) {
  const child = execute(mode);
  assert.equal(child.status, 0, child.error?.code + '\n' + (child.stdout + '\n' + child.stderr).slice(-12000));
  result.runtime_subjects.push({...JSON.parse(child.stdout.trim().split('\n').at(-1)),
    Core: model.packages.get('@angular/core').version,
    Material: model.packages.get('@angular/material').version, borrowed,
    semantically_emitted_source_files: emitted?.source_files ?? 0,
    decorator_metadata_protocol_files: emitted?.metadata_protocol_files ?? []});
  }
  if (!prototype && current) for (const [id, path, from, to, marker] of [
    ['snack-config-loses-assertive', 'legacy-snack-bar/snack-bar-config.ts', "override politeness: AriaLivePoliteness = 'assertive';", "override politeness: AriaLivePoliteness = 'polite';", 'owned-snack-config-retains-assertive'],
    ['snack-factory-uses-peer-config', 'legacy-snack-bar/internal/snack-bar-base.ts', 'return new MatLegacySnackBarConfig();', 'return new MatSnackBarConfig();', 'owned-snack-factory-config-class'],
    ['snack-module-loses-legacy-factory', 'legacy-snack-bar/snack-bar-module.ts', 'useFactory: MAT_SNACK_BAR_DEFAULT_OPTIONS_FACTORY', "useValue: {politeness: 'polite'}", 'owned-snack-module-provider-config-class'],
    ['paginator-ignores-parent-intl', 'legacy-paginator/internal/paginator-base.ts', 'return parentIntl || new MatPaginatorIntl();', 'return new MatPaginatorIntl();', 'owned-paginator-intl-reuses-parent'],
    ['paginator-leaks-intl-notifications', 'legacy-paginator/internal/paginator-base.ts', 'this._intlChanges.unsubscribe();', 'void this._intlChanges;', 'owned-paginator-destroy-unsubscribes-intl'],
    ['paginator-emits-wrong-page-size', 'legacy-paginator/internal/paginator-base.ts', 'pageSize: this.pageSize,', 'pageSize: this.pageIndex,', 'owned-paginator-page-event-shape'],
    ['select-trigger-loses-provider-alias', 'legacy-select/select.ts', '{provide: MAT_SELECT_TRIGGER, useExisting: MatLegacySelectTrigger}', '{provide: MAT_SELECT_TRIGGER, useValue: null}', 'owned-provider-alias-MatLegacySelectTrigger'],
    ['radio-group-loses-provider-alias', 'legacy-radio/radio.ts', '{provide: MAT_RADIO_GROUP, useExisting: MatLegacyRadioGroup}', '{provide: MAT_RADIO_GROUP, useValue: null}', 'owned-provider-alias-MatLegacyRadioGroup'],
    ['list-loses-provider-alias', 'legacy-list/list.ts', '{provide: MAT_LIST, useExisting: MatLegacyList}', '{provide: MAT_LIST, useValue: null}', 'owned-provider-alias-MatLegacyList'],
    ['nav-list-loses-provider-alias', 'legacy-list/list.ts', '{provide: MAT_NAV_LIST, useExisting: MatLegacyNavList}', '{provide: MAT_NAV_LIST, useValue: null}', 'owned-provider-alias-MatLegacyNavList'],
  ]) {
    const sourcePath = 'projects/ngx-material-legacy/' + path, before = q.source.sources.get(sourcePath);
    assert.equal(before.split(from).length, 2, 'non-unique source control ' + id);
    const compile = text => {
      const result = ts.transpileModule(text, {fileName: join(model.root, sourcePath), compilerOptions: emitted.options, reportDiagnostics: true});
      assert.deepEqual(result.diagnostics, [], 'control has syntax/option errors ' + id);
      return result.outputText;
    };
    assert.equal(compile(before), emitted.plain.get(sourcePath), 'isolated control emitter differs from complete semantic baseline ' + id);
    const target = join(model.root, sourcePath.replace(/\.ts$/, '.mjs'));
    const mutated = before.replace(from, to);
    writeFileSync(target, emitted.prepare(sourcePath, compile(mutated)));
    try {
      const child = execute('development');
      assert.equal(child.signal, null, 'terminated source control ' + id + ':' + child.error?.code);
      assert.equal(child.status, 1, 'source control escaped ' + id + ':' + child.stderr.slice(-3000));
      assert.match(child.stderr, /AssertionError/);
      assert.ok(child.stderr.includes(marker), 'unrelated source-control rejection ' + id + ':' + child.stderr.slice(-3000));
      result.source_faults.push({id, line: model.line, path: sourcePath, source_before_sha256: hash(before),
        source_mutant_sha256: hash(mutated), rejected: true, marker, exit_status: child.status, signal: child.signal,
        isolated_emitter_matches_complete_semantic_baseline: true});
    } finally {writeFileSync(target, emitted.outputs.get(target));}
  }
  }
  const tagged = result.runtime_subjects.find(s => s.line === 'original'), current = result.runtime_subjects.find(s => s.line === q.source.prior.line);
  for (const subject of result.runtime_subjects.filter(s => s.line !== 'original')) assert.deepEqual(subject.observations.constructors, tagged.observations, 'tagged complete constructor behavior drift');
  if (!prototype) {assert.equal(result.runtime_subjects.length, 4);assert.equal(result.source_faults.length, 10);}

  const paths = new Set([q.ref.path, ...q.proof.inputs.map(member => member.path),
    'scripts/component-config-caller-public-runtime-evidence.mjs', protocolPath,
    'tests/component_config_caller_owned_subjects.mjs', 'tests/component_config_caller_owned_runtime_subject.mjs',
    'tests/component_config_caller_owned_runtime_probe.mjs',
    'tests/component_config_caller_constructor_cases.mjs', 'tests/component_config_caller_tagged_runtime_subject.mjs']);
  result.inputs = [...paths].sort().map(path => ({path, sha256: hash(read(path))}));
  result.scope = 'Complete current200-file semantic emits at this source line\'s exact minimum. Runtime ESM normalization changes only owned relative suffixes and routes eight owned Core imports through a recording wrapper that forwards to genuine public decorators. This records actual evaluated provider metadata;public Injector executes those provider arrays. Owner payloads,DOM and Renderer2 are explicit protocols. No current owned source runs against tagged16 or the other current peer line. No generated Angular module/factory/template/query,native,CSS/geometry/motion,packed/AOT,consumer/toolchain/peer floor or source-closure qualification.';
  assert.ok(process.argv[2]);
  writeFileSync(process.argv[2], JSON.stringify(result, null, 2) + '\n', {flag: 'wx'});
  console.log(JSON.stringify({line: result.line, prototype_only: prototype, source_files: 200,
    source_faults: result.source_faults.length, contexts: result.runtime_subjects.length, cases: result.runtime_subjects.reduce((count, s) => count + s.cases.length, 0), source_closures: 0}));
} finally {loaded.dispose();}
