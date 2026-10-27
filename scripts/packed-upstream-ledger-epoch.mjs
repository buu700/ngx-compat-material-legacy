/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 * Copyright (c) 2026 Ryan Lester.
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */
/** Exactly 85 qualified evidence refreshes; no source judgments or runtime credit. */
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {execFileSync} from 'node:child_process';
import {createHash} from 'node:crypto';
import {createRequire} from 'node:module';
import {gunzipSync} from 'node:zlib';
import {join} from 'node:path';

const ts = createRequire(import.meta.url)('typescript');
const inputPath = 'compatibility/rc/packed-upstream-source-inputs.json';
const ledgerPath = 'compatibility/f10/disposition-ledger/ledger.json';
const ownerPath = 'scripts/snack-dom-source-context.mjs';
const subjects = {
  main: {sha256: '971a35dd5a3f6007b419e333f7972ba676635822a833f5445021aa58445e2b27',
    authority: '1c4ace0fa7a0e7cc4d3e919f415e05ca5e46f3c0'},
  '21.x': {sha256: 'be8a38873e4f25e5822b9f2e9bb0f563c45126cb61de69b4c2e089340a68d1f5',
    authority: '86eb9bede566152b9ef81b386fc928fd1dfa4843'},
};
const hash = bytes => createHash('sha256').update(bytes).digest('hex');
const json = value => JSON.stringify(value, null, 2) + '\n';
const disk = root => path => readFileSync(join(root, path));
const readers = new WeakMap();
const pythonVersion = () => execFileSync('python3', ['-c', 'import sys;print(sys.version.split()[0])'],
  {encoding: 'utf8'}).trim();
const ownerEdits = [
  ["import {componentConfigGraph} from './component-config-caller-contracts.mjs';",
    "import {componentConfigGraph} from './component-config-caller-contracts.mjs';\nimport {packedUpstreamLedgerEpoch,packedUpstreamLedgerRawRead} from './packed-upstream-ledger-epoch.mjs';"],
  ['function currentRaw(root,read){if(!branded.has(read))return read;const previous=branded.get(read);assert.equal(previous.root,root);return previous.raw;}',
    'function currentRaw(root,read){for(;;){read=packedUpstreamLedgerRawRead({root,read});if(!branded.has(read))return read;const previous=branded.get(read);assert.equal(previous.root,root);read=previous.raw;}}'],
  ['if(branded.has(read)){const previous=branded.get(read);assert.equal(previous.root,root);read=previous.raw;}',
    'read=currentRaw(root,read);'],
  ['const rawCurrent=read,focusEpoch=packedUpstreamFocusMetadataEpoch({root,read}),',
    'const rawCurrent=read,upstreamEpoch=packedUpstreamLedgerEpoch({root,read}),focusEpoch=packedUpstreamFocusMetadataEpoch({root,read:upstreamEpoch.read}),'],
];
const allowed = new Set(['evidence_report', 'source_check/evidence_report_sha256',
  ...['modern_chip', 'chip_lifecycle', 'chip_modernization', 'chip_input_api', 'chip_edit']
    .map(name => 'individual_proof/' + name + '_source_scope/source_context_sha256')]);

function gitBytes(root, parent, path) {
  assert.match(parent, /^[0-9a-f]{40}$/);
  const env = {...process.env, GIT_NO_LAZY_FETCH: '1', GIT_NO_REPLACE_OBJECTS: '1'};
  for (const key of ['GIT_DIR', 'GIT_WORK_TREE', 'GIT_INDEX_FILE', 'GIT_COMMON_DIR',
    'GIT_OBJECT_DIRECTORY', 'GIT_ALTERNATE_OBJECT_DIRECTORIES']) delete env[key];
  return execFileSync('git', ['--no-replace-objects', '-c', 'gc.auto=0', '-c', 'maintenance.auto=0',
    'show', parent + ':' + path], {cwd: root, env, maxBuffer: 16 * 1024 * 1024});
}
function property(node, key) {
  assert.ok(ts.isObjectLiteralExpression(node));
  const members = node.properties.filter(member => member.name?.text === key);
  assert.equal(members.length, 1); return members[0].initializer;
}

