/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 * Copyright (c) 2026 Ryan Lester.
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */
/** One individual API review. LocatorFactory observations do not certify a browser environment. */
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {execFileSync} from 'node:child_process';
import {readFileSync, writeFileSync, mkdtempSync, mkdirSync, realpathSync, symlinkSync, rmSync} from 'node:fs';
import {createRequire} from 'node:module';
import {tmpdir} from 'node:os';
import {dirname, join, resolve} from 'node:path';
import {fileURLToPath, pathToFileURL} from 'node:url';
import {gunzipSync} from 'node:zlib';
import {loadHarnessSubjects} from '../scripts/component-harness-boundary-review.mjs';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const require = createRequire(import.meta.url), ts = require('typescript');
const hash = bytes => createHash('sha256').update(bytes).digest('hex');
const gitHash = (kind, text) => createHash('sha1').update(`${kind} ${Buffer.byteLength(text)}\0`).update(text).digest('hex');
const sha = '422e85d1524f8eeff2425e403702fbfc23a2cc2e';
const subjectPath = 'compatibility/rc/upstream-option-harness-21x-subject.json.gz';
const subjectPin = '63b64e51c3b87011c4f5384bb1499b8e97737e58fe01f32a146f91784a831f6b';
const runPin = {commit: 'e22e54eda8c16e70a47a6de581314e1d54931748',
  artifact: 'b22cc5742c078ef3e61d6d1817da9f7f8e0872cd06c4190ceef73bdb40c044fc'};
const sourcePrefix = 'projects/ngx-material-legacy/legacy-core/testing/';
const publicMethods = ['click', 'getText', 'isActive', 'isDisabled', 'isMultiple', 'isSelected'];
const args = process.argv.slice(2), option = name => args[args.indexOf(name) + 1];
assert.ok(args.includes('--run') && args.includes('--out'), 'explicit artifact run and fresh report required');
assert.equal(process.version, 'v24.21.0', 'use the pinned Chainman workspace');
const runPath = resolve(option('--run')), out = resolve(option('--out'));
const cases = [], mutations = [];
function parsed(name, text) {
  const source = ts.createSourceFile(name, text, ts.ScriptTarget.Latest, true);
  assert.equal(source.parseDiagnostics.length, 0, name); return source;
}
function owner(source, name) {
  const rows = source.statements.filter(n => ts.isClassDeclaration(n) && n.name?.text === name);
  assert.equal(rows.length, 1, 'missing or ambiguous class ' + name); return rows[0];
}
const printer = ts.createPrinter({removeComments: true});
const print = (node, source) => printer.printNode(ts.EmitHint.Unspecified, node, source).trim();
const stored = readFileSync(join(root, subjectPath)); assert.equal(hash(stored), subjectPin);
const subject = JSON.parse(gunzipSync(stored)); assert.equal(subject.sha, sha);
assert.equal(gitHash('commit', subject.raw_commit), sha);
assert.deepEqual(subject.raw_commit.split('\n').filter(x => x.startsWith('parent ')), ['parent ' + subject.parent]);
assert.equal(hash(subject.diff), subject.diff_sha256);
assert.deepEqual(subject.members.map(m => m.path), ['src/material/core/testing/option-harness.ts',
  'tools/public_api_guard/material/core-testing.md']);
assert.deepEqual(subject.diff.split('\n').filter(x => x.startsWith('diff --git ')).map(x => x.split(' b/')[1]),
  subject.members.map(m => m.path));
for (const member of subject.members) for (const side of ['before', 'after']) {
  assert.equal(gitHash('blob', member[side].text), member[side + '_blob']);
  assert.equal(hash(member[side].text), member[side].sha256);
}
assert.equal(subject.historical.source_commit, 'df60e733c60e572ba538f6ad0ceff3e63e527b53');
assert.equal(gitHash('commit', subject.historical.raw_commit), subject.historical.source_commit);
for (const member of subject.historical.members) {
  assert.equal(gitHash('blob', member.text), member.git_blob); assert.equal(hash(member.text), member.sha256);
}
const tagged = subject.historical.members.find(m => m.path.endsWith('/option-harness.ts'));
const current = readFileSync(join(root, sourcePrefix + 'option-harness.ts'), 'utf8');
const originalSource = parsed(tagged.path, tagged.text), currentSource = parsed('current.ts', current);
assert.equal(print(owner(currentSource, 'MatLegacyOptionHarness'), currentSource),
  print(owner(originalSource, 'MatLegacyOptionHarness'), originalSource), 'legacy implementation differs from untouched tag');
