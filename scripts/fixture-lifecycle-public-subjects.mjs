/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 * Copyright (c) 2026 Ryan Lester.
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */
/** Complete public Core testing type closure extending authenticated Core/compiler/browser subjects. */
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {createRequire} from 'node:module';
import {readFileSync, writeFileSync, mkdirSync} from 'node:fs';
import {join, dirname, posix} from 'node:path';
import {execFileSync} from 'node:child_process';
import {gzipSync, gunzipSync} from 'node:zlib';
import {prepareMaterialPublicSubjects} from './material-public-subjects.mjs';
const ts = createRequire(import.meta.url)('typescript'), hash = b => createHash('sha256').update(b).digest('hex');
const capsulePath = 'compatibility/rc/fixture-lifecycle-public-types.json';
const capsuleHash = 'd3053380c3f0b6727c1eda0d0125e21629798fa0bfd6ee8c1a3ccca824c4d711';
export function lifecycleTypeRoute(model, spec) {
  const parts = spec.split('/'), pkg = parts.slice(0, 2).join('/'), route = parts.length === 2 ? '.' : './' + parts.slice(2).join('/');
  const value = model.packages.get(pkg)?.exports[route]?.types;
  assert.equal(typeof value, 'string', 'missing public type route: ' + spec); assert.ok(value.startsWith('./'));
  return pkg + '/' + value.slice(2);
}
function typeClosure(model) {
  const members = new Map(), edges = [], external = new Set();
  function resolve(from, spec) {
    if (!spec.startsWith('.')) {
      if (!spec.startsWith('@angular/')) {assert.ok(['rxjs', 'rxjs/operators', '@standard-schema/spec'].includes(spec), 'unknown external type namespace: ' + spec); external.add(spec); return null;}
      return lifecycleTypeRoute(model, spec);
    }
    let path = posix.normalize(posix.join(posix.dirname(from), spec.replace(/\.js$/, '.d.ts')));
    if (!model.sources.has(path)) {const matches = [path + '.d.ts', path + '/index.d.ts'].filter(p => model.sources.has(p)); assert.equal(matches.length, 1, 'incomplete relative declaration: ' + path); path = matches[0];}
    return path;
  }
  function visit(key) {
    if (members.has(key)) return;
    const text = model.sources.get(key); assert.equal(typeof text, 'string', 'missing declaration: ' + key);
    const source = ts.createSourceFile(key, text, ts.ScriptTarget.Latest, true); assert.equal(source.parseDiagnostics.length, 0);
    members.set(key, {key, sha256: hash(text), bytes: Buffer.byteLength(text)});
    const add = specifier => {const target = resolve(key, specifier); edges.push({from: key, specifier, target}); if (target) visit(target);};
    for (const node of source.statements) if ((ts.isImportDeclaration(node) || ts.isExportDeclaration(node)) && node.moduleSpecifier) add(node.moduleSpecifier.text);
    const nested = node => {if (ts.isImportTypeNode(node) && ts.isLiteralTypeNode(node.argument) && ts.isStringLiteral(node.argument.literal)) add(node.argument.literal.text); ts.forEachChild(node, nested);}; nested(source);
  }
  const roots = ['@angular/core', '@angular/core/testing']; for (const spec of roots) visit(lifecycleTypeRoute(model, spec));
  return {roots, members: [...members.values()].sort((a, b) => a.key.localeCompare(b.key)), edges, external: [...external].sort()};
}

