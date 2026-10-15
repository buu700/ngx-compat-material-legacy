/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.dev/license
 * Copyright (c) 2026 Ryan Lester.
 */
import assert from 'node:assert/strict';
import {spawnSync} from 'node:child_process';
import {createHash} from 'node:crypto';
import {readFileSync, readdirSync} from 'node:fs';
import {createRequire} from 'node:module';
import {dirname, join, resolve} from 'node:path';
import {fileURLToPath} from 'node:url';
import {reverseTableOnPushPackedSource, TABLE_ONPUSH_SOURCE_PREIMAGES} from '../scripts/table-onpush-packed-source-requalification.mjs';
import {reverseRadioIdentityPackedSource} from '../scripts/radio-identity-packed-source-requalification.mjs';
import {reverseGeneratedIdentityPackedSource} from '../scripts/generated-identity-packed-source-requalification.mjs';
import {reverseSelectDetachPackedSource} from '../scripts/select-detach-packed-source-requalification.mjs';

const ts = createRequire(import.meta.url)('typescript');
const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const roster = JSON.parse(readFileSync(join(root, 'compatibility/rc/npm-tooling-isolation-callers.json'), 'utf8'));
const printer = ts.createPrinter({removeComments: true});
const hash = text => createHash('sha256').update(text).digest('hex');
const parse = (path, text) => ts.createSourceFile(path, text, ts.ScriptTarget.Latest, true, ts.ScriptKind.JS);
const line = JSON.parse(readFileSync(join(root, 'projects/ngx-material-legacy/package.json'))).version.startsWith('21.') ? '21.x' : 'main';
// Authenticate the entire program before the finite regression-test addition too.
const tablePreimage = TABLE_ONPUSH_SOURCE_PREIMAGES[line];
const tableOriginal = spawnSync('git', ['-c', 'gc.auto=0', '-c', 'maintenance.auto=0', 'show',
  tablePreimage.commit + ':scripts/packed-consumer-aot-smoke.mjs'], {cwd: root, encoding: 'utf8'});
assert.equal(tableOriginal.status, 0, tableOriginal.stderr);
assert.equal(hash(tableOriginal.stdout), tablePreimage.producer);

// Recompute the untouched commit blobs; a rewritten hash in the roster is not an oracle.
for (const row of roster.source_preimages) {
  assert.match(row.commit, /^[a-f0-9]{40}$/);
  const original = spawnSync('git', ['-c', 'gc.auto=0', '-c', 'maintenance.auto=0', 'show', row.commit + ':' + row.path],
    {cwd: root, encoding: 'utf8', maxBuffer: 4 * 1024 * 1024});
  assert.equal(original.status, 0, original.stderr);
  assert.equal(hash(original.stdout), row.sha256);
  assert.equal(hash(printer.printFile(parse(row.path, original.stdout))), row.normalized_sha256);
}

