/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 * Copyright (c) 2026 Ryan Lester.
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */
/** Exact four-source contract repair; historical inputs cannot admit a raw before frame. */
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {createRequire} from 'node:module';
import {gunzipSync} from 'node:zlib';
import {join} from 'node:path';
import {dialogTitleProductSubject} from './dialog-title-source-context.mjs';
import {dialogTitlePriorMetadataRead} from './snack-dom-source-context.mjs';
import {inspectDialogServiceDefaults} from './dialog-caller-service-default-boundary.mjs';
import {componentConfigGraph} from './component-config-caller-contracts.mjs';
const ts = createRequire(import.meta.url)('typescript');
const hash = value => createHash('sha256').update(value).digest('hex');
const proposalPath = 'compatibility/rc/dialog-caller-owned-contract-candidate.json';
const pins = {
  main: {proposal: '8b2549fb509f47ee1731de5afe33304bc0e200e5708d2151429eb916fec3f14e',
    runtime: {path: 'compatibility/rc/dialog-caller-owned-contract-runtime-main.json',
      sha256: '46ad2542a518ff4b1960c63b2c5e5b36217395b183eccea1f04ff28d42476ee3'}},
  '21.x': {proposal: '0405747e4210b088c559df078008f0cfdac3f36321f7cac33eff0ffe7a3f0245',
    runtime: {path: 'compatibility/rc/dialog-caller-owned-contract-runtime-21.json',
      sha256: '9cfd6b57b0da8e3ad6e66b4deaf83b85fe1998fd0c84aa7fa7c9611b0ac8342c'}},
};
const prefix = 'projects/ngx-material-legacy/';
const paths = ['legacy-dialog/dialog-ref.ts', 'legacy-dialog/internal/dialog-base.ts',
  'legacy-dialog/internal/dialog-container-state.ts', 'legacy-dialog/internal/dialog-container-base.ts'].map(path => prefix + path);
const snapshot = sources => [...sources].map(([path, text]) => ({path, sha256: hash(text)}));

function classSurface(beforeText, afterText, name, bodies, properties = new Map()) {
  const parse = text => ts.createSourceFile(name + '.ts', text, ts.ScriptTarget.Latest, true);
  const before = parse(beforeText), after = parse(afterText);
  const type = source => source.statements.find(node => ts.isClassDeclaration(node) && node.name?.text === name);
  assert.equal(before.parseDiagnostics.length, 0); assert.equal(after.parseDiagnostics.length, 0);
  const a = type(before), b = type(after); assert.ok(a && b); assert.equal(a.members.length, b.members.length);
  for (let index = 0; index < a.members.length; index++) {
    const old = a.members[index], current = b.members[index];
    const key = ts.isConstructorDeclaration(old) ? 'constructor' : old.name?.getText(before);
    assert.equal(key, ts.isConstructorDeclaration(current) ? 'constructor' : current.name?.getText(after));
    if (properties.has(key)) {
      assert.equal(old.getText(before), properties.get(key)[0]); assert.equal(current.getText(after), properties.get(key)[1]);
    } else if (bodies.includes(key) && old.body) {
      assert.ok(current.body);
      assert.equal(current.getText(after).slice(0, current.body.getStart(after) - current.getStart(after)),
        old.getText(before).slice(0, old.body.getStart(before) - old.getStart(before)), 'changed dialog member signature');
    } else assert.equal(current.getText(after), old.getText(before), 'changed unrelated dialog member ' + key);
  }
}

