/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 * Copyright (c) 2026 Ryan Lester.
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */
/** Add only matching pinned server namespaces to an owned public-framework replay directory. */
import assert from 'node:assert/strict';
import {readFileSync,writeFileSync,mkdirSync,realpathSync} from 'node:fs';
import {gunzipSync} from 'node:zlib';
import {createHash} from 'node:crypto';
import {join,dirname,resolve} from 'node:path';
import {fileURLToPath} from 'node:url';
const rootDefault=resolve(dirname(fileURLToPath(import.meta.url)),'..');
const hash=value=>createHash('sha256').update(value).digest('hex');
const capsuleHash='2c69381ebc791cfacc57918d336ec5478c16808943c332d39b3a1b254bc8c687';
export function installHydrationServerPublicSubject(model,root=rootDefault) {
  assert.ok(['main','21.x'].includes(model.line));
  assert.equal(realpathSync(model.root),resolve(model.root));
  const bytes=readFileSync(join(root,'compatibility/rc/hydration-server-subjects.json'));
  assert.equal(hash(bytes),capsuleHash);
  const capsule=JSON.parse(bytes),records=capsule.subjects.filter(record=>record.line===model.line||record.line==='shared');
  assert.equal(records.length,2);
  const installed=[];
  for(const record of records){
    assert.equal(record.archive_sri_verified,true);
    assert.equal(record.name==='xhr2'?record.version:model.packages.get('@angular/core').version,record.version);
    assert.equal(record.name==='xhr2'?record.version:'0.2.1','0.2.1');
    for(const member of record.members){
      assert.ok(!member.module_path.startsWith('/')&&!member.module_path.split('/').includes('..'));
      assert.equal(member.archive_member,'package/'+member.module_path);
      const raw=gunzipSync(Buffer.from(member.gzip_base64,'base64'));
      assert.equal(hash(raw),member.sha256);assert.equal(raw.length,member.bytes);
      const destination=join(model.root,'node_modules',record.name,member.module_path);
      mkdirSync(dirname(destination),{recursive:true});writeFileSync(destination,raw);
      if(member.module_path==='package.json'){
        const manifest=JSON.parse(raw);assert.equal(manifest.name,record.name);assert.equal(manifest.version,record.version);
      }
    }
    installed.push({name:record.name,version:record.version,archive_sha256:record.archive_sha256,
      integrity:record.integrity,archive_sri_verified:true,complete_members:record.members.length});
  }
  return{capsule_sha256:capsuleHash,installed,scope:'Matching complete pinned server public modules/types/manifests and xhr2 dependency in the existing owned public replay directory. No package install, private extraction, native/packed/floor or hydration-client qualification.'};
}
