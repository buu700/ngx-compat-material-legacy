/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 * Copyright (c) 2026 Ryan Lester.
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */
/** Exact minimum menu/browser closures, extending but never rewriting the Core capsule. */
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {createRequire} from 'node:module';
import {execFileSync} from 'node:child_process';
import {readFileSync, writeFileSync, mkdirSync} from 'node:fs';
import {dirname, join, posix, resolve} from 'node:path';
import {fileURLToPath} from 'node:url';
import {gzipSync, gunzipSync} from 'node:zlib';
import {prepareMaterialPublicSubjects} from './material-public-subjects.mjs';

const rootDefault = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const ts = createRequire(import.meta.url)('typescript');
const hash = b => createHash('sha256').update(b).digest('hex');
const capsulePath = 'compatibility/rc/menu-item-public-subjects.json';
const capsuleHash = '4c2782e32c576959b6b36d999565f0205abf4ed44d0ba4b36a9aade625ab445f';
const roots = {runtime: ['@angular/core', '@angular/compiler', '@angular/platform-browser', '@angular/material/menu'],
  types: ['@angular/core', '@angular/platform-browser', '@angular/material/menu']};
function publicRoute(packages, spec, kind) {
  const parts = spec.split('/'), name = parts.slice(0, 2).join('/');
  if (!packages.has(name)) {assert.ok(['rxjs', 'rxjs/operators', 'tslib'].includes(spec), 'unknown external route'); return {external: spec};}
  const suffix = parts.slice(2).join('/'), entry = packages.get(name).exports[suffix ? './' + suffix : '.']; assert.ok(entry, 'missing public export ' + spec);
  function choose(value) {
    if (typeof value === 'string') return value;
    for (const key of kind === 'types' ? ['types', 'import', 'default'] : ['import', 'default'])
      if (value && key in value) {const found = choose(value[key]); if (found) return found;}
  }
  const path = choose(entry); assert.ok(path?.startsWith('./')); return {package: name, path: path.slice(2)};
}
function closure(model, kind) {
  const members = new Map(), edges = [], external = new Set(), dynamic = [];
  const visit = ref => {
    if (ref.external) {external.add(ref.external); return;}
    const key = ref.package + '/' + ref.path; if (members.has(key)) return;
    const raw = model.sources.get(key); assert.ok(raw, 'missing complete menu namespace ' + key);
    const source = ts.createSourceFile(key, raw, ts.ScriptTarget.Latest, true); assert.equal(source.parseDiagnostics.length, 0);
    members.set(key, {key, sha256: hash(raw), bytes: Buffer.byteLength(raw)});
    const route = spec => {
      if (!spec.startsWith('.')) return publicRoute(model.packages, spec, kind);
      let path = posix.normalize(posix.join(posix.dirname(ref.path), kind === 'types' ? spec.replace(/\.js$/, '.d.ts') : spec));
      assert.ok(!path.startsWith('../') && !posix.isAbsolute(path));
      if (kind === 'types' && !model.sources.has(ref.package + '/' + path)) {
        const found = [path + '.d.ts', path + '/index.d.ts'].filter(p => model.sources.has(ref.package + '/' + p)); assert.equal(found.length, 1); path = found[0];
      }
      return {package: ref.package, path};
    };
    const add = (specifier, importType = false) => {const target = route(specifier); edges.push({from: key, specifier, import_type: importType, ...target}); visit(target);};
    for (const node of source.statements) if ((ts.isImportDeclaration(node) || ts.isExportDeclaration(node)) && node.moduleSpecifier) add(node.moduleSpecifier.text);
    const nested = node => {
      if (kind === 'types' && ts.isImportTypeNode(node) && ts.isLiteralTypeNode(node.argument) && ts.isStringLiteral(node.argument.literal)) add(node.argument.literal.text, true);
      if (ts.isCallExpression(node) && node.expression.kind === ts.SyntaxKind.ImportKeyword) dynamic.push({from: key, expression: node.getText(source)});
      ts.forEachChild(node, nested);
    }; nested(source);
  };
  for (const spec of roots[kind]) visit(publicRoute(model.packages, spec, kind));
  assert.equal(dynamic.length, 0, 'unqualified dynamic namespace route');
  return {roots: roots[kind], members: [...members.values()].sort((a, b) => a.key.localeCompare(b.key)), edges, external: [...external].sort(), dynamic};
}
const safe = path => typeof path === 'string' && !posix.isAbsolute(path) && path.split('/').every(p => p && p !== '..' && p !== '.');

