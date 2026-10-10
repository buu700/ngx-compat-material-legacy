/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 * Copyright (c) 2026 Ryan Lester.
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */
/** Complete public Node Zone.js entries for isolated original/minimum diagnostics. */
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {readFileSync, writeFileSync, mkdirSync} from 'node:fs';
import {gunzipSync} from 'node:zlib';
import {createRequire, builtinModules} from 'node:module';
import {join, dirname} from 'node:path';
const ts = createRequire(import.meta.url)('typescript');
const hash = bytes => createHash('sha256').update(bytes).digest('hex');
const capsuleHash = '5704215458c70cadd96a5a256b90abf45b1828e661e9f02c3472e6a818efa175';

export function installNgZonePublicSubject(model, root) {
  const bytes = readFileSync(join(root, 'compatibility/rc/ng-zone-public-subjects.json'));
  assert.equal(hash(bytes), capsuleHash, 'Zone subject capsule changed');
  const capsule = JSON.parse(bytes), version = model.line === 'original' ? '0.13.3' : '0.16.3';
  const subject = capsule.subjects.find(subject => subject.version === version);
  assert.ok(subject && subject.archive_sri_verified === true);
  assert.deepEqual(subject.members.map(member => member.module_path).sort(), ['fesm2015/zone-node.js', 'package.json']);
  const source = new Map();
  for (const member of subject.members) {
    assert.equal(member.path, 'compatibility/rc/ng-zone-public-source-members/' + member.sha256 + '.gz');
    assert.equal(member.archive_member, 'package/' + member.module_path);
    const stored = readFileSync(join(root, member.path)); assert.equal(hash(stored), member.stored_sha256);
    const raw = gunzipSync(stored); assert.equal(hash(raw), member.sha256); assert.equal(raw.length, member.bytes);
    source.set(member.module_path, raw);
  }
  const manifest = JSON.parse(source.get('package.json'));
  assert.equal(manifest.name, 'zone.js'); assert.equal(manifest.version, version);
  assert.equal(subject.public_specifier, 'zone.js/node');
  assert.equal(manifest.exports['./node'].default, subject.selected_route);
  assert.equal(subject.selected_route, './fesm2015/zone-node.js');
  const entry = ts.createSourceFile('zone-node.js', source.get('fesm2015/zone-node.js').toString(), ts.ScriptTarget.Latest, true, ts.ScriptKind.JS);
  assert.equal(entry.parseDiagnostics.length, 0);
  const requires = new Set();
  let forwarders = 0;
  function visit(node) {
    assert.ok(!((ts.isImportDeclaration(node) || ts.isExportDeclaration(node)) && node.moduleSpecifier), 'Zone static closure changed');
    assert.ok(!(ts.isCallExpression(node) && node.expression.kind === ts.SyntaxKind.ImportKeyword), 'Zone dynamic import closure changed');
    if (ts.isCallExpression(node) && ts.isIdentifier(node.expression) &&
        ['require', '__require'].includes(node.expression.text)) {
      if (node.expression.text === '__require') assert.equal(version, '0.16.3');
      assert.equal(node.arguments.length, 1); assert.ok(ts.isStringLiteral(node.arguments[0]));
      assert.ok(builtinModules.includes(node.arguments[0].text), 'Zone non-builtin dependency not captured');
      requires.add(node.arguments[0].text);
    }
    if (ts.isCallExpression(node) && ts.isPropertyAccessExpression(node.expression) &&
        ts.isIdentifier(node.expression.expression) && node.expression.expression.text === 'require') {
      // The authenticated current bundle wraps CommonJS require; it forwards
      // the same literal builtin requests rather than adding a package edge.
      assert.equal(version, '0.16.3'); assert.equal(node.expression.name.text, 'apply');
      assert.deepEqual(node.arguments.map(argument => argument.getText(entry)), ['this', 'arguments']);
      let owner = node.parent;
      while (owner && !ts.isVariableDeclaration(owner)) owner = owner.parent;
      assert.ok(owner && ts.isIdentifier(owner.name) && owner.name.text === '__require');
      forwarders++;
    }
    ts.forEachChild(node, visit);
  }
  visit(entry); assert.deepEqual([...requires].sort(), ['crypto', 'events', 'fs', 'timers']);
  assert.equal(forwarders, version === '0.16.3' ? 1 : 0);
  for (const [path, raw] of source) {
    const target = join(model.root, 'node_modules/zone.js', path);
    mkdirSync(dirname(target), {recursive: true}); writeFileSync(target, raw, {flag: 'wx'});
  }
  return {version, public_specifier: subject.public_specifier, selected_route: subject.selected_route,
    capsule_sha256: capsuleHash, archive_sri: subject.archive_sri, archive_sri_verified: true,
    node_builtins: [...requires].sort(), public_entry_sha256: hash(source.get('fesm2015/zone-node.js')),
    authenticated_commonjs_require_forwarders: forwarders,
    scope: 'Complete authenticated public Node runtime entry and manifest, not the browser route or all package subpaths. Original peer-compatible0.13.3; current pinned0.16.3. This does not narrow published consumer peers or qualify Node/Rx/browser floors.'};
}