/** Genuine historical ledger readers carry their original current callback. */
export function packedUpstreamLedgerRawRead({root = process.cwd(), read = disk(root)} = {}) {
  while (readers.has(read)) {const prior = readers.get(read); assert.equal(prior.root, root); read = prior.raw;}
  return read;
}
function applyTokens(before, packet) {
  const text = before.toString(), source = ts.parseJsonText('upstream-ledger.json', text);
  assert.equal(source.parseDiagnostics.length, 0);
  const entries = property(source.statements[0].expression, 'entries');
  assert.ok(ts.isArrayLiteralExpression(entries)); assert.equal(entries.elements.length, 1697);
  const bySha = new Map(entries.elements.map(node => [JSON.parse(property(node, 'sha').getText(source)), node]));
  assert.equal(bySha.size, 1697);
  const selected = new Set(packet.entries.map(row => row.sha)); assert.equal(selected.size, 85);
  const edits = [];
  for (const update of packet.literal_token_updates) {
    assert.ok(selected.has(update.sha));
    const path = update.path.join('/');
    assert.ok(allowed.has(path) || /^individual_proof\/historical_behavior\/source_members\/\d+\/sha256$/.test(path),
      'unexpected upstream ledger field ' + path);
    if (path !== 'evidence_report') assert.match(update.after, /^[0-9a-f]{64}$/);
    let node = bySha.get(update.sha);
    for (const part of update.path) node = typeof part === 'number' ? node.elements[part] : property(node, part);
    assert.equal(JSON.parse(node.getText(source)), update.before);
    edits.push({start: node.getStart(source), end: node.end, text: JSON.stringify(update.after)});
  }
  assert.equal(edits.length, 179); edits.sort((a, b) => a.start - b.start);
  let end = 0; const chunks = [];
  for (const edit of edits) {assert.ok(edit.start >= end); chunks.push(text.slice(end, edit.start), edit.text); end = edit.end;}
  chunks.push(text.slice(end)); return Buffer.from(chunks.join(''));
}

