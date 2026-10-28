/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 * Copyright (c) 2026 Ryan Lester.
 * Use of this source code is governed by the MIT license in LICENSE.
 */
/** Finite source integrity controls; never substitutes for the full Sass gate. */
import assert from 'node:assert/strict';
import {readFileSync,writeFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {dirname,join,resolve} from 'node:path';
import {fileURLToPath} from 'node:url';
import {dialogTitleReaderSubject} from '../scripts/dialog-title-source-context.mjs';
import {sassWrapperNoticeSubject,SASS_NOTICE_PACKET,SASS_NOTICE_READERS} from '../scripts/sass-wrapper-notice-subject.mjs';

const root=resolve(dirname(fileURLToPath(import.meta.url)),'..'),read=p=>readFileSync(join(root,p));
assert.equal(process.versions.node,JSON.parse(read('toolchain-lock.json')).repository.node);
const hash=raw=>createHash('sha256').update(raw).digest('hex');
const notices=JSON.parse(read(SASS_NOTICE_PACKET)),readers=JSON.parse(read(SASS_NOTICE_READERS));
const rows=[...notices.subjects,...readers.code_subjects],scope=sassWrapperNoticeSubject({root,read});
assert.equal(scope.exact_silent_prefixes,7);assert.equal(scope.current_reader_hooks,6);
const title=dialogTitleReaderSubject({root,read,line:'main'});
const positive=[],rejected=[];
for(const row of rows){
  const current=title.qualify({path:row.path,...row.after})??{path:row.path,...row.after};
  for(const side of ['before','after'])assert.deepEqual(scope.qualify({path:row.path,...row[side]}),current);
  assert.deepEqual(scope.historicalReference({path:row.path,...row.after}),{path:row.path,...row.before});
  assert.equal(hash(read(row.path)),current.sha256);positive.push('current-and-authenticated-original-metadata/'+row.path);
  for(const [id,bytes]of [['extra-source-edit',Buffer.concat([read(row.path),Buffer.from('\n// extra\n')])],
    ['reverted-prefix-or-reader',Buffer.from('reverted, not the authenticated after-image')]]){
    assert.throws(()=>sassWrapperNoticeSubject({root,read:p=>p===row.path?bytes:read(p)}));rejected.push(id+'/'+row.path);
  }
  for(const [id,ref]of [['wrong-reference-hash',{path:row.path,...row.before,sha256:'0'.repeat(64)}],
    ['wrong-reference-byte-count',{path:row.path,...row.before,bytes:row.before.bytes+1}]]){
    assert.throws(()=>scope.qualify(ref));rejected.push(id+'/'+row.path);
  }
}
for(const path of [SASS_NOTICE_PACKET,SASS_NOTICE_READERS]){
  assert.throws(()=>sassWrapperNoticeSubject({root,read:p=>p===path?Buffer.concat([read(p),Buffer.from(' ')]):read(p)}));
  rejected.push('changed-authority-packet/'+path);
}
for(const row of notices.subjects){
  assert.throws(()=>sassWrapperNoticeSubject({root,read:p=>p===row.path?Buffer.concat([Buffer.from(notices.header),read(p)]):read(p)}));
  rejected.push('duplicate-notice-prefix/'+row.path);
}
for(const {path}of scope.bound){
  let changed=false;const live=sassWrapperNoticeSubject({root,read:p=>changed&&p===path?Buffer.concat([read(p),Buffer.from(' ')]):read(p)});
  changed=true;assert.throws(()=>live.assertCurrent());rejected.push('late-subject-change/'+path);
}
assert.equal(scope.qualify({path:'projects/ngx-material-legacy/styles/button/_button-theme.scss',sha256:'0'.repeat(64)}),null);
scope.bound.length=0;scope.exact_silent_prefixes=0;
assert.equal(scope.qualify({path:rows[0].path,...rows[0].before}).sha256,rows[0].after.sha256);
positive.push('unrelated-path-not-qualified','public-metadata-cannot-expand-or-disable-private-scope');
const report={schema_version:1,line:'main',role:'Exact comment-prefix and current-source-reader controls only',
  node:process.version,source_packet:{path:SASS_NOTICE_PACKET,sha256:hash(read(SASS_NOTICE_PACKET))},
  readers_packet:{path:SASS_NOTICE_READERS,sha256:hash(read(SASS_NOTICE_READERS))},
  qualifier:{path:'scripts/sass-wrapper-notice-subject.mjs',sha256:hash(read('scripts/sass-wrapper-notice-subject.mjs'))},
  producer:{path:'tests/sass_wrapper_notice_probe.mjs',sha256:hash(read('tests/sass_wrapper_notice_probe.mjs'))},
  positive,rejected,actual_native_packed_rendered_or_floor_executed:false,g13_claim:'not-passed'};
if(process.argv[2])writeFileSync(process.argv[2],JSON.stringify(report,null,2)+'\n',{flag:'wx'});
console.log(JSON.stringify({positive:positive.length,rejected:rejected.length,exact_silent_prefixes:7,current_reader_hooks:6,native_or_G13_qualified:false}));
