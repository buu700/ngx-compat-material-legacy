/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 * Copyright (c) 2026 Ryan Lester.
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */
/** Genuine public overlay evidence; all48 canonical source obligations stay open. */
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {readFileSync, writeFileSync} from 'node:fs';
import {createRequire} from 'node:module';
import {spawnSync} from 'node:child_process';
import {gunzipSync} from 'node:zlib';
import {join} from 'node:path';
import {currentOverlayCallerFacts} from '../scripts/snack-dom-source-context-review.mjs';
import {prepareOverlayCallerPublicSubjects} from '../scripts/overlay-caller-public-subjects.mjs';
import {installNgZonePublicSubject} from '../scripts/ng-zone-public-subjects.mjs';
import {overlayFactorySource, inspectOverlayCallerPublicMembers} from '../scripts/overlay-caller-public-evidence.mjs';

const root = process.cwd(), read = path => readFileSync(join(root, path));
const hash = bytes => createHash('sha256').update(bytes).digest('hex');
const ts = createRequire(import.meta.url)('typescript');
const referencePath = 'compatibility/rc/overlay-caller-factory-reference.json';
const referenceBytes = read(referencePath);
assert.equal(hash(referenceBytes), '9d80f713351332b3fac375a145f70ccc04191d36cf861e79609de7193d47ccb0');
const references = JSON.parse(referenceBytes);
assert.equal(references.archive_sha256, 'de41309d20b1d98a7fd6d028a7de42853ea2d453a329c7a8815aaf73ea7f365b');
assert.equal(references.subjects.length, 5);
for (const row of references.subjects) {
  const bytes = read(row.path); assert.equal(hash(bytes), row.stored_sha256);
  const original = gunzipSync(bytes); assert.equal(hash(original), row.source_sha256);
  assert.equal(original.length, row.source_bytes);
  const sf = ts.createSourceFile(row.tagged_source, original.toString(), ts.ScriptTarget.Latest, true);
  assert.equal(sf.parseDiagnostics.length, 0);
  const declaration = sf.statements.find(n => ts.isFunctionDeclaration(n) && n.name?.text === row.name);
  assert.equal(declaration.getText(sf), row.declaration);
  if (row.family === 'tooltip') {
    const constant = sf.statements.filter(ts.isVariableStatement).flatMap(n => n.declarationList.declarations)
      .find(n => n.name.getText(sf) === 'SCROLL_THROTTLE_MS');
    assert.equal(constant.initializer.getText(sf), '20');
  }
}
const {prior, facts} = currentOverlayCallerFacts({root});
const factory = overlayFactorySource(root, references);
const loaded = prepareOverlayCallerPublicSubjects(root);
const protocolPath = 'scripts/api-public-node-context.mjs', protocolText = read(protocolPath).toString();
const protocolFile = ts.createSourceFile(protocolPath, protocolText, ts.ScriptTarget.Latest, true);
const nodes = protocolFile.statements.filter(n => ts.isFunctionDeclaration(n) && ['leaf', 'node', 'renderer'].includes(n.name?.text));
assert.equal(nodes.length, 3);
const protocol = nodes.map(n => 'export ' + n.getText(protocolFile)).join('\n');
const result = {schema_version: 1, line: prior.line, node: process.version, typescript: ts.version,
  facts: facts.map(f => ({file: f.file, symbol: f.symbol, source_sha256: f.candidate_source_sha256,
    unused: f.unused_import, tooltip_current_source: !!f.tooltip_product_qualification})),
  factory_sources: factory.provenance, type_subjects: [], runtime_subjects: [], runtime_fault_controls: [], inputs: [],
  canonical_source_closures_integrated: 0, whole_current_caller_source_compiled: false,
  actual_native_packed_AOT_or_full_floor_qualified: false, g11_claim: 'not-passed'};
