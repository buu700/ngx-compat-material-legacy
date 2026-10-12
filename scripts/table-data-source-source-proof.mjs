/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 * Copyright (c) 2026 Ryan Lester.
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */
import assert from 'node:assert/strict';
import {readFileSync, writeFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {execFileSync} from 'node:child_process';
import {dirname, join, resolve} from 'node:path';
import {fileURLToPath} from 'node:url';
const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const read = p => readFileSync(join(root, p)), hash = b => createHash('sha256').update(b).digest('hex');
const git = args => execFileSync('git', ['-c', 'gc.auto=0', '-c', 'maintenance.auto=0', ...args], {cwd: root, encoding: 'utf8'});
const worksheet = JSON.parse(read('compatibility/rc/table-data-source-worksheet.json'));
const tree = git(['ls-tree', '-r', worksheet.source_parent, '--', 'projects/ngx-material-legacy']).trim().split('\n');
const members = tree.map(row => {
  const [metadata, path] = row.split('\t'), [, type, blob] = metadata.split(' '); assert.equal(type, 'blob');
  const bytes = read(path), actual = createHash('sha1').update(Buffer.from('blob ' + bytes.length + '\0')).update(bytes).digest('hex');
  assert.equal(actual, blob, 'product changed: ' + path);
  return {path, sha256: hash(bytes), git_blob: blob};
});
assert.equal(git(['diff', '--name-only', worksheet.source_parent, '--', 'projects/ngx-material-legacy']).trim(), '');
for (const subject of worksheet.subjects) assert.equal(hash(read(subject.path)), subject.sha256);
const originalRoot = 'reference/material-16.2.14/table-data-source/';
const provenance = JSON.parse(read(originalRoot + 'provenance.json'));
assert.equal(provenance.commit, 'df60e733c60e572ba538f6ad0ceff3e63e527b53');
const originals = provenance.files.map(row => {
  const bytes = read(originalRoot + row.path);
  const original = execFileSync('git', ['-c', 'gc.auto=0', '-c', 'maintenance.auto=0',
    '--git-dir=/home/parallels/.cache/angular-components.git', 'show', provenance.commit + ':' + row.upstream]);
  assert.deepEqual(bytes, original); assert.equal(hash(bytes), row.sha256); return row;
});
const cyph = '/home/parallels/cyph', consumerPath = 'shared/js/cyph/components/account-base-file-list/account-base-file-list.component.ts';
const consumer = readFileSync(join(cyph, consumerPath), 'utf8');
assert.match(consumer, /MatLegacyTableDataSource as MatTableDataSource/);
assert.match(consumer, /new MatTableDataSource\(rows\)/);
assert.match(consumer, /dataSource\.paginator = paginator/); assert.match(consumer, /dataSource\.sort = sort/);
const report = {schema_version: 1, line: worksheet.line, source_parent: worksheet.source_parent,
  original: {commit: provenance.commit, files: originals}, unchanged_product_members: members,
  unchanged_styles: members.filter(r => /\.(css|scss)$/.test(r.path)).length,
  unchanged_templates: members.filter(r => r.path.endsWith('.html')).length,
  cyph: {head: execFileSync('git', ['-c', 'gc.auto=0', '-c', 'maintenance.auto=0', 'rev-parse', 'HEAD'],
    {cwd: cyph, encoding: 'utf8'}).trim(), read_only: true, source: {path: consumerPath, sha256: hash(consumer)},
    observed_contract: 'Construct rows, then attach public paginator and MatSort asynchronously; exercised by stream/property protocols, not a Cyph build.'},
  producer_sha256: hash(readFileSync(fileURLToPath(import.meta.url))),
  scope: 'All tracked product bytes match the committed parent. Authentic references match the untouched Git tag; no API, markup or style changes.',
  g11_claim: 'not-passed'};
if (process.argv[2]) writeFileSync(process.argv[2], JSON.stringify(report, null, 2) + '\n', {flag: 'wx'});
console.log(JSON.stringify({line: worksheet.line, unchanged_product_members: members.length,
  unchanged_styles: report.unchanged_styles, unchanged_templates: report.unchanged_templates, cyph_read_only: true}));
