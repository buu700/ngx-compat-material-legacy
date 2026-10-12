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
import {createRequire} from 'node:module';
import {dirname, join, resolve} from 'node:path';
import {fileURLToPath} from 'node:url';
const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const ts = createRequire(import.meta.url)('typescript');
const read = p => readFileSync(join(root, p), 'utf8');
const hash = b => createHash('sha256').update(b).digest('hex');
const git = args => execFileSync('git', ['-c', 'gc.auto=0', '-c', 'maintenance.auto=0', ...args], {cwd: root});
const worksheet = JSON.parse(read('compatibility/rc/injectable-service-scope-worksheet.json'));
const prefix = 'projects/ngx-material-legacy/legacy-snack-bar/';
const expected = [prefix + 'snack-bar.ts', prefix + 'snack-bar-module.ts', prefix + 'snack-bar.spec.ts'];
const paths = git(['ls-tree', '-r', '--name-only', worksheet.source_parent, 'projects/ngx-material-legacy']).toString().trim().split('\n');
assert.deepEqual(git(['ls-files', 'projects/ngx-material-legacy']).toString().trim().split('\n'), paths);
const members = paths.map(path => {
  const before = git(['show', worksheet.source_parent + ':' + path]), candidate = readFileSync(join(root, path));
  return {path, before_sha256: hash(before), candidate_sha256: hash(candidate)};
});
assert.deepEqual(members.filter(r => r.before_sha256 !== r.candidate_sha256).map(r => r.path).sort(), expected.sort());
for (const r of worksheet.subjects) assert.equal(hash(git(['show', worksheet.source_parent + ':' + r.path])), r.before_sha256);
const path = prefix + 'snack-bar.spec.ts', text = read(path), source = ts.createSourceFile(path, text, ts.ScriptTarget.Latest, true);
const title = 'should give an importing child module its own service while sharing parent notifications';
const matches = [];
function visit(n) {
  if (ts.isCallExpression(n) && ts.isIdentifier(n.expression) && n.expression.text === 'it' &&
      ts.isStringLiteralLike(n.arguments[0]) && n.arguments[0].text === title) matches.push(n.parent);
  ts.forEachChild(n, visit);
}
visit(source); assert.equal(matches.length, 1); assert.ok(ts.isExpressionStatement(matches[0]));
const test = matches[0];
const retained = (text.slice(0, test.getFullStart()) + text.slice(test.end))
  .replace('  EnvironmentInjector,\n', '').replace('  createEnvironmentInjector,\n', '').replace('  importProvidersFrom,\n', '');
const printer = ts.createPrinter({removeComments: false});
const normalize = t => printer.printFile(ts.createSourceFile(path, t, ts.ScriptTarget.Latest, true));
assert.equal(normalize(retained), normalize(git(['show', worksheet.source_parent + ':' + path]).toString()));
const service = read(prefix + 'snack-bar.ts'), module = read(prefix + 'snack-bar-module.ts');
assert.equal(service.replace('@Injectable()', '@Injectable({providedIn: MatLegacySnackBarModule})')
  .replace("import {MatLegacySnackBarContainer} from './snack-bar-container';\n", "import {MatLegacySnackBarContainer} from './snack-bar-container';\nimport {MatLegacySnackBarModule} from './snack-bar-module';\n"), git(['show', worksheet.source_parent + ':' + prefix + 'snack-bar.ts']).toString());
assert.equal(module.replace("import {MatLegacySnackBar} from './snack-bar';\n", '').replace('    MatLegacySnackBar,\n', ''), git(['show', worksheet.source_parent + ':' + prefix + 'snack-bar-module.ts']).toString());
const cyph = '/home/parallels/cyph', cyphHead = execFileSync('git', ['-c', 'gc.auto=0', '-c', 'maintenance.auto=0', 'rev-parse', 'HEAD'], {cwd: cyph, encoding: 'utf8'}).trim();
const consumers = execFileSync('rg', ['-l', 'MatLegacySnackBar|MatSnackBar', 'shared/js', '-g', '*.ts'], {cwd: cyph, encoding: 'utf8'}).trim().split('\n').filter(Boolean);
const cyphUses = consumers.map(path => {
  const text = readFileSync(join(cyph, path), 'utf8');
  assert.doesNotMatch(text, /(?:new|extends)\s+(?:MatLegacySnackBar|MatSnackBar)\b/);
  return {path, sha256: hash(text), references: text.split('\n').flatMap((line, i) => /MatLegacySnackBar|MatSnackBar/.test(line) ? [{line: i + 1, text: line.trim()}] : [])};
});
const unchanged = members.filter(r => r.before_sha256 === r.candidate_sha256);
const report = {schema_version: 1, line: worksheet.line, source_parent: worksheet.source_parent,
  changed: members.filter(r => r.before_sha256 !== r.candidate_sha256),
  unchanged_product_members: unchanged, unchanged_styles: unchanged.filter(r => /\.(?:css|scss)$/.test(r.path)).length,
  unchanged_templates: unchanged.filter(r => r.path.endsWith('.html')).length,
  existing_test_program_unchanged: true, added_actual_module_integration_test: {path, title, execution: 'unexecuted; deferred final Actions'},
  service_body_constructor_and_module_other_metadata_unchanged: true,
  import_cycle_removed: 'module imports service; service no longer imports module',
  cyph: {head: cyphHead, consumers: cyphUses, read_only: true, constructor_or_subclass_uses: 0},
  producer_sha256: hash(readFileSync(fileURLToPath(import.meta.url))),
  scope: 'Exact two product-source edits and one additive integration test. Every other tracked library byte is unchanged, including all styles/templates. Cyph module-import source sanity is read-only; consumer build, full service/overlay/runtime floor and G11 remain separate.', g11_claim: 'not-passed'};
if (process.argv[2]) writeFileSync(process.argv[2], JSON.stringify(report, null, 2) + '\n', {flag: 'wx'});
console.log(JSON.stringify({line: worksheet.line, changed: report.changed.length, unchanged_styles: report.unchanged_styles,
  unchanged_templates: report.unchanged_templates, cyph_consumers: cyphUses.length}));
