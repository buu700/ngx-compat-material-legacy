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
import {overlayContractSource, prepareOverlayContractSubjects, compileOverlayContractSource, inspectActualOverlayCalls, inspectOverlayStrategyProvenance} from '../scripts/overlay-caller-contracts.mjs';
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
const source = overlayContractSource({root});
const {prior, facts} = source;
const factory = overlayFactorySource(root, references);
const loaded = prepareOverlayContractSubjects(root);
const protocolPath = 'scripts/api-public-node-context.mjs', protocolText = read(protocolPath).toString();
const protocolFile = ts.createSourceFile(protocolPath, protocolText, ts.ScriptTarget.Latest, true);
const nodes = protocolFile.statements.filter(n => ts.isFunctionDeclaration(n) && ['leaf', 'node', 'renderer'].includes(n.name?.text));
assert.equal(nodes.length, 3);
const protocol = nodes.map(n => 'export ' + n.getText(protocolFile)).join('\n');
const result = {schema_version: 1, line: prior.line, node: process.version, typescript: ts.version,
  facts: facts.map(f => ({file: f.file, symbol: f.symbol, source_sha256: f.candidate_source_sha256,
    unused: f.unused_import, tooltip_current_source: !!f.tooltip_product_qualification})),
  factory_sources: factory.provenance, whole_caller_subjects: [], source_fault_controls: [], type_subjects: [], runtime_subjects: [], runtime_fault_controls: [], inputs: [],
  canonical_source_closures_integrated: 0, whole_current_caller_source_compiled: true,
  actual_native_packed_AOT_or_full_floor_qualified: false, g11_claim: 'not-passed'};
const transpile = source => ts.transpileModule(source, {compilerOptions: {target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.ESNext}}).outputText;
try {
  for (const model of loaded.models) {
    result.type_subjects.push(inspectOverlayCallerPublicMembers({root, model, facts, factorySource: factory.source}));
    if (model.line === prior.line) {
      const compiled = compileOverlayContractSource({model, source});
      result.whole_caller_subjects.push(compiled.report);
      const path = 'projects/ngx-material-legacy/legacy-tooltip/internal/tooltip-base.ts';
      const original = source.sources.get(path), target = join(model.root, path);
      const controls = [
        ['invalid-source-overlay-width', 'this._overlayRef = this._overlay.create({', 'this._overlayRef = this._overlay.create({width: false,'],
        ['private-position-visibility', 'const overlayElement = this._overlayRef?.overlayElement;', 'const forbidden = change.scrollableViewProperties; const overlayElement = this._overlayRef?.overlayElement;'],
        ['wrong-strategy-provenance', 'positionStrategy: strategy,', 'positionStrategy: this._overlay.position().global(),'],
      ];
      for (const [id, from, to] of controls) {
        assert.ok(original.includes(from));
        try {
          writeFileSync(target, original.replace(from, to));
          const program = ts.createProgram(compiled.roots, compiled.options), diagnostics = ts.getPreEmitDiagnostics(program);
          if (id === 'invalid-source-overlay-width') assert.ok(diagnostics.some(d => d.file?.fileName === target && [2322,2345].includes(d.code)));
          else {
            assert.equal(diagnostics.length, 0, 'fault must remain type-correct to exercise the policy/provenance guard');
            if (id === 'private-position-visibility') assert.throws(() => inspectActualOverlayCalls({program, roots: compiled.roots, model}), /unstable actual overlay member/);
            else assert.throws(() => inspectOverlayStrategyProvenance({program, model}), /wrong position-strategy construction provenance/);
          }
          result.source_fault_controls.push({line: model.line, id, rejected: true});
        } finally {writeFileSync(target, original);}
      }
    }
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
    'compatibility/rc/ng-zone-public-subjects.json', 'compatibility/rc/overlay-caller-contract-sdk.json'];
  const paths = new Set([referencePath, ...references.subjects.map(s => s.path), ...caps,
    'scripts/material-public-subjects.mjs', 'scripts/cdk-module-type-public-subjects.mjs', 'scripts/overlay-caller-public-subjects.mjs',
    'scripts/overlay-caller-public-evidence.mjs', 'scripts/overlay-caller-roles.mjs', 'scripts/ng-zone-public-subjects.mjs', protocolPath,
    'scripts/overlay-caller-contracts.mjs', 'compatibility/rc/overlay-caller-contract-inputs.json',
    'compatibility/rc/overlay-caller-roles-prior.json.gz', 'tests/overlay_caller_contracts_public_probe.mjs', 'tests/overlay_caller_roles_subject.mjs',
    ...source.capture.sources.map(m => m.path), ...source.capture.self_package_routes.map(m => m.path), ...prior.support.map(m => m.path), ...prior.evidence.map(m => m.path)]);
  for (const cap of caps) {
    const body = JSON.parse(read(cap));
    for (const subject of body.subjects) for (const member of subject.members ?? subject.additions ?? []) paths.add(member.path);
    if (body.tagged_original_mixin) paths.add(body.tagged_original_mixin.path);
  }
  result.inputs = [...paths].sort().map(path => ({path, sha256: hash(read(path))}));
  result.scope = 'Bounded named overlay contract evidence. The selected minimum strictly compiles145 unchanged owned source files through actual ng-package public entry files,with no SDK/source rewrites,emit or AOT. It resolves104 actual overlay overloads and142 member accesses against genuine declarations;private,deprecated and planned-removal surfaces reject. Five position-strategy casts have owned-construction provenance,with an independently type-correct wrong-strategy fault control. Actual-source invalid-width and private-visibility controls also reject. Five complete owned/tagged factory pairs compile on all3 SDK subjects;public createApplication,Overlay,ComponentPortal and OverlayModule signal-input fixtures execute10 zone/mode contexts and160 protocol cases with6 runtime source faults. The renderer,server document/window dimensions,Location subscription and numeric tooltip throttle constant are explicit protocols. Tagged16 checks body scroll dimensions;the minima check root dimensions. No whole-component/native scrolling,geometry,styles,motion,CSP,packed/AOT/provider metadata,external fabricated refs/subclass overrides,consumer/compiler/Node/RxJS/peer floors or G01-G13 pass is inferred. Current source is not backcompiled to the historical SDK. No mutable shared-owner registry or historical source projection is a proof input. Canonical integration and independent audits remain separate.';
  assert.ok(process.argv[2]);
  writeFileSync(process.argv[2], JSON.stringify(result, null, 2) + '\n', {flag: 'wx'});
  console.log(JSON.stringify({line: prior.line, type_models: result.type_subjects.length,
    consumed_members_per_model: result.type_subjects.map(s => s.members.length),
    runtime_contexts: result.runtime_subjects.length, runtime_cases: result.runtime_subjects.reduce((n, r) => n + r.cases.length, 0),
    runtime_fault_controls: result.runtime_fault_controls.length, source_fault_controls: result.source_fault_controls.length, whole_source_files: result.whole_caller_subjects[0].source_files, canonical_closures: 0}));
} finally {loaded.dispose();}