const transpile = source => ts.transpileModule(source, {compilerOptions: {target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.ESNext}}).outputText;
try {
  for (const model of loaded.models) {
    result.type_subjects.push(inspectOverlayCallerPublicMembers({root, model, facts, factorySource: factory.source}));
    const zone = installNgZonePublicSubject(model, root);
    const factoryPath = join(model.root, 'factories.mjs');
    writeFileSync(factoryPath, transpile(factory.source));
    writeFileSync(join(model.root, 'render-protocol.mjs'), protocol);
    writeFileSync(join(model.root, 'overlay-worker.mjs'), read('tests/overlay_caller_roles_subject.mjs'));
    const execute = (zoneMode, mode) => spawnSync(process.execPath,
      [join(model.root, 'overlay-worker.mjs'), model.line, zoneMode, mode],
      {cwd: model.root, encoding: 'utf8', timeout: 30000, maxBuffer: 1024 * 1024});
    for (const zoneMode of model.line === 'original' ? ['zoneful'] : ['zoneful', 'zoneless']) {
      for (const mode of ['development', 'production']) {
        const child = execute(zoneMode, mode);
        assert.equal(child.status, 0, (child.stdout + '\n' + child.stderr).slice(-6000));
        result.runtime_subjects.push({...JSON.parse(child.stdout.trim().split('\n').at(-1)),
          Core: model.packages.get('@angular/core').version, CDK: model.packages.get('@angular/cdk').version,
          zone_package: zone, borrowed: model.borrowed});
      }
    }
    if (model.line !== 'original') {
      for (const [family, from, to] of [
        ['dialog', '.block()', '.reposition()'],
        ['menu', '.reposition()', '.block()'],
        ['tooltip', 'scrollThrottle: SCROLL_THROTTLE_MS', 'scrollThrottle: 21'],
      ]) {
        const sf = ts.createSourceFile('factories.ts', factory.source, ts.ScriptTarget.Latest, true);
        const declaration = sf.statements.find(n => ts.isFunctionDeclaration(n) && n.name?.text === 'current_' + family);
        const text = declaration.getText(sf); assert.ok(text.includes(from));
        const mutant = factory.source.slice(0, declaration.getStart(sf)) + text.replace(from, to) + factory.source.slice(declaration.end);
        try {
          writeFileSync(factoryPath, transpile(mutant));
          const child = execute('zoneless', 'development');
          assert.equal(child.signal, null, 'mutant timed out');
          assert.notEqual(child.status, 0, family + ' factory mutant escaped');
          assert.match(child.stderr, /AssertionError/);
          result.runtime_fault_controls.push({line: model.line, family, rejected: true});
        } finally {writeFileSync(factoryPath, transpile(factory.source));}
      }
    }
  }
  const expected = result.runtime_subjects.find(r => r.line === 'original' && r.mode === 'development').observations;
  for (const runtime of result.runtime_subjects) assert.deepEqual(runtime.observations, expected, runtime.line + ':' + runtime.zoneMode + ':' + runtime.mode);
  const caps = ['compatibility/rc/material-public-subjects.json', 'compatibility/rc/element-ref-public-subjects.json',
    'compatibility/rc/cdk-module-type-public-subjects.json', 'compatibility/rc/overlay-caller-public-subjects.json',
    'compatibility/rc/ng-zone-public-subjects.json'];
  const paths = new Set([referencePath, ...references.subjects.map(s => s.path), ...caps,
    'scripts/material-public-subjects.mjs', 'scripts/cdk-module-type-public-subjects.mjs', 'scripts/overlay-caller-public-subjects.mjs',
    'scripts/overlay-caller-public-evidence.mjs', 'scripts/overlay-caller-roles.mjs', 'scripts/ng-zone-public-subjects.mjs', protocolPath,
    'scripts/snack-dom-source-context-review.mjs', 'scripts/snack-dom-source-context.mjs',
    'compatibility/rc/snack-dom-source-context-inputs.json', 'compatibility/rc/snack-dom-source-context-product-inputs.json',
    'compatibility/rc/overlay-caller-roles-prior.json.gz', 'tests/overlay_caller_roles_public_probe.mjs', 'tests/overlay_caller_roles_subject.mjs',
    ...prior.sources.map(m => m.path), ...prior.support.map(m => m.path), ...prior.evidence.map(m => m.path)]);
  for (const cap of caps) {
    const body = JSON.parse(read(cap));
    for (const subject of body.subjects) for (const member of subject.members ?? subject.additions ?? []) paths.add(member.path);
    if (body.tagged_original_mixin) paths.add(body.tagged_original_mixin.path);
  }
  result.inputs = [...paths].sort().map(path => ({path, sha256: hash(read(path))}));
  result.scope = 'Preparation only. Five complete owned scroll factories match untouched tagged16 bodies and compile at the original/exact minima. Genuine public createApplication,overlay service,real ComponentPortal/ComponentRef,public position-origin identity,and a public OverlayModule signal-input fixture execute in10 zone/mode contexts. The renderer,server document/window with consistent body/root dimensions,Location subscription and numeric tooltip throttle constant are explicit protocols. Tagged16 inspects body scroll dimensions;the minima inspect root dimensions. Block-class enable/cleanup is a protocol observation,not native scrolling equivalence. Export/member inspection follows only stated lexical receivers,explicit public-overlay casts and single-signature return aliases;it does not qualify cast correctness,all argument-dependent caller overloads,implicit owned method returns,legacy component/module templates,provider metadata,real scrolling/geometry/styles,packed artifacts or floors. All48 canonical overlay rows,all6packed-CVA rows and native/coordinator/audit gates stay open.';
  assert.ok(process.argv[2]);
  writeFileSync(process.argv[2], JSON.stringify(result, null, 2) + '\n', {flag: 'wx'});
  console.log(JSON.stringify({line: prior.line, type_models: result.type_subjects.length,
    consumed_members_per_model: result.type_subjects.map(s => s.members.length),
    runtime_contexts: result.runtime_subjects.length, runtime_cases: result.runtime_subjects.reduce((n, r) => n + r.cases.length, 0),
    runtime_fault_controls: result.runtime_fault_controls.length, canonical_closures: 0}));
} finally {loaded.dispose();}
