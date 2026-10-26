/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 * Copyright (c) 2026 Ryan Lester.
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */
/** Actual tagged/owned service comparison; one-source candidate stays in memory. */
import assert from 'node:assert/strict';
import {readFileSync, writeFileSync, realpathSync, symlinkSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {createRequire} from 'node:module';
import {dirname, join} from 'node:path';
import {spawnSync} from 'node:child_process';
import {inspectDialogConfigBoundary} from '../scripts/dialog-caller-config-boundary.mjs';
import {prepareDialogCallerPublicSubjects} from '../scripts/dialog-caller-public-subjects.mjs';
import {qualifiedDialogPublicRuntime} from '../scripts/dialog-caller-public-runtime-evidence.mjs';
import {emitDialogConfiguration} from './dialog_caller_config_runtime_sources.mjs';
const root = process.cwd(), read = path => readFileSync(join(root, path));
const require = createRequire(import.meta.url), ts = require('typescript');
const hash = value => createHash('sha256').update(value).digest('hex');
console.error('Checking applied dialog source boundary');
const boundary = inspectDialogConfigBoundary({root, requireApplied: true});
const publicRuntime = qualifiedDialogPublicRuntime({root});
const candidatePath = 'compatibility/rc/dialog-caller-service-default-candidate.json';
const candidate = JSON.parse(read(candidatePath));
assert.equal(candidate.line, boundary.line); assert.equal(candidate.candidate_only, true);
assert.equal(candidate.product_applied, false); assert.equal(candidate.members.length, 1);
const member = candidate.members[0];
assert.equal(member.path, 'projects/ngx-material-legacy/legacy-dialog/internal/dialog-base.ts');
for (const side of ['before', 'after']) {
  assert.equal(hash(member[side].text), member[side].sha256);
  assert.equal(Buffer.byteLength(member[side].text), member[side].bytes);
}
assert.equal(hash(read(member.path)), member.before.sha256, 'candidate requires actual before source');
assert.equal(boundary.proposed_sources.get(member.path), member.before.text);
const after = new Map(boundary.proposed_sources); after.set(member.path, member.after.text);
const result = {schema_version: 1, line: boundary.line, candidate_only: true, product_applied: false,
  node: process.version, typescript: ts.version, candidate: {path: candidatePath, sha256: hash(read(candidatePath))},
  public_runtime: publicRuntime.ref, before_source_members: [], candidate_source_members: [],
  contexts: [], semantic_programs: [], tagged_differences_retained: [], source_faults: [], inputs: [], source_closures: 0,
  actual_native_packed_AOT_or_full_floor_qualified: false, g11_claim: 'not-passed'};
for (const [key, sources] of [['before_source_members', boundary.proposed_sources], ['candidate_source_members', after]]) {
  result[key] = [...sources].map(([path, text]) => ({path, sha256: hash(text)}));
}
console.error('Preparing genuine dialog SDK subjects');
const loaded = prepareDialogCallerPublicSubjects(root);
const run = (model, side, mode) => {
  const child = spawnSync(process.execPath, [join(model.root, 'owned-service-worker.mjs'), model.line, mode, side],
    {cwd: model.root, encoding: 'utf8', timeout: 30000, maxBuffer: 2 * 1024 * 1024});
  return {child, parsed: child.status === 0 ? JSON.parse(child.stdout.trim().split('\n').at(-1)) : null};
};
const diagnostic = child => child.error?.code + '\n' + (child.stdout + '\n' + child.stderr).slice(-8000);
try {
  for (const model of loaded.models.filter(model => model.line === 'original' || model.line === boundary.line)) {
    const sf = ts.createSourceFile('render-protocol', read('scripts/api-public-node-context.mjs').toString(), ts.ScriptTarget.Latest, true);
    const nodes = sf.statements.filter(node => ts.isFunctionDeclaration(node) && ['leaf', 'node', 'renderer'].includes(node.name?.text));
    assert.equal(nodes.length, 3);
    writeFileSync(join(model.root, 'render-protocol.mjs'), nodes.map(node => 'export ' + node.getText(sf)).join('\n'));
    writeFileSync(join(model.root, 'a11y-node-protocol.mjs'), read('tests/a11y_caller_node_protocol.mjs'));
    writeFileSync(join(model.root, 'owned-service-worker.mjs'), read('tests/dialog_caller_owned_service_subject.mjs'));
    const zone = realpathSync(dirname(require.resolve('zone.js/package.json')));
    symlinkSync(zone, join(model.root, 'node_modules/zone.js'), 'dir');
    const borrowed = {...model.borrowed, 'zone.js': {root: zone, version: JSON.parse(readFileSync(join(zone, 'package.json'))).version}};
    let beforeProgram, candidateProgram;
    for (const side of model.line === 'original' ? ['tagged'] : ['before', 'candidate']) {
      console.error('Executing service subject ' + model.line + ':' + side);
      if (side !== 'tagged') {
        const emitted = emitDialogConfiguration({model, side, oldProgram: beforeProgram, source: {
          ...boundary.source, sources: side === 'before' ? boundary.proposed_sources : after,
          routes: boundary.routes, edges: boundary.edges}});
        if (side === 'before') beforeProgram = emitted.program; else candidateProgram = emitted.program;
        const fields = [];
        if (side === 'candidate') {
          const checker = emitted.program.getTypeChecker();
          const source = emitted.program.getSourceFile(join(model.root, side, member.path));
          assert.ok(source);
          const visit = node => {
            if (ts.isPropertyAccessExpression(node) && ts.isIdentifier(node.expression) && node.expression.text === 'defaults') {
              const symbol = checker.getSymbolAtLocation(node.name); assert.ok(symbol);
              const tags = symbol.getJsDocTags(checker).map(tag => tag.name); assert.deepEqual(tags, []);
              fields.push({name: node.name.text, type: checker.typeToString(checker.getTypeAtLocation(node)), tags});
            }
            ts.forEachChild(node, visit);
          };
          visit(source); assert.deepEqual(fields.map(field => field.name), ['ariaModal', 'maxWidth']);
        }
        result.semantic_programs.push({side, source_files: emitted.source_files, diagnostics: 0, public_field_writes: fields});
      }
      for (const mode of ['development', 'production']) {
        const {child, parsed} = run(model, side, mode);
        assert.equal(child.status, 0, model.line + ':' + side + ':' + mode + ':' + diagnostic(child));
        assert.equal(parsed.cases.length, model.line === 'original' ? 11 : 12);
        result.contexts.push({...parsed, Core: model.packages.get('@angular/core').version,
          Material: model.packages.get('@angular/material').version, borrowed});
      }
    }
    if (model.line !== 'original') for (const [id, needle, replacement, marker] of [
      ['wrong-aria-default', 'defaults.ariaModal = true;', 'defaults.ariaModal = false;', 'candidate generic default ariaModal'],
      ['wrong-width-default', "defaults.maxWidth = '80vw';", "defaults.maxWidth = '90vw';", 'candidate generic default maxWidth'],
    ]) {
      const mutant = new Map(after); assert.equal(member.after.text.split(needle).length, 2);
      mutant.set(member.path, member.after.text.replace(needle, replacement));
      emitDialogConfiguration({model, side: 'candidate', oldProgram: candidateProgram, source: {
        ...boundary.source, sources: mutant, routes: boundary.routes, edges: boundary.edges}});
      const {child} = run(model, 'candidate', 'development');
      assert.equal(child.status, 1, 'mutant not rejected: ' + id + ':' + diagnostic(child));
      assert.ok(child.stderr.includes(marker), diagnostic(child));
      result.source_faults.push({id, path: member.path, before_sha256: member.after.sha256,
        mutant_sha256: hash(mutant.get(member.path)), semantic_source_files: 49, diagnostics: 0,
        rejected: true, exit_status: child.status, marker});
    }
  }
  assert.equal(result.contexts.length, 6);
  for (const mode of ['development', 'production']) {
    const reference = result.contexts.find(row => row.line === 'original' && row.mode === mode);
    const before = result.contexts.find(row => row.side === 'before' && row.mode === mode);
    const current = result.contexts.find(row => row.side === 'candidate' && row.mode === mode);
    const expected = structuredClone(before.observations);
    const original = reference.observations.find(row => row.kind === 'generic-defaults');
    assert.equal(original.ariaModal, true); assert.equal(original.maxWidth, '80vw');
    const generic = expected.find(row => row.kind === 'generic-defaults');
    assert.equal(generic.ariaModal, false); assert.deepEqual(generic.maxWidth, {kind: 'undefined'});
    generic.ariaModal = original.ariaModal; generic.maxWidth = original.maxWidth;
    for (const key of ['ariaModal', 'maxWidth']) generic.completeEffectiveConfig.properties[key].value = original[key];
    assert.deepEqual(current.observations, expected, 'candidate changed behavior outside generic defaults');
    for (let index = 0; index < reference.observations.length; index++) if (
      JSON.stringify(reference.observations[index]) !== JSON.stringify(current.observations[index])) {
      result.tagged_differences_retained.push({mode, tagged: reference.observations[index], current: current.observations[index]});
    }
  }
  for (const side of ['tagged', 'before', 'candidate']) {
    assert.deepEqual(result.contexts.find(row => row.side === side && row.mode === 'development').observations,
      result.contexts.find(row => row.side === side && row.mode === 'production').observations);
  }
  const inputs = new Set([...publicRuntime.proof.inputs, ...boundary.runtime.proof.inputs,
    ...boundary.types.proof.inputs, ...result.before_source_members].map(input => input.path));
  for (const path of [publicRuntime.ref.path, candidatePath, 'scripts/dialog-caller-config-boundary.mjs',
    'scripts/dialog-caller-public-runtime-evidence.mjs', 'tests/dialog_caller_config_runtime_sources.mjs',
    'tests/dialog_caller_owned_service_probe.mjs', 'tests/dialog_caller_owned_service_subject.mjs']) inputs.add(path);
  result.inputs = [...inputs].sort().map(path => ({path, sha256: hash(read(path))}));
  result.scope = 'Genuine tagged16 versus actual owned49-file strict semantic graphs on the selected peer SDK,development/production. Real Dialog.open,Angular-generated test container/content factories and inherited portal queries,legacy ref/provider/data identity and close/lifetime execute. DOM/Renderer2/history/scroll and test animation events are explicit protocols. Candidate changes only two generic fallback values;all five other option/default/class variants retain complete before observations. Original peer-ref versus owned null-sentinel,full effective config differences,and the tagged custom-class/base-container missing-provider failure stay visible;that tagged failure does not qualify ownership/lifecycle. No legacy leaf HTML/CSS/SCSS,native geometry,packed,AOT,SSR,full compiler/Node/peer/RxJS floors or source closure.';
  assert.ok(process.argv[2]); writeFileSync(process.argv[2], JSON.stringify(result, null, 2) + '\n', {flag: 'wx'});
  console.log(JSON.stringify({line: boundary.line, candidate_only: true, contexts: result.contexts.length,
    cases: result.contexts.reduce((count, context) => count + context.cases.length, 0), source_faults: result.source_faults.length,
    differences: result.tagged_differences_retained.length, inputs: result.inputs.length}));
} finally {loaded.dispose();}
