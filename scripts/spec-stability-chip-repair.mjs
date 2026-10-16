/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 * Copyright (c) 2026 Ryan Lester.
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */
/** Exact empty-query repair; preserve every previous product byte outside two owned edits. */
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {execFileSync} from 'node:child_process';
import {createRequire} from 'node:module';
import {readFileSync, writeFileSync, readdirSync} from 'node:fs';
import {gunzipSync} from 'node:zlib';
import {dirname, resolve} from 'node:path';
import {fileURLToPath} from 'node:url';
import {deriveHistoricalRoster} from './historical-case-roster.mjs';
const ts = createRequire(import.meta.url)('typescript');
const rootDefault = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const hash = bytes => createHash('sha256').update(bytes).digest('hex');
const blob = bytes => createHash('sha1').update('blob ' + Buffer.byteLength(bytes) + '\0').update(bytes).digest('hex');
export const CHIP_SOURCE = 'projects/ngx-material-legacy/legacy-chips/chip-list.ts';
export const CHIP_SPEC = 'projects/ngx-material-legacy/legacy-chips/chip-list.spec.ts';
export const CHIP_PRIOR = 'compatibility/rc/spec-stability-source-chip-repair-prior.json.gz';
const pins = {main: 'c43fb2c602c8ef1199e9d63e57811eb4978c0e12efef1e316c7b35ab2524be39',
  '21.x': 'dbe7b5fa92e2b0376661aa6f1a49bd5877771685aa3e84641072e55959300974'};
export const CHIP_EMPTY_RESET = `    // Empty lists must not retain a reference to a destroyed chip.
    if (this.chips.length === 0) {
      this._keyManager.updateActiveItem(-1);
    }

`;
export const CHIP_EMPTY_CASE = `  it('should clear a destroyed active chip when the list becomes empty', () => {
    setupStandardList();
    const keyManager = chipListInstance._keyManager;
    const removedChip = chips.last;

    removedChip.focus();
    fixture.detectChanges();
    expect(keyManager.activeItem).toBe(removedChip);

    testComponent.chips = [];
    fixture.detectChanges();
    expect(chips.length).toBe(0);
    expect(keyManager.activeItemIndex).toBe(-1);
    expect(keyManager.activeItem).toBeNull();

    testComponent.chips = [10, 11];
    fixture.detectChanges();
    expect(keyManager.activeItemIndex).toBe(-1);
    expect(keyManager.activeItem).toBeNull();

    chips.first.focus();
    fixture.detectChanges();
    expect(keyManager.activeItemIndex).toBe(0);
    expect(keyManager.activeItem).toBe(chips.first);
    expect(keyManager.activeItem).not.toBe(removedChip);
  });
`;
const identities = roster => roster.cases.map(({case_id, historical_path, full_name, index, kind}) =>
  ({case_id, historical_path, full_name, index, kind}));
