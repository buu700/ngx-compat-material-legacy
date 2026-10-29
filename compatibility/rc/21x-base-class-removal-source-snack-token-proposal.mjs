/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 * Copyright (c) 2026 Ryan Lester.
 * Use of this source code is governed by the MIT license in LICENSE.
 */
/** Concrete unapplied content-injector token bridge; actual source typecheck without emit. */
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {readFileSync, writeFileSync} from 'node:fs';
import {createRequire} from 'node:module';
import {relative, resolve} from 'node:path';
import {fileURLToPath} from 'node:url';
import {spawnSync} from 'node:child_process';

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
const prior = JSON.parse(readBound(prefix + 'snack-reference-types-qualified.json'));
for (const ref of prior.source_bindings) assert.equal(readBound(ref.path, ref.sha256).length, ref.bytes);
const path = 'projects/ngx-material-legacy/legacy-snack-bar/internal/snack-bar-base.ts';
const before = readBound(path).toString();
const oldImport = 'MAT_SNACK_BAR_DEFAULT_OPTIONS, MatSnackBarConfig}';
const newImport = 'MAT_SNACK_BAR_DEFAULT_OPTIONS, MatSnackBarConfig, MatSnackBarRef as PeerMatSnackBarRef}';
const provider = '{provide: MatSnackBarRef, useValue: snackBarRef},';
const oldNotice = ' * Copyright Google LLC All Rights Reserved.\n';
const newNotice = oldNotice + ' * Copyright (c) 2026 Ryan Lester.\n';
assert.equal(before.split(oldImport).length, 2); assert.equal(before.split(provider).length, 2);
assert.equal(before.split(oldNotice).length, 2); assert.ok(!before.includes(newNotice));
const candidate = before.replace(oldNotice, newNotice).replace(oldImport, newImport).replace(provider,
  provider + '\n        // Material 16 exposed this same reference through both public entry points.\n' +
  '        {provide: PeerMatSnackBarRef, useValue: snackBarRef},');
assert.equal(candidate.replace(newNotice, oldNotice).replace(newImport, oldImport).replace(
  provider + '\n        // Material 16 exposed this same reference through both public entry points.\n' +
  '        {provide: PeerMatSnackBarRef, useValue: snackBarRef},', provider), before);
const options = prior.options, absolute = resolve(root, path), cells = [];
for (const kind of ['public-token-value-import', 'type-only-import-control']) {
  const body = kind === 'public-token-value-import' ? candidate : candidate.replace(
    'MatSnackBarRef as PeerMatSnackBarRef', 'type MatSnackBarRef as PeerMatSnackBarRef');
  const host = ts.createCompilerHost(options), actualRead = host.readFile.bind(host);
  host.readFile = file => resolve(file) === absolute ? body : actualRead(file);
  host.getSourceFile = (file, languageVersion) => {
    const text = host.readFile(file); return text === undefined ? undefined : ts.createSourceFile(file, text, languageVersion, true);
  };
  host.writeFile = () => assert.fail('No output files permitted');
  const start = performance.now(), program = ts.createProgram([absolute], options, host);
  const diagnostics = ts.getPreEmitDiagnostics(program).map(d => ({code: d.code,
    file: d.file ? relative(root, d.file.fileName) : null,
    message: ts.flattenDiagnosticMessageText(d.messageText, '\n')}));
  if (kind === 'public-token-value-import') assert.deepEqual(diagnostics, [], JSON.stringify(diagnostics));
  else {
    assert.equal(diagnostics.length, 1, JSON.stringify(diagnostics));
    assert.equal(diagnostics[0].code, 1361); assert.equal(diagnostics[0].file, path);
    assert.match(diagnostics[0].message, /PeerMatSnackBarRef.*cannot be used as a value/);
  }
  for (const source of program.getSourceFiles()) if (resolve(source.fileName) !== absolute)
    assert.equal(readBound(source.fileName).toString(), source.text);
  cells.push({kind, diagnostics, source_sha256: hash(body), seconds: (performance.now() - start) / 1000});
}
// Construct the narrow unified patch with a standard diff implementation, preserving its context.
const diff = spawnSync('/nix/store/lfh101cfjj8p8npcari9hk0lbqi33yvh-python3-3.14.7/bin/python3',
  ['-c', 'import sys,json,difflib; d=json.load(sys.stdin); sys.stdout.write("".join(difflib.unified_diff(d[0].splitlines(True),d[1].splitlines(True),fromfile=d[2],tofile=d[3])))'],
  {input: JSON.stringify([before, candidate, 'a/' + path, 'b/' + path]), encoding: 'utf8'});
assert.equal(diff.status, 0, diff.stderr); assert.ok(diff.stdout);
const patchPath = prefix + 'snack-token-proposed.patch';
const check = spawnSync('git', ['apply', '--check', '-'], {input: diff.stdout, encoding: 'utf8', cwd: root});
assert.equal(check.status, 0, check.stderr);
for (const [file, ref] of bound) {
  const raw = readFileSync(file); assert.equal(raw.length, ref.bytes); assert.equal(hash(raw), ref.sha256);
}
writeFileSync(patchPath, diff.stdout, {flag: 'wx'});
const report = {schema_version: 1, line: '21.x', sha: prior.sha, node: process.version,
  versions: prior.versions, typescript: ts.version, options, cells,
  candidate_source: candidate, before_sha256: hash(before), candidate_sha256: hash(candidate),
  patch: {path: patchPath, sha256: hash(diff.stdout), bytes: Buffer.byteLength(diff.stdout)},
  exact_scope: 'One stable current public token value import and one extra provider in the existing legacy content injector,plus required Ryan2026 notice after Google notice;existing local reference/data providers and injector parent retained. No change to reference class,service signatures,container,DOM,styles,motion or parent/child snack-bar coordination.',
  runtime_proposal_evidence: {path: prefix + 'snack-reference-qualified.json',
    sha256: hash(readFileSync(prefix + 'snack-reference-qualified.json'))},
  git_apply_check: {executed: true, exit_code: 0, applied: false},
  product_changes: 0, canonical_dispositions_changed: 0, exceptions_changed: 0,
  historical_programs_executed: false, whole_SHA_substantive_review_complete: false,
  actual_native_packed_browser_floor_or_full_audit_qualified: false, g11_claim: 'not-passed',
  source_bindings: [...bound.values()]};
writeFileSync(prefix + 'snack-token-proposal-qualified.json', JSON.stringify(report, null, 2) + '\n', {flag: 'wx'});
console.log(JSON.stringify({result: 'historical-snack-token-bridge-proposal-qualified', compiler_cells: 2,
  negative_type_only_import_rejected: true, git_apply_check: true, product_patch_applied: false}));