function audit(overrides = new Map()) {
  const found = [], restored = new Map();
  const names = new Set(readdirSync(join(root, 'scripts')).filter(name => name.endsWith('.mjs')));
  for (const path of overrides.keys()) names.add(path.replace(/^scripts\//, ''));
  for (const name of names) {
    const path = 'scripts/' + name;
    const source = overrides.get(path) ?? readFileSync(join(root, path), 'utf8');
    const sf = parse(path, source);
    const print = node => printer.printNode(ts.EmitHint.Unspecified, node, sf);
    function visit(node) {
      if (ts.isCallExpression(node) && node.arguments.length && ts.isStringLiteral(node.arguments[0]) && node.arguments[0].text === 'npm') {
        if (node.expression.getText(sf) === 'toolVersion' && node.arguments.length === 1) return;
        const argv = node.arguments[1];
        if (ts.isArrayLiteralExpression(argv) && argv.elements.length === 1 && ts.isStringLiteral(argv.elements[0]) && ['-v', '--version'].includes(argv.elements[0].text)) return;
        assert.ok(['spawnSync', 'run'].includes(node.expression.getText(sf)), 'unreviewed npm dispatcher ' + path);
        const options = node.arguments[2];
        assert.ok(ts.isCallExpression(options) && options.expression.getText(sf) === 'npmToolingOptions', 'unwrapped mutating npm caller ' + path);
        assert.equal(options.arguments.length, 2);
        assert.ok(ts.isObjectLiteralExpression(options.arguments[0]));
        assert.equal(print(argv), print(options.arguments[1]), 'guarded argv does not match executed argv');
        found.push({path, callee: node.expression.getText(sf), argv: print(argv)});
      }
      ts.forEachChild(node, visit);
    }
    visit(sf);
    if (found.some(row => row.path === path)) {
      // Scan actual current callers above; only the authenticated test addition is
      // reversed for the older environment-only whole-program equality below.
      const restoreSf = path === 'scripts/packed-consumer-aot-smoke.mjs'
        ? parse(path, reverseTableOnPushPackedSource(path, reverseRadioIdentityPackedSource(path, reverseGeneratedIdentityPackedSource(path, reverseSelectDetachPackedSource(path, source, line), line), line), line)) : sf;
      const restorePrint = node => printer.printNode(ts.EmitHint.Unspecified, node, restoreSf);
      const transform = ts.transform(restoreSf, [context => {
        const visitor = node => {
          if (ts.isImportDeclaration(node) && node.moduleSpecifier.text === './npm-tooling-options.mjs') return undefined;
          if (ts.isCallExpression(node) && node.expression.getText(restoreSf) === 'npmToolingOptions') return node.arguments[0];
          if (['scripts/native-motion-run.mjs', 'scripts/browser-required-cells.mjs'].includes(path)
              && ts.isPropertyAssignment(node) && node.name.getText(restoreSf) === 'npmProfile') {
            assert.equal(restorePrint(node.initializer), "readFileSync(join(root, 'scripts/npm-tooling-options.mjs'), 'utf8')");
            return undefined;
          }
          return ts.visitEachChild(node, visitor, context);
        };
        return sourceFile => ts.visitNode(sourceFile, visitor);
      }]);
      const normal = printer.printFile(transform.transformed[0]);
      transform.dispose();
      restored.set(path, hash(normal));
    }
  }
  const expected = roster.callers.map(row => ({path: row.path, callee: row.callee,
    argv: printer.printNode(ts.EmitHint.Unspecified, parse('argv.js', row.argv).statements[0].expression, parse('argv.js', row.argv))}));
  assert.deepEqual(found.sort((a,b) => a.path.localeCompare(b.path)), expected.sort((a,b) => a.path.localeCompare(b.path)), 'npm caller population changed');
  assert.equal(restored.size, roster.source_preimages.length);
  for (const row of roster.source_preimages) assert.equal(restored.get(row.path), row.normalized_sha256, 'non-environment source behavior changed: ' + row.path);
  return {calls: found.length, files: restored.size};
}

const positive = audit();
const first = roster.callers[0].path;
const current = readFileSync(join(root, first), 'utf8');
const negatives = [
  new Map([['scripts/added-unwrapped-npm.mjs', "spawnSync('npm', ['install'], {cwd: '/tmp'});\n"]]),
  new Map([[first, current + "\nspawnSync('npm', ['query', '.external'], npmToolingOptions({cwd: '/tmp'}, ['install']));\n"]]),
  new Map([[first, current.replace('npmToolingOptions(', 'unownedNpmOptions(')]]),
  new Map([[first, current + '\nthrow new Error("unrelated behavior change");\n']]),
];
for (const negative of negatives) assert.throws(() => audit(negative));
console.log(JSON.stringify({result: 'pass', ...positive, negative_controls: negatives.length,
  original_argv_workdir_timeouts_and_other_behavior_preserved: true,
  typescript: ts.version, node: process.version, execution: 'static AST only'}));