function git(root, args) {
  const env = {...process.env, GIT_NO_LAZY_FETCH: '1', GIT_NO_REPLACE_OBJECTS: '1'};
  for (const key of ['GIT_DIR', 'GIT_WORK_TREE', 'GIT_INDEX_FILE', 'GIT_COMMON_DIR',
    'GIT_OBJECT_DIRECTORY', 'GIT_ALTERNATE_OBJECT_DIRECTORIES']) delete env[key];
  return execFileSync('git', ['--no-replace-objects', '-c', 'gc.auto=0', '-c', 'maintenance.auto=0', ...args],
    {cwd: root, env, maxBuffer: 16 * 1024 * 1024});
}
function insertion(text) {
  const file = ts.createSourceFile(CHIP_SPEC, text, ts.ScriptTarget.Latest, true);
  assert.equal(file.parseDiagnostics.length, 0);
  const calls = file.statements.filter(ts.isExpressionStatement).map(n => n.expression)
    .filter(n => ts.isCallExpression(n) && n.expression.getText(file) === 'describe' &&
      n.arguments[0].text === 'MatChipList');
  assert.equal(calls.length, 1);
  const body = calls[0].arguments[1].body;
  assert.ok(ts.isBlock(body));
  assert.equal(text[body.end - 1], '}');
  return body.end - 1;
}
export function chipRepairPair({root = rootDefault} = {}) {
  const bytes = readFileSync(resolve(root, CHIP_PRIOR));
  const line = JSON.parse(readFileSync(resolve(root, 'projects/ngx-material-legacy/package.json')))
    .version.startsWith('21.') ? '21.x' : 'main';
  assert.equal(hash(bytes), pins[line], 'chip repair before graph changed');
  const prior = JSON.parse(gunzipSync(bytes));
  assert.equal(prior.line, line);
  const listing = git(root, ['ls-tree', '-rz', prior.frame.commit]);
  assert.equal(hash(listing), prior.frame.tree_listing_sha256);
  assert.equal(git(root, ['rev-parse', prior.frame.commit + '^{tree}']).toString().trim(), prior.frame.tree);
  assert.equal(listing.toString().split('\0').filter(Boolean).length, prior.frame.members);
  const rows = prior.before_members.map(row => {
    const before = git(root, ['show', prior.frame.commit + ':' + row.path]);
    assert.equal(before.toString(), row.text); assert.equal(hash(before), row.sha256);
    let after;
    if (row.path === CHIP_SOURCE) {
      const needle = '  protected _updateFocusForDestroyedChips() {\n';
      assert.equal(row.text.split(needle).length, 2);
      after = row.text.replace(needle, needle + CHIP_EMPTY_RESET);
    } else {
      assert.equal(row.path, CHIP_SPEC); const at = insertion(row.text);
      after = row.text.slice(0, at) + '\n' + CHIP_EMPTY_CASE + row.text.slice(at);
    }
    return {...row, before: row.text, after, after_sha256: hash(after)};
  });
  assert.deepEqual(rows.map(n => n.path), [CHIP_SOURCE, CHIP_SPEC]);
  return {line, prior, rows};
}
export function inspectChipEmptyRepair({root = rootDefault, readMember} = {}) {
  const read = readMember || (path => readFileSync(resolve(root, path)));
  const pair = chipRepairPair({root}), rows = pair.rows.map(row => {
    assert.equal(read(row.path).toString(), row.after, 'unreviewed chip source delta: ' + row.path);
    return {path: row.path, before_sha256: row.sha256, after_sha256: row.after_sha256};
  });
  const members = git(root, ['ls-tree', '-rz', pair.prior.frame.commit, '--', 'projects/ngx-material-legacy'])
    .toString().split('\0').filter(Boolean).map(record => {
      const [metadata, path] = record.split('\t'), [mode, kind, id] = metadata.split(' ');
      assert.equal(mode, '100644'); assert.equal(kind, 'blob');
      if (![CHIP_SOURCE, CHIP_SPEC].includes(path)) assert.equal(blob(read(path)), id, 'unreviewed product edit ' + path);
      return path;
    }).sort();
  const actual = [];
  function visit(path) {
    for (const entry of readdirSync(resolve(root, path), {withFileTypes: true})) {
      assert.ok(!entry.isSymbolicLink());
      if (entry.isDirectory()) visit(path + '/' + entry.name);
      else { assert.ok(entry.isFile()); actual.push(path + '/' + entry.name); }
    }
  }
  visit('projects/ngx-material-legacy'); assert.deepEqual(actual.sort(), members); assert.equal(members.length, 1141);
  const roster = deriveHistoricalRoster(root), old = pair.prior.before_roster.cases;
  const current = identities(roster), oldIds = new Set(old.map(n => n.case_id));
  assert.equal(old.length, 2222); assert.equal(current.length, 2223);
  assert.deepEqual(current.filter(n => oldIds.has(n.case_id)), old);
  assert.deepEqual(roster.discovery_negative_ids, pair.prior.before_roster.discovery_negative_ids);
  const added = current.filter(n => !oldIds.has(n.case_id)); assert.equal(added.length, 1);
  assert.equal(added[0].full_name, 'MatChipList > should clear a destroyed active chip when the list becomes empty');
  return {schema_version: 1, line: pair.line, source_parent: pair.prior.frame.commit, rows,
    prior: {path: CHIP_PRIOR, sha256: hash(readFileSync(resolve(root, CHIP_PRIOR)))},
    unchanged_product_members: 1139, product_members: 1141, source_membership_exact: true,
    original_case_identities_bodies_names_order_and_templates_preserved: 2222,
    additional_cases: added, current_cases: 2223, discovery_negative_ids: roster.discovery_negative_ids,
    current_case_cells: current.length + roster.discovery_negative_ids.length,
    production_HTML_CSS_SCSS_or_template_changes: 0,
    source_and_native_requirement_context_qualification: 'pending',
    actual_Angular_DOM_artifact_or_floor_qualified: false, g11_claim: 'not-passed'};
}
if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  if (process.argv.includes('--write')) {
    const pair = chipRepairPair();
    for (const row of pair.rows) assert.equal(readFileSync(resolve(rootDefault, row.path)).toString(), row.before);
    for (const row of pair.rows) writeFileSync(resolve(rootDefault, row.path), row.after);
  }
  const report = inspectChipEmptyRepair(), out = process.argv.indexOf('--out');
  if (out >= 0) writeFileSync(process.argv[out + 1], JSON.stringify(report, null, 2) + '\n', {flag: 'wx'});
  console.log(JSON.stringify(report));
}
