/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 * Copyright (c) 2026 Ryan Lester.
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */
/** Finite genuine SDK namespaces for remaining dialog callers. */
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {readFileSync, writeFileSync, mkdirSync} from 'node:fs';
import {join, dirname} from 'node:path';
import {gzipSync, gunzipSync} from 'node:zlib';
import {execFileSync} from 'node:child_process';
import {prepareComponentConfigPublicSubjects,componentConfigPublicClosure} from './component-config-caller-public-subjects.mjs';

const hash = value => createHash('sha256').update(value).digest('hex');
export const DIALOG_CALLER_SUBJECTS = 'compatibility/rc/dialog-caller-public-subjects.json';
const pin = 'f30f3381d24adf050cf5a36bf5cdeecf2b9c15d5227ce7098606d447da1043b7';

/** Acquisition only: cached archives must match the pre-existing exact identities and SRI. */
export function captureDialogCallerPublicSubjects({root = process.cwd(), archives, roots}) {
  const loaded = prepareComponentConfigPublicSubjects(root), subjects = [];
  try {
    for (const model of loaded.models) {
      const before = new Set(model.sources.keys());
      const records = model.subject.packages.filter(record => ['@angular/cdk', '@angular/material', '@angular/forms'].includes(record.name));
      for (const record of records) {
        const path = archives[record.name + '@' + record.version], bytes = readFileSync(path);
        assert.equal(hash(bytes), record.archive_sha256);
        assert.equal(bytes.length, record.archive_bytes);
        assert.equal('sha512-' + createHash('sha512').update(bytes).digest('base64'), record.integrity);
        const code = "import json,tarfile,sys\nwith tarfile.open(sys.argv[1],'r:gz') as t:\n print(json.dumps({m.name[len('package/'):]:t.extractfile(m).read().decode() for m in t.getmembers() if m.isfile() and m.name.startswith('package/') and (m.name.endswith(('.mjs','.d.ts')) or m.name=='package/package.json')}))";
        const members = JSON.parse(execFileSync('python3', ['-c', code, path],
          {encoding: 'utf8', maxBuffer: 32 * 1024 * 1024}));
        for (const [path, text] of Object.entries(members)) {
          const key = record.name + '/' + path;
          if (model.sources.has(key)) assert.equal(model.sources.get(key), text, 'SDK archive differs from base');
          else model.sources.set(key, text);
        }
        assert.equal(hash(members['package.json']), hash(model.sources.get(record.name + '/package.json')));
      }
      const selectedRoots = [...roots, ...(model.line === 'original' ?
        roots.filter(path => path.startsWith('@angular/material/') &&
          path === '@angular/material/dialog')
          .map(path => path.replace('@angular/material/', '@angular/material/legacy-')) : [])];
      const closures = Object.fromEntries(['runtime', 'types'].map(kind =>
        [kind, componentConfigPublicClosure(model, kind, selectedRoots)]));
      const additions = [];
      for (const key of new Set(Object.values(closures).flatMap(closure => closure.members.map(member => member.key)))) {
        if (before.has(key)) continue;
        const packageName = key.split('/').slice(0, 2).join('/');
        assert.ok(['@angular/material', '@angular/cdk', '@angular/forms'].includes(packageName), 'new non-dialog archive dependency ' + key);
        const bytes = Buffer.from(model.sources.get(key)), digest = hash(bytes), stored = gzipSync(bytes, {level: 9});
        const path = 'compatibility/rc/dialog-caller-public-sources/' + digest + '.gz';
        mkdirSync(dirname(join(root, path)), {recursive: true});
        writeFileSync(join(root, path), stored);
        additions.push({package: packageName, key, archive_member: 'package/' + key.slice(packageName.length + 1),
          path, sha256: digest, bytes: bytes.length, stored_sha256: hash(stored)});
      }
      subjects.push({line: model.line, archives: records, additions, closures});
    }
    return {schema_version: 1, base: loaded.component_config_capsule, roots, subjects};
  } finally {loaded.dispose();}
}

export function prepareDialogCallerPublicSubjects(root = process.cwd()) {
  const bytes = readFileSync(join(root, DIALOG_CALLER_SUBJECTS));
  assert.equal(hash(bytes), pin, 'changed dialog SDK capsule');
  const capsule = JSON.parse(bytes), loaded = prepareComponentConfigPublicSubjects(root);
  try {
    assert.deepEqual(capsule.base, loaded.component_config_capsule);
    assert.deepEqual(capsule.subjects.map(subject => subject.line), loaded.models.map(model => model.line));
    for (const model of loaded.models) {
      const subject = capsule.subjects.find(subject => subject.line === model.line);
      assert.deepEqual(subject.archives, model.subject.packages.filter(record =>
        ['@angular/cdk', '@angular/material', '@angular/forms'].includes(record.name)));
      for (const member of subject.additions) {
        assert.ok(['@angular/material', '@angular/cdk', '@angular/forms'].includes(member.package));
        assert.ok(member.key.startsWith(member.package + '/') && !member.key.split('/').includes('..'));
        assert.equal(member.archive_member, 'package/' + member.key.slice(member.package.length + 1));
        assert.equal(member.path, 'compatibility/rc/dialog-caller-public-sources/' + member.sha256 + '.gz');
        const stored = readFileSync(join(root, member.path));
        assert.equal(hash(stored), member.stored_sha256);
        const value = gunzipSync(stored);
        assert.equal(hash(value), member.sha256);
        assert.equal(value.length, member.bytes);
        assert.equal(model.sources.has(member.key), false, 'dialog SDK override');
        model.sources.set(member.key, value.toString());
        const path = join(model.root, 'node_modules', member.key);
        mkdirSync(dirname(path), {recursive: true});
        writeFileSync(path, value, {flag: 'wx'});
      }
      for (const kind of ['runtime', 'types']) {
        assert.deepEqual(componentConfigPublicClosure(model, kind, subject.closures[kind].roots), subject.closures[kind]);
      }
      model.dialog_caller_subject = subject;
    }
    return {...loaded, dialog_caller_capsule: {path: DIALOG_CALLER_SUBJECTS, sha256: pin}};
  } catch (error) {loaded.dispose(); throw error;}
}
