/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 * Copyright (c) 2026 Ryan Lester.
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */
/** Complete affected overlay consumers, including the actual public testing opener. */
import assert from 'node:assert/strict';
import {readFileSync, writeFileSync, mkdirSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {createRequire} from 'node:module';
import {join, dirname} from 'node:path';
import {inspectDialogConfigBoundary} from '../scripts/dialog-caller-config-boundary.mjs';
import {componentConfigGraph} from '../scripts/component-config-caller-contracts.mjs';
import {prepareDialogCallerPublicSubjects} from '../scripts/dialog-caller-public-subjects.mjs';
const root = process.cwd(), read = path => readFileSync(join(root, path));
const hash = value => createHash('sha256').update(value).digest('hex');
const ts = createRequire(import.meta.url)('typescript'), q = inspectDialogConfigBoundary({root});
const extra = ['legacy-dialog/testing/dialog-opener-base.ts', 'legacy-dialog/testing/dialog-opener.ts'];
const selected = [...q.source.prior.selected, ...extra.map(file => ({original_row: {file}}))];
const beforeRead = path => q.preimages.has(path) ? Buffer.from(q.preimages.get(path)) : read(path);
const afterRead = path => q.proposed_sources.has(path) ? Buffer.from(q.proposed_sources.get(path)) : read(path);
const before = componentConfigGraph({root, selected, read: beforeRead});
const after = componentConfigGraph({root, selected, read: afterRead});
assert.equal(after.sources.size, 51);
assert.deepEqual([...after.sources.keys()], [...before.sources.keys()]);
assert.deepEqual(after.metadata, before.metadata);
assert.deepEqual([...after.sources.keys()].filter(path => !q.proposed_sources.has(path)).sort(),
  extra.map(file => 'projects/ngx-material-legacy/' + file).sort());
const loaded = prepareDialogCallerPublicSubjects(root);
try {
  const model = loaded.models.find(model => model.line === q.line);
  assert.ok(model);
  const options = {target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.ESNext,
    moduleResolution: ts.ModuleResolutionKind.Bundler, experimentalDecorators: true,
    strict: true, strictPropertyInitialization: false, noImplicitOverride: true,
    skipLibCheck: false, types: [], paths: Object.fromEntries([...after.routes].map(([specifier, path]) =>
      [specifier, [join(model.root, path)]]))};
  const subjects = [], emitted = new Map();
  for (const [side, graph] of [['before', before], ['candidate', after]]) {
    const roots = [];
    for (const [path, text] of graph.sources) {
      const target = join(model.root, path); mkdirSync(dirname(target), {recursive: true});
      writeFileSync(target, text); roots.push(target);
    }
    const fixture = join(model.root, 'dialog-opener-consumer.ts');
    writeFileSync(fixture, `
import {MatTestLegacyDialogOpener} from './projects/ngx-material-legacy/legacy-dialog/testing/dialog-opener';
import {MatLegacyDialogConfig} from './projects/ngx-material-legacy/legacy-dialog/dialog-config';
MatTestLegacyDialogOpener.withComponent(class {}, Object.assign(new MatLegacyDialogConfig(), {autoFocus:false,enterAnimationDuration:'25ms'}));
MatTestLegacyDialogOpener.withComponent(class {}, Object.assign(new MatLegacyDialogConfig(), {autoFocus:true,exitAnimationDuration:'0ms'}));
`);
    roots.push(fixture);
    const program = ts.createProgram(roots, options), diagnostics = ts.getPreEmitDiagnostics(program);
    assert.equal(diagnostics.length, 0, ts.formatDiagnostics(diagnostics, {getCanonicalFileName: path => path,
      getCurrentDirectory: () => model.root, getNewLine: () => '\n'}));
    const outputs = new Map();
    const result = program.emit(undefined, (path, text) => outputs.set(path.slice(model.root.length + 1), text));
    assert.equal(result.emitSkipped, false); assert.equal(result.diagnostics.length, 0);
    emitted.set(side, outputs);
    const negative = join(model.root, 'invalid-dialog-opener.ts');
    writeFileSync(negative, `
import {MatTestLegacyDialogOpener} from './projects/ngx-material-legacy/legacy-dialog/testing/dialog-opener';
MatTestLegacyDialogOpener.withComponent(class {}, {ariaModal:true,autoFocus:42});
MatTestLegacyDialogOpener.withComponent(class {}, {ariaModal:true,enterAnimationDuration:123});
`);
    const invalid = ts.getPreEmitDiagnostics(ts.createProgram([...roots, negative], {...options, noEmit: true}));
    assert.equal(invalid.length, 2);
    assert.ok(invalid.every(diagnostic => diagnostic.file?.fileName === negative && diagnostic.code === 2322));
    subjects.push({side, strict: true, strictPropertyInitialization: false, noImplicitOverride: true,
      skipLibCheck: false, source_files: 51, diagnostics: 0, emitted_source_files: 51, invalid_type_controls: 2});
  }
  const invariant = extra.map(file => 'projects/ngx-material-legacy/' + file.replace(/\.ts$/, '.js'));
  for (const path of invariant) {assert.ok(emitted.get('candidate').has(path));
    assert.equal(emitted.get('candidate').get(path), emitted.get('before').get(path));}
  const inputs = new Set(['tests/dialog_caller_config_overlay_type_probe.mjs',
    'compatibility/rc/dialog-caller-public-subjects.json', q.types.ref.path, q.qualification.path,
    ...after.metadata.map(member => member.path)]);
  for (const subject of JSON.parse(read('compatibility/rc/dialog-caller-public-subjects.json')).subjects)
    for (const member of subject.additions) inputs.add(member.path);
  const report = {schema_version: 1, line: q.line, node: process.version, typescript: ts.version,
    Core: model.packages.get('@angular/core').version, Material: model.packages.get('@angular/material').version,
    type_boundary: q.types.ref, runtime_boundary: q.qualification, candidate: q.types.proof.candidate,
    subjects, candidate_source_members: [...after.sources].map(([path, text]) =>
      ({path, sha256: hash(text), bytes: Buffer.byteLength(text)})), metadata: after.metadata,
    additional_sources: extra.map(file => 'projects/ngx-material-legacy/' + file),
    additional_emitted_JS_identical_before_candidate: invariant,
    inputs: [...inputs].sort().map(path => ({path, sha256: hash(read(path))})),
    SDK_source_rewrites: false, current_source_on_other_SDK: false,
    source_closures: 0, actual_native_packed_AOT_or_full_floor_qualified: false, g11_claim: 'not-passed'};
  assert.ok(process.argv[2]);
  writeFileSync(process.argv[2], JSON.stringify(report, null, 2) + '\n', {flag: 'wx'});
  console.log(JSON.stringify({line: q.line, source_files: 51, subjects: 2, diagnostics: 0,
    additional_emitted_JS_identical: 2, invalid_controls: 4, source_closures: 0}));
} finally {loaded.dispose();}
