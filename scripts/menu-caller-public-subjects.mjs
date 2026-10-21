/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 * Copyright (c) 2026 Ryan Lester.
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */
/** Genuine complete menu namespaces; immutable published bytes only. */
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {readFileSync, writeFileSync, mkdirSync} from 'node:fs';
import {createRequire} from 'node:module';
import {join, dirname, posix} from 'node:path';
import {gunzipSync} from 'node:zlib';
import {prepareOverlayContractSubjects} from './overlay-caller-contracts.mjs';
import {cdkModuleTypePublicRoute} from './cdk-module-type-public-subjects.mjs';

const ts = createRequire(import.meta.url)('typescript');
const hash = value => createHash('sha256').update(value).digest('hex');
export const MENU_CALLER_SUBJECTS = 'compatibility/rc/menu-caller-public-subjects.json';
const pin = '29475ce1b0e7c2f090dec78c229f6f18eb94bc0f6065610ab167607bd96e7f26';

export function menuCallerPublicClosure(model, kind) {
  const roots = ['@angular/material/menu', ...(model.line === 'original' ? ['@angular/material/legacy-menu'] : [])];
  const members = new Map(), edges = [], external = new Set();
  function visit(ref) {
    if (ref.external) {external.add(ref.external); return;}
    const key = ref.key; if (members.has(key)) return;
    const text = model.sources.get(key); assert.equal(typeof text, 'string', 'missing complete menu dependency ' + key);
    const source = ts.createSourceFile(key, text, ts.ScriptTarget.Latest, true); assert.equal(source.parseDiagnostics.length, 0);
    members.set(key, {key, sha256: hash(text), bytes: Buffer.byteLength(text)});
    function edge(specifier) {
      let target;
      if (specifier.startsWith('.')) {
        const base = posix.normalize(posix.join(posix.dirname(key), kind === 'types' ? specifier.replace(/\.js$/, '.d.ts') : specifier));
        assert.ok(!base.split('/').includes('..') && !posix.isAbsolute(base));
        const candidates = [base, base + '.d.ts', base + '/index.d.ts'].filter(p => model.sources.has(p));
        assert.equal(candidates.length, 1, 'missing relative menu dependency ' + base); target = {key: candidates[0]};
      } else target = cdkModuleTypePublicRoute(model, specifier, kind);
      edges.push({from: key, specifier, ...target}); visit(target);
    }
    for (const n of source.statements) if ((ts.isImportDeclaration(n) || ts.isExportDeclaration(n)) && n.moduleSpecifier) edge(n.moduleSpecifier.text);
    function nested(n) {
      if (ts.isImportTypeNode(n) && ts.isLiteralTypeNode(n.argument) && ts.isStringLiteral(n.argument.literal)) edge(n.argument.literal.text);
      assert.ok(!(ts.isCallExpression(n) && n.expression.kind === ts.SyntaxKind.ImportKeyword), 'unqualified dynamic menu dependency');
      ts.forEachChild(n, nested);
    }
    nested(source);
  }
  for (const specifier of roots) visit(cdkModuleTypePublicRoute(model, specifier, kind));
  return {roots, members: [...members.values()], edges, external: [...external].sort()};
}

export function prepareMenuCallerPublicSubjects(root = process.cwd()) {
  const bytes = readFileSync(join(root, MENU_CALLER_SUBJECTS)); assert.equal(hash(bytes), pin, 'changed menu public capsule');
  const capsule = JSON.parse(bytes), loaded = prepareOverlayContractSubjects(root);
  try {
    assert.deepEqual(capsule.base, loaded.overlay_contract_capsule);
    assert.deepEqual(capsule.subjects.map(s => s.line), loaded.models.map(m => m.line));
    for (const model of loaded.models) {
      const subject = capsule.subjects.find(s => s.line === model.line);
      assert.deepEqual(subject.archives, model.subject.packages.filter(p => p.name.startsWith('@angular/')));
      assert.equal(subject.additions.length, model.line === 'original' ? 5 : 1);
      for (const member of subject.additions) {
        assert.ok(member.key.startsWith(member.package + '/') && !member.key.split('/').includes('..'));
        assert.equal(member.archive_member, 'package/' + member.key.slice(member.package.length + 1));
        assert.equal(member.path, 'compatibility/rc/menu-caller-public-sources/' + member.sha256 + '.gz');
        const stored = readFileSync(join(root, member.path)); assert.equal(hash(stored), member.stored_sha256);
        const value = gunzipSync(stored); assert.equal(hash(value), member.sha256); assert.equal(value.length, member.bytes);
        assert.equal(model.sources.has(member.key), false, 'SDK override'); model.sources.set(member.key, value.toString());
        const path = join(model.root, 'node_modules', member.key); mkdirSync(dirname(path), {recursive: true}); writeFileSync(path, value, {flag: 'wx'});
      }
      for (const kind of ['runtime', 'types']) assert.deepEqual(menuCallerPublicClosure(model, kind), subject.closures[kind]);
      model.menu_caller_subject = subject;
    }
    return {...loaded, menu_caller_capsule: {path: MENU_CALLER_SUBJECTS, sha256: pin}};
  } catch (error) {loaded.dispose(); throw error;}
}