/** Acquisition-only: archives are pinned by the existing authenticated capsule and SRI. */
export function captureMenuItemPublicSubjects({root = rootDefault, cache} = {}) {
  assert.ok(cache); const base = prepareMaterialPublicSubjects(root), subjects = [];
  try {
    for (const model of base.models.filter(m => m.line !== 'original')) {
      const before = new Set(model.sources.keys()), archiveRecords = [];
      for (const record of model.subject.packages.filter(p => ['@angular/cdk', '@angular/material'].includes(p.name))) {
        const archive = join(cache, record.name.split('/')[1] + '-' + record.version + '.tgz'), bytes = readFileSync(archive);
        assert.equal(hash(bytes), record.archive_sha256); assert.equal(bytes.length, record.archive_bytes);
        assert.equal('sha512-' + createHash('sha512').update(bytes).digest('base64'), record.integrity);
        const python = "import sys,tarfile,json\nwith tarfile.open(sys.argv[1]) as t:\n d={}\n for m in t.getmembers():\n  if m.isfile() and (m.name.endswith(('.mjs','.d.ts')) or m.name=='package/package.json'):\n   assert m.name.startswith('package/')\n   p=m.name[8:];assert all(x not in ('','..','.') for x in p.split('/'))\n   assert p not in d;d[p]=t.extractfile(m).read().decode()\n print(json.dumps(d))\n";
        const raw = JSON.parse(execFileSync('python3', ['-c', python, archive], {encoding: 'utf8', maxBuffer: 32 * 1024 * 1024}));
        for (const [path, text] of Object.entries(raw)) {
          assert.ok(safe(path)); const key = record.name + '/' + path;
          if (model.sources.has(key)) assert.equal(model.sources.get(key), text, 'base namespace member differs from archive');
          else model.sources.set(key, text);
        }
        assert.equal(hash(raw['package.json']), hash(model.sources.get(record.name + '/package.json')), 'package manifest archive identity changed');
        archiveRecords.push({...record, archive_sri_verified: true});
      }
      const closures = Object.fromEntries(['runtime', 'types'].map(kind => [kind, closure(model, kind)]));
      const needed = new Set(Object.values(closures).flatMap(c => c.members.map(m => m.key))), additions = [];
      for (const key of [...needed].sort()) {
        if (before.has(key)) continue;
        const parts = key.split('/'), packageName = parts.slice(0, 2).join('/'), modulePath = parts.slice(2).join('/');
        assert.ok(['@angular/cdk', '@angular/material'].includes(packageName));
        const raw = Buffer.from(model.sources.get(key)), digest = hash(raw), compressed = gzipSync(raw, {level: 9});
        const path = 'compatibility/rc/menu-item-public-source-members/' + digest + '.gz';
        mkdirSync(dirname(join(root, path)), {recursive: true}); writeFileSync(join(root, path), compressed);
        additions.push({package: packageName, module_path: modulePath, archive_member: 'package/' + modulePath, path, compression: 'gzip', sha256: digest, bytes: raw.length, stored_sha256: hash(compressed)});
      }
      subjects.push({line: model.line, archives: archiveRecords, additions, closures});
    }
    const result = {schema_version: 1, role: 'Complete static minimum menu/browser public namespace extension; no installed/native/packed/floor claim', base_capsule: {path: 'compatibility/rc/material-public-subjects.json', sha256: base.capsule_hash}, subjects};
    writeFileSync(join(root, capsulePath), JSON.stringify(result, null, 2) + '\n', {flag: 'wx'}); return result;
  } finally {base.dispose();}
}

export function prepareMenuItemPublicSubjects(root = rootDefault, {readMember = path => readFileSync(join(root, path))} = {}) {
  const bytes = readMember(capsulePath); assert.equal(hash(bytes), capsuleHash, 'menu public namespace capsule changed');
  const capsule = JSON.parse(bytes), base = prepareMaterialPublicSubjects(root);
  try {
    assert.equal(capsule.base_capsule.sha256, base.capsule_hash);
    const models = base.models.filter(m => m.line !== 'original');
    assert.deepEqual(capsule.subjects.map(s => s.line), models.map(m => m.line));
    for (const model of models) {
      const subject = capsule.subjects.find(s => s.line === model.line);
      assert.deepEqual(subject.archives, model.subject.packages.filter(p => ['@angular/cdk', '@angular/material'].includes(p.name)));
      for (const member of subject.additions) {
        assert.ok(['@angular/cdk', '@angular/material'].includes(member.package) && safe(member.module_path));
        assert.equal(member.path, 'compatibility/rc/menu-item-public-source-members/' + member.sha256 + '.gz');
        assert.equal(member.archive_member, 'package/' + member.module_path);
        const stored = readMember(member.path); assert.equal(hash(stored), member.stored_sha256);
        const raw = gunzipSync(stored); assert.equal(hash(raw), member.sha256); assert.equal(raw.length, member.bytes);
        const key = member.package + '/' + member.module_path; assert.equal(model.sources.has(key), false); model.sources.set(key, raw.toString());
        const path = join(model.root, 'node_modules', key); mkdirSync(dirname(path), {recursive: true}); writeFileSync(path, raw);
      }
      const actual = Object.fromEntries(['runtime', 'types'].map(kind => [kind, closure(model, kind)])); assert.deepEqual(actual, subject.closures);
      model.menu_namespace = subject;
    }
    return {models, capsule_hash: capsuleHash, base_capsule_hash: base.capsule_hash, dispose: () => base.dispose()};
  } catch (error) {base.dispose(); throw error;}
}
