/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 * Copyright (c) 2026 Ryan Lester.
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */
/** Independently tagged config data and actual current before/candidate runtime. */
import assert from 'node:assert/strict';
import {readFileSync, writeFileSync, symlinkSync, realpathSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {createRequire} from 'node:module';
import {join, dirname} from 'node:path';
import {spawnSync} from 'node:child_process';
import {qualifiedDialogConfigCandidateTypes} from '../scripts/dialog-caller-config-type-evidence.mjs';
import {prepareDialogCallerPublicSubjects} from '../scripts/dialog-caller-public-subjects.mjs';
import {componentConfigGraph} from '../scripts/component-config-caller-contracts.mjs';
import {emitDialogConfiguration} from './dialog_caller_config_runtime_sources.mjs';

const root = process.cwd(), read = path => readFileSync(join(root, path));
const hash = bytes => createHash('sha256').update(bytes).digest('hex');
const require = createRequire(import.meta.url), ts = require('typescript');
const q = qualifiedDialogConfigCandidateTypes({root}), loaded = prepareDialogCallerPublicSubjects(root);
const overrides = new Map(q.candidate.members.map(member => [member.path, member.after.text]));
const graph = componentConfigGraph({root, selected: q.source.prior.selected,
  read: path => overrides.has(path) ? Buffer.from(overrides.get(path)) : read(path)});
const before = {...q.source, edges: q.source.prior.edges};
const candidate = {...q.source, sources: graph.sources, routes: graph.routes, edges: graph.edges};
const prototype = process.argv[3] === '--prototype';
process.once('exit', code => process.stderr.write('dialog-runtime-parent-exit:' + code + '\n'));
const result = {schema_version: 1, line: q.source.prior.line, node: process.version, typescript: ts.version,
  prototype_only: prototype, type_boundary: q.ref, candidate: q.candidate_ref,
  runtime_subjects: [], source_faults: [], tagged_differences_retained: [],
  candidate_only: true, product_applied: false, source_closures: 0, SDK_source_rewrites: false,
  actual_native_packed_AOT_or_full_floor_qualified: false, g11_claim: 'not-passed'};
try {
  for (const model of loaded.models.filter(model => model.line === 'original' || model.line === q.source.prior.line)) {
    const current = model.line === q.source.prior.line;
    let emittedBefore, emittedCandidate;
    if (current) {
      emittedBefore = emitDialogConfiguration({model, source: before, side: 'before'});
      emittedCandidate = emitDialogConfiguration({model, source: candidate, side: 'candidate'});
      const helper = 'projects/ngx-material-legacy/legacy-dialog/internal/dialog-initial-focus.ts';
      assert.equal(emittedCandidate.plain.get(helper), emittedBefore.plain.get(helper), 'type-only focus module changed at runtime');
    }
    const contextPath = 'scripts/api-public-node-context.mjs';
    const sf = ts.createSourceFile(contextPath, read(contextPath).toString(), ts.ScriptTarget.Latest, true);
    const nodes = sf.statements.filter(node => ts.isFunctionDeclaration(node) &&
      ['leaf', 'node', 'renderer'].includes(node.name?.text));
    assert.equal(nodes.length, 3);
    writeFileSync(join(model.root, 'render-protocol.mjs'), nodes.map(node => 'export ' + node.getText(sf)).join('\n'));
    writeFileSync(join(model.root, 'a11y-node-protocol.mjs'), read('tests/a11y_caller_node_protocol.mjs'));
    writeFileSync(join(model.root, 'owned-worker.mjs'), read('tests/dialog_caller_config_runtime_subject.mjs'));
    writeFileSync(join(model.root, 'tagged-worker.mjs'), read('tests/dialog_caller_config_tagged_subject.mjs'));
    const zone = realpathSync(dirname(require.resolve('zone.js/package.json')));
    symlinkSync(zone, join(model.root, 'node_modules/zone.js'), 'dir');
    const borrowed = {...model.borrowed,
      'zone.js': {root: zone, version: JSON.parse(readFileSync(join(zone, 'package.json'))).version}};
    const execute = (mode, side = 'candidate') => spawnSync(process.execPath, current ? [join(model.root, 'owned-worker.mjs'), model.line, mode, side] :
      [join(model.root, 'tagged-worker.mjs'), mode], {cwd: model.root, encoding: 'utf8', timeout: 30000,
      maxBuffer: 2 * 1024 * 1024});
    for (const mode of prototype ? ['development'] : ['development', 'production']) {
      let baseline;
      if (current) {
        const original = execute(mode, 'before');
        assert.equal(original.status, 0, original.error?.code + '\n' + (original.stdout + '\n' + original.stderr).slice(-14000));
        baseline = JSON.parse(original.stdout.trim().split('\n').at(-1));
        writeFileSync(join(model.root, 'before-observations-' + mode + '.json'),
          JSON.stringify(baseline.observations.sides.before), {flag: 'wx'});
      }
      const child = execute(mode);
      assert.equal(child.status, 0, child.error?.code + '\n' + (child.stdout + '\n' + child.stderr).slice(-14000));
      const parsed = JSON.parse(child.stdout.trim().split('\n').at(-1));
      if (baseline) {
        parsed.observations.sides.before = baseline.observations.sides.before;
        parsed.cases = [...baseline.cases, ...parsed.cases];
        parsed.isolated_current_source_workers = 2;
      }
      result.runtime_subjects.push({...parsed,
        Core: model.packages.get('@angular/core').version, Material: model.packages.get('@angular/material').version,
        borrowed, complete_semantic_source_files_per_side: current ? 49 : 0,
        initial_focus_emitted_module_byte_equal_before_candidate: current});
    }
    if (!prototype && current) {
      let oldProgram = emittedCandidate.program;
      for (const [id, path, from, to, marker] of [
        ['wrong-autofocus-default', 'legacy-dialog/dialog-config.ts', "= 'first-tabbable';", "= 'dialog';", 'candidate-full-config-shape-beforeafter'],
        ['wrong-config-DI-token', 'legacy-dialog/internal/dialog-container-base.ts', '@Inject(MatDialogConfig) public readonly _config:', '@Inject(OverlayRef) public readonly _config:', 'candidate-public-injector-config-identity'],
        ['false-focus-policy-ignored', 'legacy-dialog/internal/dialog-initial-focus.ts',
          "case false:\n    case 'dialog':\n      if (!legacyDialogContainsFocus(element)) {\n        element.focus(options);",
          "case false:\n    case 'dialog':\n      if (!legacyDialogContainsFocus(element)) {\n        void options;", 'focus-policy-false'],
      ]) {
        const sourcePath = 'projects/ngx-material-legacy/' + path, text = candidate.sources.get(sourcePath);
        assert.equal(text.split(from).length, 2, 'nonunique runtime source fault ' + id);
        const mutant = text.replace(from, to), sources = new Map(candidate.sources);
        sources.set(sourcePath, mutant);
        const emitted = emitDialogConfiguration({model, source: {...candidate, sources}, side: 'candidate', oldProgram});
        oldProgram = emitted.program;
        const child = execute('development');
        assert.equal(child.signal, null, 'runtime fault terminated ' + id);
        assert.equal(child.status, 1, 'runtime fault escaped ' + id + ':' + child.stderr.slice(-3000));
        assert.match(child.stderr, /AssertionError/);
        assert.ok(child.stderr.includes(marker), 'unrelated runtime fault rejection ' + id + ':' + child.stderr.slice(-5000));
        result.source_faults.push({id, path: sourcePath, before_sha256: hash(text), mutant_sha256: hash(mutant),
          complete_current_semantic_graph_files: emitted.source_files, diagnostics: 0, rejected: true,
          marker, exit_status: child.status, signal: child.signal});
      }
    }
  }
  for (const current of result.runtime_subjects.filter(subject => subject.line !== 'original')) {
    const tagged = result.runtime_subjects.find(subject => subject.line === 'original' && subject.mode === current.mode);
    assert.ok(tagged);
    const reference = tagged.observations.defaults, actual = current.observations.sides.candidate.defaults;
    for (const key of ['autoFocus', 'ariaModal', 'maxWidth', 'enterAnimationDuration', 'exitAnimationDuration']) {
      assert.deepEqual(actual.properties[key], reference.properties[key], 'untouched-tagged-historical-default-' + key);
    }
    for (const key of new Set([...Object.keys(reference.properties), ...Object.keys(actual.properties)])) {
      if (JSON.stringify(reference.properties[key]) !== JSON.stringify(actual.properties[key])) {
        result.tagged_differences_retained.push({mode: current.mode, key,
          tagged: reference.properties[key] ?? {missing: true}, current: actual.properties[key] ?? {missing: true}});
      }
    }
    if (JSON.stringify(reference.keys) !== JSON.stringify(actual.keys)) result.tagged_differences_retained.push({mode: current.mode,
      key: '$enumeration-order', tagged: reference.keys, current: actual.keys});
  }
  const paths = new Set([q.ref.path, ...q.proof.inputs.map(member => member.path),
    'scripts/dialog-caller-config-type-evidence.mjs', 'scripts/api-public-node-context.mjs',
    'tests/a11y_caller_node_protocol.mjs', 'tests/dialog_caller_config_runtime_sources.mjs',
    'tests/dialog_caller_config_runtime_probe.mjs', 'tests/dialog_caller_config_runtime_subject.mjs',
    'tests/dialog_caller_config_tagged_subject.mjs']);
  result.inputs = [...paths].sort().map(path => ({path, sha256: hash(read(path))}));
  result.scope = 'Actual untouched tagged16 config data and selected-current complete49-file before/candidate semantic emits with standard design metadata. Before and candidate workers are isolated processes with genuine SDK code;no templates/styles are replaced. ESM normalization affects only owned relative/self paths;one owned Core import records and forwards genuine Inject. Standard Reflect metadata,Document/DOM/renderer and supplied overlay/monitor objects are explicit protocols. Public Angular applications/injectors execute the owned base constructor through real JIT constructor factories for an Injectable test subclass;leaf container construction is manual. Actual FocusTrapFactory/InteractivityChecker/NgZone support owned focus/lifecycle cases. No current owned implementation runs on tagged16 or the opposite current line. Tagged/current differences remain visible. No native browser,generated leaf Component factory/templates/queries,packed/AOT,SSR,consumer/toolchain/peer-floor or source-closure pass.';
  if (!prototype) {assert.equal(result.runtime_subjects.length, 4); assert.equal(result.source_faults.length, 3);}
  assert.ok(process.argv[2]);
  writeFileSync(process.argv[2], JSON.stringify(result, null, 2) + '\n', {flag: 'wx'});
  console.log(JSON.stringify({line: result.line, prototype_only: prototype,
    contexts: result.runtime_subjects.length, cases: result.runtime_subjects.reduce((n, subject) => n + subject.cases.length, 0),
    runtime_source_faults: result.source_faults.length, tagged_difference_records: result.tagged_differences_retained.length,
    candidate_only: true, product_applied: false, source_closures: 0}));
} finally {loaded.dispose(); process.stderr.write('dialog-runtime-model-cleanup-complete\n');}