const upstream = subject.members[0], before = parsed('before.ts', upstream.before.text), after = parsed('after.ts', upstream.after.text);
const oldParent = owner(before, 'MatOptionHarness').heritageClauses[0].types[0].expression.getText(before);
const newParent = owner(after, 'MatOptionHarness').heritageClauses[0].types[0].expression.getText(after);
assert.equal(oldParent, 'ComponentHarness'); assert.equal(newParent, 'ContentContainerComponentHarness');
assert.equal(owner(after, 'MatOptionHarness').members.find(m => m.name?.text === 'hostSelector').initializer.text, '.mat-mdc-option');
const api = subject.members[1];
assert.ok(api.before.text.includes('export class MatOptionHarness extends ComponentHarness {'));
assert.ok(api.after.text.includes('export class MatOptionHarness extends ContentContainerComponentHarness {'));

const runBytes = readFileSync(runPath), run = JSON.parse(runBytes);
assert.equal(run.source.line, '21.x'); assert.equal(run.source.clean, true); assert.equal(run.source.commit, runPin.commit);
const artifact = run.artifacts.find(a => a.id === 'library'); assert.equal(artifact.sha256, runPin.artifact);
const tarball = join(dirname(runPath), artifact.path), artifactBytes = readFileSync(tarball);
assert.equal(hash(artifactBytes), runPin.artifact); assert.equal(artifactBytes.length, artifact.bytes);
const qualificationPath = 'compatibility/rc/packed-cva-current-artifact-paired-qualification.json';
const qualificationBytes = readFileSync(join(root, qualificationPath));
const qualification = JSON.parse(qualificationBytes).subjects.find(s => s.line === '21.x');
assert.deepEqual(qualification.source, run.source); assert.deepEqual(qualification.artifact, artifact);
const retainedRun = qualification.reports.run, retainedBytes = readFileSync(join(root, retainedRun.path));
assert.equal(hash(retainedBytes), retainedRun.sha256);
assert.deepEqual(JSON.parse(gunzipSync(retainedBytes)).source, run.source);
const env = {...process.env, GIT_NO_LAZY_FETCH: '1', GIT_NO_REPLACE_OBJECTS: '1'};
for (const key of ['GIT_DIR', 'GIT_WORK_TREE', 'GIT_INDEX_FILE', 'GIT_COMMON_DIR', 'GIT_OBJECT_DIRECTORY', 'GIT_ALTERNATE_OBJECT_DIRECTORIES']) delete env[key];
const sourceMembers = ['option-harness.ts', 'option-harness-filters.ts', 'public-api.ts'].map(name => {
  const path = sourcePrefix + name, bytes = readFileSync(join(root, path));
  const packedSource = execFileSync('git', ['--no-replace-objects', '-c', 'gc.auto=0', '-c', 'maintenance.auto=0',
    'show', run.source.commit + ':' + path], {cwd: root, env, maxBuffer: 1024 * 1024});
  assert.deepEqual(bytes, packedSource, 'current harness source differs from actual packed source');
  return {path, sha256: hash(bytes)};
});
const peers = await loadHarnessSubjects(root), peer = peers.models.find(m => m.subject.line === '21.x');
assert.equal(peer.subject.version, '21.2.14');
const installedCdk = realpathSync(join(root, 'node_modules/@angular/cdk'));
assert.equal(hash(readFileSync(join(installedCdk, peer.subject.public_entry))), peer.raw_runtime_sha256);
for (const member of peer.subject.members) {
  assert.equal(hash(readFileSync(join(installedCdk, member.archive_member.slice('package/'.length)))), member.sha256);
}
const temporary = mkdtempSync(join(tmpdir(), 'legacy-option-harness-21-'));
try {
  const modules = join(temporary, 'node_modules'); mkdirSync(join(modules, '@ngx-compat'), {recursive: true});
  // The already rehashed package contains only regular files/directories; no installer runs.
  const extraction = 'import pathlib,sys,tarfile\nwith tarfile.open(sys.argv[1],"r:gz") as t:\n for m in t.getmembers():\n  p=pathlib.PurePosixPath(m.name)\n  assert p.parts and p.parts[0]=="package" and not p.is_absolute() and ".." not in p.parts and (m.isfile() or m.isdir())\n t.extractall(sys.argv[2],filter="data")\npathlib.Path(sys.argv[2],"package").rename(pathlib.Path(sys.argv[2],"material-legacy"))';
  execFileSync('python3', ['-c', extraction, tarball, join(modules, '@ngx-compat')]);
  symlinkSync(realpathSync(join(root, 'node_modules/@angular')), join(modules, '@angular'), 'dir');
  for (const name of ['rxjs', 'tslib']) symlinkSync(realpathSync(join(root, 'node_modules', name)), join(modules, name), 'dir');
  writeFileSync(join(temporary, 'package.json'), JSON.stringify({type: 'module'}));
  const consumerRequire = createRequire(join(temporary, 'probe.cjs'));
  const entry = consumerRequire.resolve('@ngx-compat/material-legacy/legacy-core/testing');
  assert.ok(entry.startsWith(join(modules, '@ngx-compat/material-legacy/') ));
  const {MatLegacyOptionHarness: Harness} = await import(pathToFileURL(entry));
  const {ComponentHarness: Base, ContentContainerComponentHarness: Container, HarnessPredicate} =
    await import(pathToFileURL(join(installedCdk, peer.subject.public_entry)));
  function fixture({text = 'Legacy label', classes = [], selector = '.mat-option-text'} = {}) {
    const active = new Set(classes), calls = [], label = {text: async () => text};
    const host = {text: async () => 'Host text with unrelated child',
      hasClass: async name => active.has(name), click: async () => {calls.push('host.click');},
      matchesSelector: async query => query === '.mat-option'};
    const factory = {rootElement: host, locatorFor(...queries) {
      assert.deepEqual(queries, [selector], 'wrong text locator'); calls.push(queries[0]); return async () => label;
    }};
    return {harness: new Harness(factory), active, calls, label, host, factory};
  }
  async function check(name, fn) {await fn(); cases.push(name);}
  const parentContract = () => assert.equal(Object.getPrototypeOf(Harness.prototype), Base.prototype);
  await check('public-legacy-selector', () => assert.equal(Harness.hostSelector, '.mat-option'));
  await check('original-public-parent', parentContract);
  await check('original-owned-public-methods', () => assert.deepEqual(Object.getOwnPropertyNames(Harness.prototype)
    .filter(n => n !== 'constructor').sort(), publicMethods));
  await check('no-modern-content-loader-expansion', () => {
    for (const name of ['getChildLoader', 'getHarness', 'getHarnessOrNull', 'getAllHarnesses', 'countHarnesses', 'hasHarness']) {
      assert.equal(typeof Harness.prototype[name], 'undefined'); assert.equal(typeof Container.prototype[name], 'function');
    }
  });
  const f = fixture();
  await check('legacy-label-excludes-host-decoy', async () => assert.equal(await f.harness.getText(), 'Legacy label'));
  await check('host-identity', async () => assert.equal(await f.harness.host(), f.host));
  await check('click-forwarded-once', async () => {await f.harness.click(); assert.equal(f.calls.filter(x => x === 'host.click').length, 1);});
  for (const [method, name] of [['isDisabled', 'mat-option-disabled'], ['isSelected', 'mat-selected'],
    ['isActive', 'mat-active'], ['isMultiple', 'mat-option-multiple']]) {
    await check(method + '-false', async () => assert.equal(await f.harness[method](), false));
    f.active.add(name);
    await check(method + '-true', async () => assert.equal(await f.harness[method](), true));
    f.active.delete(name);
  }
  await check('genuine-predicate-class-and-type', () => {
    const predicate = Harness.with(); assert.ok(predicate instanceof HarnessPredicate); assert.equal(predicate.harnessType, Harness);
  });
  await check('text-string-filter', async () => assert.equal(await Harness.with({text: 'Legacy label'}).evaluate(f.harness), true));
  await check('text-regex-filter', async () => assert.equal(await Harness.with({text: /^Legacy/}).evaluate(f.harness), true));
  await check('text-filter-rejects-host-decoy', async () => assert.equal(await Harness.with({text: await f.host.text()}).evaluate(f.harness), false));
  await check('selected-false-filter', async () => assert.equal(await Harness.with({isSelected: false}).evaluate(f.harness), true));
  f.active.add('mat-selected');
  await check('selected-true-filter', async () => assert.equal(await Harness.with({isSelected: true}).evaluate(f.harness), true));
  await check('selected-false-filter-rejects-selected', async () => assert.equal(await Harness.with({isSelected: false}).evaluate(f.harness), false));
  await check('combined-filter-rejects-wrong-label', async () => assert.equal(await Harness.with({text: 'wrong', isSelected: true}).evaluate(f.harness), false));
  await check('public-selector-filter', async () => {
    assert.equal(await Harness.with({selector: '.mat-option'}).evaluate(f.harness), true);
    assert.equal(await Harness.with({selector: '.mat-mdc-option'}).evaluate(f.harness), false);
  });
  await check('label-rejection-propagates', async () => {
    const g = fixture(), error = new Error('label sentinel'); g.label.text = async () => {throw error;};
    await assert.rejects(g.harness.getText(), e => e === error);
  });
  await check('click-rejection-propagates', async () => {
    const g = fixture(), error = new Error('click sentinel'); g.host.click = async () => {throw error;};
    await assert.rejects(g.harness.click(), e => e === error);
  });
  async function reject(name, apply, restore, test) {
    try {apply(); await assert.rejects(async () => test(), 'mutation escaped observation: ' + name); mutations.push(name);}
    finally {restore();}
  }
  const originalParent = Object.getPrototypeOf(Harness.prototype), getText = Harness.prototype.getText,
    isSelected = Harness.prototype.isSelected, hostSelector = Harness.hostSelector;
  await reject('adopt-modern-content-container-parent', () => Object.setPrototypeOf(Harness.prototype, Container.prototype),
    () => Object.setPrototypeOf(Harness.prototype, originalParent), parentContract);
  await reject('return-host-text-instead-of-label', () => {Harness.prototype.getText = async function () {return (await this.host()).text();};},
    () => {Harness.prototype.getText = getText;}, async () => assert.equal(await fixture().harness.getText(), 'Legacy label'));
  await reject('legacy-selected-class-lost', () => {Harness.prototype.isSelected = async function () {return (await this.host()).hasClass('mdc-list-item--selected');};},
    () => {Harness.prototype.isSelected = isSelected;}, async () => assert.equal(await f.harness.isSelected(), true));
  await reject('modern-host-selector', () => {Harness.hostSelector = '.mat-mdc-option';},
    () => {Harness.hostSelector = hostSelector;}, () => assert.equal(Harness.with().getSelector(), '.mat-option'));
  const locatorFor = Harness.prototype.locatorFor;
  await reject('modern-label-locator', () => {
    Harness.prototype.locatorFor = function (...queries) {
      return locatorFor.call(this, ...queries.map(q => q === '.mat-option-text' ? '.mat-mdc-option-text' : q));
    };
  }, () => {delete Harness.prototype.locatorFor;}, () => fixture());
  const record = {schema_version: 1, role: 'Individual21.xlegacy option harness public API boundary review',
    sha, line: '21.x', status: 'reviewed', recommended_disposition: 'do-not-adopt', canonical_disposition_applied: false,
    reason: 'The original commit adds public content-loader methods to the modern MDC option harness. The owned legacy option harness retains its untouched Material16 class implementation and public parent. Adding those methods is outside the finite historical legacy API contract.',
    original: {subject: {path: subjectPath, sha256: subjectPin}, diff_sha256: subject.diff_sha256,
      complete_paths: subject.members.map(m => m.path), original_changed_files: 2, selected_seed_files: 1,
      recovered_path: 'tools/public_api_guard/material/core-testing.md', before_parent: oldParent, after_parent: newParent},
    tagged_legacy: {tag: subject.historical.tag, source_commit: subject.historical.source_commit,
      class_implementation_equal: true, documentation_scope: 'Class implementation compared without comments. The maintained fork removes historical migration deprecation comments and adds its required owner notice; documentation is not claimed byte-identical.'},
    producer: {path: 'tests/upstream_option_harness_21x_probe.mjs', sha256: hash(readFileSync(fileURLToPath(import.meta.url)))},
    prior_packed_evidence: {qualification: {path: qualificationPath, sha256: hash(qualificationBytes)}, retained_run: retainedRun},
    current_source_members: sourceMembers, artifact: {run: {path: runPath, sha256: hash(runBytes)}, ...artifact,
      source: run.source, actual_public_entry_imported: true, runtime_entry_sha256: hash(readFileSync(entry))},
    cdk: {version: peer.subject.version, public_entry: peer.subject.public_entry,
      runtime_sha256: peer.raw_runtime_sha256, declaration_sha256: peer.declaration_sha256,
      installed_members_equal_authenticated_public_subject: true},
    environment: {node: process.version, typescript: ts.version, platform: process.platform, arch: process.arch,
      rxjs: peers.rxjs.version, installer_executed: false},
    cases, mutations_rejected: mutations, result: 'pass',
    limitations: ['TestElement and LocatorFactory are explicit protocol doubles; no browser DOM or native harness environment was executed.',
      'Existing packed artifact rehashed and imported; no new package build, full gate matrix, x64 qualification, RxJS floor or G11 clearance.',
      'Canonical ledger remains unresolved until this record is admitted with the shared current-source requalification.'],
    g11_claim: 'not-passed'};
  writeFileSync(out, JSON.stringify(record, null, 2) + '\n', {flag: 'wx'});
  console.log(JSON.stringify({result: record.result, cases: cases.length, mutations_rejected: mutations.length, report: out}));
} finally {rmSync(temporary, {recursive: true, force: true});}
