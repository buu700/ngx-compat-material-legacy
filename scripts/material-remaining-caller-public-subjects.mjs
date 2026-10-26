/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 * Copyright (c) 2026 Ryan Lester.
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */
/** Finite original/minimum SDK namespaces for the remaining seven callers. */
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {readFileSync, writeFileSync, mkdirSync} from 'node:fs';
import {join, dirname} from 'node:path';
import {gzipSync, gunzipSync} from 'node:zlib';
import {execFileSync} from 'node:child_process';
import {prepareComponentConfigPublicSubjects, componentConfigPublicClosure} from './component-config-caller-public-subjects.mjs';
const hash = bytes => createHash('sha256').update(bytes).digest('hex');
export const MATERIAL_REMAINING_SUBJECTS = 'compatibility/rc/material-remaining-caller-public-subjects.json';
const pin = '676a0091788c4f133875d1b1c556a7cd0a150e31a7f8df0928d398ca1eed35c5';
const roots = ['@angular/material/input', '@angular/material/divider',
  '@angular/material/divider/testing', '@angular/material/datepicker/testing',
  '@angular/material/form-field/testing', '@angular/material/input/testing'];
const rootsFor = line => [...roots, ...(line === 'original' ?
  ['@angular/material/legacy-input', '@angular/material/legacy-input/testing',
    '@angular/material/legacy-list/testing', '@angular/material/legacy-form-field/testing'] : [])];

/** Cached, already pinned archives only; no dependency installation or network. */
export function captureMaterialRemainingPublicSubjects({root = process.cwd(), archives}) {
  const loaded = prepareComponentConfigPublicSubjects(root), subjects = [];
  try {
    for (const model of loaded.models) {
      const before = new Set(model.sources.keys());
      const records = model.subject.packages.filter(record => ['@angular/cdk', '@angular/material', '@angular/forms'].includes(record.name));
      for (const record of records) {
        const bytes = readFileSync(archives[record.name + '@' + record.version]);
        assert.equal(hash(bytes), record.archive_sha256); assert.equal(bytes.length, record.archive_bytes);
        assert.equal('sha512-' + createHash('sha512').update(bytes).digest('base64'), record.integrity);
        const code = "import json,tarfile,sys\nwith tarfile.open(sys.argv[1],'r:gz') as t:\n print(json.dumps({m.name[len('package/'):]:t.extractfile(m).read().decode() for m in t.getmembers() if m.isfile() and m.name.startswith('package/') and (m.name.endswith(('.mjs','.d.ts')) or m.name=='package/package.json')}))";
        const members = JSON.parse(execFileSync('python3', ['-c', code, archives[record.name + '@' + record.version]],
          {encoding: 'utf8', maxBuffer: 32 * 1024 * 1024}));
        for (const [path, text] of Object.entries(members)) {
          assert.ok(!path.split('/').includes('..') && !path.startsWith('/'));
          const key = record.name + '/' + path;
          if (model.sources.has(key)) assert.equal(model.sources.get(key), text, 'SDK bytes differ from authenticated base');
          else model.sources.set(key, text);
        }
      }
      const closures = Object.fromEntries(['runtime', 'types'].map(kind =>
        [kind, componentConfigPublicClosure(model, kind, rootsFor(model.line))]));
      const additions = [];
      for (const key of new Set(Object.values(closures).flatMap(closure => closure.members.map(member => member.key)))) {
        if (before.has(key)) continue;
        const name = key.split('/').slice(0, 2).join('/'); assert.ok(records.some(record => record.name === name));
        const bytes = Buffer.from(model.sources.get(key)), digest = hash(bytes), stored = gzipSync(bytes, {level: 9});
        const path = 'compatibility/rc/material-remaining-caller-public-sources/' + digest + '.gz';
        mkdirSync(dirname(join(root, path)), {recursive: true});
        try {writeFileSync(join(root, path), stored, {flag: 'wx'});} catch (error) {
          if (error.code !== 'EEXIST') throw error; assert.equal(hash(readFileSync(join(root, path))), hash(stored));
        }
        additions.push({package: name, key, archive_member: 'package/' + key.slice(name.length + 1),
          path, sha256: digest, bytes: bytes.length, stored_sha256: hash(stored)});
      }
      subjects.push({line: model.line, archives: records, additions, closures});
    }
    return {schema_version: 1, role: 'Finite genuine public input/divider/datepicker-harness namespaces;no SDK rewrites',
      base: loaded.component_config_capsule, roots, subjects};
  } finally {loaded.dispose();}
}

export function prepareMaterialRemainingPublicSubjects(root = process.cwd()) {
  const bytes = readFileSync(join(root, MATERIAL_REMAINING_SUBJECTS));
  assert.equal(hash(bytes), pin, 'changed seven-caller SDK capsule');
  const capsule = JSON.parse(bytes), loaded = prepareComponentConfigPublicSubjects(root);
  try {
    assert.deepEqual(capsule.base, loaded.component_config_capsule); assert.deepEqual(capsule.roots, roots);
    assert.deepEqual(capsule.subjects.map(subject => subject.line), loaded.models.map(model => model.line));
    for (const model of loaded.models) {
      const subject = capsule.subjects.find(subject => subject.line === model.line);
      assert.deepEqual(subject.archives, model.subject.packages.filter(record => ['@angular/cdk', '@angular/material', '@angular/forms'].includes(record.name)));
      for (const member of subject.additions) {
        assert.ok(subject.archives.some(record => record.name === member.package));
        assert.ok(member.key.startsWith(member.package + '/') && !member.key.split('/').includes('..'));
        assert.equal(member.archive_member, 'package/' + member.key.slice(member.package.length + 1));
        assert.equal(member.path, 'compatibility/rc/material-remaining-caller-public-sources/' + member.sha256 + '.gz');
        const stored = readFileSync(join(root, member.path)); assert.equal(hash(stored), member.stored_sha256);
        const value = gunzipSync(stored); assert.equal(hash(value), member.sha256); assert.equal(value.length, member.bytes);
        assert.equal(model.sources.has(member.key), false, 'SDK override'); model.sources.set(member.key, value.toString());
        const path = join(model.root, 'node_modules', member.key); mkdirSync(dirname(path), {recursive: true});
        writeFileSync(path, value, {flag: 'wx'});
      }
      for (const kind of ['runtime', 'types']) {
        assert.deepEqual(subject.closures[kind].roots, rootsFor(model.line));
        assert.deepEqual(componentConfigPublicClosure(model, kind, rootsFor(model.line)), subject.closures[kind]);
      }
      model.material_remaining_subject = subject;
    }
    return {...loaded, material_remaining_capsule: {path: MATERIAL_REMAINING_SUBJECTS, sha256: pin}};
  } catch (error) {loaded.dispose(); throw error;}
}