export function inspectDialogOwnedContracts({root = process.cwd(), read = path => readFileSync(join(root, path)),
  requireApplied = false} = {}) {
  const bytes = read(proposalPath), line = Object.keys(pins).find(key => hash(bytes) === pins[key].proposal);
  assert.ok(line, 'changed owned dialog contract proposal');
  const actualRead=read,title=dialogTitleProductSubject({root,read:actualRead,line});
  // Private historical comparisons remain owned by the canonical source owner.
  read=dialogTitlePriorMetadataRead({root,read:actualRead});
  const proposal = JSON.parse(bytes); assert.equal(proposal.line, line);
  assert.deepEqual(proposal.members.map(member => member.path), paths);
  const preimages = new Map(), proposed = new Map(), phases = new Set();
  for (const member of proposal.members) {
    for (const side of ['before', 'after']) {
      assert.equal(hash(member[side].text), member[side].sha256);
      assert.equal(Buffer.byteLength(member[side].text), member[side].bytes);
    }
    const digest = hash(read(member.path));
    assert.ok([member.before.sha256, member.after.sha256].includes(digest), 'unqualified raw dialog contract source ' + member.path);
    phases.add(digest === member.after.sha256 ? 'after' : 'before');
    preimages.set(member.path, Buffer.from(member.before.text)); proposed.set(member.path, member.after.text);
  }
  assert.equal(phases.size, 1, 'partially applied dialog contract repair');
  const applied = phases.has('after'); if (requireApplied) assert.equal(applied, true, 'dialog contract repair not applied');
  // Four fixed preimages belong only to immutable earlier evidence, never raw admission.
  const evidenceRead = path => preimages.has(path) ? Buffer.from(preimages.get(path)) : read(path);
  const defaults = inspectDialogServiceDefaults({root, read: evidenceRead, requireApplied: true});
  const ref = pins[line].runtime, rawProof = read(ref.path); assert.equal(hash(rawProof), ref.sha256);
  const proof = JSON.parse(rawProof);
  assert.equal(proof.line, line); assert.equal(proof.discovery_only, true); assert.equal(proof.source_closures, 0);
  assert.equal(proof.actual_native_packed_AOT_or_full_floor_qualified, false); assert.equal(proof.g11_claim, 'not-passed');
  assert.deepEqual(proof.source_boundary, defaults.ref);
  assert.deepEqual(proof.proposal, {path: proposalPath, sha256: hash(bytes)});
  assert.equal(proof.inputs.length, 561); const inputs = new Map();
  for (const input of proof.inputs) {
    assert.equal(inputs.has(input.path), false); inputs.set(input.path, input.sha256);
    assert.equal(hash(evidenceRead(input.path)), input.sha256, 'changed owned dialog contract evidence input ' + input.path);
  }
  assert.deepEqual(proof.source_members, snapshot(defaults.proposed_sources));
  const modelRead = path => proposed.has(path) ? Buffer.from(proposed.get(path)) : read(path);
  const graph = componentConfigGraph({root, read: modelRead, selected: defaults.configuration.source.prior.selected});
  assert.equal(graph.sources.size, 49); assert.deepEqual(snapshot(graph.sources), proof.proposal_source_members);
  assert.deepEqual([...graph.routes], [...defaults.routes]);
  if (applied) for (const member of proof.proposal_source_members) {
    assert.equal(hash(read(member.path)), member.sha256, 'changed raw applied dialog contract graph');
  }
  classSurface(preimages.get(paths[0]).toString(), proposed.get(paths[0]), 'MatLegacyDialogRef', ['constructor'], new Map([
    ['componentRef', ['readonly componentRef: ComponentRef<T> | null;', 'readonly componentRef: ComponentRef<T> | null | undefined;']],
    ['_afterOpened', ['private readonly _afterOpened = new ReplaySubject<void>(1);', 'private readonly _afterOpened = new Subject<void>();']],
    ['_beforeClosed', ['private readonly _beforeClosed = new ReplaySubject<R | undefined>(1);', 'private readonly _beforeClosed = new Subject<R | undefined>();']],
  ]));
  classSurface(preimages.get(paths[1]).toString(), proposed.get(paths[1]), '_MatDialogBase', ['open']);
  classSurface(preimages.get(paths[3]).toString(), proposed.get(paths[3]), '_MatDialogContainerBase', ['_contentAttached', '_recaptureFocus']);
  const sdkDeclarations = [];
  for (const input of proof.inputs.filter(member => member.path.endsWith('.gz'))) {
    const text = gunzipSync(read(input.path)).toString();
    if (!text.includes('class DialogRef<') || !text.includes('disableClose: boolean')) continue;
    const source = ts.createSourceFile('dialog.d.ts', text, ts.ScriptTarget.Latest, true);
    const declaration = source.statements.find(node => ts.isClassDeclaration(node) && node.name?.text === 'DialogRef');
    const field = declaration?.members.find(node => node.name?.getText(source) === 'disableClose'); assert.ok(field);
    assert.equal(field.modifiers?.some(node => [ts.SyntaxKind.PrivateKeyword, ts.SyntaxKind.ProtectedKeyword].includes(node.kind)) ?? false, false);
    assert.deepEqual(ts.getJSDocTags(field).map(tag => tag.tagName.text), []);
    sdkDeclarations.push(input);
  }
  assert.equal(sdkDeclarations.length, 3, 'missing public peer disableClose declarations');
  assert.deepEqual(proof.semantic_programs, [{phase: 'current', source_files: 49, diagnostics: 0},
    {phase: 'proposal', source_files: 49, diagnostics: 0}]);
  assert.equal(proof.runtime_subjects.length, 6); const contexts = new Map(), differences = [];
  const versions = {original: ['16.2.12', '16.2.14'], main: ['22.1.7', '22.1.7'], '21.x': ['21.2.23', '21.2.14']};
  for (const context of proof.runtime_subjects) {
    const key = context.phase + ':' + context.mode, tagged = context.phase === 'tagged';
    assert.equal(contexts.has(key), false); contexts.set(key, context);
    assert.equal(context.line, tagged ? 'original' : line); assert.deepEqual([context.Core, context.Material], versions[context.line]);
    assert.equal(context.cases.length, 27); assert.equal(new Set(context.cases).size, 27);
    assert.equal(context.observations.length, 22); assert.equal(context.genuine_public_Dialog_open, true);
    assert.equal(context.actual_owned_source_files, tagged ? 0 : 49);
    assert.equal(context.generated_test_subclass_factories_and_queries_executed, true);
    assert.equal(context.test_focus_overrides_delegate_to_actual_super, true);
    assert.equal(context.manual_ref_uses_genuine_public_DialogRef, true);
    assert.equal(context.manual_OverlayRef_and_animation_container_are_protocols, true);
    assert.equal(context.legacy_leaf_factories_templates_or_styles_executed, false);
    assert.equal(context.actual_native_packed_AOT_or_full_floor_qualified, false);
    assert.equal(context.taggedLegacyRefIdentity, tagged ? false : null);
    for (const [name, version] of [['rxjs', '7.8.2'], ['tslib', '2.8.1'], ['zone.js', '0.16.3']]) assert.equal(context.borrowed[name].version, version);
  }
  for (const mode of ['development', 'production']) {
    const tagged = contexts.get('tagged:' + mode), before = contexts.get('current:' + mode), after = contexts.get('proposal:' + mode);
    assert.ok(tagged && before && after); const expected = structuredClone(before.observations);
    for (const row of expected) {
      const reference = tagged.observations.find(other => other.kind === row.kind && other.disabled === row.disabled &&
        other.variant === row.variant && other.input === row.input); assert.ok(reference);
      if (row.kind === 'component-lifecycle') {
        assert.deepEqual(reference.lateOpened, ['complete']); assert.deepEqual(reference.lateBeforeClosed, ['complete']);
        row.lateOpened = reference.lateOpened; row.lateBeforeClosed = reference.lateBeforeClosed;
      }
      if (row.kind === 'template-ownership') {
        assert.deepEqual(reference.before.componentRef, {kind: 'undefined'});
        row.before.componentRef = reference.before.componentRef; row.before.componentInstance = reference.before.componentInstance;
        row.events.find(event => event[0] === 'closed')[3] = reference.events.find(event => event[0] === 'closed')[3];
        row.lateBeforeClosed = reference.lateBeforeClosed;
      }
      if (row.kind === 'backdrop-input' && !row.disabled) row.requests = row.requests.filter(request => request !== 'trap-focus');
      if (row.kind === 'manual-actual-container-backdrop') {
        row.focusedAfterInput = reference.focusedAfterInput;
        row.requests = row.disabled ? reference.requests : row.requests.filter(request => request !== 'trap-focus');
      }
    }
    assert.deepEqual(after.observations, expected, 'unreviewed dialog behavior change');
    assert.deepEqual(after.peerRegistrationChecks, ['component-peer-released', 'template-peer-released', 'manual-peer-released-false', 'manual-peer-released-true']);
  }
  for (const phase of ['tagged', 'current', 'proposal']) {
    const development = contexts.get(phase + ':development'), production = contexts.get(phase + ':production');
    assert.deepEqual(production.observations, development.observations);
    const reference = contexts.get('tagged:development');
    for (const subject of [development, production]) for (let index = 0; index < reference.observations.length; index++) if (
      JSON.stringify(subject.observations[index]) !== JSON.stringify(reference.observations[index])) {
      differences.push({line: subject.line, mode: subject.mode, tagged: reference.observations[index], current: subject.observations[index]});
    }
  }
  assert.equal(differences.length, 52); assert.deepEqual(proof.tagged_differences_retained, differences);
  assert.deepEqual(proof.source_faults.map(fault => fault.id), ['opening-replay', 'before-close-replay', 'template-ref-null', 'peer-not-bound', 'enabled-backdrop-recaptures']);
  for (const fault of proof.source_faults) {
    assert.equal(fault.before_sha256, hash(proposed.get(fault.path))); assert.notEqual(fault.mutant_sha256, fault.before_sha256);
    assert.equal(fault.semantic_source_files, 49); assert.equal(fault.diagnostics, 0); assert.equal(fault.rejected, true); assert.equal(fault.exit_status, 1);
  }
  const currentGraph=componentConfigGraph({root,read:actualRead,selected:defaults.configuration.source.prior.selected});
  assert.deepEqual(snapshot(currentGraph.sources),snapshot(graph.sources).map(member=>title.qualify(member)??member));
  assert.deepEqual([...currentGraph.routes],[...graph.routes]);
  const historicalTargets=proposal.members.map(member=>({path:member.path,before_sha256:member.before.sha256,sha256:member.after.sha256,bytes:member.after.bytes}));
  title.assertCurrent();
  return {line, raw_product_applied: applied, targets:historicalTargets.map(member=>title.qualify(member)??member),historical_targets:historicalTargets,preimages,
    proposed_sources:currentGraph.sources,routes:currentGraph.routes,edges:currentGraph.edges,defaults,proof,ref,sdkDeclarations,
    title_source_requalification:{current_sources:title.bound.filter(member=>member.path.startsWith(prefix)),historical_receipts_remain_before_title:true,current_raw_graph_members:currentGraph.sources.size,current_native_or_packed_or_full_source_qualified:false},
    defaults_are_historical_for_title_sources:true,
    class_signatures_unchanged_except_componentRef: true, source_closures: 0,
    actual_native_packed_AOT_or_full_floor_qualified: false};
}
