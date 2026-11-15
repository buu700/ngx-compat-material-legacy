/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 * Copyright (c) 2026 Ryan Lester.
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */
/** Compare all captured class-producer minimum members with the installed package. */
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {existsSync,readFileSync,writeFileSync} from 'node:fs';
import {gunzipSync} from 'node:zlib';
const hash=x=>createHash('sha256').update(x).digest('hex');
const path='compatibility/rc/element-ref-public-subjects.json', bytes=readFileSync(path);
assert.equal(hash(bytes),'e08da48b91457bdf614c290fa67ca1930c71ddcc80f0ac87968b5d81aff65b20');
const model=JSON.parse(bytes).subjects.find(x=>x.line==='main');
const installed=p=>readFileSync('node_modules/@angular/core/'+p), captured=p=>readFileSync(p);
function verify(subject,readInstalled,readCaptured){
  assert.equal(subject.version,'22.1.7');assert.equal(subject.archive_sha256,'7501acbb46d23e099b11f7600077f2aa29a0691fac0308ef703a0e89d6d23a41');
  assert.equal(subject.archive_sri_verified,true);assert.equal(subject.type_entry,'./types/core.d.ts');assert.equal(subject.runtime_entry,'./fesm2022/core.mjs');
  assert.equal(subject.members.length,27);const seen=new Set();
  for(const member of subject.members){assert.ok(member.archive_member.startsWith('package/'));const rel=member.archive_member.slice(8);assert.ok(rel.split('/').every(s=>s&&s!=='.'&&s!=='..'));assert.ok(!seen.has(rel));seen.add(rel);
    const stored=readCaptured(member.path);assert.equal(hash(stored),member.stored_sha256);const raw=member.compression==='gzip'?gunzipSync(stored):stored;assert.equal(hash(raw),member.sha256);assert.equal(raw.length,member.bytes);assert.equal(hash(readInstalled(rel)),member.sha256);
  }
}
verify(model,installed,captured);const mutations=[];function reject(id,fn){assert.throws(fn);mutations.push(id);}
reject('wrong-version',()=>verify({...model,version:'21.2.23'},installed,captured));
reject('wrong-export',()=>verify({...model,type_entry:'./wrong.d.ts'},installed,captured));
const first=model.members[1];reject('changed-installed',()=>verify(model,p=>p===first.archive_member.slice(8)?Buffer.from('wrong'):installed(p),captured));
reject('changed-captured',()=>verify(model,installed,p=>p===first.path?Buffer.from('wrong'):captured(p)));
const pkg=JSON.parse(installed('package.json'));assert.equal(pkg.name,'@angular/core');assert.equal(pkg.version,'22.1.7');assert.equal(pkg.exports['.'].types,model.type_entry);assert.equal(pkg.exports['.'].default,model.runtime_entry);
const report={schema_version:1,line:'main',role:'Installed exact minimum package members used by captured class decorator model; no component behavior claim',node:process.version,subject_sha256:hash(bytes),package:pkg.name,version:pkg.version,member_count:model.members.length,members:model.members.map(x=>({path:x.archive_member,sha256:x.sha256})),mutations};
const args=process.argv.slice(2);if(args.length){assert.equal(args.length,2);assert.equal(args[0],'--report');assert.equal(existsSync(args[1]),false);writeFileSync(args[1],JSON.stringify(report,null,2)+'\n');}console.log(JSON.stringify({version:pkg.version,members:model.members.length,mutations}));