/** Acquisition only: exact pre-existing archive identities, no installer/network or golden edits. */
export function captureFixtureLifecycleTypes({root, archives}) {
  const base = prepareMaterialPublicSubjects(root), subjects = [];
  try {
    for (const model of base.models) {
      const record = model.subject.packages.find(p => p.name === '@angular/core'), file = join(archives, 'core-' + record.version + '.tgz');
      const archive = readFileSync(file); assert.equal(hash(archive), record.archive_sha256); assert.equal(archive.length, record.archive_bytes);
      assert.equal('sha512-' + createHash('sha512').update(archive).digest('base64'), record.integrity);
      const old = new Set(model.sources.keys());
      const python = "import tarfile,json,sys\nwith tarfile.open(sys.argv[1]) as t:\n print(json.dumps({m.name:t.extractfile(m).read().decode() for m in t.getmembers() if m.isfile() and (m.name.endswith('.d.ts') or m.name=='package/package.json')}))";
      const sources = JSON.parse(execFileSync('python3', ['-c', python, file], {encoding: 'utf8', maxBuffer: 12 * 1024 * 1024}));
      for (const [path, text] of Object.entries(sources)) {
        assert.ok(path.startsWith('package/') && !path.split('/').includes('..'));
        const key = '@angular/core/' + path.slice(8);
        if (model.sources.has(key)) assert.equal(model.sources.get(key), text, 'base Core namespace differs from exact archive');
        else model.sources.set(key, text);
      }
      const closure = typeClosure(model), additions = [];
      for (const member of closure.members.filter(m => !old.has(m.key))) {
        assert.ok(member.key.startsWith('@angular/core/'));
        const raw = Buffer.from(model.sources.get(member.key)), packed = gzipSync(raw, {level: 9});
        const path = 'compatibility/rc/fixture-lifecycle-core-types/' + member.sha256 + '.gz';
        mkdirSync(dirname(join(root, path)), {recursive: true}); writeFileSync(join(root, path), packed);
        additions.push({...member, archive_member: 'package/' + member.key.slice('@angular/core/'.length), path, stored_sha256: hash(packed)});
      }
      subjects.push({line: model.line, core_archive: record, additions, closure});
    }
    const capsule = {schema_version: 1, role: 'Complete authenticated public Core/testing and Core declaration closure; no component/node/browser/floor qualification',
      base: {path: 'compatibility/rc/material-public-subjects.json', sha256: base.capsule_hash}, subjects};
    writeFileSync(join(root, capsulePath), JSON.stringify(capsule, null, 2) + '\n', {flag: 'wx'});
    return {path: capsulePath, sha256: hash(readFileSync(join(root, capsulePath))), additions: subjects.map(s => ({line: s.line, members: s.additions.length}))};
  } finally {base.dispose();}
}

export function prepareFixtureLifecycleSubjects(root) {
  const bytes = readFileSync(join(root, capsulePath)); assert.equal(hash(bytes), capsuleHash, 'fixture lifecycle type capsule changed');
  const capsule = JSON.parse(bytes), base = prepareMaterialPublicSubjects(root);
  try {
    assert.equal(capsule.base.sha256, base.capsule_hash);
    assert.deepEqual(capsule.subjects.map(s => s.line), base.models.map(m => m.line));
    for (const model of base.models) {
      const subject = capsule.subjects.find(s => s.line === model.line);
      assert.deepEqual(subject.core_archive, model.subject.packages.find(p => p.name === '@angular/core'));
      for (const member of subject.additions) {
        assert.equal(member.path, 'compatibility/rc/fixture-lifecycle-core-types/' + member.sha256 + '.gz');
        assert.equal(member.archive_member, 'package/' + member.key.slice('@angular/core/'.length));
        const packed = readFileSync(join(root, member.path)); assert.equal(hash(packed), member.stored_sha256);
        const raw = gunzipSync(packed); assert.equal(hash(raw), member.sha256); assert.equal(raw.length, member.bytes);
        assert.equal(model.sources.has(member.key), false); model.sources.set(member.key, raw.toString());
        const target = join(model.root, 'node_modules', member.key); mkdirSync(dirname(target), {recursive: true}); writeFileSync(target, raw);
      }
      assert.deepEqual(typeClosure(model), subject.closure); model.fixture_lifecycle_types = subject;
    }
    return {...base, capsule: {path: capsulePath, sha256: capsuleHash}};
  } catch (error) {base.dispose(); throw error;}
}
