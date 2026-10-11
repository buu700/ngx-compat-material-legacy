/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 * Copyright (c) 2026 Ryan Lester.
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */
import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
import {readFileSync, writeFileSync, existsSync} from 'node:fs';
import {gunzipSync} from 'node:zlib';
import {createHash} from 'node:crypto';
import {join} from 'node:path';
import {prepareMenuItemPublicSubjects} from '../scripts/menu-item-public-subjects.mjs';
const ts = createRequire(import.meta.url)('typescript');
const hash = bytes => createHash('sha256').update(bytes).digest('hex');
/** Add only the complete authenticated coercion declaration edges to each temporary namespace. */
export function prepareOwnedMenuItemTypeSubjects(root) {
  const loaded = prepareMenuItemPublicSubjects(root);
  try {
    const coercionBytes = readFileSync(join(root, 'compatibility/rc/owned-menu-item-coercion-types.json.gz'));
    assert.equal(hash(coercionBytes), '6237aae37db433582c60ff3bc3e7315a614c44ab3caf138c60c5b73f02a67ef5');
    const coercionRaw = gunzipSync(coercionBytes); assert.equal(hash(coercionRaw), '0ceb17a621fbc4e8e91399d2ed809d9096560cda91c1a9ff5d16655d2278ecb9');
    const coercion = JSON.parse(coercionRaw); assert.equal(coercion.base_namespace_capsule_sha256, loaded.capsule_hash);
    for (const model of loaded.models) {
      const types = coercion.subjects.find(s => s.line === model.line); assert.ok(types);
      assert.equal(types.version, model.packages.get('@angular/cdk').version); assert.equal(hash(types.source), types.sha256);
      assert.equal(model.packages.get('@angular/cdk').exports['./coercion'].types, './' + types.module_path);
      assert.deepEqual(types.relative_type_members.map(r => r.module_path), ['types/_number-property-chunk.d.ts']);
      for (const member of [types, ...types.relative_type_members]) {
        assert.equal(hash(member.source), member.sha256);
        const sf = ts.createSourceFile(member.module_path, member.source, ts.ScriptTarget.Latest, true);
        assert.equal(sf.parseDiagnostics.length, 0);
        for (const edge of sf.statements.filter(n => (ts.isImportDeclaration(n) || ts.isExportDeclaration(n)) && n.moduleSpecifier))
          assert.ok(['@angular/core', './_number-property-chunk.js'].includes(edge.moduleSpecifier.text), 'uncovered type edge');
        const target = join(model.root, 'node_modules/@angular/cdk', member.module_path);
        if (existsSync(target)) assert.equal(hash(readFileSync(target)), member.sha256);
        else writeFileSync(target, member.source, {flag: 'wx'});
      }
    }
    return loaded;
  } catch (error) {loaded.dispose(); throw error;}
}