export function preparePackedUpstreamLedger({root = process.cwd(), read = disk(root)} = {}) {
  read = packedUpstreamLedgerRawRead({root, read});
  const input = read(inputPath), line = Object.keys(subjects).find(name => subjects[name].sha256 === hash(input));
  assert.ok(line, 'changed qualified upstream inputs');
  const data = JSON.parse(input), authority = subjects[line].authority;
  assert.equal(data.line, line); assert.equal(data.schema_version, 1);
  assert.equal(JSON.parse(read('projects/ngx-material-legacy/package.json')).version.startsWith('21.') ? '21.x' : 'main', line);
  assert.equal(hash(gitBytes(root, authority, inputPath)), hash(input));
  assert.equal(data.current_native_packed_or_floor_qualified, false);
  assert.equal(data.new_upstream_SHA_decisions, 0); assert.equal(data.original_hunk_judgments_or_dispositions_changed, 0);
  assert.equal(data.before_ledger.path, ledgerPath); assert.equal(data.before_ledger.entries, 1697);
  const before = gitBytes(root, data.before_ledger.source_parent, ledgerPath);
  assert.equal(hash(before), data.before_ledger.sha256);
  const bound = new Map([[inputPath, hash(input)]]);
  function member(ref, authenticate = false) {
    const raw = read(ref.path); assert.equal(hash(raw), ref.sha256, 'changed upstream subject ' + ref.path);
    if (authenticate) assert.equal(hash(gitBytes(root, authority, ref.path)), ref.sha256);
    bound.set(ref.path, ref.sha256); return raw;
  }
  const packet = JSON.parse(gunzipSync(member(data.transition, true)));
  const validation = JSON.parse(gunzipSync(member(data.validation, true)));
  assert.equal(packet.line, line); assert.equal(packet.entries.length, 85);
  assert.equal(packet.new_upstream_SHA_decisions, 0); assert.equal(packet.original_reviews_or_dispositions_changed, 0);
  assert.equal(validation.line, line); assert.equal(validation.results.length, 85);
  assert.deepEqual(validation.failed, []); assert.equal(validation.canonical_applied, false);
  assert.ok(validation.results.every(row => row.valid === true));
  assert.deepEqual(validation.results.map(row => row.sha).sort(), packet.entries.map(row => row.sha).sort());
  member(data.producer, true);
  const syntaxPath = 'compatibility/rc/packed-upstream-bazel-current-syntax-epoch.json.gz';
  const syntaxRef = {path: syntaxPath, sha256: hash(gitBytes(root, authority, syntaxPath))};
  const syntax = JSON.parse(gunzipSync(member(syntaxRef, true)));
  assert.equal(syntax.line, line); assert.equal(pythonVersion(), syntax.current_pinned_python,
    'changed source-analysis Python');
  for (const ref of data.validation_code_subjects) {
    if (ref.path === ownerPath) {
      let owner = gitBytes(root, authority, ownerPath).toString(); assert.equal(hash(owner), ref.sha256);
      for (const [from, to] of ownerEdits) {assert.equal(owner.split(from).length, 2); owner = owner.replace(from, to);}
      assert.equal(read(ownerPath).toString(), owner, 'unqualified source-owner ledger integration');
      bound.set(ownerPath, hash(owner));
    } else member(ref);
  }
  const reports = new Map(); assert.equal(data.reports.length, 12);
  for (const report of data.reports) {
    const old = JSON.parse(member(report.before)), current = JSON.parse(member(report.after, true));
    assert.deepEqual(current[report.original_review_field], old[report.original_review_field]);
    assert.equal(hash(json(current[report.original_review_field])), report.original_reviews_sha256);
    reports.set(report.after.path, current);
  }
  const context = reports.get('compatibility/rc/packed-upstream-source-build.json').candidate_context;
  const bazel = reports.get('compatibility/rc/packed-upstream-source-bazel.json');
  assert.equal(bazel.source_analysis.compiler, ts.version, 'changed source-analysis compiler');
  assert.equal(context.product_members.length, 1142);
  for (const ref of [...context.product_members, ...context.files, ...bazel.candidate_context.files]) {
    const raw = member(ref); assert.equal(raw.length, ref.bytes);
  }
  const population = execFileSync('git', ['ls-files', '--cached', '--others', '--exclude-standard', '--',
    'projects/ngx-material-legacy'], {cwd: root, encoding: 'utf8'}).trim().split('\n').sort();
  assert.deepEqual(population, context.product_members.map(ref => ref.path).sort());
  const expected = JSON.parse(before);
  for (const change of packet.entries) {
    const index = expected.entries.findIndex(entry => entry.sha === change.sha); assert.ok(index >= 0);
    const previous = expected.entries[index], current = change.after_entry;
    assert.equal(hash(json(previous)), change.before_entry_sha256);
    for (const field of ['sha', 'final_disposition', 'reason', 'files', 'review_depth', 'affected_branches'])
      assert.deepEqual(current[field], previous[field], 'changed original upstream judgment ' + field);
    assert.ok(reports.has(current.evidence_report));
    expected.entries[index] = current;
  }
  const after = applyTokens(before, packet);
  assert.equal(hash(after), data.after_ledger_sha256); assert.deepEqual(JSON.parse(after), expected);
  return {line, before, after, bound, population, analysis_python_version: syntax.current_pinned_python,
    input_sha256: hash(input),
    entries_changed: 85, scalar_tokens_changed: 179, source_scope_only: true,
    current_native_packed_or_floor_qualified: false};
}

/** A before-image is available only for this exact, continuously checked ledger. */
export function packedUpstreamLedgerEpoch({root = process.cwd(), read = disk(root)} = {}) {
  read = packedUpstreamLedgerRawRead({root, read});
  const prepared = preparePackedUpstreamLedger({root, read});
  const current = hash(read(ledgerPath)), beforeHash = hash(prepared.before), afterHash = hash(prepared.after);
  assert.ok(current === beforeHash || current === afterHash, 'unqualified canonical upstream ledger');
  const applied = current === afterHash;
  const assertCurrent = () => {
    for (const [path, digest] of prepared.bound)
      assert.equal(hash(read(path)), digest, 'late current upstream subject change ' + path);
    const population = execFileSync('git', ['ls-files', '--cached', '--others', '--exclude-standard', '--',
      'projects/ngx-material-legacy'], {cwd: root, encoding: 'utf8'}).trim().split('\n').sort();
    assert.deepEqual(population, prepared.population, 'late current product population change');
    assert.equal(pythonVersion(), prepared.analysis_python_version, 'late source-analysis Python change');
    assert.equal(hash(read(ledgerPath)), current, 'late canonical upstream ledger change');
  };
  const historical = path => {
    if (path !== ledgerPath) return read(path);
    assertCurrent(); return applied ? Buffer.from(prepared.before) : read(path);
  };
  readers.set(historical, {root, raw: read});
  return {line: prepared.line, read: historical, raw: read, assertCurrent, applied,
    projected_metadata_paths: applied ? [ledgerPath] : [], entries_changed: 85,
    scalar_tokens_changed: 179, current_native_packed_or_floor_or_g11_credit: false};
}
