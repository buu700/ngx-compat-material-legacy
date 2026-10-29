/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 * Copyright (c) 2026 Ryan Lester.
 * Use of this source code is governed by the MIT license in LICENSE.
 */
/** Compile actual owned ref/container-base sources against the actual supported public peer. */
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {readFileSync, writeFileSync} from 'node:fs';
import {createRequire} from 'node:module';
import {join, relative, resolve} from 'node:path';
import {fileURLToPath} from 'node:url';

const root = process.cwd(), prefix = 'compatibility/rc/21x-base-class-removal-source-';
const require = createRequire(import.meta.url), ts = require('typescript');
const hash = raw => createHash('sha256').update(raw).digest('hex'), bound = new Map();
function readBound(path, expected) {
  const absolute = resolve(root, path), raw = readFileSync(absolute);
  if (expected) assert.equal(hash(raw), expected, path);
  const ref = {path: relative(root, absolute), sha256: hash(raw), bytes: raw.length};
  if (bound.has(absolute)) assert.deepEqual(bound.get(absolute), ref);
  else bound.set(absolute, ref);
  return raw;
}
assert.equal(process.version, 'v24.21.0'); assert.equal(ts.version, '5.9.2');
readBound(fileURLToPath(import.meta.url)); readBound(require.resolve('typescript'));
const prior = JSON.parse(readBound(prefix + 'snack-reference-qualified.json'));
for (const ref of prior.source_bindings) assert.equal(readBound(ref.path, ref.sha256).length, ref.bytes);
readBound('tsconfig.json');
const intro = `import {OverlayRef} from '@angular/cdk/overlay';
import {MatSnackBarRef as PeerRef} from '@angular/material/snack-bar';
import {MatSnackBarRef as OwnedRef} from '../../projects/ngx-material-legacy/legacy-snack-bar/internal/snack-bar-ref';
import {_MatSnackBarContainerBase as OwnedContainer} from '../../projects/ngx-material-legacy/legacy-snack-bar/internal/snack-bar-container-base';
interface Content {message: string}
declare const container: OwnedContainer;
declare const overlay: OverlayRef;
declare const owned: OwnedRef<Content>;
`;
const cases = [
  {id: 'owned-historical-construction', body: 'const ref: OwnedRef<Content> = new OwnedRef<Content>(container, overlay);', code: null},
  {id: 'historical-reference-operation-surface', body: `type Surface = Pick<PeerRef<Content>,
    'instance'|'dismiss'|'dismissWithAction'|'closeWithAction'|'afterDismissed'|'afterOpened'|'onAction'>;
    const reference: Surface = owned;`, code: null},
  {id: 'modern-constructor-rejects-owned-container', body: 'new PeerRef<Content>(container, overlay);', code: 2345},
  {id: 'owned-reference-is-not-modern-nominal-subtype', body: 'const reference: PeerRef<Content> = owned;', code: 2322},
];
const options = {strict: true, strictPropertyInitialization: false, experimentalDecorators: true,
  skipLibCheck: false, noEmit: true, types: [], target: ts.ScriptTarget.ES2022,
  module: ts.ModuleKind.ESNext, moduleResolution: ts.ModuleResolutionKind.Bundler,
  lib: ['lib.es2022.d.ts', 'lib.dom.d.ts'], noErrorTruncation: true};
const receipts = [];
for (const cell of cases) {
  const path = join(root, prefix + 'virtual-snack-' + cell.id + '.ts'), text = intro + cell.body;
  const host = ts.createCompilerHost(options), actualRead = host.readFile.bind(host), actualExists = host.fileExists.bind(host);
  host.readFile = file => resolve(file) === path ? text : actualRead(file);
  host.fileExists = file => resolve(file) === path || actualExists(file);
  host.getSourceFile = (file, languageVersion) => {
    const body = host.readFile(file); return body === undefined ? undefined : ts.createSourceFile(file, body, languageVersion, true);
  };
  host.writeFile = () => assert.fail('No compiler output allowed');
  const start = performance.now(), program = ts.createProgram([path], options, host);
  const diagnostics = ts.getPreEmitDiagnostics(program).map(d => ({code: d.code,
    file: d.file ? relative(root, d.file.fileName) : null,
    message: ts.flattenDiagnosticMessageText(d.messageText, '\n')}));
  if (cell.code === null) assert.deepEqual(diagnostics, [], JSON.stringify(diagnostics));
  else {
    assert.equal(diagnostics.length, 1, JSON.stringify(diagnostics));
    assert.equal(diagnostics[0].code, cell.code, JSON.stringify(diagnostics));
    assert.equal(diagnostics[0].file, relative(root, path));
    assert.match(diagnostics[0].message, cell.id === 'modern-constructor-rejects-owned-container'
      ? /Type '_MatSnackBarContainerBase' is missing the following properties from type 'MatSnackBarContainer':.*_label/
      : /separate declarations of a private property/);
  }
  for (const source of program.getSourceFiles()) if (resolve(source.fileName) !== path) {
    assert.equal(readBound(source.fileName).toString(), source.text);
  }
  receipts.push({id: cell.id, expected_result: cell.code === null ? 'pass' : 'nominal-incompatibility',
    seconds: (performance.now() - start) / 1000, virtual_consumer: text, consumer_sha256: hash(text), diagnostics});
}
for (const [path, ref] of bound) {
  const raw = readFileSync(path); assert.equal(raw.length, ref.bytes); assert.equal(hash(raw), ref.sha256);
}
const report = {schema_version: 1, line: '21.x', sha: prior.sha, node: process.version,
  typescript: ts.version, versions: prior.versions, options, cells: receipts,
  positive_compiler_cells: 2, expected_nominal_incompatibility_cells: 2,
  scope: 'Actual owned reference and abstract container-base sources compiled against actual public minimum declarations;only consumer files are virtual. Strict property initialization follows existing workspace policy;skipLibCheck is false. No Angular template/AOT compilation,generated factory,node DI,native style/motion,packed or consumer build.',
  decision: 'Keep the historical owned reference/container and its original operation surface. Deliberately accept loss of modern reference nominal/subtype assignment:using the modern constructor with the actual owned container is rejected by its own public types. Preserve historical content DI token lookup separately through the proposed local public-token provider bridge.',
  product_changes: 0, canonical_dispositions_changed: 0, exceptions_changed: 0,
  whole_SHA_substantive_review_complete: false, actual_native_packed_browser_floor_or_full_audit_qualified: false,
  g11_claim: 'not-passed', source_bindings: [...bound.values()]};
writeFileSync(prefix + 'snack-reference-types-qualified.json', JSON.stringify(report, null, 2) + '\n', {flag: 'wx'});
console.log(JSON.stringify({result: 'snack-reference-minimum-types-qualified', positive_compiler_cells: 2,
  nominal_incompatibilities_reproduced: 2, product_changes: 0, whole_SHA_qualified: false}));
