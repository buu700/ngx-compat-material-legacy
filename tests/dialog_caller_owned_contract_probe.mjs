/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 * Copyright (c) 2026 Ryan Lester.
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */
/** Current actual owned contracts; retain tagged differences before making source decisions. */
import assert from 'node:assert/strict';
import {readFileSync, writeFileSync, realpathSync, symlinkSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {createRequire} from 'node:module';
import {dirname, join} from 'node:path';
import {spawnSync} from 'node:child_process';
import {inspectDialogServiceDefaults} from '../scripts/dialog-caller-service-default-boundary.mjs';
import {prepareDialogCallerPublicSubjects} from '../scripts/dialog-caller-public-subjects.mjs';
import {emitDialogConfiguration} from './dialog_caller_config_runtime_sources.mjs';
const root = process.cwd(), read = path => readFileSync(join(root, path));
const require = createRequire(import.meta.url), ts = require('typescript');
const hash = value => createHash('sha256').update(value).digest('hex');
const boundary = inspectDialogServiceDefaults({root, requireApplied: true});
const proposalPath = process.argv[3], proposal = proposalPath ? JSON.parse(read(proposalPath)) : null;
const proposed = new Map(boundary.proposed_sources);
if (proposal) {
  assert.equal(proposal.line, boundary.line); assert.equal(proposal.candidate_only, true);
  assert.equal(proposal.product_applied, false); assert.equal(proposal.members.length, 4);
  for (const member of proposal.members) {
    assert.equal(hash(read(member.path)), member.before.sha256);
    assert.equal(hash(member.before.text), member.before.sha256); assert.equal(hash(member.after.text), member.after.sha256);
    assert.equal(proposed.get(member.path), member.before.text); proposed.set(member.path, member.after.text);
  }
}
const loaded = prepareDialogCallerPublicSubjects(root);
const result = {schema_version: 1, line: boundary.line, discovery_only: true, node: process.version,
  typescript: ts.version, sdk_capsule: loaded.dialog_caller_capsule, source_boundary: boundary.ref,
  source_members: [...boundary.proposed_sources].map(([path, text]) => ({path, sha256: hash(text)})),
  runtime_subjects: [], tagged_differences_retained: [], source_closures: 0,
  source_faults: [], semantic_programs: [], inputs: [],
  actual_native_packed_AOT_or_full_floor_qualified: false, g11_claim: 'not-passed'};
try {
  for (const model of loaded.models.filter(model => model.line === 'original' || model.line === boundary.line)) {
    const sf = ts.createSourceFile('render-protocol', read('scripts/api-public-node-context.mjs').toString(), ts.ScriptTarget.Latest, true);
    const nodes = sf.statements.filter(node => ts.isFunctionDeclaration(node) && ['leaf', 'node', 'renderer'].includes(node.name?.text));
    assert.equal(nodes.length, 3);
    writeFileSync(join(model.root, 'render-protocol.mjs'), nodes.map(node => 'export ' + node.getText(sf)).join('\n'));
    writeFileSync(join(model.root, 'a11y-node-protocol.mjs'), read('tests/a11y_caller_node_protocol.mjs'));
    writeFileSync(join(model.root, 'owned-contract-worker.mjs'), read('tests/dialog_caller_owned_contract_subject.mjs'));
    const zone = realpathSync(dirname(require.resolve('zone.js/package.json')));
    symlinkSync(zone, join(model.root, 'node_modules/zone.js'), 'dir');
    const run = (side, phase, mode) => spawnSync(process.execPath,
      [join(model.root, 'owned-contract-worker.mjs'), model.line, mode, side, phase],
      {cwd: model.root, encoding: 'utf8', timeout: 30000, maxBuffer: 2 * 1024 * 1024});
    let priorProgram;
    for (const {side, phase} of model.line === 'original' ? [{side: 'tagged', phase: 'tagged'}] : proposal ?
      [{side: 'before', phase: 'current'}, {side: 'candidate', phase: 'proposal'}] : [{side: 'candidate', phase: 'current'}]) {
      if (model.line !== 'original') {
      const emitted = emitDialogConfiguration({model, side, oldProgram: priorProgram, source: {
        ...boundary.configuration.source, sources: phase === 'proposal' ? proposed : boundary.proposed_sources,
        routes: boundary.routes, edges: boundary.edges}});
      priorProgram = emitted.program;
      result.semantic_programs.push({phase, source_files: emitted.source_files, diagnostics: 0});
      }
      for (const mode of ['development', 'production']) {
      console.error('Executing owned contract ' + model.line + ':' + phase + ':' + mode);
      const child = run(side, phase, mode);
      assert.equal(child.status, 0, model.line + ':' + mode + ':' + child.error?.code + '\n' + (child.stdout + '\n' + child.stderr).slice(-12000));
      result.runtime_subjects.push({...JSON.parse(child.stdout.trim().split('\n').at(-1)),
        Core: model.packages.get('@angular/core').version, Material: model.packages.get('@angular/material').version,
        borrowed: {...model.borrowed, 'zone.js': {root: zone, version: JSON.parse(readFileSync(join(zone, 'package.json'))).version}}});
      }
    }
    if (proposal && model.line !== 'original') for (const [id, path, needle, replacement, marker, replay] of [
      ['opening-replay', 'legacy-dialog/dialog-ref.ts', 'new Subject<void>()', 'new ReplaySubject<void>(1)', 'historical opening stream must not replay', true],
      ['before-close-replay', 'legacy-dialog/dialog-ref.ts', 'new Subject<R | undefined>()', 'new ReplaySubject<R | undefined>(1)', 'historical before-close stream must not replay', true],
      ['template-ref-null', 'legacy-dialog/internal/dialog-base.ts', 'cdkRef.componentRef ?? undefined', 'cdkRef.componentRef!', 'historical template component ref', false],
      ['peer-not-bound', 'legacy-dialog/dialog-ref.ts', '    registerLegacyDialogContainerPeer(_containerInstance, _ref);', '    /* peer registration omitted */', 'manual peer registration identity', false],
      ['enabled-backdrop-recaptures', 'legacy-dialog/internal/dialog-container-base.ts', 'if (!this._config.disableClose && owner instanceof DialogRef', 'if (this._config.disableClose && owner instanceof DialogRef', 'enabled backdrop must not trap focus', false],
    ]) {
      const full = 'projects/ngx-material-legacy/' + path, mutant = new Map(proposed); let text = proposed.get(full);
      assert.equal(text.split(needle).length, 2); text = text.replace(needle, replacement);
      if (replay) text = text.replace('import {Observable, Subject,', 'import {Observable, ReplaySubject, Subject,');
      mutant.set(full, text);
      emitDialogConfiguration({model, side: 'candidate', oldProgram: priorProgram, source: {
        ...boundary.configuration.source, sources: mutant, routes: boundary.routes, edges: boundary.edges}});
      const child = run('candidate', 'proposal', 'development');
      assert.equal(child.status, 1, id + ':' + child.error?.code + ':' + child.stderr);
      assert.ok(child.stderr.includes(marker), id + ':' + child.stderr.slice(-6000));
      result.source_faults.push({id, path: full, before_sha256: hash(proposed.get(full)), mutant_sha256: hash(text),
        semantic_source_files: 49, diagnostics: 0, rejected: true, marker, exit_status: child.status});
    }
  }
  const reference = result.runtime_subjects.find(subject => subject.line === 'original' && subject.mode === 'development');
  for (const subject of result.runtime_subjects) {
    const development = result.runtime_subjects.find(row => row.line === subject.line && row.phase === subject.phase && row.mode === 'development');
    assert.deepEqual(subject.observations, development.observations);
    assert.deepEqual(subject.peerRegistrationChecks, development.peerRegistrationChecks);
    assert.equal(subject.observations.length, reference.observations.length);
    for (let index = 0; index < reference.observations.length; index++) if (
      JSON.stringify(reference.observations[index]) !== JSON.stringify(subject.observations[index])) {
      result.tagged_differences_retained.push({line: subject.line, mode: subject.mode,
        tagged: reference.observations[index], current: subject.observations[index]});
    }
  }
  if (proposal) {
    result.proposal = {path: proposalPath, sha256: hash(read(proposalPath))};
    result.proposal_source_members = [...proposed].map(([path, text]) => ({path, sha256: hash(text)}));
    for (const mode of ['development', 'production']) {
      const reference = result.runtime_subjects.find(row => row.phase === 'tagged' && row.mode === mode);
      const before = result.runtime_subjects.find(row => row.phase === 'current' && row.mode === mode);
      const after = result.runtime_subjects.find(row => row.phase === 'proposal' && row.mode === mode);
      const expected = structuredClone(before.observations);
      for (const row of expected) {
        const tagged = reference.observations.find(other => other.kind === row.kind &&
          other.disabled === row.disabled && other.variant === row.variant && other.input === row.input);
        assert.ok(tagged);
        if (row.kind === 'component-lifecycle') {row.lateOpened = tagged.lateOpened; row.lateBeforeClosed = tagged.lateBeforeClosed;}
        if (row.kind === 'template-ownership') {
          row.before.componentRef = tagged.before.componentRef; row.before.componentInstance = tagged.before.componentInstance;
          row.events.find(event => event[0] === 'closed')[3] = tagged.events.find(event => event[0] === 'closed')[3];
          row.lateBeforeClosed = tagged.lateBeforeClosed;
        }
        if (row.kind === 'backdrop-input' && !row.disabled) row.requests = row.requests.filter(request => request !== 'trap-focus');
        if (row.kind === 'manual-actual-container-backdrop') {
          row.focusedAfterInput = tagged.focusedAfterInput;
          row.requests = row.disabled ? tagged.requests : row.requests.filter(request => request !== 'trap-focus');
        }
      }
      assert.deepEqual(after.observations, expected, 'proposal changed behavior beyond the three restored historical contracts');
      assert.deepEqual(after.peerRegistrationChecks, ['component-peer-released', 'template-peer-released', 'manual-peer-released-false', 'manual-peer-released-true']);
    }
  }
  const inputs = new Set(boundary.proof.inputs.map(member => member.path));
  for (const member of result.source_members) inputs.add(member.path);
  for (const path of [boundary.ref.path, 'scripts/dialog-caller-service-default-boundary.mjs',
    'tests/dialog_caller_owned_contract_probe.mjs', 'tests/dialog_caller_owned_contract_subject.mjs']) inputs.add(path);
  if (proposalPath) inputs.add(proposalPath);
  result.inputs = [...inputs].sort().map(path => ({path, sha256: hash(read(path))}));
  result.scope = 'Discovery only:actual owned49-file strict emit on the selected current SDK and untouched genuine tagged16 reference;real Dialog.open,component/template portals,generated test factories/queries,provider/ref/data ownership and real overlay backdrop dispatch. Test container supplies animation events and its focus spies delegate to the actual super implementation. DOM/Renderer2/history and server-platform visibility remain protocols. No legacy leaf template/style/native browser geometry,packed/AOT,SSR,full compiler/Node/peer/RxJS floors or source closures.';
  assert.ok(process.argv[2]);writeFileSync(process.argv[2],JSON.stringify(result,null,2)+'\n',{flag:'wx'});
  console.log(JSON.stringify({line:result.line,contexts:result.runtime_subjects.length,
    cases:result.runtime_subjects.reduce((count,subject)=>count+subject.cases.length,0),differences:result.tagged_differences_retained.length}));
} finally {loaded.dispose();}
